"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Primary navigation intentionally uses full document navigation so every Sites route resets cleanly. */
import { useEffect, useMemo, useState } from "react";
import type { AffinityInput, AffinityPersonInput, AffinityResult, Gender, RelationshipKind } from "../lib/affinity";

type AiAffinityReading = { summary: string; strengths: string[]; frictions: string[]; conversation: string; actions: string[]; question: string };
type SavedAffinity = { id: number; createdAt: string; result: AffinityResult };
const STORAGE_KEY = "guanxiang-affinity-history-v1";
const emptyPerson = (nickname: string): AffinityPersonInput => ({ nickname, birthDate:"", birthTime:"12:00", city:"", gender:"不设置" });
const elementClass: Record<string, string> = { 木:"wood",火:"fire",土:"earth",金:"metal",水:"water" };

function validReading(value: unknown): value is AiAffinityReading {
  if (!value || typeof value !== "object") return false; const reading = value as Partial<AiAffinityReading>;
  return typeof reading.summary === "string" && Array.isArray(reading.strengths) && reading.strengths.length === 3 && Array.isArray(reading.frictions) && reading.frictions.length === 3 && typeof reading.conversation === "string" && Array.isArray(reading.actions) && reading.actions.length === 3 && typeof reading.question === "string";
}
function readHistory(raw: string | null): SavedAffinity[] {
  if (!raw) return [];
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "number" && item.result?.version === 1).slice(0, 8) : []; }
  catch { return []; }
}
async function copyText(text: string) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }

function PersonForm({ side, value, onChange }: { side: "甲" | "乙"; value: AffinityPersonInput; onChange: (value: AffinityPersonInput) => void }) {
  const update = <K extends keyof AffinityPersonInput>(key: K, next: AffinityPersonInput[K]) => onChange({ ...value, [key]:next });
  return <article className="affinity-person-form">
    <header><span>{side}</span><div><small>{side === "甲" ? "ABOUT YOU" : "ABOUT THEM"}</small><h2>{side === "甲" ? "关于你" : "关于对方"}</h2></div></header>
    <label><span>称呼</span><input value={value.nickname} onChange={(event) => update("nickname", event.target.value)} maxLength={12} placeholder={side === "甲" ? "比如：我" : "比如：TA"} /></label>
    <div className="affinity-field-row"><label><span>出生日期</span><input type="date" value={value.birthDate} max={new Date().toISOString().slice(0,10)} min="1901-01-01" onChange={(event) => update("birthDate", event.target.value)} /></label><label><span>出生时间</span><input type="time" value={value.birthTime} onChange={(event) => update("birthTime", event.target.value)} /></label></div>
    <label><span>出生城市 <i>选填，不参与当前评分</i></span><input value={value.city} onChange={(event) => update("city", event.target.value)} maxLength={24} placeholder="城市或地区" /></label>
    <fieldset><legend>性别 <i>选填，不参与当前评分</i></legend><div>{(["不设置","女","男"] as Gender[]).map((gender) => <button type="button" key={gender} className={value.gender === gender ? "active" : ""} onClick={() => update("gender", gender)}>{gender}</button>)}</div></fieldset>
  </article>;
}

function ChartCard({ chart, side }: { chart: AffinityResult["chartA"]; side: "甲" | "乙" }) {
  return <article className="affinity-chart-card"><header><span>{side}</span><div><small>{side === "甲" ? "YOUR CHART" : "THEIR CHART"}</small><h3>{chart.nickname}</h3><p>{chart.gender !== "不设置" ? chart.gender : "未设置性别"}{chart.city ? ` · ${chart.city}` : ""}</p></div><b>{chart.dayElement}日主</b></header><div className="affinity-pillars">{chart.pillars.map((pillar) => <div key={pillar.label} className={pillar.label === "日" ? "day" : ""}><small>{pillar.label}</small><span className={elementClass[pillar.elements[0]]}>{pillar.gan}</span><span className={elementClass[pillar.elements[1]]}>{pillar.zhi}</span></div>)}</div></article>;
}

export default function AffinityApp() {
  const [relationship, setRelationship] = useState<RelationshipKind>("伴侣");
  const [personA, setPersonA] = useState(() => emptyPerson("我")); const [personB, setPersonB] = useState(() => emptyPerson("TA"));
  const [consent, setConsent] = useState(false); const [result, setResult] = useState<AffinityResult | null>(null); const [history, setHistory] = useState<SavedAffinity[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle"); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [aiReading, setAiReading] = useState<AiAffinityReading | null>(null); const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">("idle"); const [aiError, setAiError] = useState("");
  const input = useMemo<AffinityInput>(() => ({ relationship, personA, personB }), [relationship, personA, personB]);
  const complete = Boolean(personA.nickname.trim() && personA.birthDate && personA.birthTime && personB.nickname.trim() && personB.birthDate && personB.birthTime && consent);
  useEffect(() => { const hydrate = window.setTimeout(() => setHistory(readHistory(localStorage.getItem(STORAGE_KEY))), 0); return () => window.clearTimeout(hydrate); }, []);
  const calculate = async () => {
    if (!complete || status === "loading") return; setStatus("loading"); setError(""); setAiReading(null); setAiStatus("idle");
    try {
      const response = await fetch("/api/affinity", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(input) }); const payload = await response.json() as { result?: AffinityResult; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error || "关系结构暂时无法生成。");
      setResult(payload.result); setStatus("idle"); window.scrollTo({ top:0, behavior:"smooth" });
      const saved = [{ id:Date.now(), createdAt:new Date().toISOString(), result:payload.result }, ...history].slice(0, 8); setHistory(saved);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch { setNotice("结果可以查看，但当前浏览器阻止了本地保存。"); }
    } catch (reason) { setStatus("error"); setError(reason instanceof Error ? reason.message : "关系结构暂时无法生成。"); }
  };
  const generateAi = async () => {
    if (!result || aiStatus === "loading") return; setAiStatus("loading"); setAiError("");
    try { const response = await fetch("/api/affinity-reading", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(input) }); const payload = await response.json() as { reading?: unknown; error?: string }; if (!response.ok || !validReading(payload.reading)) throw new Error(payload.error || "这次深读没有完整生成。"); setAiReading(payload.reading); setAiStatus("idle"); }
    catch (reason) { setAiStatus("error"); setAiError(reason instanceof Error ? reason.message : "合缘深读暂时不可用。"); }
  };
  const reset = () => { setResult(null); setAiReading(null); setError(""); setAiError(""); window.scrollTo({ top:0, behavior:"smooth" }); };
  const openSaved = (item: SavedAffinity) => { setResult(item.result); setAiReading(null); setNotice("已打开本机保存的关系观照；原始生日没有保存在历史中。"); window.scrollTo({ top:0, behavior:"smooth" }); };
  const copyResult = async () => {
    if (!result) return; const content = `【观象·合缘观照】\n${result.chartA.nickname} × ${result.chartB.nickname}\n${result.metrics.map((metric) => `${metric.label}：${metric.value}`).join("\n")}\n\n${result.dayRelation}\n${result.branchRelation}\n\n可以一起做：\n${result.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}\n\n传统文化体验，不构成婚恋或人生决策建议。`;
    setNotice(await copyText(content) ? "关系观照已复制，不包含生日和城市。" : "复制失败，请稍后重试。");
  };
  return <main className="affinity-shell">
    <div className="affinity-ambient" aria-hidden="true"><i /><i /><i /></div>
    <header className="affinity-nav"><a className="affinity-brand" href="/"><span>✦</span><b>观象</b><i>合缘观照</i></a><nav aria-label="主要导航"><a href="/">六爻起卦</a><a href="/palm">掌心观照</a><a className="active" href="/affinity">合缘观照</a><a href="/insights">洞见</a><a href="/#insight">产品理念</a></nav><a className="affinity-nav-back" href="/">返回首页 <span>↗</span></a></header>
    {notice && <div className="product-toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
    {!result ? <>
      <section className="affinity-hero"><div className="affinity-kicker"><span /> SOUL AFFINITY · PRIVATE <span /></div><h1>看见两个人之间，<br /><em>如何靠近。</em></h1><p>用确定性四柱与关系结构，照见同频、互补和需要说清的边界。</p><div><span>不进入公开匹配池</span><i /> <span>原始资料不保存到历史</span><i /> <span>AI 不接收姓名与生日</span></div></section>
      <section className="affinity-form-wrap"><div className="relationship-kind"><span>你们是什么关系？</span><div>{(["伴侣","朋友","合作"] as RelationshipKind[]).map((kind) => <button key={kind} className={relationship === kind ? "active" : ""} onClick={() => setRelationship(kind)}>{kind}</button>)}</div></div><div className="affinity-form-grid"><PersonForm side="甲" value={personA} onChange={setPersonA} /><PersonForm side="乙" value={personB} onChange={setPersonB} /></div><div className="affinity-consent"><input id="affinity-consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><label htmlFor="affinity-consent"><b>我已获得对方同意，可以在本次体验中使用这些资料</b><small>数据只用于本次换算；历史仅保存匿名后的四柱和关系结果。</small></label></div>{error && <p className="affinity-error" role="alert">{error}</p>}<button className="affinity-submit" disabled={!complete || status === "loading"} onClick={calculate}><span>{status === "loading" ? "正在换算关系结构" : "开始合缘观照"}<small>{status === "loading" ? "读取四柱 · 对照五行 · 形成建议" : "约 10 秒 · 生成确定性结果"}</small></span><b>↗</b></button><p className="affinity-boundary">出生地暂不参与评分，四柱按填写的当地钟表时间计算，未做真太阳时校正。本功能仅供传统文化体验与关系反思。</p></section>
      {history.length > 0 && <section className="affinity-history"><header><small>LOCAL READINGS</small><h2>最近的合缘观照</h2><p>只存在当前设备，不包含原始生日与出生时间。</p></header><div>{history.map((item) => <button key={item.id} onClick={() => openSaved(item)}><span>{item.result.chartA.nickname.slice(0,1)}</span><i>×</i><span>{item.result.chartB.nickname.slice(0,1)}</span><b>{item.result.chartA.nickname} 与 {item.result.chartB.nickname}<small>{new Date(item.createdAt).toLocaleDateString("zh-CN")} · {item.result.relationship}</small></b><em>→</em></button>)}</div></section>}
    </> : <section className="affinity-result">
      <div className="affinity-result-head"><div><span>RELATIONSHIP MIRROR · {result.relationship}</span><h1>{result.chartA.nickname}<i>与</i>{result.chartB.nickname}</h1><p>不是判断“合不合”，而是看见这段关系需要怎样相处。</p></div><button onClick={reset}>重新填写</button></div>
      <div className="affinity-charts"><ChartCard chart={result.chartA} side="甲" /><ChartCard chart={result.chartB} side="乙" /></div>
      <div className="affinity-metrics">{result.metrics.map((metric) => <article key={metric.key}><header><span>{metric.label}</span><b>{metric.value}<small>/ 100</small></b></header><div><i style={{ width:`${metric.value}%` }} /></div><p>{metric.copy}</p></article>)}</div>
      <section className="affinity-mirror"><div><small>DAY MASTER</small><h2>日主之间</h2><p>{result.dayRelation}</p></div><div><small>DAY BRANCH</small><h2>日支关系</h2><p>{result.branchRelation}</p></div></section>
      <section className="affinity-insight"><header><small>STRUCTURED READING</small><h2>这段关系里，值得一起看见的事</h2></header><div><article><span>观察</span><ol>{result.observations.map((item) => <li key={item}>{item}</li>)}</ol></article><article><span>七日行动</span><ol>{result.actions.map((item) => <li key={item}>{item}</li>)}</ol></article></div><p>{result.calculationNote}</p></section>
      <section className={`affinity-ai ${aiStatus}`}><header><div><small>AI RELATIONSHIP READING</small><h2>AI 合缘深读</h2><p>只发送匿名后的四柱与关系结构，不发送姓名、生日、城市和性别。</p></div><span>{aiReading ? "已生成" : "可选"}</span></header>{aiReading ? <div className="affinity-ai-result"><h3>{aiReading.summary}</h3><div><article><span>关系资源</span><ul>{aiReading.strengths.map((item) => <li key={item}>{item}</li>)}</ul></article><article><span>摩擦位置</span><ul>{aiReading.frictions.map((item) => <li key={item}>{item}</li>)}</ul></article></div><blockquote>{aiReading.conversation}</blockquote><ol>{aiReading.actions.map((item) => <li key={item}>{item}</li>)}</ol><p>留给你们的问题：{aiReading.question}</p></div> : <div className="affinity-ai-start"><div><b>{aiStatus === "loading" ? "正在把结构翻译成关系语言" : aiStatus === "error" ? "这次没有生成" : "想再往现实里走一步？"}</b><p>{aiError || (aiStatus === "loading" ? "对照关系资源 · 识别摩擦 · 形成沟通建议" : "AI 会解释优势与摩擦，但不会判断你们是否应该在一起。")}</p></div><button onClick={generateAi} disabled={aiStatus === "loading"}>{aiStatus === "loading" ? "生成中…" : aiStatus === "error" ? "重新生成" : "生成免费深读"}<span>↗</span></button></div>}</section>
      <div className="affinity-result-actions"><button onClick={copyResult}>复制结果</button><button onClick={reset}>再看一段关系 <span>→</span></button></div><p className="affinity-result-boundary">合缘观照提供传统文化视角下的关系反思，不构成婚恋、合作或人生决策建议。重要关系请结合真实互动、边界和长期行动判断。</p>
    </section>}
    <footer className="affinity-footer"><span>观象 · 合缘观照</span><span>不替你判断谁对，只陪你看清如何相处</span></footer>
  </main>;
}
