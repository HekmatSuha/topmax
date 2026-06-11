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

type PdfAction = 'view' | 'send' | 'download' | 'whatsapp';

const hasWholesalePrice = (item: BasketItem) => Boolean(item.isWholesaleVisible && item.wholesalePriceUsd);
const getWholesalePrice = (item: BasketItem) => Number(item.wholesalePriceUsd || 0);
const getItemKey = (item: BasketItem) => `${item.id}::${item.selectedColor || ''}`;
const getDefaultPrice = (item: BasketItem) =>
  hasWholesalePrice(item) ? getWholesalePrice(item) : Number(item.price || 0);
const formatKzt = (price: number) => `${price.toLocaleString('ru-RU')} KZT`;
const formatUsd = (price: number) =>
  `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const cloneWithComputedStyles = (source: HTMLElement) => {
  const clone = source.cloneNode(true) as HTMLElement;
  const sourceElements = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const clonedElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];

  sourceElements.forEach((element, index) => {
    const clonedElement = clonedElements[index];
    if (!clonedElement) return;

    const computedStyle = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (!computedStyle) return;

    for (const property of Array.from(computedStyle)) {
      clonedElement.style.setProperty(
        property,
        computedStyle.getPropertyValue(property),
        computedStyle.getPropertyPriority(property)
      );
    }
  });

  return clone;
};

const documentLabels: Record<Language, Record<string, string>> = {
  en: {
    receipt: 'Client order',
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
    pdfOptions: 'PDF options',
    view: 'View',
    send: 'Send',
    download: 'Download',
    preparing: 'Preparing PDF...',
    signIn: 'Sign in to download PDF',
    editHint: 'Superadmin quotation prices',
    subtotal: 'Subtotal',
    finish: 'Finish',
    itemCode: 'Article',
    lineTotal: 'Line total',
    orderItems: 'Items',
  },
  ru: {
    receipt: 'Заказ клиента',
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
    pdfOptions: 'Действия с PDF',
    view: 'Посмотреть',
    send: 'Отправить',
    download: 'Скачать',
    preparing: 'Подготовка PDF...',
    signIn: 'Войдите, чтобы скачать PDF',
    editHint: 'Цены товарного чека для суперадмина',
    subtotal: 'Подытог',
    finish: 'Цвет',
    itemCode: 'Артикул',
    lineTotal: 'Сумма',
    orderItems: 'Товары',
  },
  kk: {
    receipt: 'Клиент тапсырысы',
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
    pdfOptions: 'PDF әрекеттері',
    view: 'Қарау',
    send: 'Жіберу',
    download: 'Жүктеу',
    preparing: 'PDF дайындалуда...',
    signIn: 'PDF жүктеу үшін кіріңіз',
    editHint: 'Суперадминге арналған чек бағалары',
    subtotal: 'Аралық сома',
    finish: 'Түсі',
    itemCode: 'Артикул',
    lineTotal: 'Сомасы',
    orderItems: 'Тауарлар',
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
  const [isPdfMenuOpen, setIsPdfMenuOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  const buildWhatsAppMessage = () => {
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
    return `${header}\n\n${t.waMsgIntro[language]}\n\n${orderDetails}${totalText}\n\n${t.waMsgFooter[language]}`;
  };

  const buildOrganizedWhatsAppMessage = () => {
    if (items.length === 0) return;

    const orderDetails = items.map((item, index) => {
      const colorName = item.selectedColor
        ? (t[item.selectedColor]?.[language] || item.selectedColor)
        : language === 'en' ? 'Standard' : 'Стандарт';
      const unitPrice = quotePrices[getItemKey(item)] ?? getDefaultPrice(item);
      const formattedPrice = unitPrice > 0 ? formatQuotePrice(unitPrice) : t.priceOnRequest[language];
      const lineTotal = unitPrice > 0
        ? formatQuotePrice(unitPrice * item.quantity)
        : t.priceOnRequest[language];

      return [
        `*${index + 1}. ${item.name[language] || item.name.en}*`,
        `${labels.itemCode}: ${item.itemCode}`,
        `${labels.finish}: ${colorName}`,
        `${labels.quantity}: ${item.quantity} ${labels.pcs}`,
        `${labels.price}: ${formattedPrice}`,
        `${labels.lineTotal}: *${lineTotal}*`,
        `https://topmax.kz/?product=${item.id}`,
      ].join('\n');
    }).join('\n\n');

    const header = isWholesaleList ? '*TOPMAX WHOLESALE ORDER*' : t.waMsgHeader[language];
    const totalText = total > 0
      ? `*${t.waMsgTotal[language]}: ${formatQuotePrice(total)}*`
      : `*${t.waMsgTotal[language]}: ${t.priceOnRequest[language]}*`;

    return [
      header,
      t.waMsgIntro[language],
      `*${labels.orderItems}:*`,
      orderDetails,
      '━━━━━━━━━━━━━━',
      `*${labels.totalQuantity}: ${totalQuantity}*`,
      totalText,
      t.waMsgFooter[language],
    ].join('\n\n');
  };

  const handleConfirmPurchase = () => {
    const message = buildOrganizedWhatsAppMessage();
    if (!message) return;
    window.open(
      `https://wa.me/${COMPANY_PHONE}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCreatePdf = async (action: PdfAction) => {
    if (!user || user.isGuest) {
      onRequestLogin();
      return;
    }

    const whatsappMessage = action === 'whatsapp' ? buildOrganizedWhatsAppMessage() : '';
    const whatsappUrl = action === 'whatsapp'
      ? `https://wa.me/${COMPANY_PHONE}?text=${encodeURIComponent(
          `${whatsappMessage}\n\nThe PDF invoice is being downloaded. Please attach it to this chat.`
        )}`
      : '';
    const supportsMobileFileShare =
      action === 'whatsapp' &&
      Boolean(navigator.share) &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const previewWindow = action === 'view' ? window.open('', '_blank') : null;
    const whatsappWindow =
      action === 'whatsapp' && !supportsMobileFileShare
        ? window.open(whatsappUrl, '_blank')
        : null;
    if (action === 'view' && !previewWindow) return;
    setIsPdfMenuOpen(false);
    setIsGeneratingPdf(true);

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

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const invoiceDocument = iframe.contentDocument;
    if (!invoiceDocument) {
      iframe.remove();
      previewWindow?.close();
      setIsGeneratingPdf(false);
      return;
    }

    invoiceDocument.open();
    invoiceDocument.write(`<!doctype html>
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
            .page { min-height: 297mm; padding: 36px 40px; }
            .header {
              display: flex;
              justify-content: center;
              padding: 0 0 18px;
              color: #111827;
              border-bottom: 2px solid #111827;
            }
            .logo { width: 130px; text-align: center; color: #111827; }
            .rings { display: flex; justify-content: center; height: 44px; }
            .ring { width: 43px; height: 43px; margin-left: -12px; border: 4px solid currentColor; border-radius: 50%; }
            .ring:first-child { margin-left: 0; }
            .top { margin-top: 7px; font-size: 24px; font-weight: 900; line-height: .85; }
            .max { padding-left: 6px; font-size: 12px; letter-spacing: 7px; }
            .content { padding: 24px 0 26px; }
            .invoice-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
            h1 { margin: 0; color: #111827; font-size: 26px; line-height: 1.15; }
            .invoice-meta { display: grid; grid-template-columns: repeat(2, minmax(110px, 1fr)); gap: 8px; min-width: 280px; }
            .meta-card { padding: 10px 12px; border: 1px solid #d1d5db; }
            .meta-label { display: block; margin-bottom: 4px; color: #6b7280; font-size: 8px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
            .meta-value { color: #111827; font-size: 11px; font-weight: 700; }
            .table-wrap { border: 1px solid #d1d5db; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            thead { color: #111827; background: #f3f4f6; }
            th { padding: 10px 6px; border-bottom: 1px solid #d1d5db; font-size: 9px; font-weight: 700; letter-spacing: .04em; text-align: left; text-transform: uppercase; }
            td { height: 82px; padding: 8px 6px; border-top: 1px solid #e5e7eb; vertical-align: middle; overflow-wrap: anywhere; }
            .center { text-align: center; }
            .row-number { color: #9ca3af; font-weight: 700; }
            .article { font-size: 10px; font-weight: 700; color: #374151; }
            .photo-frame { display: flex; width: 64px; height: 64px; margin: auto; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #e5e7eb; background: #fff; }
            .photo img { display: block; width: 100%; height: 100%; object-fit: contain; }
            .product-name { color: #111827; font-size: 11px; font-weight: 600; line-height: 1.45; }
            .quantity { font-size: 13px; font-weight: 800; }
            .unit { color: #6b7280; }
            .money { text-align: right; white-space: nowrap; font-weight: 600; }
            .line-total { color: #111827; font-weight: 800; }
            .below-table { display: grid; grid-template-columns: 1fr 270px; gap: 24px; align-items: start; margin-top: 20px; }
            .customer { padding: 16px; border: 1px solid #d1d5db; }
            .section-label { margin-bottom: 10px; color: #6b7280; font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
            .customer-name { color: #111827; font-size: 15px; font-weight: 800; }
            .customer-email { margin-top: 5px; color: #6b7280; font-size: 11px; }
            .items-count { margin-top: 14px; color: #6b7280; font-size: 10px; font-weight: 600; }
            .summary { border: 1px solid #d1d5db; color: #111827; }
            .summary-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
            .summary-row:last-child { border-bottom: 0; }
            .summary-label { color: #6b7280; font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
            .summary-value { font-size: 12px; font-weight: 700; }
            .grand-total { padding-top: 15px; padding-bottom: 15px; border-top: 2px solid #111827; background: #f3f4f6; }
            .grand-total .summary-label { color: #111827; }
            .grand-total .summary-value { font-size: 20px; font-weight: 900; }
            .footer { display: flex; justify-content: center; margin-top: 28px; padding-top: 14px; border-top: 1px solid #d1d5db; color: #9ca3af; font-size: 9px; }
            .footer strong { color: #4b5563; }
            tr { break-inside: avoid; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="logo">
                <div class="rings"><span class="ring"></span><span class="ring"></span><span class="ring"></span></div>
                <div class="top">TOP</div><div class="max">MAX</div>
              </div>
            </div>
            <div class="content">
              <div class="invoice-heading">
                <div>
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
                <span><strong>TOP MAX</strong> · topmax.kz</span>
              </div>
            </div>
          </div>
        </body>
      </html>`);
    invoiceDocument.close();

    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const pendingImages = Array.from(invoiceDocument.images).filter(image => !image.complete);
      if (pendingImages.length > 0) {
        await Promise.race([
          Promise.all(pendingImages.map(image => new Promise<void>(resolve => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          }))),
          new Promise<void>(resolve => window.setTimeout(resolve, 3000)),
        ]);
      }

      const iframeInvoiceElement = invoiceDocument.querySelector<HTMLElement>('.page');
      if (!iframeInvoiceElement) throw new Error('Invoice document could not be created.');

      const renderHost = document.createElement('div');
      renderHost.style.position = 'fixed';
      renderHost.style.left = '-10000px';
      renderHost.style.top = '0';
      renderHost.style.width = '794px';
      renderHost.style.background = '#ffffff';
      renderHost.setAttribute('aria-hidden', 'true');
      const invoiceElement = cloneWithComputedStyles(iframeInvoiceElement);
      renderHost.appendChild(invoiceElement);
      document.body.appendChild(renderHost);

      const filename = `topmax-${receiptNumber}.pdf`;
      let blob: Blob;
      try {
        blob = await html2pdf()
          .set({
            margin: 0,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              logging: false,
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          })
          .from(invoiceElement)
          .outputPdf('blob') as Blob;
      } finally {
        renderHost.remove();
      }
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (
        (action === 'send' || action === 'whatsapp') &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          title: labels.receipt,
          text: action === 'whatsapp'
            ? whatsappMessage
            : `${labels.receipt} ${labels.number} ${receiptNumber}`,
          files: [file],
        });
      } else {
        const objectUrl = URL.createObjectURL(blob);
        if (action === 'view' && previewWindow) {
          previewWindow.location.href = objectUrl;
        } else {
          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
        if (action === 'whatsapp') {
          if (!whatsappWindow && !supportsMobileFileShare) {
            window.location.href = whatsappUrl;
          }
        }
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      previewWindow?.close();
    } finally {
      iframe.remove();
      setIsGeneratingPdf(false);
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
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        {item.categoryName?.[language] || item.categoryName?.en || t[item.category]?.[language] || item.category}
                      </span>
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

              <div className="relative mb-3">
                <button
                  onClick={() => {
                    if (!user || user.isGuest) {
                      onRequestLogin();
                      return;
                    }
                    setIsPdfMenuOpen(open => !open);
                  }}
                  disabled={isGeneratingPdf}
                  className="w-full bg-white py-4 rounded-2xl font-black text-base text-slate-900 transition-all hover:bg-slate-100 active:scale-95 disabled:cursor-wait disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" />
                  </svg>
                  {isGeneratingPdf
                    ? labels.preparing
                    : user && !user.isGuest
                      ? labels.pdfOptions
                      : labels.signIn}
                </button>

                {isPdfMenuOpen && !isGeneratingPdf && (
                  <div className="absolute bottom-full left-0 z-20 mb-2 grid w-full grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                    {([
                      ['view', labels.view],
                      ['send', labels.send],
                      ['download', labels.download],
                    ] as [PdfAction, string][]).map(([action, label]) => (
                      <button
                        key={action}
                        onClick={() => handleCreatePdf(action)}
                        className="rounded-xl bg-slate-50 px-2 py-3 text-xs font-black text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleConfirmPurchase}
                className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95"
              >
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
