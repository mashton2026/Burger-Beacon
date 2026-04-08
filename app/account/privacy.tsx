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
        title: "What Data We Collect",
        content: [
            "We may collect account information such as email address and login details.",
            "We may collect vendor listing data such as business names, locations, menus, schedules, photos, and related listing content.",
            "We may collect usage data such as favourites, ratings, views, directions, and in-app interactions.",
            "We may collect community-spotted listing data such as van names, cuisine details, location details, and other information submitted by users.",
            "We may collect information you submit in reports, claim requests, support messages, account deletion requests, ratings, and other user or vendor submissions.",
            "If enabled, we may collect approximate or device location data to improve map and discovery features.",
        ],
    },
    {
        title: "How We Use Data",
        content: [
            "To operate, maintain, and improve the BiteBeacon platform.",
            "To allow users to discover vendors and interact with listings.",
            "To allow vendors to manage listings, subscriptions, and related tools.",
            "To support account security, fraud prevention, moderation, and platform integrity.",
            "To review reports, ownership claims, moderation issues, account deletion requests, and other platform safety or administrative requests.",
            "To respond to support requests and business enquiries.",
        ],
    },
    {
        title: "Legal Basis (UK GDPR)",
        content: [
            "We process personal data under one or more lawful bases.",
            "These may include contract, where processing is needed to provide BiteBeacon services.",
            "These may include legitimate interests, where processing is reasonably necessary to operate, improve, and protect the platform.",
            "These may include consent, where you choose to allow features such as location access.",
            "We may also process data where required to comply with legal obligations.",
        ],
    },
    {
        title: "Location Data",
        content: [
            "BiteBeacon may request access to your location to show relevant nearby vendors and improve discovery features.",
            "We may also process location-related interaction data where needed for map features, discovery tools, analytics, or vendor insight functionality.",
            "You can refuse or disable location permissions through your device settings.",
            "If location access is disabled, some features may be less accurate or less useful.",
        ],
    },
    {
        title: "Vendor Listings & Community-Spotted Listings",
        content: [
            "Vendor listings may contain information submitted or managed by vendors.",
            "Some listings may begin as community-spotted listings before being claimed by a vendor.",
            "Community-spotted listings may be temporary and may not always be fully accurate or complete.",
        ],
    },
    {
        title: "Payments & Subscription Data",
        content: [
            "Paid vendor subscriptions or billing features may be handled by third-party providers such as Stripe.",
            "We do not store full payment card details directly inside the app.",
            "We may store limited subscription and billing-related information needed to manage access to paid features.",
        ],
    },
    {
        title: "Third-Party Services",
        content: [
            "We may use trusted third-party providers to support the BiteBeacon platform.",
            "These may include providers for hosting, authentication, storage, maps, analytics, notifications, and payments.",
            "We currently use or may use third-party providers such as Supabase for backend services and Stripe for subscription and payment processing.",
            "Where these providers process data on our behalf, we expect them to do so appropriately and securely.",
        ],
    },
    {
        title: "Data Sharing",
        content: [
            "We do not sell your personal data.",
            "We may share limited data with service providers where necessary to operate the platform.",
            "We may disclose data where required by law, regulation, court order, or to protect rights, safety, users, or the platform.",
        ],
    },
    {
        title: "Data Retention",
        content: [
            "We retain personal data only for as long as reasonably necessary for the purposes described in this policy.",
            "This may include maintaining accounts, supporting listings, handling subscriptions, resolving disputes, preventing abuse, and meeting legal obligations.",
            "Retention periods may vary depending on the type of data and why it was collected.",
        ],
    },
    {
        title: "Your Rights",
        content: [
            "Depending on applicable law, you may have the right to request access to your personal data.",
            "You may have the right to request correction of inaccurate data.",
            "You may have the right to request deletion of personal data in some circumstances.",
            "You may have the right to object to certain processing or request restriction of processing.",
            "You may have the right to request a copy of certain personal data.",
            "You may also have the right to complain to the UK Information Commissioner's Office (ICO) if you believe your data has been handled improperly.",
            `To make a privacy request, contact ${CONTACT_EMAIL}.`,
        ],
    },
    {
        title: "Security",
        content: [
            "We take reasonable technical and organisational steps to protect data.",
            "However, no online service can guarantee absolute security, and you use the platform with that understanding.",
        ],
    },
    {
        title: "Children",
        content: [
            "BiteBeacon is not intended for children under 13.",
            "If we become aware that personal data has been collected from a child inappropriately, we may remove that data where appropriate.",
            "If you are a parent or guardian and believe a child has provided personal data to BiteBeacon, please contact us.",
        ],
    },
    {
        title: "Changes to This Policy",
        content: [
            "We may update this privacy policy from time to time.",
            "When updates are made, the current version shown in the app will apply from its effective date.",
        ],
    },
    {
        title: "Contact",
        content: [
            `If you have questions about this privacy policy or your data, contact ${CONTACT_EMAIL}.`,
        ],
    },
];

function SectionCard({ section }: { section: Section }) {
    const [open, setOpen] = useState(false);

    return (
        <View style={styles.card}>
            <Pressable style={styles.header} onPress={() => setOpen(!open)}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.icon}>{open ? "−" : "+"}</Text>
            </Pressable>

            {open ? (
                <View style={styles.body}>
                    {section.content.map((line, i) => (
                        <Text key={i} style={styles.text}>
                            • {line}
                        </Text>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

export default function PrivacyScreen() {
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.kicker}>LEGAL</Text>
            <Text style={styles.mainTitle}>Privacy Policy</Text>
            <Text style={styles.subtitle}>
                This policy explains how BiteBeacon collects, uses, and protects your
                data.
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
        letterSpacing: 1.2,
        marginBottom: 6,
    },
    mainTitle: {
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
    text: {
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