import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbItem } from '../models/layout.models';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Breadcrumb {
  /** Breadcrumb trail. Last item is the current page (non-link). */
  readonly items = input.required<BreadcrumbItem[]>();
}
