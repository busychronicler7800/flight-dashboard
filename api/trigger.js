export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return res.status(401).json({ error: "인증 토큰이 없습니다." });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  const GITHUB_PAT = process.env.GITHUB_PAT;

  try {
    // 1. 요청자가 관리자 본인(kangsihoo0530@gmail.com)인지 Supabase Auth로 검증
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: "유효하지 않은 로그인 세션입니다." });
    }

    const userData = await userRes.json();
    if (userData.email !== "kangsihoo0530@gmail.com") {
      return res.status(403).json({ error: "관리자 권한이 없습니다." });
    }

    // 2. GitHub Actions workflow_dispatch 트리거
    const { plan_id = "", force_notify = "true" } = req.body || {};

    const ghRes = await fetch(
      "https://api.github.com/repos/busychronicler7800/flight-tracker/actions/workflows/flight_tracker.yml/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "flight-dashboard",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            plan_id: plan_id ? String(plan_id) : "",
            force_notify: String(force_notify),
          },
        }),
      }
    );

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      return res.status(ghRes.status).json({ error: `GitHub API 오류: ${errText}` });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "서버 내부 오류" });
  }
}
