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
import { REPO_CARD_ASSETS, REPO_CARD_RENDER_ASSET_KEYS } from "./themeAssets";

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
  statIconAssets: [string, string, string, string];
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
  statsLabelFontSize: number;
  statsValueFontSize: number;
}

export const DEFAULT_REPO_CARD_EDITOR_CONFIG: RepoCardEditorConfig = {
  heroAsset: REPO_CARD_ASSETS.hero,
  statIconAssets: [
    REPO_CARD_ASSETS.iconStar,
    REPO_CARD_ASSETS.iconFork,
    REPO_CARD_ASSETS.iconOrb,
    REPO_CARD_ASSETS.iconGears,
  ],
  ribbonFontSize: 40,
  ribbonX: 480,
  ribbonY: 99,
  titleFontSize: 44,
  titleX: 423,
  titleY: 190,
  descriptionFontSize: 18,
  descriptionX: 423,
  descriptionY: 231,
  statsX: 412,
  statsY: 303,
  statsIconSize: 54,
  statsLabelFontSize: 14,
  statsValueFontSize: 22,
};

const CARD_WIDTH = 960;
const CARD_HEIGHT = 532;

function getAssetUris(overrides: RepoCardAssetUris = {}): Record<RepoCardAssetKey, string> {
  return {
    frame: overrides.frame || REPO_CARD_ASSETS.frame,
    hero: overrides.hero || REPO_CARD_ASSETS.hero,
    star: overrides.star || REPO_CARD_ASSETS.iconStar,
    fork: overrides.fork || REPO_CARD_ASSETS.iconFork,
    language: overrides.language || REPO_CARD_ASSETS.iconOrb,
    activity: overrides.activity || REPO_CARD_ASSETS.iconGears,
  };
}

/** Preload the image set used by the card preview/API. */
export async function ensureRepoAssetsLoaded(): Promise<void> {
  await preloadAssets(REPO_CARD_RENDER_ASSET_KEYS.map((key) => {
    if (key === "frame") return REPO_CARD_ASSETS.frame;
    if (key === "hero") return REPO_CARD_ASSETS.hero;
    if (key === "star") return REPO_CARD_ASSETS.iconStar;
    if (key === "fork") return REPO_CARD_ASSETS.iconFork;
    if (key === "language") return REPO_CARD_ASSETS.iconOrb;
    return REPO_CARD_ASSETS.iconGears;
  }));
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
): string {
  const title = limitText(`${params.owner}/${params.repo}`, 24);
  const [descriptionLine1, descriptionLine2] = wrapDescription(params.description, editor.descriptionFontSize, 415);
  const language = limitText(params.language || "Unknown", 12);
  const status = params.isPrivate ? "Private" : "Active";
  const size = formatSize(params.sizeKb);
  const editorAssetMap = new Map<string, string>([
    [REPO_CARD_ASSETS.frame, assets.frame],
    [REPO_CARD_ASSETS.hero, assets.hero],
    [REPO_CARD_ASSETS.iconStar, assets.star],
    [REPO_CARD_ASSETS.iconFork, assets.fork],
    [REPO_CARD_ASSETS.iconOrb, assets.language],
    [REPO_CARD_ASSETS.iconGears, assets.activity],
  ]);
  const resolveEditorAsset = (href: string): string => editorAssetMap.get(href) || href;
  const heroAsset = resolveEditorAsset(editor.heroAsset);
  const statIconAssets = editor.statIconAssets.map(resolveEditorAsset);
  const statPanelX = editor.statsX;
  const statPanelY = editor.statsY;
  const statColumnXs = [statPanelX + 57, statPanelX + 172, statPanelX + 287, statPanelX + 402];
  const footerY = Math.max(447, statPanelY + 145);

  const statColumns = [
    { x: statColumnXs[0], icon: statIconAssets[0], label: "Stars", value: formatCount(params.stars), valueColor: "#b86a0a" },
    { x: statColumnXs[1], icon: statIconAssets[1], label: "Forks", value: formatCount(params.forks), valueColor: "#5b4c32" },
    { x: statColumnXs[2], icon: statIconAssets[2], label: "Language", value: language, valueColor: "#5b351c" },
    { x: statColumnXs[3], icon: statIconAssets[3], label: "Status", value: status, valueColor: "#35641f" },
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" style="image-rendering: pixelated" role="img" aria-label="Repository card for ${escapeXml(title)}">
<defs>
  <style>
    @font-face { font-family: 'Zpix'; src: url('/fonts/zpix.ttf') format('truetype'); font-weight: 400; font-style: normal; }
    @font-face { font-family: 'Zpix'; src: url('/fonts/zpix.ttf') format('truetype'); font-weight: 700; font-style: normal; }
    .repo-card-font { font-family: 'Zpix', 'Courier New', monospace; }
    @keyframes repo-card-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .repo-card-rise { animation: repo-card-rise .42s steps(3, end) both; }
  </style>
  <filter id="repo-card-text-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#fff5c8" flood-opacity="0.7" />
  </filter>
</defs>

<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#173128" />
<image href="${assets.frame}" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" preserveAspectRatio="none" />

<g class="repo-card-rise" style="animation-delay: .06s">
  ${renderText("REPO ACHIEVEMENT", editor.ribbonX, editor.ribbonY, editor.ribbonFontSize, "#5c2d10", { anchor: "middle", weight: "700", shadow: true })}
</g>

<g class="repo-card-rise" style="animation-delay: .12s">
  <image href="${escapeXml(heroAsset)}" x="54" y="153" width="330" height="310" />
</g>

<g class="repo-card-rise" style="animation-delay: .18s">
  ${renderText(title, editor.titleX, editor.titleY, editor.titleFontSize, "#4a2815", { weight: "700", shadow: true })}
  ${descriptionLine1 ? renderText(descriptionLine1, editor.descriptionX, editor.descriptionY, editor.descriptionFontSize, "#6a3d1c", { weight: "700" }) : ""}
  ${descriptionLine2 ? renderText(descriptionLine2, editor.descriptionX, editor.descriptionY + editor.descriptionFontSize + 7, editor.descriptionFontSize, "#6a3d1c", { weight: "700" }) : ""}
  ${renderText("A PROJECT WORTH SHOWING", 650, 286, 15, "#a2642b", { anchor: "middle", weight: "700" })}
</g>

<g class="repo-card-rise" style="animation-delay: .24s">
  <rect x="${statPanelX}" y="${statPanelY}" width="480" height="128" fill="#fff0c0" fill-opacity=".78" stroke="#c17c35" stroke-width="3" />
  <path d="M${statPanelX + 120} ${statPanelY + 12}V${statPanelY + 116} M${statPanelX + 240} ${statPanelY + 12}V${statPanelY + 116} M${statPanelX + 360} ${statPanelY + 12}V${statPanelY + 116}" stroke="#d09a52" stroke-width="2" stroke-dasharray="4 5" />
  ${statColumns.map((stat) => `
    <image href="${escapeXml(stat.icon)}" x="${stat.x - editor.statsIconSize / 2}" y="${statPanelY + 12}" width="${editor.statsIconSize}" height="${editor.statsIconSize}" />
    ${renderText(stat.label, stat.x, statPanelY + 84, editor.statsLabelFontSize, "#5b351c", { anchor: "middle", weight: "700" })}
    ${renderText(stat.value, stat.x, statPanelY + 112, editor.statsValueFontSize, stat.valueColor, { anchor: "middle", weight: "700", shadow: true })}
  `).join("")}
</g>

<g class="repo-card-rise" style="animation-delay: .30s">
  ${renderText(`OPEN ISSUES ${formatCount(params.issues)}  ·  ${size}`, 650, footerY, 12, "#81532c", { anchor: "middle", weight: "700" })}
</g>
</svg>`;
}

/** Browser preview with relative public asset URLs and live SVG text. */
export function generateRepoSvg(
  params: RepoSvgParams,
  assetUris: RepoCardAssetUris = {},
  editor: RepoCardEditorConfig = DEFAULT_REPO_CARD_EDITOR_CONFIG,
): string {
  return buildRepoSvg(params, getAssetUris(assetUris), svgText, editor);
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
): Promise<string> {
  try {
    await ensureFontsLoaded();
  } catch {
    // Keep the API usable when the remote baking fonts are temporarily
    // unavailable. The route still supplies embedded images; the browser
    // can render this text-based SVG with its local fallback font.
    return buildRepoSvg(params, getAssetUris(assetUris), svgText, editor);
  }

  const resolved: RepoCardAssetUris = { ...assetUris };
  for (const key of REPO_CARD_RENDER_ASSET_KEYS) {
    if (resolved[key]) continue;
    const source = key === "frame"
      ? REPO_CARD_ASSETS.frame
      : key === "hero"
        ? REPO_CARD_ASSETS.hero
        : key === "star"
          ? REPO_CARD_ASSETS.iconStar
          : key === "fork"
            ? REPO_CARD_ASSETS.iconFork
            : key === "language"
              ? REPO_CARD_ASSETS.iconOrb
              : REPO_CARD_ASSETS.iconGears;
    resolved[key] = await toDataUri(source);
  }

  return buildRepoSvg(params, getAssetUris(resolved), bakedText, editor);
}
