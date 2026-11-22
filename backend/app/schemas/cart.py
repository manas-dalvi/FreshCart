from pydantic import BaseModel, Field
from typing import List, Optional

class CartItemInput(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantity must be at least 1")

class CartValidateRequest(BaseModel):
    items: List[CartItemInput]

class CartItemValidated(BaseModel):
    product_id: int
    name: str
    slug: str
    unit: str
    image_url: Optional[str] = None
    price: float = Field(..., description="Verified price from database in INR")
    requested_quantity: int
    available_stock: int
    subtotal: float
    is_available: bool = True
    warning: Optional[str] = None
    error: Optional[str] = None

class CartValidateResponse(BaseModel):
    items: List[CartItemValidated]
    total_items: int
    subtotal: float
    total: float
    is_valid: bool
    has_warnings: bool
