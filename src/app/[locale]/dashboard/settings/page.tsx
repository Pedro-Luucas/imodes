'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import { useAuthProfile, useAuthActions } from '@/stores/authStore';
import { 
  updateProfile, 
  changePassword, 
  deleteAccount,
  uploadAvatar,
  deleteAvatar
} from '@/lib/authClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, User } from 'lucide-react';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const router = useRouter();
  const profile = useAuthProfile();
  const { refetch } = useAuthActions();
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(locale);
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setFirstName(profile.first_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Fetch avatar URL
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
        } finally {
          setIsLoadingAvatar(false);
        }
      } else if (profile) {
        // No avatar to load, mark as complete
        setIsLoadingAvatar(false);
      }
    };

    fetchAvatarUrl();
  }, [profile?.avatar_url, avatarUrl, profile]);

  // Handle language change
  const handleLanguageChange = (newLocale: string) => {
    setSelectedLanguage(newLocale);
    router.replace('/dashboard/settings', { locale: newLocale });
    toast.success(t('success.profileUpdated'));
  };

  // Handle avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    setIsLoadingAvatar(true);

    try {
      const response = await uploadAvatar(file);
      setAvatarUrl(response.signed_url);
      await refetch();
      toast.success('Profile picture updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      setIsLoadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    setIsUploadingAvatar(true);
    setIsLoadingAvatar(true);
    try {
      await deleteAvatar();
      setAvatarUrl(null);
      await refetch();
      toast.success('Profile picture removed successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete avatar');
    } finally {
      setIsUploadingAvatar(false);
      setIsLoadingAvatar(false);
    }
  };

  // Handle profile update
  const handleSaveChanges = async () => {
    if (!profile) return;

    // Check what changed
    const updates: { full_name?: string; first_name?: string; phone?: string } = {};
    
    if (fullName !== profile.full_name) updates.full_name = fullName;
    if (firstName !== profile.first_name) updates.first_name = firstName;
    
    // Only update phone for therapists
    if (profile.role === 'therapist' && phone !== profile.phone) {
      updates.phone = phone;
    }

    // If nothing changed, show message
    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);

    try {
      await updateProfile(updates);
      await refetch();
      toast.success(t('success.profileUpdated'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword) {
      toast.error(t('errors.currentPasswordRequired'));
      return;
    }

    if (!newPassword) {
      toast.error(t('errors.newPasswordRequired'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t('errors.newPasswordMinLength'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error(t('errors.passwordMismatch'));
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      toast.success(t('success.passwordChanged'));
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.passwordChangeFailed'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    const expectedText = locale === 'pt' ? 'EXCLUIR' : 'DELETE';
    
    if (deleteConfirmText !== expectedText) {
      toast.error(t('errors.confirmTextMismatch'));
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAccount();
      toast.success(t('success.accountDeleted'));
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.deleteFailed'));
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!profile) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-9 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-5 w-96 bg-muted animate-pulse rounded" />
        </div>

        <div className="space-y-8">
          {/* Account Information Skeleton */}
          <div className="bg-card rounded-lg border border-stroke p-6">
            <div className="mb-6">
              <div className="h-7 w-52 bg-muted animate-pulse rounded mb-1" />
              <div className="h-4 w-80 bg-muted animate-pulse rounded" />
            </div>

            <div className="space-y-6">
              {/* Avatar Skeleton */}
              <div>
                <div className="h-5 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
                  <div className="flex flex-col gap-2">
                    <div className="h-9 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-3 w-64 bg-muted animate-pulse rounded mt-2" />
              </div>

              {/* Full Name Skeleton */}
              <div>
                <div className="h-5 w-24 bg-muted animate-pulse rounded mb-1" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>

              {/* First Name Skeleton */}
              <div>
                <div className="h-5 w-24 bg-muted animate-pulse rounded mb-1" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>

              {/* Phone Skeleton */}
              <div>
                <div className="h-5 w-24 bg-muted animate-pulse rounded mb-1" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>

          {/* Preferences Skeleton */}
          <div className="bg-card rounded-lg border border-stroke p-6">
            <div className="mb-6">
              <div className="h-7 w-36 bg-muted animate-pulse rounded mb-1" />
              <div className="h-4 w-72 bg-muted animate-pulse rounded" />
            </div>

            <div>
              <div className="h-5 w-24 bg-muted animate-pulse rounded mb-1" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
              <div className="h-3 w-56 bg-muted animate-pulse rounded mt-2" />
            </div>
          </div>

          {/* Security Skeleton */}
          <div className="bg-card rounded-lg border border-stroke p-6">
            <div className="mb-6">
              <div className="h-7 w-28 bg-muted animate-pulse rounded mb-1" />
              <div className="h-4 w-80 bg-muted animate-pulse rounded" />
            </div>

            <div className="space-y-4">
              {/* Password Fields Skeleton */}
              <div>
                <div className="h-5 w-36 bg-muted animate-pulse rounded mb-1" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
              <div>
                <div className="h-5 w-32 bg-muted animate-pulse rounded mb-1" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
              <div>
                <div className="h-5 w-44 bg-muted animate-pulse rounded mb-1" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>

              {/* Change Password Button Skeleton */}
              <div className="h-10 w-40 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Danger Zone Skeleton */}
          <div className="bg-destructive/10 rounded-lg border border-destructive/20 p-6">
            <div className="mb-6">
              <div className="h-7 w-36 bg-muted animate-pulse rounded mb-1" />
              <div className="h-4 w-80 bg-muted animate-pulse rounded" />
            </div>

            <div>
              <div className="h-6 w-40 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 w-full bg-muted animate-pulse rounded mb-4" />
              <div className="h-10 w-40 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Save Changes Button Skeleton */}
          <div className="flex justify-end pt-4">
            <div className="h-11 w-36 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  const displayAvatarUrl = avatarUrl;
  const expectedDeleteText = locale === 'pt' ? 'EXCLUIR' : 'DELETE';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      <div className="space-y-8 ">
        {/* Account Information Section */}
        {isLoadingAvatar ? (
          <div className="bg-card rounded-lg border border-stroke p-6">
            <div className="mb-6">
              <div className="h-7 w-52 bg-muted animate-pulse rounded mb-1" />
              <div className="h-4 w-80 bg-muted animate-pulse rounded" />
            </div>

            <div className="space-y-6">
              {/* Avatar Skeleton */}
              <div>
                <div className="h-5 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
                  <div className="flex flex-col gap-2">
                    <div className="h-9 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-3 w-64 bg-muted animate-pulse rounded mt-2" />
              </div>

              {/* Full Name Skeleton */}
              <div>
                <div className="h-5 w-24 bg-muted animate-pulse rounded mb-1" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>

              {/* First Name Skeleton */}
              <div>
                <div className="h-5 w-24 bg-muted animate-pulse rounded mb-1" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>

              {/* Phone Skeleton */}
              <div>
                <div className="h-5 w-24 bg-muted animate-pulse rounded mb-1" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-stroke p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">{t('accountInfo')}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('accountInfoDesc')}</p>
            </div>

            <div className="space-y-6">
              {/* Avatar Upload */}
              <div>
                <Label>{t('avatar')}</Label>
                <div className="flex items-center gap-4 mt-2">
                  <div 
                    className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                    onClick={handleAvatarClick}
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
                      <User className="h-10 w-10 text-muted-foreground" />
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarClick}
                      disabled={isUploadingAvatar}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t('uploadAvatar')}
                    </Button>
                    {displayAvatarUrl && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteAvatar}
                        disabled={isUploadingAvatar}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('removeAvatar')}
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('avatarDesc')}</p>
              </div>

              {/* Full Name */}
              <div>
                <Label htmlFor="fullName">{t('fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                  className="mt-1"
                />
              </div>

              {/* First Name */}
              <div>
                <Label htmlFor="firstName">{t('firstName')}</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('firstNamePlaceholder')}
                  className="mt-1"
                />
              </div>

              {/* Phone - Only for therapists */}
              {profile.role === 'therapist' && (
                <div>
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('phonePlaceholder')}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preferences Section */}
        <div className="bg-card rounded-lg border border-stroke p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">{t('preferences')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('preferencesDesc')}</p>
          </div>

          <div>
            <Label htmlFor="language">{t('language')}</Label>
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language" className="mt-1 ">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-stroke">
                <SelectItem value="en">{t('languageEn')}</SelectItem>
                <SelectItem value="pt">{t('languagePt')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">{t('languageDesc')}</p>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-card rounded-lg border border-stroke p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">{t('security')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('securityDesc')}</p>
          </div>

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('currentPasswordPlaceholder')}
                className="mt-1"
              />
            </div>

            {/* New Password */}
            <div>
              <Label htmlFor="newPassword">{t('newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('newPasswordPlaceholder')}
                className="mt-1"
              />
            </div>

            {/* Confirm New Password */}
            <div>
              <Label htmlFor="confirmNewPassword">{t('confirmNewPassword')}</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder={t('confirmNewPasswordPlaceholder')}
                className="mt-1"
              />
            </div>

            <Button
              type="button"
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
            >
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('changePassword')}
            </Button>
          </div>
        </div>

        {/* Danger Zone Section */}
        <div className="bg-destructive/10 rounded-lg border border-destructive/20 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-destructive">{t('dangerZone')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('dangerZoneDesc')}</p>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">{t('deleteAccount')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('deleteAccountDesc')}</p>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deleteAccountButton')}
            </Button>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex justify-end pt-4">
          <Button
            size="lg"
            onClick={handleSaveChanges}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirmDelete" className="text-sm font-medium">
              {t('confirmDeletePlaceholder')}
            </Label>
            <Input
              id="confirmDelete"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={expectedDeleteText}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmText('');
              setShowDeleteDialog(false);
            }}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmText !== expectedDeleteText}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('confirmDeleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
