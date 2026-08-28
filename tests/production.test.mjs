import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";

const port = 32100 + process.pid % 300; const origin = `http://127.0.0.1:${port}`; let server; let dataDir;
async function waitForServer() { for (let attempt = 0; attempt < 40; attempt += 1) { try { const response = await fetch(`${origin}/api/health`); if (response.ok) return; } catch { /* Wait. */ } await new Promise((resolve) => setTimeout(resolve, 150)); } throw new Error("production server did not start"); }
async function login(code) { const response = await fetch(`${origin}/api/auth/login`, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ code }) }); return { response, cookie:response.headers.get("set-cookie")?.split(";", 1)[0] ?? "" }; }

before(async () => { dataDir = await mkdtemp(path.join(tmpdir(), "guanxiang-test-")); server = spawn(process.execPath, [".next/standalone/server.js"], { cwd:process.cwd(), env:{ ...process.env, HOSTNAME:"127.0.0.1", PORT:String(port), SITE_URL:"https://oracle.example.test", INVITE_CODES:"GX-TEST-ALPHA,GX-TEST-BETA", SESSION_SECRET:"test-session-secret-not-for-production", DATA_ENCRYPTION_KEY:"test-encryption-key-not-for-production", DATA_DIR:dataDir, PAYMENT_PROVIDER:"disabled", AI_API_KEY:"" }, stdio:["ignore", "pipe", "pipe"] }); await waitForServer(); });
after(async () => { server?.kill("SIGTERM"); await rm(dataDir, { recursive:true, force:true }); });

test("public health and login pages are available while the product is invite-only", async () => {
  const health = await fetch(`${origin}/api/health`); assert.equal(health.status, 200); const payload = await health.json(); assert.equal(payload.ok, true); assert.equal(payload.storage.encrypted, true);
  const root = await fetch(`${origin}/`, { redirect:"manual" }); assert.equal(root.status, 307); assert.match(root.headers.get("location") ?? "", /^\/login/);
  const loginPage = await fetch(`${origin}/login`); assert.equal(loginPage.status, 200); assert.match(await loginPage.text(), /INVITATION ONLY/);
  const privacy = await fetch(`${origin}/privacy`); assert.equal(privacy.status, 200); assert.match(await privacy.text(), /隐私政策/);
});

test("rejects an invalid invite and creates two isolated invite accounts", async () => {
  const invalid = await login("WRONG"); assert.equal(invalid.response.status, 401);
  const proxied = await fetch(`${origin}/api/auth/login`, { method:"POST", headers:{ "Content-Type":"application/json", Origin:"https://oracle.example.test" }, body:JSON.stringify({ code:"GX-TEST-ALPHA" }) }); assert.equal(proxied.status, 200);
  const crossSite = await fetch(`${origin}/api/auth/login`, { method:"POST", headers:{ "Content-Type":"application/json", Origin:"https://attacker.example" }, body:JSON.stringify({ code:"GX-TEST-ALPHA" }) }); assert.equal(crossSite.status, 403);
  const alpha = await login("GX-TEST-ALPHA"); const beta = await login("GX-TEST-BETA"); assert.equal(alpha.response.status, 200); assert.equal(beta.response.status, 200); assert.ok(alpha.cookie); assert.ok(beta.cookie); assert.notEqual(alpha.cookie, beta.cookie);
  const profile = { nickname:"甲", lifeStage:"转型探索", focus:"看清选择", responseStyle:"直接具体", topic:"事业" };
  const saved = await fetch(`${origin}/api/state`, { method:"POST", headers:{ "Content-Type":"application/json", Cookie:alpha.cookie }, body:JSON.stringify({ profile, history:[] }) }); assert.equal(saved.status, 200);
  const alphaState = await (await fetch(`${origin}/api/state`, { headers:{ Cookie:alpha.cookie } })).json(); const betaState = await (await fetch(`${origin}/api/state`, { headers:{ Cookie:beta.cookie } })).json(); assert.equal(alphaState.profile.nickname, "甲"); assert.equal(betaState.profile, null);
  const home = await fetch(`${origin}/`, { headers:{ Cookie:alpha.cookie } }); assert.equal(home.status, 200); const html = await home.text(); assert.match(html, /观象见心/); assert.match(html, /结构化易卜体验/);
});

test("exposes free quotas and keeps checkout disabled", async () => {
  const alpha = await login("GX-TEST-ALPHA"); const membership = await fetch(`${origin}/api/membership`, { headers:{ Cookie:alpha.cookie } }); assert.equal(membership.status, 200); const payload = await membership.json(); assert.equal(payload.membership.plan, "free"); assert.equal(payload.usage["deep-reading"].limit, 3); assert.equal(payload.billing.checkoutAvailable, false);
  const checkout = await fetch(`${origin}/api/billing/checkout`, { method:"POST", headers:{ Cookie:alpha.cookie } }); assert.equal(checkout.status, 503); assert.equal((await checkout.json()).code, "BILLING_NOT_OPEN");
});

test("protects private APIs and validates deterministic AI input before model use", async () => {
  const unauthorized = await fetch(`${origin}/api/state`); assert.equal(unauthorized.status, 401);
  const alpha = await login("GX-TEST-ALPHA"); const invalidReading = await fetch(`${origin}/api/deep-reading`, { method:"POST", headers:{ "Content-Type":"application/json", Cookie:alpha.cookie }, body:JSON.stringify({ question:"我该怎么办？" }) }); assert.equal(invalidReading.status, 400); assert.deepEqual(await invalidReading.json(), { error:"卦象信息不完整，请重新起卦。" });
});
