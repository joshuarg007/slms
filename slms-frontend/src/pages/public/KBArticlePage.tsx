import { useParams, Link, Navigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import {
  getArticleBySlug,
  getArticlesByCategory,
  getCategoryBySlug,
  KB_CATEGORIES,
} from "@/data/knowledgeBase";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

// Custom components for markdown rendering
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-2">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-gray-600 dark:text-gray-300">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-gray-600 dark:text-gray-300">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  a: ({ href, children }) => (
    <Link
      to={href || "#"}
      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
    >
      {children}
    </Link>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
  code: ({ children, className }) => {
    // Check if it's a code block (has language class) or inline code
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="text-sm">{children}</code>
      );
    }
    return (
      <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-indigo-600 dark:text-indigo-400">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-gray-900 dark:bg-gray-800 text-gray-100 rounded-lg p-4 overflow-x-auto mb-4 text-sm font-mono">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-r-lg">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-8 border-gray-200 dark:border-gray-700" />
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr>{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
      {children}
    </td>
  ),
};

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
              className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Help Center
            </Link>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link
              to={`/help#${category}`}
              className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {categoryData.title}
            </Link>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium truncate">
              {article.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Main Content */}
          <article className="lg:col-span-3">
            {/* Header */}
            <header className="mb-8">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={categoryData.icon} />
                  </svg>
                  {categoryData.title}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {article.timeToRead} read
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                {article.title}
              </h1>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {article.description}
              </p>
            </header>

            {/* Divider */}
            <div className="border-b border-gray-200 dark:border-gray-800 mb-8" />

            {/* Content */}
            <div className="article-content">
              <ReactMarkdown components={markdownComponents}>
                {article.content}
              </ReactMarkdown>
            </div>

            {/* Feedback */}
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 text-center">
                <p className="text-gray-900 dark:text-white font-medium mb-2">
                  Was this article helpful?
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Let us know if you need more help
                </p>
                <div className="flex justify-center gap-3">
                  <Link
                    to="/contact"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Contact Support
                  </Link>
                  <a
                    href="mailto:support@site2crm.io"
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Email Us
                  </a>
                </div>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-8">
              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                    Related Articles
                  </h3>
                  <ul className="space-y-3">
                    {relatedArticles.slice(0, 5).map((related) => (
                      <li key={related.slug}>
                        <Link
                          to={`/help/${related.categorySlug}/${related.slug}`}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block"
                        >
                          {related.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Categories */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                  Browse Topics
                </h3>
                <ul className="space-y-2">
                  {KB_CATEGORIES.map((cat) => (
                    <li key={cat.slug}>
                      <Link
                        to={`/help#${cat.slug}`}
                        className={`flex items-center gap-2 text-sm transition-colors ${
                          cat.slug === category
                            ? "text-indigo-600 dark:text-indigo-400 font-medium"
                            : "text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} />
                        </svg>
                        {cat.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Help CTA */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white">
                <h3 className="font-semibold mb-2">Need more help?</h3>
                <p className="text-sm text-indigo-100 mb-4">
                  Our support team is ready to assist you.
                </p>
                <Link
                  to="/contact"
                  className="inline-block w-full text-center px-4 py-2 bg-white text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Get in Touch
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
