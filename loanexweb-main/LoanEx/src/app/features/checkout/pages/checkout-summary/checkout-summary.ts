import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import { EmiPlanSelectionService } from '../../../emi/services/emi-plan-selection.service';
import { CheckoutIntentService } from '../../services/checkout-intent.service';
import {
  CheckoutApiService,
  CheckoutSummary,
  PurchaseType,
} from '../../services/checkout-api.service';

@Component({
  selector: 'app-checkout-summary',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './checkout-summary.html',
  styleUrl: './checkout-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutSummaryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly checkoutApi = inject(CheckoutApiService);
  private readonly checkoutIntent = inject(CheckoutIntentService);
  private readonly emiPlan = inject(EmiPlanSelectionService);

  readonly formatInr = formatInr;
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly summary = signal<CheckoutSummary | null>(null);
  readonly productId = signal<string | null>(null);
  readonly variantId = signal<string | null>(null);
  readonly quantity = signal(1);
  readonly isMultipleProducts = signal(false);

  readonly form = this.fb.nonNullable.group({
    purchaseType: ['EMI' as PurchaseType, Validators.required],
    addressId: ['', Validators.required],
  });

  ngOnInit(): void {
    const queryProductId = this.route.snapshot.queryParamMap.get('productId');
    const queryVariantId = this.route.snapshot.queryParamMap.get('variantId');
    const queryQty = this.route.snapshot.queryParamMap.get('quantity');
    const fromCart = this.route.snapshot.queryParamMap.get('fromCart');
    const intent = this.checkoutIntent.get();
    const plan = this.emiPlan.get();
    const productId = queryProductId || intent?.productId || plan?.productId || null;
    const variantId =
      queryVariantId || intent?.variantId || plan?.variantId || null;
    const quantity = Number(queryQty) || intent?.quantity || 1;

    if (quantity > 1 || (fromCart === '1' && intent?.mode === 'BUY_NOW')) {
      this.isMultipleProducts.set(true);
      this.form.controls.purchaseType.setValue('DIRECT');
    }

    if (!productId) {
      this.loading.set(false);
      this.error.set('No product selected for checkout.');
      return;
    }

    this.productId.set(productId);
    this.variantId.set(variantId);
    this.quantity.set(quantity);
    this.load(productId, quantity, variantId ?? undefined);
  }

  continueCheckout(): void {
    this.form.markAllAsTouched();
    const productId = this.productId();
    const data = this.summary();
    if (!productId || !data || this.form.invalid) {
      this.error.set('Please select a delivery address and purchase option.');
      return;
    }

    if (!data.prerequisites.readyForCheckout) {
      void this.router.navigateByUrl('/checkout/personal-details');
      return;
    }

    if (!data.product.inStock) {
      this.error.set('Product is out of stock.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.checkoutApi
      .create({
        productId,
        variantId: this.variantId() ?? undefined,
        quantity: this.quantity(),
        purchaseType: this.form.controls.purchaseType.value,
        addressId: this.form.controls.addressId.value,
      })
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          if (result.nextStep === 'EMI_VERIFICATION') {
            this.emiPlan.save({
              productId: result.summary.product.id,
              variantId: result.summary.product.variantId ?? this.variantId() ?? undefined,
              productName: result.summary.product.name,
              sellingPrice: result.summary.pricing.unitPrice,
              requestedAmount: result.summary.pricing.totalAmount,
              requestedDownPayment: Math.round(result.summary.pricing.unitPrice * 0.2),
              requestedTenure: 6,
              estimatedMonthlyEmi: Math.round(result.summary.pricing.totalAmount / 6),
            });
          }
          void this.router.navigateByUrl(
            result.nextStep === 'DIRECT_PAYMENT'
              ? `${result.redirectPath}?sessionId=${result.session.id}`
              : result.redirectPath,
          );
        },
        error: () => {
          this.submitting.set(false);
          this.error.set(this.checkoutApi.error() ?? 'Unable to continue checkout.');
        },
      });
  }

  goBack(): void {
    const productId = this.productId();
    if (productId) {
      void this.router.navigateByUrl(`/products/${productId}`);
      return;
    }
    void this.router.navigateByUrl('/');
  }

  formatAddress(address: {
    addressLine1: string;
    addressLine2: string;
    landmark: string | null;
    city: string;
    state: string;
    pincode: string;
  }): string {
    const landmark = address.landmark ? `, ${address.landmark}` : '';
    return `${address.addressLine1}, ${address.addressLine2}${landmark}, ${address.city}, ${address.state} ${address.pincode}`;
  }

  private load(productId: string, quantity: number, variantId?: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.checkoutApi.getSummary(productId, quantity, variantId).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.summary.set(data);

        if (!data.prerequisites.readyForCheckout) {
          this.checkoutIntent.save({
            productId,
            variantId,
            quantity,
            mode: 'BUY_NOW',
          });
          void this.router.navigateByUrl('/checkout/personal-details');
          return;
        }

        const addresses = data.addresses?.length
          ? data.addresses
          : data.address
            ? [{ ...data.address, isDefault: true }]
            : [];
        const selected =
          addresses.find((item) => item.isDefault)?.id ?? addresses[0]?.id ?? '';
        this.form.controls.addressId.setValue(selected);

        if (!data.product.inStock) {
          this.error.set('This product is currently out of stock.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.checkoutApi.error() ?? 'Unable to load checkout summary.');
      },
    });
  }
}
