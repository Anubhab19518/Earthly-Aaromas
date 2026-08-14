-- Create comments table
CREATE TABLE comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
    goods_receipt_id uuid REFERENCES goods_receipts(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT chk_comment_entity CHECK (
        (purchase_order_id IS NOT NULL)::integer + 
        (goods_receipt_id IS NOT NULL)::integer = 1
    )
);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for comments
CREATE POLICY "Users can view comments in their organization" ON comments
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Users can insert comments in their organization" ON comments
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );
