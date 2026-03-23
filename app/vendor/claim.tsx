import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
} from "react-native";
import { theme } from "../../constants/theme";
import { getCurrentUser } from "../../services/authService";
import {
    createVendorClaim,
    getMyVendorClaimForSpottedVan,
} from "../../services/vendorClaimService";
import { getVendorById } from "../../services/vendorService";

const VERIFICATION_OPTIONS = [
    "Email from official business email",
    "Photo of branded van with today's date",
    "Social media page matching the van",
    "Website or Google Business profile",
    "Photo of menu or signage matching the listing",
];

export default function ClaimVendorScreen() {
    const params = useLocalSearchParams();
    const spottedVendorId = (params.id as string) ?? "";

    const [claimName, setClaimName] = useState("");
    const [claimEmail, setClaimEmail] = useState("");
    const [claimMessage, setClaimMessage] = useState("");
    const [verificationMethods, setVerificationMethods] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        loadClaimDefaults();
    }, [spottedVendorId]);

    async function loadClaimDefaults() {
        try {
            const user = await getCurrentUser();

            if (!user) {
                Alert.alert("Login required", "Please log in as a vendor first.");
                router.back();
                return;
            }

            const vendor = await getVendorById(spottedVendorId);

            if (!vendor) {
                Alert.alert("Not found", "This spotted van could not be found.");
                router.back();
                return;
            }

            if (!vendor.temporary) {
                Alert.alert(
                    "Already claimed",
                    "Only community spotted vans can be claimed."
                );
                router.back();
                return;
            }

            const existingClaim = await getMyVendorClaimForSpottedVan(
                spottedVendorId,
                user.id
            );

            if (existingClaim) {
                Alert.alert(
                    "Claim submitted",
                    "Your claim is now under review.\n\nNext step:\nSend your 3 selected proof methods to support@bitebeacon.uk using the same email as this claim.\n\nYou will gain access to this listing once approved."
                );

                router.replace("/vendor/dashboard");
                return;
            }

            setClaimName(vendor.name || "");
            setClaimEmail(user.email ?? "");
            setClaimMessage(
                "I am the real owner of this van and would like to claim this listing."
            );
        } catch (error) {
            Alert.alert(
                "Load failed",
                error instanceof Error ? error.message : "Unknown error"
            );
            router.back();
        } finally {
            setIsChecking(false);
        }
    }

    function toggleVerificationMethod(method: string) {
        setVerificationMethods((current) => {
            if (current.includes(method)) {
                return current.filter((item) => item !== method);
            }

            if (current.length >= 3) {
                Alert.alert(
                    "3 methods required",
                    "Please choose exactly 3 verification methods."
                );
                return current;
            }

            return [...current, method];
        });
    }

    async function handleSubmitClaim() {
        if (!claimName.trim() || !claimEmail.trim() || !claimMessage.trim()) {
            Alert.alert(
                "Missing details",
                "Please fill in business name, contact email, and claim message."
            );
            return;
        }

        if (verificationMethods.length !== 3) {
            Alert.alert(
                "Verification required",
                "Please choose exactly 3 verification methods."
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const user = await getCurrentUser();

            if (!user) {
                Alert.alert("Login required", "Please log in as a vendor first.");
                return;
            }

            await createVendorClaim({
                spottedVendorId,
                claimingUserId: user.id,
                claimName: claimName.trim(),
                claimEmail: claimEmail.trim(),
                claimMessage: claimMessage.trim(),
                verificationMethods,
            });

            Alert.alert(
                "Claim submitted",
                "Your claim has been submitted. Please send your 3 selected proof methods to support@bitebeacon.uk using the same email as this claim."
            );

            router.back();
        } catch (error) {
            Alert.alert(
                "Claim failed",
                error instanceof Error ? error.message : "Unknown error"
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.kicker}>CLAIM</Text>
            <Text style={styles.title}>Claim This Van</Text>
            <Text style={styles.subtitle}>
                Submit your request to take ownership of this community spotted listing.
                BiteBeacon will review your claim before approval.
            </Text>

            {isChecking ? (
                <Text style={styles.loadingText}>Checking listing details...</Text>
            ) : (
                <>
                    <Text style={styles.label}>Business Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your business name"
                        placeholderTextColor="#7A7A7A"
                        value={claimName}
                        onChangeText={setClaimName}
                    />

                    <Text style={styles.label}>Contact Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your contact email"
                        placeholderTextColor="#7A7A7A"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={claimEmail}
                        onChangeText={setClaimEmail}
                    />

                    <Text style={styles.label}>Why are you claiming this van?</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Tell BiteBeacon why this van belongs to you"
                        placeholderTextColor="#7A7A7A"
                        value={claimMessage}
                        onChangeText={setClaimMessage}
                        multiline
                    />

                    <Text style={styles.label}>Choose 3 verification methods</Text>
                    <Text style={styles.helperText}>
                        Choose exactly 3 proof methods, then send your evidence to
                        support@bitebeacon.uk using the same email as this claim.
                    </Text>

                    {VERIFICATION_OPTIONS.map((method) => {
                        const isSelected = verificationMethods.includes(method);

                        return (
                            <Pressable
                                key={method}
                                style={[
                                    styles.verificationOption,
                                    isSelected && styles.verificationOptionSelected,
                                ]}
                                onPress={() => toggleVerificationMethod(method)}
                            >
                                <Text
                                    style={[
                                        styles.verificationOptionText,
                                        isSelected && styles.verificationOptionTextSelected,
                                    ]}
                                >
                                    {isSelected ? "✓ " : ""}
                                    {method}
                                </Text>
                            </Pressable>
                        );
                    })}

                    <Pressable
                        style={styles.primaryButton}
                        onPress={handleSubmitClaim}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isSubmitting ? "Submitting..." : "Submit Claim"}
                        </Text>
                    </Pressable>
                </>
            )}

            <Pressable style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },

    content: {
        padding: 24,
        paddingBottom: 40,
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
        marginBottom: 24,
    },

    loadingText: {
        fontSize: 15,
        color: "rgba(255,255,255,0.75)",
        marginBottom: 24,
    },

    helperText: {
        fontSize: 14,
        color: "rgba(255,255,255,0.75)",
        lineHeight: 20,
        marginBottom: 14,
    },

    label: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 8,
    },

    input: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 14,
    },

    textArea: {
        minHeight: 120,
        textAlignVertical: "top",
    },

    verificationOption: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
    },

    verificationOptionSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },

    verificationOptionText: {
        color: "#222222",
        fontSize: 14,
        fontWeight: "700",
    },

    verificationOptionTextSelected: {
        color: "#FFFFFF",
    },

    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 6,
        marginBottom: 12,
    },

    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
    },

    backButton: {
        backgroundColor: "#D9D9D9",
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: "center",
    },

    backButtonText: {
        color: "#222222",
        fontSize: 16,
        fontWeight: "700",
    },
});