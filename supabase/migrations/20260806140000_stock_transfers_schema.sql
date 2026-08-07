-- Stock Transfers Module
CREATE TYPE stock_transfer_status AS ENUM ('DRAFT', 'SHIPPED', 'RECEIVED', 'CANCELLED');

CREATE TABLE stock_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    destination_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    status stock_transfer_status NOT NULL DEFAULT 'DRAFT',
    transfer_number text NOT NULL,
    notes text,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, transfer_number),
    CHECK (source_location_id != destination_location_id)
);

CREATE TABLE stock_transfer_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id uuid NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity numeric(10,3) NOT NULL CHECK (quantity > 0),
    unit_id uuid NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    converted_base_quantity numeric(10,3) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- Policies for stock_transfers
CREATE POLICY "Users can view stock_transfers in their organization" ON stock_transfers
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users with inventory.manage can insert stock_transfers" ON stock_transfers
    FOR INSERT WITH CHECK (
        public.has_permission(organization_id, 'inventory.manage')
    );

CREATE POLICY "Users with inventory.manage can update stock_transfers" ON stock_transfers
    FOR UPDATE USING (
        public.has_permission(organization_id, 'inventory.manage')
    );

CREATE POLICY "Users with inventory.manage can delete stock_transfers" ON stock_transfers
    FOR DELETE USING (
        public.has_permission(organization_id, 'inventory.manage')
    );

-- Policies for stock_transfer_items
CREATE POLICY "Users can view stock_transfer_items in their organization" ON stock_transfer_items
    FOR SELECT USING (
        transfer_id IN (
            SELECT id FROM stock_transfers WHERE organization_id IN (
                SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
            )
        )
    );

CREATE POLICY "Users can insert stock_transfer_items" ON stock_transfer_items
    FOR INSERT WITH CHECK (
        transfer_id IN (
            SELECT id FROM stock_transfers WHERE public.has_permission(stock_transfers.organization_id, 'inventory.manage')
        )
    );

CREATE POLICY "Users can update stock_transfer_items" ON stock_transfer_items
    FOR UPDATE USING (
        transfer_id IN (
            SELECT id FROM stock_transfers WHERE public.has_permission(stock_transfers.organization_id, 'inventory.manage')
        )
    );

CREATE POLICY "Users can delete stock_transfer_items" ON stock_transfer_items
    FOR DELETE USING (
        transfer_id IN (
            SELECT id FROM stock_transfers WHERE public.has_permission(stock_transfers.organization_id, 'inventory.manage')
        )
    );

-- Function to auto-generate Transfer number
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS trigger AS $$
DECLARE
    next_seq int;
BEGIN
    SELECT COALESCE(COUNT(*), 0) + 1 INTO next_seq 
    FROM stock_transfers 
    WHERE organization_id = NEW.organization_id;
    
    NEW.transfer_number := 'TR-' || to_char(now(), 'YYYYMM') || '-' || lpad(next_seq::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_transfer_number
    BEFORE INSERT ON stock_transfers
    FOR EACH ROW
    WHEN (NEW.transfer_number IS NULL OR NEW.transfer_number = '')
    EXECUTE FUNCTION generate_transfer_number();

-- Update updated_at trigger
CREATE TRIGGER tr_stock_transfers_updated_at
    BEFORE UPDATE ON stock_transfers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
