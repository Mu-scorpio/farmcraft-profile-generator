import {
  fetchRepoInfo,
  getGitHubErrorPayload,
  getGitHubErrorStatus,
} from "@/app/lib/github";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  const url = new URL(request.url);
  const { searchParams } = url;
  const token = searchParams.get("token") || "";

  try {
    const repoInfo = await fetchRepoInfo(owner, repo, token);
    return Response.json(repoInfo, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    const payload = getGitHubErrorPayload(err);
    return Response.json(payload, { status: getGitHubErrorStatus(err) });
  }
}
