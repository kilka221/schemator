import React, { useState, useMemo } from 'react';
import { 
  X, 
  Settings, 
  Scissors, 
  Sun, 
  Moon, 
  Check, 
  Type, 
  Layers, 
  Search, 
  Sliders,
  Sparkles,
  Shuffle
} from 'lucide-react';
import { FONTS_CATALOG, FontItem, ensureFontLoaded } from './fonts';
import { DIAGRAM_STYLES, DiagramStyleConfig, getDiagramStyle } from './diagramStyles';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontFamily: string;
  setFontFamily?: (font: string) => void;
  onFontChange?: (font: string) => void;
  diagramStyle: string;
  setDiagramStyle?: (style: string) => void;
  onDiagramStyleChange?: (style: string) => void;
  theme: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  splitMode: 'auto' | 'manual';
  setSplitMode?: (mode: 'auto' | 'manual') => void;
  onSplitModeChange?: (mode: 'auto' | 'manual') => void;
  onResetCache?: () => void;
  onNotify?: (msg: string) => void;
  initialTab?: 'styles' | 'fonts' | 'general';
}

/**
 * Mini vector preview of a diagram style showing Start, Process, and Rhombus blocks
 */
const StyleMiniPreview: React.FC<{ style: DiagramStyleConfig; isSelected: boolean }> = ({ style, isSelected }) => {
  const scale = 0.38;
  const w = style.nodeWidth * scale;
  const startH = (style.startBaseHeight || 38) * scale;
  const h = style.baseHeight * scale;
  const rhH = (style.rhombusBaseHeight || 46) * scale;
  const strokeW = Math.max(1, style.strokeWidth * scale * 1.5);
  const filter = style.isRough ? 'url(#modal-rough-preview)' : undefined;

  const baseStroke = style.strokeColor || '#3f3f46';
  const strokeColor = isSelected ? '#2563eb' : baseStroke;
  const fillColor = '#ffffff';

  const startY = 15;
  const processY = 44;
  const rhY = 73;

  return (
    <div className="w-full h-24 bg-zinc-50 dark:bg-zinc-950/60 rounded border border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-2 relative overflow-hidden">
      <svg width="220" height="90" viewBox="0 0 220 90" className="select-none">
        <defs>
          <filter id="modal-rough-preview" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* Start block - uniform width w, narrow vertical height startH */}
        <g transform={`translate(110, ${startY})`}>
          <rect 
            x={-w / 2} 
            y={-startH / 2} 
            width={w} 
            height={startH} 
            rx={startH / 2} 
            ry={startH / 2} 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth={strokeW} 
            filter={filter}
          />
          <text 
            x="0" 
            y="1" 
            textAnchor="middle" 
            dominantBaseline="central" 
            fontSize="7" 
            fontWeight={style.fontWeight} 
            fill="#27272a"
          >
            Начало
          </text>
        </g>

        {/* Arrow 1 */}
        <line x1="110" y1={startY + startH / 2} x2="110" y2={processY - h / 2} stroke={strokeColor} strokeWidth={strokeW} />

        {/* Process block - uniform width w */}
        <g transform={`translate(110, ${processY})`}>
          <rect 
            x={-w / 2} 
            y={-h / 2} 
            width={w} 
            height={h} 
            rx={style.processRx || 0} 
            ry={style.processRx || 0} 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth={strokeW} 
            filter={filter}
          />
          <text 
            x="0" 
            y="1" 
            textAnchor="middle" 
            dominantBaseline="central" 
            fontSize="6.5" 
            fontWeight={style.fontWeight} 
            fill="#27272a"
          >
            x = a + b
          </text>
        </g>

        {/* Arrow 2 */}
        <line x1="110" y1={processY + h / 2} x2="110" y2={rhY - rhH / 2} stroke={strokeColor} strokeWidth={strokeW} />

        {/* Rhombus decision block - uniform width w */}
        <g transform={`translate(110, ${rhY})`}>
          <polygon 
            points={`0,${-rhH / 2} ${w / 2},0 0,${rhH / 2} ${-w / 2},0`} 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth={strokeW} 
            filter={filter}
          />
          <text 
            x="0" 
            y="1" 
            textAnchor="middle" 
            dominantBaseline="central" 
            fontSize="6.5" 
            fontWeight={style.fontWeight} 
            fill="#27272a"
          >
            x &gt; 0?
          </text>
        </g>
      </svg>
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  fontFamily,
  setFontFamily,
  onFontChange,
  diagramStyle,
  setDiagramStyle,
  onDiagramStyleChange,
  theme,
  setTheme,
  onThemeChange,
  splitMode,
  setSplitMode,
  onSplitModeChange,
  onNotify,
  initialTab = 'styles'
}) => {
  const [activeTab, setActiveTab] = useState<'styles' | 'fonts' | 'general'>(initialTab);
  const [fontSearch, setFontSearch] = useState('');
  const [fontCategory, setFontCategory] = useState<string>('all');
  const [styleSearch, setStyleSearch] = useState('');

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

  const handleStyle = (nextStyle: string) => {
    if (onDiagramStyleChange) onDiagramStyleChange(nextStyle);
    if (setDiagramStyle) setDiagramStyle(nextStyle);
    const styleObj = getDiagramStyle(nextStyle);
    if (onNotify) {
      onNotify(`Выбран стиль: «${styleObj.name}»`);
    }
  };

  const handleSplitMode = (nextMode: 'auto' | 'manual') => {
    if (onSplitModeChange) onSplitModeChange(nextMode);
    if (setSplitMode) setSplitMode(nextMode);
  };

  // Randomizer: pick a random style & font combo
  const handleRandomize = () => {
    const randomStyle = DIAGRAM_STYLES[Math.floor(Math.random() * DIAGRAM_STYLES.length)];
    const randomFont = FONTS_CATALOG[Math.floor(Math.random() * FONTS_CATALOG.length)];
    handleStyle(randomStyle.id);
    handleFont(randomFont.id);
    if (onNotify) {
      onNotify(`🎲 Уникальная комбинация: «${randomStyle.name}» + ${randomFont.name}`);
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

  // Filter styles
  const filteredStyles = DIAGRAM_STYLES.filter((s) => {
    const q = styleSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || 
      s.description.toLowerCase().includes(q) || 
      (s.badge && s.badge.toLowerCase().includes(q)) ||
      s.tags.some(t => t.toLowerCase().includes(q));
  });

  const currentStyleObj = getDiagramStyle(diagramStyle);
  const currentFontObj = FONTS_CATALOG.find(f => f.id === fontFamily) || FONTS_CATALOG[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-4xl max-h-[92vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 transition-colors ${
          isDark 
            ? 'bg-zinc-900 text-zinc-100 border-zinc-800' 
            : 'bg-white text-zinc-900 border-zinc-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isDark ? 'border-zinc-800 bg-zinc-900/90' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">
                  Оформление и стили блок-схем
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                  Анти-плагиат препод
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                20 уникальных стилей геометрии + 64 шрифта, чтобы схемы не выглядели одинаково
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomize}
              title="Сгенерировать случайный уникальный стиль и шрифт"
              className="px-2.5 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Случайный стиль</span>
            </button>
            <button 
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark 
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' 
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex items-center gap-1 px-5 border-b text-xs font-medium ${
          isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-100/60'
        }`}>
          <button
            onClick={() => setActiveTab('styles')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'styles'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                : isDark
                  ? 'border-transparent text-zinc-400 hover:text-zinc-200'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Стили схем (20)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {currentStyleObj.name.split(' ')[0]}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fonts')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'fonts'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                : isDark
                  ? 'border-transparent text-zinc-400 hover:text-zinc-200'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Шрифты ({FONTS_CATALOG.length})</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 truncate max-w-[110px]">
              {currentFontObj.name}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'general'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                : isDark
                  ? 'border-transparent text-zinc-400 hover:text-zinc-200'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Разбиение и тема</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-5 text-xs">
          {/* ========================================================= */}
          {/* TAB 1: 20 DIAGRAM STYLES */}
          {/* ========================================================= */}
          {activeTab === 'styles' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Выберите стиль оформления. Меняются пропорции, вытянутость ромбов, овал старта, толщина линий и кегль, но семантика ГОСТ строго сохраняется:
                  </p>
                </div>
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type="text"
                    value={styleSearch}
                    onChange={(e) => setStyleSearch(e.target.value)}
                    placeholder="Поиск по стилям..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  {styleSearch && (
                    <button 
                      onClick={() => setStyleSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of 20 styles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredStyles.map((s) => {
                  const isSelected = diagramStyle === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleStyle(s.id)}
                      className={`rounded-lg border p-3.5 flex flex-col justify-between transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30 shadow-md'
                          : isDark
                            ? 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-850'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      {/* Mini vector preview */}
                      <div className="mb-2.5">
                        <StyleMiniPreview style={s} isSelected={isSelected} />
                      </div>

                      <div>
                        <div className="flex items-start justify-between gap-1.5 mb-1">
                          <h3 className={`text-xs font-bold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                            {s.name}
                          </h3>
                          {s.badge && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                              {s.badge}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] leading-relaxed mb-3 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          {s.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[10px] px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                            {s.nodeWidth}px
                          </span>
                          <span className="text-[10px] px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                            {s.strokeWidth}мм
                          </span>
                          <span className="text-[10px] px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                            {s.fontSize}pt
                          </span>
                        </div>

                        {isSelected ? (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            <Check className="w-3.5 h-3.5" />
                            <span>Активен</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 font-medium">
                            Выбрать →
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: 64 FONTS BROWSER */}
          {/* ========================================================= */}
          {activeTab === 'fonts' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  {[
                    { id: 'all', label: `Все (${FONTS_CATALOG.length})` },
                    { id: 'gost', label: 'ГОСТ и чертёжные' },
                    { id: 'serif', label: 'Академические (Serif)' },
                    { id: 'sans', label: 'Гротески (Sans)' },
                    { id: 'mono', label: 'Моноширинные' },
                    { id: 'handwriting', label: 'Рукописные / Скетч' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFontCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        fontCategory === cat.id
                          ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                          : isDark
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-60 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Поиск шрифта..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  {fontSearch && (
                    <button 
                      onClick={() => setFontSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Fonts List */}
              <div className="space-y-2">
                {filteredFonts.map((f) => {
                  const isSelected = fontFamily === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleFont(f.id)}
                      onMouseEnter={() => ensureFontLoaded(f)}
                      className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30 font-semibold'
                          : isDark
                            ? 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-800/60'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{f.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {f.categoryLabel}
                          </span>
                        </div>
                        <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {f.desc}
                        </span>
                      </div>

                      {/* Live font sample preview */}
                      <div 
                        className="flex-1 px-3 py-1.5 rounded bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800 text-sm overflow-hidden text-ellipsis whitespace-nowrap text-zinc-900 dark:text-zinc-100"
                        style={{ fontFamily: f.id }}
                      >
                        ГОСТ 19.701: if (count &gt; 0) return true;
                      </div>

                      <div className="shrink-0 flex items-center justify-end">
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            <Check className="w-4 h-4" />
                            <span>Выбран</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 hover:text-zinc-600">
                            Применить
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: GENERAL & SPLIT MODE */}
          {/* ========================================================= */}
          {activeTab === 'general' && (
            <div className="max-w-lg space-y-6">
              {/* Theme */}
              <div>
                <label className={`block text-[10px] font-mono uppercase tracking-wider mb-2 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  Тема интерфейса
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleTheme('dark')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100 font-semibold shadow-2xs ring-1 ring-zinc-600'
                        : isDark
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Тёмная тема</span>
                  </button>
                  <button
                    onClick={() => handleTheme('light')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white border-zinc-300 text-zinc-900 font-semibold shadow-2xs ring-1 ring-zinc-300'
                        : isDark
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Светлая тема</span>
                  </button>
                </div>
              </div>

              {/* Split Mode */}
              <div>
                <label className={`block text-[10px] font-mono uppercase tracking-wider mb-2 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  Разбиение на страницы
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      handleSplitMode('auto');
                      if (onNotify) onNotify('Режим разбиения: Автоматический');
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      splitMode === 'auto'
                        ? isDark 
                          ? 'bg-zinc-800 border-zinc-600 text-white font-medium ring-1 ring-zinc-600'
                          : 'bg-white border-zinc-300 text-zinc-900 font-medium shadow-2xs ring-1 ring-zinc-300'
                        : isDark
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <span className="font-semibold">Авто-разбиение</span>
                    <span className="text-[10px] text-zinc-500">Автоматически по высоте страницы</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSplitMode('manual');
                      if (onNotify) onNotify('Режим ножниц активирован');
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      splitMode === 'manual'
                        ? isDark
                          ? 'bg-zinc-800 border-zinc-600 text-white font-medium ring-1 ring-zinc-600'
                          : 'bg-white border-zinc-300 text-zinc-900 font-medium shadow-2xs ring-1 ring-zinc-300'
                        : isDark
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Scissors className="w-3.5 h-3.5" />
                      <span className="font-semibold">Ножницы</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Ручной разрез схемы кликом</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between ${
          isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span>Текущий стиль:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentStyleObj.name}</span>
            <span>•</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentFontObj.name}</span>
          </div>

          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
