"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Category, Product } from "@/types";
import { fetchCategories, fetchProducts, searchProducts } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import DishOrbitCarousel, { OrbitProductItem } from "@/components/DishOrbitCarousel";
import SmartSearchBar from "@/components/SmartSearchBar";
import { IconLeaf, IconSearch, IconBag, IconPackage, IconX, IconCheck, IconAlertCircle } from "@/components/Icons";

const ALL_CATEGORY_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80";
const ACCENTS = ["#1F5A43", "#0D9488", "#9A7440", "#2A9D8F", "#3B82F6"];

// Curated Seasonal Spotlight slugs from real database records (diverse categories)
const SEASONAL_SPOTLIGHT_SLUGS = [
  "mahabaleshwar-fresh-strawberries", // Fruits (Seasonal winter berry)
  "alphonso-mango",                   // Fruits (Signature seasonal)
  "artisan-whole-wheat-sourdough",    // Bakery (Daily staple)
  "coorg-arabica-filter-coffee",      // Beverages (Signature roast)
  "artisanal-greek-yogurt",           // Dairy (Farm fresh dairy)
];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("default");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [, startTransition] = useTransition();

  const { addToCart, updateQuantity, getItemQuantity, totalItems, subtotal, setIsCartOpen } = useCart();

  // Open cart drawer if query param present
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("cart=open")) {
      setIsCartOpen(true);
    }
  }, [setIsCartOpen]);

  // Load initial categories from real API
  useEffect(() => {
    async function loadInitialData() {
      try {
        const catData = await fetchCategories();
        setCategories(catData);
      } catch (err) {
        console.warn("Could not load categories initially:", err);
      }
    }
    loadInitialData();
  }, []);

  // Fetch products on category or search query change
  useEffect(() => {
    let isCancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        let result;
        if (searchQuery.trim().length > 0) {
          result = await searchProducts(searchQuery.trim());
        } else if (selectedCategory !== "all") {
          result = await fetchProducts({ category_slug: selectedCategory });
        } else {
          result = await fetchProducts();
        }

        if (!isCancelled) {
          setProducts(result.items);
          setTotalProducts(result.total);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : "Failed to connect to backend API";
          setError(message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(() => {
      loadProducts();
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [selectedCategory, searchQuery]);

  const handleCategorySelect = (slug: string) => {
    startTransition(() => {
      setSelectedCategory(slug);
      setSearchQuery("");
    });
  };

  const handleClearFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
    setSortBy("default");
  };

  // Curated Seasonal Spotlight selection from real database products
  const orbitItems: OrbitProductItem[] = useMemo(() => {
    if (!products.length) return [];

    // Prioritize curated seasonal slugs
    const seasonalMatched: Product[] = [];
    for (const slug of SEASONAL_SPOTLIGHT_SLUGS) {
      const match = products.find((p) => p.slug === slug && p.is_active && p.stock_quantity > 0);
      if (match) seasonalMatched.push(match);
    }

    // Fallback: fill up to 5 items with active in-stock products if any slug is unavailable
    if (seasonalMatched.length < 5) {
      for (const p of products) {
        if (!seasonalMatched.some((m) => m.id === p.id) && p.is_active && p.stock_quantity > 0) {
          seasonalMatched.push(p);
          if (seasonalMatched.length >= 5) break;
        }
      }
    }

    return seasonalMatched.map((p, idx) => {
      const categoryName = p.category?.name || "Grocery";
      const words = p.name.split(" ");
      const title = words.length > 1 ? words[0] : categoryName;
      const subtitle = words.length > 1 ? words.slice(1).join(" ") : p.name;

      return {
        product: p,
        title: title.toUpperCase(),
        subtitle: subtitle.toUpperCase(),
        label: p.name,
        image: p.image_url || "/globe.svg",
        alt: p.name,
        category: categoryName,
        unit: p.unit,
        price: p.price,
        stock: p.stock_quantity,
        description: p.description || "Farm-fresh quality grocery, delivered direct to your kitchen table.",
        accent: ACCENTS[idx % ACCENTS.length],
      };
    });
  }, [products]);

  // Client-side sorting for display
  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === "price-asc") {
      return list.sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price-desc") {
      return list.sort((a, b) => b.price - a.price);
    }
    if (sortBy === "name-asc") {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [products, sortBy]);

  // Shelf 1: Fresh in-season produce (Fruits & Vegetables)
  const freshProduceShelf = useMemo(() => {
    return products
      .filter((p) => p.category?.slug === "fruits" || p.category?.slug === "vegetables")
      .slice(0, 8);
  }, [products]);

  // Shelf 2: Daily Dairy & Bakery Essentials
  const dairyBakeryShelf = useMemo(() => {
    return products
      .filter((p) => p.category?.slug === "dairy-eggs" || p.category?.slug === "bakery")
      .slice(0, 8);
  }, [products]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#1F5A43] selection:text-white">
      {/* Top Value Banner */}
      <div className="bg-[#1F5A43] text-white py-1.5 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2">
        <span>Free delivery on orders of ₹500 or more • Farm-fresh groceries delivered directly to your doorstep</span>
      </div>

      {/* Modern Compact Grocery Store Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Brand Info */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1F5A43] text-white shadow-xs group-hover:scale-105 transition">
                <IconLeaf className="w-5 h-5 text-white" />
              </span>
              <div>
                <span className="text-xl font-bold tracking-tight text-gray-900 block leading-tight">
                  Fresh<span className="text-[#1F5A43]">Cart</span>
                </span>
                <span className="text-[11px] text-gray-500 font-medium block">
                  Delivery in 15-25 mins
                </span>
              </div>
            </Link>

            {/* Mobile Actions */}
            <div className="sm:hidden flex items-center gap-2">
              <Link
                href="/orders"
                className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs"
                title="My Orders"
              >
                <IconPackage className="w-3.5 h-3.5" />
                <span>Orders</span>
              </Link>
              <button
                onClick={() => setIsCartOpen(true)}
                className="h-9 flex items-center gap-1.5 px-3 rounded-lg bg-[#1F5A43] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <IconBag className="w-3.5 h-3.5" />
                <span>{totalItems}</span>
              </button>
            </div>
          </div>

          {/* Prominent Smart Search Bar */}
          <SmartSearchBar
            initialQuery={searchQuery}
            onQueryChange={(q) => setSearchQuery(q)}
            onSearchSubmit={(q) => setSearchQuery(q)}
            onCategorySelect={(slug) => handleCategorySelect(slug)}
            className="w-full sm:max-w-xl"
          />

          {/* Desktop Customer Actions — Cohesive Navigation System */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link
              href="/orders"
              className="h-10 flex items-center gap-2 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium shadow-2xs transition"
            >
              <IconPackage className="w-4 h-4 text-gray-500" />
              <span>My Orders</span>
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="h-10 flex items-center gap-2 px-4 rounded-xl bg-[#1F5A43] hover:bg-[#174533] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <IconBag className="w-4 h-4 text-white" />
              <span>Cart</span>
              <span className="bg-[#174533] text-emerald-100 px-2 py-0.5 rounded-full text-xs font-mono">
                {totalItems}
              </span>
              {subtotal > 0 && (
                <span className="pl-1.5 border-l border-emerald-700/80 font-mono">
                  ₹{subtotal.toFixed(2)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Storefront Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* 1. THREE COMPACT PROMOTIONAL GROCERY BANNERS */}
        {selectedCategory === "all" && !searchQuery && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Banner 1: Fruits & Veggies */}
            <div
              onClick={() => handleCategorySelect("fruits")}
              className="group relative overflow-hidden rounded-2xl bg-[#F7F9F6] border border-[#E1E8DF] p-5 cursor-pointer hover:border-[#1F5A43]/50 hover:shadow-xs transition duration-200 flex items-center justify-between"
            >
              <div className="space-y-1.5 z-10 max-w-[65%]">
                <span className="text-[11px] font-serif italic text-[#1F5A43] block">
                  Direct Orchard Harvest
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#171A18] leading-tight group-hover:text-[#1F5A43] transition">
                  Fresh Fruits &amp; Vegetables
                </h3>
                <p className="text-xs text-stone-600 line-clamp-1">
                  Crisp Himachal apples, Ratnagiri mangoes &amp; leafy greens.
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F5A43]">
                    Explore Produce →
                  </span>
                </div>
              </div>
              <div className="w-22 h-22 rounded-xl overflow-hidden border border-[#D5DDD2] flex-shrink-0 relative group-hover:scale-105 transition duration-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=300&q=80"
                  alt="Fresh Fruits"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Banner 2: Dairy & Bakery */}
            <div
              onClick={() => handleCategorySelect("dairy-eggs")}
              className="group relative overflow-hidden rounded-2xl bg-[#FBF9F4] border border-[#EDE7D9] p-5 cursor-pointer hover:border-[#9A7440]/50 hover:shadow-xs transition duration-200 flex items-center justify-between"
            >
              <div className="space-y-1.5 z-10 max-w-[65%]">
                <span className="text-[11px] font-serif italic text-[#9A7440] block">
                  Morning Essentials
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#171A18] leading-tight group-hover:text-[#9A7440] transition">
                  Farm Dairy &amp; Artisan Breads
                </h3>
                <p className="text-xs text-stone-600 line-clamp-1">
                  Full cream milk, churned butter, farm eggs &amp; sourdough.
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A7440]">
                    Explore Breakfast →
                  </span>
                </div>
              </div>
              <div className="w-22 h-22 rounded-xl overflow-hidden border border-[#E2D9C7] flex-shrink-0 relative group-hover:scale-105 transition duration-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=300&q=80"
                  alt="Dairy & Eggs"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Banner 3: Staples & Grains */}
            <div
              onClick={() => handleCategorySelect("staples")}
              className="group relative overflow-hidden rounded-2xl bg-[#F9F8F6] border border-[#E8E6E1] p-5 cursor-pointer hover:border-stone-400 hover:shadow-xs transition duration-200 flex items-center justify-between"
            >
              <div className="space-y-1.5 z-10 max-w-[65%]">
                <span className="text-[11px] font-serif italic text-stone-600 block">
                  Kitchen Pantry
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#171A18] leading-tight group-hover:text-stone-900 transition">
                  Organic Staples &amp; Grains
                </h3>
                <p className="text-xs text-stone-600 line-clamp-1">
                  Aged Royal Basmati, unpolished pulses &amp; cold-pressed oil.
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700">
                    Explore Staples →
                  </span>
                </div>
              </div>
              <div className="w-22 h-22 rounded-xl overflow-hidden border border-[#DDD9D2] flex-shrink-0 relative group-hover:scale-105 transition duration-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80"
                  alt="Staples"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </section>
        )}

        {/* 2. DISH ORBIT CAROUSEL — CURATED SEASONAL SPOTLIGHT */}
        {/* Immediately below the 3 promotional banners and immediately above Explore Categories */}
        {selectedCategory === "all" && !searchQuery && (
          <section className="bg-white rounded-2xl border border-[#E5E2DA] p-4 sm:p-6 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-stone-100">
              <div>
                <span className="text-[11px] font-serif italic text-[#1F5A43] block">
                  Season&apos;s Signature Picks
                </span>
                <h2 className="text-lg font-bold text-[#171A18] tracking-tight">
                  Curated Seasonal Spotlight
                </h2>
              </div>
              <span className="text-xs text-stone-500 hidden sm:inline">
                Available In Store Now
              </span>
            </div>

            {loading ? (
              <div className="h-[460px] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#1F5A43] border-t-transparent animate-spin" />
              </div>
            ) : orbitItems.length > 0 ? (
              <DishOrbitCarousel
                items={orbitItems}
                height="520px"
                onQuickView={(p) => setSelectedProduct(p)}
              />
            ) : (
              <div className="py-16 text-center text-xs text-gray-500">
                Seasonal spotlight items are temporarily unavailable. Explore all groceries below.
              </div>
            )}
          </section>
        )}

        {/* 3. CATEGORY DISCOVERY (PREMIUM GROCERY AISLE NAVIGATION) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-serif italic text-[#1F5A43] block">
                Fresh Departments
              </span>
              <h2 className="text-lg font-bold text-[#171A18] tracking-tight">
                Explore Grocery Aisles
              </h2>
            </div>
            <span className="text-xs text-stone-500 font-medium">
              {categories.length} aisles
            </span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-4 md:grid-cols-8 sm:overflow-visible">
            {/* All Category Tile */}
            <button
              onClick={() => handleCategorySelect("all")}
              className={`flex-shrink-0 p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-2 w-24 sm:w-auto ${
                selectedCategory === "all"
                  ? "bg-white border-[#1F5A43] ring-2 ring-[#1F5A43]/20 shadow-xs"
                  : "bg-white border-[#E5E2DA] hover:border-stone-400 hover:bg-stone-50/50"
              }`}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-stone-100 border border-stone-200/80 flex items-center justify-center p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ALL_CATEGORY_IMAGE}
                  alt="All Aisles"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className={`text-xs font-semibold leading-tight line-clamp-1 ${
                selectedCategory === "all" ? "text-[#1F5A43]" : "text-stone-800"
              }`}>
                All Aisles
              </span>
            </button>

            {/* Real Categories from API */}
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              const imageUrl = cat.image_url || ALL_CATEGORY_IMAGE;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.slug)}
                  className={`flex-shrink-0 p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-2 w-24 sm:w-auto ${
                    isSelected
                      ? "bg-white border-[#1F5A43] ring-2 ring-[#1F5A43]/20 shadow-xs"
                      : "bg-white border-[#E5E2DA] hover:border-stone-400 hover:bg-stone-50/50"
                  }`}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-stone-100 border border-stone-200/80 flex items-center justify-center p-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className={`text-xs font-semibold leading-tight line-clamp-1 ${
                    isSelected ? "text-[#1F5A43]" : "text-stone-800"
                  }`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. HORIZONTAL PRODUCT SHELF 1: FRESH IN-SEASON HARVEST */}
        {selectedCategory === "all" && !searchQuery && freshProduceShelf.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Farm-Fresh Fruits &amp; Vegetables
                </h2>
                <p className="text-xs text-gray-500">Harvested fresh and delivered in unbroken cold chain.</p>
              </div>
              <button
                onClick={() => handleCategorySelect("fruits")}
                className="text-xs font-bold text-[#1F5A43] hover:underline cursor-pointer"
              >
                See all →
              </button>
            </div>

            <div className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none">
              {freshProduceShelf.map((product) => {
                const qty = getItemQuantity(product.id);
                const isOutOfStock = product.stock_quantity <= 0;

                return (
                  <div
                    key={`shelf-produce-${product.id}`}
                    onClick={() => setSelectedProduct(product)}
                    className="flex-shrink-0 w-44 sm:w-48 bg-white rounded-2xl border border-gray-200 p-3 hover:shadow-md transition flex flex-col justify-between cursor-pointer group"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-square w-full rounded-xl bg-gray-50 overflow-hidden mb-2">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <IconLeaf className="w-8 h-8" />
                        </div>
                      )}
                      {/* Unit Tag */}
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold bg-white/90 text-gray-700 px-1.5 py-0.5 rounded shadow-2xs">
                        {product.unit}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="space-y-1 mb-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-1 leading-snug group-hover:text-[#1F5A43] transition">
                        <Link
                          href={`/products/${product.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {product.name}
                        </Link>
                      </h4>
                      <span className="text-[11px] text-gray-500 block">
                        {isOutOfStock ? (
                          <span className="text-rose-600 font-medium">Out of stock</span>
                        ) : product.stock_quantity < 10 ? (
                          <span className="text-amber-700 font-medium">Only {product.stock_quantity} left</span>
                        ) : (
                          "In Stock"
                        )}
                      </span>
                    </div>

                    {/* Price & Action */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between mt-auto">
                      <span className="text-sm sm:text-base font-bold text-gray-900">
                        ₹{product.price.toFixed(0)}
                      </span>

                      {qty > 0 ? (
                        <div
                          className="h-8 inline-flex items-center bg-[#1F5A43] rounded-lg text-white shadow-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => updateQuantity(product.id, qty - 1)}
                            className="w-7 h-8 flex items-center justify-center text-xs font-bold hover:bg-[#174533] rounded-l-lg cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-bold font-mono">
                            {qty}
                          </span>
                          <button
                            disabled={qty >= product.stock_quantity}
                            onClick={() => updateQuantity(product.id, qty + 1)}
                            className={`w-7 h-8 flex items-center justify-center text-xs font-bold rounded-r-lg ${
                              qty >= product.stock_quantity
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-[#174533] cursor-pointer"
                            }`}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, 1);
                          }}
                          className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center ${
                            isOutOfStock
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-[#1F5A43] hover:bg-[#174533] text-white shadow-2xs"
                          }`}
                        >
                          {isOutOfStock ? "Out" : "+ ADD"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. HORIZONTAL PRODUCT SHELF 2: DAIRY & BAKERY */}
        {selectedCategory === "all" && !searchQuery && dairyBakeryShelf.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Daily Dairy &amp; Morning Bakery
                </h2>
                <p className="text-xs text-gray-500">Pure milk, churned butter, paneer &amp; artisan sourdough.</p>
              </div>
              <button
                onClick={() => handleCategorySelect("dairy-eggs")}
                className="text-xs font-bold text-[#1F5A43] hover:underline cursor-pointer"
              >
                See all →
              </button>
            </div>

            <div className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none">
              {dairyBakeryShelf.map((product) => {
                const qty = getItemQuantity(product.id);
                const isOutOfStock = product.stock_quantity <= 0;

                return (
                  <div
                    key={`shelf-dairy-${product.id}`}
                    onClick={() => setSelectedProduct(product)}
                    className="flex-shrink-0 w-44 sm:w-48 bg-white rounded-2xl border border-gray-200 p-3 hover:shadow-md transition flex flex-col justify-between cursor-pointer group"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-square w-full rounded-xl bg-gray-50 overflow-hidden mb-2">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <IconLeaf className="w-8 h-8" />
                        </div>
                      )}
                      {/* Unit Tag */}
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold bg-white/90 text-gray-700 px-1.5 py-0.5 rounded shadow-2xs">
                        {product.unit}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="space-y-1 mb-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-1 leading-snug group-hover:text-[#1F5A43] transition">
                        <Link
                          href={`/products/${product.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {product.name}
                        </Link>
                      </h4>
                      <span className="text-[11px] text-gray-500 block">
                        {isOutOfStock ? (
                          <span className="text-rose-600 font-medium">Out of stock</span>
                        ) : product.stock_quantity < 10 ? (
                          <span className="text-amber-700 font-medium">Only {product.stock_quantity} left</span>
                        ) : (
                          "In Stock"
                        )}
                      </span>
                    </div>

                    {/* Price & Action */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between mt-auto">
                      <span className="text-sm sm:text-base font-bold text-gray-900">
                        ₹{product.price.toFixed(0)}
                      </span>

                      {qty > 0 ? (
                        <div
                          className="h-8 inline-flex items-center bg-[#1F5A43] rounded-lg text-white shadow-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => updateQuantity(product.id, qty - 1)}
                            className="w-7 h-8 flex items-center justify-center text-xs font-bold hover:bg-[#174533] rounded-l-lg cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-bold font-mono">
                            {qty}
                          </span>
                          <button
                            disabled={qty >= product.stock_quantity}
                            onClick={() => updateQuantity(product.id, qty + 1)}
                            className={`w-7 h-8 flex items-center justify-center text-xs font-bold rounded-r-lg ${
                              qty >= product.stock_quantity
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-[#174533] cursor-pointer"
                            }`}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, 1);
                          }}
                          className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center ${
                            isOutOfStock
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-[#1F5A43] hover:bg-[#174533] text-white shadow-2xs"
                          }`}
                        >
                          {isOutOfStock ? "Out" : "+ ADD"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. MAIN ALL GROCERIES CATALOGUE & FILTER GRID */}
        <section className="space-y-5 pt-2">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {searchQuery
                  ? `Search results for "${searchQuery}"`
                  : selectedCategory === "all"
                  ? "All Fresh Groceries & Pantry"
                  : categories.find((c) => c.slug === selectedCategory)?.name || "Category Items"}
              </h2>
              <span className="text-xs text-gray-500 font-medium">
                Showing {sortedProducts.length} of {totalProducts} items
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category Pills for fast switching */}
              <div className="hidden lg:flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => handleCategorySelect("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All
                </button>
                {categories.slice(0, 5).map((c) => (
                  <button
                    key={`pill-${c.id}`}
                    onClick={() => handleCategorySelect(c.slug)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === c.slug
                        ? "bg-white text-gray-900 shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-[#1F5A43] cursor-pointer shadow-2xs"
                >
                  <option value="default">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>

              {(selectedCategory !== "all" || searchQuery || sortBy !== "default") && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-[#1F5A43] hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <IconAlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 py-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200 bg-white p-3 space-y-3 animate-pulse"
                >
                  <div className="aspect-square bg-gray-100 rounded-xl" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-7 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 space-y-4 px-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <IconSearch className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">
                  No matching groceries found
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  We could not find items matching {searchQuery ? `"${searchQuery}"` : "your criteria"}. Try checking your spelling or explore popular departments:
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto pt-1">
                {categories.map((c) => (
                  <button
                    key={`empty-pill-${c.id}`}
                    onClick={() => {
                      setSearchQuery("");
                      handleCategorySelect(c.slug);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-[#1F5A43] hover:text-white hover:border-[#1F5A43] text-gray-700 text-xs font-medium transition cursor-pointer"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-xl bg-[#1F5A43] hover:bg-[#174533] text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  View all groceries
                </button>
              </div>
            </div>
          ) : (
            /* Responsive Product Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {sortedProducts.map((product) => {
                const qty = getItemQuantity(product.id);
                const isOutOfStock = product.stock_quantity <= 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="group rounded-2xl bg-white border border-gray-200 p-3 sm:p-3.5 hover:border-gray-300 hover:shadow-md transition flex flex-col justify-between cursor-pointer"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square w-full rounded-xl bg-gray-50 overflow-hidden mb-2.5">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <IconLeaf className="w-8 h-8" />
                        </div>
                      )}

                      {/* Stock Badge */}
                      <span
                        className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs ${
                          isOutOfStock
                            ? "bg-rose-100 text-rose-800"
                            : product.stock_quantity < 10
                            ? "bg-amber-100 text-amber-800"
                            : "bg-white/90 text-gray-700"
                        }`}
                      >
                        {isOutOfStock
                          ? "Out of Stock"
                          : product.stock_quantity < 10
                          ? `Only ${product.stock_quantity} left`
                          : "In Stock"}
                      </span>

                      {/* Unit Tag */}
                      <span className="absolute bottom-2 right-2 text-[10px] font-semibold bg-white/90 text-gray-800 px-2 py-0.5 rounded shadow-2xs">
                        {product.unit}
                      </span>
                    </div>

                    {/* Product Info */}
                    <div className="space-y-1 mb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        {product.category?.name || "Grocery"}
                      </span>
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-[#1F5A43] transition line-clamp-2 leading-snug">
                        <Link
                          href={`/products/${product.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {product.name}
                        </Link>
                      </h3>
                      <p className="text-[11px] text-gray-500 line-clamp-1">
                        {product.description || "Farm-fresh quality grocery staple."}
                      </p>
                    </div>

                    {/* Bottom Price & Add Stepper */}
                    <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between mt-auto">
                      <div>
                        <span className="text-sm sm:text-base font-bold text-gray-900">
                          ₹{product.price.toFixed(0)}
                        </span>
                      </div>

                      {qty > 0 ? (
                        <div
                          className="h-8 inline-flex items-center bg-[#1F5A43] rounded-lg text-white shadow-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => updateQuantity(product.id, qty - 1)}
                            className="w-7 h-8 flex items-center justify-center text-xs font-bold hover:bg-[#174533] rounded-l-lg cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-bold font-mono">
                            {qty}
                          </span>
                          <button
                            disabled={qty >= product.stock_quantity}
                            onClick={() => updateQuantity(product.id, qty + 1)}
                            className={`w-7 h-8 flex items-center justify-center text-xs font-bold rounded-r-lg ${
                              qty >= product.stock_quantity
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-[#174533] cursor-pointer"
                            }`}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, 1);
                          }}
                          className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center ${
                            isOutOfStock
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-[#1F5A43] hover:bg-[#174533] text-white shadow-2xs"
                          }`}
                        >
                          <span>{isOutOfStock ? "Out of Stock" : "+ ADD"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image Header */}
            <div className="h-64 w-full bg-gray-50 relative">
              {selectedProduct.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <IconLeaf className="w-12 h-12" />
                </div>
              )}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-gray-700 flex items-center justify-center hover:bg-white cursor-pointer shadow-xs"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  {selectedProduct.category?.name || "Grocery"} • {selectedProduct.unit}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">
                  {selectedProduct.name}
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {selectedProduct.description || "Farm-fresh quality grocery product stocked in FreshCart."}
              </p>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-500 block">Unit Price</span>
                  <span className="font-bold text-gray-900 text-base">
                    ₹{selectedProduct.price.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Stock Availability</span>
                  <span
                    className={`font-semibold ${
                      selectedProduct.stock_quantity > 0 ? "text-[#1F5A43]" : "text-rose-600"
                    }`}
                  >
                    {selectedProduct.stock_quantity > 0
                      ? `${selectedProduct.stock_quantity} available`
                      : "Temporarily out of stock"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="h-9 px-3 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <Link
                    href={`/products/${selectedProduct.id}`}
                    onClick={() => setSelectedProduct(null)}
                    className="h-9 px-3 rounded-xl text-xs font-semibold text-[#1F5A43] bg-emerald-50 hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Details</span>
                    <span>→</span>
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  {getItemQuantity(selectedProduct.id) > 0 && (
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setIsCartOpen(true);
                      }}
                      className="h-9 px-4 rounded-xl text-xs font-semibold text-[#1F5A43] bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      View in Cart ({getItemQuantity(selectedProduct.id)})
                    </button>
                  )}

                  <button
                    disabled={selectedProduct.stock_quantity === 0}
                    onClick={() => {
                      addToCart(selectedProduct, 1);
                    }}
                    className={`h-9 px-5 rounded-xl text-xs font-bold text-white transition cursor-pointer flex items-center gap-1.5 ${
                      selectedProduct.stock_quantity > 0
                        ? "bg-[#1F5A43] hover:bg-[#174533] shadow-xs"
                        : "bg-gray-300 cursor-not-allowed"
                    }`}
                  >
                    <IconBag className="w-3.5 h-3.5 text-white" />
                    <span>
                      {selectedProduct.stock_quantity === 0
                        ? "Out of Stock"
                        : getItemQuantity(selectedProduct.id) > 0
                        ? `Add More (${getItemQuantity(selectedProduct.id)} in cart)`
                        : "Add to Cart"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Practical Clean Grocery Store Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-10 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1F5A43] text-white">
                <IconLeaf className="w-4 h-4 text-white" />
              </span>
              <span className="font-bold text-base text-gray-900">FreshCart</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your trusted online grocery store delivering fresh fruits, vegetables, dairy, bakery, and pantry staples in minutes.
            </p>
            <div className="text-[11px] text-[#1F5A43] font-semibold pt-1 flex items-center gap-1">
              <IconCheck className="w-3.5 h-3.5 text-[#1F5A43]" />
              <span>100% Quality Guarantee • Cash on Delivery &amp; Online</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Popular Categories
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button onClick={() => handleCategorySelect("fruits")} className="hover:text-[#1F5A43] transition cursor-pointer">
                  Fresh Fruits
                </button>
              </li>
              <li>
                <button onClick={() => handleCategorySelect("vegetables")} className="hover:text-[#1F5A43] transition cursor-pointer">
                  Daily Vegetables
                </button>
              </li>
              <li>
                <button onClick={() => handleCategorySelect("dairy-eggs")} className="hover:text-[#1F5A43] transition cursor-pointer">
                  Dairy, Milk &amp; Eggs
                </button>
              </li>
              <li>
                <button onClick={() => handleCategorySelect("bakery")} className="hover:text-[#1F5A43] transition cursor-pointer">
                  Artisan Bakery &amp; Bread
                </button>
              </li>
              <li>
                <button onClick={() => handleCategorySelect("staples")} className="hover:text-[#1F5A43] transition cursor-pointer">
                  Rice, Dal &amp; Staples
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Customer Help
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/orders" className="hover:text-[#1F5A43] transition">
                  Track My Orders
                </Link>
              </li>
              <li>
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="hover:text-[#1F5A43] transition cursor-pointer text-left"
                >
                  Shopping Cart
                </button>
              </li>
              <li>
                <span className="text-gray-400">Delivery Information</span>
              </li>
              <li>
                <span className="text-gray-400">Refund &amp; Return Policy</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              FreshCart Marketplace
            </h4>
            <p className="text-[11px] leading-relaxed text-gray-500">
              Direct-from-farm procurement with unbroken cold chain storage and prompt local dispatch.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-[#1F5A43] border border-emerald-200 text-[10px] font-bold">
                <IconCheck className="w-3 h-3 text-[#1F5A43]" />
                <span>Verified Live Inventory</span>
              </span>
            </div>
            <p className="text-[10px] text-gray-400 pt-1">
              © 2026 FreshCart Technologies Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
