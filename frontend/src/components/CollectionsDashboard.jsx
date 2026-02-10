import React, { useState, useEffect, useCallback } from 'react';
import {
  Send, ChevronRight, BarChart3, TrendingUp, Users, MapPin,
  ChevronLeft, Sparkles, Loader2, ChevronsRight,
} from 'lucide-react';
import Logo from './Logo';
import PortfolioOverview from './PortfolioOverview';
import RegionalBreakdown from './RegionalBreakdown';
import QueryResult from './QueryResult';
import { queryBackend } from '../api/client';

export default function CollectionsDashboard() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'dark';
  });

  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('chat-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [animateCards, setAnimateCards] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [showRegionFilter, setShowRegionFilter] = useState(false);

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('chat-history', JSON.stringify(chatHistory.slice(0, 50)));
  }, [chatHistory]);

  useEffect(() => {
    setAnimateCards(true);
  }, []);

  useEffect(() => {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  const getThemeClass = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  const isDark = getThemeClass() === 'dark';

  const runQuery = useCallback(async (text) => {
    const chatId = Date.now();
    const newChat = {
      id: chatId,
      type: 'question',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      loading: true,
      result: null,
    };

    setChatHistory((prev) => [newChat, ...prev]);
    setActiveChat(chatId);
    setIsQuerying(true);
    setShowRegionFilter(false);

    try {
      const result = await queryBackend(text);
      setChatHistory((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, loading: false, result } : c))
      );
    } catch (err) {
      setChatHistory((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                loading: false,
                result: { success: false, error: err.message, row_count: 0, columns: [], data: [], chart: null },
              }
            : c
        )
      );
    } finally {
      setIsQuerying(false);
    }
  }, []);

  const handleAskQuestion = () => {
    if (question.trim() && !isQuerying) {
      setShowRegionFilter(false);
      runQuery(question.trim());
      setQuestion('');
    }
  };

  const handleQuickInsight = (title) => {
    if (isQuerying) return;

    if (title === 'Collection by State') {
      setShowRegionFilter(true);
      return;
    }

    runQuery(title);
  };

  const handleRegionSelect = (region) => {
    setShowRegionFilter(false);
    runQuery(`State wise collection in ${region} region`);
  };

  const handleChatClick = (chatId) => {
    setActiveChat(chatId);
  };

  const activeResult = chatHistory.find((c) => c.id === activeChat);

  const quickInsightButtons = [
    { title: 'Conversion by Region', icon: MapPin, gradient: 'from-emerald-500 to-cyan-500' },
    { title: 'Conversion by Bucket', icon: BarChart3, gradient: 'from-blue-500 to-violet-500' },
    { title: 'Collection by State', icon: MapPin, gradient: 'from-violet-500 to-purple-500' },
    { title: 'Top 5 Agents', icon: Users, gradient: 'from-yellow-400 to-orange-500' },
    { title: 'Lowest Performing POS Bands', icon: TrendingUp, gradient: 'from-emerald-400 to-teal-500' },
  ];

  const regions = [
    { name: 'North', gradient: 'from-blue-500 to-cyan-500' },
    { name: 'South', gradient: 'from-emerald-500 to-teal-500' },
    { name: 'East', gradient: 'from-yellow-400 to-orange-500' },
    { name: 'West', gradient: 'from-violet-500 to-purple-500' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans text-slate-100 transition-colors duration-300">
      {/* Animated Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-gradient-to-tl from-emerald-500/10 to-transparent blur-3xl" />
        <div className="absolute right-0 top-1/2 h-96 w-96 rounded-full bg-gradient-to-l from-cyan-500/10 to-transparent blur-3xl" />
      </div>

      {/* Sidebar */}
      <div
        className={`relative flex flex-col border-r border-slate-700/50 bg-gradient-to-b from-slate-900/80 to-slate-950/80 backdrop-blur-xl transition-all duration-300 ${
          sidebarOpen ? 'w-80' : 'w-20'
        }`}
      >
        {/* Logo Section */}
        <div className="border-b border-slate-700/50 p-6">
          <button
            onClick={() => setActiveChat(null)}
            className="group mb-4 w-full cursor-pointer transition-all hover:opacity-80"
          >
            <div className="flex justify-center">
              <Logo isDark={isDark} size={sidebarOpen ? 'lg' : 'sm'} />
            </div>
          </button>

          {/* Collections Whisperer Section */}
          {sidebarOpen && (
            <div className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 via-purple-600/10 to-cyan-600/10 p-4 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-cyan-500/5" />
              <div className="relative">
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-400" />
                  <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-cyan-300 bg-clip-text text-sm font-bold text-transparent">
                    Collections Whisperer
                  </span>
                </div>
                <p className="text-xs text-slate-400">AI-Powered Analytics</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat History */}
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {sidebarOpen && (
            <div className="mb-2 flex items-center gap-2 px-3 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              <BarChart3 size={14} />
              <span>Chat History</span>
            </div>
          )}

          <div className="max-h-96 space-y-1 overflow-y-auto">
            {chatHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {sidebarOpen && 'No chats yet'}
              </div>
            ) : (
              chatHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleChatClick(chat.id)}
                  className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-all ${
                    activeChat === chat.id
                      ? 'border border-violet-500/50 bg-gradient-to-r from-violet-600/30 to-cyan-600/30 text-slate-100'
                      : 'text-slate-400 hover:bg-slate-800/50'
                  }`}
                  title={chat.text}
                >
                  <div className="flex items-start gap-2">
                    {chat.loading ? (
                      <Loader2 size={14} className="mt-0.5 flex-shrink-0 animate-spin text-violet-400" />
                    ) : (
                      <BarChart3 size={14} className="mt-0.5 flex-shrink-0 text-violet-400" />
                    )}
                    {sidebarOpen && (
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-slate-300">{chat.text}</p>
                        <p className="mt-1 text-xs text-slate-600">{chat.timestamp}</p>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Collapse/Expand Button - Bottom */}
        <div className="border-t border-slate-700/50 p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-400 transition-all hover:bg-slate-800/50 hover:text-slate-200"
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft size={16} />
                <span>Collapse</span>
              </>
            ) : (
              <ChevronsRight size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="border-b border-slate-700/50 bg-gradient-to-b from-slate-900/50 to-slate-950/30 px-8 py-12 backdrop-blur-lg">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <div className="mb-4 inline-block">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  <Sparkles size={14} />
                  <span>AI-Powered Intelligence</span>
                </div>
              </div>
              <h2 className="mb-4 bg-gradient-to-r from-violet-200 via-cyan-200 to-emerald-200 bg-clip-text text-5xl font-bold leading-tight text-transparent">
                Collections Insights
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-slate-400">
                Ask natural language questions about your collection performance, trends, and metrics.
              </p>
            </div>

            {/* Question Input */}
            <div className="group relative mx-auto mb-6 max-w-2xl">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600/20 to-cyan-600/20 blur-lg transition-all group-hover:blur-xl" />
              <div className="relative flex items-center gap-2 rounded-full border border-slate-600/50 bg-slate-900/60 px-6 py-4 backdrop-blur-xl transition-colors group-hover:border-slate-500/70">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    if (showRegionFilter) setShowRegionFilter(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                  placeholder="What would you like to know about your collections?"
                  className="flex-1 bg-transparent text-base text-slate-100 placeholder-slate-500 focus:outline-none"
                  disabled={isQuerying}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={isQuerying || !question.trim()}
                  className="flex-shrink-0 transform rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 p-3 text-white shadow-lg transition-all hover:scale-110 hover:from-violet-500 hover:to-cyan-500 hover:shadow-violet-500/50 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isQuerying ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mx-auto max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Quick Actions
              </p>
              <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
                {quickInsightButtons.map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickInsight(btn.title)}
                    disabled={isQuerying}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className={`group relative flex-shrink-0 transform overflow-hidden rounded-full px-4 py-2.5 text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${
                      animateCards ? 'animate-in fade-in slide-in-from-bottom-2' : ''
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${btn.gradient} opacity-80 transition-opacity group-hover:opacity-100`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
                    <div className="relative z-10 flex items-center gap-2 text-white">
                      <span>{btn.title}</span>
                      <ChevronRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Region Filter Buttons */}
              {showRegionFilter && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-sm text-slate-400">Select region:</span>
                  {regions.map((region) => (
                    <button
                      key={region.name}
                      onClick={() => handleRegionSelect(region.name)}
                      className={`relative overflow-hidden rounded-full px-5 py-2 text-sm font-medium transition-all hover:scale-105`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${region.gradient} opacity-80`} />
                      <span className="relative z-10 text-white">{region.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowRegionFilter(false)}
                    className="rounded-full border border-slate-600/50 px-4 py-2 text-sm text-slate-400 transition-all hover:bg-slate-800/50 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-8 py-12">
          <div className="mx-auto max-w-6xl space-y-16">
            {activeResult ? (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-300">
                  {activeResult.text}
                </h3>
                <QueryResult
                  result={activeResult.result}
                  loading={activeResult.loading}
                />
              </div>
            ) : (
              <>
                <PortfolioOverview />
                <RegionalBreakdown />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
