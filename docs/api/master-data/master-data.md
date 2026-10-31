# Master Data API Documentation

OpenAPI 3.1 specification for Ingredients, Categories, Units, Suppliers, and Tax Categories in Tea Chain ERP.

---

## 1. OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Tea Chain ERP - Master Data API
  version: 1.0.0
  description: Management of Raw Ingredients, Units of Measurement, Suppliers, and GST Taxes.

paths:
  /rest/v1/ingredients:
    get:
      summary: List Ingredients
      description: Returns active raw materials for the current organization.
      operationId: getIngredients
      security:
        - BearerAuth: []
      parameters:
        - name: select
          in: query
          schema:
            type: string
            default: "*, base_unit:units(*), category:ingredient_categories(*)"
      responses:
        '200':
          description: List of ingredients.
    post:
      summary: Create Ingredient
      description: Creates a new raw ingredient with base measurement unit.
      operationId: createIngredient
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, base_unit_id, category_id, standard_cost]
              properties:
                name:
                  type: string
                  example: "Assam CTC Tea Leaves"
                sku:
                  type: string
                  example: "ING-TEA-001"
                category_id:
                  type: string
                  format: uuid
                base_unit_id:
                  type: string
                  format: uuid
                standard_cost:
                  type: number
                  example: 320.00
                stock_policy:
                  type: string
                  enum: [STOCKABLE, CONSUMABLE, EXPIRABLE]
                  default: STOCKABLE
      responses:
        '201':
          description: Ingredient created.

  /rest/v1/units:
    get:
      summary: List Units of Measurement
      description: Lists standard measurement units (grams, kg, litres, ml, packets).
      operationId: getUnits
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Array of units.
    post:
      summary: Create Unit
      description: Adds a new measurement unit with optional conversion factor to a base unit.
      operationId: createUnit
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, symbol, measurement_category, is_base_unit]
              properties:
                name:
                  type: string
                  example: "Kilogram"
                symbol:
                  type: string
                  example: "kg"
                measurement_category:
                  type: string
                  enum: [WEIGHT, VOLUME, COUNT, COOKING]
                is_base_unit:
                  type: boolean
                base_unit_id:
                  type: string
                  format: uuid
                  nullable: true
                conversion_factor:
                  type: number
                  example: 1000
      responses:
        '201':
          description: Unit created.

  /rest/v1/suppliers:
    get:
      summary: List Suppliers
      description: Lists active vendors and distributors.
      operationId: getSuppliers
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Array of suppliers.

  /rest/v1/tax_categories:
    get:
      summary: List Tax Categories & Rates
      description: Retrieves GST tax categories with current effective rates.
      operationId: getTaxCategories
      security:
        - BearerAuth: []
      parameters:
        - name: select
          in: query
          schema:
            type: string
            default: "*, tax_rates(*)"
      responses:
        '200':
          description: List of tax categories with rates.
```

---

## 2. Server Action Reference

### Ingredients (`modules/ingredients/services/ingredient.actions.ts`)
- `createIngredient(data)`: Validates payload with `ingredientSchema`. Enforces unique SKU and assigns tenant `organization_id`.
- `updateIngredient(id, data)`: Updates name, standard cost, or category.
- `deleteIngredient(id)`: Sets `deleted_at = now()` (soft delete) to protect historical ledger relations.

### Units & Conversions (`modules/units/services/unit.actions.ts`)
- `createUnit(data)`: Inserts unit. If `is_base_unit` is false, requires valid `base_unit_id` and positive `conversion_factor`.
- `createIngredientConversion(data)`: Sets item-specific conversion (e.g. 1 tablespoon of sugar = 15g).

