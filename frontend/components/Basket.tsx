import React, { useEffect, useMemo, useState } from 'react';
import { BasketItem, Language, User } from '../types';
import { COMPANY_PHONE } from '../constants';
import { translations } from '../translations';

interface BasketProps {
  items: BasketItem[];
  onRemove: (productId: string, selectedColor?: string) => void;
  onUpdateQuantity: (productId: string, selectedColor: string | undefined, quantity: number) => void;
  onContinueShopping: () => void;
  onRequestLogin: () => void;
  language: Language;
  user: User | null;
}

const hasWholesalePrice = (item: BasketItem) => Boolean(item.isWholesaleVisible && item.wholesalePriceUsd);
const getWholesalePrice = (item: BasketItem) => Number(item.wholesalePriceUsd || 0);
const getItemKey = (item: BasketItem) => `${item.id}::${item.selectedColor || ''}`;
const getDefaultPrice = (item: BasketItem) =>
  hasWholesalePrice(item) ? getWholesalePrice(item) : Number(item.price || 0);
const formatKzt = (price: number) => `${price.toLocaleString('ru-RU')} KZT`;
const formatUsd = (price: number) =>
  `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const documentLabels: Record<Language, Record<string, string>> = {
  en: {
    warehouse: 'Warehouse No. 1 Almaty',
    address: 'Almaty, 93A Ryskulov Avenue',
    receipt: 'Sales receipt',
    from: 'dated',
    number: 'No.',
    article: 'Article',
    photo: 'Photo',
    name: 'Description',
    quantity: 'Qty',
    unit: 'Unit',
    price: 'Price',
    amount: 'Amount',
    pcs: 'pcs',
    totalQuantity: 'Total items',
    total: 'Total',
    customer: 'Customer details',
    download: 'Download PDF',
    signIn: 'Sign in to download PDF',
    editHint: 'Superadmin quotation prices',
    subtotal: 'Subtotal',
  },
  ru: {
    warehouse: 'Склад №1 Алматы',
    address: 'Алматы, Проспект Турара Рыскулова, 93а',
    receipt: 'Товарный чек',
    from: 'от',
    number: '№',
    article: 'Артикул',
    photo: 'Фото',
    name: 'Наименование',
    quantity: 'Кол-во',
    unit: 'Ед.',
    price: 'Цена',
    amount: 'Сумма',
    pcs: 'шт',
    totalQuantity: 'Общее количество товаров',
    total: 'Итого',
    customer: 'Данные покупателя',
    download: 'Скачать PDF',
    signIn: 'Войдите, чтобы скачать PDF',
    editHint: 'Цены товарного чека для суперадмина',
    subtotal: 'Подытог',
  },
  kk: {
    warehouse: '№1 қойма, Алматы',
    address: 'Алматы, Тұрар Рысқұлов даңғылы, 93а',
    receipt: 'Тауарлық чек',
    from: 'күні',
    number: '№',
    article: 'Артикул',
    photo: 'Фото',
    name: 'Атауы',
    quantity: 'Саны',
    unit: 'Бір.',
    price: 'Бағасы',
    amount: 'Сомасы',
    pcs: 'дана',
    totalQuantity: 'Тауарлардың жалпы саны',
    total: 'Барлығы',
    customer: 'Сатып алушы деректері',
    download: 'PDF жүктеу',
    signIn: 'PDF жүктеу үшін кіріңіз',
    editHint: 'Суперадминге арналған чек бағалары',
    subtotal: 'Аралық сома',
  },
};

const Basket: React.FC<BasketProps> = ({
  items,
  onRemove,
  onUpdateQuantity,
  onContinueShopping,
  onRequestLogin,
  language,
  user,
}) => {
  const t = translations;
  const labels = documentLabels[language];
  const isSuperuser = Boolean(user?.isSuperuser);
  const isWholesaleList = items.length > 0 && items.every(hasWholesalePrice);
  const currency = isWholesaleList ? 'USD' : 'KZT';
  const [quotePrices, setQuotePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    setQuotePrices(current => {
      const next: Record<string, number> = {};
      items.forEach(item => {
        const key = getItemKey(item);
        next[key] = current[key] ?? getDefaultPrice(item);
      });
      return next;
    });
  }, [items]);

  const total = useMemo(
    () => items.reduce(
      (sum, item) => sum + (quotePrices[getItemKey(item)] ?? getDefaultPrice(item)) * item.quantity,
      0
    ),
    [items, quotePrices]
  );
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const formatQuotePrice = (price: number) => currency === 'USD' ? formatUsd(price) : formatKzt(price);

  const handleConfirmPurchase = () => {
    if (items.length === 0) return;

    const orderDetails = items
      .map(item => {
        const colorName = item.selectedColor ? (t[item.selectedColor]?.[language] || item.selectedColor) : 'Standard';
        const unitPrice = quotePrices[getItemKey(item)] ?? getDefaultPrice(item);
        const formattedPrice = unitPrice > 0 ? formatQuotePrice(unitPrice) : t.priceOnRequest[language];
        return `• *${item.name[language]}* (x${item.quantity})\n  Code: ${item.itemCode}\n  Finish: ${colorName}\n  Price: ${formattedPrice}\n  Link: https://topmax.kz/?product=${item.id}\n`;
      })
      .join('\n');

    const header = isWholesaleList ? 'TOPMAX wholesale shop list' : t.waMsgHeader[language];
    const totalText = total > 0 ? `\n*${t.waMsgTotal[language]}: ${formatQuotePrice(total)}*` : '';
    const message = `${header}\n\n${t.waMsgIntro[language]}\n\n${orderDetails}${totalText}\n\n${t.waMsgFooter[language]}`;
    window.open(`https://wa.me/${COMPANY_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCreatePdf = () => {
    if (!user || user.isGuest) {
      onRequestLogin();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) return;

    const now = new Date();
    const locale = language === 'en' ? 'en-GB' : language === 'ru' ? 'ru-RU' : 'kk-KZ';
    const date = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);
    const receiptNumber =
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}` +
      `${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-5)}`;
    const rows = items.map((item, index) => {
      const unitPrice = quotePrices[getItemKey(item)] ?? getDefaultPrice(item);
      const printableUnitPrice = unitPrice > 0
        ? formatQuotePrice(unitPrice)
        : t.priceOnRequestShort[language];
      const printableLineTotal = unitPrice > 0
        ? formatQuotePrice(unitPrice * item.quantity)
        : t.priceOnRequestShort[language];
      const color = item.selectedColor ? (t[item.selectedColor]?.[language] || item.selectedColor) : '';
      const itemName = [
        item.name[language] || item.name.en,
        item.dimensions,
        color,
      ].filter(Boolean).join(' ');

      return `
        <tr>
          <td class="center row-number">${index + 1}</td>
          <td><span class="article">${escapeHtml(item.itemCode)}</span></td>
          <td class="photo"><div class="photo-frame">${item.imageUrls[0] ? `<img src="${escapeHtml(item.imageUrls[0])}" alt="">` : ''}</div></td>
          <td class="product-name">${escapeHtml(itemName)}</td>
          <td class="center quantity">${item.quantity}</td>
          <td class="center unit">${escapeHtml(labels.pcs)}</td>
          <td class="money">${escapeHtml(printableUnitPrice)}</td>
          <td class="money line-total">${escapeHtml(printableLineTotal)}</td>
        </tr>`;
    }).join('');

    printWindow.document.write(`<!doctype html>
      <html lang="${language}">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(labels.receipt)} ${escapeHtml(receiptNumber)}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; }
            html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body {
              margin: 0;
              color: #172033;
              background: #fff;
              font: 12px Arial, "Helvetica Neue", sans-serif;
            }
            .page { min-height: 267mm; border: 1px solid #e5eaf2; border-radius: 16px; overflow: hidden; }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 32px;
              padding: 24px 28px;
              color: #fff;
              background: linear-gradient(135deg, #111827 0%, #1e3a8a 100%);
            }
            .company-name { margin-bottom: 6px; font-size: 24px; font-weight: 900; letter-spacing: .04em; }
            .warehouse { color: #bfdbfe; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
            .address { margin-top: 12px; color: #e5e7eb; font-size: 11px; }
            .logo { width: 130px; text-align: center; color: #fff; }
            .rings { display: flex; justify-content: center; height: 44px; }
            .ring { width: 43px; height: 43px; margin-left: -12px; border: 4px solid currentColor; border-radius: 50%; }
            .ring:first-child { margin-left: 0; }
            .top { margin-top: 7px; font-size: 24px; font-weight: 900; line-height: .85; }
            .max { padding-left: 6px; font-size: 12px; letter-spacing: 7px; }
            .content { padding: 24px 28px 26px; }
            .invoice-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
            .invoice-label { margin-bottom: 6px; color: #2563eb; font-size: 10px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; }
            h1 { margin: 0; color: #111827; font-size: 26px; line-height: 1.15; }
            .invoice-meta { display: grid; grid-template-columns: repeat(2, minmax(110px, 1fr)); gap: 8px; min-width: 280px; }
            .meta-card { padding: 10px 12px; border: 1px solid #e5eaf2; border-radius: 10px; background: #f8fafc; }
            .meta-label { display: block; margin-bottom: 4px; color: #94a3b8; font-size: 8px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
            .meta-value { color: #172033; font-size: 11px; font-weight: 800; }
            .table-wrap { overflow: hidden; border: 1px solid #dfe5ef; border-radius: 12px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            thead { color: #fff; background: #2563eb; }
            th { padding: 10px 6px; font-size: 9px; font-weight: 800; letter-spacing: .04em; text-align: left; text-transform: uppercase; }
            td { height: 82px; padding: 8px 6px; border-top: 1px solid #e8edf4; vertical-align: middle; overflow-wrap: anywhere; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .center { text-align: center; }
            .row-number { color: #94a3b8; font-weight: 800; }
            .article { display: inline-block; padding: 5px 7px; border-radius: 6px; color: #1d4ed8; background: #eff6ff; font-size: 10px; font-weight: 800; }
            .photo-frame { display: flex; width: 64px; height: 64px; margin: auto; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #e5eaf2; border-radius: 9px; background: #fff; }
            .photo img { display: block; width: 100%; height: 100%; object-fit: contain; }
            .product-name { color: #172033; font-size: 11px; font-weight: 700; line-height: 1.45; }
            .quantity { font-size: 13px; font-weight: 900; }
            .unit { color: #64748b; }
            .money { text-align: right; white-space: nowrap; font-weight: 700; }
            .line-total { color: #111827; font-weight: 900; }
            .below-table { display: grid; grid-template-columns: 1fr 270px; gap: 24px; align-items: start; margin-top: 20px; }
            .customer { padding: 16px; border: 1px solid #e5eaf2; border-radius: 12px; background: #f8fafc; }
            .section-label { margin-bottom: 10px; color: #64748b; font-size: 9px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
            .customer-name { color: #172033; font-size: 15px; font-weight: 900; }
            .customer-email { margin-top: 5px; color: #64748b; font-size: 11px; }
            .items-count { margin-top: 14px; color: #64748b; font-size: 10px; font-weight: 700; }
            .summary { overflow: hidden; border-radius: 12px; color: #fff; background: #111827; }
            .summary-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.1); }
            .summary-row:last-child { border-bottom: 0; }
            .summary-label { color: #94a3b8; font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
            .summary-value { font-size: 12px; font-weight: 800; }
            .grand-total { padding-top: 15px; padding-bottom: 15px; background: #2563eb; }
            .grand-total .summary-label { color: #dbeafe; }
            .grand-total .summary-value { font-size: 20px; font-weight: 900; }
            .footer { display: flex; justify-content: space-between; gap: 24px; margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5eaf2; color: #94a3b8; font-size: 9px; }
            .footer strong { color: #64748b; }
            tr { break-inside: avoid; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="company">
                <div class="warehouse">${escapeHtml(labels.warehouse)}</div>
                <div class="company-name">TOP MAX</div>
                <div class="address">${escapeHtml(labels.address)}</div>
              </div>
              <div class="logo">
                <div class="rings"><span class="ring"></span><span class="ring"></span><span class="ring"></span></div>
                <div class="top">TOP</div><div class="max">MAX</div>
              </div>
            </div>
            <div class="content">
              <div class="invoice-heading">
                <div>
                  <div class="invoice-label">TOP MAX DOCUMENT</div>
                  <h1>${escapeHtml(labels.receipt)}</h1>
                </div>
                <div class="invoice-meta">
                  <div class="meta-card">
                    <span class="meta-label">${escapeHtml(labels.number)}</span>
                    <span class="meta-value">${escapeHtml(receiptNumber)}</span>
                  </div>
                  <div class="meta-card">
                    <span class="meta-label">${escapeHtml(labels.from)}</span>
                    <span class="meta-value">${escapeHtml(date)}</span>
                  </div>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <colgroup>
                    <col style="width:5%"><col style="width:10%"><col style="width:12%"><col style="width:35%">
                    <col style="width:7%"><col style="width:6%"><col style="width:12%"><col style="width:13%">
                  </colgroup>
                  <thead><tr>
                    <th class="center">${escapeHtml(labels.number)}</th><th>${escapeHtml(labels.article)}</th>
                    <th>${escapeHtml(labels.photo)}</th><th>${escapeHtml(labels.name)}</th>
                    <th class="center">${escapeHtml(labels.quantity)}</th><th class="center">${escapeHtml(labels.unit)}</th>
                    <th class="money">${escapeHtml(labels.price)}</th><th class="money">${escapeHtml(labels.amount)}</th>
                  </tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
              <div class="below-table">
                <div class="customer">
                  <div class="section-label">${escapeHtml(labels.customer)}</div>
                  <div class="customer-name">${escapeHtml(user.name)}</div>
                  ${user.email ? `<div class="customer-email">${escapeHtml(user.email)}</div>` : ''}
                  <div class="items-count">${escapeHtml(labels.totalQuantity)}: ${totalQuantity}</div>
                </div>
                <div class="summary">
                  <div class="summary-row">
                    <span class="summary-label">${escapeHtml(labels.totalQuantity)}</span>
                    <span class="summary-value">${totalQuantity}</span>
                  </div>
                  <div class="summary-row grand-total">
                    <span class="summary-label">${escapeHtml(labels.total)}</span>
                    <span class="summary-value">${escapeHtml(total > 0 ? formatQuotePrice(total) : t.priceOnRequestShort[language])}</span>
                  </div>
                </div>
              </div>
              <div class="footer">
                <span><strong>TOP MAX</strong> · topmax.kz · info@topmax.kz</span>
                <span>${escapeHtml(labels.address)}</span>
              </div>
            </div>
          </div>
        </body>
      </html>`);
    printWindow.document.close();

    let printed = false;
    const printWhenReady = () => {
      if (printed || printWindow.closed) return;
      printed = true;
      printWindow.focus();
      printWindow.print();
    };
    const pendingImages = Array.from(printWindow.document.images).filter(image => !image.complete);
    if (pendingImages.length === 0) {
      window.setTimeout(printWhenReady, 250);
    } else {
      let remaining = pendingImages.length;
      const onImageDone = () => {
        remaining -= 1;
        if (remaining <= 0) printWhenReady();
      };
      pendingImages.forEach(image => {
        image.addEventListener('load', onImageDone, { once: true });
        image.addEventListener('error', onImageDone, { once: true });
      });
      window.setTimeout(printWhenReady, 3000);
    }
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
          <svg className="mb-8 h-36 w-36 text-slate-100" viewBox="0 0 144 144" fill="none">
            <circle cx="72" cy="72" r="64" fill="currentColor" />
            <path d="M48 60h48l-6 40H54L48 60z" fill="white" stroke="#e2e8f0" strokeWidth="2" />
            <path d="M60 60V52a12 12 0 0 1 24 0v8" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <h2 className="font-display text-3xl font-bold text-slate-800 mb-3">{t.basketEmpty[language]}</h2>
          <button onClick={onContinueShopping} className="mt-8 bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-base shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
            {t.catalog[language]}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-6">
            {items.map((item, idx) => {
              const unitPrice = quotePrices[getItemKey(item)] ?? getDefaultPrice(item);
              return (
                <div key={`${item.id}-${item.selectedColor}-${idx}`} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 group relative">
                  <div className="w-32 h-32 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center p-2">
                    <img src={item.imageUrls[0]} alt="" className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-grow text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{t[item.category][language]}</span>
                      {item.selectedColor && (
                        <span className="bg-slate-900 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full">
                          {t[item.selectedColor]?.[language] || item.selectedColor}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-1">{item.name[language]}</h3>
                    <p className="text-xs font-bold text-slate-400">{item.itemCode}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-6 mt-4">
                      {unitPrice > 0 ? (
                        <span className="text-2xl font-serif font-black text-emerald-500">{formatQuotePrice(unitPrice * item.quantity)}</span>
                      ) : (
                        <span className="max-w-56 text-sm font-black uppercase leading-snug tracking-wide text-blue-600">{t.priceOnRequest[language]}</span>
                      )}
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

              {isSuperuser && (
                <div className="mb-6 rounded-2xl bg-white/5 p-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-blue-300">{labels.editHint}</p>
                  <div className="space-y-3">
                    {items.map(item => (
                      <label key={getItemKey(item)} className="grid grid-cols-[1fr_110px] items-center gap-3">
                        <span className="truncate text-xs font-bold text-slate-300">{item.itemCode}</span>
                        <input
                          type="number"
                          min="0"
                          step={currency === 'USD' ? '0.01' : '1'}
                          value={quotePrices[getItemKey(item)] ?? getDefaultPrice(item)}
                          onChange={event => setQuotePrices(current => ({
                            ...current,
                            [getItemKey(item)]: Math.max(0, Number(event.target.value) || 0),
                          }))}
                          className="w-full rounded-lg border border-white/10 bg-white px-3 py-2 text-right text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center opacity-40 uppercase tracking-widest font-black text-[10px]">
                  <span>{labels.subtotal}</span>
                  <span>{total > 0 ? formatQuotePrice(total) : t.priceOnRequest[language]}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-4">
                  <span className="text-sm font-black uppercase tracking-widest">{labels.total}</span>
                  <span className={`font-black ${total > 0 ? 'text-3xl font-serif text-blue-400' : 'max-w-44 text-right text-sm uppercase leading-snug tracking-wide text-blue-300'}`}>
                    {total > 0 ? formatQuotePrice(total) : t.priceOnRequest[language]}
                  </span>
                </div>
              </div>

              <button onClick={handleCreatePdf} className="mb-3 w-full bg-white py-4 rounded-2xl font-black text-base text-slate-900 transition-all hover:bg-slate-100 active:scale-95 flex items-center justify-center gap-3">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" />
                </svg>
                {user && !user.isGuest ? labels.download : labels.signIn}
              </button>

              <button onClick={handleConfirmPurchase} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95">
                {t.confirmOrder[language]}
              </button>

              <div className="mt-8 flex items-start gap-3 p-4 bg-white/5 rounded-2xl">
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
