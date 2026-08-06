export interface HomeCategory {
  id: string;
  label: string;
  path: string;
  imageSrc: string;
  imageAlt: string;
}

export interface PopularProduct {
  id: string;
  name: string;
  priceLabel: string;
  emiLabel: string;
  deliveryLabel: string;
  imageSrc: string;
  imageAlt: string;
  path: string;
  wishlist: boolean;
}
