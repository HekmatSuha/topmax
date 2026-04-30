import React, { useState, useEffect, useMemo } from 'react';
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

const normalizeColorKey = (colorKey: string) => colorKey.trim().toLowerCase().replace(/\s+/g, '-');

const detectLanguage = (): Language => {
  const lang = (navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase();
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('kk') || lang.startsWith('kaz')) return 'kk';
  return 'en';
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(detectLanguage);
  const [currentPage, setCurrentPage] = useState<PageKey>('home');
  const [filter, setFilter] = useState<CategoryKey>('All');
  const [searchQuery, setSearchQuery] = useState('');
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

  const t = translations;

  const formatPrice = (price: number) => `${price.toLocaleString('ru-RU')} KZT`;
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

    fetch(`${BACKEND_BASE_URL}/api/products/`)
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
        // Open product from URL on initial load
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
      localStorage.removeItem('topmax_user');
    }
  };

  const toggleLike = (id: string) => {
    setLikedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleNavigate = (page: string) => {
    if (page === 'home' || page === 'contact' || page === 'basket') {
      setCurrentPage(page);
    }
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
  
  const filteredProducts = products.filter(p => {
    const matchesFilter = filter === 'All' || p.category === filter;
    const productName = getLocalizedText(p.name).toLowerCase();
    const productDescription = getLocalizedText(p.description).toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      productName.includes(query) ||
      productDescription.includes(query);
    return matchesFilter && matchesSearch;
  });

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
          <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="text-gray-500 text-lg mb-10">
                {t.premiumCollections[language]}
              </p>
              
              <div className="relative max-w-xl mx-auto mb-10">
                <input
                  type="text"
                  placeholder={t.searchPlaceholder[language]}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 pl-14 text-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {categoryKeys.map(key => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`group flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all duration-300 ${
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

            {isProductsLoading ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 mb-20">
                <p className="text-gray-400 text-xl font-medium">Loading products...</p>
              </div>
            ) : productsError ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-red-200 mb-20">
                <p className="text-red-500 text-xl font-medium">{productsError}</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-20">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onInquire={handleSelectProduct}
                    language={language}
                    isLiked={likedIds.includes(product.id)}
                    onToggleLike={() => toggleLike(product.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 mb-20">
                <p className="text-gray-400 text-xl font-medium">No results found.</p>
                <button onClick={() => setSearchQuery('')} className="mt-2 text-blue-600 font-bold hover:underline">Clear search</button>
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
      
      <main className="flex-grow">
        {renderPage()}
      </main>

      <BottomNav
        currentPage={currentPage}
        onNavigate={handleNavigate}
        basketCount={basket.reduce((a, b) => a + b.quantity, 0)}
        language={language}
      />

      {showAuth && (
        <Auth language={language} onAuthComplete={handleAuthComplete} onCancel={() => setShowAuth(false)} />
      )}

      {selectedProduct && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isModalVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => handleSelectProduct(null)}></div>
          <div className={`relative bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl transition-all duration-500 transform ${isModalVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 p-5 flex items-center justify-between">
               <button onClick={() => handleSelectProduct(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  <span className="text-sm uppercase tracking-widest">Back</span>
               </button>
               <div className="text-center">
                  <span className="block text-[10px] uppercase tracking-widest font-black text-blue-600">{t[selectedProduct.category][language]}</span>
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">{selectedProduct.name[language]}</span>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={handleShareProduct} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-black uppercase tracking-widest">
                    {shareCopied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        Share
                      </>
                    )}
                  </button>
                  <button onClick={() => handleSelectProduct(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative bg-gray-50 flex flex-col items-center justify-center p-6 lg:p-8 border-r border-gray-100">
                 <div className="w-full h-[250px] lg:h-[350px] flex items-center justify-center mb-6">
                    <img
                      src={visibleImageUrls[activeImageIndex] || PLACEHOLDER_IMAGE}
                      alt={getLocalizedText(selectedProduct.name, selectedProduct.itemCode)}
                      className="max-w-full max-h-full object-contain mix-blend-multiply transition-all duration-500"
                    />
                 </div>

                 {visibleImageUrls.length > 1 && (
                   <div className="flex gap-3 overflow-x-auto pb-3 px-2 max-w-full no-scrollbar">
                      {visibleImageUrls.map((url, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImageIndex(index)}
                          className={`w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                            activeImageIndex === index ? 'border-blue-600 ring-3 ring-blue-50 scale-105 shadow-md' : 'border-white opacity-60 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                   </div>
                 )}
              </div>

              <div className="p-6 sm:p-8 flex flex-col justify-center bg-white">
                <div className="mb-1">
                  <span className="text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase">ITEM CODE: {selectedProduct.itemCode}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 mb-4 leading-tight">
                  {selectedProduct.name[language]}
                </h2>

                <div className="flex flex-wrap gap-2 mb-5">
                  {selectedProduct.dimensions && (
                    <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg border border-slate-800 shadow-sm">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">{selectedProduct.dimensions}</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
                    <span className="text-[10px] font-black uppercase tracking-widest">{t.premiumQuality[language]}</span>
                  </div>
                  {selectedProduct.inStock === false ? (
                    <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100">
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.outOfStock[language]}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-lg border border-green-100">
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.inStock[language]}</span>
                    </div>
                  )}
                  {selectedProduct.isNew && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-lg shadow-sm">
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.new[language]}</span>
                    </div>
                  )}
                </div>

                <p className="text-slate-500 text-sm font-light mb-6 leading-relaxed">
                  {getLocalizedText(selectedProduct.description, t.premiumQuality[language])}
                </p>

                {selectedProduct.availableColors && selectedProduct.availableColors.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{t.selectFinish[language]}</h4>
                    <div className="flex flex-wrap gap-3">
                      {selectedProduct.availableColors.map(colorKey => (
                        <button
                          key={colorKey}
                          onClick={() => { setSelectedColor(colorKey); setActiveImageIndex(0); }}
                          className={`group relative flex flex-col items-center gap-1.5 transition-all ${
                            selectedColor === colorKey ? 'scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl border-3 transition-all shadow-sm ${
                              selectedColor === colorKey ? 'border-blue-600 ring-4 ring-blue-50 shadow-blue-100' : 'border-white'
                            }`}
                            style={{ background: getColorHex(colorKey) }}
                          />
                          <span className={`text-[9px] font-black uppercase tracking-tighter ${selectedColor === colorKey ? 'text-blue-600' : 'text-slate-400'}`}>
                             {t[normalizeColorKey(colorKey)]?.[language] ?? colorKey}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{t.keyFeatures[language]}</h4>
                   <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6">
                      {(selectedProduct.features?.[language] || selectedProduct.features?.en || []).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-700 text-xs font-bold">
                           <span className="flex-shrink-0 w-5 h-5 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-[10px]">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                             </svg>
                           </span>
                           {feature}
                        </li>
                      ))}
                      {(selectedProduct.warranty?.[language] || t.warranty[language]) && (
                        <li className="flex items-center gap-2 text-blue-600 text-xs font-bold">
                           <span className="flex-shrink-0 w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-[10px]">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" />
                             </svg>
                           </span>
                           {selectedProduct.warranty?.[language] || t.warranty[language]}
                        </li>
                      )}
                   </ul>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</span>
                      {selectedProduct.discountPercent > 0 && selectedProduct.discountedPrice != null ? (
                        <div className="flex items-baseline gap-3">
                          <span className="text-lg sm:text-xl font-serif font-bold text-slate-400 line-through">{formatPrice(selectedProduct.price)}</span>
                          <span className="text-3xl sm:text-4xl font-serif font-black text-red-500">{formatPrice(selectedProduct.discountedPrice)}</span>
                          <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-md">-{selectedProduct.discountPercent}%</span>
                        </div>
                      ) : (
                        <span className="text-3xl sm:text-4xl font-serif font-black text-blue-600">{formatPrice(selectedProduct.price)}</span>
                      )}
                    </div>
                    {selectedProduct.inStock === false ? (
                      <div className="w-full sm:w-auto bg-gray-300 text-gray-500 px-8 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 cursor-not-allowed">
                        {t.outOfStock[language]}
                      </div>
                    ) : (
                      <button
                        onClick={() => addToBasket(selectedProduct)}
                        className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-base hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95"
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
