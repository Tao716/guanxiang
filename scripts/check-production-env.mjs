const required = ["INVITE_CODES", "SESSION_SECRET", "DATA_ENCRYPTION_KEY", "AI_API_KEY", "TOS_ENDPOINT", "TOS_REGION", "TOS_BUCKET", "TOS_ACCESS_KEY", "TOS_SECRET_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
const weak = [];
if ((process.env.SESSION_SECRET?.length ?? 0) < 32) weak.push("SESSION_SECRET 至少 32 个字符");
if ((process.env.DATA_ENCRYPTION_KEY?.length ?? 0) < 32) weak.push("DATA_ENCRYPTION_KEY 至少 32 个字符");
const invites = (process.env.INVITE_CODES ?? "").split(",").map((value) => value.trim()).filter(Boolean);
if (new Set(invites).size !== invites.length) weak.push("INVITE_CODES 不得重复");
if (missing.length || weak.length) {
  if (missing.length) console.error(`缺少生产环境变量：${missing.join(", ")}`);
  for (const problem of weak) console.error(problem);
  process.exit(1);
}
console.log(`生产环境变量检查通过：${invites.length} 个邀请码，AI 与 TOS 已配置。`);
