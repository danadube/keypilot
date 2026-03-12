"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type ReportPDFData = {
  reportJson: {
    totalVisitors: number;
    representedBuyers: number;
    unrepresentedBuyers: number;
    unknownAgentStatus: number;
    followUpDraftsCreated: number;
    visitorComments: string[];
  };
  createdAt: string;
  propertyAddress?: string;
  openHouseTitle?: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  metricBox: {
    padding: 12,
    minWidth: 100,
  },
  metricLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  commentsList: {
    marginTop: 8,
  },
  commentItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    fontSize: 10,
  },
});

export function SellerReportPDF({ data }: { data: ReportPDFData }) {
  const { reportJson, createdAt, propertyAddress, openHouseTitle } = data;
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>KeyPilot — Open House Seller Report</Text>
        <Text style={styles.subtitle}>Generated {formattedDate}</Text>
        {(openHouseTitle || propertyAddress) && (
          <View style={styles.section}>
            <Text style={styles.subtitle}>
              {openHouseTitle}
              {openHouseTitle && propertyAddress ? " · " : ""}
              {propertyAddress}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metrics</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total visitors</Text>
              <Text style={styles.metricValue}>{reportJson.totalVisitors}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>With agent</Text>
              <Text style={styles.metricValue}>
                {reportJson.representedBuyers}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Without agent</Text>
              <Text style={styles.metricValue}>
                {reportJson.unrepresentedBuyers}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Unknown</Text>
              <Text style={styles.metricValue}>
                {reportJson.unknownAgentStatus}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Follow-up drafts</Text>
              <Text style={styles.metricValue}>
                {reportJson.followUpDraftsCreated}
              </Text>
            </View>
          </View>
        </View>

        {reportJson.visitorComments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visitor comments</Text>
            {reportJson.visitorComments.map((comment, i) => (
              <View key={i} style={styles.commentItem}>
                <Text>{comment}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ position: "absolute", bottom: 30, left: 40, right: 40 }}>
          <Text style={{ fontSize: 8, color: "#999" }}>
            KeyPilot — Open House Lead Capture · keypilot.app
          </Text>
        </View>
      </Page>
    </Document>
  );
}
