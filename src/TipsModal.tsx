import React, { useState } from 'react';
import { 
  X, 
  Lightbulb, 
  Scissors, 
  Move, 
  MousePointerClick, 
  FileCode2, 
  Download, 
  Sparkles, 
  HelpCircle, 
  Check, 
  Copy,
  Layers,
  ArrowRight,
  BookOpen
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
        detail: '1. Переключите режим деления на «✂️» на верхней панели схемы.\n2. Наведите курсор на холст схемы — появится прицел и линия разреза.\n3. Кликните мышкой в нужную точку — схема мгновенно разделится на страницы с ГОСТ-соединителями.\n4. Чтобы вернуть всё назад, нажмите кнопку «Очистить всё» рядом с ножницами.',
        tag: 'ГОСТ 19.701-90',
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
  },
  {
    id: 'interaction',
    title: 'Интерактивность и фишки',
    icon: <MousePointerClick className="w-4 h-4 text-amber-500" />,
    color: 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400',
    items: [
      {
        title: 'Синхронизация: клик по номеру строки',
        description: 'Нажмите на номер строки слева в редакторе кода, чтобы моментально найти блок на схеме.',
        detail: 'Schemator автоматически переключит вкладку, перелистнет на нужную страницу и подсветит блок жёлтой рамкой с пульсацией.',
        tag: 'Быстрый поиск',
      },
      {
        title: 'Ручное перемещение блоков (Drag & Drop)',
        description: 'Любой блок на схеме можно схватить мышкой и подвинуть в удобное место.',
        detail: 'Стрелочки автоматически перестраиваются за двигающимся блоком. Если захотите вернуть первоначальную идеальную сетку — нажмите кнопку «Сбросить кэш» на панели справа.',
      },
      {
        title: 'Защита от случайной очистки кода',
        description: 'Если вы случайно нажали корзину или загрузили другую схему из истории, внизу появится баннер «Восстановить».',
        detail: 'Один клик восстанавливает весь ваш исходный код обратно.',
      }
    ]
  },
  {
    id: 'export',
    title: 'Экспорт и вставка в отчет',
    icon: <Download className="w-4 h-4 text-emerald-500" />,
    color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    items: [
      {
        title: 'Экспорт в Draw.io (.drawio XML)',
        description: 'Открывайте схему в diagrams.net или Draw.io для доработки или изменения цветов.',
        detail: 'Скачанный файл сохраняет все векторные фигуры, тексты и стрелки ГОСТ, полностью совместимые с десктопным и веб-приложением Draw.io.',
        tag: 'Для дипломов',
      },
      {
        title: 'Векторный SVG и четкий PNG',
        description: 'SVG идеально вставляется в Microsoft Word, LibreOffice и LaTeX без потери качества при любой печати.',
        detail: 'PNG скачивается в двойном разрешении Retina, чтобы линии и шрифты оставались кристально четкими даже при сильном зуме.',
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
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl my-auto bg-white dark:bg-[#1E1E24] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 border-b border-zinc-100 dark:border-zinc-800/80 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Справка и полезные фишки Schemator
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  Шпаргалка
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Как пользоваться ножницами, символом @, перемещением блоков и ГОСТ-разрывами
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area with Tabs */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#18181C] p-3 sm:p-4 space-y-1.5 shrink-0 overflow-y-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3 pb-1 block">
              Разделы помощи
            </span>
            {TIPS_DATA.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2.5 transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={isActive ? 'text-white' : ''}>{cat.icon}</span>
                    <span className="truncate">{cat.title}</span>
                  </div>
                  {cat.badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    }`}>
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-zinc-200/80 dark:border-zinc-800 px-3 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              💡 <strong>Совет:</strong> Любой блок можно кликнуть в коде слева, чтобы моментально сфокусировать схему на нем.
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 p-5 sm:p-7 overflow-y-auto space-y-5 bg-white dark:bg-[#1E1E24]">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                {currentCat.icon}
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {currentCat.title}
              </h3>
            </div>

            <div className="space-y-4">
              {currentCat.items.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl bg-zinc-50/80 dark:bg-[#24242A] border border-zinc-200/70 dark:border-zinc-800/80 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.tag && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300/60 dark:border-zinc-700">
                            {item.tag}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#1A1A1E] p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 whitespace-pre-line font-normal">
                    {item.detail}
                  </div>

                  {item.codeExample && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        <span>Пример оформления:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.codeExample!)}
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {copiedCode === item.codeExample ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500">Скопировано!</span>
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
                              className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition shadow-xs"
                            >
                              Вставить в редактор
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className="p-3 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-800 select-all">
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
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-[#18181C] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Все созданные схемы соответствуют стандарту ГОСТ 19.701-90 (ИСО 5807-85)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold transition cursor-pointer"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
