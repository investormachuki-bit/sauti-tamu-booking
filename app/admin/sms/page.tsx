"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Send, Users, CheckCircle2, AlertCircle, RefreshCw, Search, Plus, Trash2, Save, Upload, History, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Recipient = { phone: string; name: string; source?: string };
type Template = { id: string; name: string; category: string; message: string };
type Log = { id: string; recipient_name: string | null; recipient_phone: string; message: string; status: string; provider_status: string | null; created_at: string };

export default function AdminSmsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [manualNumbers, setManualNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("manual");
  const [leadStatus, setLeadStatus] = useState("all");
  const [instrument, setInstrument] = useState("all");
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("general");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<{total:number;accepted:number;failed:number}|null>(null);

  async function request(path: string, body?: unknown) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Your session has expired. Sign in again.");
    const response = await fetch("/api/admin/sms", { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "SMS Centre request failed.");
    return payload;
  }

  async function load() {
    setLoading(true); setError("");
    try { const data = await request("/"); setLogs(data.logs || []); setTemplates(data.templates || []); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load SMS records."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function loadAudience() {
    setError(""); setNotice("");
    try {
      if (audience === "manual") { setRecipients(parseManual(manualNumbers)); return; }
      if (audience === "leads" || audience === "all") {
        const q = supabase.from("leads").select("id,full_name,whatsapp_number,status").not("whatsapp_number","is",null);
        if (leadStatus !== "all") q.eq("status", leadStatus);
        const { data, error } = await q;
        if (error) throw error;
        const leads = (data || []).map(x => ({ phone:x.whatsapp_number, name:x.full_name, source:"Lead" }));
        if (audience === "leads") { setRecipients(dedupe(leads)); return; }
        const { data: students, error: studentError } = await supabase.from("students").select("id,full_name,whatsapp_number,status").not("whatsapp_number","is",null);
        if (studentError) throw studentError;
        setRecipients(dedupe([...leads,...(students || []).map(x=>({phone:x.whatsapp_number,name:x.full_name,source:"Student"}))]));
        return;
      }
      const { data, error } = await supabase.from("students").select("id,full_name,whatsapp_number,status").not("whatsapp_number","is",null);
      if (error) throw error;
      const filtered = (data || []).filter(x => x.whatsapp_number);
      setRecipients(dedupe(filtered.map(x=>({phone:x.whatsapp_number,name:x.full_name,source:"Student"}))));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load contacts."); }
  }

  function parseManual(value: string): Recipient[] {
    return dedupe(value.split(/[\s,;]+/).map(phone=>phone.trim()).filter(Boolean).map(phone=>({phone,name:""})));
  }
  function dedupe(list: Recipient[]) {
    const map = new Map<string,Recipient>();
    for (const r of list) { const key = r.phone.replace(/\D/g,""); if (key) map.set(key,r); }
    return [...map.values()];
  }
  function addManual() { setRecipients(current=>dedupe([...current,...parseManual(manualNumbers)])); setManualNumbers(""); }
  function importCsv(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = String(reader.result || "").split(/\r?\n/).slice(1);
      const parsed = rows.map(row=>{ const cols=row.split(","); return { name:(cols[0]||"").trim(), phone:(cols[1]||"").trim(), source:"CSV" }; }).filter(x=>x.phone);
      setRecipients(current=>dedupe([...current,...parsed]));
      setNotice(`Imported ${parsed.length} contact rows. Review the recipient list before sending.`);
    };
    reader.readAsText(file);
  }
  const visibleRecipients = useMemo(()=>recipients.filter(r=>(r.name+" "+r.phone).toLowerCase().includes(search.toLowerCase())),[recipients,search]);
  const segments = Math.max(1, Math.ceil(message.length / (message.length <= 160 ? 160 : 153)));
  const estimatedSegments = recipients.length * segments;

  async function send() {
    if (!recipients.length || !message.trim()) { setError("Add recipients and write a message first."); return; }
    if (recipients.length > 100) { setError("Please send in batches of 100 recipients or fewer."); return; }
    if (!window.confirm(`Send this SMS to ${recipients.length} unique recipients? Estimated SMS segments: ${estimatedSegments}.`)) return;
    setSending(true); setError(""); setNotice(""); setResults(null);
    try {
      const data = await request("/", { action:"send", recipients, message });
      setResults({total:data.total,accepted:data.accepted,failed:data.failed});
      setNotice(`Sending completed: ${data.accepted} accepted, ${data.failed} failed.`);
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Sending failed."); }
    finally { setSending(false); }
  }
  async function saveTemplate() {
    if (!templateName.trim() || !message.trim()) { setError("Enter a template name and message."); return; }
    setSavingTemplate(true);
    try { await request("/", {action:"save-template",name:templateName,category:templateCategory,message}); setTemplateName(""); await load(); setNotice("Template saved."); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not save template."); }
    finally { setSavingTemplate(false); }
  }
  async function deleteTemplate(id:string) {
    if (!window.confirm("Delete this message template?")) return;
    try { await request("/",{action:"delete-template",id}); await load(); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not delete template."); }
  }

  return <main className="st-content">
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="st-eyebrow">COMMUNICATIONS</p><h1 className="st-page-title mt-2">SMS Centre</h1><p className="st-page-description">Send, manage and review SMS communications through AirTouch.</p></div>
      <button className="st-button st-button-secondary" onClick={load}><RefreshCw size={15}/> Refresh</button>
    </div>
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[["Messages sent",logs.length],["Accepted",logs.filter(x=>x.status==="accepted").length],["Failed",logs.filter(x=>x.status==="failed").length],["Unique recipients",new Set(logs.map(x=>x.recipient_phone)).size]].map(([label,value])=><div className="st-card p-4" key={String(label)}><p className="m-0 text-[10px] font-bold uppercase tracking-wider text-[var(--st-gray)]">{label}</p><p className="mt-2 mb-0 text-3xl font-bold">{value}</p></div>)}
    </div>
    {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mr-2 inline" size={16}/>{error}</div>}
    {notice && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 className="mr-2 inline" size={16}/>{notice}</div>}
    {results && <div className="mb-4 rounded-xl bg-[var(--st-bg-soft)] p-4 text-sm">Batch summary: <b>{results.accepted}</b> accepted · <b>{results.failed}</b> failed · {results.total} attempted.</div>}
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <section className="st-card p-5">
        <div className="mb-5 flex items-center gap-3"><div className="rounded-full bg-[var(--st-bg-soft)] p-3 text-[var(--st-red)]"><Send size={18}/></div><div><h2 className="m-0 text-base font-semibold">Compose SMS</h2><p className="mt-1 mb-0 text-xs text-[var(--st-gray)]">Personalized bulk messaging and manual recipients.</p></div></div>
        <label className="mb-2 block text-xs font-semibold">Recipient source</label>
        <select className="mb-4 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm" value={audience} onChange={e=>setAudience(e.target.value)}>
          <option value="manual">Manual numbers</option><option value="leads">Leads</option><option value="students">Students</option><option value="all">Leads + Students</option>
        </select>
        {(audience==="leads"||audience==="all") && <div className="mb-4"><label className="mb-2 block text-xs font-semibold">Lead status</label><select className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" value={leadStatus} onChange={e=>setLeadStatus(e.target.value)}><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="registered">Registered</option></select></div>}
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="st-button st-button-secondary" onClick={loadAudience}><Users size={15}/> Load audience</button>
          <label className="st-button st-button-secondary cursor-pointer"><Upload size={15}/> Import CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={e=>importCsv(e.target.files?.[0])}/></label>
        </div>
        <label className="mb-2 block text-xs font-semibold">Add numbers manually</label>
        <textarea className="mb-2 min-h-24 w-full rounded-xl border border-gray-200 p-3 text-sm" placeholder={"0712345678\n254712345678\n+254723456789"} value={manualNumbers} onChange={e=>setManualNumbers(e.target.value)} />
        <button className="st-button st-button-secondary mb-5" onClick={addManual}><Plus size={15}/> Add numbers to recipients</button>
        <div className="mb-4 flex items-center justify-between"><label className="text-xs font-semibold">Recipients ({recipients.length})</label><button className="text-xs text-[var(--st-red)]" onClick={()=>setRecipients([])}>Clear all</button></div>
        <input className="mb-2 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" placeholder="Search recipient list..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="mb-5 max-h-48 overflow-auto rounded-xl border border-gray-100">
          {visibleRecipients.length ? visibleRecipients.map((r,i)=><div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-xs" key={r.phone+i}><span><b>{r.name||"Manual recipient"}</b><span className="ml-2 text-gray-500">{r.phone}</span></span><button onClick={()=>setRecipients(current=>current.filter(x=>x.phone!==r.phone))} aria-label="Remove recipient"><Trash2 size={14}/></button></div>) : <p className="p-4 text-xs text-gray-500">No recipients loaded.</p>}
        </div>
        <div className="mb-2 flex items-center justify-between"><label className="text-xs font-semibold">Message</label><span className="text-[10px] text-gray-500">{message.length}/480 characters</span></div>
        <textarea className="min-h-36 w-full rounded-xl border border-gray-200 p-3 text-sm leading-relaxed" maxLength={480} placeholder="Write your message. Use {{full_name}} to personalize..." value={message} onChange={e=>setMessage(e.target.value)}/>
        <p className="mt-2 text-[10px] text-gray-500">Estimated {segments} SMS segment(s) per recipient · {estimatedSegments} total segments. Standard GSM estimate; actual carrier billing may vary.</p>
        <div className="mt-4 flex flex-wrap gap-2"><button className="st-button st-button-primary" disabled={sending||!recipients.length||!message.trim()} onClick={send}>{sending?<RefreshCw size={15} className="animate-spin"/>:<Send size={15}/>} {sending?"Sending...":"Review & Send"}</button><button className="st-button st-button-secondary" onClick={saveTemplate} disabled={savingTemplate||!message.trim()}><Save size={15}/> Save as template</button></div>
      </section>
      <div className="space-y-5">
        <section className="st-card p-5"><div className="mb-4 flex items-center gap-2"><FileText size={18}/><h2 className="m-0 text-base font-semibold">Message templates</h2></div>
          <div className="mb-3 grid grid-cols-1 gap-2"><input className="h-10 rounded-xl border border-gray-200 px-3 text-sm" placeholder="Template name" value={templateName} onChange={e=>setTemplateName(e.target.value)}/><select className="h-10 rounded-xl border border-gray-200 px-3 text-sm" value={templateCategory} onChange={e=>setTemplateCategory(e.target.value)}><option value="general">General</option><option value="marketing">Marketing</option><option value="booking">Booking</option><option value="follow-up">Follow-up</option><option value="payment">Payment</option></select></div>
          <p className="mb-3 text-[10px] text-gray-500">Save the current message using the button in the composer. Personalization variable: {"{{full_name}}"} .</p>
          <div className="space-y-2">{templates.map(t=><div key={t.id} className="rounded-xl border border-gray-100 p-3"><div className="flex items-center justify-between gap-2"><b className="text-xs">{t.name}</b><div className="flex gap-2"><button className="text-xs text-[var(--st-red)]" onClick={()=>setMessage(t.message)}>Use</button><button onClick={()=>deleteTemplate(t.id)} aria-label="Delete template"><Trash2 size={13}/></button></div></div><p className="mt-2 mb-0 line-clamp-3 text-[11px] text-gray-500">{t.message}</p></div>)}{!templates.length&&<p className="text-xs text-gray-500">No saved templates yet.</p>}</div>
        </section>
        <section className="st-card p-5"><div className="mb-4 flex items-center gap-2"><History size={18}/><h2 className="m-0 text-base font-semibold">Recent SMS activity</h2></div>
          <div className="space-y-3">{logs.slice(0,10).map(log=><div key={log.id} className="border-b border-gray-100 pb-3"><div className="flex items-center justify-between gap-2"><b className="text-xs">{log.recipient_name||log.recipient_phone}</b><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${log.status==="accepted"?"bg-green-50 text-green-700":"bg-red-50 text-red-700"}`}>{log.status}</span></div><p className="mt-1 mb-1 text-[11px] text-gray-500">{log.recipient_phone} · {new Date(log.created_at).toLocaleString()}</p><p className="m-0 line-clamp-2 text-xs">{log.message}</p></div>)}{!logs.length&&<p className="text-xs text-gray-500">No SMS history yet.</p>}</div>
        </section>
      </div>
    </div>
    <p className="mt-5 text-[10px] text-gray-500">AirTouch acceptance is recorded separately from handset delivery. The current provider API response confirms acceptance, not final delivery.</p>
  </main>;
}
