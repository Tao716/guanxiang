"use client";

import { useState } from "react";
import ArticleVisual from "./ArticleVisual";
import { insightArticles, insightCategories } from "./articles";

export default function InsightsIndex() {
  const [category, setCategory] = useState<(typeof insightCategories)[number]>("全部");
  const visible = category === "全部" ? insightArticles : insightArticles.filter((article) => article.category === category);

  return <>
    <div className="insight-filters" role="group" aria-label="文章分类">
      {insightCategories.map((item) => <button key={item} className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
    </div>
    <div className="insight-list" aria-live="polite">
      {visible.map((article, index) => <a className="insight-row" href={`/insights/${article.slug}`} key={article.slug} style={{ "--row-delay":`${index * 55}ms` } as React.CSSProperties}>
        <ArticleVisual article={article} />
        <article>
          <div className="insight-meta"><span>{article.category}</span><small>{article.displayDate} · {article.minutes} 分钟阅读</small></div>
          <h2>{article.title}</h2>
          <p>{article.excerpt}</p>
          <b className="read-more">阅读全文 <i>↗</i></b>
        </article>
      </a>)}
    </div>
  </>;
}
