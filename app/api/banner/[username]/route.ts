import {
  buildStats,
  generateLootHallSvg,
} from "@/app/lib/bannerSvg";
import {
  fetchContributions,
  getGitHubErrorPayload,
  getGitHubErrorStatus,
} from "@/app/lib/github";

export const runtime = "nodejs";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  let { username } = await params;

  if (username.endsWith(".svg")) {
    username = username.slice(0, -4);
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";

  try {
    const { calendar, stats } = await fetchContributions(username, token);
    const svg = generateLootHallSvg(buildStats(stats, calendar.totalContributions));

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    const payload = getGitHubErrorPayload(err);
    const status = getGitHubErrorStatus(err);
    const message = escapeXml(`${payload.error} ${payload.recommendation}`);
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="80"><text x="10" y="30" fill="red" font-size="14">${message}</text></svg>`,
      { status, headers: { "Content-Type": "image/svg+xml" } },
    );
  }
}
