"use client";

import { useState } from "react";
import type { SubpagesDict } from "@/app/[lang]/dictionaries";

type EntitlementRow = {
  name: string;
  desc: string;
  values: [boolean, boolean, boolean, boolean];
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
  planNames: [string, string, string, string];
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    channels: true,
    crm: true,
    aiBooking: true,
    support: true,
  });

  const groups: CategoryGroup[] = [
    {
      key: "channels",
      name: matrix.categories.channels.title,
      rows: [
        {
          name: matrix.categories.channels.features.telegram.name,
          desc: matrix.categories.channels.features.telegram.desc,
          values: [true, true, true, true],
        },
        {
          name: matrix.categories.channels.features.instagram.name,
          desc: matrix.categories.channels.features.instagram.desc,
          values: [true, true, true, true],
        },
        {
          name: matrix.categories.channels.features.whatsapp.name,
          desc: matrix.categories.channels.features.whatsapp.desc,
          values: [false, true, true, true],
        },
        {
          name: matrix.categories.channels.features.webhook.name,
          desc: matrix.categories.channels.features.webhook.desc,
          values: [true, true, true, true],
        },
      ],
    },
    {
      key: "crm",
      name: matrix.categories.crm.title,
      rows: [
        {
          name: matrix.categories.crm.features.kanban.name,
          desc: matrix.categories.crm.features.kanban.desc,
          values: [true, true, true, true],
        },
        {
          name: matrix.categories.crm.features.claim.name,
          desc: matrix.categories.crm.features.claim.desc,
          values: [true, true, true, true],
        },
        {
          name: matrix.categories.crm.features.tasks.name,
          desc: matrix.categories.crm.features.tasks.desc,
          values: [false, true, true, true],
        },
        {
          name: matrix.categories.crm.features.customFields.name,
          desc: matrix.categories.crm.features.customFields.desc,
          values: [true, true, true, true],
        },
      ],
    },
    {
      key: "aiBooking",
      name: matrix.categories.aiBooking.title,
      rows: [
        {
          name: matrix.categories.aiBooking.features.booking.name,
          desc: matrix.categories.aiBooking.features.booking.desc,
          values: [false, true, true, true],
        },
        {
          name: matrix.categories.aiBooking.features.duplicateBlock.name,
          desc: matrix.categories.aiBooking.features.duplicateBlock.desc,
          values: [true, true, true, true],
        },
        {
          name: matrix.categories.aiBooking.features.aiAssistant.name,
          desc: matrix.categories.aiBooking.features.aiAssistant.desc,
          values: [false, true, true, true],
        },
        {
          name: matrix.categories.aiBooking.features.handoff.name,
          desc: matrix.categories.aiBooking.features.handoff.desc,
          values: [false, false, true, true],
        },
      ],
    },
    {
      key: "support",
      name: matrix.categories.support.title,
      rows: [
        {
          name: matrix.categories.support.features.isolatedDb.name,
          desc: matrix.categories.support.features.isolatedDb.desc,
          values: [true, true, true, true],
        },
        {
          name: matrix.categories.support.features.auditLog.name,
          desc: matrix.categories.support.features.auditLog.desc,
          values: [true, true, true, true],
        },
        {
          name: matrix.categories.support.features.support.name,
          desc: matrix.categories.support.features.support.desc,
          values: [true, true, true, true],
        },
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
                      {planNames.map((name) => (
                        <th key={name} scope="col">
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.name}>
                        <td>
                          <span>{row.name}</span>
                          <br />
                          <span className="pm-matrix-desc">{row.desc}</span>
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
