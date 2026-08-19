/**
 * ProfileCard SVG 生成器 — 前端/后端共用的纯函数
 */

import { ensureFontsLoaded, bakeTextElement, bakeTextWithTspans } from "./fontBaker";
import { toDataUri, preloadAssets, avatarToDataUri } from "./assetCache";
import { FARM_ASSETS, FARM_PALETTE } from "./themeAssets";

const ICONS = {
  clock: FARM_ASSETS.watering,
  star: FARM_ASSETS.sunflower,
  pickaxe: FARM_ASSETS.shovel,
  emerald: FARM_ASSETS.pumpkin,
};

/** 预加载 Card 模块所有静态图片资源到内存缓存 */
export async function ensureCardAssetsLoaded(): Promise<void> {
  await preloadAssets(Object.values(ICONS));
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export { escapeXml };

export interface CardSvgParams {
  username: string;
  displayName: string;
  avatarUrl: string;
  joinDate: string;
  stars: number;
  commits: number;
  followers: number;
  quote: string;
}

export function generateCardSvg(params: CardSvgParams): string {
  const { username, displayName, avatarUrl, joinDate, stars, commits, followers, quote } = params;

  const nameToShow = displayName || username;
  const safeName = escapeXml(nameToShow);
  const safeQuote = escapeXml(quote);
  const safeAvatarUrl = escapeXml(avatarUrl);

  // 名字区域可用宽度约 128px（头像宽度），预留两侧各 8px padding = 112px
  const maxNameWidth = 112;
  let nameFontSize = 36;
  let nameY = 212;
  // 粗略估算：每字符宽度 ≈ fontSize * 0.6
  while (nameFontSize > 14 && nameToShow.length * nameFontSize * 0.6 > maxNameWidth) {
    nameFontSize -= 2;
    nameY = 205 + nameFontSize * 0.2;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300" style="image-rendering: pixelated">
<defs>
  <style>
    @font-face {
      font-family: 'Zpix';
      src: url('/fonts/zpix.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Zpix';
      src: url('/fonts/zpix.ttf') format('truetype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Zpix';
      src: url('/fonts/zpix.ttf') format('truetype');
      font-weight: 400;
      font-style: italic;
    }
    @font-face {
      font-family: 'Zpix';
      src: url('/fonts/zpix.ttf') format('truetype');
      font-weight: 700;
      font-style: italic;
    }
    .mc-font { font-family: 'Zpix', monospace; }
    @keyframes safeFadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .anim-fade { animation: safeFadeUp 0.4s ease-out both; }
  </style>
  <filter id="shadow-dark" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#000000" flood-opacity="0.8" />
  </filter>
  <filter id="shadow-light" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#ffffff" flood-opacity="0.8" />
  </filter>
  <clipPath id="avatar-clip">
    <rect x="28" y="44" width="120" height="120" />
  </clipPath>
</defs>

<!-- 卡片外壳 -->
<rect x="0" y="0" width="500" height="300" fill="${FARM_PALETTE.ink}" />
<rect x="4" y="4" width="492" height="292" fill="${FARM_PALETTE.paper}" />
<polygon points="4,4 496,4 492,8 8,8 8,292 4,296" fill="#fff8df" />
<polygon points="496,296 496,4 492,8 492,292 8,292 4,296" fill="${FARM_PALETTE.paperDark}" />

<!-- 头像区（凹陷 border） -->
<g class="anim-fade" style="animation-delay: 0.1s">
  <rect x="24" y="40" width="128" height="128" fill="#ead5a4" />
  <polygon points="24,40 152,40 150,42 26,42 26,166 24,168" fill="#b78b5f" opacity="0.9" />
  <polygon points="152,168 152,40 150,42 150,166 26,166 24,168" fill="#fff8df" opacity="0.8" />
  <image href="${safeAvatarUrl}" x="28" y="44" width="120" height="120" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-clip)" style="image-rendering: pixelated" />
</g>

<!-- 昵称 -->
<g class="anim-fade" style="animation-delay: 0.2s">
  <text x="88" y="${nameY}" class="mc-font" font-size="${nameFontSize}" fill="${FARM_PALETTE.ink}" text-anchor="middle" font-weight="bold" filter="url(#shadow-light)">${safeName}</text>
</g>

<!-- JOINED -->
<g class="anim-fade" style="animation-delay: 0.3s">
  <image href="${ICONS.clock}" x="178" y="29" width="28" height="28" filter="url(#shadow-dark)" />
  <text x="215" y="53" class="mc-font" font-size="20" fill="#72543f" font-weight="bold">PLANTED: <tspan fill="${FARM_PALETTE.ink}">${escapeXml(joinDate)}</tspan></text>
  <rect x="180" y="65" width="290" height="2" fill="#aa8159" opacity="0.5" />
  <rect x="180" y="67" width="290" height="2" fill="#fff8df" opacity="0.8" />
</g>

<!-- STARS -->
<g class="anim-fade" style="animation-delay: 0.4s">
  <image href="${ICONS.star}" x="178" y="79" width="28" height="28" filter="url(#shadow-dark)" />
  <text x="215" y="103" class="mc-font" font-size="20" fill="#72543f" font-weight="bold">STARS: <tspan fill="${FARM_PALETTE.ink}">${stars.toLocaleString()}</tspan></text>
  <rect x="180" y="115" width="290" height="2" fill="#aa8159" opacity="0.5" />
  <rect x="180" y="117" width="290" height="2" fill="#fff8df" opacity="0.8" />
</g>

<!-- COMMITS -->
<g class="anim-fade" style="animation-delay: 0.5s">
  <image href="${ICONS.pickaxe}" x="178" y="129" width="28" height="28" filter="url(#shadow-dark)" />
  <text x="215" y="153" class="mc-font" font-size="20" fill="#72543f" font-weight="bold">HARVEST: <tspan fill="${FARM_PALETTE.ink}">${commits.toLocaleString()}</tspan></text>
  <rect x="180" y="165" width="290" height="2" fill="#aa8159" opacity="0.5" />
  <rect x="180" y="167" width="290" height="2" fill="#fff8df" opacity="0.8" />
</g>

<!-- FOLLOWERS -->
<g class="anim-fade" style="animation-delay: 0.6s">
  <image href="${ICONS.emerald}" x="178" y="179" width="28" height="28" filter="url(#shadow-dark)" />
  <text x="215" y="203" class="mc-font" font-size="20" fill="#72543f" font-weight="bold">NEIGHBORS: <tspan fill="${FARM_PALETTE.ink}">${followers.toLocaleString()}</tspan></text>
</g>

<!-- 签名栏 -->
<g class="anim-fade" style="animation-delay: 0.7s">
  <rect x="24" y="234" width="452" height="36" fill="#ead5a4" />
  <polygon points="24,234 476,234 474,236 26,236 26,268 24,270" fill="#b78b5f" opacity="0.8" />
  <polygon points="476,270 476,234 474,236 474,268 26,268 24,270" fill="#fff8df" opacity="0.8" />
  <text x="250" y="258" class="mc-font" font-size="22" fill="#444444" text-anchor="middle" font-style="italic" letter-spacing="0.5">${safeQuote || ""}</text>
</g>

<!-- 水印 -->
<text x="470" y="288" class="mc-font anim-fade" font-size="12" fill="#8d6b50" text-anchor="end" font-weight="bold" style="animation-delay: 0.8s">Grown by FarmCraft</text>
</svg>`;
}

/**
 * 服务端烘焙版：所有 <text> 转为 <path>，不依赖远程字体。
 * 所有 <image> 使用内嵌 base64 data URI，不依赖外部 CDN。
 * 用于 API 路由返回的 SVG（嵌入 GitHub README 等场景）。
 */
export async function generateBakedCardSvg(params: CardSvgParams): Promise<string> {
  await ensureFontsLoaded();
  await ensureCardAssetsLoaded();

  const { username, displayName, avatarUrl, joinDate, stars, commits, followers, quote } = params;

  // 将外部资源转为 data URI
  const avatarDataUri = escapeXml(await avatarToDataUri(avatarUrl));
  const clockDataUri = await toDataUri(ICONS.clock);
  const starDataUri = await toDataUri(ICONS.star);
  const pickaxeDataUri = await toDataUri(ICONS.pickaxe);
  const emeraldDataUri = await toDataUri(ICONS.emerald);

  const nameToShow = displayName || username;
  const safeName = escapeXml(nameToShow);
  const safeQuote = escapeXml(quote);

  // 名字区域可用宽度约 128px（头像宽度），预留两侧各 8px padding = 112px
  const maxNameWidth = 112;
  let nameFontSize = 36;
  let nameY = 212;
  while (nameFontSize > 14 && nameToShow.length * nameFontSize * 0.6 > maxNameWidth) {
    nameFontSize -= 2;
    nameY = 205 + nameFontSize * 0.2;
  }

  // 烘焙所有文本元素
  const namePath = bakeTextElement({
    text: safeName, x: 88, y: nameY, fontSize: nameFontSize,
    fill: FARM_PALETTE.ink, textAnchor: "middle", fontWeight: "bold", filter: 'url(#shadow-light)',
  });

  const joinedPath = bakeTextWithTspans({
    segments: [
      { text: "PLANTED: ", fill: "#72543f" },
      { text: escapeXml(joinDate), fill: FARM_PALETTE.ink },
    ],
    x: 215, y: 53, fontSize: 20, fill: "#72543f", fontWeight: "bold",
  });

  const starsPath = bakeTextWithTspans({
    segments: [
      { text: "STARS: ", fill: "#72543f" },
      { text: stars.toLocaleString(), fill: FARM_PALETTE.ink },
    ],
    x: 215, y: 103, fontSize: 20, fill: "#72543f", fontWeight: "bold",
  });

  const commitsPath = bakeTextWithTspans({
    segments: [
      { text: "HARVEST: ", fill: "#72543f" },
      { text: commits.toLocaleString(), fill: FARM_PALETTE.ink },
    ],
    x: 215, y: 153, fontSize: 20, fill: "#72543f", fontWeight: "bold",
  });

  const followersPath = bakeTextWithTspans({
    segments: [
      { text: "NEIGHBORS: ", fill: "#72543f" },
      { text: followers.toLocaleString(), fill: FARM_PALETTE.ink },
    ],
    x: 215, y: 203, fontSize: 20, fill: "#72543f", fontWeight: "bold",
  });

  const quotePath = safeQuote
    ? bakeTextElement({
        text: safeQuote, x: 250, y: 258, fontSize: 22,
        fill: "#444444", textAnchor: "middle", fontStyle: "italic",
      })
    : "";

  const watermarkPath = bakeTextElement({
    text: "Grown by FarmCraft", x: 470, y: 288, fontSize: 12,
    fill: "#8d6b50", textAnchor: "end", fontWeight: "bold",
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300" style="image-rendering: pixelated">
<defs>
  <style>
    @keyframes safeFadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .anim-fade { animation: safeFadeUp 0.4s ease-out both; }
  </style>
  <filter id="shadow-dark" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#000000" flood-opacity="0.8" />
  </filter>
  <filter id="shadow-light" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#ffffff" flood-opacity="0.8" />
  </filter>
  <clipPath id="avatar-clip">
    <rect x="28" y="44" width="120" height="120" />
  </clipPath>
</defs>

<!-- 卡片外壳 -->
<rect x="0" y="0" width="500" height="300" fill="${FARM_PALETTE.ink}" />
<rect x="4" y="4" width="492" height="292" fill="${FARM_PALETTE.paper}" />
<polygon points="4,4 496,4 492,8 8,8 8,292 4,296" fill="#fff8df" />
<polygon points="496,296 496,4 492,8 492,292 8,292 4,296" fill="${FARM_PALETTE.paperDark}" />

<!-- 头像区（凹陷 border） -->
<g class="anim-fade" style="animation-delay: 0.1s">
  <rect x="24" y="40" width="128" height="128" fill="#ead5a4" />
  <polygon points="24,40 152,40 150,42 26,42 26,166 24,168" fill="#b78b5f" opacity="0.9" />
  <polygon points="152,168 152,40 150,42 150,166 26,166 24,168" fill="#fff8df" opacity="0.8" />
  <image href="${avatarDataUri}" x="28" y="44" width="120" height="120" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-clip)" style="image-rendering: pixelated" />
</g>

<!-- 昵称 -->
<g class="anim-fade" style="animation-delay: 0.2s">
  ${namePath}
</g>

<!-- JOINED -->
<g class="anim-fade" style="animation-delay: 0.3s">
  <image href="${clockDataUri}" x="178" y="29" width="28" height="28" filter="url(#shadow-dark)" />
  ${joinedPath}
  <rect x="180" y="65" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="67" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- STARS -->
<g class="anim-fade" style="animation-delay: 0.4s">
  <image href="${starDataUri}" x="178" y="79" width="28" height="28" filter="url(#shadow-dark)" />
  ${starsPath}
  <rect x="180" y="115" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="117" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- COMMITS -->
<g class="anim-fade" style="animation-delay: 0.5s">
  <image href="${pickaxeDataUri}" x="178" y="129" width="28" height="28" filter="url(#shadow-dark)" />
  ${commitsPath}
  <rect x="180" y="165" width="290" height="2" fill="#888888" opacity="0.5" />
  <rect x="180" y="167" width="290" height="2" fill="#ffffff" opacity="0.8" />
</g>

<!-- FOLLOWERS -->
<g class="anim-fade" style="animation-delay: 0.6s">
  <image href="${emeraldDataUri}" x="178" y="179" width="28" height="28" filter="url(#shadow-dark)" />
  ${followersPath}
</g>

<!-- 签名栏 -->
<g class="anim-fade" style="animation-delay: 0.7s">
  <rect x="24" y="234" width="452" height="36" fill="#ead5a4" />
  <polygon points="24,234 476,234 474,236 26,236 26,268 24,270" fill="#b78b5f" opacity="0.8" />
  <polygon points="476,270 476,234 474,236 474,268 26,268 24,270" fill="#fff8df" opacity="0.8" />
  ${quotePath}
</g>

<!-- 水印 -->
<g class="anim-fade" style="animation-delay: 0.8s">
  ${watermarkPath}
</g>
</svg>`;
}
