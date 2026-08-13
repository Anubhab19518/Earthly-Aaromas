"use client";

import { Utensils, Tag } from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";
import { MenuItemsTable } from "./menu-items-table";
import { MenuCategoriesTable } from "./menu-categories-table";

interface MenuClientProps {
  items: any[];
  categories: any[];
  taxCategories: any[];
}

export function MenuClient({ items, categories, taxCategories }: MenuClientProps) {
  return (
    <section className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Products & Catalog"
        title="Menu Catalog & Recipes"
        description="Configure menu categories, dish variants, prices, and tax rate associations"
        icon={Utensils}
        iconBgColor="bg-amber-500 text-white"
        tabs={[
          { id: "menu-items", label: "Menu Items", icon: Utensils, count: items.length },
          { id: "menu-categories", label: "Categories", icon: Tag, count: categories.length },
        ]}
      />

      <div id="menu-items">
        <MenuItemsTable 
          items={items} 
          categories={categories} 
          taxCategories={taxCategories} 
        />
      </div>

      <div id="menu-categories">
        <MenuCategoriesTable categories={categories} />
      </div>
    </section>
  );
}
