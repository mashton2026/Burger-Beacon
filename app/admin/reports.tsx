import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
  getAllVendorReports,
  updateVendorReportStatus,
  type VendorReport,
} from "../../services/reportService";
import { getAllVendors, suspendVendor } from "../../services/vendorService";
import { type Van } from "../../types/van";

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<VendorReport[]>([]);
  const [vendors, setVendors] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [selectedReasonFilter, setSelectedReasonFilter] = useState<
    VendorReport["reason"] | "all" | "high_risk"
  >("all");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setLoading(true);

    try {
      const [reportData, vendorData] = await Promise.all([
        getAllVendorReports(),
        getAllVendors(),
      ]);

      setReports(reportData);
      setVendors(vendorData);
    } catch (error) {
      Alert.alert(
        "Load failed",
        error instanceof Error ? error.message : "Unknown error"
      );
      setReports([]);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }

  function getVendorName(vendorId: string) {
    const match = vendors.find((v) => v.id === vendorId);
    return match?.name ?? "Unknown vendor";
  }

  function getVendorReportCount(vendorId: string) {
    return reports.filter((report) => report.vendor_id === vendorId).length;
  }

  function isVendorSuspended(vendorId: string) {
    const match = vendors.find((v) => v.id === vendorId);
    return !!match?.isSuspended;
  }

  function getVendorTier(vendorId: string) {
    const match = vendors.find((v) => v.id === vendorId);
    return (match?.subscriptionTier ?? "free").toUpperCase();
  }

  function getVendorClaimState(vendorId: string) {
    const match = vendors.find((v) => v.id === vendorId);
    return match?.owner_id ? "Claimed" : "Unclaimed";
  }

  function getVendorListingType(vendorId: string) {
    const match = vendors.find((v) => v.id === vendorId);

    if (!match) return "Unknown";
    if (match.temporary || match.listingSource === "user_spotted") {
      return "Community Spotted";
    }

    return "Vendor Listing";
  }

  function getVendorLiveState(vendorId: string) {
    const match = vendors.find((v) => v.id === vendorId);

    if (!match) return "Unknown";
    return match.isLive ? "Live" : "Offline";
  }

  function getVendorCuisine(vendorId: string) {
    const match = vendors.find((v) => v.id === vendorId);
    return match?.cuisine ?? "Unknown";
  }

  function getHighRiskVendorCount() {
    return Array.from(new Set(reports.map((report) => report.vendor_id))).filter(
      (vendorId) => getVendorReportCount(vendorId) >= 3
    ).length;
  }

  function getFilteredReports() {
    if (selectedReasonFilter === "all") {
      return reports;
    }

    if (selectedReasonFilter === "high_risk") {
      return reports.filter(
        (report) => getVendorReportCount(report.vendor_id) >= 3
      );
    }

    return reports.filter((report) => report.reason === selectedReasonFilter);
  }

  async function handleResolve(reportId: string) {
    if (processingId) return;

    const adminNote = adminNotes[reportId]?.trim() ?? "";

    if (!adminNote) {
      Alert.alert(
        "Admin note required",
        "Please add an admin note before resolving a report."
      );
      return;
    }

    setProcessingId(reportId);

    try {
      await updateVendorReportStatus({
        reportId,
        status: "resolved",
        adminNote,
      });

      Alert.alert("Success", "Report resolved");
      await loadData();
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDismiss(reportId: string) {
    if (processingId) return;

    const adminNote = adminNotes[reportId]?.trim() ?? "";

    if (!adminNote) {
      Alert.alert(
        "Admin note required",
        "Please add an admin note before dismissing a report."
      );
      return;
    }

    setProcessingId(reportId);

    try {
      await updateVendorReportStatus({
        reportId,
        status: "dismissed",
        adminNote,
      });

      Alert.alert("Success", "Report dismissed");
      await loadData();
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleSuspendFromReport(reportId: string, vendorId: string) {
    if (processingId) return;

    const adminNote = adminNotes[reportId]?.trim() ?? "";

    if (!adminNote) {
      Alert.alert(
        "Admin note required",
        "Please add an admin note before suspending a vendor from a report."
      );
      return;
    }

    setProcessingId(reportId);

    try {
      await suspendVendor(vendorId, adminNote);

      await updateVendorReportStatus({
        reportId,
        status: "resolved",
        adminNote,
      });

      Alert.alert("Success", "Vendor suspended and report resolved.");
      await loadData();
    } catch (error) {
      Alert.alert(
        "Suspend failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setProcessingId(null);
    }
  }

  function renderItem({ item }: { item: VendorReport }) {
    const isProcessing = processingId === item.id;
    const isAnyProcessing = processingId !== null;
    const reportCount = getVendorReportCount(item.vendor_id);
    const isHighRisk = reportCount >= 3;

    return (
      <View style={[styles.card, isHighRisk && styles.highRiskCard]}>
        <Text style={styles.vendorName}>{getVendorName(item.vendor_id)}</Text>

        <Text style={styles.meta}>
          Reason:{" "}
          {item.reason
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())}
        </Text>

        <Text style={styles.meta}>
          Reported: {new Date(item.created_at).toLocaleString()}
        </Text>

        <Text style={styles.meta}>
          Total reports for this vendor: {reportCount}
        </Text>

        <Text
          style={[
            styles.vendorStateText,
            isVendorSuspended(item.vendor_id)
              ? styles.vendorStateSuspended
              : styles.vendorStateActive,
          ]}
        >
          {isVendorSuspended(item.vendor_id)
            ? "Vendor status: Suspended"
            : "Vendor status: Active"}
        </Text>

        <Text style={styles.meta}>
          Vendor tier: {getVendorTier(item.vendor_id)}
        </Text>

        <Text style={styles.meta}>
          Claim state: {getVendorClaimState(item.vendor_id)}
        </Text>

        <Text style={styles.meta}>
          Listing type: {getVendorListingType(item.vendor_id)}
        </Text>

        <Text style={styles.meta}>
          Live state: {getVendorLiveState(item.vendor_id)}
        </Text>

        <Text style={styles.meta}>
          Cuisine: {getVendorCuisine(item.vendor_id)}
        </Text>

        {isHighRisk ? (
          <Text style={styles.highRiskText}>
            High-risk vendor: this listing has been reported 3 or more times.
          </Text>
        ) : null}

        {item.details ? <Text style={styles.details}>{item.details}</Text> : null}

        <Pressable
          style={styles.openVendorButton}
          onPress={() =>
            router.push({
              pathname: "/admin/edit-vendor",
              params: { id: item.vendor_id },
            })
          }
        >
          <Text style={styles.openVendorButtonText}>Open Vendor</Text>
        </Pressable>

        <Pressable
          style={styles.viewListingButton}
          onPress={() =>
            router.push({
              pathname: "/vendor/[id]",
              params: { id: item.vendor_id },
            })
          }
        >
          <Text style={styles.viewListingButtonText}>View Listing</Text>
        </Pressable>

        <Text style={styles.meta}>Admin note</Text>

        <TextInput
          style={styles.input}
          placeholder="Add decision note"
          placeholderTextColor="#7A7A7A"
          value={adminNotes[item.id] ?? ""}
          onChangeText={(text) =>
            setAdminNotes((current) => ({
              ...current,
              [item.id]: text,
            }))
          }
        />

        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.button,
              styles.resolveButton,
              isAnyProcessing && !isProcessing && styles.buttonDisabled,
            ]}
            onPress={() =>
              Alert.alert(
                "Resolve report?",
                "This will mark the report as resolved.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Resolve",
                    onPress: () => handleResolve(item.id),
                  },
                ]
              )
            }
            disabled={isAnyProcessing}
          >
            <Text style={styles.buttonText}>
              {isProcessing ? "Working..." : "Resolve"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.dismissButton,
              isAnyProcessing && !isProcessing && styles.buttonDisabled,
            ]}
            onPress={() =>
              Alert.alert(
                "Dismiss report?",
                "This will mark the report as dismissed.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Dismiss",
                    style: "destructive",
                    onPress: () => handleDismiss(item.id),
                  },
                ]
              )
            }
            disabled={isAnyProcessing}
          >
            <Text style={styles.buttonText}>Dismiss</Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.suspendButtonFull,
            isVendorSuspended(item.vendor_id) && styles.buttonDisabled,
            isAnyProcessing && !isProcessing && styles.buttonDisabled,
          ]}
          onPress={() => {
            if (isVendorSuspended(item.vendor_id)) {
              Alert.alert(
                "Already suspended",
                "This vendor is already suspended."
              );
              return;
            }

            Alert.alert(
              "Suspend vendor?",
              "This will suspend the vendor and resolve this report.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Suspend",
                  style: "destructive",
                  onPress: () =>
                    handleSuspendFromReport(item.id, item.vendor_id),
                },
              ]
            );
          }}
          disabled={isAnyProcessing}
        >
          <Text style={styles.buttonText}>
            {isVendorSuspended(item.vendor_id)
              ? "Vendor Already Suspended"
              : isProcessing
                ? "Working..."
                : "Suspend Vendor"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>ADMIN</Text>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtitle}>
        Review and moderate user-submitted reports.
      </Text>

      <View style={styles.reasonSummary}>
        <Pressable
          style={[
            styles.reasonChip,
            selectedReasonFilter === "all" && styles.reasonChipActive,
          ]}
          onPress={() => setSelectedReasonFilter("all")}
        >
          <Text
            style={[
              styles.reasonChipText,
              selectedReasonFilter === "all" && styles.reasonChipTextActive,
            ]}
          >
            all ({reports.length})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.reasonChip,
            selectedReasonFilter === "high_risk" && styles.reasonChipActive,
          ]}
          onPress={() => setSelectedReasonFilter("high_risk")}
        >
          <Text
            style={[
              styles.reasonChipText,
              selectedReasonFilter === "high_risk" && styles.reasonChipTextActive,
            ]}
          >
            high risk ({getHighRiskVendorCount()})
          </Text>
        </Pressable>

        {[
          "fake_listing",
          "incorrect_details",
          "wrong_location",
          "abusive_content",
          "spam",
          "other",
        ].map((reason) => {
          const count = reports.filter((r) => r.reason === reason).length;

          if (count === 0) return null;

          return (
            <Pressable
              key={reason}
              style={[
                styles.reasonChip,
                selectedReasonFilter === reason && styles.reasonChipActive,
              ]}
              onPress={() =>
                setSelectedReasonFilter(reason as VendorReport["reason"])
              }
            >
              <Text
                style={[
                  styles.reasonChipText,
                  selectedReasonFilter === reason &&
                  styles.reasonChipTextActive,
                ]}
              >
                {reason.replace(/_/g, " ")} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summaryCardsRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Open Reports</Text>
          <Text style={styles.summaryCardValue}>{reports.length}</Text>
        </View>

        <View style={styles.highRiskSummaryCard}>
          <Text style={styles.highRiskSummaryLabel}>High-Risk Vendors</Text>
          <Text style={styles.highRiskSummaryValue}>
            {getHighRiskVendorCount()}
          </Text>
        </View>
      </View>

      {loading ? (
        <Text style={styles.helper}>Loading reports...</Text>
      ) : (
        <>
          <Text style={styles.activeFilterText}>
            Viewing:{" "}
            {selectedReasonFilter === "all"
              ? "all reports"
              : selectedReasonFilter === "high_risk"
                ? "high risk vendors"
                : selectedReasonFilter.replace(/_/g, " ")}
          </Text>

          <FlatList
            data={getFilteredReports()}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.helper}>
                {selectedReasonFilter === "all"
                  ? "No reports found."
                  : selectedReasonFilter === "high_risk"
                    ? "No high risk vendors found."
                    : `No ${selectedReasonFilter.replace(/_/g, " ")} reports found.`}
              </Text>
            }
          />
        </>
      )}

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  activeFilterText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    marginBottom: 12,
  },

  summaryCardsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  summaryCardLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  summaryCardValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  highRiskSummaryCard: {
    flex: 1,
    backgroundColor: "rgba(198,40,40,0.16)",
    borderWidth: 1.5,
    borderColor: "#C62828",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  highRiskSummaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFB3B3",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  highRiskSummaryValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  reasonSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  reasonChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  reasonChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  reasonChipActive: {
    backgroundColor: theme.colors.primary,
  },

  reasonChipTextActive: {
    color: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
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
    marginBottom: 20,
  },

  helper: {
    color: "rgba(255,255,255,0.7)",
    marginBottom: 20,
  },

  list: {
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

  highRiskCard: {
    borderColor: "#C62828",
    borderWidth: 3,
  },

  vendorName: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.background,
    marginBottom: 6,
  },

  meta: {
    fontSize: 14,
    color: "#444",
    marginBottom: 6,
  },

  highRiskText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#C62828",
    marginBottom: 8,
  },

  vendorStateText: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },

  vendorStateActive: {
    color: "#1DB954",
  },

  vendorStateSuspended: {
    color: "#C62828",
  },

  details: {
    fontSize: 14,
    color: "#222",
    marginBottom: 10,
  },

  openVendorButton: {
    alignSelf: "flex-start",
    backgroundColor: "#0B2A5B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },

  openVendorButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  viewListingButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FF7A00",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },

  viewListingButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    color: "#222",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },

  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  resolveButton: {
    backgroundColor: "#1DB954",
  },

  dismissButton: {
    backgroundColor: "#C62828",
  },

  suspendButtonFull: {
    marginTop: 10,
    backgroundColor: "#C62828",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
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