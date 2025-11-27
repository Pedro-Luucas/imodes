"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { usePageMetadata } from "@/hooks/usePageMetadata";
import type { InviteValidationResponse } from "@/types/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type InviteState =
  | { status: "loading" }
  | { status: "ready"; data: InviteValidationResponse }
  | { status: "error"; message: string };

export default function PatientRegisterPage() {
  const t = useTranslations("register.patientInvite");
  usePageMetadata("Patient Invite", "Complete your patient registration via invite.");

  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [state, setState] = useState<InviteState>(() =>
    token ? { status: "loading" } : { status: "error", message: t("missingToken") }
  );

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: t("missingToken") });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    const fetchInvite = async () => {
      try {
        const response = await fetch(`/api/auth/register/invite/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t("invalidDescription"));
        }

        if (!cancelled) {
          setState({ status: "ready", data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : t("invalidDescription"),
          });
        }
      }
    };

    fetchInvite();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const inviteDetails = useMemo(() => {
    if (state.status !== "ready") {
      return null;
    }

    const expires = state.data.invite.expires_at
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(state.data.invite.expires_at))
      : null;

    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-medium text-primary">
          {t("invitedBy", { name: state.data.therapist.full_name })}
        </p>
        {expires && (
          <p className="text-muted-foreground">{t("expiresAt", { date: expires })}</p>
        )}
      </div>
    );
  }, [state, t]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-page px-4 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm sm:p-8 space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">{t("invalidTitle")}</h1>
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Button asChild className="w-full">
              <Link href="/auth/login">{t("ctaReturn")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RegisterForm
      role="patient"
      inviteToken={token}
      heading={t("title")}
      description={t("subtitle")}
      contextSlot={inviteDetails}
    />
  );
}


