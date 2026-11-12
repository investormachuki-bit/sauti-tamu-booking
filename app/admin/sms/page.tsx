"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Send, Users, CheckCircle2, AlertCircle, RefreshCw, Search, Plus, Trash2, Save, Upload, History, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Recipient = { phone: string; name: string; source?: string; status?: string; instrument?: string; trialStatus?: string; tags?: string[]; smsMarketingOptIn?: boolean };
type ManyChatContact = { id: string; manychat_contact_id: string; phone_e164: string; first_name: string | null; last_name: string | null; full_name: string | null; tags: string[]; whatsapp_opted_in: boolean; sms_marketing_opt_in: boolean; sms_consent_at: string | null; synced_at: string };
type Template = { id: string; name: string; category: string; message: string };
type ManyChatFollowupTemplate = { id: string; day_offset: number; name: string; message: string; enabled: boolean };
type TrialEventTemplate = { id: string; event_key: "trial_rebook" | "trial_attended"; name: string; message: string; enabled: boolean };
type CoreSmsTemplate = { id: string; template_key: "trial_booking_confirmation" | "payment_receipt"; name: string; message: string; enabled: boolean };
type TrialReminderTemplate = { id: string; reminder_key: "trial_reminder_24h" | "trial_reminder_1h" | "trial_reminder_15m"; name: string; message: string; enabled: boolean };
type Log = { id: string; recipient_name: string | null; recipient_phone: string; message: string; status: string; provider_status: string | null; created_at: string };

export default function AdminSmsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [manualNumbers, setManualNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("manual");
  const [leadStatus, setLeadStatus] = useState("all");
  const [studentStatus, setStudentStatus] = useState("all");
  const [studentInstrument, setStudentInstrument] = useState("all");
  const [trialInstrument, setTrialInstrument] = useState("all");
  const [trialStatus, setTrialStatus] = useState("all");
  const [manychatTag, setManychatTag] = useState("all");
  const [manychatContacts, setManychatContacts] = useState<ManyChatContact[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [manychatFollowupTemplates, setManychatFollowupTemplates] = useState<ManyChatFollowupTemplate[]>([]);
  const [trialEventTemplates, setTrialEventTemplates] = useState<TrialEventTemplate[]>([]);
  const [coreSmsTemplates, setCoreSmsTemplates] = useState<CoreSmsTemplate[]>([]);
  const [trialReminderTemplates, setTrialReminderTemplates] = useState<TrialReminderTemplate[]>([]);
  const [followupStats, setFollowupStats] = useState<Record<string, number>>({});
  const [savingFollowupId, setSavingFollowupId] = useState<string | null>(null);
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
    try { const data = await request("/"); setLogs(data.logs || []); setTemplates(data.templates || []); setManychatFollowupTemplates(data.manychatFollowupTemplates || []); setTrialEventTemplates(data.trialEventTemplates || []); setCoreSmsTemplates(data.coreTemplates || []); setTrialReminderTemplates(data.trialReminderTemplates || []); setFollowupStats(data.manychatFollowupStats || {}); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load SMS records."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function loadAudience() {
    setError(""); setNotice("");
    try {
      if (audience === "manual") { const loaded=parseManual(manualNumbers); setRecipients(loaded); setSelectedPhones(loaded.map(x=>x.phone)); return; }
      if (audience === "manychat") {
        const data = await request("/");
        const contacts: ManyChatContact[] = data.manychatContacts || [];
        setManychatContacts(contacts);
        const eligible = contacts.filter(contact =>
          contact.sms_marketing_opt_in === true &&
          (manychatTag === "all" || (contact.tags || []).includes(manychatTag))
        );
        const loaded = dedupe(eligible.map(contact => ({
          phone: contact.phone_e164,
          name: contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "",
          source: "ManyChat WhatsApp",
          tags: contact.tags || [],
          smsMarketingOptIn: true,
        })));
        setRecipients(loaded);
        setSelectedPhones(loaded.map(contact => contact.phone));
        setNotice(`Loaded ${loaded.length} SMS-opted-in contacts from ${contacts.length} synced ManyChat WhatsApp contacts. Contacts without explicit SMS consent are excluded.`);
        return;
      }
      const [lr,sr,er,br] = await Promise.all([
        (audience==="leads"||audience==="all"||audience==="trials") ? supabase.from("leads").select("id,full_name,whatsapp_number,status").not("whatsapp_number","is",null) : Promise.resolve({data:[],error:null}),
        (audience==="students"||audience==="all") ? supabase.from("students").select("id,lead_id,full_name,whatsapp_number,status").not("whatsapp_number","is",null) : Promise.resolve({data:[],error:null}),
        (audience==="students"||audience==="all") ? supabase.from("student_enrollments").select("id,student_id,instrument,status,created_at") : Promise.resolve({data:[],error:null}),
        supabase.from("bookings").select("id,lead_id,instrument,status,created_at,attended_at,completed_at")
      ]);
      if(lr.error) throw lr.error; if(sr.error) throw sr.error; if(er.error) throw er.error; if(br.error) throw br.error;
      const latest = (rows:any[], key:string) => { const m=new Map(); [...rows].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).forEach(x=>{if(x[key]&&!m.has(x[key]))m.set(x[key],x);}); return m; };
      const eb=latest(er.data||[],"student_id"); const bb=latest(br.data||[],"lead_id");
      const trial = (b:any) => !b ? "not_booked" : (b.status==="completed"||b.attended_at||b.completed_at) ? "attended" : b.status==="no_show" ? "no_show" : b.status==="cancelled" ? "cancelled" : b.status==="rescheduled" ? "rescheduled" : "booked";
      const leads=(lr.data||[]).map((x:any)=>({phone:x.whatsapp_number,name:x.full_name,source:"Lead",status:x.status})).filter((x:any)=>leadStatus==="all"||x.status===leadStatus);
      const trials=(lr.data||[]).map((x:any)=>{const b=bb.get(x.id);return {phone:x.whatsapp_number,name:x.full_name,source:"Trial",status:x.status,instrument:b?.instrument||"",trialStatus:trial(b)};}).filter((x:any)=>(trialStatus==="all"||x.trialStatus===trialStatus)&&(trialInstrument==="all"||x.instrument===trialInstrument));
      const students=(sr.data||[]).map((x:any)=>{const e=eb.get(x.id);const b=x.lead_id?bb.get(x.lead_id):null;return {phone:x.whatsapp_number,name:x.full_name,source:"Student",status:x.status,instrument:e?.instrument||""};}).filter((x:any)=>(studentStatus==="all"||x.status===studentStatus)&&(studentInstrument==="all"||x.instrument===studentInstrument));
      const loaded=dedupe(audience==="leads"?leads:audience==="students"?students:audience==="trials"?trials:[...leads,...students,...trials]);
      setRecipients(loaded); setSelectedPhones(loaded.map((x:any)=>x.phone));
      setNotice("Loaded "+loaded.length+" contacts matching your filters. All are selected; untick any contacts you want to exclude.");
    } catch(e) { setError(e instanceof Error ? e.message : "Could not load contacts."); }
  }
  function parseManual(value: string): Recipient[] {
    return dedupe(value.split(/[\s,;]+/).map(phone=>phone.trim()).filter(Boolean).map(phone=>({phone,name:""})));
  }
  function dedupe(list: Recipient[]) {
    const map = new Map<string,Recipient>();
    for (const r of list) { const key = r.phone.replace(/\D/g,""); if (key) map.set(key,r); }
    return [...map.values()];
  }
  function addManual() { const added=parseManual(manualNumbers); setRecipients(current=>dedupe([...current,...added])); setSelectedPhones(current=>Array.from(new Set([...current,...added.map(x=>x.phone)]))); setManualNumbers(""); }
  function importCsv(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = String(reader.result || "").split(/\r?\n/).slice(1);
      const parsed = rows.map(row=>{ const cols=row.split(","); return { name:(cols[0]||"").trim(), phone:(cols[1]||"").trim(), source:"CSV" }; }).filter(x=>x.phone);
      setRecipients(current=>dedupe([...current,...parsed]));
      setSelectedPhones(current=>Array.from(new Set([...current,...parsed.map(x=>x.phone)])));
      setNotice(`Imported ${parsed.length} contact rows. Review the recipient list before sending.`);
    };
    reader.readAsText(file);
  }
  const visibleRecipients = useMemo(()=>recipients.filter(r=>(r.name+" "+r.phone).toLowerCase().includes(search.toLowerCase())),[recipients,search]);
  const selectedRecipients = recipients.filter(r=>selectedPhones.includes(r.phone));
  const visibleSelected = visibleRecipients.filter(r=>selectedPhones.includes(r.phone));
  const allVisibleSelected = visibleRecipients.length>0 && visibleSelected.length===visibleRecipients.length;
  const segments = Math.max(1, Math.ceil(message.length / (message.length <= 160 ? 160 : 153)));
  const estimatedSegments = selectedRecipients.length * segments;

  async function send() {
    if (!selectedRecipients.length || !message.trim()) { setError("Select recipients and write a message first."); return; }
    if (selectedRecipients.length > 100) { setError("Please send in batches of 100 recipients or fewer."); return; }
    if (!window.confirm(`Send this SMS to ${selectedRecipients.length} selected unique recipients? Estimated SMS segments: ${estimatedSegments}.`)) return;
    setSending(true); setError(""); setNotice(""); setResults(null);
    try {
      const data = await request("/", { action:"send", recipients:selectedRecipients, message });
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
  async function saveManyChatFollowup(template: ManyChatFollowupTemplate) {
    setSavingFollowupId(template.id); setError(""); setNotice("");
    try {
      await request("/", { action: "save-manychat-followup-template", id: template.id, message: template.message, enabled: template.enabled });
      setNotice(`Day ${template.day_offset} ManyChat follow-up template saved.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save ManyChat follow-up template."); }
    finally { setSavingFollowupId(null); }
  }


  async function saveTrialReminderTemplate(template: TrialReminderTemplate) {
    setSavingFollowupId(template.id); setError(""); setNotice("");
    try {
      await request("/", { action: "save-trial-reminder-template", id: template.id, message: template.message, enabled: template.enabled });
      setNotice(`${template.name} saved.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save trial reminder template."); }
    finally { setSavingFollowupId(null); }
  }

  async function saveCoreSmsTemplate(template: CoreSmsTemplate) {
    setSavingFollowupId(template.id); setError(""); setNotice("");
    try {
      await request("/", { action: "save-core-sms-template", id: template.id, message: template.message, enabled: template.enabled });
      setNotice(`${template.name} saved.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save SMS template."); }
    finally { setSavingFollowupId(null); }
  }

  async function saveTrialEventTemplate(template: TrialEventTemplate) {
    setSavingFollowupId(template.id); setError(""); setNotice("");
    try {
      await request("/", { action: "save-trial-event-template", id: template.id, message: template.message, enabled: template.enabled });
      setNotice(`${template.name} saved.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save trial event template."); }
    finally { setSavingFollowupId(null); }
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
          <option value="manual">Manual numbers</option><option value="leads">Leads</option><option value="students">Students</option><option value="trials">Trials</option><option value="all">All audiences</option><option value="manychat">ManyChat WhatsApp contacts</option>
        </select>
        {audience==="manychat" && <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2"><p className="m-0 text-xs font-semibold">ManyChat WhatsApp audience</p><span className="text-[10px] text-gray-500">{manychatContacts.length} synced · {manychatContacts.filter(c=>c.sms_marketing_opt_in).length} SMS opted in</span></div>
          <label className="mb-2 block text-xs font-semibold">Filter by ManyChat tag</label>
          <select className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" value={manychatTag} onChange={e=>setManychatTag(e.target.value)}>
            <option value="all">All tags</option>
            {[...new Set(manychatContacts.flatMap(contact=>contact.tags||[]))].sort().map(tag=><option key={tag} value={tag}>{tag}</option>)}
          </select>
          <p className="mt-2 mb-0 text-[10px] text-gray-600">Only contacts with explicit SMS marketing consent can be loaded for campaign sending. WhatsApp opt-in alone is not SMS consent.</p>
        </div>}
        {(audience==="leads"||audience==="all") && <div className="mb-3"><label className="mb-2 block text-xs font-semibold">Lead status</label><select className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" value={leadStatus} onChange={e=>setLeadStatus(e.target.value)}><option value="all">All statuses</option>{["new","booked","attended","follow_up","interested","registered","not_now","not_interested","no_show"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></div>}
        {(audience==="students"||audience==="all") && <div className="mb-3"><label className="mb-2 block text-xs font-semibold">Student status</label><select className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" value={studentStatus} onChange={e=>setStudentStatus(e.target.value)}><option value="all">All student statuses</option>{["active","registered","completed","paused","inactive"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></div>}
        {(audience==="students"||audience==="all") && <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-semibold">Student instrument</label><select className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" value={studentInstrument} onChange={e=>setStudentInstrument(e.target.value)}><option value="all">All instruments</option><option value="piano">Piano</option><option value="guitar">Guitar</option></select></div></div>}\n        {(audience==="trials"||audience==="all") && <div className="mb-4 rounded-xl border border-gray-100 p-3"><p className="mb-2 text-xs font-semibold">Trial filters</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-semibold">Trial instrument</label><select className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" value={trialInstrument} onChange={e=>setTrialInstrument(e.target.value)}><option value="all">All instruments</option><option value="piano">Piano</option><option value="guitar">Guitar</option></select></div><div><label className="mb-2 block text-xs font-semibold">Trial status</label><select className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" value={trialStatus} onChange={e=>setTrialStatus(e.target.value)}><option value="all">All trial statuses</option><option value="not_booked">No trial booking</option><option value="booked">Booked / confirmed</option><option value="attended">Attended</option><option value="no_show">Missed / no-show</option><option value="cancelled">Cancelled</option><option value="rescheduled">Rescheduled</option></select></div></div></div>}
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="st-button st-button-secondary" onClick={loadAudience}><Users size={15}/> Load audience</button>
          <label className="st-button st-button-secondary cursor-pointer"><Upload size={15}/> Import CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={e=>importCsv(e.target.files?.[0])}/></label>
        </div>
        <label className="mb-2 block text-xs font-semibold">Add numbers manually</label>
        <textarea className="mb-2 min-h-24 w-full rounded-xl border border-gray-200 p-3 text-sm" placeholder={"0712345678\n254712345678\n+254723456789"} value={manualNumbers} onChange={e=>setManualNumbers(e.target.value)} />
        <button className="st-button st-button-secondary mb-5" onClick={addManual}><Plus size={15}/> Add numbers to recipients</button>
        <div className="mb-2 flex items-center justify-between"><label className="text-xs font-semibold">Recipients ({recipients.length}) · {selectedRecipients.length} selected</label><button className="text-xs text-[var(--st-red)]" onClick={()=>{setRecipients([]);setSelectedPhones([]);}}>Clear all</button></div>{recipients.length>0 && <div className="mb-2 flex items-center justify-between rounded-lg bg-[var(--st-bg-soft)] px-3 py-2 text-xs"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={allVisibleSelected} onChange={e=>setSelectedPhones(current=>e.target.checked?Array.from(new Set([...current,...visibleRecipients.map(r=>r.phone)])):current.filter(p=>!visibleRecipients.some(r=>r.phone===p)))} /> Select all {visibleRecipients.length} shown</label><span className="text-gray-500">{selectedRecipients.length} selected total</span></div>}
        <input className="mb-2 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm" placeholder="Search recipient list..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="mb-5 max-h-48 overflow-auto rounded-xl border border-gray-100">
          {visibleRecipients.length ? visibleRecipients.map((r,i)=><div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 text-xs" key={r.phone+i}><label className="flex min-w-0 flex-1 items-center gap-2"><input type="checkbox" checked={selectedPhones.includes(r.phone)} onChange={e=>setSelectedPhones(current=>e.target.checked?[...current,r.phone]:current.filter(p=>p!==r.phone))}/><span className="min-w-0"><b>{r.name||"Manual recipient"}</b><span className="ml-2 text-gray-500">{r.phone}</span><span className="ml-2 text-[10px] text-gray-400">{[r.status,r.instrument,r.trialStatus,...(r.tags||[])].filter(Boolean).join(" · ")}</span></span></label><button onClick={()=>{setRecipients(current=>current.filter(x=>x.phone!==r.phone));setSelectedPhones(current=>current.filter(p=>p!==r.phone));}} aria-label="Remove recipient"><Trash2 size={14}/></button></div>) : <p className="p-4 text-xs text-gray-500">No recipients loaded.</p>}
        </div>
        <div className="mb-2 flex items-center justify-between"><label className="text-xs font-semibold">Message</label><span className="text-[10px] text-gray-500">{message.length}/480 characters</span></div>
        <textarea className="min-h-36 w-full rounded-xl border border-gray-200 p-3 text-sm leading-relaxed" maxLength={480} placeholder="Write your message. Use {{full_name}} to personalize..." value={message} onChange={e=>setMessage(e.target.value)}/>
        <p className="mt-2 text-[10px] text-gray-500">Estimated {segments} SMS segment(s) per recipient · {estimatedSegments} total segments. Standard GSM estimate; actual carrier billing may vary.</p>
        <div className="mt-4 flex flex-wrap gap-2"><button className="st-button st-button-primary" disabled={sending||!selectedRecipients.length||!message.trim()} onClick={send}>{sending?<RefreshCw size={15} className="animate-spin"/>:<Send size={15}/>} {sending?"Sending...":"Review & Send"}</button><button className="st-button st-button-secondary" onClick={saveTemplate} disabled={savingTemplate||!message.trim()}><Save size={15}/> Save as template</button></div>
      </section>
      <div className="space-y-5">
        <section className="st-card p-5"><div className="mb-4 flex items-center gap-2"><FileText size={18}/><h2 className="m-0 text-base font-semibold">Message templates</h2></div>
          <div className="mb-3 grid grid-cols-1 gap-2"><input className="h-10 rounded-xl border border-gray-200 px-3 text-sm" placeholder="Template name" value={templateName} onChange={e=>setTemplateName(e.target.value)}/><select className="h-10 rounded-xl border border-gray-200 px-3 text-sm" value={templateCategory} onChange={e=>setTemplateCategory(e.target.value)}><option value="general">General</option><option value="marketing">Marketing</option><option value="booking">Booking</option><option value="follow-up">Follow-up</option><option value="payment">Payment</option></select></div>
          <p className="mb-3 text-[10px] text-gray-500">Save the current message using the button in the composer. Personalization variable: {"{{full_name}}"} .</p>
          <div className="space-y-2">{templates.map(t=><div key={t.id} className="rounded-xl border border-gray-100 p-3"><div className="flex items-center justify-between gap-2"><b className="text-xs">{t.name}</b><div className="flex gap-2"><button className="text-xs text-[var(--st-red)]" onClick={()=>setMessage(t.message)}>Use</button><button onClick={()=>deleteTemplate(t.id)} aria-label="Delete template"><Trash2 size={13}/></button></div></div><p className="mt-2 mb-0 line-clamp-3 text-[11px] text-gray-500">{t.message}</p></div>)}{!templates.length&&<p className="text-xs text-gray-500">No saved templates yet.</p>}</div>
        </section>
        <section className="st-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><RefreshCw size={18}/><h2 className="m-0 text-base font-semibold">ManyChat automated follow-ups</h2></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">Automatic</span></div>
          <p className="mb-3 text-[10px] leading-relaxed text-gray-500">Seven editable SMS messages are scheduled from the contact's explicit SMS consent date. The system sends each message automatically through AirTouch; WhatsApp opt-in alone is not SMS consent. Use {"{{full_name}}"} to personalize.</p>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 p-2"><b className="block text-lg">{followupStats.pending || 0}</b><span className="text-[9px] text-gray-500">Pending</span></div>
            <div className="rounded-lg bg-emerald-50 p-2"><b className="block text-lg">{followupStats.sent || 0}</b><span className="text-[9px] text-gray-500">Sent</span></div>
            <div className="rounded-lg bg-red-50 p-2"><b className="block text-lg">{followupStats.failed || 0}</b><span className="text-[9px] text-gray-500">Failed</span></div>
          </div>
          <div className="space-y-3">
            {manychatFollowupTemplates.map(template => <div key={template.id} className="rounded-xl border border-gray-100 p-3">
              <div className="mb-2 flex items-center justify-between gap-2"><div><b className="text-xs">{template.name}</b><p className="m-0 text-[9px] text-gray-500">Send {template.day_offset} {template.day_offset===1?"day":"days"} after SMS consent</p></div><label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={template.enabled} onChange={e=>setManychatFollowupTemplates(current=>current.map(item=>item.id===template.id?{...item,enabled:e.target.checked}:item))}/> Enabled</label></div>
              <textarea maxLength={480} value={template.message} onChange={e=>setManychatFollowupTemplates(current=>current.map(item=>item.id===template.id?{...item,message:e.target.value}:item))} className="min-h-24 w-full rounded-lg border border-gray-200 p-2 text-[11px] leading-relaxed"/>
              <div className="mt-2 flex items-center justify-between"><span className="text-[9px] text-gray-400">{template.message.length}/480 characters</span><button className="st-button st-button-secondary" disabled={savingFollowupId===template.id||!template.message.trim()} onClick={()=>saveManyChatFollowup(template)}><Save size={13}/>{savingFollowupId===template.id?"Saving...":"Save template"}</button></div>
            </div>)}
          </div>
        </section>

        <section className="st-card p-5">
          <div className="mb-3 flex items-center gap-2"><MessageSquare size={18}/><h2 className="m-0 text-base font-semibold">Trial booking reminder SMS</h2><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">Scheduled automatically</span></div>
          <p className="mb-3 text-[10px] leading-relaxed text-gray-500">Three independent reminders are sent before each booked trial. Each message can be edited or disabled. Personalization placeholders: {'{{full_name}}'}, {'{{instrument}}'}, {'{{lesson_date}}'}, {'{{lesson_time}}'}.</p>
          <div className="space-y-3">
            {trialReminderTemplates.map(template => <div key={template.id} className="rounded-xl border border-gray-100 p-3">
              <div className="mb-2 flex items-center justify-between gap-2"><b className="text-xs">{template.name}</b><label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={template.enabled} onChange={e=>setTrialReminderTemplates(current=>current.map(item=>item.id===template.id?{...item,enabled:e.target.checked}:item))}/> Enabled</label></div>
              <textarea maxLength={480} value={template.message} onChange={e=>setTrialReminderTemplates(current=>current.map(item=>item.id===template.id?{...item,message:e.target.value}:item))} className="min-h-24 w-full rounded-lg border border-gray-200 p-2 text-[11px] leading-relaxed"/>
              <div className="mt-2 flex items-center justify-between"><span className="text-[9px] text-gray-400">{template.message.length}/480 characters</span><button className="st-button st-button-secondary" disabled={savingFollowupId===template.id||!template.message.trim()} onClick={()=>saveTrialReminderTemplate(template)}><Save size={13}/>{savingFollowupId===template.id?"Saving...":"Save template"}</button></div>
            </div>)}
            {!trialReminderTemplates.length&&<p className="text-xs text-gray-500">No trial reminder templates found.</p>}
          </div>
        </section>
        <section className="st-card p-5">
          <div className="mb-3 flex items-center gap-2"><MessageSquare size={18}/><h2 className="m-0 text-base font-semibold">Core automated SMS templates</h2><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">Automatic</span></div>
          <p className="mb-3 text-[10px] leading-relaxed text-gray-500">These templates power the existing automatic trial booking confirmation and payment receipt SMS. Edit the wording or disable either message without changing its trigger. Available placeholders are shown below each template.</p>
          <div className="space-y-3">
            {coreSmsTemplates.map(template => <div key={template.id} className="rounded-xl border border-gray-100 p-3">
              <div className="mb-2 flex items-center justify-between gap-2"><b className="text-xs">{template.name}</b><label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={template.enabled} onChange={e=>setCoreSmsTemplates(current=>current.map(item=>item.id===template.id?{...item,enabled:e.target.checked}:item))}/> Enabled</label></div>
              <textarea maxLength={480} value={template.message} onChange={e=>setCoreSmsTemplates(current=>current.map(item=>item.id===template.id?{...item,message:e.target.value}:item))} className="min-h-24 w-full rounded-lg border border-gray-200 p-2 text-[11px] leading-relaxed"/>
              <p className="mt-2 mb-0 text-[9px] text-gray-500">{template.template_key==="trial_booking_confirmation" ? "Placeholders: {{full_name}}, {{lesson_date}}, {{lesson_time}}" : "Placeholders: {{full_name}}, {{amount}}, {{payment_date}}, {{balance}}"}</p>
              <div className="mt-2 flex items-center justify-between"><span className="text-[9px] text-gray-400">{template.message.length}/480 characters</span><button className="st-button st-button-secondary" disabled={savingFollowupId===template.id||!template.message.trim()} onClick={()=>saveCoreSmsTemplate(template)}><Save size={13}/>{savingFollowupId===template.id?"Saving...":"Save template"}</button></div>
            </div>)}
            {!coreSmsTemplates.length&&<p className="text-xs text-gray-500">No core templates found. Refresh after the database migration.</p>}
          </div>
        </section>
        <section className="st-card p-5">
          <div className="mb-3 flex items-center gap-2"><MessageSquare size={18}/><h2 className="m-0 text-base font-semibold">Trial event SMS templates</h2><span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700">Event-triggered</span></div>
          <p className="mb-3 text-[10px] leading-relaxed text-gray-500">Sent automatically when a trial is marked missed, cancelled, rescheduled, or attended. These are immediate event messages, not scheduled follow-ups. Personalization: {'{{full_name}}'}, {'{{instrument}}'}, {'{{booking_link}}'}.</p>
          <div className="space-y-3">
            {trialEventTemplates.map(template => <div key={template.id} className="rounded-xl border border-gray-100 p-3">
              <div className="mb-2 flex items-center justify-between gap-2"><b className="text-xs">{template.name}</b><label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={template.enabled} onChange={e=>setTrialEventTemplates(current=>current.map(item=>item.id===template.id?{...item,enabled:e.target.checked}:item))}/> Enabled</label></div>
              <textarea maxLength={480} value={template.message} onChange={e=>setTrialEventTemplates(current=>current.map(item=>item.id===template.id?{...item,message:e.target.value}:item))} className="min-h-24 w-full rounded-lg border border-gray-200 p-2 text-[11px] leading-relaxed"/>
              <div className="mt-2 flex items-center justify-between"><span className="text-[9px] text-gray-400">{template.message.length}/480 characters</span><button className="st-button st-button-secondary" disabled={savingFollowupId===template.id||!template.message.trim()} onClick={()=>saveTrialEventTemplate(template)}><Save size={13}/>{savingFollowupId===template.id?"Saving...":"Save template"}</button></div>
            </div>)}
          </div>
        </section>
        <section className="st-card p-5"><div className="mb-4 flex items-center gap-2"><History size={18}/><h2 className="m-0 text-base font-semibold">Recent SMS activity</h2></div>
          <div className="space-y-3">{logs.slice(0,10).map(log=><div key={log.id} className="border-b border-gray-100 pb-3"><div className="flex items-center justify-between gap-2"><b className="text-xs">{log.recipient_name||log.recipient_phone}</b><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${log.status==="accepted"?"bg-green-50 text-green-700":"bg-red-50 text-red-700"}`}>{log.status}</span></div><p className="mt-1 mb-1 text-[11px] text-gray-500">{log.recipient_phone} · {new Date(log.created_at).toLocaleString()}</p><p className="m-0 line-clamp-2 text-xs">{log.message}</p></div>)}{!logs.length&&<p className="text-xs text-gray-500">No SMS history yet.</p>}</div>
        </section>
      </div>
    </div>
    <p className="mt-5 text-[10px] text-gray-500">AirTouch acceptance is recorded separately from handset delivery. The current provider API response confirms acceptance, not final delivery.</p>
  </main>;
}
