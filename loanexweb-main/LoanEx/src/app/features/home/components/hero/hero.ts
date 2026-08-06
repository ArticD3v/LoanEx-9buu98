import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HERO_SLIDES, TRUST_HIGHLIGHTS } from '../../data/hero-mock.data';

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly slides = HERO_SLIDES;
  readonly trust = TRUST_HIGHLIGHTS;
  readonly activeIndex = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      this.startTimer();
      this.destroyRef.onDestroy(() => {
        if (this.timer) clearInterval(this.timer);
      });
    });
  }

  setSlide(index: number): void {
    this.activeIndex.set(index);
    this.resetTimer();
  }

  nextSlide(): void {
    this.activeIndex.update((idx) => (idx + 1) % this.slides.length);
  }

  prevSlide(): void {
    this.activeIndex.update((idx) => (idx - 1 + this.slides.length) % this.slides.length);
  }

  private startTimer(): void {
    this.timer = setInterval(() => this.nextSlide(), 5000);
  }

  private resetTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.startTimer();
  }
}
