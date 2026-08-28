import { chmod, readFile, unlink, writeFile } from "node:fs/promises";

const credentialPath = process.argv[2];
if (!credentialPath) throw new Error("请提供临时凭据文件路径");

let credentials;
try {
  credentials = JSON.parse(await readFile(credentialPath, "utf8"));
} finally {
  await unlink(credentialPath).catch(() => {});
}

const accessKey = String(credentials.accessKey || "").trim();
const secretKey = String(credentials.secretKey || "").trim();
if (!accessKey || !secretKey) throw new Error("TOS 凭据不完整");

const replacements = new Map([
  ["TOS_BUCKET", "guanxiang-oracle-beta-2131131001"],
  ["TOS_ACCESS_KEY", accessKey],
  ["TOS_SECRET_KEY", secretKey],
]);

const envPath = ".vefaas-secrets.env";
const current = await readFile(envPath, "utf8");
const seen = new Set();
const next = current
  .split(/\r?\n/)
  .map((line) => {
    const separator = line.indexOf("=");
    if (separator === -1) return line;
    const key = line.slice(0, separator);
    if (!replacements.has(key)) return line;
    seen.add(key);
    return `${key}=${replacements.get(key)}`;
  });

for (const [key, value] of replacements) {
  if (!seen.has(key)) next.push(`${key}=${value}`);
}

await writeFile(envPath, `${next.join("\n").replace(/\n+$/, "")}\n`, { mode: 0o600 });
await chmod(envPath, 0o600);
console.log("TOS 备份凭据已安全写入生产环境文件，临时凭据已删除。");
