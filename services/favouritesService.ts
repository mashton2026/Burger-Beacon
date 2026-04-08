import { supabase } from "../lib/supabase";
import { getCurrentUserId } from "./authService";

export { getCurrentUserId };

type FavouriteVendorIdRow = {
  vendor_id: string | number | null;
};

function requireId(value: string, label: string): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  return trimmed;
}

export async function isVendorFavourite(
  userId: string,
  vendorId: string
): Promise<boolean> {
  const safeUserId = requireId(userId, "User ID");
  const safeVendorId = requireId(vendorId, "Vendor ID");

  const { data, error } = await supabase
    .from("favourites")
    .select("id")
    .eq("user_id", safeUserId)
    .eq("vendor_id", safeVendorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function addFavourite(
  userId: string,
  vendorId: string
): Promise<void> {
  const safeUserId = requireId(userId, "User ID");
  const safeVendorId = requireId(vendorId, "Vendor ID");

  const { error } = await supabase.from("favourites").insert({
    user_id: safeUserId,
    vendor_id: safeVendorId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeFavourite(
  userId: string,
  vendorId: string
): Promise<void> {
  const safeUserId = requireId(userId, "User ID");
  const safeVendorId = requireId(vendorId, "Vendor ID");

  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("user_id", safeUserId)
    .eq("vendor_id", safeVendorId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUserFavouriteVendorIds(
  userId: string
): Promise<string[]> {
  const safeUserId = requireId(userId, "User ID");

  const { data, error } = await supabase
    .from("favourites")
    .select("vendor_id")
    .eq("user_id", safeUserId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as FavouriteVendorIdRow[])
    .map((row) => row.vendor_id)
    .filter((vendorId): vendorId is string | number => vendorId !== null)
    .map((vendorId) => String(vendorId));
}