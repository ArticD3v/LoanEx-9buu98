export const APP_CONFIG = { name: 'ShopEMI', currency: '₹' };

export const EMI_RATES = [
  { months: 3, annualRate: 12 },
  { months: 6, annualRate: 14 },
  { months: 9, annualRate: 16 },
  { months: 12, annualRate: 18 },
];

export const CATEGORIES = [
  { id: '1', name: 'Electronics', icon: 'devices' as const, color: '#3B82F6', bg: '#EFF6FF' },
  { id: '2', name: 'Fashion', icon: 'checkroom' as const, color: '#EC4899', bg: '#FDF2F8' },
  { id: '3', name: 'Home & Living', icon: 'home' as const, color: '#10B981', bg: '#ECFDF5' },
  { id: '4', name: 'Sports', icon: 'sports-soccer' as const, color: '#F59E0B', bg: '#FFFBEB' },
  { id: '5', name: 'Books', icon: 'menu-book' as const, color: '#8B5CF6', bg: '#F5F3FF' },
  { id: '6', name: 'Beauty', icon: 'face' as const, color: '#EF4444', bg: '#FEF2F2' },
];

export const MOCK_OTP = { admin: '0000', customer: '1111' };

export function calculateEMI(principal: number, annualRate: number, months: number) {
  const r = annualRate / 12 / 100;
  if (r === 0) return { monthlyAmount: Math.ceil(principal / months), totalAmount: principal, processingFee: 0, interest: 0 };
  const emi = Math.ceil((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
  return { monthlyAmount: emi, totalAmount: emi * months, processingFee: Math.ceil(principal * 0.01), interest: emi * months - principal };
}
