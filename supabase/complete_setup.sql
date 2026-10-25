-- ============================================================================
-- WormWise 🌱 Smart Farm - Complete Database Setup Script
-- Milestone 3: Tables, Indexes, RLS Policies, Profile Trigger & Seed Data
-- ============================================================================
-- Paste and run this ENTIRE script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create Tables
-- ----------------------------------------------------------------------------

-- 1.1 Tenants (Organizations / Farm Owners)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.2 User Profiles (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.3 Memberships (Tenant Access & Role Mapping)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(tenant_id, user_id)
);

-- 1.4 Farms
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.5 Greenhouses (Vermicomposting Units)
CREATE TABLE IF NOT EXISTS public.greenhouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    zone TEXT,
    worm_species TEXT NOT NULL DEFAULT 'Eisenia fetida',
    bed_count INTEGER NOT NULL DEFAULT 1 CHECK (bed_count > 0),
    status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'degraded', 'offline')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.6 Devices (ESP32 Microcontrollers / Gateways)
CREATE TABLE IF NOT EXISTS public.devices (
    id TEXT PRIMARY KEY, -- e.g. 'esp32-wormwise-gh1-01'
    greenhouse_id UUID NOT NULL REFERENCES public.greenhouses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hardware_type TEXT NOT NULL DEFAULT 'ESP32-WROOM-32D',
    mac_address TEXT UNIQUE NOT NULL,
    firmware_version TEXT NOT NULL DEFAULT 'v0.1.0',
    ip_address TEXT,
    wifi_rssi INTEGER,
    is_online BOOLEAN NOT NULL DEFAULT false,
    last_seen TIMESTAMPTZ,
    mqtt_base_topic TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.7 Sensor Configurations (Optimal/Critical Thresholds & Calibration)
CREATE TABLE IF NOT EXISTS public.sensor_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    sensor_key TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    min_optimal NUMERIC NOT NULL,
    max_optimal NUMERIC NOT NULL,
    min_critical NUMERIC NOT NULL,
    max_critical NUMERIC NOT NULL,
    calibration_offset NUMERIC NOT NULL DEFAULT 0.0,
    sampling_interval_seconds INTEGER NOT NULL DEFAULT 10 CHECK (sampling_interval_seconds >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(device_id, sensor_key)
);

-- 1.8 Control Rules (Local ESP32 Safety & Automated Actuation)
CREATE TABLE IF NOT EXISTS public.control_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    target_actuator TEXT NOT NULL,
    trigger_condition TEXT NOT NULL,
    action TEXT NOT NULL,
    max_run_seconds INTEGER NOT NULL DEFAULT 60 CHECK (max_run_seconds > 0),
    is_local_safety BOOLEAN NOT NULL DEFAULT false,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.9 Device Commands
CREATE TABLE IF NOT EXISTS public.device_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'succeeded', 'failed', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    acknowledged_at TIMESTAMPTZ
);

-- 1.10 Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_memberships_user_tenant ON public.memberships(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_farms_tenant ON public.farms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_greenhouses_farm ON public.greenhouses(farm_id);
CREATE INDEX IF NOT EXISTS idx_devices_greenhouse ON public.devices(greenhouse_id);
CREATE INDEX IF NOT EXISTS idx_sensor_configs_device ON public.sensor_configs(device_id);
CREATE INDEX IF NOT EXISTS idx_control_rules_device ON public.control_rules(device_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_device_status ON public.device_commands(device_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_time ON public.audit_logs(tenant_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. Auth Trigger: Auto-create User Profile on Sign Up
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Setup
-- ----------------------------------------------------------------------------
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

-- Helper Functions
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid();
$$;

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

-- RLS Policies
-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tenants
DROP POLICY IF EXISTS "Users can view tenants they are members of" ON public.tenants;
CREATE POLICY "Users can view tenants they are members of" ON public.tenants FOR SELECT USING (id IN (SELECT public.get_user_tenant_ids()));

DROP POLICY IF EXISTS "Tenant owners can update tenant details" ON public.tenants;
CREATE POLICY "Tenant owners can update tenant details" ON public.tenants FOR UPDATE USING (public.user_has_tenant_role(id, ARRAY['owner']));

-- Memberships
DROP POLICY IF EXISTS "Users can view memberships of their tenants" ON public.memberships;
CREATE POLICY "Users can view memberships of their tenants" ON public.memberships FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

DROP POLICY IF EXISTS "Tenant admins/owners can manage memberships" ON public.memberships;
CREATE POLICY "Tenant admins/owners can manage memberships" ON public.memberships FOR ALL USING (public.user_has_tenant_role(tenant_id, ARRAY['owner', 'admin']));

-- Farms
DROP POLICY IF EXISTS "Users can view farms within their tenants" ON public.farms;
CREATE POLICY "Users can view farms within their tenants" ON public.farms FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

DROP POLICY IF EXISTS "Tenant admins/owners can manage farms" ON public.farms;
CREATE POLICY "Tenant admins/owners can manage farms" ON public.farms FOR ALL USING (public.user_has_tenant_role(tenant_id, ARRAY['owner', 'admin']));

-- Greenhouses
DROP POLICY IF EXISTS "Users can view greenhouses within their tenants" ON public.greenhouses;
CREATE POLICY "Users can view greenhouses within their tenants" ON public.greenhouses FOR SELECT USING (
    farm_id IN (SELECT id FROM public.farms WHERE tenant_id IN (SELECT public.get_user_tenant_ids()))
);

DROP POLICY IF EXISTS "Tenant admins/operators can manage greenhouses" ON public.greenhouses;
CREATE POLICY "Tenant admins/operators can manage greenhouses" ON public.greenhouses FOR ALL USING (
    farm_id IN (SELECT id FROM public.farms WHERE tenant_id IN (SELECT public.get_user_tenant_ids()))
);

-- Devices
DROP POLICY IF EXISTS "Users can view devices belonging to their greenhouses" ON public.devices;
CREATE POLICY "Users can view devices belonging to their greenhouses" ON public.devices FOR SELECT USING (
    greenhouse_id IN (
        SELECT g.id FROM public.greenhouses g
        JOIN public.farms f ON f.id = g.farm_id
        WHERE f.tenant_id IN (SELECT public.get_user_tenant_ids())
    )
);

DROP POLICY IF EXISTS "Tenant admins can manage devices" ON public.devices;
CREATE POLICY "Tenant admins can manage devices" ON public.devices FOR ALL USING (
    greenhouse_id IN (
        SELECT g.id FROM public.greenhouses g
        JOIN public.farms f ON f.id = g.farm_id
        WHERE public.user_has_tenant_role(f.tenant_id, ARRAY['owner', 'admin'])
    )
);

-- Sensor Configs
DROP POLICY IF EXISTS "Users can view sensor configurations for their devices" ON public.sensor_configs;
CREATE POLICY "Users can view sensor configurations for their devices" ON public.sensor_configs FOR SELECT USING (
    device_id IN (
        SELECT d.id FROM public.devices d
        JOIN public.greenhouses g ON g.id = d.greenhouse_id
        JOIN public.farms f ON f.id = g.farm_id
        WHERE f.tenant_id IN (SELECT public.get_user_tenant_ids())
    )
);

-- Control Rules
DROP POLICY IF EXISTS "Users can view control rules" ON public.control_rules;
CREATE POLICY "Users can view control rules" ON public.control_rules FOR SELECT USING (
    device_id IN (
        SELECT d.id FROM public.devices d
        JOIN public.greenhouses g ON g.id = d.greenhouse_id
        JOIN public.farms f ON f.id = g.farm_id
        WHERE f.tenant_id IN (SELECT public.get_user_tenant_ids())
    )
);

-- Device Commands
DROP POLICY IF EXISTS "Users can view command queue for their devices" ON public.device_commands;
CREATE POLICY "Users can view command queue for their devices" ON public.device_commands FOR SELECT USING (
    device_id IN (
        SELECT d.id FROM public.devices d
        JOIN public.greenhouses g ON g.id = d.greenhouse_id
        JOIN public.farms f ON f.id = g.farm_id
        WHERE f.tenant_id IN (SELECT public.get_user_tenant_ids())
    )
);

DROP POLICY IF EXISTS "Operators and admins can issue device commands" ON public.device_commands;
CREATE POLICY "Operators and admins can issue device commands" ON public.device_commands FOR INSERT WITH CHECK (
    device_id IN (
        SELECT d.id FROM public.devices d
        JOIN public.greenhouses g ON g.id = d.greenhouse_id
        JOIN public.farms f ON f.id = g.farm_id
        WHERE public.user_has_tenant_role(f.tenant_id, ARRAY['owner', 'admin', 'operator'])
    )
);

-- Audit Logs
DROP POLICY IF EXISTS "Users can view audit logs for their tenant" ON public.audit_logs;
CREATE POLICY "Users can view audit logs for their tenant" ON public.audit_logs FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- ----------------------------------------------------------------------------
-- 4. Initial Seed Data
-- ----------------------------------------------------------------------------

-- Tenants
INSERT INTO public.tenants (id, name, slug)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'GreenEarth Vermiculture', 'green-earth'),
    ('22222222-2222-2222-2222-222222222222', 'OrganicWorm Commercial Farms', 'organic-worm')
ON CONFLICT (id) DO NOTHING;

-- Farms
INSERT INTO public.farms (id, tenant_id, name, location, timezone)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'GreenEarth North Facility', 'Washington, USA', 'America/Los_Angeles'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'OrganicWorm Valley Facility', 'Oregon, USA', 'America/Los_Angeles')
ON CONFLICT (id) DO NOTHING;

-- Greenhouses
INSERT INTO public.greenhouses (id, farm_id, name, zone, worm_species, bed_count, status)
VALUES
    (
        'c1111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Greenhouse Alpha (Bed A)',
        'Zone A - Primary Breeding',
        'Eisenia fetida (Red Wigglers)',
        4,
        'online'
    ),
    (
        'c2222222-2222-2222-2222-222222222222',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Greenhouse Beta (Bed B)',
        'Zone B - Castings Nursery',
        'Eudrilus eugeniae (African Nightcrawlers)',
        2,
        'degraded'
    ),
    (
        'c3333333-3333-3333-3333-333333333333',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Commercial Vermi-Facility 1',
        'Zone Commercial - Bulk Composting',
        'Lumbricus rubellus (Red Earthworm)',
        8,
        'online'
    )
ON CONFLICT (id) DO NOTHING;

-- ESP32 Devices
INSERT INTO public.devices (id, greenhouse_id, name, hardware_type, mac_address, firmware_version, ip_address, wifi_rssi, is_online, last_seen, mqtt_base_topic)
VALUES
    (
        'esp32-wormwise-gh1-01',
        'c1111111-1111-1111-1111-111111111111',
        'ESP32 VermiNode Core #1',
        'ESP32-WROOM-32D',
        '24:6F:28:B4:72:9A',
        'v0.2.1-dev',
        '192.168.1.142',
        -64,
        true,
        now(),
        'wormwise/11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/c1111111-1111-1111-1111-111111111111/esp32-wormwise-gh1-01'
    ),
    (
        'esp32-wormwise-gh2-01',
        'c2222222-2222-2222-2222-222222222222',
        'ESP32 VermiNode Core #2',
        'ESP32-WROOM-32D',
        '24:6F:28:A1:34:11',
        'v0.2.0-dev',
        '192.168.1.143',
        -78,
        true,
        now() - interval '30 seconds',
        'wormwise/11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/c2222222-2222-2222-2222-222222222222/esp32-wormwise-gh2-01'
    ),
    (
        'esp32-wormwise-gh3-01',
        'c3333333-3333-3333-3333-333333333333',
        'ESP32 Commercial Unit Node',
        'ESP32-WROOM-32D',
        '24:6F:28:99:88:77',
        'v0.2.0-dev',
        '192.168.2.10',
        -55,
        true,
        now(),
        'wormwise/22222222-2222-2222-2222-222222222222/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/c3333333-3333-3333-3333-333333333333/esp32-wormwise-gh3-01'
    )
ON CONFLICT (id) DO NOTHING;

-- Sensor Configs
INSERT INTO public.sensor_configs (device_id, sensor_key, name, unit, min_optimal, max_optimal, min_critical, max_critical, sampling_interval_seconds)
VALUES
    ('esp32-wormwise-gh1-01', 'soil_moisture', 'Soil Bed Moisture', '%', 65, 80, 50, 90, 10),
    ('esp32-wormwise-gh1-01', 'soil_temp', 'Bed Temperature', '°C', 18, 25, 10, 32, 10),
    ('esp32-wormwise-gh1-01', 'air_temp', 'Greenhouse Air Temp', '°C', 18, 28, 12, 35, 10),
    ('esp32-wormwise-gh1-01', 'air_humidity', 'Greenhouse Air Humidity', '%', 60, 85, 45, 95, 10),
    ('esp32-wormwise-gh1-01', 'co2_level', 'CO₂ Concentration', 'ppm', 400, 1200, 300, 2500, 30)
ON CONFLICT (device_id, sensor_key) DO NOTHING;

-- Local ESP32 Safety Rules
INSERT INTO public.control_rules (device_id, rule_name, target_actuator, trigger_condition, action, max_run_seconds, is_local_safety, is_enabled)
VALUES
    ('esp32-wormwise-gh1-01', 'Anti-Drowning Cutoff', 'misting_pump', 'soil_moisture >= 85', 'force_stop', 60, true, true),
    ('esp32-wormwise-gh1-01', 'High Heat Canopy Relief', 'exhaust_fan', 'air_temp >= 28', 'turn_on', 3600, true, true),
    ('esp32-wormwise-gh1-01', 'Worm Bed Moisture Maintenance', 'misting_pump', 'soil_moisture <= 60', 'pulse_misting_30s', 30, false, true)
ON CONFLICT DO NOTHING;
