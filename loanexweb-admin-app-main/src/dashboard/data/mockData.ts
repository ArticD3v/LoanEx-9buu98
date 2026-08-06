export interface SummaryCardData {
  id: string;
  title: string;
  value: string;
  icon: string;
}

export interface QuickActionData {
  id: string;
  title: string;
  icon: string;
}

export interface ActivityData {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: string;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
}

export interface SuperAdminProfile {
  name: string;
  email: string;
  mobile: string;
  role: string;
  branch: string;
  lastLogin: string;
  initials: string;
}

export const summaryCards: SummaryCardData[] = [
  { id: '1', title: "Today's Sales", value: '₹12,45,800', icon: 'trending-up' },
  { id: '2', title: "Today's Collection", value: '₹8,32,500', icon: 'wallet' },
  { id: '3', title: 'Active Orders', value: '248', icon: 'cart' },
  { id: '4', title: 'Pending Orders', value: '36', icon: 'time' },
  { id: '5', title: 'Pending Delivery / Dispatch', value: '19', icon: 'airplane' },
  { id: '6', title: 'EMI Active Customers', value: '1,842', icon: 'people' },
  { id: '7', title: 'Overdue EMI', value: '27', icon: 'alert-circle' },
  { id: '8', title: 'Dealer Payments Pending', value: '₹4,15,000', icon: 'cash' },
  { id: '9', title: 'Inventory Alerts', value: '14', icon: 'cube' },
  { id: '10', title: 'Team Attendance', value: '92%', icon: 'checkmark-circle' },
  { id: '11', title: 'Branch-wise Performance', value: '18 Branches', icon: 'business' },
  { id: '12', title: 'Pincode-wise Performance', value: '142 Pincodes', icon: 'location' },
];

export const quickActions: QuickActionData[] = [
  { id: '1', title: 'Products', icon: 'cube-outline' },
  { id: '2', title: 'Orders', icon: 'receipt-outline' },
  { id: '3', title: 'Customers', icon: 'people-outline' },
  { id: '4', title: 'Inventory', icon: 'layers-outline' },
  { id: '5', title: 'EMI', icon: 'card-outline' },
  { id: '6', title: 'Reports', icon: 'document-text-outline' },
  { id: '7', title: 'Users', icon: 'person-outline' },
  { id: '8', title: 'Settings', icon: 'settings-outline' },
];

export const recentActivities: ActivityData[] = [
  {
    id: '1',
    title: 'New Product Added',
    description: 'Samsung Galaxy S24 Ultra added to inventory',
    time: '10 min ago',
    icon: 'add-circle-outline',
  },
  {
    id: '2',
    title: 'New Order Received',
    description: 'Order #ORD-2847 placed by Rahul Sharma',
    time: '25 min ago',
    icon: 'bag-check-outline',
  },
  {
    id: '3',
    title: 'Customer Registered',
    description: 'Priya Mehta registered as new customer',
    time: '1 hr ago',
    icon: 'person-add-outline',
  },
  {
    id: '4',
    title: 'EMI Payment Received',
    description: '₹4,500 received from Amit Kumar',
    time: '2 hrs ago',
    icon: 'cash-outline',
  },
  {
    id: '5',
    title: 'Inventory Updated',
    description: 'Stock updated for iPhone 15 Pro Max',
    time: '3 hrs ago',
    icon: 'sync-outline',
  },
];

export const notifications: NotificationData[] = [
  {
    id: '1',
    title: 'New Product Added',
    message: 'Samsung Galaxy S24 Ultra 256GB has been added to the catalog',
    time: '5 min ago',
    read: false,
    icon: 'cube-outline',
  },
  {
    id: '2',
    title: 'New Order Received',
    message: 'Order #ORD-10001 placed by Rajesh Kumar requires review',
    time: '15 min ago',
    read: false,
    icon: 'bag-check-outline',
  },
  {
    id: '3',
    title: 'Customer Registered',
    message: 'Priya Sharma registered as a new customer',
    time: '45 min ago',
    read: false,
    icon: 'person-add-outline',
  },
  {
    id: '4',
    title: 'EMI Payment Received',
    message: '₹11,250 EMI payment received from Rajesh Kumar',
    time: '1 hr ago',
    read: true,
    icon: 'cash-outline',
  },
  {
    id: '5',
    title: 'Inventory Alert',
    message: 'Sony WH-1000XM5 stock is below threshold (0 units left)',
    time: '2 hrs ago',
    read: true,
    icon: 'alert-circle-outline',
  },
];

export const SUPER_ADMIN_PROFILE: SuperAdminProfile = {
  name: 'Super Admin',
  email: 'admin@loanex.com',
  mobile: '+91 98765 00001',
  role: 'Super Admin',
  branch: 'Head Office — Mumbai',
  lastLogin: '03 Aug 2026, 02:45 PM',
  initials: 'SA',
};
