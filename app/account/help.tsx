import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { theme } from "../../constants/theme";

const SUPPORT_EMAIL = "support@bitebeacon.uk";

type FAQItem = {
    category:
    | "Getting Started"
    | "Map & Discovery"
    | "Accounts"
    | "Vendors"
    | "Billing"
    | "Support";
    title: string;
    content: string[];
};

const FAQ_ITEMS: FAQItem[] = [
    {
        category: "Getting Started",
        title: "What is BiteBeacon?",
        content: [
            "BiteBeacon helps people discover street food vendors, burger vans, and food trucks nearby.",
            "The app combines vendor-managed listings with community spotting to build a stronger local food map.",
        ],
    },
    {
        category: "Getting Started",
        title: "How do I use the app?",
        content: [
            "Use the map to explore nearby vendors.",
            "Tap a vendor to open its listing, view details, check menus, get directions, save favourites, and leave ratings.",
            "Some features work without an account, while others require login.",
        ],
    },
    {
        category: "Getting Started",
        title: "Do I need an account?",
        content: [
            "No. You can browse the app without an account.",
            "Creating an account unlocks features such as favourites, ratings, and account-based tools.",
        ],
    },
    {
        category: "Accounts",
        title: "Forgot password",
        content: [
            "Use the reset option on the login screen.",
            "A password reset email can be sent to the account email address.",
        ],
    },
    {
        category: "Accounts",
        title: "User accounts and vendor accounts",
        content: [
            "BiteBeacon supports both standard user accounts and vendor accounts.",
            "User accounts are for discovery, favourites, and ratings.",
            "Vendor accounts are for claiming and managing listings.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "How the map works",
        content: [
            "The map shows vendors based on your current location and the visible map area.",
            "Zoom and position affect which listings are easiest to see.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "What does Spot a Van mean?",
        content: [
            "Spot a Van allows users to add a vendor to the map when that vendor is not already listed.",
            "This helps BiteBeacon grow faster and makes local food discovery better for everyone.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "How long does a spotted van stay listed?",
        content: [
            "Community-spotted vans are temporary.",
            "They are generally intended to remain visible for around 7 days unless claimed or otherwise managed within the platform.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "What does Live mean?",
        content: [
            "A live vendor is actively marked as serving right now.",
            "Live status helps users quickly find vendors that are available in real time.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "Why might a vendor not appear?",
        content: [
            "A vendor may not appear if it is outside your current map view, not currently live, expired as a temporary spotted listing, or otherwise unavailable.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "How accurate are listings?",
        content: [
            "Some listings are managed directly by vendors, while others may begin as community-spotted listings.",
            "Vendor-managed listings are usually more up to date than community-spotted listings, but details can still change.",
            "Details such as location, timing, menu items, and live status may change, so users should always use their own judgment before travelling.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "What do views mean?",
        content: [
            "Views show how many times a vendor listing has been opened.",
            "To help prevent misuse, repeated views in a short period may not always be counted again immediately.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "What do directions mean?",
        content: [
            "Directions show how many times users have requested navigation to that vendor.",
            "This helps vendors understand real visit intent and listing engagement.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "How do ratings work?",
        content: [
            "Users can rate vendors using a star rating system.",
            "Ratings are averaged and may only be shown once enough ratings exist to make the display fair and more reliable.",
        ],
    },
    {
        category: "Map & Discovery",
        title: "How do favourites work?",
        content: [
            "Users can save vendors to favourites for easier access later.",
            "Favourites are tied to the logged-in user account.",
        ],
    },
    {
        category: "Vendors",
        title: "How do vendor listings work?",
        content: [
            "Vendors can manage listing details such as business name, cuisine, menu, schedule, photos, and visibility.",
            "Some listing tools depend on subscription tier.",
        ],
    },
    {
        category: "Vendors",
        title: "Can vendors claim community-spotted vans?",
        content: [
            "Yes. Vendors can claim eligible spotted listings and take control of them.",
            "Once claimed, the listing can be managed directly by the vendor.",
        ],
    },
    {
        category: "Vendors",
        title: "What happens when a subscription changes?",
        content: [
            "If a vendor downgrades or cancels a paid plan, current paid features remain active until the end of the current billing period.",
            "After that, unsupported features may be disabled and the listing will operate under the lower tier rules.",
            "Vendor listing data is not automatically deleted purely because of a downgrade.",
        ],
    },
    {
        category: "Vendors",
        title: "Can a vendor be suspended?",
        content: [
            "Yes. BiteBeacon may suspend or restrict listings where needed for moderation, platform integrity, safety, or policy reasons.",
        ],
    },
    {
        category: "Billing",
        title: "How are subscriptions processed?",
        content: [
            "Vendor subscriptions are processed securely through Stripe.",
            "BiteBeacon does not store full payment card details directly in the app.",
        ],
    },
    {
        category: "Billing",
        title: "Do subscriptions renew automatically?",
        content: [
            "Yes, subscriptions generally renew automatically unless cancelled.",
            "Vendors should review and manage billing carefully.",
        ],
    },
    {
        category: "Billing",
        title: "Are payments refundable?",
        content: [
            "Payments are generally non-refundable.",
            "If you believe there has been a billing error, please contact support and it can be reviewed.",
        ],
    },
    {
        category: "Support",
        title: "How do I contact support?",
        content: [
            `Support email: ${SUPPORT_EMAIL}`,
            "Please include as much useful detail as possible, such as the issue, the screen you were on, and whether you were using the app as a guest, user, or vendor.",
            "Support response times can vary depending on request volume.",
        ],
    },

    {
        category: "Support",
        title: "Report an issue",
        content: [
            "If something is not working correctly, you can report it directly to support.",
            "This opens your email app with a pre-filled issue template to make reporting easier.",
            "Please do not include sensitive payment information in support emails.",
        ],
    },
    {
        category: "Support",
        title: "What should I contact support about?",
        content: [
            "Account access or login issues",
            "Vendor listing problems",
            "Subscription or billing questions",
            "Community spotted van concerns",
            "General BiteBeacon support",
        ],
    },
];

function FAQCard({ item }: { item: FAQItem }) {
    const [open, setOpen] = useState(false);

    return (
        <View style={styles.faqCard}>
            <Pressable style={styles.faqHeader} onPress={() => setOpen((current) => !current)}>
                <Text style={styles.faqTitle}>{item.title}</Text>
                <Text style={styles.faqIcon}>{open ? "−" : "+"}</Text>
            </Pressable>

            {open ? (
                <View style={styles.faqBody}>
                    {item.content.map((line, index) => (
                        <Text key={`${item.title}-${index}`} style={styles.faqText}>
                            • {line}
                        </Text>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

export default function HelpScreen() {
    const [searchQuery, setSearchQuery] = useState("");

    async function handleContactSupport() {
        const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
            "BiteBeacon Support Request"
        )}`;

        try {
            await Linking.openURL(mailtoUrl);
        } catch {
            // no-op for now
        }
    }

    async function handleReportIssue() {
        const subject = encodeURIComponent("BiteBeacon Issue Report");

        const body = encodeURIComponent(
            `Please describe the issue:\n\n` +
            `What happened:\n\n` +
            `Where did it happen (screen/vendor):\n\n` +
            `Steps to reproduce:\n\n` +
            `Device:\n\n`
        );

        const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

        try {
            await Linking.openURL(mailtoUrl);
        } catch {
            // no-op for now
        }
    }

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) return FAQ_ITEMS;

        return FAQ_ITEMS.filter((item) => {
            const inCategory = item.category.toLowerCase().includes(query);
            const inTitle = item.title.toLowerCase().includes(query);
            const inContent = item.content.some((line) =>
                line.toLowerCase().includes(query)
            );

            return inCategory || inTitle || inContent;
        });
    }, [searchQuery]);

    const groupedItems = useMemo(() => {
        const groups: Record<FAQItem["category"], FAQItem[]> = {
            "Getting Started": [],
            "Map & Discovery": [],
            Accounts: [],
            Vendors: [],
            Billing: [],
            Support: [],
        };

        filteredItems.forEach((item) => {
            groups[item.category].push(item);
        });

        return groups;
    }, [filteredItems]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.kicker}>SUPPORT</Text>
            <Text style={styles.title}>Help & FAQ</Text>
            <Text style={styles.subtitle}>
                Everything you need to know about using BiteBeacon, understanding
                listings, vendor tools, ratings, subscriptions, billing, and getting
                support.
            </Text>

            <View style={styles.searchWrap}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search help topics"
                    placeholderTextColor="#7A7A7A"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.supportHero}>
                <Text style={styles.supportHeroTitle}>Need direct help?</Text>
                <Text style={styles.supportHeroText}>
                    If you cannot find the answer here, contact BiteBeacon support and we
                    will review your issue.
                </Text>

                <View style={styles.emailBox}>
                    <Text style={styles.emailLabel}>Support Email</Text>
                    <Text style={styles.emailValue}>{SUPPORT_EMAIL}</Text>
                </View>

                <Pressable style={styles.primaryButton} onPress={handleContactSupport}>
                    <Text style={styles.primaryButtonText}>Email Support</Text>
                </Pressable>

                <Pressable style={styles.secondaryButton} onPress={handleReportIssue}>
                    <Text style={styles.secondaryButtonText}>Report an Issue</Text>
                </Pressable>

            </View>

            {(
                [
                    "Getting Started",
                    "Map & Discovery",
                    "Accounts",
                    "Vendors",
                    "Billing",
                    "Support",
                ] as FAQItem["category"][]
            ).map((category) =>
                groupedItems[category].length > 0 ? (
                    <View key={category} style={styles.categoryBlock}>
                        <Text style={styles.categoryTitle}>{category}</Text>

                        {groupedItems[category].map((item) => (
                            <FAQCard key={item.title} item={item} />
                        ))}
                    </View>
                ) : null
            )}

            {filteredItems.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>No matching help topics</Text>
                    <Text style={styles.emptyStateText}>
                        Try a different search term or contact support directly.
                    </Text>
                </View>
            ) : null}

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
        lineHeight: 22,
        color: "rgba(255,255,255,0.75)",
        marginBottom: 20,
    },

    searchWrap: {
        marginBottom: 20,
    },

    searchInput: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 2,
        borderColor: theme.colors.border,
        paddingHorizontal: 14,
        paddingVertical: 14,
        color: "#222222",
        fontSize: 15,
    },

    supportHero: {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 20,
        padding: 18,
        marginBottom: 24,
    },

    supportHeroTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: theme.colors.textOnDark,
        marginBottom: 8,
    },

    supportHeroText: {
        fontSize: 14,
        lineHeight: 21,
        color: "rgba(255,255,255,0.78)",
        marginBottom: 14,
    },

    emailBox: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 14,
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

    secondaryButton: {
        backgroundColor: "rgba(255,255,255,0.12)",
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },

    secondaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
    },

    categoryBlock: {
        marginBottom: 22,
    },

    categoryTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: theme.colors.secondary,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: 10,
    },

    faqCard: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 18,
        marginBottom: 12,
        overflow: "hidden",
    },

    faqHeader: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },

    faqTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: "800",
        color: theme.colors.textOnDark,
        lineHeight: 22,
    },

    faqIcon: {
        width: 22,
        textAlign: "center",
        fontSize: 22,
        fontWeight: "800",
        color: theme.colors.primary,
    },

    faqBody: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },

    faqText: {
        fontSize: 14,
        lineHeight: 21,
        color: "rgba(255,255,255,0.8)",
        marginBottom: 8,
    },

    emptyState: {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 18,
        padding: 18,
        marginTop: 6,
    },

    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: theme.colors.textOnDark,
        marginBottom: 6,
    },

    emptyStateText: {
        fontSize: 14,
        lineHeight: 20,
        color: "rgba(255,255,255,0.72)",
    },

    backButton: {
        marginTop: 10,
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