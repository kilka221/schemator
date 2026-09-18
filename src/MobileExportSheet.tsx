import React from 'react';
import { X, Download, FileImage, FileCode, Layers } from 'lucide-react';

interface MobileExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadSvg: () => void;
  onDownloadPng: () => void;
  onDownloadDrawio: () => void;
  activePage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const MobileExportSheet: React.FC<MobileExportSheetProps> = ({
  isOpen,
  onClose,
  onDownloadSvg,
  onDownloadPng,
  onDownloadDrawio,
  activePage,
  totalPages,
  onPageChange,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 rounded-t-2xl p-4 flex flex-col gap-3 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[max(16px,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle & Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="w-full flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Экспорт блок-схемы
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Page Selector if multi-page */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Страница для экспорта:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(0, activePage - 1))}
                disabled={activePage === 0}
                className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold disabled:opacity-30 bg-white dark:bg-zinc-900"
              >
                ←
              </button>
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                {activePage + 1} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(totalPages - 1, activePage + 1))}
                disabled={activePage === totalPages - 1}
                className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold disabled:opacity-30 bg-white dark:bg-zinc-900"
              >
                →
              </button>
            </div>
          </div>
        )}

        {/* Export Options */}
        <div className="flex flex-col gap-2">
          {/* PNG Option */}
          <button
            onClick={() => {
              onDownloadPng();
              onClose();
            }}
            className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors flex items-center gap-3 text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileImage className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Скачать изображение (PNG)
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Растровое изображение для отчётов, курсовых и мессенджеров
              </div>
            </div>
            <Download className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>

          {/* SVG Option */}
          <button
            onClick={() => {
              onDownloadSvg();
              onClose();
            }}
            className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors flex items-center gap-3 text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Векторный формат (SVG)
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Максимальное качество без потери чёткости при масштабировании
              </div>
            </div>
            <Download className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>

          {/* Draw.io Option */}
          <button
            onClick={() => {
              onDownloadDrawio();
              onClose();
            }}
            className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors flex items-center gap-3 text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Файл для Draw.io (.drawio)
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Для редактирования блоков и стрелок в diagrams.net
              </div>
            </div>
            <Download className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
