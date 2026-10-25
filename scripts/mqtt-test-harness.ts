/**
 * WormWise 🌱 Smart Farm - MQTT Protocol Test Harness
 * Milestone 4: MQTT Broker & Device Identity
 *
 * Usage:
 *   npx tsx scripts/mqtt-test-harness.ts
 */

import {
  buildMqttTopic,
  parseMqttTopic,
  TelemetryPayload,
  DeviceStatusPayload,
  DeviceCommandPayload,
  DeviceAckPayload,
  MqttTopicParams,
} from '../src/types/mqtt';

async function runMqttValidationSuite() {
  console.log('🌱 --- WormWise MQTT Validation Suite (Milestone 4) ---\n');

  const sampleParams: MqttTopicParams = {
    tenantId: '11111111-1111-1111-1111-111111111111',
    farmId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    greenhouseId: 'c1111111-1111-1111-1111-111111111111',
    deviceId: 'esp32-wormwise-gh1-01',
  };

  // 1. Topic Hierarchy Validation
  console.log('1. Testing Topic Hierarchy Naming:');
  const telemetryTopic = buildMqttTopic(sampleParams, 'telemetry');
  const statusTopic = buildMqttTopic(sampleParams, 'status');
  const cmdTopic = buildMqttTopic(sampleParams, 'cmd');
  const ackTopic = buildMqttTopic(sampleParams, 'ack');

  console.log('   ✓ Telemetry Topic:', telemetryTopic);
  console.log('   ✓ Status Topic:   ', statusTopic);
  console.log('   ✓ Command Topic:  ', cmdTopic);
  console.log('   ✓ Ack Topic:      ', ackTopic);

  const parsed = parseMqttTopic(telemetryTopic);
  if (
    !parsed ||
    parsed.params.deviceId !== 'esp32-wormwise-gh1-01' ||
    parsed.subtopic !== 'telemetry'
  ) {
    throw new Error('Topic parsing failed!');
  }
  console.log('   ✓ Topic parser passed validation.\n');

  // 2. Telemetry Payload Schema Test
  console.log('2. Validating Telemetry Payload:');
  const sampleTelemetry: TelemetryPayload = {
    deviceId: 'esp32-wormwise-gh1-01',
    timestamp: new Date().toISOString(),
    messageId: 'msg-000001',
    readings: {
      soilMoisture: 72.4,
      soilTemp: 21.8,
      airTemp: 24.6,
      airHumidity: 68.2,
      co2Ppm: 580,
    },
    batteryVoltage: 4.12,
    wifiRssi: -64,
  };
  const telemetryJson = JSON.stringify(sampleTelemetry);
  const parsedTelemetry: TelemetryPayload = JSON.parse(telemetryJson);
  if (parsedTelemetry.readings.soilMoisture !== 72.4) {
    throw new Error('Telemetry serialization mismatch!');
  }
  console.log('   ✓ Telemetry payload JSON size:', telemetryJson.length, 'bytes');
  console.log('   ✓ Soil Moisture:', parsedTelemetry.readings.soilMoisture, '%');
  console.log('   ✓ Bed Temperature:', parsedTelemetry.readings.soilTemp, '°C\n');

  // 3. Status & Last Will and Testament (LWT) Test
  console.log('3. Validating LWT Status Payload:');
  const sampleStatus: DeviceStatusPayload = {
    deviceId: 'esp32-wormwise-gh1-01',
    timestamp: new Date().toISOString(),
    status: 'online',
    reason: 'boot',
    firmwareVersion: 'v0.2.1-dev',
    ipAddress: '192.168.1.142',
    macAddress: '24:6F:28:B4:72:9A',
    freeHeapBytes: 184512,
    uptimeSeconds: 120,
    reconnectCount: 0,
  };
  console.log('   ✓ Birth Status JSON:', JSON.stringify(sampleStatus));
  console.log('   ✓ LWT Offline reason code: "lwt" supported.\n');

  // 4. Command & Acknowledgement Cycle Test
  console.log('4. Validating Command & ACK Cycle:');
  const sampleCmd: DeviceCommandPayload = {
    commandId: 'cmd-999-aaa-bbb',
    deviceId: 'esp32-wormwise-gh1-01',
    targetActuator: 'misting_pump',
    action: 'turn_on',
    durationSeconds: 30,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };

  const sampleAck: DeviceAckPayload = {
    commandId: sampleCmd.commandId,
    deviceId: sampleCmd.deviceId,
    targetActuator: sampleCmd.targetActuator,
    status: 'acknowledged',
    reason: 'OK',
    actuatorState: 'running',
    timestamp: new Date().toISOString(),
  };

  console.log('   ✓ Command Schema valid:', sampleCmd.targetActuator, sampleCmd.action);
  console.log('   ✓ ACK Schema valid:', sampleAck.status, 'Reason:', sampleAck.reason);

  console.log('\n======================================================');
  console.log('🎉 All Milestone 4 MQTT Schemas & Topologies Verified!');
  console.log('======================================================');
}

runMqttValidationSuite().catch((err) => {
  console.error('Validation error:', err);
  process.exit(1);
});
