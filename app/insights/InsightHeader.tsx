/* eslint-disable @next/next/no-html-link-for-pages -- Primary navigation intentionally uses full document navigation so every Sites route resets cleanly. */

export default function InsightHeader() {
  return <header className="insight-nav">
    <a className="insight-brand" href="/" aria-label="返回观象首页"><span>✦</span><b>观象</b><i>洞见</i></a>
    <nav aria-label="主要导航"><a href="/">六爻起卦</a><a href="/palm">掌心观照</a><a href="/affinity">合缘观照</a><a className="active" href="/insights">洞见</a><a href="/#insight">产品理念</a></nav>
    <a className="insight-nav-cta" href="/">去观一问 <span>↗</span></a>
  </header>;
}
