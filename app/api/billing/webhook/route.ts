export async function POST() { return Response.json({ error:"支付尚未开放。" }, { status:404 }); }
