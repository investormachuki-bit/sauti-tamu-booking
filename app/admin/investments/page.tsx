"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Edit3, Plus, RefreshCw, Search, Trash2, WalletCards, X } from "lucide-react";

type Investment = {
  id: string; institution: string; investment_type: string; contribution_amount: number;
  target_amount: number; current_value: number; contribution_frequency: string;
  start_date: string; next_due_date: string | null; expected_annual_return: number | null;
  status: string; notes: string | null;
};
type Payment = { id: string; investment_id: string; amount: number; payment_date: string; payment_method: string; reference: string | null };
type FormState = Omit<Investment, "id">;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const blank = (): FormState => ({ institution: "", investment_type: "Other", contribution_amount: 0, target_amount: 0, current_value: 0, contribution_frequency: "Monthly", start_date: today(), next_due_date: null, expected_annual_return: null, status: "active", notes: "" });
const money = (v: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(v || 0);
const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-normal outline-none focus:border-blue-500";

export default function InvestmentPortfolioPage() {
  const [items, setItems] = useState<Investment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Investment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(blank());

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [investmentsResult, paymentsResult] = await Promise.all([
        supabase.from("financial_investments").select("*").order("created_at", { ascending: false }),
        supabase.from("financial_investment_payments").select("id,investment_id,amount,payment_date,payment_method,reference").order("payment_date", { ascending: false }),
      ]);
      if (investmentsResult.error) throw investmentsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      setItems((investmentsResult.data ?? []).map((r: any) => ({
        ...r, contribution_amount: Number(r.contribution_amount ?? 0), target_amount: Number(r.target_amount ?? r.contribution_amount ?? 0),
        current_value: Number(r.current_value ?? 0), expected_annual_return: r.expected_annual_return == null ? null : Number(r.expected_annual_return),
      })));
      setPayments((paymentsResult.data ?? []).map((p: any) => ({ ...p, amount: Number(p.amount ?? 0) })));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load investments."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => items.filter(i => (status === "all" || i.status === status) &&
    [i.institution, i.investment_type, i.notes ?? ""].join(" ").toLowerCase().includes(search.toLowerCase())), [items, status, search]);
  const paidFor = (i: Investment) => i.contribution_amount + payments.filter(p => p.investment_id === i.id).reduce((s, p) => s + p.amount, 0);
  const totals = useMemo(() => items.reduce((a, i) => ({ target: a.target + i.target_amount, paid: a.paid + paidFor(i), value: a.value + i.current_value }), { target: 0, paid: 0, value: 0 }), [items, payments]);

  function openAdd() { setEditing(null); setForm(blank()); setError(""); setShowForm(true); }
  function openEdit(item: Investment) {
    setEditing(item); setShowForm(true);
    setForm({ institution: item.institution, investment_type: item.investment_type, contribution_amount: item.contribution_amount,
      target_amount: item.target_amount, current_value: item.current_value, contribution_frequency: item.contribution_frequency,
      start_date: item.start_date, next_due_date: item.next_due_date, expected_annual_return: item.expected_annual_return,
      status: item.status, notes: item.notes ?? "" });
    setError("");
  }
  async function save() {
    setSaving(true); setError("");
    try {
      if (!form.institution.trim()) throw new Error("Enter the investment or institution name.");
      if (form.target_amount <= 0 || form.contribution_amount < 0 || form.current_value < 0) throw new Error("Enter valid investment amounts.");
      if (form.contribution_amount > form.target_amount) throw new Error("Amount already contributed cannot exceed the target amount.");
      const payload = { ...form, institution: form.institution.trim(), notes: form.notes?.trim() || null, updated_at: new Date().toISOString() };
      const result = editing
        ? await supabase.from("financial_investments").update(payload).eq("id", editing.id)
        : await supabase.from("financial_investments").insert({ ...payload, created_at: new Date().toISOString() });
      if (result.error) throw result.error;
      setEditing(null); setForm(blank()); setShowForm(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save investment."); }
    finally { setSaving(false); }
  }
  async function remove(item: Investment) {
    const paid = paidFor(item);
    if (!window.confirm(`Delete "${item.institution}"? This also deletes its linked contribution records (${money(paid)}).`)) return;
    setError("");
    const { error: deleteError } = await supabase.from("financial_investments").delete().eq("id", item.id);
    if (deleteError) { setError(deleteError.message); return; }
    await load();
  }

  return <main className="st-page space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="m-0 text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">Financial Management</p>
        <h1 className="mt-2 mb-0 text-[24px] font-bold tracking-tight text-slate-900">Investment Portfolio</h1>
        <p className="mt-2 mb-0 text-[11px] text-slate-500">Manage investment records, targets, valuations and contribution progress. Changes flow into the Financial Dashboard.</p></div>
      <div className="flex gap-2"><button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold"><RefreshCw size={14}/> Refresh</button>
        <button onClick={openAdd} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-900 px-4 text-[11px] font-bold text-white"><Plus size={15}/> Add Investment</button></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {[["Portfolio Target", totals.target], ["Total Contributed", totals.paid], ["Current Portfolio Value", totals.value]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><p className="m-0 text-[10px] font-semibold text-slate-500">{label}</p><p className="mt-2 mb-0 text-[20px] font-extrabold text-slate-900">{money(Number(value))}</p></div>)}
    </div>
    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search investments..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-[11px]"/></div>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[11px]"><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
    </div>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">{error}</p>}
    {showForm ? <section className="rounded-xl border border-blue-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between"><h2 className="m-0 text-[14px] font-bold text-slate-900">{editing ? "Edit Investment" : "Add Investment"}</h2><button onClick={()=>{setEditing(null);setForm(blank());setShowForm(false);}}><X size={17}/></button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-[10px] font-bold text-slate-600">Institution / Investment name<input className={inputClass} value={form.institution} onChange={e=>setForm({...form,institution:e.target.value})}/></label>
        <label className="text-[10px] font-bold text-slate-600">Investment type<select className={inputClass} value={form.investment_type} onChange={e=>setForm({...form,investment_type:e.target.value})}>{["Other","SACCO","Fixed Deposit","Shares","Bonds","Money Market Fund","Property","Treasury Bills","Treasury Bonds","Foreign Currency","Business"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-[10px] font-bold text-slate-600">Target amount (KES)<input type="number" min="0" className={inputClass} value={form.target_amount || ""} onChange={e=>setForm({...form,target_amount:Number(e.target.value)})}/></label>
        <label className="text-[10px] font-bold text-slate-600">Amount initially contributed (KES)<input type="number" min="0" className={inputClass} value={form.contribution_amount} onChange={e=>setForm({...form,contribution_amount:Number(e.target.value)})}/></label>
        <label className="text-[10px] font-bold text-slate-600">Current value (KES)<input type="number" min="0" className={inputClass} value={form.current_value} onChange={e=>setForm({...form,current_value:Number(e.target.value)})}/></label>
        <label className="text-[10px] font-bold text-slate-600">Contribution frequency<select className={inputClass} value={form.contribution_frequency} onChange={e=>setForm({...form,contribution_frequency:e.target.value})}>{["One-time","Weekly","Monthly","Quarterly","Annually"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-[10px] font-bold text-slate-600">Start date<input type="date" className={inputClass} value={form.start_date ?? ""} onChange={e=>setForm({...form,start_date:e.target.value})}/></label>
        <label className="text-[10px] font-bold text-slate-600">Next contribution due<input type="date" className={inputClass} value={form.next_due_date ?? ""} onChange={e=>setForm({...form,next_due_date:e.target.value || null})}/></label>
        <label className="text-[10px] font-bold text-slate-600">Expected annual return (%)<input type="number" min="0" step="0.01" className={inputClass} value={form.expected_annual_return ?? ""} onChange={e=>setForm({...form,expected_annual_return:e.target.value === "" ? null : Number(e.target.value)})}/></label>
        <label className="text-[10px] font-bold text-slate-600">Status<select className={inputClass} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{["active","paused","completed","cancelled"].map(x=><option key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</option>)}</select></label>
        <label className="text-[10px] font-bold text-slate-600 sm:col-span-2 lg:col-span-3">Notes<textarea rows={2} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-[11px] font-normal" value={form.notes ?? ""} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      </div>
      <div className="mt-4 flex justify-end gap-2"><button onClick={()=>{setEditing(null);setForm(blank());}} className="rounded-lg border border-slate-200 px-4 py-2 text-[11px] font-semibold">Cancel</button><button disabled={saving} onClick={()=>void save()} className="rounded-lg bg-blue-900 px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50">{saving ? "Saving..." : editing ? "Save Changes" : "Create Investment"}</button></div>
    </section> : null}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="m-0 text-[13px] font-bold text-slate-900">Investment Register</h2><span className="text-[10px] text-slate-500">{visible.length} records</span></div>
      {loading ? <p className="p-6 text-center text-[11px] text-slate-500">Loading investments…</p> : visible.length === 0 ? <div className="p-10 text-center"><WalletCards className="mx-auto text-slate-300" size={28}/><p className="mt-2 text-[11px] text-slate-500">No investments found.</p></div> :
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-[10px]"><thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr>{["Investment","Type","Target","Amount Paid","Balance","Current Value","Frequency","Next Due","Status","Actions"].map(x=><th key={x} className="whitespace-nowrap px-3 py-3">{x}</th>)}</tr></thead>
      <tbody>{visible.map(i=>{const paid=paidFor(i);return <tr key={i.id} className="border-t border-slate-100"><td className="px-3 py-3 font-bold text-slate-800">{i.institution}</td><td className="px-3 py-3">{i.investment_type}</td><td className="px-3 py-3 whitespace-nowrap">{money(i.target_amount)}</td><td className="px-3 py-3 whitespace-nowrap">{money(paid)}</td><td className="px-3 py-3 whitespace-nowrap">{money(Math.max(i.target_amount-paid,0))}</td><td className="px-3 py-3 whitespace-nowrap">{money(i.current_value)}</td><td className="px-3 py-3">{i.contribution_frequency}</td><td className="px-3 py-3">{i.next_due_date || "—"}</td><td className="px-3 py-3">{i.status}</td><td className="px-3 py-3"><div className="flex gap-2"><button onClick={()=>openEdit(i)} title="Edit investment" className="rounded-md border border-slate-200 p-2 text-blue-800"><Edit3 size={13}/></button><button onClick={()=>void remove(i)} title="Delete investment" className="rounded-md border border-red-100 p-2 text-red-600"><Trash2 size={13}/></button></div></td></tr>})}</tbody></table></div>}
    </section>
    <p className="text-[10px] text-slate-500">Investment contributions are tracked separately from business expenses. Editing investment details will not create an expense. Deleting an investment also removes its linked contribution-payment records.</p>
  </main>;
}
