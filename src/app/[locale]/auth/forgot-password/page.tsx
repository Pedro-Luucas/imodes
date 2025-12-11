"use client";

import { useState, FormEvent, ReactNode, useEffect } from "react";
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { forgotPassword } from "@/lib/authClient";
import { useIsAuthenticated, useAuthLoading, useAuthProfile } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  usePageMetadata('Forgot Password', 'Reset your password by entering your email address.');
  const t = useTranslations("forgotPassword");
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const profile = useAuthProfile();

  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = t("errors.emailRequired");
    } else if (!validateEmail(email)) {
      newErrors.email = t("errors.emailInvalid");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError("");

    if (validateForm()) {
      setLoading(true);

      try {
        await forgotPassword(email);
        setSuccess(true);
      } catch (error) {
        // Handle API errors - error.message is already translated from authClient
        setApiError(
          error instanceof Error
            ? error.message
            : t("errors.fallback", { defaultValue: "Failed to send reset email. Please try again." })
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      setErrors({});
    }
    if (apiError) {
      setApiError("");
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && profile) {
      // Redirect based on user role
      if (profile.role === 'therapist') {
        router.push("/dashboard");
      } else if (profile.role === 'patient') {
        router.push("/dashboard-patient");
      } else {
        // Admin or unknown role - go to home
        router.push("/");
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

  const SuccessContent = () => (
    <div className="flex w-full flex-col gap-6 rounded-2xl border border-stroke bg-white p-6 text-center shadow-sm sm:p-10">
      <h1 className="text-lg font-bold leading-7 text-foreground sm:text-xl">
        {t("checkEmail")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("success")}</p>
      <Link href="/auth/login" className="w-full">
        <Button className="h-11 w-full text-sm font-medium sm:text-base">
          {t("backToLogin")}
        </Button>
      </Link>
    </div>
  );

  const Layout = ({ children }: { children: ReactNode }) => (
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
        {children}
        <div className="text-center text-sm text-muted-foreground leading-5">
          <p>Check your spam folder</p>
          <p>if you don&apos;t receive the email</p>
        </div>
      </div>
    </div>
  );

  if (success) {
    return (
      <Layout>
        <SuccessContent />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex w-full flex-col gap-6 rounded-2xl border border-stroke bg-white p-6 shadow-sm sm:p-10">
        <Link href="/auth/login" className="flex items-center gap-2 text-sm text-foreground">
          <ArrowLeft className="h-4 w-4 text-foreground" />
          <span>Reset your password</span>
        </Link>

        {apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              {t("email")}
            </Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={`h-10 text-sm ${errors.email ? "border-red-500" : ""}`}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-11 w-full text-sm font-medium sm:text-base"
          >
            {loading ? t("submitting") : t("submit")}
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-1 text-center text-sm">
          <span className="text-foreground">Remember your password?</span>
          <Link href="/auth/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </Layout>
  );
}
