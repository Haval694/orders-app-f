import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { formatOrderDate, ORDER_STATUSES, Order, OrderStatus, useOrderStore } from "@/lib/order-store";
import { calculateFinalAmount } from "@/lib/order-utils";

const EMPTY_DRAFT = { customerName: "", city: "", phone: "", secondPhone: "", productPrice: 0, deliveryFee: 0, finalAmount: 0, note: "", status: "لە لای شۆفێرە" as OrderStatus };

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}
function amountFromInput(value: string) {
  const digits = normalizeDigits(value).replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}
function formatAmount(value: number) {
  return `${Math.max(0, value).toLocaleString("en-US")} د.ع`;
}

const CITY_SUGGESTIONS = ["سلێمانی", "هەولێر", "دهۆک", "سەیدسادق", "هەڵەبجە", "هەلەبجە", "پێنجوێن", "کەرکووک", "زاخۆ", "ڕانیە", "کۆیە", "کەلار", "سۆران", "شەقڵاوە", "چەمچەمال", "دووکان", "دووزخورماتوو"];

export default function OrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const { hydrated, months, orders, selectedMonthId, createOrder, updateOrder, deleteOrder } = useOrderStore();
  const selectedMonth = months.find((month) => month.id === selectedMonthId);
  const statusFilter = ORDER_STATUSES.includes(params.status as OrderStatus) ? params.status as OrderStatus : null;
  const [search, setSearch] = useState("");
  const monthOrders = useMemo(() => orders.filter((order) => {
    if (order.monthId !== selectedMonthId || (statusFilter && order.status !== statusFilter)) return false;
    const query = search.trim().toLocaleLowerCase();
    if (!query) return true;
    return [order.customerName, order.city, order.phone, order.secondPhone].some((value) => value.toLocaleLowerCase().includes(query));
  }), [orders, selectedMonthId, statusFilter, search]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const openCreate = () => { setEditing(null); setDraft(EMPTY_DRAFT); setModalVisible(true); };
  const openEdit = (order: Order) => {
    setEditing(order);
    setDraft({ customerName: order.customerName, city: order.city, phone: order.phone, secondPhone: order.secondPhone, productPrice: order.productPrice, deliveryFee: order.deliveryFee, finalAmount: order.finalAmount, note: order.note, status: order.status });
    setModalVisible(true);
  };
  const closeModal = () => setModalVisible(false);
  const saveOrder = () => {
    if (!draft.customerName.trim() || !draft.city.trim()) {
      Alert.alert("زانیاری تەواو نییە", "تکایە ناوی کڕیار و ناوی شار بنووسە.");
      return;
    }
    const finalAmount = calculateFinalAmount(draft.productPrice, draft.deliveryFee);
    const payload = { ...draft, customerName: draft.customerName.trim(), city: draft.city.trim(), phone: draft.phone.trim(), secondPhone: draft.secondPhone.trim(), note: draft.note.trim(), finalAmount };
    if (editing) updateOrder(editing.id, payload);
    else createOrder(selectedMonthId, payload);
    closeModal();
  };
  const confirmDelete = (order: Order) => Alert.alert("سڕینەوەی ئۆردەر", `دڵنیایت لە سڕینەوەی ئۆردەری ${order.customerName}؟`, [{ text: "پاشگەزبوونەوە", style: "cancel" }, { text: "سڕینەوە", style: "destructive", onPress: () => deleteOrder(order.id) }]);
  const setAmount = (field: "productPrice" | "deliveryFee", value: string) => setDraft((current) => { const next = { ...current, [field]: amountFromInput(value) }; return { ...next, finalAmount: calculateFinalAmount(next.productPrice, next.deliveryFee) }; });
  const shareOrders = (items: Order[]) => Share.share({ title: "ئۆردەرەکان", message: items.map((order) => [
    `ژ.م: ${[order.phone, order.secondPhone].filter(Boolean).join(" / ") || "نییە"}`,
    `ناونیشان: ${order.city}`,
    `نرخ: ${Math.max(0, order.finalAmount).toLocaleString("en-US")}`,
    `بەروار: ${formatOrderDate(order.createdAt)}`,
  ].join("\n")).join("\n\n") });
  const toggleSelected = (id: string) => setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const shareSelected = () => { const items = monthOrders.filter((order) => selectedIds.has(order.id)); if (items.length) shareOrders(items); };

  if (!hydrated) return <ScreenContainer><View style={styles.loading}><Text style={{ color: colors.muted }}>چاوەڕێ بە...</Text></View></ScreenContainer>;

  if (!selectedMonth) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={styles.emptyPage}>
          <View style={[styles.bigIcon, { backgroundColor: colors.primary + "18" }]}><MaterialIcons name="calendar-month" size={34} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>هێشتا هیچ مانگێک هەڵنەبژێردراوە</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>لە پەڕەی مانگەکان مانگێک دروست بکە، پاشان ئۆردەرەکانت تێدا زیاد بکە.</Text>
          <Pressable onPress={() => router.push("/(tabs)/months")} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>بڕۆ بۆ مانگەکان</Text></Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.page}>
        <View style={styles.pageHeader}>
          <View><Text style={[styles.pageTitle, { color: colors.foreground }]}>{statusFilter ?? "داواکاریەکان"}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{selectedMonth.name} · {monthOrders.length} ئۆردەر {statusFilter ? "· فلتەرکراو" : ""}</Text></View>
          <View style={[styles.monthMark, { backgroundColor: colors.primary + "18" }]}><MaterialIcons name="receipt-long" size={22} color={colors.primary} /></View>
        </View>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={22} color={colors.muted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="ئۆردەرەکەت بدۆزەوە بە ژمارە یان ناونیشان" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} returnKeyType="search" />
          {search ? <Pressable onPress={() => setSearch("")} hitSlop={8}><MaterialIcons name="close" size={19} color={colors.muted} /></Pressable> : null}
        </View>
        <View style={styles.selectionToolbar}><Pressable onPress={() => { setSelectMode((value) => !value); setSelectedIds(new Set()); }} style={({ pressed }) => [styles.selectButton, { backgroundColor: selectMode ? colors.primary + "18" : colors.surface, borderColor: selectMode ? colors.primary : colors.border }, pressed && styles.pressed]}><MaterialIcons name={selectMode ? "done" : "check-box"} size={18} color={selectMode ? colors.primary : colors.muted} /><Text style={{ color: selectMode ? colors.primary : colors.foreground, fontSize: 11, fontWeight: "800" }}>هەڵبژاردن</Text></Pressable>{selectMode ? <Pressable disabled={selectedIds.size === 0} onPress={shareSelected} style={({ pressed }) => [styles.shareButton, { backgroundColor: selectedIds.size ? colors.primary : colors.surface, borderColor: selectedIds.size ? colors.primary : colors.border }, pressed && styles.pressed]}><MaterialIcons name="share" size={18} color={selectedIds.size ? "#fff" : colors.muted} /><Text style={{ color: selectedIds.size ? "#fff" : colors.muted, fontSize: 11, fontWeight: "800" }}>شەیرکردن{selectedIds.size ? ` (${selectedIds.size})` : ""}</Text></Pressable> : null}</View>
        <FlatList
          data={monthOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={monthOrders.length ? styles.listContent : styles.listEmptyContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <OrderCard order={item} colors={colors} selectMode={selectMode} selected={selectedIds.has(item.id)} onToggleSelect={() => toggleSelected(item.id)} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} onStatus={(status) => updateOrder(item.id, { ...item, status, finalAmount: calculateFinalAmount(item.productPrice, item.deliveryFee) })} onShare={() => shareOrders([item])} />}
          ListEmptyComponent={<View style={styles.emptyList}><MaterialIcons name="inbox" size={32} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>هیچ ئۆردەرێک نییە</Text><Text style={[styles.emptyText, { color: colors.muted }]}>بۆ زیادکردنی یەکەم ئۆردەر، دوگمەی + دابگرە.</Text></View>}
        />
        <Pressable accessibilityLabel="زیادکردنی ئۆردەر" onPress={openCreate} style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }, pressed && styles.fabPressed]}><MaterialIcons name="add" size={30} color="#fff" /></Pressable>
      </View>
      <OrderModal visible={modalVisible} editing={Boolean(editing)} draft={draft} setDraft={setDraft} setAmount={setAmount} onClose={closeModal} onSave={saveOrder} colors={colors} />
    </ScreenContainer>
  );
}

function OrderCard({ order, colors, selectMode, selected, onToggleSelect, onEdit, onDelete, onStatus, onShare }: { order: Order; colors: ReturnType<typeof useColors>; selectMode: boolean; selected: boolean; onToggleSelect: () => void; onEdit: () => void; onDelete: () => void; onStatus: (status: OrderStatus) => void; onShare: () => void }) {
  const statusColor = order.status === "گەیشتووە" ? colors.success : order.status === "لە لای شۆفێرە" ? colors.primary : colors.warning;
  return (
    <Pressable onPress={selectMode ? onToggleSelect : onEdit} style={({ pressed }) => [styles.orderCard, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }, pressed && styles.cardPressed]}>
      <View style={styles.orderTop}>
        <View style={styles.customerBlock}>{selectMode ? <MaterialIcons name={selected ? "check-box" : "check-box-outline-blank"} size={25} color={selected ? colors.primary : colors.muted} /> : null}<View style={[styles.avatar, { backgroundColor: statusColor + "20" }]}><Text style={[styles.avatarText, { color: statusColor }]}>{order.customerName.trim().charAt(0) || "؟"}</Text></View><View><Text style={[styles.customerName, { color: colors.foreground }]}>{order.customerName}</Text><Text style={[styles.city, { color: colors.muted }]}>{order.city} {order.phone ? `· ${order.phone}` : ""}</Text><Text style={[styles.city, { color: colors.muted }]}>بەروار: {formatOrderDate(order.createdAt)}</Text></View></View>
        <View style={styles.actions}><Pressable accessibilityLabel="هاوبەشکردنی ئۆردەر" onPress={onShare} hitSlop={8} style={styles.iconButton}><MaterialIcons name="share" size={20} color={colors.primary} /></Pressable><Pressable accessibilityLabel="دەستکاریکردن" onPress={onEdit} hitSlop={8} style={styles.iconButton}><MaterialIcons name="edit" size={19} color={colors.muted} /></Pressable><Pressable accessibilityLabel="سڕینەوە" onPress={onDelete} hitSlop={8} style={styles.iconButton}><MaterialIcons name="delete-outline" size={21} color={colors.error} /></Pressable></View>
      </View>
      <View style={[styles.amountRow, { borderTopColor: colors.border }]}><Text style={[styles.amountLabel, { color: colors.muted }]}>بڕی کۆتایی</Text><Text style={[styles.amount, { color: statusColor }]}>{formatAmount(order.finalAmount)}</Text><Text style={[styles.productAmount, { color: colors.muted }]}>بەرهەم {formatAmount(order.productPrice)}</Text></View>
      <View style={styles.statusRow}>{ORDER_STATUSES.map((status) => <Pressable key={status} onPress={() => onStatus(status)} style={[styles.statusChip, { backgroundColor: order.status === status ? statusColor + "20" : colors.background, borderColor: order.status === status ? statusColor : colors.border }]}><Text style={[styles.statusChipText, { color: order.status === status ? statusColor : colors.muted }]}>{status}</Text></Pressable>)}</View>
    </Pressable>
  );
}

function OrderModal({ visible, editing, draft, setDraft, setAmount, onClose, onSave, colors }: { visible: boolean; editing: boolean; draft: typeof EMPTY_DRAFT; setDraft: React.Dispatch<React.SetStateAction<typeof EMPTY_DRAFT>>; setAmount: (field: "productPrice" | "deliveryFee", value: string) => void; onClose: () => void; onSave: () => void; colors: ReturnType<typeof useColors> }) {
  const cityMatches = draft.city.trim() ? CITY_SUGGESTIONS.filter((city) => city.toLocaleLowerCase().startsWith(draft.city.trim().toLocaleLowerCase())).slice(0, 5) : [];
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={[styles.modalCard, { backgroundColor: colors.background }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.foreground }]}>{editing ? "دەستکاریکردنی ئۆردەر" : "زیادکردنی ئۆردەر"}</Text><Pressable onPress={onClose} hitSlop={10}><MaterialIcons name="close" size={24} color={colors.muted} /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled"><FormSection title="زانیاری کڕیار" colors={colors}><Input label="ناوی کڕیار" value={draft.customerName} onChangeText={(value) => setDraft((current) => ({ ...current, customerName: value }))} colors={colors} /><View style={styles.cityGroup}><Input label="ناوی شار و ناونیشان" value={draft.city} onChangeText={(value) => setDraft((current) => ({ ...current, city: value }))} colors={colors} />{cityMatches.length > 0 ? <View style={[styles.suggestionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>{cityMatches.map((city) => <Pressable key={city} onPress={() => setDraft((current) => ({ ...current, city }))} style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}><MaterialIcons name="location-city" size={17} color={colors.primary} /><Text style={{ color: colors.foreground, fontSize: 13 }}>{city}</Text></Pressable>)}</View> : null}</View><Input label="ژمارەی کڕیار" value={draft.phone} onChangeText={(value) => setDraft((current) => ({ ...current, phone: value }))} keyboardType="phone-pad" colors={colors} /><Input label="ژمارەی دووەم" value={draft.secondPhone} onChangeText={(value) => setDraft((current) => ({ ...current, secondPhone: value }))} keyboardType="phone-pad" colors={colors} /></FormSection><FormSection title="زانیاری داواکاری" colors={colors}><Input label="نرخی بەرهەمەکان" value={draft.productPrice ? draft.productPrice.toLocaleString("en-US") : ""} onChangeText={(value) => setAmount("productPrice", value)} keyboardType="number-pad" colors={colors} /><Input label="نرخی گەیاندن" value={draft.deliveryFee ? draft.deliveryFee.toLocaleString("en-US") : ""} onChangeText={(value) => setAmount("deliveryFee", value)} keyboardType="number-pad" colors={colors} /><View style={[styles.finalBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "45" }]}><Text style={[styles.finalLabel, { color: colors.muted }]}>بڕی کۆتایی (بەرهەم − گەیاندن)</Text><Text style={[styles.finalValue, { color: colors.primary }]}>{formatAmount(calculateFinalAmount(draft.productPrice, draft.deliveryFee))}</Text></View><Input label="تێبینی" value={draft.note} onChangeText={(value) => setDraft((current) => ({ ...current, note: value }))} multiline colors={colors} /></FormSection><FormSection title="دۆخی ئۆردەر" colors={colors}><View style={styles.formStatusRow}>{ORDER_STATUSES.map((status) => <Pressable key={status} onPress={() => setDraft((current) => ({ ...current, status }))} style={[styles.formStatus, { borderColor: draft.status === status ? colors.primary : colors.border, backgroundColor: draft.status === status ? colors.primary + "15" : colors.surface }]}><Text style={{ color: draft.status === status ? colors.primary : colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center" }}>{status}</Text></Pressable>)}</View></FormSection><Pressable onPress={onSave} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.saveText}>{editing ? "پاشەکەوتکردنی گۆڕانکاری" : "زیادکردنی ئۆردەر"}</Text></Pressable></ScrollView></View></KeyboardAvoidingView></Modal>;
}

function FormSection({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) { return <View style={styles.formSection}><Text style={[styles.formSectionTitle, { color: colors.foreground }]}>{title}</Text>{children}</View>; }
function Input({ label, colors, multiline, ...props }: { label: string; colors: ReturnType<typeof useColors>; multiline?: boolean } & React.ComponentProps<typeof TextInput>) { return <View style={styles.inputGroup}><Text style={[styles.inputLabel, { color: colors.muted }]}>{label}</Text><TextInput {...props} placeholder={label} placeholderTextColor={colors.muted + "99"} multiline={multiline} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }, multiline && styles.multiline]} /></View>; }

const styles = StyleSheet.create({
  selectionToolbar: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 12 }, searchToolbar: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 }, searchBox: { minHeight: 43, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, marginBottom: 8 }, searchInput: { flex: 1, minHeight: 40, fontSize: 12, textAlign: "right" }, selectButton: { minHeight: 43, borderRadius: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9 }, shareButton: { minHeight: 43, borderRadius: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9 }, cityGroup: { position: "relative", zIndex: 5 }, suggestionBox: { borderWidth: 1, borderRadius: 12, marginTop: -6, marginBottom: 10, overflow: "hidden" }, suggestion: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#00000012" },
  page: { flex: 1, paddingHorizontal: 16 }, loading: { flex: 1, alignItems: "center", justifyContent: "center" }, pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, paddingBottom: 15 }, pageTitle: { fontSize: 24, lineHeight: 30, fontWeight: "800", textAlign: "right" }, subtitle: { marginTop: 3, fontSize: 12, textAlign: "right" }, monthMark: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }, listContent: { paddingBottom: 105, gap: 11 }, listEmptyContent: { flexGrow: 1, paddingBottom: 105 }, orderCard: { borderRadius: 18, borderWidth: 1, padding: 13, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, cardPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] }, orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, customerBlock: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }, avatar: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 18, fontWeight: "800" }, customerName: { fontSize: 15, fontWeight: "800", textAlign: "right" }, city: { fontSize: 12, marginTop: 3, textAlign: "right" }, actions: { flexDirection: "row", gap: 5 }, iconButton: { padding: 4 }, amountRow: { flexDirection: "row", alignItems: "center", gap: 9, borderTopWidth: 1, marginTop: 12, paddingTop: 11 }, amountLabel: { fontSize: 11 }, amount: { fontSize: 17, fontWeight: "800" }, productAmount: { flex: 1, fontSize: 11, textAlign: "left" }, statusRow: { flexDirection: "row", gap: 5, marginTop: 12 }, statusChip: { flex: 1, minHeight: 29, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderRadius: 9, borderWidth: 1 }, statusChipText: { fontSize: 10, fontWeight: "700", textAlign: "center" }, fab: { position: "absolute", right: 17, bottom: 22, width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowOpacity: 0.25, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 7 }, fabPressed: { transform: [{ scale: 0.94 }], opacity: 0.9 }, emptyPage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }, bigIcon: { width: 76, height: 76, borderRadius: 25, alignItems: "center", justifyContent: "center", marginBottom: 17 }, emptyTitle: { fontSize: 17, fontWeight: "800", textAlign: "center", marginTop: 10 }, emptyText: { fontSize: 13, lineHeight: 21, textAlign: "center", marginTop: 7 }, primaryButton: { borderRadius: 13, paddingHorizontal: 18, paddingVertical: 12, marginTop: 20 }, primaryButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" }, emptyList: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }, modalRoot: { flex: 1, justifyContent: "flex-end" }, modalCard: { maxHeight: "94%", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 17 }, modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 10 }, modalTitle: { fontSize: 19, fontWeight: "800", textAlign: "right" }, formContent: { paddingHorizontal: 18, paddingBottom: 30 }, formSection: { marginTop: 14 }, formSectionTitle: { fontSize: 15, fontWeight: "800", textAlign: "right", marginBottom: 10 }, inputGroup: { marginBottom: 10 }, inputLabel: { fontSize: 11, fontWeight: "600", textAlign: "right", marginBottom: 5 }, input: { minHeight: 45, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, textAlign: "right" }, multiline: { minHeight: 76, paddingTop: 11, textAlignVertical: "top" }, finalBox: { borderRadius: 14, borderWidth: 1, padding: 13, marginBottom: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, finalLabel: { fontSize: 11, textAlign: "right" }, finalValue: { fontSize: 19, fontWeight: "800" }, formStatusRow: { flexDirection: "row", gap: 6 }, formStatus: { flex: 1, borderWidth: 1, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 3 }, saveButton: { borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 22 }, saveText: { color: "#fff", fontSize: 14, fontWeight: "800" }, pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
