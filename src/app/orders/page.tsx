"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchCustomerOrders, cancelOrder } from "@/lib/api";
import { OrderOut, OrderStatus } from "@/types";
import {
  IconLeaf,
  IconSearch,
  IconX,
  IconRefresh,
  IconBag,
  IconAlertCircle,
  IconCheck,
  IconTruck,
  IconFileText,
  IconClock,
  IconChevronDown,
  IconChevronUp,
} from "@/components/Icons";

const LIFECYCLE_STEPS: { key: OrderStatus; label: string; stepNumber: number; desc: string }[] = [
  { key: "placed", label: "Placed", stepNumber: 1, desc: "Order received in system" },
  { key: "confirmed", label: "Confirmed", stepNumber: 2, desc: "Store accepted order" },
  { key: "preparing", label: "Preparing", stepNumber: 3, desc: "Items packed & fresh-picked" },
  { key: "out_for_delivery", label: "Out for Delivery", stepNumber: 4, desc: "Courier on the way" },
  { key: "delivered", label: "Delivered", stepNumber: 5, desc: "Delivered to your doorstep" },
];

function getStatusStepIndex(status: OrderStatus): number {
  switch (status) {
    case "placed":
      return 0;
    case "confirmed":
      return 1;
    case "preparing":
      return 2;
    case "out_for_delivery":
      return 3;
    case "delivered":
      return 4;
    default:
      return -1;
  }
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoString;
  }
}

function MyOrdersContent() {
  const searchParams = useSearchParams();
  const highlightedRef = searchParams.get("ref");

  const [orders, setOrders] = useState<OrderOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [cancellingRef, setCancellingRef] = useState<string | null>(null);

  // Load orders from API
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let storedRefs: string[] = [];
      try {
        storedRefs = JSON.parse(localStorage.getItem("freshcart_recent_orders") || "[]");
      } catch {
        storedRefs = [];
      }

      if (highlightedRef && !storedRefs.includes(highlightedRef)) {
        storedRefs.unshift(highlightedRef);
      }

      let data: OrderOut[] = [];
      if (storedRefs.length > 0) {
        data = await fetchCustomerOrders({ order_references: storedRefs });
      }

      setOrders(data);

      // Auto-expand highlighted order from query param or first order
      if (highlightedRef) {
        setExpandedOrders((prev) => ({ ...prev, [highlightedRef]: true }));
      } else if (data.length > 0) {
        setExpandedOrders((prev) => ({ ...prev, [data[0].order_reference]: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order history.");
    } finally {
      setLoading(false);
    }
  }, [highlightedRef]);

  useEffect(() => {
    queueMicrotask(() => {
      loadOrders();
    });
  }, [loadOrders]);

  const toggleExpand = (ref: string) => {
    setExpandedOrders((prev) => ({ ...prev, [ref]: !prev[ref] }));
  };

  const handleCancel = async (order: OrderOut) => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel order ${order.order_reference}? Reserved inventory will be returned to stock immediately.`
    );
    if (!confirmCancel) return;

    setCancellingRef(order.order_reference);
    try {
      const updated = await cancelOrder(order.order_reference);
      setOrders((prev) =>
        prev.map((o) => (o.order_reference === updated.order_reference ? updated : o))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setCancellingRef(null);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (statusFilter === "active") {
        if (["delivered", "cancelled", "payment_failed"].includes(o.order_status)) return false;
      } else if (statusFilter === "delivered") {
        if (o.order_status !== "delivered") return false;
      } else if (statusFilter === "cancelled") {
        if (o.order_status !== "cancelled") return false;
      }

      // Search query filter across customer's verified orders
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = o.order_reference.toLowerCase().includes(q);
        const matchesName = o.customer_name.toLowerCase().includes(q);
        const matchesCity = o.delivery_city.toLowerCase().includes(q);
        return matchesRef || matchesName || matchesCity;
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <IconLeaf className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight">FreshCart</span>
              <span className="text-[10px] font-bold text-emerald-600 block -mt-1 tracking-wider uppercase">
                Customer Orders
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition"
            >
              <span>←</span> Catalogue
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Orders &amp; Delivery Tracking</h1>
            <p className="text-xs text-slate-500 mt-1">
              Track live lifecycle progress, estimated delivery windows, and item breakdowns.
            </p>
          </div>

          <button
            onClick={loadOrders}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <IconRefresh className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search your verified orders by reference (e.g. FC-...), city, or item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
            />
            <IconSearch className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Orders" },
              { id: "active", label: "In Progress" },
              { id: "delivered", label: "Delivered" },
              { id: "cancelled", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconAlertCircle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={loadOrders} className="text-rose-600 font-bold hover:underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-slate-700">Loading your order history...</p>
            <p className="text-xs text-slate-400">Fetching records from SQLite database</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <IconBag className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Orders Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery || statusFilter !== "all"
                  ? "No orders match your search or filter criteria. Try resetting filters."
                  : "You haven't placed any orders yet. Explore our farm-fresh catalog and daily essentials!"}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {(searchQuery || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <Link
                href="/"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
              >
                Browse Catalogue
              </Link>
            </div>
          </div>
        )}

        {/* Orders List */}
        {!loading && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isExpanded = !!expandedOrders[order.order_reference];
              const stepIdx = getStatusStepIndex(order.order_status);
              const isCancelled = order.order_status === "cancelled";
              const isFailed = order.order_status === "payment_failed";
              const canCancel =
                ["placed", "confirmed", "preparing"].includes(order.order_status) &&
                order.payment_status !== "paid";

              return (
                <div
                  key={order.order_reference}
                  className={`bg-white rounded-2xl border transition shadow-xs overflow-hidden ${
                    highlightedRef === order.order_reference
                      ? "border-emerald-500 ring-2 ring-emerald-100"
                      : "border-slate-200"
                  }`}
                >
                  {/* Order Card Header */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black text-slate-900">
                          {order.order_reference}
                        </span>
                        {/* Order Lifecycle Badge */}
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isCancelled
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : isFailed
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : order.order_status === "delivered"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {order.order_status.replace(/_/g, " ")}
                        </span>
                        {/* Payment Status Badge */}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            order.payment_status === "paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : order.payment_status === "failed"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          Payment: {order.payment_status.toUpperCase()} ({order.payment_method.toUpperCase()})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Placed on {formatDate(order.created_at)} • For {order.customer_name} ({order.delivery_city})
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right sm:text-right">
                        <span className="text-xs text-slate-500 block">Total Amount</span>
                        <span className="text-base font-black text-slate-900">
                          ₹{order.total_amount.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleExpand(order.order_reference)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{isExpanded ? "Hide Details" : "Track & Details"}</span>
                        {isExpanded ? <IconChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <IconChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Order Body */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 space-y-6">
                      {/* 1. Visual Order Lifecycle Progress Tracker */}
                      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <IconClock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Order Progress Timeline</span>
                          </h3>
                          {order.estimated_delivery_at && !isCancelled && order.order_status !== "delivered" && (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Estimated Arrival: {formatDate(order.estimated_delivery_at)}
                            </span>
                          )}
                        </div>

                        {/* Cancelled Banner if cancelled */}
                        {isCancelled ? (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                            <IconX className="w-4 h-4 text-rose-600 flex-shrink-0" />
                            <div>
                              <p className="font-bold">This order has been cancelled.</p>
                              <p className="text-[11px] text-rose-600 mt-0.5">
                                Cancellation completed at {order.cancelled_at ? formatDate(order.cancelled_at) : "N/A"}. Reserved inventory was returned to available stock.
                              </p>
                            </div>
                          </div>
                        ) : isFailed ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                            <IconAlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <div>
                              <p className="font-bold">Payment authorization is pending or failed.</p>
                              <p className="text-[11px] text-amber-700 mt-0.5">
                                Please visit the confirmation page to retry payment or switch to Cash on Delivery.
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* Normal 5-step Lifecycle Pipeline */
                          <div className="relative">
                            <div className="grid grid-cols-5 gap-2 text-center">
                              {LIFECYCLE_STEPS.map((step, idx) => {
                                const isCompleted = stepIdx >= idx;
                                const isCurrent = stepIdx === idx;

                                return (
                                  <div key={step.key} className="flex flex-col items-center">
                                    <div
                                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold transition ${
                                        isCompleted
                                          ? isCurrent
                                            ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm"
                                            : "bg-emerald-600 text-white"
                                          : "bg-slate-200 text-slate-400"
                                      }`}
                                    >
                                      {isCompleted && !isCurrent ? (
                                        <IconCheck className="w-4 h-4" />
                                      ) : (
                                        step.stepNumber
                                      )}
                                    </div>
                                    <span
                                      className={`text-[11px] sm:text-xs font-bold mt-2 leading-tight ${
                                        isCompleted ? "text-slate-900" : "text-slate-400"
                                      }`}
                                    >
                                      {step.label}
                                    </span>
                                    <span className="text-[9px] text-slate-400 hidden sm:block mt-0.5">
                                      {step.desc}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Simulated Delivery Tracking Section */}
                      {!isCancelled && !isFailed && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <IconTruck className="w-4 h-4 text-emerald-800" />
                              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                                Simulated Delivery Tracking
                              </h4>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-800 bg-white/80 px-2 py-0.5 rounded border border-emerald-300">
                              Demo Mode — Not Real GPS
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs text-slate-700">
                            <div className="bg-white p-3 rounded-xl border border-emerald-100">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Delivery Status
                              </span>
                              <span className="font-bold text-emerald-900 capitalize mt-0.5 block">
                                {order.delivery_status.replace(/_/g, " ")}
                              </span>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-emerald-100">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Assigned Courier
                              </span>
                              <span className="font-bold text-slate-800 mt-0.5 block">
                                {order.delivery_partner_name || "FreshCart Express (Automated Dispatch)"}
                              </span>
                              {order.delivery_partner_phone && (
                                <span className="text-[11px] text-slate-500">{order.delivery_partner_phone}</span>
                              )}
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-emerald-100">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Delivery Notes
                              </span>
                              <span className="text-slate-700 mt-0.5 block">
                                {order.delivery_notes || "Simulated hyper-local delivery from nearest store hub"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. Items Breakdown Table */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Ordered Items ({order.items.length})
                        </h4>
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 sm:px-4 flex items-center justify-between gap-4 text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-900">{item.product_name}</p>
                                <p className="text-[11px] text-slate-500">
                                  {item.product_unit} • ₹{item.unit_price.toFixed(2)} × {item.quantity}
                                </p>
                              </div>
                              <span className="font-bold text-slate-900">
                                ₹{item.subtotal.toFixed(2)}
                              </span>
                            </div>
                          ))}

                          {/* Pricing Summary */}
                          <div className="p-3 sm:px-4 bg-slate-50 space-y-1 text-xs">
                            <div className="flex justify-between text-slate-500">
                              <span>Subtotal</span>
                              <span>₹{order.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Delivery Fee</span>
                              <span>
                                {order.delivery_fee === 0 ? "FREE" : `₹${order.delivery_fee.toFixed(2)}`}
                              </span>
                            </div>
                            <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200 text-sm">
                              <span>Total Amount</span>
                              <span>₹{order.total_amount.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. Delivery Address Details */}
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-700 block mb-0.5">Delivery Destination:</span>
                        <p>{order.delivery_address}, {order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}</p>
                        {order.delivery_instructions && (
                          <p className="text-slate-500 mt-1 italic">
                            Instructions: &ldquo;{order.delivery_instructions}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* 5. Order Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <Link
                          href={`/order-confirmation?order_ref=${order.order_reference}`}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <IconFileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Order Receipt</span>
                        </Link>

                        {canCancel && (
                          <button
                            onClick={() => handleCancel(order)}
                            disabled={cancellingRef === order.order_reference}
                            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                          >
                            <IconX className="w-3.5 h-3.5 text-rose-600" />
                            <span>{cancellingRef === order.order_reference ? "Cancelling..." : "Cancel Order & Restock"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">
          Loading order history...
        </div>
      }
    >
      <MyOrdersContent />
    </Suspense>
  );
}
