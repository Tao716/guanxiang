import type { Metadata } from "next";
import LoginForm from "./LoginForm";
export const metadata: Metadata = { title:"内测登录｜观象", description:"使用观象内测邀请码进入。" };
export default function LoginPage() { return <LoginForm />; }
