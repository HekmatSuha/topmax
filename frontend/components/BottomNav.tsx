
import React from 'react';
import { Language } from '../types';
import { translations } from '../translations';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onSearch: () => void;
  basketCount: number;
  favoritesCount: number;
  language: Language;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate, onSearch, basketCount, favoritesCount, language }) => {
  const t = translations;

  const Badge: React.FC<{ count: number }> = ({ count }) =>
    count > 0 ? (
      <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-black text-white">
        {count > 99 ? '99+' : count}
      </span>
    ) : null;

  const items = [
    {
      id: 'catalog',
      label: t.tabCatalog[language],
      isActive: currentPage === 'home',
      onClick: () => onNavigate('home'),
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'search',
      label: t.tabSearch[language],
      isActive: false,
      onClick: onSearch,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: 'basket',
      label: t.tabBasket[language],
      isActive: currentPage === 'basket',
      onClick: () => onNavigate('basket'),
      icon: (
        <div className="relative">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <Badge count={basketCount} />
        </div>
      ),
    },
    {
      id: 'favorites',
      label: t.tabFavorites[language],
      isActive: currentPage === 'favorites',
      onClick: () => onNavigate('favorites'),
      icon: (
        <div className="relative">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <Badge count={favoritesCount} />
        </div>
      ),
    },
    {
      id: 'profile',
      label: t.tabProfile[language],
      isActive: currentPage === 'profile',
      onClick: () => onNavigate('profile'),
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex h-14 items-stretch justify-around px-1">
        {items.map(item => (
          <button
            key={item.id}
            onClick={item.onClick}
            aria-label={item.label}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
              item.isActive ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-bold leading-none">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
