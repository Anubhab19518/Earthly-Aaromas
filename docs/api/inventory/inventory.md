# Inventory Engine & Stock Movements API Documentation

OpenAPI 3.1 specification for the Immutable Inventory Ledger, Real-time Snapshots, Adjustments, Transfers, and Alert Policies.

---

## 1. OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Tea Chain ERP - Inventory Engine API
  version: 1.0.0
  description: Transaction posting, double-entry stock movement, branch transfers, and alert policies.

paths:
  /rpc/post_inventory_movement:
    post:
      summary: Post Inventory Movement (Core Engine RPC)
      description: Atomically updates `inventory_snapshot` and appends an immutable entry to `inventory_ledger`. Blocks negative balances if negative stock is disallowed.
      operationId: postInventoryMovement
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - p_organization_id
                - p_location_id
                - p_ingredient_id
                - p_transaction_type
                - p_quantity_change
                - p_unit_id
              properties:
                p_organization_id:
                  type: string
                  format: uuid
                p_location_id:
                  type: string
                  format: uuid
                p_ingredient_id:
                  type: string
                  format: uuid
                p_transaction_type:
                  type: string
                  enum: [GOODS_RECEIPT, TRANSFER_IN, TRANSFER_OUT, SALE, RECIPE_CONSUMPTION, STOCK_ADJUSTMENT, WASTAGE, RETURN]
                  example: STOCK_ADJUSTMENT
                p_reference_type:
                  type: string
                  enum: [PO, GRN, TRANSFER, ORDER, MANUAL]
                  nullable: true
                p_reference_id:
                  type: string
                  nullable: true
                p_quantity_change:
                  type: number
                  description: Quantity in base unit (positive to add stock, negative to deduct)
                  example: 500.000
                p_unit_id:
                  type: string
                  format: uuid
                p_running_cost:
                  type: number
                  nullable: true
                  example: 120.00
                p_remarks:
                  type: string
                  nullable: true
                  example: "Inventory audit reconciliation"
      responses:
        '200':
          description: Created ledger entry ID.
          content:
            application/json:
              schema:
                type: string
                format: uuid
        '400':
          description: Stock violation or invalid transaction parameters.

  /rpc/post_stock_transfer:
    post:
      summary: Finalize Stock Transfer (RPC)
      description: Atomically posts a two-sided stock transfer, deducting items from the source location (`TRANSFER_OUT`) and crediting destination location (`TRANSFER_IN`).
      operationId: postStockTransfer
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_transfer_id]
              properties:
                p_transfer_id:
                  type: string
                  format: uuid
      responses:
        '200':
          description: Transfer successfully posted and marked COMPLETED.

  /rest/v1/inventory_snapshot:
    get:
      summary: Read Materialized Stock Balances
      description: Returns instant on-hand inventory levels per branch and ingredient.
      operationId: getInventorySnapshot
      security:
        - BearerAuth: []
      parameters:
        - name: location_id
          in: query
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Current stock levels.
```

---

## 2. Server Action Reference

### Stock Adjustments & Ledger (`modules/inventory/services/inventory.actions.ts`)
- `adjustStock(data)`: Validates input with `stockAdjustmentSchema`. Converts input quantity to ingredient base unit, then calls `post_inventory_movement` with type `STOCK_ADJUSTMENT`.
- `recordWastage(data)`: Posts negative quantity movement with transaction type `WASTAGE`.

### Stock Transfers (`modules/inventory/services/stock-transfer.actions.ts`)
- `createStockTransfer(data)`: Drafts transfer header with auto-generated transfer number (`TR-YYYY-XXXX`).
- `addStockTransferItem(data)`: Appends line items specifying quantities.
- `dispatchTransfer(transferId)`: Marks transfer `IN_TRANSIT`.
- `receiveTransfer(transferId)`: Invokes RPC `post_stock_transfer` to commit two-sided ledger rows and mark `COMPLETED`.

### Alert Policies (`modules/inventory/services/alert-policy.actions.ts`)
- `getActiveInventoryAlerts(locationId)`: Compares `inventory_snapshot` against `inventory_alert_policies` to surface `WARNING`, `CRITICAL`, and `OUT_OF_STOCK` notifications in the top navigation.

