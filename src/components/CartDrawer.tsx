"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { validateCart } from "@/lib/api";
import { CartValidateResponse } from "@/types";
import { IconBag, IconX, IconTrash, IconAlertCircle, IconLeaf } from "@/components/Icons";

export default function CartDrawer() {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalItems,
    subtotal,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const router = useRouter();
  const [validationResult, setValidationResult] = useState<CartValidateResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasClientStockViolation = items.some(
    (i) => i.quantity > i.product.stock_quantity || i.product.stock_quantity <= 0
  );
  const hasServerViolation = validationResult ? !validationResult.is_valid : false;
  const isCheckoutBlocked = hasClientStockViolation || hasServerViolation;

  if (!isCartOpen) return null;

  const handleRevalidate = async () => {
    if (items.length === 0) return;
    setValidating(true);
    setValidationError(null);
    try {
      const payload = items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
      }));
      const res = await validateCart(payload);
      setValidationResult(res);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  };

  const handleProceedToCheckout = async () => {
    if (isCheckoutBlocked) {
      setValidationError("Cannot checkout: One or more items exceed available inventory or are out of stock.");
      return;
    }
    setValidating(true);
    setValidationError(null);
    try {
      const payload = items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
      }));
      const res = await validateCart(payload);
      setValidationResult(res);
      if (!res.is_valid) {
        setValidationError("Cart rejected by server: One or more items in your cart are unavailable or exceed stock.");
        return;
      }
      setIsCartOpen(false);
      router.push("/checkout");
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-gray-200">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1F5A43] text-white shadow-xs">
                <IconBag className="w-4 h-4 text-white" />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">Shopping Cart</h2>
                <span className="text-xs text-gray-500 font-medium">
                  {totalItems} {totalItems === 1 ? "item" : "items"} selected
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition cursor-pointer"
              title="Close cart"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Validation Notice Banner */}
          {validationResult && validationResult.is_valid && (
            <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                Server Verified: Total ₹{validationResult.total.toFixed(2)}
              </span>
              <button
                onClick={() => setValidationResult(null)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {validationResult && !validationResult.is_valid && (
            <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                Validation Failed: Some items exceed available stock or are unavailable.
              </span>
              <button
                onClick={() => setValidationResult(null)}
                className="text-rose-700 hover:text-rose-900 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {validationError && (
            <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <IconAlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{validationError}</span>
              </span>
              <button
                onClick={() => setValidationError(null)}
                className="text-rose-600 cursor-pointer p-0.5"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-gray-100">
            {items.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shadow-xs">
                  <IconBag className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Your cart is empty</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                    Select farm-fresh fruits, vegetables, dairy, or bakery items to get started.
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-4 py-2 bg-[#1F5A43] hover:bg-[#174533] text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Explore Catalogue
                </button>
              </div>
            ) : (
              items.map(({ product, quantity }) => {
                const itemTotal = (product.price * quantity).toFixed(2);
                const isMaxStock = quantity >= product.stock_quantity;
                const validatedItem = validationResult?.items.find((v) => v.product_id === product.id);
                const isItemUnavailable = product.stock_quantity <= 0 || (validatedItem && !validatedItem.is_available);
                const isQuantityExceeded = quantity > product.stock_quantity;

                return (
                  <div key={product.id} className="pt-4 first:pt-0 flex items-start gap-3.5">
                    {/* Item Thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-200 relative">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <IconLeaf className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Item Metadata & Price */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                          {product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="text-gray-400 hover:text-rose-600 transition cursor-pointer ml-1 p-0.5"
                          title="Remove item"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded uppercase">
                          {product.unit}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          ₹{product.price.toFixed(2)} each
                        </span>
                      </div>

                      {/* Stock issue error badges */}
                      {isItemUnavailable && (
                        <div className="mt-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                          {validatedItem?.error || "Currently out of stock"}
                        </div>
                      )}
                      {!isItemUnavailable && isQuantityExceeded && (
                        <div className="mt-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                          Requested {quantity} exceeds {product.stock_quantity} available
                        </div>
                      )}

                      {/* Quantity Controls & Item Subtotal */}
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="inline-flex items-center border border-gray-200 rounded-lg bg-white shadow-2xs">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-800 hover:bg-gray-100 rounded-l-lg transition font-bold text-xs cursor-pointer"
                            title="Decrease quantity"
                          >
                            –
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-[#1F5A43]">
                            {quantity}
                          </span>
                          <button
                            disabled={isMaxStock}
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className={`w-7 h-7 flex items-center justify-center rounded-r-lg transition font-bold text-xs ${
                              isMaxStock
                                ? "text-gray-300 cursor-not-allowed bg-gray-50"
                                : "text-gray-800 hover:bg-gray-100 cursor-pointer"
                            }`}
                            title={isMaxStock ? "Maximum stock reached" : "Increase quantity"}
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900 block leading-tight">
                            ₹{itemTotal}
                          </span>
                          {isMaxStock && !isQuantityExceeded && (
                            <span className="text-[10px] text-amber-700 block">
                              Max stock ({product.stock_quantity})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer & Checkout Summary */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-gray-200 bg-white space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-bold text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span>Delivery</span>
                  <span className="text-[#1F5A43] font-semibold">Standard Dispatch (Free)</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-sm font-bold text-gray-900">
                  <span>Grand Total</span>
                  <span className="text-[#1F5A43] text-base">₹{subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={clearCart}
                  className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-gray-200 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  disabled={validating}
                  onClick={handleRevalidate}
                  className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition border border-gray-200 cursor-pointer text-center"
                >
                  {validating ? "Validating..." : "Verify Stock with Server"}
                </button>
              </div>

              <button
                disabled={isCheckoutBlocked || validating}
                onClick={handleProceedToCheckout}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 ${
                  isCheckoutBlocked || validating
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border border-gray-300"
                    : "bg-[#1F5A43] hover:bg-[#174533] text-white cursor-pointer"
                }`}
              >
                <span>
                  {validating
                    ? "Validating with Inventory..."
                    : isCheckoutBlocked
                    ? "Checkout Blocked (Stock Issue)"
                    : "Proceed to Checkout"}
                </span>
                {!isCheckoutBlocked && !validating && <span>→</span>}
              </button>
              {isCheckoutBlocked && (
                <p className="text-[11px] text-center text-rose-600 font-medium">
                  One or more items exceed inventory or are unavailable. Please adjust quantities.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
