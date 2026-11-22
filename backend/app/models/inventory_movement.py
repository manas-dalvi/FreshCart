from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, CheckConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    movement_type = Column(String(30), nullable=False, index=True)  # 'stock_in' | 'stock_out' | 'adjustment'
    quantity_changed = Column(Integer, nullable=False)  # signed change (+/-)
    previous_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True)
    admin_user = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        CheckConstraint(
            "movement_type IN ('stock_in', 'stock_out', 'adjustment')",
            name="check_movement_type_valid",
        ),
        CheckConstraint("previous_stock >= 0", name="check_movement_prev_stock_non_negative"),
        CheckConstraint("new_stock >= 0", name="check_movement_new_stock_non_negative"),
    )

    product = relationship("Product", back_populates="inventory_movements")
    order = relationship("Order")

    def __repr__(self):
        return (
            f"<InventoryMovement(id={self.id}, product_id={self.product_id}, "
            f"type='{self.movement_type}', qty={self.quantity_changed}, "
            f"{self.previous_stock}->{self.new_stock}, reason='{self.reason}')>"
        )
