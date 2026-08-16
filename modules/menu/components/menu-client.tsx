"use client";

import { useState, useMemo } from "react";
import { Utensils, Tag, Plus, Search, X, SlidersHorizontal, Layers } from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";
import { MenuItemsTable } from "./menu-items-table";
import { MenuCategoriesTable } from "./menu-categories-table";
import { MenuItemDialog } from "./menu-item-dialog";

interface MenuClientProps {
  items: any[];
  categories: any[];
  variants?: any[];
  taxCategories: any[];
}

export function MenuClient({
  items,
  categories,
  variants = [],
  taxCategories,
}: MenuClientProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "categories">("catalog");
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <section className="space-y-4 font-sans">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Products & Catalog"
        title="Menu Catalog & Recipes"
        description="Configure menu categories, dish variants, prices, and recipe costings"
        icon={Utensils}
        iconBgColor="bg-blue-600 text-white"
        colorTheme="blue"
        tabs={[
          { id: "catalog", label: "Menu Catalog", icon: Utensils, count: items.length },
          { id: "categories", label: "Categories", icon: Tag, count: categories.length },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        }
      />

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Catalog Table */}
        <div id="catalog">
          <MenuItemsTable
            items={items}
            categories={categories}
            variants={variants}
            taxCategories={taxCategories}
            onOpenAdd={() => setIsAddOpen(true)}
          />
        </div>

        {/* Categories Table Section */}
        <div id="categories" className="pt-2">
          <MenuCategoriesTable categories={categories} items={items} />
        </div>
      </div>

      {/* Add Item Modal */}
      <MenuItemDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        categories={categories}
        taxCategories={taxCategories}
      />
    </section>
  );
}
