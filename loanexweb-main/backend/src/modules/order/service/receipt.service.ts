import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { EmiApplicationStatus, OrderStatus, PaymentStatus, type OrderTracking } from '@prisma/client';
import type { OrderWithRelations } from '../repository/order.repository';
import { STATUS_FLOW } from '../repository/order.repository';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function productImagePath(productId: string): string {
  const map: Record<string, string> = {
    'smartphone-iphone-15': 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=800&q=80',
    'laptop-hp-pavilion-15': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
    'smart-tv-samsung-55': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
    'refrigerator-lg-260': 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&q=80',
    'washing-machine-bosch-7kg': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80',
    'ac-voltas-1-5ton': 'https://images.unsplash.com/photo-1631545806606-867b4070886a?w=800&q=80',
    'tablet-samsung-s9': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
    'smartwatch-apple-series-9': 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80',
  };
  return map[productId] ?? 'assets/images/products/laptop.png';
}

export function productBrand(productId: string, fallback?: string | null): string {
  if (fallback) return fallback;
  const map: Record<string, string> = {
    'smartphone-iphone-15': 'Apple',
    'laptop-hp-pavilion-15': 'HP',
    'smart-tv-samsung-55': 'Samsung',
    'refrigerator-lg-260': 'LG',
    'washing-machine-bosch-7kg': 'Bosch',
    'ac-voltas-1-5ton': 'Voltas',
    'tablet-samsung-s9': 'Samsung',
    'smartwatch-apple-series-9': 'Apple',
  };
  return map[productId] ?? 'LoanEx';
}

function statusRank(status: string): number {
  return STATUS_FLOW.findIndex((value) => value === status);
}

const PAYABLE_DOWN_PAYMENT_STATUSES: EmiApplicationStatus[] = [
  EmiApplicationStatus.APPROVED,
  EmiApplicationStatus.OFFER_ACCEPTED,
  EmiApplicationStatus.DOWN_PAYMENT_PENDING,
];

const POST_DOWN_PAYMENT_STATUSES: EmiApplicationStatus[] = [
  EmiApplicationStatus.DOWN_PAYMENT_COMPLETED,
  EmiApplicationStatus.ORDER_CONFIRMED,
  EmiApplicationStatus.ACTIVE_EMI,
];

function isDownPaymentPaid(app: EmiApplicationStatus, payment: OrderWithRelations['paymentTransaction']) {
  return (
    Boolean(payment && payment.paymentStatus === PaymentStatus.SUCCESS) ||
    POST_DOWN_PAYMENT_STATUSES.includes(app)
  );
}

export function buildOrderPayload(order: OrderWithRelations) {
  const app = order.application;
  const payment = order.paymentTransaction;
  const productPrice = toNumber(app.sellingPrice);
  const loanAmount = toNumber(app.loanAmount) || toNumber(app.loanAmount);
  const downPayment =
    toNumber(app.downPayment) || toNumber(app.downPayment);
  const downPaymentPaid = isDownPaymentPaid(app.status, payment);
  const amountPaid = payment && payment.paymentStatus === PaymentStatus.SUCCESS
    ? toNumber(payment.amount)
    : 0;
  const remainingLoanAmount = Math.max(loanAmount, Math.max(0, productPrice - downPayment));
  const currentRank = statusRank(order.orderStatus);
  const canPayDownPayment = PAYABLE_DOWN_PAYMENT_STATUSES.includes(app.status) && !downPaymentPaid;

  const tenure = app12 ?? app12;
  const monthlyEmi = toNumber(app.monthlyEmi) || toNumber(app.monthlyEmi);
  const interestRate = toNumber(app.monthlyEmi);
  const processingFee = toNumber(app.monthlyEmi);

  const offerAcceptedStatuses: EmiApplicationStatus[] = [
    EmiApplicationStatus.OFFER_ACCEPTED,
    EmiApplicationStatus.DOWN_PAYMENT_PENDING,
    EmiApplicationStatus.DOWN_PAYMENT_COMPLETED,
    EmiApplicationStatus.ORDER_CONFIRMED,
    EmiApplicationStatus.ACTIVE_EMI,
  ];

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    applicationId: app.id,
    applicationNumber: app.id,
    paymentId: payment?.razorpayPaymentId ?? null,
    paymentTransactionId: order.paymentTransactionId,
    transactionDate: payment?.updatedAt ?? order.createdAt,
    paymentType: 'EMI' as const,
    paymentMethod: 'Razorpay',
    productId: order.productId,
    productName: app.productName,
    // productBrand: productBrand(order.productId, order.productBrand),
    productImage: productImagePath(order.productId),
    quantity: order.quantity,
    productPrice,
    amountPaid,
    downPaymentPaid,
    canPayDownPayment,
    remainingLoanAmount,
    approvedLoanAmount: loanAmount,
    approvedDownPayment: downPayment,
    shippingAddress: order.deliveryAddress,
    billingAddress: order.deliveryAddress,
    customer: order.user
      ? {
          fullName: order.user.fullName,
          email: order.user.email,
          mobile: order.user.mobile,
        }
      : null,
    emi: {
      loanAmount,
      downPayment,
      tenure,
      monthlyEmi,
      interestRate,
      processingFee,
    },
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    createdAt: order.createdAt,
    courierPartner: order.courierPartner,
    trackingNumber: order.trackingNumber,
    warehouse: order.warehouse,
    deliveryAddress: order.deliveryAddress,
    canOpenEmiDashboard: order.orderStatus === OrderStatus.DELIVERED,
    loanStatus: app.status,
    timeline: {
      applicationApproved: true,
      offerAccepted:
        offerAcceptedStatuses.includes(app.status) || Boolean(app.createdAt),
      downPaymentCompleted: downPaymentPaid,
      orderConfirmed: currentRank >= statusRank(OrderStatus.ORDER_CONFIRMED),
      processing: currentRank >= statusRank(OrderStatus.PROCESSING),
      packed: currentRank >= statusRank(OrderStatus.PACKED),
      shipped: currentRank >= statusRank(OrderStatus.SHIPPED),
      outForDelivery: currentRank >= statusRank(OrderStatus.OUT_FOR_DELIVERY),
      delivered: order.orderStatus === OrderStatus.DELIVERED,
    },
    receiptAvailable: downPaymentPaid,
    invoiceAvailable: downPaymentPaid,
  };
}

const TRACKING_STEP_LABELS: Record<string, string> = {
  ORDER_CONFIRMED: 'Order Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out For Delivery',
  DELIVERED: 'Delivered',
};

export function buildTrackingPayload(order: OrderWithRelations) {
  const events = order.trackingEvents ?? [];
  const eventByStatus = new Map<string, OrderTracking>();
  for (const event of events) {
    eventByStatus.set(event.status, event);
  }

  const steps = STATUS_FLOW.map((status) => {
    const event = eventByStatus.get(status);
    const currentRank = statusRank(order.orderStatus);
    const stepRank = statusRank(status);
    const reached = currentRank >= 0 && stepRank <= currentRank;
    return {
      status,
      label: TRACKING_STEP_LABELS[status] ?? status.replaceAll('_', ' '),
      completed: reached,
      active: order.orderStatus === status,
      timestamp:
        event?.createdAt ??
        (status === OrderStatus.ORDER_CONFIRMED && reached ? order.createdAt : null),
      remarks: event?.remarks ?? null,
      location: event?.location ?? null,
      updatedBy: event?.updatedBy ?? null,
    };
  });

  return {
    ...buildOrderPayload(order),
    steps,
    trackingEvents: events.map((event) => ({
      id: event.id,
      status: event.status,
      remarks: event.remarks,
      updatedBy: event.updatedBy,
      location: event.location,
      createdAt: event.createdAt,
    })),
  };
}

export async function generateOrderReceiptPdf(
  order: OrderWithRelations,
): Promise<{ absolutePath: string; relativePath: string }> {
  return generatePdf(order, 'receipts', 'Payment Receipt', false);
}

export async function generateOrderInvoicePdf(
  order: OrderWithRelations,
): Promise<{ absolutePath: string; relativePath: string }> {
  return generatePdf(order, 'invoices', 'Tax Invoice', true);
}

async function generatePdf(
  order: OrderWithRelations,
  folder: 'receipts' | 'invoices',
  title: string,
  includeShipping: boolean,
): Promise<{ absolutePath: string; relativePath: string }> {
  const dir = path.resolve(process.cwd(), 'storage', folder);
  fs.mkdirSync(dir, { recursive: true });

  const fileName = `${order.orderNumber}-${folder.slice(0, -1)}.pdf`;
  const absolutePath = path.join(dir, fileName);
  const relativePath = path.join('storage', folder, fileName);
  const payload = buildOrderPayload(order);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(absolutePath);
    doc.pipe(stream);

    doc.fontSize(20).fillColor('#0A2E6F').text(`LoanEx ${title}`);
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#111827');
    doc.text(`Order Number: ${payload.orderNumber}`);
    doc.text(`Application Number: ${payload.id}`);
    doc.text(`Payment ID: ${payload.paymentId ?? '—'}`);
    doc.text(`Product: ${payload.productName ?? payload.productId}`);
    doc.text(`Brand: ${payload.productBrand}`);
    doc.text(`Quantity: ${payload.quantity}`);
    doc.text(`Amount Paid: INR ${payload.amountPaid.toFixed(2)}`);
    doc.text(`Remaining Loan: INR ${payload.remainingLoanAmount.toFixed(2)}`);
    doc.text(`Status: ${payload.orderStatus}`);

    if (includeShipping) {
      doc.moveDown();
      doc.text(`Courier: ${payload.courierPartner ?? '—'}`);
      doc.text(`Tracking Number: ${payload.trackingNumber ?? '—'}`);
      doc.text(`Warehouse: ${payload.warehouse ?? '—'}`);
      doc.text(`Delivery Address: ${payload.deliveryAddress ?? '—'}`);
    }

    doc.moveDown();
    doc.fontSize(10).fillColor('#6B7280').text('System-generated document from LoanEx.');
    doc.end();

    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return { absolutePath, relativePath };
}
