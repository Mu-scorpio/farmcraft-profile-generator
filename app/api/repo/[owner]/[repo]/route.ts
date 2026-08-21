import {
  fetchRepoInfo,
  getGitHubErrorPayload,
  getGitHubErrorStatus,
} from "@/app/lib/github";
import { generateBakedRepoSvg, escapeXml } from "@/app/lib/repoSvg";
import { loadRepoCardAssetUris } from "@/app/lib/repoCardAssetData";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const routeParams = await params;
  const owner = routeParams.owner;
  let repo = routeParams.repo;

  if (repo.endsWith(".svg")) {
    repo = repo.slice(0, -4);
  }

  const url = new URL(request.url);
  const { searchParams } = url;
  const token = searchParams.get("token") || "";

  try {
    const repoInfo = await fetchRepoInfo(owner, repo, token);
    const assetUris = await loadRepoCardAssetUris();
    const svg = await generateBakedRepoSvg(repoInfo, assetUris);

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    const payload = getGitHubErrorPayload(err);
    const status = getGitHubErrorStatus(err);
    const escapedMsg = escapeXml(`${payload.error} ${payload.recommendation}`);
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="80"><text x="10" y="30" fill="red" font-size="14">${escapedMsg}</text></svg>`,
      { status, headers: { "Content-Type": "image/svg+xml" } },
    );
  }
}
