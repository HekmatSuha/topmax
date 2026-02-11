
import React from 'react';
import { Product, Language } from '../types';
import { translations } from '../translations';

interface ProductCardProps {
  product: Product;
  onInquire: (product: Product) => void;
  language: Language;
  isLiked?: boolean;
  onToggleLike?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onInquire, language, isLiked, onToggleLike }) => {
  const outOfStock = product.inStock === false;
  const hasDiscount = product.discountPercent > 0 && product.discountedPrice != null;
  const displayPrice = hasDiscount ? product.discountedPrice! : product.price;

  return (
    <div className={`group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 ${outOfStock ? 'opacity-75' : ''}`}>
      <div className="relative h-64 overflow-hidden bg-gray-200">
        <img
          src={product.imageUrls[0]}
          alt={product.name[language]}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${outOfStock ? 'grayscale-[40%]' : ''}`}
        />

        {/* Badges — top left */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {outOfStock && (
            <div className="bg-red-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-md">
              {translations.outOfStock[language]}
            </div>
          )}
          {hasDiscount && (
            <div className="bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-md">
              -{product.discountPercent}%
            </div>
          )}
          {product.isNew && (
            <div className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-md">
              {translations.new[language]}
            </div>
          )}
        </div>

        {/* Heart / Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike?.();
          }}
          className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md shadow-lg ${
            isLiked
              ? 'bg-red-500 text-white scale-110'
              : 'bg-white/70 text-slate-400 hover:text-red-500 hover:bg-white hover:scale-110'
          }`}
        >
          <svg
            className={`w-6 h-6 transition-transform duration-300 ${isLiked ? 'scale-110 fill-current' : 'fill-none'}`}
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-0.5">{product.name[language]}</h3>
        <span className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
          CODE: {product.itemCode}
        </span>
        {product.dimensions && (
          <span className="block text-[11px] font-semibold text-slate-400 mb-3">
            {product.dimensions}
          </span>
        )}
        <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed">
          {product.description[language]}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-baseline gap-2">
            {hasDiscount && (
              <span className="text-sm font-serif font-bold text-slate-400 line-through">
                {product.price.toLocaleString()} ₸
              </span>
            )}
            <span className={`text-xl font-serif font-black ${hasDiscount ? 'text-red-500' : 'text-blue-600'}`}>
              {displayPrice.toLocaleString()} ₸
            </span>
          </div>
          <button
            onClick={() => onInquire(product)}
            className="text-sm font-semibold text-white bg-slate-900 px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            {translations.details[language]}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
