"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({
  className,
  pendingLabel,
  children,
}: {
  className?: string;
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className ?? ""} disabled:opacity-60`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
