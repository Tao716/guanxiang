"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Primary product navigation intentionally uses full document navigation so it remains reliable across independently rendered Sites routes. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PalmReading from "./PalmReading";
import { buildTopicQuestions, calculateBirthContext, categoryForTopic, isBirthContext, isTopicContext, readingTopics, topicFollowUps, topicHorizons, type BirthContext, type ReadingTopic, type TopicContext } from "./lib/birth-context";
import { changedLines, getHexagram, isLineValue, type LineValue } from "./lib/oracle";
import { buildStructuredReading } from "./lib/oracle-knowledge";

type ReadingTheme = { verdict: string; insight: string; actions: string[]; avoid: string; timing: string };
type AiCitation = { id: string; title: string; kind: string; excerpt: string; sourceType?: "classic-original" | "internal-modern"; sourceTitle?: string; sourceVersion: string; sourceUrl?: string; license?: string; reviewed: boolean };
type AiDeepReading = { summary: string; situation: string; insights: string[]; actions: string[]; watchFor: string; timing: string; reflection: string; birthLens?: string; citations?: AiCitation[] };
type Commitment = { action: string; reviewAt: string; status: "pending" | "done"; reflection?: string };
type UserProfile = { nickname: string; lifeStage: string; focus: string; responseStyle: string; topic: ReadingTopic; birthContext?: BirthContext; topicContext?: TopicContext };
type FollowUpMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
type HistoryItem = { id: number; version?: 2; question: string; category: string; topic?: ReadingTopic; topicContext?: TopicContext; lines: LineValue[]; createdAt: string; reading?: ReadingTheme; aiReading?: AiDeepReading; commitment?: Commitment; followUps?: FollowUpMessage[] };
type QuestionCoach = { tone: "idle" | "refine" | "ready"; label: string; copy: string };
type SafetyNotice = { level: "professional" | "urgent"; title: string; copy: string };

const HISTORY_KEY = "guanxiang-history";
const DRAFT_KEY = "guanxiang-question-draft";
const CAST_SESSION_KEY = "guanxiang-active-cast";
const PROFILE_KEY = "guanxiang-profile-v1";
const PROFILE_FLOW_KEY = "guanxiang-guided-entry-v3";

const categories = ["事业", "关系", "选择", "成长"];
const constellationMaps = [
  { name:"北斗", code:"TIAN SHU · 01", verse:"斗柄东指，万物皆春" },
  { name:"参宿", code:"SHEN · 02", verse:"三星在天，宜守其明" },
  { name:"心宿", code:"XIN · 03", verse:"东方苍龙，心有所向" },
  { name:"织女", code:"VEGA · 04", verse:"静水流光，遥遥相照" },
];
const deepViews = [
  { id:"why", label:"为什么", title:"卦象为何这样说" },
  { id:"how", label:"怎么做", title:"把启示落到行动" },
  { id:"check", label:"反向验证", title:"别急着相信，先验证" },
];

function questionCoach(value: string): QuestionCoach {
  const text = value.trim();
  if (!text) return { tone:"idle", label:"一个好问题", copy:"包含具体处境、相关对象，以及你最想看清的下一步。" };
  if (text.length < 6) return { tone:"refine", label:"再具体一点", copy:"补充正在发生什么，解读会更贴近你的真实处境。" };
  if (/会不会|能不能|是不是|吉不吉|什么时候/.test(text)) return { tone:"refine", label:"换个问法会更有用", copy:"试着问“我该看清什么”或“下一步如何验证”，比只问结果更可行动。" };
  return { tone:"ready", label:"这一问可以起卦", copy:"问题已包含足够线索。也可以继续补充时间、对象或限制条件。" };
}

function safetyNotice(value: string): SafetyNotice | null {
  const text = value.trim();
  if (/自杀|轻生|不想活|结束生命|伤害自己|伤害他人/.test(text)) return { level:"urgent", title:"请先把安全放在第一位", copy:"观象不能处理人身安全或危机问题。请立即联系当地急救、危机热线，或一位现在能陪在你身边的可信赖的人。" };
  if (/癌症|肿瘤|怀孕|流产|手术|用药|诊断|症状|官司|诉讼|判刑|投资|股票|基金|借贷|赌博/.test(text)) return { level:"professional", title:"这类问题需要专业判断", copy:"医疗、法律与投资事项不适合用卦象作决定。请先咨询合格专业人士；你也可以改问“面对这件事，我该如何整理信息与情绪？”" };
  return null;
}

function isAiDeepReading(value: unknown): value is AiDeepReading {
  if (!value || typeof value !== "object") return false;
  const reading = value as Partial<AiDeepReading>;
  const completeSummary = typeof reading.summary === "string" && reading.summary.trim().length >= 16 && reading.summary.trim().length <= 80 && /[。！？!?]$/.test(reading.summary.trim());
  const validCitations = reading.citations === undefined || (Array.isArray(reading.citations) && reading.citations.length > 0 && reading.citations.length <= 4
    && reading.citations.every((item) => item && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string"
      && typeof item.kind === "string" && typeof item.excerpt === "string" && typeof item.sourceVersion === "string" && typeof item.reviewed === "boolean"
      && (item.sourceType === undefined || item.sourceType === "classic-original" || item.sourceType === "internal-modern")
      && (item.sourceUrl === undefined || (typeof item.sourceUrl === "string" && item.sourceUrl.startsWith("https://zh.wikisource.org/")))));
  return validCitations && completeSummary && (reading.birthLens === undefined || typeof reading.birthLens === "string") && typeof reading.situation === "string"
    && Array.isArray(reading.insights) && reading.insights.length === 3 && reading.insights.every((item) => typeof item === "string")
    && Array.isArray(reading.actions) && reading.actions.length === 3 && reading.actions.every((item) => typeof item === "string")
    && typeof reading.watchFor === "string" && typeof reading.timing === "string" && typeof reading.reflection === "string";
}
const defaultProfile: UserProfile = { nickname:"", lifeStage:"转型探索", focus:"看清选择", responseStyle:"直接具体", topic:"事业" };
function readProfile(raw: string | null): UserProfile | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<UserProfile>;
    if (!value || typeof value !== "object") return null;
    const topic = readingTopics.some((item) => item.id === value.topic) ? value.topic as ReadingTopic : defaultProfile.topic;
    const birthContext = isBirthContext(value.birthContext) ? {
      constellation:value.birthContext.constellation.slice(0, 12), zodiac:value.birthContext.zodiac.slice(0, 4),
      pillars:value.birthContext.pillars.map((pillar) => pillar.slice(0, 8)), dayMaster:value.birthContext.dayMaster.slice(0, 2),
      dayElement:value.birthContext.dayElement, timePrecision:value.birthContext.timePrecision, reflection:value.birthContext.reflection.slice(0, 100),
    } : undefined;
    const topicContext = isTopicContext(value.topicContext) ? { situation:value.topicContext.situation.slice(0, 20), focus:value.topicContext.focus.slice(0, 20), horizon:value.topicContext.horizon } : undefined;
    return {
      nickname:typeof value.nickname === "string" ? value.nickname.trim().slice(0, 12) : "",
      lifeStage:typeof value.lifeStage === "string" ? value.lifeStage.slice(0, 12) : defaultProfile.lifeStage,
      focus:typeof value.focus === "string" ? value.focus.slice(0, 12) : defaultProfile.focus,
      responseStyle:typeof value.responseStyle === "string" ? value.responseStyle.slice(0, 12) : defaultProfile.responseStyle,
      topic,
      birthContext,
      topicContext,
    };
  } catch { return null; }
}
function readFollowUps(value: unknown): FollowUpMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): FollowUpMessage[] => {
    if (!entry || typeof entry !== "object") return [];
    const message = entry as Partial<FollowUpMessage>;
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string" || !message.content.trim()) return [];
    return [{ id:typeof message.id === "string" ? message.id.slice(0, 60) : String(Date.now()), role:message.role, content:message.content.trim().slice(0, 600), createdAt:typeof message.createdAt === "string" && Number.isFinite(Date.parse(message.createdAt)) ? message.createdAt : new Date().toISOString() }];
  }).slice(-12);
}
function readHistory(raw: string | null): HistoryItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: HistoryItem[] = [];
    for (const value of parsed) {
      if (!value || typeof value !== "object") continue;
      const item = value as Partial<HistoryItem>;
      if (typeof item.id !== "number" || typeof item.question !== "string" || !item.question.trim()) continue;
      if (typeof item.category !== "string" || !categories.includes(item.category)) continue;
      if (!Array.isArray(item.lines) || item.lines.length !== 6 || !item.lines.every(isLineValue)) continue;
      if (typeof item.createdAt !== "string" || !Number.isFinite(Date.parse(item.createdAt))) continue;
      const rawCommitment = item.commitment;
      const commitment = rawCommitment && typeof rawCommitment.action === "string" && typeof rawCommitment.reviewAt === "string"
        && Number.isFinite(Date.parse(rawCommitment.reviewAt)) && (rawCommitment.status === "pending" || rawCommitment.status === "done")
        ? { action:rawCommitment.action.slice(0, 180), reviewAt:rawCommitment.reviewAt, status:rawCommitment.status, reflection:typeof rawCommitment.reflection === "string" ? rawCommitment.reflection.slice(0, 160) : undefined }
        : undefined;
      const rawReading = item.reading;
      const reading = rawReading && typeof rawReading.verdict === "string" && typeof rawReading.insight === "string" && Array.isArray(rawReading.actions)
        && rawReading.actions.length === 3 && rawReading.actions.every((action) => typeof action === "string") && typeof rawReading.avoid === "string" && typeof rawReading.timing === "string"
        ? { verdict:rawReading.verdict, insight:rawReading.insight, actions:rawReading.actions.slice(0, 3), avoid:rawReading.avoid, timing:rawReading.timing }
        : undefined;
      const aiReading = isAiDeepReading(item.aiReading)
        ? { summary:item.aiReading.summary.trim(), situation:item.aiReading.situation.slice(0, 480), insights:item.aiReading.insights.map((entry) => entry.slice(0, 180)), actions:item.aiReading.actions.map((entry) => entry.slice(0, 150)), watchFor:item.aiReading.watchFor.slice(0, 220), timing:item.aiReading.timing.slice(0, 150), reflection:item.aiReading.reflection.slice(0, 120), birthLens:item.aiReading.birthLens?.slice(0, 260), citations:item.aiReading.citations?.map((citation) => ({ id:citation.id.slice(0, 40), title:citation.title.slice(0, 100), kind:citation.kind.slice(0, 30), excerpt:citation.excerpt.slice(0, 360), sourceType:citation.sourceType, sourceTitle:citation.sourceTitle?.slice(0, 40), sourceVersion:citation.sourceVersion.slice(0, 80), sourceUrl:citation.sourceUrl, license:citation.license?.slice(0, 60), reviewed:citation.reviewed })).slice(0, 4) }
        : undefined;
      const followUps = readFollowUps(item.followUps);
      const topic = readingTopics.some((entry) => entry.id === item.topic) ? item.topic as ReadingTopic : undefined;
      const topicContext = isTopicContext(item.topicContext) ? { situation:item.topicContext.situation.slice(0, 20), focus:item.topicContext.focus.slice(0, 20), horizon:item.topicContext.horizon } : undefined;
      items.push({ id:item.id, version:2, question:item.question.slice(0, 80), category:item.category, topic, topicContext, lines:item.lines as LineValue[], createdAt:item.createdAt, reading, aiReading, commitment, followUps });
      if (items.length === 20) break;
    }
    return items;
  } catch { return []; }
}

function writeHistory(items: HistoryItem[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); return true; } catch { return false; }
}

function compactHistory(items: HistoryItem[]) {
  const ordered = [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  if (ordered.length <= 20) return ordered;
  const retained = [...ordered.filter((item) => item.commitment?.status === "pending"), ...ordered.filter((item) => item.commitment?.status !== "pending")].slice(0, 20);
  return retained.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function mergeHistory(localItems: HistoryItem[], cloudItems: HistoryItem[]) {
  const merged = new Map<number, HistoryItem>();
  for (const item of cloudItems) merged.set(item.id, item);
  for (const item of localItems) merged.set(item.id, item);
  return compactHistory([...merged.values()]);
}

function tossCoins() {
  const random = crypto.getRandomValues(new Uint32Array(3));
  const faces = Array.from(random, (value) => value % 2 === 0);
  return { faces, value:faces.reduce<number>((sum, head) => sum + (head ? 3 : 2), 0) as LineValue };
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; }
  } catch { /* Fall through to the local selection fallback. */ }
  const field = document.createElement("textarea");
  field.value = value; field.setAttribute("readonly", ""); field.style.position = "fixed"; field.style.opacity = "0";
  document.body.appendChild(field); field.select();
  const copied = document.execCommand("copy"); field.remove();
  return copied;
}

function ChatCat() {
  return (
    <span className="resting-cat" aria-hidden="true">
      <i className="resting-cat-tail" />
      <i className="resting-cat-body" />
      <i className="resting-cat-paw resting-cat-paw-one" />
      <i className="resting-cat-paw resting-cat-paw-two" />
      <span className="resting-cat-head">
        <i className="resting-cat-ear resting-cat-ear-one" />
        <i className="resting-cat-ear resting-cat-ear-two" />
        <i className="resting-cat-eye resting-cat-eye-one" />
        <i className="resting-cat-eye resting-cat-eye-two" />
        <i className="resting-cat-nose" />
        <i className="resting-cat-whiskers resting-cat-whiskers-left" />
        <i className="resting-cat-whiskers resting-cat-whiskers-right" />
      </span>
    </span>
  );
}

function CultureBackgroundCard({ context }: { context: BirthContext }) {
  const pillarLabels = ["年柱", "月柱", "日柱", "时柱"];
  return <section className="culture-background-card" aria-label="你的文化背景卡">
    <div className="culture-card-constellation" aria-hidden="true">{Array.from({ length:6 }, (_, index) => <i key={`culture-star-${index}`} />)}{Array.from({ length:5 }, (_, index) => <b key={`culture-link-${index}`} />)}</div>
    <header><div><span className="culture-card-mark">✦</span><small>观象 · 文化背景</small></div><em>已生成</em></header>
    <div className="culture-card-main">
      <div className="culture-day-master"><small>日主</small><strong>{context.dayMaster}</strong><span>{context.dayMaster}{context.dayElement}</span></div>
      <div className="culture-card-facts">
        <div><small>日主</small><b>{context.dayMaster}{context.dayElement}</b></div>
        <div><small>星座</small><b>{context.constellation}</b></div>
        <div><small>生肖</small><b>{context.zodiac}</b></div>
        <div><small>日柱</small><b>{context.pillars[2]}</b></div>
      </div>
    </div>
    <div className="culture-pillars-head"><span />生辰八字<span /></div>
    <div className="culture-pillars">{context.pillars.map((pillar, index) => <div key={`${pillarLabels[index]}-${pillar}`}><small>{pillarLabels[index]}</small><b>{pillar}</b></div>)}</div>
    <footer><span />传统文化视角 · 仅供自我反思<span /></footer>
  </section>;
}

export default function DivinationApp({ initialExperience = "oracle" }: { initialExperience?: "oracle" | "palm" }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [experience, setExperience] = useState<"oracle" | "palm">(initialExperience);
  const [category, setCategory] = useState("选择");
  const [step, setStep] = useState<"ask" | "cast" | "result">("ask");
  const [lines, setLines] = useState<LineValue[]>([]);
  const [coinFaces, setCoinFaces] = useState<boolean[]>([true,false,true]);
  const [tossId, setTossId] = useState(0);
  const [isTossing, setIsTossing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [deepView, setDeepView] = useState("why");
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const [aiStage, setAiStage] = useState(0);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [profileDraft, setProfileDraft] = useState<UserProfile>(defaultProfile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileStep, setProfileStep] = useState<"topic" | "birth" | "context" | "preference">("topic");
  const [birthDraft, setBirthDraft] = useState({ birthDate:"", birthTime:"12:00", timeUnknown:false });
  const [birthError, setBirthError] = useState("");
  const [birthCardReady, setBirthCardReady] = useState(false);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpStatus, setFollowUpStatus] = useState<"idle" | "loading" | "error">("idle");
  const [followUpError, setFollowUpError] = useState("");
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>(["这和我上一次的问题有什么联系？","我应该先验证哪一个信号？","如果条件没有变化，我该怎么调整？"]);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [productNotice, setProductNotice] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "helpful" | "unhelpful">("idle");
  const [selectedAction, setSelectedAction] = useState<number | null>(null);
  const [reviewDays, setReviewDays] = useState<3 | 7 | 14>(7);
  const [reflection, setReflection] = useState("");
  const [syncState, setSyncState] = useState<"local" | "syncing" | "cloud" | "error">("local");
  const [constellationScene, setConstellationScene] = useState({ id:0, pattern:0, slot:0 });
  const castTimer = useRef<number | null>(null);
  const resultTimer = useRef<number | null>(null);
  const aiStageTimer = useRef<number | null>(null);
  const autoAiRequested = useRef<number | null>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const draftReady = useRef(false);
  const cloudAvailable = useRef(false);
  const cloudSyncTimer = useRef<number | null>(null);

  const hexagram = useMemo(() => getHexagram(lines), [lines]);
  const transformed = useMemo(() => getHexagram(changedLines(lines)), [lines]);
  const movingCount = lines.filter((line) => line === 6 || line === 9).length;
  const activeHistoryItem = history.find((item) => item.id === activeId);
  const currentTopic = activeHistoryItem?.topic ?? profile.topic;
  const currentTopicContext = activeHistoryItem?.topicContext ?? profile.topicContext;
  const topicContextKey = currentTopicContext ? `${currentTopicContext.situation}\u0001${currentTopicContext.focus}\u0001${currentTopicContext.horizon}` : "";
  const structuredReading = useMemo(() => {
    const [situation, focus, horizon] = topicContextKey.split("\u0001");
    return buildStructuredReading(lines, question, category, situation && focus && horizon ? { situation, focus, horizon } : undefined);
  }, [lines, question, category, topicContextKey]);
  const theme: ReadingTheme = structuredReading;
  const aiReading = activeHistoryItem?.aiReading;
  const followUps = activeHistoryItem?.followUps ?? [];
  const coach = useMemo(() => questionCoach(question), [question]);
  const safety = useMemo(() => safetyNotice(question), [question]);
  const canBegin = Boolean(question.trim()) && !safety;
  const pendingCount = history.filter((item) => item.commitment?.status === "pending").length;
  const dueCount = history.filter((item) => item.commitment?.status === "pending" && new Date(item.commitment.reviewAt).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0)).length;
  const activeConstellation = constellationMaps[constellationScene.pattern];
  const personalizedQuestions = useMemo(() => buildTopicQuestions(profile.topic, profile.topicContext), [profile.topic, profile.topicContext]);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      let localHistory: HistoryItem[] = [];
      let localProfile: UserProfile | null = null;
      let guidedEntryComplete = false;
      try {
        localHistory = readHistory(localStorage.getItem(HISTORY_KEY));
        setHistory(localHistory);
        guidedEntryComplete = localStorage.getItem(PROFILE_FLOW_KEY) === "done";
        const savedProfile = readProfile(localStorage.getItem(PROFILE_KEY));
        localProfile = savedProfile;
        if (savedProfile) { setProfile(savedProfile); setProfileDraft(savedProfile); setCategory(categoryForTopic(savedProfile.topic)); }
        const activeCast = JSON.parse(sessionStorage.getItem(CAST_SESSION_KEY) ?? "null") as { question?: unknown; category?: unknown; lines?: unknown } | null;
        if (activeCast && typeof activeCast.question === "string" && activeCast.question.trim().length > 0
          && typeof activeCast.category === "string" && categories.includes(activeCast.category)
          && Array.isArray(activeCast.lines) && activeCast.lines.length < 6 && activeCast.lines.every(isLineValue)) {
          setQuestion(activeCast.question.slice(0, 80)); setCategory(activeCast.category); setLines(activeCast.lines as LineValue[]); setStep("cast");
        } else {
          sessionStorage.removeItem(CAST_SESSION_KEY);
          const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as { question?: unknown; category?: unknown } | null;
          if (draft && typeof draft.question === "string") setQuestion(draft.question.slice(0, 80));
          if (draft && typeof draft.category === "string" && categories.includes(draft.category)) setCategory(draft.category);
        }
      } catch { setHistory([]); setProductNotice("当前浏览器限制了本地存储；你仍可继续体验并复制结果。"); }
      draftReady.current = true;
      void fetch("/api/state", { headers:{ Accept:"application/json" }, cache:"no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("cloud unavailable");
        const payload = await response.json() as { available?: unknown; profile?: unknown; history?: unknown };
        if (payload.available !== true) throw new Error("cloud unavailable");
        const cloudProfile = readProfile(JSON.stringify(payload.profile ?? null));
        const cloudHistory = readHistory(JSON.stringify(payload.history ?? []));
        const nextHistory = mergeHistory(localHistory, cloudHistory);
        const nextProfile = localProfile ?? cloudProfile ?? defaultProfile;
        cloudAvailable.current = true;
        setHistory(nextHistory); writeHistory(nextHistory);
        setProfile(nextProfile); setProfileDraft(nextProfile); setCategory(categoryForTopic(nextProfile.topic));
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile)); } catch { /* Local mirror is optional. */ }
        setSyncState("cloud");
        if (initialExperience === "oracle" && (!guidedEntryComplete || (!localProfile && !cloudProfile))) { setProfileStep("topic"); setProfileOpen(true); }
      }).catch(() => {
        cloudAvailable.current = false;
        setSyncState("local");
        if (initialExperience === "oracle" && (!guidedEntryComplete || !localProfile)) { setProfileStep("topic"); setProfileOpen(true); }
      });
    }, 0);
    const syncHistory = (event: StorageEvent) => {
      if (event.key === HISTORY_KEY) setHistory(readHistory(event.newValue));
    };
    window.addEventListener("storage", syncHistory);
    return () => { window.clearTimeout(hydrate); window.removeEventListener("storage", syncHistory); };
  }, [initialExperience]);

  useEffect(() => {
    if (!draftReady.current || !cloudAvailable.current) return;
    if (cloudSyncTimer.current !== null) window.clearTimeout(cloudSyncTimer.current);
    setSyncState("syncing");
    cloudSyncTimer.current = window.setTimeout(() => {
      void fetch("/api/state", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ profile, history }),
      }).then((response) => {
        if (!response.ok) throw new Error("sync failed");
        setSyncState("cloud");
      }).catch(() => setSyncState("error"));
      cloudSyncTimer.current = null;
    }, 650);
    return () => {
      if (cloudSyncTimer.current !== null) window.clearTimeout(cloudSyncTimer.current);
    };
  }, [history, profile]);

  useEffect(() => {
    if (!draftReady.current || step !== "ask") return;
    try {
      if (question.trim()) localStorage.setItem(DRAFT_KEY, JSON.stringify({ question, category }));
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* Draft persistence is optional; completed readings still work in memory. */ }
  }, [question, category, step]);

  useEffect(() => {
    try {
      if (step === "cast" && question.trim() && lines.length < 6) sessionStorage.setItem(CAST_SESSION_KEY, JSON.stringify({ question, category, lines }));
      else sessionStorage.removeItem(CAST_SESSION_KEY);
    } catch { /* Session recovery is optional. */ }
  }, [step, question, category, lines]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      const random = crypto.getRandomValues(new Uint32Array(2));
      setConstellationScene((current) => ({
        id:current.id + 1,
        pattern:(current.pattern + 1 + random[0] % (constellationMaps.length - 1)) % constellationMaps.length,
        slot:Number(random[1] % 3),
      }));
    }, 9600);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => {
    if (castTimer.current !== null) window.clearTimeout(castTimer.current);
    if (resultTimer.current !== null) window.clearTimeout(resultTimer.current);
    if (aiStageTimer.current !== null) window.clearInterval(aiStageTimer.current);
    if (cloudSyncTimer.current !== null) window.clearTimeout(cloudSyncTimer.current);
  }, []);

  useEffect(() => {
    if (!historyOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => drawerCloseRef.current?.focus(), 0);
    const handleDrawerKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setHistoryOpen(false); return; }
      if (event.key !== "Tab") return;
      const drawer = drawerCloseRef.current?.closest("aside");
      const focusable = drawer?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleDrawerKeys);
    return () => {
      window.clearTimeout(focusTimer); window.removeEventListener("keydown", handleDrawerKeys); document.body.style.overflow = previousOverflow; previousFocus?.focus();
    };
  }, [historyOpen]);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold:0.16, rootMargin:"0px 0px -7% 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [step]);

  const begin = () => {
    if (!canBegin) return;
    setQuestion(question.trim()); setLines([]); setCoinFaces([true,false,true]); setTossId(0); setIsTossing(false); setActiveId(null); setDeepView("why"); setAiStatus("idle"); setAiError(""); setCopied(false); setShared(false); setProductNotice(""); setSelectedAction(null); setReflection(""); setStep("cast");
  };
  const saveProfile = (nextProfile = profileDraft) => {
    const cleanProfile: UserProfile = { ...nextProfile, nickname:nextProfile.nickname.trim().slice(0, 12) };
    setProfile(cleanProfile); setProfileDraft(cleanProfile); setCategory(categoryForTopic(cleanProfile.topic)); setProfileOpen(false); setProfileStep("topic"); setBirthDraft({ birthDate:"", birthTime:"12:00", timeUnknown:false }); setBirthCardReady(false);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(cleanProfile)); localStorage.setItem(PROFILE_FLOW_KEY, "done"); }
    catch { setProductNotice("个人背景暂时无法保存，但不影响本次体验。"); }
  };
  const dismissProfile = () => {
    setProfileDraft(profile); setProfileOpen(false); setProfileStep("topic"); setBirthError(""); setBirthDraft({ birthDate:"", birthTime:"12:00", timeUnknown:false }); setBirthCardReady(false);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); localStorage.setItem(PROFILE_FLOW_KEY, "done"); } catch { /* Device-only preference. */ }
  };
  const selectTopic = (topic: ReadingTopic) => {
    setProfileDraft((current) => ({ ...current, topic, topicContext:current.topic === topic ? current.topicContext : undefined, focus:topic === "感情" || topic === "家庭" ? "整理关系" : topic === "个人成长" ? "减少内耗" : "看清选择" }));
    setCategory(categoryForTopic(topic));
  };
  const chooseActiveTopic = (topic: ReadingTopic) => {
    const next = { ...profile, topic, topicContext:profile.topic === topic ? profile.topicContext : undefined, focus:topic === "感情" || topic === "家庭" ? "整理关系" : topic === "个人成长" ? "减少内耗" : "看清选择" };
    setProfile(next); setProfileDraft(next); setCategory(categoryForTopic(topic)); setQuestion("");
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* Local mirror is optional. */ }
  };
  const continueBirthProfile = () => {
    if (!birthDraft.birthDate && profileDraft.birthContext) { setBirthError(""); setBirthCardReady(true); return; }
    if (!birthDraft.birthDate) { setBirthError("请选择出生日期，或点击“暂不提供”。"); return; }
    const context = calculateBirthContext(birthDraft.birthDate, birthDraft.timeUnknown ? null : birthDraft.birthTime);
    if (!context) { setBirthError("出生日期或时间格式不正确，请重新检查。"); return; }
    setProfileDraft((current) => ({ ...current, birthContext:context })); setBirthError(""); setBirthCardReady(true);
  };
  const skipBirthProfile = () => { setProfileDraft((current) => ({ ...current, birthContext:undefined })); setBirthError(""); setBirthCardReady(false); setProfileStep("context"); };
  const continueFromBirthCard = () => { setBirthCardReady(false); setProfileStep("context"); };
  const finishReading = (completedLines: LineValue[]) => {
    const reading = buildStructuredReading(completedLines, question, category, profile.topicContext);
    const item: HistoryItem = { id:Date.now(), version:2, question:question.trim(), category, topic:profile.topic, topicContext:profile.topicContext, lines:completedLines, createdAt:new Date().toISOString(), reading };
    const nextHistory = compactHistory([item, ...history]);
    setLines(completedLines); setActiveId(item.id); setHistory(nextHistory); setStep("result");
    if (!writeHistory(nextHistory)) setProductNotice("当前浏览器无法保存卦笺；本次结果仍可查看和复制。");
    try { localStorage.removeItem(DRAFT_KEY); sessionStorage.removeItem(CAST_SESSION_KEY); } catch { /* No-op. */ }
  };
  const cast = () => {
    if (lines.length >= 6 || isTossing || castTimer.current !== null) return;
    const { faces, value } = tossCoins();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCoinFaces(faces);
    setTossId((current) => current + 1);
    setIsTossing(true);
    castTimer.current = window.setTimeout(() => {
      const next = [...lines, value];
      setLines(next);
      setIsTossing(false);
      castTimer.current = null;
      if (next.length === 6) {
        resultTimer.current = window.setTimeout(() => {
          finishReading(next);
          resultTimer.current = null;
        }, reducedMotion ? 360 : 1150);
      }
    }, reducedMotion ? 140 : 1280);
  };
  const quickCast = () => {
    if (lines.length >= 6 || isTossing || castTimer.current !== null) return;
    const next = [...lines];
    let lastFaces = coinFaces;
    while (next.length < 6) { const toss = tossCoins(); next.push(toss.value); lastFaces = toss.faces; }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCoinFaces(lastFaces); setTossId((current) => current + 1); setIsTossing(true);
    castTimer.current = window.setTimeout(() => {
      setLines(next); setIsTossing(false); castTimer.current = null;
      resultTimer.current = window.setTimeout(() => { finishReading(next); resultTimer.current = null; }, reducedMotion ? 260 : 900);
    }, reducedMotion ? 140 : 980);
  };
  const leaveCasting = () => {
    if (castTimer.current !== null) window.clearTimeout(castTimer.current);
    if (resultTimer.current !== null) window.clearTimeout(resultTimer.current);
    castTimer.current = null; resultTimer.current = null; setIsTossing(false);
  };
  const restart = () => { leaveCasting(); try { sessionStorage.removeItem(CAST_SESSION_KEY); } catch { /* No-op. */ } setQuestion(""); setLines([]); setActiveId(null); setSelectedAction(null); setReflection(""); setAiStatus("idle"); setAiError(""); setAiStage(0); setFollowUpInput(""); setFollowUpStatus("idle"); setFollowUpError(""); setProductNotice(""); setStep("ask"); setHistoryOpen(false); };
  const confirmCastingExit = () => step !== "cast" || lines.length === 0 || window.confirm("当前卦象尚未完成，离开后会丢失已投出的爻。确定离开吗？");
  const goHome = () => { if (!confirmCastingExit()) return; if (initialExperience === "palm") { router.push("/"); return; } setExperience("oracle"); restart(); };
  const goPalm = () => { if (!confirmCastingExit()) return; leaveCasting(); try { sessionStorage.removeItem(CAST_SESSION_KEY); } catch { /* No-op. */ } router.push("/palm"); };
  const guardNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => { if (!confirmCastingExit()) event.preventDefault(); };
  const backToQuestion = () => { leaveCasting(); try { sessionStorage.removeItem(CAST_SESSION_KEY); } catch { /* No-op. */ } setLines([]); setStep("ask"); };
  const openHistoryItem = (item: HistoryItem) => {
    if (!confirmCastingExit()) return;
    leaveCasting();
    try { sessionStorage.removeItem(CAST_SESSION_KEY); } catch { /* No-op. */ }
    const itemTheme = buildStructuredReading(item.lines, item.question, item.category, item.topicContext);
    setExperience("oracle"); setQuestion(item.question); setCategory(item.category); setLines(item.lines); setActiveId(item.id); setSelectedAction(item.commitment ? Math.max(0, itemTheme.actions.indexOf(item.commitment.action)) : null); setReflection(item.commitment?.reflection ?? ""); setStep("result"); setHistoryOpen(false); setDeepView("why"); setAiStatus(item.aiReading ? "done" : "idle"); setAiError(""); setAiStage(0); setFollowUpInput(""); setFollowUpStatus("idle"); setFollowUpError(""); setProductNotice("");
  };
  const clearHistory = () => {
    if (!window.confirm("确定清空全部卦笺吗？此操作无法撤销。")) return;
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* The in-memory list can still be cleared. */ }
    if (cloudAvailable.current) void fetch("/api/state?scope=readings", { method:"DELETE" }).catch(() => undefined);
    setHistory([]); setActiveId(null); setSelectedAction(null); setHistoryOpen(false); setProductNotice("卦笺已清空。");
  };
  const deleteAllData = async () => {
    if (!window.confirm("确定删除全部个人数据吗？这会删除个人背景、全部卦笺、AI 对话和行动记录，且无法恢复。")) return;
    if (cloudAvailable.current) {
      try { const response = await fetch("/api/state?scope=all", { method:"DELETE" }); if (!response.ok) throw new Error("delete"); }
      catch { setProductNotice("云端资料暂时无法删除，请稍后再试；本地资料尚未改动。"); return; }
    }
    try { [HISTORY_KEY, PROFILE_KEY, PROFILE_FLOW_KEY, DRAFT_KEY].forEach((key) => localStorage.removeItem(key)); sessionStorage.removeItem(CAST_SESSION_KEY); } catch { /* In-memory reset still applies. */ }
    setHistory([]); setActiveId(null); setQuestion(""); setCategory("选择"); setLines([]); setProfile(defaultProfile); setProfileDraft(defaultProfile); setSelectedAction(null); setReflection(""); setFollowUpInput(""); setStep("ask"); setHistoryOpen(false); cloudAvailable.current = false; setSyncState("local"); router.replace("/login"); router.refresh();
  };
  const logout = async () => { try { await fetch("/api/auth/logout", { method:"POST" }); } finally { router.replace("/login"); router.refresh(); } };
  const sendFeedback = async (helpful: boolean) => {
    if (activeId === null || feedbackStatus === "sending") return;
    setFeedbackStatus("sending");
    try { const response = await fetch("/api/feedback", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ readingId:activeId, helpful }) }); if (!response.ok) throw new Error("feedback"); setFeedbackStatus(helpful ? "helpful" : "unhelpful"); setProductNotice("谢谢，你的反馈会帮助我们改进解读。"); }
    catch { setFeedbackStatus("idle"); setProductNotice("反馈暂时没有保存，请稍后再试。"); }
  };
  const aiEvidenceText = aiReading?.citations?.length ? `\n\n本次检索依据：\n${aiReading.citations.map((item) => `- [${item.id}] ${item.title}（${item.kind}）`).join("\n")}` : "";
  const aiReadingText = aiReading ? `\n\n【AI 深度解读】\n${aiReading.summary}\n${aiReading.situation}${aiReading.birthLens ? `\n\n八字背景视角：${aiReading.birthLens}` : ""}\n\n三个观察：\n${aiReading.insights.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n七日行动：\n${aiReading.actions.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n观察信号：${aiReading.watchFor}\n节奏：${aiReading.timing}\n留给自己：${aiReading.reflection}${aiEvidenceText}` : "";
  const followUpText = followUps.length ? `\n\n【后续对话】\n${followUps.map((message) => `${message.role === "user" ? "我" : "观象"}：${message.content}`).join("\n")}` : "";
  const lineText = structuredReading.selectedLines.length
    ? `\n取用爻位：\n${structuredReading.selectedLines.map((line) => `${line.label}（${line.role}）：${line.modern}\n行动：${line.action}`).join("\n")}`
    : "";
  const readingText = `【观象 · 第 ${hexagram.number} 卦 ${hexagram.name}】\n所问：${question}\n卦意：${theme.verdict}\n\n${theme.insight}\n\n卦象关系：${structuredReading.relation}\n取用规则：${structuredReading.selectionRule}${lineText}\n\n此刻可做：\n${theme.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}\n\n时机：${theme.timing}\n需避：${theme.avoid}${aiReadingText}${followUpText}\n\n提醒：本内容仅供传统文化体验与自我反思，不替代医疗、法律、投资等专业意见。`;
  const copyReading = async () => {
    const success = await copyText(readingText);
    setCopied(success); setProductNotice(success ? "完整卦笺已复制。" : "复制失败，请稍后重试。");
    window.setTimeout(() => setCopied(false), 1800);
  };
  const shareReading = async () => {
    try {
      const nativeShare = (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share;
      const canShare = typeof nativeShare === "function";
      if (nativeShare) await nativeShare.call(navigator, { title:`观象 · ${hexagram.name}卦`, text:readingText });
      else if (!await copyText(readingText)) throw new Error("copy failed");
      setShared(true); setProductNotice(canShare ? "卦笺已分享。" : "当前设备不支持直接分享，已复制完整卦笺。" );
      window.setTimeout(() => setShared(false), 1800);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setProductNotice("分享没有完成，你可以使用“复制卦笺”。");
    }
  };
  const updateHistory = (id: number, updater: (item: HistoryItem) => HistoryItem) => {
    const next = history.map((item) => item.id === id ? updater(item) : item);
    setHistory(next);
    const stored = writeHistory(next);
    if (!stored) setProductNotice("行动已保留在当前页面，但浏览器阻止了本地保存。");
    return stored;
  };
  const recentContext = history.filter((item) => item.id !== activeId).slice(0, 5).map((item) => {
    const itemHexagram = getHexagram(item.lines);
    return { question:item.question, category:item.category, hexagram:`${itemHexagram.name}卦`, commitment:item.commitment?.action, reflection:item.commitment?.reflection };
  });
  const generateAiReading = async () => {
    if (aiStatus === "loading" || aiReading || activeId === null) return;
    setAiStatus("loading");
    setAiError("");
    setAiStage(0);
    if (aiStageTimer.current !== null) window.clearInterval(aiStageTimer.current);
    aiStageTimer.current = window.setInterval(() => setAiStage((current) => Math.min(current + 1, 3)), 720);
    try {
      const response = await fetch("/api/deep-reading", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          question,
          category,
          lines,
          baseline:theme,
          profile:{ ...profile, topic:currentTopic, topicContext:currentTopicContext },
          recentContext,
        }),
      });
      const payload = await response.json() as { reading?: unknown; error?: unknown };
      if (!response.ok || !isAiDeepReading(payload.reading)) {
        throw new Error(typeof payload.error === "string" ? payload.error : "这次深读没有完整生成，请重新试一次。");
      }
      updateHistory(activeId, (item) => ({ ...item, aiReading:payload.reading as AiDeepReading }));
      if (aiStageTimer.current !== null) { window.clearInterval(aiStageTimer.current); aiStageTimer.current = null; }
      setAiStage(3);
      setAiStatus("done");
      setProductNotice("AI 深度解读已生成，并保存在卦笺中。");
    } catch (error) {
      if (aiStageTimer.current !== null) { window.clearInterval(aiStageTimer.current); aiStageTimer.current = null; }
      setAiStatus("error");
      setAiError(error instanceof Error ? error.message : "深度解读暂时不可用，请稍后再试。");
    }
  };
  useEffect(() => {
    if (step !== "result" || activeId === null || aiReading || aiStatus !== "idle") return;
    if (autoAiRequested.current === activeId) return;
    autoAiRequested.current = activeId;
    const timer = window.setTimeout(() => { void generateAiReading(); }, 280);
    return () => window.clearTimeout(timer);
    // generateAiReading intentionally runs once per completed reading id; state guards prevent duplicate model calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, activeId, aiReading, aiStatus]);
  const sendFollowUp = async (suggestion?: string) => {
    const followUp = (suggestion ?? followUpInput).trim().slice(0, 160);
    if (!followUp || followUpStatus === "loading" || activeId === null || !aiReading) return;
    setFollowUpStatus("loading"); setFollowUpError(""); setFollowUpInput("");
    try {
      const response = await fetch("/api/follow-up", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ question, category, lines, profile:{ ...profile, topic:currentTopic, topicContext:currentTopicContext }, aiReading, recentContext, messages:followUps.slice(-8), followUp }),
      });
      const payload = await response.json() as { answer?: unknown; suggestedQuestions?: unknown; error?: unknown };
      if (!response.ok || typeof payload.answer !== "string" || !payload.answer.trim()) throw new Error(typeof payload.error === "string" ? payload.error : "这次追问没有完整生成，请稍后再试。");
      const now = new Date().toISOString();
      const userMessage: FollowUpMessage = { id:`u-${now}`, role:"user", content:followUp, createdAt:now };
      const assistantMessage: FollowUpMessage = { id:`a-${now}`, role:"assistant", content:payload.answer.trim().slice(0, 600), createdAt:now };
      const nextMessages = [...followUps, userMessage, assistantMessage].slice(-12);
      updateHistory(activeId, (item) => ({ ...item, followUps:nextMessages }));
      if (Array.isArray(payload.suggestedQuestions)) setFollowUpSuggestions(payload.suggestedQuestions.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 3));
      setFollowUpStatus("idle");
    } catch (error) {
      setFollowUpStatus("error"); setFollowUpInput(followUp);
      setFollowUpError(error instanceof Error ? error.message : "连续追问暂时不可用，请稍后再试。");
    }
  };
  const saveCommitment = () => {
    if (selectedAction === null) return;
    const reviewDate = new Date(); reviewDate.setHours(12,0,0,0); reviewDate.setDate(reviewDate.getDate() + reviewDays);
    const commitment: Commitment = { action:theme.actions[selectedAction], reviewAt:reviewDate.toISOString(), status:"pending" };
    let stored = true;
    if (activeId !== null && activeHistoryItem) stored = updateHistory(activeId, (item) => ({ ...item, commitment }));
    else {
      const item: HistoryItem = { id:Date.now(), version:2, question, category, topic:currentTopic, topicContext:currentTopicContext, lines, createdAt:new Date().toISOString(), reading:theme, commitment };
      const next = compactHistory([item, ...history]); setActiveId(item.id); setHistory(next);
      stored = writeHistory(next);
    }
    setProductNotice(stored ? `已收进卦笺，${reviewDays} 天后会在站内标记为“该回看了”。` : "行动已保留在当前页面，但浏览器阻止了本地保存。");
  };
  const finishCommitment = () => {
    if (activeId === null || !activeHistoryItem?.commitment) return;
    const stored = updateHistory(activeId, (item) => ({ ...item, commitment:{ ...item.commitment!, status:"done", reflection:reflection.trim() } }));
    if (stored) setProductNotice("回看已完成，这条真实反馈会留在卦笺中。");
  };

  const deepCopy = deepView === "why"
    ? `${structuredReading.questionFit.translation} 这是把「${hexagram.name}」的卦象原义翻译到“${structuredReading.questionFit.intent}”后的现实含义。下卦为${hexagram.lower.nature}，主${hexagram.lower.quality}；上卦为${hexagram.upper.nature}，主${hexagram.upper.quality}。互卦「${structuredReading.mutual.name}」补充内部动力。${structuredReading.selectionRule}`
    : deepView === "how"
      ? `先从最小的一步开始：${theme.actions[0]}。完成后记录真实反馈，再决定是否推进第二步。卦象在这里不是替你做决定，而是帮你减少遗漏。`
      : `为避免“只听想听的”，请写下一个能推翻当前判断的信号：如果未来 ${theme.timing.replace("宜", "")} 仍未出现任何正向反馈，就暂停投入并重新收集事实。`;

  return (
    <main className={`site-shell ${experience === "oracle" && step === "cast" ? "casting-active" : ""} ${experience === "oracle" && step === "result" ? "result-active" : ""} ${experience === "palm" ? "palm-active" : ""}`}>
      <div className="cosmic-atmosphere" aria-hidden="true">
        <div className="star-dust" />
        <div className="meteor-field">{Array.from({ length:7 }, (_, index) => <i key={index} />)}</div>
        <div key={constellationScene.id} className={`constellation-visit constellation-${constellationScene.pattern} constellation-slot-${constellationScene.slot}`}>
          <div className="constellation-name"><small>{activeConstellation.code}</small><b>{activeConstellation.name}</b><span>{activeConstellation.verse}</span></div>
          <div className="constellation-chart"><span className="chart-ring" />{Array.from({ length:8 }, (_, index) => <i key={`star-${index}`} />)}{Array.from({ length:8 }, (_, index) => <b key={`link-${index}`} />)}</div>
        </div>
      </div>
      <header className="nav">
        <a className="brand" href="/" onClick={guardNavigation} aria-label="返回观象首页"><span className="brand-seal">✦</span><span><b>观象</b><small>GUANXIANG</small></span></a>
        <nav className="nav-links" aria-label="主要导航"><a className={experience === "oracle" ? "active" : ""} href="/" onClick={guardNavigation}>六爻起卦</a><a className={experience === "palm" ? "active" : ""} href="/palm" onClick={guardNavigation}>掌心观照</a><a href="/affinity" onClick={guardNavigation}>合缘观照</a><a href="/insights" onClick={guardNavigation}>洞见</a><a href="/#insight" onClick={guardNavigation}>产品理念</a></nav>
        <div className="nav-actions"><button className="profile-trigger" onClick={() => { setProfileDraft(profile); setProfileStep("topic"); setBirthError(""); setProfileOpen(true); }} aria-label="编辑个人背景">{profile.nickname ? profile.nickname.slice(0, 1) : "我"}</button><button className="history" onClick={() => setHistoryOpen(true)} aria-label="查看卦笺历史">{dueCount > 0 ? `该回看 ${dueCount}` : pendingCount > 0 ? `行动中 ${pendingCount}` : "我的卦笺"} {history.length > 0 && <b>{history.length}</b>} <span>↗</span></button></div>
      </header>
      {productNotice && <div className="product-toast" role="status"><span>{productNotice}</span><button onClick={() => setProductNotice("")} aria-label="关闭提示">×</button></div>}

      {experience === "oracle" && step === "ask" && <>
        <section className="ask-view meta-home" id="ask">
          <div className="hero-aurora" aria-hidden="true"><i /><i /><i /></div>
          <div className="hero-copy">
            <div className="experience-switch"><button className="active" aria-pressed="true">六爻起卦</button><button onClick={goPalm} aria-pressed="false">掌心观照 <span>实验</span></button></div>
            <div className="hero-badge"><span>✦</span> 结构化易卜体验</div>
            <h1><span>观象见心，</span><br /><em><span>知势而行</span></em></h1>
            <p>以六爻为镜，照见问题的结构。<br />不替你决定，只帮你看清下一步。</p>
            <div className="method"><span>三枚铜钱</span><i /><span>完整 64 卦</span><i /><span>行动式解读</span></div>
          </div>
          <div className="oracle-card" id="method">
            <div className="guided-context">
              <button onClick={() => { setProfileDraft(profile); setProfileStep("topic"); setProfileOpen(true); }}><small>当前主题</small><b>{profile.topic}</b><span>更换 →</span></button>
              {profile.birthContext ? <div><small>你的文化背景</small><b>{profile.birthContext.constellation} · 生肖{profile.birthContext.zodiac} · {profile.birthContext.dayMaster}{profile.birthContext.dayElement}日主</b><span>{profile.birthContext.timePrecision}</span></div> : <div className="muted"><small>出生背景</small><b>尚未设置</b><span>仍可正常起卦</span></div>}
              {profile.topicContext ? <div><small>本次处境</small><b>{profile.topicContext.situation} · {profile.topicContext.focus}</b><span>{profile.topicContext.horizon}</span></div> : <div className="muted"><small>主题背景</small><b>尚未补充</b><span>使用通用问题</span></div>}
            </div>
            <div className="composer-top"><span>关于{profile.topic}，此刻你最想看清什么？</span><small>{question.length} / 80</small></div>
            <div className="textarea-wrap">
              <ChatCat />
              <textarea id="question" aria-label="写下你的问题" aria-describedby={safety ? "question-coach question-boundary" : "question-coach"} value={question} maxLength={80} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canBegin) begin(); }} placeholder="写下一个具体的问题…" />
            </div>
            <div id="question-coach" className={`question-coach ${coach.tone}`}><b>{coach.label}</b><span>{coach.copy}</span><small>⌘ / Ctrl + Enter</small></div>
            {safety && <div id="question-boundary" className={`question-boundary ${safety.level}`} role={safety.level === "urgent" ? "alert" : "status"}><b>{safety.title}</b><span>{safety.copy}</span></div>}
            <div className="composer-bottom">
              <div className="category-row"><div>{readingTopics.map((item) => <button key={item.id} onClick={() => chooseActiveTopic(item.id)} className={profile.topic === item.id ? "active" : ""} aria-pressed={profile.topic === item.id}>{item.id}</button>)}</div></div>
              <button className="primary" disabled={!canBegin} onClick={begin} aria-label="开始起卦"><span>开始起卦</span><b>→</b></button>
            </div>
            {!question && <div className="starter-prompts personalized">{personalizedQuestions.map((example) => <button key={example} onClick={() => setQuestion(example)}>试问：{example}</button>)}</div>}
          </div>
          <p className="privacy hero-privacy">传统文化娱乐与自我反思 · 点击开始即同意将本次问题与卦象发送给第三方 AI 自动生成深读 · 请勿填写敏感信息 · <a href="/privacy">隐私政策</a></p>
          <div className="scroll-cue"><span /> 向下，了解观象</div>
        </section>

        <section className="home-section principle-section" id="insight">
          <div className="section-kicker" data-reveal><span /> 产品理念 <span /></div>
          <h2 data-reveal>不是替你问命，<br /><em>而是陪你看见。</em></h2>
          <p data-reveal>把古老的卦象变成当下可理解、可验证、可行动的思考框架。</p>
          <div className="principle-list">
            <article data-reveal><span>壹</span><div><small>FRAME</small><h3>先把问题说清楚</h3><p>从真实处境出发，把问题整理成可以观察、验证和行动的表达。</p></div></article>
            <article data-reveal><span>贰</span><div><small>REFLECT</small><h3>一个卦象，多层印证</h3><p>本卦、动爻与之卦共同呈现变化，让你看见局面而非单一答案。</p></div></article>
            <article data-reveal><span>叁</span><div><small>ACT</small><h3>让洞见走向行动</h3><p>选定一件小事，设下回看日期，用真实反馈修正自己的判断。</p></div></article>
          </div>
        </section>

        <section className="home-section showcase-section">
          <div className="showcase-copy" data-reveal><div className="section-kicker light"><span /> 解读示例</div><h2>从纷乱，<br />到一条清晰的路。</h2><p>卦象不制造确定性。它只是帮你把直觉、事实与行动放到同一张图里。</p><button onClick={() => window.scrollTo({top:0,behavior:"smooth"})}>问一件事 <span>→</span></button></div>
          <div className="showcase-card" data-reveal><div className="showcase-glow" /><small>第 37 卦 · 风火家人</small><div className="showcase-symbol">䷤</div><h3>先正其内，而后动于外</h3><p>机会并不稀缺，真正影响结果的是内部共识与边界。</p><div><span>现在可做</span><b>与关键关系人完成一次具体对齐</b></div></div>
        </section>

        <section className="home-cta"><span data-reveal>一念一问</span><h2 data-reveal>下一步，<br /><em>从这里开始。</em></h2><p data-reveal>给自己两分钟，看见更多可能。</p><button data-reveal onClick={() => window.scrollTo({top:0,behavior:"smooth"})}>开始起卦 <b>↗</b></button></section>
      </>}

      {experience === "oracle" && step === "cast" && <section className="cast-view cast-animated">
        <button className="back" onClick={backToQuestion}>← 返回修改问题</button>
        <div className="cast-intro"><div className="eyebrow"><span /> 以问为念 · 依序成爻</div><h2>第 {Math.min(lines.length + 1, 6)} 次投掷</h2><p>每枚铜钱正面计 3，背面计 2。<br />六爻自下而上，老阴、老阳为动爻。</p></div>
        <div className="casting-layout">
          <div className={`coin-stage ${isTossing ? "is-tossing" : ""}`}>
            <div className="ritual-meta"><span>CASTING RITUAL</span><b>{String(Math.min(lines.length + 1, 6)).padStart(2,"0")} <i>/</i> 06</b></div>
            <div className="intention-line"><span>心中所问</span><p>“{question}”</p></div>
            <div key={tossId} className={`ritual-field ${isTossing ? "awakened" : ""}`} aria-hidden="true">
              <div className="ritual-halo"><i /><i /><i /></div>
              <div className="coin-sparks">{Array.from({ length:12 }, (_, index) => <i key={index} />)}</div>
              <div className={`coins ${lines.length ? "scattered" : "resting"} ${isTossing ? "tossing" : ""}`}>
                {coinFaces.map((head, index) => <span key={index} className={`coin ${head ? "heads" : "tails"}`}><i className="coin-inner" /><i className="coin-hole" /><b>{head ? "乾" : "坤"}</b><small>{head ? "正" : "背"}</small></span>)}
              </div>
              <div className="landing-shadow" />
            </div>
            <div className={`cast-status ${isTossing ? "waiting" : lines.length ? "settled" : "ready"}`} aria-live="polite">
              <i />
              <span>{isTossing ? "听铜钱落下，卦意正在成形" : lines.length > 0 ? `第 ${lines.length} 爻落定` : "合掌静心，在心中默念此问"}</span>
              {lines.length > 0 && !isTossing && <b>得 {lines.at(-1)} · {lines.at(-1) === 6 ? "老阴动" : lines.at(-1) === 7 ? "少阳" : lines.at(-1) === 8 ? "少阴" : "老阳动"}</b>}
            </div>
            <button className="cast-button" onClick={cast} disabled={lines.length >= 6 || isTossing} aria-busy={isTossing}><b>{lines.length >= 6 ? "卦象已成" : isTossing ? "静候落定" : lines.length ? "再掷一爻" : "掷出铜钱"}<span>↗</span></b><small>{lines.length >= 6 ? "六爻齐备，正在为你解读" : isTossing ? "请凝神片刻" : `第 ${lines.length + 1} 爻 · 点击开始`}</small></button>
            <button className="quick-cast" onClick={quickCast} disabled={lines.length >= 6 || isTossing}><b>快速完成余下投掷</b><span>仍按三枚铜钱的同等概率生成</span></button>
          </div>
          <div className="hexagram-progress">
            <div className="progress-head"><div><small>HEXAGRAM</small><span>{lines.length ? "卦象渐成" : "卦象初成"}</span></div><b>{String(lines.length).padStart(2,"0")} <i>/</i> 06</b></div>
            <div className="progress-orbit" aria-hidden="true">{Array.from({ length:6 }, (_, index) => <i key={index} className={index < lines.length ? "done" : index === lines.length ? "current" : ""} />)}</div>
            <div className="lines">{[5,4,3,2,1,0].map((position) => {
              const value = lines[position]; const revealed = value !== undefined; const yang = value === 7 || value === 9; const moving = value === 6 || value === 9;
              return <div key={position} className={`line-row ${revealed ? "revealed" : ""} ${position === lines.length - 1 && !isTossing ? "latest" : ""} ${position === lines.length && lines.length < 6 ? "next" : ""}`}><span className="line-number">{position + 1}</span><div className={`yao ${revealed ? (yang ? "yang" : "yin") : "empty"}`}><i /><i /></div>{revealed && moving && <em>动</em>} {revealed && <small>{value}</small>}</div>;
            })}</div>
            <div className="progress-legend"><span><b>6</b> 老阴</span><span><b>7</b> 少阳</span><span><b>8</b> 少阴</span><span><b>9</b> 老阳</span></div>
            <p className="progress-note"><i /> 一次一爻，自下而上。慢一点，答案会更清晰。</p>
          </div>
        </div>
      </section>}

      {experience === "oracle" && step === "result" && <section className="result-view result-animated">
        <div className="result-heading"><div className="eyebrow"><span /> 卦已成 · 静观其意</div><p className="asked"><b>{currentTopic}</b> 你问：{question}</p><h2><small>第 {hexagram.number} 卦</small>{hexagram.upper.nature}{hexagram.lower.nature} · {hexagram.name}</h2><p>{theme.verdict}</p></div>
        <div className="result-grid">
          <div className="hex-card"><span className="hex-symbol">{hexagram.symbol}</span><b className="essence">{hexagram.essence}</b><div className="trigram-labels"><span>上卦 · {hexagram.upper.name}为{hexagram.upper.nature}</span><i /><span>下卦 · {hexagram.lower.name}为{hexagram.lower.nature}</span></div><p>卦象原义：{structuredReading.knowledge.image}<br />由{hexagram.lower.quality}而始，向{hexagram.upper.quality}而行。</p>{movingCount > 0 ? <div className="moving-note">{movingCount} 处动爻 · 之卦「{transformed.name}」· {transformed.essence}</div> : <div className="moving-note still">无动爻 · 宜观本卦整体之势</div>}<small className="moving-rule">{structuredReading.selectionRule}</small></div>
          <div className="reading-card"><div className="reading-section"><span>先回答你的问题 · {structuredReading.questionFit.intent}</span><p>{theme.insight}</p></div><div className="reading-section"><span>此刻可做</span><ol>{theme.actions.map((action) => <li key={action}>{action}</li>)}</ol></div><div className="reading-section half"><div><span>观察周期</span><p>{theme.timing}</p></div><div><span>需避</span><p>{theme.avoid}</p></div></div></div>
        </div>
        <section className="oracle-structure" aria-labelledby="oracle-structure-title">
          <div className="oracle-structure-head"><div><small>64 HEXAGRAMS · 384 LINE POSITIONS</small><h3 id="oracle-structure-title">本卦、互卦与变化路径</h3></div><span>结构化规则 v3</span></div>
          <div className="oracle-relation-grid">
            <article><small>本卦 · 当下</small><b>{hexagram.symbol} {hexagram.name}</b><p>{structuredReading.knowledge.stage}</p></article>
            <i aria-hidden="true">→</i>
            <article><small>互卦 · 内因</small><b>{structuredReading.mutual.symbol} {structuredReading.mutual.name}</b><p>{structuredReading.mutual.essence}</p></article>
            <i aria-hidden="true">→</i>
            <article className={!movingCount ? "muted" : ""}><small>{movingCount ? "之卦 · 走向" : "之卦 · 不取未来"}</small><b>{transformed.symbol} {transformed.name}</b><p>{movingCount ? transformed.essence : "无动爻时只看本卦主势"}</p></article>
          </div>
          <p className="oracle-relation-copy">{structuredReading.relation}</p>
          <div className="line-selection">
            <div className="line-selection-rule"><span>取用规则</span><p>{structuredReading.selectionRule}</p></div>
            {structuredReading.selectedLines.length > 0 && <div className="selected-lines">{structuredReading.selectedLines.map((line) => <article key={line.index}><div><small>{line.moving ? "动爻" : "静爻锚点"}</small><b>{line.label} · {line.role}</b><em>{line.value}</em></div><p>{line.modern}</p><span>{line.action}</span></article>)}</div>}
          </div>
        </section>
        <div className="reading-basis"><span>生成依据</span><b>第 {hexagram.number} 卦 · {hexagram.name}</b><i>互卦 · {structuredReading.mutual.name}</i><i>{movingCount} 处动爻</i><i>{movingCount ? `之卦 · ${transformed.name}` : "六爻皆静"}</i><i>问题适配 · {structuredReading.questionFit.intent}</i><small>64 卦专属释义 · 384 爻位组合</small></div>
        <section className={`ai-deep-card ${aiStatus}`} aria-labelledby="ai-deep-title">
          <div className="ai-deep-head">
            <div><small>DETERMINISTIC ORACLE · AI INTERPRETATION</small><h3 id="ai-deep-title"><i>✦</i> AI 深度解读</h3><p>确定算法负责成卦，AI 只负责结合问题、背景与历史解释。</p></div>
            <span>AI 生成 · {aiReading ? "已存入卦笺" : aiStatus === "loading" ? "自动生成中" : aiStatus === "error" ? "可重新生成" : "即将自动生成"}</span>
          </div>
          {aiReading ? <div className="ai-deep-result">
            <div className="ai-summary"><small>一句话照见</small><h4>{aiReading.summary}</h4><p>{aiReading.situation}</p></div>
            {aiReading.birthLens && <div className="ai-birth-lens"><div><small>BIRTH CONTEXT · 八字背景视角</small>{profile.birthContext && <span>{profile.birthContext.constellation} · 生肖{profile.birthContext.zodiac} · {profile.birthContext.dayMaster}{profile.birthContext.dayElement}日主</span>}</div><p>{aiReading.birthLens}</p><em>传统文化反思角度 · 不作为性格或命运定论</em></div>}
            <div className="ai-detail-grid">
              <article><span>三个关键观察</span><ol>{aiReading.insights.map((item) => <li key={item}>{item}</li>)}</ol></article>
              <article><span>接下来七天</span><ol>{aiReading.actions.map((item) => <li key={item}>{item}</li>)}</ol></article>
            </div>
            <div className="ai-signals"><div><span>观察信号</span><p>{aiReading.watchFor}</p></div><div><span>行动节奏</span><p>{aiReading.timing}</p></div></div>
            <blockquote><span>留给自己的问题</span>{aiReading.reflection}</blockquote>
            {aiReading.citations && aiReading.citations.length > 0 && <section className="ai-evidence" aria-labelledby="ai-evidence-title">
              <div className="ai-evidence-head"><div><small>RETRIEVAL EVIDENCE</small><h4 id="ai-evidence-title">本次检索依据</h4></div><span>{aiReading.citations.length} 条 · 已核验来源</span></div>
              <p className="ai-evidence-note">经典原文与现代解释分层展示；AI 只能引用本次检索到的原文片段，不能自行补写经典。</p>
              <div className="ai-evidence-list">{aiReading.citations.map((citation) => <article key={citation.id} className={citation.sourceType === "classic-original" ? "classic" : "modern"}><div><span>{citation.sourceType === "classic-original" ? "经典原文" : "现代解释"} · {citation.kind}</span><b>{citation.title}</b></div><p>{citation.excerpt}</p><small>{citation.sourceVersion} · {citation.reviewed ? "已核验" : "待审核"} · {citation.id}</small>{citation.sourceUrl && <a href={citation.sourceUrl} target="_blank" rel="noreferrer">查看原始出处 ↗</a>}</article>)}</div>
            </section>}
            <div className="ai-feedback"><span>这次 AI 解读对你有帮助吗？</span><div><button className={feedbackStatus === "helpful" ? "active" : ""} disabled={feedbackStatus === "sending"} onClick={() => sendFeedback(true)}>有帮助</button><button className={feedbackStatus === "unhelpful" ? "active" : ""} disabled={feedbackStatus === "sending"} onClick={() => sendFeedback(false)}>不太贴合</button></div></div>
          </div> : aiStatus === "loading" ? <div className="ai-process" role="status" aria-live="polite"><div className="ai-process-head"><span><i /><i /><i /></span><div><b>正在自动形成你的深度解读</b><small>基础结果可立即阅读，AI 解读会在完成后自动出现</small></div></div><ol>{["整理问题","检索知识","对照动爻","形成行动"].map((label, index) => <li key={label} className={index < aiStage ? "done" : index === aiStage ? "current" : "waiting"}><i>{index < aiStage ? "✓" : index + 1}</i><span>{label}</span><b>{index < aiStage ? "完成" : index === aiStage ? "处理中" : "等待"}</b></li>)}</ol></div> : <div className={`ai-deep-start ${aiStatus === "error" ? "" : "auto"}`}>
            <div><b>{aiStatus === "error" ? "这次没有生成" : "基础卦意已生成，正在连接 AI 深读"}</b><p>{aiError || `系统将检索本卦、动爻、之卦与问题框架，再由模型结合${history.length > 1 ? "近期卦笺和" : ""}现实处境生成结构化深读。`}</p><small>模型不可用时，确定卦象与基础解读仍会完整保留。</small></div>
            {aiStatus === "error" && <button onClick={generateAiReading}>重新生成<span>↗</span></button>}
          </div>}
          <p className="ai-deep-note">进入结果页后会自动将本次问题、背景与卦象发送给第三方模型；请勿填写姓名、电话等敏感信息。AI 只提供反思视角，不预测确定结果。</p>
        </section>
        {aiReading && <section className="followup-card" aria-labelledby="followup-title">
          <div className="followup-head"><div><small>CONTEXTUAL DIALOGUE</small><h3 id="followup-title">继续问，不必从头说起</h3><p>已带入本次卦象、你的背景、近期卦笺与这段对话。</p></div><span>{followUps.length ? `${Math.ceil(followUps.length / 2)} 轮` : "上下文已就绪"}</span></div>
          {followUps.length > 0 && <div className="followup-messages">{followUps.map((message) => <article key={message.id} className={message.role}><small>{message.role === "user" ? "你" : "观象 AI"}</small><p>{message.content}</p></article>)}</div>}
          <div className="followup-suggestions">{followUpSuggestions.map((suggestion) => <button key={suggestion} disabled={followUpStatus === "loading"} onClick={() => sendFollowUp(suggestion)}>{suggestion}</button>)}</div>
          <div className="followup-composer"><textarea value={followUpInput} onChange={(event) => setFollowUpInput(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") sendFollowUp(); }} maxLength={160} placeholder="继续追问，或说说刚才哪一点最触动你…" aria-label="继续追问" /><button disabled={!followUpInput.trim() || followUpStatus === "loading"} onClick={() => sendFollowUp()}>{followUpStatus === "loading" ? "正在联系上下文…" : "发送追问"}<span>→</span></button></div>
          {followUpError && <p className="followup-error" role="alert">{followUpError}</p>}
          <p className="followup-privacy">对话随卦笺保存；调用 AI 时会发送必要上下文，请勿填写敏感信息。</p>
        </section>}
        <div className="deep-reading"><div className="deep-tabs" role="tablist" aria-label="深度解读">{deepViews.map((view) => <button key={view.id} role="tab" aria-selected={deepView === view.id} className={deepView === view.id ? "active" : ""} onClick={() => setDeepView(view.id)}>{view.label}</button>)}</div><div role="tabpanel"><span>深读 · {deepViews.find((view) => view.id === deepView)?.title}</span><p>{deepCopy}</p></div></div>
        <div className="commitment-card">
          <div className="commitment-head"><div><small>ONE THING</small><h3>定一事 · 让卦意落地</h3></div><span>{activeHistoryItem?.commitment ? (activeHistoryItem.commitment.status === "done" ? "已回看" : "待回看") : "未选择"}</span></div>
          {!activeHistoryItem?.commitment ? <>
            <div className="action-choices">{theme.actions.map((action, index) => <button key={action} className={selectedAction === index ? "selected" : ""} aria-pressed={selectedAction === index} onClick={() => setSelectedAction(index)}><i>{index + 1}</i><span>{action}</span><b>{selectedAction === index ? "✓" : ""}</b></button>)}</div>
            <div className="review-row"><span>多久后回来看看？<small>仅在下次打开本站时提示</small></span><div>{([3,7,14] as const).map((days) => <button key={days} className={reviewDays === days ? "active" : ""} aria-pressed={reviewDays === days} onClick={() => setReviewDays(days)}>{days} 天</button>)}</div><button className="save-action" disabled={selectedAction === null} onClick={saveCommitment}>收进卦笺</button></div>
          </> : <div className="commitment-saved">
            <div><small>我决定去做</small><p>{activeHistoryItem.commitment.action}</p><span>{activeHistoryItem.commitment.status === "pending" ? `回看日 · ${new Date(activeHistoryItem.commitment.reviewAt).toLocaleDateString("zh-CN")}` : "这件事已经完成回看"}</span></div>
            {activeHistoryItem.commitment.status === "pending" ? <div className="reflection-box"><label htmlFor="reflection">回来时，真实发生了什么？</label><textarea id="reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="记下结果、意外和新的判断…" maxLength={160} /><button onClick={finishCommitment}>完成回看</button></div> : <blockquote>{activeHistoryItem.commitment.reflection || "已完成，没有留下文字记录。"}</blockquote>}
          </div>}
        </div>
        <div className="result-actions"><button className="primary" onClick={restart}><span>再问一事</span><b>↻</b></button><button className="secondary" onClick={copyReading}>{copied ? "已复制" : "复制卦笺"}</button><button className="secondary" onClick={shareReading}>{shared ? "已分享" : "分享"}</button></div>
        <p className="disclaimer">观象提供传统文化视角下的自我反思，不构成医疗、法律、投资或人生决策建议。重大事项请结合事实与专业意见。</p>
      </section>}

      {experience === "palm" && <PalmReading onBack={goHome} />}

      {profileOpen && <div className="profile-backdrop"><div className="profile-dialog guided-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button className="profile-close" onClick={dismissProfile} aria-label="关闭引导">×</button>
        <div className="onboarding-progress" aria-label="引导进度"><i className={profileStep === "topic" ? "active" : "done"}>1</i><span /><i className={profileStep === "birth" ? "active" : profileStep === "context" || profileStep === "preference" ? "done" : ""}>2</i><span /><i className={profileStep === "context" ? "active" : profileStep === "preference" ? "done" : ""}>3</i><span /><i className={profileStep === "preference" ? "active" : ""}>4</i></div>

        {profileStep === "topic" && <div className="onboarding-panel">
          <div className="profile-intro"><small>FIRST QUESTION · 第一步</small><span>✦</span><h2 id="profile-title">今天，你最想看哪一方面？</h2><p>不需要先想好问题。选择一个方向，观象会在下一步帮你把它整理成适合起卦的表达。</p></div>
          <div className="topic-grid">{readingTopics.map((item) => <button key={item.id} className={profileDraft.topic === item.id ? "active" : ""} aria-pressed={profileDraft.topic === item.id} onClick={() => selectTopic(item.id)}><i>{item.mark}</i><span><b>{item.title}</b><small>{item.copy}</small></span><em>{profileDraft.topic === item.id ? "✓" : "→"}</em></button>)}</div>
          <p className="onboarding-boundary">“财运”等主题用于整理资源与行动，不预测收益；健康、投资和法律事项仍应咨询专业人士。</p>
          <div className="profile-actions"><button onClick={dismissProfile}>暂时跳过</button><button onClick={() => setProfileStep("birth")}>下一步，补充背景 <span>→</span></button></div>
        </div>}

        {profileStep === "birth" && <div className="onboarding-panel">
          <div className="profile-intro compact"><small>BIRTH CONTEXT · 第二步</small><span>{birthCardReady ? "照" : "生"}</span><h2 id="profile-title">{birthCardReady ? "你的文化背景卡" : "生成你的文化背景卡"}</h2><p>{birthCardReady ? "这是根据你自愿提供的信息生成的传统文化标签，可以随时返回修改。" : "星座、生肖与四柱由程序计算。原始生日和时间只用于本次计算，不写入卦笺，也不会直接发送给大模型。"}</p></div>
          {birthCardReady && profileDraft.birthContext ? <>
            <CultureBackgroundCard context={profileDraft.birthContext} />
            <div className="birth-card-actions"><button onClick={() => setBirthCardReady(false)}>重新填写</button><button onClick={continueFromBirthCard}>继续，补充处境 <span>→</span></button></div>
          </> : <>
            <div className="birth-form">
              <label><span>出生日期</span><input type="date" min="1901-01-01" max={new Date().toISOString().slice(0, 10)} value={birthDraft.birthDate} onChange={(event) => { setBirthDraft((current) => ({ ...current, birthDate:event.target.value })); setBirthError(""); setBirthCardReady(false); }} /></label>
              <label><span>出生时间</span><input type="time" disabled={birthDraft.timeUnknown} value={birthDraft.birthTime} onChange={(event) => { setBirthDraft((current) => ({ ...current, birthTime:event.target.value })); setBirthError(""); setBirthCardReady(false); }} /></label>
            </div>
            <label className="unknown-time"><input type="checkbox" checked={birthDraft.timeUnknown} onChange={(event) => { setBirthDraft((current) => ({ ...current, timeUnknown:event.target.checked })); setBirthCardReady(false); }} /><span>我不知道具体出生时间</span></label>
            {profileDraft.birthContext && !birthDraft.birthDate && <div className="existing-birth"><b>已有背景卡</b><span>{profileDraft.birthContext.constellation} · 生肖{profileDraft.birthContext.zodiac} · {profileDraft.birthContext.dayMaster}{profileDraft.birthContext.dayElement}日主</span></div>}
            {birthError && <p className="birth-error" role="alert">{birthError}</p>}
            <div className="privacy-promise"><i>✓</i><div><b>只保存推导结果</b><span>保存星座、生肖、四柱与日主标签；不保存原始出生日期和时间。</span></div></div>
            <div className="profile-actions three"><button onClick={() => setProfileStep("topic")}>上一步</button><button onClick={skipBirthProfile}>暂不提供</button><button onClick={continueBirthProfile}>{profileDraft.birthContext && !birthDraft.birthDate ? "查看已有背景" : "生成背景卡"} <span>→</span></button></div>
          </>}
        </div>}

        {profileStep === "context" && <div className="onboarding-panel">
          <div className="profile-intro compact"><small>YOUR SITUATION · 第三步</small><span>问</span><h2 id="profile-title">再了解一点你的{profileDraft.topic}</h2><p>只需点选当前处境和关注点，系统就会把宽泛主题整理成更容易回答的具体问题。</p></div>
          <div className="topic-context-form">
            <fieldset><legend>{topicFollowUps[profileDraft.topic].situationLabel}</legend><div>{topicFollowUps[profileDraft.topic].situations.map((option) => <button type="button" key={option} className={profileDraft.topicContext?.situation === option ? "active" : ""} aria-pressed={profileDraft.topicContext?.situation === option} onClick={() => setProfileDraft((current) => ({ ...current, topicContext:{ situation:option, focus:current.topicContext?.focus ?? "", horizon:current.topicContext?.horizon ?? "三个月" } }))}>{option}</button>)}</div></fieldset>
            <fieldset><legend>{topicFollowUps[profileDraft.topic].focusLabel}</legend><div>{topicFollowUps[profileDraft.topic].focuses.map((option) => <button type="button" key={option} className={profileDraft.topicContext?.focus === option ? "active" : ""} aria-pressed={profileDraft.topicContext?.focus === option} onClick={() => setProfileDraft((current) => ({ ...current, topicContext:{ situation:current.topicContext?.situation ?? "", focus:option, horizon:current.topicContext?.horizon ?? "三个月" } }))}>{option}</button>)}</div></fieldset>
            <fieldset><legend>希望观察多长时间？</legend><div>{topicHorizons.map((option) => <button type="button" key={option} className={profileDraft.topicContext?.horizon === option ? "active" : ""} aria-pressed={profileDraft.topicContext?.horizon === option} onClick={() => setProfileDraft((current) => ({ ...current, topicContext:{ situation:current.topicContext?.situation ?? "", focus:current.topicContext?.focus ?? "", horizon:option } }))}>{option}</button>)}</div></fieldset>
          </div>
          {isTopicContext(profileDraft.topicContext) && <div className="question-preview"><small>将为你推荐</small>{buildTopicQuestions(profileDraft.topic, profileDraft.topicContext).slice(0, 2).map((example) => <p key={example}>{example}</p>)}</div>}
          <div className="profile-actions"><button onClick={() => setProfileStep("birth")}>上一步</button><button disabled={!isTopicContext(profileDraft.topicContext)} onClick={() => setProfileStep("preference")}>生成我的问题 <span>→</span></button></div>
        </div>}

        {profileStep === "preference" && <div className="onboarding-panel">
          <div className="profile-intro compact"><small>YOUR READING · 第四步</small><span>照</span><h2 id="profile-title">让解读更贴近你的处境</h2><p>这些信息只用于调整问题模板与表达方式，不会被当作决定性的人格结论。</p></div>
          {profileDraft.birthContext && <div className="birth-context-preview"><div><small>{profileDraft.birthContext.constellation}</small><b>生肖{profileDraft.birthContext.zodiac}</b></div><div><small>四柱</small><b>{profileDraft.birthContext.pillars.join(" · ")}</b></div><div><small>日主</small><b>{profileDraft.birthContext.dayMaster}{profileDraft.birthContext.dayElement}</b></div><p>{profileDraft.birthContext.reflection}</p></div>}
          <label className="profile-name"><span>怎么称呼你？<i>选填</i></span><input value={profileDraft.nickname} onChange={(event) => setProfileDraft((current) => ({ ...current, nickname:event.target.value }))} maxLength={12} placeholder="比如：小观" /></label>
          {[
            { key:"lifeStage" as const, label:"你正处在哪种状态？", options:["职场起步","稳定发展","转型探索","自由成长"] },
            { key:"responseStyle" as const, label:"希望我怎样回应？", options:["直接具体","温和陪伴","理性分析"] },
          ].map((field) => <fieldset key={field.key}><legend>{field.label}</legend><div>{field.options.map((option) => <button type="button" key={option} className={profileDraft[field.key] === option ? "active" : ""} aria-pressed={profileDraft[field.key] === option} onClick={() => setProfileDraft((current) => ({ ...current, [field.key]:option }))}>{option}</button>)}</div></fieldset>)}
          <div className="profile-actions"><button onClick={() => setProfileStep("context")}>上一步</button><button onClick={() => saveProfile()}>保存，开始问事 <span>→</span></button></div>
        </div>}
      </div></div>}

      {historyOpen && <div className="drawer-backdrop"><button className="drawer-scrim" onClick={() => setHistoryOpen(false)} aria-label="关闭卦笺历史" /><aside className="history-drawer" role="dialog" aria-modal="true" aria-labelledby="history-title"><div className="drawer-head"><div><small>MY READINGS · {syncState === "cloud" ? "邀请码账户已同步" : syncState === "syncing" ? "同步中" : syncState === "error" ? "云同步稍后重试" : "本地保存"}</small><h3 id="history-title">我的卦笺</h3>{pendingCount > 0 && <p>{dueCount > 0 ? `${dueCount} 件已经到回看日，另有 ${pendingCount - dueCount} 件行动中` : `${pendingCount} 件行动进行中`}</p>}</div><button ref={drawerCloseRef} onClick={() => setHistoryOpen(false)} aria-label="关闭">×</button></div>{history.length === 0 ? <div className="empty-history"><span>⌁</span><p>尚无卦笺</p><small>完成第一次起卦后，会自动保存在这里</small></div> : <div className="history-list">{history.map((item) => { const itemHex = getHexagram(item.lines); const isDue = item.commitment?.status === "pending" && new Date(item.commitment.reviewAt).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0); return <button key={item.id} onClick={() => openHistoryItem(item)}><span className="history-symbol">{itemHex.symbol}</span><div><small>{new Date(item.createdAt).toLocaleDateString("zh-CN")} · {item.category}</small><b>{itemHex.name}卦 <i>{itemHex.essence}</i></b><p>{item.question}</p>{item.commitment && <strong className={item.commitment.status}>{item.commitment.status === "done" ? "已回看" : isDue ? "该回看了" : "行动中"}</strong>}</div><em>→</em></button>; })}</div>}<div className="data-controls"><button onClick={clearHistory} disabled={history.length === 0}>清空全部卦笺</button><button onClick={deleteAllData}>删除全部个人数据</button><button onClick={logout}>退出邀请码账户</button><small>删除会移除个人背景、卦笺、AI 对话与行动记录，且无法恢复。</small></div></aside></div>}

      <footer><span>观象 · 传统文化数字体验</span><span className="footer-links"><a href="/membership">会员方案</a><a href="/privacy">隐私政策</a><a href="/terms">用户协议</a></span><span>敬畏未知，更相信你的选择</span></footer>
    </main>
  );
}
