/**
 * Repo Card SVG generator.
 *
 * The card follows the supplied reference: a wooden parchment frame, an
 * achievement ribbon, a hero badge, and four compact repository stats.
 * The browser version keeps text as SVG text for crisp local preview; the
 * server version bakes text into paths for README-friendly exports.
 */

import { bakeMixedTextElement, ensureFontsLoaded } from "./fontBaker";
import { preloadAssets, toDataUri } from "./assetCache";
import {
  REPO_CARD_ASSETS,
  REPO_CARD_ASSET_SOURCES,
  REPO_CARD_RENDER_ASSET_KEYS,
} from "./themeAssets";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface RepoSvgParams {
  owner: string;
  repo: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  issues: number;
  sizeKb: number;
  isPrivate?: boolean;
}

export type RepoCardAssetKey = typeof REPO_CARD_RENDER_ASSET_KEYS[number];
export type RepoCardAssetUris = Partial<Record<RepoCardAssetKey, string>>;

export interface RepoCardEditorConfig {
  heroAsset: string;
  heroX: number;
  heroY: number;
  heroWidth: number;
  heroHeight: number;
  statIconAssets: string[];
  ribbonFontSize: number;
  ribbonX: number;
  ribbonY: number;
  titleFontSize: number;
  titleX: number;
  titleY: number;
  descriptionFontSize: number;
  descriptionX: number;
  descriptionY: number;
  statsX: number;
  statsY: number;
  statsIconSize: number;
  statsIconLabelGap: number;
  showStatLabels: boolean;
  statsLabelFontSize: number;
  statsValueFontSize: number;
}

export const REPO_CARD_STAT_OPTIONS = [
  { id: "stars", dataId: "stars", asset: REPO_CARD_ASSETS.iconStar, labelKey: "statStars", pickerLabelKey: "iconStar", svgLabel: "Stars", valueColor: "#b86a0a" },
  { id: "forks", dataId: "forks", asset: REPO_CARD_ASSETS.iconFork, labelKey: "statForks", pickerLabelKey: "iconFork", svgLabel: "Forks", valueColor: "#5b4c32" },
  { id: "language", dataId: "language", asset: REPO_CARD_ASSETS.iconOrb, labelKey: "statLanguage", pickerLabelKey: "iconOrb", svgLabel: "Language", valueColor: "#5b351c" },
  { id: "issues", dataId: "issues", asset: REPO_CARD_ASSETS.iconTag, labelKey: "statIssues", pickerLabelKey: "iconTag", svgLabel: "Issues", valueColor: "#7b3e29" },
  { id: "status", dataId: "status", asset: REPO_CARD_ASSETS.iconGears, labelKey: "statStatus", pickerLabelKey: "iconGears", svgLabel: "Status", valueColor: "#35641f" },
  { id: "size", dataId: "size", asset: REPO_CARD_ASSETS.iconChest, labelKey: "statSize", pickerLabelKey: "iconChest", svgLabel: "Size", valueColor: "#5b351c" },
  { id: "brain", dataId: "language", asset: REPO_CARD_ASSETS.iconBrain, labelKey: "statLanguage", pickerLabelKey: "iconBrain", svgLabel: "Language", valueColor: "#5b351c" },
  { id: "controller", dataId: "status", asset: REPO_CARD_ASSETS.iconController, labelKey: "statStatus", pickerLabelKey: "iconController", svgLabel: "Status", valueColor: "#35641f" },
] as const;

export function normalizeRepoCardStatAssets(statIconAssets: string[]): string[] {
  const selected: string[] = [];
  const selectedData = new Set<string>();
  for (const asset of statIconAssets) {
    const option = REPO_CARD_STAT_OPTIONS.find((candidate) => candidate.asset === asset);
    if (!option || selectedData.has(option.dataId)) continue;
    selected.push(option.asset);
    selectedData.add(option.dataId);
    if (selected.length === 4) break;
  }
  return selected;
}

export const DEFAULT_REPO_CARD_EDITOR_CONFIG: RepoCardEditorConfig = {
  heroAsset: REPO_CARD_ASSETS.hero,
  heroX: 71,
  heroY: 118,
  heroWidth: 330,
  heroHeight: 310,
  statIconAssets: [
      REPO_CARD_ASSETS.iconStar,
      REPO_CARD_ASSETS.iconFork,
      REPO_CARD_ASSETS.iconOrb,
      REPO_CARD_ASSETS.iconGears,
  ],
  ribbonFontSize: 34,
  ribbonX: 488,
  ribbonY: 76,
  titleFontSize: 46,
  titleX: 423,
  titleY: 190,
  descriptionFontSize: 18,
  descriptionX: 423,
  descriptionY: 231,
  statsX: 392,
  statsY: 303,
  statsIconSize: 65,
  statsIconLabelGap: 12,
  showStatLabels: true,
  statsLabelFontSize: 14,
  statsValueFontSize: 20,
};

const CARD_WIDTH = 960;
const CARD_HEIGHT = 532;

function getAssetUris(overrides: RepoCardAssetUris = {}): Record<RepoCardAssetKey, string> {
  const resolved = {} as Record<RepoCardAssetKey, string>;
  for (const key of REPO_CARD_RENDER_ASSET_KEYS) {
    resolved[key] = overrides[key] || REPO_CARD_ASSET_SOURCES[key];
  }
  return resolved;
}

/** Preload the image set used by the card preview/API. */
export async function ensureRepoAssetsLoaded(): Promise<void> {
  await preloadAssets(REPO_CARD_RENDER_ASSET_KEYS.map((key) => REPO_CARD_ASSET_SOURCES[key]));
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return value.toLocaleString();
}

function formatSize(kb: number): string {
  if (kb >= 1_048_576) return `${(kb / 1_048_576).toFixed(1)} GB`;
  if (kb >= 1_024) return `${(kb / 1_024).toFixed(1)} MB`;
  return `${kb} KB`;
}

function limitText(value: string, maxCharacters: number): string {
  const chars = [...value];
  if (chars.length <= maxCharacters) return value;
  return `${chars.slice(0, maxCharacters - 3).join("")}...`;
}

function estimateTextWidth(value: string, fontSize: number): number {
  return [...value].reduce((width, character) => {
    return width + (character.charCodeAt(0) > 0x7f ? fontSize : fontSize * 0.58);
  }, 0);
}

function wrapDescription(value: string, fontSize: number, maxWidth: number): [string, string] {
  const description = value.trim();
  if (!description) return ["", ""];

  const tokens: string[] = [];
  let asciiBuffer = "";
  for (const character of description) {
    const isCjk = character.charCodeAt(0) > 0x2e7f;
    if (isCjk) {
      if (asciiBuffer) {
        tokens.push(asciiBuffer);
        asciiBuffer = "";
      }
      tokens.push(character);
    } else if (character === " ") {
      if (asciiBuffer) {
        tokens.push(asciiBuffer);
        asciiBuffer = "";
      }
      tokens.push(" ");
    } else {
      asciiBuffer += character;
    }
  }
  if (asciiBuffer) tokens.push(asciiBuffer);

  let first = "";
  let index = 0;
  for (; index < tokens.length; index += 1) {
    const candidate = first + tokens[index];
    if (estimateTextWidth(candidate, fontSize) > maxWidth) break;
    first = candidate;
  }
  if (!first && tokens[index]) {
    for (const character of tokens[index]) {
      const candidate = first + character;
      if (estimateTextWidth(candidate, fontSize) > maxWidth) break;
      first = candidate;
    }
    index += 1;
  }
  first = first.trimEnd();

  if (index >= tokens.length) return [first, ""];
  while (index < tokens.length && tokens[index] === " ") index += 1;

  let second = "";
  for (; index < tokens.length; index += 1) {
    const candidate = second + tokens[index];
    if (estimateTextWidth(candidate, fontSize) > maxWidth - estimateTextWidth("...", fontSize)) {
      return [first, `${second.trimEnd()}...`];
    }
    second = candidate;
  }
  return [first, second.trimEnd()];
}

function svgText(
  value: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  options: { anchor?: "start" | "middle" | "end"; weight?: string; className?: string; shadow?: boolean } = {},
): string {
  const anchor = options.anchor || "start";
  const weight = options.weight || "400";
  const className = options.className || "repo-card-font";
  const shadow = options.shadow ? ' filter="url(#repo-card-text-shadow)"' : "";
  return `<text x="${x}" y="${y}" class="${className}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${shadow}>${escapeXml(value)}</text>`;
}

function bakedText(
  value: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  options: { anchor?: "start" | "middle" | "end"; weight?: string; shadow?: boolean } = {},
): string {
  return bakeMixedTextElement({
    text: value,
    x,
    y,
    fontSize,
    fill,
    fontWeight: options.weight || "400",
    textAnchor: options.anchor || "start",
    filter: options.shadow ? "url(#repo-card-text-shadow)" : undefined,
  });
}

type TextRenderer = (
  value: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  options?: { anchor?: "start" | "middle" | "end"; weight?: string; shadow?: boolean },
) => string;

function buildRepoSvg(
  params: RepoSvgParams,
  assets: Record<RepoCardAssetKey, string>,
  renderText: TextRenderer,
  editor: RepoCardEditorConfig,
  animate = true,
): string {
  const title = limitText(params.repo || "Repository", 24);
  const [descriptionLine1, descriptionLine2] = wrapDescription(params.description, editor.descriptionFontSize, 415);
  const language = limitText(params.language || "Unknown", 12);
  const status = params.isPrivate ? "Private" : "Active";
  const size = formatSize(params.sizeKb);
  const editorAssetMap = new Map<string, string>(
    REPO_CARD_RENDER_ASSET_KEYS.map((key) => [REPO_CARD_ASSET_SOURCES[key], assets[key]] as [string, string]),
  );
  const resolveEditorAsset = (href: string): string => editorAssetMap.get(href) || href;
  const heroAsset = resolveEditorAsset(editor.heroAsset);
  const statIconAssets = normalizeRepoCardStatAssets(editor.statIconAssets);
  const statPanelX = editor.statsX;
  const statPanelY = editor.statsY;
  const statColumnXs = [statPanelX + 60, statPanelX + 180, statPanelX + 300, statPanelX + 420];
  const statPanelHeight = Math.max(
    128,
    12 + editor.statsIconSize + (editor.showStatLabels ? editor.statsIconLabelGap + 28 + 7 : 28 + 10),
  );
  const statLabelY = statPanelY + 12 + editor.statsIconSize + editor.statsIconLabelGap;
  const statValueY = editor.showStatLabels
    ? statLabelY + 28
    : statPanelY + 12 + editor.statsIconSize + 34;
  const footerY = Math.max(447, statPanelY + statPanelHeight + 16);

  const statColumns = statIconAssets.map((href, index) => {
    const option = REPO_CARD_STAT_OPTIONS.find((candidate) => candidate.asset === href) || REPO_CARD_STAT_OPTIONS[0];
    const value = option.dataId === "stars"
      ? formatCount(params.stars)
      : option.dataId === "forks"
        ? formatCount(params.forks)
        : option.dataId === "language"
          ? language
          : option.dataId === "issues"
            ? formatCount(params.issues)
            : option.dataId === "status"
              ? status
              : size;
    return {
      x: statColumnXs[index],
      icon: resolveEditorAsset(href),
      label: option.svgLabel,
      value,
      valueColor: option.valueColor,
    };
  });
  const animationCss = animate
    ? "@keyframes repo-card-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } .repo-card-rise { animation: repo-card-rise .42s steps(3, end) both; }"
    : "";
  const wrapCardSection = (content: string, delay: string): string => animate
    ? `<g class="repo-card-rise" style="animation-delay: ${delay}">${content}</g>`
    : content;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" style="image-rendering: pixelated" role="img" aria-label="Repository card for ${escapeXml(title)}">
<defs>
  <style>
    @font-face { font-family: 'Zpix'; src: url('/fonts/zpix.ttf') format('truetype'); font-weight: 400; font-style: normal; }
    @font-face { font-family: 'Zpix'; src: url('/fonts/zpix.ttf') format('truetype'); font-weight: 700; font-style: normal; }
    .repo-card-font { font-family: 'Zpix', 'Courier New', monospace; }
    ${animationCss}
  </style>
  <filter id="repo-card-text-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#fff5c8" flood-opacity="0.7" />
  </filter>
</defs>

<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#173128" />
<image href="${assets.frame}" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" preserveAspectRatio="none" />

${wrapCardSection(`
  ${renderText("REPO ACHIEVEMENT", editor.ribbonX, editor.ribbonY, editor.ribbonFontSize, "#5c2d10", { anchor: "middle", weight: "700", shadow: true })}
`, ".06s")}

${wrapCardSection(`
  <image href="${escapeXml(heroAsset)}" x="${editor.heroX}" y="${editor.heroY}" width="${editor.heroWidth}" height="${editor.heroHeight}" />
`, ".12s")}

${wrapCardSection(`
  ${renderText(title, editor.titleX, editor.titleY, editor.titleFontSize, "#4a2815", { weight: "700", shadow: true })}
  ${descriptionLine1 ? renderText(descriptionLine1, editor.descriptionX, editor.descriptionY, editor.descriptionFontSize, "#6a3d1c", { weight: "700" }) : ""}
  ${descriptionLine2 ? renderText(descriptionLine2, editor.descriptionX, editor.descriptionY + editor.descriptionFontSize + 7, editor.descriptionFontSize, "#6a3d1c", { weight: "700" }) : ""}
`, ".18s")}

${wrapCardSection(`
  <rect x="${statPanelX}" y="${statPanelY}" width="480" height="${statPanelHeight}" fill="#fff0c0" fill-opacity=".78" stroke="#c17c35" stroke-width="3" />
  <path d="M${statPanelX + 120} ${statPanelY + 12}V${statPanelY + statPanelHeight - 12} M${statPanelX + 240} ${statPanelY + 12}V${statPanelY + statPanelHeight - 12} M${statPanelX + 360} ${statPanelY + 12}V${statPanelY + statPanelHeight - 12}" stroke="#d09a52" stroke-width="2" stroke-dasharray="4 5" />
  ${statColumns.map((stat) => `
    <image href="${escapeXml(stat.icon)}" x="${stat.x - editor.statsIconSize / 2}" y="${statPanelY + 12}" width="${editor.statsIconSize}" height="${editor.statsIconSize}" />
    ${editor.showStatLabels ? renderText(stat.label, stat.x, statLabelY, editor.statsLabelFontSize, "#5b351c", { anchor: "middle", weight: "700" }) : ""}
    ${renderText(stat.value, stat.x, statValueY, editor.statsValueFontSize, stat.valueColor, { anchor: "middle", weight: "700", shadow: true })}
  `).join("")}
`, ".24s")}

${wrapCardSection(`
  ${renderText(`OPEN ISSUES ${formatCount(params.issues)}  ·  ${size}`, 650, footerY, 12, "#81532c", { anchor: "middle", weight: "700" })}
`, ".30s")}
</svg>`;
}

/** Browser preview with relative public asset URLs and live SVG text. */
export function generateRepoSvg(
  params: RepoSvgParams,
  assetUris: RepoCardAssetUris = {},
  editor: RepoCardEditorConfig = DEFAULT_REPO_CARD_EDITOR_CONFIG,
  animate = true,
): string {
  return buildRepoSvg(params, getAssetUris(assetUris), svgText, editor, animate);
}

/**
 * Server export with baked text and optional data URI overrides. The API route
 * supplies data URIs so the resulting SVG remains self-contained in README
 * embeds instead of depending on the generator's public folder.
 */
export async function generateBakedRepoSvg(
  params: RepoSvgParams,
  assetUris: RepoCardAssetUris = {},
  editor: RepoCardEditorConfig = DEFAULT_REPO_CARD_EDITOR_CONFIG,
  animate = true,
): Promise<string> {
  try {
    await ensureFontsLoaded();
  } catch {
    // Keep the API usable when the remote baking fonts are temporarily
    // unavailable. The route still supplies embedded images; the browser
    // can render this text-based SVG with its local fallback font.
    return buildRepoSvg(params, getAssetUris(assetUris), svgText, editor, animate);
  }

  const resolved: RepoCardAssetUris = { ...assetUris };
  for (const key of REPO_CARD_RENDER_ASSET_KEYS) {
    if (resolved[key]) continue;
    resolved[key] = await toDataUri(REPO_CARD_ASSET_SOURCES[key]);
  }

  return buildRepoSvg(params, getAssetUris(resolved), bakedText, editor, animate);
}
