'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import Link from 'next/link';

interface TherapistStats {
  total: number;
  active: number;
  inactive: number;
}

interface ActivityStats {
  active: number;
  inactive: number;
}

interface SubscriptionStats {
  active: number;
  inactive: number;
}

interface MonthlyStats {
  count: number;
  month: string;
  year: number;
}

export default function StatisticsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { profile, loading: profileLoading } = useProfile({ requireAuth: false });

  const [therapistStats, setTherapistStats] = useState<TherapistStats | null>(null);
  const [patientsActivity, setPatientsActivity] = useState<ActivityStats | null>(null);
  const [therapistsActivity, setTherapistsActivity] = useState<ActivityStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionStats | null>(null);
  const [monthlyTherapists, setMonthlyTherapists] = useState<MonthlyStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !profileLoading && profile) {
      // Check if user is therapist or admin
      if (profile.role !== 'therapist' && profile.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      fetchAllStatistics();
    }
  }, [authLoading, profileLoading, profile, router]);

  const fetchAllStatistics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all statistics endpoints in parallel
      const [
        therapistStatsRes,
        patientsActivityRes,
        therapistsActivityRes,
        subscriptionsRes,
        monthlyTherapistsRes,
      ] = await Promise.all([
        fetch('/api/statistics/therapists'),
        fetch('/api/statistics/patients/activity'),
        fetch('/api/statistics/therapists/activity'),
        fetch('/api/statistics/subscriptions'),
        fetch('/api/statistics/therapists/monthly'),
      ]);

      if (therapistStatsRes.ok) {
        setTherapistStats(await therapistStatsRes.json());
      }
      if (patientsActivityRes.ok) {
        setPatientsActivity(await patientsActivityRes.json());
      }
      if (therapistsActivityRes.ok) {
        setTherapistsActivity(await therapistsActivityRes.json());
      }
      if (subscriptionsRes.ok) {
        setSubscriptions(await subscriptionsRes.json());
      }
      if (monthlyTherapistsRes.ok) {
        setMonthlyTherapists(await monthlyTherapistsRes.json());
      }
    } catch (err) {
      setError('Failed to fetch statistics');
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Platform Statistics
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.email}
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
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              System Statistics Overview
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time statistics for the platform
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading statistics...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Therapist Statistics */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Therapist Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Therapists</div>
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {therapistStats?.total ?? '-'}
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="text-sm text-green-600 dark:text-green-400 mb-1">Active</div>
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {therapistStats?.active ?? '-'}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inactive</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {therapistStats?.inactive ?? '-'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Endpoint: GET /api/statistics/therapists
                </div>
              </div>

              {/* Patient Activity */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Patient Activity Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="text-sm text-green-600 dark:text-green-400 mb-1">Active Patients</div>
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {patientsActivity?.active ?? '-'}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inactive Patients</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {patientsActivity?.inactive ?? '-'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Endpoint: GET /api/statistics/patients/activity
                </div>
              </div>

              {/* Therapist Activity */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Therapist Activity Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="text-sm text-green-600 dark:text-green-400 mb-1">Active Therapists</div>
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {therapistsActivity?.active ?? '-'}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inactive Therapists</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {therapistsActivity?.inactive ?? '-'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Endpoint: GET /api/statistics/therapists/activity
                </div>
              </div>

              {/* Subscriptions */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Subscription Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Active Subscriptions</div>
                    <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                      {subscriptions?.active ?? '-'}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inactive Subscriptions</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {subscriptions?.inactive ?? '-'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Endpoint: GET /api/statistics/subscriptions
                </div>
              </div>

              {/* Monthly Therapists */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Monthly Registrations
                </h3>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6">
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                    Therapists Registered in {monthlyTherapists?.month}
                  </div>
                  <div className="text-4xl font-bold text-indigo-900 dark:text-indigo-100">
                    {monthlyTherapists?.count ?? '-'}
                  </div>
                  <div className="mt-2 text-sm text-indigo-700 dark:text-indigo-300">
                    Year: {monthlyTherapists?.year}
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Endpoint: GET /api/statistics/therapists/monthly
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

