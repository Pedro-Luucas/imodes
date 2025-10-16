'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthProfile, useAuthLoading, useAuthActions } from '@/stores/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Link } from '@/i18n/navigation';

interface ApiResponse {
  endpoint: string;
  method: string;
  status: number | null;
  data: unknown;
  error: string | null;
  timestamp: string;
}

export default function ApiTestPage() {
  useRequireAuth();
  
  const profile = useAuthProfile();
  const profileLoading = useAuthLoading();
  const { logout: logoutAction } = useAuthActions();
  const router = useRouter();
  
  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
  };

  const [responses, setResponses] = useState<Map<string, ApiResponse>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  // Input states for dynamic endpoints
  const [patientId, setPatientId] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [assignTherapistId, setAssignTherapistId] = useState('');

  const addResponse = (key: string, response: ApiResponse) => {
    setResponses(prev => new Map(prev).set(key, response));
  };

  const setLoadingState = (key: string, isLoading: boolean) => {
    setLoading(prev => {
      const newSet = new Set(prev);
      if (isLoading) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      return newSet;
    });
  };

  const callApi = async (
    key: string,
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ) => {
    setLoadingState(key, true);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(endpoint, options);
      const data = await res.json();

      addResponse(key, {
        endpoint,
        method,
        status: res.status,
        data,
        error: null,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      addResponse(key, {
        endpoint,
        method,
        status: null,
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoadingState(key, false);
    }
  };

  if (profileLoading) {
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

  const ResponseDisplay = ({ responseKey }: { responseKey: string }) => {
    const response = responses.get(responseKey);
    const isLoading = loading.has(responseKey);

    if (isLoading) {
      return (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        </div>
      );
    }

    if (!response) return null;

    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-xs font-mono px-2 py-1 rounded ${
              response.status && response.status >= 200 && response.status < 300
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            {response.status ?? 'ERROR'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(response.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <pre className="text-xs overflow-x-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {JSON.stringify(response.data || response.error, null, 2)}
        </pre>
      </div>
    );
  };

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
                API Testing Console
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {profile?.email}
              </span>
              <button
                onClick={handleLogout}
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
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              All API Endpoints
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Test all available API endpoints. Your current role: <span className="font-semibold">{profile?.role || 'Unknown'}</span>
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Endpoints */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">👤</span> Profile Endpoints
              </h3>
              <div className="space-y-3">
                <div>
                  <button
                    onClick={() => callApi('profile', '/api/profile')}
                    disabled={loading.has('profile')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    GET /api/profile
                  </button>
                  <ResponseDisplay responseKey="profile" />
                </div>
              </div>
            </div>

            {/* Statistics Endpoints */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">📊</span> Statistics Endpoints
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <button
                    onClick={() => callApi('stats-therapists', '/api/statistics/therapists')}
                    disabled={loading.has('stats-therapists')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    GET /api/statistics/therapists
                  </button>
                  <ResponseDisplay responseKey="stats-therapists" />
                </div>

                <div>
                  <button
                    onClick={() => callApi('stats-patients-activity', '/api/statistics/patients/activity')}
                    disabled={loading.has('stats-patients-activity')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    GET /api/statistics/patients/activity
                  </button>
                  <ResponseDisplay responseKey="stats-patients-activity" />
                </div>

                <div>
                  <button
                    onClick={() => callApi('stats-therapists-activity', '/api/statistics/therapists/activity')}
                    disabled={loading.has('stats-therapists-activity')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    GET /api/statistics/therapists/activity
                  </button>
                  <ResponseDisplay responseKey="stats-therapists-activity" />
                </div>

                <div>
                  <button
                    onClick={() => callApi('stats-subscriptions', '/api/statistics/subscriptions')}
                    disabled={loading.has('stats-subscriptions')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    GET /api/statistics/subscriptions
                  </button>
                  <ResponseDisplay responseKey="stats-subscriptions" />
                </div>

                <div className="md:col-span-2">
                  <button
                    onClick={() => callApi('stats-monthly', '/api/statistics/therapists/monthly')}
                    disabled={loading.has('stats-monthly')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    GET /api/statistics/therapists/monthly
                  </button>
                  <ResponseDisplay responseKey="stats-monthly" />
                </div>
              </div>
            </div>

            {/* Patient Endpoints */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🧑‍🦰</span> Patient Endpoints
              </h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Patient ID (UUID)"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <button
                      onClick={() => callApi('patient-profile', `/api/patients/${patientId}`)}
                      disabled={!patientId || loading.has('patient-profile')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      GET /api/patients/[patientId]
                    </button>
                    <ResponseDisplay responseKey="patient-profile" />
                  </div>

                  <div>
                    <button
                      onClick={() => callApi('patient-therapist', `/api/patients/${patientId}/therapist`)}
                      disabled={!patientId || loading.has('patient-therapist')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      GET /api/patients/[patientId]/therapist
                    </button>
                    <ResponseDisplay responseKey="patient-therapist" />
                  </div>

                  <div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Therapist ID to assign"
                        value={assignTherapistId}
                        onChange={(e) => setAssignTherapistId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <button
                        onClick={() =>
                          callApi(
                            'assign-therapist',
                            `/api/patients/${patientId}/therapist`,
                            'POST',
                            { therapistId: assignTherapistId }
                          )
                        }
                        disabled={!patientId || !assignTherapistId || loading.has('assign-therapist')}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                      >
                        POST Assign
                      </button>
                    </div>
                    <ResponseDisplay responseKey="assign-therapist" />
                  </div>

                  <div>
                    <button
                      onClick={() =>
                        callApi('unassign-therapist', `/api/patients/${patientId}/therapist`, 'DELETE')
                      }
                      disabled={!patientId || loading.has('unassign-therapist')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      DELETE /api/patients/[patientId]/therapist
                    </button>
                    <ResponseDisplay responseKey="unassign-therapist" />
                  </div>
                </div>
              </div>
            </div>

            {/* Therapist Endpoints */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">👨‍⚕️</span> Therapist Endpoints
              </h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Therapist ID (UUID)"
                    value={therapistId}
                    onChange={(e) => setTherapistId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <button
                      onClick={() => callApi('therapist-profile', `/api/therapists/${therapistId}`)}
                      disabled={!therapistId || loading.has('therapist-profile')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      GET /api/therapists/[therapistId]
                    </button>
                    <ResponseDisplay responseKey="therapist-profile" />
                  </div>

                  <div>
                    <button
                      onClick={() => callApi('therapist-patients', `/api/therapists/${therapistId}/patients`)}
                      disabled={!therapistId || loading.has('therapist-patients')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      GET /api/therapists/[therapistId]/patients
                    </button>
                    <ResponseDisplay responseKey="therapist-patients" />
                  </div>
                </div>
              </div>
            </div>

            {/* Auth Endpoints Info */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🔐</span> Authentication Endpoints
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• POST /api/auth/login - Login endpoint</p>
                <p>• POST /api/auth/logout - Logout endpoint</p>
                <p>• POST /api/auth/register - Registration endpoint</p>
                <p>• POST /api/auth/forgot-password - Password recovery</p>
                <p>• POST /api/auth/reset-password - Password reset</p>
                <p className="mt-3 text-xs italic">
                  Note: Auth endpoints require specific request bodies and handle cookies/sessions.
                  Test these through the login/register pages instead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

