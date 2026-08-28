import { Solar } from "lunar-typescript";

export type Gender = "女" | "男" | "不设置";
export type RelationshipKind = "伴侣" | "朋友" | "合作";
export type ElementName = "木" | "火" | "土" | "金" | "水";
export type AffinityPersonInput = { nickname: string; birthDate: string; birthTime: string; city: string; gender: Gender };
export type AffinityInput = { relationship: RelationshipKind; personA: AffinityPersonInput; personB: AffinityPersonInput };
export type Pillar = { label: "年" | "月" | "日" | "时"; value: string; gan: string; zhi: string; elements: [ElementName, ElementName] };
export type PersonChart = { nickname: string; city: string; gender: Gender; pillars: Pillar[]; elementCounts: Record<ElementName, number>; dayMaster: string; dayElement: ElementName };
export type AffinityMetric = { key: "resonance" | "balance" | "flow"; label: string; value: number; copy: string };
export type AffinityResult = { version: 1; relationship: RelationshipKind; chartA: PersonChart; chartB: PersonChart; metrics: AffinityMetric[]; dayRelation: string; branchRelation: string; observations: string[]; actions: string[]; calculationNote: string };

const elements: ElementName[] = ["木", "火", "土", "金", "水"];
const stemElement: Record<string, ElementName> = { 甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水" };
const branchElement: Record<string, ElementName> = { 寅:"木",卯:"木",巳:"火",午:"火",辰:"土",戌:"土",丑:"土",未:"土",申:"金",酉:"金",亥:"水",子:"水" };
const generates: Record<ElementName, ElementName> = { 木:"火",火:"土",土:"金",金:"水",水:"木" };
const controls: Record<ElementName, ElementName> = { 木:"土",土:"水",水:"火",火:"金",金:"木" };
const sixHarmony = new Set(["子丑","丑子","寅亥","亥寅","卯戌","戌卯","辰酉","酉辰","巳申","申巳","午未","未午"]);
const sixClash = new Set(["子午","午子","丑未","未丑","寅申","申寅","卯酉","酉卯","辰戌","戌辰","巳亥","亥巳"]);

function round(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function safeText(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }
function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number); if (year < 1901 || year > new Date().getFullYear() || month < 1 || month > 12) return false;
  const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function validTime(value: string) { const match = /^(\d{2}):(\d{2})$/.exec(value); return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60); }

export function normalizeAffinityInput(value: unknown): AffinityInput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>; const relationship = raw.relationship;
  if (relationship !== "伴侣" && relationship !== "朋友" && relationship !== "合作") return null;
  const parsePerson = (candidate: unknown): AffinityPersonInput | null => {
    if (!candidate || typeof candidate !== "object") return null; const person = candidate as Record<string, unknown>;
    const nickname = safeText(person.nickname, 12); const birthDate = safeText(person.birthDate, 10); const birthTime = safeText(person.birthTime, 5); const city = safeText(person.city, 24); const gender = person.gender;
    if (!nickname || !validDate(birthDate) || !validTime(birthTime) || (gender !== "女" && gender !== "男" && gender !== "不设置")) return null;
    return { nickname, birthDate, birthTime, city, gender };
  };
  const personA = parsePerson(raw.personA); const personB = parsePerson(raw.personB);
  return personA && personB ? { relationship, personA, personB } : null;
}

function chart(person: AffinityPersonInput): PersonChart {
  const [year, month, day] = person.birthDate.split("-").map(Number); const [hour, minute] = person.birthTime.split(":").map(Number);
  const eight = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar().getEightChar();
  const values = [eight.getYear(), eight.getMonth(), eight.getDay(), eight.getTime()]; const labels: Pillar["label"][] = ["年","月","日","时"];
  const elementCounts = Object.fromEntries(elements.map((element) => [element, 0])) as Record<ElementName, number>;
  const pillars = values.map((value, index): Pillar => {
    const gan = value.slice(0, 1); const zhi = value.slice(1, 2); const ganElement = stemElement[gan]; const zhiElement = branchElement[zhi];
    elementCounts[ganElement] += 1; elementCounts[zhiElement] += 1;
    return { label:labels[index], value, gan, zhi, elements:[ganElement, zhiElement] };
  });
  return { nickname:person.nickname, city:person.city, gender:person.gender, pillars, elementCounts, dayMaster:pillars[2].gan, dayElement:pillars[2].elements[0] };
}

function vector(chartValue: PersonChart) { return elements.map((element) => chartValue.elementCounts[element]); }
function cosine(a: number[], b: number[]) { const dot = a.reduce((sum, value, index) => sum + value * b[index], 0); const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0)); const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0)); return dot / (normA * normB || 1); }
function entropy(values: number[]) { const total = values.reduce((sum, value) => sum + value, 0); return -values.reduce((sum, value) => value ? sum + value / total * Math.log(value / total) : sum, 0) / Math.log(elements.length); }
function relationCounts(a: PersonChart, b: PersonChart) {
  let support = 0; let friction = 0;
  for (const source of elements) for (const target of elements) {
    const pairs = a.elementCounts[source] * b.elementCounts[target] + b.elementCounts[source] * a.elementCounts[target];
    if (generates[source] === target) support += pairs; if (controls[source] === target) friction += pairs;
  }
  return { support, friction };
}
function dayRelation(a: PersonChart, b: PersonChart) {
  if (a.dayElement === b.dayElement) return `两人的日主同属${a.dayElement}，更容易理解彼此习惯的表达方式，也要避免把相似当成默认共识。`;
  if (generates[a.dayElement] === b.dayElement) return `${a.nickname}的${a.dayElement}日主对${b.nickname}的${b.dayElement}日主形成“相生”结构，支持容易从前者流向后者，关系中需要注意双向回馈。`;
  if (generates[b.dayElement] === a.dayElement) return `${b.nickname}的${b.dayElement}日主对${a.nickname}的${a.dayElement}日主形成“相生”结构，照顾与回应需要保持双向。`;
  if (controls[a.dayElement] === b.dayElement || controls[b.dayElement] === a.dayElement) return `两人的日主形成传统五行“相制”结构，差异可能带来推动力，也更需要明确边界与冲突后的修复方式。`;
  return `两人的日主分别属${a.dayElement}与${b.dayElement}，关系重点不在相同，而在能否把不同节奏转化为分工。`;
}
function branchRelation(a: PersonChart, b: PersonChart) {
  const pair = `${a.pillars[2].zhi}${b.pillars[2].zhi}`;
  if (sixHarmony.has(pair)) return `日支${pair}在传统规则中属于“六合”，提示相处中较容易形成默契；仍需用现实沟通验证。`;
  if (sixClash.has(pair)) return `日支${pair}在传统规则中属于“六冲”，提示节奏与安全感来源可能不同；它不是不合，而是需要更清楚的协商机制。`;
  return `日支${pair}未落入本版采用的六合或六冲关系，适合把重点放回现实互动与共同目标。`;
}

export function calculateAffinity(input: AffinityInput): AffinityResult {
  const chartA = chart(input.personA); const chartB = chart(input.personB); const a = vector(chartA); const b = vector(chartB); const combined = a.map((value, index) => value + b[index]); const counts = relationCounts(chartA, chartB);
  const metrics: AffinityMetric[] = [
    { key:"resonance", label:"表达同频", value:round(cosine(a, b) * 100), copy:"比较两人的五行分布相似度；高分代表语言习惯可能更接近，不等于关系一定顺利。" },
    { key:"balance", label:"结构互补", value:round(entropy(combined) * 100), copy:"观察两人合在一起后的五行分布是否均衡；高分代表可调用的关系资源更丰富。" },
    { key:"flow", label:"支持流动", value:round(45 + 45 * (counts.support - counts.friction) / Math.max(1, counts.support + counts.friction)), copy:"比较跨盘相生与相制关系；它提示支持是否容易流动，不是吉凶评分。" },
  ];
  const shared = elements.reduce((best, element) => Math.min(chartA.elementCounts[element], chartB.elementCounts[element]) > Math.min(chartA.elementCounts[best], chartB.elementCounts[best]) ? element : best, elements[0]);
  const missing = elements.reduce((best, element) => chartA.elementCounts[element] + chartB.elementCounts[element] < chartA.elementCounts[best] + chartB.elementCounts[best] ? element : best, elements[0]);
  const observations = [`共同的${shared}元素较突出，是两人比较容易互相理解的关系资源。`, `组合中${missing}元素相对较少，可用更具体的约定补足这一部分，而不是期待对方自动理解。`, dayRelation(chartA, chartB)];
  const actionByElement: Record<ElementName, string> = { 木:"一起规划一个有成长感的小目标",火:"安排一次有情绪温度、但不讨论结论的相处",土:"把时间、责任和边界写成清楚约定",金:"为一个分歧定义可执行的判断标准",水:"留出一次完整倾听，不急着给建议" };
  const actions = [actionByElement[missing], "各自说出一件希望被理解、又常被忽略的小事", sixClash.has(`${chartA.pillars[2].zhi}${chartB.pillars[2].zhi}`) ? "约定冲突暂停词，以及恢复沟通的具体时间" : "七天后用一件真实发生的事验证这份关系判断"];
  return { version:1, relationship:input.relationship, chartA, chartB, metrics, dayRelation:dayRelation(chartA, chartB), branchRelation:branchRelation(chartA, chartB), observations, actions, calculationNote:"四柱按填写的当地钟表时间换算；关系指数仅由五行分布、相生相制及日支六合/六冲规则生成。出生地不参与评分，未做真太阳时校正。" };
}
