import { router } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "../../constants/theme";

const SUPPORT_EMAIL = "support@bitebeacon.uk";

export default function HelpScreen() {
    async function handleContactSupport() {
        const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
            "BiteBeacon Support Request"
        )}`;

        const canOpen = await Linking.canOpenURL(mailtoUrl);

        if (!canOpen) {
            return;
        }

        await Linking.openURL(mailtoUrl);
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.kicker}>SUPPORT</Text>
            <Text style={styles.title}>Help & Support</Text>
            <Text style={styles.subtitle}>
                Need help with your account, vendor tools, listing issues, or anything
                else on BiteBeacon? Get in touch with the team.
            </Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact BiteBeacon</Text>
                <Text style={styles.bodyText}>
                    The fastest way to reach us right now is by email.
                </Text>

                <View style={styles.emailBox}>
                    <Text style={styles.emailLabel}>Support Email</Text>
                    <Text style={styles.emailValue}>{SUPPORT_EMAIL}</Text>
                </View>

                <Pressable style={styles.primaryButton} onPress={handleContactSupport}>
                    <Text style={styles.primaryButtonText}>Email Support</Text>
                </Pressable>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>What you can contact us about</Text>
                <Text style={styles.bodyText}>• Account access or login problems</Text>
                <Text style={styles.bodyText}>• Vendor dashboard or listing issues</Text>
                <Text style={styles.bodyText}>• Subscription or upgrade questions</Text>
                <Text style={styles.bodyText}>• Community spotted van concerns</Text>
                <Text style={styles.bodyText}>• General BiteBeacon support</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Before you email</Text>
                <Text style={styles.bodyText}>
                    Include as much detail as possible, such as the issue, the screen you
                    were on, and whether you are using the app as a guest, user, or vendor.
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
        color: "rgba(255,255,255,0.75)",
        lineHeight: 22,
        marginBottom: 24,
    },

    section: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
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
        color: "rgba(255,255,255,0.78)",
        marginBottom: 6,
    },

    emailBox: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 14,
        marginTop: 10,
        marginBottom: 14,
    },

    emailLabel: {
        fontSize: 12,
        fontWeight: "800",
        color: theme.colors.primary,
        marginBottom: 4,
        letterSpacing: 1,
    },

    emailValue: {
        fontSize: 16,
        fontWeight: "700",
        color: theme.colors.background,
    },

    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
    },

    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
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