import type { AiRuntime } from "./ai-provider";
import { userIdFromRequest } from "./auth";
import { appendAiGeneration, appendUsageEvent, consumeUserQuota, membershipForUser } from "./storage";

export type AiFeature = "deep-reading" | "follow-up" | "affinity-reading"; export type MembershipPlan = "free" | "plus";
const FREE_LIMITS: Record<AiFeature, number> = { "deep-reading":3, "follow-up":10, "affinity-reading":2 };
const PLUS_LIMITS: Record<AiFeature, number> = { "deep-reading":60, "follow-up":200, "affinity-reading":20 };
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set([new URL(request.url).origin]);
  const siteUrl = process.env.SITE_URL?.trim();
  if (siteUrl) {
    try { allowed.add(new URL(siteUrl).origin); } catch { /* Invalid SITE_URL remains disallowed. */ }
  }
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) allowed.add(`${request.headers.get("x-forwarded-proto") || "https"}://${forwardedHost}`);
  return allowed.has(origin);
}
export function limitsForPlan(plan: MembershipPlan) { return plan === "plus" ? PLUS_LIMITS : FREE_LIMITS; }
export async function membershipForVisitor(userId: string | null) { const membership = userId ? await membershipForUser(userId) : { plan:"free", status:"active", currentPeriodEnd:null }; return { plan:membership.plan === "plus" ? "plus" as const : "free" as const, status:membership.status, currentPeriodEnd:membership.currentPeriodEnd }; }
export async function consumeQuota(request: Request, feature: AiFeature) {
  const userId = await userIdFromRequest(request); if (!userId) return { allowed:false, used:0, limit:0, remaining:0, plan:"free" as const, resetAt:"", visitorId:null, authRequired:true };
  const membership = await membershipForVisitor(userId); const limit = limitsForPlan(membership.plan)[feature]; const quota = await consumeUserQuota(userId, feature, limit);
  const nextDay = new Date(); nextDay.setUTCHours(24, 0, 0, 0);
  return { ...quota, plan:membership.plan, resetAt:nextDay.toISOString(), visitorId:userId, authRequired:false };
}
export function quotaHeaders(quota: { limit:number; remaining:number; resetAt:string; plan:MembershipPlan }) { return { "X-RateLimit-Limit":String(quota.limit), "X-RateLimit-Remaining":String(quota.remaining), "X-RateLimit-Reset":quota.resetAt, "X-Guanxiang-Plan":quota.plan }; }
export async function recordAiGeneration(input: { visitorId:string | null; feature:AiFeature; runtime:AiRuntime; status:"success" | "error"; latencyMs:number; inputChars:number; outputChars?:number; errorCode?:string }) { try { await appendAiGeneration({ userId:input.visitorId, feature:input.feature, provider:input.runtime.provider, model:input.runtime.model, status:input.status, latencyMs:input.latencyMs, inputChars:input.inputChars, outputChars:input.outputChars ?? 0, errorCode:input.errorCode ?? null }); } catch { /* Telemetry cannot block model output. */ } }
export async function recordUsageEvent(request: Request, eventName:string, route:string, metadata?:Record<string,unknown>) { try { await appendUsageEvent({ userId:await userIdFromRequest(request), eventName, route, metadata }); } catch { /* Best effort. */ } }
