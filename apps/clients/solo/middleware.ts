import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Org-to-Domain mapping for better clarity and scalability
const orgDomains: Record<string, string[]> = {
  'rebel-sbk': ['www.rbelsbk.com', 'rbelsbk.com'],
  'other-org': ['otherdomain.com', 'app.otherdomain.com'],
  'demo': ['localhost', '127.0.0.1'],
};

const orgThemes: Record<string, string[]> = {
  'default': ['www.rbelsbk.com', 'rbelsbk.com','otherdomain.com', 'app.otherdomain.com','localhost', '127.0.0.1'],
};

const domainToOrgMap = Object.entries(orgDomains).reduce<Record<string, string>>((acc, [org, domains]) => {
  domains.forEach(domain => { acc[domain] = org; });
  return acc;
}, {});

const domainToThemeMap = Object.entries(orgThemes).reduce<Record<string, string>>((acc, [org, domains]) => {
  domains.forEach(domain => { acc[domain] = org; });
  return acc;
}, {});


export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  
  // Find org by domain; fallback to 'default-org'
  const org = domainToOrgMap[hostname] || 'default-org';
  const theme = domainToThemeMap[hostname] || 'default'

  const headers = new Headers(request.headers);
  headers.set('x-site-org', org);
  headers.set('x-site-theme', theme);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/:path*'],
};
