import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OFFER_BANNER } from '../../data/home-sections-mock.data';

@Component({
  selector: 'app-offer-banner',
  imports: [RouterLink],
  templateUrl: './offer-banner.html',
  styleUrl: './offer-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferBanner {
  readonly content = signal(OFFER_BANNER);
}
