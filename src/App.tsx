import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Code, 
  Layout, 
  ArrowRight, 
  Maximize, 
  Minimize, 
  Trash2, 
  X, 
  HelpCircle, 
  Lightbulb,
  Sun,
  Moon,
  Type,
  RotateCcw,
  Sparkles,
  Zap,
  GitBranch,
  Repeat,
  Image as ImageIcon,
  Check,
  ChevronDown,
  Layers,
  Coins,
  LogIn,
  LogOut,
  AlertCircle,
  Home,
  BookOpen,
  Settings as SettingsIcon,
  FolderOpen,
  History as HistoryIcon,
  ZoomIn,
  ZoomOut,
  Move,
  Download
} from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism.css';

import { syncYdbUser, getYdbUserTokens, decrementYdbUserToken, saveYdbDiagramItem } from './ydbClient';
import { fetchYandexProfileByToken } from './yandexAuth';
import { AuthModal } from './AuthModal';
import { DiagramHistory } from './DiagramHistory';
import { LegalModal, LegalDocType } from './LegalModal';
import { TariffModal } from './TariffModal';
import { TipsModal } from './TipsModal';
import { SchematorLogo } from './SchematorLogo';
import { PresetsModal, CodeTemplate } from './PresetsModal';
import { SettingsModal } from './SettingsModal';

export interface AppUserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
}

const PRESET_TEMPLATES = [
  {
    id: 'if_else',
    type: 'branch',
    title: 'Ветвление (if / else)',
    desc: 'Проверка условия и разветвление логики',
    code: `x = int(input("Введите число: "))\nif x > 0:\n    @print("Число положительное")\nelse:\n    @print("Число неположительное")`,
  },
  {
    id: 'while_loop',
    type: 'loop',
    title: 'Цикл со счетчиком (while)',
    desc: 'Накопление суммы чисел от 1 до N',
    code: `n = int(input("Введите N: "))\nsumma = 0\ni = 1\nwhile i <= n:\n    summa = summa + i\n    i = i + 1\nprint(f"Сумма: {summa}")`,
  },
  {
    id: 'function_def',
    type: 'func',
    title: 'Функция и факториал (def)',
    desc: 'Объявление подпрограммы и ее вызов',
    code: `def factorial(n):\n    res = 1\n    for i in range(1, n + 1):\n        res = res * i\n    return res\n\nnum = int(input("Число: "))\nans = factorial(num)\nprint(f"Факториал: {ans}")`,
  },
];

import { ASTNode, FlowNode, FlowEdge, DEFAULT_CODE, parsePythonSourceWhole, buildGraphs, EdgePolyline, GostShape, getNodeHeight } from './logic';
const DEFAULT_DEMO_CODE = `n = int(input("Введите N: "))
summa = 0
i = 1
while i <= n:
    summa = summa + i
    i = i + 1
print(f"Сумма: {summa}")`;

export default function App() {
  const [code, setCode] = useState(() => {
    return localStorage.getItem('blockcraft_code_persist') || DEFAULT_DEMO_CODE;
  });
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem('blockcraft_theme') as 'light'|'dark') || 'dark');
  const [fontFamily, setFontFamily] = useState<string>(() => localStorage.getItem('blockcraft_font') || 'Inter, sans-serif');

  const [language, setLanguage] = useState(() => localStorage.getItem('blockcraft_language') || 'python');
  const [authError, setAuthError] = useState<string | null>(null);

  const [user, setUser] = useState<AppUserProfile | null>(null);
  const [userTokens, setUserTokens] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<'home' | 'presets' | 'docs' | 'history' | 'settings'>('home');
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const startPanRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDragging = React.useRef(false);

  const [lastGeneratedCode, setLastGeneratedCode] = useState(() => {
     return localStorage.getItem('blockcraft_code_persist') || DEFAULT_DEMO_CODE;
  });
  const [lastGeneratedLanguage, setLastGeneratedLanguage] = useState("python");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previousBackup, setPreviousBackup] = useState<{ code: string; language: 'python' | 'cpp'; title?: string } | null>(null);
  const sessionGeneratedCodesRef = React.useRef<Set<string>>(new Set([DEFAULT_DEMO_CODE.trim()]));
  const [legalModalDoc, setLegalModalDoc] = useState<LegalDocType | null>(null);

  React.useEffect(() => {
    try {
      localStorage.setItem('blockcraft_code_persist', code);
    } catch {}
  }, [code]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };
  
  React.useEffect(() => {
    localStorage.removeItem('blockcraft_code');
    // Check for Yandex OAuth response token in URL hash
    if (window.location.hash && window.location.hash.includes('access_token')) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        // If opened as popup, notify opener
        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'YANDEX_OAUTH_TOKEN', token: accessToken }, '*');
          } catch (e) {
            console.warn('OAuth postMessage error:', e);
          }
        }

        // ALWAYS authenticate and sync user in current window/tab as well!
        fetchYandexProfileByToken(accessToken).then((yUser: any) => {
          setUser(yUser);
          setAuthError(null);
          if (typeof yUser.tokens === 'number') {
            setUserTokens(yUser.tokens);
          }
          localStorage.setItem('blockcraft_yandex_user', JSON.stringify(yUser));
          syncYdbUser(yUser.uid, yUser.email, yUser.displayName).then((syncRes) => {
            if (syncRes?.result?.tokens !== undefined && typeof syncRes.result.tokens === 'number') {
              setUserTokens(syncRes.result.tokens);
              localStorage.setItem('blockcraft_yandex_user', JSON.stringify({ ...yUser, tokens: syncRes.result.tokens }));
            } else {
              getYdbUserTokens(yUser.uid, yUser.email).then((tok) => {
                if (tok !== null && tok !== undefined) {
                  setUserTokens(tok);
                  localStorage.setItem('blockcraft_yandex_user', JSON.stringify({ ...yUser, tokens: tok }));
                }
              });
            }
          });
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

          // If opener exists and is desktop popup, try closing after short delay
          if (window.opener && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            setTimeout(() => {
              try { window.close(); } catch {}
            }, 600);
          }
        }).catch((err) => {
          console.warn('OAuth token parse error:', err);
        });
      }
    }

    // Check for cached user session and sync with Yandex Database (YDB)
    const savedUser = localStorage.getItem('blockcraft_yandex_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        setAuthError(null);
        if (typeof u.tokens === 'number') {
          setUserTokens(u.tokens);
        } else if (u.tokens !== undefined && u.tokens !== null) {
          const parsedTok = Number(u.tokens);
          if (!isNaN(parsedTok)) setUserTokens(parsedTok);
        }
        
        // Sync with YDB Serverless
        syncYdbUser(u.uid, u.email, u.displayName).then((syncRes) => {
          if (syncRes?.result?.tokens !== undefined && typeof syncRes.result.tokens === 'number') {
            setUserTokens(syncRes.result.tokens);
            localStorage.setItem('blockcraft_yandex_user', JSON.stringify({ ...u, tokens: syncRes.result.tokens }));
          } else {
            getYdbUserTokens(u.uid, u.email).then((tok) => {
              if (tok !== null && tok !== undefined) {
                setUserTokens(tok);
                localStorage.setItem('blockcraft_yandex_user', JSON.stringify({ ...u, tokens: tok }));
              }
            });
          }
        }).catch(() => {
          // If sync fails, fallback to direct query
          getYdbUserTokens(u.uid, u.email).then((tok) => {
            if (tok !== null && tok !== undefined) {
              setUserTokens(tok);
              localStorage.setItem('blockcraft_yandex_user', JSON.stringify({ ...u, tokens: tok }));
            }
          });
        });
      } catch (e) {
        console.warn('Error reading saved user session:', e);
      }
    }
  }, []);
  
  const handleLogin = () => {
    setAuthError(null);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = async (authUser: any) => {
    const appUser: AppUserProfile = {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName || authUser.email?.split('@')[0] || 'Пользователь',
      photoURL: authUser.photoURL,
      emailVerified: authUser.emailVerified !== false,
    };
    setUser(appUser);
    if (typeof authUser.tokens === 'number') {
      setUserTokens(authUser.tokens);
    }
    localStorage.setItem('blockcraft_yandex_user', JSON.stringify({ ...appUser, tokens: authUser.tokens }));
    
    // For Yandex OAuth accounts, sync to Yandex Database (YDB Serverless)
    if (authUser.uid?.startsWith('yandex_')) {
      const syncRes = await syncYdbUser(authUser.uid, authUser.email, authUser.displayName);
      if (syncRes?.result?.tokens !== undefined && typeof syncRes.result.tokens === 'number') {
        setUserTokens(syncRes.result.tokens);
        localStorage.setItem('blockcraft_yandex_user', JSON.stringify({ ...appUser, tokens: syncRes.result.tokens }));
      } else {
        const tok = await getYdbUserTokens(authUser.uid, authUser.email);
        if (tok !== null && tok !== undefined) {
          setUserTokens(tok);
          localStorage.setItem('blockcraft_yandex_user', JSON.stringify({ ...appUser, tokens: tok }));
        }
      }
    } else {
      // For local email accounts, get fresh token count from YDB
      const tok = await getYdbUserTokens(authUser.uid, authUser.email);
      if (tok !== null && tok !== undefined) {
        setUserTokens(tok);
        localStorage.setItem('blockcraft_yandex_user', JSON.stringify({ ...appUser, tokens: tok }));
      }
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('blockcraft_yandex_user');
    setUser(null);
    setUserTokens(null);
  };

const [leftWidth, setLeftWidth] = useState(480);
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewMode, setViewMode] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [tabPages, setTabPages] = useState<Record<number, number>>({});
  const activePage = tabPages[activeTab] || 0;
  const setActivePage = (p: number | ((prev: number) => number), overrideTabIdx?: number) => {
      setTabPages(prev => {
          const targetTab = overrideTabIdx !== undefined ? overrideTabIdx : activeTab;
          const prevVal = prev[targetTab] || 0;
          const newVal = typeof p === 'function' ? (p as Function)(prevVal) : p;
          return { ...prev, [targetTab]: newVal };
      });
  };

  const [overrides, setOverrides] = useState<Record<number, any>>(() => {
    try { return JSON.parse(localStorage.getItem('blockcraft_overrides') || '{}'); } catch { return {}; }
  });
  const overridesRef = React.useRef(overrides);
  React.useEffect(() => { 
      overridesRef.current = overrides;
      localStorage.setItem('blockcraft_overrides', JSON.stringify(overrides));
  }, [overrides]);
  
  const [history, setHistory] = useState<Record<number, any>[]>(() => {
    try { return JSON.parse(localStorage.getItem('blockcraft_history') || '[{}]'); } catch { return [{}]; }
  });
  const [historyIndex, setHistoryIndex] = useState(() => {
    const saved = localStorage.getItem('blockcraft_historyIndex');
    return saved ? parseInt(saved, 10) : 0;
  });

  React.useEffect(() => { localStorage.setItem('blockcraft_history', JSON.stringify(history)); }, [history]);
  React.useEffect(() => { localStorage.setItem('blockcraft_historyIndex', historyIndex.toString()); }, [historyIndex]);
  React.useEffect(() => { localStorage.setItem('blockcraft_language', language); }, [language]);
  React.useEffect(() => { localStorage.setItem('blockcraft_theme', theme); }, [theme]);
  React.useEffect(() => { localStorage.setItem('blockcraft_font', fontFamily); }, [fontFamily]);

  const [splitMode, setSplitMode] = useState<'auto' | 'manual'>(() => {
    return (localStorage.getItem('blockcraft_split_mode') as 'auto' | 'manual') || 'auto';
  });
  const [isScissorsMode, setIsScissorsMode] = useState<boolean>(false);
  const [customCuts, setCustomCuts] = useState<Record<number, number[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('blockcraft_custom_cuts') || '{}');
    } catch {
      return {};
    }
  });
  const [hoveredY, setHoveredY] = useState<number | null>(null);

  const pushHistory = (newOverrides: Record<number, any>) => {
      setOverrides(newOverrides);
      setHistory(prev => {
          const next = prev.slice(0, historyIndex + 1);
          next.push(JSON.parse(JSON.stringify(newOverrides)));
          return next;
      });
      setHistoryIndex(prev => prev + 1);
  };

  const [selectedElement, setSelectedElement] = useState<{type: 'node' | 'edge', id: string, segment?: number} | null>(null);

  const handleNodeClick = (node: any) => {
      if (highlightedNodeId === node.id) {
          setHighlightedNodeId(null);
          setHoveredLineIndex(null);
          setSelectedElement(null);
          return;
      }
      
      if (node.id) {
          setHighlightedNodeId(node.id);
      }
      if (node.lineIndex !== undefined && node.lineIndex !== null) {
          setHoveredLineIndex(node.lineIndex);
          
          setTimeout(() => {
              const textarea = document.querySelector('.npm__react-simple-code-editor__textarea') as HTMLTextAreaElement;
              if (textarea) {
                  const lines = code.split('\n');
                  let startChar = 0;
                  for (let i = 0; i < node.lineIndex; i++) {
                      if (lines[i] !== undefined) {
                          startChar += lines[i].length + 1;
                      }
                  }
                  let endChar = startChar + (lines[node.lineIndex]?.length || 0);
                  
                  textarea.focus();
                  textarea.setSelectionRange(startChar, endChar);
                  
                  const scroller = document.getElementById('code-editor-scroller');
                  if (scroller) {
                      const lineHeight = 21.125;
                      const scrollerHeight = scroller.clientHeight;
                      const targetScrollTop = Math.max(0, (node.lineIndex * lineHeight) - (scrollerHeight / 2) + 20);
                      scroller.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                  }
              }
          }, 50);
      }
  };
  const [editingNode, setEditingNode] = useState<{id: string, text: string} | null>(null);
  const [dragState, setDragState] = useState<{id: string, type: 'node' | 'edge', segment?: number, dragEnd?: 'start' | 'end', startX: number, startY: number, startDx: number, startDy: number, moved?: boolean, isVertical?: boolean} | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleGenerateClick();
            return;
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                // Redo
                if (historyIndex < history.length - 1) {
                    setOverrides(history[historyIndex + 1]);
                    setHistoryIndex(historyIndex + 1);
                }
            } else {
                // Undo
                if (historyIndex > 0) {
                    setOverrides(history[historyIndex - 1]);
                    setHistoryIndex(historyIndex - 1);
                }
            }
            return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (editingNode) return;
            if (selectedElement) {
                const next = JSON.parse(JSON.stringify(overridesRef.current));
                if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
                const graphOv = next[activeTab];
                if (selectedElement.type === 'node') {
                    if (!graphOv.nodes) graphOv.nodes = {};
                    if (!graphOv.nodes[selectedElement.id]) graphOv.nodes[selectedElement.id] = {};
                    graphOv.nodes[selectedElement.id].hidden = true;
                } else if (selectedElement.type === 'edge') {
                    if (!graphOv.edges) graphOv.edges = {};
                    if (!graphOv.edges[selectedElement.id]) graphOv.edges[selectedElement.id] = {};
                    graphOv.edges[selectedElement.id].hidden = true;
                }
                pushHistory(next);
                setSelectedElement(null);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, activeTab, editingNode, history, historyIndex, code, lastGeneratedCode, user, userTokens, isGenerating]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setLeftWidth(Math.max(200, Math.min(e.clientX, window.innerWidth - 200)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Dragging nodes inside diagram
  React.useEffect(() => {
    if (!dragState) return;
    const handleMouseMove = (e: MouseEvent) => {
      const effectiveScale = Math.max(0.15, scale);
      const dx = (e.pageX - dragState.startX) / effectiveScale;
      const dy = (e.pageY - dragState.startY) / effectiveScale;
      const next = JSON.parse(JSON.stringify(overridesRef.current));
      if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
      if (!next[activeTab].nodes) next[activeTab].nodes = {};
      if (!next[activeTab].nodes[dragState.id]) next[activeTab].nodes[dragState.id] = {};
      next[activeTab].nodes[dragState.id].dx = dragState.startDx + dx;
      next[activeTab].nodes[dragState.id].dy = dragState.startDy + dy;
      setOverrides(next);
    };
    const handleMouseUp = () => {
      if (dragState) {
        pushHistory(overridesRef.current);
        setDragState(null);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, scale, activeTab]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(3.5, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.15, Number((prev - 0.15).toFixed(2))));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    showToast('Масштаб сброшен на 100%');
  };

  const handleFitToScreen = () => {
    if (!canvasContainerRef.current || !activeGraphPage) return;
    const containerW = canvasContainerRef.current.clientWidth - 80;
    const containerH = canvasContainerRef.current.clientHeight - 80;
    if (containerW <= 0 || containerH <= 0) return;
    const scaleX = containerW / (activeGraphPage.width + 60);
    const scaleY = containerH / (activeGraphPage.height + 60);
    const fitScale = Math.min(1.2, Math.max(0.18, Math.min(scaleX, scaleY)));
    setScale(Number(fitScale.toFixed(2)));
    setPan({ x: 0, y: 0 });
    showToast(`Масштаб оптимизирован: ${Math.round(fitScale * 100)}%`);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (isScissorsMode || editingNode) return;
    const target = e.target as HTMLElement;
    if (target.closest('.cursor-pointer') || target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA') {
      return;
    }
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (editingNode) return;
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    if (editingNode) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setScale(prev => Math.min(3.5, Math.max(0.15, Number((prev * factor).toFixed(2)))));
    } else {
      if (e.shiftKey) {
        setPan(p => ({ ...p, x: p.x - e.deltaY }));
      } else {
        setPan(p => ({ ...p, y: p.y - e.deltaY }));
      }
    }
  };
  
  const graphs = useMemo(() => {
      try {
          const trimmedCode = code?.trim() || '';
          if (!trimmedCode) return [];
          
          // Scheme is displayed if current code matches last generated OR is in session cache
          const isGenerated = trimmedCode === lastGeneratedCode?.trim() || sessionGeneratedCodesRef.current.has(trimmedCode);
          if (!isGenerated) return [];

          return buildGraphs(code, language, overrides, splitMode, customCuts, isScissorsMode);
      } catch (e) {
          console.error('buildGraphs error:', e);
          return [];
      }
  }, [code, lastGeneratedCode, language, overrides, splitMode, customCuts, isScissorsMode]);

  const handleGenerateClick = async () => {
      const trimmedCode = code?.trim() || '';
      if (!trimmedCode) {
          showToast('Введите исходный код для создания блок-схемы');
          return;
      }

      // If already generated for this exact code, do not deduct coins again!
      if (trimmedCode === lastGeneratedCode?.trim() && graphs.length > 0) {
          showToast('Блок-схема для этого кода уже создана');
          return;
      }

      // If code was already generated in this session, restore without deducting coins
      if (sessionGeneratedCodesRef.current.has(trimmedCode)) {
          setLastGeneratedCode(code);
          setLastGeneratedLanguage(language);
          showToast('Блок-схема восстановлена из кэша сессии');
          return;
      }

      if (!user) {
          handleLogin();
          return;
      }
      if (user.emailVerified === false && !user.uid.startsWith('yandex_')) {
          setAuthError('Пожалуйста, подтвердите ваш e-mail для активации 1 бесплатного Coin и создания схем.');
          return;
      }
      if (userTokens === null || userTokens <= 0) {
          setIsTariffModalOpen(true);
          showToast('Недостаточно Coins. Выберите подходящий тариф для пополнения баланса.');
          return;
      }
      setIsGenerating(true);
      try {
          // Decrement token in Yandex Database (YDB)
          const nextCount = await decrementYdbUserToken(user.uid, user.email);
          setUserTokens(nextCount);
          
          sessionGeneratedCodesRef.current.add(trimmedCode);
          setLastGeneratedCode(code);
          setLastGeneratedLanguage(language);

          // Auto-save generated diagram to user's history in YDB
          if (trimmedCode) {
            try {
              const diagId = `diag_${Date.now()}`;
              const now = new Date().toISOString();
              
              // Smart title generation
              let autoTitle = 'Схема Python';
              const lines = code.split('\n').map(l => l.trim()).filter(Boolean);
              for (const line of lines) {
                const pyMatch = line.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
                if (pyMatch) { autoTitle = `Функция ${pyMatch[1]}()`; break; }
              }

              if (user) {
                await saveYdbDiagramItem(user.uid, {
                  id: diagId,
                  title: autoTitle,
                  code: code,
                  language: language,
                  isPinned: false,
                  createdAt: now,
                  updatedAt: now
                });
              } else {
                const saved = JSON.parse(localStorage.getItem('blockcraft_local_history') || '[]');
                saved.unshift({
                  id: diagId,
                  userId: 'anonymous',
                  title: autoTitle,
                  code: code,
                  language: language,
                  isPinned: false,
                  createdAt: now,
                  updatedAt: now
                });
                localStorage.setItem('blockcraft_local_history', JSON.stringify(saved.slice(0, 50)));
              }
            } catch (histErr) {
              console.warn('Auto-save history error:', histErr);
            }
          }
      } catch (e: any) {
          console.error('Error generating:', e);
          setIsTariffModalOpen(true);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSelectDiagramFromHistory = (loadedCode: string, loadedLang: 'python' | 'cpp', diagramTitle?: string) => {
    const trimmedLoaded = loadedCode?.trim() || '';
    const trimmedCurrent = code?.trim() || '';

    // If current code has unsaved work, backup it so user can undo accidental click
    if (trimmedCurrent && trimmedCurrent !== trimmedLoaded) {
      setPreviousBackup({
        code: code,
        language: (language === 'cpp' ? 'cpp' : 'python'),
        title: 'Предыдущий код'
      });
    }

    sessionGeneratedCodesRef.current.add(trimmedLoaded);
    setCode(loadedCode);
    setLanguage(loadedLang);
    localStorage.setItem('blockcraft_language', loadedLang);
    setLastGeneratedCode(loadedCode);
    setLastGeneratedLanguage(loadedLang);
    setActiveTab(0);
    setActivePage(0);
    setHighlightedNodeId(null);
    setHoveredLineIndex(null);
    setSelectedElement(null);
    setEditingNode(null);
  };

  const handleRestorePreviousCode = () => {
    if (!previousBackup) return;
    const { code: prevCode, language: prevLang } = previousBackup;
    const trimmedPrev = prevCode?.trim() || '';
    if (trimmedPrev) {
      sessionGeneratedCodesRef.current.add(trimmedPrev);
    }
    setCode(prevCode);
    setLanguage(prevLang);
    localStorage.setItem('blockcraft_language', prevLang);
    setLastGeneratedCode(prevCode);
    setLastGeneratedLanguage(prevLang);
    setPreviousBackup(null);
    showToast('Предыдущий код и блок-схема успешно возвращены');
  };

  const handleLoadPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    if (code.trim() && code.trim() !== preset.code.trim()) {
      setPreviousBackup({
        code: code,
        language: 'python',
        title: 'Предыдущий код'
      });
    }
    setCode(preset.code);
    sessionGeneratedCodesRef.current.add(preset.code.trim());
    setLastGeneratedCode(preset.code);
    setLastGeneratedLanguage('python');
    setActiveTab(0);
    setActivePage(0);
    showToast(`Загружен шаблон: «${preset.title}»`);
  };


  const findGraphAndNodeByLine = (lineIdx: number) => {
      for (let gIdx = 0; gIdx < graphs.length; gIdx++) {
          const g = graphs[gIdx];
          for (let pIdx = 0; pIdx < g.pages.length; pIdx++) {
              const p = g.pages[pIdx];
              const matchNode = p.nodes.find(n => n.lineIndex === lineIdx);
              if (matchNode) {
                  return { graphIdx: gIdx, pageIdx: pIdx, nodeId: matchNode.id };
              }
          }
      }
      return null;
  };

  React.useEffect(() => {
    if (activeTab >= graphs.length) {
       setActiveTab(Math.max(0, graphs.length - 1));
       setActivePage(0);
    }
  }, [graphs.length, activeTab]);

  const activeGraph = graphs[activeTab] || null;
  const activeGraphPage = activeGraph ? (activeGraph.pages[activePage] || activeGraph.pages[0] || null) : null;

  React.useEffect(() => {
      if (activeGraph && activePage >= activeGraph.pages.length) {
          setActivePage(0);
      }
  }, [activeGraph?.pages?.length, activePage]);

  React.useEffect(() => {
      const textarea = document.querySelector('.npm__react-simple-code-editor__textarea') as HTMLTextAreaElement;
      if (!textarea) return;

      const onSelectionChange = () => {
          if (document.activeElement !== textarea) return;
          const selectionStart = textarea.selectionStart;
          if (selectionStart !== undefined) {
              const textBefore = textarea.value.substring(0, selectionStart);
              const currentLineIdx = textBefore.split('\n').length - 1;
              setHoveredLineIndex(currentLineIdx);
              const res = findGraphAndNodeByLine(currentLineIdx);
              if (res) {
                  setActiveTab(res.graphIdx);
                  setActivePage(res.pageIdx, res.graphIdx);
                  setHighlightedNodeId(res.nodeId);
              }
          }
      };

      textarea.addEventListener('keyup', onSelectionChange);
      textarea.addEventListener('click', onSelectionChange);
      textarea.addEventListener('focus', onSelectionChange);
      textarea.addEventListener('select', onSelectionChange);

      return () => {
          textarea.removeEventListener('keyup', onSelectionChange);
          textarea.removeEventListener('click', onSelectionChange);
          textarea.removeEventListener('focus', onSelectionChange);
          textarea.removeEventListener('select', onSelectionChange);
      };
  }, [code, graphs]);

  const totalWidth = graphs.reduce((sum, g) => sum + (g.pages.length > 0 ? g.pages[0].width : 800) + 40, 0) || 800;
  const maxHeight = Math.max(...graphs.map(g => g.pages.length > 0 ? g.pages[0].height : 800), 800);

const downloadSvg = (svgId: string, title: string) => {
    const svgElement = document.getElementById(svgId) as any as SVGSVGElement | null;
    if (!svgElement) return;
    
    let svgBBox;
    try {
        svgBBox = svgElement.getBBox();
    } catch (e) {
        svgBBox = { x: 0, y: 0, width: 800, height: 800 };
    }
    
    const padding = 80;
    const w = Math.ceil(svgBBox.width + padding * 2);
    const h = Math.ceil(svgBBox.height + padding * 2);
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Inject correct dimensions for proper cropped download
    source = source.replace(/\bwidth="[^"]+"/, '');
    source = source.replace(/\bheight="[^"]+"/, '');
    source = source.replace(/\bviewBox="[^"]+"/, ''); 
    source = source.replace(/^<svg/, `<svg viewBox="${svgBBox.x - padding} ${svgBBox.y - padding} ${w} ${h}" width="${w}" height="${h}" `);
    
    // Make SVG transparent by removing styling classes like bg-white and drop-shadow
    source = source.replace(/\bclass(?:Name)?="[^"]+"/g, '');
    
    // Add white background specifically for SVG download if needed, or leave it transparent
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const a = document.createElement("a");
    a.href = url;
    a.download = title.replace(/\s+/g, '_') + '.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

const downloadPng = (svgId: string, title: string) => {
    const svgElement = document.getElementById(svgId) as any as SVGSVGElement | null;
    if (!svgElement) return;
    
    let svgBBox;
    try {
        svgBBox = svgElement.getBBox();
    } catch (e) {
        svgBBox = { x: 0, y: 0, width: 800, height: 800 };
    }
    
    const padding = 80;
    const w = Math.ceil(svgBBox.width + padding * 2);
    const h = Math.ceil(svgBBox.height + padding * 2);
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Inject correct dimensions for proper cropped download
    source = source.replace(/\bwidth="[^"]+"/, '');
    source = source.replace(/\bheight="[^"]+"/, '');
    source = source.replace(/\bviewBox="[^"]+"/, ''); 
    source = source.replace(/^<svg/, `<svg viewBox="${svgBBox.x - padding} ${svgBBox.y - padding} ${w} ${h}" width="${w}" height="${h}" `);
    
    // Make PNG transparent by removing background classes
    source = source.replace(/\bclass(?:Name)?="[^"]+"/g, '');
    
    const canvas = document.createElement("canvas");
    const scale = 2;
    
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.scale(scale, scale);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        const a = document.createElement("a");
        a.download = `${title}.png`;
        a.href = canvas.toDataURL("image/png", 1.0);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    img.src = url;
}; // end downloadPng

const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

const downloadDrawio = (title: string, fontFamily: string) => {
    if (!activeGraphPage) return;
    
    let fontName = fontFamily.split(',')[0].replace(/['"]/g, '').trim();

    let xml = `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="AIStudio" version="21.6.8" type="device">\n`;
    xml += `  <diagram id="diag-${Math.random().toString(36).substring(2, 9)}" name="Page-1">\n`;
    xml += `    <mxGraphModel dx="1200" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" background="none" math="0" shadow="0">\n`;
    xml += `      <root>\n`;
    xml += `        <mxCell id="0" />\n`;
    xml += `        <mxCell id="1" parent="0" />\n`;

    const getPointsFromSegments = (segments: any[]) => {
        if (!segments || segments.length === 0) return [];
        const pts: {x: number, y: number}[] = [];
        pts.push({ x: segments[0].startX, y: segments[0].startY });
        segments.forEach(seg => {
            const last = pts[pts.length - 1];
            if (Math.abs(last.x - seg.startX) > 0.1 || Math.abs(last.y - seg.startY) > 0.1) {
                pts.push({ x: seg.startX, y: seg.startY });
            }
            pts.push({ x: seg.endX, y: seg.endY });
        });
        return pts;
    };

    const findClosestNode = (pt: {x: number; y: number}) => {
        let closestNode = null;
        let minDist = 999999;
        activeGraphPage.nodes.forEach(node => {
            const width = node.type === 'circle' ? 40 : 220;
            const height = node.type === 'circle' ? 40 : (node.height || getNodeHeight(node.text, node.type));
            const ports = [
                { x: node.x, y: node.y },
                { x: node.x, y: node.y - height / 2 },
                { x: node.x, y: node.y + height / 2 },
                { x: node.x - width / 2, y: node.y },
                { x: node.x + width / 2, y: node.y }
            ];
            ports.forEach(port => {
                const dx = pt.x - port.x;
                const dy = pt.y - port.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closestNode = node;
                }
            });
        });
        return minDist <= 10 ? closestNode : null;
    };

    // 1. Add Nodes
    activeGraphPage.nodes.forEach(node => {
        const width = node.type === 'circle' ? 40 : 220;
        const height = node.type === 'circle' ? 40 : (node.height || getNodeHeight(node.text, node.type));
        const xMin = node.x - width / 2;
        const yMin = node.y - height / 2;

        let style = `rounded=0;whiteSpace=wrap;html=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        if (node.type === 'start' || node.type === 'end') {
            style = `rounded=1;whiteSpace=wrap;html=1;arcSize=50;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;align=center;fontWeight=bold;fontFamily=${fontName};`;
        } else if (node.type === 'circle') {
            style = `ellipse;whiteSpace=wrap;html=1;aspect=fixed;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'io') {
            style = `shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'decision') {
            style = `rhombus;whiteSpace=wrap;html=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'loop_begin') {
            style = `shape=loopLimit;whiteSpace=wrap;html=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'loop_end') {
            style = `shape=loopLimit;whiteSpace=wrap;html=1;rotation=180;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'loop') {
            style = `shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        } else if (node.type === 'subprogram') {
            style = `shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;strokeColor=#18181b;fillColor=#ffffff;strokeWidth=1.5;fontFamily=${fontName};`;
        }

        xml += `        <mxCell id="${node.id}" value="${escapeXml(node.text)}" style="${style}" vertex="1" parent="1">\n`;
        xml += `          <mxGeometry x="${xMin}" y="${yMin}" width="${width}" height="${height}" as="geometry" />\n`;
        xml += `        </mxCell>\n`;
    });

    // 2. Add Edges and Labels
    activeGraphPage.edges.forEach((edge, i) => {
        const edgeId = edge.id || `edge-${i}`;
        const points = getPointsFromSegments(edge.segments || []);
        if (points.length < 2) return;

        const startPt = points[0];
        const endPt = points[points.length - 1];

        const sourceNode = findClosestNode(startPt);
        const targetNode = findClosestNode(endPt);

        let style = `html=1;strokeColor=#18181b;strokeWidth=1.5;fontSize=11;fontFamily=${fontName};rounded=0;`;
        if (edge.noArrow) {
            style += "endArrow=none;";
        } else {
            style += "endArrow=classic;";
        }

        let sourceAttr = "";
        let targetAttr = "";

        if (sourceNode) {
            sourceAttr = ` source="${sourceNode.id}"`;
            const sw = sourceNode.type === 'circle' ? 40 : 220;
            const sh = sourceNode.type === 'circle' ? 40 : (sourceNode.height || getNodeHeight(sourceNode.text, sourceNode.type));
            const dxLeft = Math.abs(startPt.x - (sourceNode.x - sw/2));
            const dxRight = Math.abs(startPt.x - (sourceNode.x + sw/2));
            const dyTop = Math.abs(startPt.y - (sourceNode.y - sh/2));
            const dyBottom = Math.abs(startPt.y - (sourceNode.y + sh/2));
            const minDist = Math.min(dxLeft, dxRight, dyTop, dyBottom);
            if (minDist === dyBottom) {
                style += "exitX=0.5;exitY=1;exitDx=0;exitDy=0;";
            } else if (minDist === dyTop) {
                style += "exitX=0.5;exitY=0;exitDx=0;exitDy=0;";
            } else if (minDist === dxLeft) {
                style += "exitX=0;exitY=0.5;exitDx=0;exitDy=0;";
            } else if (minDist === dxRight) {
                style += "exitX=1;exitY=0.5;exitDx=0;exitDy=0;";
            }
        }

        if (targetNode) {
            targetAttr = ` target="${targetNode.id}"`;
            const tw = targetNode.type === 'circle' ? 40 : 220;
            const th = targetNode.type === 'circle' ? 40 : (targetNode.height || getNodeHeight(targetNode.text, targetNode.type));
            const dxLeft = Math.abs(endPt.x - (targetNode.x - tw/2));
            const dxRight = Math.abs(endPt.x - (targetNode.x + tw/2));
            const dyTop = Math.abs(endPt.y - (targetNode.y - th/2));
            const dyBottom = Math.abs(endPt.y - (targetNode.y + th/2));
            const minDist = Math.min(dxLeft, dxRight, dyTop, dyBottom);
            if (minDist === dyTop) {
                style += "entryX=0.5;entryY=0;entryDx=0;entryDy=0;";
            } else if (minDist === dyBottom) {
                style += "entryX=0.5;entryY=1;entryDx=0;entryDy=0;";
            } else if (minDist === dxLeft) {
                style += "entryX=0;entryY=0.5;entryDx=0;entryDy=0;";
            } else if (minDist === dxRight) {
                style += "entryX=1;entryY=0.5;entryDx=0;entryDy=0;";
            }
        }

        xml += `        <mxCell id="${edgeId}" value="" style="${style}" edge="1" parent="1"${sourceAttr}${targetAttr}>\n`;
        xml += `          <mxGeometry relative="1" as="geometry">\n`;
        if (!sourceNode) {
            xml += `            <mxPoint as="sourcePoint" x="${startPt.x}" y="${startPt.y}" />\n`;
        }
        if (!targetNode) {
            xml += `            <mxPoint as="targetPoint" x="${endPt.x}" y="${endPt.y}" />\n`;
        }
        
        if (points.length > 2) {
            xml += `            <Array as="points">\n`;
            points.slice(1, -1).forEach(pt => {
                xml += `              <mxPoint x="${pt.x}" y="${pt.y}" />\n`;
            });
            xml += `            </Array>\n`;
        }
        
        xml += `          </mxGeometry>\n`;
        xml += `        </mxCell>\n`;

        // If edge carries a label, place it as an absolute transparent borderless vertex cell in draw.io for perfect clean representation
        if (edge.label && edge.labelPos) {
            const labelText = edge.label;
            const lx = edge.labelPos.x - 20;
            const ly = edge.labelPos.y - 12;
            const styleLabel = `text;html=1;align=center;verticalAlign=middle;resizable=0;points=[];autosize=1;strokeColor=none;fillColor=none;fontFamily=${fontName};fontSize=12;fontColor=#18181b;`;
            xml += `        <mxCell id="${edgeId}-label" value="${escapeXml(labelText)}" style="${styleLabel}" vertex="1" parent="1">\n`;
            xml += `          <mxGeometry x="${lx}" y="${ly}" width="40" height="24" as="geometry" />\n`;
            xml += `        </mxCell>\n`;
        }
    });

    xml += `      </root>\n`;
    xml += `    </mxGraphModel>\n`;
    xml += `  </diagram>\n`;
    xml += `</mxfile>\n`;

    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = title.replace(/\s+/g, '_') + '.drawio';
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

  const handleResetCache = () => {
    localStorage.removeItem('blockcraft_overrides');
    localStorage.removeItem('blockcraft_history');
    localStorage.removeItem('blockcraft_historyIndex');
    localStorage.removeItem('blockcraft_custom_cuts');
    setOverrides({});
    setHistory([{}]);
    setHistoryIndex(0);
    setCustomCuts({});
    showToast('Кэш правок и разрезов успешно очищен');
  };

  const isDark = theme === 'dark';

    return (
    <div className={`w-full h-screen ${isDark ? 'dark' : ''}`}>
      <div className={`w-full h-screen flex flex-col font-sans overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-[#080c14] text-slate-100' : 'bg-[#f4f6fa] text-slate-800'
      }`}>
        {!viewMode && (
          <header className={`h-14 border-b flex items-center justify-between px-5 shrink-0 z-30 transition-colors duration-200 ${
            isDark ? 'bg-[#0d131f] border-slate-800/80 text-white' : 'bg-white border-slate-200/90 text-slate-900 shadow-xs'
          }`}>
            {/* Logo and App Title */}
            <div className="flex items-center gap-3">
              <SchematorLogo className="w-7 h-7 rounded-lg shadow-xs select-none shrink-0" />
              <div className="flex items-center gap-2">
                <span className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Схематор
                </span>
                <span className={`hidden md:inline-block text-xs font-normal border-l pl-3 ml-2 ${
                  isDark ? 'text-slate-400 border-slate-700/80' : 'text-slate-500 border-slate-300'
                }`}>
                  Блок-схемы из кода — быстро и просто
                </span>
              </div>
            </div>

            {/* Right Controls in Header */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Theme Toggle */}
              <button
                onClick={() => {
                  const next = isDark ? 'light' : 'dark';
                  setTheme(next);
                  localStorage.setItem('blockcraft_theme', next);
                }}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isDark
                    ? 'bg-[#131b2e] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
                title={isDark ? "Включить светлую тему" : "Включить темную тему"}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Quick Settings Icon */}
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isDark
                    ? 'bg-[#131b2e] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
                title="Настройки интерфейса"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>

              <div className={`w-px h-5 mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

              {/* Auth & Tokens */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                    isDark ? 'bg-[#131b2e] border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>{userTokens !== null ? userTokens : '...'}</span>
                    <button
                      onClick={() => setIsTariffModalOpen(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-0.5 rounded-lg text-[10px] transition cursor-pointer shadow-xs"
                    >
                      Тарифы
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-7 h-7 rounded-full border border-slate-700 object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {user.displayName?.[0] || 'U'}
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-500 hover:text-red-500 hover:bg-slate-100'
                      }`}
                      title="Выйти из аккаунта"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsTariffModalOpen(true)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      isDark
                        ? 'bg-[#131b2e] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    Тарифы
                  </button>
                  <button
                    onClick={handleLogin}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Войти</span>
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        {authError && (
          <div className="bg-amber-600 dark:bg-amber-700 text-white text-xs px-6 py-2 flex items-center justify-between shadow-sm z-30 transition-all animate-in fade-in duration-150 shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
            <button 
              onClick={() => setAuthError(null)}
              className="text-white/80 hover:text-white text-xs ml-4 underline cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="flex-1 flex overflow-hidden p-3 gap-3">
          {/* Left Sidebar */}
          {!viewMode && (
            <aside className={`w-56 shrink-0 rounded-2xl border flex flex-col justify-between p-3 select-none transition-colors duration-200 ${
              isDark ? 'bg-[#0d131f] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              {/* Top Navigation Menu */}
              <div className="flex flex-col gap-1.5">
                {/* Главная */}
                <button
                  onClick={() => setActiveNav('home')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNav === 'home'
                      ? 'bg-blue-600/15 text-blue-500 dark:text-blue-400 border border-blue-500/30'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Главная</span>
                </button>

                {/* Примеры */}
                <button
                  onClick={() => setIsPresetsModalOpen(true)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isDark
                      ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Примеры</span>
                </button>

                {/* Документация */}
                <button
                  onClick={() => setIsTipsModalOpen(true)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isDark
                      ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Документация</span>
                </button>

                {/* История схем */}
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isDark
                      ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <HistoryIcon className="w-4 h-4" />
                  <span>История схем</span>
                </button>

                {/* Настройки */}
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isDark
                      ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  <span>Настройки</span>
                </button>
              </div>

              {/* Bottom Legal Links */}
              <div className="flex flex-col pt-2 border-t border-slate-800/40 dark:border-slate-800/40">
                <div className="flex flex-col gap-1 px-1 text-[11px]">
                  <button
                    onClick={() => setLegalModalDoc('privacy')}
                    className="text-left text-slate-400 hover:text-blue-400 transition cursor-pointer"
                  >
                    Политика конфиденциальности
                  </button>
                  <button
                    onClick={() => setLegalModalDoc('offer')}
                    className="text-left text-slate-400 hover:text-blue-400 transition cursor-pointer"
                  >
                    Публичная оферта
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* Center Card: Code Editor */}
          {!viewMode && (
            <div className={`w-[420px] xl:w-[480px] shrink-0 rounded-2xl border flex flex-col overflow-hidden transition-colors duration-200 ${
              isDark ? 'bg-[#0d131f] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              {/* Card Header */}
              <div className={`p-4 border-b flex items-start gap-3 ${
                isDark ? 'bg-[#0d131f] border-slate-800/80' : 'bg-white border-slate-200'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Code className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={`font-bold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Создание блок-схемы
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Вставьте ваш исходный код слева и нажмите «Создать схему» — мы автоматически построим блок-схему по логике программы.
                  </p>
                </div>
              </div>

              {/* Sub-toolbar */}
              <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
                isDark ? 'bg-[#101726] border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="flex items-center gap-2">
                  <select
                    value={language}
                    onChange={(e) => {
                      const newLang = e.target.value as 'python' | 'cpp';
                      setLanguage(newLang);
                      localStorage.setItem('blockcraft_language', newLang);
                    }}
                    className={`text-xs rounded-lg px-2.5 py-1 border font-medium focus:outline-none cursor-pointer ${
                      isDark ? 'bg-[#131b2e] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                  </select>

                  <button
                    onClick={() => setIsPresetsModalOpen(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      isDark ? 'bg-[#131b2e] border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Layers className="w-3 h-3 text-blue-400" />
                    <span>Шаблоны</span>
                  </button>

                  <button
                    onClick={() => setIsTipsModalOpen(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      isDark ? 'bg-[#131b2e] border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <HelpCircle className="w-3 h-3 text-amber-400" />
                    <span>Справка</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {code.trim() && (
                    <button
                      onClick={() => {
                        setPreviousBackup({
                          code: code,
                          language: language === 'cpp' ? 'cpp' : 'python',
                          title: 'Предыдущий код'
                        });
                        setCode('');
                        showToast('Код очищен (доступно восстановление)');
                      }}
                      className="text-slate-400 hover:text-red-400 p-1 rounded transition cursor-pointer"
                      title="Очистить код"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Code Editor Scroller */}
              <div id="code-editor-scroller" className={`flex-grow overflow-auto relative ${
                isDark ? 'bg-[#080c14]' : 'bg-[#fcfcfd]'
              }`}>
                <div
                  className="w-full min-h-full p-3 flex flex-row items-start cursor-text"
                  onClick={(e) => {
                    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('flex-grow')) {
                      const textarea = document.querySelector('#code-editor-scroller textarea') as HTMLTextAreaElement;
                      if (textarea) {
                        textarea.focus();
                        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                      }
                    }
                  }}
                >
                  <style>{`
                    .npm__react-simple-code-editor__textarea { outline: none !important; white-space: pre !important; }
                    pre { white-space: pre !important; }
                  `}</style>
                  {/* Line numbers */}
                  <div
                    className={`flex select-none font-mono text-[13px] leading-relaxed text-right pr-2 mr-3 flex-col shrink-0 border-r ${
                      isDark ? 'text-slate-600 border-slate-800' : 'text-slate-400 border-slate-200'
                    }`}
                    style={{ minWidth: '2.5rem', lineHeight: '1.625' }}
                  >
                    {code.split('\n').map((_, idx) => {
                      const isHighlighted = hoveredLineIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setHoveredLineIndex(idx);
                            const res = findGraphAndNodeByLine(idx);
                            if (res) {
                              setActiveTab(res.graphIdx);
                              setActivePage(res.pageIdx, res.graphIdx);
                              setHighlightedNodeId(res.nodeId);
                            }
                          }}
                          className={`cursor-pointer px-1 rounded transition-colors ${
                            isHighlighted
                              ? 'bg-yellow-500/30 text-yellow-300 font-bold'
                              : isDark
                              ? 'hover:text-slate-300'
                              : 'hover:text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </div>
                      );
                    })}
                  </div>

                  {/* Prism Editor */}
                  <div className="flex-grow w-0 relative overflow-x-auto">
                    <Editor
                      value={code}
                      onValueChange={code => setCode(code)}
                      highlight={code => {
                        const grammar = language === 'cpp' ? Prism.languages.cpp : Prism.languages.python;
                        return grammar ? Prism.highlight(code, grammar, language) : code;
                      }}
                      padding={0}
                      className={`font-mono text-[13px] leading-relaxed ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                      style={{
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        minHeight: '100%',
                        whiteSpace: 'pre',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Editor Bottom Status Bar */}
              <div className={`px-4 py-2.5 border-t flex items-center justify-between text-xs ${
                isDark ? 'bg-[#101726] border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <span>{code.split('\n').length} строк • {language === 'cpp' ? 'C++' : 'Python'}</span>
                <button
                  onClick={handleGenerateClick}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{isGenerating ? "Генерация..." : "Создать схему"}</span>
                  <span className="text-[10px] bg-blue-700/60 px-1.5 py-0.5 rounded text-blue-200">
                    Ctrl + Enter
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Right Card: Diagram Preview & Canvas */}
          <div className={`flex-1 flex flex-col rounded-2xl border overflow-hidden relative transition-colors duration-200 ${
            isDark ? 'bg-[#0d131f] border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            {/* Top Toolbar */}
            <div className={`border-b z-20 flex flex-col shrink-0 transition-colors duration-200 ${
              isDark ? 'bg-[#0d131f] border-slate-800/80' : 'bg-white border-slate-200/90'
            }`}>
              {/* Function Tabs if multiple graphs */}
              {!viewMode && graphs.length > 1 && (
                <div className={`flex px-3 pt-2 gap-1 overflow-x-auto border-b ${
                  isDark ? 'border-slate-800/60' : 'border-slate-200/80'
                }`}>
                  {graphs.map((graph, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === idx
                          ? isDark
                            ? 'bg-[#131b2e] text-blue-400 border-t border-x border-slate-700/80'
                            : 'bg-slate-100 text-blue-600 border-t border-x border-slate-300'
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {graph.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Main Canvas Controls Bar */}
              <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Left: Mode toggle (Авто / Ножницы) */}
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Режим:
                  </span>
                  <div className={`flex items-center p-0.5 rounded-lg border gap-0.5 ${
                    isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <button
                      onClick={() => {
                        setSplitMode('auto');
                        setIsScissorsMode(false);
                        localStorage.setItem('blockcraft_split_mode', 'auto');
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                        splitMode === 'auto'
                          ? isDark ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Авто
                    </button>
                    <button
                      onClick={() => {
                        if (splitMode !== 'manual') {
                          setSplitMode('manual');
                          setIsScissorsMode(true);
                          localStorage.setItem('blockcraft_split_mode', 'manual');
                        } else {
                          setIsScissorsMode(!isScissorsMode);
                        }
                      }}
                      title={splitMode === 'manual' && isScissorsMode ? "Ножницы активны (кликните на схему для разреза)" : "Ручной режим (ножницы)"}
                      className={`w-7 h-6 flex items-center justify-center text-xs rounded-md transition-all cursor-pointer ${
                        splitMode === 'manual'
                          ? isScissorsMode
                            ? 'bg-red-500 text-white shadow-xs'
                            : isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ✂️
                    </button>
                  </div>

                  {splitMode === 'manual' && (customCuts[activeTab] || []).length > 0 && (
                    <button
                      onClick={() => {
                        const updated = { ...customCuts, [activeTab]: [] };
                        setCustomCuts(updated);
                        localStorage.setItem('blockcraft_custom_cuts', JSON.stringify(updated));
                      }}
                      className="px-2 py-1 text-xs font-medium rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition cursor-pointer"
                      title="Очистить все разрезы"
                    >
                      Очистить разрезы
                    </button>
                  )}
                </div>

                {/* Center: Pagination & Zoom Controls */}
                <div className="flex items-center gap-2">
                  {/* Pagination if multiple pages */}
                  {activeGraph && activeGraph.pages.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActivePage(p => Math.max(0, p - 1))}
                        disabled={activePage === 0}
                        className={`px-2 py-1 rounded-lg border text-xs font-medium transition cursor-pointer disabled:opacity-40 ${
                          isDark ? 'bg-[#131b2e] border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        ←
                      </button>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
                        isDark ? 'bg-[#131b2e] border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        {activePage + 1} / {activeGraph.pages.length}
                      </span>
                      <button
                        onClick={() => setActivePage(p => Math.min(activeGraph.pages.length - 1, p + 1))}
                        disabled={activePage === activeGraph.pages.length - 1}
                        className={`px-2 py-1 rounded-lg border text-xs font-medium transition cursor-pointer disabled:opacity-40 ${
                          isDark ? 'bg-[#131b2e] border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        →
                      </button>
                    </div>
                  )}

                  {/* Zoom Slider Control */}
                  <div className={`flex items-center px-2 py-1 rounded-xl border gap-2 ${
                    isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-semibold text-slate-400 select-none">Zoom</span>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="w-20 sm:w-28 h-1.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      title={`Масштаб: ${Math.round(scale * 100)}%`}
                    />
                    <button
                      onClick={() => {
                        setScale(1);
                        setPan({ x: 0, y: 0 });
                      }}
                      className={`px-1.5 py-0.5 text-xs font-semibold rounded-md transition cursor-pointer min-w-[38px] text-center ${
                        isDark ? 'text-slate-200 hover:bg-slate-800 hover:text-blue-400' : 'text-slate-700 hover:bg-white hover:text-blue-600'
                      }`}
                      title="Сбросить масштаб (100%)"
                    >
                      {Math.round(scale * 100)}%
                    </button>
                    <button
                      onClick={() => {
                        setScale(1);
                        setPan({ x: 0, y: 0 });
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg transition cursor-pointer text-slate-400 hover:text-blue-400"
                      title="Центрировать (100%)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Right: Export & Reset Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      let name = activeGraph?.title || 'graph';
                      if (activeGraph && activeGraph.pages.length > 1) {
                        name += `_стр_${activePage + 1}`;
                      }
                      downloadSvg(`graph-svg-${activeTab}`, name);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isDark ? 'bg-[#131b2e] border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Скачать векторный SVG"
                  >
                    <Code className="w-3.5 h-3.5 text-orange-400" />
                    <span>SVG</span>
                  </button>

                  <button
                    onClick={() => {
                      let name = activeGraph?.title || 'graph';
                      if (activeGraph && activeGraph.pages.length > 1) {
                        name += `_стр_${activePage + 1}`;
                      }
                      downloadPng(`graph-svg-${activeTab}`, name);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isDark ? 'bg-[#131b2e] border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Скачать растровый PNG"
                  >
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    <span>PNG</span>
                  </button>

                  <button
                    onClick={() => {
                      let name = activeGraph?.title || 'graph';
                      if (activeGraph && activeGraph.pages.length > 1) {
                        name += `_стр_${activePage + 1}`;
                      }
                      downloadDrawio(name, fontFamily);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isDark ? 'bg-[#131b2e] border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Экспорт в draw.io (.drawio)"
                  >
                    <span className="text-emerald-500 font-bold">XML</span>
                    <span>Draw.io</span>
                  </button>

                  <button
                    onClick={handleResetCache}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition cursor-pointer"
                    title="Сбросить все перемещения узлов и разрезы"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Сброс</span>
                  </button>
                </div>
              </div>
            </div>


          {!showSidebar && !viewMode && (
            <div className="absolute top-24 left-6 z-20">
              <button 
                className="flex items-center gap-2 bg-white/90 dark:bg-[#232328]/90 backdrop-blur px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700/80 shadow-sm hover:bg-zinc-50 dark:hover:bg-[#2E2E33] text-zinc-600 dark:text-zinc-300 text-sm font-medium transition-colors"
                onClick={() => setShowSidebar(true)}
              >
                <Code className="w-4 h-4" />
                <span>Показать редактор</span>
              </button>
            </div>
          )}

          {/* Canvas Viewport: Supports Drag Panning, Mouse Wheel and Scaled Scissors */}
          <div
            ref={canvasContainerRef}
            className={`flex-1 w-full h-full relative overflow-hidden select-none ${
              isDark ? 'bg-[#080c14]' : 'bg-[#eef2f6]'
            } ${isScissorsMode ? 'cursor-cell' : isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={(e) => {
              if (isScissorsMode) return;
              if (e.button === 0 || e.button === 1) {
                setIsPanning(true);
                startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
              }
            }}
            onMouseMove={(e) => {
              if (isPanning) {
                setPan({
                  x: e.clientX - startPanRef.current.x,
                  y: e.clientY - startPanRef.current.y,
                });
              }
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey || e.altKey) {
                e.preventDefault();
                const factor = e.deltaY < 0 ? 1.08 : 0.92;
                setScale(s => Math.min(3, Math.max(0.2, +(s * factor).toFixed(2))));
              } else {
                if (e.shiftKey) {
                  setPan(p => ({ ...p, x: p.x - e.deltaY }));
                } else {
                  setPan(p => ({ ...p, y: p.y - e.deltaY }));
                }
              }
            }}
          >
              {isScissorsMode && splitMode === 'manual' && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-semibold rounded-2xl shadow-xl shadow-rose-500/20 backdrop-blur border border-rose-400/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">✂️</span>
                    <span>Режим ножниц активен: кликните на схему в месте, где хотите разделить страницы</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      onClick={() => setIsScissorsMode(false)}
                      className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => setIsTipsModalOpen(true)}
                      className="px-2.5 py-1 bg-black/20 hover:bg-black/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                    >
                      Справка
                    </button>
                  </div>
                </div>
              )}
              {activeGraph && activeGraphPage && (
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                    transformOrigin: 'top center',
                    transition: isPanning ? 'none' : 'transform 0.05s ease-out',
                  }}
                  className="w-full h-full flex flex-col items-center justify-start p-8 min-h-full"
                >
                  <svg 
                    id={`graph-svg-${activeTab}`}
                    width={activeGraphPage.width} 
                    height={activeGraphPage.height} 
                    viewBox={`0 0 ${activeGraphPage.width} ${activeGraphPage.height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className={`overflow-visible bg-white border border-slate-300 shadow-2xl shadow-slate-900/15 p-8 rounded-xl my-4 select-none ${isScissorsMode ? 'cursor-cell' : ''}`}
                    onClick={(e) => {
                        if (!isScissorsMode || splitMode !== 'manual') return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickY = (e.clientY - rect.top) / scale;
                        const updatedCuts = [...(customCuts[activeTab] || [])];
                        updatedCuts.push(Math.round(clickY));
                        const nextCuts = { ...customCuts, [activeTab]: updatedCuts };
                        setCustomCuts(nextCuts);
                        localStorage.setItem('blockcraft_custom_cuts', JSON.stringify(nextCuts));
                        setIsScissorsMode(false);
                    }}
                    onMouseMove={(e) => {
                        if (!isScissorsMode || splitMode !== 'manual') return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const hoverY = (e.clientY - rect.top) / scale;
                        setHoveredY(Math.round(hoverY));
                    }}
                    onMouseLeave={() => {
                        setHoveredY(null);
                    }}
                  >
                    <defs>
                      <marker id="arrowhead-light" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#18181b" />
                      </marker>
                      <marker id="arrowhead-dark" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#18181b" />
                      </marker>
                    </defs>

                    {activeGraphPage.edges.map((edge, i) => (
                        <g 
                            key={edge.id || `edge-${i}`} 
                            opacity={selectedElement?.type === 'edge' && selectedElement.id === edge.id ? 0.5 : 1}
                            className="group"
                        >
                            <EdgePolyline edge={edge} theme="light" />
                           {edge.segments?.map((seg, idx) => {
                                // use 1-indexed to match data structure
                                let segmentKey = idx + 1;
                                
                                return (
                                   <g key={segmentKey}>
                                       <line 
                                           x1={seg.startX} y1={seg.startY}
                                           x2={seg.endX} y2={seg.endY}
                                           stroke="transparent"
                                           strokeWidth="20"
                                           className="pointer-events-auto outline-none cursor-pointer"
                                           onMouseDown={(e) => {
                                                if (isScissorsMode) return;
                                                e.stopPropagation();
                                                setSelectedElement({ type: 'edge', id: edge.id!, segment: segmentKey });
                                           }}
                                       />
                                   </g>
                                );
                           })}
                        </g>
                    ))}

                    {activeGraphPage.nodes.map((node) => (
                      <g 
                        key={node.id} 
                        className={`cursor-pointer ${selectedElement?.type === 'node' && selectedElement.id === node.id ? 'opacity-70' : 'opacity-100'} transition-opacity`}
                        onMouseDown={(e) => {
                            if (isScissorsMode) return;
                            e.stopPropagation();
                            setSelectedElement({ type: 'node', id: node.id });
                            setDragState({
                                id: node.id,
                                type: 'node',
                                startX: e.pageX,
                                startY: e.pageY,
                                startDx: overrides[activeTab]?.nodes?.[node.id]?.dx || 0,
                                startDy: overrides[activeTab]?.nodes?.[node.id]?.dy || 0
                            });
                            handleNodeClick(node);
                        }}
                        onDoubleClick={(e) => {
                            if (isScissorsMode) return;
                            e.stopPropagation();
                            setEditingNode({ id: node.id, text: node.text });
                        }}
                      >
                        <GostShape 
                          node={node} 
                          highlighted={highlightedNodeId === node.id || (node.lineIndex !== undefined && node.lineIndex !== null && node.lineIndex === hoveredLineIndex)} 
                          fontFamily={fontFamily}
                          theme="light"
                        />
                      </g>
                    ))}

                    {/* Render manual custom cut lines in Scissors Mode */}
                    {splitMode === 'manual' && (customCuts[activeTab] || []).map((cutY, index) => (
                        <g key={`cut-line-${index}`} className="group cursor-pointer">
                            {/* Interactive broad line */}
                            <line
                                x1={0}
                                y1={cutY}
                                x2={activeGraphPage.width}
                                y2={cutY}
                                stroke="transparent"
                                strokeWidth={24}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const updatedCuts = (customCuts[activeTab] || []).filter((_, idx) => idx !== index);
                                    const nextCuts = { ...customCuts, [activeTab]: updatedCuts };
                                    setCustomCuts(nextCuts);
                                    localStorage.setItem('blockcraft_custom_cuts', JSON.stringify(nextCuts));
                                }}
                            />
                            {/* Visual cut line */}
                            <line
                                x1={0}
                                y1={cutY}
                                x2={activeGraphPage.width}
                                y2={cutY}
                                stroke="#ef4444"
                                strokeWidth={2}
                                strokeDasharray="6,4"
                            />
                            {/* Interactive visual button */}
                            <g
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const updatedCuts = (customCuts[activeTab] || []).filter((_, idx) => idx !== index);
                                    const nextCuts = { ...customCuts, [activeTab]: updatedCuts };
                                    setCustomCuts(nextCuts);
                                    localStorage.setItem('blockcraft_custom_cuts', JSON.stringify(nextCuts));
                                }}
                            >
                                <rect
                                    x={10}
                                    y={cutY - 10}
                                    width={70}
                                    height={20}
                                    rx={4}
                                    fill="#ef4444"
                                    className="hover:fill-red-600 transition-colors"
                                />
                                <text
                                    x={45}
                                    y={cutY + 4}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize={10}
                                    fontWeight="bold"
                                    className="select-none pointer-events-none"
                                >
                                    Удалить ✕
                                </text>
                            </g>
                        </g>
                    ))}

                    {/* Preview line while dragging or hovering with active scissors */}
                    {isScissorsMode && hoveredY !== null && (
                        <g className="pointer-events-none">
                            <line
                                x1={0}
                                y1={hoveredY}
                                x2={activeGraphPage.width}
                                y2={hoveredY}
                                stroke="#3b82f6"
                                strokeWidth={2}
                                strokeDasharray="4,4"
                            />
                            <rect
                                x={10}
                                y={hoveredY - 10}
                                width={85}
                                height={20}
                                rx={4}
                                fill="#3b82f6"
                            />
                            <text
                                x={52}
                                y={hoveredY + 4}
                                textAnchor="middle"
                                fill="white"
                                fontSize={10}
                                fontWeight="bold"
                            >
                                Сделать разрез
                            </text>
                        </g>
                    )}
                  </svg>
                </div>
              )}

              {graphs.length === 0 && (
                <div className="my-auto flex flex-col items-center justify-center p-4 max-w-4xl w-full">
                  <div className="flex flex-col items-center text-center max-w-md mx-auto mb-10">
                    <div className="w-16 h-16 bg-white dark:bg-[#202024] rounded-2xl flex items-center justify-center mb-6 border border-zinc-200/80 dark:border-zinc-700/60 shadow-xs p-2">
                      <SchematorLogo className="w-12 h-12 select-none" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
                      Создание ГОСТ блок-схемы
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed max-w-[340px]">
                      Вставьте ваш исходный код слева и нажмите <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">«Создать схему»</strong> или выберите один из шаблонов для быстрого старта:
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    {PRESET_TEMPLATES.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleLoadPreset(preset)}
                        className="group flex flex-col items-start p-5 bg-white dark:bg-[#202024]/60 hover:bg-zinc-50 dark:hover:bg-[#2A2A2E]/80 border border-zinc-200 dark:border-zinc-700/60 hover:border-blue-400/50 dark:hover:border-blue-500/50 rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-xs hover:shadow-sm"
                      >
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-xs border border-zinc-200/50 dark:border-zinc-700/50">
                          {preset.type === 'branch' && <GitBranch className="w-5 h-5 text-emerald-500" />}
                          {preset.type === 'loop' && <Repeat className="w-5 h-5 text-blue-500" />}
                          {preset.type === 'func' && <Code className="w-5 h-5 text-purple-500" />}
                        </div>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {preset.title}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                          {preset.desc}
                        </p>
                      </button>
                    ))}
                  </div>

                  {!user ? (
                    <div className="mt-10 px-4 py-2 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 rounded-full flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Войдите через Яндекс ID или Почту, чтобы получить +1 Coin бесплатно
                    </div>
                  ) : null}

                  {authError && (
                    <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-xs font-medium text-red-600 dark:text-red-300 max-w-sm text-center">
                      <strong className="block mb-1 font-bold">Ошибка авторизации</strong> 
                      {authError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Diagram History Drawer / Modal */}
      <DiagramHistory
        user={user}
        currentCode={code}
        currentLanguage={language}
        isOpen={isHistoryOpen}
        onToggleOpen={(open) => setIsHistoryOpen(open)}
        onSelectDiagram={handleSelectDiagramFromHistory}
        onOpenLogin={handleLogin}
        onNotify={showToast}
      />

      {/* Presets and Templates Modal */}
      <PresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        theme={theme}
        onSelect={(template) => {
          if (code.trim() && code.trim() !== template.code.trim()) {
            setPreviousBackup({
              code: code,
              language: 'python',
              title: 'Предыдущий код'
            });
          }
          setCode(template.code);
          setLanguage(template.language as any || 'python');
          sessionGeneratedCodesRef.current.add(template.code.trim());
          setLastGeneratedCode(template.code);
          setLastGeneratedLanguage(template.language as any || 'python');
          setActiveTab(0);
          setActivePage(0);
          showToast(`Загружен шаблон: «${template.title}»`);
        }}
        onSelectTemplate={(template) => {
          if (code.trim() && code.trim() !== template.code.trim()) {
            setPreviousBackup({
              code: code,
              language: 'python',
              title: 'Предыдущий код'
            });
          }
          setCode(template.code);
          setLanguage(template.language as any || 'python');
          sessionGeneratedCodesRef.current.add(template.code.trim());
          setLastGeneratedCode(template.code);
          setLastGeneratedLanguage(template.language as any || 'python');
          setActiveTab(0);
          setActivePage(0);
          showToast(`Загружен шаблон: «${template.title}»`);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        theme={theme}
        onThemeChange={(nextTheme) => {
          setTheme(nextTheme);
          localStorage.setItem('blockcraft_theme', nextTheme);
        }}
        fontFamily={fontFamily}
        onFontChange={(nextFont) => {
          setFontFamily(nextFont);
          localStorage.setItem('blockcraft_font', nextFont);
        }}
        splitMode={splitMode}
        onSplitModeChange={(nextMode) => {
          setSplitMode(nextMode);
          setIsScissorsMode(nextMode === 'manual');
          localStorage.setItem('blockcraft_split_mode', nextMode);
        }}
        onResetCache={handleResetCache}
        onNotify={showToast}
      />

      {/* Locked Node Text Edit Modal (Centered on Screen & Prevents Panning/Dragging) */}
      {editingNode && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setEditingNode(null)}
        >
          <div 
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 flex flex-col gap-3.5 animate-in zoom-in-95 duration-150 ${
              isDark ? 'bg-[#0f172a] text-slate-100 border-slate-700' : 'bg-white text-slate-800 border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex justify-between items-center pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Редактирование текста блока
              </h3>
              <button 
                onClick={() => setEditingNode(null)} 
                className={`rounded-lg p-1 transition cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea 
              className={`w-full h-32 p-3 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 border transition-colors ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-slate-100' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
              autoFocus
              value={editingNode.text}
              onChange={(e) => setEditingNode({ ...editingNode, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  const next = JSON.parse(JSON.stringify(overridesRef.current));
                  if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
                  if (!next[activeTab].nodes) next[activeTab].nodes = {};
                  if (!next[activeTab].nodes[editingNode.id]) next[activeTab].nodes[editingNode.id] = {};
                  next[activeTab].nodes[editingNode.id].text = editingNode.text;
                  pushHistory(next);
                  setEditingNode(null);
                  showToast('Текст блока сохранен');
                } else if (e.key === 'Escape') {
                  setEditingNode(null);
                }
              }}
            />

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-400 text-[11px]">
                Нажмите <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+Enter</kbd>
              </span>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setEditingNode(null)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Отмена
                </button>
                <button 
                  type="button"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-semibold transition shadow-xs cursor-pointer"
                  onClick={() => {
                    const next = JSON.parse(JSON.stringify(overridesRef.current));
                    if (!next[activeTab]) next[activeTab] = { nodes: {}, edges: {} };
                    if (!next[activeTab].nodes) next[activeTab].nodes = {};
                    if (!next[activeTab].nodes[editingNode.id]) next[activeTab].nodes[editingNode.id] = {};
                    next[activeTab].nodes[editingNode.id].text = editingNode.text;
                    pushHistory(next);
                    setEditingNode(null);
                    showToast('Текст блока сохранен');
                  }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accidental Click / Restore Previous Code Floating Banner */}
      {previousBackup && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 text-[11px] font-medium rounded-xl shadow-xl backdrop-blur border border-zinc-700/80 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-zinc-300">Загружена схема из истории. Случайно нажали?</span>
          <button
            onClick={handleRestorePreviousCode}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[11px] font-bold transition shadow-xs cursor-pointer"
          >
            Вернуть старый код
          </button>
          <button
            onClick={() => setPreviousBackup(null)}
            className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
            title="Закрыть"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && !previousBackup && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-zinc-900/95 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-full shadow-2xl backdrop-blur border border-white/20 dark:border-black/20 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Auth Modal for Yandex / Email */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={handleAuthSuccess} 
        onOpenLegal={(doc) => setLegalModalDoc(doc)}
      />

      {/* Legal Documents Modal */}
      <LegalModal
        isOpen={legalModalDoc !== null}
        initialDoc={legalModalDoc || 'privacy'}
        onClose={() => setLegalModalDoc(null)}
      />

      {/* Tariff and Robokassa Top-Up Modal */}
      <TariffModal
        isOpen={isTariffModalOpen}
        onClose={() => setIsTariffModalOpen(false)}
        user={user}
        userTokens={userTokens}
        onOpenLogin={handleLogin}
        onOpenLegal={(doc) => setLegalModalDoc(doc)}
        onNotify={showToast}
      />

      {/* Hints, Tips and Syntax Guide Modal */}
      <TipsModal
        isOpen={isTipsModalOpen}
        onClose={() => setIsTipsModalOpen(false)}
        onInsertCode={(sampleCode) => {
          setCode(sampleCode);
          showToast('Пример кода успешно вставлен в редактор');
        }}
      />
    </div>
    </div>
  );
}
