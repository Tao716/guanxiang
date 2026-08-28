import { userIdFromRequest } from "../../lib/auth";
import { plans } from "../../lib/billing";
import { limitsForPlan, membershipForVisitor, type AiFeature } from "../../lib/runtime-data";
import { usageForUser } from "../../lib/storage";
const features: AiFeature[] = ["deep-reading", "follow-up", "affinity-reading"];
export async function GET(request: Request) {
  const userId = await userIdFromRequest(request); if (!userId) return Response.json({ error:"请先登录。" }, { status:401 });
  const membership = await membershipForVisitor(userId); const limits = limitsForPlan(membership.plan); const used = await usageForUser(userId);
  return Response.json({ membership, usage:Object.fromEntries(features.map((feature) => [feature, { used:Math.min(used[feature] ?? 0, limits[feature]), limit:limits[feature] }])), plans, billing:{ provider:"disabled", configured:false, anonymousAllowed:false, checkoutAvailable:false } }, { headers:{ "Cache-Control":"no-store" } });
}
