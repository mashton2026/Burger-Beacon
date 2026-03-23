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

export async function createVendorClaim(
  input: CreateVendorClaimInput
): Promise<void> {
  const { error } = await supabase.from("vendor_claims").insert({
    spotted_vendor_id: input.spottedVendorId,
    claiming_user_id: input.claimingUserId,
    claim_name: input.claimName,
    claim_email: input.claimEmail,
    claim_message: input.claimMessage,
    verification_methods: input.verificationMethods,
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
  const { data, error } = await supabase
    .from("vendor_claims")
    .select("*")
    .eq("spotted_vendor_id", spottedVendorId)
    .eq("claiming_user_id", claimingUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function getPendingVendorClaims(): Promise<VendorClaim[]> {
  const { data, error } = await supabase
    .from("vendor_claims")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VendorClaim[];
}

export async function approveVendorClaim(claimId: string, adminNote: string): Promise<void> {
  const { error } = await supabase.rpc("approve_vendor_claim", {
    p_claim_id: claimId,
    p_admin_note: adminNote,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function rejectVendorClaim(claimId: string, adminNote: string): Promise<void> {
  const { error } = await supabase.rpc("reject_vendor_claim", {
    p_claim_id: claimId,
    p_admin_note: adminNote,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getMyVendorClaims(
  userId: string
): Promise<VendorClaim[]> {
  const { data, error } = await supabase
    .from("vendor_claims")
    .select("*")
    .eq("claiming_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VendorClaim[];
}