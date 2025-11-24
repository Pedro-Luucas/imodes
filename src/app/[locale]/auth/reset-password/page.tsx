"use client";

import { useState, FormEvent, useEffect, ReactNode } from "react";
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { resetPassword } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  usePageMetadata('Reset Password', 'Create a new password for your account.');
  const t = useTranslations("resetPassword");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const aToken = hashParams.get("access_token") || searchParams.get("access_token");
    const rToken = hashParams.get("refresh_token") || searchParams.get("refresh_token");

    if (aToken && rToken) {
      setAccessToken(aToken);
      setRefreshToken(rToken);
    } else {
      setApiError(t("invalidLink"));
    }
  }, [searchParams, t]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError("");

    if (!accessToken || !refreshToken) {
      setApiError(t("invalidLink"));
      return;
    }

    if (validateForm()) {
      setLoading(true);

      try {
        await resetPassword(formData.password, accessToken, refreshToken);
        setSuccess(true);
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } catch (error) {
        setApiError(
          error instanceof Error
            ? error.message
            : "Failed to reset password. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (apiError) {
      setApiError("");
    }
  };

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
          <p>Your password will be encrypted</p>
          <p>and stored securely</p>
        </div>
      </div>
    </div>
  );

  if (success) {
    return (
      <Layout>
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-stroke bg-white p-6 text-center shadow-sm sm:p-10">
          <h1 className="text-lg font-bold leading-7 text-foreground sm:text-xl">
            {t("success")}
          </h1>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex w-full flex-col gap-6 rounded-2xl border border-stroke bg-white p-6 shadow-sm sm:p-10">
        <Link href="/auth/login" className="flex items-center gap-2 text-sm text-foreground">
          <ArrowLeft className="h-4 w-4 text-foreground" />
          <span>Create new password</span>
        </Link>

        {apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              New Password
            </Label>
            <Input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className={`h-10 text-sm ${errors.password ? "border-red-500" : ""}`}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm Password
            </Label>
            <Input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              placeholder={t("confirmPasswordPlaceholder")}
              className={`h-10 text-sm ${errors.confirmPassword ? "border-red-500" : ""}`}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !accessToken || !refreshToken}
            className="mt-2 h-11 w-full text-sm font-medium sm:text-base"
          >
            {loading ? t("submitting") : "Reset Password"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/auth/login")}
            className="h-11 w-full text-sm font-medium sm:text-base"
          >
            Back to sign in
          </Button>
        </form>
      </div>
    </Layout>
  );
}
