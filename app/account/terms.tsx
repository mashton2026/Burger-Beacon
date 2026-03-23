import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";

export default function TermsScreen() {
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerBlock}>
                <Text style={styles.kicker}>LEGAL</Text>
                <Text style={styles.title}>Terms & Conditions</Text>
                <Text style={styles.subtitle}>
                    These terms explain the basic rules for using BiteBeacon.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Using BiteBeacon</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon helps users discover food vendors and helps vendors manage
                    public listings. By using the app, you agree to use it responsibly and
                    not misuse, disrupt, copy, or interfere with the platform.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vendor Listings</Text>
                <Text style={styles.bodyText}>
                    Vendors are responsible for keeping their listing details accurate.
                    This includes business name, menu, location, schedule, live status,
                    photos, and any promotional content shown inside the app.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Community Spotted Vans</Text>
                <Text style={styles.bodyText}>
                    Some listings may be added by the community before they are officially
                    claimed by a vendor. These spotted listings may be temporary and may
                    not always be fully accurate.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subscriptions & Features</Text>
                <Text style={styles.bodyText}>
                    Some vendor tools and features depend on subscription tier. Available
                    functionality may differ between Free, Growth, and Pro plans.
                    BiteBeacon may update or adjust subscription features over time.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Platform Changes</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon may improve, remove, or change app features, layouts, and
                    tools as the platform develops. These updates may happen to improve
                    product quality, security, moderation, or business needs.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Responsibility</Text>
                <Text style={styles.bodyText}>
                    You are responsible for maintaining the security of your account and
                    login details. You should not share your account access with others.
                </Text>
            </View>

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

    headerBlock: {
        marginBottom: 24,
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
        color: theme.colors.textOnDark,
        marginBottom: 8,
    },

    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        color: theme.colors.muted,
    },

    section: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: theme.colors.textOnDark,
        marginBottom: 8,
    },

    bodyText: {
        fontSize: 15,
        lineHeight: 22,
        color: theme.colors.muted,
    },

    backButton: {
        marginTop: 28,
        backgroundColor: "#D9D9D9",
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
    },

    backButtonText: {
        color: "#222222",
        fontSize: 16,
        fontWeight: "700",
    },
});