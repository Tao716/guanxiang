import { classicHexagrams, type ClassicHexagramKnowledge } from "./classic-knowledge.generated";
import { changedLines, getHexagram, type LineValue } from "./oracle";
import { buildStructuredReading, getHexagramKnowledge, type ReadingCategory } from "./oracle-knowledge";

export type OracleEvidenceKind = "经典卦辞" | "经典爻辞" | "大象" | "本卦释义" | "爻位解释" | "取用规则" | "问题框架" | "互卦释义" | "之卦释义";
export type OracleSourceType = "classic-original" | "internal-modern";

export type OracleEvidence = {
  id: string;
  title: string;
  kind: OracleEvidenceKind;
  excerpt: string;
  sourceType: OracleSourceType;
  sourceTitle: string;
  sourceVersion: string;
  sourceUrl?: string;
  license: string;
  reviewed: true;
  score: number;
  rankReason: string;
};

type EvidenceInput = Omit<OracleEvidence, "reviewed" | "score" | "rankReason"> & {
  structureScore: number;
  question: string;
  terms?: string[];
  rankReason: string;
};

const INTERNAL_VERSION = "观象结构化知识库 v2.0";
const CLASSIC_VERSION = "维基文库《周易》公版原文 · 本地快照 2026-08-25";
const CLASSIC_LICENSE = "公有领域（Public Domain）";
const classicByNumber = new Map(classicHexagrams.map((entry) => [entry.number, entry]));
const categories = new Set<ReadingCategory>(["事业", "关系", "选择", "成长"]);
const categoryKnowledge: Record<ReadingCategory, { title: string; excerpt: string; terms: string[] }> = {
  事业:{ title:"事业问题框架", excerpt:"把判断落到职责、资源、能力积累、协作关系和可验证的推进条件上；避免只凭短期情绪决定长期路径。", terms:["工作","事业","职业","转岗","跳槽","创业","团队","项目","领导","能力"] },
  关系:{ title:"关系问题框架", excerpt:"同时观察事实、需求、边界、沟通方式和双方是否愿意采取对等行动；不以单方面猜测替代真实对话。", terms:["关系","沟通","伴侣","朋友","同事","边界","冲突","信任","分手","合作"] },
  选择:{ title:"选择问题框架", excerpt:"先明确不可妥协条件、可逆性、机会成本和验证窗口，再通过一个小规模行动补充事实。", terms:["选择","决定","机会","方案","要不要","是否","风险","成本","时机","方向"] },
  成长:{ title:"成长问题框架", excerpt:"区分情绪感受、重复模式和可以训练的能力，把抽象自我评价改写成短周期可观察的行为。", terms:["成长","焦虑","内耗","能力","习惯","学习","改变","情绪","自信","目标"] },
};

function categoryOf(value: string): ReadingCategory {
  return categories.has(value as ReadingCategory) ? value as ReadingCategory : "选择";
}

function tokens(value: string) {
  const normalized = value.toLowerCase().replace(/[\s，。！？、；：,.!?;:（）()“”"']/g, "");
  const result = new Set<string>();
  for (let index = 0; index < normalized.length; index += 1) {
    result.add(normalized[index]);
    if (index < normalized.length - 1) result.add(normalized.slice(index, index + 2));
  }
  return result;
}

function semanticScore(question: string, content: string, terms: string[] = []) {
  const query = tokens(question);
  const document = tokens(content);
  let overlap = 0;
  for (const term of query) if (document.has(term)) overlap += term.length === 2 ? 2 : .2;
  const termHits = terms.filter((term) => question.includes(term)).length;
  return Math.min(24, overlap + termHits * 4);
}

function evidence(input: EvidenceInput): OracleEvidence {
  const semantic = semanticScore(input.question, `${input.title}${input.excerpt}`, input.terms);
  return {
    id:input.id,
    title:input.title,
    kind:input.kind,
    excerpt:input.excerpt.slice(0, 360),
    sourceType:input.sourceType,
    sourceTitle:input.sourceTitle,
    sourceVersion:input.sourceVersion,
    sourceUrl:input.sourceUrl,
    license:input.license,
    reviewed:true,
    score:Math.round((input.structureScore + semantic) * 10) / 10,
    rankReason:`${input.rankReason}；语义相关度 ${Math.round(semantic * 10) / 10}`,
  };
}

function modernEvidence(input: Omit<EvidenceInput, "sourceType" | "sourceTitle" | "sourceVersion" | "license">) {
  return evidence({ ...input, sourceType:"internal-modern", sourceTitle:"观象现代解释", sourceVersion:INTERNAL_VERSION, license:"观象原创现代释义" });
}

function classicEvidence(input: Omit<EvidenceInput, "sourceType" | "sourceTitle" | "sourceVersion" | "sourceUrl" | "license">, classic: ClassicHexagramKnowledge) {
  return evidence({
    ...input,
    sourceType:"classic-original",
    sourceTitle:"《周易》",
    sourceVersion:CLASSIC_VERSION,
    sourceUrl:classic.sourceUrl,
    license:CLASSIC_LICENSE,
  });
}

function addClassicHexagram(candidates: OracleEvidence[], classic: ClassicHexagramKnowledge | undefined, question: string, relation: "本卦" | "互卦" | "之卦", structureScore: number) {
  if (!classic) return;
  candidates.push(classicEvidence({
    id:`ZY-H${classic.number}-J`,
    title:`《周易》${relation}「${classic.name}」卦辞`,
    kind:"经典卦辞",
    excerpt:classic.judgement,
    structureScore,
    question,
    rankReason:`${relation}结构精确匹配`,
  }, classic));
  candidates.push(classicEvidence({
    id:`ZY-H${classic.number}-I`,
    title:`《周易》${relation}「${classic.name}」大象`,
    kind:"大象",
    excerpt:classic.image,
    structureScore:structureScore - 5,
    question,
    rankReason:`${relation}卦象精确匹配`,
  }, classic));
}

function diversityRerank(candidates: OracleEvidence[], limit: number, hasSelectedLines: boolean) {
  const sorted = [...new Map(candidates.map((item) => [item.id, item])).values()]
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const selected: OracleEvidence[] = [];
  const take = (predicate: (item: OracleEvidence) => boolean) => {
    const match = sorted.find((item) => !selected.some((chosen) => chosen.id === item.id) && predicate(item));
    if (match) selected.push(match);
  };

  if (hasSelectedLines) take((item) => item.kind === "经典爻辞");
  take((item) => item.kind === "经典卦辞" && item.title.includes("本卦"));
  if (!hasSelectedLines) take((item) => item.kind === "大象" && item.title.includes("本卦"));
  take((item) => item.kind === "本卦释义");
  take((item) => item.kind === "取用规则");
  take((item) => item.kind === "问题框架");
  for (const item of sorted) {
    if (selected.length >= limit) break;
    if (!selected.some((chosen) => chosen.id === item.id)) selected.push(item);
  }
  return selected.slice(0, limit);
}

export function searchClassicKnowledge(query: string, limit = 8) {
  const matches = classicHexagrams.flatMap((classic) => {
    const entries = [
      { id:`ZY-H${classic.number}-J`, title:`「${classic.name}」卦辞`, kind:"经典卦辞" as const, excerpt:classic.judgement },
      { id:`ZY-H${classic.number}-I`, title:`「${classic.name}」大象`, kind:"大象" as const, excerpt:classic.image },
      ...classic.lineTexts.map((excerpt, index) => ({ id:`ZY-H${classic.number}-L${index + 1}`, title:`「${classic.name}」第 ${index + 1} 爻`, kind:"经典爻辞" as const, excerpt })),
    ];
    return entries.map((entry) => ({ ...entry, number:classic.number, sourceUrl:classic.sourceUrl, score:semanticScore(query, `${classic.name}${entry.title}${entry.excerpt}`) }));
  }).filter((entry) => entry.score > 0);
  return matches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, Math.max(1, Math.min(limit, 20)));
}

export function retrieveOracleEvidence(lines: LineValue[], question: string, category: string, limit = 6): OracleEvidence[] {
  const structured = buildStructuredReading(lines, question, category);
  const hexagram = getHexagram(lines);
  const transformed = getHexagram(changedLines(lines));
  const mutualKnowledge = getHexagramKnowledge(structured.mutual);
  const transformedKnowledge = getHexagramKnowledge(transformed);
  const movingCount = structured.lineReadings.filter((line) => line.moving).length;
  const selectedCategory = categoryOf(category);
  const categoryEntry = categoryKnowledge[selectedCategory];
  const classic = classicByNumber.get(hexagram.number);
  const candidates: OracleEvidence[] = [];

  addClassicHexagram(candidates, classic, question, "本卦", 108);
  if (structured.mutual.number !== hexagram.number) addClassicHexagram(candidates, classicByNumber.get(structured.mutual.number), question, "互卦", 54);
  if (movingCount > 0 && transformed.number !== hexagram.number) addClassicHexagram(candidates, classicByNumber.get(transformed.number), question, "之卦", 72);

  for (const line of structured.selectedLines) {
    const text = classic?.lineTexts[line.index];
    const image = classic?.lineImages[line.index];
    if (classic && text) candidates.push(classicEvidence({
      id:`ZY-H${hexagram.number}-L${line.index + 1}`,
      title:`《周易》「${hexagram.name}」${line.label}爻辞`,
      kind:"经典爻辞",
      excerpt:image ? `${text} 小象：${image}` : text,
      structureScore:118,
      question,
      rankReason:`取用爻第 ${line.index + 1} 爻精确匹配`,
    }, classic));
  }

  candidates.push(modernEvidence({
    id:`GX-H${hexagram.number}`,
    title:`第 ${hexagram.number} 卦「${hexagram.name}」现代释义`,
    kind:"本卦释义",
    excerpt:`${structured.knowledge.judgement} ${structured.knowledge.image} 当前阶段：${structured.knowledge.stage}。重点：${structured.knowledge.focus}。行动：${structured.knowledge.action}。风险：${structured.knowledge.risk}。`,
    structureScore:104,
    question,
    rankReason:"本卦现代解释精确匹配",
  }));
  candidates.push(modernEvidence({ id:`GX-R${movingCount}`, title:`${movingCount} 处动爻取用规则`, kind:"取用规则", excerpt:structured.selectionRule, structureScore:92, question, rankReason:"动爻数量规则精确匹配" }));
  candidates.push(modernEvidence({ id:`GX-C-${selectedCategory}`, title:categoryEntry.title, kind:"问题框架", excerpt:categoryEntry.excerpt, structureScore:78, question, terms:categoryEntry.terms, rankReason:`${selectedCategory}主题精确匹配` }));
  candidates.push(modernEvidence({ id:`GX-M${structured.mutual.number}`, title:`互卦「${structured.mutual.name}」内部机制`, kind:"互卦释义", excerpt:`${mutualKnowledge.judgement} 内部重点在${mutualKnowledge.focus}，需要留意${mutualKnowledge.risk}。`, structureScore:64, question, rankReason:"互卦结构匹配" }));

  for (const line of structured.selectedLines) candidates.push(modernEvidence({
    id:`GX-H${hexagram.number}-L${line.index + 1}`,
    title:`「${hexagram.name}」${line.label} · ${line.role}`,
    kind:"爻位解释",
    excerpt:`${line.modern} ${line.action}`,
    structureScore:98,
    question,
    rankReason:`取用爻第 ${line.index + 1} 爻现代解释匹配`,
  }));

  if (movingCount > 0) candidates.push(modernEvidence({ id:`GX-T${transformed.number}`, title:`之卦「${transformed.name}」变化方向`, kind:"之卦释义", excerpt:`${transformedKnowledge.judgement} 变化后更需要关注${transformedKnowledge.focus}；行动上宜${transformedKnowledge.action}。`, structureScore:84, question, rankReason:"之卦结构匹配" }));

  return diversityRerank(candidates, Math.max(4, Math.min(limit, 8)), structured.selectedLines.length > 0);
}

export function publicEvidence(evidenceItems: OracleEvidence[]) {
  return evidenceItems.map(({ id, title, kind, excerpt, sourceType, sourceTitle, sourceVersion, sourceUrl, license, reviewed }) => ({ id, title, kind, excerpt, sourceType, sourceTitle, sourceVersion, sourceUrl, license, reviewed }));
}
