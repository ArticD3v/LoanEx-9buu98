import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CatalogProduct, ProductsApiService } from '../../../products/services/products-api.service';
import { HomeCategory } from '../../models/catalog.models';

@Component({
  selector: 'app-categories',
  imports: [RouterLink],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Categories implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly categories = signal<HomeCategory[]>([]);

  ngOnInit(): void {
    this.productsApi
      .list({ limit: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading.set(false);
          this.categories.set(this.buildCategories(data.items, data.filters.categories));
        },
        error: () => {
          this.loading.set(false);
          this.error.set(this.productsApi.error() ?? 'Unable to load categories.');
          this.categories.set([]);
        },
      });
  }

  private buildCategories(items: CatalogProduct[], filterCategories: string[]): HomeCategory[] {
    const categoryNames =
      filterCategories.length > 0
        ? filterCategories
        : [...new Set(items.map((item) => item.category))];

    const thumbnailByCategory = new Map<string, string>();
    for (const item of items) {
      const image = item.imageUrl || item.thumbnail;
      if (!thumbnailByCategory.has(item.category) && image) {
        thumbnailByCategory.set(item.category, image);
      }
    }

    return categoryNames.map((category) => ({
      id: category.toLowerCase().replace(/\s+/g, '-'),
      label: category,
      path: `/products?category=${encodeURIComponent(category)}`,
      imageSrc:
        this.categoryImage(category) ??
        thumbnailByCategory.get(category) ??
        'assets/images/categories/appliance.svg',
      imageAlt: category,
    }));
  }

  /** Curated category art so labels always match the image. */
  private categoryImage(category: string): string | null {
    const key = category.trim().toLowerCase();
    const map: Record<string, string> = {
      smartphone: 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=400&q=80',
      smartphones: 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=400&q=80',
      mobile: 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=400&q=80',
      laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80',
      laptops: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80',
      electronics: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&q=80',
      audio: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
      'smart tv': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80',
      refrigerator: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&q=80',
      refrigerators: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&q=80',
      'washing machine': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&q=80',
      'washing machines': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&q=80',
      'air conditioner': 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&q=80',
      tablet: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80',
      tablets: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80',
      'smart watch': 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&q=80',
      "men's clothing": 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=400&q=80',
      "women's clothing": 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400&q=80',
      jewelery: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
    };
    return map[key] ?? null;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback'] === '1') return;
    img.dataset['fallback'] = '1';
    img.src = 'assets/images/categories/appliance.svg';
  }
}
