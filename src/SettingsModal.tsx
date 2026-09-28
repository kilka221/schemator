import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Sun, 
  Moon, 
  Check, 
  Type, 
  Search, 
  Palette
} from 'lucide-react';
import { FONTS_CATALOG, ensureFontLoaded } from './fonts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontFamily: string;
  setFontFamily?: (font: string) => void;
  onFontChange?: (font: string) => void;
  theme: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  onNotify?: (msg: string) => void;
  // Legacy optional props to prevent type breakage
  diagramStyle?: string;
  setDiagramStyle?: (style: string) => void;
  splitMode?: 'auto' | 'manual' | 'none';
  setSplitMode?: (mode: 'auto' | 'manual' | 'none') => void;
  initialTab?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  fontFamily,
  setFontFamily,
  onFontChange,
  theme,
  setTheme,
  onThemeChange,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'fonts' | 'theme'>('fonts');
  const [fontSearch, setFontSearch] = useState('');
  const [fontCategory, setFontCategory] = useState<string>('all');

  // Auto ensure selected font is loaded
  React.useEffect(() => {
    if (fontFamily) {
      ensureFontLoaded(fontFamily);
    }
  }, [fontFamily]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleTheme = (nextTheme: 'light' | 'dark') => {
    if (onThemeChange) onThemeChange(nextTheme);
    if (setTheme) setTheme(nextTheme);
    if (onNotify) {
      onNotify(nextTheme === 'dark' ? 'Включена тёмная тема' : 'Включена светлая тема');
    }
  };

  const handleFont = (nextFont: string) => {
    ensureFontLoaded(nextFont);
    if (onFontChange) onFontChange(nextFont);
    if (setFontFamily) setFontFamily(nextFont);
    if (onNotify) {
      const item = FONTS_CATALOG.find(f => f.id === nextFont);
      onNotify(`Выбран шрифт: ${item?.name || nextFont}`);
    }
  };

  // Filter fonts
  const filteredFonts = FONTS_CATALOG.filter((f) => {
    const matchesSearch = 
      f.name.toLowerCase().includes(fontSearch.toLowerCase()) || 
      f.desc.toLowerCase().includes(fontSearch.toLowerCase());
    const matchesCategory = fontCategory === 'all' || f.category === fontCategory;
    return matchesSearch && matchesCategory;
  });

  const currentFontObj = FONTS_CATALOG.find(f => f.id === fontFamily) || FONTS_CATALOG[0];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-3xl h-[560px] max-h-[85vh] rounded-md border shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 transition-colors ${
          isDark 
            ? 'bg-zinc-900 text-zinc-100 border-zinc-800' 
            : 'bg-white text-zinc-900 border-zinc-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Identical to TipsModal */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-500" />
            <h2 className={`text-xs font-bold tracking-tight uppercase ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}>
              Настройки
            </h2>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isDark 
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content with Sidebar tabs - Identical layout to TipsModal */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0 text-xs">
          {/* Left Navigation Sidebar */}
          <div className={`w-full sm:w-48 border-b sm:border-b-0 sm:border-r p-2.5 space-y-1 shrink-0 overflow-y-auto ${
            isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/60'
          }`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2.5 py-1 block">
              Разделы
            </span>

            <button
              onClick={() => setActiveTab('fonts')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md font-medium transition-colors cursor-pointer text-left ${
                activeTab === 'fonts'
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-100 shadow-2xs font-semibold'
                    : 'bg-zinc-200/80 text-zinc-900 shadow-2xs font-semibold'
                  : isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 shrink-0 text-zinc-400" />
                <span>Шрифты</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
              }`}>
                {FONTS_CATALOG.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('theme')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md font-medium transition-colors cursor-pointer text-left ${
                activeTab === 'theme'
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-100 shadow-2xs font-semibold'
                    : 'bg-zinc-200/80 text-zinc-900 shadow-2xs font-semibold'
                  : isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 shrink-0 text-zinc-400" />
                <span>Тема оформления</span>
              </div>
            </button>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {/* ========================================================= */}
            {/* SECTION 1: FONTS SELECTION */}
            {/* ========================================================= */}
            {activeTab === 'fonts' && (
              <div className="space-y-4">
                {/* Active Font Preview Banner */}
                <div className={`p-3 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-zinc-400 mb-0.5">
                      Текущий шрифт схемы
                    </div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {currentFontObj.name}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {currentFontObj.desc}
                    </div>
                  </div>
                  <div 
                    style={{ fontFamily: currentFontObj.id }}
                    className={`text-sm px-3 py-1.5 rounded border select-none shrink-0 ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
                    }`}
                  >
                    АБВГД abcdef 123 y = f(x)
                  </div>
                </div>

                {/* Search & Categories Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {[
                      { id: 'all', label: 'Все' },
                      { id: 'gost', label: 'ГОСТ и чертёжные' },
                      { id: 'serif', label: 'Академические' },
                      { id: 'sans', label: 'Гротески' },
                      { id: 'mono', label: 'Моно' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setFontCategory(cat.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                          fontCategory === cat.id
                            ? isDark
                              ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-semibold'
                              : 'bg-zinc-900 text-white border-zinc-900 font-semibold'
                            : isDark
                              ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                              : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-56 shrink-0">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="text"
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                      placeholder="Поиск шрифта..."
                      className={`w-full pl-8 pr-7 py-1 text-xs rounded border transition-colors focus:outline-hidden focus:ring-1 ${
                        isDark 
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200 focus:ring-zinc-400 placeholder-zinc-500' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-800 focus:ring-zinc-600 placeholder-zinc-400'
                      }`}
                    />
                    {fontSearch && (
                      <button 
                        onClick={() => setFontSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Fonts List */}
                <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-1">
                  {filteredFonts.map((f) => {
                    const isSelected = fontFamily === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => handleFont(f.id)}
                        className={`p-2.5 rounded-md border flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? isDark
                              ? 'bg-zinc-800 border-zinc-500 shadow-2xs'
                              : 'bg-zinc-100 border-zinc-400 shadow-2xs'
                            : isDark
                              ? 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700'
                              : 'bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${isSelected ? (isDark ? 'text-white' : 'text-zinc-900') : ''}`}>
                              {f.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                              • {f.categoryLabel}
                            </span>
                          </div>
                          <div 
                            style={{ fontFamily: f.id }}
                            className={`text-xs truncate mt-0.5 ${
                              isDark ? 'text-zinc-300' : 'text-zinc-700'
                            }`}
                          >
                            АБВГДЕЖ abcdefgh 12345 y = a + b * c
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isSelected ? (
                            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              <Check className="w-4 h-4" />
                              <span>Выбран</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                              Выбрать
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredFonts.length === 0 && (
                    <div className="py-8 text-center text-zinc-400 text-xs">
                      Шрифты не найдены. Попробуйте изменить запрос.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 2: THEME SELECTION */}
            {/* ========================================================= */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Цветовая тема интерфейса
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Выберите оформление рабочей области приложения. Настройка сохраняется в браузере.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Dark Theme Card */}
                  <div
                    onClick={() => handleTheme('dark')}
                    className={`p-4 rounded-md border flex flex-col justify-between transition-colors cursor-pointer ${
                      isDark
                        ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-800/80 shadow-2xs'
                        : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100'
                    }`}
                  >
                    <div>
                      {/* Dark Mock Preview Box */}
                      <div className="w-full h-24 rounded border border-zinc-700 bg-zinc-950 p-2.5 flex flex-col justify-between mb-3 select-none">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-zinc-700" />
                            <div className="w-12 h-2 rounded bg-zinc-800" />
                          </div>
                          <div className="w-4 h-2 rounded bg-zinc-800" />
                        </div>
                        <div className="flex gap-2 flex-1 pt-2">
                          <div className="w-1/3 h-full rounded bg-zinc-900 border border-zinc-800 p-1 flex flex-col gap-1">
                            <div className="w-full h-1.5 rounded bg-zinc-800" />
                            <div className="w-3/4 h-1.5 rounded bg-zinc-800" />
                          </div>
                          <div className="w-2/3 h-full rounded bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-center">
                            <div className="w-8 h-4 rounded border border-zinc-700" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4 text-zinc-400" />
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            Тёмная тема
                          </span>
                        </div>
                        {isDark && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            <Check className="w-3.5 h-3.5" />
                            <span>Активна</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        Контрастный темный интерфейс для снижения усталости глаз.
                      </p>
                    </div>
                  </div>

                  {/* Light Theme Card */}
                  <div
                    onClick={() => handleTheme('light')}
                    className={`p-4 rounded-md border flex flex-col justify-between transition-colors cursor-pointer ${
                      !isDark
                        ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-100 shadow-2xs'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-850'
                    }`}
                  >
                    <div>
                      {/* Light Mock Preview Box */}
                      <div className="w-full h-24 rounded border border-zinc-200 bg-white p-2.5 flex flex-col justify-between mb-3 select-none">
                        <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-zinc-300" />
                            <div className="w-12 h-2 rounded bg-zinc-200" />
                          </div>
                          <div className="w-4 h-2 rounded bg-zinc-200" />
                        </div>
                        <div className="flex gap-2 flex-1 pt-2">
                          <div className="w-1/3 h-full rounded bg-zinc-50 border border-zinc-200 p-1 flex flex-col gap-1">
                            <div className="w-full h-1.5 rounded bg-zinc-200" />
                            <div className="w-3/4 h-1.5 rounded bg-zinc-200" />
                          </div>
                          <div className="w-2/3 h-full rounded bg-zinc-50/60 border border-zinc-200/60 flex items-center justify-center">
                            <div className="w-8 h-4 rounded border border-zinc-300" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4 text-zinc-400" />
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            Светлая тема
                          </span>
                        </div>
                        {!isDark && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            <Check className="w-3.5 h-3.5" />
                            <span>Активна</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        Классическое светлое оформление для дневной работы и печати.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
