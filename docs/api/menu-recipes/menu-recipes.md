# Menu Management & Recipe BOM API Documentation

OpenAPI 3.1 specification for Menu Items, Variants, Bill of Materials (Recipes), and Branch Configurations.

---

## 1. OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Tea Chain ERP - Menu & Recipes API
  version: 1.0.0
  description: Menu catalog, variants, ingredient consumption recipes, and branch pricing overrides.

paths:
  /rest/v1/menu_items:
    get:
      summary: List Menu Items
      description: Returns sellable products with their associated variants and categories.
      operationId: getMenuItems
      security:
        - BearerAuth: []
      parameters:
        - name: select
          in: query
          schema:
            type: string
            default: "*, category:menu_categories(*), variants:menu_variants(*)"
      responses:
        '200':
          description: Menu items list.
    post:
      summary: Create Menu Item
      description: Adds a new product (e.g. "Kolkata Masala Chai").
      operationId: createMenuItem
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, category_id]
              properties:
                name:
                  type: string
                  example: "Kolkata Masala Chai"
                category_id:
                  type: string
                  format: uuid
                tax_category_id:
                  type: string
                  format: uuid
                  nullable: true
                image_url:
                  type: string
                  nullable: true
      responses:
        '201':
          description: Menu item created.

  /rest/v1/menu_variants:
    post:
      summary: Create Menu Variant
      description: Adds a specific serving size or format (e.g. "Cutting (100ml)", "Full Clay Kulhad (180ml)").
      operationId: createMenuVariant
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [menu_item_id, name, default_price]
              properties:
                menu_item_id:
                  type: string
                  format: uuid
                name:
                  type: string
                  example: "Cutting"
                default_price:
                  type: number
                  example: 15.00
      responses:
        '201':
          description: Variant created.

  /rest/v1/recipe_items:
    get:
      summary: Get Variant Bill of Materials (Recipe)
      description: Lists the raw ingredients consumed whenever this variant is ordered.
      operationId: getRecipeItems
      security:
        - BearerAuth: []
      parameters:
        - name: variant_id
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Array of recipe ingredients and consumption quantities.
    post:
      summary: Add Ingredient to Recipe
      description: Defines base unit consumption for an ingredient when preparing this item.
      operationId: addRecipeItem
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [variant_id, ingredient_id, quantity, unit_id]
              properties:
                variant_id:
                  type: string
                  format: uuid
                ingredient_id:
                  type: string
                  format: uuid
                quantity:
                  type: number
                  example: 5.000
                unit_id:
                  type: string
                  format: uuid
      responses:
        '201':
          description: Recipe component saved.
```

---

## 2. Server Action Reference

### Menu Items & Variants (`modules/menu/services/menu.actions.ts`)
- `createMenuItem(data)`: Validates payload with `menuItemSchema`. Scopes to active organization.
- `createMenuVariant(data)`: Creates variant with default base price.
- `upsertRecipeItem(data)`: Saves ingredient ratio in variant's Bill of Materials.
- `updateBranchMenuConfig(data)`: Configures branch-level availability (toggle out-of-stock items) and branch-specific price overrides.

