"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  fetchOrders,
  updateOrderStatus,
  checkAdminSession,
  adminLogin,
  adminLogout,
  fetchAdminOverview,
  fetchAdminAnalytics,
  fetchProducts,
  updateProductStock,
  fetchCategories,
  fetchInventoryMovements,
} from "@/lib/api";
import {
  OrderOut,
  OrderStatus,
  Product,
  Category,
  AdminOverviewStats,
  AdminAnalyticsStats,
  InventoryMovement,
} from "@/types";
import {
  IconSettings,
  IconPackage,
  IconLock,
  IconShield,
  IconRefresh,
  IconSearch,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconGrid,
  IconLayers,
  IconBarChart,
  IconTrendingUp,
  IconEdit,
  IconMapPin,
  IconClock,
  IconCreditCard,
} from "@/components/Icons";

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

type AdminTab = "overview" | "orders" | "inventory" | "movements" | "analytics";

export default function AdminOrdersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Orders State
  const [orders, setOrders] = useState<OrderOut[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingRef, setUpdatingRef] = useState<string | null>(null);
  const [customNotes] = useState<Record<string, string>>({});
  const [expandedOrderRef, setExpandedOrderRef] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Overview State
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(25);

  // Inventory State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  
  // Stock Adjustment Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [stockReason, setStockReason] = useState<string>("");
  const [stockSaving, setStockSaving] = useState(false);

  // Movements State
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const [movementProductFilter, setMovementProductFilter] = useState<string>("all");
  const [movementSearch, setMovementSearch] = useState("");
  const [movementOffset, setMovementOffset] = useState(0);
  const movementLimit = 25;

  // Analytics State
  const [analytics, setAnalytics] = useState<AdminAnalyticsStats | null>(null);

  const loadMovements = async (
    overrideParams?: Partial<{
      product_id: string;
      movement_type: string;
      search: string;
      offset: number;
    }>
  ) => {
    setMovementsLoading(true);
    try {
      const prodId = overrideParams?.product_id !== undefined ? overrideParams.product_id : movementProductFilter;
      const mType = overrideParams?.movement_type !== undefined ? overrideParams.movement_type : movementTypeFilter;
      const srch = overrideParams?.search !== undefined ? overrideParams.search : movementSearch;
      const off = overrideParams?.offset !== undefined ? overrideParams.offset : movementOffset;

      const res = await fetchInventoryMovements({
        product_id: prodId !== "all" ? Number(prodId) : undefined,
        movement_type: mType !== "all" ? mType : undefined,
        search: srch.trim() || undefined,
        limit: movementLimit,
        offset: off,
      });
      setMovements(res.items);
      setMovementsTotal(res.total);
    } catch (err) {
      console.error("Failed to load inventory movements:", err);
    } finally {
      setMovementsLoading(false);
    }
  };

  const loadOverview = async (threshold = lowStockThreshold) => {
    try {
      const data = await fetchAdminOverview(threshold);
      setOverview(data);
    } catch (err) {
      console.error("Failed to load overview:", err);
    }
  };

  const loadOrders = async () => {
    setOrdersError(null);
    try {
      const data = await fetchOrders({});
      setOrders(data);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : "Failed to load admin orders.");
      setOrders([]);
    }
  };

  const loadInventory = async () => {
    try {
      const [prodsRes, cats] = await Promise.all([
        fetchProducts({ limit: 100 }),
        fetchCategories(),
      ]);
      setProducts(prodsRes.items);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await fetchAdminAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  };

  const loadAllData = async () => {
    loadOverview();
    loadOrders();
    loadInventory();
    loadAnalytics();
    loadMovements();
  };

  useEffect(() => {
    let isMounted = true;
    checkAdminSession()
      .then((session) => {
        if (!isMounted) return;
        const authed = Boolean(session?.authenticated);
        setIsAuthenticated(authed);
        if (authed) {
          loadAllData();
        }
      })
      .catch(() => {
        if (isMounted) setIsAuthenticated(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkeyInput.trim()) return;

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await adminLogin(passkeyInput.trim());
      setIsAuthenticated(true);
      setPasskeyInput("");
      loadAllData();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setIsAuthenticated(false);
    setOrders([]);
    setOverview(null);
    setProducts([]);
    setAnalytics(null);
  };

  const handleStatusTransition = async (orderRef: string, nextStatus: OrderStatus) => {
    setUpdatingRef(orderRef);
    setOrdersError(null);
    try {
      const note = customNotes[orderRef];
      const updated = await updateOrderStatus(orderRef, {
        order_status: nextStatus,
        delivery_notes: note ? note.trim() : undefined,
      });

      setOrders((prev) =>
        prev.map((o) => (o.order_reference === updated.order_reference ? updated : o))
      );
      setSuccessMsg(`Order ${orderRef} updated to '${nextStatus}'.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadOverview();
      loadAnalytics();
      loadMovements();
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : "Failed to update order status.");
    } finally {
      setUpdatingRef(null);
    }
  };

  const handleSaveStock = async () => {
    if (!editingProduct) return;
    if (newStockQty < 0) {
      alert("Stock quantity cannot be negative.");
      return;
    }

    setStockSaving(true);
    try {
      const updated = await updateProductStock(
        editingProduct.id,
        newStockQty,
        undefined,
        stockReason.trim() || undefined
      );
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSuccessMsg(`Updated inventory for ${editingProduct.name} to ${newStockQty} units.`);
      setEditingProduct(null);
      setStockReason("");
      setTimeout(() => setSuccessMsg(null), 4000);
      loadOverview();
      loadMovements();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update product stock.");
    } finally {
      setStockSaving(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.order_status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = o.order_reference.toLowerCase().includes(q);
        const matchesName = o.customer_name.toLowerCase().includes(q);
        const matchesPhone = o.customer_phone.includes(q);
        const matchesCity = o.delivery_city.toLowerCase().includes(q);
        return matchesRef || matchesName || matchesPhone || matchesCity;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== "all" && String(p.category_id) !== selectedCategory) {
        return false;
      }
      if (stockStatusFilter === "out_of_stock" && p.stock_quantity > 0) {
        return false;
      }
      if (stockStatusFilter === "low_stock" && (p.stock_quantity <= 0 || p.stock_quantity > lowStockThreshold)) {
        return false;
      }
      if (stockStatusFilter === "in_stock" && p.stock_quantity <= lowStockThreshold) {
        return false;
      }
      if (inventorySearch.trim()) {
        const q = inventorySearch.toLowerCase().trim();
        return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
      }
      return true;
    });
  }, [products, selectedCategory, stockStatusFilter, inventorySearch, lowStockThreshold]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-24">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <IconSettings className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight">FreshCart Admin</span>
              <span className="text-[10px] font-bold text-emerald-400 block -mt-1 tracking-wider uppercase">
                Enterprise Dashboard 2.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-300 hover:text-white transition px-2 py-1"
            >
              Storefront
            </Link>
            <Link
              href="/orders"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <IconPackage className="w-3.5 h-3.5" />
              <span>Customer View</span>
            </Link>
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-200 border border-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <IconLock className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Admin Navigation Bar */}
        {isAuthenticated && (
          <div className="bg-slate-950 border-t border-slate-800/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "overview"
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <IconGrid className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "orders"
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <IconPackage className="w-4 h-4" />
                <span>Orders</span>
                {orders.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200">
                    {orders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("inventory")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "inventory"
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <IconLayers className="w-4 h-4" />
                <span>Inventory</span>
                {overview && overview.low_stock_count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {overview.low_stock_count} low
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab("movements");
                  loadMovements();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "movements"
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <IconClock className="w-4 h-4" />
                <span>Movements</span>
                {movementsTotal > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200">
                    {movementsTotal}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "analytics"
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <IconBarChart className="w-4 h-4" />
                <span>Analytics</span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => loadAllData()}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition rounded-md hover:bg-slate-900 cursor-pointer"
                  title="Refresh Database Data"
                >
                  <IconRefresh className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Refresh Data</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Global Feedback Notifications */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950">
              <IconX className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Authentication Checking State */}
        {isAuthenticated === null && (
          <div className="max-w-md mx-auto py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-slate-600">Checking admin session...</p>
          </div>
        )}

        {/* Admin Login Card (When Unauthenticated) */}
        {isAuthenticated === false && (
          <div className="max-w-md mx-auto py-12">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <IconShield className="w-6 h-6 text-emerald-400" />
                </div>
                <h1 className="text-xl font-black text-slate-900">Admin Portal Sign-In</h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter the server-configured administrator passkey to access FreshCart order management, inventory control, and business analytics.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <IconAlertCircle className="w-4 h-4 text-rose-600" />
                  <span className="font-semibold">{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Administrator Passkey
                  </label>
                  <input
                    type="password"
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value)}
                    placeholder="Enter passkey..."
                    autoFocus
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Validated server-side via HttpOnly session cookies. Never stored in client bundles.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn || !passkeyInput.trim()}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? "Verifying..." : "Sign In to Admin Portal"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Authenticated Dashboard Content */}
        {isAuthenticated && (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Header with live threshold selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Store Overview &amp; Live Operations</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time operational summary computed directly from SQLite database records.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-600">Low-Stock Alert Level:</span>
                    <select
                      value={lowStockThreshold}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setLowStockThreshold(val);
                        loadOverview(val);
                      }}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden"
                    >
                      <option value="15">≤ 15 units</option>
                      <option value="25">≤ 25 units (Default)</option>
                      <option value="35">≤ 35 units</option>
                      <option value="50">≤ 50 units</option>
                    </select>
                  </div>
                </div>

                {/* 10 Operational Metric Cards */}
                {overview && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Orders</span>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">{overview.total_orders}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded transactions</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Products</span>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">{overview.total_products}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">In 7 active categories</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">Pending Orders</span>
                      <span className="text-2xl font-black text-amber-900 mt-1 block">{overview.pending_orders}</span>
                      <span className="text-[10px] text-amber-600 mt-0.5 block">Placed awaiting processing</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/40 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">Preparing</span>
                      <span className="text-2xl font-black text-blue-900 mt-1 block">{overview.preparing_orders}</span>
                      <span className="text-[10px] text-blue-600 mt-0.5 block">Currently being packed</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/40 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">Dispatched</span>
                      <span className="text-2xl font-black text-purple-900 mt-1 block">{overview.dispatched_orders}</span>
                      <span className="text-[10px] text-purple-600 mt-0.5 block">Out for delivery</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Delivered</span>
                      <span className="text-2xl font-black text-emerald-900 mt-1 block">{overview.delivered_orders}</span>
                      <span className="text-[10px] text-emerald-600 mt-0.5 block">Completed orders</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">Cancelled</span>
                      <span className="text-2xl font-black text-rose-900 mt-1 block">{overview.cancelled_orders}</span>
                      <span className="text-[10px] text-rose-600 mt-0.5 block">Restocked automatically</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-orange-200 bg-orange-50/40 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 block">Low Stock</span>
                      <span className="text-2xl font-black text-orange-900 mt-1 block">{overview.low_stock_count}</span>
                      <span className="text-[10px] text-orange-600 mt-0.5 block">≤ {overview.low_stock_threshold} units remaining</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Out of Stock</span>
                      <span className={`text-2xl font-black mt-1 block ${overview.out_of_stock_count > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                        {overview.out_of_stock_count}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">0 units remaining</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Categories</span>
                      <span className="text-2xl font-black text-slate-900 mt-1 block">{overview.total_categories}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Produce, Dairy, etc.</span>
                    </div>
                  </div>
                )}

                {/* Split Section: Recent Orders & Inventory Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Orders Panel */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <IconClock className="w-4 h-4 text-slate-500" />
                        <span>Recent Orders</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab("orders")}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition"
                      >
                        View All Orders →
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {overview?.recent_orders.map((o) => (
                        <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-bold text-slate-800">{o.order_reference}</span>
                            <div className="text-[11px] text-slate-500">
                              {o.customer_name} • {formatDate(o.created_at)}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="text-xs font-bold text-slate-900">₹{o.total_amount.toFixed(2)}</span>
                            <div>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                o.order_status === "confirmed" ? "bg-emerald-100 text-emerald-800" :
                                o.order_status === "preparing" ? "bg-blue-100 text-blue-800" :
                                o.order_status === "out_for_delivery" ? "bg-purple-100 text-purple-800" :
                                o.order_status === "delivered" ? "bg-emerald-200 text-emerald-900" :
                                o.order_status === "cancelled" ? "bg-rose-100 text-rose-800" :
                                "bg-amber-100 text-amber-800"
                              }`}>
                                {o.order_status.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Inventory Alerts Panel */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <IconAlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Inventory Alerts (Stock ≤ {lowStockThreshold})</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab("inventory")}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition"
                      >
                        Manage Inventory →
                      </button>
                    </div>

                    {overview?.inventory_alerts && overview.inventory_alerts.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {overview.inventory_alerts.map((item) => (
                          <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">N/A</div>
                                )}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">{item.name}</span>
                                <span className="text-[11px] text-slate-500">₹{item.price} / {item.unit}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-black px-2.5 py-1 rounded-md ${
                                item.stock_quantity <= 0
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}>
                                {item.stock_quantity <= 0 ? "Out of Stock" : `${item.stock_quantity} left`}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingProduct(item);
                                  setNewStockQty(item.stock_quantity);
                                  setActiveTab("inventory");
                                }}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                              >
                                Restock
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-slate-500">
                        No products are currently at or below the {lowStockThreshold}-unit alert threshold.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ORDERS */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                {/* Search & Filters */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <IconSearch className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by order ref, customer name, phone, city..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Filter Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                    >
                      <option value="all">All Statuses ({orders.length})</option>
                      <option value="placed">Placed</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="preparing">Preparing</option>
                      <option value="out_for_delivery">Out For Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {ordersError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <IconAlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{ordersError}</span>
                  </div>
                )}

                {/* Orders List Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Order Details</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4">Total</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                              No orders found matching the filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredOrders.map((order) => {
                            const isExpanded = expandedOrderRef === order.order_reference;

                            return (
                              <React.Fragment key={order.id}>
                                <tr className="hover:bg-slate-50/70 transition">
                                  <td className="py-3.5 px-4">
                                    <div className="font-mono font-bold text-slate-900">{order.order_reference}</div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">{formatDate(order.created_at)}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{order.items?.length || 0} line items</div>
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-800">{order.customer_name}</div>
                                    <div className="text-[11px] text-slate-500">{order.customer_phone}</div>
                                    <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{order.delivery_city}, {order.delivery_pincode}</div>
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-slate-700">
                                      <IconCreditCard className="w-3.5 h-3.5 text-slate-500" />
                                      <span>{order.payment_method === "cod" ? "Cash on Delivery" : "Online"}</span>
                                    </div>
                                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm ${
                                      order.payment_status === "paid" ? "bg-emerald-100 text-emerald-800" :
                                      order.payment_status === "failed" ? "bg-rose-100 text-rose-800" :
                                      order.payment_status === "cancelled" ? "bg-slate-100 text-slate-600" :
                                      "bg-amber-100 text-amber-800"
                                    }`}>
                                      {order.payment_status}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <span className="font-black text-slate-900 text-sm">₹{order.total_amount.toFixed(2)}</span>
                                    {order.delivery_fee > 0 && (
                                      <div className="text-[10px] text-slate-400">(incl. ₹{order.delivery_fee} delivery)</div>
                                    )}
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-md ${
                                      order.order_status === "confirmed" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                      order.order_status === "preparing" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                      order.order_status === "out_for_delivery" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                                      order.order_status === "delivered" ? "bg-emerald-200 text-emerald-900 border border-emerald-300" :
                                      order.order_status === "cancelled" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                                      "bg-amber-100 text-amber-800 border border-amber-200"
                                    }`}>
                                      {order.order_status.replace(/_/g, " ")}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      onClick={() => setExpandedOrderRef(isExpanded ? null : order.order_reference)}
                                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
                                    >
                                      <span>{isExpanded ? "Hide Details" : "Inspect Items"}</span>
                                      {isExpanded ? <IconChevronUp className="w-3.5 h-3.5" /> : <IconChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                  </td>
                                </tr>

                                {/* Expandable Order Details Row */}
                                {isExpanded && (
                                  <tr className="bg-slate-50/90 border-b border-slate-200">
                                    <td colSpan={6} className="p-5 space-y-4">
                                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                        {/* Purchased Products List */}
                                        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Purchased Items ({order.items.length})
                                          </h4>
                                          <div className="divide-y divide-slate-100">
                                            {order.items.map((item) => (
                                              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                                                    {item.product_image ? (
                                                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Item</div>
                                                    )}
                                                  </div>
                                                  <div>
                                                    <span className="font-bold text-slate-800 text-xs block">{item.product_name}</span>
                                                    <span className="text-[11px] text-slate-500">
                                                      ₹{item.unit_price} × {item.quantity} {item.product_unit}
                                                    </span>
                                                  </div>
                                                </div>
                                                <span className="font-mono font-bold text-slate-900 text-xs">
                                                  ₹{item.subtotal.toFixed(2)}
                                                </span>
                                              </div>
                                            ))}
                                          </div>

                                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-600">
                                            <span>Subtotal: ₹{order.subtotal.toFixed(2)} • Delivery Fee: ₹{order.delivery_fee.toFixed(2)}</span>
                                            <span className="font-black text-slate-900 text-sm">Total: ₹{order.total_amount.toFixed(2)}</span>
                                          </div>
                                        </div>

                                        {/* Delivery Info & Actions */}
                                        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Delivery &amp; Lifecycle Controls
                                          </h4>
                                          <div className="text-[11px] text-slate-600 space-y-1">
                                            <div className="flex items-start gap-1.5">
                                              <IconMapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                              <div>
                                                <span className="font-semibold">{order.delivery_address}</span>
                                                <div>{order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}</div>
                                              </div>
                                            </div>
                                            {order.delivery_instructions && (
                                              <div className="text-slate-500 italic mt-1">Note: &ldquo;{order.delivery_instructions}&rdquo;</div>
                                            )}
                                          </div>

                                          {/* Status Transitions */}
                                          <div className="pt-3 border-t border-slate-100 space-y-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                              Allowed Status Transitions:
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                              {order.order_status === "placed" && (
                                                <>
                                                  <button
                                                    onClick={() => handleStatusTransition(order.order_reference, "confirmed")}
                                                    disabled={updatingRef === order.order_reference}
                                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                                                  >
                                                    Confirm Order
                                                  </button>
                                                  <button
                                                    onClick={() => handleStatusTransition(order.order_reference, "cancelled")}
                                                    disabled={updatingRef === order.order_reference}
                                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                                                  >
                                                    Cancel &amp; Restock
                                                  </button>
                                                </>
                                              )}

                                              {order.order_status === "confirmed" && (
                                                <>
                                                  <button
                                                    onClick={() => handleStatusTransition(order.order_reference, "preparing")}
                                                    disabled={updatingRef === order.order_reference}
                                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                                                  >
                                                    Mark Packing / Preparing
                                                  </button>
                                                  <button
                                                    onClick={() => handleStatusTransition(order.order_reference, "cancelled")}
                                                    disabled={updatingRef === order.order_reference}
                                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                                                  >
                                                    Cancel &amp; Restock
                                                  </button>
                                                </>
                                              )}

                                              {order.order_status === "preparing" && (
                                                <>
                                                  <button
                                                    onClick={() => handleStatusTransition(order.order_reference, "out_for_delivery")}
                                                    disabled={updatingRef === order.order_reference}
                                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                                                  >
                                                    Dispatch (Out for Delivery)
                                                  </button>
                                                  <button
                                                    onClick={() => handleStatusTransition(order.order_reference, "cancelled")}
                                                    disabled={updatingRef === order.order_reference}
                                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                                                  >
                                                    Cancel &amp; Restock
                                                  </button>
                                                </>
                                              )}

                                              {order.order_status === "out_for_delivery" && (
                                                <button
                                                  onClick={() => handleStatusTransition(order.order_reference, "delivered")}
                                                  disabled={updatingRef === order.order_reference}
                                                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                                                >
                                                  Mark Delivered
                                                </button>
                                              )}

                                              {["delivered", "cancelled"].includes(order.order_status) && (
                                                <span className="text-[11px] text-slate-400 italic">
                                                  Terminal state. No further transitions permitted.
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: INVENTORY */}
            {activeTab === "inventory" && (
              <div className="space-y-4">
                {/* Search & Category Filter */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <IconSearch className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      placeholder="Search inventory by product name or description..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                    >
                      <option value="all">All Categories ({categories.length})</option>
                      {categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={stockStatusFilter}
                      onChange={(e) =>
                        setStockStatusFilter(
                          e.target.value as "all" | "in_stock" | "low_stock" | "out_of_stock"
                        )
                      }
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                    >
                      <option value="all">All Stock Levels</option>
                      <option value="in_stock">In Stock (&gt; {lowStockThreshold})</option>
                      <option value="low_stock">Low Stock (≤ {lowStockThreshold})</option>
                      <option value="out_of_stock">Out of Stock (0)</option>
                    </select>
                  </div>
                </div>

                {/* Products Inventory Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Price / Unit</th>
                          <th className="py-3 px-4">Stock Level</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Adjustment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                              No inventory products match the search criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((p) => {
                            const isLow = p.stock_quantity > 0 && p.stock_quantity <= lowStockThreshold;
                            const isOut = p.stock_quantity <= 0;

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                                      {p.image_url ? (
                                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Item</div>
                                      )}
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-900 block">{p.name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">ID: {p.id} • {p.slug}</span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <span className="text-slate-700 font-medium">{p.category?.name || "Grocery"}</span>
                                </td>

                                <td className="py-3 px-4">
                                  <span className="font-bold text-slate-900">₹{p.price.toFixed(2)}</span>
                                  <span className="text-slate-400 text-[11px] block">per {p.unit}</span>
                                </td>

                                <td className="py-3 px-4">
                                  <span className="font-mono font-black text-sm text-slate-900">{p.stock_quantity}</span>
                                  <span className="text-[11px] text-slate-400 ml-1">{p.unit}</span>
                                </td>

                                <td className="py-3 px-4">
                                  <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                    isOut
                                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                                      : isLow
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  }`}>
                                    {isOut ? "Out of Stock" : isLow ? "Low Stock" : "Healthy Stock"}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setMovementProductFilter(String(p.id));
                                        setActiveTab("movements");
                                        loadMovements({ product_id: String(p.id), offset: 0 });
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                      title="View movement audit ledger for this product"
                                    >
                                      <IconClock className="w-3.5 h-3.5 text-slate-500" />
                                      <span>History</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingProduct(p);
                                        setNewStockQty(p.stock_quantity);
                                        setStockReason("");
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <IconEdit className="w-3.5 h-3.5" />
                                      <span>Adjust Stock</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: INVENTORY MOVEMENTS */}
            {activeTab === "movements" && (
              <div className="space-y-4">
                {/* Search & Filters Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="relative flex-1">
                    <IconSearch className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={movementSearch}
                      onChange={(e) => setMovementSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setMovementOffset(0);
                          loadMovements({ search: movementSearch, offset: 0 });
                        }
                      }}
                      placeholder="Search movements by product name, reason, or order reference..."
                      className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                    <button
                      onClick={() => {
                        setMovementOffset(0);
                        loadMovements({ search: movementSearch, offset: 0 });
                      }}
                      className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800 transition cursor-pointer"
                    >
                      Search
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={movementProductFilter}
                      onChange={(e) => {
                        setMovementProductFilter(e.target.value);
                        setMovementOffset(0);
                        loadMovements({ product_id: e.target.value, offset: 0 });
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden max-w-[200px]"
                    >
                      <option value="all">All Products ({products.length})</option>
                      {products.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={movementTypeFilter}
                      onChange={(e) => {
                        setMovementTypeFilter(e.target.value);
                        setMovementOffset(0);
                        loadMovements({ movement_type: e.target.value, offset: 0 });
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                    >
                      <option value="all">All Movement Types</option>
                      <option value="stock_out">Stock Out (Deductions)</option>
                      <option value="stock_in">Stock In (Restocks / Cancellations)</option>
                      <option value="adjustment">Adjustments (Manual)</option>
                    </select>

                    {(movementSearch || movementProductFilter !== "all" || movementTypeFilter !== "all") && (
                      <button
                        onClick={() => {
                          setMovementSearch("");
                          setMovementProductFilter("all");
                          setMovementTypeFilter("all");
                          setMovementOffset(0);
                          loadMovements({ product_id: "all", movement_type: "all", search: "", offset: 0 });
                        }}
                        className="px-2.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Movements Ledger Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Movement Ledger
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {movementsTotal} total records
                      </span>
                    </div>

                    {movementsLoading && (
                      <span className="text-xs text-slate-400 font-semibold animate-pulse">Loading ledger...</span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Qty Change</th>
                          <th className="py-3 px-4">Stock Transition</th>
                          <th className="py-3 px-4">Reason / Reference</th>
                          <th className="py-3 px-4">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {movements.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                              No inventory movements recorded matching the criteria.
                            </td>
                          </tr>
                        ) : (
                          movements.map((m) => {
                            const isOut = m.movement_type === "stock_out";
                            const isIn = m.movement_type === "stock_in";

                            return (
                              <tr key={m.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                  {formatDate(m.created_at)}
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                                      {m.product_image ? (
                                        <img src={m.product_image} alt={m.product_name || "Item"} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">Item</div>
                                      )}
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-900 block leading-tight">{m.product_name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ID: {m.product_id} {m.category_name && `• ${m.category_name}`}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                      isOut
                                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                                        : isIn
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : "bg-blue-100 text-blue-800 border border-blue-200"
                                    }`}
                                  >
                                    {isOut ? "Stock Out" : isIn ? "Stock In" : "Adjustment"}
                                  </span>
                                </td>

                                <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                                  <span
                                    className={
                                      m.quantity_changed < 0
                                        ? "text-rose-600"
                                        : m.quantity_changed > 0
                                        ? "text-emerald-700"
                                        : "text-slate-600"
                                    }
                                  >
                                    {m.quantity_changed > 0 ? `+${m.quantity_changed}` : m.quantity_changed}{" "}
                                    <span className="text-[10px] text-slate-400 font-sans font-normal">
                                      {m.product_unit || "unit"}
                                    </span>
                                  </span>
                                </td>

                                <td className="py-3 px-4 font-mono whitespace-nowrap text-xs">
                                  <span className="text-slate-500">{m.previous_stock}</span>
                                  <span className="text-slate-400 mx-1.5">→</span>
                                  <span className="font-bold text-slate-900">{m.new_stock}</span>
                                </td>

                                <td className="py-3 px-4 max-w-xs">
                                  <span className="text-slate-800 font-medium block truncate" title={m.reason}>
                                    {m.reason}
                                  </span>
                                  {m.order_reference && (
                                    <button
                                      onClick={() => {
                                        setSearchQuery(m.order_reference || "");
                                        setActiveTab("orders");
                                      }}
                                      className="text-[10px] font-mono text-emerald-700 hover:underline inline-block mt-0.5 cursor-pointer"
                                    >
                                      View {m.order_reference}
                                    </button>
                                  )}
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                                  {m.admin_user || "System"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {movementsTotal > movementLimit && (
                    <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Showing {movementOffset + 1}–{Math.min(movementOffset + movementLimit, movementsTotal)} of {movementsTotal} movements
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={movementOffset === 0}
                          onClick={() => {
                            const newOff = Math.max(0, movementOffset - movementLimit);
                            setMovementOffset(newOff);
                            loadMovements({ offset: newOff });
                          }}
                          className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          disabled={movementOffset + movementLimit >= movementsTotal}
                          onClick={() => {
                            const newOff = movementOffset + movementLimit;
                            setMovementOffset(newOff);
                            loadMovements({ offset: newOff });
                          }}
                          className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                {/* Financial KPI Summary */}
                {analytics && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Paid Revenue</span>
                      <span className="text-3xl font-black text-slate-900 mt-1 block">₹{analytics.total_paid_revenue.toFixed(2)}</span>
                      <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                        Directly collected from {analytics.paid_orders_count} paid orders
                      </span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Average Order Value (AOV)</span>
                      <span className="text-3xl font-black text-slate-900 mt-1 block">₹{analytics.average_order_value.toFixed(2)}</span>
                      <span className="text-[11px] text-slate-400 mt-1 block">Per successfully paid transaction</span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Orders Registered</span>
                      <span className="text-3xl font-black text-slate-900 mt-1 block">{analytics.total_orders}</span>
                      <span className="text-[11px] text-slate-400 mt-1 block">Across all delivery channels</span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Payment Compliance</span>
                      <span className="text-3xl font-black text-slate-900 mt-1 block">
                        {analytics.total_orders > 0 ? Math.round((analytics.paid_orders_count / analytics.total_orders) * 100) : 0}%
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 block">Paid vs. total created orders</span>
                    </div>
                  </div>
                )}

                {/* Accounting & Revenue Lifecycle Policy Note */}
                <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
                  <IconShield className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Strict Revenue Recognition Policy: </span>
                    Paid revenue strictly excludes cancelled, failed, and uncollected orders. Cash on Delivery (COD) orders remain in pending status and are not recognized as paid revenue until doorstep delivery and physical cash collection are verified.
                  </div>
                </div>

                {/* Distribution Charts */}
                {analytics && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Distribution */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <IconTrendingUp className="w-4 h-4 text-slate-500" />
                        <span>Order Status Distribution</span>
                      </h3>
                      <div className="space-y-2.5">
                        {Object.entries(analytics.status_distribution).map(([status, count]) => {
                          const pct = analytics.total_orders > 0 ? Math.round((count / analytics.total_orders) * 100) : 0;
                          return (
                            <div key={status} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span className="uppercase text-[11px]">{status.replace(/_/g, " ")}</span>
                                <span>{count} orders ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    status === "delivered" ? "bg-emerald-500" :
                                    status === "confirmed" ? "bg-emerald-400" :
                                    status === "preparing" ? "bg-blue-500" :
                                    status === "out_for_delivery" ? "bg-purple-500" :
                                    status === "cancelled" ? "bg-rose-500" :
                                    "bg-amber-400"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payment Method Distribution */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <IconCreditCard className="w-4 h-4 text-slate-500" />
                        <span>Payment Method Distribution</span>
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(analytics.payment_method_distribution).map(([method, count]) => {
                          const pct = analytics.total_orders > 0 ? Math.round((count / analytics.total_orders) * 100) : 0;
                          return (
                            <div key={method} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-800">
                                  {method === "cod" ? "Cash on Delivery (Doorstep Collection)" : "Simulated Online Payment"}
                                </span>
                                <span className="font-mono font-bold text-slate-900">{count} orders ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-slate-800 rounded-full" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Best Selling Products */}
                {analytics && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <IconPackage className="w-4 h-4 text-slate-500" />
                      <span>Best-Selling Products (Aggregated From Actual Order Items)</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-4">Product</th>
                            <th className="py-2.5 px-4">Units Sold</th>
                            <th className="py-2.5 px-4 text-right">Revenue Generated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analytics.best_selling_products.map((item) => (
                            <tr key={item.product_id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                                    {item.product_image ? (
                                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Prod</div>
                                    )}
                                  </div>
                                  <span className="font-bold text-slate-900">{item.product_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-slate-800">{item.total_sold_quantity}</span> {item.unit}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="font-black text-emerald-800">₹{item.total_revenue.toFixed(2)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Stock Adjustment Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Adjust Product Inventory</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingProduct.name}</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Available Stock Quantity ({editingProduct.unit})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewStockQty((q) => Math.max(0, q - 10))}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  -10
                </button>
                <button
                  type="button"
                  onClick={() => setNewStockQty((q) => Math.max(0, q - 5))}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  -5
                </button>
                <input
                  type="number"
                  min="0"
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="flex-1 text-center py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-sm focus:bg-white focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setNewStockQty((q) => q + 5)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => setNewStockQty((q) => q + 10)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  +10
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Updating stock immediately affects customer cart checkout validations.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Reason / Note (Optional)
              </label>
              <input
                type="text"
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="e.g. Supplier delivery, damaged goods, physical count"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={stockSaving}
                onClick={handleSaveStock}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {stockSaving ? "Saving..." : "Save Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
