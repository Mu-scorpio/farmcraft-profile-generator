import { fetchRepoInfo } from "@/app/lib/github";
import { generateBakedRepoSvg, escapeXml } from "@/app/lib/repoSvg";
import { loadRepoCardAssetUris } from "@/app/lib/repoCardAssetData";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  let { owner, repo } = await params;

  if (repo.endsWith(".svg")) {
    repo = repo.slice(0, -4);
  }

  const url = new URL(request.url);
  const { searchParams } = url;
  const token = searchParams.get("token") || process.env["GITHUB_TOKEN"] || "";

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
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    const escapedMsg = escapeXml(message);
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="50"><text x="10" y="30" fill="red" font-size="14">${escapedMsg}</text></svg>`,
      { status, headers: { "Content-Type": "image/svg+xml" } },
    );
  }
}
