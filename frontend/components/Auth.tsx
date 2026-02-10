
import React, { useState } from 'react';
import { Language, User } from '../types';
import { translations } from '../translations';

interface AuthProps {
  language: Language;
  onAuthComplete: (user: User) => void;
  onCancel?: () => void;
}

const BrandLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex flex-col items-center gap-4 ${className}`}>
    <svg viewBox="0 0 300 120" className="w-32 h-16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="85" cy="60" r="50" stroke="currentColor" strokeWidth="15"/>
      <circle cx="150" cy="60" r="50" stroke="currentColor" strokeWidth="15"/>
      <circle cx="215" cy="60" r="50" stroke="currentColor" strokeWidth="15"/>
    </svg>
    <div className="flex flex-col items-center -space-y-2.5">
      <span className="text-5xl font-black tracking-tighter text-white uppercase scale-x-125">TOP</span>
      <span className="text-sm font-medium tracking-[0.7em] text-slate-400 uppercase pl-[0.7em]">MAX</span>
    </div>
  </div>
);

const Auth: React.FC<AuthProps> = ({ language, onAuthComplete, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const t = translations;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAuthComplete({
      name: formData.name || formData.email.split('@')[0],
      email: formData.email,
      isGuest: false
    });
  };

  const handleGuest = () => {
    onAuthComplete({ name: 'Guest', email: '', isGuest: true });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 relative">
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
        <div className="bg-slate-900 p-12 text-center">
          <BrandLogo className="text-white mb-4" />
          <p className="text-slate-400 text-xs font-black tracking-widest uppercase mt-4">Premium Sanitary Ware</p>
        </div>

        <div className="p-8 sm:p-10">
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${isLogin ? 'bg-white text-blue-600 shadow-md scale-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t.login[language]}
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-md scale-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t.signup[language]}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="relative group">
                <input 
                  type="text" 
                  required
                  placeholder={t.namePlaceholder[language]}
                  className="w-full bg-gray-50 border border-transparent rounded-2xl px-6 py-4 text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            )}
            <div className="relative group">
              <input 
                type="email" 
                required
                placeholder={t.emailPlaceholder[language]}
                className="w-full bg-gray-50 border border-transparent rounded-2xl px-6 py-4 text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="relative group">
              <input 
                type="password" 
                required
                placeholder={t.passwordPlaceholder[language]}
                className="w-full bg-gray-50 border border-transparent rounded-2xl px-6 py-4 text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95">
              {isLogin ? t.login[language] : t.signup[language]}
            </button>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <span className="relative bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-300">OR</span>
          </div>

          <button 
            onClick={handleGuest}
            className="w-full bg-white border-2 border-slate-100 text-slate-600 py-5 rounded-2xl font-black text-lg hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95"
          >
            {t.guest[language]}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
