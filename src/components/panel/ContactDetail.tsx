"use client";

import { useId, useMemo, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import {
  formatMoneyMinor,
  formatPanelDateTime,
  localizeStageName,
  type PanelDict,
  type PanelLocale,
  type SalesContact,
  type SalesDeal,
  type SalesPhoneMatch,
  type SalesStage,
} from "./types";

type ContactDetailProps = {
  contacts: SalesContact[];
  deals: SalesDeal[];
  stages: SalesStage[];
  phoneMatches: SalesPhoneMatch[];
  selectedContactId: string | null;
  lang: PanelLocale;
  d: PanelDict;
  onSelectContact: (contactId: string) => void;
  onContactCreated: (contact: SalesContact) => void;
  onConfirmPhoneMatch: (matchId: string) => Promise<void>;
  onOpenDeal: (dealId: string) => void;
  onUnauthorized: () => void;
};

export function ContactDetail({
  contacts,
  deals,
  stages,
  phoneMatches,
  selectedContactId,
  lang,
  d,
  onSelectContact,
  onContactCreated,
  onConfirmPhoneMatch,
  onOpenDeal,
  onUnauthorized,
}: ContactDetailProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [query, setQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const nameId = useId();
  const phoneId = useId();
  const searchId = useId();

  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [contacts, query]);

  const activeContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) ?? filteredContacts[0] ?? null,
    [contacts, selectedContactId, filteredContacts]
  );

  const contactDeals = useMemo(
    () => (activeContact ? deals.filter((deal) => deal.contactId === activeContact.id) : []),
    [deals, activeContact]
  );

  const contactMatches = useMemo(
    () =>
      activeContact
        ? phoneMatches.filter((m) => m.contactId === activeContact.id && !m.confirmedAt)
        : [],
    [phoneMatches, activeContact]
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateStatus(null);
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (trimmedName.length < 2 || trimmedPhone.replace(/\D/g, "").length < 7) {
      setCreateStatus({ kind: "error", text: d.contacts.createError });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/panel/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: trimmedName, phone: trimmedPhone }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        setCreateStatus({ kind: "error", text: d.contacts.createError });
        return;
      }
      const data = (await res.json()) as { ok: true; contact: SalesContact };
      onContactCreated(data.contact);
      onSelectContact(data.contact.id);
      setName("");
      setPhone("");
      setCreateStatus({ kind: "ok", text: d.contacts.createOk });
      setShowCreate(false);
    } catch {
      setCreateStatus({ kind: "error", text: d.contacts.createError });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="panel-card crm-section-heading flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{d.contacts.title}</h1>
          <p className="mt-1 text-[0.95rem] text-muted">{d.contacts.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((prev) => !prev)}
          className={buttonClass({ size: "sm", className: "min-h-11 sm:min-h-9" })}
        >
          {showCreate ? d.contacts.newToggleClose : d.contacts.newToggleOpen}
        </button>
      </div>

      {showCreate && (
        <section className="panel-register crm-form-card p-5">
          <h2 className="text-lg font-semibold">{d.contacts.createTitle}</h2>
          <form onSubmit={(e) => void handleCreate(e)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={nameId} className="block text-sm font-medium text-ink">
                {d.contacts.nameLabel}
              </label>
              <input
                id={nameId}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={d.contacts.namePlaceholder}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              />
            </div>

            <div>
              <label htmlFor={phoneId} className="block text-sm font-medium text-ink">
                {d.contacts.phoneLabel}
              </label>
              <input
                id={phoneId}
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={d.contacts.phonePlaceholder}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className={buttonClass({ size: "sm", className: "min-h-11" })}
              >
                {creating ? d.contacts.creating : d.contacts.createSubmit}
              </button>
            </div>
          </form>

          {createStatus && (
            <p
              role={createStatus.kind === "error" ? "alert" : "status"}
              className={`mt-3 text-sm font-medium ${
                createStatus.kind === "error" ? "text-danger" : "text-stamp"
              }`}
            >
              {createStatus.text}
            </p>
          )}
        </section>
      )}

      {contacts.length === 0 ? (
        <div className="panel-card p-8 text-center text-muted">{d.contacts.empty}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
          {/* Contact list */}
          <aside className="panel-card overflow-hidden">
            <div className="border-b border-line p-4">
              <label htmlFor={searchId} className="sr-only">
                {d.contacts.searchLabel}
              </label>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={d.contacts.searchPlaceholder}
                className="min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              />
            </div>

            {filteredContacts.length === 0 ? (
              <p className="p-4 text-sm text-muted">{d.contacts.emptyFiltered}</p>
            ) : (
              <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
                {filteredContacts.map((c) => {
                  const isSelected = activeContact?.id === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onSelectContact(c.id)}
                        className={`flex min-h-11 w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-l-4 border-l-brand bg-brand/10"
                            : "hover:bg-bg"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-ink">{c.name}</span>
                          <span
                            className={`shrink-0 rounded border px-1.5 py-0.5 text-[0.7rem] font-semibold ${
                              c.phoneVerified
                                ? "border-stamp/40 bg-stamp/10 text-stamp"
                                : "border-line bg-surface text-muted"
                            }`}
                          >
                            {c.phoneVerified ? d.contacts.verified : d.contacts.unverified}
                          </span>
                        </div>
                        <span className="text-xs text-muted tabular-nums">{c.phone}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Selected contact details */}
          <section className="panel-register crm-form-card p-5 sm:p-6">
            {!activeContact ? (
              <p className="text-sm text-muted">{d.contacts.selectPrompt}</p>
            ) : (
              <div className="grid gap-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-ink">{activeContact.name}</h2>
                    <p className="mt-1 text-sm text-muted tabular-nums">{activeContact.phone}</p>
                    <p className="mt-1 text-xs text-muted">
                      {d.contacts.createdAt}: {formatPanelDateTime(activeContact.createdAt, lang)}
                    </p>
                  </div>
                  <span
                    className={`rounded border px-2.5 py-1 text-xs font-semibold ${
                      activeContact.phoneVerified
                        ? "border-stamp/40 bg-stamp/10 text-stamp"
                        : "border-line bg-bg text-muted"
                    }`}
                  >
                    {activeContact.phoneVerified ? d.contacts.verified : d.contacts.unverified}
                  </span>
                </div>

                {contactMatches.length > 0 && (
                  <div className="rounded-lg border border-brand/40 bg-brand/5 p-4">
                    <h3 className="text-sm font-semibold text-ink">{d.contacts.pendingMatchesTitle}</h3>
                    <ul className="mt-2 grid gap-2">
                      {contactMatches.map((m) => (
                        <li
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-surface p-2.5 text-sm"
                        >
                          <span>
                            {m.channel} · {m.externalUserId} → <strong className="tabular-nums">{m.phoneNormalized}</strong>
                          </span>
                          <button
                            type="button"
                            disabled={confirmingId === m.id}
                            onClick={async () => {
                              setConfirmingId(m.id);
                              try {
                                await onConfirmPhoneMatch(m.id);
                              } finally {
                                setConfirmingId(null);
                              }
                            }}
                            className={buttonClass({ size: "sm", className: "min-h-9" })}
                          >
                            {confirmingId === m.id ? d.phoneMatch.confirming : d.phoneMatch.confirm}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="text-base font-semibold text-ink">{d.contacts.linkedDealsTitle}</h3>
                  {contactDeals.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">{d.contacts.linkedDealsEmpty}</p>
                  ) : (
                    <ul className="mt-3 grid gap-2.5">
                      {contactDeals.map((deal) => {
                        const st = stageById.get(deal.stageId);
                        return (
                          <li
                            key={deal.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-bg p-3"
                          >
                            <div>
                              <p className="font-semibold text-ink">{deal.title}</p>
                              <p className="text-xs text-muted">
                                {st ? localizeStageName(st, d) : deal.stageId} ·{" "}
                                {formatMoneyMinor(deal.amountMinor, deal.currency)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onOpenDeal(deal.id)}
                              className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-9" })}
                            >
                              {d.contacts.openDeal}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
