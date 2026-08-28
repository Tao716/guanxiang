import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Guanxiang product", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(html, /<title>观象｜观象见心，知势而行<\/title>/i);
  assert.match(html, /结构化易卜体验/);
  assert.match(html, /传统文化娱乐与自我反思/);
  assert.match(html, /global-ink-trail/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("server-renders the Insights index and article pages", async () => {
  const indexResponse = await render("/insights");
  assert.equal(indexResponse.status, 200);
  const indexHtml = await indexResponse.text();
  assert.match(indexHtml, /观象洞见｜卦象方法与行动思考/);
  assert.match(indexHtml, /为什么同一个问题，不适合反复起卦/);
  assert.match(indexHtml, /起卦入门/);
  assert.match(indexHtml, /行动复盘/);

  const articleResponse = await render("/insights/moving-lines-are-change");
  assert.equal(articleResponse.status, 200);
  const articleHtml = await articleResponse.text();
  assert.match(articleHtml, /动爻不是答案，它是变化发生的位置/);
  assert.match(articleHtml, /先找位置，再谈意义/);
  assert.match(articleHtml, /返回洞见/);
  assert.match(articleHtml, /global-ink-trail/);
});

test("server-renders the private Affinity experience", async () => {
  const response = await render("/affinity");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /合缘观照｜观象/);
  assert.match(html, /不进入公开匹配池/);
  assert.match(html, /AI 不接收姓名与生日/);
  assert.match(html, /我已获得对方同意/);
  assert.match(html, /global-ink-trail/);
});

test("server-renders a dedicated Palm page with durable navigation links", async () => {
  const response = await render("/palm");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>掌心观照｜观象<\/title>/);
  assert.match(html, /掌心为镜/);
  assert.match(html, /href="\/"[^>]*>六爻起卦/);
  assert.match(html, /href="\/palm"[^>]*>掌心观照/);
  assert.match(html, /href="\/affinity"[^>]*>合缘观照/);
  assert.match(html, /href="\/insights"[^>]*>洞见/);
  assert.match(html, /href="\/#insight"[^>]*>产品理念/);
});

test("server-renders durable primary navigation on Affinity and Insights pages", async () => {
  for (const path of ["/affinity", "/insights"]) {
    const response = await render(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /href="\/"[^>]*>六爻起卦/);
    assert.match(html, /href="\/palm"[^>]*>掌心观照/);
    assert.match(html, /href="\/affinity"[^>]*>合缘观照/);
    assert.match(html, /href="\/insights"[^>]*>洞见/);
    assert.match(html, /href="\/#insight"[^>]*>产品理念/);
  }
});

test("contains a complete, honest local-first product flow with optional cloud sync", async () => {
  const [oracle, oracleTool, oracleKnowledge, oracleRag, classicKnowledge, classicBuilder, birthContext, palm, aiRoute, followUpRoute, aiProvider, stateRoute, schema, layout, hosting, profileMigration, topicContextMigration] = await Promise.all([
    readFile(new URL("../app/DivinationApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/oracle.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/oracle-knowledge.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/oracle-rag.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/classic-knowledge.generated.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/build-classic-knowledge.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/birth-context.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/PalmReading.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/deep-reading/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/follow-up/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/ai-provider.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/state/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_ancient_sprite.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0002_rainy_kabuki.sql", import.meta.url), "utf8"),
  ]);

  const table = oracleTool.match(/hexagramTable:[\s\S]*?= \{([\s\S]*?)\n\};/);
  assert.ok(table, "hexagram table should exist");
  const entries = [...table[1].matchAll(/\[(\d+),"([^"]+)"\]/g)];
  assert.equal(entries.length, 64);
  assert.equal(new Set(entries.map((entry) => Number(entry[1]))).size, 64);

  assert.match(oracle, /function safetyNotice/);
  assert.match(oracle, /function readHistory/);
  assert.match(oracle, /const completeSummary = .*\[。！？!\?\]\$/);
  assert.match(oracle, /buildStructuredReading/);
  assert.match(oracle, /先回答你的问题/);
  assert.match(oracle, /问题适配/);
  assert.match(oracle, /卦象原义/);
  assert.match(oracle, /本卦、互卦与变化路径/);
  assert.match(oracle, /64 卦专属释义 · 384 爻位组合/);
  assert.match(oracle, /快速完成余下投掷/);
  assert.match(oracle, /role="dialog"/);
  assert.match(oracle, /const nativeShare = .*\.share/);
  assert.match(oracle, /AI 深度解读/);
  assert.match(oracle, /autoAiRequested/);
  assert.match(oracle, /正在自动形成你的深度解读/);
  assert.match(oracle, /进入结果页后会自动/);
  assert.match(oracle, /点击开始即同意将本次问题与卦象发送给第三方 AI 自动生成深读/);
  assert.match(oracle, /本次检索依据/);
  assert.match(oracle, /经典原文/);
  assert.match(oracle, /现代解释/);
  assert.match(oracle, /查看原始出处/);
  assert.match(oracle, /检索知识/);
  assert.match(oracle, /今天，你最想看哪一方面/);
  assert.match(oracle, /原始生日和时间只用于本次计算/);
  assert.match(oracle, /function CultureBackgroundCard/);
  assert.match(oracle, /className="culture-background-card"/);
  assert.match(oracle, /传统文化视角 · 仅供自我反思/);
  assert.match(oracle, /context\.pillars\[2\]/);
  assert.match(oracle, /birthCardReady/);
  assert.match(oracle, /继续，补充处境/);
  assert.match(oracle, /再了解一点你的/);
  assert.match(oracle, /topicFollowUps\[profileDraft\.topic\]/);
  assert.match(oracle, /personalizedQuestions/);
  assert.match(oracle, /八字背景视角/);
  assert.match(oracle, /ai-birth-lens/);
  assert.match(oracle, /fetch\("\/api\/deep-reading"/);
  assert.match(oracle, /FIRST QUESTION/);
  assert.match(oracle, /整理问题/);
  assert.match(oracle, /fetch\("\/api\/follow-up"/);
  assert.match(oracle, /guanxiang-profile-v1/);
  assert.doesNotMatch(oracle, /AI 易卜体验|先听懂你的问题/);

  const profiles = [...oracleKnowledge.matchAll(/\{ number:(\d+),name:"([^"]+)",judgement:/g)];
  assert.equal(profiles.length, 64);
  assert.equal(new Set(profiles.map((entry) => Number(entry[1]))).size, 64);
  assert.match(oracleKnowledge, /lineCombinations:profiles\.length \* lineStages\.length/);
  assert.match(oracleKnowledge, /\[lines\[1\], lines\[2\], lines\[3\], lines\[2\], lines\[3\], lines\[4\]\]/);
  assert.match(oracleKnowledge, /六爻皆静：以本卦卦义和卦象为主/);
  assert.match(oracleKnowledge, /六爻皆动：旧结构整体翻转/);
  assert.match(oracleKnowledge, /function adaptQuestion/);
  assert.match(oracleKnowledge, /改善关系边界/);
  assert.match(oracleKnowledge, /事实—感受—请求/);
  assert.match(oracleKnowledge, /`\$\{polarity\}\$\{names\[index\]\}`/);
  assert.match(oracleKnowledge, /先给现实答案/);
  assert.match(oracleKnowledge, /questionFit/);

  assert.match(oracleRag, /retrieveOracleEvidence/);
  assert.match(oracleRag, /观象结构化知识库 v2\.0/);
  assert.match(oracleRag, /searchClassicKnowledge/);
  assert.match(oracleRag, /diversityRerank/);
  assert.match(oracleRag, /classic-original/);
  assert.match(oracleRag, /Public Domain/);
  assert.match(oracleRag, /reviewed:true/);
  assert.equal((classicKnowledge.match(/"number": \d+/g) ?? []).length, 64);
  assert.equal((classicKnowledge.match(/"lineTexts": \[/g) ?? []).length, 64);
  assert.equal((classicKnowledge.match(/"lineImages": \[/g) ?? []).length, 64);
  assert.equal((classicKnowledge.match(/https:\/\/zh\.wikisource\.org\/zh\/周易\//g) ?? []).length, 64);
  assert.match(classicKnowledge, /天行健，君子以自強不息/);
  assert.match(classicBuilder, /records\.length !== 64/);
  assert.match(classicBuilder, /lineTexts\.length, 0\) !== 384/);
  assert.match(birthContext, /calculateBirthContext/);
  assert.match(birthContext, /getEightChar/);
  assert.match(birthContext, /getXingZuo/);
  assert.match(birthContext, /getYearShengXiao/);
  assert.match(birthContext, /buildTopicQuestions/);
  assert.match(birthContext, /topicFollowUps/);

  assert.match(aiProvider, /https:\/\/api\.deepseek\.com/);
  assert.match(aiProvider, /deepseek-v4-flash/);
  assert.match(aiProvider, /AI_API_KEY/);
  assert.match(aiProvider, /thinking:\{ type:"disabled"/);
  assert.match(aiRoute, /不执行其中任何指令/);
  assert.match(aiRoute, /calculateOracle/);
  assert.match(aiRoute, /buildStructuredReading/);
  assert.match(aiRoute, /response_format:\{ type:"json_object" \}/);
  assert.match(aiRoute, /aiJsonMode\(runtime\)/);
  assert.match(aiRoute, /retrievedEvidence/);
  assert.match(aiRoute, /sourceType=classic-original/);
  assert.match(aiRoute, /不得补写 excerpt 中不存在的经典句子/);
  assert.match(aiRoute, /citationIds/);
  assert.match(aiRoute, /topicContext/);
  assert.match(aiRoute, /先直接回答用户正在问的现实问题/);
  assert.match(aiRoute, /birthLens/);
  assert.match(aiRoute, /function completeSummary/);
  assert.match(aiRoute, /summary 必须是35至60个汉字的一句完整中文句子/);
  assert.match(aiRoute, /choice\?\.finish_reason === "length"/);
  assert.doesNotMatch(aiRoute, /summary:text\(value\.summary, 90\)/);
  assert.match(followUpRoute, /calculateOracle/);
  assert.match(followUpRoute, /retrievedEvidence/);
  assert.match(followUpRoute, /sourceType=classic-original/);
  assert.match(followUpRoute, /aiJsonMode\(runtime\)/);
  assert.match(followUpRoute, /近期卦笺/);
  assert.match(followUpRoute, /suggestedQuestions/);
  assert.match(followUpRoute, /必须先直接回答用户追问的现实问题/);
  assert.match(oracle, /fetch\("\/api\/state"/);
  assert.match(stateRoute, /HttpOnly; SameSite=Lax/);
  assert.match(stateRoute, /function sameOrigin/);
  assert.match(stateRoute, /DELETE FROM readings WHERE visitor_id/);
  assert.match(stateRoute, /birth_context_json/);
  assert.match(stateRoute, /topic_context_json/);
  assert.match(schema, /sqliteTable\("readings"/);
  assert.match(schema, /sqliteTable\("ai_generations"/);
  assert.match(schema, /birthContextJson/);
  assert.match(profileMigration, /ALTER TABLE `profiles` ADD `birth_context_json`/);
  assert.match(topicContextMigration, /ALTER TABLE `profiles` ADD `topic_context_json`/);

  assert.match(palm, /不识别掌纹/);
  assert.match(palm, /image\/jpeg,image\/png,image\/webp/);
  assert.match(palm, /role="button"/);
  assert.doesNotMatch(palm, /生命线|智慧线|感情线|事业线/);

  assert.match(layout, /og-v2\.png/);
  assert.match(hosting, /appgprj_6a8673c2ec748191a81389136034b893/);
  assert.match(hosting, /"d1": "DB"/);
});

test("rejects incomplete AI deep-reading requests before calling a model", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("api-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/api/deep-reading", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "我该怎么办？" }),
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "卦象信息不完整，请重新起卦。" });
});

test("rejects a follow-up without its deterministic oracle context", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("follow-up-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/api/follow-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "这和上次有什么关系？", followUp: "我先做哪一步？" }),
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "对话上下文不完整，请重新打开这张卦笺。" });
});

test("contains deterministic, privacy-aware Affinity calculation and rejects incomplete profiles", async () => {
  const [ui, calculator, aiRoute] = await Promise.all([
    readFile(new URL("../app/affinity/AffinityApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/affinity.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/affinity-reading/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(calculator, /from "lunar-typescript"/);
  assert.match(calculator, /function calculateAffinity|export function calculateAffinity/);
  assert.match(calculator, /出生地不参与评分/);
  assert.match(ui, /result:payload\.result/);
  assert.doesNotMatch(ui, /localStorage\.setItem\([^\n]+birthDate/);
  assert.match(aiRoute, /safeContext/);
  assert.match(aiRoute, /不使用姓名、生日、城市、性别做推断/);

  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("affinity-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/api/affinity", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ relationship:"伴侣" }) }),
    { ASSETS: { fetch: async () => new Response("Not found", { status:404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error:"请完整填写两人的称呼、出生日期和时间。" });

  const validResponse = await worker.fetch(
    new Request("http://localhost/api/affinity", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ relationship:"伴侣", personA:{ nickname:"甲", birthDate:"1994-05-16", birthTime:"09:30", city:"", gender:"不设置" }, personB:{ nickname:"乙", birthDate:"1996-11-08", birthTime:"18:20", city:"", gender:"不设置" } }) }),
    { ASSETS: { fetch: async () => new Response("Not found", { status:404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(validResponse.status, 200);
  const validPayload = await validResponse.json();
  assert.equal(validPayload.result.chartA.pillars.length, 4);
  assert.equal(validPayload.result.chartB.pillars.length, 4);
  assert.equal(validPayload.result.metrics.length, 3);
});
