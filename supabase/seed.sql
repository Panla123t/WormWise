-- ============================================================================
-- WormWise 🌱 Smart Farm - Seed Data
-- Milestone 3: Development & Multi-Tenant Seed Environment
-- ============================================================================

-- 1. Insert Test Tenants
INSERT INTO public.tenants (id, name, slug)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'GreenEarth Vermiculture', 'green-earth'),
    ('22222222-2222-2222-2222-222222222222', 'OrganicWorm Commercial Farms', 'organic-worm')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Farms
INSERT INTO public.farms (id, tenant_id, name, location, timezone)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'GreenEarth North Facility', 'Washington, USA', 'America/Los_Angeles'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'OrganicWorm Valley Facility', 'Oregon, USA', 'America/Los_Angeles')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Greenhouses
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

-- 4. Insert Devices (ESP32 Nodes)
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

-- 5. Sensor Configurations
INSERT INTO public.sensor_configs (device_id, sensor_key, name, unit, min_optimal, max_optimal, min_critical, max_critical, sampling_interval_seconds)
VALUES
    ('esp32-wormwise-gh1-01', 'soil_moisture', 'Soil Bed Moisture', '%', 65, 80, 50, 90, 10),
    ('esp32-wormwise-gh1-01', 'soil_temp', 'Bed Temperature', '°C', 18, 25, 10, 32, 10),
    ('esp32-wormwise-gh1-01', 'air_temp', 'Greenhouse Air Temp', '°C', 18, 28, 12, 35, 10),
    ('esp32-wormwise-gh1-01', 'air_humidity', 'Greenhouse Air Humidity', '%', 60, 85, 45, 95, 10),
    ('esp32-wormwise-gh1-01', 'co2_level', 'CO₂ Concentration', 'ppm', 400, 1200, 300, 2500, 30)
ON CONFLICT (device_id, sensor_key) DO NOTHING;

-- 6. Essential Local Safety Rules (ESP32 autonomous behavior)
INSERT INTO public.control_rules (device_id, rule_name, target_actuator, trigger_condition, action, max_run_seconds, is_local_safety, is_enabled)
VALUES
    ('esp32-wormwise-gh1-01', 'Anti-Drowning Cutoff', 'misting_pump', 'soil_moisture >= 85', 'force_stop', 60, true, true),
    ('esp32-wormwise-gh1-01', 'High Heat Canopy Relief', 'exhaust_fan', 'air_temp >= 28', 'turn_on', 3600, true, true),
    ('esp32-wormwise-gh1-01', 'Worm Bed Moisture Maintenance', 'misting_pump', 'soil_moisture <= 60', 'pulse_misting_30s', 30, false, true)
ON CONFLICT DO NOTHING;
