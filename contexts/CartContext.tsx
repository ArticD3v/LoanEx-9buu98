import React, { createContext, useState, ReactNode } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  addItem: (product: Product, quantity?: number, selectedTenure?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, quantity: number = 1, selectedTenure?: number) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity, selectedTenure: selectedTenure ?? i.selectedTenure }
            : i
        );
      }
      return [...prev, { product, quantity, selectedTenure }];
    });
  };

  const removeItem = (productId: string) =>
    setCartItems(prev => prev.filter(i => i.product.id !== productId));

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    setCartItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => setCartItems([]);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}
