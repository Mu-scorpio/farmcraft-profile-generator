import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  fetchContributions,
  getGitHubErrorPayload,
  getGitHubErrorStatus,
} from "@/app/lib/github";
import { generateMapSvg } from "@/app/lib/mapSvg";

export const runtime = "nodejs";

let cachedBorderDataUri: Promise<string> | null = null;

function loadMeadowBorderDataUri(): Promise<string> {
  if (!cachedBorderDataUri) {
    const assetPath = path.join(process.cwd(), "public", "assets", "farm", "meadow-border.png");
    cachedBorderDataUri = readFile(assetPath).then((bytes) => `data:image/png;base64,${bytes.toString("base64")}`);
  }
  return cachedBorderDataUri;
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
  const { searchParams } = url;
  const token = searchParams.get("token") || "";

  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const animate = searchParams.get("animate") === "true";

  try {
    const { calendar } = await fetchContributions(username, token, from, to);
    const borderHref = await loadMeadowBorderDataUri();
    const svg = generateMapSvg({ weeks: calendar.weeks, interactive: false, animate, borderHref });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    const payload = getGitHubErrorPayload(err);
    const status = getGitHubErrorStatus(err);
    const message = `${payload.error} ${payload.recommendation}`;
    const escapedMsg = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="80"><text x="10" y="30" fill="red" font-size="14">${escapedMsg}</text></svg>`,
      { status, headers: { "Content-Type": "image/svg+xml" } },
    );
  }
}
