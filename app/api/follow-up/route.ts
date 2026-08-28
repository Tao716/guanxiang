import { calculateOracle, isLineValue, type LineValue } from "../../lib/oracle";
import { buildStructuredReading } from "../../lib/oracle-knowledge";
import { isBirthContext, isTopicContext, readingTopics, type ReadingTopic } from "../../lib/birth-context";
import { aiHeaders, aiJsonMode, getAiRuntime } from "../../lib/ai-provider";
import { publicEvidence, retrieveOracleEvidence } from "../../lib/oracle-rag";
import { consumeQuota, quotaHeaders, recordAiGeneration, sameOrigin } from "../../lib/runtime-data";

function text(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }
function list(value: unknown, max: number, maxLength: number) { return Array.isArray(value) ? value.map((item) => text(item, maxLength)).filter(Boolean).slice(0, max) : []; }
function safeObject(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function safeProfile(value: unknown) {
  const item = safeObject(value); const birth = isBirthContext(item.birthContext) ? item.birthContext : undefined;
  const topic = readingTopics.some((entry) => entry.id === item.topic) ? item.topic as ReadingTopic : "事业";
  const topicContext = isTopicContext(item.topicContext) ? { situation:text(item.topicContext.situation, 20), focus:text(item.topicContext.focus, 20), horizon:text(item.topicContext.horizon, 10) } : undefined;
  return {
    nickname:text(item.nickname, 12), lifeStage:text(item.lifeStage, 12), focus:text(item.focus, 12), responseStyle:text(item.responseStyle, 12), topic,
    birthContext:birth ? { constellation:text(birth.constellation, 12), zodiac:text(birth.zodiac, 4), pillars:birth.pillars.map((pillar) => text(pillar, 8)), dayMaster:text(birth.dayMaster, 2), dayElement:birth.dayElement, timePrecision:birth.timePrecision, reflection:text(birth.reflection, 100) } : undefined,
    topicContext,
  };
}
function parseModelJson(content: string) {
  try { const value = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as Record<string, unknown>; const answer = text(value.answer, 600); return answer ? { answer, suggestedQuestions:list(value.suggestedQuestions, 3, 70) } : null; }
  catch { return null; }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error:"请求来源无效。" }, { status:403 });
  let raw: Record<string, unknown>;
  try { raw = safeObject(await request.json()); } catch { return Response.json({ error:"请求内容无法读取。" }, { status:400 }); }
  const question = text(raw.question, 80); const category = text(raw.category, 10); const followUp = text(raw.followUp, 160);
  if (!question || !followUp || !Array.isArray(raw.lines) || raw.lines.length !== 6 || !raw.lines.every(isLineValue)) return Response.json({ error:"对话上下文不完整，请重新打开这张卦笺。" }, { status:400 });
  const runtime = getAiRuntime(); if (!runtime) return Response.json({ error:"连续解读模型尚未配置。", code:"AI_NOT_CONFIGURED" }, { status:503 });
  const quota = await consumeQuota(request, "follow-up"); const responseHeaders = quotaHeaders(quota);
  if (!quota.allowed) return Response.json({ error:`今日连续追问额度已用完（${quota.used - 1}/${quota.limit}），可明日继续或升级 Plus。`, code:"QUOTA_EXCEEDED", quota }, { status:429, headers:responseHeaders });
  const startedAt = Date.now(); const inputChars = JSON.stringify(raw).length;
  const messages = Array.isArray(raw.messages) ? raw.messages.flatMap((entry) => { const item = safeObject(entry); const role = item.role === "user" || item.role === "assistant" ? item.role : null; const content = text(item.content, 600); return role && content ? [{ role, content }] : []; }).slice(-8) : [];
  const lines = raw.lines as LineValue[];
  const profile = safeProfile(raw.profile);
  const retrievedEvidence = retrieveOracleEvidence(lines, `${profile.topic} ${profile.topicContext?.situation ?? ""} ${profile.topicContext?.focus ?? ""} ${question} ${followUp}`, category);
  const context = { current:{ question, category, oracle:calculateOracle(lines), knowledge:buildStructuredReading(lines, question, category, profile.topicContext), retrievedEvidence:publicEvidence(retrievedEvidence), aiReading:safeObject(raw.aiReading) }, profile, recentReadings:Array.isArray(raw.recentContext) ? raw.recentContext.slice(0, 5).map(safeObject) : [], conversation:messages, followUp };
  const system = `你是“观象”的连续解读助手。请用中文回答，温和、具体、克制。当前卦象由确定性算法计算，不能改卦或重新起卦。必须先直接回答用户追问的现实问题，再说明卦象与知识证据如何支持该回答；不得用通用卦辞、意象或人格判断代替答案。把当前卦象、个人偏好、近期卦笺与本段对话结合起来回答；明确区分“本次卦象”和“过去问过的主题”。birthContext 只作为传统文化反思角度，不能用来断言性格、命运或未来结果，模型不会收到原始生日和出生时间；若 birthContext 存在，每次回答至少用一句说明日主/四柱背景与当前卦象是相互印证还是形成张力，再回到现实行动。topicContext 是用户主动选择的当前处境、关注点和观察周期，只能用于贴近现实，不能扩写成未提供的事实。retrievedEvidence 已经由服务端检索和轻量重排：sourceType=classic-original 才是可逐字引用的公版《周易》原文，且只能引用 excerpt 中存在的字句；sourceType=internal-modern 是观象现代解释，不得冒充经典。不得编造引文或外部出处。不展示内部推理，不给必然预测。医疗、法律、投资及危机问题提醒寻求专业帮助。仅返回 JSON：answer（180至350字为宜）和 suggestedQuestions（恰好3个短问题）。`;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 28_000);
  try {
    const response = await fetch(`${runtime.baseUrl}/chat/completions`, { method:"POST", headers:aiHeaders(runtime, request, "Guanxiang"), body:JSON.stringify({ model:runtime.model, ...aiJsonMode(runtime), temperature:.55, max_tokens:900, response_format:{ type:"json_object" }, messages:[{ role:"system", content:system },{ role:"user", content:`请回答这次追问：\n${JSON.stringify(context)}` }] }), signal:controller.signal });
    if (!response.ok) { await recordAiGeneration({ visitorId:quota.visitorId, feature:"follow-up", runtime, status:"error", latencyMs:Date.now() - startedAt, inputChars, errorCode:`PROVIDER_${response.status}` }); return Response.json({ error:response.status === 429 ? "模型服务繁忙，请稍后再试。" : "连续追问暂时不可用，请稍后再试。" }, { status:response.status === 429 ? 429 : 502, headers:responseHeaders }); }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }; const content = payload.choices?.[0]?.message?.content; const result = typeof content === "string" ? parseModelJson(content) : null;
    if (!result) { await recordAiGeneration({ visitorId:quota.visitorId, feature:"follow-up", runtime, status:"error", latencyMs:Date.now() - startedAt, inputChars, outputChars:typeof content === "string" ? content.length : 0, errorCode:"INVALID_OUTPUT" }); return Response.json({ error:"这次追问没有完整生成，请重新试一次。" }, { status:502, headers:responseHeaders }); }
    await recordAiGeneration({ visitorId:quota.visitorId, feature:"follow-up", runtime, status:"success", latencyMs:Date.now() - startedAt, inputChars, outputChars:typeof content === "string" ? content.length : 0 });
    return Response.json({ ...result, quota:{ remaining:quota.remaining, limit:quota.limit, plan:quota.plan } }, { headers:responseHeaders });
  } catch (error) { await recordAiGeneration({ visitorId:quota.visitorId, feature:"follow-up", runtime, status:"error", latencyMs:Date.now() - startedAt, inputChars, errorCode:error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "NETWORK" }); return Response.json({ error:error instanceof Error && error.name === "AbortError" ? "模型响应较慢，请再试一次。" : "连续追问暂时不可用，请稍后再试。" }, { status:502, headers:responseHeaders }); }
  finally { clearTimeout(timeout); }
}
