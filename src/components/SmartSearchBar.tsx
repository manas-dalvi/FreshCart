"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchSearchSuggestions } from "@/lib/api";
import { SearchSuggestionItem, CategorySuggestionItem } from "@/types";
import { IconSearch, IconX, IconPackage, IconLeaf } from "@/components/Icons";

interface SmartSearchBarProps {
  initialQuery?: string;
  onSearchSubmit?: (query: string) => void;
  onQueryChange?: (query: string) => void;
  onCategorySelect?: (slug: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SmartSearchBar({
  initialQuery = "",
  onSearchSubmit,
  onQueryChange,
  onCategorySelect,
  placeholder = "Search for mango, milk, sourdough, tomato, spinach...",
  className = "",
}: SmartSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<{
    products: SearchSuggestionItem[];
    categories: CategorySuggestionItem[];
  }>({ products: [], categories: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial query
  useEffect(() => {
    queueMicrotask(() => {
      setQuery(initialQuery);
    });
  }, [initialQuery]);

  // Debounced suggestions fetching
  useEffect(() => {
    if (!query.trim() || query.trim().length < 1) {
      queueMicrotask(() => {
        setSuggestions({ products: [], categories: [] });
        setIsOpen(false);
      });
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetchSearchSuggestions(query.trim(), 6);
        if (isMounted) {
          setSuggestions({
            products: res.products || [],
            categories: res.categories || [],
          });
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    }, 180);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalItems = suggestions.categories.length + suggestions.products.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setSelectedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < totalItems) {
        // Selected a category suggestion
        if (selectedIndex < suggestions.categories.length) {
          const cat = suggestions.categories[selectedIndex];
          handleCategoryClick(cat.slug);
        } else {
          // Selected a product suggestion
          const prodIndex = selectedIndex - suggestions.categories.length;
          const prod = suggestions.products[prodIndex];
          handleProductClick(prod.id);
        }
      } else {
        // Execute general search
        handleSubmit();
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsOpen(false);
    if (onSearchSubmit) {
      onSearchSubmit(query.trim());
    } else {
      router.push(`/?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleCategoryClick = (slug: string) => {
    setIsOpen(false);
    if (onCategorySelect) {
      onCategorySelect(slug);
    } else {
      router.push(`/?category=${slug}`);
    }
  };

  const handleProductClick = (productId: number) => {
    setIsOpen(false);
    router.push(`/products/${productId}`);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions({ products: [], categories: [] });
    setIsOpen(false);
    if (onQueryChange) {
      onQueryChange("");
    }
    if (onSearchSubmit) {
      onSearchSubmit("");
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onQueryChange?.(e.target.value);
          }}
          onFocus={() => {
            if (query.trim() && totalItems > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-10 px-4 pl-10 pr-10 text-xs sm:text-sm bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#1F5A43] focus:border-[#1F5A43] placeholder:text-gray-400 transition"
        />
        <span className="absolute left-3.5 top-3 text-gray-400">
          <IconSearch className="w-4 h-4 text-gray-400" />
        </span>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 text-xs bg-gray-200 hover:bg-gray-300 rounded-full w-5 h-5 flex items-center justify-center transition cursor-pointer"
            title="Clear search"
          >
            <IconX className="w-3 h-3" />
          </button>
        )}
      </form>

      {/* Live Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-50 divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Categories matches */}
          {suggestions.categories.length > 0 && (
            <div className="p-3 bg-gray-50/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2 px-1">
                Matching Aisles &amp; Categories
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.categories.map((c, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCategoryClick(c.slug)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#1F5A43] text-white"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <IconLeaf className="w-3 h-3" />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product matches */}
          {suggestions.products.length > 0 ? (
            <div className="p-2 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block px-2 py-1">
                Product Matches ({suggestions.products.length})
              </span>
              {suggestions.products.map((p, idx) => {
                const itemIndex = suggestions.categories.length + idx;
                const isSelected = selectedIndex === itemIndex;
                const isOut = p.stock_quantity <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleProductClick(p.id)}
                    className={`p-2 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition ${
                      isSelected ? "bg-emerald-50/80 border border-emerald-200" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            <IconPackage className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 text-xs block leading-snug">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {p.category_name} • {p.unit}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-bold text-gray-900 text-xs block">
                        ₹{p.price.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          isOut ? "text-rose-600" : "text-[#1F5A43]"
                        }`}
                      >
                        {isOut ? "Out of Stock" : "In Stock"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700">No matching products found</p>
              <p className="text-[11px] text-gray-400">
                Press Enter to search entire store catalogue for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {/* Footer action */}
          <div className="p-2.5 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100">
            <span className="hidden sm:inline">Use ↑↓ arrows to navigate, Enter to select, Esc to close</span>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="text-[#1F5A43] hover:text-[#174533] font-bold ml-auto cursor-pointer"
            >
              See all results for &ldquo;{query}&rdquo; →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
