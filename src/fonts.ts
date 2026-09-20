export interface FontItem {
  id: string;             // CSS font-family string
  name: string;           // Display name
  category: 'gost' | 'serif' | 'sans' | 'mono';
  categoryLabel: string;
  desc: string;
  googleFont?: string;    // Family parameter for Google Fonts API (Cyrillic support)
}

export const FONTS_CATALOG: FontItem[] = [
  // ----------------------------------------------------
  // 1. ГОСТ и чертёжные шрифты
  // ----------------------------------------------------
  {
    id: '"JetBrains Mono", monospace',
    name: 'JetBrains Mono',
    category: 'gost',
    categoryLabel: 'ГОСТ и чертёжные',
    desc: 'Четкий технический моноширинный шрифт, идеален для ГОСТ',
    googleFont: 'JetBrains+Mono:wght@400;500;600;700',
  },
  {
    id: '"Roboto Mono", monospace',
    name: 'Roboto Mono',
    category: 'gost',
    categoryLabel: 'ГОСТ и чертёжные',
    desc: 'Инженерный моно-шрифт в стиле чертежей ЕСКД',
    googleFont: 'Roboto+Mono:wght@400;500;600',
  },
  {
    id: '"PT Mono", monospace',
    name: 'PT Mono',
    category: 'gost',
    categoryLabel: 'ГОСТ и чертёжные',
    desc: 'Официальный российский общенациональный моно-шрифт',
    googleFont: 'PT+Mono',
  },
  {
    id: '"Share Tech Mono", monospace',
    name: 'Share Tech Mono',
    category: 'gost',
    categoryLabel: 'ГОСТ и чертёжные',
    desc: 'Строгий технический вид чертёжной САПР',
    googleFont: 'Share+Tech+Mono',
  },
  {
    id: '"Consolas", monospace',
    name: 'Consolas (Системный)',
    category: 'gost',
    categoryLabel: 'ГОСТ и чертёжные',
    desc: 'Классический системный чертёжный шрифт Windows',
  },
  {
    id: '"Courier New", monospace',
    name: 'Courier New (Машинопись)',
    category: 'gost',
    categoryLabel: 'ГОСТ и чертёжные',
    desc: 'Ретро-стиль печатной машинки советских НИИ',
  },
  {
    id: '"Bahnschrift", "DIN Alternate", sans-serif',
    name: 'Bahnschrift / DIN',
    category: 'gost',
    categoryLabel: 'ГОСТ и чертёжные',
    desc: 'Чертёжный стандарт DIN 1451, узкие строгие буквы',
  },
  {
    id: '"Jura", sans-serif',
    name: 'Jura',
    category: 'gost',
    categoryLabel: 'ГОСТ и чертёжные',
    desc: 'Геометрический чертёжный гротеск с открытыми формами',
    googleFont: 'Jura:wght@400;500;600;700',
  },
  {
    id: '"Cuprum", sans-serif',
    name: 'Cuprum',
    category: 'gost',
    categoryLabel: 'ГОСТ и чертёжные',
    desc: 'Узкий компактный чертёжный шрифт по типу ГОСТ 2.304',
    googleFont: 'Cuprum:wght@400;500;600;700',
  },
  {
    id: '"Kelly Slab", cursive',
    name: 'Kelly Slab',
    category: 'gost',
    categoryLabel: 'ГОСТ и чертёжные',
    desc: 'Квадратный брусковый чертёжный шрифт для схем',
    googleFont: 'Kelly+Slab',
  },

  // ----------------------------------------------------
  // 2. Академические и с засечками (Serif) — для отчетов и ВКР
  // ----------------------------------------------------
  {
    id: '"Times New Roman", Times, serif',
    name: 'Times New Roman',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Главный стандарт рефератов, курсовых и дипломов в РФ',
  },
  {
    id: '"PT Serif", serif',
    name: 'PT Serif',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Официальный российский академический шрифт с засечками',
    googleFont: 'PT+Serif:wght@400;700',
  },
  {
    id: '"Merriweather", serif',
    name: 'Merriweather',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Плотный книжный шрифт с высокой разборчивостью',
    googleFont: 'Merriweather:wght@400;700',
  },
  {
    id: '"Lora", serif',
    name: 'Lora',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Элегантный университетский шрифт с каллиграфическим оттенком',
    googleFont: 'Lora:wght@400;500;600;700',
  },
  {
    id: '"Playfair Display", serif',
    name: 'Playfair Display',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Высококонтрастные засечки для солидных титульных отчетов',
    googleFont: 'Playfair+Display:wght@400;600;700',
  },
  {
    id: '"Cormorant Garamond", serif',
    name: 'Cormorant Garamond',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Изящный академический книжный стиль в духе классики',
    googleFont: 'Cormorant+Garamond:wght@400;600;700',
  },
  {
    id: '"Spectral", serif',
    name: 'Spectral',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Четкие аккуратные пропорции для научных статей',
    googleFont: 'Spectral:wght@400;600',
  },
  {
    id: '"EB Garamond", serif',
    name: 'EB Garamond',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Традиционная типографика европейских университетов',
    googleFont: 'EB+Garamond:wght@400;600',
  },
  {
    id: '"Noto Serif", serif',
    name: 'Noto Serif',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Универсальный четкий академический шрифт от Google',
    googleFont: 'Noto+Serif:wght@400;700',
  },
  {
    id: '"Bitter", serif',
    name: 'Bitter',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Мощные брусковые засечки, не теряющиеся при печати',
    googleFont: 'Bitter:wght@400;600;700',
  },
  {
    id: '"Vollkorn", serif',
    name: 'Vollkorn',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Мягкий читаемый книжный шрифт с весомыми штрихами',
    googleFont: 'Vollkorn:wght@400;600',
  },
  {
    id: '"Literata", serif',
    name: 'Literata',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Разработан специально для непрерывного чтения текста',
    googleFont: 'Literata:wght@400;600',
  },
  {
    id: '"Podkova", serif',
    name: 'Podkova',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Широкие брусковые засечки с характерной геометрией',
    googleFont: 'Podkova:wght@400;600',
  },
  {
    id: '"Forum", serif',
    name: 'Forum',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Античные строгие пропорции для презентабельных схем',
    googleFont: 'Forum',
  },
  {
    id: '"Alegreya", serif',
    name: 'Alegreya',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Динамичный ритмичный шрифт с плавным рисунком',
    googleFont: 'Alegreya:wght@400;600',
  },
  {
    id: 'Georgia, serif',
    name: 'Georgia',
    category: 'serif',
    categoryLabel: 'Академические (Serif)',
    desc: 'Популярный системный шрифт с засечками, отлично читается',
  },

  // ----------------------------------------------------
  // 3. Современные гротески (Sans-serif)
  // ----------------------------------------------------
  {
    id: '"Inter", sans-serif',
    name: 'Inter',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Современный четкий нейтральный интерфейсный шрифт',
    googleFont: 'Inter:wght@400;500;600;700',
  },
  {
    id: '"Roboto", sans-serif',
    name: 'Roboto',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Геометрический и дружелюбный гротеск',
    googleFont: 'Roboto:wght@400;500;700',
  },
  {
    id: '"Open Sans", sans-serif',
    name: 'Open Sans',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Гуманистический гротеск с нейтральным рисунком',
    googleFont: 'Open+Sans:wght@400;600;700',
  },
  {
    id: '"Montserrat", sans-serif',
    name: 'Montserrat',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Широкие круглые геометрические буквы, стиль постеров',
    googleFont: 'Montserrat:wght@400;600;700',
  },
  {
    id: 'Arial, Helvetica, sans-serif',
    name: 'Arial',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Универсальный стандарт офисных документов Word',
  },
  {
    id: '"Segoe UI", Tahoma, sans-serif',
    name: 'Segoe UI',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Стандартный системный гротеск Microsoft Windows',
  },
  {
    id: '"Trebuchet MS", sans-serif',
    name: 'Trebuchet MS',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Характерный открытый гротеск, узнаваемый стиль',
  },
  {
    id: 'Verdana, sans-serif',
    name: 'Verdana',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Очень широкие буквы с высокой разборчивостью',
  },
  {
    id: 'Tahoma, sans-serif',
    name: 'Tahoma',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Плотный узкий системный шрифт без засечек',
  },
  {
    id: '"Manrope", sans-serif',
    name: 'Manrope',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Геометрический современный полузакрытый гротеск',
    googleFont: 'Manrope:wght@400;600;700',
  },
  {
    id: '"Fira Sans", sans-serif',
    name: 'Fira Sans',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Разработан специально для высокой разборчивости на экранах',
    googleFont: 'Fira+Sans:wght@400;500;600',
  },
  {
    id: '"Nunito", sans-serif',
    name: 'Nunito',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Скругленные мягкие контуры, неформальный аккуратный вид',
    googleFont: 'Nunito:wght@400;600;700',
  },
  {
    id: '"Rubik", sans-serif',
    name: 'Rubik',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Мягкие слегка скругленные углы букв',
    googleFont: 'Rubik:wght@400;500;600',
  },
  {
    id: '"Source Sans 3", sans-serif',
    name: 'Source Sans 3',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Качественный гротеск от Adobe для технических интерфейсов',
    googleFont: 'Source+Sans+3:wght@400;600',
  },
  {
    id: '"Ubuntu", sans-serif',
    name: 'Ubuntu',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Характерные скругленные формы дистрибутива Ubuntu Linux',
    googleFont: 'Ubuntu:wght@400;500;700',
  },
  {
    id: '"Comfortaa", cursive',
    name: 'Comfortaa',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Круглый плавный дизайн, необычный вид схемы',
    googleFont: 'Comfortaa:wght@400;600',
  },
  {
    id: '"Oswald", sans-serif',
    name: 'Oswald',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Узкие вытянутые прописные буквы, компактная компоновка',
    googleFont: 'Oswald:wght@400;600',
  },
  {
    id: '"Raleway", sans-serif',
    name: 'Raleway',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Тонкий утонченный гротеск с необычной буквой W',
    googleFont: 'Raleway:wght@400;500;600',
  },
  {
    id: '"Exo 2", sans-serif',
    name: 'Exo 2',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Технологичный футуристический геометрический шрифт',
    googleFont: 'Exo+2:wght@400;600',
  },
  {
    id: '"Golos Text", sans-serif',
    name: 'Golos Text',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Современный российский веб-гротеск для чтения документов',
    googleFont: 'Golos+Text:wght@400;600',
  },
  {
    id: '"Unbounded", sans-serif',
    name: 'Unbounded',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Сверхширокий ультрасовременный акцидентный стиль',
    googleFont: 'Unbounded:wght@400;600',
  },
  {
    id: '"Overpass", sans-serif',
    name: 'Overpass',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Создан на основе Highway Gothic, очень четкие знаки',
    googleFont: 'Overpass:wght@400;600',
  },
  {
    id: '"Onest", sans-serif',
    name: 'Onest',
    category: 'sans',
    categoryLabel: 'Гротески (Sans)',
    desc: 'Нейтральный открытый гротеск для образовательных проектов',
    googleFont: 'Onest:wght@400;600',
  },

  // ----------------------------------------------------
  // 4. Моноширинные и код (Monospace)
  // ----------------------------------------------------
  {
    id: '"Fira Code", monospace',
    name: 'Fira Code',
    category: 'mono',
    categoryLabel: 'Моноширинные (Код)',
    desc: 'Популярнейший моноширинный шрифт программистов с лигатурами',
    googleFont: 'Fira+Code:wght@400;500;600',
  },
  {
    id: '"Source Code Pro", monospace',
    name: 'Source Code Pro',
    category: 'mono',
    categoryLabel: 'Моноширинные (Код)',
    desc: 'Профессиональный моно-шрифт от Adobe',
    googleFont: 'Source+Code+Pro:wght@400;600',
  },
  {
    id: '"Inconsolata", monospace',
    name: 'Inconsolata',
    category: 'mono',
    categoryLabel: 'Моноширинные (Код)',
    desc: 'Компактный изящный шрифт для листингов программ',
    googleFont: 'Inconsolata:wght@400;600',
  },
  {
    id: '"Ubuntu Mono", monospace',
    name: 'Ubuntu Mono',
    category: 'mono',
    categoryLabel: 'Моноширинные (Код)',
    desc: 'Оригинальный терминальный моно-шрифт Ubuntu',
    googleFont: 'Ubuntu+Mono:wght@400;700',
  },
  {
    id: '"Space Mono", monospace',
    name: 'Space Mono',
    category: 'mono',
    categoryLabel: 'Моноширинные (Код)',
    desc: 'Геометрический брутальный моно-шрифт 1960-х годов',
    googleFont: 'Space+Mono:wght@400;700',
  },
  {
    id: '"Cousine", monospace',
    name: 'Cousine',
    category: 'mono',
    categoryLabel: 'Моноширинные (Код)',
    desc: 'Современная метрическая альтернатива Courier',
    googleFont: 'Cousine:wght@400;700',
  },
  {
    id: '"Anonymous Pro", monospace',
    name: 'Anonymous Pro',
    category: 'mono',
    categoryLabel: 'Моноширинные (Код)',
    desc: 'Создан специально для программирования и ясного кода',
    googleFont: 'Anonymous+Pro:wght@400;700',
  },
];

// Cache of loaded Google fonts
const loadedFontsSet = new Set<string>();

/**
 * Dynamically loads a Google Font by creating a <link> element in document.head
 */
export function ensureFontLoaded(font: FontItem | string) {
  if (typeof window === 'undefined') return;
  const item = typeof font === 'string' 
    ? FONTS_CATALOG.find(f => f.id === font || f.name.toLowerCase() === font.toLowerCase())
    : font;

  if (!item || !item.googleFont) return;
  if (loadedFontsSet.has(item.googleFont)) return;

  try {
    const linkId = `google-font-${item.name.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${item.googleFont}&display=swap`;
      document.head.appendChild(link);
    }
    loadedFontsSet.add(item.googleFont);
  } catch (e) {
    console.warn('Failed to load Google Font:', item.name, e);
  }
}
