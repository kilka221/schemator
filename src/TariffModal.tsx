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
      'Генерация Python и C++',
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
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);

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
      setInlineNotice(`Переход на Robokassa для оплаты тарифа ${tariff.title}...`);
      window.open(tariff.robokassaUrl, '_blank');
      return;
    }

    // Уведомление до добавления прямых ссылок
    const msg = `Выбран тариф ${tariff.title} (${tariff.priceRub} ₽). Переход на платежный шлюз Robokassa...`;
    setInlineNotice(msg);
    onNotify?.(msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl my-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-md shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <div>
              <h2 className="text-xs font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100">
                Пополнение баланса Coins
              </h2>
            </div>
          </div>

          {/* User account / balance state */}
          <div className="flex items-center gap-2.5 shrink-0">
            {user ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">Баланс:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-500" />
                  {userTokens !== null ? userTokens : 0}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                Войти в аккаунт
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: 3 Tariff Cards */}
        <div className="p-4 space-y-4 text-xs">
          {inlineNotice && (
            <div className="p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in duration-100">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{inlineNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setInlineNotice(null)}
                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TARIFFS.map((tariff) => {
              const isSelected = selectedTariff?.id === tariff.id;
              return (
                <div
                  key={tariff.id}
                  onClick={() => setSelectedTariff(tariff)}
                  className={`relative rounded-md p-4 transition-colors cursor-pointer flex flex-col border ${
                    isSelected
                      ? 'border-zinc-900 dark:border-zinc-300 bg-zinc-50 dark:bg-zinc-800/40 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex-1 flex flex-col">
                    {/* Top Badge */}
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 whitespace-nowrap">
                        {tariff.badge}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                        {tariff.pricePerCoin}
                      </span>
                    </div>

                    {/* Header & Coins */}
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center">
                        {tariff.title}
                      </h3>
                      
                      <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono">
                          {tariff.priceRub} ₽
                        </span>
                        {tariff.originalPriceRub && (
                          <span className="text-xs font-mono text-zinc-400 line-through">
                            {tariff.originalPriceRub} ₽
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 font-mono">
                        <Coins className="w-3 h-3" />
                        <span>{tariff.coins} коинов</span>
                      </div>

                      {/* Description */}
                      <div className="mt-2 min-h-[52px] flex items-center bg-zinc-50 dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                        <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {tariff.description}
                        </p>
                      </div>

                      {/* Features list */}
                      <ul className="mt-3 space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                        {tariff.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-zinc-900 dark:text-zinc-100 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTariff(tariff);
                        handlePayClick(tariff);
                      }}
                      className={`w-full py-2 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                        tariff.isPopular
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Оплатить {tariff.priceRub} ₽</span>
                    </button>
                    
                    <div className="mt-1.5 text-center">
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        Robokassa • СБП / Карты
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment guarantees & Info Bar */}
          <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Безопасная оплата (SSL 256-bit, Robokassa, СБП, МИР). Официальный чек плательщика НПД.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-medium">
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
    </div>
  );
};
