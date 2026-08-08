-- Grant select on public.audit_log to authenticated users so they can query it
-- (It was accidentally revoked in the initial RBAC migration)
grant select on public.audit_log to authenticated;
