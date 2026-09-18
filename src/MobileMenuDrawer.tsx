import React from 'react';
import { 
  X, 
  History as HistoryIcon, 
  Settings as SettingsIcon, 
  BookOpen, 
  Layers, 
  Coins, 
  Sun, 
  Moon, 
  ShieldCheck, 
  FileText, 
  LogIn, 
  LogOut, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { SchematorLogo } from './SchematorLogo';
import { LegalDocType } from './LegalModal';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userTokens: number | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenTariff: () => void;
  onOpenPresets: () => void;
  onOpenTips: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenLegal: (doc: LegalDocType) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  isOpen,
  onClose,
  user,
  userTokens,
  onLogin,
  onLogout,
  onOpenTariff,
  onOpenPresets,
  onOpenTips,
  onOpenSettings,
  onOpenHistory,
  onOpenLegal,
  isDark,
  onToggleTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-start bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-[85%] max-w-xs h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SchematorLogo className="w-6 h-6 rounded-md select-none shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
                Схематор
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                ГОСТ 19.701-90
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 text-xs">
          {/* User Profile Card */}
          {user ? (
            <div className="p-3 mb-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-600 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xs">
                    {user.displayName?.[0] || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {user.displayName || 'Пользователь'}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-200 dark:border-zinc-700 text-[11px]">
                <div className="flex items-center gap-1 font-mono text-zinc-600 dark:text-zinc-300">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>Баланс: <strong>{userTokens ?? 0}</strong></span>
                </div>
                <button
                  onClick={() => {
                    onOpenTariff();
                    onClose();
                  }}
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Пополнить
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 mb-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 flex flex-col gap-2">
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Личный кабинет
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Войдите, чтобы сохранять схемы в облаке и получить 1 бесплатную генерацию
              </div>
              <button
                onClick={() => {
                  onLogin();
                  onClose();
                }}
                className="w-full h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Войти в аккаунт</span>
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <button
            onClick={() => {
              onOpenHistory();
              onClose();
            }}
            className="h-10 px-3 rounded-xl flex items-center justify-between text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <HistoryIcon className="w-4 h-4 text-zinc-400" />
              <span>История схем</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            onClick={() => {
              onOpenPresets();
              onClose();
            }}
            className="h-10 px-3 rounded-xl flex items-center justify-between text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-zinc-400" />
              <span>Примеры алгоритмов</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            onClick={() => {
              onOpenTariff();
              onClose();
            }}
            className="h-10 px-3 rounded-xl flex items-center justify-between text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Coins className="w-4 h-4 text-zinc-400" />
              <span>Тарифы и коины</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            onClick={() => {
              onOpenTips();
              onClose();
            }}
            className="h-10 px-3 rounded-xl flex items-center justify-between text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-zinc-400" />
              <span>Справка и обозначения</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="h-10 px-3 rounded-xl flex items-center justify-between text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <SettingsIcon className="w-4 h-4 text-zinc-400" />
              <span>Настройки оформления</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />

          {/* Theme Switcher Button */}
          <button
            onClick={onToggleTheme}
            className="h-10 px-3 rounded-xl flex items-center justify-between text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-500" />}
              <span>Тема оформления</span>
            </div>
            <span className="text-[11px] font-medium text-zinc-400">
              {isDark ? 'Тёмная' : 'Светлая'}
            </span>
          </button>

          {user && (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="h-10 px-3 rounded-xl flex items-center gap-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer mt-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти из аккаунта</span>
            </button>
          )}
        </div>

        {/* Bottom Legal Links */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 text-[11px] text-zinc-400">
          <button
            onClick={() => {
              onOpenLegal('privacy');
              onClose();
            }}
            className="h-7 px-2 flex items-center gap-2 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-left"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Конфиденциальность</span>
          </button>
          <button
            onClick={() => {
              onOpenLegal('offer');
              onClose();
            }}
            className="h-7 px-2 flex items-center gap-2 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-left"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Публичная оферта</span>
          </button>
        </div>
      </div>
    </div>
  );
};
