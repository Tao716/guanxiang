export async function POST() { return Response.json({ error:"观象 Plus 正在内测，暂未开放购买。", code:"BILLING_NOT_OPEN" }, { status:503 }); }
