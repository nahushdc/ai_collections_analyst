import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send, ChevronRight, BarChart3, TrendingUp, Users, MapPin,
  ChevronLeft, Sparkles, Loader2, ChevronsRight, Search, Star,
  Zap, PieChart, Table2, LineChart, ArrowUpRight, Database,
  MessageSquare, Brain, Shield, Menu,
} from 'lucide-react';
import Logo from './Logo';
import PortfolioOverview from './PortfolioOverview';
import RegionalBreakdown from './RegionalBreakdown';
import BucketBreakdown from './BucketBreakdown';
import QueryResult from './QueryResult';
import StateCollectionView from './StateCollectionView';
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
    if (!saved) return [];
    // Clear any stuck loading states from previous sessions
    const chats = JSON.parse(saved);
    return chats.map((c) =>
      c.loading
        ? { ...c, loading: false, result: { success: false, error: 'Query interrupted — please try again.', row_count: 0, columns: [], data: [], chart: null } }
        : c
    );
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [activeChat, setActiveChat] = useState(null);
  const [animateCards, setAnimateCards] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showLaunchScreen, setShowLaunchScreen] = useState(() => {
    const hasLaunched = localStorage.getItem('has-launched');
    return !hasLaunched;
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('chat-history', JSON.stringify(chatHistory.slice(0, 50)));
  }, [chatHistory]);

  useEffect(() => {
    setAnimateCards(true);
  }, []);

  // Press Ctrl+Shift+R to reset and show launch screen
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        localStorage.removeItem('has-launched');
        window.location.reload();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
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
      queryText: text, // Preserve original query for intent detection
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      loading: true,
      result: null,
      favorite: false,
    };

    setChatHistory((prev) => [newChat, ...prev]);
    setActiveChat(chatId);
    setIsQuerying(true);

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
      runQuery(question.trim());
      setQuestion('');
    }
  };

  const handleQuickInsight = (title) => {
    if (isQuerying) return;
    runQuery(title);
  };

  const handleChatClick = (chatId) => {
    setActiveChat(chatId);
  };

  const toggleFavorite = (chatId) => {
    setChatHistory((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, favorite: !c.favorite } : c))
    );
  };

  const filteredAndSortedChats = chatHistory
    .filter((chat) =>
      chat.text.toLowerCase().includes(chatSearchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort favorites to the top
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return 0; // Maintain original order for same favorite status
    });

  const activeResult = chatHistory.find((c) => c.id === activeChat);

  const quickInsightButtons = [
    { title: 'Conversion by Region', icon: MapPin, color: '#08CA97' },
    { title: 'Conversion by Bucket', icon: BarChart3, color: '#675AF9' },
    { title: 'Collection by State & UT', icon: MapPin, color: '#675AF9' },
    { title: 'Top 5 Agents', icon: Users, color: '#FFCA54' },
    { title: 'Lowest Performing POS Bands', icon: TrendingUp, color: '#08CA97' },
  ];

  const handleLaunch = () => {
    setShowLaunchScreen(false);
    localStorage.setItem('has-launched', 'true');
  };

  /* ── Launch Screen Demo Scenes ── */
  const demoScenes = [
    {
      query: 'Efficiency by DPD bucket',
      icon: BarChart3,
      type: 'bar',
      badge: 'Bar Chart',
      badgeColor: 'from-violet-500 to-purple-600',
      kpis: [
        { label: 'Total Cases', value: '43,879', color: '#675AF9' },
        { label: 'Collection Rate', value: '6.21%', color: '#08CA97' },
        { label: 'AUM', value: '98.2 Cr', color: '#0DCAF0' },
      ],
      bars: [
        { label: 'Pre-due', h: 85, color: '#675AF9' },
        { label: '0-30', h: 68, color: '#08CA97' },
        { label: '30-60', h: 48, color: '#FFCA54' },
        { label: '60-90', h: 30, color: '#0DCAF0' },
        { label: '90+', h: 14, color: '#FB923C' },
      ],
    },
    {
      query: 'PTP conversion rate by channel',
      icon: PieChart,
      type: 'donut',
      badge: 'Donut Chart',
      badgeColor: 'from-emerald-500 to-teal-600',
      kpis: [
        { label: 'Total PTPs', value: '12,453', color: '#08CA97' },
        { label: 'Converted', value: '4,217', color: '#675AF9' },
        { label: 'Conversion', value: '33.9%', color: '#FFCA54' },
      ],
      segments: [
        { label: 'IVR', pct: 38, color: '#675AF9' },
        { label: 'WhatsApp', pct: 27, color: '#08CA97' },
        { label: 'Call', pct: 22, color: '#0DCAF0' },
        { label: 'Tara', pct: 13, color: '#FFCA54' },
      ],
    },
    {
      query: 'Top 5 agents by collection amount',
      icon: Users,
      type: 'table',
      badge: 'Data Table',
      badgeColor: 'from-cyan-500 to-blue-600',
      kpis: [
        { label: 'Active Agents', value: '248', color: '#0DCAF0' },
        { label: 'Avg Collection', value: '3.8L', color: '#08CA97' },
        { label: 'Top Agent', value: '18.2L', color: '#675AF9' },
      ],
      rows: [
        { rank: '1', name: 'Priya Sharma', amt: '18.2L', cases: '342', rate: '14.2%' },
        { rank: '2', name: 'Rahul Verma', amt: '15.7L', cases: '298', rate: '12.8%' },
        { rank: '3', name: 'Anita Singh', amt: '14.1L', cases: '267', rate: '11.5%' },
        { rank: '4', name: 'Kiran Patel', amt: '12.8L', cases: '231', rate: '10.9%' },
        { rank: '5', name: 'Dev Kumar', amt: '11.4L', cases: '214', rate: '9.7%' },
      ],
    },
    {
      query: 'Monthly collection trend last 6 months',
      icon: LineChart,
      type: 'line',
      badge: 'Trend Line',
      badgeColor: 'from-orange-500 to-pink-600',
      kpis: [
        { label: 'This Month', value: '14.2 Cr', color: '#FB923C' },
        { label: 'Growth', value: '+22.4%', color: '#08CA97' },
        { label: 'Best Month', value: '14.2 Cr', color: '#675AF9' },
      ],
      points: [
        { month: 'Aug', y: 35 },
        { month: 'Sep', y: 42 },
        { month: 'Oct', y: 38 },
        { month: 'Nov', y: 55 },
        { month: 'Dec', y: 48 },
        { month: 'Jan', y: 72 },
      ],
    },
  ];

  const [activeScene, setActiveScene] = useState(0);
  const [sceneKey, setSceneKey] = useState(0);
  const sceneTimerRef = useRef(null);

  useEffect(() => {
    if (!showLaunchScreen) return;
    sceneTimerRef.current = setInterval(() => {
      setActiveScene(prev => {
        const next = (prev + 1) % demoScenes.length;
        setSceneKey(k => k + 1);
        return next;
      });
    }, 5000);
    return () => clearInterval(sceneTimerRef.current);
  }, [showLaunchScreen]);

  const renderSceneViz = (scene) => {
    if (scene.type === 'bar') {
      return (
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
          <div className="flex h-[110px] items-end justify-around gap-2">
            {scene.bars.map((bar, i) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative w-full overflow-hidden rounded-t-md" style={{ height: '100px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-md"
                    style={{
                      height: `${bar.h}%`,
                      backgroundColor: bar.color,
                      animation: `grow-bar-v 0.8s ease-out ${0.3 + i * 0.1}s both`,
                      boxShadow: `0 0 16px ${bar.color}40`,
                    }}
                  />
                </div>
                <span className="text-[9px] font-medium text-slate-500">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (scene.type === 'donut') {
      const total = scene.segments.reduce((s, seg) => s + seg.pct, 0);
      let cumOffset = 0;
      return (
        <div className="flex items-center justify-center gap-6 rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
          <svg width="120" height="120" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.91549431" fill="transparent" stroke="#1e293b" strokeWidth="4" />
            {scene.segments.map((seg, i) => {
              const dash = (seg.pct / total) * 100;
              const offset = 25 - cumOffset;
              cumOffset += dash;
              return (
                <circle
                  key={seg.label}
                  cx="21" cy="21" r="15.91549431" fill="transparent"
                  stroke={seg.color} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={offset}
                  style={{ animation: `fade-slide-up 0.5s ease-out ${0.3 + i * 0.15}s both` }}
                />
              );
            })}
          </svg>
          <div className="flex flex-col gap-2">
            {scene.segments.map((seg, i) => (
              <div key={seg.label} className="flex items-center gap-2" style={{ animation: `fade-slide-up 0.3s ease-out ${0.5 + i * 0.1}s both` }}>
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                <span className="text-[10px] text-slate-400">{seg.label}</span>
                <span className="ml-auto text-[10px] font-bold text-slate-300">{seg.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (scene.type === 'table') {
      return (
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 overflow-hidden">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-700/40 bg-slate-800/40">
                <th className="px-2.5 py-1.5 text-left font-semibold text-slate-400">#</th>
                <th className="px-2.5 py-1.5 text-left font-semibold text-slate-400">Agent</th>
                <th className="px-2.5 py-1.5 text-right font-semibold text-slate-400">Amount</th>
                <th className="px-2.5 py-1.5 text-right font-semibold text-slate-400">Cases</th>
                <th className="px-2.5 py-1.5 text-right font-semibold text-slate-400">Rate</th>
              </tr>
            </thead>
            <tbody>
              {scene.rows.map((row, i) => (
                <tr key={row.rank} className="border-b border-slate-700/15" style={{ animation: `fade-slide-up 0.3s ease-out ${0.4 + i * 0.08}s both` }}>
                  <td className="px-2.5 py-1.5 font-bold text-violet-400">{row.rank}</td>
                  <td className="px-2.5 py-1.5 font-medium text-slate-300">{row.name}</td>
                  <td className="px-2.5 py-1.5 text-right font-semibold text-emerald-400">{row.amt}</td>
                  <td className="px-2.5 py-1.5 text-right text-slate-400">{row.cases}</td>
                  <td className="px-2.5 py-1.5 text-right text-cyan-400">{row.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (scene.type === 'line') {
      const maxY = Math.max(...scene.points.map(p => p.y));
      const pts = scene.points.map((p, i) => {
        const x = 10 + (i / (scene.points.length - 1)) * 230;
        const y = 110 - (p.y / maxY) * 90;
        return `${x},${y}`;
      }).join(' ');
      return (
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 p-4">
          <svg viewBox="0 0 250 130" className="w-full h-[110px]">
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#675AF9" />
                <stop offset="100%" stopColor="#08CA97" />
              </linearGradient>
              <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#675AF9" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#675AF9" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 1, 2, 3].map(i => (
              <line key={i} x1="10" x2="240" y1={20 + i * 30} y2={20 + i * 30} stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
            ))}
            {/* Area fill */}
            <polygon
              points={`10,115 ${pts} 240,115`}
              fill="url(#areaGrad)"
              style={{ animation: 'fade-slide-up 0.8s ease-out 0.3s both' }}
            />
            {/* Line */}
            <polyline
              points={pts}
              fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="300" strokeDashoffset="300"
              style={{ animation: 'draw-line 1.5s ease-out 0.3s forwards' }}
            />
            {/* Data points */}
            {scene.points.map((p, i) => {
              const x = 10 + (i / (scene.points.length - 1)) * 230;
              const y = 110 - (p.y / maxY) * 90;
              return (
                <g key={p.month} style={{ animation: `count-up 0.3s ease-out ${0.8 + i * 0.12}s both` }}>
                  <circle cx={x} cy={y} r="4" fill="#675AF9" stroke="#1e1b4b" strokeWidth="2" />
                  <text x={x} y="127" textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="sans-serif">{p.month}</text>
                </g>
              );
            })}
          </svg>
        </div>
      );
    }
    return null;
  };

  if (showLaunchScreen) {
    const scene = demoScenes[activeScene];
    const SceneIcon = scene.icon;
    return (
      <div className="flex h-screen flex-col overflow-hidden font-sans text-slate-100 lg:flex-row" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(103,90,249,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(8,202,151,0.06) 0%, transparent 50%), linear-gradient(135deg, #020617, #0f172a, #020617)' }}>
        {/* Aurora Mesh Background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {/* Aurora blobs — large, soft, morphing */}
          <div className="absolute -top-1/4 -left-1/4 h-[700px] w-[700px] rounded-full opacity-[0.15]" style={{ background: 'radial-gradient(circle, #675AF9 0%, transparent 70%)', filter: 'blur(100px)', animation: 'aurora-1 15s ease-in-out infinite' }} />
          <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full opacity-[0.12]" style={{ background: 'radial-gradient(circle, #08CA97 0%, transparent 70%)', filter: 'blur(100px)', animation: 'aurora-2 18s ease-in-out infinite' }} />
          <div className="absolute top-1/3 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, #0DCAF0 0%, transparent 70%)', filter: 'blur(120px)', animation: 'aurora-3 20s ease-in-out infinite' }} />
          <div className="absolute bottom-1/4 left-1/4 h-[400px] w-[400px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #FFCA54 0%, transparent 70%)', filter: 'blur(100px)', animation: 'aurora-1 22s ease-in-out infinite 5s' }} />
          {/* Subtle noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }} />
          {/* Mesh grid — slow drift */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px', animation: 'mesh-drift 20s ease-in-out infinite' }} />
        </div>

        {/* LEFT: Branding + CTA */}
        <div className="relative z-10 flex w-full flex-col items-center justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:w-[45%] lg:py-0">
          {/* Logo with glow */}
          <div style={{ animation: 'fade-slide-up 0.8s ease-out forwards' }}>
            <div style={{ animation: 'text-glow 3s ease-in-out infinite' }}>
              <Logo isDark={true} size="xl" />
            </div>
          </div>

          {/* Tagline */}
          <div className="mt-6 mb-4 lg:mt-8 lg:mb-6" style={{ animation: 'fade-slide-up 0.8s ease-out 0.2s both' }}>
            <p className="text-center text-lg font-light leading-relaxed tracking-wide text-slate-300 lg:text-xl">
              Ask anything about your
              <span className="font-semibold text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #675AF9, #08CA97)', backgroundSize: '200% 200%', animation: 'gradient-shift 3s ease infinite' }}> portfolio's performance</span>
            </p>
            <p className="mt-2 text-center text-sm text-slate-500">
              Instant answers on collection efficiency, effort, and costs — powered by AI.
            </p>
          </div>

          {/* Capability pills */}
          <div className="mb-6 flex flex-wrap justify-center gap-2 lg:mb-8" style={{ animation: 'fade-slide-up 0.8s ease-out 0.35s both' }}>
            {[
              { icon: BarChart3, text: 'Collection Efficiency' },
              { icon: Users, text: 'Effort & Connectivity' },
              { icon: PieChart, text: 'Cost Breakdown' },
              { icon: MapPin, text: 'Regional View' },
              { icon: LineChart, text: 'Trends' },
            ].map((cap, i) => (
              <div
                key={cap.text}
                className="flex items-center gap-1.5 rounded-full border border-slate-700/40 bg-slate-800/40 px-3 py-1.5 text-[11px] font-medium text-slate-400 backdrop-blur-sm"
                style={{ animation: `badge-pop 0.4s ease-out ${0.5 + i * 0.08}s both` }}
              >
                <cap.icon size={12} className="text-violet-400/70" />
                {cap.text}
              </div>
            ))}
          </div>

          {/* Launch Button */}
          <div style={{ animation: 'fade-slide-up 0.8s ease-out 0.5s both' }}>
            <button
              onClick={handleLaunch}
              className="group relative overflow-hidden rounded-2xl px-10 py-4 text-base font-bold text-white transition-all hover:scale-105 active:scale-95 sm:px-16 sm:py-5 sm:text-lg"
              style={{ animation: 'glow-pulse 2.5s ease-in-out infinite' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 transition-all group-hover:from-violet-500 group-hover:via-purple-500 group-hover:to-cyan-500" />
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="relative z-10 flex items-center gap-3">
                <Zap size={20} className="transition-transform group-hover:rotate-12" />
                Explore Your Portfolio
                <ArrowUpRight size={20} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>
          </div>

        </div>

        {/* RIGHT: Cycling Demo Showcase */}
        <div className="relative z-10 hidden w-full items-center justify-center p-4 sm:p-6 lg:flex lg:w-[55%] lg:p-8">
          <div className="w-full max-w-xl" style={{ animation: 'fade-slide-up 1s ease-out 0.3s both' }}>
            {/* Scene indicator dots */}
            <div className="mb-4 flex items-center justify-center gap-2">
              {demoScenes.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveScene(i); setSceneKey(k => k + 1); clearInterval(sceneTimerRef.current); sceneTimerRef.current = setInterval(() => setActiveScene(prev => { const next = (prev + 1) % demoScenes.length; setSceneKey(k => k + 1); return next; }), 5000); }}
                  className={`h-2 rounded-full transition-all duration-500 ${i === activeScene ? 'w-8 bg-violet-500' : 'w-2 bg-slate-600 hover:bg-slate-500'}`}
                />
              ))}
            </div>

            {/* Mock App Window */}
            <div
              key={sceneKey}
              className="rounded-2xl border border-slate-700/40 bg-slate-900/70 shadow-2xl shadow-violet-900/10 backdrop-blur-xl overflow-hidden"
              style={{ animation: 'scene-enter 0.6s ease-out both' }}
            >
              {/* Window Chrome */}
              <div className="flex items-center gap-2 border-b border-slate-700/30 bg-slate-800/50 px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                <span className="ml-3 text-[10px] font-medium text-slate-500">DPD GPT</span>
                <div className="ml-auto" style={{ animation: 'badge-pop 0.4s ease-out 0.2s both' }}>
                  <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${scene.badgeColor} px-2 py-0.5 text-[9px] font-bold text-white shadow-lg`}>
                    <SceneIcon size={9} />
                    {scene.badge}
                  </span>
                </div>
              </div>

              <div className="p-5">
                {/* Typing Query */}
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-violet-500/20 bg-slate-800/50 px-4 py-3" style={{ boxShadow: '0 0 20px rgba(103,90,249,0.08)' }}>
                  <Sparkles size={14} className="flex-shrink-0 text-violet-400" style={{ animation: 'float 2s ease-in-out infinite' }} />
                  <div className="overflow-hidden">
                    <span
                      className="inline-block whitespace-nowrap text-sm text-slate-300"
                      style={{
                        borderRight: '2px solid #a78bfa',
                        animationName: 'typewriter, blink-caret',
                        animationDuration: '1.5s, 0.7s',
                        animationTimingFunction: `steps(${scene.query.length}), step-end`,
                        animationDelay: '0.2s, 0.2s',
                        animationIterationCount: '1, 6',
                        animationFillMode: 'both, none',
                      }}
                    >
                      {scene.query}
                    </span>
                  </div>
                  <Send size={14} className="ml-auto flex-shrink-0 text-violet-400/60" />
                </div>

                {/* KPI Cards */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {scene.kpis.map((kpi, i) => (
                    <div
                      key={kpi.label}
                      className="rounded-lg border border-slate-700/25 bg-slate-800/30 p-2.5 text-center"
                      style={{ animation: `fade-slide-up 0.4s ease-out ${1.5 + i * 0.12}s both` }}
                    >
                      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{kpi.label}</p>
                      <p className="mt-0.5 text-sm font-bold" style={{ color: kpi.color, animation: `count-up 0.4s ease-out ${1.8 + i * 0.12}s both` }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>

                {/* Scene Visualization */}
                <div style={{ animation: `fade-slide-up 0.5s ease-out 1.8s both` }}>
                  {renderSceneViz(scene)}
                </div>

                {/* Processing indicator */}
                <div className="mt-3 flex items-center gap-2" style={{ animation: `fade-slide-up 0.3s ease-out 0.8s both` }}>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500" style={{ animation: 'grow-bar 1.2s ease-out 0.8s both' }} />
                  </div>
                  <span className="text-[9px] font-medium text-emerald-400/80" style={{ animation: `count-up 0.3s ease-out 2s both` }}>1.2s</span>
                </div>
              </div>
            </div>

            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: ['#675AF9', '#08CA97', '#0DCAF0', '#FFCA54', '#675AF9', '#08CA97'][i],
                  opacity: 0.4,
                  left: `${10 + i * 18}%`,
                  top: `${20 + (i % 3) * 30}%`,
                  animation: `particle-rise 3s ease-in-out ${i * 0.5}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex flex-col items-center justify-between gap-2 border-t border-slate-800/50 bg-slate-950/80 px-4 py-3 backdrop-blur-xl sm:flex-row sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-slate-600">
            <span className="flex items-center gap-1"><Shield size={12} /> Enterprise-grade security</span>
            <span className="hidden text-slate-700 sm:inline">|</span>
            <span className="flex items-center gap-1"><Database size={12} /> Real-time data processing</span>
            <span className="hidden text-slate-700 sm:inline">|</span>
            <span className="flex items-center gap-1"><Brain size={12} /> AI-powered insights</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans text-slate-100 transition-colors duration-300">
      {/* Animated Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-gradient-to-tl from-emerald-500/10 to-transparent blur-3xl" />
        <div className="absolute right-0 top-1/2 h-96 w-96 rounded-full bg-gradient-to-l from-cyan-500/10 to-transparent blur-3xl" />
      </div>

      {/* Sidebar overlay backdrop for mobile/tablet */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-700/50 bg-gradient-to-b from-slate-900/80 to-slate-950/80 backdrop-blur-xl transition-all duration-300 lg:relative lg:z-auto ${
          sidebarOpen ? 'w-72 sm:w-80' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'
        }`}
      >
        {/* Logo Section */}
        <div className="border-b border-slate-700/50 p-4 pb-6 sm:p-6 sm:pb-8">
          {/* Close button for tablet/mobile overlay */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="mb-3 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-800/50 hover:text-slate-300 lg:hidden"
          >
            <ChevronLeft size={14} />
            Close
          </button>
          <button
            onClick={() => setActiveChat(null)}
            className="group mb-6 w-full cursor-pointer transition-all hover:opacity-80"
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
                <p className="text-xs text-slate-400">AI-Powered Collection Analytics</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat History */}
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {sidebarOpen && (
            <>
              <div className="mb-2 flex items-center gap-2 px-3 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <BarChart3 size={14} />
                <span>Chat History</span>
              </div>

              {/* Search Chats */}
              <div className="mb-3 px-1">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Search chats..."
                    className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 py-2 pl-9 pr-3 text-xs text-slate-300 placeholder-slate-500 transition-colors focus:border-slate-600/70 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  />
                </div>
              </div>
            </>
          )}

          <div className="max-h-96 space-y-1 overflow-y-auto">
            {filteredAndSortedChats.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {sidebarOpen && (chatSearchQuery ? 'No chats found' : 'No chats yet')}
              </div>
            ) : (
              filteredAndSortedChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative w-full truncate rounded-lg transition-all ${
                    activeChat === chat.id
                      ? 'border border-violet-500/50 bg-gradient-to-r from-violet-600/30 to-cyan-600/30'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <button
                    onClick={() => handleChatClick(chat.id)}
                    className="w-full px-3 py-2 text-left text-sm"
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

                  {/* Favorite Button */}
                  {sidebarOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(chat.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-all hover:bg-slate-700/50"
                      title={chat.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        size={14}
                        className={`transition-all ${
                          chat.favorite
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-600 group-hover:text-slate-500'
                        }`}
                      />
                    </button>
                  )}
                </div>
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
        {!activeResult && (
        <div className="border-b border-slate-700/50 bg-gradient-to-b from-slate-900/50 to-slate-950/30 px-4 py-8 backdrop-blur-lg sm:px-6 md:px-8 md:py-12">
          <div className="mx-auto max-w-5xl">
            {/* Mobile sidebar toggle */}
            <div className="mb-4 lg:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
              >
                <Menu size={18} />
                <span>Chat History</span>
              </button>
            </div>

            <div className="mb-6 text-center md:mb-10">
              <div className="mb-3 inline-block md:mb-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  <Sparkles size={14} />
                  <span>AI-Powered Intelligence</span>
                </div>
              </div>
              <h2 className="mb-3 bg-gradient-to-r from-violet-200 via-cyan-200 to-emerald-200 bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl md:mb-4 md:text-5xl">
                DPD GPT
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-slate-400 sm:text-base md:text-lg">
                Ask natural language questions about your collection performance, trends, and metrics.
              </p>
            </div>

            {/* Question Input */}
            <div className="group relative mx-auto mb-6 max-w-2xl">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600/20 to-cyan-600/20 blur-lg transition-all group-hover:blur-xl md:rounded-full" />
              <div className="relative flex items-center gap-2 rounded-2xl border border-slate-600/50 bg-slate-900/60 px-4 py-3 backdrop-blur-xl transition-colors group-hover:border-slate-500/70 md:rounded-full md:px-6 md:py-4">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                  placeholder="What would you like to know?"
                  className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none sm:text-base"
                  disabled={isQuerying}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={isQuerying || !question.trim()}
                  className="flex-shrink-0 transform rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 p-2.5 text-white shadow-lg transition-all hover:scale-110 hover:from-violet-500 hover:to-cyan-500 hover:shadow-violet-500/50 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 sm:p-3"
                >
                  {isQuerying ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>

            {/* Top Searches */}
            <div className="mx-auto max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Top Searches
              </p>
              <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
                {quickInsightButtons.map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickInsight(btn.title)}
                    disabled={isQuerying}
                    style={{
                      animationDelay: `${idx * 50}ms`,
                    }}
                    className={`group relative flex-shrink-0 transform overflow-hidden rounded-full px-4 py-2.5 text-sm font-medium text-white transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100 ${
                      animateCards ? 'animate-in fade-in slide-in-from-bottom-2' : ''
                    }`}
                  >
                    {/* Vibrant diagonal gradient background */}
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${btn.color}cc, ${btn.color})`
                      }}
                    />
                    {/* Shimmer effect on hover */}
                    <div className="absolute inset-0 -translate-x-full opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    {/* Subtle glow effect */}
                    <div
                      className="absolute inset-0 opacity-0 blur-xl transition-opacity group-hover:opacity-30"
                      style={{
                        backgroundColor: btn.color
                      }}
                    />
                    <div className="relative z-10 flex items-center gap-2">
                      <span>{btn.title}</span>
                      <ChevronRight size={14} className="opacity-30 transition-opacity group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Content Area */}
        <div className="px-4 py-8 sm:px-6 md:px-8 md:py-12">
          <div className="mx-auto max-w-6xl space-y-10 md:space-y-16">
            {activeResult ? (
              <div>
                {/* Check if this is a state collection query */}
                {activeResult.text.toLowerCase().includes('state') ? (
                  <StateCollectionView
                    result={activeResult.result}
                    loading={activeResult.loading}
                    queryText={activeResult.queryText || activeResult.text}
                    onClose={() => setActiveChat(null)}
                  />
                ) : (
                  <>
                    <h3 className="mb-4 text-lg font-semibold text-slate-300">
                      {activeResult.text}
                    </h3>
                    <QueryResult
                      result={activeResult.result}
                      loading={activeResult.loading}
                      queryText={activeResult.queryText || activeResult.text}
                    />
                  </>
                )}
              </div>
            ) : (
              <>
                <PortfolioOverview />
                <RegionalBreakdown />
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <BucketBreakdown />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
