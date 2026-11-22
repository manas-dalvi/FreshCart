from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import Optional
from datetime import datetime, date

from app.database import get_db
from app.models.inventory_movement import InventoryMovement
from app.models.product import Product
from app.models.category import Category
from app.models.order import Order
from app.schemas.inventory_movement import (
    InventoryMovementOut,
    InventoryMovementListResponse,
)
from app.routers.orders import verify_admin_key

router = APIRouter(prefix="/inventory", tags=["Inventory"])

VALID_MOVEMENT_TYPES = {"stock_in", "stock_out", "adjustment"}

@router.get("/movements", response_model=InventoryMovementListResponse)
def list_inventory_movements(
    product_id: Optional[int] = Query(None, description="Filter movements by product ID"),
    movement_type: Optional[str] = Query(None, description="Filter by movement type: 'stock_in', 'stock_out', 'adjustment'"),
    date_from: Optional[str] = Query(None, description="Filter movements from date (YYYY-MM-DD or ISO datetime)"),
    date_to: Optional[str] = Query(None, description="Filter movements up to date (YYYY-MM-DD or ISO datetime)"),
    search: Optional[str] = Query(None, description="Search by product name, reason, or order reference"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    admin_key: str = Depends(verify_admin_key),
):
    """
    Admin-only endpoint: Retrieves audit ledger of inventory movements.
    Supports filtering by product ID, movement type, date ranges, and search keywords.
    Requires header 'X-Admin-Key'.
    """
    query = (
        db.query(
            InventoryMovement,
            Product.name.label("product_name"),
            Product.unit.label("product_unit"),
            Product.image_url.label("product_image"),
            Category.name.label("category_name"),
            Order.order_reference.label("order_reference"),
        )
        .join(Product, InventoryMovement.product_id == Product.id)
        .outerjoin(Category, Product.category_id == Category.id)
        .outerjoin(Order, InventoryMovement.order_id == Order.id)
    )

    if product_id is not None:
        query = query.filter(InventoryMovement.product_id == product_id)

    if movement_type:
        clean_type = movement_type.strip().lower()
        if clean_type != "all":
            if clean_type not in VALID_MOVEMENT_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid movement_type '{movement_type}'. Allowed: {sorted(list(VALID_MOVEMENT_TYPES))}",
                )
            query = query.filter(InventoryMovement.movement_type == clean_type)

    if date_from:
        try:
            parsed_from = datetime.fromisoformat(date_from.strip().replace("Z", "+00:00"))
            query = query.filter(InventoryMovement.created_at >= parsed_from)
        except ValueError:
            try:
                d = date.fromisoformat(date_from.strip())
                query = query.filter(InventoryMovement.created_at >= datetime.combine(d, datetime.min.time()))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date_from format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).",
                )

    if date_to:
        try:
            parsed_to = datetime.fromisoformat(date_to.strip().replace("Z", "+00:00"))
            query = query.filter(InventoryMovement.created_at <= parsed_to)
        except ValueError:
            try:
                d = date.fromisoformat(date_to.strip())
                query = query.filter(InventoryMovement.created_at <= datetime.combine(d, datetime.max.time()))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date_to format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).",
                )

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(s),
                InventoryMovement.reason.ilike(s),
                Order.order_reference.ilike(s),
            )
        )

    total = query.count()
    rows = (
        query
        .order_by(desc(InventoryMovement.created_at), desc(InventoryMovement.id))
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = []
    for mov, prod_name, prod_unit, prod_img, cat_name, ord_ref in rows:
        items.append(
            InventoryMovementOut(
                id=mov.id,
                product_id=mov.product_id,
                product_name=prod_name,
                product_unit=prod_unit,
                product_image=prod_img,
                category_name=cat_name,
                movement_type=mov.movement_type,
                quantity_changed=mov.quantity_changed,
                previous_stock=mov.previous_stock,
                new_stock=mov.new_stock,
                reason=mov.reason,
                order_id=mov.order_id,
                order_reference=ord_ref,
                admin_user=mov.admin_user,
                created_at=mov.created_at,
            )
        )

    return InventoryMovementListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )
