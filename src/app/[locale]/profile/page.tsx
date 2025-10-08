'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header with Logout */}
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            ← {t('backHome') || 'Back to Home'}
          </Link>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            {t('logout') || 'Logout'}
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 dark:text-blue-400">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              {/* Name/Email */}
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {(() => {
                    const name = user.user_metadata?.name;
                    return typeof name === 'string' && name ? name : (t('user') || 'User');
                  })()}
                </h1>
                <p className="text-blue-100">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="px-8 py-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('accountInfo') || 'Account Information'}
              </h2>
              
              <div className="space-y-3">
                {/* User ID */}
                <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                    {t('userId') || 'User ID'}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                    {user.id}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                    {t('email') || 'Email'}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {user.email}
                  </span>
                </div>

                {(() => {
                  const phone = user.user_metadata?.phone;
                  if (phone && typeof phone === 'string') {
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                          {t('phone') || 'Phone'}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {phone}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {(() => {
                  const name = user.user_metadata?.name;
                  if (name && typeof name === 'string') {
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                          {t('name') || 'Name'}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {name}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Email Confirmed */}
                <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                    {t('emailStatus') || 'Email Status'}
                  </span>
                  <span className="text-sm">
                    {user.email_confirmed_at ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {t('verified') || 'Verified'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {t('pending') || 'Pending Verification'}
                      </span>
                    )}
                  </span>
                </div>

                {/* Account Created */}
                <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                    {t('accountCreated') || 'Account Created'}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* Last Updated */}
                {user.updated_at && (
                  <div className="flex flex-col sm:flex-row sm:items-center pb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                      {t('lastUpdated') || 'Last Updated'}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(user.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Metadata */}
            {user.user_metadata && Object.keys(user.user_metadata).length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('additionalInfo') || 'Additional Information'}
                </h2>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(user.user_metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
