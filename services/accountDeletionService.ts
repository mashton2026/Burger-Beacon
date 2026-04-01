import { supabase } from "../lib/supabase";

export type AccountDeletionRequestStatus =
  | "requested"
  | "approved"
  | "rejected";

export type AccountDeletionRequest = {
  id: string;
  user_id: string;
  email: string | null;
  vendor_id: string | null;
  reason: string | null;
  status: AccountDeletionRequestStatus;
  created_at: string;
};

export async function createAccountDeletionRequest(input: {
  userId: string;
  email?: string | null;
  vendorId?: string | null;
  reason?: string;
}) {
  const { error } = await supabase
    .from("account_deletion_requests")
    .insert({
      user_id: input.userId,
      email: input.email ?? null,
      vendor_id: input.vendorId ?? null,
      reason: input.reason?.trim() || null,
      status: "requested",
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAllAccountDeletionRequests(): Promise<AccountDeletionRequest[]> {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("*")
    .eq("status", "requested")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AccountDeletionRequest[];
}

export async function updateAccountDeletionRequestStatus(input: {
  requestId: string;
  status: AccountDeletionRequestStatus;
}) {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .update({
      status: input.status,
    })
    .eq("id", input.requestId)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("Update failed: no matching deletion request found.");
  }
}