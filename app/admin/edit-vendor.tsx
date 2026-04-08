import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    adminDeleteVendor,
    adminRemoveVendorPhoto,
    adminUpdateVendor,
    getVendorById,
} from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function EditVendorScreen() {
    const { id } = useLocalSearchParams();
    const vendorId = id as string;

    const [vendor, setVendor] = useState<Van | null>(null);
    const [name, setName] = useState("");
    const [vendorName, setVendorName] = useState("");
    const [cuisine, setCuisine] = useState("");
    const [menu, setMenu] = useState("");
    const [schedule, setSchedule] = useState("");
    const [subscriptionTier, setSubscriptionTier] = useState<
        "free" | "growth" | "pro"
    >("free");
    const [isLive, setIsLive] = useState(false);

    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [removingPhotoUri, setRemovingPhotoUri] = useState<string | null>(null);

    useEffect(() => {
        loadVendor();
    }, [vendorId]);

    async function loadVendor() {
        setLoading(true);
        setLoadFailed(false);

        try {
            const data = await getVendorById(vendorId);

            if (!data) {
                setVendor(null);
                setLoadFailed(true);
                return;
            }

            setVendor(data);
            setName(data.name ?? "");
            setVendorName(data.vendorName ?? "");
            setCuisine(data.cuisine ?? "");
            setMenu(data.menu ?? "");
            setSchedule(data.schedule ?? "");
            setSubscriptionTier(data.subscriptionTier ?? "free");
            setIsLive(data.isLive ?? false);
        } catch {
            setVendor(null);
            setLoadFailed(true);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!vendor || isSaving || isDeleting) return;

        const trimmedName = name.trim();
        const trimmedVendorName = vendorName.trim();
        const trimmedCuisine = cuisine.trim();
        const trimmedMenu = menu.trim();
        const trimmedSchedule = schedule.trim();

        if (!trimmedName) {
            Alert.alert("Missing name", "Vendor name is required.");
            return;
        }

        if (!trimmedCuisine) {
            Alert.alert("Missing cuisine", "Cuisine is required.");
            return;
        }

        setIsSaving(true);

        try {
            await adminUpdateVendor({
                id: vendor.id,
                name: trimmedName,
                vendorName: trimmedVendorName,
                cuisine: trimmedCuisine,
                menu: trimmedMenu,
                schedule: trimmedSchedule,
                vendorMessage: vendor.vendorMessage ?? "",
                foodCategories: vendor.foodCategories ?? [],
                subscriptionTier,
                isLive,
                lat: vendor.lat,
                lng: vendor.lng,
            });

            Alert.alert("Saved", "Vendor updated successfully");
            router.back();
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Update failed"
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleRemovePhoto(photoUri: string) {
        if (!vendor || isSaving || isDeleting || removingPhotoUri) return;

        setRemovingPhotoUri(photoUri);

        try {
            await adminRemoveVendorPhoto(vendor.id, photoUri);

            setVendor((prev) =>
                prev
                    ? {
                        ...prev,
                        photos: (prev.photos || []).filter((p) => p !== photoUri),
                    }
                    : prev
            );

            Alert.alert("Photo removed", "The photo was removed successfully.");
        } catch {
            Alert.alert("Error", "Failed to remove photo");
        } finally {
            setRemovingPhotoUri(null);
        }
    }

    async function handleDeleteVendor() {
        if (!vendor || isSaving || isDeleting) return;

        setIsDeleting(true);

        try {
            await adminDeleteVendor(vendor.id);
            Alert.alert("Deleted", "Vendor deleted successfully");
            router.replace("/admin/vendors");
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Delete failed"
            );
        } finally {
            setIsDeleting(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    if (loadFailed || !vendor) {
        return (
            <View style={styles.center}>
                <Text style={styles.loadingText}>Vendor could not be loaded.</Text>

                <Pressable style={styles.retryButton} onPress={loadVendor}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>

                <Pressable style={styles.backButtonStandalone} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
            </View>
        );
    }

    const isBusy = isSaving || isDeleting || removingPhotoUri !== null;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Edit Vendor</Text>

            {vendor.photos && vendor.photos.length > 0 ? (
                <View style={styles.photosSection}>
                    <Text style={styles.photosTitle}>Photos</Text>

                    {(vendor.photos ?? []).map((photoUri, index) => {
                        const isRemovingThisPhoto = removingPhotoUri === photoUri;

                        return (
                            <View key={`${photoUri}-${index}`} style={styles.photoCard}>
                                <Image source={{ uri: photoUri }} style={styles.photoImage} />

                                <Pressable
                                    onPress={() => handleRemovePhoto(photoUri)}
                                    style={[
                                        styles.removeButton,
                                        isBusy && styles.buttonDisabled,
                                    ]}
                                    disabled={isBusy}
                                >
                                    <Text style={styles.removeButtonText}>
                                        {isRemovingThisPhoto ? "Removing..." : "Remove Photo"}
                                    </Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            ) : null}

            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor="#7A7A7A"
                editable={!isBusy}
            />

            <TextInput
                style={styles.input}
                value={vendorName}
                onChangeText={setVendorName}
                placeholder="Vendor Name"
                placeholderTextColor="#7A7A7A"
                editable={!isBusy}
            />

            <TextInput
                style={styles.input}
                value={cuisine}
                onChangeText={setCuisine}
                placeholder="Cuisine"
                placeholderTextColor="#7A7A7A"
                editable={!isBusy}
            />

            <TextInput
                style={styles.input}
                value={menu}
                onChangeText={setMenu}
                placeholder="Menu"
                placeholderTextColor="#7A7A7A"
                editable={!isBusy}
                multiline
            />

            <TextInput
                style={styles.input}
                value={schedule}
                onChangeText={setSchedule}
                placeholder="Schedule"
                placeholderTextColor="#7A7A7A"
                editable={!isBusy}
                multiline
            />

            <Text style={styles.fieldLabel}>Subscription Tier</Text>
            <View style={styles.tierRow}>
                {(["free", "growth", "pro"] as const).map((tier) => (
                    <Pressable
                        key={tier}
                        style={[
                            styles.tierButton,
                            subscriptionTier === tier && styles.tierButtonActive,
                            isBusy && styles.buttonDisabled,
                        ]}
                        onPress={() => setSubscriptionTier(tier)}
                        disabled={isBusy}
                    >
                        <Text
                            style={[
                                styles.tierButtonText,
                                subscriptionTier === tier && styles.tierButtonTextActive,
                            ]}
                        >
                            {tier.toUpperCase()}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Text style={styles.fieldLabel}>Live Status</Text>
            <Pressable
                style={[
                    styles.liveToggle,
                    isLive && styles.liveToggleActive,
                    isBusy && styles.buttonDisabled,
                ]}
                onPress={() => setIsLive((current) => !current)}
                disabled={isBusy}
            >
                <Text style={styles.liveToggleText}>{isLive ? "LIVE" : "OFFLINE"}</Text>
            </Pressable>

            <Pressable
                style={[styles.button, isBusy && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isBusy}
            >
                <Text style={styles.buttonText}>
                    {isSaving ? "Saving..." : "Save Changes"}
                </Text>
            </Pressable>

            <Pressable
                style={[styles.deleteButton, isBusy && styles.buttonDisabled]}
                onPress={() => {
                    if (isBusy) return;

                    Alert.alert(
                        "Delete vendor",
                        "Are you sure you want to permanently delete this vendor listing?",
                        [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Delete",
                                style: "destructive",
                                onPress: handleDeleteVendor,
                            },
                        ]
                    );
                }}
                disabled={isBusy}
            >
                <Text style={styles.deleteButtonText}>
                    {isDeleting ? "Deleting..." : "Delete Vendor"}
                </Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0B2A5B",
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#fff",
        marginBottom: 20,
    },
    input: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: "#FF7A00",
        color: "#222222",
    },
    button: {
        backgroundColor: "#FF7A00",
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontWeight: "800",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    removeButton: {
        marginTop: 6,
        backgroundColor: "#C62828",
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: "center",
    },
    removeButtonText: {
        color: "#fff",
        fontWeight: "700",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0B2A5B",
        padding: 20,
    },
    loadingText: {
        color: "#fff",
        fontSize: 16,
        textAlign: "center",
    },
    retryButton: {
        marginTop: 16,
        backgroundColor: "#FF7A00",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: "center",
    },
    retryButtonText: {
        color: "#fff",
        fontWeight: "800",
    },
    deleteButton: {
        backgroundColor: "#C62828",
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 12,
    },
    deleteButtonText: {
        color: "#fff",
        fontWeight: "800",
    },
    fieldLabel: {
        color: "#FFFFFF",
        fontWeight: "800",
        marginBottom: 8,
        marginTop: 4,
    },
    tierRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 14,
    },
    tierButton: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: "#FF7A00",
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    tierButtonActive: {
        backgroundColor: "#FF7A00",
    },
    tierButtonText: {
        color: "#0B2A5B",
        fontWeight: "800",
    },
    tierButtonTextActive: {
        color: "#FFFFFF",
    },
    liveToggle: {
        backgroundColor: "#6F84AA",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 14,
    },
    liveToggleActive: {
        backgroundColor: "#1DB954",
    },
    liveToggleText: {
        color: "#FFFFFF",
        fontWeight: "800",
    },
    photosSection: {
        marginBottom: 20,
    },
    photosTitle: {
        color: "#fff",
        fontWeight: "800",
        marginBottom: 10,
    },
    photoCard: {
        marginBottom: 10,
    },
    photoImage: {
        width: "100%",
        height: 180,
        borderRadius: 12,
    },
    backButtonStandalone: {
        marginTop: 12,
        backgroundColor: "#D9D9D9",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: "center",
    },
    backButtonText: {
        color: "#222222",
        fontWeight: "700",
    },
});