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

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function validateStatus(
  status: AccountDeletionRequestStatus
): AccountDeletionRequestStatus {
  if (
    status !== "requested" &&
    status !== "approved" &&
    status !== "rejected"
  ) {
    throw new Error("Invalid deletion request status.");
  }

  return status;
}

export async function createAccountDeletionRequest(input: {
  userId: string;
  email?: string | null;
  vendorId?: string | null;
  reason?: string;
}) {
  const userId = input.userId?.trim();

  if (!userId) {
    throw new Error("A valid user ID is required.");
  }

  const { error } = await supabase.from("account_deletion_requests").insert({
    user_id: userId,
    email: normalizeOptionalText(input.email),
    vendor_id: normalizeOptionalText(input.vendorId),
    reason: normalizeOptionalText(input.reason),
    status: "requested",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAllAccountDeletionRequests(): Promise<
  AccountDeletionRequest[]
> {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("id,user_id,email,vendor_id,reason,status,created_at")
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
  const requestId = input.requestId?.trim();
  const status = validateStatus(input.status);

  if (!requestId) {
    throw new Error("A valid request ID is required.");
  }

  const { data, error } = await supabase
    .from("account_deletion_requests")
    .update({
      status,
    })
    .eq("id", requestId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("Update failed: no matching deletion request found.");
  }
}