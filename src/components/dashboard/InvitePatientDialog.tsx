"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Copy, Loader2 } from "lucide-react";

interface InvitePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapistId: string;
}

export function InvitePatientDialog({
  open,
  onOpenChange,
  therapistId,
}: InvitePatientDialogProps) {
  const t = useTranslations("dashboard.invitePatient");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setInviteLink("");
      setExpiresAt(null);
      setError(null);
      setCopied(false);
    }
    onOpenChange(nextOpen);
  };

  const handleGenerate = async () => {
    if (!therapistId) return;
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch(`/api/therapists/${therapistId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("errorFailed"));
      }

      setInviteLink(data.url);
      setExpiresAt(data.invite?.expires_at ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy invite link", err);
    }
  };

  const formattedExpiry =
    expiresAt &&
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(expiresAt));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {inviteLink ? (
            <div className="flex flex-col gap-4">
              <Alert className="border-green-200 bg-green-50 text-green-900">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>{t("success")}</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="inviteLink">{t("linkLabel")}</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="inviteLink" value={inviteLink} readOnly className="font-mono text-sm" />
                  <Button type="button" variant="secondary" onClick={handleCopy} className="sm:w-36">
                    {copied ? t("copied") : (
                      <span className="flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        {t("copy")}
                      </span>
                    )}
                  </Button>
                </div>
                {formattedExpiry && (
                  <p className="text-xs text-muted-foreground">
                    {t("expires", { date: formattedExpiry })}
                  </p>
                )}
              </div>

              <Button variant="outline" onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("generating")}
                  </span>
                ) : (
                  t("newInvite")
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("generating")}
                </span>
              ) : (
                t("generate")
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


