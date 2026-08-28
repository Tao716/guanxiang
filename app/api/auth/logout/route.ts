import { clearAuthCookie } from "../../../lib/auth";
export async function POST() { return Response.json({ authenticated:false }, { headers:{ "Cache-Control":"no-store", "Set-Cookie":clearAuthCookie() } }); }
