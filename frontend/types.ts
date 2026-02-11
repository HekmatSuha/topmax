
export type Language = 'en' | 'ru' | 'kk';

export interface LocalizedString {
  en: string;
  ru: string;
  kk: string;
}

export interface User {
  name: string;
  email: string;
  isGuest: boolean;
}

export interface ProductImage {
  id: number;
  url: string;
  color?: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  itemCode: string;
  name: LocalizedString;
  category: 'Baths' | 'Taps' | 'Closets' | 'Mirrors' | 'Accessories' | 'Basins' | 'Dryers' | 'Others';
  description: LocalizedString;
  price: number;
  inStock: boolean;
  imageUrls: string[];
  availableColors?: string[];
  images?: ProductImage[];
  features: {
    en: string[];
    ru: string[];
    kk: string[];
  };
  warranty?: LocalizedString;
  dimensions?: string;
}

export interface BasketItem extends Product {
  quantity: number;
  selectedColor?: string; 
}

export interface DeploymentStep {
  title: LocalizedString;
  description: LocalizedString;
  commands: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
