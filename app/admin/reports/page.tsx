"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";

type ReportRow = { id: string; date: string; type: string; name: string; category: string; amount: number; status: string; details: string };
const money = (v:number) => new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",maximumFractionDigits:2}).format(v||0);
const today = new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Nairobi"});
const monthStart = `${today.slice(0,7)}-01`;
const esc = (v:unknown) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c] || c));
function saveBlob(blob:Blob, name:string) { const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function csvCell(v:unknown) { const s=String(v ?? ""); return `"${s.replace(/"/g,'""')}"`; }

export default function FinancialReportsPage() {
  const [rows,setRows]=useState<ReportRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [from,setFrom]=useState(monthStart);
  const [to,setTo]=useState(today);
  const [type,setType]=useState("all");
  const [status,setStatus]=useState("all");
  const [category,setCategory]=useState("all");
  const [search,setSearch]=useState("");
  const [format,setFormat]=useState("xlsx");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const [e,o,i,ep,op,ip,pay,enroll]=await Promise.all([
        supabase.from("expenses").select("*"),
        supabase.from("financial_obligations").select("*"),
        supabase.from("financial_investments").select("*"),
        supabase.from("financial_expense_payments").select("*"),
        supabase.from("financial_obligation_payments").select("*"),
        supabase.from("financial_investment_payments").select("*"),
        supabase.from("payments").select("*"),
        supabase.from("student_enrollments").select("*"),
      ]);
      for(const result of [e,o,i,ep,op,ip,pay,enroll]) if(result.error) throw result.error;
      const result:ReportRow[]=[];
      for(const x of e.data??[]) result.push({id:x.id,date:x.expense_date,type:"Expense",name:x.description,category:x.category,amount:Number(x.amount??0),status:"Recorded",details:[x.vendor,x.payment_method,x.reference,x.notes].filter(Boolean).join(" • ")});
      for(const x of o.data??[]) result.push({id:x.id,date:x.next_due_date??x.start_date??"",type:"Obligation",name:x.name,category:x.category,amount:Number(x.outstanding_balance??0),status:x.status,details:`Scheduled ${x.amount} • ${x.frequency} • Due ${x.next_due_date??"not set"} • ${x.notes??""}`});
      for(const x of i.data??[]) result.push({id:x.id,date:x.start_date??"",type:"Investment",name:x.institution,category:x.investment_type,amount:Number(x.current_value??0),status:x.status,details:`Target ${x.target_amount??0} • Initially contributed ${x.contribution_amount??0} • ${x.contribution_frequency} • ${x.notes??""}`});
      for(const x of ep.data??[]) result.push({id:x.id,date:x.payment_date,type:"Expense Payment",name:x.expense_id,category:x.payment_method,amount:Number(x.amount??0),status:"Paid",details:x.reference??""});
      for(const x of op.data??[]) result.push({id:x.id,date:x.payment_date,type:"Obligation Payment",name:x.obligation_id,category:x.payment_method,amount:Number(x.amount??0),status:"Paid",details:x.reference??""});
      for(const x of ip.data??[]) result.push({id:x.id,date:x.payment_date,type:"Investment Contribution",name:x.investment_id,category:x.payment_method,amount:Number(x.amount??0),status:"Contributed",details:x.reference??""});
      for(const x of pay.data??[]) result.push({id:x.id,date:x.payment_date,type:"Student Payment",name:x.student_id,category:x.payment_method,amount:Number(x.amount??0),status:"Received",details:[x.reference,x.notes].filter(Boolean).join(" • ")});
      for(const x of enroll.data??[]) result.push({id:x.id,date:x.start_date??x.planned_start_date??"",type:"Enrollment Value",name:x.programme_name??x.instrument,category:x.instrument,status:x.status,amount:Number(x.total_fee??0),details:x.notes??""});
      setRows(result.sort((a,b)=>b.date.localeCompare(a.date)));
    } catch(e) { setError(e instanceof Error?e.message:"Unable to load report data."); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void load()},[load]);

  const categories=useMemo(()=>Array.from(new Set(rows.map(r=>r.category).filter(Boolean))).sort(),[rows]);
  const filtered=useMemo(()=>rows.filter(r=>(!from||!r.date||r.date>=from)&&(!to||!r.date||r.date<=to)&&(type==="all"||r.type===type)&&(status==="all"||r.status.toLowerCase()===status.toLowerCase())&&(category==="all"||r.category===category)&&[r.name,r.category,r.details,r.id].join(" ").toLowerCase().includes(search.toLowerCase())),[rows,from,to,type,status,category,search]);
  const total=filtered.reduce((s,r)=>s+r.amount,0);
  const expenseTotal=filtered.filter(r=>r.type==="Expense"||r.type==="Expense Payment").reduce((s,r)=>s+r.amount,0);
  
  const filename=`sauti-tamu-financial-report-${today}`;

  function exportReport() {
    const headers=["Date","Record Type","Name / Reference","Category / Method","Amount (KES)","Status","Details"];
    const data=filtered.map(r=>[r.date,r.type,r.name,r.category,r.amount,r.status,r.details]);
    if(format==="csv") { saveBlob(new Blob(["\uFEFF"+[headers,...data].map(row=>row.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}),filename+".csv"); return; }
    const table=`<table border="1"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${data.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    if(format==="xlsx") { const html=`<html><head><meta charset="utf-8"></head><body><h2>Sauti Tamu Financial Report</h2><p>Period: ${esc(from)} to ${esc(to)}</p>${table}</body></html>`; saveBlob(new Blob(["\uFEFF",html],{type:"application/vnd.ms-excel;charset=utf-8"}),filename+".xls"); return; }
    if(format==="docx") { const html=`<html><head><meta charset="utf-8"></head><body><h1>Sauti Tamu Financial Report</h1><p>Period: ${esc(from)} to ${esc(to)}</p><p>Total filtered value: ${esc(money(total))}</p>${table}</body></html>`; saveBlob(new Blob(["\uFEFF",html],{type:"application/msword;charset=utf-8"}),filename+".doc"); return; }
    const pdf=new jsPDF({orientation:"landscape",unit:"pt",format:"a4"});
    pdf.setFontSize(16);pdf.text("Sauti Tamu Financial Report",40,40);pdf.setFontSize(9);pdf.text(`Period: ${from} to ${to} | Records: ${filtered.length} | Total: ${money(total)}`,40,58);
    const cols=[40,100,190,330,440,520,590]; let y=82; const widths=[55,85,135,105,75,65,170];
    const drawRow=(values:string[],bold=false)=>{let x=40;values.forEach((v,idx)=>{const lines=pdf.splitTextToSize(v,widths[idx]-8);pdf.setFont("helvetica",bold?"bold":"normal");pdf.text(lines,x+4,y+12);x+=widths[idx];});y+=Math.max(22,...values.map((v,idx)=>pdf.splitTextToSize(v,widths[idx]-8).length*10+8));if(y>550){pdf.addPage();y=45;}};
    drawRow(headers,true);pdf.setDrawColor(190);pdf.line(40,y-5,790,y-5);y+=5;
    data.forEach(row=>drawRow([String(row[0]),String(row[1]),String(row[2]),String(row[3]),money(Number(row[4])),String(row[5]),String(row[6]??"")]));
    pdf.save(filename+".pdf");
  }

  return <main className="st-page space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="m-0 text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">Financial Management</p><h1 className="mt-2 mb-0 text-[24px] font-bold tracking-tight text-slate-900">Financial Reports</h1><p className="mt-2 mb-0 text-[11px] text-slate-500">Analyse expenses, obligations, investments and all recorded payment activity.</p></div><button onClick={()=>void load()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold"><RefreshCw size={14}/> Refresh data</button></div>
    <section className="grid gap-3 sm:grid-cols-3">{[["Filtered records",filtered.length.toLocaleString()],["Total value",money(total)],["Expense activity",money(expenseTotal)]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="m-0 text-[10px] font-semibold text-slate-500">{label}</p><p className="mt-2 mb-0 text-[19px] font-extrabold text-slate-900">{value}</p></div>)}</section>
    <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="mb-3 mt-0 text-[13px] font-bold text-slate-900">Report Filters</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-[10px] font-bold text-slate-600">From date<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[11px]"/></label>
      <label className="text-[10px] font-bold text-slate-600">To date<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[11px]"/></label>
      <label className="text-[10px] font-bold text-slate-600">Record type<select value={type} onChange={e=>setType(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px]"><option value="all">All records</option>{["Student Payment","Enrollment Value","Expense","Obligation","Investment","Expense Payment","Obligation Payment","Investment Contribution"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="text-[10px] font-bold text-slate-600">Status<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px]"><option value="all">All statuses</option>{Array.from(new Set(rows.map(r=>r.status))).map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="text-[10px] font-bold text-slate-600">Category / method<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px]"><option value="all">All categories</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="text-[10px] font-bold text-slate-600 sm:col-span-2">Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search names, vendors, references..." className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[11px]"/></label>
    </div><div className="mt-3 flex justify-end"><button onClick={()=>{setFrom("");setTo("");setType("all");setStatus("all");setCategory("all");setSearch("");}} className="text-[10px] font-semibold text-blue-800 underline">Clear filters</button></div></section>
    {error&&<p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">{error}</p>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h2 className="m-0 text-[13px] font-bold text-slate-900">Report Results</h2><p className="mt-1 mb-0 text-[10px] text-slate-500">{filtered.length} records match your filters</p></div><div className="flex gap-2"><select value={format} onChange={e=>setFormat(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[10px]"><option value="xlsx">Excel (.xls)</option><option value="csv">CSV (.csv)</option><option value="docx">Word (.doc)</option><option value="pdf">PDF (.pdf)</option></select><button onClick={exportReport} disabled={loading||filtered.length===0} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-900 px-4 text-[10px] font-bold text-white disabled:opacity-40"><Download size={14}/> Export report</button></div></div>
    {loading?<p className="p-8 text-center text-[11px] text-slate-500">Loading report data…</p>:<div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-[10px]"><thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr>{["Date","Type","Name / Reference","Category","Amount","Status","Details"].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={r.type+r.id} className="border-t border-slate-100"><td className="whitespace-nowrap px-3 py-3">{r.date||"—"}</td><td className="px-3 py-3">{r.type}</td><td className="px-3 py-3 font-semibold">{r.name}</td><td className="px-3 py-3">{r.category}</td><td className="whitespace-nowrap px-3 py-3">{money(r.amount)}</td><td className="px-3 py-3">{r.status}</td><td className="px-3 py-3">{r.details}</td></tr>)}</tbody></table></div>}</section>
    <p className="text-[10px] text-slate-500">Report totals are sums of the selected record types. If you include both an expense and its payment records, or both an investment and its contributions, the total includes both rows and is an activity total—not a cash balance or profit figure.</p>
  </main>;
}
