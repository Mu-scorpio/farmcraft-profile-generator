/**
 * FarmCraft 2.0 loot badge generator.
 *
 * The old Banner Hall was a row of waving flags with letter grades. 2.0 keeps
 * the grade only as a hidden color cue and renders the actual achievement as a
 * Terraria-like loot badge whose visual focus is the number.
 */

import type { UserStats } from "./github";
import { ensureFontsLoaded, bakeTextElement } from "./fontBaker";
import { toDataUri, preloadAssets } from "./assetCache";
import { FARM_ASSET_DATA_URIS } from "./farmDataUris";
import { FARM_ASSETS } from "./themeAssets";

export const TIER_CONFIG: Record<string, { name: string; base: string; text: string; label: string }> = {
  "S+": { name: "Orchard", base: "#376447", text: "#fff4c8", label: "#fff4c8" },
  "S": { name: "Orchard", base: "#4f7f3d", text: "#fff4c8", label: "#fff4c8" },
  "S-": { name: "Orchard", base: "#6e9b4e", text: "#fff4c8", label: "#fff4c8" },
  "A+": { name: "Pumpkin", base: "#b85e3f", text: "#fff1c8", label: "#fff1c8" },
  "A": { name: "Pumpkin", base: "#d87647", text: "#fff1c8", label: "#fff1c8" },
  "A-": { name: "Pumpkin", base: "#e99b57", text: "#35251b", label: "#35251b" },
  "B+": { name: "Wheat", base: "#bf8e3f", text: "#35251b", label: "#35251b" },
  "B": { name: "Wheat", base: "#e5ad4b", text: "#35251b", label: "#35251b" },
  "B-": { name: "Wheat", base: "#f0c86d", text: "#35251b", label: "#35251b" },
  "C+": { name: "Stone", base: "#9f9a7b", text: "#35251b", label: "#35251b" },
  "C": { name: "Stone", base: "#c7bf9b", text: "#35251b", label: "#35251b" },
  "C-": { name: "Stone", base: "#e5ddba", text: "#35251b", label: "#35251b" },
  "D": { name: "Fallow", base: "#6c5749", text: "#f5e8bf", label: "#f5e8bf" },
};

export const ICONS: Record<string, string> = {
  commits: FARM_ASSETS.shovel,
  prs: FARM_ASSETS.sprouts,
  stars: FARM_ASSETS.sunflower,
  issues: FARM_ASSETS.scarecrow,
  followers: FARM_ASSETS.pumpkin,
  repos: FARM_ASSETS.greenhouse,
  merged: FARM_ASSETS.watering,
};

export function getAllBannerAssetUrls(): string[] {
  return [...Object.values(ICONS)];
}

export async function ensureBannerAssetsLoaded(): Promise<void> {
  await preloadAssets(getAllBannerAssetUrls());
}

function buildThresholds(sPlus: number, s: number, sMinus: number, a: number, b: number, c: number): number[] {
  const aStep = (sMinus - a) / 3;
  const bStep = (a - b) / 3;
  const cStep = (b - c) / 3;
  return [
    sPlus, s, sMinus,
    Math.round(a + aStep * 2), Math.round(a + aStep), a,
    Math.round(b + bStep * 2), Math.round(b + bStep), b,
    Math.round(c + cStep * 2), Math.round(c + cStep), c,
  ];
}

const TIER_THRESHOLDS: Record<string, number[]> = {
  commits: buildThresholds(1500, 1250, 1000, 500, 250, 100),
  prs: buildThresholds(400, 300, 200, 100, 30, 10),
  stars: buildThresholds(2000, 1500, 1000, 100, 30, 5),
  issues: buildThresholds(400, 300, 200, 100, 30, 10),
  followers: buildThresholds(1000, 750, 500, 100, 30, 10),
  repos: buildThresholds(100, 75, 50, 30, 15, 5),
  merged: buildThresholds(300, 225, 150, 80, 20, 5),
};

const TIER_LABELS = ["S+", "S", "S-", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-"];

export function getTier(id: string, value: number): string {
  const thresholds = TIER_THRESHOLDS[id] || buildThresholds(200, 150, 100, 50, 20, 5);
  for (let index = 0; index < TIER_LABELS.length; index += 1) {
    if (value >= thresholds[index]) return TIER_LABELS[index];
  }
  return "D";
}

export interface StatItem {
  id: string;
  title: string;
  value: string;
  rawValue: number;
  tier: string;
  icon: string;
}

export const VALID_STAT_IDS = ["commits", "prs", "stars", "issues", "followers", "repos", "merged"] as const;
export type StatId = typeof VALID_STAT_IDS[number];

export const STAT_TITLES: Record<StatId, string> = {
  commits: "COMMITS",
  prs: "PULL REQS",
  stars: "STARS",
  issues: "ISSUES",
  followers: "FOLLOWERS",
  repos: "REPOS",
  merged: "MERGED PRs",
};

export function getStatValue(id: StatId, stats: UserStats, totalContributions: number): number {
  switch (id) {
    case "commits": return totalContributions;
    case "prs": return stats.pullRequests;
    case "stars": return stats.totalStars;
    case "issues": return stats.issues;
    case "followers": return stats.followers;
    case "repos": return stats.publicRepos;
    case "merged": return stats.mergedPullRequests;
  }
}

export function buildStats(stats: UserStats, totalContributions: number): StatItem[] {
  const items: { id: StatId; title: string; raw: number }[] = [
    { id: "commits", title: "COMMITS", raw: totalContributions },
    { id: "prs", title: "PULL REQS", raw: stats.pullRequests },
    { id: "stars", title: "STARS", raw: stats.totalStars },
    { id: "issues", title: "ISSUES", raw: stats.issues },
    { id: "followers", title: "FOLLOWERS", raw: stats.followers },
    { id: "repos", title: "REPOS", raw: stats.publicRepos },
    { id: "merged", title: "MERGED PRs", raw: stats.mergedPullRequests },
  ];

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    value: String(item.raw),
    rawValue: item.raw,
    tier: getTier(item.id, item.raw),
    icon: ICONS[item.id],
  }));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function iconHref(icon: string): string {
  return FARM_ASSET_DATA_URIS[icon] || icon;
}

interface LootSvgParts {
  title: string;
  value: string;
  icon: string;
  tier: string;
  baked?: boolean;
}

const LOOT_TEXT = "#fff4c8";

function renderLootBadge({ title, value, icon, tier, baked = false }: LootSvgParts): string {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.D;
  const titleMarkup = baked ? title : `<text x="120" y="42" class="loot-title" text-anchor="middle">${escapeXml(title)}</text>`;
  const valueMarkup = baked ? value : `<text x="120" y="202" class="loot-value" text-anchor="middle">${escapeXml(value)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 240 270" width="240" height="270" class="farm-loot-svg" style="image-rendering:pixelated">
  <style>
    .loot-title,.loot-value { font-family: 'Zpix', 'Courier New', monospace; font-weight: 700; fill: ${LOOT_TEXT}; }
    .loot-title { font-size: 16px; letter-spacing: .06em; stroke: #1a1512; stroke-width: 2px; stroke-linejoin: round; paint-order: stroke fill; }
    .loot-value { font-size: 42px; }
    .loot-pop { transform-box: fill-box; transform-origin: center; animation: loot-pop .5s steps(3,end) both; }
    @keyframes loot-pop { from { opacity: 0; transform: scale(.82); } to { opacity: 1; transform: scale(1); } }
  </style>
  <g class="loot-pop">
    <path d="M26 8h188l18 18v218l-18 18H26L8 244V26Z" fill="#211a18" stroke="#0e0c0b" stroke-width="3" />
    <path d="M29 16h182l12 12v202l-12 12H29l-12-12V28Z" fill="#d8c08b" stroke="#8c653e" stroke-width="3" />
    <path d="M38 27h164l9 9v184l-9 9H38l-9-9V36Z" fill="${config.base}" stroke="#33251b" stroke-width="4" />
    <path d="M46 38h148v166H46Z" fill="#1c3027" opacity=".46" />
    <path d="M51 43h138v156H51Z" fill="#0f221c" opacity=".68" />
    <path d="M74 23h92v17H74Z" fill="#f2dfa4" opacity=".55" />
    <path d="M34 29h12v12H34Z" fill="#fff0bc" opacity=".48" />
    <path d="M194 29h12v12h-12Z" fill="#765238" opacity=".7" />
    ${titleMarkup}
    <g transform="translate(75 67)">
      <path d="M17 0h56l17 17v58L73 92H17L0 75V17Z" fill="#0b1714" stroke="#080d0c" stroke-width="3" />
      <path d="M19 7h52l12 12v48L71 79H19L7 67V19Z" fill="#d7bc76" stroke="#4a3925" stroke-width="3" />
      <path d="M24 13h42l9 9v38l-9 9H24l-9-9V22Z" fill="#2c4c35" />
      <image href="${icon}" x="27" y="16" width="36" height="36" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated" />
      <path d="M25 62h42" stroke="#f7e6a2" stroke-width="3" opacity=".65" />
    </g>
    ${valueMarkup}
    <path d="M62 221h116v9H62Z" fill="#f1dfa2" opacity=".75" />
    <path d="M80 238h80v5H80Z" fill="#241b17" opacity=".6" />
  </g>
</svg>`;
}

export interface BannerSvgParams {
  statId: StatId;
  title: string;
  value: number;
  tier: string;
  icon: string;
}

export function generateBannerSvg(params: BannerSvgParams): string {
  return renderLootBadge({
    title: params.title,
    value: String(params.value),
    icon: iconHref(params.icon),
    tier: params.tier,
  });
}

export function generateLootHallSvg(items: StatItem[]): string {
  const columns = 3;
  const cellWidth = 240;
  const cellHeight = 270;
  const gap = 20;
  const padding = 24;
  const rows = Math.ceil(items.length / columns);
  const width = padding * 2 + columns * cellWidth + (columns - 1) * gap;
  const height = padding * 2 + rows * cellHeight + (rows - 1) * gap;
  const content = items.map((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const svg = generateBannerSvg({ statId: item.id as StatId, title: item.title, value: item.rawValue, tier: item.tier, icon: item.icon });
    const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    return `<g transform="translate(${padding + column * (cellWidth + gap)},${padding + row * (cellHeight + gap)})">${inner}</g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="image-rendering:pixelated">
  <rect width="${width}" height="${height}" fill="#17392f" />
  <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="12" fill="none" stroke="#6c915e" stroke-width="3" opacity=".7" />
  ${content}
</svg>`;
}

export async function generateBakedBannerSvg(params: BannerSvgParams): Promise<string> {
  await ensureFontsLoaded();
  await ensureBannerAssetsLoaded();
  const iconDataUri = await toDataUri(params.icon);
  const titlePath = bakeTextElement({
    text: params.title,
    x: 120,
    y: 42,
    fontSize: 16,
    fill: LOOT_TEXT,
    textAnchor: "middle",
    fontWeight: "bold",
    extraAttrs: {
      stroke: "#1a1512",
      "stroke-width": "2",
      "stroke-linejoin": "round",
      "paint-order": "stroke fill",
    },
  });
  const valuePath = bakeTextElement({
    text: String(params.value),
    x: 120,
    y: 202,
    fontSize: 42,
    fill: LOOT_TEXT,
    textAnchor: "middle",
    fontWeight: "bold",
  });

  return renderLootBadge({
    title: titlePath,
    value: valuePath,
    icon: iconDataUri,
    tier: params.tier,
    baked: true,
  });
}
