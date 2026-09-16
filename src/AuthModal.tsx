import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, X, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ShieldCheck, Check, Scale, Shield, CheckSquare2 } from 'lucide-react';
import { openYandexOAuthPopup } from './yandexAuth';
import { registerYdbUserApi, loginYdbUserApi, verifyYdbCodeApi, resendYdbCodeApi, syncYdbUser } from './ydbClient';
import { SchematorLogo } from './SchematorLogo';
import { LegalDocType } from './LegalModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  onOpenLegal?: (doc: LegalDocType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, onOpenLegal }) => {
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
  
  // Agreements state (3 checkboxes)
  const [agreeOffer, setAgreeOffer] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [shakeAgreements, setShakeAgreements] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab('yandex');
      setIsSignUp(false);
      setIsVerifying(false);
      setVerifyEmail('');
      setVerifyCode('');
      setEmail('');
      setPassword('');
      setName('');
      setAgreeOffer(false);
      setAgreePrivacy(false);
      setAgreeAge(false);
      setShakeAgreements(false);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allAgreed = agreeOffer && agreePrivacy && agreeAge;

  const toggleAllAgreements = () => {
    const nextState = !allAgreed;
    setAgreeOffer(nextState);
    setAgreePrivacy(nextState);
    setAgreeAge(nextState);
    if (nextState) {
      setError(null);
    }
  };

  const triggerShake = () => {
    setShakeAgreements(true);
    setTimeout(() => setShakeAgreements(false), 600);
  };

  // Official Yandex OAuth Popup Trigger
  const handleYandexOAuth = async () => {
    setError(null);

    if (!agreeOffer || !agreePrivacy || !agreeAge) {
      setError('Для входа через Яндекс ID необходимо подтвердить все 3 обязательных согласия ниже.');
      triggerShake();
      return;
    }

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

    // Require agreements only for new account registrations
    if (isSignUp && (!agreeOffer || !agreePrivacy || !agreeAge)) {
      setError('Для регистрации аккаунта необходимо подтвердить все 3 обязательных согласия ниже.');
      triggerShake();
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
      setSuccessMsg('Email успешно подтвержден! Вам начислен 1 бесплатный Coin.');
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xl w-full max-w-sm overflow-hidden text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <SchematorLogo className="w-5 h-5 rounded select-none shrink-0" />
            <div>
              <h3 className="font-bold text-xs uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
                {isVerifying ? 'Подтверждение Email' : 'Авторизация в Схематор'}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection (only in main auth view) */}
        {!isVerifying && (
          <div className="grid grid-cols-2 p-1 mx-4 mt-3 bg-zinc-100 dark:bg-zinc-800 rounded-md gap-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setTab('yandex'); setError(null); setSuccessMsg(null); }}
              className={`py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                tab === 'yandex' 
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#FC3F1D] text-white flex items-center justify-center text-[9px] font-black leading-none">
                Я
              </span>
              <span>Яндекс ID</span>
            </button>

            <button
              type="button"
              onClick={() => { setTab('email'); setError(null); setSuccessMsg(null); }}
              className={`py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                tab === 'email' 
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-zinc-500" />
              <span>Email</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-4">
          {error && (
            <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-md text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-md text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW: EMAIL VERIFICATION CODE ENTRY */}
          {isVerifying ? (
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-3">
              <div className="text-center pb-1">
                <div className="w-9 h-9 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center mx-auto mb-2 border border-zinc-200 dark:border-zinc-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                  Код подтверждения отправлен на:
                </p>
                <p className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {verifyEmail}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 text-center">
                  6-значный код из письма
                </label>
                <div className="relative max-w-[200px] mx-auto">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-center text-base tracking-[0.2em] font-mono font-bold outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 text-center mt-1.5">
                  Проверьте папку «Входящие» и «Спам»
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || verifyCode.length !== 6}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 disabled:opacity-50 font-medium rounded-md text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{loading ? 'Проверка...' : 'Подтвердить почту (+1 Coin)'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Отправить повторно</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsVerifying(false); setError(null); setSuccessMsg(null); }}
                  className="text-zinc-500 hover:underline cursor-pointer"
                >
                  Назад
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* TAB 1: YANDEX ID AUTH */}
              {tab === 'yandex' && (
                <div className="space-y-3">
                  {/* 3 Agreement Checkboxes */}
                  <div className={`p-2.5 rounded-md border transition-all duration-150 ${
                    shakeAgreements 
                      ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20' 
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40'
                  }`}>
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Обязательные согласия
                      </span>
                      <button
                        type="button"
                        onClick={toggleAllAgreements}
                        className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{allAgreed ? 'Снять все' : 'Выбрать все'}</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {/* 1. Публичная оферта */}
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <button
                          type="button"
                          onClick={() => { setAgreeOffer(!agreeOffer); setError(null); }}
                          className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            agreeOffer 
                              ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900' 
                              : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                          }`}
                        >
                          {agreeOffer && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>
                        <span className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 select-none">
                          Принимаю условия{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenLegal?.('offer');
                            }}
                            className="text-zinc-900 dark:text-zinc-200 font-medium underline underline-offset-2 hover:text-blue-600 transition-colors"
                          >
                            Публичной оферты
                          </button>
                        </span>
                      </label>

                      {/* 2. Политика обработки персональных данных (152-ФЗ) */}
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <button
                          type="button"
                          onClick={() => { setAgreePrivacy(!agreePrivacy); setError(null); }}
                          className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            agreePrivacy 
                              ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900' 
                              : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                          }`}
                        >
                          {agreePrivacy && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>
                        <span className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 select-none">
                          Согласие на{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenLegal?.('privacy');
                            }}
                            className="text-zinc-900 dark:text-zinc-200 font-medium underline underline-offset-2 hover:text-blue-600 transition-colors"
                          >
                            обработку данных (152-ФЗ)
                          </button>
                        </span>
                      </label>

                      {/* 3. Возраст 14+ */}
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <button
                          type="button"
                          onClick={() => { setAgreeAge(!agreeAge); setError(null); }}
                          className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            agreeAge 
                              ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900' 
                              : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                          }`}
                        >
                          {agreeAge && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>
                        <span className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 select-none">
                          Подтверждаю возраст <strong className="font-semibold text-zinc-800 dark:text-zinc-200">14 лет или более</strong>
                        </span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleYandexOAuth}
                    disabled={loading}
                    className="w-full py-2 bg-[#FC3F1D] hover:bg-[#E03415] disabled:opacity-50 text-white font-medium rounded-md flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    <span className="w-4 h-4 rounded-full bg-white text-[#FC3F1D] flex items-center justify-center text-[10px] font-black">
                      Я
                    </span>
                    <span>{loading ? 'Открытие Яндекс...' : 'Войти с Яндекс ID'}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                  <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
                    Быстрый вход через профиль Яндекс ID.
                  </p>
                </div>
              )}

              {/* TAB 2: EMAIL AUTH */}
              {tab === 'email' && (
                <form onSubmit={handleEmailAuth} className="space-y-2.5">
                  {isSignUp && (
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Имя
                      </label>
                      <div className="relative">
                        <UserIcon className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Иван"
                          className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Электронная почта
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ivan@yandex.ru"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Пароль
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                      />
                    </div>
                  </div>

                  {/* 3 Agreement Checkboxes for Registration */}
                  {isSignUp && (
                    <div className={`p-2.5 rounded-md border transition-all duration-150 ${
                      shakeAgreements 
                        ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20' 
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40'
                    }`}>
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Обязательные согласия
                        </span>
                        <button
                          type="button"
                          onClick={toggleAllAgreements}
                          className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{allAgreed ? 'Снять все' : 'Выбрать все'}</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {/* 1. Публичная оферта */}
                        <label className="flex items-start gap-2 cursor-pointer group">
                          <button
                            type="button"
                            onClick={() => { setAgreeOffer(!agreeOffer); setError(null); }}
                            className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              agreeOffer 
                                ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900' 
                                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                            }`}
                          >
                            {agreeOffer && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>
                          <span className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 select-none">
                            Принимаю условия{' '}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onOpenLegal?.('offer');
                              }}
                              className="text-zinc-900 dark:text-zinc-200 font-medium underline underline-offset-2 hover:text-blue-600 transition-colors"
                            >
                              Публичной оферты
                            </button>
                          </span>
                        </label>

                        {/* 2. Политика обработки персональных данных (152-ФЗ) */}
                        <label className="flex items-start gap-2 cursor-pointer group">
                          <button
                            type="button"
                            onClick={() => { setAgreePrivacy(!agreePrivacy); setError(null); }}
                            className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              agreePrivacy 
                                ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900' 
                                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                            }`}
                          >
                            {agreePrivacy && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>
                          <span className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 select-none">
                            Согласие на{' '}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onOpenLegal?.('privacy');
                              }}
                              className="text-zinc-900 dark:text-zinc-200 font-medium underline underline-offset-2 hover:text-blue-600 transition-colors"
                            >
                              обработку данных (152-ФЗ)
                            </button>
                          </span>
                        </label>

                        {/* 3. Возраст 14+ */}
                        <label className="flex items-start gap-2 cursor-pointer group">
                          <button
                            type="button"
                            onClick={() => { setAgreeAge(!agreeAge); setError(null); }}
                            className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              agreeAge 
                                ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900' 
                                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                            }`}
                          >
                            {agreeAge && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>
                          <span className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 select-none">
                            Подтверждаю возраст <strong className="font-semibold text-zinc-800 dark:text-zinc-200">14 лет или более</strong>
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 mt-1 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 disabled:opacity-50 font-medium rounded-md flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>{loading ? 'Загрузка...' : isSignUp ? 'Зарегистрироваться' : 'Войти в аккаунт'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMsg(null); }}
                      className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline font-medium cursor-pointer"
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
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 text-center">
          {isVerifying 
            ? 'Токен будет начислен сразу после подтверждения почты' 
            : 'Только подтвержденные аккаунты могут создавать схемы'}
        </div>
      </div>
    </div>
  );
};
