import React, { useState } from 'react';
import { X, Coins, Check, Zap, Sparkles, GraduationCap, Flame, ShieldCheck, ArrowRight, ExternalLink, CreditCard, HelpCircle } from 'lucide-react';
import { SchematorLogo } from './SchematorLogo';
import { LegalDocType } from './LegalModal';

export interface TariffItem {
  id: 'lab' | 'session' | 'diploma';
  title: string;
  coins: number;
  priceRub: number;
  originalPriceRub?: number;
  pricePerCoin: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  isPopular?: boolean;
  features: string[];
  robokassaUrl?: string; // Прямая ссылка для перехода на Robokassa
}

export const TARIFFS: TariffItem[] = [
  {
    id: 'lab',
    title: '«Сдать лабу»',
    coins: 10,
    priceRub: 99,
    pricePerCoin: '9.9 ₽ / коин',
    description: 'Поможет сдать около 4-5 лаб с учетом пары ошибок при создании схем',
    badge: 'Быстрый старт',
    badgeColor: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    features: [
      '10 Coins на баланс аккаунта',
      'До 10 генераций блок-схем',
      'Python по ГОСТ 19.701-90',
      'Моментальное зачисление',
    ],
    // В дальнейшем сюда вставляется ссылка на Robokassa
    robokassaUrl: '',
  },
  {
    id: 'session',
    title: '«Семестр»',
    coins: 30,
    priceRub: 259,
    originalPriceRub: 297,
    pricePerCoin: '8.6 ₽ / коин',
    description: 'Идеально, когда схемы нужны сразу по нескольким предметам (ЭВМ, Основы ИИ, Алгоритмы). Хватит на весь семестр.',
    badge: 'Сбалансированный выбор',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    isPopular: true,
    features: [
      '30 Coins на баланс аккаунта',
      'Хватит на весь семестр',
      'ЭВМ, Основы ИИ, Алгоритмы',
      'Экспорт в Draw.io, PNG, SVG',
      'Экономия ~15% по сравнению со стартом',
    ],
    robokassaUrl: '',
  },
  {
    id: 'diploma',
    title: '«Курсач / Диплом»',
    coins: 50,
    priceRub: 399,
    originalPriceRub: 495,
    pricePerCoin: '7.98 ₽ / коин',
    description: 'Максимальный запас. Для тех, у кого в проекте 20+ функций и огромная архитектура, или для того, чтобы скинуться с соседом по парте.',
    badge: 'Максимум выгоды 🚀',
    badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    features: [
      '50 Coins на баланс аккаунта',
      'Для проектов с 20+ функциями',
      'Сложная многостраничная архитектура',
      'Можно скинуться с соседом по парте',
      'Максимальная скидка ~20%',
    ],
    robokassaUrl: '',
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
}

export const TariffModal: React.FC<TariffModalProps> = ({
  isOpen,
  onClose,
  user,
  userTokens,
  onOpenLogin,
  onOpenLegal,
  onNotify,
}) => {
  const [selectedTariff, setSelectedTariff] = useState<TariffItem | null>(TARIFFS[1]); // default 'session'
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePayClick = (tariff: TariffItem) => {
    if (!user) {
      onNotify?.('Пожалуйста, сначала войдите в аккаунт, чтобы Coins начислились именно вам.');
      onClose(); // Закрываем тарифы, чтобы сразу открылось чистое окно входа
      onOpenLogin();
      return;
    }

    // Если указана прямая ссылка на Robokassa
    if (tariff.robokassaUrl && tariff.robokassaUrl.trim() !== '') {
      window.open(tariff.robokassaUrl, '_blank');
      return;
    }

    // Заглушка/уведомление до добавления боевых ссылок мерчанта
    onNotify?.(`Выбран тариф ${tariff.title} (${tariff.priceRub} ₽). Переход на платежный шлюз Robokassa...`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-5xl my-auto bg-white dark:bg-[#1E1E24] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="relative px-6 py-6 sm:px-8 sm:py-7 border-b border-zinc-100 dark:border-zinc-800/80 bg-gradient-to-b from-blue-50/60 to-transparent dark:from-blue-950/20 dark:to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
              <Coins className="w-7 h-7 fill-amber-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Пополнение баланса Coins
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Выберите подходящий тариф для мгновенной генерации ГОСТ блок-схем
              </p>
            </div>
          </div>

          {/* User account / balance state */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/70 text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">Текущий баланс:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  {userTokens !== null ? userTokens : 0} Coins
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose(); // Закрываем тарифы и открываем окно входа
                  onOpenLogin();
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full transition shadow-sm cursor-pointer"
              >
                Войти в аккаунт
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: 3 Tariff Cards */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TARIFFS.map((tariff) => {
              const isSelected = selectedTariff?.id === tariff.id;
              return (
                <div
                  key={tariff.id}
                  onClick={() => setSelectedTariff(tariff)}
                  className={`relative rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between border-2 ${
                    tariff.isPopular
                      ? isSelected
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20'
                        : 'border-blue-300 dark:border-blue-800 bg-white dark:bg-[#23232a] hover:border-blue-400'
                      : isSelected
                        ? 'border-zinc-800 dark:border-zinc-300 bg-zinc-50/70 dark:bg-zinc-800/40 shadow-md'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#23232a] hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tariff.badgeColor || 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
                      {tariff.badge}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                      {tariff.pricePerCoin}
                    </span>
                  </div>

                  {/* Header & Coins */}
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {tariff.title}
                    </h3>
                    
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                        {tariff.priceRub} ₽
                      </span>
                      {tariff.originalPriceRub && (
                        <span className="text-sm font-semibold text-zinc-400 line-through">
                          {tariff.originalPriceRub} ₽
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Coins className="w-4 h-4" />
                      <span>Пакет {tariff.coins} коинов</span>
                    </div>

                    {/* Exact Description */}
                    <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 italic bg-zinc-50/80 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                      «{tariff.description}»
                    </p>

                    {/* Features list */}
                    <ul className="mt-4 space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                      {tariff.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5 stroke-[2.5]" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action button */}
                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTariff(tariff);
                        handlePayClick(tariff);
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                        tariff.isPopular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                          : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Оплатить {tariff.priceRub} ₽</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                    
                    <div className="mt-2 text-center">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1">
                        <span>Платеж через</span>
                        <strong className="font-semibold text-zinc-600 dark:text-zinc-400">Robokassa</strong>
                        <span>• СБП / Карты</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment guarantees & Info Bar */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Безопасная оплата (SSL 256-bit, Robokassa, СБП, МИР, Visa, Mastercard). Официальный чек плательщика НПД.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenLegal('offer')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                Публичная оферта и тарифы
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onOpenLegal('privacy')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                152-ФЗ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
