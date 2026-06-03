
import React from 'react';
import { BasketItem, Language } from '../types';
import { COMPANY_PHONE } from '../constants';
import { translations } from '../translations';

interface BasketProps {
  items: BasketItem[];
  onRemove: (productId: string, selectedColor?: string) => void;
  onUpdateQuantity: (productId: string, selectedColor: string | undefined, quantity: number) => void;
  onContinueShopping: () => void;
  language: Language;
}

const hasWholesalePrice = (item: BasketItem) => item.isWholesaleVisible && item.wholesalePriceUsd;
const getWholesalePrice = (item: BasketItem) => Number(item.wholesalePriceUsd || 0);
const formatKzt = (price: number) => `${price.toLocaleString()} ₸`;
const formatUsd = (price: number) => `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Basket: React.FC<BasketProps> = ({ items, onRemove, onUpdateQuantity, onContinueShopping, language }) => {
  const t = translations;
  const isWholesaleList = items.length > 0 && items.every(hasWholesalePrice);
  const total = isWholesaleList
    ? items.reduce((sum, item) => sum + getWholesalePrice(item) * item.quantity, 0)
    : 0;

  const handleConfirmPurchase = () => {
    if (items.length === 0) return;

    const orderDetails = items
      .map(item => {
        const colorName = item.selectedColor ? t[item.selectedColor][language] : 'Standard';
        const ep = isWholesaleList && hasWholesalePrice(item) ? getWholesalePrice(item) : 0;
        const formattedPrice = isWholesaleList ? formatUsd(ep) : t.priceOnRequest[language];
        return `• *${item.name[language]}* (x${item.quantity})\n  Code: ${item.itemCode}\n  Finish: ${colorName}\n  Price: ${formattedPrice}\n  Link: https://topmax.kz/?product=${item.id}\n`;
      })
      .join('\n');

    const header = isWholesaleList ? 'TOPMAX wholesale shop list' : t.waMsgHeader[language];
    const totalText = isWholesaleList ? `\n*${t.waMsgTotal[language]}: ${formatUsd(total)}*` : '';
    const message = `${header}\n\n${t.waMsgIntro[language]}\n\n${orderDetails}${totalText}\n\n${t.waMsgFooter[language]}`;

    const whatsappUrl = `https://wa.me/${COMPANY_PHONE}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-blue-600 font-bold uppercase tracking-widest text-xs mb-2 block">Checkout</span>
          <h1 className="text-4xl font-serif font-black text-slate-900 mb-1">{t.yourBasket[language]}</h1>
          <p className="text-slate-400 text-lg">Review your selection before finalizing.</p>
        </div>
        <button onClick={onContinueShopping} className="bg-white border border-gray-200 px-6 py-3 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          {t.keepLooking[language]}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-[2rem] px-8 py-20 text-center shadow-lg border border-gray-100 flex flex-col items-center">
          <svg className="mb-8 h-36 w-36 text-slate-100" viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="72" cy="72" r="64" fill="currentColor" />
            <path d="M48 60h48l-6 40H54L48 60z" fill="white" stroke="#e2e8f0" strokeWidth="2" />
            <path d="M60 60V52a12 12 0 0 1 24 0v8" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
            <circle cx="65" cy="88" r="3" fill="#cbd5e1" />
            <circle cx="79" cy="88" r="3" fill="#cbd5e1" />
          </svg>
          <h2 className="font-display text-3xl font-bold text-slate-800 mb-3">{t.basketEmpty[language]}</h2>
          <p className="text-slate-400 text-base mb-10 max-w-xs">Browse our premium sanitary collection and add items you love.</p>
          <button
            onClick={onContinueShopping}
            className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-base shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            {t.catalog[language]}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-6">
            {items.map((item, idx) => {
              return (
                <div key={`${item.id}-${item.selectedColor}-${idx}`} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 group relative">
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center p-2">
                    <img src={item.imageUrls[0]} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-grow text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{t[item.category][language]}</span>
                      {item.selectedColor && (
                        <span className="bg-slate-900 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full">
                          {t[item.selectedColor][language]}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-1">{item.name[language]}</h3>
                    <div className="flex items-center justify-center sm:justify-start gap-6 mt-4">
                       <div className="flex items-baseline gap-2">
                         {isWholesaleList && hasWholesalePrice(item) ? (
                           <span className="text-2xl font-serif font-black text-emerald-500">{formatUsd(getWholesalePrice(item) * item.quantity)}</span>
                         ) : (
                           <span className="max-w-56 text-sm font-black uppercase leading-snug tracking-wide text-blue-600">
                             {t.priceOnRequest[language]}
                           </span>
                         )}
                       </div>
                       <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-gray-100">
                          <button onClick={() => onUpdateQuantity(item.id, item.selectedColor, Math.max(1, item.quantity - 1))} className="w-10 h-10 flex items-center justify-center text-slate-900 font-black text-xl hover:bg-white rounded-lg">-</button>
                          <span className="w-10 text-center font-black text-lg text-slate-900">{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.id, item.selectedColor, item.quantity + 1)} className="w-10 h-10 flex items-center justify-center text-slate-900 font-black text-xl hover:bg-white rounded-lg">+</button>
                       </div>
                    </div>
                  </div>
                  <button onClick={() => onRemove(item.id, item.selectedColor)} className="sm:absolute top-6 right-6 text-slate-200 hover:text-red-500 transition-colors p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="lg:col-span-4">
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl sticky top-28 border-t-8 border-blue-600">
               <h2 className="text-xl font-black mb-8 tracking-widest text-center uppercase">{t.summary[language]}</h2>
               <div className="space-y-4 mb-8">
                 <div className="flex justify-between items-center opacity-40 uppercase tracking-widest font-black text-[10px]">
                    <span>Subtotal</span>
                    <span>{isWholesaleList ? formatUsd(total) : t.priceOnRequest[language]}</span>
                 </div>
                 <div className="flex justify-between items-center border-t border-white/10 pt-4">
                    <span className="text-sm font-black uppercase tracking-widest">Total</span>
                    <span className={`font-black ${isWholesaleList ? 'text-3xl font-serif text-blue-400' : 'max-w-44 text-right text-sm uppercase leading-snug tracking-wide text-blue-300'}`}>
                      {isWholesaleList ? formatUsd(total) : t.priceOnRequest[language]}
                    </span>
                 </div>
               </div>

               <button onClick={handleConfirmPurchase} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 group">
                 <span className="text-2xl">🟢</span>
                 {t.confirmOrder[language]}
               </button>

               <div className="mt-8 flex items-start gap-3 p-4 bg-white/5 rounded-2xl">
                  <span className="text-lg">🛡️</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed font-medium">{t.waCheckoutNote[language]}</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Basket;
