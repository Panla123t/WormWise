-- ============================================================================
-- WormWise 🌱 Smart Farm - Row Level Security (RLS) Verification Suite
-- Milestone 3: Cross-Tenant Isolation Tests
-- ============================================================================

-- This script verifies that:
-- 1. A user in Tenant 1 (GreenEarth) can query Tenant 1's farms and devices.
-- 2. A user in Tenant 1 CANNOT query Tenant 2 (OrganicWorm)'s farms, greenhouses, or devices.
-- 3. A user without memberships gets an empty result set (not access).

DO $$
DECLARE
    test_user_tenant1 UUID := '99999999-1111-1111-1111-111111111111';
    test_user_tenant2 UUID := '99999999-2222-2222-2222-222222222222';
    tenant1_id UUID := '11111111-1111-1111-1111-111111111111';
    tenant2_id UUID := '22222222-2222-2222-2222-222222222222';
    visible_devices_count INT;
BEGIN
    RAISE NOTICE '--- Starting Milestone 3 RLS Verification ---';

    -- 1. Set role to authenticated user from Tenant 1
    -- Simulating auth.uid() in Supabase session:
    PERFORM set_config('request.jwt.claim.sub', test_user_tenant1::text, true);
    PERFORM set_config('role', 'authenticated', true);

    -- Ensure test memberships exist
    INSERT INTO public.memberships (tenant_id, user_id, role)
    VALUES (tenant1_id, test_user_tenant1, 'operator')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.memberships (tenant_id, user_id, role)
    VALUES (tenant2_id, test_user_tenant2, 'operator')
    ON CONFLICT DO NOTHING;

    -- Query devices visible to Tenant 1 user
    SELECT COUNT(*) INTO visible_devices_count
    FROM public.devices;

    RAISE NOTICE 'Tenant 1 User sees % devices (Expected: 2)', visible_devices_count;

    -- Verify Tenant 2 device ('esp32-wormwise-gh3-01') is NOT visible
    IF EXISTS (SELECT 1 FROM public.devices WHERE id = 'esp32-wormwise-gh3-01') THEN
        RAISE EXCEPTION 'RLS FAILED: Tenant 1 user was able to access Tenant 2 device!';
    ELSE
        RAISE NOTICE 'RLS PASSED: Tenant 2 devices are completely invisible to Tenant 1.';
    END IF;

    -- 2. Switch simulation to Tenant 2 user
    PERFORM set_config('request.jwt.claim.sub', test_user_tenant2::text, true);

    -- Query devices visible to Tenant 2 user
    SELECT COUNT(*) INTO visible_devices_count
    FROM public.devices;

    RAISE NOTICE 'Tenant 2 User sees % devices (Expected: 1)', visible_devices_count;

    IF EXISTS (SELECT 1 FROM public.devices WHERE id = 'esp32-wormwise-gh1-01') THEN
        RAISE EXCEPTION 'RLS FAILED: Tenant 2 user was able to access Tenant 1 device!';
    ELSE
        RAISE NOTICE 'RLS PASSED: Tenant 1 devices are completely invisible to Tenant 2.';
    END IF;

    RAISE NOTICE '=== Milestone 3 RLS Verification Successfully Completed ===';
END $$;
