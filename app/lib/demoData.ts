import type { ContributionCalendar, ContributionWeek, UserStats } from "./github";
import type { RepoSvgParams } from "./repoSvg";

function buildDemoWeeks(): ContributionWeek[] {
  const weeks: ContributionWeek[] = [];
  const start = new Date("2025-08-17T00:00:00Z");
  let total = 0;

  for (let week = 0; week < 53; week++) {
    const contributionDays = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + week * 7 + day);
      const wave = Math.sin((week + 2) * 1.73 + day * 2.31) * 0.5 + 0.5;
      const seasonal = Math.sin((week - 8) * 0.24) * 0.5 + 0.5;
      const count = Math.max(0, Math.round(wave * (seasonal * 8 + 2) - (day === 0 ? 1 : 0)));
      total += count;
      contributionDays.push({
        date: date.toISOString().slice(0, 10),
        contributionCount: count,
        color: count === 0 ? "#ebedf0" : count < 3 ? "#c9e5ab" : count < 6 ? "#8fbd68" : count < 10 ? "#5f944d" : "#356b3f",
      });
    }
    weeks.push({ contributionDays });
  }

  return weeks.map((week) => ({ contributionDays: week.contributionDays }));
}

const demoWeeks = buildDemoWeeks();

export const DEMO_USERNAME = "stardew-farmer";

export function getFallbackAvatar(_username: string): string {
  return "/assets/farm/avatar-fallback.svg";
}

export const DEMO_CALENDAR: ContributionCalendar = {
  totalContributions: demoWeeks.reduce(
    (sum, week) => sum + week.contributionDays.reduce((weekSum, day) => weekSum + day.contributionCount, 0),
    0,
  ),
  weeks: demoWeeks,
};

export const DEMO_STATS: UserStats = {
  totalStars: 428,
  publicRepos: 18,
  followers: 96,
  following: 71,
  pullRequests: 74,
  issues: 31,
  mergedPullRequests: 52,
  contributedRepos: 26,
  name: "Marnie’s Developer",
  bio: "Growing useful tools, one commit at a time.",
  location: "Pelican Town",
  company: "The Valley Co-op",
  createdAt: "2021-04-18T00:00:00Z",
};

export const DEMO_AVATAR = getFallbackAvatar(DEMO_USERNAME);

export const DEMO_REPO: RepoSvgParams = {
  owner: "stardew-farmer",
  repo: "farm-dashboard",
  description: "A cozy contribution garden for open-source maintainers.",
  language: "TypeScript",
  languageColor: "#3d8c96",
  stars: 128,
  forks: 21,
  issues: 4,
  sizeKb: 846,
  isPrivate: false,
};

export function getDemoCalendar(): ContributionCalendar {
  return {
    totalContributions: DEMO_CALENDAR.totalContributions,
    weeks: DEMO_CALENDAR.weeks.map((week) => ({
      contributionDays: week.contributionDays.map((day) => ({ ...day })),
    })),
  };
}
