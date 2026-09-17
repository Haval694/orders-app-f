import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";

export const ORDER_STATUSES = ["ماوەیە", "لە لای شۆفێرە", "گەیشتووە"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Month = { id: string; name: string; monthKey?: string; createdAt: string; updatedAt: string };
export type Order = { id: string; monthId: string; customerName: string; city: string; phone: string; secondPhone: string; productPrice: number; deliveryFee: number; finalAmount: number; note: string; status: OrderStatus; createdAt: string; updatedAt: string; deletedAt?: string };
export type OrderDraft = Omit<Order, "id" | "monthId" | "createdAt" | "updatedAt" | "deletedAt">;
export type BackupPayload = { version: 2; exportedAt: string; months: Month[]; orders: Order[]; selectedMonthId: string | null };

type StoreState = { months: Month[]; orders: Order[]; trash: Order[]; selectedMonthId: string | null; hydrated: boolean };
type Action =
  | { type: "hydrate"; payload: Omit<StoreState, "hydrated"> }
  | { type: "add-month"; payload: Month }
  | { type: "update-month"; payload: Month }
  | { type: "delete-month"; payload: string }
  | { type: "select-month"; payload: string }
  | { type: "add-order"; payload: Order }
  | { type: "update-order"; payload: Order }
  | { type: "trash-order"; payload: string }
  | { type: "restore-order"; payload: string }
  | { type: "empty-trash" };

const STORAGE_KEY = "orderakan.local.v2";
const initialState: StoreState = { months: [], orders: [], trash: [], selectedMonthId: null, hydrated: false };

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "hydrate": return { ...action.payload, hydrated: true };
    case "add-month": return { ...state, months: [action.payload, ...state.months], selectedMonthId: state.selectedMonthId ?? action.payload.id };
    case "update-month": return { ...state, months: state.months.map((m) => m.id === action.payload.id ? action.payload : m) };
    case "delete-month": {
      const deleted = state.orders.filter((o) => o.monthId === action.payload).map((o) => ({ ...o, deletedAt: new Date().toISOString() }));
      const months = state.months.filter((m) => m.id !== action.payload);
      return { ...state, months, selectedMonthId: state.selectedMonthId === action.payload ? (months[0]?.id ?? null) : state.selectedMonthId, orders: state.orders.filter((o) => o.monthId !== action.payload), trash: [...deleted, ...state.trash] };
    }
    case "select-month": return { ...state, selectedMonthId: action.payload };
    case "add-order": return { ...state, orders: [action.payload, ...state.orders] };
    case "update-order": return { ...state, orders: state.orders.map((o) => o.id === action.payload.id ? action.payload : o) };
    case "trash-order": {
      const item = state.orders.find((o) => o.id === action.payload);
      return item ? { ...state, orders: state.orders.filter((o) => o.id !== action.payload), trash: [{ ...item, deletedAt: new Date().toISOString() }, ...state.trash] } : state;
    }
    case "restore-order": {
      const item = state.trash.find((o) => o.id === action.payload);
      return item ? { ...state, trash: state.trash.filter((o) => o.id !== action.payload), orders: [{ ...item, deletedAt: undefined, updatedAt: new Date().toISOString() }, ...state.orders] } : state;
    }
    case "empty-trash": return { ...state, trash: [] };
    default: return state;
  }
}

function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function isStatus(value: unknown): value is OrderStatus { return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value); }
function monthKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function monthLabel(date = new Date()) { return `مانگی ${date.getMonth() + 1} - ${date.getFullYear()}`; }

function validMonth(value: unknown): value is Month { return Boolean(value && typeof value === "object" && typeof (value as Month).id === "string" && typeof (value as Month).name === "string"); }
function validOrder(value: unknown, monthIds: Set<string>): value is Order {
  if (!value || typeof value !== "object") return false;
  const o = value as Order;
  return typeof o.id === "string" && typeof o.monthId === "string" && monthIds.has(o.monthId) && typeof o.customerName === "string" && typeof o.city === "string" && typeof o.phone === "string" && typeof o.secondPhone === "string" && typeof o.productPrice === "number" && typeof o.deliveryFee === "number" && typeof o.finalAmount === "number" && typeof o.note === "string" && isStatus(o.status) && typeof o.createdAt === "string";
}
function cleanData(value: unknown): Omit<StoreState, "hydrated"> {
  const source = (value && typeof value === "object" ? value : {}) as Partial<StoreState>;
  const months = Array.isArray(source.months) ? source.months.filter(validMonth) : [];
  const ids = new Set(months.map((m) => m.id));
  const orders = Array.isArray(source.orders) ? source.orders.filter((o) => validOrder(o, ids)) : [];
  const trash = Array.isArray(source.trash) ? source.trash.filter((o) => validOrder(o, ids)) : [];
  const selectedMonthId = typeof source.selectedMonthId === "string" && ids.has(source.selectedMonthId) ? source.selectedMonthId : (months[0]?.id ?? null);
  return { months, orders, trash, selectedMonthId };
}

type StoreContextValue = StoreState & {
  createMonth: (name: string, key?: string) => void;
  updateMonth: (id: string, name: string) => void;
  deleteMonth: (id: string) => void;
  selectMonth: (id: string) => void;
  ensureCurrentMonth: () => string;
  createOrder: (monthId: string | null, draft: OrderDraft) => void;
  updateOrder: (id: string, draft: OrderDraft) => void;
  deleteOrder: (id: string) => void;
  trashOrder: (id: string) => void;
  restoreOrder: (id: string) => void;
  emptyTrash: () => void;
  exportBackup: () => BackupPayload;
  importBackup: (payload: BackupPayload) => void;
};
const StoreContext = createContext<StoreContextValue | null>(null);
export function OrderStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const writeQueue = useRef(Promise.resolve());
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((raw) => { let parsed: unknown = null; try { parsed = raw ? JSON.parse(raw) : null; } catch {} dispatch({ type: "hydrate", payload: cleanData(parsed) }); }).catch(() => dispatch({ type: "hydrate", payload: cleanData(null) })); }, []);
  useEffect(() => { if (!state.hydrated) return; const snapshot = { months: state.months, orders: state.orders, trash: state.trash, selectedMonthId: state.selectedMonthId }; writeQueue.current = writeQueue.current.catch(() => undefined).then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))).catch(() => undefined); }, [state]);
  const createMonth = useCallback((name: string, key?: string) => { const now = new Date().toISOString(); dispatch({ type: "add-month", payload: { id: makeId("month"), name: name.trim(), monthKey: key, createdAt: now, updatedAt: now } }); }, []);
  const updateMonth = useCallback((id: string, name: string) => { const existing = state.months.find((m) => m.id === id); if (existing) dispatch({ type: "update-month", payload: { ...existing, name: name.trim(), updatedAt: new Date().toISOString() } }); }, [state.months]);
  const deleteMonth = useCallback((id: string) => dispatch({ type: "delete-month", payload: id }), []);
  const selectMonth = useCallback((id: string) => dispatch({ type: "select-month", payload: id }), []);
  const ensureCurrentMonth = useCallback(() => { const key = monthKey(); const existing = state.months.find((m) => m.monthKey === key); if (existing) { dispatch({ type: "select-month", payload: existing.id }); return existing.id; } const id = makeId("month"); const now = new Date().toISOString(); dispatch({ type: "add-month", payload: { id, name: monthLabel(), monthKey: key, createdAt: now, updatedAt: now } }); return id; }, [state.months]);
  useEffect(() => { if (state.hydrated && !state.months.some((m) => m.monthKey === monthKey())) ensureCurrentMonth(); }, [state.hydrated, state.months, ensureCurrentMonth]);
  const createOrder = useCallback((monthId: string | null, draft: OrderDraft) => { const actualMonthId = monthId || ensureCurrentMonth(); const now = new Date().toISOString(); dispatch({ type: "add-order", payload: { ...draft, id: makeId("order"), monthId: actualMonthId, createdAt: now, updatedAt: now } }); }, [ensureCurrentMonth]);
  const updateOrder = useCallback((id: string, draft: OrderDraft) => { const existing = state.orders.find((o) => o.id === id); if (existing) dispatch({ type: "update-order", payload: { ...existing, ...draft, updatedAt: new Date().toISOString() } }); }, [state.orders]);
  const trashOrder = useCallback((id: string) => dispatch({ type: "trash-order", payload: id }), []);
  const restoreOrder = useCallback((id: string) => dispatch({ type: "restore-order", payload: id }), []);
  const emptyTrash = useCallback(() => dispatch({ type: "empty-trash" }), []);
  const exportBackup = useCallback((): BackupPayload => ({ version: 2, exportedAt: new Date().toISOString(), months: state.months, orders: [...state.orders, ...state.trash], selectedMonthId: state.selectedMonthId }), [state]);
  const importBackup = useCallback((payload: BackupPayload) => { const cleaned = cleanData({ months: payload.months, orders: payload.orders, selectedMonthId: payload.selectedMonthId }); dispatch({ type: "hydrate", payload: { ...cleaned, trash: [] } }); }, []);
  const value = useMemo(() => ({ state, ...state, createMonth, updateMonth, deleteMonth, selectMonth, ensureCurrentMonth, createOrder, updateOrder, deleteOrder: trashOrder, trashOrder, restoreOrder, emptyTrash, exportBackup, importBackup }), [state, createMonth, updateMonth, deleteMonth, selectMonth, ensureCurrentMonth, createOrder, updateOrder, trashOrder, restoreOrder, emptyTrash, exportBackup, importBackup]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useOrderStore(): StoreContextValue { const value = useContext(StoreContext); if (!value) throw new Error("useOrderStore must be used inside OrderStoreProvider"); return value; }
export function formatOrderDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }); }
export function getMonthKey(date = new Date()) { return monthKey(date); }
