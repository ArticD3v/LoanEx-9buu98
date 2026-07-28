import { Order } from '../types';

let orders: Order[] = [
  {
    id: 'ORD-001', userId: 'user-001',
    items: [{ productId: '1', productName: 'iPhone 15 Pro Max', image: 'https://images.unsplash.com/photo-1696446702183-a16ae295cbf5?w=400', quantity: 1, price: 134900 }],
    subtotal: 134900, total: 138400, status: 'delivered', paymentMethod: 'emi',
    emiDetails: {
      tenure: 12, firstPaymentRule: 'down_payment', downPaymentAmount: 53960, serviceCharge: 1500, deliveryCharge: 0,
      totalPayable: 136400, balanceForEMI: 81940, regularEMIAmount: 6829, finalEMIAmount: 6821,
      months: 12, monthlyAmount: 6829, totalAmount: 136400, interestRate: 0,
      emiStatus: 'approved', paidInstallments: 4, futureEMICount: 12,
      nextDueDate: '2024-07-15',
      schedule: Array.from({ length: 12 }, (_, i) => ({ installmentNumber: i + 1, amount: i === 11 ? 6821 : 6829, dueDate: new Date(2024, 2 + i, 15).toISOString(), status: (i < 4 ? 'paid' : 'upcoming') as 'paid' | 'upcoming' | 'overdue' })),
    },
    dealerSnapshot: { dealerCode: 'APL-001', dealerName: 'Apple Premium Delhi', dealerAddress: 'Connaught Place, New Delhi', dealerMobile: '9876540001', purchasePrice: 120000, grossMargin: 14900 },
    address: '42, MG Road, Bengaluru 560001', phone: '9876543210', createdAt: '2024-02-15T10:30:00Z',
  },
  {
    id: 'ORD-002', userId: 'user-002',
    items: [{ productId: '3', productName: 'Sony 65" BRAVIA XR OLED', image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400', quantity: 1, price: 189990 }],
    subtotal: 189990, total: 192490, status: 'confirmed', paymentMethod: 'emi',
    emiDetails: {
      tenure: 12, firstPaymentRule: 'down_payment', downPaymentAmount: 75996, serviceCharge: 2000, deliveryCharge: 500,
      totalPayable: 192490, balanceForEMI: 116494, regularEMIAmount: 9709, finalEMIAmount: 9701,
      months: 12, monthlyAmount: 9709, totalAmount: 192490, interestRate: 0,
      emiStatus: 'pending_approval', paidInstallments: 0, futureEMICount: 12,
      nextDueDate: '2024-07-05',
      schedule: Array.from({ length: 12 }, (_, i) => ({ installmentNumber: i + 1, amount: i === 11 ? 9701 : 9709, dueDate: new Date(2024, 4 + i, 5).toISOString(), status: 'upcoming' as const })),
    },
    address: '15, Sector 18, Noida 201301', phone: '8765432109', createdAt: '2024-04-01T14:00:00Z',
  },
  { id: 'ORD-003', userId: 'user-001', items: [{ productId: '5', productName: 'Nike Air Jordan 1 Retro', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', quantity: 2, price: 14995 }], subtotal: 29990, total: 30188, status: 'shipped', paymentMethod: 'cod', address: '42, MG Road, Bengaluru 560001', phone: '9876543210', createdAt: '2024-03-20T09:00:00Z' },
  {
    id: 'ORD-004', userId: 'user-003',
    items: [{ productId: '6', productName: 'Dyson V15 Detect Vacuum', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', quantity: 1, price: 52900 }],
    subtotal: 52900, total: 53400, status: 'pending', paymentMethod: 'emi',
    emiDetails: {
      tenure: 6, firstPaymentRule: 'down_payment', downPaymentAmount: 15870, serviceCharge: 500, deliveryCharge: 0,
      totalPayable: 53400, balanceForEMI: 37530, regularEMIAmount: 6255, finalEMIAmount: 6255,
      months: 6, monthlyAmount: 6255, totalAmount: 53400, interestRate: 0,
      emiStatus: 'pending_approval', paidInstallments: 0, futureEMICount: 6,
      nextDueDate: '2024-07-20',
      schedule: Array.from({ length: 6 }, (_, i) => ({ installmentNumber: i + 1, amount: 6255, dueDate: new Date(2024, 6 + i, 20).toISOString(), status: 'upcoming' as const })),
    },
    dealerSnapshot: { dealerCode: 'DYS-001', dealerName: 'Dyson Centre Bangalore', dealerAddress: 'MG Road, Bengaluru', dealerMobile: '9876540051', purchasePrice: 46000, grossMargin: 6900 },
    address: '8, Park Street, Mumbai 400001', phone: '7654321098', createdAt: '2024-04-10T11:00:00Z',
  },
];

export const getAllOrders = () => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const getOrdersByUser = (userId: string) => orders.filter(o => o.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const getEMIOrders = () => orders.filter(o => o.paymentMethod === 'emi');

export const addOrder = (order: Omit<Order, 'id' | 'createdAt'>): Order => {
  const n: Order = { ...order, id: `ORD-${String(orders.length + 1).padStart(3, '0')}`, createdAt: new Date().toISOString() };
  orders = [n, ...orders];
  return n;
};
export const updateOrderStatus = (id: string, status: Order['status']): boolean => {
  const i = orders.findIndex(o => o.id === id);
  if (i === -1) return false;
  orders[i] = { ...orders[i], status };
  return true;
};
export const updateEMIStatus = (orderId: string, emiStatus: 'approved' | 'rejected'): boolean => {
  const i = orders.findIndex(o => o.id === orderId);
  if (i === -1 || !orders[i].emiDetails) return false;
  orders[i] = { ...orders[i], emiDetails: { ...orders[i].emiDetails!, emiStatus } };
  return true;
};
export const markInstallmentPaid = (orderId: string): boolean => {
  const i = orders.findIndex(o => o.id === orderId);
  if (i === -1 || !orders[i].emiDetails) return false;
  const emi = orders[i].emiDetails!;
  if (emi.paidInstallments >= emi.months) return false;
  const newPaid = emi.paidInstallments + 1;
  orders[i] = { ...orders[i], emiDetails: { ...emi, paidInstallments: newPaid, emiStatus: newPaid >= emi.months ? 'completed' : emi.emiStatus, nextDueDate: newPaid >= emi.months ? '' : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } };
  return true;
};
export const getStats = () => {
  const all = getAllOrders();
  const emi = getEMIOrders();
  return { totalOrders: all.length, revenue: all.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0), pendingEMIs: emi.filter(o => o.emiDetails?.emiStatus === 'pending_approval').length, activeEMIs: emi.filter(o => o.emiDetails?.emiStatus === 'approved').length, totalUsers: 3 };
};
