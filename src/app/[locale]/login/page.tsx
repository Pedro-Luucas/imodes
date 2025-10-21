"use client";

import { useState, FormEvent, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { login } from "@/lib/authClient";
import { useAuthActions, useIsAuthenticated, useAuthLoading } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const { initialize } = useAuthActions();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

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

        // Login successful, redirect to home/dashboard
        router.push("/");
      } catch (error) {
        // Handle API errors
        setApiError(
          error instanceof Error
            ? error.message
            : "Login failed. Please check your credentials."
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-page p-16">
      {/* Logo */}
      <div className="relative w-[266px] h-[62px] mb-6">
        <Image
          src="/imodes.png" alt="iModes"
          fill className="object-contain mix-blend-darken"
          priority
        />
      </div>

      {/* Form Card */}
      <div className="w-full max-w-[450px] bg-white border border-stroke rounded-2xl p-12 flex flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground leading-7">
            {t("title")}
          </h1>
        </div>

        {/* Error Message */}
        {apiError && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
            {apiError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {/* Email Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={errors.email ? "border-red-500" : ""}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className={errors.password ? "border-red-500" : ""}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between mt-4">
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
                className="font-medium cursor-pointer"
              >
                {t("rememberMe")}
              </Label>
            </div>

            <Link
              href="/forgot-password"
              className="text-sm font-medium text-accent hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-4"
          >
            {loading ? t("submitting") : t("submit")}
          </Button>
        </form>

        {/* Register Link */}
        <div className="flex items-center justify-center gap-1 text-sm">
          <span className="text-foreground">{t("noAccount")}</span>
          <Link
            href="/register"
            className="font-medium text-accent hover:underline"
          >
            {t("registerLink")}
          </Link>
        </div>
      </div>

      {/* Footer Text */}
      <div className="mt-6">
        <p className="text-sm text-muted-foreground">
          Secure authentication • GDPR compliant
        </p>
      </div>
    </div>
  );
}
