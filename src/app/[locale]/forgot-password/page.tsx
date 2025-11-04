"use client";

import { useState, FormEvent } from "react";
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { forgotPassword } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  usePageMetadata('Forgot Password', 'Reset your password by entering your email address.');
  const t = useTranslations("forgotPassword");

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
        setApiError(
          error instanceof Error
            ? error.message
            : "Failed to send reset email. Please try again."
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
              {t("checkEmail")}
            </h1>
            <p className="text-muted-foreground mb-6">{t("success")}</p>
            <Link href="/login">
              <Button className="w-full">{t("backToLogin")}</Button>
            </Link>
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
          <span className="text-sm text-foreground">Reset your password</span>
        </Link>

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
              value={email}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={errors.email ? "border-red-500" : ""}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={loading} className="w-full mt-4">
            {loading ? t("submitting") : t("submit")}
          </Button>
        </form>

        {/* Back to Login Link */}
        <div className="flex items-center justify-center gap-1 text-sm">
          <span className="text-foreground">Remember your password?</span>
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>

      {/* Footer Text */}
      <div className="mt-6">
        <p className="text-sm text-muted-foreground">
          Check your spam folder if you don&apos;t receive the email
        </p>
      </div>
    </div>
  );
}
