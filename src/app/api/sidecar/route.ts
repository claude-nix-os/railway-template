/**
 * Railway Sidecar API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleSidecarRoute } from '@/modules/railway-sidecar/sidecar-api';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const subpath = url.searchParams.get('action') ?? 'health';
  return handleSidecarRoute(request, subpath);
}

export async function OPTIONS(request: NextRequest) {
  const url = new URL(request.url);
  const subpath = url.searchParams.get('action') ?? 'health';
  return handleSidecarRoute(request, subpath);
}
