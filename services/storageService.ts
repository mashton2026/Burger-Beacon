import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../lib/supabase";

function getFileExtension(value: string, fallback: string) {
    const cleanValue = value.split("?")[0];
    const parts = cleanValue.split(".");
    const extension = parts[parts.length - 1]?.toLowerCase();

    if (!extension || extension === cleanValue.toLowerCase()) {
        return fallback;
    }

    return extension;
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
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    return base64ToArrayBuffer(base64);
}

export async function uploadVendorPhotos(
    userId: string,
    photoUris: string[]
): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (let index = 0; index < photoUris.length; index += 1) {
        const uri = photoUris[index];
        const extension = getFileExtension(uri, "jpg");
        const filePath = `${userId}/${Date.now()}-${index}.${extension}`;
        const fileBody = await fileUriToArrayBuffer(uri);

        const contentType =
            extension === "jpg" || extension === "jpeg"
                ? "image/jpeg"
                : extension === "png"
                    ? "image/png"
                    : extension === "webp"
                        ? "image/webp"
                        : "image/jpeg";

        const { error } = await supabase.storage
            .from("vendor-photos")
            .upload(filePath, fileBody, {
                contentType,
                upsert: false,
            });

        if (error) {
            throw new Error(error.message);
        }

        const { data } = supabase.storage.from("vendor-photos").getPublicUrl(filePath);

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
    const finalFileName = fileName?.trim() || "menu.pdf";
    const extension = getFileExtension(finalFileName, "pdf");
    const storagePath = `${userId}/${Date.now()}-menu.${extension}`;
    const fileBody = await fileUriToArrayBuffer(fileUri);

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
    const { data, error } = await supabase.storage
        .from("vendor-menus")
        .createSignedUrl(storagePath, 60 * 60);

    if (error) {
        return null;
    }

    return data.signedUrl;
}