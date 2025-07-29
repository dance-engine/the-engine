// import next from 'next';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Org-to-Domain mapping for better clarity and scalability
const orgDomains: Record<string, string[]> = {
  'rebel-sbk': ['www.rbelsbk.com', 'rbelsbk.com','www.iamrebel.co.uk','iamrebel.co.uk','www.rebel.localhost'],
  'other-org': ['otherdomain.com', 'app.otherdomain.com'],
  'demo': ['localhost', '127.0.0.1','dance.likenobodyswatching.co.uk'],
  'pow': ['pow.dance-engine.com','www.pow.localhost'],
  'power-of-woman': ['powerofwomansbk.co.uk'],
};

const orgThemes: Record<string, string[]> = {
  'default': ['www.rbelsbk.com', 'rbelsbk.com','otherdomain.com', 'app.otherdomain.com','localhost', '127.0.0.1'],
  'coming-soon': ['powerofwomansbk.co.uk', 'pow.dance-engine.com','www.pow.localhost'],
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
  const nextHost = request.nextUrl.hostname;
  const headerHost = request.headers.get("Host")?.split(':')?.[0] || 'localhost';
  const hostname = nextHost === 'localhost' ? headerHost : nextHost;
  
  // Find org by domain; fallback to 'default-org'
  const org = domainToOrgMap[hostname] || 'default-org';
  const theme = domainToThemeMap[hostname] || 'default'

  const headers = new Headers(request.headers);
  headers.set('x-site-org', org);
  headers.set('x-site-theme', theme);
  headers.set('x-site-domain', hostname);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/:path*'],
};
