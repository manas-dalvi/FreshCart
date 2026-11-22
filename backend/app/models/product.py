from sqlalchemy import Column, Integer, String, Numeric, Boolean, Text, ForeignKey, DateTime, CheckConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)  # Exact decimal precision for currency (INR)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    stock_quantity = Column(Integer, default=0, nullable=False)
    image_url = Column(String(500), nullable=True)
    unit = Column(String(50), nullable=False)  # e.g., kg, g, litre, pack, piece
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("price >= 0", name="check_product_price_non_negative"),
        CheckConstraint("stock_quantity >= 0", name="check_product_stock_non_negative"),
    )

    category = relationship("Category", back_populates="products")
    inventory_movements = relationship("InventoryMovement", back_populates="product", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', price={self.price}, stock={self.stock_quantity})>"
