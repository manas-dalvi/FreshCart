import {
  Category,
  Product,
  ProductListResponse,
  HealthCheckResponse,
  CartItemInput,
  CartValidateResponse,
  CustomerCheckoutInput,
  CustomerOrderHistoryLookup,
  OrderOut,
  PaymentSimulateResponse,
  OrderStatusUpdateInput,
  OrderFilterParams,
  AdminOverviewStats,
  AdminAnalyticsStats,
  SearchSuggestionsResponse,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE_URL}/api/categories`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load categories: HTTP ${res.status}`);
  return res.json();
}

export async function fetchCategoryById(categoryId: number): Promise<Category> {
  const res = await fetch(`${API_BASE_URL}/api/categories/${categoryId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load category ${categoryId}: HTTP ${res.status}`);
  return res.json();
}

export interface ProductQueryParams {
  category_slug?: string;
  category_id?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function fetchProducts(params: ProductQueryParams = {}): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params.category_slug) query.set("category_slug", params.category_slug);
  if (params.category_id !== undefined) query.set("category_id", String(params.category_id));
  if (params.search) query.set("search", params.search);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));

  const url = `${API_BASE_URL}/api/products${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load products: HTTP ${res.status}`);
  return res.json();
}

export async function searchProducts(searchTerm: string, limit = 20, offset = 0): Promise<ProductListResponse> {
  const query = new URLSearchParams({
    q: searchTerm,
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${API_BASE_URL}/api/products/search?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to search products: HTTP ${res.status}`);
  return res.json();
}

export async function fetchProductById(productId: number): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load product ${productId}: HTTP ${res.status}`);
  return res.json();
}

export async function validateCart(items: CartItemInput[]): Promise<CartValidateResponse> {
  const res = await fetch(`${API_BASE_URL}/api/cart/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Cart validation failed: HTTP ${res.status}`);
  return res.json();
}

export async function createOrder(payload: CustomerCheckoutInput): Promise<OrderOut> {
  const res = await fetch(`${API_BASE_URL}/api/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Order placement failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchOrderByReference(orderReference: string): Promise<OrderOut> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderReference)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch order: HTTP ${res.status}`);
  }
  return res.json();
}

export async function simulatePayment(
  orderReference: string,
  scenario: "success" | "failure"
): Promise<PaymentSimulateResponse> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderReference)}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario }),
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Payment simulation failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function switchOrderToCOD(orderReference: string): Promise<OrderOut> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderReference)}/switch-to-cod`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to switch to COD: HTTP ${res.status}`);
  }
  return res.json();
}

export async function cancelOrder(orderReference: string): Promise<OrderOut> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderReference)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to cancel order: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCustomerOrders(payload: CustomerOrderHistoryLookup): Promise<OrderOut[]> {
  const res = await fetch(`${API_BASE_URL}/api/orders/customer-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch customer orders: HTTP ${res.status}`);
  }
  return res.json();
}

export async function checkAdminSession(): Promise<{ authenticated: boolean }> {
  try {
    const res = await fetch("/api/admin/session", { cache: "no-store" });
    if (!res.ok) return { authenticated: false };
    return res.json();
  } catch {
    return { authenticated: false };
  }
}

export async function adminLogin(passkey: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passkey }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Authentication failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST" });
}

export async function fetchOrders(
  params: OrderFilterParams = {}
): Promise<OrderOut[]> {
  const query = new URLSearchParams();
  if (params.customer_email) query.set("customer_email", params.customer_email);
  if (params.customer_phone) query.set("customer_phone", params.customer_phone);
  if (params.order_reference) query.set("order_reference", params.order_reference);
  if (params.order_status) query.set("order_status", params.order_status);
  if (params.search) query.set("search", params.search);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));

  const url = `/api/admin/orders${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch orders: HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateOrderStatus(
  orderReference: string,
  payload: OrderStatusUpdateInput
): Promise<OrderOut> {
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderReference)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update status: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAdminOverview(lowStockThreshold = 25): Promise<AdminOverviewStats> {
  const res = await fetch(`/api/admin/overview?low_stock_threshold=${lowStockThreshold}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch overview: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsStats> {
  const res = await fetch("/api/admin/analytics", {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch analytics: HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateProductStock(
  productId: number,
  stockQuantity: number,
  isActive?: boolean,
  reason?: string
): Promise<Product> {
  const res = await fetch(`/api/admin/products/${productId}/stock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stock_quantity: stockQuantity,
      is_active: isActive,
      reason: reason,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update stock: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchInventoryMovements(
  params: import("@/types").InventoryMovementFilterParams = {}
): Promise<import("@/types").InventoryMovementListResponse> {
  const q = new URLSearchParams();
  if (params.product_id !== undefined && params.product_id !== null) {
    q.set("product_id", String(params.product_id));
  }
  if (params.movement_type && params.movement_type !== "all") {
    q.set("movement_type", params.movement_type);
  }
  if (params.date_from) {
    q.set("date_from", params.date_from);
  }
  if (params.date_to) {
    q.set("date_to", params.date_to);
  }
  if (params.search) {
    q.set("search", params.search.trim());
  }
  if (params.limit !== undefined) {
    q.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    q.set("offset", String(params.offset));
  }

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`/api/admin/inventory/movements${queryStr}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to load inventory movements: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSearchSuggestions(
  query: string,
  limit = 6
): Promise<SearchSuggestionsResponse> {
  if (!query || !query.trim()) {
    return { query: "", products: [], categories: [], total_matches: 0 };
  }
  const q = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  const res = await fetch(`${API_BASE_URL}/api/products/suggestions?${q.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to load suggestions: HTTP ${res.status}`);
  }
  return res.json();
}
