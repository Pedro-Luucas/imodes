"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { usePageMetadata } from "@/hooks/usePageMetadata";
import { Link } from "@/i18n/navigation";

export default function AuthLandingPage() {
  const t = useTranslations("authLanding");

  usePageMetadata(t("metaTitle"), t("metaDescription"));

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
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-lg font-bold leading-7 text-foreground sm:text-xl">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              asChild
              className="h-11 w-full text-sm font-medium sm:text-base"
            >
              <Link href="/auth/register">{t("newUserButton")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 w-full text-sm font-medium sm:text-base"
            >
              <Link href="/auth/login">{t("returningUserButton")}</Link>
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>{t("footer")}</p>
        </div>
      </div>
    </div>
  );
}

