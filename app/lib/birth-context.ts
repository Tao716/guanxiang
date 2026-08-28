import { Solar } from "lunar-typescript";

export type ReadingTopic = "财运" | "事业" | "感情" | "学业" | "家庭" | "个人成长";
export type TopicContext = { situation: string; focus: string; horizon: string };
export type BirthContext = {
  constellation: string;
  zodiac: string;
  pillars: string[];
  dayMaster: string;
  dayElement: "木" | "火" | "土" | "金" | "水";
  timePrecision: "准确时辰" | "未知时辰";
  reflection: string;
};

export const readingTopics: Array<{ id: ReadingTopic; mark: string; title: string; copy: string; category: "事业" | "关系" | "选择" | "成长" }> = [
  { id:"财运", mark:"财", title:"财运与资源", copy:"收入、支出、副业与机会判断", category:"选择" },
  { id:"事业", mark:"业", title:"事业与方向", copy:"工作、转型、合作与长期发展", category:"事业" },
  { id:"感情", mark:"缘", title:"感情与关系", copy:"相处、沟通、边界与关系选择", category:"关系" },
  { id:"学业", mark:"学", title:"学业与考试", copy:"学习路径、状态与能力积累", category:"成长" },
  { id:"家庭", mark:"家", title:"家庭与生活", copy:"家人、责任、居住与生活安排", category:"关系" },
  { id:"个人成长", mark:"心", title:"自我与成长", copy:"情绪、习惯、内耗与人生阶段", category:"成长" },
];

export const topicQuestions: Record<ReadingTopic, string[]> = {
  财运:["接下来三个月，我该怎样改善自己的现金流？","面对这个副业机会，我最应该先验证什么？"],
  事业:["这次职业变化，我最该看清什么？","如何突破当前的工作瓶颈？"],
  感情:["这段关系中，我忽略了什么？","如何改善我们现在的沟通？"],
  学业:["当前学习阶段，我最该调整什么？","怎样安排下一阶段，才能更稳定地进步？"],
  家庭:["这件家庭事务中，我该承担什么、放下什么？","如何让家人之间的沟通更顺畅？"],
  个人成长:["当下最值得我修炼的能力是什么？","我该如何走出反复内耗？"],
};

export const topicFollowUps: Record<ReadingTopic, { situationLabel: string; situations: string[]; focusLabel: string; focuses: string[] }> = {
  财运:{ situationLabel:"你目前更接近哪种状态？", situations:["想增加收入","现金流紧张","副业探索","面对新机会"], focusLabel:"这次最想看清什么？", focuses:["收入结构","支出管理","副业选择","资源合作"] },
  事业:{ situationLabel:"你目前处于哪个阶段？", situations:["在职发展","正在求职","转型探索","创业起步"], focusLabel:"这次最想解决什么？", focuses:["方向选择","晋升突破","团队关系","能力积累"] },
  感情:{ situationLabel:"这段关系处于什么状态？", situations:["单身探索","暧昧阶段","稳定交往","关系调整"], focusLabel:"这次最想看清什么？", focuses:["沟通方式","关系边界","是否推进","修复信任"] },
  学业:{ situationLabel:"你目前处于哪个阶段？", situations:["日常学习","重要考试","升学选择","职业进修"], focusLabel:"最大的关注点是什么？", focuses:["学习方法","时间安排","状态恢复","方向选择"] },
  家庭:{ situationLabel:"这次主要涉及什么？", situations:["亲子沟通","伴侣分工","父母关系","居住安排"], focusLabel:"最想改善哪一部分？", focuses:["沟通方式","责任边界","家庭选择","情绪修复"] },
  个人成长:{ situationLabel:"你目前更接近哪种状态？", situations:["稳定积累","转折阶段","低能量期","目标迷茫"], focusLabel:"最想改善哪一部分？", focuses:["情绪管理","习惯建立","自信恢复","行动方向"] },
};

export const topicHorizons = ["一个月", "三个月", "半年", "不设期限"];

export function buildTopicQuestions(topic: ReadingTopic, context?: TopicContext) {
  if (!context?.situation || !context.focus || !context.horizon) return topicQuestions[topic];
  const horizon = context.horizon === "不设期限" ? "接下来" : `未来${context.horizon}`;
  const templates: Record<ReadingTopic, string[]> = {
    财运:[`${horizon}，围绕${context.focus}，我最应该先看清什么？`,`我正处于“${context.situation}”，下一步最值得验证的资源是什么？`,`面对${context.focus}，我该减少哪种消耗并先做什么？`],
    事业:[`${horizon}，我的${context.focus}最可能卡在哪里？`,`处于“${context.situation}”阶段，我应该优先积累什么？`,`围绕${context.focus}，接下来七天最值得验证哪一步？`],
    感情:[`在“${context.situation}”阶段，我最该看清哪种关系信号？`,`${horizon}，我该如何改善${context.focus}？`,`面对${context.focus}，我应该表达什么、保留什么边界？`],
    学业:[`${horizon}，围绕${context.focus}，我最该调整什么？`,`处于“${context.situation}”阶段，当前最大的学习阻力是什么？`,`为了改善${context.focus}，接下来七天我该先验证什么方法？`],
    家庭:[`面对${context.situation}，我应该承担什么、放下什么？`,`${horizon}，如何改善家庭中的${context.focus}？`,`这件家庭事务里，我最需要建立哪条清楚边界？`],
    个人成长:[`处于“${context.situation}”阶段，我最需要看清什么？`,`${horizon}，我该如何改善${context.focus}？`,`围绕${context.focus}，哪一个小行动最值得坚持七天？`],
  };
  return templates[topic];
}

export function isTopicContext(value: unknown): value is TopicContext {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<TopicContext>;
  return typeof item.situation === "string" && item.situation.length > 0 && item.situation.length <= 20
    && typeof item.focus === "string" && item.focus.length > 0 && item.focus.length <= 20
    && typeof item.horizon === "string" && topicHorizons.includes(item.horizon);
}

const stemElement: Record<string, BirthContext["dayElement"]> = { 甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水" };
const reflectionByElement: Record<BirthContext["dayElement"], string> = {
  木:"把成长愿望变成可持续的路径，留意方向明确后是否仍有现实支撑。",
  火:"把热情转化为稳定行动，留意表达强度与真实承载力是否一致。",
  土:"在责任与边界之间建立秩序，避免为了稳定而承担过量负担。",
  金:"用清楚标准减少犹豫，同时为关系与变化保留必要弹性。",
  水:"先理解信息与情绪的流向，再决定何时推进、何时蓄力。",
};

function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const now = new Date();
  if (year < 1901 || year > now.getFullYear() || month < 1 || month > 12) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60);
}

export function categoryForTopic(topic: ReadingTopic) {
  return readingTopics.find((item) => item.id === topic)?.category ?? "选择";
}

export function calculateBirthContext(birthDate: string, birthTime: string | null): BirthContext | null {
  if (!validDate(birthDate) || (birthTime !== null && !validTime(birthTime))) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = (birthTime ?? "12:00").split(":").map(Number);
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const eight = lunar.getEightChar();
  const pillars = [eight.getYear(), eight.getMonth(), eight.getDay(), birthTime === null ? "时辰未知" : eight.getTime()];
  const dayMaster = eight.getDay().slice(0, 1);
  const dayElement = stemElement[dayMaster] ?? "土";
  const xingZuo = solar.getXingZuo();
  return {
    constellation:xingZuo.endsWith("座") ? xingZuo : `${xingZuo}座`,
    zodiac:lunar.getYearShengXiao(),
    pillars,
    dayMaster,
    dayElement,
    timePrecision:birthTime === null ? "未知时辰" : "准确时辰",
    reflection:reflectionByElement[dayElement],
  };
}

export function isBirthContext(value: unknown): value is BirthContext {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BirthContext>;
  return typeof item.constellation === "string" && typeof item.zodiac === "string"
    && Array.isArray(item.pillars) && item.pillars.length === 4 && item.pillars.every((pillar) => typeof pillar === "string")
    && typeof item.dayMaster === "string" && (item.dayElement === "木" || item.dayElement === "火" || item.dayElement === "土" || item.dayElement === "金" || item.dayElement === "水")
    && (item.timePrecision === "准确时辰" || item.timePrecision === "未知时辰") && typeof item.reflection === "string";
}
