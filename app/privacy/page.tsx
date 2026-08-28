import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title:"隐私政策｜观象", description:"观象如何收集、使用、保存和删除你的信息。" };

export default function PrivacyPage() {
  return <main className="legal-shell"><header className="legal-nav"><Link href="/" className="legal-brand"><span>✦</span><b>观象</b></Link><nav><Link href="/terms">用户协议</Link><Link href="/membership">会员方案</Link><Link href="/">返回首页 ↗</Link></nav></header><article className="legal-document">
    <div className="legal-heading"><small>PRIVACY POLICY · 2026.08.27</small><h1>隐私政策</h1><p>我们只收集提供服务所必需的信息，并为你提供访问、更正与删除入口。</p></div>
    <section><h2>一、我们是谁</h2><p>“观象”是一项传统文化数字体验服务，用确定性程序生成卦象结构，并可选用第三方大模型生成反思性解读。联系邮箱：<a href="mailto:2972881811@qq.com">2972881811@qq.com</a>。</p></section>
    <section><h2>二、我们处理哪些信息</h2><p>你可以自愿提供昵称、当前主题、处境选项、出生日期与时间。原始出生日期和时间仅在设备端用于生成星座、生肖、四柱和日主标签，不写入卦笺，也不会直接发送给大模型；生成后的文化背景标签可保存在浏览器及匿名云端。</p><p>你填写的问题、投掷结果、基础解读、AI 解读、行动与复盘会保存在浏览器；在云端功能可用时，也会通过随机匿名标识同步到数据库。服务还会记录必要的接口用量、模型状态、响应耗时和反馈，但不记录模型密钥。</p></section>
    <section><h2>三、信息如何使用</h2><ul><li>完成卦象计算、知识检索、AI 深度解读和连续追问；</li><li>同步卦笺、恢复使用进度、计算免费或会员额度；</li><li>发现接口故障、评估回答质量并防止滥用；</li><li>处理订单、开通或管理会员权益。</li></ul></section>
    <section><h2>四、第三方处理</h2><p>当你进入结果页并使用 AI 功能时，本次问题、匿名化后的文化背景标签、卦象结构、检索证据和少量近期卦笺会发送给已配置的大模型服务商。请勿填写姓名、电话、身份证号、精确住址、账户密码等敏感信息。支付开启后，付款信息由支付服务商处理，观象只保存订单状态、会员方案和支付平台返回的标识，不保存银行卡完整信息。</p></section>
    <section><h2>五、保存期限与安全</h2><p>匿名卦笺保留至你主动删除或服务停止；接口用量与质量日志原则上保留不超过 180 天，依法必须留存的订单记录除外。我们使用 HTTPS、HttpOnly Cookie、同源校验、请求限流和最小权限原则保护数据，但互联网服务无法承诺绝对安全。</p></section>
    <section><h2>六、你的权利</h2><p>你可以在“我的卦笺”中清空卦笺，或使用“删除全部个人数据”同时删除匿名云端资料和本地资料。删除后无法恢复。若支付订单因法律或财务义务不能立即删除，我们会仅按法定期限保留必要记录。你也可以通过联系邮箱请求查询、更正或申诉。</p></section>
    <section><h2>七、未成年人</h2><p>本产品不面向未满 14 周岁的儿童提供个性化 AI 解读或付费服务。监护人发现儿童误提交信息时，请联系我们删除。</p></section>
    <section><h2>八、变更与生效</h2><p>重大变更会在产品内明显提示。本政策自 2026 年 8 月 27 日起生效。继续使用更新后的服务前，请阅读变更内容。</p></section>
  </article></main>;
}
