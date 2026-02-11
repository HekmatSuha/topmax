import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import Contact from './components/Contact';
import Basket from './components/Basket';
import Auth from './components/Auth';
import { Product, ProductImage, BasketItem, Language, User } from './types';
import { translations } from './translations';

const BACKEND_BASE_URL = 'http://localhost:8000';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [currentPage, setCurrentPage] = useState('home');
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
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

  const resolveImageUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${BACKEND_BASE_URL}${url}`;
    return `${BACKEND_BASE_URL}/${url}`;
  };

  useEffect(() => {
    // Check backend connection
    fetch(`${BACKEND_BASE_URL}/api/test/`)
      .then(res => res.json())
      .then(data => {
        console.log('Backend connected:', data);
        setBackendStatus('connected');
      })
      .catch(err => {
        console.error('Backend connection failed:', err);
        setBackendStatus('failed');
      });

    fetch(`${BACKEND_BASE_URL}/api/products/`)
      .then(res => res.json())
      .then(data => {
        const normalizedProducts = (data.products || []).map((product: Product) => ({
          ...product,
          imageUrls: (product.imageUrls || []).map(resolveImageUrl),
          images: (product.images || []).map((img: any) => ({
            ...img,
            url: resolveImageUrl(img.url),
          })),
        }));
        setProducts(normalizedProducts);
        setProductsError('');
      })
      .catch(err => {
        console.error('Failed to load products:', err);
        setProductsError('Failed to load products from backend.');
      })
      .finally(() => {
        setIsProductsLoading(false);
      });

    // Check local storage for existing session
    const savedUser = localStorage.getItem('topmax_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    const savedLikes = localStorage.getItem('topmax_likes');
    if (savedLikes) {
      setLikedIds(JSON.parse(savedLikes));
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
        return colorFiltered.map((img: ProductImage) => img.url);
      }
    }
    // Fallback: all imageUrls (legacy + uploaded combined)
    return selectedProduct.imageUrls;
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

  const renderCategoryIcon = (key: string, isActive: boolean) => {
    const colorClass = isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600';
    
    switch (key) {
      case 'All': return <span className="text-lg">✨</span>;
      case 'Baths': return <span className="text-lg">🛁</span>;
      case 'Basins': return (
        <svg className={`w-5 h-5 transition-colors ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 11a8 8 0 0 0 16 0H4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m-3 0h6" />
        </svg>
      );
      case 'Taps': return <span className="text-lg">🚰</span>;
      case 'Closets': return <span className="text-lg">🚽</span>;
      case 'Mirrors': return <span className="text-lg">🪞</span>;
      case 'Dryers': return <span className="text-lg">🧣</span>;
      case 'Others': return (
        <svg className={`w-5 h-5 transition-colors ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
      default: return null;
    }
  };

  const categoryKeys = ['All', 'Baths', 'Basins', 'Taps', 'Closets', 'Mirrors', 'Dryers', 'Others'];
  
  const filteredProducts = products.filter(p => {
    const matchesFilter = filter === 'All' || p.category === filter;
    const matchesSearch = 
      p.name[language].toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description[language].toLowerCase().includes(searchQuery.toLowerCase());
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

  const getColorHex = (colorKey: string) => {
    switch (colorKey) {
      case 'chrome': return 'linear-gradient(135deg, #f3f4f6, #9ca3af)';
      case 'black': return '#1a1a1a';
      case 'matte_black': return '#1a1a1a';
      case 'brushed_gold': return '#d4af37';
      case 'rose_gold': return '#b76e79';
      case 'white': return '#ffffff';
      default: return '#ccc';
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h1 className="text-3xl md:text-5xl font-serif font-black text-slate-900 mb-4 tracking-tight">
                {t.premiumCollections[language]}
              </h1>
              <p className="text-gray-500 max-w-xl mx-auto text-lg leading-relaxed mb-10">
                {t.heroSubtitle[language]}
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
                    onInquire={setSelectedProduct} 
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
        onNavigate={setCurrentPage} 
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

      {showAuth && (
        <Auth language={language} onAuthComplete={handleAuthComplete} onCancel={() => setShowAuth(false)} />
      )}

      {selectedProduct && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isModalVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>
          <div className={`relative bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl transition-all duration-500 transform ${isModalVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 p-5 flex items-center justify-between">
               <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  <span className="text-sm uppercase tracking-widest">Back</span>
               </button>
               <div className="text-center">
                  <span className="block text-[10px] uppercase tracking-widest font-black text-blue-600">{t[selectedProduct.category][language]}</span>
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">{selectedProduct.name[language]}</span>
               </div>
               <button onClick={() => setSelectedProduct(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative bg-gray-50 flex flex-col items-center justify-center p-8 lg:p-12 border-r border-gray-100">
                 <div className="w-full h-[300px] lg:h-[450px] flex items-center justify-center mb-10">
                    <img src={visibleImageUrls[activeImageIndex] || selectedProduct.imageUrls[0]} className="max-w-full max-h-full object-contain mix-blend-multiply transition-all duration-500" />
                 </div>

                 {visibleImageUrls.length > 1 && (
                   <div className="flex gap-4 overflow-x-auto pb-4 px-2 max-w-full no-scrollbar">
                      {visibleImageUrls.map((url, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImageIndex(index)}
                          className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                            activeImageIndex === index ? 'border-blue-600 ring-4 ring-blue-50 scale-105 shadow-lg' : 'border-white opacity-60 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          <img src={url} className="w-full h-full object-cover" />
                        </button>
                      ))}
                   </div>
                 )}
              </div>

              <div className="p-8 sm:p-14 flex flex-col justify-center bg-white">
                <div className="mb-2">
                  <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">ITEM CODE: {selectedProduct.itemCode}</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-serif font-black text-slate-900 mb-6 leading-tight">
                  {selectedProduct.name[language]}
                </h2>
                
                <div className="flex flex-wrap gap-3 mb-8">
                  {selectedProduct.dimensions && (
                    <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl border border-slate-800 shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                      <span className="text-xs font-black uppercase tracking-widest">{selectedProduct.dimensions}</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100">
                    <span className="text-xs font-black uppercase tracking-widest">★ {t.premiumQuality[language]}</span>
                  </div>
                </div>

                <p className="text-slate-500 text-xl font-light mb-10 leading-relaxed">
                  {selectedProduct.description[language]}
                </p>

                <div className="mb-10">
                   <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">{t.keyFeatures[language]}</h4>
                   <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                      {selectedProduct.features[language].map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-700 text-sm font-bold">
                           <span className="flex-shrink-0 w-6 h-6 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
                           {feature}
                        </li>
                      ))}
                      {(selectedProduct.warranty?.[language] || t.warranty[language]) && (
                        <li className="flex items-center gap-3 text-blue-600 text-sm font-bold">
                           <span className="flex-shrink-0 w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xs">🛡️</span>
                           {selectedProduct.warranty?.[language] || t.warranty[language]}
                        </li>
                      )}
                   </ul>
                </div>

                {selectedProduct.availableColors && selectedProduct.availableColors.length > 0 && (
                  <div className="mb-12">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">{t.selectFinish[language]}</h4>
                    <div className="flex flex-wrap gap-5">
                      {selectedProduct.availableColors.map(colorKey => (
                        <button
                          key={colorKey}
                          onClick={() => { setSelectedColor(colorKey); setActiveImageIndex(0); }}
                          className={`group relative flex flex-col items-center gap-2 transition-all ${
                            selectedColor === colorKey ? 'scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          <div 
                            className={`w-14 h-14 rounded-2xl border-4 transition-all shadow-md ${
                              selectedColor === colorKey ? 'border-blue-600 ring-8 ring-blue-50 shadow-blue-100' : 'border-white'
                            }`}
                            style={{ background: getColorHex(colorKey) }}
                          />
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${selectedColor === colorKey ? 'text-blue-600' : 'text-slate-400'}`}>
                             {t[colorKey]?.[language] ?? colorKey}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-10 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-center sm:text-left">
                      <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Price</span>
                      <span className="text-4xl sm:text-5xl font-serif font-black text-blue-600">{selectedProduct.price.toLocaleString()} ₸</span>
                    </div>
                    <button 
                      onClick={() => addToBasket(selectedProduct)}
                      className="w-full sm:w-auto flex-grow bg-blue-600 text-white px-10 py-6 rounded-[2rem] font-black text-2xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100 flex items-center justify-center gap-4 active:scale-95"
                    >
                      <span className="text-2xl">🛒</span>
                      {t.addToBasket[language]}
                    </button>
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
               <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-3xl font-serif font-black text-slate-900 mb-4">{t.addedToBasket[language]}</h2>
            <p className="text-slate-500 text-xl mb-10 font-medium leading-relaxed">{t.buyElsePrompt[language]}</p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => { setShowBuyElseModal(false); setSelectedProduct(null); setCurrentPage('home'); }}
                className="bg-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
              >
                {t.keepLooking[language]}
              </button>
              <button 
                onClick={() => { setShowBuyElseModal(false); setSelectedProduct(null); setCurrentPage('basket'); }}
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
