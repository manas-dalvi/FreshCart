from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import engine, Base, ensure_order_schema, ensure_inventory_movements_schema
import app.models  # Ensure all SQLAlchemy models are registered
from app.routers import health, categories, products, cart, orders, inventory

# Create tables in SQLite (idempotent, safe)
Base.metadata.create_all(bind=engine)
ensure_order_schema(engine)
ensure_inventory_movements_schema(engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="FreshCart Online Grocery Application REST API with SQLite persistence",
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health routes
app.include_router(health.router)
app.include_router(health.router, prefix=settings.API_V1_STR)

# Domain routes under /api
app.include_router(categories.router, prefix=settings.API_V1_STR)
app.include_router(products.router, prefix=settings.API_V1_STR)
app.include_router(cart.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(inventory.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs_url": "/docs",
        "health_check": "/health",
        "categories_url": f"{settings.API_V1_STR}/categories",
        "products_url": f"{settings.API_V1_STR}/products",
        "cart_validate_url": f"{settings.API_V1_STR}/cart/validate"
    }
