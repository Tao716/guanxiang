import { randomBytes } from "node:crypto";
import { chmod, writeFile } from "node:fs/promises";

const count = Math.min(100, Math.max(1, Number(process.argv[2] || 10)));
const token = (bytes = 24) => randomBytes(bytes).toString("base64url");
const inviteCodes = Array.from({ length:count }, (_, index) => `GX-BETA-${String(index + 1).padStart(3, "0")}-${token(5).toUpperCase()}`);
const env = [
  `INVITE_CODES=${inviteCodes.join(",")}`,
  `SESSION_SECRET=${token(48)}`,
  `DATA_ENCRYPTION_KEY=${token(48)}`,
  "AI_API_KEY=",
  "AI_BASE_URL=https://api.deepseek.com",
  "AI_MODEL=deepseek-v4-flash",
  "SITE_URL=",
  "APP_VERSION=beta-1",
  "PAYMENT_PROVIDER=disabled",
  `RATE_LIMIT_SALT=${token(32)}`,
  "DATA_DIR=/tmp/guanxiang-data",
  "TOS_ENDPOINT=https://tos-s3-cn-beijing.volces.com",
  "TOS_REGION=cn-beijing",
  "TOS_BUCKET=",
  "TOS_ACCESS_KEY=",
  "TOS_SECRET_KEY=",
  "TOS_BACKUP_PREFIX=guanxiang/backups",
  "TOS_BACKUP_INTERVAL_SECONDS=900",
  "",
].join("\n");
await writeFile(".vefaas-secrets.env", env, { mode:0o600, flag:"wx" });
await chmod(".vefaas-secrets.env", 0o600);
await writeFile("内测邀请码.txt", `${inviteCodes.join("\n")}\n`, { mode:0o600, flag:"wx" });
await chmod("内测邀请码.txt", 0o600);
console.log(`已生成 ${count} 个唯一邀请码和两枚生产密钥。请分别保管 .vefaas-secrets.env 与 内测邀请码.txt。`);
