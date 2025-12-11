"use client";

import { useState, FormEvent, useEffect } from "react";
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { login, getProfile } from "@/lib/authClient";
import { useAuthActions, useIsAuthenticated, useAuthLoading, useAuthProfile } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  usePageMetadata('Login', 'Sign in to your iModes account.');
  const t = useTranslations("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { initialize } = useAuthActions();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  
  // Get redirect path from query params
  const redirectPath = searchParams.get('redirect');

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const profile = useAuthProfile();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && profile) {
      // Check if there's a specific redirect path
      if (redirectPath) {
        // Remove locale prefix from redirect path if present
        const pathWithoutLocale = redirectPath.replace(/^\/(en|pt)/, '');
        router.push(pathWithoutLocale || '/');
      } else {
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
    }
  }, [authLoading, isAuthenticated, profile, router, redirectPath]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t("errors.emailRequired");
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t("errors.emailInvalid");
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = t("errors.passwordRequired");
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
        // Call the login API
        await login(formData.email, formData.password);

        // Initialize auth state to fetch user profile
        await initialize();

        // Fetch the profile to get the user's role
        const profileData = await getProfile();
        const userProfile = profileData.profile;

        // Login successful, redirect to intended destination or role-based dashboard
        if (redirectPath) {
          // Remove locale prefix from redirect path if present
          const pathWithoutLocale = redirectPath.replace(/^\/(en|pt)/, '');
          router.push(pathWithoutLocale || '/');
        } else {
          // Redirect based on user role
          if (userProfile.role === 'therapist') {
            router.push("/dashboard");
          } else if (userProfile.role === 'patient') {
            router.push("/dashboard-patient");
          } else {
            // Admin or unknown role - go to home
            router.push("/");
          }
        }
      } catch (error) {
        // Handle API errors - error.message is already translated from authClient
        setApiError(
          error instanceof Error
            ? error.message
            : t("errors.fallback", { defaultValue: "Login failed. Please check your credentials." })
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Clear API error when user starts typing
    if (apiError) {
      setApiError("");
    }
  };

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

  // Don't render login form if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-page px-4 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8 sm:gap-10">
        {/* Logo */}
        <div className="relative h-11 w-[186px] sm:h-[62px] sm:w-[266px]">
          <Image
            src="/imodes.png" alt="iModes"
            fill className="object-contain mix-blend-darken"
            priority
          />
        </div>

        {/* Form Card */}
        <div className="flex w-full flex-col gap-6 rounded-2xl border border-stroke bg-white p-6 shadow-sm sm:p-10">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-bold leading-7 text-foreground sm:text-xl">
              {t("title")}
            </h1>
          </div>

          {/* Error Message */}
          {apiError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
              {apiError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                {t("email")}
              </Label>
              <Input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder={t("emailPlaceholder")}
                className={`h-10 text-sm ${errors.email ? "border-red-500" : ""}`}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                {t("password")}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  className={`h-10 pr-10 text-sm ${errors.password ? "border-red-500" : ""}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rememberMe"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) =>
                    handleInputChange("rememberMe", checked as boolean)
                  }
                />
                <Label
                  htmlFor="rememberMe"
                  className="cursor-pointer text-sm font-medium text-foreground"
                >
                  {t("rememberMe")}
                </Label>
              </div>

              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-accent hover:underline whitespace-nowrap"
              >
                {t("forgotPassword")}
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full text-sm font-medium sm:text-base"
            >
              {loading ? t("submitting") : t("submit")}
            </Button>
          </form>

          {/* Register Link */}
          <div className="flex flex-wrap items-center justify-center gap-1 text-center text-sm">
            <span className="text-foreground">{t("noAccount")}</span>
            <Link
              href="/auth/register/therapist"
              className="font-medium text-accent hover:underline"
            >
              {t("registerLink")}
            </Link>
          </div>
        </div>

        {/* Footer Text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Secure authentication • GDPR compliant</p>
        </div>
      </div>
    </div>
  );
}
