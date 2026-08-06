import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  ViewChild,
  ElementRef
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../../core/services/auth.service';
import { VerificationService } from '../../services/verification.service';

@Component({
  selector: 'app-identity-verification',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    SkeletonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './identity-verification.html',
  styleUrl: './identity-verification.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentityVerificationComponent implements OnInit, OnDestroy {
  private readonly verification = inject(VerificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  readonly bootstrapping = signal(true);
  
  // States
  readonly aadhaarVerified = signal(false);
  readonly panVerified = signal(false);
  
  // Data
  readonly displayMobile = signal('');
  readonly maskedAadhaar = signal<string | null>(null);
  readonly maskedPan = signal<string | null>(null);
  readonly creditScore = signal<number | null>(null);

  // DigiLocker State
  readonly digilockerStep = signal<'enter' | 'redirect' | 'fetching' | 'done'>('enter');
  readonly digilockerClientId = signal<string | null>(null);
  readonly digilockerUrl = signal<string | null>(null);
  readonly digilockerKycData = signal<{
    name: string; gender: string; dob: string;
    masked_aadhaar: string; father_name: string;
    profile_image: string; address?: any;
  } | null>(null);
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  readonly verifyingAadhaar = signal(false);

  // PAN / Experian State
  readonly verifyingPan = signal(false);
  readonly panSuccessPulse = signal(false);
  
  // Face Match State
  readonly faceVerified = signal(false);
  readonly faceMatchScore = signal<number | null>(null);
  readonly cameraActive = signal(false);
  readonly capturedImage = signal<string | null>(null);
  readonly verifyingFace = signal(false);
  
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  readonly experianForm = this.fb.nonNullable.group({
    mobile_no: ['', Validators.required],
    pan: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)]],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    dob: ['', Validators.required],
  });

  readonly formattedMobile = computed(() => this.formatIndianMobile(this.displayMobile()));

  ngOnInit(): void {
    const userMobile = this.auth.user()?.mobile ?? '';
    this.displayMobile.set(userMobile);
    this.loadStatus();

    // Check if returning from DigiLocker redirect
    const queryClientId = this.route.snapshot.queryParamMap.get('client_id');
    const storedClientId = localStorage.getItem('digilocker_client_id');
    const clientId = queryClientId || storedClientId;

    if (clientId && !this.aadhaarVerified()) {
      localStorage.removeItem('digilocker_client_id');
      this.checkAndFetchDigilocker(clientId, true);
    }
  }

  ngOnDestroy(): void {
    this.stopPollingDigilocker();
  }

  private loadStatus(): void {
    this.verification.getStatus().subscribe({
      next: (status) => {
        this.bootstrapping.set(false);
        this.aadhaarVerified.set(status.aadhaarVerified);
        this.panVerified.set(status.panVerified);
        this.faceVerified.set(status.faceVerified ?? false);
        
        if (status.kyc?.faceMatchScore) {
          this.faceMatchScore.set(status.kyc.faceMatchScore);
        }
        
        if (status.aadhaarVerified) {
          this.digilockerStep.set('done');
          this.verification.getAadhaarStatus().subscribe({
            next: (res) => {
              const data: any = res;
              if (data.masked_aadhaar) {
                this.maskedAadhaar.set(data.masked_aadhaar);
              } else if (data.aadhaarNumberMasked) {
                this.maskedAadhaar.set(data.aadhaarNumberMasked);
              }
              this.digilockerKycData.set({
                name: data.name ?? '',
                gender: data.gender ?? '',
                dob: data.dob ?? '',
                masked_aadhaar: data.masked_aadhaar ?? data.aadhaarNumberMasked ?? '',
                father_name: '',
                profile_image: data.profileImage ?? '',
              });
              
              // Pre-fill Experian form with Aadhaar data
              const fullName = data.name ?? '';
              const nameParts = fullName.trim().split(' ');
              const firstName = nameParts[0] || '';
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
              
              let dobStr = data.dob ?? '';
              if (dobStr && dobStr.includes('-') && dobStr.split('-')[0].length === 2) {
                const parts = dobStr.split('-');
                dobStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
              } else if (dobStr && dobStr.includes('/')) {
                const parts = dobStr.split('/');
                dobStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
              
              this.experianForm.patchValue({
                first_name: firstName,
                last_name: lastName,
                dob: dobStr,
                mobile_no: this.auth.user()?.mobile?.replace(/\D/g, '').slice(-10) ?? ''
              });
            }
          });
        }
        
        if (status.kyc?.cibil_score) {
          this.creditScore.set(status.kyc.cibil_score);
        }

        if (status.kyc?.panNumber) {
          this.maskedPan.set(this.maskString(status.kyc.panNumber));
        }
      },
      error: () => {
        this.bootstrapping.set(false);
        this.toastError('Failed to load verification status.');
      }
    });
  }

  // --- DigiLocker Flow ---
  startDigilocker(): void {
    this.verifyingAadhaar.set(true);
    this.verification.digilockerGenerate().subscribe({
      next: (res) => {
        this.verifyingAadhaar.set(false);
        this.digilockerClientId.set(res.client_id);
        if (res.digilocker_url) {
          this.digilockerUrl.set(res.digilocker_url);
          this.digilockerStep.set('redirect');
          localStorage.setItem('digilocker_client_id', res.client_id);
          this.openDigilockerPopup(res.digilocker_url, res.client_id);
        } else {
          this.toastWarn('Failed to generate DigiLocker URL.');
        }
      },
      error: () => {
        this.verifyingAadhaar.set(false);
        this.toastError(this.verification.error() ?? 'DigiLocker init failed.');
      }
    });
  }

  private openDigilockerPopup(url: string, clientId: string): void {
    const width = 500;
    const height = 750;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;
    const popup = window.open(
      url,
      'DigiLockerVerification',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      this.toastWarn('Popup blocked. Please allow popups or use the manual link.');
      return;
    }

    this.startPollingDigilocker(clientId, popup);
  }

  private startPollingDigilocker(clientId: string, popup: Window): void {
    this.stopPollingDigilocker();
    let attempts = 0;
    const maxAttempts = 60; // 5 mins at 5s interval

    this.pollIntervalId = setInterval(() => {
      attempts++;
      if (popup.closed) {
        this.stopPollingDigilocker();
        this.checkAndFetchDigilocker(clientId, true);
        return;
      }
      this.checkAndFetchDigilocker(clientId, false, popup);
      
      if (attempts >= maxAttempts) {
        this.stopPollingDigilocker();
        this.toastWarn('DigiLocker verification timed out.');
      }
    }, 5000);
  }

  checkAndFetchDigilocker(clientId: string, isFinal: boolean = false, popup?: Window): void {
    this.verifyingAadhaar.set(true);
    this.verification.digilockerFetch(clientId).subscribe({
      next: (res) => {
        if (res.verified) {
          this.stopPollingDigilocker();
          if (popup && !popup.closed) {
            try { popup.close(); } catch (_) {}
          }
          this.verifyingAadhaar.set(false);
          this.digilockerKycData.set({
            name: res.name,
            gender: res.gender,
            dob: res.dob,
            masked_aadhaar: res.masked_aadhaar,
            father_name: res.father_name,
            profile_image: res.profile_image,
            address: res.address,
          });
          this.aadhaarVerified.set(true);
          this.maskedAadhaar.set(res.masked_aadhaar);
          this.digilockerStep.set('done');
          this.toastSuccess('Aadhaar verified successfully via DigiLocker.');
          this.loadStatus(); // Reload to pre-fill the experian form
        }
      },
      error: () => {
        if (isFinal) {
          this.stopPollingDigilocker();
          this.verifyingAadhaar.set(false);
        }
      }
    });
  }

  private stopPollingDigilocker(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  continueDigilockerRedirect(): void {
    if (this.digilockerUrl()) {
      window.location.href = this.digilockerUrl()!;
    }
  }

  // --- PAN / Experian Flow ---

  onPanInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);
    this.experianForm.controls.pan.setValue(value);
    input.value = value;
  }

  verifyPanAndCredit(): void {
    if (this.panVerified()) return;

    this.experianForm.markAllAsTouched();
    if (this.experianForm.invalid) {
      this.toastWarn('Please fill out all required Experian API fields correctly.');
      return;
    }

    this.verifyingPan.set(true);

    this.verification
      .verifyPanAndCredit(this.experianForm.getRawValue())
      .subscribe({
        next: (res) => {
          this.verifyingPan.set(false);
          this.panVerified.set(true);
          this.maskedPan.set(this.maskString(this.experianForm.value.pan));
          this.creditScore.set(res.score);
          this.panSuccessPulse.set(true);
          setTimeout(() => this.panSuccessPulse.set(false), 2000);
          this.toastSuccess('Experian Credit Report fetched successfully.');
        },
        error: () => {
          this.verifyingPan.set(false);
          this.toastError(this.verification.error() ?? 'Experian check failed.');
        },
      });
  }

  // --- Utils ---

  private formatIndianMobile(value: string | null | undefined): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 10) {
      const main = digits.slice(-10);
      return `+91 ${main.slice(0, 5)} ${main.slice(5)}`;
    }
    return value;
  }

  private maskString(val: string | null | undefined): string {
    if (!val || val.length < 4) return val || '';
    return 'X'.repeat(val.length - 4) + val.slice(-4);
  }

  private toastSuccess(msg: string) {
    this.messages.add({ severity: 'success', summary: 'Success', detail: msg });
  }

  private toastError(msg: string) {
    this.messages.add({ severity: 'error', summary: 'Error', detail: msg });
  }

  private toastWarn(msg: string) {
    this.messages.add({ severity: 'warn', summary: 'Warning', detail: msg });
  }

  // --- Face Match Methods ---

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      this.cameraActive.set(true);
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
      }
    } catch (err) {
      this.toastError('Unable to access camera. Please check permissions.');
    }
  }

  stopCamera() {
    this.cameraActive.set(false);
    if (this.videoElement?.nativeElement && this.videoElement.nativeElement.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  capturePhoto() {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) return;
    
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      this.capturedImage.set(dataUrl);
      this.stopCamera();
    }
  }

  retakePhoto() {
    this.capturedImage.set(null);
    this.startCamera();
  }

  verifyFace() {
    const img = this.capturedImage();
    if (!img) return;

    this.verifyingFace.set(true);
    this.verification.verifyFace({ capturedImage: img }).subscribe({
      next: (res) => {
        this.verifyingFace.set(false);
        this.faceVerified.set(true);
        this.faceMatchScore.set(res.score);
        this.toastSuccess('Face matched successfully!');
      },
      error: () => {
        this.verifyingFace.set(false);
        this.toastError(this.verification.error() ?? 'Face verification failed.');
      }
    });
  }
}
