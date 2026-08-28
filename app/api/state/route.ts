import { clearAuthCookie, userIdFromRequest } from "../../lib/auth";
import { deleteUserData, getUserState, saveUserState } from "../../lib/storage";
import { isBirthContext, isTopicContext, readingTopics, type BirthContext, type ReadingTopic, type TopicContext } from "../../lib/birth-context";
import { isLineValue, type LineValue } from "../../lib/oracle";
import { sameOrigin } from "../../lib/runtime-data";

const categories = new Set(["事业", "关系", "选择", "成长"]); const MAX_BODY_BYTES = 180_000;
type Profile = { nickname:string; lifeStage:string; focus:string; responseStyle:string; topic:ReadingTopic; birthContext?:BirthContext; topicContext?:TopicContext };
type StoredReading = { id:number; version:2; question:string; category:string; topic?:ReadingTopic; topicContext?:TopicContext; lines:LineValue[]; createdAt:string; reading?:unknown; aiReading?:unknown; commitment?:unknown; followUps?:unknown };
function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function optionalObject(value: unknown, max: number) { if (!value || typeof value !== "object") return undefined; try { return JSON.stringify(value).length <= max ? value : undefined; } catch { return undefined; } }
function cleanProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null; const input = value as Record<string, unknown>; const topic = readingTopics.some((entry) => entry.id === input.topic) ? input.topic as ReadingTopic : "事业";
  const rawBirth = isBirthContext(input.birthContext) ? input.birthContext : undefined; const rawTopic = isTopicContext(input.topicContext) ? input.topicContext : undefined;
  return { nickname:text(input.nickname, 12), lifeStage:text(input.lifeStage, 12) || "转型探索", focus:text(input.focus, 12) || "看清选择", responseStyle:text(input.responseStyle, 12) || "直接具体", topic,
    birthContext:rawBirth ? { constellation:text(rawBirth.constellation, 12), zodiac:text(rawBirth.zodiac, 4), pillars:rawBirth.pillars.map((pillar) => text(pillar, 8)), dayMaster:text(rawBirth.dayMaster, 2), dayElement:rawBirth.dayElement, timePrecision:rawBirth.timePrecision, reflection:text(rawBirth.reflection, 100) } : undefined,
    topicContext:rawTopic ? { situation:text(rawTopic.situation, 20), focus:text(rawTopic.focus, 20), horizon:text(rawTopic.horizon, 10) } : undefined };
}
function cleanReading(value: unknown): StoredReading | null {
  if (!value || typeof value !== "object") return null; const input = value as Record<string, unknown>; const id = typeof input.id === "number" && Number.isSafeInteger(input.id) ? input.id : null; const question = text(input.question, 80); const category = text(input.category, 10); const createdAt = text(input.createdAt, 40);
  if (id === null || !question || !categories.has(category) || !Array.isArray(input.lines) || input.lines.length !== 6 || !input.lines.every(isLineValue) || !Number.isFinite(Date.parse(createdAt))) return null;
  const topic = readingTopics.some((entry) => entry.id === input.topic) ? input.topic as ReadingTopic : undefined; const rawTopic = isTopicContext(input.topicContext) ? input.topicContext : undefined;
  return { id, version:2, question, category, topic, topicContext:rawTopic ? { situation:text(rawTopic.situation, 20), focus:text(rawTopic.focus, 20), horizon:text(rawTopic.horizon, 10) } : undefined, lines:input.lines as LineValue[], createdAt, reading:optionalObject(input.reading, 8_000), aiReading:optionalObject(input.aiReading, 12_000), commitment:optionalObject(input.commitment, 3_000), followUps:optionalObject(input.followUps, 18_000) };
}
function cleanReadings(value: unknown) { return Array.isArray(value) ? value.flatMap((item) => { const reading = cleanReading(item); return reading ? [reading] : []; }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 20) : []; }

export async function GET(request: Request) {
  const userId = await userIdFromRequest(request); if (!userId) return Response.json({ error:"请先登录。" }, { status:401 });
  try { const state = await getUserState(userId); return Response.json({ available:true, profile:cleanProfile(state.profile), history:cleanReadings(state.history) }, { headers:{ "Cache-Control":"no-store" } }); }
  catch { return Response.json({ available:false, error:"云端卦笺暂时不可用。" }, { status:503, headers:{ "Cache-Control":"no-store" } }); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error:"请求来源无效。" }, { status:403 }); const userId = await userIdFromRequest(request); if (!userId) return Response.json({ error:"请先登录。" }, { status:401 });
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) return Response.json({ error:"同步内容过大。" }, { status:413 });
  let payload: Record<string, unknown>; try { payload = await request.json() as Record<string, unknown>; } catch { return Response.json({ error:"同步内容无法读取。" }, { status:400 }); }
  const profile = cleanProfile(payload.profile); const history = cleanReadings(payload.history); if (!profile) return Response.json({ error:"个人资料格式不完整。" }, { status:400 });
  try { const result = await saveUserState(userId, profile, history); return Response.json({ available:true, ...result }, { headers:{ "Cache-Control":"no-store" } }); }
  catch { return Response.json({ available:false, error:"云端卦笺暂时无法保存。" }, { status:503 }); }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error:"请求来源无效。" }, { status:403 }); const userId = await userIdFromRequest(request); if (!userId) return Response.json({ error:"请先登录。" }, { status:401 });
  const scope = new URL(request.url).searchParams.get("scope") === "all" ? "all" : "readings";
  try { await deleteUserData(userId, scope); const headers = new Headers({ "Cache-Control":"no-store" }); if (scope === "all") headers.set("Set-Cookie", clearAuthCookie()); return Response.json({ available:true, deleted:scope }, { headers }); }
  catch { return Response.json({ available:false, error:scope === "all" ? "个人资料暂时无法删除。" : "卦笺暂时无法清空。" }, { status:503 }); }
}
