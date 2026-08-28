export const plans = {
  free:{ id:"free", name:"观象基础", price:0, currency:"CNY", interval:"长期", features:["每日 3 次 AI 深度解读", "每日 10 次连续追问", "每日 2 次合缘深读", "邀请码账户云端卦笺"] },
  plus:{ id:"plus", name:"观象 Plus", price:2900, currency:"CNY", interval:"月", features:["每日 60 次 AI 深度解读", "每日 200 次连续追问", "每日 20 次合缘深读", "优先模型队列与完整卦笺"] },
} as const;

export function billingStatus() {
  const provider = process.env.PAYMENT_PROVIDER?.trim().toLowerCase() || "disabled";
  const configured = provider === "stripe" && Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PLUS_MONTHLY && process.env.STRIPE_WEBHOOK_SECRET);
  const anonymousAllowed = process.env.BILLING_ALLOW_ANONYMOUS === "true";
  return { provider, configured, anonymousAllowed, checkoutAvailable:configured && anonymousAllowed };
}
