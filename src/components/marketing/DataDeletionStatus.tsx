"use client";

import { useSearchParams } from "next/navigation";
import type { Locale } from "@/app/[lang]/dictionaries";

const SAFE_CODE_RE = /^del_[a-f0-9]{12,32}$/i;

export function DataDeletionStatus({ lang }: { lang: Locale }) {
  const params = useSearchParams();
  const raw = params.get("code")?.trim() ?? "";
  if (!raw || !SAFE_CODE_RE.test(raw)) return null;

  return (
    <div
      role="status"
      style={{
        marginBottom: "24px",
        padding: "16px 20px",
        borderRadius: "12px",
        border: "1px solid #c7d6ff",
        background: "#f3f6ff",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>
        {lang === "en"
          ? `Deletion request recorded · Confirmation code: ${raw}`
          : `Silinmə sorğusu qeydə alındı · Təsdiq kodu: ${raw}`}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: "0.92rem" }}>
        {lang === "en"
          ? "Associated OAuth tokens and account metadata are queued for permanent deletion within 30 days. Keep this code for your records."
          : "Əlaqəli OAuth tokenləri və hesab məlumatları 30 gün ərzində birdəfəlik silinmə növbəsinə əlavə edildi. Bu kodu özünüzdə saxlayın."}
      </p>
    </div>
  );
}
