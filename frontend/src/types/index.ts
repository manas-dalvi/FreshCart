export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  category_id: number;
  stock_quantity: number;
  image_url?: string | null;
  unit: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  category?: Category | null;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthCheckResponse {
  status: string;
  database: string;
  service: string;
  version: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartItemInput {
  product_id: number;
  quantity: number;
}

export interface CartItemValidated {
  product_id: number;
  name: string;
  slug: string;
  unit: string;
  image_url?: string | null;
  price: number;
  requested_quantity: number;
  available_stock: number;
  subtotal: number;
  is_available: boolean;
  warning?: string | null;
  error?: string | null;
}

export interface CartValidateResponse {
  items: CartItemValidated[];
  total_items: number;
  subtotal: number;
  total: number;
  is_valid: boolean;
  has_warnings: boolean;
}

export interface CustomerCheckoutInput {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_pincode: string;
  delivery_instructions?: string;
  payment_method: "cod" | "simulated_online";
  items: CartItemInput[];
  idempotency_key?: string;
}

export interface OrderItemOut {
  id: number;
  product_id: number;
  product_name: string;
  product_unit: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  product_image?: string | null;
}

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "payment_failed"
  | "cancelled";

export type DeliveryStatus =
  | "pending"
  | "order_confirmed"
  | "packing_in_progress"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "payment_pending";

export interface OrderOut {
  id: number;
  order_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_pincode: string;
  delivery_instructions?: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: "cod" | "simulated_online";
  payment_status: "pending" | "paid" | "failed" | "cancelled";
  order_status: OrderStatus;
  created_at: string;
  confirmed_at?: string | null;
  preparing_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  delivery_status: DeliveryStatus;
  estimated_delivery_at?: string | null;
  delivery_partner_name?: string | null;
  delivery_partner_phone?: string | null;
  delivery_notes?: string | null;
  items: OrderItemOut[];
}

export interface OrderStatusUpdateInput {
  order_status: OrderStatus;
  delivery_notes?: string;
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
}

export interface OrderFilterParams {
  customer_email?: string;
  customer_phone?: string;
  order_reference?: string;
  order_status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CustomerOrderHistoryLookup {
  order_references: string[];
}

export interface PaymentSimulateResponse {
  success: boolean;
  order_reference: string;
  payment_status: string;
  order_status: string;
  message: string;
  order: OrderOut;
}

export interface AdminOverviewStats {
  total_orders: number;
  total_products: number;
  total_categories: number;
  pending_orders: number;
  preparing_orders: number;
  dispatched_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  low_stock_count: number;
  out_of_stock_count: number;
  low_stock_threshold: number;
  recent_orders: OrderOut[];
  inventory_alerts: Product[];
}

export interface DailySalesPoint {
  date: string;
  revenue: number;
  orders_count: number;
}

export interface TopProductItem {
  product_id: number;
  product_name: string;
  total_sold_quantity: number;
  total_revenue: number;
  product_image?: string | null;
  unit: string;
}

export interface AdminAnalyticsStats {
  total_paid_revenue: number;
  total_orders: number;
  paid_orders_count: number;
  average_order_value: number;
  status_distribution: Record<string, number>;
  payment_method_distribution: Record<string, number>;
  sales_trend: DailySalesPoint[];
  best_selling_products: TopProductItem[];
}

export interface SearchSuggestionItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  unit: string;
  image_url?: string | null;
  stock_quantity: number;
  category_name: string;
  category_slug: string;
}

export interface CategorySuggestionItem {
  id: number;
  name: string;
  slug: string;
}

export interface SearchSuggestionsResponse {
  query: string;
  products: SearchSuggestionItem[];
  categories: CategorySuggestionItem[];
  total_matches: number;
}

export type MovementType = "stock_in" | "stock_out" | "adjustment";

export interface InventoryMovement {
  id: number;
  product_id: number;
  product_name?: string | null;
  product_unit?: string | null;
  product_image?: string | null;
  category_name?: string | null;
  movement_type: MovementType;
  quantity_changed: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  order_id?: number | null;
  order_reference?: string | null;
  admin_user?: string | null;
  created_at: string;
}

export interface InventoryMovementListResponse {
  items: InventoryMovement[];
  total: number;
  limit: number;
  offset: number;
}

export interface InventoryMovementFilterParams {
  product_id?: number;
  movement_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
