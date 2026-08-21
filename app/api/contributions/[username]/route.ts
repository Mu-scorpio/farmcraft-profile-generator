import {
    fetchContributions,
    getGitHubErrorPayload,
    getGitHubErrorStatus,
} from "@/app/lib/github";

export const runtime = "nodejs";

export async function GET(
    request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const url = new URL(request.url);
    console.log("[API] ====== 收到请求 ======");
    const safeLogUrl = new URL(url);
    safeLogUrl.searchParams.delete("token");
    console.log("[API] URL:", safeLogUrl.toString());

    const {username} = await params;
    console.log("[API] 解析到 username:", username);

    const {searchParams} = url;

    // Anonymous access is attempted first inside fetchContributions. This
    // query parameter remains supported for backwards compatibility, but
    // environment and GitHub CLI credentials are resolved server-side.
    const token = searchParams.get("token") || "";
    console.log("[API] 认证策略: 先尝试匿名访问，失败后尝试环境变量 token / GitHub CLI");

    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    console.log("[API] 日期范围: from =", from ?? "(默认)", "| to =", to ?? "(默认)");

    try {
        console.log("[API] 开始调用 fetchContributions...");
        const { calendar, avatarUrl, stats } = await fetchContributions(username, token, from, to);
        console.log("[API] ✅ 成功! totalContributions =", calendar.totalContributions, "| weeks =", calendar.weeks.length);

        return Response.json({ ...calendar, avatarUrl, stats }, {
            headers: {
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
            },
        });
    } catch (err) {
        const payload = getGitHubErrorPayload(err);
        const status = getGitHubErrorStatus(err);
        console.log("[API] ❌ GitHub 请求失败! code =", payload.code, "status =", status);
        return Response.json(payload, {status});
    }
}
