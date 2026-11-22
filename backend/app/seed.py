import sys
from pathlib import Path

# Add backend directory to path when executed directly
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database import engine, SessionLocal, Base
from app.models.category import Category
from app.models.product import Product

# Realistic Sample Data with INR pricing and units
CATEGORIES_DATA = [
    {
        "name": "Fruits",
        "slug": "fruits",
        "description": "Fresh orchard fruits, seasonal picks, and citrus essentials.",
        "image_url": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Vegetables",
        "slug": "vegetables",
        "description": "Farm-fresh daily vegetables, roots, greens, and cooking aromatics.",
        "image_url": "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Dairy & Eggs",
        "slug": "dairy-eggs",
        "description": "Farm fresh milk, artisanal butter, paneer, and poultry eggs.",
        "image_url": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Bakery",
        "slug": "bakery",
        "description": "Artisan breads, whole wheat loaves, buns, and morning pastries.",
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Beverages",
        "slug": "beverages",
        "description": "Filter coffees, organic tea blends, cold-pressed juices, and tender coconut.",
        "image_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Snacks",
        "slug": "snacks",
        "description": "Roasted nuts, healthy multigrain bites, savory treats, and dark cocoa.",
        "image_url": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Staples",
        "slug": "staples",
        "description": "Aromatic basmati rice, organic pulses, stone-ground flours, and cold-pressed oils.",
        "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
]

PRODUCTS_DATA = [
    # Fruits
    {
        "name": "Alphonso Mango",
        "slug": "alphonso-mango",
        "category_slug": "fruits",
        "description": "Geographical Indication certified Ratnagiri Alphonso mangoes, sweet and rich.",
        "price": 450.0,
        "stock_quantity": 40,
        "unit": "1 kg",
        "image_url": "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Shimla Royal Apple",
        "slug": "shimla-royal-apple",
        "category_slug": "fruits",
        "description": "Crisp and juicy Himalayan red apples handpicked from Himachal orchards.",
        "price": 180.0,
        "stock_quantity": 65,
        "unit": "1 kg",
        "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Robusta Banana",
        "slug": "robusta-banana",
        "category_slug": "fruits",
        "description": "Naturally ripened sweet Cavendish robusta bananas, rich in potassium.",
        "price": 60.0,
        "stock_quantity": 80,
        "unit": "1 dozen",
        "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Nagpur Mandarin Orange",
        "slug": "nagpur-mandarin-orange",
        "category_slug": "fruits",
        "description": "Tangy and refreshing Nagpur oranges packed with natural Vitamin C.",
        "price": 90.0,
        "stock_quantity": 50,
        "unit": "1 kg",
        "image_url": "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },

    # Vegetables
    {
        "name": "Farm Fresh Tomato",
        "slug": "farm-fresh-tomato",
        "category_slug": "vegetables",
        "description": "Vine-ripened plump red tomatoes, ideal for curries, salads, and purées.",
        "price": 40.0,
        "stock_quantity": 100,
        "unit": "1 kg",
        "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Nasik Red Onion",
        "slug": "nasik-red-onion",
        "category_slug": "vegetables",
        "description": "Crisp and pungent red onions essential for everyday Indian cooking.",
        "price": 35.0,
        "stock_quantity": 120,
        "unit": "1 kg",
        "image_url": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Baby Spinach (Palak)",
        "slug": "baby-spinach-palak",
        "category_slug": "vegetables",
        "description": "Tender and hydroponically washed spinach leaves, high in iron and dietary fiber.",
        "price": 30.0,
        "stock_quantity": 45,
        "unit": "250 g",
        "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Organic Potato",
        "slug": "organic-potato",
        "category_slug": "vegetables",
        "description": "Soil-grown earthy potatoes with firm texture, perfect for roasting or boiling.",
        "price": 32.0,
        "stock_quantity": 150,
        "unit": "1 kg",
        "image_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },

    # Dairy & Eggs
    {
        "name": "Pasteurized Full Cream Milk",
        "slug": "pasteurized-full-cream-milk",
        "category_slug": "dairy-eggs",
        "description": "Fresh and wholesome whole cow milk with 6% fat content, homogenized.",
        "price": 68.0,
        "stock_quantity": 70,
        "unit": "1 litre",
        "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Pure Salted Creamery Butter",
        "slug": "pure-salted-creamery-butter",
        "category_slug": "dairy-eggs",
        "description": "Traditional churned butter with a hint of salt, delicious on warm toast.",
        "price": 275.0,
        "stock_quantity": 35,
        "unit": "500 g",
        "image_url": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Farm Fresh Brown Eggs",
        "slug": "farm-fresh-brown-eggs",
        "category_slug": "dairy-eggs",
        "description": "Free-range pasture-raised brown eggs with golden yolks, protein-rich.",
        "price": 65.0,
        "stock_quantity": 55,
        "unit": "pack of 6",
        "image_url": "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Fresh Malai Paneer",
        "slug": "fresh-malai-paneer",
        "category_slug": "dairy-eggs",
        "description": "Soft and succulent cottage cheese blocks made from pure cow milk.",
        "price": 95.0,
        "stock_quantity": 40,
        "unit": "200 g",
        "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },

    # Bakery
    {
        "name": "Artisan Whole Wheat Sourdough",
        "slug": "artisan-whole-wheat-sourdough",
        "category_slug": "bakery",
        "description": "Slow-fermented artisan sourdough bread with a crispy crust and soft crumb.",
        "price": 85.0,
        "stock_quantity": 25,
        "unit": "400 g",
        "image_url": "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Classic Butter Croissants",
        "slug": "classic-butter-croissants",
        "category_slug": "bakery",
        "description": "Flaky French-style laminated croissants baked fresh with European butter.",
        "price": 120.0,
        "stock_quantity": 30,
        "unit": "pack of 2",
        "image_url": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Multigrain Sandwich Bread",
        "slug": "multigrain-sandwich-bread",
        "category_slug": "bakery",
        "description": "Hearty sliced bread topped with flaxseeds, oats, sesame, and sunflower seeds.",
        "price": 50.0,
        "stock_quantity": 45,
        "unit": "400 g",
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Herb & Garlic Baguette",
        "slug": "herb-garlic-baguette",
        "category_slug": "bakery",
        "description": "Crisp crusty baguette infused with roasted garlic, oregano, and olive oil.",
        "price": 75.0,
        "stock_quantity": 20,
        "unit": "250 g",
        "image_url": "https://images.unsplash.com/photo-1598373182133-52452f7691ef?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },

    # Beverages
    {
        "name": "Coorg Arabica Filter Coffee",
        "slug": "coorg-arabica-filter-coffee",
        "category_slug": "beverages",
        "description": "Dark roast 80:20 coffee-chicory blend for a robust South Indian morning brew.",
        "price": 290.0,
        "stock_quantity": 35,
        "unit": "250 g",
        "image_url": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Assam Orthodox Tea Leaves",
        "slug": "assam-orthodox-tea-leaves",
        "category_slug": "beverages",
        "description": "Single-estate strong black tea with aromatic malt undertones.",
        "price": 240.0,
        "stock_quantity": 50,
        "unit": "500 g",
        "image_url": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Fresh Tender Coconut Water",
        "slug": "fresh-tender-coconut-water",
        "category_slug": "beverages",
        "description": "Naturally isotonic and chilled young green coconut water, zero added sugar.",
        "price": 55.0,
        "stock_quantity": 60,
        "unit": "200 ml",
        "image_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Cold-Pressed Valencia Orange Juice",
        "slug": "cold-pressed-valencia-orange-juice",
        "category_slug": "beverages",
        "description": "100% pure raw fruit juice without preservatives or artificial concentrates.",
        "price": 110.0,
        "stock_quantity": 25,
        "unit": "500 ml",
        "image_url": "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },

    # Snacks
    {
        "name": "California Roasted Almonds",
        "slug": "california-roasted-almonds",
        "category_slug": "snacks",
        "description": "Lightly salted premium whole almonds roasted in Himalayan pink salt.",
        "price": 260.0,
        "stock_quantity": 40,
        "unit": "200 g",
        "image_url": "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Crunchy Cashew Nuts",
        "slug": "crunchy-cashew-nuts",
        "category_slug": "snacks",
        "description": "Whole W240 grade oven-toasted cashew nuts, smooth and buttery.",
        "price": 310.0,
        "stock_quantity": 30,
        "unit": "200 g",
        "image_url": "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Single Origin 70% Dark Chocolate",
        "slug": "single-origin-70-dark-chocolate",
        "category_slug": "snacks",
        "description": "Bean-to-bar artisanal dark chocolate crafted with South Indian cacao beans.",
        "price": 140.0,
        "stock_quantity": 50,
        "unit": "80 g",
        "image_url": "https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Baked Multigrain Tortilla Chips",
        "slug": "baked-multigrain-tortilla-chips",
        "category_slug": "snacks",
        "description": "Stone-ground corn and quinoa crisps with tangy salsa seasoning.",
        "price": 65.0,
        "stock_quantity": 45,
        "unit": "150 g",
        "image_url": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },

    # Staples
    {
        "name": "Aged Royal Basmati Rice",
        "slug": "aged-royal-basmati-rice",
        "category_slug": "staples",
        "description": "Extra-long grain aromatic basmati rice aged for 2 years, non-sticky.",
        "price": 145.0,
        "stock_quantity": 80,
        "unit": "1 kg",
        "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Sharbati Whole Wheat Atta",
        "slug": "sharbati-whole-wheat-atta",
        "category_slug": "staples",
        "description": "100% stone-ground MP Sharbati wheat flour yielding soft, fluffy rotis.",
        "price": 270.0,
        "stock_quantity": 60,
        "unit": "5 kg",
        "image_url": "https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Organic Unpolished Toor Dal",
        "slug": "organic-unpolished-toor-dal",
        "category_slug": "staples",
        "description": "Pesticide-free yellow pigeon pea lentils with high natural protein.",
        "price": 180.0,
        "stock_quantity": 75,
        "unit": "1 kg",
        "image_url": "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Kachi Ghani Cold-Pressed Mustard Oil",
        "slug": "kachi-ghani-cold-pressed-mustard-oil",
        "category_slug": "staples",
        "description": "Traditional wooden-mill cold pressed pungent mustard seed oil.",
        "price": 190.0,
        "stock_quantity": 40,
        "unit": "1 litre",
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    # Phase 07B — Product Expansion (15 New Distinct Groceries)
    # Fruits Expansion
    {
        "name": "Mahabaleshwar Fresh Strawberries",
        "slug": "mahabaleshwar-fresh-strawberries",
        "category_slug": "fruits",
        "description": "Hand-sorted sweet and vibrant red winter strawberries from Mahabaleshwar.",
        "price": 120.0,
        "stock_quantity": 35,
        "unit": "200 g box",
        "image_url": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Green Seedless Grapes",
        "slug": "green-seedless-grapes",
        "category_slug": "fruits",
        "description": "Crisp, juicy and refreshing sweet green table grapes.",
        "price": 95.0,
        "stock_quantity": 50,
        "unit": "500 g",
        "image_url": "https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Fresh Kashmiri Pears",
        "slug": "fresh-kashmiri-pears",
        "category_slug": "fruits",
        "description": "Crisp textured sweet valley pears with delicate floral aroma.",
        "price": 160.0,
        "stock_quantity": 40,
        "unit": "1 kg",
        "image_url": "https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    # Vegetables Expansion
    {
        "name": "Crisp English Cucumber",
        "slug": "crisp-english-cucumber",
        "category_slug": "vegetables",
        "description": "Hydroponically nurtured thin-skinned crunchy seedless salad cucumber.",
        "price": 45.0,
        "stock_quantity": 60,
        "unit": "500 g",
        "image_url": "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Fresh Green Bell Pepper",
        "slug": "fresh-green-bell-pepper",
        "category_slug": "vegetables",
        "description": "Glossy thick-walled green capsicum ideal for stir fries and salads.",
        "price": 50.0,
        "stock_quantity": 55,
        "unit": "500 g",
        "image_url": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Tender Cauliflower",
        "slug": "tender-cauliflower",
        "category_slug": "vegetables",
        "description": "Dense, creamy-white farm florets packed with natural nutrients.",
        "price": 40.0,
        "stock_quantity": 45,
        "unit": "1 piece",
        "image_url": "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    # Dairy & Eggs Expansion
    {
        "name": "Artisanal Greek Yogurt",
        "slug": "artisanal-greek-yogurt",
        "category_slug": "dairy-eggs",
        "description": "Slow-strained thick and creamy whole milk natural probiotic yogurt.",
        "price": 80.0,
        "stock_quantity": 30,
        "unit": "400 g",
        "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Pure Desi Cow Ghee",
        "slug": "pure-desi-cow-ghee",
        "category_slug": "dairy-eggs",
        "description": "Traditional bilona churned aromatic golden cow milk clarified butter.",
        "price": 380.0,
        "stock_quantity": 25,
        "unit": "500 ml",
        "image_url": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    # Bakery Expansion
    {
        "name": "Whole Wheat Pita Bread",
        "slug": "whole-wheat-pita-bread",
        "category_slug": "bakery",
        "description": "Stone-baked pocket bread made with 100% whole grain wheat flour.",
        "price": 60.0,
        "stock_quantity": 35,
        "unit": "pack of 4",
        "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Blueberry Bran Muffins",
        "slug": "blueberry-bran-muffins",
        "category_slug": "bakery",
        "description": "Morning bakery muffins packed with wholesome bran and wild blueberries.",
        "price": 95.0,
        "stock_quantity": 20,
        "unit": "pack of 2",
        "image_url": "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    # Beverages Expansion
    {
        "name": "Masala Chai Spiced Tea Blend",
        "slug": "masala-chai-spiced-tea-blend",
        "category_slug": "beverages",
        "description": "Assam black tea infused with crushed cardamom, cinnamon, clove and dry ginger.",
        "price": 150.0,
        "stock_quantity": 40,
        "unit": "25 tea bags",
        "image_url": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    # Snacks & Dry Fruits Expansion
    {
        "name": "Premium Green Raisins",
        "slug": "premium-green-raisins",
        "category_slug": "snacks",
        "description": "Sun-dried sweet and tender long green seedless raisins.",
        "price": 180.0,
        "stock_quantity": 45,
        "unit": "250 g",
        "image_url": "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Roasted Salted Pistachios",
        "slug": "roasted-salted-pistachios",
        "category_slug": "snacks",
        "description": "Gently roasted in-shell California pistachios with sea salt touch.",
        "price": 320.0,
        "stock_quantity": 30,
        "unit": "200 g",
        "image_url": "https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    # Staples Expansion
    {
        "name": "Organic Yellow Moong Dal",
        "slug": "organic-yellow-moong-dal",
        "category_slug": "staples",
        "description": "Unpolished split yellow petite lentils, quick cooking and easy to digest.",
        "price": 135.0,
        "stock_quantity": 65,
        "unit": "1 kg",
        "image_url": "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
    {
        "name": "Cold-Pressed Extra Virgin Olive Oil",
        "slug": "cold-pressed-extra-virgin-olive-oil",
        "category_slug": "staples",
        "description": "First cold-pressed Mediterranean extra virgin olive oil with fruity finish.",
        "price": 450.0,
        "stock_quantity": 25,
        "unit": "500 ml",
        "image_url": "https://images.unsplash.com/photo-1508736793122-f516e3ba5569?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
    },
]

def seed_database(db_session=None):
    """Idempotently seeds categories and products without creating duplicate entries or resetting customer stock."""
    if db_session:
        db = db_session
        should_close = False
    else:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        should_close = True

    try:
        print("🌱 Seeding Categories...")
        categories_map = {}
        for cat_data in CATEGORIES_DATA:
            existing_cat = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
            if existing_cat:
                for k, v in cat_data.items():
                    setattr(existing_cat, k, v)
                categories_map[cat_data["slug"]] = existing_cat
                print(f"  ✓ Updated category: {existing_cat.name} ({existing_cat.slug})")
            else:
                new_cat = Category(**cat_data)
                db.add(new_cat)
                db.flush()
                categories_map[cat_data["slug"]] = new_cat
                print(f"  + Added category: {new_cat.name} ({new_cat.slug})")

        db.commit()

        print("\n🌱 Seeding Products...")
        seeded_count = 0
        for prod_data in PRODUCTS_DATA:
            cat_slug = prod_data.get("category_slug")
            category = categories_map.get(cat_slug) or db.query(Category).filter(Category.slug == cat_slug).first()
            if not category:
                print(f"  ⚠️ Warning: Category {cat_slug} not found for product {prod_data['name']}")
                continue

            existing_prod = db.query(Product).filter(Product.slug == prod_data["slug"]).first()
            if existing_prod:
                # Update attributes safely WITHOUT overwriting customer inventory adjustments
                existing_prod.name = prod_data.get("name", existing_prod.name)
                existing_prod.description = prod_data.get("description", existing_prod.description)
                existing_prod.price = prod_data.get("price", existing_prod.price)
                existing_prod.unit = prod_data.get("unit", existing_prod.unit)
                existing_prod.image_url = prod_data.get("image_url", existing_prod.image_url)
                existing_prod.is_active = prod_data.get("is_active", existing_prod.is_active)
                existing_prod.category_id = category.id
                print(f"  ✓ Preserved & updated metadata: {existing_prod.name} (Stock remains: {existing_prod.stock_quantity})")
            else:
                prod_attrs = {k: v for k, v in prod_data.items() if k != "category_slug"}
                new_prod = Product(**prod_attrs, category_id=category.id)
                db.add(new_prod)
                print(f"  + Added product: {new_prod.name} (₹{new_prod.price}/{new_prod.unit}, Stock: {new_prod.stock_quantity})")
            seeded_count += 1

        db.commit()

        total_cats = db.query(Category).count()
        total_prods = db.query(Product).count()
        print(f"\n✅ Seeding complete! Database has {total_cats} categories and {total_prods} products.")

    except Exception as exc:
        db.rollback()
        print(f"❌ Error during database seeding: {exc}")
        raise exc
    finally:
        if should_close:
            db.close()

seed_data = seed_database

if __name__ == "__main__":
    seed_database()
