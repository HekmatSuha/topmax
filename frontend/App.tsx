import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import Contact from './components/Contact';
import Basket from './components/Basket';
import Auth from './components/Auth';
import BottomNav from './components/BottomNav';
import { Product, ProductImage, BasketItem, Language, User } from './types';
import { translations } from './translations';

const BACKEND_BASE_URL = import.meta.env.DEV ? 'http://localhost:8000' : '';
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"%3E%3Crect width="640" height="480" fill="%23f1f5f9"/%3E%3Cpath d="M160 336h320L384 224l-72 80-48-56-104 88Z" fill="%23cbd5e1"/%3E%3Ccircle cx="240" cy="176" r="40" fill="%23cbd5e1"/%3E%3C/svg%3E';

type CategoryKey = Product['category'] | 'All';
type PageKey = 'home' | 'contact' | 'basket';
type VisualSearchResult = {
  label: string;
  confidence: number;
  previewUrl: string;
};

const normalizeColorKey = (colorKey: string) => colorKey.trim().toLowerCase().replace(/\s+/g, '-');
const SEARCH_LANGUAGES: Language[] = ['en', 'ru', 'kk'];

const normalizeSearchText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ')
    .trim();

const tokenizeSearchQuery = (query: string) =>
  normalizeSearchText(query)
    .split(/\s+/)
    .filter(Boolean);

const getLocalizedSearchValues = (value?: Partial<Record<Language, string>>) =>
  SEARCH_LANGUAGES.map(lang => value?.[lang]).filter(Boolean) as string[];

const getRgbDistance = (
  color: { r: number; g: number; b: number },
  target: { r: number; g: number; b: number }
) => {
  const red = color.r - target.r;
  const green = color.g - target.g;
  const blue = color.b - target.b;
  return Math.sqrt(red * red + green * green + blue * blue);
};

const inferFinishFromRgb = (color: { r: number; g: number; b: number }) => {
  const targets = [
    { label: 'white', rgb: { r: 245, g: 245, b: 240 } },
    { label: 'black', rgb: { r: 25, g: 25, b: 25 } },
    { label: 'chrome', rgb: { r: 185, g: 190, b: 195 } },
    { label: 'gold', rgb: { r: 212, g: 175, b: 55 } },
    { label: 'rose gold', rgb: { r: 183, g: 110, b: 121 } },
    { label: 'bronze', rgb: { r: 150, g: 95, b: 45 } },
    { label: 'grey', rgb: { r: 125, g: 132, b: 142 } },
  ];
  const closest = targets
    .map(target => ({ label: target.label, distance: getRgbDistance(color, target.rgb) }))
    .sort((a, b) => a.distance - b.distance)[0];

  return {
    label: closest.label,
    confidence: Math.max(0.35, Math.min(0.95, 1 - closest.distance / 440)),
  };
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('ru');
  const [currentPage, setCurrentPage] = useState<PageKey>('home');
  const [filter, setFilter] = useState<CategoryKey>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visualSearch, setVisualSearch] = useState<VisualSearchResult | null>(null);
  const [visualSearchError, setVisualSearchError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [showBuyElseModal, setShowBuyElseModal] = useState(false);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string>('checking');
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const productsStartRef = useRef<HTMLDivElement>(null);
  const imageSearchInputRef = useRef<HTMLInputElement>(null);
  const cameraSearchInputRef = useRef<HTMLInputElement>(null);

  const t = translations;

  const formatUsdPrice = (price: string | number) =>
    `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatKztPrice = (price: string | number) =>
    `${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₸`;
  const hasWholesalePrice = (product: Product) => Boolean(product.isWholesaleVisible && product.wholesalePriceUsd);
  const getLocalizedText = (
    value: Partial<Record<Language, string>> | undefined,
    fallback = ''
  ) => value?.[language] || value?.en || fallback;

  const resolveImageUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${BACKEND_BASE_URL}${url}`;
    return `${BACKEND_BASE_URL}/${url}`;
  };

  const openProductById = (id: string, productList: Product[]) => {
    const found = productList.find(p => String(p.id) === String(id));
    if (found) setSelectedProduct(found);
  };

  const handleSelectProduct = (product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      const url = new URL(window.location.href);
      url.searchParams.set('product', String(product.id));
      window.history.pushState({ productId: product.id }, '', url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('product');
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleShareProduct = () => {
    const url = new URL(window.location.href);
    if (selectedProduct) url.searchParams.set('product', String(selectedProduct.id));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const loadProducts = () => {
    setIsProductsLoading(true);
    fetch(`${BACKEND_BASE_URL}/api/products/`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`Products request failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const normalizedProducts = (data.products || []).map((product: Product) => ({
          ...product,
          description: product.description || { en: '', ru: '', kk: '' },
          features: product.features || { en: [], ru: [], kk: [] },
          imageUrls: (product.imageUrls || []).map(resolveImageUrl).filter(Boolean),
          availableColors: (product.availableColors || []).map(normalizeColorKey),
          images: (product.images || []).map((img: ProductImage) => ({
            ...img,
            url: resolveImageUrl(img.url),
            color: img.color ? normalizeColorKey(img.color) : img.color,
          })),
        }));
        setProducts(normalizedProducts);
        setProductsError('');
        const params = new URLSearchParams(window.location.search);
        const id = params.get('product');
        if (id) openProductById(id, normalizedProducts);
      })
      .catch(err => {
        console.error('Failed to load products:', err);
        setProductsError('Failed to load products from backend.');
      })
      .finally(() => {
        setIsProductsLoading(false);
      });
  };

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('product');
      if (id) {
        openProductById(id, products);
      } else {
        setSelectedProduct(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [products]);

  useEffect(() => {
    // Check backend connection
    fetch(`${BACKEND_BASE_URL}/api/test/`)
      .then(res => {
        if (!res.ok) throw new Error(`Backend health check failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Backend connected:', data);
        setBackendStatus('connected');
      })
      .catch(err => {
        console.error('Backend connection failed:', err);
        setBackendStatus('failed');
      });

    loadProducts();

    fetch(`${BACKEND_BASE_URL}/api/auth/me/`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('No active session.');
        return res.json();
      })
      .then(data => {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('topmax_user', JSON.stringify(data.user));
        }
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('topmax_user');
      });

    // Check local storage for existing session
    try {
      const savedUser = localStorage.getItem('topmax_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      const savedLikes = localStorage.getItem('topmax_likes');
      if (savedLikes) {
        setLikedIds(JSON.parse(savedLikes));
      }
    } catch (err) {
      console.error('Failed to restore saved user data:', err);
      localStorage.removeItem('topmax_user');
      localStorage.removeItem('topmax_likes');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('topmax_likes', JSON.stringify(likedIds));
  }, [likedIds]);

  useEffect(() => {
    const title = t.seoTitle[language];
    const description = t.seoDescription[language];
    const keywords = t.seoKeywords[language];
    const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const metaKeywords = document.querySelector<HTMLMetaElement>('meta[name="keywords"]');
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    const ogLocale = document.querySelector<HTMLMetaElement>('meta[property="og:locale"]');

    document.documentElement.lang = language;
    document.title = title;
    metaDescription?.setAttribute('content', description);
    metaKeywords?.setAttribute('content', keywords);
    ogTitle?.setAttribute('content', title);
    ogDescription?.setAttribute('content', description);
    ogLocale?.setAttribute('content', language === 'ru' ? 'ru_KZ' : language === 'kk' ? 'kk_KZ' : 'en_US');
  }, [language, t]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 420);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setIsModalVisible(true);
      setSelectedColor(selectedProduct.availableColors?.[0] || null);
      setActiveImageIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      setIsModalVisible(false);
      document.body.style.overflow = 'unset';
    }
  }, [selectedProduct]);

  useEffect(() => {
    return () => {
      if (visualSearch?.previewUrl) URL.revokeObjectURL(visualSearch.previewUrl);
    };
  }, [visualSearch?.previewUrl]);

  // Compute visible image URLs based on selected color
  const visibleImageUrls = useMemo(() => {
    if (!selectedProduct) return [];
    const structuredImages = selectedProduct.images || [];
    // If a color is selected and there are structured images with color metadata, filter
    if (selectedColor && structuredImages.length > 0) {
      const colorFiltered = structuredImages.filter(
        (img: ProductImage) => img.color === selectedColor || !img.color
      );
      if (colorFiltered.length > 0) {
        // Sort: primary images first, then by sortOrder
        const sorted = [...colorFiltered].sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return a.sortOrder - b.sortOrder;
        });
        return sorted.map((img: ProductImage) => img.url);
      }
    }
    // Fallback: all imageUrls (legacy + uploaded combined)
    return selectedProduct.imageUrls.length > 0 ? selectedProduct.imageUrls : [PLACEHOLDER_IMAGE];
  }, [selectedProduct, selectedColor]);


  const handleAuthComplete = (u: User) => {
    setUser(u);
    setShowAuth(false);
    localStorage.setItem('topmax_user', JSON.stringify(u));
    loadProducts();
  };

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_BASE_URL}/api/auth/signout/`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setUser(null);
      setBasket([]);
      localStorage.removeItem('topmax_user');
      loadProducts();
    }
  };

  const toggleLike = (id: string) => {
    setLikedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleNavigate = (page: string) => {
    if (page === 'home' || page === 'contact' || page === 'basket') {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCategorySelect = (key: CategoryKey) => {
    setFilter(key);
    window.setTimeout(() => {
      productsStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const resetVisualSearch = () => {
    if (visualSearch?.previewUrl) URL.revokeObjectURL(visualSearch.previewUrl);
    setVisualSearch(null);
    setVisualSearchError('');
    if (imageSearchInputRef.current) imageSearchInputRef.current.value = '';
    if (cameraSearchInputRef.current) cameraSearchInputRef.current.value = '';
  };

  const handleImageSearch = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setVisualSearchError('Please choose a photo.');
      return;
    }

    const image = new Image();
    const previewUrl = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 96;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (!context) {
        URL.revokeObjectURL(previewUrl);
        setVisualSearchError('Image search is not available in this browser.');
        return;
      }

      context.drawImage(image, 0, 0, size, size);
      const pixels = context.getImageData(0, 0, size, size).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const brightness = (red + green + blue) / 3;

        if (alpha < 180 || brightness < 12 || brightness > 248) continue;

        r += red;
        g += green;
        b += blue;
        count += 1;
      }

      if (count === 0) {
        URL.revokeObjectURL(previewUrl);
        setVisualSearchError('Could not read enough color from that photo.');
        return;
      }

      const detected = inferFinishFromRgb({
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count),
      });

      resetVisualSearch();
      setVisualSearch({ ...detected, previewUrl });
      setVisualSearchError('');
      setSearchQuery(detected.label);
      setFilter('All');
      productsStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      setVisualSearchError('Could not read that photo.');
    };

    image.src = previewUrl;
  };

  const getColorSearchTerms = (colorKey: string) => {
    const normalizedKey = normalizeColorKey(colorKey);
    const translatedColor = t[normalizedKey];

    return [
      colorKey,
      normalizedKey,
      normalizedKey.replace(/-/g, ' '),
      ...(translatedColor ? getLocalizedSearchValues(translatedColor) : []),
    ];
  };

  const getSearchableProductFields = (product: Product) => {
    const featureValues = SEARCH_LANGUAGES.flatMap(lang => product.features?.[lang] || []);
    const colorValues = (product.availableColors || []).flatMap(getColorSearchTerms);
    const categoryValues = [
      product.category,
      ...(t[product.category] ? getLocalizedSearchValues(t[product.category]) : []),
    ];
    const statusValues = [
      product.inStock === false ? 'out of stock' : 'in stock',
      product.isNew ? 'new' : '',
      ...(product.inStock === false ? getLocalizedSearchValues(t.outOfStock) : getLocalizedSearchValues(t.inStock)),
      ...(product.isNew ? getLocalizedSearchValues(t.new) : []),
    ];

    return {
      name: [...getLocalizedSearchValues(product.name), ...categoryValues],
      code: [product.itemCode],
      size: [product.dimensions || ''],
      color: colorValues,
      details: [
        ...getLocalizedSearchValues(product.description),
        ...featureValues,
        ...(product.warranty ? getLocalizedSearchValues(product.warranty) : []),
        ...statusValues,
      ],
    };
  };

  const scoreSearchField = (text: string, tokens: string[], weight: number) => {
    const normalized = normalizeSearchText(text);
    if (!normalized) return 0;

    return tokens.reduce((score, token) => {
      if (normalized === token) return score + (weight * 8);
      if (normalized.startsWith(token)) return score + (weight * 5);
      if (normalized.includes(token)) return score + (weight * 2);
      return score;
    }, 0);
  };

  const scoreProductSearch = (product: Product, tokens: string[]) => {
    if (tokens.length === 0) return 1;

    const fields = getSearchableProductFields(product);
    const activeFields = [
      { values: fields.code, weight: 12 },
      { values: fields.name, weight: 10 },
      { values: fields.color, weight: 8 },
      { values: fields.size, weight: 7 },
      { values: fields.details, weight: 3 },
    ];
    const tokenHits = tokens.every(token =>
      activeFields.some(field =>
        field.values.some(value => normalizeSearchText(value).includes(token))
      )
    );

    if (!tokenHits) return 0;

    return activeFields.reduce((total, field) => {
      return total + field.values.reduce((fieldTotal, value) => {
        return fieldTotal + scoreSearchField(value, tokens, field.weight);
      }, 0);
    }, 0);
  };

  const renderCategoryIcon = (key: string, isActive: boolean) => {
    const colorClass = isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600';
    
    switch (key) {
      case 'All': return (
        <svg className={`w-5 h-5 transition-colors ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.9 5.9L20 11l-6.1 2.1L12 19l-1.9-5.9L4 11l6.1-2.1L12 3z" />
        </svg>
      );
      case 'Baths': return (
        <svg className={`w-5 h-5 transition-colors ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10h14v3a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h16M7 19l-1 2m11-2 1 2M8 10V6a2 2 0 0 1 2-2h1" />
        </svg>
      );
      case 'Basins': return (
        <svg className={`w-5 h-5 transition-colors ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 11a8 8 0 0 0 16 0H4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m-3 0h6" />
        </svg>
      );
      case 'Taps': return (
        <svg className={`w-5 h-5 transition-colors ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8m-4 0v4m-5 4h10a3 3 0 0 0 3-3v-1h-8m0 0H5v1a3 3 0 0 0 3 3z" />
        </svg>
      );
      case 'Closets': return (
        <svg className={`w-5 h-5 transition-colors ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8v7a4 4 0 0 1-4 4 4 4 0 0 1-4-4V4zM6 15h12v2a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-2z" />
        </svg>
      );
      case 'Mirrors': return (
        <svg className={`w-5 h-5 transition-colors ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6" />
        </svg>
      );
      case 'Dryers': return (
        <svg className={`w-5 h-5 transition-colors ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 5h12M8 9h8M7 13h10M9 17h6" />
        </svg>
      );
      case 'Others': return (
        <svg className={`w-5 h-5 transition-colors ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
      default: return null;
    }
  };

  const categoryKeys: CategoryKey[] = ['All', 'Baths', 'Basins', 'Taps', 'Closets', 'Mirrors', 'Dryers', 'Others'];
  const searchTokens = useMemo(() => tokenizeSearchQuery(searchQuery), [searchQuery]);
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => filter === 'All' || product.category === filter)
      .map((product, index) => ({
        product,
        index,
        score: scoreProductSearch(product, searchTokens),
      }))
      .filter(result => searchTokens.length === 0 || result.score > 0)
      .sort((a, b) => {
        if (searchTokens.length === 0) return a.index - b.index;
        return b.score - a.score || a.index - b.index;
      })
      .map(result => result.product);
  }, [products, filter, searchTokens]);
  const hasActiveSearch = searchTokens.length > 0 || Boolean(visualSearch);

  const addToBasket = (product: Product) => {
    setBasket(prev => {
      const existing = prev.find(item => item.id === product.id && item.selectedColor === selectedColor);
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && item.selectedColor === selectedColor) 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, selectedColor: selectedColor || undefined }];
    });
    setShowBuyElseModal(true);
  };

  const colorHexMap: Record<string, string> = {
    black: '#1a1a1a',
    matte_black: '#1a1a1a',
    'matte-black': '#1a1a1a',
    white: '#ffffff',
    chrome: 'linear-gradient(135deg, #e5e7eb, #9ca3af)',
    'matte-chrome': 'linear-gradient(135deg, #d1d5db, #6b7280)',
    gold: 'linear-gradient(135deg, #fbbf24, #b8860b)',
    brushed_gold: 'linear-gradient(135deg, #d4af37, #b8860b)',
    'drawn-gold': 'linear-gradient(135deg, #d4af37, #96772e)',
    rose_gold: 'linear-gradient(135deg, #e8b4b8, #b76e79)',
    grey: '#9ca3af',
    gray: '#9ca3af',
    bronze: 'linear-gradient(135deg, #cd7f32, #8c5a2e)',
    nickel: 'linear-gradient(135deg, #c0c0c0, #808080)',
  };
  const getColorHex = (colorKey: string) => colorHexMap[normalizeColorKey(colorKey)] || '#ccc';

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
            <div className="mb-8 text-center sm:mb-12">
              <p className="mb-6 text-base text-gray-500 sm:mb-10 sm:text-lg">
                {t.premiumCollections[language]}
              </p>
              
              <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-gray-200 bg-white p-2 text-left shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 sm:mb-10">
                <div className="flex items-center gap-2 px-3">
                  <svg className="h-6 w-6 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="search"
                    placeholder={t.searchPlaceholder[language]}
                    value={searchQuery}
                    onChange={(e) => {
                      if (visualSearch) resetVisualSearch();
                      setSearchQuery(e.target.value);
                    }}
                    className="min-w-0 flex-1 bg-transparent px-1 py-4 text-base font-semibold text-slate-900 outline-none placeholder:text-gray-400 sm:text-lg"
                    aria-label={t.searchPlaceholder[language]}
                  />
                  <input
                    ref={imageSearchInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleImageSearch(event.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => imageSearchInputRef.current?.click()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                    aria-label={t.searchPhoto[language]}
                    title={t.searchPhoto[language]}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4V5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11l2.5 2.5L13 11l4 5H7l1-5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5h.01" />
                    </svg>
                  </button>
                  <input
                    ref={cameraSearchInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => handleImageSearch(event.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => cameraSearchInputRef.current?.click()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
                    aria-label={t.searchCamera[language]}
                    title={t.searchCamera[language]}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 100 6 3 3 0 000-6z" />
                    </svg>
                  </button>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        resetVisualSearch();
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                      aria-label={t.clearSearch[language]}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {hasActiveSearch && (
                  <div className="flex items-center justify-end border-t border-gray-100 px-2 py-2">
                    <span className="shrink-0 px-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      {filteredProducts.length}/{products.length}
                    </span>
                  </div>
                )}
                {(visualSearch || visualSearchError) && (
                  <div className="flex items-center gap-3 border-t border-gray-100 px-3 py-3">
                    {visualSearch ? (
                      <>
                        <img
                          src={visualSearch.previewUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-900">
                            {t.photoMatch[language]}: {visualSearch.label}
                          </p>
                          <p className="text-xs font-semibold text-slate-400">
                            {Math.round(visualSearch.confidence * 100)}% {t.finishConfidence[language]}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            resetVisualSearch();
                          }}
                          className="rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          {t.clear[language]}
                        </button>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-red-500">{visualSearchError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky top-20 z-40 -mx-3 mb-5 border-y border-gray-100 bg-gray-50/95 px-3 py-3 backdrop-blur md:static md:mx-0 md:mb-12 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
              <div className="no-scrollbar flex snap-x snap-mandatory flex-nowrap justify-start gap-2.5 overflow-x-auto md:flex-wrap md:justify-center md:gap-4 md:overflow-visible">
              {categoryKeys.map(key => (
                <button
                  key={key}
                  onClick={() => handleCategorySelect(key)}
                  className={`group flex shrink-0 snap-start items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all duration-300 md:px-6 ${
                    filter === key 
                      ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-105' 
                      : 'bg-white border border-gray-100 text-slate-500 hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {renderCategoryIcon(key, filter === key)}
                  {key === 'All' ? t.all[language] : t[key][language]}
                </button>
              ))}
              </div>
            </div>

            <div ref={productsStartRef} className="scroll-mt-36 md:scroll-mt-8" />

            {isProductsLoading ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 mb-20">
                <p className="text-gray-400 text-xl font-medium">Loading products...</p>
              </div>
            ) : productsError ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-red-200 mb-20">
                <p className="text-red-500 text-xl font-medium">{productsError}</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="mb-20 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onInquire={handleSelectProduct}
                    onAddToBasket={addToBasket}
                    language={language}
                    isLiked={likedIds.includes(product.id)}
                    onToggleLike={() => toggleLike(product.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 mb-20">
                <p className="text-gray-400 text-xl font-medium">No results found.</p>
                <button onClick={() => setSearchQuery('')} className="mt-2 text-blue-600 font-bold hover:underline">{t.clearSearch[language]}</button>
              </div>
            )}

            {/* Divider and Contact Section */}
            <div className="border-t border-gray-100 pt-10">
               <Contact language={language} />
            </div>
          </div>
        );
      case 'contact':
        return <Contact language={language} />;
      case 'basket':
        return (
          <Basket 
            items={basket} 
            language={language}
            onRemove={(id, color) => setBasket(b => b.filter(i => !(i.id === id && i.selectedColor === color)))} 
            onUpdateQuantity={(id, color, q) => setBasket(b => b.map(i => (i.id === id && i.selectedColor === color) ? {...i, quantity: q} : i))} 
            onContinueShopping={() => setCurrentPage('home')}
          />
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar 
        onNavigate={handleNavigate} 
        currentPage={currentPage} 
        basketCount={basket.reduce((a, b) => a + b.quantity, 0)} 
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setShowAuth(true)}
        backendStatus={backendStatus}
      />
      
      <main className="flex-grow pb-16 md:pb-0">
        {renderPage()}
      </main>

      <BottomNav
        currentPage={currentPage}
        onNavigate={handleNavigate}
        basketCount={basket.reduce((a, b) => a + b.quantity, 0)}
        language={language}
      />

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        className={`fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl shadow-slate-300 transition-all duration-300 hover:bg-blue-600 active:scale-95 md:bottom-6 md:right-6 ${
          showScrollTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {showAuth && (
        <Auth language={language} onAuthComplete={handleAuthComplete} onCancel={() => setShowAuth(false)} />
      )}

      {selectedProduct && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isModalVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => handleSelectProduct(null)}></div>
          <div className={`relative w-full max-w-6xl max-h-[92vh] overflow-y-auto custom-scrollbar rounded-[2rem] bg-white shadow-2xl transition-all duration-500 transform ${isModalVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
            <div className="sticky top-0 z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-100 bg-white/92 p-4 backdrop-blur-md sm:p-5">
               <button onClick={() => handleSelectProduct(null)} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-900 font-bold transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  <span className="hidden sm:inline text-sm uppercase tracking-widest">Back</span>
               </button>
               <div className="min-w-0 px-1 text-center">
                  <span className="block truncate text-[10px] uppercase tracking-widest font-black text-blue-600">{t[selectedProduct.category][language]}</span>
                  <span className="block truncate text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">{selectedProduct.name[language]}</span>
               </div>
               <div className="flex items-center gap-2">
                  <button
                    onClick={handleShareProduct}
                    aria-label={shareCopied ? 'Product link copied' : 'Share product'}
                    className="flex h-10 w-10 sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-0 sm:px-3 py-2 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-black uppercase tracking-widest"
                  >
                    {shareCopied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        <span className="hidden sm:inline">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        <span className="hidden sm:inline">Share</span>
                      </>
                    )}
                  </button>
                  <button onClick={() => handleSelectProduct(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative flex min-h-[420px] flex-col justify-center border-r border-slate-100 bg-slate-50 p-4 sm:p-6 lg:p-8">
                 <div className="flex min-h-[300px] w-full items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 lg:min-h-[520px]">
                    <img
                      src={visibleImageUrls[activeImageIndex] || PLACEHOLDER_IMAGE}
                      alt={getLocalizedText(selectedProduct.name, selectedProduct.itemCode)}
                      className="h-full max-h-[520px] w-full object-contain p-3 transition-all duration-500 sm:p-5"
                    />
                 </div>

                 {visibleImageUrls.length > 0 && (
                   <div className="no-scrollbar mt-4 flex max-w-full gap-3 overflow-x-auto px-1 pb-1">
                      {visibleImageUrls.map((url, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImageIndex(index)}
                          className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border bg-white transition-all ${
                            activeImageIndex === index ? 'border-blue-600 ring-4 ring-blue-50 shadow-md' : 'border-slate-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                   </div>
                 )}
              </div>

              <div className="bg-white p-5 sm:p-7 lg:p-9">
                <div className="lg:sticky lg:top-24">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {selectedProduct.itemCode}
                  </span>
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                    {t[selectedProduct.category][language]}
                  </span>
                </div>
                <h2 className="mb-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                  {selectedProduct.name[language]}
                </h2>

                <div className="mb-5 flex flex-wrap gap-2">
                  {selectedProduct.dimensions && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 shadow-sm">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">{selectedProduct.dimensions}</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-700">
                    <span className="text-[10px] font-black uppercase tracking-widest">{t.premiumQuality[language]}</span>
                  </div>
                  {selectedProduct.inStock === false ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-red-600">
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.outOfStock[language]}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-green-600">
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.inStock[language]}</span>
                    </div>
                  )}
                  {selectedProduct.isNew && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-white shadow-sm">
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.new[language]}</span>
                    </div>
                  )}
                </div>

                <p className="mb-6 max-w-xl text-sm font-medium leading-7 text-slate-500">
                  {getLocalizedText(selectedProduct.description, t.premiumQuality[language])}
                </p>

                {selectedProduct.availableColors && selectedProduct.availableColors.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t.selectFinish[language]}</h4>
                    <div className="flex flex-wrap gap-3">
                      {selectedProduct.availableColors.map(colorKey => (
                        <button
                          key={colorKey}
                          onClick={() => { setSelectedColor(colorKey); setActiveImageIndex(0); }}
                          className={`group relative flex items-center gap-2 rounded-xl border px-2 py-2 transition-all ${
                            selectedColor === colorKey ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`h-9 w-9 rounded-lg border transition-all shadow-sm ${
                              selectedColor === colorKey ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'
                            }`}
                            style={{ background: getColorHex(colorKey) }}
                          />
                          <span className={`max-w-24 truncate text-[10px] font-black uppercase tracking-wide ${selectedColor === colorKey ? 'text-blue-600' : 'text-slate-500'}`}>
                             {t[normalizeColorKey(colorKey)]?.[language] ?? colorKey}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                   <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t.keyFeatures[language]}</h4>
                   <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(selectedProduct.features?.[language] || selectedProduct.features?.en || []).map((feature, i) => (
                        <li key={i} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                           <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-[10px] text-green-600">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                             </svg>
                           </span>
                           {feature}
                        </li>
                      ))}
                      {(selectedProduct.warranty?.[language] || t.warranty[language]) && (
                        <li className="flex min-h-11 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                           <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white text-[10px] text-blue-600">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" />
                             </svg>
                           </span>
                           {selectedProduct.warranty?.[language] || t.warranty[language]}
                        </li>
                      )}
                   </ul>
                </div>

                <div className="mt-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-left">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        {hasWholesalePrice(selectedProduct) ? t.wholesalePrice[language] : t.price[language]}
                      </span>
                      {hasWholesalePrice(selectedProduct) ? (
                        <span className="text-2xl font-black text-emerald-600 sm:text-3xl">
                          {formatUsdPrice(selectedProduct.wholesalePriceUsd!)}
                        </span>
                      ) : selectedProduct.price != null ? (
                        <span className="text-2xl font-black text-slate-900 sm:text-3xl">
                          {formatKztPrice(selectedProduct.price.toString())}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-lg bg-white px-3 py-2 text-sm font-black uppercase tracking-wide text-blue-700 shadow-sm ring-1 ring-blue-100">
                          {t.priceOnRequestShort[language]}
                        </span>
                      )}
                      {hasWholesalePrice(selectedProduct) && selectedProduct.price != null && (
                        <div className="mt-2">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                            {t.normalPrice[language]}
                          </span>
                          <span className="text-base font-black text-slate-600">
                            {formatKztPrice(selectedProduct.price.toString())}
                          </span>
                        </div>
                      )}
                    </div>
                    {selectedProduct.inStock === false ? (
                      <div className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl bg-gray-300 px-6 text-sm font-black text-gray-500 sm:w-auto">
                        {t.outOfStock[language]}
                      </div>
                    ) : (
                      <button
                        onClick={() => addToBasket(selectedProduct)}
                        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 sm:w-auto"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        {t.addToBasket[language]}
                      </button>
                    )}
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBuyElseModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setShowBuyElseModal(false)}></div>
          <div className="relative bg-white rounded-[3rem] max-w-md w-full p-12 shadow-2xl text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
               <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
               </svg>
            </div>
            <h2 className="text-3xl font-serif font-black text-slate-900 mb-4">{t.addedToBasket[language]}</h2>
            <p className="text-slate-500 text-xl mb-10 font-medium leading-relaxed">{t.buyElsePrompt[language]}</p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => { setShowBuyElseModal(false); handleSelectProduct(null); setCurrentPage('home'); }}
                className="bg-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
              >
                {t.keepLooking[language]}
              </button>
              <button 
                onClick={() => { setShowBuyElseModal(false); handleSelectProduct(null); setCurrentPage('basket'); }}
                className="bg-slate-100 text-slate-900 py-5 rounded-2xl font-black text-xl hover:bg-slate-200 transition-all"
              >
                {t.goBasket[language]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
