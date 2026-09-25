import React from 'react';
import { X, Layers, ArrowRight } from 'lucide-react';
import { PythonIcon } from './PythonIcon';
import { CppIcon } from './CppIcon';

export interface CodeTemplate {
  id: string;
  type: 'loop' | 'branch' | 'func' | 'for' | 'max' | 'cpp';
  title: string;
  desc: string;
  language: 'python' | 'cpp';
  category: string;
  code: string;
}

export const TEMPLATES_CATALOG: CodeTemplate[] = [
  {
    id: 'while_loop',
    type: 'loop',
    title: 'Цикл со счетчиком (while)',
    desc: 'Накопление суммы чисел от 1 до N с условием продолжения',
    language: 'python',
    category: 'Базовые алгоритмы',
    code: `n = int(input("Введите N: "))
summa = 0
i = 1
while i <= n:
    summa = summa + i
    i = i + 1
print(f"Сумма: {summa}")`,
  },
  {
    id: 'if_else',
    type: 'branch',
    title: 'Ветвление (if / else)',
    desc: 'Проверка условия, разветвление логики и два пути выполнения',
    language: 'python',
    category: 'Базовые алгоритмы',
    code: `x = int(input("Введите число: "))
if x > 0:
    @print("Число положительное")
else:
    @print("Число неположительное")`,
  },
  {
    id: 'function_def',
    type: 'func',
    title: 'Функция и факториал (def)',
    desc: 'Объявление подпрограммы с отдельной блок-схемой ГОСТ',
    language: 'python',
    category: 'Функции и модули',
    code: `def factorial(n):
    res = 1
    for i in range(1, n + 1):
        res = res * i
    return res

num = int(input("Число: "))
ans = factorial(num)
print(f"Факториал: {ans}")`,
  },
  {
    id: 'for_range',
    type: 'for',
    title: 'Цикл со счетчиком (for range)',
    desc: 'Итерация по диапазону чисел с вычислением произведения',
    language: 'python',
    category: 'Базовые алгоритмы',
    code: `count = int(input("Количество: "))
prod = 1
for i in range(1, count + 1):
    prod = prod * i
print("Итог:", prod)`,
  },
  {
    id: 'max_number',
    type: 'max',
    title: 'Поиск максимума из трех',
    desc: 'Вложенные проверки условий для нахождения наибольшего числа',
    language: 'python',
    category: 'Ветвления',
    code: `a = int(input("A: "))
b = int(input("B: "))
c = int(input("C: "))
if a >= b and a >= c:
    max_val = a
elif b >= c:
    max_val = b
else:
    max_val = c
print("Максимум:", max_val)`,
  },
  {
    id: 'cpp_example',
    type: 'cpp',
    title: 'Алгоритм на C++',
    desc: 'Пример кода на C++ с циклами и стандартным потоком ввода-вывода',
    language: 'cpp',
    category: 'Базовые алгоритмы',
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int sum = 0;
    for (int i = 1; i <= n; i++) {
        sum += i;
    }
    cout << sum << endl;
    return 0;
}`,
  },
];

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
  onSelect?: (template: CodeTemplate) => void;
  onSelectTemplate?: (template: CodeTemplate) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({ 
  isOpen, 
  onClose, 
  theme = 'dark',
  onSelect,
  onSelectTemplate 
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleSelectTemplate = (item: CodeTemplate) => {
    if (typeof onSelectTemplate === 'function') {
      onSelectTemplate(item);
    } else if (typeof onSelect === 'function') {
      onSelect(item);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-2xl rounded-lg border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 transition-colors ${
          isDark 
            ? 'bg-zinc-900 text-zinc-100 border-zinc-800' 
            : 'bg-white text-zinc-900 border-zinc-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-500" />
            <div>
              <h2 className={`text-xs font-bold tracking-tight uppercase ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Шаблоны алгоритмов
              </h2>
            </div>
          </div>
          <button 
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TEMPLATES_CATALOG.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectTemplate(item)}
                className={`group flex flex-col text-left p-3.5 rounded-lg border transition-all cursor-pointer relative ${
                  isDark
                    ? 'bg-zinc-950/40 hover:bg-zinc-800/50 border-zinc-800/80 hover:border-zinc-700 text-zinc-200'
                    : 'bg-zinc-50/70 hover:bg-zinc-100 border-zinc-200 hover:border-zinc-300 text-zinc-800'
                }`}
              >
                {/* Clean unboxed language & category header */}
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    {item.language === 'cpp' ? (
                      <span className="inline-flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                        <CppIcon size={14} className="w-3.5 h-3.5" />
                        <span>C++</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                        <PythonIcon size={14} className="w-3.5 h-3.5" />
                        <span>Python</span>
                      </span>
                    )}
                    <span className="text-zinc-300 dark:text-zinc-700 select-none" aria-hidden="true">·</span>
                    <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                      {item.category}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 group-hover:translate-x-0.5 transition-all" />
                </div>

                <h3 className={`font-semibold text-xs transition-colors mb-1 ${
                  isDark ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-900 group-hover:text-black'
                }`}>
                  {item.title}
                </h3>
                <p className={`text-[11px] line-clamp-2 leading-relaxed mb-2.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  {item.desc}
                </p>
                <div className={`mt-auto w-full rounded p-2 font-mono text-[10.5px] border overflow-hidden line-clamp-1 transition-colors ${
                  isDark 
                    ? 'bg-zinc-950 text-zinc-400 border-zinc-800/80 group-hover:border-zinc-700/80 group-hover:text-zinc-300' 
                    : 'bg-white text-zinc-600 border-zinc-200 group-hover:border-zinc-300 group-hover:text-zinc-800'
                }`}>
                  {item.code.split('\n').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-4 py-2.5 border-t flex items-center justify-between text-xs ${
          isDark 
            ? 'border-zinc-800 bg-zinc-900 text-zinc-400' 
            : 'border-zinc-200 bg-zinc-50 text-zinc-600'
        }`}>
          <span className="text-[11px] font-mono text-zinc-500">Кликните по шаблону для загрузки</span>
          <button 
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-medium text-sm transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
