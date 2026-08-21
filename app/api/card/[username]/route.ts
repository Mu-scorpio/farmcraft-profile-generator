import {
  fetchContributions,
  getGitHubErrorPayload,
  getGitHubErrorStatus,
} from "@/app/lib/github";
import { generateBakedCardSvg, escapeXml } from "@/app/lib/cardSvg";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  let { username } = await params;

  if (username.endsWith(".svg")) {
    username = username.slice(0, -4);
  }

  const url = new URL(request.url);
  const { searchParams } = url;
  const token = searchParams.get("token") || "";

  const quote = searchParams.get("quote") || "Exploring the infinite code blocks.";

  try {
    const { calendar, avatarUrl, stats } = await fetchContributions(username, token);
    const joinDate = stats.createdAt ? stats.createdAt.slice(0, 10) : "Unknown";

    const svg = await generateBakedCardSvg({
      username,
      displayName: stats.name || username,
      avatarUrl,
      joinDate,
      stars: stats.totalStars,
      commits: calendar.totalContributions,
      followers: stats.followers,
      quote,
    });

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
