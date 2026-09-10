"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  Image as ImageIcon,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Send,
  Stamp,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type EmailTemplate = {
  id: string;
  template_key: string;
  name: string;
  category: string;
  enabled: boolean;
  subject: string;
  body: string;
  variables: string[];
  include_poster: boolean;
  poster_url: string | null;
  click_url: string | null;
  created_at?: string;
  updated_at?: string;
};

type BusinessSettings = {
  business_name: string;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  stamp_url: string | null;
  receipt_footer: string | null;
};

const CATEGORIES = [
  "TRIAL",
  "TRIAL OUTCOME",
  "REGISTRATION",
  "PAYMENTS",
  "STUDENT",
];

const AVAILABLE_VARIABLES = [
  ["full_name", "Student / lead name"],
  ["instrument", "Instrument"],
  ["lesson_date", "Lesson date"],
  ["lesson_time", "Lesson time"],
  ["programme", "Programme name"],
  ["course_fee", "Course fee"],
  ["payment_date", "Payment date"],
  ["amount_paid", "Current payment"],
  ["total_paid", "Total paid to date"],
  ["balance", "Remaining balance"],
  ["payment_method", "Payment method"],
  ["payment_reference", "Payment reference"],
  ["registration_date", "Registration date"],
  ["start_date", "Programme start date"],
  ["end_date", "Programme end date"],
  ["payment_history", "Dynamic payment history table"],
  ["lesson_details", "Dynamic lesson details block"],
  ["course_summary", "Dynamic course summary block"],
  ["student_balance", "Dynamic balance block"],
] as const;

const SAMPLE_DATA: Record<string, string> = {
  full_name: "Jane Wanjiku",
  instrument: "Piano",
  lesson_date: "18 September 2026",
  lesson_time: "10:00 AM – 11:00 AM",
  programme: "3 Month Training Programme",
  course_fee: "KSh 26,850",
  payment_date: "10 September 2026",
  amount_paid: "KSh 5,000",
  total_paid: "KSh 10,000",
  balance: "KSh 16,850",
  payment_method: "M-Pesa",
  payment_reference: "QWE123ABC",
  registration_date: "10 September 2026",
  start_date: "14 September 2026",
  end_date: "14 December 2026",
  payment_history:
    "Payment history will be pulled from the student's recorded payments.",
  lesson_details:
    "Lesson: Piano • 18 September 2026 • 10:00 AM – 11:00 AM",
  course_summary:
    "3 Month Training Programme • Piano • 36 practical lessons",
  student_balance: "Balance: KSh 16,850",
};

function normalizeVariables(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).replace(/^{{|}}$/g, "").trim())
    .filter(Boolean);
}

function substituteSample(text: string) {
  return text.replace(/{{\s*([^}]+?)\s*}}/g, (_, key: string) => {
    return SAMPLE_DATA[key.trim()] ?? `{{${key.trim()}}}`;
  });
}

function labelForVariable(variable: string) {
  return (
    AVAILABLE_VARIABLES.find(([key]) => key === variable)?.[1] ??
    variable
  );
}

function getSignedAssetUrl(path: string | null) {
  if (!path) return Promise.resolve(null);
  if (/^https?:\/\//i.test(path)) return Promise.resolve(path);

  return supabase.storage
    .from("business-assets")
    .createSignedUrl(path, 3600)
    .then(({ data }) => data?.signedUrl ?? null);
}

function categoryClasses(category: string) {
  if (category === "PAYMENTS")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (category === "REGISTRATION")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (category === "STUDENT")
    return "bg-blue-50 text-blue-700 border-blue-200";
  if (category === "TRIAL OUTCOME")
    return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-[var(--st-bg-soft)] text-[var(--st-red)] border-[var(--st-border)]";
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [business, setBusiness] = useState<BusinessSettings | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);

  const posterInputRef = useRef<HTMLInputElement | null>(null);

  const selectedTemplate =
    templates.find((template) => template.id === selectedId) ?? null;

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return templates.filter((template) => {
      if (
        categoryFilter !== "ALL" &&
        template.category !== categoryFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        template.name,
        template.template_key,
        template.category,
        template.subject,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [templates, search, categoryFilter]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [templatesResult, businessResult] = await Promise.all([
        supabase
          .from("email_templates")
          .select(
            "id, template_key, name, category, enabled, subject, body, variables, include_poster, poster_url, click_url, created_at, updated_at"
          )
          .order("category", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("business_settings")
          .select(
            "business_name, phone, whatsapp_number, email, website, logo_url, stamp_url, receipt_footer"
          )
          .eq("id", true)
          .maybeSingle(),
      ]);

      if (templatesResult.error) throw templatesResult.error;
      if (businessResult.error) throw businessResult.error;

      const loadedTemplates = (templatesResult.data ?? []).map((item) => ({
        ...item,
        variables: normalizeVariables(item.variables),
      })) as EmailTemplate[];

      setTemplates(loadedTemplates);
      setBusiness((businessResult.data ?? null) as BusinessSettings | null);

      if (loadedTemplates.length) {
        setSelectedId((current) => current ?? loadedTemplates[0].id);
      }

      if (businessResult.data) {
        const [logo, stamp] = await Promise.all([
          getSignedAssetUrl(businessResult.data.logo_url),
          getSignedAssetUrl(businessResult.data.stamp_url),
        ]);
        setLogoPreview(logo);
        setStampPreview(stamp);
      }
    } catch (loadError) {
      console.error("Email templates load error:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "We couldn't load email templates."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateSelected(patch: Partial<EmailTemplate>) {
    if (!selectedId) return;

    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedId
          ? { ...template, ...patch }
          : template
      )
    );
  }

  function createTemplate() {
    const temporaryId = `new-${Date.now()}`;

    const template: EmailTemplate = {
      id: temporaryId,
      template_key: `custom_${Date.now()}`,
      name: "New Email Template",
      category: "TRIAL",
      enabled: true,
      subject: "Sauti Tamu Piano Center",
      body: "Hello {{full_name}},\n\nWrite your message here.",
      variables: ["full_name"],
      include_poster: false,
      poster_url: null,
      click_url: null,
    };

    setTemplates((current) => [template, ...current]);
    setSelectedId(temporaryId);
    setMessage("");
    setError("");
  }

  async function saveTemplate() {
    if (!selectedTemplate) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        template_key: selectedTemplate.template_key.trim(),
        name: selectedTemplate.name.trim(),
        category: selectedTemplate.category,
        enabled: selectedTemplate.enabled,
        subject: selectedTemplate.subject,
        body: selectedTemplate.body,
        variables: selectedTemplate.variables,
        include_poster: selectedTemplate.include_poster,
        poster_url: selectedTemplate.poster_url,
        click_url: selectedTemplate.click_url?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (
        !payload.template_key ||
        !payload.name ||
        !payload.subject ||
        !payload.body
      ) {
        throw new Error("Name, key, subject and body are required.");
      }

      if (selectedTemplate.id.startsWith("new-")) {
        const { data, error: insertError } = await supabase
          .from("email_templates")
          .insert(payload)
          .select(
            "id, template_key, name, category, enabled, subject, body, variables, include_poster, poster_url, click_url, created_at, updated_at"
          )
          .single();

        if (insertError) throw insertError;

        const inserted = {
          ...data,
          variables: normalizeVariables(data.variables),
        } as EmailTemplate;

        setTemplates((current) =>
          current.map((template) =>
            template.id === selectedTemplate.id ? inserted : template
          )
        );
        setSelectedId(inserted.id);
      } else {
        const { data, error: updateError } = await supabase
          .from("email_templates")
          .update(payload)
          .eq("id", selectedTemplate.id)
          .select(
            "id, template_key, name, category, enabled, subject, body, variables, include_poster, poster_url, click_url, created_at, updated_at"
          )
          .single();

        if (updateError) throw updateError;

        const updated = {
          ...data,
          variables: normalizeVariables(data.variables),
        } as EmailTemplate;

        setTemplates((current) =>
          current.map((template) =>
            template.id === updated.id ? updated : template
          )
        );
      }

      setMessage("Email template saved.");
    } catch (saveError) {
      console.error("Email template save error:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "We couldn't save this email template."
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadPoster(file: File) {
    if (!selectedTemplate) return;

    setUploadingPoster(true);
    setError("");
    setMessage("");

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Poster must be an image file.");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Poster must be smaller than 5 MB.");
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `email-posters/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("business-assets")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const oldPath = selectedTemplate.poster_url;

      if (
        oldPath &&
        !/^https?:\/\//i.test(oldPath) &&
        oldPath !== path
      ) {
        await supabase.storage.from("business-assets").remove([oldPath]);
      }

      updateSelected({
        poster_url: path,
        include_poster: true,
      });

      setMessage("Poster uploaded. Save the template to keep the change.");
    } catch (uploadError) {
      console.error("Poster upload error:", uploadError);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "We couldn't upload the poster."
      );
    } finally {
      setUploadingPoster(false);
    }
  }

  async function removePoster() {
    if (!selectedTemplate?.poster_url) return;

    const oldPath = selectedTemplate.poster_url;

    if (!/^https?:\/\//i.test(oldPath)) {
      await supabase.storage.from("business-assets").remove([oldPath]);
    }

    updateSelected({
      poster_url: null,
      include_poster: false,
    });
    setMessage("Poster removed. Save the template to keep the change.");
  }

  function addVariable(variable: string) {
    if (!selectedTemplate) return;
    if (selectedTemplate.variables.includes(variable)) return;

    updateSelected({
      variables: [...selectedTemplate.variables, variable],
      body:
        selectedTemplate.body +
        (selectedTemplate.body.endsWith("\n") ? "" : "\n") +
        `{{${variable}}}`,
    });
  }

  function removeVariable(variable: string) {
    if (!selectedTemplate) return;

    updateSelected({
      variables: selectedTemplate.variables.filter(
        (item) => item !== variable
      ),
    });
  }

  async function sendTestEmail() {
    setMessage(
      "Preview is ready. Test sending will be connected to the shared email renderer after the template editor is in place."
    );
  }

  return (
    <main className="st-content">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="st-eyebrow">COMMUNICATIONS</p>
          <h1 className="st-page-title mt-2">Email Templates</h1>
          <p className="st-page-description">
            Manage transactional and follow-up emails from one branded template system.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={createTemplate}
            className="st-button st-button-primary"
          >
            <Plus size={14} />
            New template
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="st-button st-button-secondary"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] text-emerald-700">
          <Check size={14} />
          {message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <section className="st-card overflow-hidden">
          <div className="border-b border-[var(--st-border)] p-4">
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--st-gray)]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search templates..."
                className="w-full rounded-xl border border-[var(--st-border)] bg-white py-3 pl-9 pr-3 text-[10px] outline-none focus:border-[var(--st-red)]"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {["ALL", ...CATEGORIES].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`rounded-full border px-2.5 py-1.5 text-[8px] font-bold ${
                    categoryFilter === category
                      ? "border-[var(--st-red)] bg-[var(--st-red)] text-white"
                      : "border-[var(--st-border)] bg-white text-[var(--st-gray)]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[720px] overflow-y-auto">
            {loading ? (
              <div className="flex min-h-[250px] items-center justify-center gap-2 text-[10px] text-[var(--st-gray)]">
                <Loader2 size={16} className="animate-spin" />
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-8 text-center text-[10px] text-[var(--st-gray)]">
                No templates found.
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full border-b border-[var(--st-border)] p-4 text-left transition ${
                    selectedId === template.id
                      ? "bg-[var(--st-bg-soft)]"
                      : "bg-white hover:bg-[var(--st-bg-soft)]/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-[var(--st-charcoal-dark)]">
                        {template.name}
                      </p>
                      <p className="mt-1 truncate text-[8px] text-[var(--st-gray)]">
                        {template.template_key}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-1 text-[7px] font-bold ${categoryClasses(
                        template.category
                      )}`}
                    >
                      {template.category}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-[9px] leading-relaxed text-[var(--st-gray)]">
                    {template.subject}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`text-[8px] font-bold ${
                        template.enabled
                          ? "text-emerald-600"
                          : "text-gray-400"
                      }`}
                    >
                      {template.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span className="text-[8px] text-[var(--st-gray)]">
                      {template.variables.length} variable
                      {template.variables.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {selectedTemplate ? (
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_430px]">
            <section className="st-card p-5">
              <div className="flex flex-col gap-4 border-b border-[var(--st-border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="st-eyebrow">TEMPLATE EDITOR</p>
                  <h2 className="mt-2 text-[18px] font-bold text-[var(--st-charcoal-dark)]">
                    {selectedTemplate.name}
                  </h2>
                  <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                    {selectedTemplate.template_key}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void sendTestEmail()}
                    className="st-button st-button-secondary !px-3 !py-2 text-[9px]"
                  >
                    <Send size={13} />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveTemplate()}
                    disabled={saving}
                    className="st-button st-button-primary !px-3 !py-2 text-[9px] disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Save
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Template name
                  </span>
                  <input
                    value={selectedTemplate.name}
                    onChange={(event) =>
                      updateSelected({ name: event.target.value })
                    }
                    className="w-full rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[10px] outline-none focus:border-[var(--st-red)]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Template key
                  </span>
                  <input
                    value={selectedTemplate.template_key}
                    onChange={(event) =>
                      updateSelected({
                        template_key: event.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "_"),
                      })
                    }
                    className="w-full rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[10px] font-mono outline-none focus:border-[var(--st-red)]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Category
                  </span>
                  <select
                    value={selectedTemplate.category}
                    onChange={(event) =>
                      updateSelected({ category: event.target.value })
                    }
                    className="w-full rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[10px] outline-none focus:border-[var(--st-red)]"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label className="flex items-end gap-3 rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTemplate.enabled}
                    onChange={(event) =>
                      updateSelected({ enabled: event.target.checked })
                    }
                    className="h-4 w-4 accent-[var(--st-red)]"
                  />
                  <span>
                    <span className="block text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                      Template enabled
                    </span>
                    <span className="mt-0.5 block text-[8px] text-[var(--st-gray)]">
                      Disabled templates are not eligible for automated sending.
                    </span>
                  </span>
                </label>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                  Email subject
                </span>
                <input
                  value={selectedTemplate.subject}
                  onChange={(event) =>
                    updateSelected({ subject: event.target.value })
                  }
                  placeholder="Email subject..."
                  className="w-full rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[11px] outline-none focus:border-[var(--st-red)]"
                />
              </label>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                    Body
                  </span>
                  <span className="text-[8px] text-[var(--st-gray)]">
                    Plain text + {{variable}} placeholders
                  </span>
                </div>

                <textarea
                  value={selectedTemplate.body}
                  onChange={(event) =>
                    updateSelected({ body: event.target.value })
                  }
                  rows={15}
                  placeholder="Write the email body here..."
                  className="w-full resize-y rounded-xl border border-[var(--st-border)] bg-white p-4 text-[11px] leading-relaxed outline-none focus:border-[var(--st-red)]"
                />
              </div>

              <div className="mt-5 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] p-4">
                <div className="flex items-start gap-3">
                  <Paperclip
                    size={15}
                    className="mt-0.5 shrink-0 text-[var(--st-red)]"
                  />
                  <div className="min-w-0">
                    <p className="m-0 text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                      Dynamic data blocks
                    </p>
                    <p className="mt-1 text-[8px] leading-relaxed text-[var(--st-gray)]">
                      Add a variable below when a template needs data supplied by the
                      application. Payment history is a special dynamic block and will
                      be rendered from the student's actual recorded payments.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map(([key, label]) => {
                    const active = selectedTemplate.variables.includes(key);

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          active
                            ? removeVariable(key)
                            : addVariable(key)
                        }
                        className={`rounded-xl border px-3 py-2 text-left ${
                          active
                            ? "border-[var(--st-red)] bg-white"
                            : "border-[var(--st-border)] bg-white/60"
                        }`}
                      >
                        <span className="block font-mono text-[8px] font-bold text-[var(--st-red)]">
                          {"{{"}
                          {key}
                          {"}}"}
                        </span>
                        <span className="mt-1 block text-[7px] text-[var(--st-gray)]">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--st-border)] p-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={15} className="text-[var(--st-red)]" />
                    <p className="m-0 text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                      Optional poster
                    </p>
                  </div>

                  <p className="mt-2 text-[8px] leading-relaxed text-[var(--st-gray)]">
                    Upload an image to appear between the email body and optional CTA.
                  </p>

                  {selectedTemplate.poster_url ? (
                    <div className="mt-4">
                      <div className="overflow-hidden rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)]">
                        <PosterPreview path={selectedTemplate.poster_url} />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => posterInputRef.current?.click()}
                          className="st-button st-button-secondary !px-3 !py-2 text-[8px]"
                        >
                          <Upload size={12} />
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => void removePoster()}
                          className="st-button st-button-secondary !px-3 !py-2 text-[8px] !text-red-600"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => posterInputRef.current?.click()}
                      className="mt-4 flex w-full min-h-[110px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--st-border)] bg-[var(--st-bg-soft)] text-[var(--st-gray)]"
                    >
                      {uploadingPoster ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <Upload size={20} />
                      )}
                      <span className="mt-2 text-[8px] font-bold">
                        {uploadingPoster ? "Uploading..." : "Upload poster"}
                      </span>
                      <span className="mt-1 text-[7px]">
                        Image files up to 5 MB
                      </span>
                    </button>
                  )}

                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void uploadPoster(file);
                    }}
                  />

                  <label className="mt-4 block">
                    <span className="mb-2 block text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      CTA / click URL (optional)
                    </span>
                    <input
                      value={selectedTemplate.click_url ?? ""}
                      onChange={(event) =>
                        updateSelected({
                          click_url: event.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-[var(--st-border)] bg-white px-3 py-3 text-[9px] outline-none focus:border-[var(--st-red)]"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-[var(--st-border)] p-4">
                  <div className="flex items-center gap-2">
                    <Stamp size={15} className="text-[var(--st-red)]" />
                    <p className="m-0 text-[9px] font-bold text-[var(--st-charcoal-dark)]">
                      Global branding
                    </p>
                  </div>

                  <p className="mt-2 text-[8px] leading-relaxed text-[var(--st-gray)]">
                    Logo and official stamp come from Business Settings and are shared
                    across email templates. They are not duplicated per template.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] p-3">
                      <p className="text-[7px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                        Logo
                      </p>
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Sauti Tamu logo"
                          className="mt-2 h-16 w-full object-contain"
                        />
                      ) : (
                        <div className="mt-2 flex h-16 items-center justify-center text-[7px] text-[var(--st-gray)]">
                          No logo
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-bg-soft)] p-3">
                      <p className="text-[7px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                        Stamp
                      </p>
                      {stampPreview ? (
                        <img
                          src={stampPreview}
                          alt="Sauti Tamu official stamp"
                          className="mt-2 h-16 w-full object-contain"
                        />
                      ) : (
                        <div className="mt-2 flex h-16 items-center justify-center text-[7px] text-[var(--st-gray)]">
                          No stamp
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-dashed border-[var(--st-border)] bg-[var(--st-bg-soft)] p-3">
                    <p className="text-[8px] font-bold text-[var(--st-charcoal-dark)]">
                      Branded shell
                    </p>
                    <p className="mt-1 text-[8px] leading-relaxed text-[var(--st-gray)]">
                      Logo at top → template body → optional dynamic blocks → optional
                      poster → optional CTA → official stamp → business footer.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="st-card overflow-hidden">
              <div className="border-b border-[var(--st-border)] p-4">
                <p className="st-eyebrow">LIVE PREVIEW</p>
                <p className="mt-1 text-[9px] text-[var(--st-gray)]">
                  Sample data is shown here. Real recipients will receive live database
                  values through the shared renderer.
                </p>
              </div>

              <div className="bg-[#f4f4f4] p-4 sm:p-6">
                <div className="mx-auto max-w-[560px] overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-sm">
                  <div className="border-b border-[#eeeeee] px-6 py-5 text-center">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Sauti Tamu"
                        className="mx-auto h-16 max-w-[190px] object-contain"
                      />
                    ) : (
                      <div className="text-[12px] font-bold text-[var(--st-red)]">
                        SAUTI TAMU
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-6">
                    <p className="text-[14px] font-bold text-[#202020]">
                      {substituteSample(selectedTemplate.subject)}
                    </p>

                    <div className="mt-5 whitespace-pre-wrap text-[11px] leading-[1.75] text-[#444]">
                      {substituteSample(selectedTemplate.body)}
                    </div>

                    {selectedTemplate.variables.includes("payment_history") && (
                      <div className="mt-5 overflow-hidden rounded-xl border border-[#e6e6e6]">
                        <div className="bg-[#f8f8f8] px-4 py-3 text-[9px] font-bold uppercase tracking-[0.08em]">
                          Payment History
                        </div>
                        <div className="grid grid-cols-[1fr_auto] border-t border-[#e6e6e6] px-4 py-3 text-[9px]">
                          <span>10 Sep 2026 · M-Pesa</span>
                          <span>KSh 5,000</span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] border-t border-[#e6e6e6] px-4 py-3 text-[9px]">
                          <span>8 Sep 2026 · M-Pesa</span>
                          <span>KSh 5,000</span>
                        </div>
                      </div>
                    )}

                    {selectedTemplate.include_poster && selectedTemplate.poster_url && (
                      <div className="mt-6 overflow-hidden rounded-xl border border-[#eeeeee]">
                        <PosterPreview path={selectedTemplate.poster_url} />
                      </div>
                    )}

                    {selectedTemplate.click_url && (
                      <div className="mt-6 text-center">
                        <span className="inline-flex rounded-xl bg-[var(--st-red)] px-5 py-3 text-[10px] font-bold text-white">
                          Continue
                        </span>
                      </div>
                    )}

                    <div className="mt-8 border-t border-[#eeeeee] pt-6 text-center">
                      {stampPreview ? (
                        <img
                          src={stampPreview}
                          alt="Official stamp"
                          className="mx-auto h-20 max-w-[150px] object-contain"
                        />
                      ) : (
                        <div className="text-[9px] text-[#aaa]">
                          Official stamp
                        </div>
                      )}

                      <p className="mt-3 text-[9px] font-bold text-[#333]">
                        {business?.business_name || "Sauti Tamu Piano Center"}
                      </p>
                      {business?.receipt_footer && (
                        <p className="mt-1 whitespace-pre-wrap text-[8px] leading-relaxed text-[#888]">
                          {business.receipt_footer}
                        </p>
                      )}
                      {(business?.email || business?.phone) && (
                        <p className="mt-2 text-[8px] text-[#999]">
                          {[business.email, business.phone]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--st-border)] p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[var(--st-bg-soft)] p-3">
                    <p className="text-[7px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Mode
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                      {selectedTemplate.variables.length
                        ? "Dynamic"
                        : "Static"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--st-bg-soft)] p-3">
                    <p className="text-[7px] font-bold uppercase tracking-[0.08em] text-[var(--st-gray)]">
                      Poster
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-[var(--st-charcoal-dark)]">
                      {selectedTemplate.include_poster ? "Included" : "None"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <section className="st-card flex min-h-[500px] items-center justify-center p-8 text-center">
            <div>
              <Mail size={28} className="mx-auto text-[var(--st-gray)]" />
              <p className="mt-4 text-[13px] font-bold text-[var(--st-charcoal-dark)]">
                Select an email template
              </p>
              <p className="mt-2 text-[9px] text-[var(--st-gray)]">
                Choose a template from the list or create a new one.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function PosterPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void getSignedAssetUrl(path).then((signed) => {
      if (mounted) setUrl(signed);
    });

    return () => {
      mounted = false;
    };
  }, [path]);

  if (!url) {
    return (
      <div className="flex min-h-[150px] items-center justify-center text-[8px] text-[var(--st-gray)]">
        Loading poster...
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Email poster"
      className="block max-h-[360px] w-full object-contain"
    />
  );
}
