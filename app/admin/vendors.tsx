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
    suspendVendor,
    unsuspendVendor,
} from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function AdminVendorsScreen() {
    const [vendors, setVendors] = useState<Van[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [processingVendorId, setProcessingVendorId] = useState<string | null>(null);
    const [suspensionReasons, setSuspensionReasons] = useState<Record<string, string>>(
        {}
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
            setVendors(data);
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

    async function handleSuspend(vendor: Van) {
        setProcessingVendorId(vendor.id);

        try {
            await suspendVendor(vendor.id, suspensionReasons[vendor.id] ?? "");
            Alert.alert("Vendor suspended", `${vendor.name} has been suspended.`);
            await loadVendors();
        } catch (error) {
            Alert.alert(
                "Suspend failed",
                error instanceof Error ? error.message : "Unknown error"
            );
        } finally {
            setProcessingVendorId(null);
        }
    }

    async function handleUnsuspend(vendor: Van) {
        setProcessingVendorId(vendor.id);

        try {
            await unsuspendVendor(vendor.id);
            Alert.alert("Vendor restored", `${vendor.name} has been unsuspended.`);
            await loadVendors();
        } catch (error) {
            Alert.alert(
                "Unsuspend failed",
                error instanceof Error ? error.message : "Unknown error"
            );
        } finally {
            setProcessingVendorId(null);
        }
    }

    function renderVendor({ item }: { item: Van }) {
        const isProcessing = processingVendorId === item.id;

        return (
            <View style={styles.card}>
                <View style={styles.topRow}>
                    <View style={styles.textBlock}>
                        <Text style={styles.vendorName}>{item.name}</Text>
                        
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname: "/admin/edit-vendor",
                                    params: { id: item.id },
                                })
                            }
                        >
                            <Text style={{ color: "#FF7A00", fontWeight: "700", marginTop: 6 }}>
                                Edit
                            </Text>
                        </Pressable>

                        <Text style={styles.vendorMeta}>
                            {item.vendorName || "No vendor name"} • {item.cuisine}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.statusBadge,
                            item.isSuspended ? styles.statusSuspended : styles.statusActive,
                        ]}
                    >
                        <Text style={styles.statusBadgeText}>
                            {item.isSuspended ? "SUSPENDED" : "ACTIVE"}
                        </Text>
                    </View>
                </View>

                <Text style={styles.detailText}>
                    Tier: {(item.subscriptionTier ?? "free").toUpperCase()}
                </Text>

                <Text style={styles.detailText}>
                    Owner: {item.owner_id ? "Assigned" : "Unclaimed"}
                </Text>

                {item.isSuspended && item.suspensionReason ? (
                    <>
                        <Text style={styles.noteLabel}>Suspension reason</Text>
                        <Text style={styles.noteText}>{item.suspensionReason}</Text>
                    </>
                ) : null}

                {!item.isSuspended ? (
                    <>
                        <Text style={styles.noteLabel}>Suspension reason</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Add suspension reason"
                            placeholderTextColor="#7A7A7A"
                            value={suspensionReasons[item.id] ?? ""}
                            onChangeText={(text) =>
                                setSuspensionReasons((current) => ({
                                    ...current,
                                    [item.id]: text,
                                }))
                            }
                        />

                        <Pressable
                            style={[styles.actionButton, styles.suspendButton]}
                            onPress={() => handleSuspend(item)}
                            disabled={isProcessing}
                        >
                            <Text style={styles.actionButtonText}>
                                {isProcessing ? "Working..." : "Suspend Vendor"}
                            </Text>
                        </Pressable>
                    </>
                ) : (
                    <Pressable
                        style={[styles.actionButton, styles.unsuspendButton]}
                        onPress={() => handleUnsuspend(item)}
                        disabled={isProcessing}
                    >
                        <Text style={styles.actionButtonText}>
                            {isProcessing ? "Working..." : "Unsuspend Vendor"}
                        </Text>
                    </Pressable>
                )}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.kicker}>ADMIN</Text>
            <Text style={styles.title}>Manage Vendors</Text>
            <Text style={styles.subtitle}>
                Suspend or restore vendors safely before launch.
            </Text>

            <TextInput
                style={styles.searchInput}
                placeholder="Search by van, vendor, or cuisine"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />

            {loading ? (
                <Text style={styles.helperText}>Loading vendors...</Text>
            ) : (
                <FlatList
                    data={filteredVendors}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={renderVendor}
                    ListEmptyComponent={
                        <Text style={styles.helperText}>No vendors found.</Text>
                    }
                />
            )}

            <Pressable style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 24,
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
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderWidth: 2,
        borderColor: theme.colors.border,
    },

    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
    },

    textBlock: {
        flex: 1,
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
    },

    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        alignSelf: "flex-start",
    },

    statusActive: {
        backgroundColor: "#1DB954",
    },

    statusSuspended: {
        backgroundColor: "#C62828",
    },

    statusBadgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "800",
    },

    detailText: {
        fontSize: 14,
        color: "#333333",
        marginBottom: 6,
    },

    noteLabel: {
        fontSize: 13,
        fontWeight: "800",
        color: theme.colors.primary,
        marginTop: 10,
        marginBottom: 6,
    },

    noteText: {
        fontSize: 14,
        color: "#222222",
        lineHeight: 20,
        marginBottom: 10,
    },

    input: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        color: "#222222",
    },

    actionButton: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
    },

    suspendButton: {
        backgroundColor: "#C62828",
    },

    unsuspendButton: {
        backgroundColor: "#1DB954",
    },

    actionButtonText: {
        color: "#FFFFFF",
        fontWeight: "800",
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