import React, { createContext, useState, ReactNode } from 'react';
import { Order } from '../types';
import * as orderService from '../services/orderService';

interface OrderContextType {
  orders: Order[];
  userOrders: (userId: string) => Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Order;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  updateEMIStatus: (orderId: string, status: 'approved' | 'rejected') => void;
  markInstallmentPaid: (orderId: string) => void;
  refresh: () => void;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(orderService.getAllOrders());

  const refresh = () => setOrders(orderService.getAllOrders());
  const userOrders = (userId: string) => orderService.getOrdersByUser(userId);
  const addOrder = (order: Omit<Order, 'id' | 'createdAt'>) => {
    const n = orderService.addOrder(order);
    refresh();
    return n;
  };
  const updateOrderStatus = (id: string, status: Order['status']) => { orderService.updateOrderStatus(id, status); refresh(); };
  const updateEMIStatus = (orderId: string, status: 'approved' | 'rejected') => { orderService.updateEMIStatus(orderId, status); refresh(); };
  const markInstallmentPaid = (orderId: string) => { orderService.markInstallmentPaid(orderId); refresh(); };

  return (
    <OrderContext.Provider value={{ orders, userOrders, addOrder, updateOrderStatus, updateEMIStatus, markInstallmentPaid, refresh }}>
      {children}
    </OrderContext.Provider>
  );
}
