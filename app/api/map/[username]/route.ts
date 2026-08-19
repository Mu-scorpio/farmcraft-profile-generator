import { fetchContributions } from "@/app/lib/github";
import { generateMapSvg } from "@/app/lib/mapSvg";

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
  const token = searchParams.get("token") || process.env["GITHUB_TOKEN"] || "";

  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const animate = searchParams.get("animate") === "true";

  try {
    const { calendar } = await fetchContributions(username, token, from, to);
    const svg = generateMapSvg({ weeks: calendar.weeks, interactive: false, animate });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    const escapedMsg = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="50"><text x="10" y="30" fill="red" font-size="14">${escapedMsg}</text></svg>`,
      { status, headers: { "Content-Type": "image/svg+xml" } },
    );
  }
}
