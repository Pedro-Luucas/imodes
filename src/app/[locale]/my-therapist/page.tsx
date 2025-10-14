'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { getPatientTherapist } from '@/lib/authClient';
import type { Profile } from '@/types/auth';

export default function MyTherapistPage() {
  const { logout } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [therapist, setTherapist] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.role === 'patient') {
      fetchTherapist();
    } else if (!profileLoading && profile && profile.role !== 'patient') {
      setError('Access denied: Only patients can view this page');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profileLoading]);

  const fetchTherapist = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getPatientTherapist(profile.id);
      setTherapist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load therapist');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  if (profile.role !== 'patient') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md">
          <div className="text-red-600 dark:text-red-400 text-center">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400">Only patients can access this page.</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                ← Dashboard
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                My Therapist
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {profile.full_name}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Therapist Card or No Therapist Message */}
          {!therapist ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
              <svg className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Therapist Assigned
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You don&apos;t have a therapist assigned yet. Please contact support or wait for a therapist to be assigned to you.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  What to do next?
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-left">
                  <li>• Contact your administrator for therapist assignment</li>
                  <li>• Check back later for updates</li>
                  <li>• Explore other features in your dashboard</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8">
                <div className="flex flex-col items-center text-center">
                  {/* Therapist Avatar */}
                  <div className="w-24 h-24 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                    {therapist.first_name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {therapist.full_name}
                  </h2>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                    Your Therapist
                  </span>
                </div>
              </div>

              {/* Info Section */}
              <div className="px-8 py-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Contact Information
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Email */}
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                        <a
                          href={`mailto:${therapist.email}`}
                          className="text-base text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {therapist.email}
                        </a>
                      </div>
                    </div>

                    {/* Phone */}
                    {therapist.phone && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                          <a
                            href={`tel:${therapist.phone}`}
                            className="text-base text-green-600 dark:text-green-400 hover:underline"
                          >
                            {therapist.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Member Since */}
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</p>
                        <p className="text-base text-gray-900 dark:text-gray-100">
                          {new Date(therapist.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                      href={`mailto:${therapist.email}`}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Email
                    </a>
                    {therapist.phone && (
                      <a
                        href={`tel:${therapist.phone}`}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call Now
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

