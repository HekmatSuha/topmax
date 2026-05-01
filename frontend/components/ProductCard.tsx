import React, { useEffect, useMemo, useState } from 'react';
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
  const productName = product.name[language] || product.name.en;
  const productDescription = product.description[language] || product.description.en;
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
  const formatPrice = (price: number) => `${price.toLocaleString('ru-RU')} ₸`;

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product.id, slideshowImages.length]);

  useEffect(() => {
    if (!isHovered || slideshowImages.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveImageIndex(index => (index + 1) % slideshowImages.length);
    }, 2400);

    return () => window.clearInterval(timer);
  }, [isHovered, slideshowImages.length]);

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 ${outOfStock ? 'opacity-75' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveImageIndex(0);
      }}
    >
      <div className="relative aspect-[4/3] sm:h-64 sm:aspect-auto overflow-hidden bg-gray-100">
        {slideshowImages.map((imageUrl, index) => (
          <img
            key={`${imageUrl}-${index}`}
            src={imageUrl}
            alt={index === activeImageIndex ? productName : ''}
            aria-hidden={index !== activeImageIndex}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out group-hover:scale-105 ${
              index === activeImageIndex ? 'opacity-100' : 'opacity-0'
            } ${outOfStock ? 'grayscale-[40%]' : ''}`}
          />
        ))}

        {slideshowImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1 backdrop-blur-sm">
            {slideshowImages.map((_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === activeImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/55'
                }`}
              />
            ))}
          </div>
        )}

        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-2">
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

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike?.();
          }}
          aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            isLiked
              ? 'bg-red-500 text-white'
              : 'bg-black/20 text-white/80 hover:text-red-400 hover:bg-black/30'
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

      <div className="p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-0.5 leading-snug line-clamp-2">
          {productName}
        </h3>
        <span className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
          CODE: {product.itemCode}
        </span>
        {product.dimensions && (
          <span className="block text-[11px] font-semibold text-slate-400 mb-3">
            {product.dimensions}
          </span>
        )}
        <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed min-h-[2.75rem]">
          {productDescription}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-auto">
          <div className="flex flex-wrap items-baseline gap-2 min-w-0">
            {hasDiscount && (
              <span className="text-sm font-serif font-bold text-slate-400 line-through">
                {formatPrice(product.price)}
              </span>
            )}
            <span className={`text-xl font-serif font-black break-words ${hasDiscount ? 'text-red-500' : 'text-blue-600'}`}>
              {formatPrice(displayPrice)}
            </span>
          </div>
          <button
            onClick={() => onInquire(product)}
            className="w-full sm:w-auto text-sm font-semibold text-white bg-slate-900 px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            {translations.details[language]}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
