from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal, ROUND_HALF_UP
from app.database import get_db
from app.models.product import Product
from app.schemas.cart import CartValidateRequest, CartValidateResponse, CartItemValidated

router = APIRouter(prefix="/cart", tags=["Cart"])

@router.post("/validate", response_model=CartValidateResponse)
def validate_cart(payload: CartValidateRequest, db: Session = Depends(get_db)):
    """
    Validates cart items against the database source of truth.
    Checks existence, active status, requested quantities against stock,
    and returns exact decimal-accurate monetary calculations.
    """
    validated_items = []
    running_subtotal = Decimal("0.00")
    total_items_count = 0
    is_valid = True
    has_warnings = False

    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()

        if not product:
            is_valid = False
            has_warnings = True
            validated_items.append(
                CartItemValidated(
                    product_id=item.product_id,
                    name="Unknown Product",
                    slug="unknown",
                    unit="N/A",
                    price=0.0,
                    requested_quantity=item.quantity,
                    available_stock=0,
                    subtotal=0.0,
                    is_available=False,
                    error=f"Product ID {item.product_id} does not exist in inventory.",
                )
            )
            continue

        if not product.is_active:
            is_valid = False
            has_warnings = True
            validated_items.append(
                CartItemValidated(
                    product_id=product.id,
                    name=product.name,
                    slug=product.slug,
                    unit=product.unit,
                    image_url=product.image_url,
                    price=float(product.price),
                    requested_quantity=item.quantity,
                    available_stock=product.stock_quantity,
                    subtotal=0.0,
                    is_available=False,
                    error=f"'{product.name}' is currently unavailable for purchase.",
                )
            )
            continue

        item_warning = None
        item_error = None
        item_is_available = True

        # Check stock limits
        if product.stock_quantity == 0:
            is_valid = False
            has_warnings = True
            item_is_available = False
            item_error = f"'{product.name}' is out of stock."
        elif item.quantity > product.stock_quantity:
            is_valid = False
            has_warnings = True
            item_is_available = False
            item_error = f"Requested {item.quantity} exceeds available stock of {product.stock_quantity}."
            item_warning = f"Only {product.stock_quantity} left in stock."

        # Compute price accurately using Decimal
        unit_price = Decimal(str(product.price))
        item_subtotal = (unit_price * Decimal(item.quantity)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        running_subtotal += item_subtotal
        total_items_count += item.quantity

        validated_items.append(
            CartItemValidated(
                product_id=product.id,
                name=product.name,
                slug=product.slug,
                unit=product.unit,
                image_url=product.image_url,
                price=float(unit_price),
                requested_quantity=item.quantity,
                available_stock=product.stock_quantity,
                subtotal=float(item_subtotal),
                is_available=item_is_available,
                warning=item_warning,
                error=item_error,
            )
        )

    final_total = running_subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return CartValidateResponse(
        items=validated_items,
        total_items=total_items_count,
        subtotal=float(running_subtotal),
        total=float(final_total),
        is_valid=is_valid,
        has_warnings=has_warnings,
    )

@router.get("/validate-item/{product_id}")
def validate_single_item(product_id: int, quantity: int = 1, db: Session = Depends(get_db)):
    """Validates availability and stock limits for a single product."""
    if quantity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be at least 1."
        )

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found."
        )

    available = product.is_active and product.stock_quantity >= quantity
    exceeds_stock = quantity > product.stock_quantity

    unit_price = Decimal(str(product.price))
    subtotal = (unit_price * Decimal(quantity)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "product_id": product.id,
        "name": product.name,
        "unit": product.unit,
        "price": float(unit_price),
        "requested_quantity": quantity,
        "available_stock": product.stock_quantity,
        "subtotal": float(subtotal),
        "is_available": available,
        "exceeds_stock": exceeds_stock,
        "warning": f"Only {product.stock_quantity} left in stock" if exceeds_stock else None
    }
