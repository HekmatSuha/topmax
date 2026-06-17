
import React, { useState } from 'react';
import { Language, User } from '../types';
import { translations } from '../translations';

interface AuthProps {
  language: Language;
  onAuthComplete: (user: User) => void;
  onCancel?: () => void;
}

const Auth: React.FC<AuthProps> = ({ language, onAuthComplete, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('phone');
  const [formData, setFormData] = useState({ email: '', phone: '', password: '', name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const t = translations;
  const baseUrl = import.meta.env.DEV ? 'http://localhost:8000' : '';
  const authEndpoint = isLogin ? `${baseUrl}/api/auth/signin/` : `${baseUrl}/api/auth/signup/`;

  const switchMode = (login: boolean) => {
    setIsLogin(login);
    setError('');
  };

  const switchMethod = (method: 'email' | 'phone') => {
    setAuthMethod(method);
    setError('');
    setFormData(f => ({ ...f, email: '', phone: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const body: Record<string, string> = { password: formData.password };
    if (!isLogin) body.name = formData.name;
    if (authMethod === 'email') body.email = formData.email;
    else body.phone = formData.phone;

    try {
      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed.');
      onAuthComplete(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = () => {
    onAuthComplete({ name: 'Guest', email: '', isGuest: true });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[94vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300"
      >
        {/* Sticky header: drag handle + title + close */}
        <div className="sticky top-0 z-10 bg-white px-6 pt-3 pb-3 border-b border-slate-100">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">{t.authTitle[language]}</h2>
            {onCancel && (
              <button
                onClick={onCancel}
                aria-label="Close"
                className="w-9 h-9 -mr-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 pt-5 sm:pt-6">
          {/* Sign In / Sign Up tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button
              onClick={() => switchMode(true)}
              className={`flex-1 py-2.5 rounded-lg font-black text-sm transition-all ${isLogin ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t.login[language]}
            </button>
            <button
              onClick={() => switchMode(false)}
              className={`flex-1 py-2.5 rounded-lg font-black text-sm transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t.signup[language]}
            </button>
          </div>

          {/* Email / Phone method toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => switchMethod('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black border transition-all ${authMethod === 'email' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-slate-400 hover:border-slate-300'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t.authMethodEmail[language]}
            </button>
            <button
              type="button"
              onClick={() => switchMethod('phone')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black border transition-all ${authMethod === 'phone' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-slate-400 hover:border-slate-300'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {t.authMethodPhone[language]}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <input
                type="text"
                required
                placeholder={t.namePlaceholder[language]}
                className="w-full bg-gray-50 border border-transparent rounded-xl px-5 py-3 text-sm text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            )}

            {authMethod === 'email' ? (
              <input
                type="email"
                required
                placeholder={t.emailPlaceholder[language]}
                className="w-full bg-gray-50 border border-transparent rounded-xl px-5 py-3 text-sm text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            ) : (
              <input
                type="tel"
                required
                placeholder={t.phonePlaceholder[language]}
                className="w-full bg-gray-50 border border-transparent rounded-xl px-5 py-3 text-sm text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            )}

            <input
              type="password"
              required
              placeholder={t.passwordPlaceholder[language]}
              className="w-full bg-gray-50 border border-transparent rounded-xl px-5 py-3 text-sm text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />

            {error && (
              <p className="text-xs font-semibold text-red-500">{error}</p>
            )}
            <button
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Please wait...' : isLogin ? t.login[language] : t.signup[language]}
            </button>
          </form>

          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <span className="relative bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-300">OR</span>
          </div>

          <button
            onClick={handleGuest}
            className="w-full bg-white border-2 border-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-sm hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95"
          >
            {t.guest[language]}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
