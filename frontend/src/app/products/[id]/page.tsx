"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchProductById, fetchProducts } from "@/lib/api";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import SmartSearchBar from "@/components/SmartSearchBar";
import CartDrawer from "@/components/CartDrawer";
import {
  IconLeaf,
  IconPackage,
  IconBag,
  IconCheck,
  IconAlertCircle,
  IconArrowRight,
  IconShield,
  IconTruck,
} from "@/components/Icons";

function ProductDetailContent() {
  const routeParams = useParams<{ id: string }>();
  const idStr = routeParams?.id;
  const productId = idStr ? parseInt(idStr, 10) : NaN;

  const { addToCart, getItemQuantity, totalItems, subtotal, setIsCartOpen } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  useEffect(() => {
    if (isNaN(productId) || productId <= 0) {
      queueMicrotask(() => {
        setError("Invalid product ID.");
        setIsLoading(false);
      });
      return;
    }

    let isMounted = true;
    queueMicrotask(() => {
      setIsLoading(true);
      setError(null);
      setAddedSuccess(false);
      setQuantity(1);
    });

    fetchProductById(productId)
      .then(async (data) => {
        if (!isMounted) return;
        setProduct(data);

        // Fetch related products from the same category
        try {
          const relatedRes = await fetchProducts({
            category_id: data.category_id,
            limit: 6,
          });
          if (isMounted) {
            setRelatedProducts(relatedRes.items.filter((p) => p.id !== data.id));
          }
        } catch {
          // Non-blocking for related products
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Product not found.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleAddToCart = () => {
    if (!product || product.stock_quantity <= 0) return;
    addToCart(product, quantity);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 3000);
  };

  const currentCartQty = product ? getItemQuantity(product.id) : 0;
  const isOutOfStock = product ? product.stock_quantity <= 0 : false;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#1F5A43] selection:text-white">
      {/* Top Banner */}
      <div className="bg-[#1F5A43] text-white py-1.5 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2">
        <span>Free delivery on orders of ₹500 or more • Farm-fresh groceries delivered directly to your doorstep</span>
      </div>

      {/* Header with Smart Search */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1F5A43] text-white shadow-xs group-hover:scale-105 transition">
                <IconLeaf className="w-5 h-5 text-white" />
              </span>
              <div>
                <span className="text-xl font-bold tracking-tight text-gray-900 block leading-tight">
                  Fresh<span className="text-[#1F5A43]">Cart</span>
                </span>
                <span className="text-[11px] text-gray-500 font-medium block">
                  Delivery in 15-25 mins
                </span>
              </div>
            </Link>

            {/* Mobile Actions */}
            <div className="sm:hidden flex items-center gap-2">
              <Link
                href="/orders"
                className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs"
                title="My Orders"
              >
                <IconPackage className="w-3.5 h-3.5" />
                <span>Orders</span>
              </Link>
              <button
                onClick={() => setIsCartOpen(true)}
                className="h-9 flex items-center gap-1.5 px-3 rounded-lg bg-[#1F5A43] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <IconBag className="w-3.5 h-3.5" />
                <span>{totalItems}</span>
              </button>
            </div>
          </div>

          {/* Prominent Smart Search Bar */}
          <div className="w-full sm:max-w-xl">
            <SmartSearchBar />
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link
              href="/orders"
              className="h-10 flex items-center gap-2 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium shadow-2xs transition"
            >
              <IconPackage className="w-4 h-4 text-gray-500" />
              <span>My Orders</span>
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="h-10 flex items-center gap-2 px-4 rounded-xl bg-[#1F5A43] hover:bg-[#174533] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <IconBag className="w-4 h-4 text-white" />
              <span>Cart</span>
              <span className="bg-[#174533] text-emerald-100 px-2 py-0.5 rounded-full text-xs font-mono">
                {totalItems}
              </span>
              {subtotal > 0 && (
                <span className="pl-1.5 border-l border-emerald-700/80 font-mono">
                  ₹{subtotal.toFixed(2)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-[#1F5A43] transition">
            Home
          </Link>
          <span>/</span>
          <Link href="/" className="hover:text-[#1F5A43] transition">
            Aisles
          </Link>
          {product?.category && (
            <>
              <span>/</span>
              <Link
                href={`/?category=${product.category.slug}`}
                className="hover:text-[#1F5A43] font-medium transition"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-900 font-semibold truncate max-w-[200px] sm:max-w-none">
            {isLoading ? "Loading..." : product?.name || "Product"}
          </span>
        </nav>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 sm:p-10 rounded-3xl border border-gray-200 animate-pulse">
            <div className="aspect-square bg-gray-100 rounded-2xl"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-100 rounded w-1/4"></div>
              <div className="h-8 bg-gray-100 rounded w-3/4"></div>
              <div className="h-6 bg-gray-100 rounded w-1/3"></div>
              <div className="h-24 bg-gray-100 rounded"></div>
              <div className="h-12 bg-gray-100 rounded w-1/2"></div>
            </div>
          </div>
        )}

        {/* Error / Not Found State */}
        {!isLoading && (error || !product) && (
          <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <IconAlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Product Not Found</h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              We couldn&apos;t find the product you requested (ID: {idStr || "Unknown"}). It may be temporarily unavailable or discontinued from our active inventory.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1F5A43] hover:bg-[#174533] text-white text-xs font-semibold shadow-xs transition"
              >
                <span>Back to Grocery Aisles</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Product Details Section */}
        {!isLoading && product && (
          <div className="space-y-12">
            <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
              {/* Product Image Frame */}
              <div className="relative aspect-square w-full rounded-2xl bg-[#FBF9F4] border border-[#EDE7D9] overflow-hidden flex items-center justify-center">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                    <IconLeaf className="w-12 h-12" />
                    <span className="text-xs">No image available</span>
                  </div>
                )}

                {/* Stock Tag Overlay */}
                <span
                  className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full shadow-sm ${
                    isOutOfStock
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : product.stock_quantity < 10
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-white/95 text-[#1F5A43] border border-emerald-100"
                  }`}
                >
                  {isOutOfStock
                    ? "Out of Stock"
                    : product.stock_quantity < 10
                    ? `Only ${product.stock_quantity} left`
                    : "In Stock"}
                </span>

                {/* Unit Tag */}
                <span className="absolute bottom-4 right-4 text-xs font-semibold bg-white/95 text-gray-800 px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                  {product.unit}
                </span>
              </div>

              {/* Product Information Column */}
              <div className="space-y-6">
                <div>
                  <Link
                    href={`/?category=${product.category?.slug}`}
                    className="inline-block text-xs font-bold uppercase tracking-wider text-[#1F5A43] bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 transition"
                  >
                    {product.category?.name || "Grocery"}
                  </Link>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
                    {product.name}
                  </h1>

                  <div className="flex items-baseline gap-3 mt-3">
                    <span className="text-3xl sm:text-4xl font-black text-gray-900">
                      ₹{product.price.toFixed(2)}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-500">
                      per {product.unit}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="prose prose-sm text-gray-600 leading-relaxed border-t border-b border-gray-100 py-4">
                  <p>{product.description || "Farm-fresh quality grocery product stocked at FreshCart. Hand-picked, hygienically stored, and packed with high standards for direct doorstep delivery."}</p>
                </div>

                {/* Stock & Availability Indicator */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-gray-500">Availability:</span>
                    {isOutOfStock ? (
                      <span className="text-rose-600 font-bold">Temporarily Out of Stock</span>
                    ) : product.stock_quantity < 10 ? (
                      <span className="text-amber-700 font-bold">Low Stock ({product.stock_quantity} available)</span>
                    ) : (
                      <span className="text-[#1F5A43] font-bold">In Stock ({product.stock_quantity} available in warehouse)</span>
                    )}
                  </div>
                  {currentCartQty > 0 && (
                    <p className="text-xs text-emerald-800 font-medium">
                      You already have <span className="font-bold">{currentCartQty} {product.unit}</span> in your shopping cart.
                    </p>
                  )}
                </div>

                {/* Interactive Quantity Selector & Add to Cart */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Quantity Stepper */}
                    {!isOutOfStock && (
                      <div className="flex items-center border border-gray-200 bg-gray-50 rounded-xl overflow-hidden h-11 w-36">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="w-11 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold text-base cursor-pointer"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-bold text-gray-900 text-sm">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                          disabled={quantity >= product.stock_quantity}
                          className="w-11 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold text-base cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={handleAddToCart}
                      className={`flex-1 h-11 px-6 rounded-xl text-xs sm:text-sm font-bold text-white transition flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                        isOutOfStock
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-[#1F5A43] hover:bg-[#174533] active:scale-[0.99]"
                      }`}
                    >
                      <IconBag className="w-4 h-4 text-white" />
                      <span>
                        {isOutOfStock
                          ? "Out of Stock"
                          : addedSuccess
                          ? `Added ${quantity} to Cart!`
                          : `Add to Cart • ₹${(product.price * quantity).toFixed(2)}`}
                      </span>
                    </button>
                  </div>

                  {addedSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconCheck className="w-4 h-4 text-emerald-700" />
                        <span>Successfully added {quantity} {product.unit} of {product.name} to your cart.</span>
                      </div>
                      <button
                        onClick={() => setIsCartOpen(true)}
                        className="text-[#1F5A43] hover:underline font-bold text-xs"
                      >
                        View Cart →
                      </button>
                    </div>
                  )}
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#1F5A43] flex items-center justify-center">
                      <IconTruck className="w-4 h-4" />
                    </span>
                    <span>15-25 Min Fast Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#1F5A43] flex items-center justify-center">
                      <IconShield className="w-4 h-4" />
                    </span>
                    <span>100% Quality Checked</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Products Shelf */}
            {relatedProducts.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                      Related from {product.category?.name || "this Department"}
                    </h2>
                    <p className="text-xs text-gray-500">More farm-fresh groceries you might like</p>
                  </div>
                  <Link
                    href={`/?category=${product.category?.slug}`}
                    className="text-xs font-bold text-[#1F5A43] hover:underline flex items-center gap-1"
                  >
                    <span>View all {product.category?.name}</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                  {relatedProducts.map((rel) => {
                    const isRelOutOfStock = rel.stock_quantity <= 0;
                    return (
                      <div
                        key={rel.id}
                        className="group rounded-2xl bg-white border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition flex flex-col justify-between"
                      >
                        <Link href={`/products/${rel.id}`} className="block">
                          <div className="aspect-square w-full rounded-xl bg-gray-50 overflow-hidden mb-2 relative">
                            {rel.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={rel.image_url}
                                alt={rel.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <IconPackage className="w-6 h-6" />
                              </div>
                            )}
                            <span className="absolute bottom-1.5 right-1.5 text-[9px] font-semibold bg-white/90 text-gray-700 px-1.5 py-0.5 rounded shadow-2xs">
                              {rel.unit}
                            </span>
                          </div>

                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                            {rel.category?.name || "Grocery"}
                          </span>
                          <h3 className="text-xs font-bold text-gray-900 group-hover:text-[#1F5A43] transition line-clamp-1 mt-0.5">
                            {rel.name}
                          </h3>
                        </Link>

                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs font-extrabold text-gray-900">
                            ₹{rel.price.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            disabled={isRelOutOfStock}
                            onClick={() => addToCart(rel, 1)}
                            className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center cursor-pointer ${
                              isRelOutOfStock
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-[#1F5A43] hover:bg-[#174533] text-white shadow-2xs"
                            }`}
                          >
                            {isRelOutOfStock ? "Out" : "Add"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-10 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1F5A43] text-white">
                <IconLeaf className="w-4 h-4 text-white" />
              </span>
              <span className="font-bold text-base text-gray-900">FreshCart</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Premium daily online grocery shopping. Genuine farm produce, bakery, and dairy essentials delivered fresh in minutes.
            </p>
          </div>

          <div>
            <span className="font-bold text-gray-900 block mb-2.5">Aisles</span>
            <ul className="space-y-1.5 text-gray-600">
              <li><Link href="/?category=fruits" className="hover:text-[#1F5A43]">Fruits &amp; Vegetables</Link></li>
              <li><Link href="/?category=dairy-eggs" className="hover:text-[#1F5A43]">Dairy &amp; Farm Eggs</Link></li>
              <li><Link href="/?category=bakery" className="hover:text-[#1F5A43]">Artisan Bakery</Link></li>
              <li><Link href="/?category=staples" className="hover:text-[#1F5A43]">Pantry &amp; Staples</Link></li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-gray-900 block mb-2.5">Account &amp; Orders</span>
            <ul className="space-y-1.5 text-gray-600">
              <li><Link href="/orders" className="hover:text-[#1F5A43]">Order Tracking &amp; History</Link></li>
              <li><button onClick={() => setIsCartOpen(true)} className="hover:text-[#1F5A43] text-left cursor-pointer">Shopping Cart</button></li>
              <li><Link href="/admin" className="hover:text-[#1F5A43]">Admin Operations Portal</Link></li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-gray-900 block mb-2.5">Trust &amp; Security</span>
            <p className="text-xs text-gray-500 leading-relaxed">
              SQLite backed persistence with atomic stock deduction and tamper-resistant transaction checkpoints.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center p-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#1F5A43] border-t-transparent animate-spin" />
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}
