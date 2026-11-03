"use client";

import { useEffect, useMemo, useState } from "react";
import { ContactRound, RefreshCw, Search, MessageCircle, Phone, Tag, ShieldCheck, ShieldAlert, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Contact = {
  id: string;
  manychat_contact_id: string;
  phone_e164: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  tags: string[];
  whatsapp_opted_in: boolean;
  sms_marketing_opt_in: boolean;
  sms_consent_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  synced_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ManyChatContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [consentFilter, setConsentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load(silent = false) {
    silent ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Sign in again.");
      const response = await fetch("/api/admin/manychat-contacts", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load ManyChat contacts.");
      setContacts(payload.contacts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ManyChat contacts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const tags = useMemo(
    () => [...new Set(contacts.flatMap(contact => contact.tags || []))].sort((a, b) => a.localeCompare(b)),
    [contacts]
  );

  const stats = useMemo(() => ({
    total: contacts.length,
    smsOptedIn: contacts.filter(contact => contact.sms_marketing_opt_in).length,
    whatsappOptedIn: contacts.filter(contact => contact.whatsapp_opted_in).length,
    tagged: contacts.filter(contact => (contact.tags || []).length > 0).length,
  }), [contacts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter(contact => {
      if (tagFilter !== "all" && !(contact.tags || []).includes(tagFilter)) return false;
      if (consentFilter === "sms" && !contact.sms_marketing_opt_in) return false;
      if (consentFilter === "no-sms" && contact.sms_marketing_opt_in) return false;
      if (consentFilter === "whatsapp" && !contact.whatsapp_opted_in) return false;
      if (!query) return true;
      return [
        contact.full_name,
        contact.first_name,
        contact.last_name,
        contact.phone_e164,
        contact.manychat_contact_id,
        ...(contact.tags || []),
      ].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [contacts, search, tagFilter, consentFilter]);

  function openWhatsApp(phone: string) {
    const digits = phone.replace(/\D/g, "");
    if (digits) window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="st-content">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="st-eyebrow">CONTACT MANAGEMENT</p>
          <h1 className="st-page-title mt-2">ManyChat Contacts</h1>
          <p className="st-page-description">WhatsApp subscribers synchronized from ManyChat, kept separate from leads, trials and students.</p>
        </div>
        <button type="button" onClick={() => load(true)} className="st-button st-button-secondary" disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh contacts
        </button>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Total contacts", value: stats.total, icon: <Users size={18} /> },
          { label: "SMS marketing opted in", value: stats.smsOptedIn, icon: <ShieldCheck size={18} /> },
          { label: "WhatsApp opted in", value: stats.whatsappOptedIn, icon: <MessageCircle size={18} /> },
          { label: "Contacts with tags", value: stats.tagged, icon: <Tag size={18} /> },
        ].map(item => (
          <div className="st-card p-4" key={item.label}>
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-[var(--st-gray)]">{item.label}</p>
              <span className="text-[var(--st-red)]">{item.icon}</span>
            </div>
            <p className="mt-3 mb-0 text-3xl font-bold text-[var(--st-charcoal-dark)]">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="st-card p-4">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--st-gray)]" />
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, phone, ManyChat ID or tag" className="h-11 w-full rounded-xl border border-[var(--st-border)] pl-10 pr-3 text-sm outline-none focus:border-[var(--st-red)]" />
          </div>
          <select value={tagFilter} onChange={event => setTagFilter(event.target.value)} className="h-11 rounded-xl border border-[var(--st-border)] px-3 text-sm">
            <option value="all">All tags</option>
            {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          <select value={consentFilter} onChange={event => setConsentFilter(event.target.value)} className="h-11 rounded-xl border border-[var(--st-border)] px-3 text-sm">
            <option value="all">All consent statuses</option>
            <option value="sms">SMS marketing opted in</option>
            <option value="no-sms">No SMS marketing consent</option>
            <option value="whatsapp">WhatsApp opted in</option>
          </select>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="m-0 text-xs font-semibold text-[var(--st-charcoal-dark)]">{filtered.length} contacts</p>
          <p className="m-0 text-[10px] text-[var(--st-gray)]">Synced from ManyChat WhatsApp</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--st-gray)]"><RefreshCw size={16} className="animate-spin" /> Loading contacts...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ContactRound size={30} className="mx-auto text-[var(--st-gray)]" />
            <p className="mt-3 mb-1 text-sm font-semibold text-[var(--st-charcoal-dark)]">{contacts.length ? "No matching contacts" : "No ManyChat contacts yet"}</p>
            <p className="m-0 text-xs text-[var(--st-gray)]">{contacts.length ? "Try changing your search or filters." : "Contacts will appear here when your ManyChat WhatsApp automation sends its first successful sync."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--st-border)] text-[9px] uppercase tracking-wider text-[var(--st-gray)]">
                  <th className="px-3 py-3 font-semibold">Contact</th>
                  <th className="px-3 py-3 font-semibold">WhatsApp number</th>
                  <th className="px-3 py-3 font-semibold">ManyChat tags</th>
                  <th className="px-3 py-3 font-semibold">SMS consent</th>
                  <th className="px-3 py-3 font-semibold">Last synced</th>
                  <th className="px-3 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(contact => (
                  <tr key={contact.id} className="border-b border-[var(--st-border)] last:border-0 hover:bg-[var(--st-bg-soft)]">
                    <td className="px-3 py-4">
                      <p className="m-0 text-xs font-semibold text-[var(--st-charcoal-dark)]">{contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unnamed contact"}</p>
                      <p className="mt-1 mb-0 text-[9px] text-[var(--st-gray)]">ID: {contact.manychat_contact_id}</p>
                    </td>
                    <td className="px-3 py-4 text-xs">{contact.phone_e164}</td>
                    <td className="px-3 py-4">
                      <div className="flex max-w-[230px] flex-wrap gap-1">
                        {(contact.tags || []).length ? contact.tags.map(tag => <span key={tag} className="rounded-full bg-[var(--st-bg-soft)] px-2 py-1 text-[9px] text-[var(--st-charcoal-dark)]">{tag}</span>) : <span className="text-[10px] text-[var(--st-gray)]">No tags</span>}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      {contact.sms_marketing_opt_in ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[9px] font-semibold text-green-700"><ShieldCheck size={11} /> Opted in</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700"><ShieldAlert size={11} /> Not opted in</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-[10px] text-[var(--st-gray)]">{formatDate(contact.synced_at)}</td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-2">
                        <a href={`tel:${contact.phone_e164}`} className="st-icon-button" aria-label={`Call ${contact.full_name || contact.phone_e164}`}><Phone size={15} /></a>
                        <button type="button" onClick={() => openWhatsApp(contact.phone_e164)} className="st-icon-button" aria-label={`Open WhatsApp for ${contact.full_name || contact.phone_e164}`}><MessageCircle size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-4 text-[10px] text-[var(--st-gray)]">SMS consent is tracked separately from WhatsApp opt-in. Contacts without explicit SMS marketing consent remain excluded from SMS campaign recipients.</p>
    </main>
  );
}
