import { describe, expect, it } from "vitest";

import { calculateFinalAmount, countOrdersByStatus, ordersForMonth, sumFinalAmountsByStatus } from "../lib/order-utils";
import type { Order } from "../lib/order-store";

const makeOrder = (id: string, monthId: string, status: Order["status"]): Order => ({
  id,
  monthId,
  customerName: "کڕیار",
  city: "هەولێر",
  phone: "",
  secondPhone: "",
  productPrice: 35000,
  deliveryFee: 5000,
  finalAmount: 30000,
  note: "",
  status,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("order utilities", () => {
  it("delivery fee is deducted instantly and never makes a negative total", () => {
    expect(calculateFinalAmount(35000, 5000)).toBe(30000);
    expect(calculateFinalAmount(4000, 5000)).toBe(0);
  });

  it("keeps monthly orders completely separated", () => {
    const orders = [makeOrder("a", "month-9", "ماوەیە"), makeOrder("b", "month-10", "گەیشتووە")];
    expect(ordersForMonth(orders, "month-9").map((order) => order.id)).toEqual(["a"]);
    expect(ordersForMonth(orders, "month-10").map((order) => order.id)).toEqual(["b"]);
  });

  it("counts only statuses in the selected month", () => {
    const orders = [makeOrder("a", "month-9", "ماوەیە"), makeOrder("b", "month-9", "لە لای شۆفێرە"), makeOrder("c", "month-9", "گەیشتووە"), makeOrder("d", "month-10", "گەیشتووە")];
    expect(countOrdersByStatus(orders, "month-9")).toEqual({ remaining: 1, driver: 1, delivered: 1 });
  });

  it("sums the final amount after delivery deduction by status", () => {
    const orders = [makeOrder("a", "month-9", "لە لای شۆفێرە"), { ...makeOrder("b", "month-9", "لە لای شۆفێرە"), finalAmount: 15000 }, makeOrder("c", "month-9", "گەیشتووە")];
    expect(sumFinalAmountsByStatus(orders, "month-9")).toEqual({ remaining: 0, driver: 45000, delivered: 30000 });
  });
});
