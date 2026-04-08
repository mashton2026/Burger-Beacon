import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { theme } from "../../constants/theme";
import {
    getAllVendors,
    updateVendorSubscriptionTier,
} from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function AdminSubscriptionsScreen() {
    const [vendors, setVendors] = useState<Van[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [processingVendorId, setProcessingVendorId] = useState<string | null>(
        null
    );

    useFocusEffect(
        useCallback(() => {
            loadVendors();
        }, [])
    );

    async function loadVendors() {
        setLoading(true);

        try {
            const data = await getAllVendors();

            const sortedData = [...data].sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            setVendors(sortedData);
        } catch (error) {
            Alert.alert(
                "Load failed",
                error instanceof Error ? error.message : "Unknown error"
            );
            setVendors([]);
        } finally {
            setLoading(false);
        }
    }

    const filteredVendors = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) return vendors;

        return vendors.filter((vendor) => {
            return (
                vendor.name.toLowerCase().includes(query) ||
                (vendor.vendorName ?? "").toLowerCase().includes(query) ||
                vendor.cuisine.toLowerCase().includes(query)
            );
        });
    }, [vendors, searchQuery]);

    async function handleTierChange(
        vendorId: string,
        nextTier: "free" | "growth" | "pro"
    ) {
        if (processingVendorId) return;

        const vendor = vendors.find((v) => v.id === vendorId);
        const currentTier = vendor?.subscriptionTier ?? "free";

        if (currentTier === nextTier) return;

        const isDowngrade =
            (currentTier === "pro" &&
                (nextTier === "growth" || nextTier === "free")) ||
            (currentTier === "growth" && nextTier === "free");

        const confirmMessage = isDowngrade
            ? `Move this vendor from ${currentTier.toUpperCase()} to ${nextTier.toUpperCase()}?\n\nThis may reduce vendor visibility and disable paid features.`
            : `Move this vendor from ${currentTier.toUpperCase()} to ${nextTier.toUpperCase()}?`;

        Alert.alert("Confirm tier change", confirmMessage, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Confirm",
                style: "destructive",
                onPress: async () => {
                    setProcessingVendorId(vendorId);

                    try {
                        await updateVendorSubscriptionTier(vendorId, nextTier);
                        Alert.alert(
                            "Plan updated",
                            `Vendor moved to ${nextTier.toUpperCase()}.`
                        );
                        await loadVendors();
                    } catch (error) {
                        Alert.alert(
                            "Update failed",
                            error instanceof Error ? error.message : "Unknown error"
                        );
                    } finally {
                        setProcessingVendorId(null);
                    }
                },
            },
        ]);
    }

    function renderVendor({ item }: { item: Van }) {
        const isProcessing = processingVendorId === item.id;
        const isAnyProcessing = processingVendorId !== null;
        const currentTier = item.subscriptionTier ?? "free";

        return (
            <View style={styles.card}>
                <Text style={styles.vendorName}>{item.name}</Text>
                <Text style={styles.vendorMeta}>
                    {item.vendorName || "No vendor name"} • {item.cuisine}
                </Text>
                <Text style={styles.currentTier}>
                    Current Tier: {currentTier.toUpperCase()}
                </Text>

                <View style={styles.tierRow}>
                    <Pressable
                        style={[
                            styles.tierButton,
                            currentTier === "free" && styles.tierButtonActive,
                            isAnyProcessing && styles.tierButtonDisabled,
                        ]}
                        onPress={() => handleTierChange(item.id, "free")}
                        disabled={isAnyProcessing}
                    >
                        <Text
                            style={[
                                styles.tierButtonText,
                                currentTier === "free" && styles.tierButtonTextActive,
                            ]}
                        >
                            Free
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.tierButton,
                            currentTier === "growth" && styles.tierButtonActive,
                            isAnyProcessing && styles.tierButtonDisabled,
                        ]}
                        onPress={() => handleTierChange(item.id, "growth")}
                        disabled={isAnyProcessing}
                    >
                        <Text
                            style={[
                                styles.tierButtonText,
                                currentTier === "growth" && styles.tierButtonTextActive,
                            ]}
                        >
                            Growth
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.tierButton,
                            currentTier === "pro" && styles.tierButtonActive,
                            isAnyProcessing && styles.tierButtonDisabled,
                        ]}
                        onPress={() => handleTierChange(item.id, "pro")}
                        disabled={isAnyProcessing}
                    >
                        <Text
                            style={[
                                styles.tierButtonText,
                                currentTier === "pro" && styles.tierButtonTextActive,
                            ]}
                        >
                            Pro
                        </Text>
                    </Pressable>
                </View>

                {isProcessing ? (
                    <Text style={styles.processingText}>Updating...</Text>
                ) : null}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredVendors}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={renderVendor}
                ListHeaderComponent={
                    <>
                        <Text style={styles.kicker}>ADMIN</Text>
                        <Text style={styles.title}>Manage Subscription Tiers</Text>
                        <Text style={styles.subtitle}>
                            Move vendors between Free, Growth, and Pro plans.
                        </Text>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by van, vendor, or cuisine"
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            editable={!processingVendorId}
                        />
                    </>
                }
                ListEmptyComponent={
                    <Text style={styles.helperText}>
                        {loading ? "Loading vendors..." : "No vendors found."}
                    </Text>
                }
                ListFooterComponent={
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </Pressable>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    kicker: {
        fontSize: 12,
        fontWeight: "800",
        color: theme.colors.secondary,
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: "800",
        color: "#FFFFFF",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: "rgba(255,255,255,0.75)",
        lineHeight: 22,
        marginBottom: 20,
    },
    searchInput: {
        backgroundColor: "rgba(255,255,255,0.12)",
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 20,
        color: "#FFFFFF",
    },
    helperText: {
        fontSize: 15,
        color: "rgba(255,255,255,0.75)",
        lineHeight: 22,
        marginBottom: 20,
    },
    listContent: {
        paddingBottom: 20,
        flexGrow: 1,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderWidth: 2,
        borderColor: theme.colors.border,
    },
    vendorName: {
        fontSize: 18,
        fontWeight: "800",
        color: theme.colors.background,
        marginBottom: 4,
    },
    vendorMeta: {
        fontSize: 14,
        color: "#555555",
        marginBottom: 10,
    },
    currentTier: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.primary,
        marginBottom: 12,
    },
    tierRow: {
        flexDirection: "row",
        gap: 10,
    },
    tierButton: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    tierButtonActive: {
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.background,
    },
    tierButtonDisabled: {
        opacity: 0.5,
    },
    tierButtonText: {
        color: theme.colors.background,
        fontWeight: "800",
    },
    tierButtonTextActive: {
        color: "#FFFFFF",
    },
    processingText: {
        marginTop: 10,
        fontSize: 13,
        fontWeight: "700",
        color: theme.colors.primary,
    },
    backButton: {
        backgroundColor: "#D9D9D9",
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 8,
    },
    backButtonText: {
        color: "#222222",
        fontSize: 16,
        fontWeight: "700",
    },
});