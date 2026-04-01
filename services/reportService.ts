import { supabase } from "../lib/supabase";

export type VendorReportReason =
    | "fake_listing"
    | "incorrect_details"
    | "wrong_location"
    | "abusive_content"
    | "spam"
    | "other";

export type VendorReportStatus = "open" | "resolved" | "dismissed";

export type VendorReport = {
    id: string;
    vendor_id: string;
    reporter_user_id: string;
    reason: VendorReportReason;
    details: string | null;
    status: VendorReportStatus;
    admin_note: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
};

export async function createVendorReport(input: {
    vendorId: string;
    reporterUserId: string;
    reason: VendorReportReason;
    details?: string;
}) {
    const { error } = await supabase.from("vendor_reports").insert({
        vendor_id: input.vendorId,
        reporter_user_id: input.reporterUserId,
        reason: input.reason,
        details: input.details?.trim() || null,
        status: "open",
    });

    if (error) {
        throw new Error(error.message);
    }
}

export async function getAllVendorReports(): Promise<VendorReport[]> {
    const { data, error } = await supabase
        .from("vendor_reports")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as VendorReport[];
}

export async function updateVendorReportStatus(input: {
    reportId: string;
    status: VendorReportStatus;
    adminNote?: string;
    reviewedBy?: string | null;
}) {
    const { data, error } = await supabase
        .from("vendor_reports")
        .update({
            status: input.status,
            admin_note: input.adminNote?.trim() || null,
            reviewed_at: new Date().toISOString(),
            reviewed_by: input.reviewedBy ?? null,
        })
        .match({ id: input.reportId })
        .select();

    if (error) {
        throw new Error(error.message);
    }

    if (!data || data.length === 0) {
        throw new Error("Update failed: no matching report found.");
    }
}