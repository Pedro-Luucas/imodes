"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageMetadata } from "@/hooks/usePageMetadata";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useIsAuthenticated, useAuthLoading, useAuthProfile } from "@/stores/authStore";

export default function AuthLandingPage() {
  const t = useTranslations("authLanding");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const profile = useAuthProfile();
  const [checkingRecovery, setCheckingRecovery] = useState(true);

  usePageMetadata(t("metaTitle"), t("metaDescription"));

  const handleLanguageChange = (newLocale: string) => {
    // Navigate to the same path but with the new locale
    router.replace(pathname, { locale: newLocale });
  };

  // Check for password recovery tokens in URL hash and redirect to reset-password
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get("type");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        // If this is a recovery (password reset) link, redirect to reset-password page
        if (type === "recovery" && accessToken && refreshToken) {
          // Get the current locale from pathname (e.g., /en/auth -> en)
          const pathParts = window.location.pathname.split('/');
          const locale = pathParts[1] || 'en';
          
          // Build the new URL with hash containing the tokens
          const resetHash = `#access_token=${accessToken}&refresh_token=${refreshToken}`;
          // Use window.location to ensure hash is preserved correctly
          window.location.href = `/${locale}/auth/reset-password${resetHash}`;
          return;
        }
      }
      setCheckingRecovery(false);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && profile) {
      // Redirect based on user role
      if (profile.role === 'therapist') {
        router.push("/dashboard");
      } else if (profile.role === 'patient') {
        router.push("/dashboard-patient");
      } else {
        // Admin or unknown role - go to dashboard
        router.push("/dashboard");
      }
    }
  }, [authLoading, isAuthenticated, profile, router]);

  // Show loading while checking authentication or recovery tokens
  if (authLoading || checkingRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-page px-4 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8 sm:gap-10">
        <div className="relative h-11 w-[186px] sm:h-[62px] sm:w-[266px]">
          <Image
            src="/imodes.png"
            alt="iModes"
            fill
            className="object-contain mix-blend-darken"
            priority
          />
        </div>

        <div className="flex w-full flex-col gap-6 rounded-2xl border border-stroke bg-white p-6 pt-0 shadow-sm sm:p-6 sm:pb-21 sm:pt-6">
        <div className="flex justify-end">
            <Select value={locale} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-auto gap-2" size="sm">
                <Globe className="size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 text-center pt-0 sm:pt-0">
            <h1 className="text-lg font-bold leading-7 text-foreground sm:text-xl">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              asChild
              variant="outline"
              className="h-11 w-full text-sm font-medium sm:text-base"
            >
              <Link href="/auth/register/therapist">{t("newUserButton")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 w-full text-sm font-medium sm:text-base"
            >
              <Link href="/auth/login">{t("returningUserButton")}</Link>
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>{t("footer")}</p>
        </div>
      </div>
    </div>
  );
}

