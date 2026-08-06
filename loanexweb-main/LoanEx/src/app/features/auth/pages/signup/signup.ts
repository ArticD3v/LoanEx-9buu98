import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error';
import {
  indianMobileValidator,
  matchFieldsValidator,
  strongPasswordValidator,
} from '../../../../shared/validators/auth.validators';
import { OtpVerificationDialogComponent } from '../../components/otp-verification-dialog/otp-verification-dialog';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink, FormFieldErrorComponent, OtpVerificationDialogComponent],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signup {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly loading = this.auth.loading;
  readonly error = this.auth.error;
  readonly showPassword = signal(false);
  readonly otpOpen = signal(false);
  readonly otpMobile = signal('');
  readonly otpHint = signal<string | null>(null);
  readonly otpError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly submitted = signal(0);

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      mobile: ['', [Validators.required, indianMobileValidator()]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchFieldsValidator('password', 'confirmPassword') },
  );

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  isInvalid(name: 'fullName' | 'mobile' | 'email' | 'password' | 'confirmPassword'): boolean {
    const ctrl = this.form.controls[name];
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  submit(): void {
    this.auth.clearError();
    this.formError.set(null);
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();
    this.submitted.update((n) => n + 1);

    if (this.form.invalid) {
      this.formError.set(
        this.form.hasError('fieldsMismatch')
          ? 'Passwords do not match.'
          : 'Please fix the highlighted fields. Password needs 8+ characters with upper, lower, and a number.',
      );
      return;
    }

    const { fullName, mobile, email, password } = this.form.getRawValue();
    this.auth.register({ fullName, mobile, email, password }).subscribe({
      next: (res) => {
        this.otpMobile.set(mobile);
        this.otpHint.set(res.devOtp ? `Dev OTP: ${res.devOtp}` : null);
        this.otpOpen.set(true);
      },
      error: () => {
        // AuthService already stores the API error message.
      },
    });
  }

  onOtpVerified(otp: string): void {
    this.otpError.set(null);
    this.auth
      .verifyOtp({ mobile: this.otpMobile(), otp, purpose: 'REGISTER' })
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
