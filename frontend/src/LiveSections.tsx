import { useCallback, useEffect, useState, type FormEvent } from "react";

type Props = { page: "customers" | "tasks" | "reports" | "settings" };
type Customer = {
  id: string; customer_number: string; customer_type: "individual" | "organization";
  first_name: string; last_name: string; organization_name: string; phone_number: string;
  email: string; status: string; created_at: string;
};
type Task = {
  id: string; task_number: string; title: string; description: string; status: string;
  priority: string; application: string; application_number: string; due_at: string | null;
  is_overdue: boolean; assigned_to_username: string;
};
type Report = {
  generated_at: string; scope: string;
  customers: {total:number;active:number;inactive:number;archived:number};
  applications: {total:number;by_status:Record<string,number>};
  tasks: {total:number;open:number;in_progress:number;completed:number;cancelled:number;overdue:number;due_today:number};
  service_receipts: {count:number;gross_total:string;paid_total:string;outstanding_total:string};
};
type ApiError = Error & { status?: number };
const statusLabel: Record<string,string> = {
  active:"فعال", needs_review:"نیازمند بررسی", inactive:"غیرفعال", archived:"بایگانی‌شده",
  open:"باز", in_progress:"در حال انجام", completed:"انجام‌شده", cancelled:"لغوشده",
  under_review:"در حال بررسی", awaiting_documents:"نیازمند مدرک", awaiting_approval:"در انتظار تأیید",
  approved:"تأییدشده", rejected:"ردشده",
};
const priorityLabel: Record<string,string> = {low:"کم",normal:"عادی",high:"زیاد",urgent:"فوری"};
async function request<T>(path:string, init:RequestInit={}):Promise<T>{
  const headers = new Headers(init.headers); headers.set("Accept","application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type","application/json");
  const method = (init.method || "GET").toUpperCase();
  if (!["GET","HEAD","OPTIONS","TRACE"].includes(method) && !headers.has("X-CSRFToken")) {
    const csrfResponse = await fetch("/api/v1/auth/csrf/", {credentials:"same-origin",headers:{Accept:"application/json"}});
    let csrfPayload:any = {}; try { csrfPayload = await csrfResponse.json(); } catch {}
    if (!csrfResponse.ok || !csrfPayload.csrfToken) throw new Error(csrfPayload.detail || "دریافت توکن امنیتی ناموفق بود.");
    headers.set("X-CSRFToken", String(csrfPayload.csrfToken));
  }
  const response = await fetch(path,{...init,method,headers,credentials:"same-origin"});
  let data:any={}; try { data=await response.json(); } catch {}
  if(!response.ok){const e=new Error(data.detail || Object.values(data).flat().join(" ") || "درخواست ناموفق بود.") as ApiError;e.status=response.status;throw e;}
  return data as T;
}
function rows<T>(data:any):T[]{const result=Array.isArray(data)?data:data?.results; if(!Array.isArray(result))throw new Error("ساختار پاسخ سرور معتبر نیست.");return result;}
function money(value:string|number){return new Intl.NumberFormat("fa-IR").format(Number(value||0));}
function date(value:string|null|undefined){if(!value)return "—";const d=new Date(value);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium"}).format(d);}
function Alert({value}:{value:string}){return value?<p role="alert" className="notice" style={{background:"#fff1f0",borderColor:"#ffd5d2",color:"#b42318"}}>{value}</p>:null;}

export default function LiveSections({page}:Props){
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [report,setReport]=useState<Report|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [query,setQuery]=useState("");
  const [showCreate,setShowCreate]=useState(false);
  const [customerType,setCustomerType]=useState<"individual"|"organization">("individual");
  const [firstName,setFirstName]=useState(""); const [lastName,setLastName]=useState("");
  const [orgName,setOrgName]=useState(""); const [phone,setPhone]=useState(""); const [email,setEmail]=useState("");
  const load=useCallback(async()=>{
    setLoading(true);setError("");setMessage("");
    try {
      if(page==="customers") setCustomers(rows<Customer>(await request("/api/v1/customers/?search="+encodeURIComponent(query))));
      if(page==="tasks") setTasks(rows<Task>(await request("/api/v1/tasks/?ordering=due_at")));
      if(page==="reports") setReport(await request<Report>("/api/v1/reports/operations/"));
    } catch(e) {setError((e as Error).message||"دریافت اطلاعات از بک‌اند ناموفق بود.");}
    finally {setLoading(false);}
  },[page,query]);
  useEffect(()=>{void load();},[load]);
  async function createCustomer(event:FormEvent){
    event.preventDefault();setBusy(true);setError("");setMessage("");
    const payload = {customer_type:customerType,first_name:customerType==="individual"?firstName.trim():"",last_name:customerType==="individual"?lastName.trim():"",organization_name:customerType==="organization"?orgName.trim():"",phone_number:phone.trim(),email:email.trim(),status:"active"};
    try {
      await request("/api/v1/customers/",{method:"POST",body:JSON.stringify(payload)});
      setFirstName("");setLastName("");setOrgName("");setPhone("");setEmail("");setShowCreate(false);
      setMessage("مشتری با موفقیت در بک‌اند ثبت شد."); await load();
    } catch(e){setError((e as Error).message||"ثبت مشتری انجام نشد.");}
    finally{setBusy(false);}
  }
  async function updateTask(task:Task,status:string){
    setBusy(true);setError("");setMessage("");
    try {await request("/api/v1/tasks/"+task.id+"/",{method:"PATCH",body:JSON.stringify({status})});setMessage("وضعیت وظیفه به‌روزرسانی شد.");await load();}
    catch(e){setError((e as Error).message||"به‌روزرسانی وظیفه ناموفق بود.");}
    finally{setBusy(false);}
  }
  const filteredTasks=tasks.filter(t=>(t.title+" "+t.task_number+" "+t.application_number).toLowerCase().includes(query.toLowerCase()));
  return <section className="card list-card">
    <div className="card-head list-head"><div><h2>{page==="customers"?"فهرست مشتریان":page==="tasks"?"وظایف و پیگیری":"گزارش عملیاتی"}</h2><p>{page==="customers"?"اطلاعات مستقیماً از API مشتریان دریافت می‌شود.":page==="tasks"?"وظایف و وضعیت واقعی ثبت‌شده در بک‌اند.":"شاخص‌ها از گزارش عملیاتی بک‌اند دریافت می‌شوند."}</p></div>
    {page==="customers"&&<button className="btn primary" onClick={()=>setShowCreate(v=>!v)}>{showCreate?"بستن فرم":"＋ ثبت مشتری"}</button>}
    {page!=="customers"&&<button className="btn secondary" onClick={()=>void load()} disabled={loading}>↻ تازه‌سازی</button>}</div>
    <Alert value={error}/>{message&&<p className="notice">{message}</p>}
    {page==="customers"&&showCreate&&<form onSubmit={createCustomer} className="profile-section" style={{borderTop:0,paddingTop:0,marginTop:0,marginBottom:20}}>
      <h2>ثبت مشتری جدید</h2>
      <div className="form-grid">
        <div className="form-row"><label>نوع مشتری</label><select className="field" value={customerType} onChange={e=>setCustomerType(e.target.value as "individual"|"organization")}><option value="individual">حقیقی</option><option value="organization">حقوقی</option></select></div>
        {customerType==="individual"?<><div className="form-row"><label>نام</label><input className="field" required value={firstName} onChange={e=>setFirstName(e.target.value)}/></div><div className="form-row"><label>نام خانوادگی</label><input className="field" required value={lastName} onChange={e=>setLastName(e.target.value)}/></div></>:<div className="form-row"><label>نام سازمان</label><input className="field" required value={orgName} onChange={e=>setOrgName(e.target.value)}/></div>}
        <div className="form-row"><label>شماره تماس</label><input className="field" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
        <div className="form-row"><label>ایمیل</label><input className="field" type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      </div><div className="actions" style={{marginTop:14}}><button className="btn primary" disabled={busy}>{busy?"در حال ثبت…":"ثبت در سامانه"}</button><button type="button" className="btn" onClick={()=>setShowCreate(false)}>انصراف</button></div>
    </form>}
    {(page==="customers"||page==="tasks")&&<div className="table-tools"><input className="field" style={{maxWidth:360}} placeholder="جستجو در اطلاعات دریافت‌شده…" value={query} onChange={e=>setQuery(e.target.value)}/><button className="btn secondary" onClick={()=>void load()} disabled={loading}>جستجو / تازه‌سازی</button></div>}
    {loading?<p className="empty">در حال دریافت اطلاعات از سرور…</p>:page==="customers"?<div className="table-wrap"><table><thead><tr><th>شماره مشتری</th><th>نام مشتری</th><th>نوع</th><th>تماس</th><th>ایمیل</th><th>وضعیت</th><th>تاریخ ثبت</th></tr></thead><tbody>{customers.map(c=><tr key={c.id}><td className="id">{c.customer_number}</td><td>{c.customer_type==="organization"?c.organization_name:[c.first_name,c.last_name].filter(Boolean).join(" ")}</td><td>{c.customer_type==="organization"?"حقوقی":"حقیقی"}</td><td>{c.phone_number||"—"}</td><td>{c.email||"—"}</td><td><span className="pill">{statusLabel[c.status]||c.status}</span></td><td>{date(c.created_at)}</td></tr>)}{!customers.length&&<tr><td colSpan={7} className="empty">مشتری‌ای در نتیجه یافت نشد.</td></tr>}</tbody></table></div>:page==="tasks"?<div className="table-wrap"><table><thead><tr><th>شماره وظیفه</th><th>عنوان</th><th>پرونده</th><th>اولویت</th><th>موعد</th><th>وضعیت</th><th>اقدام</th></tr></thead><tbody>{filteredTasks.map(t=><tr key={t.id}><td className="id">{t.task_number}</td><td>{t.title}{t.is_overdue&&<small style={{display:"block",color:"#b42318"}}>عقب‌افتاده</small>}</td><td>{t.application_number||"—"}</td><td>{priorityLabel[t.priority]||t.priority}</td><td>{date(t.due_at)}</td><td><span className={"pill "+(t.status==="completed"?"":"wait")}>{statusLabel[t.status]||t.status}</span></td><td>{t.status==="open"?<button className="btn" disabled={busy} onClick={()=>void updateTask(t,"in_progress")}>شروع</button>:t.status==="in_progress"?<button className="btn primary" disabled={busy} onClick={()=>void updateTask(t,"completed")}>تکمیل</button>:<span>—</span>}</td></tr>)}{!filteredTasks.length&&<tr><td colSpan={7} className="empty">وظیفه‌ای برای نمایش وجود ندارد.</td></tr>}</tbody></table></div>:page==="reports"&&report?<><div className="grid" style={{marginBottom:16}}>{[["کل مشتریان",report.customers.total],["مشتریان فعال",report.customers.active],["کل پرونده‌ها",report.applications.total],["کل وظایف",report.tasks.total],["وظایف عقب‌افتاده",report.tasks.overdue],["موعد امروز",report.tasks.due_today],["مبلغ کل خدمات",report.service_receipts.gross_total],["مبلغ پرداخت‌شده",report.service_receipts.paid_total]].map(([label,value])=><div className="card" key={label as string}><div className="k-label">{label}</div><div className="k-value" style={{fontSize:22}}>{money(value as string|number)}</div></div>)}</div><div className="card"><h2>وضعیت پرونده‌ها</h2>{Object.entries(report.applications.by_status).map(([key,value])=><div className="status-row" key={key}><span>{statusLabel[key]||key}</span><b>{money(value)}</b></div>)}<p className="muted">آخرین دریافت: {date(report.generated_at)} · {report.scope==="organization"?"دامنه: کل سازمان":"دامنه: پرونده‌های تخصیص‌یافته به کاربر"}</p></div></>:page==="settings"?<div className="card"><h2>وضعیت اتصال</h2><div className="setting-row"><span>API بک‌اند Django</span><b>فعال در صورت دریافت موفق داده</b></div><div className="setting-row"><span>نشانی API</span><code>/api/v1/</code></div><div className="setting-row"><span>روش احراز هویت</span><b>نشست امن و CSRF</b></div><p className="muted">تنظیم نشانی سرور و کلیدها از داخل مرورگر مجاز نیست؛ این موارد باید در محیط استقرار پیکربندی شوند.</p></div>:null}
  </section>;
}
