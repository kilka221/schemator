import React, { useRef } from 'react';
import { X, Play, Trash2, Layers, Sparkles } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';

interface MobileCodeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  setCode: (code: string) => void;
  language: 'python' | 'cpp';
  setLanguage: (lang: 'python' | 'cpp') => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onOpenPresets: () => void;
  isDark: boolean;
}

const formatLinesRu = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} строк`;
  if (mod10 === 1) return `${n} строка`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} строки`;
  return `${n} строк`;
};

const PYTHON_SNIPPETS = [
  { label: 'print()', insert: 'print("")' },
  { label: 'input()', insert: 'input("")' },
  { label: 'if', insert: 'if :\n    ' },
  { label: 'else:', insert: 'else:\n    ' },
  { label: 'while', insert: 'while :\n    ' },
  { label: 'for', insert: 'for i in range():\n    ' },
  { label: 'def', insert: 'def func():\n    ' },
  { label: ':', insert: ':' },
  { label: '==', insert: ' == ' },
  { label: '!=', insert: ' != ' },
];

const CPP_SNIPPETS = [
  { label: 'cout', insert: 'cout << "" << endl;' },
  { label: 'cin', insert: 'cin >> ;' },
  { label: 'if', insert: 'if () {\n    \n}' },
  { label: 'else', insert: 'else {\n    \n}' },
  { label: 'while', insert: 'while () {\n    \n}' },
  { label: 'for', insert: 'for (int i = 0; i < n; i++) {\n    \n}' },
  { label: ';', insert: ';' },
  { label: '{ }', insert: '{\n    \n}' },
  { label: '==', insert: ' == ' },
];

export const MobileCodeSheet: React.FC<MobileCodeSheetProps> = ({
  isOpen,
  onClose,
  code,
  setCode,
  language,
  setLanguage,
  onGenerate,
  isGenerating,
  onOpenPresets,
  isDark,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const lines = code.split('\n');
  const lineCount = lines.length;

  const handleSnippetInsert = (snippet: string) => {
    setCode(code ? `${code}\n${snippet}` : snippet);
  };

  const handleClear = () => {
    setCode('');
  };

  const handleGenerateAndClose = () => {
    onGenerate();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 animate-in slide-in-from-bottom duration-200">
      {/* Top Header */}
      <div className="h-12 px-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'python' | 'cpp')}
            className="h-8 px-2 text-xs font-mono font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer"
          >
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>

          <button
            type="button"
            onClick={onOpenPresets}
            className="h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Примеры</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {code.trim().length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Очистить код"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Закрыть редактор"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div 
        ref={editorRef}
        className="flex-1 flex overflow-y-auto overflow-x-auto relative font-mono text-[13px] bg-white dark:bg-zinc-900"
      >
        {/* Line Numbers Gutter */}
        <div className="w-10 shrink-0 py-3 select-none text-right pr-2 text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800">
          {lines.map((_, i) => (
            <div 
              key={i} 
              className="text-[13px] leading-[22px] font-mono"
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Input */}
        <div className="flex-1 min-w-0 p-3">
          <Editor
            value={code}
            onValueChange={setCode}
            highlight={(input) => {
              const langGrammar = language === 'cpp' ? Prism.languages.cpp : Prism.languages.python;
              const langName = language === 'cpp' ? 'cpp' : 'python';
              return Prism.highlight(input, langGrammar, langName);
            }}
            padding={0}
            textareaClassName="focus:outline-none font-mono"
            className="font-mono text-[13px] leading-[22px]"
            style={{
              fontFamily: '"Fira Code", monospace',
              minHeight: '100%',
            }}
            placeholder={language === 'cpp' ? '// Вставьте код на C++...' : '# Вставьте код на Python...'}
          />
        </div>
      </div>

      {/* Snippet Toolbar for Mobile (Easy keyboard symbols) */}
      <div className="h-10 px-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto bg-zinc-50 dark:bg-zinc-900 shrink-0 select-none">
        {(language === 'cpp' ? CPP_SNIPPETS : PYTHON_SNIPPETS).map((snip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSnippetInsert(snip.insert)}
            className="h-7 px-2.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-750 transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            {snip.label}
          </button>
        ))}
      </div>

      {/* Bottom Sticky Action Button */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleGenerateAndClose}
          disabled={isGenerating}
          className="w-full h-11 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isGenerating ? 'Создание схемы...' : 'Создать блок-схему'}</span>
          <span className="text-xs font-normal text-blue-200 ml-1">
            ({formatLinesRu(lineCount)})
          </span>
        </button>
      </div>
    </div>
  );
};
