import React from 'react';
import { 
  X, 
  Clock, 
  Zap, 
  Check, 
  Coins, 
  ShieldCheck, 
  ChevronRight 
} from 'lucide-react';
import { SchematorLogo } from './SchematorLogo';
import { LegalDocType } from './LegalModal';

export interface TariffItem {
  id: 'lab' | 'semester' | 'diploma';
  title: string;
  badge?: string;
  isPopular?: boolean;
  coins: number;
  priceRub: number;
  originalPriceRub?: number;
  discountPercent?: number;
  pricePerCoin: string;
  timeSaved: string;
  description: string;
  features: string[];
}

export const TARIFFS: TariffItem[] = [
  {
    id: 'lab',
    title: '«Сдать лабы»',
    coins: 10,
    priceRub: 99,
    pricePerCoin: '9.9 ₽ / схема',
    timeSaved: 'Экономит ~8–10 ч черчения',
    description: 'Быстрый старт для закрытия текущих лабораторных работ.',
    features: [
      '10 готовых схем из Python и C++',
      'Схема за 2 секунды вместо 50 минут в Word',
      'Экспорт в PNG, SVG и Draw.io для отчёта',
      'Бессрочно: коины никогда не сгорают',
    ],
  },
  {
    id: 'semester',
    title: '«Семестр»',
    badge: 'ХИТ • СКИДКА 16%',
    isPopular: true,
    coins: 30,
    priceRub: 249,
    originalPriceRub: 297,
    discountPercent: 16,
    pricePerCoin: '8.3 ₽ / схема',
    timeSaved: 'Экономит ~25+ ч сна',
    description: 'Оптимальный запас на весь семестр по нескольким предметам.',
    features: [
      '30 схем — хватит на все лабы и РГР',
      'Экономия ~25 часов бессмысленной рутины',
      'Правки кода обновляют схему в 1 клик',
      'Скидка 16% по сравнению с базовым тарифом',
    ],
  },
  {
    id: 'diploma',
    title: '«Курсач / Диплом»',
    badge: 'МАКСИМУМ • СКИДКА 20%',
    coins: 50,
    priceRub: 399,
    originalPriceRub: 495,
    discountPercent: 20,
    pricePerCoin: '7.98 ₽ / схема',
    timeSaved: 'Экономит ~45+ ч рутины',
    description: 'Для объемных проектов с десятками функций или на двоих.',
    features: [
      '50 схем по минимальной цене (~8 ₽)',
      'Сложная многостраничная архитектура',
      'Можно разделить с соседом по парте',
      'Максимальная скидка 20%',
    ],
  },
];

interface TariffModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  userTokens: number | null;
  onOpenLogin: () => void;
  onOpenLegal: (doc: LegalDocType) => void;
  onNotify?: (msg: string) => void;
  theme?: 'light' | 'dark';
}

export const TariffModal: React.FC<TariffModalProps> = ({
  isOpen,
  onClose,
  user,
  userTokens,
  onOpenLogin,
  onOpenLegal,
  onNotify,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handlePay = (tariff: TariffItem) => {
    if (!user) {
      onNotify?.('Войдите в аккаунт, чтобы коины зачислились на ваш профиль.');
      onClose();
      onOpenLogin();
      return;
    }

    onNotify?.(`Переход на оплату ${tariff.priceRub} ₽ через Robokassa (СБП, карты, МИР)...`);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={`relative w-full max-w-5xl my-auto rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden border animate-in zoom-in-95 duration-150 transition-colors ${
          isDark 
            ? 'bg-zinc-950 text-zinc-100 border-zinc-800' 
            : 'bg-white text-zinc-900 border-zinc-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Schemator Logo, Title, Balance & Close */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200 dark:border-zinc-800/80 gap-3">
          <div className="flex items-center gap-2.5">
            <SchematorLogo className="w-7 h-7 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
              Тарифы Схематора
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-zinc-500 dark:text-zinc-400">Баланс:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                  {userTokens ?? 0} схем
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-colors cursor-pointer"
              >
                Войти
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-full transition-colors cursor-pointer"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Time Saved / Reality Check Banner */}
        <div className={`mt-3.5 p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs transition-colors ${
          isDark 
            ? 'bg-zinc-900/60 border-zinc-800/90 text-zinc-300' 
            : 'bg-zinc-50 border-zinc-200 text-zinc-700'
        }`}>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="leading-snug">
              <strong className="text-zinc-900 dark:text-white">Вручную в Word/Visio:</strong> 40–60 минут на чертёж одной схемы и сбивающиеся стрелочки при любой правке.
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0 bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/25">
            <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Схематор: 2 секунды из кода</span>
          </div>
        </div>

        {/* 3 Tariff Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mt-3.5">
          {TARIFFS.map((tariff) => {
            const isPop = tariff.isPopular;

            return (
              <div
                key={tariff.id}
                className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all ${
                  isPop
                    ? isDark
                      ? 'bg-gradient-to-b from-emerald-950/25 via-zinc-900 to-zinc-900 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
                      : 'bg-gradient-to-b from-emerald-50/50 to-white border-2 border-emerald-500 shadow-md shadow-emerald-500/10'
                    : isDark
                      ? 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-100'
                      : 'bg-zinc-50/70 border-zinc-200 hover:border-zinc-300 text-zinc-900'
                }`}
              >
                <div>
                  {/* Badge & Unit Price */}
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    {tariff.badge ? (
                      <span className={`text-[10px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full border ${
                        isPop
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                          : isDark
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {tariff.badge}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Базовый
                      </span>
                    )}

                    <span className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
                      {tariff.pricePerCoin}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                    {tariff.title}
                  </h3>

                  {/* Time Saved Pill */}
                  <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{tariff.timeSaved}</span>
                  </div>

                  {/* Price Block */}
                  <div className="mt-3.5 flex items-baseline gap-2">
                    {tariff.originalPriceRub && (
                      <span className="text-lg font-mono text-zinc-400 dark:text-zinc-500 line-through">
                        {tariff.originalPriceRub} ₽
                      </span>
                    )}
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-mono">
                      {tariff.priceRub} ₽
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      / {tariff.coins} схем
                    </span>
                  </div>

                  {/* Features List */}
                  <div className="mt-4 pt-3.5 border-t border-zinc-200/70 dark:border-zinc-800/80">
                    <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                      {tariff.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500 dark:text-emerald-400" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="mt-5 pt-3">
                  <button
                    type="button"
                    onClick={() => handlePay(tariff)}
                    className={`w-full py-2.5 sm:py-3 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] ${
                      isPop
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25'
                        : isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs'
                    }`}
                  >
                    <span>Выбрать за {tariff.priceRub} ₽</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Guarantees & Legal Links */}
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Оплата через СБП, банковские карты, МИР • Моментальное зачисление</span>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <button
              type="button"
              onClick={() => onOpenLegal('offer')}
              className="text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer"
            >
              Публичная оферта
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              className="text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer"
            >
              152-ФЗ
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
