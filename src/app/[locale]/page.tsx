'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuthProfile, useAuthLoading, useAuthActions } from '@/stores/authStore';

export default function Home() {
  const t = useTranslations('home');
  const profile = useAuthProfile();
  const loading = useAuthLoading();
  const { logout: logoutAction } = useAuthActions();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t('title') || 'Welcome to Authentication Demo'}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t('subtitle') || 'Secure authentication with Supabase & Next.js'}
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {t('checking') || 'Checking authentication...'}
              </p>
            </div>
          ) : profile ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('welcomeBack') || 'Welcome back!'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                {t('loggedInAs') || 'You are logged in as'}
              </p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-6">
                {profile.email}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('notLoggedIn') || 'Not logged in'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t('getStarted') || 'Please sign in or create an account to continue'}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!profile ? (
            <>
              {/* Register Button */}
              <Link
                href="/register"
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 p-6 text-center border-2 border-transparent hover:border-blue-500"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('register') || 'Register'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('registerDesc') || 'Create a new account'}
                </p>
              </Link>

              {/* Login Button */}
              <Link
                href="/login"
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 p-6 text-center border-2 border-transparent hover:border-green-500"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('login') || 'Login'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('loginDesc') || 'Sign in to your account'}
                </p>
              </Link>

              {/* Dashboard (Locked) */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-xl shadow-lg p-6 text-center opacity-50 cursor-not-allowed">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full mb-4">
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile') || 'Profile'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('loginRequired') || 'Login required'}
                </p>
        </div>
            </>
          ) : (
            <>
              {/* Profile Button */}
              <Link
                href="/profile"
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 p-6 text-center border-2 border-transparent hover:border-purple-500"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('viewProfile') || 'View Profile'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('profileDesc') || 'See your account details'}
                </p>
              </Link>

              {/* Dashboard Button */}
              <Link
                href="/dashboard"
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 p-6 text-center border-2 border-transparent hover:border-indigo-500"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('dashboard') || 'Dashboard'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('dashboardDesc') || 'Go to your dashboard'}
                </p>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 p-6 text-center border-2 border-transparent hover:border-red-500"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {t('logout') || 'Logout'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('logoutDesc') || 'Sign out of your account'}
                </p>
              </button>
            </>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            {t('features') || 'Features'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full mb-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {t('secureAuth') || 'Secure Authentication'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('secureAuthDesc') || 'HttpOnly cookies & backend validation'}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full mb-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {t('userManagement') || 'User Management'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('userManagementDesc') || 'Complete profile & session handling'}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full mb-3">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {t('modernUI') || 'Modern UI'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('modernUIDesc') || 'Beautiful design with dark mode'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
