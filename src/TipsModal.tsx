import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Palette, 
  Scissors, 
  FileCode2, 
  Download, 
  Keyboard, 
  Check, 
  Copy,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export interface TipCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: {
    title: string;
    description?: string;
    content: string;
    codeExample?: string;
  }[];
}

export const TIPS_DATA: TipCategory[] = [
  {
    id: 'styles',
    title: 'Стили и шрифты',
    icon: <Palette className="w-4 h-4 shrink-0" />,
    items: [
      {
        title: '20 стилей оформления блок-схем',
        description: 'Настройка геометрии, линий и скруглений под требования ГОСТ или кафедры.',
        content: `Схематор включает 20 готовых визуальных стилей:\n
• Классический ГОСТ 19.701-90 — стандартные прямоугольники, ромбы решений, овалы начала/конца с черными линиями.
• Минималистичный (Modern Minimal) — тонкие линии 1.2px, чистый вид для отчетов и статей.
• Брутализм (Neo-Brutalism) — плотные контуры 2.5px, жесткие контрастные тени.
• Мягкий Soft / Rounded — плавные скругленные углы блоков.
• Пастельный Инженер — цветные полупрозрачные подложки блоков.
• Технический Blueprint — стиль схемотехники и САПР с чертежными синими акцентами.
• Инверсный Dark — темный контрастный режим для презентаций.
• Изумрудный Emerald — фирменный стиль Схематора.
• А также: Скандинавский, Монохром, Винтаж, Изометрия и другие.`,
      },
      {
        title: 'Шрифты по ГОСТу и категориям',
        description: 'Чертежные, академические, гротески и моноширинные шрифты.',
        content: `• Чертежные шрифты ГОСТ (ГОСТ 2.304-81): ГОСТ тип А, ГОСТ тип Б, ISOCPEUR, Технический ЕСКД.
• Академические с засечками: Times New Roman, PT Serif, Merriweather, Lora, Cormorant (для отчетов в Word и дипломов).
• Инженерные гротески: Inter, Fira Sans, Roboto, Montserrat, Open Sans.
• Моноширинные: JetBrains Mono, Fira Code, Source Code Pro, Consolas (для кода и формул).`,
      },
      {
        title: 'Случайный стиль (Рандомизатор 🔀)',
        description: 'Быстрый подбор уникального внешнего вида схемы.',
        content: 'Кнопка со стрелками (🔀) на верхней панели схемы или в настройках случайным образом комбинирует стиль геометрии и гармоничный шрифт. Удобно, чтобы работы одногруппников не выглядели одинаково.',
      }
    ]
  },
  {
    id: 'scissors',
    title: 'Ножницы и деление',
    icon: <Scissors className="w-4 h-4 shrink-0" />,
    items: [
      {
        title: 'Ручной разрез длинных схем (Ножницы ✂️)',
        description: 'Разделение алгоритма на страницы с ГОСТ-соединителями.',
        content: `1. Переключите режим деления на «Ножницы» на верхней панели.
2. Кликните мышкой по нужной стрелке или блоку на холсте схемы.
3. Схема разделится на страницы с круглыми ГОСТ-соединителями (1, 2, 3...).
4. Для возврата нажмите кнопку «Сбросить» рядом с ножницами.`,
      },
      {
        title: 'Автоматическое деление (Режим «Авто»)',
        description: 'Умная компоновка схемы под стандартный лист А4.',
        content: 'В режиме «Авто» алгоритм сам рассчитывает высоту блоков, предотвращая разрыв условий и циклов пополам.',
      }
    ]
  },
  {
    id: 'syntax',
    title: 'Синтаксис и @print',
    icon: <FileCode2 className="w-4 h-4 shrink-0" />,
    items: [
      {
        title: 'Принудительный вывод текста: @print(...)',
        description: 'Как отобразить текстовые сообщения на блок-схеме.',
        content: `По умолчанию Схематор скрывает чисто текстовые принты (меню, разделители "===", подсказки консоли), чтобы схема была компактной по ГОСТу.\n
Чтобы конкретная фраза гарантированно появилась как параллелограмм «Вывод», поставьте @ перед print:`,
        codeExample: `# Текстовый print скроется как интерфейсный:
print("=== МЕНЮ ===")

# С собачкой @ он обязательно появится на блок-схеме:
@print("Привет, пользователь!")
@print("Расчет завершен успешно")`,
      },
      {
        title: 'Ввод и вывод переменных (input, print, cin, cout)',
        description: 'Автоматическое создание параллелограммов ввода и вывода.',
        content: 'Команды с переменными (input, print(x), print(f"..."), cin >> x, cout << res) автоматически распознаются как ГОСТ-блоки «Ввод» и «Вывод».',
        codeExample: `x = int(input("Введите x: "))
res = x ** 2 + 10
print(f"Результат: {res}")`,
      },
      {
        title: 'Вкладки для функций (def / void)',
        description: 'Отдельная схема для каждой функции в коде.',
        content: 'Для каждой функции создается отдельная вкладка над холстом. Основной код выносится во вкладку «Основная программа (Main)».',
      }
    ]
  },
  {
    id: 'export',
    title: 'Экспорт схем',
    icon: <Download className="w-4 h-4 shrink-0" />,
    items: [
      {
        title: 'Векторный SVG (Для Word и дипломов)',
        content: 'Вставляется в Microsoft Word, LibreOffice и LaTeX как четкая векторная графика без потери качества при любой печати.',
      },
      {
        title: 'Растровый PNG (High-DPI)',
        content: 'Экспорт с высоким разрешением и прозрачным фоном для быстрой вставки в любые программы и мессенджеры.',
      },
      {
        title: 'Файл DRAW.IO (.drawio)',
        content: 'Открывается на сайте draw.io (diagrams.net). Все блоки, стрелки и тексты остаются полностью редактируемыми.',
      }
    ]
  },
  {
    id: 'hotkeys',
    title: 'Горячие клавиши',
    icon: <Keyboard className="w-4 h-4 shrink-0" />,
    items: [
      {
        title: 'Комбинации клавиш и управление холстом',
        content: `• Ctrl + Enter (⌘ + Enter) — Сгенерировать схему из кода
• Ctrl + S (⌘ + S) — Сохранить схему в историю
• Колесико мыши — Масштабирование схемы (Zoom)
• Перетаскивание мышью — Панорамирование схемы
• Двойной клик — Сброс масштаба к 100%`,
      }
    ]
  }
];

interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCode?: (code: string) => void;
  onOpenSettings?: () => void;
  onOpenTariffs?: () => void;
  theme?: 'light' | 'dark';
}

export const TipsModal: React.FC<TipsModalProps> = ({
  isOpen,
  onClose,
  onInsertCode,
  onOpenSettings,
  theme = 'dark',
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('styles');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const currentCat = TIPS_DATA.find(c => c.id === activeCategory) || TIPS_DATA[0];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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
        {/* Header matching other modals */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-zinc-500" />
            <h2 className={`text-xs font-bold tracking-tight uppercase ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}>
              Справка
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

        {/* Content with Sidebar tabs */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0 text-xs">
          {/* Left Navigation Sidebar */}
          <div className={`w-full sm:w-48 border-b sm:border-b-0 sm:border-r p-2.5 space-y-1 shrink-0 overflow-y-auto ${
            isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/60'
          }`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2.5 py-1 block">
              Разделы
            </span>

            {TIPS_DATA.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'bg-zinc-200/80 text-zinc-900 font-semibold'
                      : isDark
                        ? 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                        : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900'
                  }`}
                >
                  <span className={isActive ? (isDark ? 'text-zinc-100' : 'text-zinc-900') : 'text-zinc-400'}>
                    {cat.icon}
                  </span>
                  <span className="truncate">{cat.title}</span>
                </button>
              );
            })}
          </div>

          {/* Right Content Area */}
          <div className={`flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 ${
            isDark ? 'bg-zinc-900' : 'bg-white'
          }`}>
            <div className={`pb-2 border-b flex items-center justify-between ${
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">{currentCat.icon}</span>
                <h3 className={`text-xs font-bold uppercase tracking-tight ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}>
                  {currentCat.title}
                </h3>
              </div>

              {currentCat.id === 'styles' && onOpenSettings && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className={`text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                    isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <span>Настройки стилей</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {currentCat.items.map((item, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-md border ${
                    isDark 
                      ? 'bg-zinc-950/40 border-zinc-800/80' 
                      : 'bg-zinc-50/70 border-zinc-200'
                  }`}
                >
                  <h4 className={`text-xs font-semibold mb-1 ${
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  }`}>
                    {item.title}
                  </h4>

                  {item.description && (
                    <p className={`text-[11px] mb-2 leading-relaxed ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}>
                      {item.description}
                    </p>
                  )}

                  <div className={`text-xs leading-relaxed whitespace-pre-line font-normal ${
                    isDark ? 'text-zinc-300' : 'text-zinc-700'
                  }`}>
                    {item.content}
                  </div>

                  {item.codeExample && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Пример:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.codeExample!)}
                            className={`flex items-center gap-1 cursor-pointer transition-colors ${
                              copiedCode === item.codeExample
                                ? 'text-emerald-500 font-medium'
                                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                          >
                            {copiedCode === item.codeExample ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>Скопировано</span>
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
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                                isDark
                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800 border border-zinc-300'
                              }`}
                            >
                              Вставить
                            </button>
                          )}
                        </div>
                      </div>

                      <pre className="p-2.5 rounded bg-zinc-950 text-zinc-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-800 select-all">
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
        <div className={`px-4 py-2.5 border-t flex items-center justify-end text-xs shrink-0 ${
          isDark 
            ? 'border-zinc-800 bg-zinc-900' 
            : 'border-zinc-200 bg-zinc-50'
        }`}>
          <button 
            type="button"
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-md border font-medium text-xs transition-colors cursor-pointer ${
              isDark 
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' 
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200'
            }`}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
