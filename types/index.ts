export interface ProductPhoto { id: string; url: string; order: number; isCover: boolean; }

export interface DealerSource {
  id: string; dealerCode: string; dealerName: string;
  dealerAddress: string; dealerMobile: string; purchasePrice: number;
}

export type EMIPlanMode = 'single' | 'multiple';
export type DownPaymentType = 'amount' | 'percentage';
export type FirstPaymentRule = 'down_payment' | 'emi_1';

export interface EMICalcResult {
  tenure: number; totalPayable: number; downPaymentAmount: number;
  balanceForEMI: number; futureEMICount: number;
  regularEMIAmount: number; finalEMIAmount: number;
  firstDueDate: Date; isRounded: boolean;
}

export interface Product {
  id: string; name: string; sku: string; price: number; originalPrice: number;
  category: string; categoryId: string; image: string; photos: ProductPhoto[];
  rating: number; reviews: number; description: string; brand: string;
  stock: number; status: 'active' | 'inactive'; emiAvailable: boolean;
  emiPlanMode: EMIPlanMode; tenureOptions: number[];
  downPayment: number; downPaymentType: DownPaymentType;
  firstPaymentRule: FirstPaymentRule; serviceCharge: number; deliveryCharge: number;
  dealers: DealerSource[]; createdAt: string;
}

export interface CartItem { product: Product; quantity: number; selectedTenure?: number; }

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type EMIStatus = 'pending_approval' | 'approved' | 'rejected' | 'completed';

export interface OrderItem { productId: string; productName: string; image: string; quantity: number; price: number; }

export interface OrderDealerSnapshot {
  dealerCode: string; dealerName: string; dealerAddress: string;
  dealerMobile: string; purchasePrice: number; grossMargin: number;
}

export interface EMIInstallment {
  installmentNumber: number; amount: number; dueDate: string;
  status: 'upcoming' | 'paid' | 'overdue';
}

export interface Order {
  id: string; userId: string; items: OrderItem[];
  subtotal: number; total: number; status: OrderStatus; paymentMethod: 'cod' | 'emi';
  emiDetails?: {
    tenure: number; firstPaymentRule: FirstPaymentRule;
    downPaymentAmount: number; serviceCharge: number; deliveryCharge: number;
    totalPayable: number; balanceForEMI: number;
    regularEMIAmount: number; finalEMIAmount: number;
    months: number; monthlyAmount: number; totalAmount: number; interestRate: number;
    emiStatus: EMIStatus; paidInstallments: number; nextDueDate: string;
    schedule: EMIInstallment[];
  };
  dealerSnapshot?: OrderDealerSnapshot;
  address: string; phone: string; createdAt: string;
}

export interface User {
  id: string; phone: string; name: string; email?: string;
  role: 'admin' | 'customer'; createdAt: string; address?: string;
}
