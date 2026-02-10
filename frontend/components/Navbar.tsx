
import React, { useState, useRef, useEffect } from 'react';
import { Language, User } from '../types';
import { translations } from '../translations';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  basketCount: number;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  user: User | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  backendStatus: string;
}

const LogoMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 300 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="85" cy="60" r="48" stroke="currentColor" strokeWidth="14"/>
    <circle cx="150" cy="60" r="48" stroke="currentColor" strokeWidth="14"/>
    <circle cx="215" cy="60" r="48" stroke="currentColor" strokeWidth="14"/>
  </svg>
);

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage, basketCount, language, onLanguageChange, user, onLogout, onOpenAuth, backendStatus }) => {
  const t = translations;
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: t.catalog[language], id: 'home' },
    { label: t.contact[language], id: 'contact' },
  ];

  const flags = {
    en: '🇺🇸',
    ru: '🇷🇺',
    kk: '🇰🇿'
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white border-b-2 border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <div 
              className="flex-shrink-0 flex items-center cursor-pointer group" 
              onClick={() => onNavigate('home')}
            >
              <LogoMark className="w-16 h-8 text-slate-900 mr-3 group-hover:scale-110 transition-transform duration-300" />
              <div className="flex flex-col items-center -space-y-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-xl font-black tracking-tighter text-slate-900 uppercase scale-x-110">TOP</span>
                  <div className={`w-2 h-2 rounded-full mt-1 ${
                    backendStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                    backendStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                  }`} title={`Backend: ${backendStatus}`} />
                </div>
                <span className="text-[10px] font-medium tracking-[0.4em] text-slate-600 uppercase">MAX</span>
              </div>
            </div>
            <div className="hidden md:ml-10 md:flex md:space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                    currentPage === item.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Language Switcher - Always Visible on Tablet/Desktop, responsive on Mobile */}
            <div className="flex items-center bg-gray-50 p-1 rounded-2xl border border-gray-100">
              {(['en', 'ru', 'kk'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-black rounded-xl transition-all ${
                    language === lang 
                      ? 'bg-white text-blue-600 shadow-md scale-105' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className="text-sm sm:text-base leading-none">{flags[lang]}</span>
                  <span className="hidden xs:inline uppercase text-[10px]">{lang}</span>
                </button>
              ))}
            </div>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1.5 pr-3 sm:pr-4 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 group"
                >
                  <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm uppercase shadow-lg">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="block text-[8px] font-black uppercase text-slate-400 leading-none mb-0.5">Account</span>
                    <span className="block text-xs font-bold text-slate-900 truncate max-w-[70px]">{user.name}</span>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 mb-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{user.email || user.name}</p>
                    </div>
                    <button 
                      onClick={() => {
                        onLogout();
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t.logout[language]}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={onOpenAuth}
                className="bg-slate-900 text-white px-4 sm:px-6 py-2.5 rounded-xl font-black text-sm hover:bg-blue-600 transition-all shadow-lg active:scale-95"
              >
                {t.login[language]}
              </button>
            )}

            <button 
              onClick={() => onNavigate('basket')}
              className="relative p-2.5 bg-slate-100 rounded-2xl text-slate-600 hover:text-blue-600 transition-all active:scale-90"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {basketCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-6 h-6 text-xs font-black text-white bg-blue-600 rounded-full border-2 border-white animate-bounce">
                  {basketCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
