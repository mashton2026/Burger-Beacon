import { type SubscriptionTier } from "../types/van";

export type SubscriptionFeatures = {
  images: boolean;
  liveStatus: boolean;
  analytics: boolean;
  reviews: boolean;
  priorityPlacement: boolean;
  notifications: boolean;
  promotions: boolean;
  featuredBadge: boolean;
  trendingBoost: boolean;
};

const subscriptionFeatureMap: Record<SubscriptionTier, SubscriptionFeatures> = {
  free: {
    images: false,
    liveStatus: false,
    analytics: false,
    reviews: false,
    priorityPlacement: false,
    notifications: false,
    promotions: false,
    featuredBadge: false,
    trendingBoost: false,
  },

  growth: {
    images: true,
    liveStatus: true,
    analytics: true,
    reviews: true,
    priorityPlacement: false,
    notifications: false,
    promotions: false,
    featuredBadge: false,
    trendingBoost: false,
  },

  pro: {
    images: true,
    liveStatus: true,
    analytics: true,
    reviews: true,
    priorityPlacement: true,
    notifications: true,
    promotions: true,
    featuredBadge: true,
    trendingBoost: true,
  },
};

const subscriptionTierRank: Record<SubscriptionTier, number> = {
  free: 0,
  growth: 1,
  pro: 2,
};

export function getSubscriptionFeatures(
  tier?: SubscriptionTier
): SubscriptionFeatures {
  return subscriptionFeatureMap[tier ?? "free"];
}

export function getSubscriptionTierRank(tier?: SubscriptionTier): number {
  return subscriptionTierRank[tier ?? "free"];
}

export function hasTierAccess(
  tier: SubscriptionTier | undefined,
  minimumTier: SubscriptionTier
): boolean {
  return getSubscriptionTierRank(tier) >= subscriptionTierRank[minimumTier];
}

export function isFreeTier(tier?: SubscriptionTier): boolean {
  return (tier ?? "free") === "free";
}

export function isGrowthTier(tier?: SubscriptionTier): boolean {
  return (tier ?? "free") === "growth";
}

export function isProTier(tier?: SubscriptionTier): boolean {
  return (tier ?? "free") === "pro";
}

export function getPlacementBoostScore(tier?: SubscriptionTier): number {
  if (isProTier(tier)) return 1000;
  if (hasTierAccess(tier, "growth")) return 500;
  return 0;
}