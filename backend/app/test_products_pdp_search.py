import sys
from pathlib import Path

backend_dir = Path("d:/FreshCart/backend")
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_pdp_existing_product():
    res = client.get("/api/products/1")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["id"] == 1
    assert data["name"] == "Alphonso Mango"
    assert "category" in data
    assert data["category"]["slug"] == "fruits"
    print("PASS: test_pdp_existing_product")

def test_pdp_non_existent_product():
    res = client.get("/api/products/99999")
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    print("PASS: test_pdp_non_existent_product")

def test_search_suggestions_products():
    res = client.get("/api/products/suggestions?q=man")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert "products" in data
    assert "categories" in data
    assert any("Mango" in p["name"] for p in data["products"])
    print("PASS: test_search_suggestions_products")

def test_search_suggestions_categories():
    res = client.get("/api/products/suggestions?q=fruit")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert any(c["slug"] == "fruits" for c in data["categories"])
    print("PASS: test_search_suggestions_categories")

def test_multi_token_search():
    res = client.get("/api/products/search?q=alphonso+mango")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["total"] >= 1
    assert any(p["id"] == 1 for p in data["items"])
    print("PASS: test_multi_token_search")

def test_empty_search_query():
    res = client.get("/api/products/suggestions?q=")
    assert res.status_code == 200
    data = res.json()
    assert len(data["products"]) == 0
    assert len(data["categories"]) == 0
    print("PASS: test_empty_search_query")

def test_expanded_products_pdp():
    # Test new Phase 07B product ID 29 (Strawberries)
    res = client.get("/api/products/29")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["id"] == 29
    assert data["name"] == "Mahabaleshwar Fresh Strawberries"
    assert data["category"]["slug"] == "fruits"
    assert data["stock_quantity"] == 35
    print("PASS: test_expanded_products_pdp")

def test_expanded_products_search():
    # Test multi-token search for new Phase 07B items
    res_ghee = client.get("/api/products/search?q=desi+ghee")
    assert res_ghee.status_code == 200
    assert res_ghee.json()["total"] >= 1
    assert any("Ghee" in p["name"] for p in res_ghee.json()["items"])

    res_straw = client.get("/api/products/suggestions?q=straw")
    assert res_straw.status_code == 200
    assert any("Strawberries" in p["name"] for p in res_straw.json()["products"])
    print("PASS: test_expanded_products_search")

if __name__ == "__main__":
    test_pdp_existing_product()
    test_pdp_non_existent_product()
    test_search_suggestions_products()
    test_search_suggestions_categories()
    test_multi_token_search()
    test_empty_search_query()
    test_expanded_products_pdp()
    test_expanded_products_search()
    print("\nALL 8 PDP & SEARCH BACKEND TESTS PASSED SUCCESSFULLY!")
