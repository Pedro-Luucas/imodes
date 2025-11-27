"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { usePageMetadata } from "@/hooks/usePageMetadata";
import { Link, useRouter } from "@/i18n/navigation";
import { useIsAuthenticated, useAuthLoading, useAuthProfile } from "@/stores/authStore";

export default function AuthLandingPage() {
  const t = useTranslations("authLanding");
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const profile = useAuthProfile();

  usePageMetadata(t("metaTitle"), t("metaDescription"));

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

  // Show loading while checking authentication
  if (authLoading) {
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

        <div className="flex w-full flex-col gap-6 rounded-2xl border border-stroke bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col gap-2 text-center">
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

