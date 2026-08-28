import { calculateAffinity, normalizeAffinityInput } from "../../lib/affinity";
import { aiHeaders, aiJsonMode, getAiRuntime } from "../../lib/ai-provider";
import { consumeQuota, quotaHeaders, recordAiGeneration, sameOrigin } from "../../lib/runtime-data";

type AiAffinityReading = { summary: string; strengths: string[]; frictions: string[]; conversation: string; actions: string[]; question: string };
function text(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }
function list(value: unknown, max: number, maxLength: number) { return Array.isArray(value) ? value.map((item) => text(item, maxLength)).filter(Boolean).slice(0, max) : []; }
function parseModel(content: string): AiAffinityReading | null {
  try {
    const raw = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as Record<string, unknown>;
    const result = { summary:text(raw.summary, 120), strengths:list(raw.strengths, 3, 130), frictions:list(raw.frictions, 3, 130), conversation:text(raw.conversation, 260), actions:list(raw.actions, 3, 120), question:text(raw.question, 100) };
    return result.summary && result.strengths.length === 3 && result.frictions.length === 3 && result.conversation && result.actions.length === 3 && result.question ? result : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error:"请求来源无效。" }, { status:403 });
  let input = null;
  try { input = normalizeAffinityInput(await request.json()); } catch { return Response.json({ error:"资料无法读取，请检查后重试。" }, { status:400 }); }
  if (!input) return Response.json({ error:"合缘资料不完整，请重新填写。" }, { status:400 });
  const runtime = getAiRuntime(); if (!runtime) return Response.json({ error:"合缘深读模型尚未配置。", code:"AI_NOT_CONFIGURED" }, { status:503 });
  const quota = await consumeQuota(request, "affinity-reading"); const responseHeaders = quotaHeaders(quota);
  if (!quota.allowed) return Response.json({ error:`今日合缘深读额度已用完（${quota.used - 1}/${quota.limit}），可明日继续或升级 Plus。`, code:"QUOTA_EXCEEDED", quota }, { status:429, headers:responseHeaders });
  const startedAt = Date.now(); const inputChars = JSON.stringify(input).length;
  const result = calculateAffinity(input);
  const safeContext = { relationship:result.relationship, chartA:{ label:"甲方", pillars:result.chartA.pillars.map((pillar) => pillar.value), dayElement:result.chartA.dayElement, elementCounts:result.chartA.elementCounts }, chartB:{ label:"乙方", pillars:result.chartB.pillars.map((pillar) => pillar.value), dayElement:result.chartB.dayElement, elementCounts:result.chartB.elementCounts }, metrics:result.metrics, dayRelation:result.dayRelation, branchRelation:result.branchRelation, observations:result.observations, actions:result.actions, calculationNote:result.calculationNote };
  const system = `你是“观象·合缘观照”的关系解读助手。这是传统文化视角下的关系反思，不是婚配结论或科学预测。
规则：
1. 结构数据由确定性历法与关系规则生成，不能修改四柱、关系指标或日支关系。
2. 不使用姓名、生日、城市、性别做推断；模型只会收到匿名后的四柱与结构结果。
3. 不说“天生一对、不合、注定、克夫、克妻”等决定性或歧视性话语。
4. 同时写优势与摩擦，把差异转化为沟通和边界建议；三项行动须能在七天内完成。
5. 仅返回 JSON，不展示内部推理。字段：summary、strengths（3项）、frictions（3项）、conversation、actions（3项）、question。`;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 28_000);
  try {
    const response = await fetch(`${runtime.baseUrl}/chat/completions`, { method:"POST", headers:aiHeaders(runtime, request, "Guanxiang Affinity"), body:JSON.stringify({ model:runtime.model, ...aiJsonMode(runtime), temperature:.5, max_tokens:1200, response_format:{ type:"json_object" }, messages:[{ role:"system", content:system },{ role:"user", content:`请解读这份匿名关系结构：\n${JSON.stringify(safeContext)}` }] }), signal:controller.signal });
    if (!response.ok) { await recordAiGeneration({ visitorId:quota.visitorId, feature:"affinity-reading", runtime, status:"error", latencyMs:Date.now() - startedAt, inputChars, errorCode:`PROVIDER_${response.status}` }); return Response.json({ error:response.status === 429 ? "模型服务繁忙，请稍后再试。" : "合缘深读暂时不可用，请稍后再试。" }, { status:response.status === 429 ? 429 : 502, headers:responseHeaders }); }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }; const content = payload.choices?.[0]?.message?.content; const reading = typeof content === "string" ? parseModel(content) : null;
    if (!reading) { await recordAiGeneration({ visitorId:quota.visitorId, feature:"affinity-reading", runtime, status:"error", latencyMs:Date.now() - startedAt, inputChars, outputChars:typeof content === "string" ? content.length : 0, errorCode:"INVALID_OUTPUT" }); return Response.json({ error:"这次深读没有完整生成，请重新试一次。" }, { status:502, headers:responseHeaders }); }
    await recordAiGeneration({ visitorId:quota.visitorId, feature:"affinity-reading", runtime, status:"success", latencyMs:Date.now() - startedAt, inputChars, outputChars:typeof content === "string" ? content.length : 0 });
    return Response.json({ reading, quota:{ remaining:quota.remaining, limit:quota.limit, plan:quota.plan } }, { headers:responseHeaders });
  } catch (error) { await recordAiGeneration({ visitorId:quota.visitorId, feature:"affinity-reading", runtime, status:"error", latencyMs:Date.now() - startedAt, inputChars, errorCode:error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "NETWORK" }); return Response.json({ error:error instanceof Error && error.name === "AbortError" ? "模型响应较慢，请再试一次。" : "合缘深读暂时不可用，请稍后再试。" }, { status:502, headers:responseHeaders }); }
  finally { clearTimeout(timeout); }
}
