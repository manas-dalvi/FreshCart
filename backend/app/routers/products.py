from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, case
from typing import Optional, List
from app.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.models.inventory_movement import InventoryMovement
from app.schemas.product import (
    ProductOut,
    ProductListResponse,
    StockUpdateInput,
    SearchSuggestionsResponse,
    SearchSuggestionItem,
    CategorySuggestionItem,
)
from app.routers.orders import verify_admin_key

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/search", response_model=ProductListResponse)
def search_products(
    q: str = Query(..., min_length=1, description="Search query string"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query_str = q.strip()
    words = query_str.split()
    
    # Smart multi-word search conditions:
    # Match full query phrase or all individual words across name, description, category
    word_conditions = []
    for w in words:
        w_term = f"%{w}%"
        word_conditions.append(
            or_(
                Product.name.ilike(w_term),
                Product.description.ilike(w_term),
                Category.name.ilike(w_term),
            )
        )

    base_query = db.query(Product).join(Category).filter(
        Product.is_active.is_(True),
        or_(
            Product.name.ilike(f"%{query_str}%"),
            and_(*word_conditions) if word_conditions else True,
        )
    )

    total = base_query.count()
    products = (
        base_query
        .order_by(
            case((Product.name.ilike(f"{query_str}%"), 1), else_=2),
            Product.name.asc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return ProductListResponse(
        items=[ProductOut.model_validate(p) for p in products],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/suggestions", response_model=SearchSuggestionsResponse)
def get_search_suggestions(
    q: Optional[str] = Query(None, description="Search term for suggestions"),
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """
    Returns live matching product and category suggestions for search debouncing and dropdown.
    """
    if not q or not q.strip():
        return SearchSuggestionsResponse(
            query="",
            products=[],
            categories=[],
            total_matches=0,
        )

    query_str = q.strip()
    term = f"%{query_str}%"
    words = query_str.split()

    word_conditions = []
    for w in words:
        w_term = f"%{w}%"
        word_conditions.append(
            or_(
                Product.name.ilike(w_term),
                Product.description.ilike(w_term),
                Category.name.ilike(w_term),
            )
        )

    matched_products = (
        db.query(Product)
        .join(Category)
        .filter(
            Product.is_active.is_(True),
            or_(
                Product.name.ilike(f"%{query_str}%"),
                and_(*word_conditions) if word_conditions else True,
            )
        )
        .order_by(
            case((Product.name.ilike(f"{query_str}%"), 1), else_=2),
            Product.name.asc()
        )
        .limit(limit)
        .all()
    )

    matched_categories = (
        db.query(Category)
        .filter(Category.name.ilike(term))
        .limit(4)
        .all()
    )

    product_items = [
        SearchSuggestionItem(
            id=p.id,
            name=p.name,
            slug=p.slug,
            price=float(p.price),
            unit=p.unit,
            image_url=p.image_url,
            stock_quantity=p.stock_quantity,
            category_name=p.category.name if p.category else "Grocery",
            category_slug=p.category.slug if p.category else "grocery",
        )
        for p in matched_products
    ]

    cat_items = [
        CategorySuggestionItem(
            id=c.id,
            name=c.name,
            slug=c.slug,
        )
        for c in matched_categories
    ]

    return SearchSuggestionsResponse(
        query=query_str,
        products=product_items,
        categories=cat_items,
        total_matches=len(product_items),
    )

@router.get("", response_model=ProductListResponse)
def get_products(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    category_slug: Optional[str] = Query(None, description="Filter by category slug"),
    search: Optional[str] = Query(None, description="Optional search term"),
    active_only: bool = Query(True, description="Filter active products"),
    limit: int = Query(20, ge=1, le=100, description="Pagination limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
):
    query = db.query(Product).join(Category)

    if active_only:
        query = query.filter(Product.is_active.is_(True))

    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    if category_slug:
        query = query.filter(Category.slug == category_slug.strip().lower())

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(term),
                Product.description.ilike(term),
                Category.name.ilike(term),
            )
        )

    total = query.count()
    products = query.order_by(Product.name.asc()).offset(offset).limit(limit).all()

    return ProductListResponse(
        items=[ProductOut.model_validate(p) for p in products],
        total=total,
        limit=limit,
        offset=offset,
    )

@router.get("/{product_id}", response_model=ProductOut)
def get_product_by_id(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found"
        )
    return ProductOut.model_validate(product)


@router.patch("/{product_id}/stock", response_model=ProductOut)
def update_product_stock(
    product_id: int,
    payload: StockUpdateInput,
    db: Session = Depends(get_db),
    admin_key: str = Depends(verify_admin_key),
):
    """
    Admin-only endpoint: Updates product available inventory and optional active status.
    Requires header 'X-Admin-Key'.
    Enforces non-negative stock_quantity.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found.",
        )

    prev_stock = product.stock_quantity
    new_stock = payload.stock_quantity
    diff = new_stock - prev_stock

    product.stock_quantity = new_stock
    if payload.is_active is not None:
        product.is_active = payload.is_active

    if diff != 0:
        movement = InventoryMovement(
            product_id=product.id,
            movement_type="adjustment",
            quantity_changed=diff,
            previous_stock=prev_stock,
            new_stock=new_stock,
            reason=payload.reason or "Admin manual inventory adjustment",
            order_id=None,
            admin_user="admin",
        )
        db.add(movement)

    db.commit()
    db.refresh(product)
    return ProductOut.model_validate(product)
