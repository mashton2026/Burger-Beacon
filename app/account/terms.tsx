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
                    These terms explain the core rules for using BiteBeacon.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Using BiteBeacon</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon helps users discover food vendors and helps vendors manage
                    public listings. By using the app, you agree to use the platform
                    responsibly and not misuse, disrupt, copy, interfere with, or attempt
                    to damage the service.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vendor Listings</Text>
                <Text style={styles.bodyText}>
                    Vendors are responsible for keeping their listing information accurate
                    and up to date. This includes business name, menu, pricing, location,
                    schedule, live status, photos, and promotional content displayed in
                    the app.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Community Spotted Vans</Text>
                <Text style={styles.bodyText}>
                    Some listings may be added by the community before they are officially
                    claimed by a vendor. These spotted listings may be temporary,
                    claimable, and may not always be fully accurate or current.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Listing Accuracy & Availability</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon does not guarantee that any listing, location, opening
                    time, menu item, pricing, offer, or vendor availability is fully
                    accurate at all times. Users should use their own judgment and confirm
                    details where needed before travelling or making purchasing decisions.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Accounts & Security</Text>
                <Text style={styles.bodyText}>
                    You are responsible for maintaining the security of your account,
                    login credentials, and device access. You should not share your
                    account with others or use another person’s account without
                    permission.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ratings & User Activity</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon may allow users to submit ratings and interact with vendor
                    listings. You agree not to misuse these features, including by
                    submitting misleading, abusive, manipulative, or fraudulent activity.
                    BiteBeacon may limit, remove, or moderate activity where necessary to
                    protect the platform.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subscriptions & Features</Text>
                <Text style={styles.bodyText}>
                    Some vendor tools and features depend on subscription tier. Available
                    functionality may differ between Free, Growth, and Pro plans.
                    BiteBeacon may update, improve, remove, or adjust subscription
                    features over time.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subscription Changes</Text>
                <Text style={styles.bodyText}>
                    If a vendor changes, cancels, or downgrades a subscription, the
                    current paid features remain active until the end of the current
                    billing period unless stated otherwise. After that point, the account
                    will move to the new tier and features not included in that tier may
                    be disabled or removed from active use.
                </Text>
                <Text style={styles.bodyText}>
                    BiteBeacon does not automatically delete vendor listing data solely
                    because of a downgrade.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payments & Billing</Text>
                <Text style={styles.bodyText}>
                    Paid subscriptions and related billing may be processed by third-party
                    providers such as Stripe. By subscribing, you agree to the billing terms
                    associated with your selected plan, including recurring billing where
                    applicable.
                </Text>

                <Text style={styles.bodyText}>
                    All payments are non-refundable unless required by law or approved at
                    BiteBeacon’s discretion.
                </Text>

                <Text style={styles.bodyText}>
                    If you believe there has been a billing error, you should contact
                    BiteBeacon support as soon as possible.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Suspension, Moderation & Removal</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon may suspend, restrict, edit, remove, or moderate listings,
                    accounts, content, or platform access where necessary for safety,
                    accuracy, legal compliance, platform integrity, abuse prevention, or
                    business operation.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Platform Changes</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon may improve, remove, replace, or change app features,
                    layouts, tools, pricing, subscription features, and platform
                    behaviour as the product develops.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Third-Party Services</Text>
                <Text style={styles.bodyText}>
                    BiteBeacon may rely on third-party services such as payment platforms,
                    maps, storage, authentication, and infrastructure providers. Some
                    parts of the app may therefore depend on external services outside
                    BiteBeacon’s direct control.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Limitation of Responsibility</Text>
                <Text style={styles.bodyText}>
                    To the fullest extent allowed by law, BiteBeacon is not responsible
                    for losses, inconvenience, travel decisions, missed purchases,
                    inaccurate community submissions, vendor-side errors, or third-party
                    service failures arising from the use of the platform.
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
        marginBottom: 6,
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