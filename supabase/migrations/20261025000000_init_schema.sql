-- ============================================================================
-- WormWise 🌱 Smart Farm - Database Schema Migration
-- Milestone 3: Data Model & Multi-Tenant Relational Schema
-- ============================================================================

-- 1. Tenants (Organizations / Farm Owners)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. User Profiles (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Memberships (Tenant Access & Role Mapping)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(tenant_id, user_id)
);

-- 4. Farms
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Greenhouses (Vermicomposting Units)
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

-- 6. Devices (ESP32 Microcontrollers / Gateways)
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

-- 7. Sensor Configurations (Optimal/Critical Thresholds & Calibration)
CREATE TABLE IF NOT EXISTS public.sensor_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    sensor_key TEXT NOT NULL, -- e.g. 'soil_moisture', 'soil_temp', 'air_temp', 'air_humidity', 'co2_level'
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

-- 8. Control Rules (Local ESP32 Safety & Automated Actuation)
CREATE TABLE IF NOT EXISTS public.control_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    target_actuator TEXT NOT NULL, -- 'misting_pump', 'exhaust_fan', 'drainage_pump', 'intake_fan'
    trigger_condition TEXT NOT NULL, -- JSON or expression string
    action TEXT NOT NULL,
    max_run_seconds INTEGER NOT NULL DEFAULT 60 CHECK (max_run_seconds > 0),
    is_local_safety BOOLEAN NOT NULL DEFAULT false, -- If true, compiled to ESP32 firmware loop
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Device Commands (Command queue & audit trail for actuators)
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

-- 10. Audit Logs
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

-- Indices for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_memberships_user_tenant ON public.memberships(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_farms_tenant ON public.farms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_greenhouses_farm ON public.greenhouses(farm_id);
CREATE INDEX IF NOT EXISTS idx_devices_greenhouse ON public.devices(greenhouse_id);
CREATE INDEX IF NOT EXISTS idx_sensor_configs_device ON public.sensor_configs(device_id);
CREATE INDEX IF NOT EXISTS idx_control_rules_device ON public.control_rules(device_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_device_status ON public.device_commands(device_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_time ON public.audit_logs(tenant_id, created_at DESC);
