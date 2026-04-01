import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { theme } from "../../constants/theme";
import { validateModeratedText } from "../../lib/contentModeration";
import { getCurrentUser } from "../../services/authService";
import {
    createVendorReport,
    type VendorReportReason,
} from "../../services/reportService";

const REPORT_REASONS: { label: string; value: VendorReportReason }[] = [
    { label: "Fake listing", value: "fake_listing" },
    { label: "Incorrect details", value: "incorrect_details" },
    { label: "Wrong location", value: "wrong_location" },
    { label: "Abusive content", value: "abusive_content" },
    { label: "Spam", value: "spam" },
    { label: "Other", value: "other" },
];

export default function ReportVendorScreen() {
    const params = useLocalSearchParams();
    const vendorId = String(params.id ?? "");

    const [selectedReason, setSelectedReason] =
        useState<VendorReportReason | null>(null);
    const [details, setDetails] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function submitReport() {
        if (!vendorId) {
            Alert.alert("Error", "No vendor listing was provided.");
            return;
        }

        if (!selectedReason) {
            Alert.alert("Missing info", "Please choose a report reason.");
            return;
        }

        const detailsError = validateModeratedText(details, {
            fieldLabel: "Report details",
            allowEmpty: true,
            maxLength: 300,
        });

        if (detailsError) {
            Alert.alert("Report blocked", detailsError);
            return;
        }

        const user = await getCurrentUser();

        if (!user) {
            Alert.alert(
                "Login required",
                "Please log in or create an account to submit a report."
            );
            return;
        }

        setSubmitting(true);

        try {
            await createVendorReport({
                vendorId,
                reporterUserId: user.id,
                reason: selectedReason,
                details,
            });

            Alert.alert(
                "Report submitted",
                "Thank you. Your report has been sent for review."
            );

            router.back();
        } catch (error) {
            Alert.alert(
                "Submit failed",
                error instanceof Error ? error.message : "Unknown error"
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.kicker}>REPORT</Text>
            <Text style={styles.title}>Report Listing</Text>
            <Text style={styles.subtitle}>
                Tell us what is wrong with this listing so BiteBeacon can review it.
            </Text>

            <Text style={styles.sectionTitle}>Reason</Text>

            <View style={styles.reasonList}>
                {REPORT_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason.value;

                    return (
                        <Pressable
                            key={reason.value}
                            style={[
                                styles.reasonButton,
                                isSelected && styles.reasonButtonSelected,
                            ]}
                            onPress={() => setSelectedReason(reason.value)}
                        >
                            <Text
                                style={[
                                    styles.reasonButtonText,
                                    isSelected && styles.reasonButtonTextSelected,
                                ]}
                            >
                                {reason.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <Text style={styles.sectionTitle}>Extra Details</Text>

            <TextInput
                style={styles.input}
                placeholder="Add any helpful detail"
                placeholderTextColor="#7A7A7A"
                multiline
                maxLength={300}
                value={details}
                onChangeText={setDetails}
            />

            <Text style={styles.helperText}>
                Keep it factual. Profanity and spam are blocked.
            </Text>

            <Pressable
                style={[styles.submitButton, submitting && styles.disabledButton]}
                onPress={submitReport}
                disabled={submitting}
            >
                <Text style={styles.submitButtonText}>
                    {submitting ? "Submitting..." : "Submit Report"}
                </Text>
            </Pressable>

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
        marginBottom: 8,
        letterSpacing: 1.2,
    },

    title: {
        fontSize: 30,
        fontWeight: "800",
        color: theme.colors.textOnDark,
        marginBottom: 8,
    },

    subtitle: {
        fontSize: 15,
        color: "rgba(255,255,255,0.75)",
        lineHeight: 22,
        marginBottom: 24,
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: theme.colors.secondary,
        marginBottom: 10,
        marginTop: 4,
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },

    reasonList: {
        marginBottom: 18,
    },

    reasonButton: {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderRadius: 14,
        paddingVertical: 13,
        paddingHorizontal: 14,
        marginBottom: 10,
    },

    reasonButtonSelected: {
        backgroundColor: "rgba(255,122,0,0.14)",
        borderColor: theme.colors.secondary,
    },

    reasonButtonText: {
        color: theme.colors.textOnDark,
        fontSize: 15,
        fontWeight: "700",
    },

    reasonButtonTextSelected: {
        color: theme.colors.secondary,
    },

    input: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 12,
        minHeight: 120,
        textAlignVertical: "top",
        marginBottom: 10,
        color: "#222222",
    },

    helperText: {
        fontSize: 13,
        color: "rgba(255,255,255,0.68)",
        marginBottom: 16,
        lineHeight: 19,
    },

    submitButton: {
        backgroundColor: theme.colors.primary,
        padding: 14,
        borderRadius: 14,
        alignItems: "center",
        marginBottom: 10,
    },

    submitButtonText: {
        color: "#FFFFFF",
        fontWeight: "800",
        fontSize: 16,
    },

    disabledButton: {
        opacity: 0.7,
    },

    backButton: {
        marginTop: 10,
        backgroundColor: "#D9D9D9",
        padding: 14,
        borderRadius: 14,
        alignItems: "center",
    },

    backButtonText: {
        color: "#222222",
        fontWeight: "700",
        fontSize: 16,
    },
});