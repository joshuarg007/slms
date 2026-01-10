// src/pages/ABTestingPage.tsx
import { useEffect, useState } from "react";
import { api, type ABTestListItem, type ABTest } from "@/utils/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type ViewMode = "list" | "create" | "detail";

export default function ABTestingPage() {
  useDocumentTitle("A/B Testing");

  const [tests, setTests] = useState<ABTestListItem[]>([]);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Create form state
  const [newTestName, setNewTestName] = useState("");
  const [newTestDescription, setNewTestDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadTests() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listABTests();
      setTests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tests");
    } finally {
      setLoading(false);
    }
  }

  async function loadTestDetail(testId: number) {
    setLoading(true);
    try {
      const data = await api.getABTest(testId);
      setSelectedTest(data);
      setViewMode("detail");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load test");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTest(e: React.FormEvent) {
    e.preventDefault();
    if (!newTestName.trim()) return;

    setCreating(true);
    try {
      await api.createABTest({
        name: newTestName.trim(),
        description: newTestDescription.trim() || undefined,
      });
      setNewTestName("");
      setNewTestDescription("");
      setViewMode("list");
      await loadTests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create test");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateStatus(testId: number, status: "running" | "paused" | "completed") {
    try {
      await api.updateABTest(testId, { status });
      if (selectedTest?.id === testId) {
        await loadTestDetail(testId);
      }
      await loadTests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update test");
    }
  }

  async function handleDeleteTest(testId: number) {
    if (!confirm("Are you sure you want to delete this A/B test?")) return;

    try {
      await api.deleteABTest(testId);
      setSelectedTest(null);
      setViewMode("list");
      await loadTests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete test");
    }
  }

  useEffect(() => {
    loadTests();
  }, []);

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    running: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  // List View
  if (viewMode === "list") {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">A/B Testing</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Test different form variations to optimize conversions
            </p>
          </div>
          <button
            onClick={() => setViewMode("create")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Test
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No A/B tests yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
              Create your first A/B test to start optimizing your lead capture forms.
            </p>
            <button
              onClick={() => setViewMode("create")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Create your first test
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Test</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Variants</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Impressions</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Conversions</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rate</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {tests.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => loadTestDetail(test.id)}
                          className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {test.name}
                        </button>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Created {new Date(test.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[test.status]}`}>
                          {test.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{test.variants_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{test.total_impressions.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{test.total_conversions.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{test.conversion_rate}%</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => loadTestDetail(test.id)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Create View
  if (viewMode === "create") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode("list")}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create A/B Test</h1>
        </div>

        <form onSubmit={handleCreateTest} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Name</label>
            <input
              type="text"
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              placeholder="e.g., Header text test"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (optional)</label>
            <textarea
              value={newTestDescription}
              onChange={(e) => setNewTestDescription(e.target.value)}
              placeholder="What are you testing?"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Variants</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Two variants will be created: "Control" and "Variant A" with 50/50 traffic split. You can customize them after creation.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newTestName.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create Test"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Detail View
  if (viewMode === "detail" && selectedTest) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedTest(null);
                setViewMode("list");
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTest.name}</h1>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedTest.status]}`}>
                {selectedTest.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedTest.status === "draft" && (
              <button
                onClick={() => handleUpdateStatus(selectedTest.id, "running")}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                Start Test
              </button>
            )}
            {selectedTest.status === "running" && (
              <button
                onClick={() => handleUpdateStatus(selectedTest.id, "paused")}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700"
              >
                Pause
              </button>
            )}
            {selectedTest.status === "paused" && (
              <>
                <button
                  onClick={() => handleUpdateStatus(selectedTest.id, "running")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                >
                  Resume
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedTest.id, "completed")}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Complete
                </button>
              </>
            )}
            {selectedTest.status !== "running" && (
              <button
                onClick={() => handleDeleteTest(selectedTest.id)}
                className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Impressions</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTest.total_impressions.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Conversions</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTest.total_conversions.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Overall Rate</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{selectedTest.overall_conversion_rate}%</div>
          </div>
        </div>

        {/* Variants */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Variants</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {selectedTest.variants.map((variant) => {
              const isWinner = selectedTest.variants.length > 1 &&
                variant.conversion_rate === Math.max(...selectedTest.variants.map(v => v.conversion_rate)) &&
                variant.impressions >= 100;

              return (
                <div key={variant.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">{variant.name}</span>
                      {variant.is_control && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">Control</span>
                      )}
                      {isWinner && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-xs">Leading</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{variant.weight}% traffic</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Impressions</div>
                      <div className="text-xl font-semibold text-gray-900 dark:text-white">{variant.impressions.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Conversions</div>
                      <div className="text-xl font-semibold text-gray-900 dark:text-white">{variant.conversions.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Conversion Rate</div>
                      <div className={`text-xl font-semibold ${isWinner ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                        {variant.conversion_rate}%
                      </div>
                    </div>
                  </div>

                  {/* Conversion bar */}
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isWinner ? "bg-emerald-500" : "bg-indigo-500"}`}
                      style={{ width: `${Math.min(variant.conversion_rate * 10, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedTest.description && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</div>
            <div className="text-gray-900 dark:text-white">{selectedTest.description}</div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
