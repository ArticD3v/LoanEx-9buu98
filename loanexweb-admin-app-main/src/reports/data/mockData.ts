export interface ReportCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'sales',
    title: 'Sales',
    icon: 'trending-up-outline',
    description: 'Sales report category',
  },
  {
    id: 'products',
    title: 'Products',
    icon: 'cube-outline',
    description: 'Products report category',
  },
  {
    id: 'orders',
    title: 'Orders',
    icon: 'receipt-outline',
    description: 'Orders report category',
  },
  {
    id: 'customers',
    title: 'Customers',
    icon: 'people-outline',
    description: 'Customers report category',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: 'layers-outline',
    description: 'Inventory report category',
  },
  {
    id: 'emi',
    title: 'EMI',
    icon: 'card-outline',
    description: 'EMI report category',
  },
];
