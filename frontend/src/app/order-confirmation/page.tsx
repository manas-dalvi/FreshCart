"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchOrderByReference, simulatePayment, switchOrderToCOD, cancelOrder } from "@/lib/api";
import { OrderOut } from "@/types";
import {
  IconLeaf,
  IconCheck,
  IconAlertCircle,
  IconPackage,
  IconMapPin,
  IconCreditCard,
  IconTruck,
  IconPrinter,
} from "@/components/Icons";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderRef = searchParams.get("order_ref");

  const [order, setOrder] = useState<OrderOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderRef) {
      queueMicrotask(() => {
        setError("No order reference provided. Please check your order link.");
        setLoading(false);
      });
      return;
    }

    fetchOrderByReference(orderRef)
      .then((data) => {
        setOrder(data);
        setLoading(false);
        try {
          const stored = JSON.parse(localStorage.getItem("freshcart_recent_orders") || "[]");
          if (!stored.includes(data.order_reference)) {
            stored.unshift(data.order_reference);
            localStorage.setItem("freshcart_recent_orders", JSON.stringify(stored.slice(0, 20)));
          }
        } catch {
          // Ignore localStorage errors
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load order details.");
        setLoading(false);
      });
  }, [orderRef]);

  const handleCopyReference = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.order_reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetryPayment = async (scenario: "success" | "failure") => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await simulatePayment(order.order_reference, scenario);
      setOrder(res.order);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwitchToCOD = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const updated = await switchOrderToCOD(order.order_reference);
      setOrder(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to switch to COD");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const updated = await cancelOrder(order.order_reference);
      setOrder(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Fetching verified order records from database...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <IconAlertCircle className="w-6 h-6 text-rose-600" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500">{error || "Unable to retrieve order details."}</p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
        >
          Return to Catalogue
        </Link>
      </div>
    );
  }

  const isPaid = order.payment_status === "paid";
  const isFailed = order.payment_status === "failed";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Hero Status Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-4 relative overflow-hidden">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          {isFailed ? (
            <IconAlertCircle className="w-8 h-8 text-amber-600" />
          ) : isPaid ? (
            <IconCheck className="w-8 h-8 text-emerald-600" />
          ) : (
            <IconPackage className="w-8 h-8 text-emerald-600" />
          )}
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isFailed
              ? "Payment Authorization Failed"
              : isPaid
              ? "Order Confirmed & Paid!"
              : "Order Placed Successfully!"}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {isFailed
              ? "Your order has been preserved. Please retry your payment or switch to Cash on Delivery below."
              : isPaid
              ? "Thank you for your order! Your simulated payment was approved and groceries are being packed."
              : "Thank you for shopping with FreshCart! Your Cash on Delivery order has been registered."}
          </p>
        </div>

        {/* Order Reference Pill */}
        <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full">
          <span className="text-[11px] text-slate-500 font-medium">Order Ref:</span>
          <span className="text-xs font-mono font-bold text-slate-900">{order.order_reference}</span>
          <button
            onClick={handleCopyReference}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition ml-1 cursor-pointer"
            title="Copy order reference"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Failed Payment Action Bar */}
        {isFailed && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-3">
            <p className="font-semibold">
              Payment was declined during mock authorization. Your inventory is reserved. Choose an option:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                disabled={actionLoading}
                onClick={() => handleRetryPayment("success")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Retry Online Payment (Success Scenario)"}
              </button>
              <button
                disabled={actionLoading}
                onClick={handleSwitchToCOD}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : "Switch to Cash on Delivery (COD)"}
              </button>
              <button
                disabled={actionLoading}
                onClick={handleCancelOrder}
                className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Cancelling..." : "Cancel Order & Release Inventory"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order & Delivery Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer & Address Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <IconMapPin className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-xs">Delivery Destination</h3>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-900 block">{order.customer_name}</span>
              <span>+91 {order.customer_phone}</span> • <span>{order.customer_email}</span>
            </div>
            <div className="pt-1">
              <p className="text-slate-700">{order.delivery_address}</p>
              <p className="text-slate-500">
                {order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}
              </p>
            </div>
            {order.delivery_instructions && (
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 italic">
                Note: &quot;{order.delivery_instructions}&quot;
              </div>
            )}
          </div>
        </div>

        {/* Payment & Status Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <IconCreditCard className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-xs">Payment Information</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-semibold text-slate-900">
                {order.payment_method === "cod" ? "Cash on Delivery (COD)" : "Simulated Online Payment"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment Status:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  order.payment_status === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : order.payment_status === "failed"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {order.payment_status.toUpperCase()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Order Status:</span>
              <span className="font-semibold text-slate-900 capitalize">
                {order.order_status.replace("_", " ")}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-2">
              <span className="text-slate-500">Placed At:</span>
              <span className="text-slate-700">{new Date(order.created_at).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Purchase Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <h3 className="font-bold text-slate-900 text-xs">Purchased Items ({order.items.length})</h3>
          <span className="text-[11px] text-slate-500">Prices frozen at order placement</span>
        </div>

        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between text-xs gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <IconLeaf className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{item.product_name}</h4>
                  <span className="text-[11px] text-slate-500">
                    {item.quantity} × ₹{item.unit_price.toFixed(2)} / {item.product_unit}
                  </span>
                </div>
              </div>
              <span className="font-bold text-slate-900">₹{item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Pricing Summary Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Items Subtotal</span>
            <span className="font-semibold text-slate-900">₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Delivery Fee</span>
            <span className="font-semibold text-slate-900">
              {order.delivery_fee === 0 ? "FREE" : `₹${order.delivery_fee.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
            <span>Total Payable Amount</span>
            <span className="text-base text-emerald-700">₹{order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/orders?ref=${order.order_reference}`}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2"
          >
            <IconTruck className="w-4 h-4" />
            <span>Track Delivery in My Orders</span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            <span>←</span>
            <span>Continue Shopping</span>
          </Link>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
        >
          <IconPrinter className="w-4 h-4 text-slate-500" />
          <span>Print Receipt</span>
        </button>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <IconLeaf className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight">FreshCart</span>
              <span className="text-[10px] font-bold text-emerald-600 block -mt-1 tracking-wider uppercase">
                Order Confirmation
              </span>
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition"
          >
            <span>←</span> Back to Store
          </Link>
        </div>
      </header>

      <main>
        <Suspense
          fallback={
            <div className="py-20 text-center text-xs text-slate-500">
              Loading confirmation details...
            </div>
          }
        >
          <OrderConfirmationContent />
        </Suspense>
      </main>
    </div>
  );
}
