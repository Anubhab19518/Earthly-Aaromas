# Point of Sale (POS) & Order Queue API Documentation

OpenAPI 3.1 specification for POS Menus, Order Taking, Payments, and Kitchen Order Queue Execution.

---

## 1. OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Tea Chain ERP - POS & Order Queue API
  version: 1.0.0
  description: Retail checkout terminal, live kitchen queue, and automatic ingredient depletion.

paths:
  /rpc/get_pos_menu:
    post:
      summary: Get POS Menu for Branch (RPC)
      description: Returns sellable items for employees, resolving branch-level price overrides and filtering out branch-disabled items.
      operationId: getPosMenu
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_organization_id, p_location_id]
              properties:
                p_organization_id:
                  type: string
                  format: uuid
                p_location_id:
                  type: string
                  format: uuid
      responses:
        '200':
          description: Formatted array of menu categories, items, variants, and effective prices.

  /rpc/create_order:
    post:
      summary: Create Order in Queue (RPC)
      description: Submits a new customer order into the kitchen queue in PENDING status.
      operationId: createOrder
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_location_id, p_items, p_customer_name]
              properties:
                p_location_id:
                  type: string
                  format: uuid
                p_customer_name:
                  type: string
                  example: "Rahul Sharma"
                p_customer_phone:
                  type: string
                  nullable: true
                  example: "+919876543210"
                p_items:
                  type: array
                  items:
                    type: object
                    required: [variant_id, quantity, unit_price]
                    properties:
                      variant_id:
                        type: string
                        format: uuid
                      quantity:
                        type: integer
                        example: 2
                      unit_price:
                        type: number
                        example: 15.00
                p_notes:
                  type: string
                  nullable: true
      responses:
        '200':
          description: Returns generated sales order UUID.
          content:
            application/json:
              schema:
                type: string
                format: uuid

  /rpc/start_preparing_order:
    post:
      summary: Start Preparing Order (Kitchen Display RPC)
      description: Kitchen staff action transition from PENDING to PREPARING.
      operationId: startPreparingOrder
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_order_id]
              properties:
                p_order_id:
                  type: string
                  format: uuid
      responses:
        '200':
          description: Order state updated.

  /rpc/mark_order_ready:
    post:
      summary: Mark Order Ready (Kitchen Display RPC)
      description: Kitchen action transition from PREPARING to READY for pickup.
      operationId: markOrderReady
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_order_id]
              properties:
                p_order_id:
                  type: string
                  format: uuid
      responses:
        '200':
          description: Order state updated.

  /rpc/complete_order:
    post:
      summary: Complete Order & Consume Stock (RPC)
      description: Finalizes order upon customer pickup and settlement. Automatically iterates through variant recipes and executes `post_inventory_movement` for all consumed ingredients.
      operationId: completeOrder
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_order_id]
              properties:
                p_order_id:
                  type: string
                  format: uuid
      responses:
        '200':
          description: Order completed and inventory decremented.

  /rpc/cancel_order:
    post:
      summary: Cancel Order (RPC)
      description: Cancels order before preparation.
      operationId: cancelOrder
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_order_id]
              properties:
                p_order_id:
                  type: string
                  format: uuid
      responses:
        '200':
          description: Order cancelled.

  /rpc/get_location_orders:
    post:
      summary: Get Live Active Orders for Location (RPC)
      description: Pollable queue feed of active location orders for the kitchen screen and counter.
      operationId: getLocationOrders
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_location_id]
              properties:
                p_location_id:
                  type: string
                  format: uuid
      responses:
        '200':
          description: Active orders with items and customer details.
```

---

## 2. Server Action Reference

### Order Actions (`modules/pos/services/order.actions.ts`)
- `createOrderAction(input)`: Validates cart with `createOrderSchema`. Calls `create_order` RPC.
- `startPreparingAction(orderId)`: Invokes `start_preparing_order`.
- `markOrderReadyAction(orderId)`: Invokes `mark_order_ready`.
- `completeOrderAction(orderId)`: Invokes `complete_order` RPC, which atomizes bill fulfillment and ingredient deduction.
- `cancelOrderAction(orderId)`: Invokes `cancel_order`.

