import React, { useState } from 'react';
import { 
  X, 
  Lightbulb, 
  Scissors, 
  FileCode2, 
  Check, 
  Copy
} from 'lucide-react';

export interface TipCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
  items: {
    title: string;
    description: string;
    detail: string;
    codeExample?: string;
    tag?: string;
  }[];
}

export const TIPS_DATA: TipCategory[] = [
  {
    id: 'scissors',
    title: 'Режим ножниц и деление',
    icon: <Scissors className="w-4 h-4 text-rose-500" />,
    color: 'border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400',
    badge: 'Новинка',
    items: [
      {
        title: 'Ручной разрез длинных схем (ножницы ✂️)',
        description: 'Позволяет разделить длинный алгоритм на несколько страниц именно в том месте, где вам нужно.',
        detail: '1. Переключите режим деления на «✂️» на верхней панели схемы.\n2. Наведите курсор на холст схемы — появится прицел и линия разреза.\n3. Кликните мышкой в нужную точку — схема мгновенно разделится на страницы с соединителями.\n4. Чтобы вернуть всё назад, нажмите кнопку «Очистить всё» рядом с ножницами.',
      },
      {
        title: 'Автоматическое деление (Авто)',
        description: 'Schemator сам рассчитывает высоту блоков и аккуратно разбивает схему под стандартную страницу А4.',
        detail: 'В режиме «Авто» алгоритм автоматически переносит ветвления и циклы так, чтобы блоки не обрезались пополам.',
      }
    ]
  },
  {
    id: 'syntax',
    title: 'Синтаксис, собачка @ и код',
    icon: <FileCode2 className="w-4 h-4 text-blue-500" />,
    color: 'border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400',
    badge: 'Секрет @',
    items: [
      {
        title: 'Принудительный вывод текста через собачку: @print(...)',
        description: 'Позволяет принудительно отобразить текстовый print("...") на блок-схеме.',
        detail: 'По умолчанию Schemator скрывает чисто текстовые принты (меню, разделители "===", подсказки в консоли), чтобы схема оставалась компактной по ГОСТу.\n\nЕсли вы хотите, чтобы конкретная текстовая фраза ОБЯЗАТЕЛЬНО появилась на блок-схеме как параллелограмм «Вывод» — просто добавьте символ @ перед print:\n\n@print("Привет, мир!")  ->  [ Вывод: "Привет, мир!" ]\n@print("Расчет завершен успешно")',
        codeExample: `# Обычный print с чистым текстом скроется как интерфейсный:\nprint("=== ГЛАВНОЕ МЕНЮ ===")\n\n# Но с собачкой @ он ОБЯЗАТЕЛЬНО появится в блок-схеме:\n@print("Привет, пользователь!")\n@print("Операция выполнена успешно")`,
        tag: 'Фишка @print',
      },
      {
        title: 'Ввод и вывод переменных (input, print)',
        description: 'Автоматическое распознавание параллелограммов ввода/вывода с переменными.',
        detail: 'Команды с переменными (input(), print(x), print(f"Итог: {res}")) автоматически создают ГОСТ-параллелограммы «Ввод» и «Вывод».',
        codeExample: `x = input("Введите число: ")   # -> [ Ввод x ]\nres = x * 2\nprint(f"Результат: {res}")     # -> [ Вывод res ]`,
      },
      {
        title: 'Каждая функция — отдельная вкладка',
        description: 'Если в коде объявлено несколько функций (def), для каждой создается своя вкладка схемы.',
        detail: 'Основной скрипт вне функций выносится во вкладку «Основная программа (Main)». Переключайтесь между ними по вкладкам сверху схемы.',
      }
    ]
  }
];

interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCode?: (code: string) => void;
}

export const TipsModal: React.FC<TipsModalProps> = ({
  isOpen,
  onClose,
  onInsertCode,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('scissors');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCat = TIPS_DATA.find(c => c.id === activeCategory) || TIPS_DATA[0];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-md shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-zinc-500" />
            <div>
              <h2 className="text-xs font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100">
                Справка и возможности
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area with Tabs */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden text-xs">
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-2.5 space-y-1 shrink-0 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 py-1 block">
                Разделы
              </span>
              {TIPS_DATA.map((cat) => {
                const isActive = cat.id === activeCategory;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="shrink-0">{cat.icon}</span>
                      <span className="truncate">{cat.title}</span>
                    </div>
                    {cat.badge && (
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded border bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700">
                        {cat.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-500">
                {currentCat.icon}
              </span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {currentCat.title}
              </h3>
            </div>

            <div className="space-y-3">
              {currentCat.items.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-md bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                        <span>{item.title}</span>
                        {item.tag && (
                          <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                            {item.tag}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-2.5 rounded border border-zinc-200 dark:border-zinc-800 whitespace-pre-line font-normal">
                    {item.detail}
                  </div>

                  {item.codeExample && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
                        <span>Пример кода:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.codeExample!)}
                            className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                          >
                            {copiedCode === item.codeExample ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500 font-mono">Скопировано</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Скопировать</span>
                              </>
                            )}
                          </button>
                          {onInsertCode && (
                            <button
                              type="button"
                              onClick={() => {
                                onInsertCode(item.codeExample!);
                                onClose();
                              }}
                              className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              Вставить
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className="p-2.5 rounded bg-zinc-950 text-zinc-100 font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-800 select-all">
                        {item.codeExample}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-end text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-medium text-xs transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
