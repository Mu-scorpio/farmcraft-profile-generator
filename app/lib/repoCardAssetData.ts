import { readFile } from "node:fs/promises";
import path from "node:path";
import { REPO_CARD_ASSET_SOURCES, REPO_CARD_RENDER_ASSET_KEYS } from "./themeAssets";
import type { RepoCardAssetKey, RepoCardAssetUris } from "./repoSvg";

let cachedAssetUris: Promise<RepoCardAssetUris> | null = null;

function assetPath(url: string): string {
  return path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
}

async function readPngAsDataUri(url: string): Promise<string> {
  const bytes = await readFile(assetPath(url));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

/** Load the complete repository-card asset set required by self-contained SVG exports. */
export function loadRepoCardAssetUris(): Promise<RepoCardAssetUris> {
  if (!cachedAssetUris) {
    cachedAssetUris = Promise.all(
      REPO_CARD_RENDER_ASSET_KEYS.map(async (key) => [
        key as RepoCardAssetKey,
        await readPngAsDataUri(REPO_CARD_ASSET_SOURCES[key]),
      ] as const),
    )
      .then((entries) => Object.fromEntries(entries) as RepoCardAssetUris);
  }
  return cachedAssetUris;
}
