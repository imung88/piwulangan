"use client";

import { useState } from "react";
import { addBlockedDate, removeBlockedDate } from "@/actions/schedule";
import { useRouter } from "next/navigation";

interface BlockedDate {
  id: string;
  date: Date;
  reason: string | null;
}

export default function BlockedDatesSection({ blockedDates }: { blockedDates: BlockedDate[] }) {
  const router = useRouter();
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
    if (!confirm("Remove this blocked date?")) return;
    setLoading(true);
    await removeBlockedDate(id);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Blocked Dates</h2>
      <p className="text-gray-600 text-sm mb-4">
        Block specific dates when you&apos;re unavailable (holidays, days off).
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Holiday"
            className="border rounded-lg px-3 py-2 text-sm w-48"
            maxLength={200}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Block Date"}
          </button>
        </div>
      </form>

      {blockedDates.length === 0 ? (
        <p className="text-gray-500 text-sm">No blocked dates.</p>
      ) : (
        <div className="space-y-2">
          {blockedDates.map((bd) => (
            <div
              key={bd.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2"
            >
              <div>
                <span className="font-medium text-gray-900">
                  {new Date(bd.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {bd.reason && (
                  <span className="text-gray-500 text-sm ml-2">— {bd.reason}</span>
                )}
              </div>
              <button
                onClick={() => handleRemove(bd.id)}
                disabled={loading}
                className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
