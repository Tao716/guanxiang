import type { Metadata } from "next";
import MembershipClient from "./MembershipClient";

export const metadata: Metadata = { title:"会员方案｜观象", description:"查看观象免费额度与 Plus 会员权益。" };
export default function MembershipPage() { return <MembershipClient />; }
