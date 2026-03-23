import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";

export default function PrivacyScreen() {
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerBlock}>
                <Text style={styles.kicker}>LEGAL</Text>
                <Text style={styles.title}>Privacy Policy</Text>
                <Text style={styles.subtitle}>
                    This explains the main ways BiteBeacon handles account, vendor, and
                    platform data.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Information</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon uses account information such as email address and login
                    credentials to let users and vendors securely access the app.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vendor Listing Data</Text>
                <Text style={styles.bodyText}>
                    Vendor listings may include business names, menu details, schedules,
                    live status, map locations, food categories, uploaded images, and
                    optional menu PDFs.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Usage Data</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon may store activity such as listing views, directions,
                    favourites, and vendor interactions in order to improve the app and
                    support platform features.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Community Spotted Vans</Text>
                <Text style={styles.bodyText}>
                    Community-spotted listings may include van names, cuisine details,
                    map coordinates, and optional photos submitted by users before a
                    vendor officially claims the listing.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subscription Features</Text>
                <Text style={styles.bodyText}>
                    Some vendor data is connected to subscription-based features. This may
                    include assets, live status tools, analytics, promotions, and other
                    tier-based functionality across Free, Growth, and Pro plans.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Data Handling</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon should only use the data needed to run the platform,
                    improve discovery, support vendors, maintain account security, and
                    develop the product over time.
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