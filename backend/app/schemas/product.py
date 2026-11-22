from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.schemas.category import CategoryOut

class ProductBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price: float = Field(..., ge=0, description="Price in INR, must be non-negative")
    category_id: int
    stock_quantity: int = Field(0, ge=0, description="Stock quantity, must be non-negative")
    image_url: Optional[str] = None
    unit: str = Field(..., description="Unit of measurement (e.g., kg, g, pack, piece, litre)")
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    category: Optional[CategoryOut] = None

    model_config = ConfigDict(from_attributes=True)

class ProductListResponse(BaseModel):
    items: List[ProductOut]
    total: int
    limit: int
    offset: int

class StockUpdateInput(BaseModel):
    stock_quantity: int = Field(..., ge=0, description="New available stock quantity, non-negative")
    is_active: Optional[bool] = Field(None, description="Optional active status")
    reason: Optional[str] = Field(None, description="Optional audit reason for inventory adjustment")

class SearchSuggestionItem(BaseModel):
    id: int
    name: str
    slug: str
    price: float
    unit: str
    image_url: Optional[str] = None
    stock_quantity: int
    category_name: str
    category_slug: str

class CategorySuggestionItem(BaseModel):
    id: int
    name: str
    slug: str

class SearchSuggestionsResponse(BaseModel):
    query: str
    products: List[SearchSuggestionItem]
    categories: List[CategorySuggestionItem]
    total_matches: int
