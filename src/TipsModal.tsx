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
        title: '17 визуальных стилей оформления',
        description: 'Точная геометрия блоков, линий и стрелок под стандарты ГОСТ, методички и университетские требования.',
        content: `Схематор поддерживает 17 детально настроенных стилей оформления:\n
• draw.io / Diagrams.net (По умолчанию) — эталонный современный стиль: четкие линии 1.4px, плоские ромбы (40px), узкий терминатор «Начало/Конец» (32px) и шрифт Arial.
• draw.io Серый монохром (Slate Gray) — элегантный графитовый контур (#4b5563) и плоские пропорции в стиле веб-редактора draw.io.
• Курсовая работа в Word (Times) — строгий академический отчет для Microsoft Word: тонкие линии 1.5px, узкие блоки и гарнитура Times New Roman / PT Serif.
• Классический ЕСКД ГОСТ 19.701-90 — стандартные пропорции ГОСТ, пропорциональные овалы начала/конца и строгие чертежные рамки.
• Microsoft Visio (Инженерный) — характерная эстетика схем Visio с аккуратными пропорциями и шрифтом Segoe UI.
• ГОСТ с плоским «Начало/Конец» (32px) — строгие чертежные параллелограммы и ромбы с уменьшенной высотой терминаторов.
• Узкая колонка (195px) — компактная ширина блоков для узких листов, двухколоночных статей и мобильных экранов.
• Школьная информатика / ЕГЭ (Поляков) — стиль популярных учебных пособий К. Полякова и Л. Босовой с ясными ветками ДА/НЕТ.
• Чертежный Компас / ГОСТ 2.304 — стиль инженерных САПР с чертежным моноширинным шрифтом.
• А также: Плоские ромбы условий, Контрастный черный (2.0px), PascalABC.NET, Dia Diagram Editor (Linux), Минималистичная лабораторная, Техникум/Колледж (Calibri), IT-бакалавриат (Fira Code) и Архивный ГОСТ СССР.`,
      },
      {
        title: 'Каталог шрифтов по ГОСТу и категориям',
        description: 'Более 25 шрифтов: чертежные, моноширинные, академические с засечками и современные гротески.',
        content: `• ГОСТ и чертёжные моноширинные: JetBrains Mono, Roboto Mono, PT Mono, Share Tech Mono, Consolas, Courier New.
• Академические с засечками (для Word и дипломов): Times New Roman, PT Serif, Merriweather, Lora, Cormorant Garamond, EB Garamond.
• Инженерные гротески (Sans-Serif): Inter, Roboto, Arial, Fira Sans, Montserrat, Open Sans.
• Шрифты программного кода: Fira Code, Source Code Pro, Anonymous Pro, Inconsolata.`,
      },
      {
        title: 'Случайный стиль (Рандомизатор 🔀)',
        description: 'Мгновенный подбор уникальной комбинации оформления.',
        content: 'Кнопка со стрелками (🔀) на панели инструментов генерирует случайное гармоничное сочетание стиля геометрии и подходящего шрифта. Удобно, чтобы работы одногруппников визуально отличались друг от друга.',
      }
    ]
  },
  {
    id: 'splitting',
    title: 'Режимы страниц',
    icon: <Scissors className="w-4 h-4 shrink-0" />,
    items: [
      {
        title: 'Режим «Авто» (Разбиение под А4)',
        description: 'Автоматическая компоновка алгоритма на стандартные страницы.',
        content: 'В режиме «Авто» длинная блок-схема автоматически делится на вертикальные листы А4. Места межстраничных переходов соединяются круглыми ГОСТ-соединителями (A, B, C...) с сохранением целостности циклов и условий.',
      },
      {
        title: 'Режим «Вручную» (Интерактивные ножницы ✂️)',
        description: 'Точный контроль мест разреза блок-схемы на страницы.',
        content: `При переключении на режим «Вручную» на холсте включается режим ножниц:\n
• Кликните на пунктирную линию с иконкой ножниц между любыми блоками, чтобы установить разрез страницы именно в этом месте.
• Повторный клик по крестику на линии разреза удаляет его.
• Кнопка «Сбросить разрезы» возвращает схему к исходному виду.`,
      },
      {
        title: 'Режим «Без деления» (Единый холст)',
        description: 'Построение алгоритма одним непрерывным потоком.',
        content: 'В режиме «Без деления» схема строится на сплошном вертикальном полотне любой высоты без межстраничных разрывов. Идеально подходит для веб-просмотра и экспорта длинного алгоритма в один файл.',
      }
    ]
  },
  {
    id: 'syntax',
    title: 'Языки и синтаксис',
    icon: <FileCode2 className="w-4 h-4 shrink-0" />,
    items: [
      {
        title: 'Поддержка 4 языков программирования',
        description: 'Python, C++, C# и Java с полной поддержкой синтаксиса.',
        content: `Схематор анализирует реальный синтаксис исходного кода и строит корректную ГОСТ-логику:\n
• Python — условия if/elif/else, циклы for/while, сопоставление match/case, блоки try/except, with.
• C++ — функция main(), пользовательские функции, cin/cout, циклы for, while, do-while, switch/case.
• C# — Console.ReadLine(), Console.WriteLine(), управляющие конструкции и методы.
• Java — Scanner, System.out.println(), циклы, условия и структуры методов.`,
      },
      {
        title: 'Принудительный вывод текста: @print(...)',
        description: 'Как отобразить текстовые сообщения на блок-схеме.',
        content: `По умолчанию Схематор скрывает чисто интерфейсные сообщения (приглашения к вводу, разделители "===", подсказки консоли), чтобы блок-схема оставалась лаконичной по ГОСТу.\n
Чтобы конкретная текстовая фраза гарантированно появилась в параллелограмме «Вывод», поставьте символ @ перед командой print или cout:`,
        codeExample: `# Интерфейсный принт скроется автоматически:
print("=== ГЛАВНОЕ МЕНЮ ===")

# С символом @ блок гарантированно появится на блок-схеме:
@print("Привет, пользователь!")
@print("Расчет завершен успешно")`,
      },
      {
        title: 'Ввод и вывод переменных',
        description: 'Автоматическое формирование параллелограммов ввода и вывода.',
        content: 'Любые операции ввода (input(), cin >>, Scanner, ReadLine) и вывода переменных (print(x), cout << res, WriteLine) автоматически распознаются как ГОСТ-блоки «Ввод данных» и «Вывод данных».',
        codeExample: `n = int(input("Введите число: "))
summa = 0
for i in range(1, n + 1):
    summa += i
print(f"Сумма: {summa}")`,
      },
      {
        title: 'Вкладки для функций (Подпрограммы)',
        description: 'Автоматическое разделение функций на отдельные блок-схемы.',
        content: 'Если в коде объявлены функции (def в Python, методы в C++/C#/Java), для каждой функции автоматически создается отдельная вкладка над холстом, а основной поток выносится во вкладку «Основная программа (Main)».',
      }
    ]
  },
  {
    id: 'export',
    title: 'Экспорт схем',
    icon: <Download className="w-4 h-4 shrink-0" />,
    items: [
      {
        title: 'Векторный SVG (Для Word, дипломов и печати)',
        content: 'Масштабируемый векторный формат. Идеально вставляется в Microsoft Word, LibreOffice Writer и LaTeX без потери качества и зернистости при любой печати на принтере.',
      },
      {
        title: 'Растровый PNG (Высокое разрешение High-DPI)',
        content: 'Четкое растровое изображение для быстрой отправки в Telegram, ВК, вставки в презентации и курсовые работы. Доступен экспорт с белым или прозрачным фоном.',
      },
      {
        title: 'Файл DRAW.IO (.drawio)',
        content: 'Экспорт в родной формат редактора diagrams.net (draw.io). Все фигуры, соединительные линии и надписи сохраняются полностью векторными и доступными для дальнейшего ручного редактирования.',
      },
      {
        title: 'Экспорт многостраничных документов',
        content: 'При разбиении схемы на страницы вы можете скачать выбранную страницу или экспортировать весь набор страниц архивом в один клик.',
      }
    ]
  },
  {
    id: 'hotkeys',
    title: 'Управление и редактор',
    icon: <Keyboard className="w-4 h-4 shrink-0" />,
    items: [
      {
        title: 'Масштабирование (Zoom) и навигация по холсту',
        content: `• Колесико мыши (Scroll) — плавное приближение и отдаление схемы точно под курсором.
• Перетаскивание зажатой левой кнопкой мыши (Drag) — свободное панорамирование холста.
• Сенсорный экран и тачпад — зум щипком двумя пальцами (Pinch-to-zoom) и жестовое перемещение.
• Кнопки зума на панели — быстрый возврат к 100% и центрирование схемы.`,
      },
      {
        title: 'Редактирование текста блоков (Двойной клик)',
        content: `• Двойной клик (Double Click) по любому блоку открывает модальное окно редактирования.
• Автоматическое преобразование математических операторов (<= в ≤, >= в ≥, != в ≠, **2 в ², sqrt в √).
• Нажмите Enter (или зеленую галочку) для сохранения изменений, Esc — для отмены.`,
      },
      {
        title: 'Интерактивное перемещение блоков (Drag & Drop)',
        content: `• Любой блок на схеме можно переместить мышью, чтобы настроить индивидуальные отступы или выравнивание.
• Выбранный блок или стрелку можно скрыть клавишами Delete или Backspace.
• Кнопка сброса возвращает схему к эталонному расположению.`,
      },
      {
        title: 'Горячие клавиши',
        content: `• Ctrl + Enter (⌘ + Enter) — Построить / обновить блок-схему из кода
• Ctrl + S (⌘ + S) — Сохранить схему в историю / облако
• Ctrl + Z / Ctrl + Shift + Z — Отмена и повтор правок текста и перемещений
• Delete / Backspace — Скрыть выбранный блок или соединительную линию`,
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
