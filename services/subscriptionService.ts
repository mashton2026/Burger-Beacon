export function hasFeatureAccess(
  tier: "free" | "growth" | "pro" | null,
  required: "growth" | "pro"
) {
  if (!tier) return false;

  if (required === "growth") {
    return tier === "growth" || tier === "pro";
  }

  if (required === "pro") {
    return tier === "pro";
  }

  return false;
}