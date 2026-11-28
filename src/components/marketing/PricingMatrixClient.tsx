"use client";

import { useState } from "react";
import type { SubpagesDict } from "@/app/[lang]/dictionaries";

type EntitlementRow = {
  name: string;
  desc: string;
  values: [boolean, boolean, boolean];
};

type CategoryGroup = {
  key: string;
  name: string;
  rows: EntitlementRow[];
};

export function PricingMatrixClient({
  matrix,
  planNames,
}: {
  matrix: SubpagesDict["pricingPage"]["matrix"];
  planNames: [string, string, string];
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    channels: true,
    crm: true,
    aiBooking: true,
    support: true,
  });

  const az = planNames[0] === "Başlanğıc";
  const all: [boolean, boolean, boolean] = [true, true, true];
  const standard: [boolean, boolean, boolean] = [false, true, true];
  const premium: [boolean, boolean, boolean] = [false, false, true];
  const row = (nameAz: string, nameEn: string, values: [boolean, boolean, boolean]): EntitlementRow => ({
    name: az ? nameAz : nameEn,
    desc: "",
    values,
  });

  const groups: CategoryGroup[] = [
    {
      key: "crm",
      name: az ? "Gündəlik idarəetmə" : "Daily management",
      rows: [
        row("Müştəri bazası", "Customer database", all),
        row("Rezervasiya", "Bookings", all),
        row("İşçi paneli", "Staff panel", all),
      ],
    },
    {
      key: "channels",
      name: az ? "WhatsApp" : "WhatsApp",
      rows: [row("WhatsApp bağlantısı", "WhatsApp connection", standard)],
    },
    {
      key: "aiBooking",
      name: "Pani AI",
      rows: [row("Pani AI köməkçi", "Pani AI assistant", standard)],
    },
    {
      key: "support",
      name: az ? "Quraşdırma və dəstək" : "Onboarding and support",
      rows: [
        row("Canlı quraşdırma", "Live onboarding", standard),
        row("Limitsiz işçi", "Unlimited staff", premium),
        row("Öncəlikli texniki dəstək", "Priority technical support", premium),
        row("Aylıq hesabat", "Monthly report", premium),
      ],
    },
  ];

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div id="matrix" className="pm-matrix-wrap">
      <div className="pm-section-head">
        <h2>{matrix.title}</h2>
      </div>

      {groups.map((group) => {
        const isOpen = Boolean(openGroups[group.key]);
        return (
          <div key={group.key} className="pm-matrix-group">
            <button
              type="button"
              className="pm-matrix-toggle"
              aria-expanded={isOpen}
              onClick={() => toggleGroup(group.key)}
            >
              <span>{group.name}</span>
              <span>{isOpen ? "−" : "+"}</span>
            </button>

            {isOpen && (
              <div className="pm-matrix-table-scroll">
                <table className="pm-matrix-table">
                  <thead>
                    <tr>
                      <th scope="col">{group.name}</th>
                      {planNames.map((name, index) => (
                        <th key={name} scope="col">
                          <div>{name}</div>
                          <div>{[99, 199, 349][index]} AZN{az ? "/ay" : "/mo"}</div>
                          <div className="pm-matrix-desc">{az ? "İlk ay" : "First month"}: {[49, 99, 175][index]} AZN</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.name}>
                        <td>
                          <span>{row.name}</span>
                          {row.desc && <><br /><span className="pm-matrix-desc">{row.desc}</span></>}
                        </td>
                        {row.values.map((included, idx) => (
                          <td key={`${row.name}-${idx}`}>
                            {included ? (
                              <span aria-label="Included" style={{ color: "#15803d", fontWeight: 800 }}>
                                ✓
                              </span>
                            ) : (
                              <span aria-label="Not included" style={{ color: "#94a3b8" }}>
                                —
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
