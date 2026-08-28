"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [code, setCode] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!code.trim() || loading) return; setLoading(true); setError(""); try { const response = await fetch("/api/auth/login", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ code }) }); const payload = await response.json() as { error?:unknown }; if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "暂时无法登录。"); router.replace("/"); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "暂时无法登录。"); } finally { setLoading(false); } };
  return <main className="login-shell"><div className="login-atmosphere" aria-hidden="true"><i /><i /><i /></div><section className="login-card"><header><span>✦</span><div><b>观象</b><small>GUANXIANG PRIVATE BETA</small></div></header><div className="login-copy"><small>INVITATION ONLY · 免费内测</small><h1>观象见心，<br /><em>知势而行。</em></h1><p>输入内测邀请码，进入你的私人观照空间。每个邀请码对应独立资料与卦笺。</p></div><form onSubmit={submit}><label htmlFor="invite-code">内测邀请码</label><div><input id="invite-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="例如 GX-XXXX-XXXX" autoComplete="one-time-code" maxLength={40} /><button disabled={!code.trim() || loading}>{loading ? "正在验证…" : "进入观象"}<span>→</span></button></div>{error && <p role="alert">{error}</p>}</form><footer><span>邀请码仅用于身份隔离，不会公开你的资料。</span><div><a href="/privacy">隐私政策</a><a href="/terms">用户协议</a></div></footer></section></main>;
}
