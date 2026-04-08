import { router } from "expo-router";
import { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { theme } from "../../constants/theme";

const COMPANY_NAME = "BITEBEACON LTD";
const COMPANY_NUMBER = "17089061";
const TRADING_NAME = "BiteBeacon";
const DIRECTOR_NAME = "Matthew Ashton";
const CONTACT_EMAIL = "support@bitebeacon.uk";
const EFFECTIVE_DATE = "Effective: March 2026";

type Section = {
    title: string;
    content: string[];
};

const SECTIONS: Section[] = [
    {
        title: "Who We Are",
        content: [
            `${TRADING_NAME} is operated by ${COMPANY_NAME}, a company registered in the United Kingdom.`,
            `Company Number: ${COMPANY_NUMBER}`,
            `Director: ${DIRECTOR_NAME}`,
            `Contact: ${CONTACT_EMAIL}`,
        ],
    },
    {
        title: "Using BiteBeacon",
        content: [
            "BiteBeacon helps users discover street food vendors and allows vendors to manage listings.",
            "You agree to use the platform lawfully and not misuse or interfere with the service.",
            "You must not use BiteBeacon for fraudulent, misleading, abusive, or unlawful activity.",
        ],
    },
    {
        title: "Accounts & Security",
        content: [
            "You are responsible for maintaining the security of your account.",
            "Do not share your account or access others' accounts without permission.",
            "We may restrict access to protect users and the platform.",
        ],
    },
    {
        title: "Vendor Listings",
        content: [
            "Vendors are responsible for keeping their listing information accurate.",
            "This includes menus, pricing, location, availability, and content.",
            "Vendors must only manage listings they own or are authorised to control.",
        ],
    },
    {
        title: "Community Spotted Listings",
        content: [
            "Listings may be added by users before being claimed by vendors.",
            "These listings may be temporary and may not always be accurate.",
        ],
    },
    {
        title: "Listing Accuracy",
        content: [
            "We do not guarantee that listings are always accurate or up to date.",
            "Users should verify important details independently.",
        ],
    },
    {
        title: "Ratings & User Content",
        content: [
            "Users may submit ratings and interact with listings.",
            "Users are responsible for the accuracy and lawfulness of content they submit.",
            "Misuse, abuse, or manipulation of these features is not allowed.",
            "We may remove or moderate content where necessary.",
        ],
    },
    {
        title: "Subscriptions & Payments",
        content: [
            "Some vendor features require a paid subscription.",
            "Subscriptions may renew automatically unless cancelled.",
            "Payments are processed by third parties such as Stripe.",
            "You are responsible for managing your subscription and ensuring billing details are accurate.",
        ],
    },
    {
        title: "Subscription Changes",
        content: [
            "Changes to subscriptions take effect after the current billing period.",
            "Features may change depending on the active subscription tier.",
        ],
    },
    {
        title: "Intellectual Property",
        content: [
            "All rights in BiteBeacon belong to BITEBEACON LTD.",
            "You may not copy, reproduce, or reverse engineer the app.",
        ],
    },
    {
        title: "Third-Party Services",
        content: [
            "The app relies on services such as maps, hosting, and payments.",
            "We are not responsible for failures of third-party services.",
        ],
    },
    {
        title: "Limitation of Liability",
        content: [
            "We are not liable for indirect losses or damages from using the app.",
            "We are not responsible for decisions made based on vendor listings, including travel, purchases, or interactions.",
            "Nothing excludes liability where it would be unlawful to do so.",
        ],
    },
    {
        title: "Suspension & Termination",
        content: [
            "We may suspend, restrict, or remove accounts, listings, or access when necessary.",
            "This may happen for moderation, safety, suspected misuse, policy breaches, or platform integrity reasons.",
            "You may stop using the app at any time.",
        ],
    },
    {
        title: "Changes to the Service",
        content: [
            "We may update or change features as BiteBeacon evolves.",
        ],
    },
    {
        title: "Changes to These Terms",
        content: [
            "We may update these terms from time to time.",
            "Continued use means you accept the updated terms.",
        ],
    },
    {
        title: "Governing Law",
        content: [
            "These terms are governed by the laws of England and Wales.",
        ],
    },
    {
        title: "Contact",
        content: [
            `For support or legal enquiries, contact ${CONTACT_EMAIL}.`,
        ],
    },
];

function SectionCard({ section }: { section: Section }) {
    const [open, setOpen] = useState(false);

    return (
        <View style={styles.card}>
            <Pressable style={styles.header} onPress={() => setOpen((current) => !current)}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.icon}>{open ? "−" : "+"}</Text>
            </Pressable>

            {open ? (
                <View style={styles.body}>
                    {section.content.map((line, index) => (
                        <Text key={`${section.title}-${index}`} style={styles.bodyText}>
                            • {line}
                        </Text>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

export default function TermsScreen() {
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.kicker}>LEGAL</Text>
            <Text style={styles.title}>Terms & Conditions</Text>
            <Text style={styles.subtitle}>
                These terms explain how you can use BiteBeacon.
            </Text>
            <Text style={styles.effective}>{EFFECTIVE_DATE}</Text>

            {SECTIONS.map((section) => (
                <SectionCard key={section.title} section={section} />
            ))}

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
        marginBottom: 6,
    },
    title: {
        fontSize: 30,
        fontWeight: "800",
        color: theme.colors.textOnDark,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 15,
        color: "rgba(255,255,255,0.75)",
        marginBottom: 10,
    },
    effective: {
        fontSize: 12,
        color: "rgba(255,255,255,0.5)",
        marginBottom: 20,
    },
    card: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        marginBottom: 12,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#FFFFFF",
        flex: 1,
    },
    icon: {
        fontSize: 22,
        fontWeight: "800",
        color: theme.colors.primary,
    },
    body: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    bodyText: {
        fontSize: 14,
        lineHeight: 20,
        color: "rgba(255,255,255,0.8)",
        marginBottom: 6,
    },
    backButton: {
        marginTop: 16,
        backgroundColor: "#D9D9D9",
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
    },
    backButtonText: {
        color: "#222",
        fontWeight: "700",
    },
});