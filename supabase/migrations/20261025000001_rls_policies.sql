-- ============================================================================
-- WormWise 🌱 Smart Farm - Row Level Security (RLS) Policies
-- Milestone 3: Multi-Tenant Data Isolation & Access Authorization
-- ============================================================================

-- Enable RLS on all relational tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.greenhouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Security Definer Helper Functions
-- ----------------------------------------------------------------------------

-- Returns the list of tenant IDs the calling authenticated user belongs to
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid();
$$;

-- Checks if the user has specific roles within a given tenant
CREATE OR REPLACE FUNCTION public.user_has_tenant_role(required_tenant_id UUID, required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid()
          AND tenant_id = required_tenant_id
          AND role = ANY(required_roles)
    );
$$;

-- ----------------------------------------------------------------------------
-- 1. Profiles Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. Tenants Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view tenants they are members of"
    ON public.tenants FOR SELECT
    USING (id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Tenant owners can update tenant details"
    ON public.tenants FOR UPDATE
    USING (public.user_has_tenant_role(id, ARRAY['owner']));

-- ----------------------------------------------------------------------------
-- 3. Memberships Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view memberships of their tenants"
    ON public.memberships FOR SELECT
    USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Tenant admins/owners can manage memberships"
    ON public.memberships FOR ALL
    USING (public.user_has_tenant_role(tenant_id, ARRAY['owner', 'admin']));

-- ----------------------------------------------------------------------------
-- 4. Farms Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view farms within their tenants"
    ON public.farms FOR SELECT
    USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Tenant admins/owners can manage farms"
    ON public.farms FOR ALL
    USING (public.user_has_tenant_role(tenant_id, ARRAY['owner', 'admin']));

-- ----------------------------------------------------------------------------
-- 5. Greenhouses Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view greenhouses within their tenants"
    ON public.greenhouses FOR SELECT
    USING (
        farm_id IN (
            SELECT id FROM public.farms WHERE tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

CREATE POLICY "Tenant admins/operators can manage greenhouses"
    ON public.greenhouses FOR ALL
    USING (
        farm_id IN (
            SELECT id FROM public.farms WHERE tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

-- ----------------------------------------------------------------------------
-- 6. Devices Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view devices belonging to their greenhouses"
    ON public.devices FOR SELECT
    USING (
        greenhouse_id IN (
            SELECT g.id FROM public.greenhouses g
            JOIN public.farms f ON f.id = g.farm_id
            WHERE f.tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

CREATE POLICY "Tenant admins can manage devices"
    ON public.devices FOR ALL
    USING (
        greenhouse_id IN (
            SELECT g.id FROM public.greenhouses g
            JOIN public.farms f ON f.id = g.farm_id
            WHERE public.user_has_tenant_role(f.tenant_id, ARRAY['owner', 'admin'])
        )
    );

-- ----------------------------------------------------------------------------
-- 7. Sensor Configurations Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view sensor configurations for their devices"
    ON public.sensor_configs FOR SELECT
    USING (
        device_id IN (
            SELECT d.id FROM public.devices d
            JOIN public.greenhouses g ON g.id = d.greenhouse_id
            JOIN public.farms f ON f.id = g.farm_id
            WHERE f.tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

CREATE POLICY "Tenant admins/operators can update sensor configurations"
    ON public.sensor_configs FOR ALL
    USING (
        device_id IN (
            SELECT d.id FROM public.devices d
            JOIN public.greenhouses g ON g.id = d.greenhouse_id
            JOIN public.farms f ON f.id = g.farm_id
            WHERE public.user_has_tenant_role(f.tenant_id, ARRAY['owner', 'admin', 'operator'])
        )
    );

-- ----------------------------------------------------------------------------
-- 8. Control Rules Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view control rules"
    ON public.control_rules FOR SELECT
    USING (
        device_id IN (
            SELECT d.id FROM public.devices d
            JOIN public.greenhouses g ON g.id = d.greenhouse_id
            JOIN public.farms f ON f.id = g.farm_id
            WHERE f.tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

CREATE POLICY "Tenant admins can modify control rules"
    ON public.control_rules FOR ALL
    USING (
        device_id IN (
            SELECT d.id FROM public.devices d
            JOIN public.greenhouses g ON g.id = d.greenhouse_id
            JOIN public.farms f ON f.id = g.farm_id
            WHERE public.user_has_tenant_role(f.tenant_id, ARRAY['owner', 'admin'])
        )
    );

-- ----------------------------------------------------------------------------
-- 9. Device Commands Policies (Operator / Admin only can issue commands)
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view command queue for their devices"
    ON public.device_commands FOR SELECT
    USING (
        device_id IN (
            SELECT d.id FROM public.devices d
            JOIN public.greenhouses g ON g.id = d.greenhouse_id
            JOIN public.farms f ON f.id = g.farm_id
            WHERE f.tenant_id IN (SELECT public.get_user_tenant_ids())
        )
    );

CREATE POLICY "Operators and admins can issue device commands"
    ON public.device_commands FOR INSERT
    WITH CHECK (
        device_id IN (
            SELECT d.id FROM public.devices d
            JOIN public.greenhouses g ON g.id = d.greenhouse_id
            JOIN public.farms f ON f.id = g.farm_id
            WHERE public.user_has_tenant_role(f.tenant_id, ARRAY['owner', 'admin', 'operator'])
        )
    );

-- ----------------------------------------------------------------------------
-- 10. Audit Logs Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view audit logs for their tenant"
    ON public.audit_logs FOR SELECT
    USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "System can record audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));
