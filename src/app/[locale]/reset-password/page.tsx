"use client";

import { useState, FormEvent, useEffect } from "react";
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
          router.push("/login");
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

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-page p-16">
        <div className="relative w-[266px] h-[62px] mb-6">
          <Image
            src="/imodes.png"
            alt="iModes"
            fill
            className="object-contain mix-blend-darken"
            priority
          />
        </div>

        <div className="w-full max-w-[450px] bg-background border border-stroke rounded-2xl p-12">
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground leading-7 mb-4">
              {t("success")}
            </h1>
            <p className="text-muted-foreground">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-page p-16">
      {/* Logo */}
      <div className="relative w-[266px] h-[62px] mb-6">
        <Image
          src="/imodes.png"
          alt="iModes"
          fill
          className="object-contain mix-blend-darken"
          priority
        />
      </div>

      {/* Form Card */}
      <div className="w-full max-w-[450px] bg-white border border-stroke rounded-2xl p-12 flex flex-col gap-6">
        {/* Back Button */}
        <Link href="/login" className="flex items-center gap-2 w-fit">
          <ArrowLeft className="w-4 h-4 text-foreground" />
          <span className="text-sm text-foreground">Create new password</span>
        </Link>

        {/* Error Message */}
        {apiError && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
            {apiError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {/* New Password Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className={errors.password ? "border-red-500" : ""}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              placeholder={t("confirmPasswordPlaceholder")}
              className={errors.confirmPassword ? "border-red-500" : ""}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !accessToken || !refreshToken}
            className="w-full"
          >
            {loading ? t("submitting") : "Reset Password"}
          </Button>

          {/* Back to Login Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/login")}
            className="w-full"
          >
            Back to sign in
          </Button>
        </form>
      </div>

      {/* Footer Text */}
      <div className="mt-6">
        <p className="text-sm text-muted-foreground">
          Your password will be encrypted and stored securely
        </p>
      </div>
    </div>
  );
}
