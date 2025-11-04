'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuthProfile, useAuthLoading, useAuthActions } from '@/stores/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { uploadAvatar, deleteAvatar } from '@/lib/authClient';
import { useTranslations } from 'next-intl';

export default function ProfilePage() {
  usePageMetadata('Profile', 'View and manage your profile information.');
  const t = useTranslations('profile');
  useRequireAuth();
  
  const profile = useAuthProfile();
  const loading = useAuthLoading();
  const { logout: logoutAction, refetch } = useAuthActions();
  const router = useRouter();
  
  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const response = await uploadAvatar(file);
      setAvatarUrl(response.signed_url);
      await refetch(); // Refresh profile data
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('Are you sure you want to delete your avatar?')) {
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      await deleteAvatar();
      setAvatarUrl(null);
      await refetch(); // Refresh profile data
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to delete avatar');
    } finally {
      setUploading(false);
    }
  };

  // Fetch signed URL when profile changes
  useEffect(() => {
    const fetchAvatarUrl = async () => {
      if (profile?.avatar_url && !avatarUrl) {
        try {
          const response = await fetch('/api/profile/avatar/url');
          if (response.ok) {
            const data = await response.json();
            if (data.signed_url) {
              setAvatarUrl(data.signed_url);
            }
          }
        } catch (error) {
          console.error('Error fetching avatar URL:', error);
        }
      }
    };

    fetchAvatarUrl();
  }, [profile?.avatar_url, avatarUrl]);

  const displayAvatarUrl = avatarUrl;

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

  if (!profile) return null;

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
            onClick={handleLogout}
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
              <div className="relative group">
                <div 
                  onClick={handleAvatarClick}
                  className="w-20 h-20 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 dark:text-blue-400 cursor-pointer overflow-hidden transition-opacity hover:opacity-80"
                >
                  {displayAvatarUrl ? (
                    <Image 
                      src={displayAvatarUrl} 
                      alt="Profile avatar" 
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span>{profile.first_name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase()}</span>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 cursor-pointer hover:bg-blue-600 transition-colors" onClick={handleAvatarClick}>
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {/* Name/Email */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">
                  {profile.full_name || profile.first_name || (t('user') || 'User')}
                </h1>
                <p className="text-blue-100">{profile.email}</p>
                {displayAvatarUrl && !uploading && (
                  <button
                    onClick={handleDeleteAvatar}
                    className="mt-2 text-xs text-blue-100 hover:text-white underline"
                  >
                    Remove avatar
                  </button>
                )}
              </div>
            </div>
            {uploadError && (
              <div className="mt-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg">
                <p className="text-sm text-white">{uploadError}</p>
              </div>
            )}
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
                    {profile.id}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                    {t('email') || 'Email'}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {profile.email}
                  </span>
                </div>

                {/* Full Name */}
                {profile.full_name && (
                  <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                      {t('fullName') || 'Full Name'}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {profile.full_name}
                    </span>
                  </div>
                )}

                {/* First Name */}
                {profile.first_name && (
                  <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                      {t('firstName') || 'First Name'}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {profile.first_name}
                    </span>
                  </div>
                )}

                {/* Phone */}
                {profile.phone && (
                  <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                      {t('phone') || 'Phone'}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {profile.phone}
                    </span>
                  </div>
                )}

                {/* Role */}
                <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                    {t('role') || 'Role'}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                    {profile.role}
                  </span>
                </div>

                {/* Account Status */}
                <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                    {t('accountStatus') || 'Account Status'}
                  </span>
                  <span className="text-sm">
                    {profile.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {t('active') || 'Active'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {t('inactive') || 'Inactive'}
                      </span>
                    )}
                  </span>
                </div>

                {/* Subscription Status */}
                <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-700 pb-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                    {t('subscription') || 'Subscription'}
                  </span>
                  <span className="text-sm">
                    {profile.subscription_active ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {t('active') || 'Active'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {t('inactive') || 'Inactive'}
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
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* Last Updated */}
                {profile.updated_at && (
                  <div className="flex flex-col sm:flex-row sm:items-center pb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/3">
                      {t('lastUpdated') || 'Last Updated'}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(profile.updated_at).toLocaleDateString('en-US', {
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

            {/* Additional Settings */}
            {profile.settings && Object.keys(profile.settings).length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('settings') || 'Settings'}
                </h2>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(profile.settings, null, 2)}
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

