from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal, Dict
from datetime import datetime
import re
from app.schemas.product import ProductOut

class CustomerCheckoutInput(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=150, description="Full name of the customer")
    customer_email: str = Field(..., description="Valid email address")
    customer_phone: str = Field(..., description="10-digit Indian mobile number")
    delivery_address: str = Field(..., min_length=5, max_length=500, description="Street address and landmark")
    delivery_city: str = Field(..., min_length=2, max_length=100, description="City")
    delivery_state: str = Field(..., min_length=2, max_length=100, description="State")
    delivery_pincode: str = Field(..., description="6-digit Indian PIN code")
    delivery_instructions: Optional[str] = Field(None, max_length=500, description="Special instructions for delivery")
    payment_method: Literal["cod", "simulated_online"] = Field(..., description="Chosen payment method")
    items: List["CartItemInputOrder"] = Field(..., min_length=1, description="List of items in the cart")
    idempotency_key: Optional[str] = Field(None, max_length=64, description="Unique client idempotency token")

    @field_validator("customer_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("Customer name must be at least 2 characters long.")
        return clean

    @field_validator("customer_email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(email_regex, clean):
            raise ValueError("Invalid email address format.")
        return clean

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Strip spaces, hyphens, and optional +91 prefix
        digits = re.sub(r"\D", "", v.strip())
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        elif digits.startswith("0") and len(digits) == 11:
            digits = digits[1:]
        
        if not (len(digits) == 10 and digits[0] in "6789"):
            raise ValueError("Customer phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.")
        return digits

    @field_validator("delivery_pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        clean = re.sub(r"\D", "", v.strip())
        if len(clean) != 6:
            raise ValueError("PIN code must be exactly 6 numeric digits.")
        return clean

class CartItemInputOrder(BaseModel):
    product_id: int = Field(..., gt=0, description="Valid product ID")
    quantity: int = Field(..., gt=0, description="Quantity must be at least 1")

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_unit: str
    unit_price: float
    quantity: int
    subtotal: float
    product_image: Optional[str] = None

    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    order_reference: str
    customer_name: str
    customer_email: str
    customer_phone: str
    delivery_address: str
    delivery_city: str
    delivery_state: str
    delivery_pincode: str
    delivery_instructions: Optional[str] = None
    subtotal: float
    delivery_fee: float
    total_amount: float
    payment_method: str
    payment_status: str
    order_status: str
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    preparing_at: Optional[datetime] = None
    out_for_delivery_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    delivery_status: str = "pending"
    estimated_delivery_at: Optional[datetime] = None
    delivery_partner_name: Optional[str] = None
    delivery_partner_phone: Optional[str] = None
    delivery_notes: Optional[str] = None
    items: List[OrderItemOut]

    class Config:
        from_attributes = True

class OrderStatusUpdateInput(BaseModel):
    order_status: Literal["placed", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"]
    delivery_notes: Optional[str] = Field(None, max_length=500, description="Optional notes about this delivery status update")
    delivery_partner_name: Optional[str] = Field(None, max_length=100, description="Assigned delivery courier")
    delivery_partner_phone: Optional[str] = Field(None, max_length=20, description="Courier contact number")

class CustomerOrderHistoryLookup(BaseModel):
    order_references: List[str] = Field(..., min_length=1, description="List of valid customer order references (proof of order ownership)")

class PaymentSimulateRequest(BaseModel):
    scenario: Literal["success", "failure"] = Field("success", description="Simulated payment outcome")

class PaymentSimulateResponse(BaseModel):
    success: bool
    order_reference: str
    payment_status: str
    order_status: str
    message: str
    order: OrderOut

class AdminOverviewStats(BaseModel):
    total_orders: int
    total_products: int
    total_categories: int
    pending_orders: int
    preparing_orders: int
    dispatched_orders: int
    delivered_orders: int
    cancelled_orders: int
    low_stock_count: int
    out_of_stock_count: int
    low_stock_threshold: int
    recent_orders: List[OrderOut]
    inventory_alerts: List[ProductOut]

class DailySalesPoint(BaseModel):
    date: str
    revenue: float
    orders_count: int

class TopProductItem(BaseModel):
    product_id: int
    product_name: str
    total_sold_quantity: int
    total_revenue: float
    product_image: Optional[str] = None
    unit: str

class AdminAnalyticsStats(BaseModel):
    total_paid_revenue: float
    total_orders: int
    paid_orders_count: int
    average_order_value: float
    status_distribution: Dict[str, int]
    payment_method_distribution: Dict[str, int]
    sales_trend: List[DailySalesPoint]
    best_selling_products: List[TopProductItem]
