import { NotFoundError } from '../../../common/errors/app-error';
import type { ListProductsQuery } from '../dto/product.dto';
import { productRepository } from '../repository/product.repository';
import type { Product } from '../../../types/database.types';
type ProductVariant = any;

function toNumber(value: { toNumber?: () => number } | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

type ProductSpecs = {
  warranty?: string;
  highlights?: string[];
  keySpecs?: Array<{ id: string; icon: string; label: string; value: string }>;
  rows?: Array<{ label: string; value: string }>;
  colors?: Array<{ id: string; name: string; hex: string }>;
  returnsPolicy?: string[];
  questions?: Array<{ id: string; question: string; answer: string }>;
};

type VariantSpecs = {
  keySpecs?: Array<{ id: string; icon: string; label: string; value: string }>;
  rows?: Array<{ label: string; value: string }>;
};

const META_ATTRIBUTE_KEYS = new Set(['colorhex', 'hex', 'swatch', 'image']);

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function parseSpecs(specifications: unknown): ProductSpecs {
  if (specifications && typeof specifications === 'object' && !Array.isArray(specifications)) {
    return specifications as ProductSpecs;
  }
  return {};
}

function parseVariantSpecs(specifications: unknown): VariantSpecs {
  if (specifications && typeof specifications === 'object' && !Array.isArray(specifications)) {
    return specifications as VariantSpecs;
  }
  return {};
}

function parseAttributes(attributes: unknown): Record<string, string> {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes as Record<string, unknown>)) {
    if (typeof value === 'string' || typeof value === 'number') {
      result[key] = String(value);
    }
  }
  return result;
}

function isSelectorAttribute(key: string): boolean {
  return !META_ATTRIBUTE_KEYS.has(key.toLowerCase());
}

function humanizeAttributeKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapVariant(variant: ProductVariant) {
  const mrp = toNumber(variant.price);
  const discountPrice = variant.discountPrice == null ? null : toNumber(variant.discountPrice);
  const sellingPrice = discountPrice ?? mrp;
  const images = parseImages(variant.images);
  const attributes = parseAttributes(variant.attributes);
  const specs = parseVariantSpecs(variant.specifications);
  const inStock = variant.stock > 0;

  return {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    price: mrp,
    discountPrice,
    sellingPrice,
    mrp,
    discount: Math.max(mrp - sellingPrice, 0),
    stock: variant.stock,
    stockQuantity: variant.stock,
    inStock,
    images,
    imagesGallery: images.map((src: string, index: number) => ({
      id: `${variant.id}-img-${index + 1}`,
      src,
      alt: `${variant.variantName} image ${index + 1}`,
    })),
    thumbnail: images[0] ?? null,
    specifications: variant.specifications,
    keySpecs: specs.keySpecs ?? [],
    specificationRows: specs.rows ?? [],
    attributes,
    isDefault: variant.isDefault,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
  };
}

function buildAttributeGroups(variants: ReturnType<typeof mapVariant>[]) {
  const keyOrder: string[] = [];
  const valuesByKey = new Map<string, Map<string, { value: string; hex?: string; inStock: boolean }>>();

  for (const variant of variants) {
    for (const [rawKey, rawValue] of Object.entries(variant.attributes)) {
      if (!isSelectorAttribute(rawKey)) continue;
      const key = rawKey;
      if (!valuesByKey.has(key)) {
        valuesByKey.set(key, new Map());
        keyOrder.push(key);
      }
      const bucket = valuesByKey.get(key)!;
      const existing = bucket.get(rawValue);
      const hexKey = Object.keys(variant.attributes).find(
        (attr) => attr.toLowerCase() === `${key.toLowerCase()}hex` || (key.toLowerCase() === 'color' && attr.toLowerCase() === 'colorhex'),
      );
      const hex = hexKey ? variant.attributes[hexKey] : undefined;
      bucket.set(rawValue, {
        value: rawValue,
        hex: hex ?? existing?.hex,
        inStock: Boolean(existing?.inStock) || variant.inStock,
      });
    }
  }

  return keyOrder.map((key) => ({
    key,
    label: humanizeAttributeKey(key),
    type: key.toLowerCase() === 'color' ? 'swatch' : 'chip',
    options: Array.from(valuesByKey.get(key)!.values()).map((option) => ({
      value: option.value,
      label: option.value,
      hex: option.hex ?? null,
      inStock: option.inStock,
      disabled: !option.inStock,
    })),
  }));
}

function pickDefaultVariant(variants: ReturnType<typeof mapVariant>[]) {
  return variants.find((row) => row.isDefault) ?? variants.find((row) => row.inStock) ?? variants[0] ?? null;
}

function mapProduct(
  product: Product,
  stats: { averageRating: number; reviewCount: number } = { averageRating: 0, reviewCount: 0 },
) {
  const mrp = toNumber(product.price);
  const discountPrice = product.discountPrice == null ? null : toNumber(product.discountPrice);
  const sellingPrice = discountPrice ?? mrp;
  const discount = Math.max(mrp - sellingPrice, 0);
  const parsedGallery = parseImages(product.galleryImages);
  const images = product.image
    ? [product.image, ...parsedGallery.filter((img) => img !== product.image)]
    : parsedGallery;
  const inStock = (product.status === 'active' || (product as any).isActive !== false) && product.stock > 0;
  const liveReviewCount = stats.reviewCount;
  const liveAverageRating = stats.averageRating;
  const averageRating =
    liveReviewCount > 0
      ? Math.round(liveAverageRating * 10) / 10
      : Math.round(toNumber(product.rating) * 10) / 10;
  const reviewCount = liveReviewCount > 0 ? liveReviewCount : product.totalReviews;

  return {
    ...product,
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    brand: product.brand,
    category: product.category,
    price: mrp,
    discountPrice,
    sellingPrice,
    mrp,
    discount,
    stock: product.stock,
    stockQuantity: product.stock,
    inStock,
    sku: product.sku,
    thumbnail: product.image,
    imageUrl: product.image,
    images,
    specifications: product.specifications,
    emiAvailable: product.emiAvailable,
    emiStartingFrom: product.emiStartingFrom == null ? null : toNumber(product.emiStartingFrom),
    rating: toNumber(product.rating),
    totalReviews: product.totalReviews,
    averageRating,
    reviewCount,
    isFeatured: product.isFeatured,
    status: 'active', // isActive: product.isActive,
    deliveryCharge: toNumber(product.deliveryCharge),
    createdAt: product.createdAt,
    wizardData: (product as any).wizardData,
  };
}

function mapPdpProduct(
  product: Product & { },
  stats: { averageRating: number; reviewCount: number },
) {
  const base = mapProduct(product, stats);
  const specs = parseSpecs(product.specifications);
  const mappedVariants = (product.variants ?? []).map(mapVariant);
  const selectedVariant = pickDefaultVariant(mappedVariants);
  const attributeGroups = buildAttributeGroups(mappedVariants);

  const images = selectedVariant?.images?.length ? selectedVariant.images : base.images;
  const sellingPrice = selectedVariant?.sellingPrice ?? base.sellingPrice;
  const mrp = selectedVariant?.mrp ?? base.mrp;
  const discountPrice = selectedVariant?.discountPrice ?? base.discountPrice;
  const stock = selectedVariant?.stock ?? base.stock;
  const sku = selectedVariant?.sku ?? base.sku;
  const inStock = (product.status === 'active' || (product as any).isActive !== false) && stock > 0;
  const keySpecs =
    selectedVariant?.keySpecs?.length ? selectedVariant.keySpecs : (specs.keySpecs ?? []);
  const specificationRows =
    selectedVariant?.specificationRows?.length
      ? selectedVariant.specificationRows
      : (specs.rows ?? []);

  // Backward-compatible colors/variants arrays derived from real attribute groups
  const colorGroup = attributeGroups.find((group) => group.key.toLowerCase() === 'color');
  const colors =
    colorGroup?.options.map((option, index) => ({
      id: `color-${index + 1}`,
      name: option.label,
      hex: option.hex ?? '#cccccc',
    })) ??
    specs.colors ??
    [];

  const nonColorGroups = attributeGroups.filter((group) => group.key.toLowerCase() !== 'color');
  const legacyVariants =
    nonColorGroups.length === 1
      ? nonColorGroups[0].options.map((option, index) => ({
          id: `cfg-${index + 1}`,
          label: option.label,
        }))
      : (specs as any).variants ?? [];

  const emiPlans = ((product as any).productEmiPlans ?? []).map((plan: any) => ({
    id: plan.id,
    planName: plan.planName,
    months: plan.months ?? 0,
    downPayment: plan.downPayment ? toNumber(plan.downPayment) : 0,
    serviceCharge: plan.serviceCharge ? toNumber(plan.serviceCharge) : 0,
    deliveryCharge: plan.deliveryCharge ? toNumber(plan.deliveryCharge) : 0,
    minEligibilityAmount: plan.minEligibilityAmount ? toNumber(plan.minEligibilityAmount) : 0,
    customerVisibility: plan.customerVisibility,
    isRecommended: plan.months === 6,
  }));

  return {
    ...base,
    price: mrp,
    discountPrice,
    sellingPrice,
    mrp,
    discount: Math.max(mrp - sellingPrice, 0),
    stock,
    stockQuantity: stock,
    inStock,
    sku,
    thumbnail: images[0] ?? base.thumbnail,
    imageUrl: images[0] ?? base.imageUrl,
    images,
    imagesGallery: images.map((src: string, index: number) => ({
      id: `img-${index + 1}`,
      src,
      alt: `${product.name} image ${index + 1}`,
    })),
    categoryLabel: product.category,
    subcategoryLabel: product.brand,
    overviewTitle: product.name,
    overviewBody: product.description,
    overviewHighlights: specs.highlights ?? [],
    keySpecs,
    specificationRows,
    colors,
    attributeGroups,
    productVariants: mappedVariants,
    selectedVariantId: selectedVariant?.id ?? null,
    selectedVariant,
    warrantyLabel: specs.warranty ?? '1 Year Warranty',
    returnsPolicy: specs.returnsPolicy ?? [],
    questions: specs.questions ?? [],
    emiPlans,
    breadcrumbs: [
      { label: 'Home', path: '/' },
      { label: 'Products', path: '/products' },
      { label: product.category, path: `/products?category=${encodeURIComponent(product.category)}` },
      { label: product.name, path: `/products/${product.slug}` },
    ],
  };
}

export class ProductService {
  async list(query: ListProductsQuery) {
    const [{ rows, total }, filters] = await Promise.all([
      productRepository.list(query),
      productRepository.getDistinctFilters(),
    ]);

    const productIds = rows.map((row) => row.id);
    const statsMap = await productRepository.getReviewStats(productIds);

    const items = rows.map((product) =>
      mapProduct(product, statsMap.get(product.id) ?? { averageRating: 0, reviewCount: 0 }),
    );

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
      filters,
    };
  }

  async getById(productId: string) {
    const product = await productRepository.findByIdWithVariants(productId);
    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    const statsMap = await productRepository.getReviewStats([productId]);
    const stats = statsMap.get(productId) ?? { averageRating: 0, reviewCount: 0 };

    return mapPdpProduct(product, stats);
  }

  async getBySlug(slug: string) {
    const product = await productRepository.findBySlugWithVariants(slug);
    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    const statsMap = await productRepository.getReviewStats([product.id]);
    const stats = statsMap.get(product.id) ?? { averageRating: 0, reviewCount: 0 };

    return mapPdpProduct(product, stats);
  }

  async getVariantForProduct(productId: string, variantId: string) {
    const variant = await productRepository.findVariantForProduct(productId, variantId);
    if (!variant) {
      throw new NotFoundError('Product variant not found.');
    }
    return mapVariant(variant);
  }

  
  private mapPayloadToPrisma(data: any): any {
    const payload = data.wizardData || data;

    const mapped: any = {
      name: payload.productName || data.name,
      sku: payload.sku || data.sku,
      brand: payload.brand || data.brand,
      description: payload.description || data.description,
      categoryId: payload.category || data.categoryId || undefined,
      image: payload.primaryImage || data.image,
      price: payload.sellingPrice ? parseFloat(payload.sellingPrice) : (data.price ? parseFloat(data.price) : 0),
      mrp: payload.mrp ? parseFloat(payload.mrp) : (data.mrp ? parseFloat(data.mrp) : 0),
      stock: payload.availableStock ? parseInt(payload.availableStock, 10) : (data.stock ?? 0),
      status: data.status || 'active',
      emiAvailable: payload.emiEnabled ?? (data.emiAvailable ?? true),
      shortDescription: payload.shortDescription || data.shortDescription,
      galleryImages: payload.galleryImages || data.galleryImages || [],
      warranty: payload.warranty || data.warranty,
      hsnCode: payload.hsnCode || data.hsnCode,
      manufacturer: payload.manufacturer || data.manufacturer,
      
      productType: payload.productType,
      modelNumber: payload.modelNumber,
      barcode: payload.barcode,
      countryOfOrigin: payload.countryOfOrigin,
      productCondition: payload.productCondition,
      
      specifications: payload.specifications || undefined,
      features: payload.features || undefined,
      boxContents: payload.boxContents || undefined,
      productVideoUrl: payload.productVideoUrl,

      subCategoryId: payload.subCategory || undefined,
      childCategoryId: payload.childCategory || undefined,
      colourSizeVariant: payload.colourSizeVariant,
      metaTitle: payload.metaTitle,
      metaDescription: payload.metaDescription,
      keywords: payload.keywords,

      purchasePrice: payload.purchasePrice ? parseFloat(payload.purchasePrice) : undefined,
      gst: payload.gst ? parseFloat(payload.gst) : undefined,
      discount: payload.discount ? parseFloat(payload.discount) : undefined,
      landingCost: payload.landingCost ? parseFloat(payload.landingCost) : undefined,
      margin: payload.margin ? parseFloat(payload.margin) : undefined,
      gstAmount: payload.gstAmount ? parseFloat(payload.gstAmount) : undefined,
      amazonPrice: payload.amazonPrice ? parseFloat(payload.amazonPrice) : undefined,
      flipkartPrice: payload.flipkartPrice ? parseFloat(payload.flipkartPrice) : undefined,
      otherWebsitePrice: payload.otherWebsitePrice ? parseFloat(payload.otherWebsitePrice) : undefined,
      marketLowestPrice: payload.marketLowestPrice ? parseFloat(payload.marketLowestPrice) : undefined,
      priceCheckedDate: payload.priceCheckedDate ? new Date(payload.priceCheckedDate) : undefined,
      priceCheckedBy: payload.priceCheckedBy,
      priceMatchAllowed: payload.priceMatchAllowed ?? false,
      maximumDiscountAllowed: payload.maximumDiscountAllowed ? parseFloat(payload.maximumDiscountAllowed) : undefined,

      warehouseId: payload.warehouse || undefined,
      openingStock: payload.openingStock ? parseInt(payload.openingStock, 10) : 0,
      availableStock: payload.availableStock ? parseInt(payload.availableStock, 10) : 0,
      reservedStock: payload.reservedStock ? parseInt(payload.reservedStock, 10) : 0,
      minimumQuantity: payload.minimumQuantity ? parseInt(payload.minimumQuantity, 10) : 1,
      maximumQuantity: payload.maximumQuantity ? parseInt(payload.maximumQuantity, 10) : undefined,
      trackInventory: payload.trackInventory ?? true,
      serialImeiTracking: payload.serialImeiTracking ?? false,
      requiresSerialImeiCapture: payload.requiresSerialImeiCapture ?? false,
      minOrderQuantity: payload.minOrderQuantity ? parseInt(payload.minOrderQuantity, 10) : 1,
      maxQuantityPerCustomer: payload.maxQuantityPerCustomer ? parseInt(payload.maxQuantityPerCustomer, 10) : undefined,
      minimumCustomerAge: payload.minimumCustomerAge ? parseInt(payload.minimumCustomerAge, 10) : undefined,
      eligiblePinCodes: payload.eligiblePinCodes,
      cashPurchase: payload.cashPurchase ?? false,
      invoiceSetting: payload.invoiceSetting,
      requiresFieldVerification: payload.requiresFieldVerification ?? false,

      weight: payload.weight ? parseFloat(payload.weight) : undefined,
      length: payload.length ? parseFloat(payload.length) : undefined,
      width: payload.width ? parseFloat(payload.width) : undefined,
      height: payload.height ? parseFloat(payload.height) : undefined,
      dispatchSla: payload.dispatchSla ? parseInt(payload.dispatchSla, 10) : undefined,
      deliveryCharges: payload.deliveryCharges ? parseFloat(payload.deliveryCharges) : undefined,
      deliveryDays: payload.deliveryDays ? parseInt(payload.deliveryDays, 10) : undefined,
      deliveryCode: payload.deliveryCode,
      deliveryPartner: payload.deliveryPartner,
      deliveryZone: payload.deliveryZone,
      expressDelivery: payload.expressDelivery ?? false,
      deliveryChargeMethod: payload.deliveryChargeMethod,
      deliveryConfirmationOtp: payload.deliveryConfirmationOtp ?? false,
      serialImeiCaptureAtDelivery: payload.serialImeiCaptureAtDelivery ?? false,

      replacementWindow: payload.replacementWindow ?? false,
      replacementDays: payload.replacementDays ? parseInt(payload.replacementDays, 10) : undefined,
      installationRequired: payload.installationRequired ?? false,
      installationCharge: payload.installationCharge ? parseFloat(payload.installationCharge) : undefined,

      selectedEmiPlanId: payload.selectedEmiPlanId || undefined,
      defaultDownPaymentPercent: payload.defaultDownPaymentPercent ? parseFloat(payload.defaultDownPaymentPercent) : undefined,
      minCustomerDownPayment: payload.minCustomerDownPayment ? parseFloat(payload.minCustomerDownPayment) : undefined,
      maxDownPayment: payload.maxDownPayment ? parseFloat(payload.maxDownPayment) : undefined,
      downPaymentEditableAtApproval: payload.downPaymentEditableAtApproval ?? false,
      serviceChargeMethod: payload.serviceChargeMethod,
      documentationCharge: payload.documentationCharge ? parseFloat(payload.documentationCharge) : undefined,
      verificationCharge: payload.verificationCharge ? parseFloat(payload.verificationCharge) : undefined,
      firstEmiDueAfter: payload.firstEmiDueAfter ? parseInt(payload.firstEmiDueAfter, 10) : undefined,
      gracePeriod: payload.gracePeriod ? parseInt(payload.gracePeriod, 10) : undefined,

      wizardData: data.wizardData || undefined, // Keep a copy just in case
    };
    
    if (payload.slug && payload.slug.trim() !== '') {
       mapped.slug = payload.slug.trim();
    }
    
    // Clean up undefined values so Prisma doesn't trip on relations
    Object.keys(mapped).forEach(key => {
        if (mapped[key] === undefined) delete mapped[key];
    });

    return mapped;
  }

  async create(data: any) {
    const mapped = this.mapPayloadToPrisma(data);
    return productRepository.create(mapped);
  }

  async update(id: string, data: any) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Product not found.');
    }
    const mapped = this.mapPayloadToPrisma(data);
    return productRepository.update(id, mapped);
  }
}

export const productService = new ProductService();
