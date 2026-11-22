from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class InventoryMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: Optional[str] = None
    product_unit: Optional[str] = None
    product_image: Optional[str] = None
    category_name: Optional[str] = None
    movement_type: str  # 'stock_in' | 'stock_out' | 'adjustment'
    quantity_changed: int
    previous_stock: int
    new_stock: int
    reason: str
    order_id: Optional[int] = None
    order_reference: Optional[str] = None
    admin_user: Optional[str] = None
    created_at: datetime

class InventoryMovementListResponse(BaseModel):
    items: List[InventoryMovementOut]
    total: int
    limit: int
    offset: int
