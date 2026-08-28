import { calculateAffinity, normalizeAffinityInput } from "../../lib/affinity";

export async function POST(request: Request) {
  let input = null;
  try { input = normalizeAffinityInput(await request.json()); } catch { return Response.json({ error:"资料无法读取，请检查后重试。" }, { status:400 }); }
  if (!input) return Response.json({ error:"请完整填写两人的称呼、出生日期和时间。" }, { status:400 });
  try { return Response.json({ result:calculateAffinity(input) }); }
  catch { return Response.json({ error:"当前日期暂时无法换算，请检查出生信息。" }, { status:400 }); }
}
