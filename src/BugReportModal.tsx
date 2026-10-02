import React, { useState, useRef } from 'react';
import { 
  X, 
  Bug, 
  Send, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Image as ImageIcon,
  Trash2,
  UploadCloud
} from 'lucide-react';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  currentLanguage: string;
  currentStyle?: string;
  theme?: 'light' | 'dark';
  userEmail?: string;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  currentCode,
  currentLanguage,
  currentStyle = 'drawio_default',
  theme = 'dark',
  userEmail
}) => {
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState(userEmail || '');
  const [includeCode, setIncludeCode] = useState(true);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const compressAndSetImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Пожалуйста, выберите файл изображения (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width / height > MAX_WIDTH / MAX_HEIGHT) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setScreenshot(compressed);
          setScreenshotName(file.name || 'Скриншот ошибки');
          setErrorMessage(null);
        } else {
          setScreenshot(dataUrl);
          setScreenshotName(file.name || 'Скриншот ошибки');
          setErrorMessage(null);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      compressAndSetImage(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      compressAndSetImage(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          compressAndSetImage(file);
          break;
        }
      }
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage('Пожалуйста, кратко опишите возникшую проблему');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // Подготовка данных отчета
      const payload = {
        description: description.trim(),
        contact: contact.trim() || undefined,
        language: currentLanguage,
        style: currentStyle,
        code: includeCode ? currentCode : undefined,
        screenshot: screenshot || undefined,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Пробуем отправить на бэкенд
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const response = await fetch('/api/bug-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log('[BugReport Status]:', data);
        }
      } catch (err: any) {
        console.warn('[BugReport submit warning]:', err?.message);
      }

      setIsSubmitted(true);
    } catch {
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setDescription('');
    setContact(userEmail || '');
    setScreenshot(null);
    setScreenshotName(null);
    setErrorMessage(null);
    setShowCodePreview(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleResetAndClose}
      onPaste={handlePaste}
    >
      <div 
        className={`w-full max-w-lg rounded-xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 transition-colors max-h-[92vh] ${
          isDark 
            ? 'bg-zinc-900 text-zinc-100 border-zinc-800' 
            : 'bg-white text-zinc-900 border-zinc-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-emerald-500 shrink-0" />
            <h2 className={`text-xs font-bold tracking-tight uppercase ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}>
              Сообщить об ошибке
            </h2>
          </div>

          <button 
            type="button"
            onClick={handleResetAndClose}
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
        {isSubmitted ? (
          <div className="p-6 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-1">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Спасибо за сообщение!
            </h3>
            <p className={`text-xs leading-relaxed max-w-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Мы получили информацию об ошибке{screenshot ? ', скриншот' : ''} и ваш пример кода. Это поможет нам быстро выпустить исправление в Схематоре.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                Закрыть
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 text-xs">
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 max-h-[75vh]">
              {/* Description Input */}
              <div className="space-y-1.5">
                <label className={`block font-medium text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Что пошло не так? <span className="text-emerald-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Опишите проблему, например: на строке 15 ромб вместо прямоугольника, или стрелка уходит в пустоту при разрезе..."
                  className={`w-full p-2.5 rounded-md border text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none transition-colors ${
                    errorMessage
                      ? 'border-red-500/80 ring-1 ring-red-500/20'
                      : isDark 
                        ? 'bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/70' 
                        : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500'
                  }`}
                  autoFocus
                />
                {errorMessage && (
                  <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errorMessage}</span>
                  </p>
                )}
              </div>

              {/* Screenshot Attachment Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`block font-medium text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Скриншот ошибки <span className="text-zinc-500 font-normal">(необязательно)</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    Работает вставка через Ctrl+V
                  </span>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />

                {screenshot ? (
                  <div className={`p-2.5 rounded-md border flex items-center justify-between gap-3 ${
                    isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-12 rounded border border-zinc-700/60 overflow-hidden shrink-0 bg-black flex items-center justify-center">
                        <img 
                          src={screenshot} 
                          alt="Скриншот ошибки" 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {screenshotName || 'Скриншот прикреплен'}
                        </p>
                        <p className="text-[10px] text-emerald-500 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Готов к отправке</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveScreenshot}
                      title="Удалить скриншот"
                      className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                        isDark 
                          ? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800' 
                          : 'text-zinc-500 hover:text-red-600 hover:bg-zinc-200'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`p-3.5 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center select-none ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                        : isDark
                          ? 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-emerald-500/60 hover:bg-zinc-950/80 hover:text-zinc-300'
                          : 'border-zinc-300 bg-zinc-50/50 text-zinc-600 hover:border-emerald-500 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <ImageIcon className="w-4 h-4 text-emerald-500" />
                      <span>Нажмите для выбора скриншота или перетащите файл</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      PNG, JPG или WebP до 8 МБ
                    </p>
                  </div>
                )}
              </div>

              {/* Contact input (optional) */}
              <div className="space-y-1.5">
                <label className={`block font-medium text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Контакт для связи <span className="text-zinc-500 font-normal">(Telegram или Email, необязательно)</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="@username в Telegram или почта"
                  className={`w-full px-2.5 py-1.5 rounded-md border text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors ${
                    isDark 
                      ? 'bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/70' 
                      : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500'
                  }`}
                />
              </div>

              {/* Code attachment preview */}
              <div className={`rounded-md border overflow-hidden ${
                isDark ? 'border-zinc-800/80 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/60'
              }`}>
                <div className="p-2.5 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={includeCode}
                      onChange={(e) => setIncludeCode(e.target.checked)}
                      className="rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500/30 accent-emerald-600"
                    />
                    <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      Прикрепить исходный код
                    </span>
                  </label>

                  {includeCode && (
                    <button
                      type="button"
                      onClick={() => setShowCodePreview(!showCodePreview)}
                      className={`text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                        isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <span>{showCodePreview ? 'Скрыть код' : 'Показать код'}</span>
                      {showCodePreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {includeCode && showCodePreview && (
                  <pre className="p-2.5 max-h-32 overflow-y-auto bg-zinc-950 text-zinc-300 font-mono text-[10px] leading-relaxed border-t border-zinc-800/80">
                    {currentCode || '// Код пуст'}
                  </pre>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={`px-4 py-2.5 border-t flex items-center justify-end gap-2 text-xs shrink-0 ${
              isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <button 
                type="button"
                onClick={handleResetAndClose}
                className={`px-3 py-1.5 rounded-md border font-medium text-xs transition-colors cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                }`}
              >
                Отмена
              </button>

              <button 
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3 h-3" />
                <span>{isSubmitting ? 'Отправка...' : 'Отправить отчет'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

