"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ label = "Back", fallbackHref }: { label?: string; fallbackHref?: string }) {
  const router = useRouter();

  function goBack() {
    // router.back() dead-ends when the page was opened directly (a shared link
    // or a fresh tab), so fall back to a known parent route when given one.
    if (fallbackHref && typeof window !== "undefined" && window.history.length <= 1) {
      router.push(fallbackHref);
      return;
    }
    router.back();
  }

  return (
    <button
      onClick={goBack}
      className="mb-4 flex items-center gap-1.5 text-sm font-medium text-togo-muted transition-colors hover:text-togo-blue"
    >
      <ArrowLeft size={15} />
      {label}
    </button>
  );
}
