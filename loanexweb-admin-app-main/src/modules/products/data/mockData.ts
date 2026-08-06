import { Product } from '../types/product';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    sku: 'SAM-S24U-256-BLK',
    category: 'Smartphones',
    brand: 'Samsung',
    sellingPrice: 124999,
    mrp: 134999,
    stock: 45,
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200',
  },
  {
    id: '2',
    name: 'Apple MacBook Pro 14" M3 Pro',
    sku: 'APL-MBP14-M3P-512',
    category: 'Laptops',
    brand: 'Apple',
    sellingPrice: 199900,
    mrp: 219900,
    stock: 12,
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200',
  },
  {
    id: '3',
    name: 'Sony WH-1000XM5 Wireless Headphones',
    sku: 'SNY-WH1000XM5-BLK',
    category: 'Audio',
    brand: 'Sony',
    sellingPrice: 26990,
    mrp: 29990,
    stock: 0,
    status: 'out_of_stock',
    imageUrl: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=200',
  },
  {
    id: '4',
    name: 'LG 55" OLED C3 Smart TV',
    sku: 'LG-OLED55-C3',
    category: 'Televisions',
    brand: 'LG',
    sellingPrice: 89990,
    mrp: 119990,
    stock: 8,
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1593359673509-a6f531764b1?w=200',
  },
  {
    id: '5',
    name: 'Dell XPS 15 9530 Laptop',
    sku: 'DELL-XPS15-9530',
    category: 'Laptops',
    brand: 'Dell',
    sellingPrice: 154999,
    mrp: 169999,
    stock: 6,
    status: 'draft',
    imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=200',
  },
  {
    id: '6',
    name: 'OnePlus 12 256GB Flowy Emerald',
    sku: 'OP-12-256-EMR',
    category: 'Smartphones',
    brand: 'OnePlus',
    sellingPrice: 64999,
    mrp: 69999,
    stock: 32,
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=200',
  },
];

export const PRODUCT_TYPES = ['Physical', 'Digital', 'Service', 'Bundle'];
export const PRODUCT_CONDITIONS = ['New', 'Refurbished', 'Used', 'Open Box'];
export const BRANDS = ['Samsung', 'Apple', 'Sony', 'LG', 'Dell', 'OnePlus', 'HP', 'Lenovo', 'Asus', 'Xiaomi'];
export const COUNTRIES = ['India', 'China', 'USA', 'Japan', 'South Korea', 'Germany', 'Taiwan', 'Vietnam'];
export const WARRANTIES = ['No Warranty', '6 Months', '1 Year', '2 Years', '3 Years', '5 Years'];

export const CATEGORIES: Record<string, Record<string, string[]>> = {
  Electronics: {
    Smartphones: ['Android', 'iPhone', 'Feature Phones'],
    Laptops: ['Gaming', 'Business', 'Ultrabook', '2-in-1'],
    Televisions: ['OLED', 'QLED', 'LED', 'Smart TV'],
    Audio: ['Headphones', 'Earbuds', 'Speakers', 'Soundbars'],
  },
  'Home & Kitchen': {
    Appliances: ['Refrigerators', 'Washing Machines', 'Air Conditioners'],
    Furniture: ['Sofas', 'Beds', 'Tables', 'Chairs'],
    'Kitchen Tools': ['Cookware', 'Cutlery', 'Small Appliances'],
  },
  Fashion: {
    Men: ['Shirts', 'Trousers', 'Shoes', 'Accessories'],
    Women: ['Dresses', 'Tops', 'Footwear', 'Handbags'],
    Kids: ['Clothing', 'Footwear', 'Toys'],
  },
};

export const VARIANT_ATTRIBUTES = ['Color', 'Storage', 'RAM', 'Size', 'Material'];
export const WAREHOUSES = ['Mumbai Central', 'Delhi NCR', 'Bangalore Hub', 'Chennai Warehouse', 'Kolkata Depot'];
export const SUPPLIERS = ['Tech Distributors India', 'Global Electronics Pvt Ltd', 'Metro Wholesale', 'Prime Suppliers Co'];
export const DEALERS = ['City Electronics', 'Digital World', 'Smart Gadgets Store', 'Tech Mart'];
export const WHOLESALERS = ['Bulk Trade Corp', 'Nationwide Wholesale', 'Regional Distributors'];
export const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'COD', 'Advance Payment'];
export const SETTLEMENT_CYCLES = ['Weekly', 'Bi-Weekly', 'Monthly', 'Quarterly'];
export const CUSTOMER_VISIBILITY = ['Visible', 'Hidden'];

export const PRODUCT_SOURCES = [
  'Dealer Direct Dispatch',
  'Company Warehouse',
  'Supplier Dropship',
  'Marketplace Fulfillment',
];
export const STOCK_OWNERSHIP_TYPES = ['Dealer', 'Company', 'Shared'];
export const DELIVERY_PARTNERS = ['Delhivery', 'Blue Dart', 'DTDC', 'Ecom Express', 'Shadowfax', 'In-House Fleet'];
export const DELIVERY_ZONES = ['Metro', 'Tier 1', 'Tier 2', 'Tier 3', 'Remote / Special'];
export const DELIVERY_CHARGE_METHODS = ['Free', 'Flat', 'Calculated'];
export const SERVICE_CHARGE_METHODS = ['Flat', 'Percentage'];
