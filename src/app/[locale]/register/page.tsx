"use client";

import { useState, FormEvent, useEffect } from "react";
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { register } from "@/lib/authClient";
import { useIsAuthenticated, useAuthLoading } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  usePageMetadata('Register', 'Create a new account on iModes platform.');
  const t = useTranslations("register");
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [formData, setFormData] = useState({
    role: "" as "" | "therapist" | "patient",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
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

    // Role validation
    if (!formData.role) {
      newErrors.role = t("errors.roleRequired");
    }

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = t("errors.firstNameRequired");
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = t("errors.lastNameRequired") || "Last name is required";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t("errors.emailRequired");
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t("errors.emailInvalid");
    }

    // Phone validation (required for therapists)
    if (formData.role === "therapist" && !formData.phone.trim()) {
      newErrors.phone = t("errors.phoneRequired");
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = t("errors.passwordRequired");
    } else if (formData.password.length < 8) {
      newErrors.password = t("errors.passwordMinLength");
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t("errors.confirmPasswordRequired");
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("errors.passwordMismatch");
    }

    // Terms validation
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = t("errors.termsRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitSuccess(false);
    setApiError("");

    if (validateForm()) {
      setLoading(true);

      try {
        // Calculate fullName from firstName and lastName (in that order)
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();

        // Call the registration API
        const response = await register(
          formData.email,
          formData.password,
          formData.role as "therapist" | "patient",
          fullName,
          formData.firstName,
          formData.phone || undefined
        );

        // Always redirect to login after successful registration
        setSubmitSuccess(true);
        setApiError(response.message);
        
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Registration failed. Please try again.");
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

  if (isAuthenticated) {
    return null;
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
          <span className="text-sm text-foreground">Create an account</span>
        </Link>

        {/* Success/Error Messages */}
        {submitSuccess && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm text-center">
            {apiError || t("success")}
          </div>
        )}

        {apiError && !submitSuccess && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
            {apiError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {/* First Name & Last Name Row */}
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="John"
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Doe"
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

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

          {/* Type Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Type</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleInputChange("role", value)}
            >
              <SelectTrigger 
                className={`w-full ${errors.role ? "!border-red-500" : ""}`}
              >
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent className={`bg-white border border-stroke ${errors.role ? "!border-red-500" : ""}`}>
                <SelectItem value="therapist">{t("roleTherapist")}</SelectItem>
                <SelectItem value="patient">{t("rolePatient")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-600">{errors.role}</p>
            )}
          </div>

          {/* Phone Field - Only show for therapists */}
          {formData.role === "therapist" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+1234567890"
                className={errors.phone ? "border-red-500" : ""}
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
          )}

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
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
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

          {/* Terms Checkbox */}
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id="acceptTerms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) =>
                  handleInputChange("acceptTerms", checked as boolean)
                }
                className={errors.acceptTerms ? "border-red-500" : ""}
              />
              <Label
                htmlFor="acceptTerms"
                className="font-normal cursor-pointer leading-5 text-foreground"
              >
                I agree to{" "}
                <span className="text-accent hover:underline cursor-pointer">the Terms of Service</span> and{" "}
                <span className="text-accent hover:underline cursor-pointer">Privacy Policy</span>
              </Label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-red-600">{errors.acceptTerms}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={loading} className="w-full mt-4">
            {loading ? t("submitting") : "Create Account"}
          </Button>
        </form>

        {/* Login Link */}
        <div className="flex items-center justify-center gap-1 text-sm">
          <span className="text-foreground">Already have an account?</span>
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
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
