import { userIdFromRequest } from "../../lib/auth";
import { sameOrigin } from "../../lib/runtime-data";
import { appendFeedback } from "../../lib/storage";
function text(value: unknown, max:number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error:"请求来源无效。" }, { status:403 }); const userId = await userIdFromRequest(request); if (!userId) return Response.json({ error:"请先登录。" }, { status:401 });
  let body:Record<string,unknown>; try { body = await request.json() as Record<string,unknown>; } catch { return Response.json({ error:"反馈内容无法读取。" }, { status:400 }); }
  const helpful = body.helpful === true ? true : body.helpful === false ? false : null; const readingId = typeof body.readingId === "number" && Number.isSafeInteger(body.readingId) ? body.readingId : null; if (helpful === null) return Response.json({ error:"请选择这次解读是否有帮助。" }, { status:400 });
  try { await appendFeedback({ userId, readingId, helpful, reason:text(body.reason, 240) || null }); return Response.json({ saved:true }); } catch { return Response.json({ error:"反馈暂时无法保存。" }, { status:503 }); }
}
