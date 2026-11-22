from pydantic import BaseModel, ConfigDict
from typing import Optional

class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int
    product_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
