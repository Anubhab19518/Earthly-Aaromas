-- Purchase Orders
CREATE TYPE purchase_order_status AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'PARTIAL', 'COMPLETED', 'CANCELLED');

CREATE TABLE purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    status purchase_order_status NOT NULL DEFAULT 'DRAFT',
    po_number text NOT NULL,
    expected_delivery_date date,
    total_expected_cost numeric(12,2) NOT NULL DEFAULT 0,
    notes text,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, po_number)
);

CREATE TABLE purchase_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity numeric(10,3) NOT NULL CHECK (quantity > 0),
    unit_id uuid NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    converted_base_quantity numeric(10,3) NOT NULL,
    expected_cost numeric(12,2) NOT NULL DEFAULT 0,
    tax_category_id uuid REFERENCES tax_categories(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Update Goods Receipts to link to PO
ALTER TABLE goods_receipts ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for purchase_orders
CREATE POLICY "Users can view purchase_orders in their organization" ON purchase_orders
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users with inventory.manage can insert purchase_orders" ON purchase_orders
    FOR INSERT WITH CHECK (
        public.has_permission(organization_id, 'inventory.manage')
    );

CREATE POLICY "Users with inventory.manage can update purchase_orders" ON purchase_orders
    FOR UPDATE USING (
        public.has_permission(organization_id, 'inventory.manage')
    );

CREATE POLICY "Users with inventory.manage can delete purchase_orders" ON purchase_orders
    FOR DELETE USING (
        public.has_permission(organization_id, 'inventory.manage')
    );

-- Policies for purchase_order_items (Inherits access from PO via organization_id check, but we need to join or just simplify)
-- To simplify, we can add organization_id to items or just join in policy. Joining in policy:
CREATE POLICY "Users can view purchase_order_items in their organization" ON purchase_order_items
    FOR SELECT USING (
        po_id IN (
            SELECT id FROM purchase_orders WHERE organization_id IN (
                SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
            )
        )
    );

CREATE POLICY "Users can insert purchase_order_items" ON purchase_order_items
    FOR INSERT WITH CHECK (
        po_id IN (
            SELECT id FROM purchase_orders WHERE public.has_permission(purchase_orders.organization_id, 'inventory.manage')
        )
    );

CREATE POLICY "Users can update purchase_order_items" ON purchase_order_items
    FOR UPDATE USING (
        po_id IN (
            SELECT id FROM purchase_orders WHERE public.has_permission(purchase_orders.organization_id, 'inventory.manage')
        )
    );

CREATE POLICY "Users can delete purchase_order_items" ON purchase_order_items
    FOR DELETE USING (
        po_id IN (
            SELECT id FROM purchase_orders WHERE public.has_permission(purchase_orders.organization_id, 'inventory.manage')
        )
    );

-- Function to auto-generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS trigger AS $$
DECLARE
    next_seq int;
    org_prefix text;
BEGIN
    SELECT COALESCE(COUNT(*), 0) + 1 INTO next_seq 
    FROM purchase_orders 
    WHERE organization_id = NEW.organization_id;
    
    NEW.po_number := 'PO-' || to_char(now(), 'YYYYMM') || '-' || lpad(next_seq::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_po_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW
    WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
    EXECUTE FUNCTION generate_po_number();

-- Update updated_at trigger
CREATE TRIGGER tr_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

