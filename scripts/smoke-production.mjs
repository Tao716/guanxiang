import assert from "node:assert/strict";
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const origin = String(process.env.SITE_URL || "").replace(/\/$/, "");
const invites = String(process.env.INVITE_CODES || "").split(",").map((value) => value.trim()).filter(Boolean);
const invite = invites.at(-1);
assert.ok(origin.startsWith("https://"), "SITE_URL 未配置");
assert.ok(invite, "邀请码未配置");

const health = await fetch(`${origin}/api/health`);
assert.equal(health.status, 200);
assert.equal((await health.json()).ready, true);

const root = await fetch(`${origin}/`, { redirect: "manual" });
assert.ok([307, 308].includes(root.status));
assert.match(root.headers.get("location") || "", /^\/login/);

const invalid = await fetch(`${origin}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: "INVALID-SMOKE-CODE" }),
});
assert.equal(invalid.status, 401);

const login = await fetch(`${origin}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: invite }),
});
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0] || "";
assert.ok(cookie);

const authenticatedHome = await fetch(`${origin}/`, { headers: { Cookie: cookie } });
assert.equal(authenticatedHome.status, 200);
assert.match(await authenticatedHome.text(), /观象见心/);

const membership = await fetch(`${origin}/api/membership`, { headers: { Cookie: cookie } });
assert.equal(membership.status, 200);
const membershipPayload = await membership.json();
assert.equal(membershipPayload.membership.plan, "free");
assert.equal(membershipPayload.billing.checkoutAvailable, false);

const deepReading = await fetch(`${origin}/api/deep-reading`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin },
  body: JSON.stringify({
    question: "未来三个月如何改善工作节奏？",
    category: "事业",
    lines: [7, 8, 7, 8, 7, 8],
    baseline: {
      verdict: "先明确边界，再稳定推进。",
      insight: "把注意力从一次完成，转向可持续的节奏。",
      actions: ["列出本周最重要的一件事。", "为深度工作设置固定时段。", "周末复盘一次精力分配。"],
      avoid: "避免同时开启过多任务。",
      timing: "先观察七天，再调整安排。",
    },
    profile: { nickname: "", lifeStage: "转型探索", focus: "改善节奏", responseStyle: "直接具体", topic: "事业" },
    recentContext: [],
  }),
});
assert.equal(deepReading.status, 200);
const readingPayload = await deepReading.json();
assert.ok(readingPayload.reading?.summary);
assert.equal(readingPayload.reading?.insights?.length, 3);
assert.equal(readingPayload.reading?.actions?.length, 3);

const s3 = new S3Client({
  region: process.env.TOS_REGION,
  endpoint: process.env.TOS_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.TOS_ACCESS_KEY,
    secretAccessKey: process.env.TOS_SECRET_KEY,
  },
});
const prefix = String(process.env.TOS_BACKUP_PREFIX || "guanxiang/backups").replace(/\/$/, "");
await s3.send(new HeadObjectCommand({ Bucket: process.env.TOS_BUCKET, Key: `${prefix}/latest.bin` }));
await s3.send(new HeadObjectCommand({ Bucket: process.env.TOS_BUCKET, Key: `${prefix}/daily/${new Date().toISOString().slice(0, 10)}.bin` }));
const marker = `${prefix}/deployment-check.txt`;
await s3.send(new PutObjectCommand({ Bucket: process.env.TOS_BUCKET, Key: marker, Body: "guanxiang deployment check" }));
await s3.send(new HeadObjectCommand({ Bucket: process.env.TOS_BUCKET, Key: marker }));
await s3.send(new DeleteObjectCommand({ Bucket: process.env.TOS_BUCKET, Key: marker }));

console.log("生产验收通过：健康检查、邀请登录、AI 深读、免费权益、页面渲染和 TOS 备份均正常。");
