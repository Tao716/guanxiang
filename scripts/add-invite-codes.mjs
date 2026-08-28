import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";

const count = Math.min(100, Math.max(1, Number(process.argv[2] || 10)));
const envPath = ".vefaas-secrets.env";
const invitePath = "内测邀请码.txt";
const envText = await readFile(envPath, "utf8");
const existing = (envText.match(/^INVITE_CODES=(.*)$/m)?.[1] || "")
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);

const used = new Set(existing);
const created = [];
while (created.length < count) {
  const code = `GX-BETA-${String(existing.length + created.length + 1).padStart(3, "0")}-${randomBytes(5).toString("base64url").toUpperCase()}`;
  if (!used.has(code)) {
    used.add(code);
    created.push(code);
  }
}

const all = [...existing, ...created];
const nextEnv = envText.replace(/^INVITE_CODES=.*$/m, `INVITE_CODES=${all.join(",")}`);
await writeFile(envPath, nextEnv, { mode: 0o600 });
await chmod(envPath, 0o600);
await writeFile(invitePath, `${all.join("\n")}\n`, { mode: 0o600 });
await chmod(invitePath, 0o600);
console.log(`已新增 ${created.length} 个邀请码，当前共 ${all.length} 个。`);
