import { readFile } from "node:fs/promises";
import path from "node:path";
import { REPO_CARD_ASSETS } from "./themeAssets";
import type { RepoCardAssetKey, RepoCardAssetUris } from "./repoSvg";

let cachedAssetUris: Promise<RepoCardAssetUris> | null = null;

function assetPath(url: string): string {
  return path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
}

async function readPngAsDataUri(url: string): Promise<string> {
  const bytes = await readFile(assetPath(url));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

/** Load the six assets required by the self-contained server SVG. */
export function loadRepoCardAssetUris(): Promise<RepoCardAssetUris> {
  if (!cachedAssetUris) {
    cachedAssetUris = Promise.all([
      ["frame", REPO_CARD_ASSETS.frame],
      ["hero", REPO_CARD_ASSETS.hero],
      ["star", REPO_CARD_ASSETS.iconStar],
      ["fork", REPO_CARD_ASSETS.iconFork],
      ["language", REPO_CARD_ASSETS.iconOrb],
      ["activity", REPO_CARD_ASSETS.iconGears],
    ].map(async ([key, url]) => [key as RepoCardAssetKey, await readPngAsDataUri(url)] as const))
      .then((entries) => Object.fromEntries(entries) as RepoCardAssetUris);
  }
  return cachedAssetUris;
}
