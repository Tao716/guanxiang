/* eslint-disable @next/next/no-html-link-for-pages -- Cross-route navigation intentionally performs a full reload on Sites. */
import type { Metadata } from "next";
import InsightHeader from "./InsightHeader";
import InsightsIndex from "./InsightsIndex";

export const metadata: Metadata = {
  title: "观象洞见｜卦象方法与行动思考",
  description: "关于起卦方法、卦象理解、行动复盘与观象产品思考的文章。",
};

export default function InsightsPage() {
  return <main className="insights-shell">
    <div className="insight-ambient" aria-hidden="true"><i /><i /><i /></div>
    <InsightHeader />
    <section className="insight-hero">
      <div className="insight-kicker"><span /> GUANXIANG JOURNAL <span /></div>
      <h1>洞见</h1>
      <p>卦象方法、行动复盘与产品背后的思考</p>
    </section>
    <section className="insight-content"><InsightsIndex /></section>
    <footer className="insight-footer"><span>观象洞见 · 持续记录如何看清下一步</span><a href="/">返回观象 →</a></footer>
  </main>;
}
