# Purchasing & Goods Receiving (GRN) API Documentation

OpenAPI 3.1 specification for Purchase Orders, Supplier Receipts, and Automated Inventory Intake.

---

## 1. OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Tea Chain ERP - Purchasing & Receiving API
  version: 1.0.0
  description: Purchase order authoring, status workflows, and Goods Receipt Notes (GRN).

paths:
  /rest/v1/purchase_orders:
    get:
      summary: List Purchase Orders
      description: Returns purchase orders for the organization.
      operationId: getPurchaseOrders
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of purchase orders.
    post:
      summary: Create Purchase Order
      description: Creates a new purchase order header in DRAFT status.
      operationId: createPurchaseOrder
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [location_id, supplier_id]
              properties:
                location_id:
                  type: string
                  format: uuid
                supplier_id:
                  type: string
                  format: uuid
                expected_delivery_date:
                  type: string
                  format: date
                notes:
                  type: string
      responses:
        '201':
          description: Purchase order created.

  /rest/v1/goods_receipts:
    get:
      summary: List Goods Receipts
      description: Retrieves Goods Receipt Notes (GRN).
      operationId: getGoodsReceipts
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of GRNs.

  /rpc/post_goods_receipt:
    post:
      summary: Post Goods Receipt (RPC)
      description: Finalizes a DRAFT GRN. Iterates over line items, executes `post_inventory_movement` for each received item, and automatically marks linked PO items as PARTIAL or COMPLETED.
      operationId: postGoodsReceipt
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_grn_id]
              properties:
                p_grn_id:
                  type: string
                  format: uuid
      responses:
        '200':
          description: GRN successfully posted into warehouse inventory.
```

---

## 2. Server Action Reference

### Purchase Orders (`modules/purchasing/services/purchase-order.actions.ts`)
- `createPurchaseOrder(data)`: Validates via `purchaseOrderSchema`. Auto-generates `po_number` via database trigger.
- `addPurchaseOrderItem(data)`: Adds raw ingredient lines with order units and expected cost.
- `updatePOStatus(id, status)`: Transitions PO (`DRAFT` -> `APPROVED` -> `SENT` -> `COMPLETED` / `CANCELLED`).

### Goods Receipts (`modules/receiving/services/grn.actions.ts`)
- `createGoodsReceipt(data)`: Validates via `grnSchema`. Can link to an existing `purchase_order_id` or run as an independent supplier delivery.
- `postGoodsReceipt(id)`: Invokes RPC `post_goods_receipt` to lock the document and increment physical stock on hand.

