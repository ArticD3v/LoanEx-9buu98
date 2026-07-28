import { Product, DealerSource, ProductPhoto } from '../types';

const ph = (url: string, o: number): ProductPhoto => ({ id: `ph-${o}`, url, order: o, isCover: o === 1 });
const dl = (c: string, n: string, a: string, m: string, p: number): DealerSource => ({
  id: `d-${c}`, dealerCode: c, dealerName: n, dealerAddress: a, dealerMobile: m, purchasePrice: p,
});

let products: Product[] = [
  {
    id: '1', name: 'iPhone 15 Pro Max', sku: 'IPH-15PM-256', price: 134900, originalPrice: 149900,
    category: 'Electronics', categoryId: '1', brand: 'Apple', rating: 4.8, reviews: 2341, stock: 50, status: 'active',
    description: 'A17 Pro chip, titanium design, pro camera system with 4K 120fps ProRes video. Dynamic Island, Always-On display.',
    image: 'https://images.unsplash.com/photo-1696446702183-a16ae295cbf5?w=600',
    photos: [ph('https://images.unsplash.com/photo-1696446702183-a16ae295cbf5?w=600',1), ph('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',2), ph('https://images.unsplash.com/photo-1574481011264-60a4a073d168?w=600',3), ph('https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600',4)],
    emiAvailable: true, emiPlanMode: 'multiple', tenureOptions: [7, 10, 12],
    downPayment: 40, downPaymentType: 'percentage', firstPaymentRule: 'down_payment',
    serviceCharge: 1500, deliveryCharge: 0, createdAt: '2024-01-15T10:00:00Z',
    dealers: [dl('APL-001','Apple Premium Delhi','Connaught Place, New Delhi','9876540001',120000), dl('APL-002','iStore Bangalore','Indiranagar, Bengaluru','9876540002',121500), dl('APL-003','Premium Phones Mumbai','Bandra West, Mumbai','9876540003',122000)],
  },
  {
    id: '2', name: 'Samsung Galaxy S24 Ultra', sku: 'SG-S24U-256', price: 124999, originalPrice: 139999,
    category: 'Electronics', categoryId: '1', brand: 'Samsung', rating: 4.7, reviews: 1876, stock: 35, status: 'active',
    description: 'Galaxy AI integrated S Pen, 200MP camera, Snapdragon 8 Gen 3 for ultimate performance.',
    image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600',
    photos: [ph('https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600',1), ph('https://images.unsplash.com/photo-1583585189397-c2b9c7ae0e7d?w=600',2), ph('https://images.unsplash.com/photo-1614269726463-b8d0f946db8d?w=600',3), ph('https://images.unsplash.com/photo-1628093522236-3ebb06cc44c3?w=600',4)],
    emiAvailable: true, emiPlanMode: 'multiple', tenureOptions: [6, 10, 12],
    downPayment: 30, downPaymentType: 'percentage', firstPaymentRule: 'down_payment',
    serviceCharge: 1200, deliveryCharge: 0, createdAt: '2024-01-20T10:00:00Z',
    dealers: [dl('SAM-001','Samsung Exclusive Hyderabad','Banjara Hills, Hyderabad','9876540011',108000), dl('SAM-002','Electronics World Pune','Shivaji Nagar, Pune','9876540012',110000)],
  },
  {
    id: '3', name: 'Sony 65" BRAVIA XR OLED', sku: 'SNY-65XR-OLED', price: 189990, originalPrice: 219990,
    category: 'Electronics', categoryId: '1', brand: 'Sony', rating: 4.9, reviews: 892, stock: 15, status: 'active',
    description: 'Cinema-quality OLED with Cognitive Processor XR. Perfect blacks, 4K 120Hz. Google TV.',
    image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600',
    photos: [ph('https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600',1), ph('https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600',2), ph('https://images.unsplash.com/photo-1461151304267-38535e780c79?w=600',3), ph('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',4)],
    emiAvailable: true, emiPlanMode: 'multiple', tenureOptions: [7, 10, 12],
    downPayment: 40, downPaymentType: 'percentage', firstPaymentRule: 'down_payment',
    serviceCharge: 2000, deliveryCharge: 500, createdAt: '2024-02-01T10:00:00Z',
    dealers: [dl('SNY-001','Sony World Jaipur','Vaishali Nagar, Jaipur','9876540021',162000), dl('SNY-002','AV Vision Mansarovar','Mansarovar, Jaipur','9876540022',160000), dl('SNY-003','City Digital MI Road','MI Road, Jaipur','9876540023',164000), dl('SNY-004','AV World Sanganer','Sanganer, Jaipur','9876540024',168000)],
  },
  {
    id: '4', name: 'MacBook Pro 14" M3 Pro', sku: 'MBP-14-M3P-512', price: 198900, originalPrice: 219900,
    category: 'Electronics', categoryId: '1', brand: 'Apple', rating: 4.9, reviews: 3201, stock: 25, status: 'active',
    description: 'M3 Pro chip with 12-core CPU. Up to 22 hours battery life. 18GB unified memory. 1TB SSD.',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
    photos: [ph('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',1), ph('https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600',2), ph('https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600',3), ph('https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=600',4)],
    emiAvailable: true, emiPlanMode: 'multiple', tenureOptions: [7, 10, 12],
    downPayment: 35, downPaymentType: 'percentage', firstPaymentRule: 'down_payment',
    serviceCharge: 2000, deliveryCharge: 0, createdAt: '2024-02-10T10:00:00Z',
    dealers: [dl('APL-004','Mac Zone Delhi','Nehru Place, New Delhi','9876540031',175000), dl('APL-005','Apple Premium Kolkata','Park Street, Kolkata','9876540032',178000)],
  },
  {
    id: '5', name: 'Nike Air Jordan 1 Retro High', sku: 'NK-AJ1-RH-10', price: 14995, originalPrice: 18995,
    category: 'Fashion', categoryId: '2', brand: 'Nike', rating: 4.6, reviews: 5432, stock: 100, status: 'active',
    description: 'Classic Air Jordan 1 Retro High OG in premium tumbled leather with legendary Air cushioning.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    photos: [ph('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',1), ph('https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600',2), ph('https://images.unsplash.com/photo-1608231387042-66d1773d3028?w=600',3), ph('https://images.unsplash.com/photo-1539185441755-769473a23570?w=600',4)],
    emiAvailable: false, emiPlanMode: 'single', tenureOptions: [],
    downPayment: 0, downPaymentType: 'amount', firstPaymentRule: 'down_payment',
    serviceCharge: 0, deliveryCharge: 99, createdAt: '2024-02-15T10:00:00Z',
    dealers: [dl('NK-001','Nike Exclusive Delhi','Select City Walk, Saket','9876540041',9000), dl('NK-002','Sports World Chennai','T Nagar, Chennai','9876540042',8500)],
  },
  {
    id: '6', name: 'Dyson V15 Detect Vacuum', sku: 'DYS-V15-DET', price: 52900, originalPrice: 59900,
    category: 'Home & Living', categoryId: '3', brand: 'Dyson', rating: 4.7, reviews: 1243, stock: 30, status: 'active',
    description: 'Laser detects microscopic dust invisible to naked eye. Piezo sensor counts and measures particles. Most powerful cordless vacuum.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
    photos: [ph('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',1), ph('https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=600',2), ph('https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=600',3), ph('https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600',4)],
    emiAvailable: true, emiPlanMode: 'multiple', tenureOptions: [6, 10],
    downPayment: 30, downPaymentType: 'percentage', firstPaymentRule: 'down_payment',
    serviceCharge: 500, deliveryCharge: 0, createdAt: '2024-03-01T10:00:00Z',
    dealers: [dl('DYS-001','Dyson Centre Bangalore','MG Road, Bengaluru','9876540051',46000), dl('DYS-002','Home Essentials Ahmedabad','SG Highway, Ahmedabad','9876540052',45000)],
  },
  {
    id: '7', name: 'KitchenAid Artisan Stand Mixer', sku: 'KA-ART-5QT-RED', price: 38999, originalPrice: 44999,
    category: 'Home & Living', categoryId: '3', brand: 'KitchenAid', rating: 4.8, reviews: 2109, stock: 45, status: 'active',
    description: 'Iconic Artisan with 10 speed settings, 5Qt stainless bowl, planetary mixing, 59 compatible attachments.',
    image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600',
    photos: [ph('https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600',1), ph('https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=600',2), ph('https://images.unsplash.com/photo-1556909202-bf79f9e3e0da?w=600',3), ph('https://images.unsplash.com/photo-1608555855762-2b657eb1c348?w=600',4)],
    emiAvailable: true, emiPlanMode: 'single', tenureOptions: [6],
    downPayment: 25, downPaymentType: 'percentage', firstPaymentRule: 'down_payment',
    serviceCharge: 0, deliveryCharge: 200, createdAt: '2024-03-15T10:00:00Z',
    dealers: [dl('KA-001','Kitchen Pro Pune','FC Road, Pune','9876540061',33000), dl('KA-002','Home World Chennai','Anna Nagar, Chennai','9876540062',34000)],
  },
  {
    id: '8', name: 'Samsung 55" Crystal 4K UHD TV', sku: 'SAM-55CU-4K', price: 49990, originalPrice: 64990,
    category: 'Electronics', categoryId: '1', brand: 'Samsung', rating: 4.5, reviews: 3450, stock: 60, status: 'active',
    description: '4K Crystal Processor with HDR, PurColor, 3 HDMI ports, AirSlim design. Smart TV with built-in Alexa.',
    image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600',
    photos: [ph('https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600',1), ph('https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600',2), ph('https://images.unsplash.com/photo-1461151304267-38535e780c79?w=600',3), ph('https://images.unsplash.com/photo-1567690187548-f07b1d7bf51d?w=600',4)],
    emiAvailable: true, emiPlanMode: 'multiple', tenureOptions: [6, 9, 12],
    downPayment: 30, downPaymentType: 'percentage', firstPaymentRule: 'down_payment',
    serviceCharge: 500, deliveryCharge: 300, createdAt: '2024-03-20T10:00:00Z',
    dealers: [dl('SAM-003','Samsung World Delhi','Lajpat Nagar, Delhi','9876540071',41000), dl('SAM-004','Digital Galaxy Jaipur','Raja Park, Jaipur','9876540072',40000), dl('SAM-005','TV World Ahmedabad','Navrangpura, Ahmedabad','9876540073',39500)],
  },
];

export const getProducts = (): Product[] => products.filter(p => p.status === 'active');
export const getAllProducts = (): Product[] => [...products];
export const getProductById = (id: string): Product | undefined => products.find(p => p.id === id);
export const getProductsByCategory = (categoryId: string): Product[] => products.filter(p => p.categoryId === categoryId && p.status === 'active');
export const getFeaturedProducts = (): Product[] => products.filter(p => p.emiAvailable && p.status === 'active').slice(0, 4);
export const getDeals = (): Product[] => products.filter(p => p.originalPrice > p.price && p.status === 'active');
export const getAllBrands = (): string[] => [...new Set(products.map(p => p.brand))].sort();
export const getPriceRange = () => { const pp = products.map(p => p.price); return { min: Math.min(...pp), max: Math.max(...pp) }; };

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'discount';
export interface FilterOptions {
  query?: string; categoryIds?: string[]; brands?: string[];
  minPrice?: number; maxPrice?: number; emiOnly?: boolean; minRating?: number; sort?: SortOption;
}

export const filterAndSortProducts = (opts: FilterOptions): Product[] => {
  let r = products.filter(p => p.status === 'active');
  if (opts.query?.trim()) {
    const q = opts.query.toLowerCase();
    r = r.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  if (opts.categoryIds?.length) r = r.filter(p => opts.categoryIds!.includes(p.categoryId));
  if (opts.brands?.length) r = r.filter(p => opts.brands!.includes(p.brand));
  if (opts.minPrice !== undefined) r = r.filter(p => p.price >= opts.minPrice!);
  if (opts.maxPrice !== undefined) r = r.filter(p => p.price <= opts.maxPrice!);
  if (opts.emiOnly) r = r.filter(p => p.emiAvailable);
  if (opts.minRating !== undefined) r = r.filter(p => p.rating >= opts.minRating!);
  switch (opts.sort) {
    case 'price_asc': r.sort((a, b) => a.price - b.price); break;
    case 'price_desc': r.sort((a, b) => b.price - a.price); break;
    case 'rating': r.sort((a, b) => b.rating - a.rating); break;
    case 'newest': r.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
    case 'discount': r.sort((a, b) => ((b.originalPrice - b.price) / b.originalPrice) - ((a.originalPrice - a.price) / a.originalPrice)); break;
  }
  return r;
};

export const addProduct = (product: Omit<Product, 'id' | 'createdAt'>): Product => {
  const p: Product = { ...product, id: Date.now().toString(), createdAt: new Date().toISOString() };
  products = [p, ...products];
  return p;
};
export const updateProduct = (id: string, updates: Partial<Product>): Product | null => {
  const i = products.findIndex(p => p.id === id);
  if (i === -1) return null;
  products[i] = { ...products[i], ...updates };
  return products[i];
};
export const deleteProduct = (id: string): boolean => {
  const l = products.length;
  products = products.filter(p => p.id !== id);
  return products.length < l;
};
