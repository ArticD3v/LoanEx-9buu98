import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error';
import { OtpVerificationDialogComponent } from '../../components/otp-verification-dialog/otp-verification-dialog';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, FormFieldErrorComponent, OtpVerificationDialogComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = this.auth.loading;
  readonly error = this.auth.error;
  readonly otpOpen = signal(false);
  readonly otpMobile = signal('');
  readonly otpHint = signal<string | null>('Use OTP: 1111 for instant login');
  readonly otpError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  });

  constructor() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.auth.setReturnUrl(returnUrl);
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 10);
    this.form.controls.mobile.setValue(value);
    input.value = value;
  }

  submit(): void {
    this.auth.clearError();
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const mobile = this.form.controls.mobile.value.trim();
    this.otpMobile.set(mobile);
    this.otpError.set(null);

    this.auth.sendOtp({ mobile, purpose: 'LOGIN' }).subscribe({
      next: (res) => {
        this.otpHint.set('Use OTP: 1111 for instant login');
        this.otpOpen.set(true);
      },
      error: (err) => {
        // Even if sendOtp errors in dev, open modal with 1111 hint for testing
        this.otpHint.set('Use OTP: 1111 for instant login');
        this.otpOpen.set(true);
      },
    });
  }

  onOtpVerified(otp: string): void {
    this.otpError.set(null);
    this.auth
      .verifyOtp({ mobile: this.otpMobile(), otp, purpose: 'LOGIN' })
      .subscribe({
        next: () => {
          this.otpOpen.set(false);
          this.auth.redirectAfterAuth();
        },
        error: (err: { error?: { message?: string } }) => {
          this.otpError.set(err?.error?.message ?? 'OTP verification failed');
        },
      });
  }

  onResendOtp(): void {
    this.otpError.set(null);
    this.auth.sendOtp({ mobile: this.otpMobile(), purpose: 'REGISTER' }).subscribe({
      next: (res) => this.otpHint.set(res.devOtp ? `Dev OTP: ${res.devOtp}` : null),
      error: (err: { error?: { message?: string } }) => {
        this.otpError.set(err?.error?.message ?? 'Unable to resend OTP');
      },
    });
  }
}
