/**
 * GitHub GraphQL API - 获取用户 Commit 贡献数据
 */

import { execFileSync } from "node:child_process";
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

export type GitHubErrorCode = "auth_required" | "not_found" | "rate_limited" | "network" | "api" | "unknown";

export interface GitHubErrorPayload {
  error: string;
  recommendation: string;
  recommendationZh: string;
  code: GitHubErrorCode;
}

interface GitHubErrorGuide {
  message: string;
  recommendation: string;
  recommendationZh: string;
}

const GITHUB_ERROR_GUIDES: Record<GitHubErrorCode, GitHubErrorGuide> = {
  auth_required: {
    message: "GitHub did not make this resource available to the current request.",
    recommendation: "If the resource is private, set GITHUB_TOKEN with repository access or run `gh auth login`, then restart the service.",
    recommendationZh: "如果仓库是私有的，请配置有仓库访问权限的 GITHUB_TOKEN，或运行 `gh auth login` 后重启服务。",
  },
  not_found: {
    message: "GitHub could not find the requested resource.",
    recommendation: "Check the owner/repository spelling. If it is private, grant the configured token access; if it was renamed, use the new URL.",
    recommendationZh: "请检查 owner/repository 是否拼写正确；如果是私有仓库，请给当前 token 授权；如果仓库改名，请使用新地址。",
  },
  rate_limited: {
    message: "GitHub API rate limit reached.",
    recommendation: "Wait for the rate limit to reset, or use a GitHub token / `gh auth login` to increase the available quota.",
    recommendationZh: "GitHub API 已达到频率限制，请等待配额重置，或配置 token / 执行 `gh auth login` 后再试。",
  },
  network: {
    message: "Unable to reach GitHub right now.",
    recommendation: "Check HTTPS_PROXY/HTTP_PROXY and make sure the proxy is running, then retry the request.",
    recommendationZh: "当前无法连接 GitHub，请检查 HTTPS_PROXY/HTTP_PROXY 及代理服务是否运行，然后重试。",
  },
  api: {
    message: "GitHub returned an error while loading the resource.",
    recommendation: "Retry the request. If it persists, check the token scopes and GitHub API availability.",
    recommendationZh: "请重试；如果问题持续，请检查 token 权限范围以及 GitHub API 是否可用。",
  },
  unknown: {
    message: "Unable to load data from GitHub.",
    recommendation: "Check the network, configure GITHUB_TOKEN or run `gh auth login`, then restart the service.",
    recommendationZh: "请检查网络，配置 GITHUB_TOKEN 或运行 `gh auth login`，然后重启服务。",
  },
};

export class GitHubAccessError extends Error {
  constructor(
    public readonly code: GitHubErrorCode,
    message: string,
    public readonly recommendation: string,
    public readonly recommendationZh: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "GitHubAccessError";
  }
}

export function createGitHubAccessError(
  code: GitHubErrorCode,
  resource: string,
  status = 500,
): GitHubAccessError {
  const guide = GITHUB_ERROR_GUIDES[code];
  const message = code === "not_found"
    ? `GitHub could not find ${resource}.`
    : code === "api"
      ? `GitHub returned an error while loading ${resource}.`
      : guide.message;
  return new GitHubAccessError(
    code,
    message,
    guide.recommendation,
    guide.recommendationZh,
    status,
  );
}

export function getGitHubErrorPayload(error: unknown): GitHubErrorPayload {
  if (error instanceof GitHubAccessError) {
    return {
      error: error.message,
      recommendation: error.recommendation,
      recommendationZh: error.recommendationZh,
      code: error.code,
    };
  }

  const guide = GITHUB_ERROR_GUIDES.unknown;
  return {
    error: guide.message,
    recommendation: guide.recommendation,
    recommendationZh: guide.recommendationZh,
    code: "unknown",
  };
}

export function getGitHubErrorStatus(error: unknown): number {
  return error instanceof GitHubAccessError ? error.status : 500;
}

function normalizeToken(value: string | null | undefined): string | null {
  const token = value?.trim() || "";
  return token && !/\s/.test(token) ? token : null;
}

let cachedGitHubCliToken: string | undefined;

function readGitHubCliToken(): string | null {
  if (cachedGitHubCliToken) return cachedGitHubCliToken;

  try {
    const command = process.platform === "win32" ? "gh.exe" : "gh";
    const output = execFileSync(command, ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
      windowsHide: true,
      maxBuffer: 16 * 1024,
    }) as string;
    const token = normalizeToken(output);
    if (token) cachedGitHubCliToken = token;
  } catch {
    // GitHub CLI may be installed but not authenticated yet. Do not cache
    // this negative result so a later `gh auth login` is picked up.
  }

  return cachedGitHubCliToken || null;
}

function getAuthTokens(explicitToken?: string): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const candidate of [explicitToken, process.env["GITHUB_TOKEN"], process.env["GH_TOKEN"], readGitHubCliToken()]) {
    const token = normalizeToken(candidate);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

type GitHubRequestFailure = {
  kind: "network" | "http" | "api";
  status?: number;
  message: string;
};

type GitHubRequestAttempt<T> =
  | { ok: true; data: T }
  | { ok: false; failure: GitHubRequestFailure };

function payloadMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function graphQLErrors(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || !("errors" in payload)) return [];
  const errors = (payload as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return [];
  return errors.map((error) => {
    if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
    return "GitHub GraphQL request failed";
  });
}

async function requestGitHubOnce<T>(
  url: string,
  init: RequestInit,
  token: string | undefined,
  graphql: boolean,
): Promise<GitHubRequestAttempt<T>> {
  try {
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/vnd.github+json");
    if (!headers.has("User-Agent")) headers.set("User-Agent", "FarmCraft/1.0");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(url, { ...init, headers });
    const rawBody = await response.text();
    let payload: unknown = null;
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        failure: {
          kind: "http",
          status: response.status,
          message: payloadMessage(payload, rawBody.slice(0, 240)),
        },
      };
    }

    const errors = graphql ? graphQLErrors(payload) : [];
    if (errors.length) {
      return {
        ok: false,
        failure: { kind: "api", status: response.status, message: errors.join(", ") },
      };
    }

    if (payload === null) {
      return {
        ok: false,
        failure: { kind: "api", status: response.status, message: "GitHub returned an empty response" },
      };
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: "network",
        message: error instanceof Error ? error.message : "GitHub request failed",
      },
    };
  }
}

function errorFromFailures(
  resource: string,
  failures: GitHubRequestFailure[],
  authAttempted: boolean,
): GitHubAccessError {
  const last = failures[failures.length - 1];
  if (failures.some((failure) => failure.status === 429)) {
    return createGitHubAccessError("rate_limited", resource, 429);
  }
  if (last?.kind === "network") {
    return createGitHubAccessError("network", resource, 503);
  }
  if (last?.status === 401 || last?.status === 403 || (!authAttempted && last?.status === 404)) {
    return createGitHubAccessError("auth_required", resource, last.status);
  }
  if (last?.status === 404) {
    return createGitHubAccessError("not_found", resource, 404);
  }
  const upstreamStatus = last?.status;
  const safeStatus = upstreamStatus && upstreamStatus >= 400 && upstreamStatus <= 599 ? upstreamStatus : 502;
  return createGitHubAccessError("api", resource, safeStatus);
}

async function requestGitHubJson<T>(
  url: string,
  init: RequestInit,
  options: { resource: string; token?: string; graphql?: boolean; allowAuthFallback?: boolean },
): Promise<T> {
  const failures: GitHubRequestFailure[] = [];
  const direct = await requestGitHubOnce<T>(url, init, undefined, options.graphql === true);
  if (direct.ok) return direct.data;
  failures.push(direct.failure);

  if (options.allowAuthFallback === false) {
    throw errorFromFailures(options.resource, failures, false);
  }

  const tokens = getAuthTokens(options.token);
  for (const token of tokens) {
    const authenticated = await requestGitHubOnce<T>(url, init, token, options.graphql === true);
    if (authenticated.ok) return authenticated.data;
    failures.push(authenticated.failure);
  }

  throw errorFromFailures(options.resource, failures, tokens.length > 0);
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
  // Prefer the public REST/HTML path. Authenticated requests are only made
  // when the anonymous path cannot access the resource.
  try {
    return await fetchPublicContributions(username, from, to, undefined, false);
  } catch (publicError) {
    try {
      return await fetchContributionsGraphQL(username, token, from, to);
    } catch (graphQLError) {
      // REST with credentials is a useful final fallback when GraphQL is
      // disabled by the token's scopes or by an enterprise GitHub policy.
      try {
        return await fetchPublicContributions(username, from, to, token, true);
      } catch {
        throw graphQLError instanceof GitHubAccessError ? graphQLError : publicError;
      }
    }
  }
}

async function fetchContributionsGraphQL(
  username: string,
  token: string,
  from?: string,
  to?: string,
): Promise<FetchContributionsResult> {
  const variables: Record<string, string> = { username };
  if (from) variables.from = new Date(from).toISOString();
  if (to) variables.to = new Date(to).toISOString();

  const payload = await requestGitHubJson<{ data?: GitHubContributionResponse }>("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "CommitCraft/1.0",
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables,
    }),
  }, { resource: `contributions for GitHub user "${username}"`, token, graphql: true });

  const data = payload.data;

  if (!data?.user) {
    throw createGitHubAccessError("not_found", `GitHub user "${username}"`, 404);
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

export async function fetchRepoInfo(
  owner: string,
  name: string,
  token: string,
): Promise<RepoInfo> {
  // The REST endpoint already contains every field needed by the card. It
  // tries anonymously first, then falls back to GITHUB_TOKEN / GH_TOKEN / gh.
  return fetchPublicRepoInfo(owner, name, token, true);
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

async function fetchGitHubRest<T>(
  path: string,
  token?: string,
  allowAuthFallback = true,
): Promise<T> {
  return requestGitHubJson<T>(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "FarmCraft/1.0",
    },
  }, {
    resource: `GitHub resource ${path}`,
    token,
    allowAuthFallback,
  });
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
async function fetchPublicContributions(
  username: string,
  from?: string,
  to?: string,
  token?: string,
  allowAuthFallback = true,
): Promise<FetchContributionsResult> {
  const profile = await fetchGitHubRest<PublicUserPayload>(
    `/users/${encodeURIComponent(username)}`,
    token,
    allowAuthFallback,
  );
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
    const repos = await fetchGitHubRest<{ stargazers_count: number }[]>(
      `/users/${encodeURIComponent(profile.login)}/repos?per_page=100&sort=updated`,
      token,
      allowAuthFallback,
    );
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

async function fetchPublicRepoInfo(
  owner: string,
  name: string,
  token?: string,
  allowAuthFallback = true,
): Promise<RepoInfo> {
  const repo = await fetchGitHubRest<PublicRepoPayload>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    token,
    allowAuthFallback,
  );
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
