import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useOrderStore } from "@/lib/order-store";
import { countOrdersByStatus, sumFinalAmountsByStatus } from "@/lib/order-utils";

export default function HomeScreen() {
  const colors = useColors();
  const scheme = useColorScheme();
  const router = useRouter();
  const { hydrated, months, orders, selectedMonthId } = useOrderStore();
  const selectedMonth = months.find((month) => month.id === selectedMonthId);
  const counts = useMemo(() => countOrdersByStatus(orders, selectedMonthId), [orders, selectedMonthId]);
  const totals = useMemo(() => sumFinalAmountsByStatus(orders, selectedMonthId), [orders, selectedMonthId]);

  if (!hydrated) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require("@/assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={[styles.eyebrow, { color: colors.muted }]}>بەخێربێیت</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>ئۆردەرەکان</Text>
            </View>
          </View>
          <View style={[styles.modeBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name={scheme === "dark" ? "dark-mode" : "light-mode"} size={16} color={colors.primary} />
            <Text style={[styles.modeText, { color: colors.muted }]}>{scheme === "dark" ? "تاریک" : "ڕووناک"}</Text>
          </View>
        </View>

        <View style={[styles.offlinePill, { backgroundColor: colors.success + "18" }]}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.offlineText, { color: colors.success }]}>ئۆفلاین ـ داتا تەنها لەم ئامێرەیە</Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>دۆخی ئۆردەرەکان</Text>
          <Text style={[styles.monthCaption, { color: colors.muted }]}>{selectedMonth?.name ?? "هیچ مانگێک نییە"}</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <StatusRow icon="inventory-2" label="ماوە" value={counts.remaining} total={totals.remaining} color={colors.warning} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatusRow icon="local-shipping" label="لە لای شۆفێرە" value={counts.driver} total={totals.driver} color={colors.primary} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatusRow icon="task-alt" label="گەیشتووە" value={counts.delivered} total={totals.delivered} color={colors.success} colors={colors} />
        </View>

        {!selectedMonth && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="calendar-month" size={30} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>دەست پێ بکە بە دروستکردنی مانگ</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>لە پەڕەی مانگەکان مانگێکی نوێ زیاد بکە بۆ دەستپێکردنی کار.</Text>
            <Text onPress={() => router.push("/months")} style={[styles.link, { color: colors.primary }]}>بڕۆ بۆ مانگەکان ←</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function StatusRow({ icon, label, value, total, color, colors }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: number; total: number; color: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusIcon, { backgroundColor: color + "20" }]}><MaterialIcons name={icon} size={19} color={color} /></View>
      <View style={styles.statusInfo}>
        <Text style={[styles.statusLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.statusTotal, { color: colors.muted }]}>کۆی پارە: {formatAmount(total)}</Text>
      </View>
      <Text style={[styles.statusValue, { color }]}>{value}</Text>
    </View>
  );
}

function formatAmount(value: number) {
  return `${Math.max(0, value).toLocaleString("en-US")} د.ع`;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 46, height: 46, borderRadius: 14 },
  eyebrow: { fontSize: 12, marginBottom: 2, textAlign: "right" },
  title: { fontSize: 24, lineHeight: 29, fontWeight: "800", textAlign: "right" },
  modeBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7 },
  modeText: { fontSize: 11, fontWeight: "600" },
  offlinePill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 24 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  offlineText: { fontSize: 11, fontWeight: "600" },
  sectionHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800", textAlign: "right" },
  monthCaption: { fontSize: 12, textAlign: "left", maxWidth: 150 },
  summaryCard: { borderRadius: 20, borderWidth: 1, padding: 7, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  statusRow: { minHeight: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 11 },
  statusIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statusInfo: { flex: 1, alignItems: "flex-end" },
  statusLabel: { fontSize: 15, fontWeight: "600", textAlign: "right" },
  statusTotal: { fontSize: 11, marginTop: 3, textAlign: "right" },
  statusValue: { minWidth: 32, fontSize: 24, fontWeight: "800", textAlign: "center" },
  divider: { height: 1, marginHorizontal: 12 },
  emptyCard: { alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 22, marginTop: 18 },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginTop: 10, textAlign: "center" },
  emptyText: { fontSize: 13, lineHeight: 21, marginTop: 7, textAlign: "center" },
  link: { fontSize: 13, fontWeight: "800", marginTop: 15 },
});
