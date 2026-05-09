import React, { useEffect, useMemo, useState } from 'react';
import { Product, Language } from '../types';
import { translations } from '../translations';

interface ProductCardProps {
  product: Product;
  onInquire: (product: Product) => void;
  onAddToBasket?: (product: Product) => void;
  language: Language;
  isLiked?: boolean;
  onToggleLike?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onInquire, onAddToBasket, language, isLiked, onToggleLike }) => {
  const outOfStock = product.inStock === false;
  const hasWholesalePrice = product.isWholesaleVisible && product.wholesalePriceUsd;
  const productName = product.name[language] || product.name.en;
  const priceRequestLabel: Record<Language, string> = {
    en: 'Price on request',
    ru: 'Цена по запросу',
    kk: 'Баға сұрау',
  };
  const slideshowImages = useMemo(() => {
    if (product.images && product.images.length > 0) {
      return [...product.images]
        .sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return a.sortOrder - b.sortOrder;
        })
        .map(image => image.url)
        .filter(Boolean);
    }

    return product.imageUrls.filter(Boolean);
  }, [product.images, product.imageUrls]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const formatUsdPrice = (price: string) => `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatKztPrice = (price: string | number) => `${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₸`;

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product.id, slideshowImages.length]);

  useEffect(() => {
    if (!isHovered || slideshowImages.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveImageIndex(index => (index + 1) % slideshowImages.length);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [isHovered, slideshowImages.length]);

  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl sm:rounded-2xl ${outOfStock ? 'opacity-75' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveImageIndex(0);
      }}
    >
      <div className="relative aspect-square overflow-hidden bg-white sm:h-64 sm:aspect-auto">
        {slideshowImages.map((imageUrl, index) => (
          <img
            key={`${imageUrl}-${index}`}
            src={imageUrl}
            alt={index === activeImageIndex ? productName : ''}
            aria-hidden={index !== activeImageIndex}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-in-out group-hover:scale-105 ${
              index === activeImageIndex ? 'opacity-100' : 'opacity-0'
            } ${outOfStock ? 'grayscale-[40%]' : ''}`}
          />
        ))}

        {slideshowImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/25 px-1.5 py-1 backdrop-blur-sm sm:bottom-3 sm:gap-1.5 sm:px-2">
            {slideshowImages.map((_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`h-1 rounded-full transition-all duration-300 sm:h-1.5 ${
                  index === activeImageIndex ? 'w-3 bg-white sm:w-4' : 'w-1 bg-white/55 sm:w-1.5'
                }`}
              />
            ))}
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1.5 sm:left-4 sm:top-4 sm:gap-2">
          {outOfStock && (
            <div className="rounded-md bg-red-500 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-md sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-[10px]">
              {translations.outOfStock[language]}
            </div>
          )}
          {hasWholesalePrice && (
            <div className="rounded-md bg-slate-900 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-md sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-[10px]">
              Wholesale
            </div>
          )}
          {product.isNew && (
            <div className="rounded-md bg-emerald-500 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-md sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-[10px]">
              {translations.new[language]}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike?.();
          }}
          aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-all duration-300 sm:right-3 sm:top-3 ${
            isLiked
              ? 'bg-red-500 text-white'
              : 'bg-slate-900/10 text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-md'
          }`}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${isLiked ? 'fill-current' : 'fill-none'}`}
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

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <h3 className="mb-1 line-clamp-2 min-h-[2.5rem] text-sm font-black leading-snug text-slate-900 sm:min-h-[2.75rem] sm:text-base">
          {productName}
        </h3>
        <span className="mb-3 block truncate text-[9px] font-black uppercase tracking-widest text-slate-400 sm:text-[10px]">
          {product.itemCode}{product.dimensions ? ` - ${product.dimensions}` : ''}
        </span>

        <div className="mt-auto space-y-3">
          <div className="min-h-6">
            {hasWholesalePrice ? (
              <>
                <span className="break-words font-serif text-base font-black text-emerald-600 sm:text-lg">
                  {formatUsdPrice(product.wholesalePriceUsd!)}
                </span>
                {product.price != null ? (
                  <div className="mt-2 text-sm text-slate-500">
                    <span className="block uppercase tracking-widest text-[9px] font-black text-slate-400 mb-0.5">
                      {translations.normalPrice[language]}
                    </span>
                    <span className="font-bold text-slate-700 line-through">
                      {formatKztPrice(product.price.toString())}
                    </span>
                  </div>
                ) : null}
              </>
            ) : product.price != null ? (
              <span className="break-words font-serif text-base font-black text-slate-900 sm:text-lg">
                {formatKztPrice(product.price.toString())}
              </span>
            ) : (
              <span className="break-words font-serif text-base font-black text-slate-900 sm:text-lg">
                {translations.priceOnRequestShort[language]}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onAddToBasket ? (
              <button
                type="button"
                onClick={() => onAddToBasket(product)}
                className="h-10 min-w-0 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition-colors hover:bg-slate-800 sm:text-sm"
              >
                {translations.buy[language]}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onInquire(product)}
              className="h-10 min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-xs font-black text-slate-800 transition-colors hover:border-slate-900 hover:bg-slate-900 hover:text-white sm:text-sm"
            >
              {translations.details[language]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
