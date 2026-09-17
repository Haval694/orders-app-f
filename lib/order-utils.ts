import type { Order, OrderStatus } from "./order-store";

export function calculateFinalAmount(productPrice: number, deliveryFee: number) {
  return Math.max(0, productPrice - deliveryFee);
}

export function ordersForMonth(orders: Order[], monthId: string | null) {
  return orders.filter((order) => order.monthId === monthId);
}

export function countOrdersByStatus(orders: Order[], monthId: string | null) {
  const monthOrders = ordersForMonth(orders, monthId);
  return {
    remaining: monthOrders.filter((order) => order.status === "ماوەیە").length,
    driver: monthOrders.filter((order) => order.status === "لە لای شۆفێرە").length,
    delivered: monthOrders.filter((order) => order.status === "گەیشتووە").length,
  } satisfies Record<"remaining" | "driver" | "delivered", number>;
}

export function sumFinalAmountsByStatus(orders: Order[], monthId: string | null) {
  const monthOrders = ordersForMonth(orders, monthId);
  return {
    remaining: monthOrders.filter((order) => order.status === "ماوەیە").reduce((sum, order) => sum + order.finalAmount, 0),
    driver: monthOrders.filter((order) => order.status === "لە لای شۆفێرە").reduce((sum, order) => sum + order.finalAmount, 0),
    delivered: monthOrders.filter((order) => order.status === "گەیشتووە").reduce((sum, order) => sum + order.finalAmount, 0),
  } satisfies Record<"remaining" | "driver" | "delivered", number>;
}

export function statusColorKey(status: OrderStatus) {
  if (status === "گەیشتووە") return "success";
  if (status === "لە لای شۆفێرە") return "primary";
  return "warning";
}
