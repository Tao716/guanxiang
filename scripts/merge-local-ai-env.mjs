import { chmod, readFile, writeFile } from "node:fs/promises";

const parse = (content) => new Map(content.split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const local = parse(await readFile(".env.local", "utf8"));
const targetText = await readFile(".vefaas-secrets.env", "utf8");
const keys = ["AI_API_KEY", "AI_BASE_URL", "AI_MODEL"];
for (const key of keys) if (!local.get(key)?.trim()) throw new Error(`${key} is missing from .env.local`);
const merged = targetText.split(/\r?\n/).map((line) => {
  const key = keys.find((candidate) => line.startsWith(`${candidate}=`));
  return key ? `${key}=${local.get(key)}` : line;
}).join("\n");
await writeFile(".vefaas-secrets.env", merged, { mode:0o600 });
await chmod(".vefaas-secrets.env", 0o600);
console.log("AI 配置已安全合并到 veFaaS 私密环境文件，未输出密钥内容。");
