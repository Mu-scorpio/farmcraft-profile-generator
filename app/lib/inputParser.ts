export type ParsedGitHubInput =
  | { type: "repo"; owner: string; repo: string }
  | { type: "user"; username: string };

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const PROFILE_SECTIONS = new Set([
  "followers",
  "following",
  "repositories",
  "repos",
  "stars",
  "projects",
  "packages",
  "sponsorships",
]);

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cleanValue(value: string): string {
  return value
    .trim()
    .replace(/^[<([{"'`]+/u, "")
    .replace(/[)\]}>.,;!?]+$/u, "");
}

function cleanSegment(value: string): string {
  return cleanValue(decodeSegment(value)).replace(/\.git$/i, "");
}

function parseGitHubPath(pathname: string): ParsedGitHubInput | null {
  const segments = pathname
    .split("/")
    .map(cleanSegment)
    .filter(Boolean);
  if (segments.length === 0) return null;

  const first = segments[0].toLowerCase();
  if ((first === "users" || first === "user") && segments[1]) {
    return { type: "user", username: segments[1] };
  }

  if (segments.length >= 2 && PROFILE_SECTIONS.has(segments[1].toLowerCase())) {
    return { type: "user", username: segments[0] };
  }

  if (segments.length >= 2) {
    return { type: "repo", owner: segments[0], repo: segments[1] };
  }

  return { type: "user", username: segments[0] };
}

export function parseGitHubInput(rawInput: string): ParsedGitHubInput | null {
  const raw = cleanValue(rawInput);
  if (!raw) return null;

  const embeddedUrl = raw.match(/(?:git\+)?(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s<>"'`]+/iu)?.[0];
  const input = cleanValue(embeddedUrl || raw).replace(/^git\+/i, "");

  const sshMatch = input.match(/^git@github\.com:([^/\s]+)\/([^/\s?#]+)(?:[/?#].*)?$/i);
  if (sshMatch) {
    return { type: "repo", owner: cleanSegment(sshMatch[1]), repo: cleanSegment(sshMatch[2]) };
  }

  const hasUrlScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(input);
  const hasGitHubHost = /^(?:www\.)?github\.com(?:\/|$)/i.test(input);
  const urlCandidate = hasUrlScheme
    ? input
    : hasGitHubHost
      ? `https://${input}`
      : null;

  if (urlCandidate) {
    try {
      const url = new URL(urlCandidate);
      if (GITHUB_HOSTS.has(url.hostname.toLowerCase())) {
        return parseGitHubPath(url.pathname);
      }
    } catch {
      return null;
    }
  } else if (hasUrlScheme) {
    return null;
  }

  const shortPath = input.replace(/^\/+|\/+$/g, "").split(/[?#]/u, 1)[0];
  const shortRepo = shortPath.match(/^([^/\s]+)\/([^/\s?#]+)$/u);
  if (shortRepo) {
    return { type: "repo", owner: cleanSegment(shortRepo[1]), repo: cleanSegment(shortRepo[2]) };
  }

  const username = cleanSegment(shortPath.replace(/^@+/, ""));
  return username && !/[/:\s]/u.test(username) ? { type: "user", username } : null;
}
