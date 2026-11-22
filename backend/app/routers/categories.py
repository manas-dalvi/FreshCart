from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryOut

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryOut])
def get_categories(
    active_only: bool = Query(True, description="Filter only active categories"),
    db: Session = Depends(get_db),
):
    query = db.query(
        Category,
        func.count(Product.id).label("product_count")
    ).outerjoin(
        Product, (Product.category_id == Category.id) & (Product.is_active.is_(True))
    )

    if active_only:
        query = query.filter(Category.is_active.is_(True))

    query = query.group_by(Category.id).order_by(Category.name.asc())
    results = query.all()

    category_list = []
    for cat, count in results:
        out = CategoryOut.model_validate(cat)
        out.product_count = count
        category_list.append(out)

    return category_list

@router.get("/{category_id}", response_model=CategoryOut)
def get_category_by_id(category_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {category_id} not found"
        )
    count = db.query(Product).filter(Product.category_id == category.id, Product.is_active.is_(True)).count()
    out = CategoryOut.model_validate(category)
    out.product_count = count
    return out
