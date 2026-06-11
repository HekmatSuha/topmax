
import React, { useState } from 'react';
import { Language, User } from '../types';
import { translations } from '../translations';

interface ProfileProps {
  language: Language;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onLanguageChange: (lang: Language) => void;
  onNavigate: (page: string) => void;
  onRedeemWholesaleCode: (code: string) => Promise<{ success: boolean; error?: string }>;
}

const languageLabels: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  kk: 'Қазақша',
};

const Profile: React.FC<ProfileProps> = ({
  language,
  user,
  onOpenAuth,
  onLogout,
  onLanguageChange,
  onNavigate,
  onRedeemWholesaleCode,
}) => {
  const t = translations;
  const [wholesaleCode, setWholesaleCode] = useState('');
  const [wholesaleStatus, setWholesaleStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [wholesaleError, setWholesaleError] = useState('');

  const handleWholesaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wholesaleCode.trim()) return;
    setWholesaleStatus('loading');
    setWholesaleError('');
    const result = await onRedeemWholesaleCode(wholesaleCode.trim());
    if (result.success) {
      setWholesaleStatus('success');
      setWholesaleCode('');
    } else {
      setWholesaleStatus('error');
      setWholesaleError(result.error || t.wholesaleCodeError[language]);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-3 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">TOP MAX</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
          {t.profileTitle[language]}
        </h2>
      </div>

      {user ? (
        <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-black uppercase text-white shadow-lg">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.accountLabel[language]}</p>
              <p className="truncate text-base font-bold text-slate-900">{user.name}</p>
              {user.email && <p className="truncate text-xs font-medium text-slate-400">{user.email}</p>}
            </div>
            {user.isWholesale && (
              <span className="ml-auto shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                Wholesale
              </span>
            )}
          </div>

          {!user.isWholesale && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{t.wholesaleCodeLabel[language]}</p>
              {wholesaleStatus === 'success' ? (
                <p className="text-xs font-bold text-emerald-600">{t.wholesaleCodeSuccess[language]}</p>
              ) : (
                <form onSubmit={handleWholesaleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={wholesaleCode}
                    onChange={e => { setWholesaleCode(e.target.value); setWholesaleStatus('idle'); }}
                    placeholder={t.wholesaleCodePlaceholder[language]}
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    type="submit"
                    disabled={wholesaleStatus === 'loading' || !wholesaleCode.trim()}
                    className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
                  >
                    {wholesaleStatus === 'loading' ? '...' : t.wholesaleCodeApply[language]}
                  </button>
                </form>
              )}
              {wholesaleStatus === 'error' && (
                <p className="mt-1.5 text-[11px] font-bold text-red-500">{wholesaleError}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium leading-6 text-slate-600">{t.loginPrompt[language]}</p>
          <button
            onClick={onOpenAuth}
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-600 active:scale-95"
          >
            {t.login[language]}
          </button>
        </div>
      )}

      <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t.languageLabel[language]}</p>
        <div className="grid grid-cols-3 gap-2">
          {(['en', 'ru', 'kk'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => onLanguageChange(lang)}
              className={`rounded-xl px-3 py-2.5 text-sm transition-colors ${
                language === lang
                  ? 'bg-blue-50 font-black text-blue-600'
                  : 'bg-slate-50 font-bold text-slate-500 hover:bg-slate-100'
              }`}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <button
          onClick={() => onNavigate('contact')}
          className="flex w-full items-center justify-between text-sm font-bold text-slate-700 transition-colors hover:text-blue-600"
        >
          <span>{t.contact[language]}</span>
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {user && (
        <button
          onClick={onLogout}
          className="mb-20 flex w-full items-center justify-center gap-2 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-black text-red-500 transition-colors hover:bg-red-100"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t.logout[language]}
        </button>
      )}
    </div>
  );
};

export default Profile;
