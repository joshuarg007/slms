// src/pages/ChatPage.tsx
import { useEffect, useState, useRef } from "react";
import {
  api,
  type ChatMessage,
  type ChatConversation,
  type AIUsage,
  type Lead,
} from "@/utils/api";
import WMEM from "@/utils/wmem";
import { FriendlyError } from "@/components/FriendlyError";

type ContextType = "general" | "lead_analysis" | "coaching";

export default function ChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [contextType, setContextType] = useState<ContextType>("general");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [wmem, setWmem] = useState<WMEM>(() => WMEM.load());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations and usage on mount
  useEffect(() => {
    loadConversations();
    loadUsage();
    loadLeads();
    // Initialize WMEM if empty
    if (wmem.isEmpty()) {
      const newWmem = WMEM.createDefault();
      setWmem(newWmem);
      newWmem.save();
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    try {
      const data = await api.listChatConversations();
      setConversations(data);
    } catch {
      // ignore
    }
  }

  async function loadUsage() {
    try {
      const data = await api.getAIUsage();
      setUsage(data);
    } catch {
      // ignore
    }
  }

  async function loadLeads() {
    try {
      const data = await api.getLeads({ page_size: 50 });
      setLeads(data.items);
    } catch {
      // ignore
    }
  }

  async function loadConversation(id: number) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getChatConversation(id);
      setActiveConversation(data);
      setMessages(data.messages || []);
      setContextType(data.context_type as ContextType);
      setSelectedLeadId(data.context_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }

  async function startNewConversation() {
    setActiveConversation(null);
    setMessages([]);
    setError(null);
    setContextType("general");
    setSelectedLeadId(null);
    inputRef.current?.focus();
  }

  async function deleteConversation(id: number) {
    try {
      await api.deleteChatConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversation?.id === id) {
        startNewConversation();
      }
    } catch {
      // ignore
    }
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sendingMessage) return;

    // Check quota
    if (usage && usage.messages_remaining === 0 && usage.messages_limit !== -1) {
      setError("You've reached your AI message limit for this month. Please upgrade your plan.");
      return;
    }

    setError(null);
    setSendingMessage(true);

    // Optimistically add user message
    const tempUserMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);
    setInput("");

    try {
      // Get last 2 messages for immediate context (WMEM handles the rest)
      const lastMessages = messages.slice(-2).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.sendChatMessage({
        message: trimmed,
        conversation_id: activeConversation?.id,
        context_type: contextType,
        context_id: contextType === "lead_analysis" ? selectedLeadId ?? undefined : undefined,
        wmem_context: wmem.toString(),
        last_messages: lastMessages,
      });

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: response.message_id,
        role: "assistant",
        content: response.response,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update WMEM from response (or extract from AI response)
      if (response.updated_wmem) {
        const newWmem = new WMEM(response.updated_wmem);
        setWmem(newWmem);
        newWmem.save();
      } else {
        // Try to extract from AI response content
        const extracted = WMEM.extractFromResponse(response.response);
        if (extracted) {
          setWmem(extracted);
          extracted.save();
        }
      }

      // Update conversation ID if new
      if (!activeConversation) {
        setActiveConversation({
          id: response.conversation_id,
          title: trimmed.slice(0, 50),
          context_type: contextType,
          context_id: selectedLeadId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        loadConversations(); // Refresh sidebar
      }

      // Update usage
      loadUsage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setSendingMessage(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const contextOptions: { value: ContextType; label: string; description: string }[] = [
    { value: "general", label: "General", description: "General questions and insights" },
    { value: "lead_analysis", label: "Lead Analysis", description: "Analyze specific leads" },
    { value: "coaching", label: "Sales Coaching", description: "Sales tips and strategies" },
  ];

  // Check if AI is enabled
  if (usage && !usage.ai_enabled) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI Lead Consultant</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Get AI-powered insights on your leads, sales coaching, and data analysis.
            Upgrade to Pro or higher to unlock this feature.
          </p>
          <a
            href="/app/billing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Upgrade Plan
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col`}
      >
        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
              No conversations yet
            </p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    activeConversation?.id === conv.id
                      ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="flex-1 truncate text-sm">{conv.title || "Untitled"}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Stats */}
        {usage && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">AI Messages</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{
                    width: `${
                      usage.messages_limit === -1
                        ? 0
                        : Math.min(100, (usage.messages_used / usage.messages_limit) * 100)
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {usage.messages_limit === -1
                  ? `${usage.messages_used} used`
                  : `${usage.messages_used}/${usage.messages_limit}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Chat Header */}
        <div className="h-14 px-4 flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1 flex items-center gap-4">
            <h1 className="font-semibold text-gray-900 dark:text-white">
              {activeConversation?.title || "AI Lead Consultant"}
            </h1>
          </div>

          {/* Context Selector */}
          <div className="flex items-center gap-2">
            <select
              value={contextType}
              onChange={(e) => setContextType(e.target.value as ContextType)}
              disabled={!!activeConversation}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {contextOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {contextType === "lead_analysis" && !activeConversation && (
              <select
                value={selectedLeadId ?? ""}
                onChange={(e) => setSelectedLeadId(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a lead...</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} ({lead.email})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-gray-500">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI Lead Consultant</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Ask me about your leads, get sales coaching tips, or request insights on your CRM data.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  "Analyze my top leads",
                  "Sales tips for cold outreach",
                  "How to improve conversion?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  </div>
                </div>
              ))}
              {sendingMessage && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl">
                    <div className="flex items-center gap-2 text-gray-500">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2">
            <FriendlyError
              error={error}
              compact
              onRetry={() => setError(null)}
            />
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your leads, get sales tips..."
                rows={1}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                style={{ minHeight: "48px", maxHeight: "200px" }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || sendingMessage}
              className="flex-shrink-0 p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
