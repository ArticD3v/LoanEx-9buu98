import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { MOCK_OTP } from '../constants/config';

const MOCK_USERS: User[] = [
  { id: 'user-001', phone: '9876543210', name: 'Rahul Sharma', email: 'rahul@example.com', role: 'customer', createdAt: '2024-01-15T00:00:00Z', address: '42, MG Road, Bengaluru 560001' },
  { id: 'user-002', phone: '8765432109', name: 'Priya Patel', email: 'priya@example.com', role: 'customer', createdAt: '2024-02-01T00:00:00Z', address: '15, Sector 18, Noida 201301' },
  { id: 'user-003', phone: '7654321098', name: 'Amit Kumar', email: 'amit@example.com', role: 'customer', createdAt: '2024-03-01T00:00:00Z', address: '8, Park Street, Mumbai 400001' },
];

export async function sendOTP(phone: string): Promise<{ success: boolean }> {
  await new Promise(r => setTimeout(r, 1000));
  return { success: true };
}

export async function verifyOTP(phone: string, otp: string): Promise<{ user: User | null; error?: string }> {
  await new Promise(r => setTimeout(r, 800));
  if (otp === MOCK_OTP.admin) {
    const user: User = { id: 'admin-001', phone, name: 'Admin', email: 'admin@shopemi.com', role: 'admin', createdAt: new Date().toISOString() };
    await AsyncStorage.setItem('currentUser', JSON.stringify(user));
    return { user };
  }
  if (otp === MOCK_OTP.customer) {
    const existing = MOCK_USERS.find(u => u.phone === phone);
    const user: User = existing || { id: `user-${Date.now()}`, phone, name: `User ${phone.slice(-4)}`, role: 'customer', createdAt: new Date().toISOString() };
    await AsyncStorage.setItem('currentUser', JSON.stringify(user));
    return { user };
  }
  return { user: null, error: 'Invalid OTP. Use 0000 for admin or 1111 for customer.' };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const data = await AsyncStorage.getItem('currentUser');
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem('currentUser');
}

export function getAllUsers(): User[] { return MOCK_USERS; }
