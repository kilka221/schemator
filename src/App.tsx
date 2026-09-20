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
  Download,
  ShieldCheck,
  FileText,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Mail,
  Gift,
  Sliders,
  Shuffle
} from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism.css';

import { FONTS_CATALOG, ensureFontLoaded } from './fonts';
import { DIAGRAM_STYLES, getDiagramStyle } from './diagramStyles';
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
import { MobileCodeSheet } from './MobileCodeSheet';
import { MobileExportSheet } from './MobileExportSheet';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { MobileBottomNav } from './MobileBottomNav';

export interface AppUserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
  tokens?: number;
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

const formatLinesRu = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} строк`;
  if (mod10 === 1) return `${n} строка`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} строки`;
  return `${n} строк`;
};

export default function App() {
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem('blockcraft_code_persist');
    if (!saved || saved.trim() === DEFAULT_DEMO_CODE.trim()) return '';
    return saved;
  });
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem('blockcraft_theme') as 'light'|'dark') || 'dark');
  const [fontFamily, setFontFamily] = useState<string>(() => localStorage.getItem('blockcraft_font') || 'Inter, sans-serif');
  const [diagramStyle, setDiagramStyle] = useState<string>(() => localStorage.getItem('blockcraft_diagram_style') || 'classic_gost');

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
    const saved = localStorage.getItem('blockcraft_code_persist');
    if (!saved || saved.trim() === DEFAULT_DEMO_CODE.trim()) return '';
    return saved;
  });
  const [lastGeneratedLanguage, setLastGeneratedLanguage] = useState("python");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previousBackup, setPreviousBackup] = useState<{ code: string; language: 'python' | 'cpp'; title?: string } | null>(null);
  const sessionGeneratedCodesRef = React.useRef<Set<string>>(new Set());
  const [legalModalDoc, setLegalModalDoc] = useState<LegalDocType | null>(null);
  const [isMobileCodeOpen, setIsMobileCodeOpen] = useState(false);
  const [isMobileExportOpen, setIsMobileExportOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);
  const touchDistRef = React.useRef<number | null>(null);

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
    } else {
      setUser(null);
      setUserTokens(0);
    }
  }, []);
  
  const [authModalTab, setAuthModalTab] = useState<'yandex' | 'email'>('yandex');

  const handleLogin = (tab: 'yandex' | 'email' = 'yandex') => {
    setAuthModalTab(tab);
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

  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('blockcraft_left_width');
    return saved ? Math.max(300, Math.min(800, parseInt(saved, 10))) : 440;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startW = leftWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newW = Math.max(300, Math.min(800, startW + delta));
      setLeftWidth(newW);
      localStorage.setItem('blockcraft_left_width', String(newW));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('blockcraft_sidebar_collapsed');
    return saved !== null ? saved === 'true' : false;
  });
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
  React.useEffect(() => { 
    localStorage.setItem('blockcraft_font', fontFamily);
    ensureFontLoaded(fontFamily);
  }, [fontFamily]);
  React.useEffect(() => { localStorage.setItem('blockcraft_diagram_style', diagramStyle); }, [diagramStyle]);

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

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (isScissorsMode || editingNode) return;
    const target = e.target as HTMLElement;
    if (target.closest('.cursor-pointer') || target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA') {
      return;
    }
    if (e.touches.length === 1) {
      setIsPanning(true);
      startPanRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistRef.current = dist;
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent) => {
    if (isScissorsMode || editingNode) return;
    if (e.touches.length === 1 && isPanning) {
      setPan({
        x: e.touches[0].clientX - startPanRef.current.x,
        y: e.touches[0].clientY - startPanRef.current.y,
      });
    } else if (e.touches.length === 2 && touchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchDistRef.current > 0) {
        const factor = dist / touchDistRef.current;
        setScale(s => Math.min(3.5, Math.max(0.18, +(s * factor).toFixed(2))));
      }
      touchDistRef.current = dist;
    }
  };

  const handleCanvasTouchEnd = () => {
    setIsPanning(false);
    touchDistRef.current = null;
  };
  
  const graphs = useMemo(() => {
      try {
          const trimmedCode = code?.trim() || '';
          if (!trimmedCode) return [];
          
          // Scheme is displayed if current code matches last generated OR is in session cache
          const isGenerated = trimmedCode === lastGeneratedCode?.trim() || sessionGeneratedCodesRef.current.has(trimmedCode);
          if (!isGenerated) return [];

          return buildGraphs(code, language, overrides, splitMode, customCuts, isScissorsMode, diagramStyle);
      } catch (e) {
          console.error('buildGraphs error:', e);
          return [];
      }
  }, [code, lastGeneratedCode, language, overrides, splitMode, customCuts, isScissorsMode, diagramStyle]);

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
          showToast('Войдите или зарегистрируйтесь, чтобы получить 1 бесплатную схему!');
          handleLogin('yandex');
          return;
      }

      if (userTokens !== null && userTokens <= 0) {
          showToast('У вас закончились схемы. Пополните баланс для продолжения');
          setIsTariffModalOpen(true);
          return;
      }

      const currentUser = user;
      setIsGenerating(true);
      try {
          // Immediately register generated code so graphs render without blocking
          sessionGeneratedCodesRef.current.add(trimmedCode);
          setLastGeneratedCode(code);
          setLastGeneratedLanguage(language);
          localStorage.setItem('blockcraft_code_persist', code);

          // Decrement token in Yandex Database (YDB) in the background
          decrementYdbUserToken(currentUser.uid, currentUser.email).then(nextCount => {
            if (typeof nextCount === 'number') {
              setUserTokens(nextCount);
              localStorage.setItem('blockcraft_yandex_user', JSON.stringify({ ...currentUser, tokens: nextCount }));
            }
          }).catch(err => {
            console.warn('Background token decrement warning:', err);
          });

          // Auto-save generated diagram to user's history in YDB
          if (trimmedCode) {
            try {
              const diagId = `diag_${Date.now()}`;
              const now = new Date().toISOString();
              
              // Smart title generation and language detection
              const isCpp = language === 'cpp' || trimmedCode.includes('#include') || trimmedCode.includes('using namespace') || /\b(int|void|double|float|char|bool)\s+main\s*\(/.test(trimmedCode);
              const saveLang = isCpp ? 'cpp' : 'python';
              let autoTitle = isCpp ? 'Схема C++' : 'Схема Python';
              const lines = code.split('\n').map(l => l.trim()).filter(Boolean);
              
              if (isCpp) {
                for (const line of lines) {
                  const cppMatch = line.match(/^(?:(?:inline|static|const|virtual|constexpr)\s+)*(?:[a-zA-Z0-9_:<>&*]+\s+)+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:const)?\s*\{?/);
                  if (cppMatch && !['if', 'while', 'for', 'switch', 'main'].includes(cppMatch[1])) {
                    autoTitle = `Функция ${cppMatch[1]}()`;
                    break;
                  }
                }
              } else {
                for (const line of lines) {
                  const pyMatch = line.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
                  if (pyMatch) { autoTitle = `Функция ${pyMatch[1]}()`; break; }
                }
              }

              if (user) {
                await saveYdbDiagramItem(user.uid, {
                  id: diagId,
                  title: autoTitle,
                  code: code,
                  language: saveLang,
                  isPinned: false,
                  createdAt: now,
                  updatedAt: now
                });
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
    if (diagramTitle) {
      showToast(`Загружена схема «${diagramTitle}»`);
    }
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

    const currentStyle = getDiagramStyle(diagramStyle);
    const strokeColor = currentStyle.strokeColor || '#18181b';
    const strokeWidth = currentStyle.strokeWidth || 1.5;

    const findClosestNode = (pt: {x: number; y: number}) => {
        let closestNode = null;
        let minDist = 999999;
        activeGraphPage.nodes.forEach(node => {
            const width = node.type === 'circle' ? 40 : currentStyle.nodeWidth;
            const height = node.type === 'circle' ? 40 : (node.height || getNodeHeight(node.text, node.type, currentStyle));
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
        const width = node.type === 'circle' ? 40 : currentStyle.nodeWidth;
        const height = node.type === 'circle' ? 40 : (node.height || getNodeHeight(node.text, node.type, currentStyle));
        const xMin = node.x - width / 2;
        const yMin = node.y - height / 2;

        let style = `rounded=0;whiteSpace=wrap;html=1;strokeColor=${strokeColor};fillColor=#ffffff;strokeWidth=${strokeWidth};fontFamily=${fontName};`;
        if (node.type === 'start' || node.type === 'end') {
            style = `rounded=1;whiteSpace=wrap;html=1;arcSize=50;strokeColor=${strokeColor};fillColor=#ffffff;strokeWidth=${strokeWidth};align=center;fontWeight=bold;fontFamily=${fontName};`;
        } else if (node.type === 'circle') {
            style = `ellipse;whiteSpace=wrap;html=1;aspect=fixed;strokeColor=${strokeColor};fillColor=#ffffff;strokeWidth=${strokeWidth};fontFamily=${fontName};`;
        } else if (node.type === 'io') {
            style = `shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;strokeColor=${strokeColor};fillColor=#ffffff;strokeWidth=${strokeWidth};fontFamily=${fontName};`;
        } else if (node.type === 'decision') {
            style = `rhombus;whiteSpace=wrap;html=1;strokeColor=${strokeColor};fillColor=#ffffff;strokeWidth=${strokeWidth};fontFamily=${fontName};`;
        } else if (node.type === 'loop_begin') {
            style = `shape=loopLimit;whiteSpace=wrap;html=1;strokeColor=${strokeColor};fillColor=#ffffff;strokeWidth=${strokeWidth};fontFamily=${fontName};`;
        } else if (node.type === 'loop_end') {
            style = `shape=loopLimit;whiteSpace=wrap;html=1;rotation=180;strokeColor=${strokeColor};fillColor=#ffffff;strokeWidth=${strokeWidth};fontFamily=${fontName};`;
        } else if (node.type === 'loop') {
            style = `shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;strokeColor=${strokeColor};fillColor=#ffffff;strokeWidth=${strokeWidth};fontFamily=${fontName};`;
        } else if (node.type === 'subprogram') {
            style = `shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;strokeColor=${strokeColor};fillColor=#ffffff;strokeWidth=${strokeWidth};fontFamily=${fontName};`;
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

        let style = `html=1;strokeColor=${strokeColor};strokeWidth=${strokeWidth};fontSize=11;fontFamily=${fontName};rounded=0;`;
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
      <div className={`w-full h-screen flex flex-col font-sans overflow-hidden select-none transition-colors duration-150 antialiased ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-100 text-zinc-900'
      }`}>
        {!viewMode && (
          <header className={`h-11 border-b flex items-center justify-between px-3.5 shrink-0 z-30 transition-colors duration-150 ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}>
            {/* Logo, Sidebar Toggle and App Title */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsSidebarCollapsed(prev => {
                    const next = !prev;
                    localStorage.setItem('blockcraft_sidebar_collapsed', String(next));
                    return next;
                  });
                }}
                className={`hidden md:flex h-7 w-7 rounded-md border items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
                title={isSidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
              <SchematorLogo className="w-6 h-6 select-none shrink-0" />
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold tracking-tight uppercase ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  Схематор
                </span>
              </div>
            </div>

            {/* Right Controls in Header */}
            <div className="flex items-center gap-2">
              {/* Code Editor Toggle (Desktop only, mobile has bottom bar button) */}
              <button
                onClick={() => setShowSidebar(prev => !prev)}
                className={`hidden md:flex h-7 px-2.5 rounded-md border items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  showSidebar
                    ? isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                      : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                    : isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
                title={showSidebar ? "Скрыть редактор кода" : "Показать редактор кода"}
              >
                <Code className="w-3.5 h-3.5" />
                <span className="text-[11px]">Редактор</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => {
                  const next = isDark ? 'light' : 'dark';
                  setTheme(next);
                  localStorage.setItem('blockcraft_theme', next);
                }}
                className={`h-7 w-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
                title={isDark ? "Светлая тема" : "Темная тема"}
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-zinc-300" /> : <Moon className="w-3.5 h-3.5 text-zinc-600" />}
              </button>

              <div className={`hidden sm:block w-px h-4 mx-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

              {/* Auth & Tokens */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div className={`px-2 h-7 rounded-md border text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                    isDark ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                  }`}>
                    <Coins className="w-3 h-3 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span className="font-medium">{userTokens !== null ? userTokens : '...'}</span>
                    <span className="hidden sm:inline text-zinc-300 dark:text-zinc-600 select-none">|</span>
                    <button
                      onClick={() => setIsTariffModalOpen(true)}
                      className="hidden sm:inline text-[11px] font-mono text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                    >
                      Тарифы
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-md border border-zinc-700 object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center text-[11px] font-mono font-bold">
                        {user.displayName?.[0] || 'U'}
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      className={`hidden md:flex h-7 w-7 rounded-md items-center justify-center transition-colors cursor-pointer ${
                        isDark ? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800' : 'text-zinc-500 hover:text-red-500 hover:bg-zinc-100'
                      }`}
                      title="Выйти из аккаунта"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsTariffModalOpen(true)}
                    className={`hidden sm:inline-flex h-7 px-2.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    Тарифы
                  </button>
                  <button
                    onClick={handleLogin}
                    className="h-7 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
          <div className="bg-amber-600 dark:bg-amber-700 text-white text-xs px-4 py-1.5 flex items-center justify-between shadow-2xs z-30 transition-all shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
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

        {/* Main Docked Split-View Layout */}
        <div className="flex-1 flex overflow-hidden w-full h-full divide-x divide-zinc-200 dark:divide-zinc-800">
          {/* Left Sidebar Navigation - Collapsible (w-14 collapsed, w-56 expanded) */}
          {!viewMode && (
            <aside className={`hidden md:flex ${
              isSidebarCollapsed ? 'w-14' : 'w-56'
            } shrink-0 flex-col justify-between py-3 px-1.5 select-none transition-all duration-200 border-r overflow-hidden ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}>
              {/* Top Navigation Menu Items */}
              <div className="flex flex-col gap-1 items-stretch flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                {/* Главная */}
                <button
                  onClick={() => setActiveNav('home')}
                  title={isSidebarCollapsed ? "Главная" : undefined}
                  className={`h-9 flex items-center ${
                    isSidebarCollapsed ? 'justify-center w-full px-0' : 'justify-start px-2.5 gap-2.5 w-full'
                  } rounded-md transition-colors cursor-pointer relative group ${
                    activeNav === 'home'
                      ? isDark
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'bg-zinc-200/80 text-zinc-900 font-semibold'
                      : isDark
                      ? 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900'
                  }`}
                >
                  <Home className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="text-xs font-medium truncate">Главная</span>}
                  {isSidebarCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-2.5 z-50 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md select-none">
                      Главная
                    </span>
                  )}
                </button>

                {/* Примеры */}
                <button
                  onClick={() => setIsPresetsModalOpen(true)}
                  title={isSidebarCollapsed ? "Примеры" : undefined}
                  className={`h-9 flex items-center ${
                    isSidebarCollapsed ? 'justify-center w-full px-0' : 'justify-start px-2.5 gap-2.5 w-full'
                  } rounded-md transition-colors cursor-pointer relative group ${
                    isDark
                      ? 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="text-xs font-medium truncate">Примеры</span>}
                  {isSidebarCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-2.5 z-50 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md select-none">
                      Примеры
                    </span>
                  )}
                </button>

                {/* Справка */}
                <button
                  onClick={() => setIsTipsModalOpen(true)}
                  title={isSidebarCollapsed ? "Справка" : undefined}
                  className={`h-9 flex items-center ${
                    isSidebarCollapsed ? 'justify-center w-full px-0' : 'justify-start px-2.5 gap-2.5 w-full'
                  } rounded-md transition-colors cursor-pointer relative group ${
                    isDark
                      ? 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="text-xs font-medium truncate">Справка</span>}
                  {isSidebarCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-2.5 z-50 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md select-none">
                      Справка
                    </span>
                  )}
                </button>

                {/* Настройки */}
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  title={isSidebarCollapsed ? "Настройки" : undefined}
                  className={`h-9 flex items-center ${
                    isSidebarCollapsed ? 'justify-center w-full px-0' : 'justify-start px-2.5 gap-2.5 w-full'
                  } rounded-md transition-colors cursor-pointer relative group ${
                    isDark
                      ? 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="text-xs font-medium truncate">Настройки</span>}
                  {isSidebarCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-2.5 z-50 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md select-none">
                      Настройки
                    </span>
                  )}
                </button>

                {/* Разделитель */}
                <div className="w-full h-px my-1 bg-zinc-200 dark:bg-zinc-800" />

                {/* История схем (при нажатии автоматически раскрывает сайдбар) */}
                <button
                  onClick={() => {
                    if (isSidebarCollapsed) {
                      setIsSidebarCollapsed(false);
                      localStorage.setItem('blockcraft_sidebar_collapsed', 'false');
                      setIsHistoryOpen(true);
                    } else {
                      setIsHistoryOpen(prev => !prev);
                    }
                  }}
                  title={isSidebarCollapsed ? "История схем" : undefined}
                  className={`h-9 flex items-center ${
                    isSidebarCollapsed ? 'justify-center w-full px-0' : 'justify-between px-2.5 w-full'
                  } rounded-md transition-colors cursor-pointer relative group ${
                    isHistoryOpen
                      ? isDark
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'bg-zinc-200/80 text-zinc-900 font-semibold'
                      : isDark
                      ? 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <HistoryIcon className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span className="text-xs font-medium truncate">История схем</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${isHistoryOpen ? 'rotate-180' : ''}`} />
                  )}
                  {isSidebarCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-2.5 z-50 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md select-none">
                      История схем
                    </span>
                  )}
                </button>

                {/* Inline History List inside the Sidebar */}
                {!isSidebarCollapsed && isHistoryOpen && (
                  <div className="mt-1 flex-1 min-h-0 overflow-y-auto pr-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <DiagramHistory
                      user={user}
                      currentCode={code}
                      currentLanguage={language}
                      onSelectDiagram={(selCode, selLang, selTitle) => {
                        handleSelectDiagramFromHistory(selCode, selLang, selTitle);
                      }}
                      onOpenLogin={handleLogin}
                      onNotify={showToast}
                      theme={theme}
                    />
                  </div>
                )}
              </div>

              {/* Bottom: Legal Links (No collapse button at bottom) */}
              <div className="flex flex-col gap-1 pt-2 shrink-0 border-t border-zinc-200 dark:border-zinc-800/80">
                <button
                  onClick={() => setLegalModalDoc('privacy')}
                  title={isSidebarCollapsed ? "Конфиденциальность" : undefined}
                  className={`h-8 flex items-center ${
                    isSidebarCollapsed ? 'justify-center w-full px-0' : 'justify-start px-2.5 gap-2.5 w-full'
                  } rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer relative group`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  {!isSidebarCollapsed && <span className="text-[11px] truncate">Конфиденциальность</span>}
                  {isSidebarCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-2.5 z-50 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md select-none">
                      Конфиденциальность
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setLegalModalDoc('offer')}
                  title={isSidebarCollapsed ? "Публичная оферта" : undefined}
                  className={`h-8 flex items-center ${
                    isSidebarCollapsed ? 'justify-center w-full px-0' : 'justify-start px-2.5 gap-2.5 w-full'
                  } rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer relative group`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  {!isSidebarCollapsed && <span className="text-[11px] truncate">Публичная оферта</span>}
                  {isSidebarCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-2.5 z-50 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md select-none">
                      Публичная оферта
                    </span>
                  )}
                </button>
              </div>
            </aside>
          )}

          {/* Center Docked Panel: Code Editor (Desktop only) */}
          {!viewMode && showSidebar && (
            <div 
              style={{ width: `${leftWidth}px` }}
              className={`hidden md:flex shrink-0 flex-col overflow-hidden transition-colors duration-150 ${
                isDark ? 'bg-zinc-900' : 'bg-white'
              }`}
            >
              {/* Sub-toolbar */}
              <div className={`h-10 px-3 border-b flex items-center justify-between text-xs shrink-0 ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-50/80 border-zinc-200 text-zinc-600'
              }`}>
                <div className="flex items-center gap-1.5">
                  <select
                    value={language}
                    onChange={(e) => {
                      const newLang = e.target.value as 'python' | 'cpp';
                      setLanguage(newLang);
                      localStorage.setItem('blockcraft_language', newLang);
                    }}
                    className={`h-7 text-xs font-mono font-medium rounded-md border px-2 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
                    }`}
                  >
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
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
                      className="h-6 w-6 rounded flex items-center justify-center text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Очистить код"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Code Editor Scroller */}
              <div id="code-editor-scroller" className={`flex-grow overflow-auto relative ${
                isDark ? 'bg-zinc-950' : 'bg-zinc-50/50'
              }`}>
                <div
                  className="w-full min-h-full p-2.5 flex flex-row items-start cursor-text"
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
                    #code-editor-scroller .editor-line-num {
                      height: 22px !important;
                      line-height: 22px !important;
                      font-size: 13px !important;
                      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    }
                    #code-editor-scroller pre,
                    #code-editor-scroller code,
                    #code-editor-scroller textarea,
                    #code-editor-scroller .npm__react-simple-code-editor__textarea {
                      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                      font-size: 13px !important;
                      line-height: 22px !important;
                      white-space: pre !important;
                      outline: none !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      box-sizing: border-box !important;
                    }
                    #code-editor-scroller pre[class*="language-"],
                    #code-editor-scroller code[class*="language-"] {
                      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                      font-size: 13px !important;
                      line-height: 22px !important;
                      padding: 0 !important;
                      margin: 0 !important;
                    }
                  `}</style>
                  {/* Line numbers */}
                  <div
                    className={`flex select-none text-right pr-2 mr-2.5 flex-col shrink-0 border-r ${
                      isDark ? 'text-zinc-500 border-zinc-800' : 'text-zinc-400 border-zinc-200'
                    }`}
                    style={{
                      minWidth: '2.4rem',
                      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '13px',
                      lineHeight: '22px',
                    }}
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
                          className={`editor-line-num cursor-pointer px-1 rounded-sm transition-colors flex items-center justify-end ${
                            isHighlighted
                              ? 'bg-amber-500/20 text-amber-500 font-bold'
                              : isDark
                              ? 'hover:text-zinc-300'
                              : 'hover:text-zinc-700'
                          }`}
                          style={{
                            height: '22px',
                            lineHeight: '22px',
                            fontSize: '13px',
                          }}
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
                      className={isDark ? 'text-zinc-200' : 'text-zinc-800'}
                      style={{
                        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: 13,
                        lineHeight: '22px',
                        minHeight: '100%',
                        whiteSpace: 'pre',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Editor Bottom Status Bar */}
              <div className={`h-10 px-3 border-t flex items-center justify-between text-xs shrink-0 ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-50/90 border-zinc-200 text-zinc-600'
              }`}>
                <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 select-none">
                  <span>{formatLinesRu(code.split('\n').length)}</span>
                </div>

                <button
                  onClick={handleGenerateClick}
                  disabled={isGenerating}
                  className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-xs h-7 px-3 rounded-md shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isGenerating ? "Генерация..." : "Создать схему"}</span>
                  <kbd className="text-[10px] font-mono bg-emerald-700/80 text-emerald-100 border border-emerald-500/40 px-1 py-0.5 rounded leading-none">
                    Ctrl+Enter
                  </kbd>
                </button>
              </div>
            </div>
          )}

          {/* Interactive Pane Resizer */}
          {!viewMode && showSidebar && (
            <div
              onMouseDown={handleResizeMouseDown}
              className="hidden md:block w-1 relative shrink-0 cursor-col-resize hover:bg-zinc-400/50 active:bg-zinc-500 dark:hover:bg-zinc-500/50 transition-colors z-20 select-none group"
              title="Потяните для изменения ширины редактора"
            >
              <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
            </div>
          )}
          {!viewMode && !showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="hidden md:flex w-2.5 shrink-0 cursor-pointer border-r border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors z-20 items-center justify-center group"
              title="Открыть редактор кода"
            >
              <div className="w-1 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover:bg-zinc-500 dark:group-hover:bg-zinc-400 transition-colors" />
            </button>
          )}

          {/* Right Docked Panel: Diagram Preview & Canvas */}
          <div className={`flex-1 flex flex-col overflow-hidden relative transition-colors duration-150 ${
            isDark ? 'bg-zinc-950' : 'bg-zinc-100'
          }`}>
            {/* Top Toolbar */}
            <div className={`border-b z-20 flex flex-col shrink-0 transition-colors duration-150 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}>
              {/* Function Tabs if multiple graphs */}
              {!viewMode && graphs.length > 1 && (
                <div className={`flex px-2 pt-1 gap-1 overflow-x-auto border-b ${
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}>
                  {graphs.map((graph, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === idx
                          ? isDark
                            ? 'bg-zinc-950 text-zinc-100 border-t border-x border-zinc-800'
                            : 'bg-zinc-100 text-zinc-900 border-t border-x border-zinc-200'
                          : isDark
                          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                          : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                      }`}
                    >
                      {graph.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Main Canvas Controls Bar - Low-profile 36px cohesive horizontal bar */}
              <div className={`h-9 px-3 flex items-center justify-between gap-2 text-xs transition-colors ${
                isDark ? 'bg-zinc-900' : 'bg-white'
              }`}>
                {/* Left: Mode toggle (Авто / Ножницы) */}
                <div className="flex items-center gap-1.5">
                  <div className={`inline-flex p-0.5 rounded-md border gap-0.5 ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100/80 border-zinc-200'
                  }`}>
                    <button
                      onClick={() => {
                        setSplitMode('auto');
                        setIsScissorsMode(false);
                        localStorage.setItem('blockcraft_split_mode', 'auto');
                      }}
                      className={`h-6 px-2.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                        splitMode === 'auto'
                          ? isDark ? 'bg-zinc-800 text-zinc-100 shadow-2xs' : 'bg-white text-zinc-900 shadow-2xs'
                          : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
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
                      className={`h-6 px-2.5 flex items-center gap-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                        splitMode === 'manual'
                          ? isScissorsMode
                            ? isDark
                              ? 'bg-zinc-800 text-zinc-100 shadow-2xs ring-1 ring-zinc-700'
                              : 'bg-white text-zinc-900 shadow-2xs ring-1 ring-zinc-300'
                            : isDark ? 'bg-zinc-800/60 text-zinc-300' : 'bg-white/80 text-zinc-700'
                          : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <Scissors className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 stroke-zinc-600 dark:stroke-zinc-400 shrink-0" />
                      <span>Ножницы</span>
                    </button>
                  </div>

                  {splitMode === 'manual' && (customCuts[activeTab] || []).length > 0 && (
                    <button
                      onClick={() => {
                        const updated = { ...customCuts, [activeTab]: [] };
                        setCustomCuts(updated);
                        localStorage.setItem('blockcraft_custom_cuts', JSON.stringify(updated));
                      }}
                      className={`h-6 px-2 text-xs font-medium rounded border transition-colors cursor-pointer ${
                        isDark
                          ? 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700'
                          : 'text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border-zinc-200'
                      }`}
                      title="Очистить все разрезы"
                    >
                      Сброс разрезов
                    </button>
                  )}

                  {/* Quick Style & Font Switcher */}
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={() => setIsSettingsModalOpen(true)}
                      title="Выбрать стиль блок-схемы (20 вариантов) и шрифт (64 шрифта)"
                      className={`h-6 px-2 flex items-center gap-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      <Sliders className="w-3 h-3 text-blue-500 shrink-0" />
                      <span className="truncate max-w-[110px] text-[11px] font-semibold">{getDiagramStyle(diagramStyle).name}</span>
                      <span className="text-zinc-400">·</span>
                      <span className="truncate max-w-[90px] text-[11px] text-zinc-500 dark:text-zinc-400">
                        {FONTS_CATALOG.find(f => f.id === fontFamily)?.name || 'Шрифт'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        const randomStyle = DIAGRAM_STYLES[Math.floor(Math.random() * DIAGRAM_STYLES.length)];
                        const randomFont = FONTS_CATALOG[Math.floor(Math.random() * FONTS_CATALOG.length)];
                        setDiagramStyle(randomStyle.id);
                        setFontFamily(randomFont.id);
                        ensureFontLoaded(randomFont.id);
                        showToast(`Случайный стиль: ${randomStyle.name} + ${randomFont.name}`);
                      }}
                      title="Рандомизировать стиль и шрифт (уникальный вид схемы)"
                      className={`h-6 px-1.5 flex items-center justify-center rounded border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border-zinc-300'
                      }`}
                    >
                      <Shuffle className="w-3 h-3 text-amber-500 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Center: Pagination & Zoom Controls */}
                <div className="flex items-center gap-2">
                  {/* Pagination if multiple pages */}
                  {activeGraph && activeGraph.pages.length > 1 && (
                    <div className={`inline-flex rounded border overflow-hidden shadow-2xs ${
                      isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'
                    }`}>
                      <button
                        onClick={() => setActivePage(p => Math.max(0, p - 1))}
                        disabled={activePage === 0}
                        className="h-6 px-2 text-xs font-mono transition-colors cursor-pointer disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-800"
                      >
                        ←
                      </button>
                      <span className="h-6 px-2 flex items-center text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        {activePage + 1} / {activeGraph.pages.length}
                      </span>
                      <button
                        onClick={() => setActivePage(p => Math.min(activeGraph.pages.length - 1, p + 1))}
                        disabled={activePage === activeGraph.pages.length - 1}
                        className="h-6 px-2 text-xs font-mono transition-colors cursor-pointer disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-l border-zinc-200 dark:border-zinc-800"
                      >
                        →
                      </button>
                    </div>
                  )}

                  {/* Zoom Slider Control */}
                  <div className={`h-6 flex items-center px-2 rounded border gap-1.5 shadow-2xs ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                  }`}>
                    <span className="text-[10px] font-mono text-zinc-400 select-none uppercase">Zoom</span>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="w-16 sm:w-20 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-sm appearance-none cursor-pointer accent-zinc-700 dark:accent-zinc-300"
                      title={`Масштаб: ${Math.round(scale * 100)}%`}
                    />
                    <button
                      onClick={() => {
                        setScale(1);
                        setPan({ x: 0, y: 0 });
                      }}
                      className={`text-xs font-mono font-medium rounded transition-colors cursor-pointer px-1 text-center w-10 ${
                        isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-700 hover:text-zinc-900'
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
                      className="w-3.5 h-3.5 flex items-center justify-center transition-colors cursor-pointer text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      title="Центрировать (100%)"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Right: Segmented Export Buttons Group (Desktop & Tablet) */}
                <div className={`hidden sm:inline-flex h-6 rounded border overflow-hidden divide-x shadow-2xs ${
                  isDark
                    ? 'border-zinc-800 divide-zinc-800 bg-zinc-900'
                    : 'border-zinc-200 divide-zinc-200 bg-white'
                }`}>
                  <button
                    onClick={() => {
                      let name = activeGraph?.title || 'graph';
                      if (activeGraph && activeGraph.pages.length > 1) {
                        name += `_стр_${activePage + 1}`;
                      }
                      downloadSvg(`graph-svg-${activeTab}`, name);
                    }}
                    className="h-6 px-2.5 flex items-center gap-1 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Скачать векторный SVG"
                  >
                    SVG
                  </button>

                  <button
                    onClick={() => {
                      let name = activeGraph?.title || 'graph';
                      if (activeGraph && activeGraph.pages.length > 1) {
                        name += `_стр_${activePage + 1}`;
                      }
                      downloadPng(`graph-svg-${activeTab}`, name);
                    }}
                    className="h-6 px-2.5 flex items-center gap-1 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Скачать растровый PNG"
                  >
                    PNG
                  </button>

                  <button
                    onClick={() => {
                      let name = activeGraph?.title || 'graph';
                      if (activeGraph && activeGraph.pages.length > 1) {
                        name += `_стр_${activePage + 1}`;
                      }
                      downloadDrawio(name, fontFamily);
                    }}
                    className="h-6 px-2.5 flex items-center gap-1 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Экспорт в draw.io (.drawio)"
                  >
                    DRAW.IO
                  </button>
                </div>
              </div>
            </div>


          {/* Canvas Viewport: Supports Drag Panning, Mouse Wheel, Touch Pinch/Pan, Scaled Scissors and Dot-Grid background */}
          <div
            ref={canvasContainerRef}
            className={`flex-1 w-full h-full relative overflow-hidden select-none pb-16 md:pb-0 touch-none ${
              isScissorsMode ? 'cursor-cell' : isPanning ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              backgroundColor: isDark ? '#09090b' : '#fafafa',
              backgroundImage: isDark
                ? 'radial-gradient(#27272a 1.2px, transparent 1.2px)'
                : 'radial-gradient(#d4d4d8 1.2px, transparent 1.2px)',
              backgroundSize: '20px 20px',
            }}
            onTouchStart={handleCanvasTouchStart}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasTouchEnd}
            onTouchCancel={handleCanvasTouchEnd}
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
            {/* Stray corner toggle button removed. Panel toggling is now in header and on split divider */}
              {isScissorsMode && splitMode === 'manual' && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-medium rounded-md shadow-xl border border-zinc-700 dark:border-zinc-600 flex items-center gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-zinc-300 stroke-zinc-300" />
                    <span>Режим ножниц: кликните на схему для разделения страниц</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      onClick={() => setIsScissorsMode(false)}
                      className="px-2 py-0.5 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 rounded text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => setIsTipsModalOpen(true)}
                      className="px-2 py-0.5 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 rounded text-[11px] font-medium transition-colors cursor-pointer"
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
                    className={`overflow-visible bg-white border border-zinc-300 dark:border-zinc-700/80 shadow-md p-8 rounded-sm my-4 select-none ${isScissorsMode ? 'cursor-cell' : ''}`}
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
                      <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <polygon points="0 1, 7 4, 0 7" fill={getDiagramStyle(diagramStyle).strokeColor || "#18181b"} />
                      </marker>
                      <marker id="arrowhead-light" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <polygon points="0 1, 7 4, 0 7" fill={getDiagramStyle(diagramStyle).strokeColor || "#18181b"} />
                      </marker>
                      <marker id="arrowhead-dark" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <polygon points="0 1, 7 4, 0 7" fill={getDiagramStyle(diagramStyle).strokeColor || "#18181b"} />
                      </marker>
                      <filter id="rough-sketch" x="-5%" y="-5%" width="110%" height="110%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
                      </filter>
                    </defs>

                    {activeGraphPage.edges.map((edge, i) => (
                      <g key={edge.id || `edge-${i}`}>
                        <EdgePolyline edge={edge} theme="light" diagramStyle={diagramStyle} fontFamily={fontFamily} />
                      </g>
                    ))}

                    {activeGraphPage.nodes.map((node) => (
                      <g 
                        key={node.id} 
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                            if (isScissorsMode) return;
                            e.stopPropagation();
                            setSelectedElement({ type: 'node', id: node.id });
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
                          diagramStyle={diagramStyle}
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
                <div className="flex-1 flex flex-col items-center justify-center p-6 w-full h-full select-none animate-in fade-in duration-200">
                  {!user ? (
                    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl p-6 max-w-sm w-full flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
                      <SchematorLogo className="w-10 h-10 select-none shrink-0" />

                      <div className="flex flex-col gap-1.5">
                        <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                          Войдите, чтобы сохранять схемы
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed px-1">
                          Генерируйте блок-схемы по ГОСТ, сохраняйте историю в облаке и продолжайте работу с любого устройства
                        </p>
                      </div>

                      {/* Кнопки авторизации: Яндекс ID и Почта в едином чистом стиле */}
                      <div className="w-full flex flex-col gap-2 pt-0.5">
                        <button
                          onClick={() => handleLogin('yandex')}
                          className="w-full h-9 px-4 rounded-lg bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 font-medium text-xs shadow-2xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
                        >
                          <span className="w-4 h-4 rounded-full bg-[#FC3F1D] text-white flex items-center justify-center text-[10px] font-black leading-none shrink-0 select-none">
                            Я
                          </span>
                          <span>Войти через Яндекс ID</span>
                        </button>

                        <button
                          onClick={() => handleLogin('email')}
                          className="w-full h-9 px-4 rounded-lg bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 font-medium text-xs shadow-2xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
                        >
                          <Mail className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
                          <span>Войти по почте</span>
                        </button>
                      </div>

                      {/* Естественная спокойная подпись без баннеров и искусственных рамок */}
                      <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                        1 бесплатная схема начисляется сразу после входа
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 max-w-xs text-center flex flex-col items-center gap-2.5 shadow-2xs">
                      <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                        <Play className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        <span className="hidden md:inline">
                          Нажмите <strong className="text-zinc-800 dark:text-zinc-200 font-medium">«Создать схему»</strong> или сочетание <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">Ctrl+Enter</kbd>
                        </span>
                        <span className="md:hidden">
                          Нажмите кнопку <strong className="text-blue-600 dark:text-blue-400 font-medium">«Код»</strong> внизу, чтобы ввести алгоритм, или выберите <strong className="text-zinc-800 dark:text-zinc-200 font-medium">«Примеры»</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {authError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md text-xs font-medium text-red-600 dark:text-red-400 max-w-sm text-center">
                      <strong className="block mb-0.5 font-semibold">Ошибка авторизации</strong> 
                      {authError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

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
        onNotify={showToast}
      />

      {/* Locked Node Text Edit Modal (Centered on Screen & Prevents Panning/Dragging) */}
      {editingNode && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={() => setEditingNode(null)}
        >
          <div 
            className={`w-full max-w-md rounded-md border shadow-xl p-4 flex flex-col gap-3 animate-in zoom-in-95 duration-100 ${
              isDark ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-white text-zinc-800 border-zinc-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex justify-between items-center pb-2 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <h3 className={`font-semibold text-xs tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Редактирование текста блока
              </h3>
              <button 
                onClick={() => setEditingNode(null)} 
                className={`rounded p-1 transition-colors cursor-pointer ${
                  isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea 
              className={`w-full h-32 p-2.5 rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400 border transition-colors ${
                isDark 
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-100' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-800'
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
              <span className="text-zinc-500 font-mono text-[11px]">
                Сохранить: <kbd className="px-1 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">Ctrl+Enter</kbd>
              </span>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button"
                  onClick={() => setEditingNode(null)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
                  }`}
                >
                  Отмена
                </button>
                <button 
                  type="button"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 text-xs rounded-md font-medium transition-colors shadow-2xs cursor-pointer"
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
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 text-xs font-medium rounded-md shadow-xl border border-zinc-700 flex items-center gap-2.5 animate-in fade-in duration-150">
          <span className="text-zinc-300">Загружена схема из истории.</span>
          <button
            onClick={handleRestorePreviousCode}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium rounded-md shadow-lg border border-zinc-800 dark:border-zinc-200 animate-in fade-in duration-150 pointer-events-none flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Auth Modal for Yandex / Email */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={handleAuthSuccess} 
        onOpenLegal={(doc) => setLegalModalDoc(doc)}
        initialTab={authModalTab}
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
        theme={theme}
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

      {/* Settings Modal (20 Diagram Styles & 64 Fonts Browser) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        fontFamily={fontFamily}
        setFontFamily={(f) => {
          setFontFamily(f);
          localStorage.setItem('blockcraft_font', f);
          ensureFontLoaded(f);
        }}
        diagramStyle={diagramStyle}
        setDiagramStyle={(s) => {
          setDiagramStyle(s);
          localStorage.setItem('blockcraft_diagram_style', s);
        }}
        theme={theme}
        setTheme={(t) => {
          setTheme(t);
          localStorage.setItem('blockcraft_theme', t);
        }}
        splitMode={splitMode}
        setSplitMode={(m) => {
          setSplitMode(m);
          localStorage.setItem('blockcraft_split_mode', m);
        }}
        onNotify={showToast}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenCode={() => setIsMobileCodeOpen(true)}
        onGenerate={handleGenerateClick}
        isGenerating={isGenerating}
        onOpenExport={() => setIsMobileExportOpen(true)}
        onOpenPresets={() => setIsPresetsModalOpen(true)}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
        lineCount={code.split('\n').length}
        hasDiagram={graphs.length > 0}
      />

      {/* Mobile Code Editor Sheet */}
      <MobileCodeSheet
        isOpen={isMobileCodeOpen}
        onClose={() => setIsMobileCodeOpen(false)}
        code={code}
        setCode={setCode}
        language={language as 'python' | 'cpp'}
        setLanguage={(l) => {
          setLanguage(l);
          localStorage.setItem('blockcraft_language', l);
        }}
        onGenerate={() => {
          handleGenerateClick();
          setIsMobileCodeOpen(false);
        }}
        isGenerating={isGenerating}
        onOpenPresets={() => {
          setIsMobileCodeOpen(false);
          setIsPresetsModalOpen(true);
        }}
        isDark={isDark}
      />

      {/* Mobile Export Sheet */}
      <MobileExportSheet
        isOpen={isMobileExportOpen}
        onClose={() => setIsMobileExportOpen(false)}
        onDownloadSvg={() => {
          let name = activeGraph?.title || 'graph';
          if (activeGraph && activeGraph.pages.length > 1) {
            name += `_стр_${activePage + 1}`;
          }
          downloadSvg(`graph-svg-${activeTab}`, name);
        }}
        onDownloadPng={() => {
          let name = activeGraph?.title || 'graph';
          if (activeGraph && activeGraph.pages.length > 1) {
            name += `_стр_${activePage + 1}`;
          }
          downloadPng(`graph-svg-${activeTab}`, name);
        }}
        onDownloadDrawio={() => {
          let name = activeGraph?.title || 'graph';
          if (activeGraph && activeGraph.pages.length > 1) {
            name += `_стр_${activePage + 1}`;
          }
          downloadDrawio(name, fontFamily);
        }}
        activePage={activePage}
        totalPages={activeGraph?.pages.length || 1}
        onPageChange={setActivePage}
      />

      {/* Mobile Menu Drawer */}
      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        userTokens={userTokens}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenTariff={() => setIsTariffModalOpen(true)}
        onOpenPresets={() => setIsPresetsModalOpen(true)}
        onOpenTips={() => setIsTipsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenHistory={() => setIsMobileHistoryOpen(true)}
        onOpenLegal={(doc) => setLegalModalDoc(doc)}
        isDark={isDark}
        onToggleTheme={() => {
          const next = isDark ? 'light' : 'dark';
          setTheme(next);
          localStorage.setItem('blockcraft_theme', next);
        }}
      />

      {/* Mobile Diagram History Sheet */}
      {isMobileHistoryOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 animate-in slide-in-from-bottom duration-200">
          <div className="h-12 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-zinc-900">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <HistoryIcon className="w-4 h-4 text-zinc-500" />
              <span>История блок-схем</span>
            </div>
            <button
              onClick={() => setIsMobileHistoryOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <DiagramHistory
              user={user}
              currentCode={code}
              currentLanguage={language}
              onSelectDiagram={(selCode, selLang, selTitle) => {
                handleSelectDiagramFromHistory(selCode, selLang, selTitle);
                setIsMobileHistoryOpen(false);
              }}
              onOpenLogin={handleLogin}
              onNotify={showToast}
              theme={theme}
            />
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
