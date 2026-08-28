import { chmod, readFile, writeFile } from "node:fs/promises";

const siteUrl = String(process.argv[2] || "").trim().replace(/\/$/, "");
if (!/^https:\/\//.test(siteUrl)) throw new Error("请提供 HTTPS 生产站点地址");

const envPath = ".vefaas-secrets.env";
const current = await readFile(envPath, "utf8");
const lines = current.split(/\r?\n/);
let replaced = false;
const next = lines.map((line) => {
  if (!line.startsWith("SITE_URL=")) return line;
  replaced = true;
  return `SITE_URL=${siteUrl}`;
});
if (!replaced) next.push(`SITE_URL=${siteUrl}`);

await writeFile(envPath, `${next.join("\n").replace(/\n+$/, "")}\n`, { mode: 0o600 });
await chmod(envPath, 0o600);
console.log("生产站点地址已写入私密环境文件。");
