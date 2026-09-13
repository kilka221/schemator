import React from 'react';
import { X, Settings, Scissors, Trash2, Sun, Moon, Check } from 'lucide-react';

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
  onResetCache: () => void;
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
  onResetCache,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-md rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-colors ${
          isDark 
            ? 'bg-[#0f172a] text-slate-100 border-slate-700/80' 
            : 'bg-white text-slate-800 border-slate-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-800 bg-[#131d38]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              isDark 
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' 
                : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Настройки Схематора
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Параметры отображения и генерации
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isDark 
                ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Theme setting */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Тема интерфейса сайта
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleTheme('dark')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : isDark
                      ? 'bg-[#131b2e] border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Тёмная (Dark)</span>
              </button>
              <button
                onClick={() => handleTheme('light')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 font-bold'
                    : isDark
                      ? 'bg-[#131b2e] border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Светлая (Light)</span>
              </button>
            </div>
          </div>

          {/* Font setting */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Шрифт текста в блок-схеме
            </label>
            <div className="space-y-2">
              {[
                { id: 'monospace', label: 'Monospace (по умолчанию)', desc: 'Чёткий моноширинный технический шрифт' },
                { id: 'Times New Roman, serif', label: 'Times New Roman (ГОСТ 19.701-90)', desc: 'Классический стандарт для курсовых и отчетов' },
                { id: 'Inter, sans-serif', label: 'Sans-serif (современный)', desc: 'Элегантный гротеск без засечек' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFont(f.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                    fontFamily === f.id
                      ? isDark
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-blue-50 border-blue-500 text-blue-900'
                      : isDark
                        ? 'bg-[#131b2e] border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <span className="font-semibold block text-sm">{f.label}</span>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{f.desc}</span>
                  </div>
                  {fontFamily === f.id && <Check className={`w-4 h-4 shrink-0 ml-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />}
                </button>
              ))}
            </div>
          </div>

          {/* Split Mode */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Режим разбиения на страницы
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  handleSplitMode('auto');
                  notify('Режим разбиения: Автоматический');
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  splitMode === 'auto'
                    ? isDark 
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-blue-50 border-blue-500 text-blue-600'
                    : isDark
                      ? 'bg-[#131b2e] border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Авто-разбиение</span>
              </button>
              <button
                onClick={() => {
                  handleSplitMode('manual');
                  notify('Режим ножниц активирован');
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  splitMode === 'manual'
                    ? isDark
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-blue-50 border-blue-500 text-blue-600'
                    : isDark
                      ? 'bg-[#131b2e] border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Ручной (ножницы)</span>
              </button>
            </div>
          </div>

          {/* Reset cache */}
          <div className={`pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              onClick={() => {
                onResetCache();
                notify('Кэш перемещений и разрезов успешно сброшен');
              }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isDark 
                  ? 'border-red-500/30 bg-red-950/20 hover:bg-red-900/30 text-red-400'
                  : 'border-red-200 bg-red-50 hover:bg-red-100 text-red-600'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Сбросить ручные перемещения и кэш</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-end ${
          isDark ? 'border-slate-800 bg-[#131d38]' : 'border-slate-200 bg-slate-50'
        }`}>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
