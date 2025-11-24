import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { createClient } from '@supabase/supabase-js';

// Create the i18n middleware
const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // First, handle internationalization
  const response = intlMiddleware(request);
  
  // Get the pathname
  const { pathname } = request.nextUrl;
  
  // Extract locale from pathname (e.g., /en/dashboard -> en)
  const pathnameLocale = pathname.split('/')[1];
  const locale = routing.locales.includes(pathnameLocale as typeof routing.locales[number]) ? pathnameLocale : routing.defaultLocale;
  
  // Define public routes that don't require authentication
  const publicPaths = ['/auth', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
  const isPublicPath = publicPaths.some(path => 
    pathname === `/${locale}${path}` || pathname.startsWith(`/${locale}${path}/`)
  );
  
  // Check authentication for all routes except public ones
  if (!isPublicPath) {
    // Check for auth token in cookies
    const accessToken = request.cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      // No auth token found, redirect to auth landing page
      const authUrl = new URL(`/${locale}/auth`, request.url);
      // Add redirect parameter to return user to original destination after login
      authUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(authUrl);
    }
    
    // Validate the token by checking with Supabase
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        
        // If token is invalid or user not found, redirect to auth landing page
        if (error || !user) {
          const authUrl = new URL(`/${locale}/auth`, request.url);
          authUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(authUrl);
        }

        // Get user profile for role-based routing
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single();

        if (profile) {
          // Check if patient is trying to access therapist dashboard
          const isDashboardRoute = pathname === `/${locale}/dashboard` || pathname.startsWith(`/${locale}/dashboard/`);
          const isDashboardPatientRoute = pathname === `/${locale}/dashboard-patient` || pathname.startsWith(`/${locale}/dashboard-patient/`);

          if (profile.role === 'patient' && isDashboardRoute && !isDashboardPatientRoute) {
            const dashboardUrl = new URL(`/${locale}/dashboard-patient`, request.url);
            return NextResponse.redirect(dashboardUrl);
          }

          // Check if patient with therapist is trying to access no-therapist page
          if (profile.role === 'patient' && pathname.includes('/dashboard-patient/no-therapist')) {
            const { data: patientData } = await supabase
              .from('patients')
              .select('therapist_id')
              .eq('id', user.id)
              .single();

            if (patientData?.therapist_id) {
              // Patient has a therapist, redirect to dashboard
              const dashboardUrl = new URL(`/${locale}/dashboard-patient`, request.url);
              return NextResponse.redirect(dashboardUrl);
            }
          }
        }
      }
    } catch (error) {
      // If validation fails, redirect to auth landing page
      console.error('Token validation error:', error);
      const authUrl = new URL(`/${locale}/auth`, request.url);
      authUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(authUrl);
    }
  }
  
  // Return the i18n response if no redirect needed
  return response;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};