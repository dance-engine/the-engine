// import next from 'next';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSoloEdgeConfig, toDomainLookupMap, normalizePath } from '@dance-engine/utils/solo-edge-config';




export async function middleware(request: NextRequest) {
  const nextHost = request.nextUrl.hostname;
  const headerHost = request.headers.get("Host")?.split(':')?.[0] || 'localhost';
  const hostname = nextHost === 'localhost' ? headerHost : nextHost;
  const soloEdgeConfig = await getSoloEdgeConfig();
  const edgeDomainToOrgMap = soloEdgeConfig?.domains ? toDomainLookupMap(soloEdgeConfig.domains) : null;
  const edgeOrgToThemeMap = soloEdgeConfig?.themes ? toDomainLookupMap(soloEdgeConfig.themes) : null;

  const org = edgeDomainToOrgMap?.[hostname] || 'default-org';
  const theme = edgeOrgToThemeMap?.[org] || 'default';

  // Redirect at the edge before route rendering to avoid first-paint flashes.
  if (request.method === 'GET' || request.method === 'HEAD') {
    const normalizedPath = normalizePath(request.nextUrl.pathname);
    const orgRedirects = soloEdgeConfig?.redirects?.[org];
    
    if (orgRedirects && typeof orgRedirects === 'object') {
      const redirectPath = orgRedirects[normalizedPath] || null;
      if (typeof redirectPath === 'string' && redirectPath.startsWith('/')) {
        const target = new URL(redirectPath, request.url);
        target.search = request.nextUrl.search;
        return NextResponse.redirect(target);
      }
    }
  }

  const headers = new Headers(request.headers);
  headers.set('x-site-org', org);
  headers.set('x-site-theme', theme);
  headers.set('x-site-domain', hostname);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/:path*'],
};
