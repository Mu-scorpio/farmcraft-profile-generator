/**
 * GitHub GraphQL API - 获取用户 Commit 贡献数据
 */

import { ProxyAgent, setGlobalDispatcher } from "undici";

// ===== 全局代理注入 =====
const proxyUrl = process.env["HTTPS_PROXY"] || process.env["HTTP_PROXY"];

if (proxyUrl) {
  console.log(`[System] 🛡️ 侦测到代理配置，强制拦截全局 fetch，指向: ${proxyUrl}`);
  const dispatcher = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(dispatcher);
} else {
  console.log("[System] ⚠️ 未配置代理，fetch 将尝试直连...");
}

// ===== 类型定义 =====

export interface ContributionDay {
  /** 日期，格式 YYYY-MM-DD */
  date: string;
  /** 当日 commit 数量 */
  contributionCount: number;
  /** GitHub 原始颜色等级 (#ebedf0, #9be9a8, #40c463, #30a14e, #216e39) */
  color: string;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

/** 用户统计数据 */
export interface UserStats {
  /** 总获星数（所有仓库 stargazerCount 之和） */
  totalStars: number;
  /** 公开仓库数 */
  publicRepos: number;
  /** 粉丝数 */
  followers: number;
  /** 关注数 */
  following: number;
  /** 总 PR 数 */
  pullRequests: number;
  /** 总 Issue 数 */
  issues: number;
  /** 被合并的 PR 数 */
  mergedPullRequests: number;
  /** 参与的仓库数 */
  contributedRepos: number;
  /** 用户昵称（可选，可能为空） */
  name: string | null;
  /** 用户简介 */
  bio: string | null;
  /** 用户所在地 */
  location: string | null;
  /** 用户公司 */
  company: string | null;
  /** 注册时间 */
  createdAt: string;
}

export interface GitHubContributionResponse {
  user: {
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    location: string | null;
    company: string | null;
    createdAt: string;
    followers: { totalCount: number };
    following: { totalCount: number };
    repositories: {
      totalCount: number;
      nodes: { stargazerCount: number }[];
    };
    pullRequests: { totalCount: number };
    mergedPullRequests: { totalCount: number };
    issues: { totalCount: number };
    repositoriesContributedTo: { totalCount: number };
    contributionsCollection: {
      contributionCalendar: ContributionCalendar;
    };
  } | null;
}

// ===== GraphQL 查询 =====

//totalStars	所有仓库总 star 数（前100个仓库）
// publicRepos	公开仓库数
// followers	粉丝数
// following	关注数
// pullRequests	总 PR 数
// mergedPullRequests	被合并的 PR 数
// issues	总 Issue 数
// contributedRepos	参与贡献的仓库数
// bio	用户简介
// location	所在地
// company	公司
// createdAt	注册时间

const CONTRIBUTIONS_QUERY = `
  query($username: String!, $from: DateTime, $to: DateTime) {
    user(login: $username) {
      name
      avatarUrl
      bio
      location
      company
      createdAt
      followers { totalCount }
      following { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
        totalCount
        nodes { stargazerCount }
      }
      pullRequests { totalCount }
      mergedPullRequests: pullRequests(states: MERGED) { totalCount }
      issues { totalCount }
      repositoriesContributedTo { totalCount }
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
      }
    }
  }
`;

// ===== API 调用 =====

/**
 * 通过 GitHub GraphQL API 获取用户贡献日历数据
 *
 * @param username - GitHub 用户名
 * @param token - GitHub Personal Access Token（需要 read:user 权限）
 * @param from - 起始日期（可选，默认为过去一年）
 * @param to - 结束日期（可选，默认为今天）
 */
export interface FetchContributionsResult {
  calendar: ContributionCalendar;
  avatarUrl: string;
  stats: UserStats;
}

export async function fetchContributions(
  username: string,
  token: string,
  from?: string,
  to?: string
): Promise<FetchContributionsResult> {
  if (!token) return fetchPublicContributions(username, from, to);

  const variables: Record<string, string> = { username };
  if (from) variables.from = new Date(from).toISOString();
  if (to) variables.to = new Date(to).toISOString();

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "CommitCraft/1.0",
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.log("[GitHub] ❌ 非 200 响应体:", text);
    throw new Error(`GitHub API error (${response.status}): ${text}`);
  }

  const json = await response.json();
  if (json.errors) {
    console.log("[GitHub] ❌ GraphQL errors:", JSON.stringify(json.errors));
    throw new Error(
      `GitHub GraphQL errors: ${json.errors.map((e: { message: string }) => e.message).join(", ")}`
    );
  }

  const data = json.data as GitHubContributionResponse;

  if (!data.user) {
    throw new Error(`GitHub user "${username}" not found`);
  }

  const user = data.user;
  const totalStars = user.repositories.nodes.reduce((sum, repo) => sum + repo.stargazerCount, 0);

  return {
    calendar: user.contributionsCollection.contributionCalendar,
    avatarUrl: user.avatarUrl,
    stats: {
      totalStars,
      name: user.name,
      publicRepos: user.repositories.totalCount,
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      pullRequests: user.pullRequests.totalCount,
      mergedPullRequests: user.mergedPullRequests.totalCount,
      issues: user.issues.totalCount,
      contributedRepos: user.repositoriesContributedTo.totalCount,
      bio: user.bio,
      location: user.location,
      company: user.company,
      createdAt: user.createdAt,
    },
  };
}

// ===== 仓库信息 =====

export interface RepoInfo {
  owner: string;
  repo: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  issues: number;
  sizeKb: number;
  isPrivate: boolean;
}

interface GitHubRepoResponse {
  repository: {
    owner: { login: string };
    name: string;
    description: string | null;
    isPrivate: boolean;
    stargazerCount: number;
    forkCount: number;
    issues: { totalCount: number };
    diskUsage: number | null;
    primaryLanguage: { name: string; color: string } | null;
  } | null;
}

const REPO_QUERY = `
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      owner { login }
      name
      description
      isPrivate
      stargazerCount
      forkCount
      issues(states: OPEN) { totalCount }
      diskUsage
      primaryLanguage { name color }
    }
  }
`;

export async function fetchRepoInfo(
  owner: string,
  name: string,
  token: string,
): Promise<RepoInfo> {
  if (!token) return fetchPublicRepoInfo(owner, name);

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "CommitCraft/1.0",
    },
    body: JSON.stringify({
      query: REPO_QUERY,
      variables: { owner, name },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.log("[GitHub] ❌ Repo API 非 200:", text);
    throw new Error(`GitHub API error (${response.status}): ${text}`);
  }

  const json = await response.json();
  if (json.errors) {
    console.log("[GitHub] ❌ Repo GraphQL errors:", JSON.stringify(json.errors));
    throw new Error(
      `GitHub GraphQL errors: ${json.errors.map((e: { message: string }) => e.message).join(", ")}`
    );
  }

  const data = json.data as GitHubRepoResponse;
  if (!data.repository) {
    throw new Error(`Repository "${owner}/${name}" not found`);
  }

  const r = data.repository;
  return {
    owner: r.owner.login,
    repo: r.name,
    description: r.description || "No description provided.",
    language: r.primaryLanguage?.name || "Unknown",
    languageColor: r.primaryLanguage?.color || "#888888",
    stars: r.stargazerCount,
    forks: r.forkCount,
    issues: r.issues.totalCount,
    sizeKb: r.diskUsage || 0,
    isPrivate: r.isPrivate,
  };
}

type PublicUserPayload = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  created_at: string;
  followers: number;
  following: number;
  public_repos: number;
};

async function fetchGitHubRest<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "FarmCraft/1.0",
    },
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error(`GitHub resource not found: ${path}`);
    throw new Error(`GitHub REST API error (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function contributionCountForLevel(level: number): number {
  return [0, 1, 3, 6, 12][Math.max(0, Math.min(4, level))] || 0;
}

function buildContributionCalendarFromLevels(
  levels: Map<string, number>,
  from?: string,
  to?: string,
): ContributionCalendar {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
  const startSunday = new Date(start);
  startSunday.setUTCDate(startSunday.getUTCDate() - startSunday.getUTCDay());
  const weeks: ContributionWeek[] = [];
  let totalContributions = 0;

  for (let week = 0; week < 53; week++) {
    const contributionDays = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(startSunday);
      date.setUTCDate(startSunday.getUTCDate() + week * 7 + day);
      const dateKey = date.toISOString().slice(0, 10);
      const count = contributionCountForLevel(levels.get(dateKey) || 0);
      totalContributions += count;
      contributionDays.push({
        date: dateKey,
        contributionCount: count,
        color: count === 0 ? "#ebedf0" : count < 3 ? "#c9e5ab" : count < 6 ? "#8fbd68" : count < 10 ? "#5f944d" : "#356b3f",
      });
    }
    weeks.push({ contributionDays });
  }

  return { totalContributions, weeks };
}

/**
 * Public, token-free fallback. GitHub's contribution graph is HTML, but its
 * data-level cells are stable and give enough fidelity for a profile preview.
 */
async function fetchPublicContributions(username: string, from?: string, to?: string): Promise<FetchContributionsResult> {
  const profile = await fetchGitHubRest<PublicUserPayload>(`/users/${encodeURIComponent(username)}`);
  const contributionQuery = new URLSearchParams();
  if (from) contributionQuery.set("from", from.slice(0, 10));
  if (to) contributionQuery.set("to", to.slice(0, 10));
  const contributionResponse = await fetch(`https://github.com/users/${encodeURIComponent(profile.login)}/contributions?${contributionQuery.toString()}`, {
    headers: { "User-Agent": "FarmCraft/1.0" },
  });
  const levels = new Map<string, number>();
  if (contributionResponse.ok) {
    const html = await contributionResponse.text();
    const cells = html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d+)"/g);
    for (const match of cells) levels.set(match[1], Number(match[2]));
  }

  let totalStars = 0;
  try {
    const repos = await fetchGitHubRest<{ stargazers_count: number }[]>(`/users/${encodeURIComponent(profile.login)}/repos?per_page=100&sort=updated`);
    totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  } catch {
    totalStars = 0;
  }

  const calendar = buildContributionCalendarFromLevels(levels, from, to);
  return {
    calendar,
    avatarUrl: profile.avatar_url,
    stats: {
      totalStars,
      publicRepos: profile.public_repos,
      followers: profile.followers,
      following: profile.following,
      pullRequests: 0,
      issues: 0,
      mergedPullRequests: 0,
      contributedRepos: 0,
      name: profile.name,
      bio: profile.bio,
      location: profile.location,
      company: profile.company,
      createdAt: profile.created_at,
    },
  };
}

type PublicRepoPayload = {
  owner: { login: string };
  name: string;
  description: string | null;
  private: boolean;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  language: string | null;
  language_url?: string;
};

async function fetchPublicRepoInfo(owner: string, name: string): Promise<RepoInfo> {
  const repo = await fetchGitHubRest<PublicRepoPayload>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`);
  return {
    owner: repo.owner.login,
    repo: repo.name,
    description: repo.description || "No description provided.",
    language: repo.language || "Unknown",
    languageColor: repo.language === "TypeScript" ? "#3178c6" : repo.language === "JavaScript" ? "#f1e05a" : "#4f7f3d",
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    issues: repo.open_issues_count,
    sizeKb: repo.size,
    isPrivate: repo.private,
  };
}
