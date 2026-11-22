"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { createOrder, simulatePayment, switchOrderToCOD, cancelOrder } from "@/lib/api";
import { OrderOut } from "@/types";
import { IconLeaf, IconPackage, IconAlertCircle, IconX, IconRefresh, IconBag, IconMapPin, IconCreditCard, IconCheck, IconShield, IconArrowRight } from "@/components/Icons";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, totalItems, clearCart } = useCart();

  // Form states
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    delivery_address: "",
    delivery_city: "Mumbai",
    delivery_state: "Maharashtra",
    delivery_pincode: "400001",
    delivery_instructions: "",
  });

  const [paymentMethod, setPaymentMethod] = useState<"cod" | "simulated_online">("cod");
  const [onlineScenario, setOnlineScenario] = useState<"success" | "failure">("success");

  // Submission & Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Failure retry state (when online payment fails)
  const [failedOrder, setFailedOrder] = useState<OrderOut | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Delivery fee calculation
  const deliveryFee = subtotal >= 500 ? 0 : items.length > 0 ? 40 : 0;
  const finalTotal = subtotal + deliveryFee;

  // Generate an idempotency key once per checkout session
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  useEffect(() => {
    queueMicrotask(() => {
      setIdempotencyKey(`freshcart-idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    });
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_name.trim() || formData.customer_name.trim().length < 2) {
      newErrors.customer_name = "Full name is required (min 2 characters).";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customer_email.trim())) {
      newErrors.customer_email = "Please enter a valid email address.";
    }

    const cleanPhone = formData.customer_phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      newErrors.customer_phone = "Please enter a valid 10-digit Indian mobile number (starts with 6-9).";
    }

    if (!formData.delivery_address.trim() || formData.delivery_address.trim().length < 5) {
      newErrors.delivery_address = "Complete delivery address is required (min 5 characters).";
    }

    if (!formData.delivery_city.trim()) {
      newErrors.delivery_city = "City is required.";
    }

    if (!formData.delivery_state.trim()) {
      newErrors.delivery_state = "State is required.";
    }

    const cleanPin = formData.delivery_pincode.replace(/\D/g, "");
    if (!/^\d{6}$/.test(cleanPin)) {
      newErrors.delivery_pincode = "PIN code must be exactly 6 numeric digits.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (items.length === 0) {
      setApiError("Your cart is empty. Please add items before checking out.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim(),
        customer_phone: formData.customer_phone.replace(/\D/g, ""),
        delivery_address: formData.delivery_address.trim(),
        delivery_city: formData.delivery_city.trim(),
        delivery_state: formData.delivery_state.trim(),
        delivery_pincode: formData.delivery_pincode.replace(/\D/g, ""),
        delivery_instructions: formData.delivery_instructions.trim() || undefined,
        payment_method: paymentMethod,
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        idempotency_key: idempotencyKey,
      };

      // 1. Create order in backend (deducts stock atomically)
      const order = await createOrder(payload);

      // Save order reference in localStorage for customer order history
      try {
        const stored = JSON.parse(localStorage.getItem("freshcart_recent_orders") || "[]");
        if (!stored.includes(order.order_reference)) {
          stored.unshift(order.order_reference);
          localStorage.setItem("freshcart_recent_orders", JSON.stringify(stored.slice(0, 20)));
        }
      } catch {
        // Ignore localStorage error
      }

      if (paymentMethod === "cod") {
        // COD order placed successfully
        clearCart();
        router.push(`/order-confirmation?order_ref=${order.order_reference}`);
      } else {
        // Simulated Online Payment Flow
        const payRes = await simulatePayment(order.order_reference, onlineScenario);
        if (payRes.success) {
          clearCart();
          router.push(`/order-confirmation?order_ref=${order.order_reference}`);
        } else {
          // Keep order in failed state so user can retry without duplicate order creation
          setFailedOrder(payRes.order);
        }
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retry online payment with success scenario
  const handleRetryPaymentSuccess = async () => {
    if (!failedOrder) return;
    setRetrying(true);
    setApiError(null);
    try {
      const res = await simulatePayment(failedOrder.order_reference, "success");
      if (res.success) {
        clearCart();
        router.push(`/order-confirmation?order_ref=${failedOrder.order_reference}`);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Retry failed.");
    } finally {
      setRetrying(false);
    }
  };

  // Switch to Cash on Delivery after payment failure
  const handleSwitchToCOD = async () => {
    if (!failedOrder) return;
    setRetrying(true);
    setApiError(null);
    try {
      const updatedOrder = await switchOrderToCOD(failedOrder.order_reference);
      clearCart();
      router.push(`/order-confirmation?order_ref=${updatedOrder.order_reference}`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to switch to COD.");
    } finally {
      setRetrying(false);
    }
  };

  // Cancel order and release reserved stock
  const handleCancelOrder = async () => {
    if (!failedOrder) return;
    setRetrying(true);
    setApiError(null);
    try {
      await cancelOrder(failedOrder.order_reference);
      setFailedOrder(null);
      alert("Order has been cancelled and reserved inventory was returned to stock.");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1F5A43] text-white">
              <IconLeaf className="w-4 h-4 text-white" />
            </span>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">FreshCart</span>
              <span className="text-[10px] font-bold text-emerald-700 block -mt-1 tracking-wider uppercase">
                Secure Checkout
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition"
            >
              <IconPackage className="w-3.5 h-3.5 text-slate-500" />
              <span>My Orders</span>
            </Link>
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition"
            >
              <span>←</span>
              <span>Back to Store</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Page Title & Breadcrumb */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Checkout &amp; Order Placement</h1>
          <p className="text-xs text-slate-500 mt-1">
            Provide delivery details and choose your preferred payment option below.
          </p>
        </div>

        {/* Global Error Alert */}
        {apiError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between">
            <div className="flex items-start gap-2">
              <IconAlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Checkout Error</p>
                <p className="mt-0.5">{apiError}</p>
              </div>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Payment Failure Overlay / Alert Modal */}
        {failedOrder && (
          <div className="mb-8 p-6 rounded-2xl bg-amber-50/90 border border-amber-300 shadow-lg text-slate-900 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <IconX className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-900">Simulated Payment Authorization Failed</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Your order has been preserved with reference{" "}
                  <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {failedOrder.order_reference}
                  </span>
                  . Inventory has been secured and will not be deducted again.
                </p>
                <p className="text-xs text-amber-900 font-medium mt-1">
                  Reason: Simulated card issuer declined authorization (Test Scenario: Failure).
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                disabled={retrying}
                onClick={handleRetryPaymentSuccess}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <IconRefresh className="w-3.5 h-3.5" />
                <span>{retrying ? "Retrying..." : "Retry Online Payment (Simulate Success)"}</span>
              </button>

              <button
                disabled={retrying}
                onClick={handleSwitchToCOD}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{retrying ? "Updating..." : "Switch to Cash on Delivery (COD)"}</span>
              </button>

              <button
                disabled={retrying}
                onClick={handleCancelOrder}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <IconX className="w-3.5 h-3.5" />
                <span>{retrying ? "Cancelling..." : "Cancel Order & Release Inventory"}</span>
              </button>

              <button
                onClick={() => setFailedOrder(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        )}

        {/* Empty Cart Guard */}
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
              <IconBag className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Your cart is currently empty</h2>
            <p className="text-xs text-slate-500">
              Please add fresh grocery items to your cart before proceeding to checkout.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-[#1F5A43] hover:bg-[#174533] text-white rounded-xl text-xs font-bold transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Delivery & Payment Details (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Customer Information Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-[#1F5A43]">
                    <IconMapPin className="w-4 h-4 text-[#1F5A43]" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">1. Customer &amp; Delivery Address</h2>
                    <p className="text-xs text-slate-500">Where should we deliver your fresh groceries?</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Customer Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rohan Sharma"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-emerald-600 ${
                        errors.customer_name ? "border-rose-400 bg-rose-50/50" : "border-slate-200"
                      }`}
                    />
                    {errors.customer_name && (
                      <p className="text-[11px] text-rose-600 mt-1">{errors.customer_name}</p>
                    )}
                  </div>

                  {/* Customer Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Number (10 digits) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">+91</span>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        maxLength={10}
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        className={`w-full pl-11 pr-3.5 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-emerald-600 ${
                          errors.customer_phone ? "border-rose-400 bg-rose-50/50" : "border-slate-200"
                        }`}
                      />
                    </div>
                    {errors.customer_phone && (
                      <p className="text-[11px] text-rose-600 mt-1">{errors.customer_phone}</p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="rohan.sharma@example.com"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-emerald-600 ${
                        errors.customer_email ? "border-rose-400 bg-rose-50/50" : "border-slate-200"
                      }`}
                    />
                    {errors.customer_email && (
                      <p className="text-[11px] text-rose-600 mt-1">{errors.customer_email}</p>
                    )}
                  </div>

                  {/* Street Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Complete Street Address <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Flat / House No., Building Name, Street, Landmark"
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-emerald-600 ${
                        errors.delivery_address ? "border-rose-400 bg-rose-50/50" : "border-slate-200"
                      }`}
                    />
                    {errors.delivery_address && (
                      <p className="text-[11px] text-rose-600 mt-1">{errors.delivery_address}</p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Mumbai"
                      value={formData.delivery_city}
                      onChange={(e) => setFormData({ ...formData, delivery_city: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-emerald-600"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Maharashtra"
                      value={formData.delivery_state}
                      onChange={(e) => setFormData({ ...formData, delivery_state: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-emerald-600"
                    />
                  </div>

                  {/* PIN Code */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      PIN Code (6 digits) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="400001"
                      value={formData.delivery_pincode}
                      onChange={(e) => setFormData({ ...formData, delivery_pincode: e.target.value })}
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-emerald-600 ${
                        errors.delivery_pincode ? "border-rose-400 bg-rose-50/50" : "border-slate-200"
                      }`}
                    />
                    {errors.delivery_pincode && (
                      <p className="text-[11px] text-rose-600 mt-1">{errors.delivery_pincode}</p>
                    )}
                  </div>

                  {/* Delivery Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Delivery Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ring the doorbell twice or leave with guard"
                      value={formData.delivery_instructions}
                      onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <IconCreditCard className="w-5 h-5 text-emerald-700" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">2. Payment Method</h2>
                    <p className="text-xs text-slate-500">Choose how you would like to complete your purchase.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* COD Option */}
                  <label
                    className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition ${
                      paymentMethod === "cod"
                        ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">Cash on Delivery (COD)</span>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">CASH</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pay with cash or UPI directly to the delivery partner upon receiving your order.
                      </p>
                    </div>
                  </label>

                  {/* Simulated Online Payment Option */}
                  <label
                    className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition ${
                      paymentMethod === "simulated_online"
                        ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="simulated_online"
                      checked={paymentMethod === "simulated_online"}
                      onChange={() => setPaymentMethod("simulated_online")}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">
                          Simulated Online Payment (UPI / Card / NetBanking)
                        </span>
                        <IconCreditCard className="w-4 h-4 text-emerald-700" />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Test online transaction scenarios with mock payment authorization (No real money involved).
                      </p>

                      {/* Interactive Simulation Scenario Toggle */}
                      {paymentMethod === "simulated_online" && (
                        <div className="mt-3.5 pt-3 border-t border-emerald-200/60">
                          <span className="block text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-2">
                            Select Simulation Scenario:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setOnlineScenario("success")}
                              className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-left flex items-center justify-between ${
                                onlineScenario === "success"
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                                Simulate Success
                              </span>
                              {onlineScenario === "success" && <IconCheck className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => setOnlineScenario("failure")}
                              className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-left flex items-center justify-between ${
                                onlineScenario === "failure"
                                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-300"></span>
                                Simulate Failure
                              </span>
                              {onlineScenario === "failure" && <IconCheck className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Placement (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 sticky top-24">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Order Summary</h3>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {totalItems} {totalItems === 1 ? "item" : "items"}
                  </span>
                </div>

                {/* Itemized List */}
                <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100">
                  {items.map(({ product, quantity }) => (
                    <div key={product.id} className="pt-3 first:pt-0 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-base">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <IconLeaf className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 truncate">{product.name}</h4>
                        <p className="text-[11px] text-slate-500">
                          {quantity} × ₹{product.price.toFixed(2)} ({product.unit})
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{(product.price * quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charge</span>
                    {deliveryFee === 0 ? (
                      <span className="font-bold text-emerald-600">FREE</span>
                    ) : (
                      <span className="font-semibold text-slate-900">₹{deliveryFee.toFixed(2)}</span>
                    )}
                  </div>

                  {deliveryFee === 0 && (
                    <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                      Free delivery applied on orders of ₹500 or more!
                    </p>
                  )}

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline text-sm font-bold text-slate-900">
                    <span>Final Payable Amount</span>
                    <span className="text-lg font-black text-emerald-700">₹{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Processing Order...</span>
                    </>
                  ) : paymentMethod === "cod" ? (
                    <>
                      <span>Place Cash on Delivery Order</span>
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Proceed to Payment Simulation (₹{finalTotal.toFixed(2)})</span>
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* Trust and Guarantee Badges */}
                <div className="border-t border-slate-100 pt-3 text-center space-y-1">
                  <p className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1.5">
                    <IconShield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>256-Bit Encrypted Database Persistence</span>
                  </p>
                  <p className="text-[10px] text-slate-400">Inventory locked and verified atomically via SQLite</p>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
