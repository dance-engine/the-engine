// import next from 'next';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSoloEdgeConfig, toDomainLookupMap } from '@dance-engine/utils/solo-edge-config';




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
  if (request.nextUrl.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) {
    const edgeRedirectPath = soloEdgeConfig?.redirects?.[org];
    const redirectPath = typeof edgeRedirectPath === 'string' && edgeRedirectPath.startsWith('/') ? edgeRedirectPath : null;
    if (redirectPath) {
      const target = new URL(redirectPath, request.url)
      target.search = request.nextUrl.search
      return NextResponse.redirect(target)
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
