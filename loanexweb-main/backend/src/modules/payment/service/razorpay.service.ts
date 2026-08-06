import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../../../config/env';

let client: Razorpay | null = null;

function getClient(): Razorpay {
  if (!client) {
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
}

export function isPaymentDevBypass(): boolean {
  return Boolean(env.PAYMENT_DEV_BYPASS) && env.NODE_ENV !== 'production';
}

export async function createRazorpayOrder(input: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const amountPaise = Math.round(input.amountInr * 100);

  if (isPaymentDevBypass()) {
    return {
      id: `order_dev_${crypto.randomBytes(8).toString('hex')}`,
      amount: amountPaise,
      currency: env.RAZORPAY_CURRENCY,
    };
  }

  const order = await getClient().orders.create({
    amount: amountPaise,
    currency: env.RAZORPAY_CURRENCY,
    receipt: input.receipt.slice(0, 40),
    notes: input.notes,
  });

  return {
    id: String(order.id),
    amount: Number(order.amount),
    currency: String(order.currency),
  };
}

export function verifyRazorpaySignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (isPaymentDevBypass()) {
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');
    return expected === input.signature || input.signature === 'dev_bypass_signature';
  }

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');

  return expected === input.signature;
}

export function getRazorpayKeyId(): string {
  return env.RAZORPAY_KEY_ID;
}

export function signDevPayment(orderId: string, paymentId: string): string {
  return crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}
