// import next from 'next';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { get } from '@vercel/edge-config';

// Org-to-Domain mapping for better clarity and scalability
const orgDomains: Record<string, string[]> = {
  'rebel-sbk': ['www.rbelsbk.com', 'rbelsbk.com','www.iamrebel.co.uk','iamrebel.co.uk','www.rebel.localhost'],
  'other-org': ['otherdomain.com', 'app.otherdomain.com'],
  'demo': ['localhost', '127.0.0.1','dance.likenobodyswatching.co.uk'],
  'power-of-woman': ['www.pow.localhost','powerofwomansbk.co.uk'],
  'latin-soul': ['latinsoul.danceengine.co.uk', 'www.latinsoul.localhost','192.168.50.226'],
  'cuban-y-dominican': ['cuban-y-dominican.danceengine.co.uk', 'www.cuban-y-dominican.localhost', 'cubanydominican.com', 'www.cubanydominican.com'],
};

const orgThemes: Record<string, string[]> = {
  'core': ['cuban-y-dominican.danceengine.co.uk', 'www.cuban-y-dominican.localhost', 'cubanydominican.com', 'www.cubanydominican.com'],
  'default': ['www.rbelsbk.com', 'rbelsbk.com','otherdomain.com', 'app.otherdomain.com','localhost', '127.0.0.1'],
  'coming-soon': ['powerofwomansbk.co.uk', 'pow.dance-engine.com','www.pow.localhost'],
  'latin-soul': ['latinsoul.danceengine.co.uk', 'www.latinsoul.localhost']
};

const domainToOrgMap = Object.entries(orgDomains).reduce<Record<string, string>>((acc, [org, domains]) => {
  domains.forEach(domain => { acc[domain] = org; });
  return acc;
}, {});

const domainToThemeMap = Object.entries(orgThemes).reduce<Record<string, string>>((acc, [org, domains]) => {
  domains.forEach(domain => { acc[domain] = org; });
  return acc;
}, {});

const orgRedirectFallback: Record<string, string> = {
  'cuban-y-dominican': '/3Aqx8q7NxBP7fQroKsKjhiNCnnc',
  'power-of-woman': '/3BAqYwmGde5YJzzPeHLJqVo37Fo',
};

type SoloEdgeConfig = {
  redirects?: Record<string, string>;
  domains?: Record<string, string[]>;
  themes?: Record<string, string[]>;
};

const toDomainLookupMap = (grouped: Record<string, string[]>): Record<string, string> => {
  return Object.entries(grouped).reduce<Record<string, string>>((acc, [key, domains]) => {
    domains.forEach((domain) => {
      acc[domain] = key;
    });
    return acc;
  }, {});
};

const getSoloEdgeConfig = async (): Promise<SoloEdgeConfig | null> => {
  try {
    const edgeConfig = await get<SoloEdgeConfig>('solo');
    // console.log('Fetched solo edge config:', edgeConfig);
    return edgeConfig;
  } catch (error) {
    console.error('Error fetching solo edge config:', error);
    return null;
  }
};


export async function middleware(request: NextRequest) {
  const nextHost = request.nextUrl.hostname;
  const headerHost = request.headers.get("Host")?.split(':')?.[0] || 'localhost';
  const hostname = nextHost === 'localhost' ? headerHost : nextHost;
  const soloEdgeConfig = await getSoloEdgeConfig();
  const edgeDomainToOrgMap = soloEdgeConfig?.domains ? toDomainLookupMap(soloEdgeConfig.domains) : null;
  const edgeDomainToThemeMap = soloEdgeConfig?.themes ? toDomainLookupMap(soloEdgeConfig.themes) : null;
  
  // Find org by domain; fallback to 'default-org'
  const org = edgeDomainToOrgMap?.[hostname] || domainToOrgMap[hostname] || 'default-org';
  const theme = edgeDomainToThemeMap?.[hostname] || domainToThemeMap[hostname] || 'default'

  // Redirect at the edge before route rendering to avoid first-paint flashes.
  if (request.nextUrl.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) {
    const edgeRedirectPath = soloEdgeConfig?.redirects?.[org];
    const redirectPath = (typeof edgeRedirectPath === 'string' && edgeRedirectPath.startsWith('/') ? edgeRedirectPath : null) || orgRedirectFallback[org] || null
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
