import type { InsightArticle } from "./articles";

export default function ArticleVisual({ article, large = false }: { article: InsightArticle; large?: boolean }) {
  return <div className={`article-visual visual-${article.visual} ${large ? "large" : ""}`} aria-hidden="true">
    <span className="visual-orbit"><i /><i /><i /></span>
    <b>{article.symbol}</b>
    <small>{article.category}<br />GUANXIANG NOTES</small>
  </div>;
}
