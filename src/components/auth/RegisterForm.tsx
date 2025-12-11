"use client";

import { useState, useEffect, FormEvent, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { register as registerUser } from "@/lib/authClient";
import { useIsAuthenticated, useAuthLoading, useAuthProfile } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

interface RegisterFormProps {
  role: "therapist" | "patient";
  inviteToken?: string;
  disabled?: boolean;
  contextSlot?: ReactNode;
  heading?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function RegisterForm({
  role,
  inviteToken,
  disabled = false,
  contextSlot,
  heading,
  description,
  backHref = "/auth/login",
  backLabel,
}: RegisterFormProps) {
  const t = useTranslations("register");
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const profile = useAuthProfile();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && profile) {
      if (profile.role === "therapist") {
        router.push("/dashboard");
      } else if (profile.role === "patient") {
        router.push("/dashboard-patient");
      } else {
        router.push("/");
      }
    }
  }, [authLoading, isAuthenticated, profile, router]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t("errors.firstNameRequired");
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t("errors.lastNameRequired") || "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = t("errors.emailRequired");
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t("errors.emailInvalid");
    }

    if (!formData.password) {
      newErrors.password = t("errors.passwordRequired");
    } else if (formData.password.length < 8) {
      newErrors.password = t("errors.passwordMinLength");
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t("errors.confirmPasswordRequired");
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("errors.passwordMismatch");
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = t("errors.termsRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (disabled) return;
    setSubmitSuccess(false);
    setApiError("");

    if (validateForm()) {
      setLoading(true);

      try {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();

        const response = await registerUser(
          formData.email,
          formData.password,
          role,
          fullName,
          formData.firstName,
          undefined,
          inviteToken
        );

        setSubmitSuccess(true);
        setApiError(response.message);
      } catch (error) {
        // Handle API errors - error.message is already translated from authClient
        setApiError(
          error instanceof Error 
            ? error.message 
            : t("errors.fallback", { defaultValue: "Registration failed. Please try again." })
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

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
          <Link href={backHref} className="flex items-center gap-2 text-sm text-foreground">
            <ArrowLeft className="h-4 w-4 text-foreground" />
            <span>{backLabel ?? t("title")}</span>
          </Link>

          {heading && (
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground">{heading}</h1>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          )}

          {submitSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center text-sm text-green-700">
              {apiError || t("success")}
            </div>
          )}

          {apiError && !submitSuccess && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
              {apiError}
            </div>
          )}

          {contextSlot}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                  {t("firstName")}
                </Label>
                <Input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder={t("firstNamePlaceholder")}
                  className={`h-10 text-sm ${errors.firstName ? "border-red-500" : ""}`}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                  {t("lastName")}
                </Label>
                <Input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder={t("lastNamePlaceholder")}
                  className={`h-10 text-sm ${errors.lastName ? "border-red-500" : ""}`}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

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
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

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
                  autoComplete="new-password"
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                {t("confirmPassword")}
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  placeholder={t("confirmPasswordPlaceholder")}
                  className={`h-10 pr-10 text-sm ${errors.confirmPassword ? "border-red-500" : ""}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="mt-1 flex flex-col gap-2 hidden">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) =>
                    handleInputChange("acceptTerms", Boolean(checked))
                  }
                  className={errors.acceptTerms ? "border-red-500" : ""}
                />
                <Label
                  htmlFor="acceptTerms"
                  className="cursor-pointer text-sm font-medium leading-5 text-foreground"
                >
                  {t("terms")}
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-xs text-red-600">{errors.acceptTerms}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || disabled}
              className="mt-2 h-11 w-full text-sm font-medium sm:text-base"
            >
              {loading ? t("submitting") : t("submit", { defaultValue: "Create Account" })}
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-1 text-center text-sm">
            <span className="text-foreground">{t("haveAccount")}</span>
            <Link href="/auth/login" className="font-medium text-accent hover:underline">
              {t("loginLink")}
            </Link>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground leading-5">
          <p>Your password will be encrypted</p>
          <p>and stored securely</p>
        </div>
      </div>
    </div>
  );
}

