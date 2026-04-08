import { supabase } from "../lib/supabase";

export type VendorClaimStatus = "pending" | "approved" | "rejected";

export type VendorClaim = {
  id: string;
  spotted_vendor_id: string;
  claiming_user_id: string;
  claim_name: string;
  claim_email: string;
  claim_message: string;
  verification_methods: string[];
  admin_note: string | null;
  status: VendorClaimStatus;
  created_at: string;
};

type CreateVendorClaimInput = {
  spottedVendorId: string;
  claimingUserId: string;
  claimName: string;
  claimEmail: string;
  claimMessage: string;
  verificationMethods: string[];
};

const VENDOR_CLAIM_SELECT =
  "id, spotted_vendor_id, claiming_user_id, claim_name, claim_email, claim_message, verification_methods, admin_note, status, created_at";

function requireValue(value: string, label: string): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  return trimmed;
}

function normalizeVerificationMethods(methods: string[]): string[] {
  if (!Array.isArray(methods)) {
    throw new Error("Verification methods are required.");
  }

  const normalized = methods
    .map((method) => method?.trim())
    .filter((method): method is string => Boolean(method));

  if (normalized.length === 0) {
    throw new Error("At least one verification method is required.");
  }

  return normalized;
}

function normalizeOptionalNote(value?: string | null): string {
  return value?.trim() ?? "";
}

export async function createVendorClaim(
  input: CreateVendorClaimInput
): Promise<void> {
  const spottedVendorId = requireValue(input.spottedVendorId, "Spotted vendor ID");
  const claimingUserId = requireValue(input.claimingUserId, "Claiming user ID");
  const claimName = requireValue(input.claimName, "Claim name");
  const claimEmail = requireValue(input.claimEmail, "Claim email");
  const claimMessage = requireValue(input.claimMessage, "Claim message");
  const verificationMethods = normalizeVerificationMethods(
    input.verificationMethods
  );

  const { error } = await supabase.from("vendor_claims").insert({
    spotted_vendor_id: spottedVendorId,
    claiming_user_id: claimingUserId,
    claim_name: claimName,
    claim_email: claimEmail,
    claim_message: claimMessage,
    verification_methods: verificationMethods,
    status: "pending",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getMyVendorClaimForSpottedVan(
  spottedVendorId: string,
  claimingUserId: string
): Promise<VendorClaim | null> {
  const safeSpottedVendorId = requireValue(spottedVendorId, "Spotted vendor ID");
  const safeClaimingUserId = requireValue(claimingUserId, "Claiming user ID");

  const { data, error } = await supabase
    .from("vendor_claims")
    .select(VENDOR_CLAIM_SELECT)
    .eq("spotted_vendor_id", safeSpottedVendorId)
    .eq("claiming_user_id", safeClaimingUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as VendorClaim | null) ?? null;
}

export async function getPendingVendorClaims(): Promise<VendorClaim[]> {
  const { data, error } = await supabase
    .from("vendor_claims")
    .select(VENDOR_CLAIM_SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VendorClaim[];
}

export async function approveVendorClaim(
  claimId: string,
  adminNote: string
): Promise<void> {
  const safeClaimId = requireValue(claimId, "Claim ID");

  const { error } = await supabase.rpc("approve_vendor_claim", {
    p_claim_id: safeClaimId,
    p_admin_note: normalizeOptionalNote(adminNote),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function rejectVendorClaim(
  claimId: string,
  adminNote: string
): Promise<void> {
  const safeClaimId = requireValue(claimId, "Claim ID");

  const { error } = await supabase.rpc("reject_vendor_claim", {
    p_claim_id: safeClaimId,
    p_admin_note: normalizeOptionalNote(adminNote),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getMyVendorClaims(
  userId: string
): Promise<VendorClaim[]> {
  const safeUserId = requireValue(userId, "User ID");

  const { data, error } = await supabase
    .from("vendor_claims")
    .select(VENDOR_CLAIM_SELECT)
    .eq("claiming_user_id", safeUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VendorClaim[];
}