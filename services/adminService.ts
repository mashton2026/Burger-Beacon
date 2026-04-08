import { supabase } from "../lib/supabase";
import { getCurrentUser } from "./authService";

export async function isCurrentUserAdmin(): Promise<boolean> {
    const user = await getCurrentUser();

    if (!user?.id) {
        return false;
    }

    const { data, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return Boolean(data);
}