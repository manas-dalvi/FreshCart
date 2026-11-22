from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import re

from app.database import get_db
from app.core.config import settings
from app.models.category import Category
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.inventory_movement import InventoryMovement
from app.schemas.product import ProductOut
from app.schemas.order import (
    CustomerCheckoutInput,
    CustomerOrderHistoryLookup,
    OrderOut,
    OrderStatusUpdateInput,
    PaymentSimulateRequest,
    PaymentSimulateResponse,
    AdminOverviewStats,
    AdminAnalyticsStats,
    DailySalesPoint,
    TopProductItem,
)

router = APIRouter(prefix="/orders", tags=["Orders & Checkout"])

# Demonstration-level admin API access control header
ADMIN_KEY_HEADER = APIKeyHeader(name="X-Admin-Key", auto_error=False)

def verify_admin_key(api_key: Optional[str] = Depends(ADMIN_KEY_HEADER)) -> str:
    """
    Demonstration-level admin access control for local academic review.
    Validates the 'X-Admin-Key' request header against backend environment settings.
    Rejects unauthenticated or unauthorized requests with HTTP 401.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required. Missing 'X-Admin-Key' header.",
        )
    if api_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin authentication key. Access denied.",
        )
    return api_key

VALID_STATUS_TRANSITIONS = {
    "placed": ["confirmed", "payment_failed", "cancelled"],
    "payment_failed": ["confirmed", "placed", "cancelled"],
    "confirmed": ["preparing", "cancelled"],
    "preparing": ["out_for_delivery", "cancelled"],
    "out_for_delivery": ["delivered"],
    "delivered": [],
    "cancelled": [],
}

@router.post("/checkout", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def checkout_order(payload: CustomerCheckoutInput, db: Session = Depends(get_db)):
    """
    Validates items against live database inventory, deducts stock atomically,
    calculates prices using database source of truth, and creates an order.
    Supports idempotency token to prevent duplicate order creation.
    """
    # 1. Idempotency Check
    if payload.idempotency_key:
        existing_order = (
            db.query(Order)
            .filter(Order.idempotency_key == payload.idempotency_key)
            .first()
        )
        if existing_order:
            return existing_order

    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty. At least one item is required to place an order.",
        )

    # 2. Pre-validation of all items in cart before modifying any state
    validated_products = []
    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with ID {item.product_id} does not exist in inventory.",
            )

        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.name}' is currently unavailable for purchase.",
            )

        if product.stock_quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.name}' is out of stock.",
            )

        if item.quantity > product.stock_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}, requested: {item.quantity}.",
            )

        validated_products.append((product, item.quantity))

    # 3. Atomic Database Transaction: Deduct stock & Create Order
    try:
        running_subtotal = Decimal("0.00")
        order_items = []
        pending_movements = []

        for product, quantity in validated_products:
            unit_price = Decimal(str(product.price))
            item_subtotal = (unit_price * Decimal(quantity)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            running_subtotal += item_subtotal

            # Deduct inventory
            prev_stock = product.stock_quantity
            product.stock_quantity -= quantity
            new_stock = product.stock_quantity

            order_items.append(
                OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    product_unit=product.unit,
                    unit_price=unit_price,
                    quantity=quantity,
                    subtotal=item_subtotal,
                )
            )

            pending_movements.append(
                {
                    "product_id": product.id,
                    "quantity": quantity,
                    "previous_stock": prev_stock,
                    "new_stock": new_stock,
                }
            )

        # Free delivery if subtotal >= 500, else ₹40 standard delivery fee
        delivery_fee = (
            Decimal("0.00")
            if running_subtotal >= Decimal("500.00")
            else Decimal("40.00")
        )
        total_amount = (running_subtotal + delivery_fee).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        date_str = datetime.now().strftime("%Y%m%d")
        ref_suffix = uuid.uuid4().hex[:8].upper()
        order_reference = f"FC-{date_str}-{ref_suffix}"

        order = Order(
            order_reference=order_reference,
            customer_name=payload.customer_name,
            customer_email=payload.customer_email,
            customer_phone=payload.customer_phone,
            delivery_address=payload.delivery_address,
            delivery_city=payload.delivery_city,
            delivery_state=payload.delivery_state,
            delivery_pincode=payload.delivery_pincode,
            delivery_instructions=payload.delivery_instructions,
            subtotal=running_subtotal,
            delivery_fee=delivery_fee,
            total_amount=total_amount,
            payment_method=payload.payment_method,
            payment_status="pending",
            order_status="placed",
            delivery_status="pending",
            delivery_notes="Standard Express Delivery",
            idempotency_key=payload.idempotency_key,
        )

        order.items = order_items
        db.add(order)
        db.flush()

        # Record inventory stock_out movements linked to this order
        for item_data in pending_movements:
            movement = InventoryMovement(
                product_id=item_data["product_id"],
                movement_type="stock_out",
                quantity_changed=-item_data["quantity"],
                previous_stock=item_data["previous_stock"],
                new_stock=item_data["new_stock"],
                reason=f"Customer order checkout ({order.order_reference})",
                order_id=order.id,
                admin_user=f"Customer ({payload.customer_name})",
            )
            db.add(movement)

        db.commit()
        db.refresh(order)

        return order

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Order creation failed: {str(exc)}",
        )


@router.get("", response_model=List[OrderOut])
def list_orders(
    customer_email: Optional[str] = None,
    customer_phone: Optional[str] = None,
    order_reference: Optional[str] = None,
    order_status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin_key: str = Depends(verify_admin_key),
):
    """
    Admin-only endpoint: Retrieves orders from the SQLite database.
    Requires demonstration admin key header 'X-Admin-Key'.
    Rejects unauthenticated requests with HTTP 401.
    """
    query = db.query(Order)

    if order_reference:
        query = query.filter(Order.order_reference.ilike(f"%{order_reference.strip()}%"))

    if customer_email:
        query = query.filter(Order.customer_email.ilike(f"%{customer_email.strip()}%"))

    if customer_phone:
        clean_phone = re.sub(r"\D", "", customer_phone.strip())
        if clean_phone.startswith("91") and len(clean_phone) == 12:
            clean_phone = clean_phone[2:]
        elif clean_phone.startswith("0") and len(clean_phone) == 11:
            clean_phone = clean_phone[1:]
        query = query.filter(Order.customer_phone.contains(clean_phone))

    if order_status and order_status.lower() != "all":
        query = query.filter(Order.order_status == order_status.strip().lower())

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Order.order_reference.ilike(s))
            | (Order.customer_name.ilike(s))
            | (Order.customer_email.ilike(s))
            | (Order.customer_phone.ilike(s))
        )

    return query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()


@router.post("/customer-history", response_model=List[OrderOut])
def get_customer_order_history(
    payload: CustomerOrderHistoryLookup,
    db: Session = Depends(get_db),
):
    """
    Public customer-facing endpoint to look up order history.
    Strictly permits lookup ONLY via previously issued, unpredictable order references
    stored in the customer's browser session. Does not return orders based on email or phone,
    preventing unauthorized order enumeration or customer data exposure.
    """
    clean_refs = [
        r.strip().upper()
        for r in payload.order_references
        if r and isinstance(r, str) and r.strip()
    ]
    if not clean_refs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid order references provided. Order lookup requires valid order references.",
        )

    return (
        db.query(Order)
        .filter(Order.order_reference.in_(clean_refs))
        .order_by(Order.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/admin/overview", response_model=AdminOverviewStats)
def get_admin_overview(
    db: Session = Depends(get_db),
    admin_key: str = Depends(verify_admin_key),
    low_stock_threshold: int = Query(25, ge=1, le=1000),
):
    """
    Admin-only endpoint: Computes live store statistics, category/product/order counters,
    and inventory alerts derived directly from SQLite database records.
    """
    total_orders = db.query(Order).count()
    total_products = db.query(Product).count()
    total_categories = db.query(Category).count()

    pending_orders = db.query(Order).filter(Order.order_status == "placed").count()
    preparing_orders = db.query(Order).filter(Order.order_status == "preparing").count()
    dispatched_orders = db.query(Order).filter(Order.order_status == "out_for_delivery").count()
    delivered_orders = db.query(Order).filter(Order.order_status == "delivered").count()
    cancelled_orders = db.query(Order).filter(Order.order_status == "cancelled").count()

    low_stock_products = (
        db.query(Product)
        .filter(Product.stock_quantity <= low_stock_threshold, Product.stock_quantity > 0)
        .order_by(Product.stock_quantity.asc())
        .all()
    )
    out_of_stock_products = (
        db.query(Product)
        .filter(Product.stock_quantity <= 0)
        .order_by(Product.name.asc())
        .all()
    )

    recent_orders = (
        db.query(Order)
        .order_by(Order.created_at.desc())
        .limit(6)
        .all()
    )

    inventory_alerts = out_of_stock_products + low_stock_products

    return AdminOverviewStats(
        total_orders=total_orders,
        total_products=total_products,
        total_categories=total_categories,
        pending_orders=pending_orders,
        preparing_orders=preparing_orders,
        dispatched_orders=dispatched_orders,
        delivered_orders=delivered_orders,
        cancelled_orders=cancelled_orders,
        low_stock_count=len(low_stock_products),
        out_of_stock_count=len(out_of_stock_products),
        low_stock_threshold=low_stock_threshold,
        recent_orders=recent_orders,
        inventory_alerts=[ProductOut.model_validate(p) for p in inventory_alerts[:10]],
    )


@router.get("/admin/analytics", response_model=AdminAnalyticsStats)
def get_admin_analytics(
    db: Session = Depends(get_db),
    admin_key: str = Depends(verify_admin_key),
):
    """
    Admin-only endpoint: Computes sales metrics, AOV, status distribution, and top-selling products.
    Paid revenue strictly accounts for successfully paid transactions (excluding pending COD and cancelled orders).
    """
    total_paid_revenue_query = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0.0))
        .filter(Order.payment_status == "paid")
        .scalar()
    )
    total_paid_revenue = float(total_paid_revenue_query)

    total_orders = db.query(Order).count()
    paid_orders_count = db.query(Order).filter(Order.payment_status == "paid").count()

    average_order_value = (
        round(total_paid_revenue / paid_orders_count, 2)
        if paid_orders_count > 0
        else 0.0
    )

    status_rows = (
        db.query(Order.order_status, func.count(Order.id))
        .group_by(Order.order_status)
        .all()
    )
    status_distribution = {status: count for status, count in status_rows}

    pm_rows = (
        db.query(Order.payment_method, func.count(Order.id))
        .group_by(Order.payment_method)
        .all()
    )
    payment_method_distribution = {pm: count for pm, count in pm_rows}

    sales_by_date = (
        db.query(
            func.date(Order.created_at).label("sale_date"),
            func.coalesce(func.sum(Order.total_amount), 0.0).label("revenue"),
            func.count(Order.id).label("orders_count"),
        )
        .filter(Order.payment_status == "paid")
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at).asc())
        .all()
    )
    sales_trend = [
        DailySalesPoint(
            date=str(r.sale_date or ""),
            revenue=float(r.revenue),
            orders_count=int(r.orders_count),
        )
        for r in sales_by_date
    ]

    top_prods_query = (
        db.query(
            OrderItem.product_id,
            OrderItem.product_name,
            OrderItem.product_unit,
            func.sum(OrderItem.quantity).label("sold_qty"),
            func.sum(OrderItem.subtotal).label("item_rev"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.order_status != "cancelled", Order.payment_status != "failed")
        .group_by(OrderItem.product_id, OrderItem.product_name, OrderItem.product_unit)
        .order_by(desc("sold_qty"))
        .limit(8)
        .all()
    )

    best_selling = []
    for row in top_prods_query:
        p = db.query(Product).filter(Product.id == row.product_id).first()
        best_selling.append(
            TopProductItem(
                product_id=row.product_id,
                product_name=row.product_name,
                total_sold_quantity=int(row.sold_qty or 0),
                total_revenue=float(row.item_rev or 0.0),
                product_image=p.image_url if p else None,
                unit=row.product_unit,
            )
        )

    return AdminAnalyticsStats(
        total_paid_revenue=total_paid_revenue,
        total_orders=total_orders,
        paid_orders_count=paid_orders_count,
        average_order_value=average_order_value,
        status_distribution=status_distribution,
        payment_method_distribution=payment_method_distribution,
        sales_trend=sales_trend,
        best_selling_products=best_selling,
    )


@router.get("/{order_reference}", response_model=OrderOut)
def get_order_by_reference(order_reference: str, db: Session = Depends(get_db)):
    """Retrieves full order details including line items and payment status."""
    order = (
        db.query(Order)
        .filter(Order.order_reference == order_reference.strip().upper())
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with reference '{order_reference}' not found.",
        )
    return order


@router.post("/{order_reference}/pay", response_model=PaymentSimulateResponse)
def simulate_order_payment(
    order_reference: str,
    payload: PaymentSimulateRequest,
    db: Session = Depends(get_db),
):
    """
    Simulates online payment authorization.
    Supports explicit 'success' and 'failure' scenarios.
    Allows retry after failure without duplicate order creation or double stock deduction.
    """
    order = (
        db.query(Order)
        .filter(Order.order_reference == order_reference.strip().upper())
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with reference '{order_reference}' not found.",
        )

    if order.payment_status == "paid":
        return PaymentSimulateResponse(
            success=True,
            order_reference=order.order_reference,
            payment_status="paid",
            order_status=order.order_status,
            message="Order has already been paid successfully.",
            order=order,
        )

    if payload.scenario == "success":
        now = datetime.now()
        order.payment_status = "paid"
        order.order_status = "confirmed"
        order.confirmed_at = now
        order.delivery_status = "order_confirmed"
        order.estimated_delivery_at = now + timedelta(minutes=45)
        message = "Simulated payment processed successfully via Mock Gateway."
        success = True
    else:
        order.payment_status = "failed"
        order.order_status = "payment_failed"
        order.delivery_status = "payment_pending"
        message = "Simulated payment authorization failed by issuing bank. Please retry or choose another payment method."
        success = False

    db.commit()
    db.refresh(order)

    return PaymentSimulateResponse(
        success=success,
        order_reference=order.order_reference,
        payment_status=order.payment_status,
        order_status=order.order_status,
        message=message,
        order=order,
    )


@router.post("/{order_reference}/switch-to-cod", response_model=OrderOut)
def switch_order_to_cod(order_reference: str, db: Session = Depends(get_db)):
    """Allows switching a failed or pending online payment order to Cash on Delivery."""
    order = (
        db.query(Order)
        .filter(Order.order_reference == order_reference.strip().upper())
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with reference '{order_reference}' not found.",
        )

    if order.payment_status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot switch to COD because order is already paid.",
        )

    order.payment_method = "cod"
    order.payment_status = "pending"
    order.order_status = "placed"
    order.delivery_status = "pending"
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_reference}/cancel", response_model=OrderOut)
def cancel_order(order_reference: str, db: Session = Depends(get_db)):
    """
    Cancels an eligible unpaid, failed, or placed order, restoring deducted inventory exactly once.
    Prevents duplicate cancellation and rejects cancellation of already-paid orders.
    Uses atomic database transaction to prevent partial restocking.
    """
    order = (
        db.query(Order)
        .filter(Order.order_reference == order_reference.strip().upper())
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with reference '{order_reference}' not found.",
        )

    if order.order_status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order '{order_reference}' is already cancelled. Inventory has already been restored.",
        )

    if order.payment_status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paid orders cannot be self-cancelled. Please contact customer support for refund assistance.",
        )

    try:
        # Restore inventory for all items in this order exactly once
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                prev_stock = product.stock_quantity
                product.stock_quantity += item.quantity
                new_stock = product.stock_quantity
                db.add(
                    InventoryMovement(
                        product_id=product.id,
                        movement_type="stock_in",
                        quantity_changed=item.quantity,
                        previous_stock=prev_stock,
                        new_stock=new_stock,
                        reason=f"Order cancellation restock ({order.order_reference})",
                        order_id=order.id,
                        admin_user="Customer Cancellation",
                    )
                )

        now = datetime.now()
        order.order_status = "cancelled"
        order.cancelled_at = now
        order.delivery_status = "cancelled"
        if order.payment_status != "paid":
            order.payment_status = "cancelled"

        db.commit()
        db.refresh(order)
        return order

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(exc)}",
        )


@router.patch("/{order_reference}/status", response_model=OrderOut)
def update_order_status(
    order_reference: str,
    payload: OrderStatusUpdateInput,
    db: Session = Depends(get_db),
    admin_key: str = Depends(verify_admin_key),
):
    """
    Admin-only endpoint: Updates an order's lifecycle status and delivery tracking.
    Requires demonstration admin key header 'X-Admin-Key'.
    Rejects unauthenticated requests with HTTP 401.
    Enforces valid state machine transitions:
    placed -> confirmed / payment_failed / cancelled
    payment_failed -> confirmed / placed / cancelled
    confirmed -> preparing / cancelled
    preparing -> out_for_delivery / cancelled
    out_for_delivery -> delivered
    delivered -> terminal
    cancelled -> terminal
    Rejects invalid transitions with HTTP 400.
    """
    order = (
        db.query(Order)
        .filter(Order.order_reference == order_reference.strip().upper())
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with reference '{order_reference}' not found.",
        )

    current_status = order.order_status
    new_status = payload.order_status

    if current_status == new_status:
        # Idempotent status update - allow updating notes or partner if provided
        if payload.delivery_notes is not None:
            order.delivery_notes = payload.delivery_notes
        if payload.delivery_partner_name is not None:
            order.delivery_partner_name = payload.delivery_partner_name
        if payload.delivery_partner_phone is not None:
            order.delivery_partner_phone = payload.delivery_partner_phone
        db.commit()
        db.refresh(order)
        return order

    allowed = VALID_STATUS_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        allowed_str = ", ".join(f"'{s}'" for s in allowed) if allowed else "None (terminal state)"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{current_status}' to '{new_status}'. Allowed transitions: [{allowed_str}].",
        )

    now = datetime.now()
    order.order_status = new_status

    if new_status == "confirmed":
        order.confirmed_at = now
        order.delivery_status = "order_confirmed"
        if not order.estimated_delivery_at:
            order.estimated_delivery_at = now + timedelta(minutes=45)
    elif new_status == "preparing":
        order.preparing_at = now
        order.delivery_status = "packing_in_progress"
    elif new_status == "out_for_delivery":
        order.out_for_delivery_at = now
        order.delivery_status = "out_for_delivery"
        order.delivery_partner_name = (
            payload.delivery_partner_name
            or order.delivery_partner_name
            or "Suresh Verma (FreshCart Express)"
        )
        order.delivery_partner_phone = (
            payload.delivery_partner_phone
            or order.delivery_partner_phone
            or "+91 98765 43210"
        )
    elif new_status == "delivered":
        order.delivered_at = now
        order.delivery_status = "delivered"
        # If COD order was pending, mark collected upon doorstep delivery
        if order.payment_method == "cod" and order.payment_status == "pending":
            order.payment_status = "paid"
    elif new_status == "cancelled":
        order.cancelled_at = now
        order.delivery_status = "cancelled"
        # Restore stock if cancelling from an active deducted state
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                prev_stock = product.stock_quantity
                product.stock_quantity += item.quantity
                new_stock = product.stock_quantity
                db.add(
                    InventoryMovement(
                        product_id=product.id,
                        movement_type="stock_in",
                        quantity_changed=item.quantity,
                        previous_stock=prev_stock,
                        new_stock=new_stock,
                        reason=f"Admin cancellation restock ({order.order_reference})",
                        order_id=order.id,
                        admin_user="admin",
                    )
                )
        if order.payment_status != "paid":
            order.payment_status = "cancelled"

    if payload.delivery_notes is not None:
        order.delivery_notes = payload.delivery_notes
    if payload.delivery_partner_name is not None:
        order.delivery_partner_name = payload.delivery_partner_name
    if payload.delivery_partner_phone is not None:
        order.delivery_partner_phone = payload.delivery_partner_phone

    db.commit()
    db.refresh(order)
    return order
