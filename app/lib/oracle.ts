export type LineValue = 6 | 7 | 8 | 9;
export type Trigram = { name: string; nature: string; quality: string };
export type Hexagram = { number: number; name: string; symbol: string; essence: string; upper: Trigram; lower: Trigram };

const trigramByCode: Record<number, Trigram> = {
  7:{ name:"乾", nature:"天", quality:"健行" }, 6:{ name:"兑", nature:"泽", quality:"悦纳" },
  5:{ name:"离", nature:"火", quality:"明辨" }, 4:{ name:"震", nature:"雷", quality:"行动" },
  3:{ name:"巽", nature:"风", quality:"渐入" }, 2:{ name:"坎", nature:"水", quality:"历险" },
  1:{ name:"艮", nature:"山", quality:"止定" }, 0:{ name:"坤", nature:"地", quality:"承载" },
};

// 上卦-下卦：文王六十四卦序。输入始终是六爻，自下而上。
export const hexagramTable: Record<string, [number, string]> = {
  "7-7":[1,"乾"],"7-6":[10,"履"],"7-5":[13,"同人"],"7-4":[25,"无妄"],"7-3":[44,"姤"],"7-2":[6,"讼"],"7-1":[33,"遁"],"7-0":[12,"否"],
  "6-7":[43,"夬"],"6-6":[58,"兑"],"6-5":[49,"革"],"6-4":[17,"随"],"6-3":[28,"大过"],"6-2":[47,"困"],"6-1":[31,"咸"],"6-0":[45,"萃"],
  "5-7":[14,"大有"],"5-6":[38,"睽"],"5-5":[30,"离"],"5-4":[21,"噬嗑"],"5-3":[50,"鼎"],"5-2":[64,"未济"],"5-1":[56,"旅"],"5-0":[35,"晋"],
  "4-7":[34,"大壮"],"4-6":[54,"归妹"],"4-5":[55,"丰"],"4-4":[51,"震"],"4-3":[32,"恒"],"4-2":[40,"解"],"4-1":[62,"小过"],"4-0":[16,"豫"],
  "3-7":[9,"小畜"],"3-6":[61,"中孚"],"3-5":[37,"家人"],"3-4":[42,"益"],"3-3":[57,"巽"],"3-2":[59,"涣"],"3-1":[53,"渐"],"3-0":[20,"观"],
  "2-7":[5,"需"],"2-6":[60,"节"],"2-5":[63,"既济"],"2-4":[3,"屯"],"2-3":[48,"井"],"2-2":[29,"坎"],"2-1":[39,"蹇"],"2-0":[8,"比"],
  "1-7":[26,"大畜"],"1-6":[41,"损"],"1-5":[22,"贲"],"1-4":[27,"颐"],"1-3":[18,"蛊"],"1-2":[4,"蒙"],"1-1":[52,"艮"],"1-0":[23,"剥"],
  "0-7":[11,"泰"],"0-6":[19,"临"],"0-5":[36,"明夷"],"0-4":[24,"复"],"0-3":[46,"升"],"0-2":[7,"师"],"0-1":[15,"谦"],"0-0":[2,"坤"],
};

const hexagramEssences = [
  "健行不息","厚德承载","艰难初生","启蒙求知","守正待时","慎争明辨","统众有纪","亲比相辅",
  "小有积蓄","谨慎履行","上下交泰","闭塞自守","同心同行","丰有共享","谦逊受益","顺势而动",
  "随时守正","整治旧弊","亲临督导","观察省思","明断障碍","文饰有度","剥落守静","复归初心",
  "无妄守真","蓄力养德","慎言节养","大任过重","重险习坎","附丽明辨","相感相应","恒久有常",
  "退避蓄势","强盛守礼","向明而进","晦明自守","内正家齐","求同存异","遇阻反身","舒解宽缓",
  "减损有度","增益利他","果断决裂","不期而遇","聚合共识","柔顺上升","困中守志","资源共享",
  "顺时变革","鼎新立制","震动警醒","知止安定","循序渐进","守位审时","丰盛宜守","羁旅慎行",
  "柔入渐进","悦而相通","涣散重聚","节制立界","诚信感通","小事可为","已成防变","未成慎终",
];

export function isLineValue(value: unknown): value is LineValue {
  return value === 6 || value === 7 || value === 8 || value === 9;
}

function binary(lines: LineValue[]) {
  return lines.map((line) => line === 7 || line === 9 ? 1 : 0);
}

export function getHexagram(lines: LineValue[]): Hexagram {
  const source = lines.length === 6 ? lines : [7,7,7,7,7,7] as LineValue[];
  const bits = binary(source);
  const lowerCode = Number.parseInt(bits.slice(0,3).join(""), 2);
  const upperCode = Number.parseInt(bits.slice(3,6).join(""), 2);
  const [number, name] = hexagramTable[`${upperCode}-${lowerCode}`];
  return { number, name, symbol:String.fromCodePoint(0x4dc0 + number - 1), essence:hexagramEssences[number - 1], upper:trigramByCode[upperCode], lower:trigramByCode[lowerCode] };
}

export function changedLines(lines: LineValue[]) {
  return lines.map((line) => line === 6 ? 7 : line === 9 ? 8 : line) as LineValue[];
}

export function calculateOracle(lines: LineValue[]) {
  const hexagram = getHexagram(lines);
  const transformed = getHexagram(changedLines(lines));
  const movingCount = lines.filter((line) => line === 6 || line === 9).length;
  return { hexagram, transformed, movingCount, movingRule:movingRule(lines, transformed) };
}

export function movingRule(lines: LineValue[], transformed: Hexagram) {
  const positions = lines.map((line, index) => line === 6 || line === 9 ? index : -1).filter((index) => index >= 0);
  const names = ["初爻","二爻","三爻","四爻","五爻","上爻"];
  if (positions.length === 0) return "六爻皆静，以本卦整体卦义为主，观察既有结构。";
  if (positions.length === 1) return `一爻动，以${names[positions[0]]}为主要变化线索。`;
  if (positions.length === 2) return `两爻动，合看${names[positions[0]]}与${names[positions[1]]}，以上位之爻为后势。`;
  if (positions.length === 3) return `三爻动，本卦与之卦并观；先看当下，再看「${transformed.name}」卦所示走向。`;
  if (positions.length === 4) return "四爻动，变化已成主势，重点观察两条静爻仍在守住什么。";
  if (positions.length === 5) return "五爻动，唯一静爻是局面中最值得保留的锚点。";
  return `六爻皆动，旧势尽变，以之卦「${transformed.name}」的整体卦义为主要参考。`;
}
