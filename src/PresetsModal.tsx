import React from 'react';
import { X, Layers, ArrowRight, Repeat, GitBranch, Terminal, Calculator, Trophy, Cpu } from 'lucide-react';
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
    category: 'C++',
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

  const renderIcon = (type: string) => {
    switch (type) {
      case 'loop':
        return <Repeat className="w-4 h-4 text-blue-500" />;
      case 'branch':
        return <GitBranch className="w-4 h-4 text-emerald-500" />;
      case 'func':
        return <Calculator className="w-4 h-4 text-purple-500" />;
      case 'for':
        return <Repeat className="w-4 h-4 text-cyan-500" />;
      case 'max':
        return <Trophy className="w-4 h-4 text-amber-500" />;
      case 'cpp':
      default:
        return <Cpu className="w-4 h-4 text-orange-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-2xl rounded-md border shadow-xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 transition-colors ${
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
                className={`group flex flex-col text-left p-3 rounded-md border transition-colors cursor-pointer relative ${
                  isDark
                    ? 'bg-zinc-950/60 hover:bg-zinc-800/60 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                    : 'bg-zinc-50/70 hover:bg-zinc-100 border-zinc-200 hover:border-zinc-300 text-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                      item.language === 'cpp'
                        ? isDark 
                          ? 'bg-orange-950/40 text-orange-400 border-orange-900/60' 
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                        : isDark
                          ? 'bg-blue-950/40 text-blue-400 border-blue-900/60' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {item.language === 'cpp' ? (
                        <>
                          <CppIcon size={12} className="w-3 h-3" />
                          <span>C++</span>
                        </>
                      ) : (
                        <>
                          <PythonIcon size={12} className="w-3 h-3" />
                          <span>Python</span>
                        </>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">{item.category}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-100 transition-colors" />
                </div>
                <h3 className={`font-semibold text-xs transition-colors mb-0.5 ${
                  isDark ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-900 group-hover:text-black'
                }`}>
                  {item.title}
                </h3>
                <p className={`text-[11px] line-clamp-2 leading-relaxed mb-2 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  {item.desc}
                </p>
                <div className={`mt-auto w-full rounded p-1.5 font-mono text-[10px] border overflow-hidden line-clamp-1 ${
                  isDark 
                    ? 'bg-zinc-950 text-zinc-400 border-zinc-800' 
                    : 'bg-white text-zinc-600 border-zinc-200'
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
