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

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onInquire,
  onAddToBasket,
  language,
  isLiked,
  onToggleLike,
}) => {
  const outOfStock = product.inStock === false;
  const hasWholesalePrice = Boolean(product.isWholesaleVisible && product.wholesalePriceUsd);
  const productName = product.name[language] || product.name.en;
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
  // Only the cover image is fetched up front; the rest of the slideshow
  // loads on first hover to keep catalog bandwidth down.
  const [preloadAllImages, setPreloadAllImages] = useState(false);
  const formatUsdPrice = (price: string) =>
    `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const formatKztPrice = (price: string | number) =>
    `${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} KZT`;

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
      className={`group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] ${
        outOfStock ? 'opacity-75' : ''
      }`}
      onMouseEnter={() => {
        setIsHovered(true);
        setPreloadAllImages(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveImageIndex(0);
      }}
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100 sm:h-44 sm:aspect-auto cursor-pointer" onClick={() => onInquire(product)}>
        {slideshowImages.map((imageUrl, index) => (preloadAllImages || index === activeImageIndex) && (
          <img
            key={`${imageUrl}-${index}`}
            src={imageUrl}
            alt={index === activeImageIndex ? productName : ''}
            aria-hidden={index !== activeImageIndex}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
              index === activeImageIndex ? 'opacity-100' : 'opacity-0'
            } ${outOfStock ? 'grayscale-[40%]' : ''}`}
          />
        ))}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/18 to-transparent" />

        {/* Price badge and buy button live on the image (matching the printed
            Canva catalogue) so the card body stays short and more cards fit
            on screen. */}
        {/* No badge at all when there is no visible price — clients without a
            wholesale code just see the product. */}
        {(hasWholesalePrice || product.price != null) && (
          <div className="absolute bottom-2 left-2 z-10 flex flex-col items-start gap-0.5">
            {hasWholesalePrice ? (
              <>
                <span className="inline-flex rounded-xl bg-amber-300 px-2.5 py-1 text-sm font-black text-slate-900 shadow-md sm:text-base">
                  {formatUsdPrice(product.wholesalePriceUsd!)}
                </span>
                {product.price != null ? (
                  <span className="inline-flex rounded-md bg-white/85 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 line-through shadow-sm backdrop-blur-sm">
                    {formatKztPrice(product.price.toString())}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="inline-flex rounded-xl bg-amber-300 px-2.5 py-1 text-sm font-black text-slate-900 shadow-md sm:text-base">
                {formatKztPrice(product.price!.toString())}
              </span>
            )}
          </div>
        )}

        {onAddToBasket ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddToBasket(product); }}
            disabled={outOfStock}
            aria-label={translations.buy[language]}
            className="absolute bottom-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/90 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300/80 disabled:text-slate-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </button>
        ) : null}

        {slideshowImages.length > 1 && (
          <div className="absolute top-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/85 px-1.5 py-1 shadow-sm backdrop-blur-sm sm:top-3 sm:gap-1.5 sm:px-2">
            {slideshowImages.map((_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`h-1 rounded-full transition-all duration-300 sm:h-1.5 ${
                  index === activeImageIndex ? 'w-3 bg-slate-900 sm:w-4' : 'w-1 bg-slate-300 sm:w-1.5'
                }`}
              />
            ))}
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1.5 sm:left-4 sm:top-4 sm:gap-2">
          {outOfStock && (
            <div className="rounded-full bg-red-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-md sm:px-3 sm:text-[10px]">
              {translations.outOfStock[language]}
            </div>
          )}
          {product.isNew && (
            <div className="rounded-full bg-emerald-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-md sm:px-3 sm:text-[10px]">
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
          className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur transition-all duration-300 sm:right-3 sm:top-3 ${
            isLiked
              ? 'bg-red-500 text-white'
              : 'bg-white/85 text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-md'
          }`}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-300 ${isLiked ? 'fill-current' : 'fill-none'}`}
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

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <h3 className="mb-1 line-clamp-2 text-[12px] font-black leading-tight text-slate-950 sm:text-[13px]">
          {productName}
        </h3>

        <div className="flex flex-wrap items-center gap-1">
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-black">
            {product.itemCode}
          </span>
          {product.dimensions ? (
            <span className="rounded-md bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-black">
              {product.dimensions}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
