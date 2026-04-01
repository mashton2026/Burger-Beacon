import { type SubscriptionTier, type Van } from "../types/van";

type VendorRow = {
  id: string | number;
  name?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  rating?: number | string | null;
  cuisine?: string | null;
  temporary?: boolean | null;
  listing_source?: "admin_seeded" | "user_spotted" | null;
  expires_at?: string | null;
  expired_at?: string | null;
  photo?: string | null;
  photos?: string[] | null;
  logo_url?: string | null;
  logo_path?: string | null;
  vendor_name?: string | null;
  menu?: string | null;
  schedule?: string | null;
  menu_pdf_url?: string | null;
  menu_pdf_name?: string | null;
  vendor_message?: string | null;
  is_live?: boolean | null;
  views?: number | null;
  directions?: number | null;
  owner_id?: string | null;
  subscription_tier?: SubscriptionTier | null;
  food_categories?: string[] | null;
  is_suspended?: boolean | null;
  suspension_reason?: string | null;
  suspended_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
};

export function mapVendorRowToVan(row: VendorRow): Van {
  return {
    id: String(row.id),
    name: row.name ?? "",
    lat: Number.isFinite(Number(row.lat)) ? Number(row.lat) : 0,
    lng: Number.isFinite(Number(row.lng)) ? Number(row.lng) : 0,
    rating: Number.isFinite(Number(row.rating)) ? Number(row.rating) : 0,
    cuisine: row.cuisine ?? "",
    temporary: row.temporary ?? false,
    listingSource: row.listing_source ?? "admin_seeded",
    expiresAt: row.expires_at ?? null,
    expiredAt: row.expired_at ?? null,
    photo: row.photo ?? null,
    photos: row.photos ?? (row.photo ? [row.photo] : []),
    logoUrl: row.logo_url ?? null,
    logoPath: row.logo_path ?? null,
    vendorName: row.vendor_name ?? "",
    menu: row.menu ?? "",
    schedule: row.schedule ?? "",
    menuPdfUrl: row.menu_pdf_url ?? null,
    menuPdfName: row.menu_pdf_name ?? null,
    vendorMessage: row.vendor_message ?? "",
    isLive: row.is_live ?? false,
    views: row.views ?? 0,
    directions: row.directions ?? 0,
    owner_id: row.owner_id ?? null,
    subscriptionTier: row.subscription_tier ?? "free",
    foodCategories: row.food_categories ?? [],
    isSuspended: row.is_suspended ?? false,
    suspensionReason: row.suspension_reason ?? null,
    suspendedAt: row.suspended_at ?? null,
    stripe_customer_id: row.stripe_customer_id ?? null,
    stripe_subscription_id: row.stripe_subscription_id ?? null,
    subscription_status: row.subscription_status ?? null,
  };
}

export function mapVendorRowsToVans(rows: VendorRow[] = []): Van[] {
  return rows.map(mapVendorRowToVan);
}