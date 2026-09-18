import React from 'react';
import { Code, Play, Download, Layers, Menu, Sparkles } from 'lucide-react';

interface MobileBottomNavProps {
  onOpenCode: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onOpenExport: () => void;
  onOpenPresets: () => void;
  onOpenMenu: () => void;
  lineCount: number;
  hasDiagram: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenCode,
  onGenerate,
  isGenerating,
  onOpenExport,
  onOpenPresets,
  onOpenMenu,
  lineCount,
  hasDiagram,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-2 py-1.5 pb-[max(8px,env(safe-area-inset-bottom))] shadow-lg select-none">
      <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
        {/* Кнопка "Код" */}
        <button
          type="button"
          onClick={onOpenCode}
          className="flex-1 py-1 px-1.5 flex flex-col items-center justify-center gap-1 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer relative"
        >
          <div className="relative">
            <Code className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
            {lineCount > 1 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                {lineCount > 99 ? '99+' : lineCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium leading-none">Код</span>
        </button>

        {/* Кнопка "Примеры" */}
        <button
          type="button"
          onClick={onOpenPresets}
          className="flex-1 py-1 px-1.5 flex flex-col items-center justify-center gap-1 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Layers className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
          <span className="text-[10px] font-medium leading-none">Примеры</span>
        </button>

        {/* Главная центральная кнопка: "Создать схему" */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex-1 -mt-4 py-2 px-1 flex flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
        >
          <Play className="w-5 h-5 fill-current" />
          <span className="text-[10px] font-bold leading-none tracking-tight">
            {isGenerating ? '...' : 'Создать'}
          </span>
        </button>

        {/* Кнопка "Экспорт" */}
        <button
          type="button"
          onClick={onOpenExport}
          disabled={!hasDiagram}
          className={`flex-1 py-1 px-1.5 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer ${
            hasDiagram
              ? 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              : 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
          }`}
        >
          <Download className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Экспорт</span>
        </button>

        {/* Кнопка "Меню" */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex-1 py-1 px-1.5 flex flex-col items-center justify-center gap-1 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
          <span className="text-[10px] font-medium leading-none">Меню</span>
        </button>
      </div>
    </div>
  );
};
