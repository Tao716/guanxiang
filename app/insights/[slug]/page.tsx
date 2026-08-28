/* eslint-disable @next/next/no-html-link-for-pages -- Cross-route navigation intentionally performs a full reload on Sites. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleVisual from "../ArticleVisual";
import InsightHeader from "../InsightHeader";
import { findInsight, insightArticles } from "../articles";

export function generateStaticParams() {
  return insightArticles.map((article) => ({ slug:article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = findInsight(slug);
  return article ? { title:`${article.title}｜观象洞见`, description:article.excerpt } : { title:"文章未找到｜观象洞见" };
}

export default async function InsightArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = findInsight(slug);
  if (!article) notFound();
  const related = insightArticles.filter((item) => item.slug !== article.slug).slice(0, 2);

  return <main className="insights-shell article-shell">
    <div className="insight-ambient" aria-hidden="true"><i /><i /><i /></div>
    <InsightHeader />
    <article className="article-page">
      <a className="back-insights" href="/insights">← 返回洞见</a>
      <header className="article-head">
        <span>{article.category}</span>
        <h1>{article.title}</h1>
        <p>{article.lead}</p>
        <div><small>{article.displayDate}</small><i /><small>{article.minutes} 分钟阅读</small><i /><small>观象编辑部</small></div>
      </header>
      <ArticleVisual article={article} large />
      <div className="article-body">
        {article.sections.map((section, index) => <section key={section.heading ?? index}>
          {section.heading && <h2>{section.heading}</h2>}
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.quote && <blockquote>{section.quote}</blockquote>}
        </section>)}
        <aside><small>一则提醒</small><p>观象提供传统文化视角下的自我反思，不构成医疗、法律、投资或人生决策建议。重要事项请结合事实与专业意见。</p></aside>
      </div>
    </article>
    <section className="related-insights"><div><small>KEEP READING</small><h2>继续阅读</h2></div>{related.map((item) => <a href={`/insights/${item.slug}`} key={item.slug}><span>{item.category}</span><b>{item.title}</b><i>↗</i></a>)}</section>
    <footer className="insight-footer"><span>观象洞见 · 持续记录如何看清下一步</span><a href="/">去观一问 →</a></footer>
  </main>;
}
