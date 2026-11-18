"use client";

import { useState } from "react";
import type { SubpagesDict } from "@/app/[lang]/dictionaries";

type EntitlementRow = {
  label: string;
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
    automation: true,
  });

  const groups: CategoryGroup[] = [
    {
      key: "channels",
      name: matrix.categories.channels.name,
      rows: [
        { label: matrix.categories.channels.rows.telegram, values: [true, true, true, true] },
        { label: matrix.categories.channels.rows.instagram, values: [true, true, true, true] },
        { label: matrix.categories.channels.rows.whatsapp, values: [false, true, true, true] },
        { label: matrix.categories.channels.rows.webForm, values: [true, true, true, true] },
      ],
    },
    {
      key: "crm",
      name: matrix.categories.crm.name,
      rows: [
        { label: matrix.categories.crm.rows.pipeline, values: [true, true, true, true] },
        { label: matrix.categories.crm.rows.teamSeats, values: [true, true, true, true] },
        { label: matrix.categories.crm.rows.dealClaim, values: [false, true, true, true] },
        { label: matrix.categories.crm.rows.antiDuplicate, values: [true, true, true, true] },
      ],
    },
    {
      key: "automation",
      name: matrix.categories.automation.name,
      rows: [
        { label: matrix.categories.automation.rows.aiReplies, values: [false, true, true, true] },
        { label: matrix.categories.automation.rows.capacityLock, values: [true, true, true, true] },
        { label: matrix.categories.automation.rows.managerHandoff, values: [false, true, true, true] },
        { label: matrix.categories.automation.rows.webhook, values: [false, false, true, true] },
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
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        {row.values.map((included, idx) => (
                          <td key={`${row.label}-${idx}`}>
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
