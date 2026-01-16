import { useParams, Link, Navigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import {
  getArticleBySlug,
  getArticlesByCategory,
  getCategoryBySlug,
  KB_CATEGORIES,
} from "@/data/knowledgeBase";
import ReactMarkdown from "react-markdown";

export default function KBArticlePage() {
  const { category, slug } = useParams<{ category: string; slug: string }>();

  const article = category && slug ? getArticleBySlug(category, slug) : undefined;
  const categoryData = category ? getCategoryBySlug(category) : undefined;
  const relatedArticles = category
    ? getArticlesByCategory(category).filter((a) => a.slug !== slug)
    : [];

  useSEO({
    title: article ? `${article.title} - Help Center` : "Article Not Found",
    description: article?.description || "Help article not found",
    path: `/help/${category}/${slug}`,
  });

  if (!article || !categoryData) {
    return <Navigate to="/help" replace />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Breadcrumb */}
      <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/help"
              className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Help Center
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link
              to={`/help#${category}`}
              className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {categoryData.title}
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium truncate">
              {article.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={categoryData.icon} />
              </svg>
              {categoryData.title}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>{article.timeToRead} read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {article.title}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            {article.description}
          </p>
        </header>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-li:text-gray-600 dark:prose-li:text-gray-400 prose-strong:text-gray-900 dark:prose-strong:text-white prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 dark:prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline prose-table:border-collapse prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-700 prose-th:px-4 prose-th:py-2 prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-700 prose-td:px-4 prose-td:py-2">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>

        {/* Feedback */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Was this article helpful?{" "}
            <Link to="/contact" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Let us know
            </Link>
          </p>
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="bg-gray-50 dark:bg-gray-900 py-12">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Related Articles
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {relatedArticles.slice(0, 4).map((related) => (
                <Link
                  key={related.slug}
                  to={`/help/${related.categorySlug}/${related.slug}`}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {related.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {related.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Categories */}
      <section className="py-12 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Browse All Topics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {KB_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/help#${cat.slug}`}
                className="p-4 text-center bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg
                  className="w-6 h-6 mx-auto text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} />
                </svg>
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                  {cat.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
