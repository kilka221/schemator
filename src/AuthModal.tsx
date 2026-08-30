import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, X, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';
import { openYandexOAuthPopup } from './yandexAuth';
import { registerYdbUserApi, loginYdbUserApi, verifyYdbCodeApi, resendYdbCodeApi, syncYdbUser } from './ydbClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'yandex' | 'email'>('yandex');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Verification mode state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Official Yandex OAuth Popup Trigger
  const handleYandexOAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const profile = await openYandexOAuthPopup();
      await syncYdbUser(profile.uid, profile.email, profile.displayName);
      localStorage.setItem('blockcraft_yandex_user', JSON.stringify(profile));
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      if (err.message?.includes('заблокировано')) {
        setError(err.message);
      } else if (err.message?.includes('закрыто')) {
        setError('Окно входа Яндекс было закрыто.');
      } else {
        setError(err.message || 'Не удалось авторизоваться через Яндекс ID.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const res = await registerYdbUserApi(cleanEmail, password.trim(), name.trim());
        setVerifyEmail(cleanEmail);
        setIsVerifying(true);
        setSuccessMsg(res.message || '6-значный код подтверждения отправлен на вашу почту.');
      } else {
        const loggedUser = await loginYdbUserApi(cleanEmail, password.trim());
        localStorage.setItem('blockcraft_yandex_user', JSON.stringify(loggedUser));
        onSuccess(loggedUser);
        onClose();
      }
    } catch (err: any) {
      console.warn('Auth error:', err);
      if (err.requiresVerification) {
        setVerifyEmail(err.email || cleanEmail);
        setIsVerifying(true);
        setError(err.message || 'Почта еще не подтверждена. Пожалуйста, введите код подтверждения из письма.');
      } else {
        setError(err.message || 'Ошибка авторизации. Попробуйте еще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanCode = verifyCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError('Пожалуйста, введите 6-значный код подтверждения из письма');
      return;
    }

    setLoading(true);
    try {
      const verifiedUser = await verifyYdbCodeApi(verifyEmail, cleanCode);
      localStorage.setItem('blockcraft_yandex_user', JSON.stringify(verifiedUser));
      setSuccessMsg('Email успешно подтвержден! Вам начислен 1 бесплатный токен.');
      setTimeout(() => {
        onSuccess(verifiedUser);
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Verify code error:', err);
      setError(err.message || 'Неверный код подтверждения. Пожалуйста, проверьте код из письма и попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!verifyEmail) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await resendYdbCodeApi(verifyEmail);
      setSuccessMsg('Новый код подтверждения успешно отправлен на вашу почту.');
    } catch (err: any) {
      setError(err.message || 'Не удалось отправить код повторно.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1E1E22] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="Схематор" className="w-8 h-8 rounded-xl object-contain shadow-sm select-none" />
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {isVerifying ? 'Подтверждение Email' : 'Авторизация в Схематор'}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isVerifying ? 'Активация 1 бесплатного токена' : '1 бесплатный токен для создания схем'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection (only in main auth view) */}
        {!isVerifying && (
          <div className="grid grid-cols-2 p-1.5 mx-6 mt-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setTab('yandex'); setError(null); setSuccessMsg(null); }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                tab === 'yandex' 
                  ? 'bg-white dark:bg-[#2A2A30] text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-[#FC3F1D] text-white flex items-center justify-center text-[10px] font-black leading-none">
                Я
              </span>
              <span>Яндекс ID</span>
            </button>

            <button
              type="button"
              onClick={() => { setTab('email'); setError(null); setSuccessMsg(null); }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                tab === 'email' 
                  ? 'bg-white dark:bg-[#2A2A30] text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW: EMAIL VERIFICATION CODE ENTRY */}
          {isVerifying ? (
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              <div className="text-center pb-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                  Мы выслали 6-значный код подтверждения на:
                </p>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {verifyEmail}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 text-center">
                  Введите 6 цифр кода из письма
                </label>
                <div className="relative max-w-[220px] mx-auto">
                  <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-center text-lg tracking-[0.25em] font-mono font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 text-center mt-2">
                  Проверьте папку «Входящие» и «Спам»
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || verifyCode.length !== 6}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-sm transition transform active:scale-[0.98]"
              >
                <span>{loading ? 'Проверка...' : 'Подтвердить почту (+1 токен)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Отправить код повторно</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsVerifying(false); setError(null); setSuccessMsg(null); }}
                  className="text-zinc-500 dark:text-zinc-400 hover:underline"
                >
                  Назад к входу
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* TAB 1: YANDEX ID AUTH */}
              {tab === 'yandex' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleYandexOAuth}
                    disabled={loading}
                    className="w-full py-3 bg-[#FC3F1D] hover:bg-[#E03415] disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-[#FC3F1D]/25 flex items-center justify-center gap-2.5 text-sm transition transform active:scale-[0.98]"
                  >
                    <span className="w-5 h-5 rounded-full bg-white text-[#FC3F1D] flex items-center justify-center text-xs font-black shadow-sm">
                      Я
                    </span>
                    <span>{loading ? 'Открытие Яндекс...' : 'Войти с Яндекс ID'}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                  <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
                    Быстрый вход без паролей через подтвержденный профиль Яндекс ID.
                  </p>
                </div>
              )}

              {/* TAB 2: EMAIL AUTH */}
              {tab === 'email' && (
                <form onSubmit={handleEmailAuth} className="space-y-3.5">
                  {isSignUp && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Ваше имя
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Иван"
                          className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Электронная почта
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ivan@yandex.ru"
                        className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Пароль
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 mt-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition transform active:scale-[0.98]"
                  >
                    <span>{loading ? 'Загрузка...' : isSignUp ? 'Зарегистрироваться' : 'Войти в аккаунт'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMsg(null); }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400 text-center">
          {isVerifying 
            ? 'Токен будет начислен сразу после подтверждения почты' 
            : 'Только подтвержденные аккаунты могут создавать схемы'}
        </div>
      </div>
    </div>
  );
};
