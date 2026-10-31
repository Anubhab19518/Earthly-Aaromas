# Analytics & Audit Trail API Documentation

OpenAPI 3.1 specification for Financial Reporting, Branch Sales Analytics, and Audit Logs.

---

## 1. OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Tea Chain ERP - Analytics & Audit API
  version: 1.0.0
  description: Financial metrics, inventory turnover, revenue aggregations, and immutable operational audit logs.

paths:
  /rest/v1/audit_log:
    get:
      summary: Query Operational Audit Logs
      description: Returns chronological audit log records of inventory postings, GRNs, transfers, and document actions.
      operationId: getAuditLogs
      security:
        - BearerAuth: []
      parameters:
        - name: organization_id
          in: query
          required: true
          schema:
            type: string
            format: uuid
        - name: entity_type
          in: query
          schema:
            type: string
        - name: order
          in: query
          schema:
            type: string
            default: "occurred_at.desc"
      responses:
        '200':
          description: Paginated audit log records.

  /analytics/financial-overview:
    get:
      summary: Financial Overview Metrics
      description: Aggregates revenue, cost of goods sold (COGS), gross margin, and stock valuation.
      operationId: getFinancialOverview
      security:
        - BearerAuth: []
      parameters:
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: timeRange
          in: query
          schema:
            type: string
            enum: [7d, 30d, 90d, 1y]
            default: 30d
      responses:
        '200':
          description: Financial metrics object.
```

---

## 2. Server Action Reference

### Financial Overview (`modules/analytics/services/financial-overview.actions.ts`)
- `getFinancialOverviewData(locationId, period)`: Aggregates order revenues from `sales_orders` and `sales_order_items`, computes ingredient costs using recipes and standard costs, and yields gross margins.

### Audit Log (`modules/audit/services/audit-log.actions.ts`)
- `getAuditLog(organizationId, filterParams)`: Queries `public.audit_log` with support for pagination, entity type filtering, actor filtering, and date ranges.

