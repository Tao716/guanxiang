export async function POST() { return Response.json({ error:"当前没有需要管理的付费订阅。", code:"BILLING_NOT_OPEN" }, { status:404 }); }
