import { NextRequest, NextResponse } from 'next/server';
import { queryLatestTelemetry } from '@/lib/influxdb/client';

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') || '11111111-1111-1111-1111-111111111111';
  const deviceId = request.nextUrl.searchParams.get('deviceId') || 'esp32-wormwise-gh1-01';

  try {
    const latest = await queryLatestTelemetry({
      tenantId,
      deviceId,
    });

    return NextResponse.json(
      {
        success: true,
        data: latest,
        source: latest.source,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching latest telemetry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
