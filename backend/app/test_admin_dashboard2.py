"""
FreshCart Admin Dashboard 2.0 Verification Suite
Tests Overview, Analytics, Inventory stock adjustments, Security, and RBAC.
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import os
import glob
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)
ADMIN_KEY = settings.ADMIN_SECRET_KEY

def test_admin_overview_authorized():
    res = client.get("/api/orders/admin/overview", headers={"X-Admin-Key": ADMIN_KEY})
    assert res.status_code == 200
    data = res.json()
    assert "total_orders" in data
    assert "total_products" in data
    assert "total_categories" in data
    assert "low_stock_count" in data
    assert "recent_orders" in data
    assert isinstance(data["recent_orders"], list)
    print("✓ Test 1: Admin Overview endpoint returns live KPIs with HTTP 200.")

def test_admin_overview_unauthorized():
    res = client.get("/api/orders/admin/overview")
    assert res.status_code == 401
    res_bad = client.get("/api/orders/admin/overview", headers={"X-Admin-Key": "wrong-key"})
    assert res_bad.status_code == 401
    print("✓ Test 2: Admin Overview rejects unauthenticated and invalid key requests with HTTP 401.")

def test_admin_analytics_authorized():
    res = client.get("/api/orders/admin/analytics", headers={"X-Admin-Key": ADMIN_KEY})
    assert res.status_code == 200
    data = res.json()
    assert "total_paid_revenue" in data
    assert "average_order_value" in data
    assert "status_distribution" in data
    assert "payment_method_distribution" in data
    assert "best_selling_products" in data
    assert isinstance(data["best_selling_products"], list)
    print("✓ Test 3: Admin Analytics endpoint computes financial metrics with HTTP 200.")

def test_admin_analytics_unauthorized():
    res = client.get("/api/orders/admin/analytics")
    assert res.status_code == 401
    res_bad = client.get("/api/orders/admin/analytics", headers={"X-Admin-Key": "invalid-secret"})
    assert res_bad.status_code == 401
    print("✓ Test 4: Admin Analytics rejects unauthenticated requests with HTTP 401.")

def test_inventory_listing():
    res = client.get("/api/products?limit=100")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 28
    assert len(data["items"]) >= 28
    print(f"✓ Test 5: Inventory listing returns {data['total']} catalog products with HTTP 200.")

def test_stock_adjustment_authorized_and_persisted():
    # Fetch initial stock of product 3
    res_init = client.get("/api/products/3")
    assert res_init.status_code == 200
    initial_stock = res_init.json()["stock_quantity"]

    # Adjust stock to 55
    res_patch = client.patch(
        "/api/products/3/stock",
        json={"stock_quantity": 55},
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["stock_quantity"] == 55

    # Verify persistence on separate GET
    res_verify = client.get("/api/products/3")
    assert res_verify.status_code == 200
    assert res_verify.json()["stock_quantity"] == 55

    # Revert back to original
    res_revert = client.patch(
        "/api/products/3/stock",
        json={"stock_quantity": initial_stock},
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res_revert.status_code == 200
    assert res_revert.json()["stock_quantity"] == initial_stock
    print("✓ Test 6: Stock adjustment persists in database and reverts cleanly.")

def test_stock_adjustment_negative_rejected():
    res = client.patch(
        "/api/products/3/stock",
        json={"stock_quantity": -5},
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res.status_code == 422
    print("✓ Test 7: Negative stock update strictly rejected with HTTP 422.")

def test_stock_adjustment_unauthorized():
    res = client.patch(
        "/api/products/3/stock",
        json={"stock_quantity": 50},
    )
    assert res.status_code == 401
    res_bad = client.patch(
        "/api/products/3/stock",
        json={"stock_quantity": 50},
        headers={"X-Admin-Key": "unauthorized-key"},
    )
    assert res_bad.status_code == 401
    print("✓ Test 8: Unauthenticated stock adjustment strictly rejected with HTTP 401.")

def test_stock_adjustment_invalid_id():
    res = client.patch(
        "/api/products/99999/stock",
        json={"stock_quantity": 20},
        headers={"X-Admin-Key": ADMIN_KEY},
    )
    assert res.status_code == 404
    print("✓ Test 9: Invalid product ID adjustment strictly returns HTTP 404.")

def test_secret_not_exposed_in_client_bundles():
    static_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / ".next" / "static"
    bundle_files = list(static_dir.glob("**/*.js"))
    assert len(bundle_files) > 0, f"No bundle files found in {static_dir}"
    secret_leaks = 0
    for bf in bundle_files:
        with open(bf, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            if ADMIN_KEY in content:
                secret_leaks += 1
    assert secret_leaks == 0
    print(f"✓ Test 10: Inspected {len(bundle_files)} client JavaScript bundles. 0 secret exposures found.")

if __name__ == "__main__":
    print("===========================================================================")
    print("FRESHCART PHASE 06 — ADMIN DASHBOARD 2.0 VERIFICATION SUITE")
    print("===========================================================================")
    test_admin_overview_authorized()
    test_admin_overview_unauthorized()
    test_admin_analytics_authorized()
    test_admin_analytics_unauthorized()
    test_inventory_listing()
    test_stock_adjustment_authorized_and_persisted()
    test_stock_adjustment_negative_rejected()
    test_stock_adjustment_unauthorized()
    test_stock_adjustment_invalid_id()
    test_secret_not_exposed_in_client_bundles()
    print("===========================================================================")
    print("ALL 10 ADMIN DASHBOARD 2.0 VERIFICATION TESTS EXECUTED AND PASSED!")
    print("===========================================================================")
