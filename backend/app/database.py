from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# SQLite requires check_same_thread=False for multi-threaded FastAPI workers
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
)

# Enforce foreign key constraints in SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_order_schema(bind_engine):
    """Safely adds Phase 05 tracking and delivery columns to existing SQLite orders table if missing."""
    from sqlalchemy import inspect, text
    inspector = inspect(bind_engine)
    if "orders" not in inspector.get_table_names():
        return
    existing_cols = {col["name"] for col in inspector.get_columns("orders")}
    new_cols = [
        ("confirmed_at", "DATETIME"),
        ("preparing_at", "DATETIME"),
        ("out_for_delivery_at", "DATETIME"),
        ("delivered_at", "DATETIME"),
        ("cancelled_at", "DATETIME"),
        ("estimated_delivery_at", "DATETIME"),
        ("delivery_status", "VARCHAR(30) DEFAULT 'pending' NOT NULL"),
        ("delivery_partner_name", "VARCHAR(100)"),
        ("delivery_partner_phone", "VARCHAR(20)"),
        ("delivery_notes", "TEXT"),
    ]
    with bind_engine.connect() as conn:
        for col_name, col_type in new_cols:
            if col_name not in existing_cols:
                conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}"))
        conn.commit()


def ensure_inventory_movements_schema(bind_engine):
    """Safely creates the inventory_movements table and indexes in SQLite if missing."""
    from sqlalchemy import inspect, text
    inspector = inspect(bind_engine)
    if "inventory_movements" in inspector.get_table_names():
        return

    create_table_sql = """
    CREATE TABLE IF NOT EXISTS inventory_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        movement_type VARCHAR(30) NOT NULL,
        quantity_changed INTEGER NOT NULL,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        reason VARCHAR(255) NOT NULL,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        admin_user VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT check_movement_type_valid CHECK (movement_type IN ('stock_in', 'stock_out', 'adjustment')),
        CONSTRAINT check_movement_prev_stock_non_negative CHECK (previous_stock >= 0),
        CONSTRAINT check_movement_new_stock_non_negative CHECK (new_stock >= 0)
    );
    CREATE INDEX IF NOT EXISTS ix_inventory_movements_id ON inventory_movements(id);
    CREATE INDEX IF NOT EXISTS ix_inventory_movements_product_id ON inventory_movements(product_id);
    CREATE INDEX IF NOT EXISTS ix_inventory_movements_movement_type ON inventory_movements(movement_type);
    CREATE INDEX IF NOT EXISTS ix_inventory_movements_order_id ON inventory_movements(order_id);
    CREATE INDEX IF NOT EXISTS ix_inventory_movements_created_at ON inventory_movements(created_at);
    """
    with bind_engine.connect() as conn:
        for stmt in create_table_sql.strip().split(";"):
            cleaned = stmt.strip()
            if cleaned:
                conn.execute(text(cleaned))
        conn.commit()

