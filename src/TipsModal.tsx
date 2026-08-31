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
        <div className="px-6 py-5 sm:px-8 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-b from-blue-50/60 to-transparent dark:from-blue-950/30 dark:to-transparent flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-xs">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Справка и полезные фишки Schemator
                </h2>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                  Шпаргалка
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-normal">
                Как пользоваться ножницами, символом @, перемещением блоков и ГОСТ-разрывами
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition cursor-pointer"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area with Tabs */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-[#18181C] p-4 sm:p-5 space-y-2 shrink-0 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3 pb-2 block">
                Разделы помощи
              </span>
              {TIPS_DATA.map((cat) => {
                const isActive = cat.id === activeCategory;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className={isActive ? 'text-white [&_svg]:w-5 [&_svg]:h-5' : '[&_svg]:w-5 [&_svg]:h-5'}>{cat.icon}</span>
                      <span className="truncate">{cat.title}</span>
                    </div>
                    {cat.badge && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                      }`}>
                        {cat.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-5 mt-4 border-t border-zinc-200 dark:border-zinc-800 px-3 py-2 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
              💡 <strong className="text-amber-800 dark:text-amber-300">Совет:</strong> Любой блок можно кликнуть в коде слева, чтобы моментально сфокусировать схему на нем.
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 bg-white dark:bg-[#1E1E24]">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
              <span className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 [&_svg]:w-5 [&_svg]:h-5">
                {currentCat.icon}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                {currentCat.title}
              </h3>
            </div>

            <div className="space-y-5">
              {currentCat.items.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-5 sm:p-6 rounded-2xl bg-zinc-50/90 dark:bg-[#24242A] border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2.5 flex-wrap">
                        <span>{item.title}</span>
                        {item.tag && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300/80 dark:border-zinc-700 font-mono">
                            {item.tag}
                          </span>
                        )}
                      </h4>
                      <p className="text-sm sm:text-[15px] text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed font-normal">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm sm:text-[14.5px] leading-relaxed text-zinc-800 dark:text-zinc-200 bg-white dark:bg-[#1A1A1E] p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 whitespace-pre-line font-normal">
                    {item.detail}
                  </div>

                  {item.codeExample && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs sm:text-[13px] font-semibold text-zinc-600 dark:text-zinc-400">
                        <span>Пример оформления:</span>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.codeExample!)}
                            className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                          >
                            {copiedCode === item.codeExample ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500 font-bold">Скопировано!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
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
                              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                              Вставить в редактор
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className="p-4 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto border border-zinc-800 select-all">
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
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181C] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Все созданные схемы соответствуют стандарту ГОСТ 19.701-90 (ИСО 5807-85)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-sm transition cursor-pointer shadow-sm active:scale-95"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
