export type AiRuntime = {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: "deepseek" | "qwen" | "openai" | "compatible";
};

export function getAiRuntime(): AiRuntime | null {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (process.env.AI_BASE_URL?.trim() || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.AI_MODEL?.trim() || "deepseek-v4-flash";
  const normalized = `${baseUrl} ${model}`.toLowerCase();
  const provider = normalized.includes("deepseek") ? "deepseek"
    : normalized.includes("dashscope") || normalized.includes("qwen") ? "qwen"
      : normalized.includes("openai") || normalized.includes("gpt-") ? "openai"
        : "compatible";
  return { apiKey, baseUrl, model, provider };
}

export function aiHeaders(runtime: AiRuntime, request: Request, title: string) {
  return {
    Authorization:`Bearer ${runtime.apiKey}`,
    "Content-Type":"application/json",
    "HTTP-Referer":new URL(request.url).origin,
    "X-Title":title,
  };
}

export function aiJsonMode(runtime: AiRuntime) {
  return runtime.provider === "deepseek" ? { thinking:{ type:"disabled" as const } } : {};
}
