"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/useT";
import { addBlockedDate, removeBlockedDate } from "@/actions/schedule";
import { useRouter } from "next/navigation";

interface BlockedDate {
  id: string;
  date: Date;
  reason: string | null;
}

export default function BlockedDatesSection({ blockedDates }: { blockedDates: BlockedDate[] }) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.set("date", date);
    if (reason) formData.set("reason", reason);

    await addBlockedDate(formData);
    setDate("");
    setReason("");
    setLoading(false);
    router.refresh();
  }

  async function handleRemove(id: string) {
    if (!confirm(t("blocked.confirmRemove"))) return;
    setLoading(true);
    await removeBlockedDate(id);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="metro-card p-6">
      <h2 className="metro-section-title mb-4">{t("blocked.title")}</h2>
      <p className="text-metro-text-secondary text-sm mb-4">
        {t("blocked.description")}
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-metro-text mb-1">{t("blocked.date")}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-metro-text mb-1">{t("blocked.reason")}</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("blocked.reasonPlaceholder")}
            className="border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm w-48 focus:border-metro-blue focus:outline-none"
            maxLength={200}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-metro-orange text-white px-4 py-2 text-sm font-medium hover:bg-metro-orange-hover disabled:opacity-50"
          >
            {loading ? t("blocked.adding") : t("blocked.blockDate")}
          </button>
        </div>
      </form>

      {blockedDates.length === 0 ? (
        <p className="text-metro-text-secondary text-sm">{t("blocked.noBlockedDates")}</p>
      ) : (
        <div className="space-y-2">
          {blockedDates.map((bd) => (
            <div
              key={bd.id}
              className="flex items-center justify-between bg-metro-bg px-4 py-2"
            >
              <div>
                <span className="font-medium text-metro-text">
                  {new Date(bd.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {bd.reason && (
                  <span className="text-metro-text-secondary text-sm ml-2">— {bd.reason}</span>
                )}
              </div>
              <button
                onClick={() => handleRemove(bd.id)}
                disabled={loading}
                className="text-metro-error hover:text-metro-orange-hover text-sm font-medium disabled:opacity-50"
              >
                {t("blocked.remove")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
