import { NextRequest, NextResponse } from 'next/server';
import { queryHistoricalTelemetry } from '@/lib/influxdb/client';

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') || '11111111-1111-1111-1111-111111111111';
  const deviceId = request.nextUrl.searchParams.get('deviceId') || 'esp32-wormwise-gh1-01';
  const range = request.nextUrl.searchParams.get('range') || '24h';

  let rangeDuration = '-24h';
  let aggregateWindow = '15m';

  if (range === '6h') {
    rangeDuration = '-6h';
    aggregateWindow = '5m';
  } else if (range === '12h') {
    rangeDuration = '-12h';
    aggregateWindow = '10m';
  } else if (range === '7d') {
    rangeDuration = '-7d';
    aggregateWindow = '1h';
  }

  try {
    const { data, source } = await queryHistoricalTelemetry({
      tenantId,
      deviceId,
      rangeDuration,
      aggregateWindow,
    });

    return NextResponse.json(
      {
        success: true,
        data,
        source,
        range,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching historical telemetry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
