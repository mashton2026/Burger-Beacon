import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../lib/supabase";

function requireValue(value: string, label: string): string {
    const trimmed = value?.trim();

    if (!trimmed) {
        throw new Error(`${label} is required.`);
    }

    return trimmed;
}

function getFileExtension(value: string, fallback: string): string {
    const cleanValue = value.split("?")[0].trim();

    if (!cleanValue.includes(".")) {
        return fallback;
    }

    const parts = cleanValue.split(".");
    const extension = parts[parts.length - 1]?.toLowerCase()?.trim();

    return extension || fallback;
}

function normalizeImageExtension(extension: string): "jpg" | "jpeg" | "png" | "webp" {
    if (extension === "jpg") return "jpg";
    if (extension === "jpeg") return "jpeg";
    if (extension === "png") return "png";
    if (extension === "webp") return "webp";
    return "jpg";
}

function getImageContentType(extension: string): "image/jpeg" | "image/png" | "image/webp" {
    const safeExtension = normalizeImageExtension(extension);

    if (safeExtension === "png") return "image/png";
    if (safeExtension === "webp") return "image/webp";
    return "image/jpeg";
}

function normalizePdfFileName(fileName?: string | null): string {
    const trimmed = fileName?.trim();

    if (!trimmed) {
        return "menu.pdf";
    }

    const extension = getFileExtension(trimmed, "pdf");

    if (extension !== "pdf") {
        return `${trimmed}.pdf`;
    }

    return trimmed;
}

function createStoragePath(
    userId: string,
    prefix: string,
    extension: string
): string {
    const randomPart = Math.random().toString(36).slice(2, 8);
    return `${userId}/${prefix}-${Date.now()}-${randomPart}.${extension}`;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);

    for (let index = 0; index < length; index += 1) {
        bytes[index] = binaryString.charCodeAt(index);
    }

    return bytes.buffer;
}

async function fileUriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
    const safeUri = requireValue(uri, "File URI");

    const base64 = await FileSystem.readAsStringAsync(safeUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    return base64ToArrayBuffer(base64);
}

export async function uploadVendorPhotos(
    userId: string,
    photoUris: string[]
): Promise<string[]> {
    const safeUserId = requireValue(userId, "User ID");

    if (!Array.isArray(photoUris) || photoUris.length === 0) {
        return [];
    }

    const uploadedUrls: string[] = [];

    for (let index = 0; index < photoUris.length; index += 1) {
        const uri = requireValue(photoUris[index] ?? "", "Photo URI");
        const extension = normalizeImageExtension(getFileExtension(uri, "jpg"));
        const filePath = createStoragePath(
            safeUserId,
            `photo-${index}`,
            extension
        );
        const fileBody = await fileUriToArrayBuffer(uri);
        const contentType = getImageContentType(extension);

        const { error } = await supabase.storage
            .from("vendor-photos")
            .upload(filePath, fileBody, {
                contentType,
                upsert: false,
            });

        if (error) {
            throw new Error(error.message);
        }

        const { data } = supabase.storage
            .from("vendor-photos")
            .getPublicUrl(filePath);

        uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
}

export async function uploadVendorMenuPdf(
    userId: string,
    fileUri: string,
    fileName?: string | null
): Promise<{
    storagePath: string;
    fileName: string;
    signedUrl: string | null;
}> {
    const safeUserId = requireValue(userId, "User ID");
    const safeFileUri = requireValue(fileUri, "File URI");
    const finalFileName = normalizePdfFileName(fileName);
    const storagePath = createStoragePath(safeUserId, "menu", "pdf");
    const fileBody = await fileUriToArrayBuffer(safeFileUri);

    const { error } = await supabase.storage
        .from("vendor-menus")
        .upload(storagePath, fileBody, {
            contentType: "application/pdf",
            upsert: false,
        });

    if (error) {
        throw new Error(error.message);
    }

    const signedUrl = await getVendorMenuPdfSignedUrl(storagePath);

    return {
        storagePath,
        fileName: finalFileName,
        signedUrl,
    };
}

export async function getVendorMenuPdfSignedUrl(
    storagePath: string
): Promise<string | null> {
    const safeStoragePath = requireValue(storagePath, "Storage path");

    const { data, error } = await supabase.storage
        .from("vendor-menus")
        .createSignedUrl(safeStoragePath, 60 * 60);

    if (error) {
        return null;
    }

    return data.signedUrl;
}

export async function uploadVendorLogo(
    userId: string,
    fileUri: string
): Promise<{
    publicUrl: string;
    storagePath: string;
}> {
    const safeUserId = requireValue(userId, "User ID");
    const safeFileUri = requireValue(fileUri, "File URI");
    const extension = normalizeImageExtension(getFileExtension(safeFileUri, "png"));
    const filePath = createStoragePath(safeUserId, "logo", extension);
    const fileBody = await fileUriToArrayBuffer(safeFileUri);
    const contentType = getImageContentType(extension);

    const { error } = await supabase.storage
        .from("vendor-logos")
        .upload(filePath, fileBody, {
            contentType,
            upsert: true,
        });

    if (error) {
        throw new Error(error.message);
    }

    const { data } = supabase.storage
        .from("vendor-logos")
        .getPublicUrl(filePath);

    return {
        publicUrl: data.publicUrl,
        storagePath: filePath,
    };
}