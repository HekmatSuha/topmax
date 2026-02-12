
import { Product, DeploymentStep } from './types';

export const COMPANY_PHONE = "77000000000";

export const PRODUCTS: Product[] = [
  {
    id: '1',
    itemCode: 'TM-BTH-701',
    name: { en: 'Royal Freestanding Bath', ru: 'Ванна Royal Freestanding', kk: 'Royal еркін тұрған ваннасы' },
    category: 'Baths',
    description: { 
      en: 'A luxurious acrylic freestanding bathtub designed for modern elegance and ultimate comfort.',
      ru: 'Роскошная отдельно стоящая акриловая ванна, созданная для современной элегантности и максимального комфорта.',
      kk: 'Заманауи талғампаздық пен барынша жайлылық үшін жасалған сәнді акрилді ванна.'
    },
    price: 625000,
    discountPercent: 0,
    discountedPrice: null,
    inStock: true,
    isNew: false,
    imageUrls: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1620626011761-9963d7521576?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&q=80&w=800'
    ],
    availableColors: ['white', 'matte_black'],
    features: {
      en: ['High-gloss acrylic', 'Heat retention technology', 'Easy clean surface'],
      ru: ['Глянцевый акрил', 'Технология удержания тепла', 'Легко очищаемая поверхность'],
      kk: ['Жылтыр акрил', 'Жылуды сақтау технологиясы', 'Оңай тазаланатын бет']
    },
    dimensions: '1700mm x 800mm'
  },
  {
    id: '5',
    itemCode: 'TM-BSN-450',
    name: { en: 'Zen Stone Countertop Basin', ru: 'Накладная раковина Zen Stone', kk: 'Zen Stone үстел үстіндегі раковинасы' },
    category: 'Basins',
    description: {
      en: 'Minimalist stone-textured ceramic basin designed for high-end modern bathrooms.',
      ru: 'Минималистичная керамическая раковина с текстурой камня, созданная для современных ванных комнат высокого класса.',
      kk: 'Жоғары деңгейлі заманауи ванна бөлмелеріне арналған минималистік тас тектес керамикалық раковина.'
    },
    price: 95000,
    discountPercent: 0,
    discountedPrice: null,
    inStock: true,
    isNew: false,
    imageUrls: [
      'https://images.unsplash.com/photo-1620626011761-9963d7521576?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1507652313519-d45ad717c731?auto=format&fit=crop&q=80&w=800'
    ],
    availableColors: ['white', 'matte_black'],
    features: {
      en: ['Anti-scratch ceramic', 'Stain resistant coating', 'Compact design'],
      ru: ['Керамика против царапин', 'Грязеотталкивающее покрытие', 'Компактный дизайн'],
      kk: ['Сызаттарға төзімді керамика', 'Кірге төзімді жабын', 'Ықшам дизайн']
    },
    dimensions: '450mm diameter'
  },
  {
    id: '2',
    itemCode: 'TM-TAP-155',
    name: { en: 'Elegance Mono Basin Tap', ru: 'Смеситель Elegance Mono', kk: 'Elegance Mono шүмегі' },
    category: 'Taps',
    description: {
      en: 'Chrome finished single lever basin mixer with ceramic disc technology.',
      ru: 'Хромированный однорычажный смеситель для раковины с технологией керамических дисков.',
      kk: 'Керамикалық диск технологиясы бар хромдалған бір иінді раковина смесительі.'
    },
    price: 72500,
    discountPercent: 0,
    discountedPrice: null,
    inStock: true,
    isNew: false,
    imageUrls: [
      'https://images.unsplash.com/photo-1584107158582-1d00b702e307?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1604709866599-019bb7fe3c2a?auto=format&fit=crop&q=80&w=800'
    ],
    availableColors: ['chrome', 'matte_black', 'brushed_gold', 'rose_gold'],
    features: {
      en: ['Solid brass body', 'Eco-flow aerator', '10-year warranty'],
      ru: ['Цельный латунный корпус', 'Аэратор Eco-flow', '10-летняя гарантия'],
      kk: ['Тұтас жез корпус', 'Eco-flow аэраторы', '10 жылдық кепілдік']
    },
    dimensions: 'H: 155mm'
  },
  {
    id: '3',
    itemCode: 'TM-CLO-540',
    name: { en: 'Summit Wall-Hung Closet', ru: 'Подвесной унитаз Summit', kk: 'Summit аспалы унитазы' },
    category: 'Closets',
    description: {
      en: 'Space-saving rimless wall-hung toilet with soft-close seat.',
      ru: 'Экономящий место подвесной безободковый унитаз с сиденьем с микролифтом.',
      kk: 'Орынды үнемдейтін, жұмсақ жабылатын қақпағы бар Summit аспалы унитазы.'
    },
    price: 225000,
    discountPercent: 0,
    discountedPrice: null,
    inStock: true,
    isNew: false,
    imageUrls: [
      'https://images.unsplash.com/photo-1620626011761-9963d7521576?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1585623011016-563f458e0a7b?auto=format&fit=crop&q=80&w=800'
    ],
    availableColors: ['white', 'matte_black'],
    features: {
      en: ['Rimless flush', 'Concealed fixings', 'Nanoglaze finish'],
      ru: ['Безободковый смыв', 'Скрытые крепления', 'Покрытие Nanoglaze'],
      kk: ['Жиексіз жуу', 'Жасырын бекіткіштер', 'Nanoglaze жабыны']
    },
    dimensions: '540mm projection'
  },
  {
    id: '4',
    itemCode: 'TM-MIR-806',
    name: { en: 'Aurora LED Smart Mirror', ru: 'Умное зеркало Aurora LED', kk: 'Aurora LED смарт айнасы' },
    category: 'Mirrors',
    description: {
      en: 'Premium backlit bathroom mirror with anti-fog technology and touch control.',
      ru: 'Премиальное зеркало для ванной с подсветкой, технологией против запотевания и сенсорным управлением.',
      kk: 'Тұманға қарсы технологиясы және сенсорлық басқаруы бар премиум жарықтандырылған ванна айнасы.'
    },
    price: 135000,
    discountPercent: 0,
    discountedPrice: null,
    inStock: true,
    isNew: false,
    imageUrls: [
      'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800'
    ],
    features: {
      en: ['LED illumination', 'Anti-fog heater', 'Touch sensor switch'],
      ru: ['LED подсветка', 'Подогрев против запотевания', 'Сенсорный выключатель'],
      kk: ['LED жарықтандыру', 'Тұманға қарсы жылытқыш', 'Сенсорлық қосқыш']
    },
    dimensions: '800mm x 600mm'
  },
  {
    id: '6',
    itemCode: 'TM-DRY-120',
    name: { en: 'Titan Heated Towel Rail', ru: 'Полотенцесушитель Titan', kk: 'Titan кептіргіші' },
    category: 'Dryers',
    description: {
      en: 'Stainless steel electric heated towel rail with a sleek minimalist design.',
      ru: 'Электрический полотенцесушитель из нержавеющей стали с элегантным минималистичным дизайном.',
      kk: 'Минималистік дизайны бар тот баспайтын болаттан жасалған электрлік кептіргіш.'
    },
    price: 85000,
    discountPercent: 0,
    discountedPrice: null,
    inStock: true,
    isNew: false,
    imageUrls: [
      'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&q=80&w=800'
    ],
    availableColors: ['chrome', 'matte_black'],
    features: {
      en: ['Rapid heating', 'Low energy consumption', 'Moisture resistant'],
      ru: ['Быстрый нагрев', 'Низкое энергопотребление', 'Влагозащищенный'],
      kk: ['Жылдам жылыту', 'Төмен энергия тұтыну', 'Ылғалға төзімді']
    },
    dimensions: '1200mm x 500mm'
  },
  {
    id: '7',
    itemCode: 'TM-OTH-001',
    name: { en: 'Luxury Soap Dispenser Set', ru: 'Набор дозаторов для мыла', kk: 'Сабын диспенсерлерінің жинағы' },
    category: 'Others',
    description: {
      en: 'Elegant marble-textured ceramic soap dispenser and tumbler set.',
      ru: 'Элегантный набор из керамического дозатора для мыла и стакана с текстурой мрамора.',
      kk: 'Мәрмәр тектес керамикалық сабын диспенсері мен стакан жинағы.'
    },
    price: 25000,
    discountPercent: 0,
    discountedPrice: null,
    inStock: true,
    isNew: false,
    imageUrls: [
      'https://images.unsplash.com/photo-1603533512480-7a98fa202f5a?auto=format&fit=crop&q=80&w=800'
    ],
    availableColors: ['white', 'matte_black'],
    features: {
      en: ['Marble texture', 'Corrosion resistant pump', 'Non-slip base'],
      ru: ['Текстура мрамора', 'Коррозионностойкий насос', 'Нескользящее основание'],
      kk: ['Мәрмәр текстурасы', 'Коррозияға төзімді сорғы', 'Сырғымайтын негіз']
    },
    dimensions: 'Set of 3 pieces'
  }
];

export const DEPLOYMENT_PLAN: DeploymentStep[] = [
  {
    title: { en: '1. Droplet Setup', ru: '1. Настройка Droplet', kk: '1. Droplet орнату' },
    description: { 
      en: 'Initial server preparation on your DigitalOcean Droplet.',
      ru: 'Начальная подготовка сервера на вашем DigitalOcean Droplet.',
      kk: 'DigitalOcean Droplet-те серверді бастапқы дайындау.'
    },
    commands: [
      'ssh root@your_ip',
      'apt update && apt upgrade -y',
      'apt install python3-pip python3-dev libpq-dev postgresql postgresql-contrib nginx curl -y'
    ]
  }
];
