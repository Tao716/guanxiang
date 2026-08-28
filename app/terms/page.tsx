import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title:"用户协议｜观象", description:"观象服务范围、AI 内容边界和会员规则。" };

export default function TermsPage() {
  return <main className="legal-shell"><header className="legal-nav"><Link href="/" className="legal-brand"><span>✦</span><b>观象</b></Link><nav><Link href="/privacy">隐私政策</Link><Link href="/membership">会员方案</Link><Link href="/">返回首页 ↗</Link></nav></header><article className="legal-document">
    <div className="legal-heading"><small>TERMS OF SERVICE · 2026.08.27</small><h1>用户协议</h1><p>请在使用起卦、AI 解读、合缘观照和会员服务前阅读本协议。</p></div>
    <section><h2>一、产品定位</h2><p>观象以《易经》相关传统文化材料为反思框架，帮助用户整理问题和形成行动。卦象由程序规则生成，AI 负责解释，不构成对未来、性格、关系、财富或健康的确定性判断，也不替代医疗、法律、心理、投资等专业服务。</p></section>
    <section><h2>二、使用规则</h2><ul><li>请勿输入他人的敏感信息，或在未获同意时上传、分析他人资料；</li><li>不得利用服务实施违法活动、骚扰、歧视、欺诈或自动化滥用；</li><li>涉及自伤、人身安全或紧急风险时，应立即联系当地紧急服务和可信赖的人；</li><li>你对基于产品内容作出的现实决定负责。</li></ul></section>
    <section><h2>三、AI 生成内容</h2><p>页面中带“AI 生成”标识的内容由第三方大模型生成，可能出现不准确、遗漏、重复或与上下文不完全一致的情况。知识检索与结构化校验可以降低错误，但不能消除错误。请结合事实核验，不要把输出当作唯一依据。</p></section>
    <section><h2>四、免费额度与会员</h2><p>免费额度和会员权益以会员页面实时展示为准。观象 Plus 为自动续费月度方案；支付前会展示价格、周期和渠道。你可通过支付服务商的订阅管理页取消续费，取消后权益持续至当前计费周期结束。除法律规定、重复扣款或服务完全无法提供外，已使用的数字服务通常不支持按剩余天数退款。</p></section>
    <section><h2>五、账号与设备</h2><p>当前匿名体验通过浏览器随机标识识别你的卦笺和额度。清除浏览器数据或更换设备可能导致无法找回。正式开启收款前，观象会启用可找回的账号身份；未完成该能力时，支付按钮保持关闭，不会向你收款。</p></section>
    <section><h2>六、知识产权</h2><p>公版经典原文归公共领域；观象的页面设计、程序、原创现代解释、结构化知识与品牌标识受相关法律保护。你可为个人非商业用途复制自己的卦笺，不得批量抓取、转售或冒充官方内容。</p></section>
    <section><h2>七、服务变更与责任边界</h2><p>我们会尽力保持服务可用，但模型、网络、托管或支付平台可能暂时中断。对于不可抗力、第三方故障或用户不当使用造成的损失，我们在法律允许范围内承担责任。涉及消费者法定权利时，以适用法律为准。</p></section>
    <section><h2>八、联系我们</h2><p>问题、投诉或退款申请可发送至 <a href="mailto:2972881811@qq.com">2972881811@qq.com</a>。本协议自 2026 年 8 月 27 日起生效。</p></section>
  </article></main>;
}
