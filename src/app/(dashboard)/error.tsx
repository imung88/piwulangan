"use client";

import { useT } from "@/lib/i18n/useT";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  return (
    <div className="metro-card max-w-md border-t-4 border-t-metro-orange">
      <h2 className="text-base font-semibold text-metro-text">
        {t("common.somethingWrong")}
      </h2>
      <button
        onClick={reset}
        className="mt-4 min-h-[48px] w-full bg-metro-blue px-4 text-sm font-medium text-white hover:bg-metro-blue-hover sm:w-auto sm:px-8"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
