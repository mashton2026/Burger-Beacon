type SubscriptionTier = "free" | "growth" | "pro" | null | undefined;
type RequiredTier = "growth" | "pro";

export function hasFeatureAccess(
  tier: SubscriptionTier,
  required: RequiredTier
): boolean {
  if (!tier) {
    return false;
  }

  if (required === "growth") {
    return tier === "growth" || tier === "pro";
  }

  return tier === "pro";
}