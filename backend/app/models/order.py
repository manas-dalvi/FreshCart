from sqlalchemy import Column, Integer, String, Numeric, Text, ForeignKey, DateTime, CheckConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_reference = Column(String(50), unique=True, index=True, nullable=False)
    
    # Customer Details
    customer_name = Column(String(150), nullable=False)
    customer_email = Column(String(150), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    
    # Delivery Address
    delivery_address = Column(Text, nullable=False)
    delivery_city = Column(String(100), nullable=False)
    delivery_state = Column(String(100), nullable=False)
    delivery_pincode = Column(String(10), nullable=False)
    delivery_instructions = Column(Text, nullable=True)
    
    # Financial breakdown
    subtotal = Column(Numeric(10, 2), nullable=False)
    delivery_fee = Column(Numeric(10, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    
    # Status tracking
    payment_method = Column(String(30), nullable=False)  # 'cod' | 'simulated_online'
    payment_status = Column(String(30), default="pending", nullable=False)  # 'pending' | 'paid' | 'failed'
    order_status = Column(String(30), default="placed", nullable=False)  # 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'payment_failed' | 'cancelled'
    
    # Lifecycle Timestamps
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    preparing_at = Column(DateTime(timezone=True), nullable=True)
    out_for_delivery_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Simulated Delivery Tracking Information
    delivery_status = Column(String(30), default="pending", nullable=False)  # 'pending' | 'order_confirmed' | 'packing_in_progress' | 'out_for_delivery' | 'delivered' | 'cancelled'
    estimated_delivery_at = Column(DateTime(timezone=True), nullable=True)
    delivery_partner_name = Column(String(100), nullable=True)
    delivery_partner_phone = Column(String(20), nullable=True)
    delivery_notes = Column(Text, nullable=True)

    # Idempotency key to prevent double charging/ordering on network retry
    idempotency_key = Column(String(64), unique=True, index=True, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="check_order_subtotal_non_negative"),
        CheckConstraint("delivery_fee >= 0", name="check_order_delivery_fee_non_negative"),
        CheckConstraint("total_amount >= 0", name="check_order_total_non_negative"),
    )

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order(id={self.id}, ref='{self.order_reference}', total={self.total_amount}, status='{self.order_status}')>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    # Frozen product attributes captured at time of purchase
    product_name = Column(String(200), nullable=False)
    product_unit = Column(String(50), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("quantity > 0", name="check_order_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="check_order_item_unit_price_non_negative"),
        CheckConstraint("subtotal >= 0", name="check_order_item_subtotal_non_negative"),
    )

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

    @property
    def product_image(self):
        return self.product.image_url if self.product else None

    def __repr__(self):
        return f"<OrderItem(id={self.id}, order_id={self.order_id}, product='{self.product_name}', qty={self.quantity}, subtotal={self.subtotal})>"
