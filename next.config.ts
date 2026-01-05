import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

type RemotePattern =
  NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number];

const remotePatterns: RemotePattern[] = [];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    const protocol = parsed.protocol.replace(':', '');

    if (protocol === 'http' || protocol === 'https') {
      remotePatterns.push({
        protocol,
        hostname: parsed.hostname,
        pathname: '/storage/v1/**',
      });
    }
  } catch {
    // Ignore invalid URL - Next.js build will warn if image request fails
  }
}

// Add specific storage domain if not already included
if (!remotePatterns.some(p => p.hostname === 'pqqgajlpmdfwhbxahlfg.supabase.co')) {
  remotePatterns.push({
    protocol: 'https',
    hostname: 'pqqgajlpmdfwhbxahlfg.supabase.co',
    pathname: '/storage/v1/**',
  });
}

const nextConfig: NextConfig = {
  devIndicators: false,
  images: remotePatterns.length
    ? {
      remotePatterns,
    }
    : undefined,
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);