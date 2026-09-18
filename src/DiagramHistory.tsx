import React, { useState, useEffect, useRef } from 'react';
import { 
  Pin, 
  PinOff, 
  Trash2, 
  Search, 
  Plus, 
  FolderOpen,
  LogIn,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { saveYdbDiagramItem, fetchYdbDiagrams, deleteYdbDiagramItem } from './ydbClient';
import { AppUserProfile } from './App';

export interface SavedDiagram {
  id: string;
  userId: string;
  title: string;
  code: string;
  language: 'python' | 'cpp';
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
}

export function detectLanguage(code: string, preferredLang?: string): 'python' | 'cpp' {
  if (preferredLang === 'cpp' || preferredLang === 'c_cpp') return 'cpp';
  const trimmed = code.trim();
  if (
    trimmed.includes('#include') ||
    trimmed.includes('using namespace') ||
    trimmed.includes('std::') ||
    trimmed.includes('cout <<') ||
    trimmed.includes('cin >>') ||
    /\b(int|void|double|float|char|bool)\s+main\s*\(/.test(trimmed) ||
    /\bvector\s*<.*?>/.test(trimmed) ||
    /\bprintf\s*\(/.test(trimmed) ||
    /\bscanf\s*\(/.test(trimmed)
  ) {
    return 'cpp';
  }
  return preferredLang === 'cpp' ? 'cpp' : 'python';
}

interface DiagramHistoryProps {
  user: AppUserProfile | null;
  currentCode: string;
  currentLanguage: string;
  onSelectDiagram: (code: string, language: 'python' | 'cpp', title?: string) => void;
  onOpenLogin?: () => void;
  onNotify: (msg: string) => void;
  theme?: 'light' | 'dark';
}

export const DiagramHistory: React.FC<DiagramHistoryProps> = ({
  user,
  currentCode,
  currentLanguage,
  onSelectDiagram,
  onOpenLogin,
  onNotify,
}) => {
  const [diagrams, setDiagrams] = useState<SavedDiagram[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customSaveTitle, setCustomSaveTitle] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // If user is not logged in, clear local history and do not allow saving
  useEffect(() => {
    localStorage.removeItem('blockcraft_local_history');
    if (!user) {
      setDiagrams([]);
      return;
    }

    fetchYdbDiagrams(user.uid, user.email).then((ydbItems) => {
      const formatted: SavedDiagram[] = ydbItems.map((y) => {
        const detectedLang = detectLanguage(y.code || '', y.language);
        let title = y.title || 'Безымянная схема';
        if (detectedLang === 'cpp' && (title === 'Схема Python' || title.startsWith('Схема Python ('))) {
          title = title.replace('Схема Python', 'Схема C++');
        }
        return {
          id: y.id,
          userId: user.uid,
          title,
          code: y.code || '',
          language: detectedLang,
          createdAt: y.createdAt || new Date().toISOString(),
          updatedAt: y.updatedAt || y.createdAt || new Date().toISOString(),
          isPinned: !!y.isPinned,
        };
      });

      formatted.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });

      setDiagrams(formatted);
    }).catch((err) => {
      console.warn('YDB fetch diagrams error:', err);
    });
  }, [user]);

  // Save current code as a new diagram in history
  const handleSaveCurrent = async () => {
    if (!user) {
      onNotify('Войдите в аккаунт, чтобы сохранять схемы в историю');
      onOpenLogin?.();
      return;
    }

    if (!currentCode.trim()) {
      onNotify('Редактор пуст — нечего сохранять');
      return;
    }

    const detectedLang = detectLanguage(currentCode, currentLanguage);
    const title = customSaveTitle.trim() || generateDefaultTitle(currentCode, detectedLang);
    const now = new Date().toISOString();
    const id = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const lang = detectedLang;

    const newDiagram: SavedDiagram = {
      id,
      userId: user.uid,
      title,
      code: currentCode,
      language: lang,
      createdAt: now,
      updatedAt: now,
      isPinned: false,
    };

    try {
      await saveYdbDiagramItem(user.uid, newDiagram);
      setDiagrams((prev) => [newDiagram, ...prev]);
      onNotify(`Схема «${title}» сохранена`);
    } catch (e) {
      console.error('Error saving to YDB:', e);
      onNotify('Ошибка сохранения в БД');
    }

    setCustomSaveTitle('');
    setShowSaveInput(false);
  };

  const generateDefaultTitle = (sourceCode: string, lang: string) => {
    const isCpp = lang === 'cpp' || detectLanguage(sourceCode, lang) === 'cpp';
    const lines = sourceCode.split('\n').map(l => l.trim()).filter(Boolean);
    
    if (isCpp) {
      for (const line of lines) {
        const cppFunc = line.match(/^(?:(?:inline|static|const|virtual|constexpr)\s+)*(?:[a-zA-Z0-9_:<>&*]+\s+)+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:const)?\s*\{?/);
        if (cppFunc && !['if', 'while', 'for', 'switch', 'main'].includes(cppFunc[1])) {
          return `Функция ${cppFunc[1]}()`;
        }
      }
      const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `Схема C++ (${dateStr})`;
    } else {
      for (const line of lines) {
        const pyFunc = line.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (pyFunc) return `Функция ${pyFunc[1]}()`;
      }
      const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `Схема Python (${dateStr})`;
    }
  };

  const handleTogglePin = async (diagram: SavedDiagram, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const newPinned = !diagram.isPinned;
    const updatedDiag = { ...diagram, isPinned: newPinned, updatedAt: new Date().toISOString() };

    try {
      await saveYdbDiagramItem(user.uid, updatedDiag);
      setDiagrams((prev) => 
        prev.map((d) => (d.id === diagram.id ? updatedDiag : d))
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
      );
      onNotify(newPinned ? 'Схема закреплена' : 'Схема откреплена');
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleStartRename = (diag: SavedDiagram, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(diag.id);
    setEditingTitle(diag.title);
  };

  const handleCancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditingTitle('');
  };

  const handleSaveRename = async (diag: SavedDiagram, e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    if (!user) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      onNotify('Название схемы не может быть пустым');
      return;
    }
    if (trimmed === diag.title) {
      setEditingId(null);
      return;
    }

    setIsSavingEdit(true);
    const updatedDiag: SavedDiagram = {
      ...diag,
      title: trimmed,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveYdbDiagramItem(user.uid, updatedDiag);
      setDiagrams((prev) => prev.map((d) => (d.id === diag.id ? updatedDiag : d)));
      onNotify(`Схема переименована в «${trimmed}»`);
      setEditingId(null);
    } catch (err) {
      console.error('Error renaming diagram:', err);
      onNotify('Ошибка сохранения нового названия');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteYdbDiagramItem(user.uid, id);
      setDiagrams((prev) => prev.filter((d) => d.id !== id));
      onNotify('Схема удалена');
    } catch (err) {
      console.error('Error deleting diagram:', err);
    }
  };

  // If not logged in, prompt user to log in
  if (!user) {
    return (
      <div className="my-1 p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-md flex flex-col items-center text-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150 select-none">
        <LogIn className="w-4 h-4 text-zinc-400 mt-0.5" />
        <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight">
          История доступна только после входа в аккаунт
        </div>
        <button
          onClick={() => onOpenLogin?.()}
          className="w-full py-1 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <LogIn className="w-3 h-3" />
          <span>Войти</span>
        </button>
      </div>
    );
  }

  // Filtered diagrams
  const filteredDiagrams = diagrams.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.language.includes(q);
  });

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="my-1 py-1.5 px-1 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-md flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 text-xs select-none">
      {/* Top Header inside inline history */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold">
          Схемы ({diagrams.length})
        </span>

        <button
          onClick={() => setShowSaveInput(!showSaveInput)}
          title="Сохранить текущую схему в историю"
          className="text-[10px] font-medium flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Сохранить</span>
        </button>
      </div>

      {/* Quick Save Input Box */}
      {showSaveInput && (
        <div className="p-1.5 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5 shadow-2xs">
          <input
            type="text"
            value={customSaveTitle}
            onChange={(e) => setCustomSaveTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCurrent();
              if (e.key === 'Escape') setShowSaveInput(false);
            }}
            placeholder="Название схемы..."
            className="w-full px-2 py-1 text-[11px] rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            autoFocus
          />
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setShowSaveInput(false)}
              className="px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveCurrent}
              className="px-2.5 py-0.5 text-[10px] bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded font-medium transition-colors cursor-pointer"
            >
              ОК
            </button>
          </div>
        </div>
      )}

      {/* Search Input when diagram count > 3 */}
      {diagrams.length > 3 && (
        <div className="relative px-0.5">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-6 pr-2 py-1 text-[11px] rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>
      )}

      {/* Scrollable Diagram List */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
        {filteredDiagrams.length === 0 ? (
          <div className="py-3 px-2 text-center text-[11px] text-zinc-400 flex flex-col items-center gap-1">
            <FolderOpen className="w-4 h-4 opacity-40" />
            <span>{searchQuery ? 'Ничего не найдено' : 'История пуста'}</span>
          </div>
        ) : (
          filteredDiagrams.map((diag) => (
            <div
              key={diag.id}
              onClick={() => {
                if (editingId === diag.id) return;
                onSelectDiagram(diag.code, diag.language, diag.title);
              }}
              className="group relative flex items-center justify-between p-1.5 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-800/80 transition-all cursor-pointer shadow-2xs"
              title={editingId === diag.id ? undefined : "Нажмите для открытия схемы в редакторе"}
            >
              {editingId === diag.id ? (
                <div 
                  className="flex items-center gap-1.5 w-full min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded shrink-0 border ${
                    diag.language === 'cpp'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                  }`}>
                    {diag.language === 'cpp' ? 'C++' : 'PY'}
                  </span>
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(diag, e);
                      if (e.key === 'Escape') handleCancelRename(e as any);
                    }}
                    placeholder="Название схемы..."
                    className="flex-1 min-w-0 px-1.5 py-0.5 text-[11px] rounded bg-zinc-50 dark:bg-zinc-950 border border-blue-500 dark:border-blue-400 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                    autoFocus
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleSaveRename(diag, e)}
                      disabled={isSavingEdit}
                      title="Сохранить название (Enter)"
                      className="p-1 rounded text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCancelRename(e)}
                      disabled={isSavingEdit}
                      title="Отмена (Esc)"
                      className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 min-w-0 pr-1 flex-1">
                    <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded shrink-0 border ${
                      diag.language === 'cpp'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                    }`}>
                      {diag.language === 'cpp' ? 'C++' : 'PY'}
                    </span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span 
                        onDoubleClick={(e) => handleStartRename(diag, e)}
                        className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-zinc-900 dark:group-hover:text-white"
                        title="Нажмите для открытия, дважды — для переименования"
                      >
                        {diag.title}
                      </span>
                      <span className="text-[9px] text-zinc-400 truncate">
                        {formatDate(diag.updatedAt || diag.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => handleStartRename(diag, e)}
                      title="Переименовать схему"
                      className="p-1 rounded text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleTogglePin(diag, e)}
                      title={diag.isPinned ? 'Открепить' : 'Закрепить'}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        diag.isPinned
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                          : 'text-zinc-400 hover:text-amber-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {diag.isPinned ? <PinOff className="w-3 h-3 text-amber-500" /> : <Pin className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={(e) => handleDelete(diag.id, e)}
                      title="Удалить"
                      className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
