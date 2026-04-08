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

function requireId(value: string, label: string): string {
    const trimmed = value?.trim();

    if (!trimmed) {
        throw new Error(`${label} is required.`);
    }

    return trimmed;
}

function normalizeOptionalText(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function validateVendorReportReason(
    reason: VendorReportReason
): VendorReportReason {
    if (
        reason !== "fake_listing" &&
        reason !== "incorrect_details" &&
        reason !== "wrong_location" &&
        reason !== "abusive_content" &&
        reason !== "spam" &&
        reason !== "other"
    ) {
        throw new Error("Invalid vendor report reason.");
    }

    return reason;
}

function validateVendorReportStatus(
    status: VendorReportStatus
): VendorReportStatus {
    if (
        status !== "open" &&
        status !== "resolved" &&
        status !== "dismissed"
    ) {
        throw new Error("Invalid vendor report status.");
    }

    return status;
}

export async function createVendorReport(input: {
    vendorId: string;
    reporterUserId: string;
    reason: VendorReportReason;
    details?: string;
}) {
    const vendorId = requireId(input.vendorId, "Vendor ID");
    const reporterUserId = requireId(input.reporterUserId, "Reporter user ID");
    const reason = validateVendorReportReason(input.reason);

    const { error } = await supabase.from("vendor_reports").insert({
        vendor_id: vendorId,
        reporter_user_id: reporterUserId,
        reason,
        details: normalizeOptionalText(input.details),
        status: "open",
    });

    if (error) {
        throw new Error(error.message);
    }
}

export async function getAllVendorReports(): Promise<VendorReport[]> {
    const { data, error } = await supabase
        .from("vendor_reports")
        .select(
            "id,vendor_id,reporter_user_id,reason,details,status,admin_note,created_at,reviewed_at,reviewed_by"
        )
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
    const reportId = requireId(input.reportId, "Report ID");
    const status = validateVendorReportStatus(input.status);

    const { data, error } = await supabase
        .from("vendor_reports")
        .update({
            status,
            admin_note: normalizeOptionalText(input.adminNote),
            reviewed_at: new Date().toISOString(),
            reviewed_by: normalizeOptionalText(input.reviewedBy),
        })
        .eq("id", reportId)
        .select("id");

    if (error) {
        throw new Error(error.message);
    }

    if (!data || data.length === 0) {
        throw new Error("Update failed: no matching report found.");
    }
}