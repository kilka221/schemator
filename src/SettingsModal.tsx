import React from 'react';
import { X, Settings, Scissors, Sun, Moon, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontFamily: string;
  setFontFamily?: (font: string) => void;
  onFontChange?: (font: string) => void;
  theme: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  splitMode: 'auto' | 'manual';
  setSplitMode?: (mode: 'auto' | 'manual') => void;
  onSplitModeChange?: (mode: 'auto' | 'manual') => void;
  onResetCache?: () => void;
  onNotify?: (msg: string) => void;
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
  splitMode,
  setSplitMode,
  onSplitModeChange,
  onNotify,
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleTheme = (nextTheme: 'light' | 'dark') => {
    if (onThemeChange) onThemeChange(nextTheme);
    if (setTheme) setTheme(nextTheme);
  };

  const handleFont = (nextFont: string) => {
    if (onFontChange) onFontChange(nextFont);
    if (setFontFamily) setFontFamily(nextFont);
  };

  const handleSplitMode = (nextMode: 'auto' | 'manual') => {
    if (onSplitModeChange) onSplitModeChange(nextMode);
    if (setSplitMode) setSplitMode(nextMode);
  };

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-md rounded-md border shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 transition-colors ${
          isDark 
            ? 'bg-zinc-900 text-zinc-100 border-zinc-800' 
            : 'bg-white text-zinc-900 border-zinc-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-500" />
            <div>
              <h2 className={`text-xs font-bold tracking-tight uppercase ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Настройки
              </h2>
            </div>
          </div>
          <button 
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

        {/* Content */}
        <div className="p-4 space-y-4 text-xs">
          {/* Theme setting */}
          <div>
            <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              Тема интерфейса
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTheme('dark')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 font-semibold shadow-2xs'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Тёмная</span>
              </button>
              <button
                onClick={() => handleTheme('light')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white border-zinc-300 text-zinc-900 font-semibold shadow-2xs'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Светлая</span>
              </button>
            </div>
          </div>

          {/* Font setting */}
          <div>
            <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              Шрифт в схеме
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'monospace', label: 'Monospace (JetBrains Mono / Consolas)', desc: 'Стандартный моноширинный' },
                { id: 'Times New Roman, serif', label: 'Times New Roman (Serif)', desc: 'Классический для отчетов' },
                { id: 'Inter, sans-serif', label: 'Sans-serif (современный)', desc: 'Чистый гротеск без засечек' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFont(f.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                    fontFamily === f.id
                      ? isDark
                        ? 'bg-zinc-800 border-zinc-600 text-white font-medium'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-900 font-medium'
                      : isDark
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <div>
                    <span className="font-semibold block text-xs">{f.label}</span>
                    <span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{f.desc}</span>
                  </div>
                  {fontFamily === f.id && <Check className={`w-3.5 h-3.5 shrink-0 ml-2 ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`} />}
                </button>
              ))}
            </div>
          </div>

          {/* Split Mode */}
          <div>
            <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              Разбиение страниц
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  handleSplitMode('auto');
                  notify('Режим разбиения: Автоматический');
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                  splitMode === 'auto'
                    ? isDark 
                      ? 'bg-zinc-800 border-zinc-600 text-white font-medium'
                      : 'bg-white border-zinc-300 text-zinc-900 font-medium shadow-2xs'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span>Авто-разбиение</span>
              </button>
              <button
                onClick={() => {
                  handleSplitMode('manual');
                  notify('Режим ножниц активирован');
                }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                  splitMode === 'manual'
                    ? isDark
                      ? 'bg-zinc-800 border-zinc-600 text-white font-medium'
                      : 'bg-white border-zinc-300 text-zinc-900 font-medium shadow-2xs'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Ножницы</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-4 py-2.5 border-t flex items-center justify-end ${
          isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <button 
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
