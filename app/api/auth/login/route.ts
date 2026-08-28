import { authConfiguration, authCookie, createAuthToken, inviteCodes, userIdForInvite } from "../../../lib/auth";
import { sameOrigin } from "../../../lib/runtime-data";
import { ensureUser } from "../../../lib/storage";

function normalize(value: unknown) { return typeof value === "string" ? value.trim().toUpperCase().slice(0, 40) : ""; }

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error:"请求来源无效。" }, { status:403 });
  let body: Record<string, unknown>; try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error:"邀请码无法读取。" }, { status:400 }); }
  const code = normalize(body.code); const allowed = inviteCodes();
  if (!authConfiguration().sessionSecret || allowed.length === 0) return Response.json({ error:"登录服务尚未完成生产配置。", code:"AUTH_NOT_CONFIGURED" }, { status:503 });
  if (!code || !allowed.includes(code)) return Response.json({ error:"邀请码无效，请检查后重试。" }, { status:401 });
  try {
    const userId = await userIdForInvite(code); await ensureUser(userId);
    const token = await createAuthToken(userId); const secure = process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:";
    return Response.json({ authenticated:true }, { headers:{ "Cache-Control":"no-store", "Set-Cookie":authCookie(token, secure) } });
  } catch { return Response.json({ error:"登录数据暂时无法写入，请稍后重试。", code:"AUTH_STORAGE_UNAVAILABLE" }, { status:503 }); }
}
