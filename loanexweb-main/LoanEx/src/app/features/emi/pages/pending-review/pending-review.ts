import {

  ChangeDetectionStrategy,

  Component,

  OnDestroy,

  OnInit,

  computed,

  inject,

  signal,

} from '@angular/core';

import { Router, RouterLink } from '@angular/router';

import { environment } from '../../../../../environments/environment';

import {

  EmiApplicationCurrentResponse,

  EmiApplicationService,

} from '../../services/emi-application.service';

import { OrderService } from '../../services/order.service';



@Component({

  selector: 'app-pending-review',

  imports: [RouterLink],

  templateUrl: './pending-review.html',

  styleUrl: './pending-review.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class PendingReviewComponent implements OnInit, OnDestroy {

  private readonly emiApi = inject(EmiApplicationService);

  private readonly orderApi = inject(OrderService);

  private readonly router = inject(Router);



  readonly loading = signal(true);

  readonly refreshing = signal(false);

  readonly approving = signal(false);

  readonly error = signal<string | null>(null);

  readonly current = signal<EmiApplicationCurrentResponse | null>(null);

  readonly showDevApprove = !environment.production;



  private pollId: ReturnType<typeof setInterval> | null = null;

  private initialLoadDone = false;



  readonly statusBadge = computed(() => this.current()?.status ?? 'PENDING');

  readonly isUnderReview = computed(() => this.current()?.status === 'UNDER_REVIEW');



  ngOnInit(): void {

    this.load('viewed', true);

    this.pollId = setInterval(() => this.load('refreshed', false), 30_000);

  }



  ngOnDestroy(): void {

    if (this.pollId) {

      clearInterval(this.pollId);

      this.pollId = null;

    }

  }



  refresh(): void {

    this.load('refreshed', false);

  }



  approveForTesting(): void {

    if (this.approving()) return;

    this.approving.set(true);

    this.error.set(null);



    this.emiApi.devApprove().subscribe({

      next: (result) => {

        this.approving.set(false);

        if (this.pollId) {

          clearInterval(this.pollId);

          this.pollId = null;

        }

        if (result.orderId) {

          void this.router.navigateByUrl(`/orders/${result.orderId}`);

        } else {

          void this.router.navigateByUrl('/notifications');

        }

      },

      error: () => {

        this.approving.set(false);

        this.error.set(this.emiApi.error() ?? 'Unable to approve application.');

      },

    });

  }



  formatDate(value: string | undefined | null): string {

    if (!value) return '—';

    return new Date(value).toLocaleString('en-IN', {

      day: '2-digit',

      month: 'short',

      year: 'numeric',

      hour: '2-digit',

      minute: '2-digit',

    });

  }



  private load(event: 'viewed' | 'refreshed', showFullLoading: boolean): void {

    if (showFullLoading && !this.initialLoadDone) {

      this.loading.set(true);

    } else {

      this.refreshing.set(true);

    }



    this.emiApi.getCurrent(event).subscribe({

      next: (data) => {

        this.loading.set(false);

        this.refreshing.set(false);

        this.initialLoadDone = true;

        this.error.set(null);

        this.current.set(data);

        this.handleStatusNavigation(data.status);

      },

      error: () => {

        this.loading.set(false);

        this.refreshing.set(false);

        this.error.set(this.emiApi.error() ?? 'Unable to load application status.');

      },

    });

  }



  private handleStatusNavigation(status: string): void {

    if (status === 'APPROVED') {

      if (this.pollId) {

        clearInterval(this.pollId);

        this.pollId = null;

      }

      this.navigateToOrderOrNotifications();

      return;

    }



    if (status === 'REJECTED') {

      if (this.pollId) {

        clearInterval(this.pollId);

        this.pollId = null;

      }

      void this.router.navigateByUrl('/application/rejected');

    }

  }



  private navigateToOrderOrNotifications(): void {

    this.orderApi.list().subscribe({

      next: (data) => {

        const firstOrder = data.items[0];

        if (firstOrder?.id) {

          void this.router.navigateByUrl(`/orders/${firstOrder.id}`);

        } else {

          void this.router.navigateByUrl('/notifications');

        }

      },

      error: () => {

        void this.router.navigateByUrl('/notifications');

      },

    });

  }

}

