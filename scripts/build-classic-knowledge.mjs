import { writeFile } from "node:fs/promises";

const pages = [
  "乾","坤","屯","蒙","需","訟","師","比","小畜","履","泰","否","同人","大有","謙","豫",
  "隨","蠱","臨","觀","噬嗑","賁","剝","復","无妄","大畜","頤","大過","坎","離","咸","恒",
  "遯","大壯","晉","明夷","家人","睽","蹇","解","損","益","夬","姤","萃","升","困","井",
  "革","鼎","震","艮","漸","歸妹","豐","旅","巽","兌","渙","節","中孚","小過","既濟","未濟",
];

const displayNames = [
  "乾","坤","屯","蒙","需","讼","师","比","小畜","履","泰","否","同人","大有","谦","豫",
  "随","蛊","临","观","噬嗑","贲","剥","复","无妄","大畜","颐","大过","坎","离","咸","恒",
  "遁","大壮","晋","明夷","家人","睽","蹇","解","损","益","夬","姤","萃","升","困","井",
  "革","鼎","震","艮","渐","归妹","丰","旅","巽","兑","涣","节","中孚","小过","既济","未济",
];

function clean(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/'''/g, "")
    .replace(/-\{([^{}|]+)\}-/g, "$1")
    .replace(/\{\{\*\|[^}]+\}\}/g, "")
    .replace(/\{\{[^{}]+\}\}/g, "")
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/^\*+#?/, "")
    .trim();
}

function parseWikitext(wikitext, number) {
  const lines = wikitext.split(/\r?\n/);
  const judgementLine = lines.find((line) => /^\*\*<span[^>]*color:blue[^>]*>/.test(line) && !line.includes("易經："));
  const lineTexts = lines
    .filter((line) => /^\*#<span[^>]*color:blue[^>]*>/.test(line))
    .slice(0, 6)
    .map(clean);
  const imageIndex = lines.findIndex((line) => /^\*'''象曰：'''/.test(line));
  const imageBlock = imageIndex >= 0 ? lines.slice(imageIndex + 1) : [];
  const image = clean(imageBlock.find((line) => /^\*\*/.test(line)) ?? "");
  const lineImages = imageBlock.filter((line) => /^\*#/.test(line)).slice(0, 6).map(clean);
  const judgement = clean(judgementLine ?? "").replace(/^[^：]+：/, "");
  if (!judgement || lineTexts.length !== 6 || !image || lineImages.length !== 6) {
    throw new Error(`第 ${number} 卦解析不完整：卦辞=${Boolean(judgement)}，爻辞=${lineTexts.length}，大象=${Boolean(image)}，小象=${lineImages.length}`);
  }
  return { judgement, lineTexts, image, lineImages };
}

async function requestBatch(batch, attempt = 0) {
  const api = new URL("https://zh.wikisource.org/w/api.php");
  api.search = new URLSearchParams({
    action:"query",
    prop:"revisions",
    rvprop:"content",
    rvslots:"main",
    titles:batch.map((page) => `周易/${page}`).join("|"),
    maxlag:"5",
    format:"json",
    formatversion:"2",
  }).toString();
  const response = await fetch(api, { headers:{ "user-agent":"GuanxiangKnowledgeBuilder/1.0 (local product corpus)" } });
  if ((response.status === 429 || response.status === 503) && attempt < 4) {
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    return requestBatch(batch, attempt + 1);
  }
  if (!response.ok) throw new Error(`知识库批量下载失败：${response.status}`);
  return response.json();
}

const records = [];
for (let offset = 0; offset < pages.length; offset += 32) {
  const batch = pages.slice(offset, offset + 32);
  const payload = await requestBatch(batch);
  const byTitle = new Map((payload?.query?.pages ?? []).map((page) => [page.title, page]));
  for (const pageName of batch) {
    const number = pages.indexOf(pageName) + 1;
    const page = byTitle.get(`周易/${pageName}`);
    const wikitext = page?.revisions?.[0]?.slots?.main?.content ?? "";
    records.push({
      number,
      name:displayNames[number - 1],
      sourcePage:pageName,
      sourceUrl:`https://zh.wikisource.org/zh/周易/${encodeURIComponent(pageName)}`,
      ...parseWikitext(wikitext, number),
    });
  }
}

if (records.length !== 64 || records.reduce((sum, item) => sum + item.lineTexts.length, 0) !== 384) {
  throw new Error("经典知识库数量校验失败");
}

const header = `// 此文件由 scripts/build-classic-knowledge.mjs 从维基文库公版《周易》生成。\n// 请勿手工修改；更新知识源后重新运行生成脚本。\n\n`;
const type = `export type ClassicHexagramKnowledge = {\n  number: number;\n  name: string;\n  sourcePage: string;\n  sourceUrl: string;\n  judgement: string;\n  lineTexts: [string, string, string, string, string, string];\n  image: string;\n  lineImages: [string, string, string, string, string, string];\n};\n\n`;
const output = `${header}${type}export const classicHexagrams: ClassicHexagramKnowledge[] = ${JSON.stringify(records, null, 2)} as ClassicHexagramKnowledge[];\n`;
await writeFile(new URL("../app/lib/classic-knowledge.generated.ts", import.meta.url), output, "utf8");
console.log(`已生成 ${records.length} 卦、${records.reduce((sum, item) => sum + item.lineTexts.length, 0)} 条爻辞。`);
