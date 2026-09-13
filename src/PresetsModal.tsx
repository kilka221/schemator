import React from 'react';
import { X, Layers, ArrowRight, Repeat, GitBranch, Terminal, Calculator, Trophy, Cpu } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 transition-colors ${
          isDark 
            ? 'bg-[#0f172a] text-slate-100 border-slate-700/80' 
            : 'bg-white text-slate-800 border-slate-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-800 bg-[#131d38]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              isDark 
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' 
                : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Примеры и готовые шаблоны
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Выберите готовый алгоритм для быстрой вставки в редактор
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isDark 
                ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {TEMPLATES_CATALOG.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectTemplate(item)}
                className={`group flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer relative ${
                  isDark
                    ? 'bg-[#131b2e] hover:bg-[#1a253f] border-slate-800 hover:border-blue-500/50'
                    : 'bg-slate-50 hover:bg-blue-50/50 border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      {renderIcon(item.type)}
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border font-mono ${
                      item.language === 'cpp'
                        ? isDark 
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                          : 'bg-orange-50 text-orange-600 border-orange-200'
                        : isDark
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                      {item.language === 'cpp' ? 'C++' : 'Python'}
                    </span>
                  </div>
                  <ArrowRight className={`w-4 h-4 transition-all group-hover:translate-x-0.5 ${
                    isDark ? 'text-slate-500 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'
                  }`} />
                </div>
                <h3 className={`font-semibold text-sm transition-colors mb-1 ${
                  isDark ? 'text-white group-hover:text-blue-300' : 'text-slate-900 group-hover:text-blue-600'
                }`}>
                  {item.title}
                </h3>
                <p className={`text-xs line-clamp-2 leading-relaxed mb-3 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {item.desc}
                </p>
                <div className={`mt-auto w-full rounded-lg p-2 font-mono text-[11px] border overflow-hidden line-clamp-2 ${
                  isDark 
                    ? 'bg-slate-950/60 text-slate-400 border-slate-800/60' 
                    : 'bg-white text-slate-600 border-slate-200'
                }`}>
                  {item.code.split('\n').slice(0, 2).join(' ')}...
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-between text-xs ${
          isDark 
            ? 'border-slate-800 bg-[#131d38] text-slate-400' 
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <span>Поддерживаются циклы, ветвления, подпрограммы и ГОСТ-символ @</span>
          <button 
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
