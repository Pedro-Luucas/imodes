"use client";

import { useTranslations } from "next-intl";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { usePageMetadata } from "@/hooks/usePageMetadata";

export default function TherapistRegisterPage() {
  const t = useTranslations("register");
  usePageMetadata("Therapist Register", "Create a therapist account on iModes.");

  return (
    <RegisterForm
      role="therapist"
      heading={t("title")}
      description={t("subtitle")}
    />
  );
}


