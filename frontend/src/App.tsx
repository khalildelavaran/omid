import { useEffect, useMemo, useState } from "react";
import "./style.css";

type NavKey = "dashboard" | "applications" | "customers" | "tasks" | "reports" | "settings";
type Application = { uuid: string; id: string; customer: string; type: string; amount: string; stage: string; status: string; date: string };
type ApiUser = { id: number; username: string; first_name: string; last_name: string; role: string | null; role_label: string | null; must_change_password: boolean };
type ApiError = Error & { status?: number };
type CustomerRow = { id:string; customer_number:string; customer_type:string; first_name:string; last_name:string; organization_name:string; phone_number:string; email:string; status:string; created_at:string };
type TaskRow = { id:string; task_number:string; application_number:string; title:string; status:string; priority:string; assigned_to_username:string; due_at:string|null; is_overdue:boolean };
type OperationsReport = { generated_at:string; scope:string; customers:{total:number;active:number;inactive:number;archived:number}; applications:{total:number;by_status:Record<string,number>}; tasks:{total:number;open:number;in_progress:number;completed:number;cancelled:number;overdue:number;due_today:number}; guarantees:{total:number;by_status:Record<string,number>}; service_receipts:{count:number;gross_total:string;paid_total:string;outstanding_total:string} };
const nav: {key:NavKey;label:string;icon:string;group:string}[] = [
 {key:"dashboard",label:"داشبورد",icon:"▦",group:"فضای کاری"},
 {key:"applications",label:"پرونده‌های تسهیلاتی",icon:"▤",group:"فضای کاری"},
 {key:"customers",label:"مشتریان",icon:"♙",group:"فضای کاری"},
 {key:"tasks",label:"وظایف و پیگیری",icon:"◷",group:"عملیات"},
 {key:"reports",label:"گزارش‌ها",icon:"▥",group:"عملیات"},
 {key:"settings",label:"تنظیمات",icon:"⚙",group:"مدیریت"},
];
const stages = ["ثبت درخواست","تکمیل پرونده","بررسی مدارک","بررسی اعتباری","تصمیم اعتباری","قرارداد","پرداخت تسهیلات"];
const apiBase = ""; // Same-origin only: Vite proxies /api locally and Cloudflare Worker proxies it in production.
const statusLabels: Record<string, string> = {
 under_review: "در حال بررسی",
 awaiting_documents: "نیازمند اقدام",
 awaiting_approval: "در انتظار",
 approved: "تأیید شده",
 rejected: "رد شده",
 cancelled: "لغو شده",
};
const productLabels: Record<string, string> = {
 working_capital: "تسهیلات سرمایه در گردش",
 personal: "تسهیلات شخصی",
 corporate_credit: "اعتباری شرکتی",
 equipment: "خرید تجهیزات",
};
const apiFieldLabels: Record<string, string> = {
 customer_type: "نوع مشتری", first_name: "نام", last_name: "نام خانوادگی",
 organization_name: "نام سازمان", phone_number: "شماره تلفن", email: "ایمیل",
 national_id: "کد ملی / شناسه ملی", birth_date: "تاریخ تولد",
 father_name: "نام پدر", occupation: "شغل", postal_code: "کدپستی",
 sana_verified: "وضعیت احراز ثنا", status: "وضعیت", notes: "یادداشت",
 customer: "مشتری", product_type: "نوع تسهیلات", requested_amount: "مبلغ درخواستی",
 term_months: "مدت بازپرداخت", title: "عنوان", application: "پرونده",
 priority: "اولویت", due_at: "موعد انجام", description: "شرح وظیفه",
};
function getApiErrorMessage(payload: any): string {
 if (typeof payload?.detail === "string") return payload.detail;
 if (!payload || typeof payload !== "object") return "";
 return Object.entries(payload).flatMap(([field, value]) => {
  const entries = Array.isArray(value) ? value : [value];
  return entries.filter((entry): entry is string => typeof entry === "string")
   .map(entry => field === "non_field_errors" ? entry : `${apiFieldLabels[field] || field}: ${entry}`);
 }).join("؛ ");
}
async function apiRequest(path: string, init: RequestInit = {}): Promise<any> {
 const headers = new Headers(init.headers);
 headers.set("Accept", "application/json");
 const response = await fetch(apiBase + path, {
  ...init,
  credentials: "same-origin",
  headers,
 });
 let payload: any = {};
 try { payload = await response.json(); } catch { /* Some error responses have no JSON body. */ }
 if (!response.ok) {
  const error = new Error(getApiErrorMessage(payload) || "درخواست به سرور ناموفق بود.") as ApiError;
  error.status = response.status;
  throw error;
 }
 return payload;
}
function formatMoney(value: unknown): string {
 const digits = String(value ?? "0").split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
 return digits.replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}
function displayDate(value: unknown): string {
 if (!value) return "—";
 const date = new Date(String(value));
 return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR", {year:"numeric", month:"2-digit", day:"2-digit"}).format(date);
}
async function getApplications(): Promise<Application[]> {
 const payload = await apiRequest("/api/v1/applications/");
 const rows = Array.isArray(payload) ? payload : payload.results;
 if (!Array.isArray(rows)) throw new Error("ساختار پاسخ فهرست پرونده‌ها معتبر نیست.");
 return rows.map((x: any) => ({
  uuid: String(x.id ?? ""),
  id: String(x.application_number ?? x.id ?? "—"),
  customer: String(x.customer_display_name ?? x.customer_number ?? "مشتری"),
  type: productLabels[String(x.product_type)] || String(x.product_type || "تسهیلات"),
  amount: formatMoney(x.requested_amount),
  stage: statusLabels[String(x.status)] || "ثبت درخواست",
  status: statusLabels[String(x.status)] || String(x.status || "نامشخص"),
  date: displayDate(x.created_at),
 }));
}
async function getCustomers(): Promise<CustomerRow[]> {
 const payload = await apiRequest("/api/v1/customers/");
 const rows = Array.isArray(payload) ? payload : payload.results;
 if (!Array.isArray(rows)) throw new Error("ساختار پاسخ فهرست مشتریان معتبر نیست.");
 return rows as CustomerRow[];
}
async function getTasks(): Promise<TaskRow[]> {
 const payload = await apiRequest("/api/v1/tasks/");
 const rows = Array.isArray(payload) ? payload : payload.results;
 if (!Array.isArray(rows)) throw new Error("ساختار پاسخ فهرست وظایف معتبر نیست.");
 return rows as TaskRow[];
}
function App(){
 const [page,setPage]=useState<NavKey>("dashboard");
 const [customers,setCustomers]=useState<CustomerRow[]>([]);
 const [tasks,setTasks]=useState<TaskRow[]>([]);
 const [report,setReport]=useState<OperationsReport|null>(null);
 const [sectionLoading,setSectionLoading]=useState(false);
 const [sectionError,setSectionError]=useState("");
 const [apps,setApps]=useState<Application[]>([]);
 const [query,setQuery]=useState("");
 const [status,setStatus]=useState("همه وضعیت‌ها");
 const [selected,setSelected]=useState<Application|null>(null);
 const [mobileOpen,setMobileOpen]=useState(false);
 const [apiState,setApiState]=useState<"connecting"|"connected"|"error">("connecting");
 const [authUser,setAuthUser]=useState<ApiUser|null>(null);
 const [authChecking,setAuthChecking]=useState(true);
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 const [authSubmitting,setAuthSubmitting]=useState(false);
 const [authError,setAuthError]=useState("");
 const [apiError,setApiError]=useState("");
 const [showApplicationForm,setShowApplicationForm]=useState(false);
 const [applicationCustomer,setApplicationCustomer]=useState("");
 const [applicationProduct,setApplicationProduct]=useState("working_capital");
 const [applicationAmount,setApplicationAmount]=useState("");
 const [applicationTerm,setApplicationTerm]=useState("12");
 const [applicationPurpose,setApplicationPurpose]=useState("");
 const [applicationNotes,setApplicationNotes]=useState("");
 const [applicationSaving,setApplicationSaving]=useState(false);
 const [applicationFormError,setApplicationFormError]=useState("");
 const [showCustomerForm,setShowCustomerForm]=useState(false);
 const [customerSaving,setCustomerSaving]=useState(false);
 const [customerFormError,setCustomerFormError]=useState("");
 const [customerType,setCustomerType]=useState<"individual"|"organization">("individual");
 const [customerFirstName,setCustomerFirstName]=useState("");
 const [customerLastName,setCustomerLastName]=useState("");
 const [customerOrganizationName,setCustomerOrganizationName]=useState("");
 const [customerPhone,setCustomerPhone]=useState("");
 const [customerEmail,setCustomerEmail]=useState("");
 const [customerNationalId,setCustomerNationalId]=useState("");
 const [customerBirthDate,setCustomerBirthDate]=useState("");
 const [customerFatherName,setCustomerFatherName]=useState("");
 const [customerOccupation,setCustomerOccupation]=useState("");
 const [customerPostalCode,setCustomerPostalCode]=useState("");
 const [customerSanaVerified,setCustomerSanaVerified]=useState(false);
 const [customerStatus,setCustomerStatus]=useState("active");
 const [customerNotes,setCustomerNotes]=useState("");
 const [showTaskForm,setShowTaskForm]=useState(false);
 const [taskSaving,setTaskSaving]=useState(false);
 const [taskFormError,setTaskFormError]=useState("");
 const [taskApplication,setTaskApplication]=useState("");
 const [taskTitle,setTaskTitle]=useState("");
 const [taskDescription,setTaskDescription]=useState("");
 const [taskPriority,setTaskPriority]=useState("normal");
 const [taskDueAt,setTaskDueAt]=useState("");
 useEffect(()=>{
  let active=true;
  apiRequest("/api/v1/auth/me/").then(async payload=>{
   if(!active) return;
   setAuthUser(payload.user);
   const rows=await getApplications();
   if(active){setApps(rows);setApiState("connected");setApiError("");}
  }).catch((error:ApiError)=>{
   if(!active) return;
   if(error.status!==401&&error.status!==403){setApiState("error");setApiError(error.message);}
  }).finally(()=>{if(active)setAuthChecking(false);});
  return ()=>{active=false;};
 },[]);
 useEffect(()=>{
  if(!authUser || !["customers","tasks","reports"].includes(page)) return;
  let active=true;
  setSectionLoading(true);setSectionError("");
  const load=async()=>{
   try {
    if(page==="customers"){
     const rows=await getCustomers();
     if(active)setCustomers(rows);
    } else if(page==="tasks"){
     const rows=await getTasks();
     if(active)setTasks(rows);
    } else {
     const payload=await apiRequest("/api/v1/reports/operations/");
     if(active)setReport(payload);
    }
    if(active){setApiState("connected");setApiError("");}
   } catch(error) {
    if(active){const message=(error as Error).message||"دریافت اطلاعات ناموفق بود.";setSectionError(message);setApiError(message);if((error as ApiError).status===502||(error as ApiError).status===503)setApiState("error");}
   } finally {if(active)setSectionLoading(false);}
  };
  void load();
  return ()=>{active=false;};
 },[authUser,page]);
 async function changeTaskStatus(task:TaskRow,nextStatus:string){
  try{const csrf=await apiRequest("/api/v1/auth/csrf/");await apiRequest("/api/v1/tasks/"+task.id+"/",{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({status:nextStatus})});setTasks(await getTasks());setSectionError("");}catch(error){setSectionError((error as Error).message||"به‌روزرسانی وضعیت وظیفه ناموفق بود.");}
 }
 const filtered=useMemo(()=>apps.filter(a=>(a.id+" "+a.customer+" "+a.type).toLowerCase().includes(query.toLowerCase())&&(status==="همه وضعیت‌ها"||a.status===status)),[apps,query,status]);
 const current=nav.find(n=>n.key===page)!;
 const counts=[apps.length,apps.filter(a=>a.status==="در حال بررسی").length,apps.filter(a=>a.status==="نیازمند اقدام").length,apps.filter(a=>a.status==="تکمیل شده").length];
 const title:Record<NavKey,string>={dashboard:"داشبورد مدیریتی",applications:"پرونده‌های تسهیلاتی",customers:"مشتریان",tasks:"وظایف و پیگیری",reports:"گزارش‌ها",settings:"تنظیمات سامانه"};
 const description:Record<NavKey,string>={dashboard:"نمای کلی عملکرد و وضعیت پرونده‌های تسهیلاتی سامانه امید",applications:"مدیریت و پیگیری پرونده‌ها از ثبت درخواست تا پرداخت تسهیلات",customers:"فهرست مشتریان حقیقی و حقوقی و اطلاعات ارتباطی آن‌ها",tasks:"پیگیری اقدامات معوق و وظایف محول‌شده به کارشناسان",reports:"گزارش‌های مدیریتی و عملیاتی پرونده‌ها",settings:"تنظیمات عمومی و اتصال رابط کاربری به سرویس سامانه"};
 if(authChecking) return <div dir="rtl" style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f5f7fb",fontFamily:"Vazirmatn,Tahoma,sans-serif",color:"#526176"}}>در حال بررسی اتصال امن به سامانه امید…</div>;
 if(!authUser) return <div dir="rtl" style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"#f5f7fb",fontFamily:"Vazirmatn,Tahoma,sans-serif"}}>
  <form onSubmit={async event=>{
   event.preventDefault();setAuthSubmitting(true);setAuthError("");
   try {
    const csrf=await apiRequest("/api/v1/auth/csrf/");
    const result=await apiRequest("/api/v1/auth/login/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({username,password})});
    setAuthUser(result.user);setPassword("");setAuthError("");setApiError("");
    try { const rows=await getApplications();setApps(rows);setApiState("connected"); }
    catch(dataError) { setApps([]);setApiState("error");setApiError((dataError as Error).message || "دریافت پرونده‌ها ناموفق بود."); }
   } catch(error) {
    const err=error as Error;setAuthError(err.message || "ورود ناموفق بود.");
    if((error as ApiError).status===503||(error as ApiError).status===502)setApiState("error");
   } finally {setAuthSubmitting(false);}
  }} style={{width:"100%",maxWidth:420,padding:32,background:"#fff",border:"1px solid #e8edf3",borderRadius:16,boxShadow:"0 12px 40px #172c4a0d"}}>
   <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}><div style={{width:48,height:48,display:"grid",placeItems:"center",borderRadius:13,background:"#204a7b",color:"#fff",fontSize:26,fontWeight:800}}>ا</div><div><h1 style={{fontSize:22,margin:0,color:"#1b2b43"}}>سامانه امید</h1><p style={{margin:"5px 0 0",fontSize:12,color:"#8492a5"}}>ورود امن کارکنان</p></div></div>
   <label style={{display:"block",fontSize:12,marginBottom:7,color:"#526176"}} htmlFor="omid-username">نام کاربری</label>
   <input id="omid-username" autoComplete="username" required value={username} onChange={event=>setUsername(event.target.value)} style={{width:"100%",height:44,padding:"0 12px",border:"1px solid #dce3ed",borderRadius:8,marginBottom:16}}/>
   <label style={{display:"block",fontSize:12,marginBottom:7,color:"#526176"}} htmlFor="omid-password">گذرواژه</label>
   <input id="omid-password" type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} style={{width:"100%",height:44,padding:"0 12px",border:"1px solid #dce3ed",borderRadius:8,marginBottom:16}}/>
   {(authError||apiError)&&<p role="alert" style={{fontSize:12,lineHeight:1.8,color:"#b42318",background:"#fff1f0",padding:10,borderRadius:8}}>{authError||apiError}</p>}
   <button type="submit" disabled={authSubmitting} style={{width:"100%",height:44,border:0,borderRadius:8,background:"#204a7b",color:"#fff",fontWeight:700,opacity:authSubmitting ? 0.7 : 1}}>{authSubmitting?"در حال ورود…":"ورود به سامانه"}</button>
   <p style={{fontSize:11,lineHeight:1.9,color:"#8492a5",margin:"18px 0 0"}}>ورود فقط برای حساب‌های داخلی فعال‌شده در بک‌اند مجاز است.</p>
  </form>
 </div>;
 return <div className="app" dir="rtl">
  <aside className={"sidebar "+(mobileOpen?"open":"")}><div className="brand"><div className="brand-mark">ا</div><div><b>سامانه امید</b><small>مدیریت مالی و تسهیلات</small></div><button className="mobile-close" onClick={()=>setMobileOpen(false)}>×</button></div>
   <div className="workspace"><span className="workspace-dot"></span><div><b>شرکت خدمات مالی امید</b><small>فضای کاری سازمانی</small></div><span className="down">⌄</span></div>
   {["فضای کاری","عملیات","مدیریت"].map(group=><div className="nav-group" key={group}><label>{group}</label>{nav.filter(n=>n.group===group).map(n=><button key={n.key} className={"nav-item "+(page===n.key?"active":"")} onClick={()=>{setPage(n.key);setSelected(null);setMobileOpen(false)}}><span className="nav-icon">{n.icon}</span>{n.label}{n.key==="tasks"&&<i>۵</i>}</button>)}</div>)}
   <div className="sidebar-bottom"><div className="help-icon">?</div><div><b>به راهنمایی نیاز دارید؟</b><small>راهنمای استفاده از سامانه</small></div><span>›</span></div>
   <div className="user-card"><div className="avatar">{(authUser.first_name||authUser.username).slice(0,1)}</div><div><b>{[authUser.first_name,authUser.last_name].filter(Boolean).join(" ")||authUser.username}</b><small>{authUser.role_label||"کاربر سامانه"}</small></div><button title="خروج از حساب" onClick={async()=>{try{const csrf=await apiRequest("/api/v1/auth/csrf/");await apiRequest("/api/v1/auth/logout/",{method:"POST",headers:{"X-CSRFToken":String(csrf.csrfToken||"")}});}finally{setAuthUser(null);setApps([]);setApiState("connecting");}}} style={{marginRight:"auto",border:0,background:"transparent",color:"#aab7c9",fontSize:11}}>خروج</button></div>
  </aside>
  {mobileOpen&&<button aria-label="بستن منو" className="scrim" onClick={()=>setMobileOpen(false)}/>}
  <main className="main"><header className="topbar"><button className="hamburger" onClick={()=>setMobileOpen(true)}>☰</button><div className="crumb">سامانه امید <span>/</span> {current.label}</div><div className="top-actions"><label className="global-search">⌕ <input placeholder="جستجو در سامانه..." value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></label><button className="icon-action" aria-label="اعلان‌ها">♧<i></i></button><div className="top-avatar">خد</div></div></header>
   <div className="content"><div className="page-heading"><div><div className="eyebrow">مدیریت و عملیات</div><h1>{selected?"جزئیات پرونده":title[page]}</h1><p>{selected?"نمای کلی اطلاعات و مرحله جاری پرونده":description[page]}</p></div><div className="heading-actions">{page==="applications"&&<button className="btn primary" onClick={async()=>{setApplicationFormError("");if(!customers.length){try{setCustomers(await getCustomers());}catch(error){setApplicationFormError((error as Error).message);}}setShowApplicationForm(value=>!value);}}>＋ ایجاد پرونده جدید</button>}{page==="customers"&&<button className="btn primary" onClick={()=>{setCustomerFormError("");setShowCustomerForm(value=>!value);}}>＋ ایجاد مشتری جدید</button>}{page==="tasks"&&<button className="btn primary" onClick={async()=>{setTaskFormError("");if(!apps.length){try{setApps(await getApplications());}catch(error){setTaskFormError((error as Error).message||"دریافت پرونده‌ها ناموفق بود.");}}setShowTaskForm(value=>!value);}}>＋ ثبت وظیفه</button>}{page==="dashboard"&&<button className="btn primary" onClick={()=>setPage("applications")}>مشاهده پرونده‌ها <span>←</span></button>}</div></div>
   {page==="applications"&&!selected&&showApplicationForm&&<section className="card" style={{marginBottom:18,padding:22}}><div className="card-head"><div><h2>ثبت پرونده تسهیلاتی</h2><p>پرونده در سرور ثبت می‌شود و شماره آن توسط بک‌اند تولید خواهد شد.</p></div><button className="btn secondary" onClick={()=>setShowApplicationForm(false)}>بستن</button></div>{applicationFormError&&<p role="alert" className="notice">{applicationFormError}</p>}<form onSubmit={async event=>{event.preventDefault();setApplicationSaving(true);setApplicationFormError("");try{const csrf=await apiRequest("/api/v1/auth/csrf/");await apiRequest("/api/v1/applications/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({customer:applicationCustomer,product_type:applicationProduct,requested_amount:applicationAmount,term_months:applicationTerm?Number(applicationTerm):null,purpose:applicationPurpose,notes:applicationNotes})});setShowApplicationForm(false);setApplicationAmount("");setApplicationPurpose("");setApplicationNotes("");const refreshed=await getApplications();setApps(refreshed);setApiState("connected");}catch(error){setApplicationFormError((error as Error).message||"ثبت پرونده انجام نشد.");}finally{setApplicationSaving(false);}}}><div className="form-grid"><div className="form-row"><label>مشتری *</label><select className="field" required value={applicationCustomer} onChange={e=>setApplicationCustomer(e.target.value)}><option value="">انتخاب مشتری</option>{customers.filter(x=>x.status==="active").map(x=><option key={x.id} value={x.id}>{x.customer_number} — {x.customer_type==="organization"?x.organization_name:[x.first_name,x.last_name].filter(Boolean).join(" ")}</option>)}</select></div><div className="form-row"><label>نوع تسهیلات *</label><select className="field" value={applicationProduct} onChange={e=>setApplicationProduct(e.target.value)}><option value="working_capital">سرمایه در گردش</option><option value="personal">تسهیلات شخصی</option><option value="corporate_credit">اعتباری شرکتی</option><option value="equipment">خرید تجهیزات</option></select></div><div className="form-row"><label>مبلغ درخواستی (تومان) *</label><input className="field" required min="1" type="number" step="1" value={applicationAmount} onChange={e=>setApplicationAmount(e.target.value)}/></div><div className="form-row"><label>مدت بازپرداخت (ماه)</label><input className="field" min="1" max="240" type="number" value={applicationTerm} onChange={e=>setApplicationTerm(e.target.value)}/></div><div className="form-row"><label>هدف درخواست</label><input className="field" maxLength={250} value={applicationPurpose} onChange={e=>setApplicationPurpose(e.target.value)}/></div><div className="form-row"><label>یادداشت</label><input className="field" value={applicationNotes} onChange={e=>setApplicationNotes(e.target.value)}/></div></div><div className="actions" style={{marginTop:16}}><button className="btn primary" disabled={applicationSaving||!customers.length}>{applicationSaving?"در حال ثبت…":"ثبت پرونده در سامانه"}</button><button type="button" className="btn secondary" onClick={()=>setShowApplicationForm(false)}>انصراف</button></div>{customers.length===0&&<p className="muted">برای ثبت پرونده ابتدا باید دست‌کم یک مشتری فعال در محدوده دسترسی شما وجود داشته باشد.</p>}</form></section>}
   {page==="dashboard"&&!selected&&<><div className="stat-grid"><Stat icon="▤" label="کل پرونده‌ها" value={counts[0].toLocaleString("fa-IR")} delta="پرونده ثبت‌شده در سامانه" tone="blue"/><Stat icon="◷" label="در حال بررسی" value={counts[1].toLocaleString("fa-IR")} delta="در جریان فرایند" tone="violet"/><Stat icon="⚑" label="نیازمند اقدام" value={counts[2].toLocaleString("fa-IR")} delta="پیگیری توسط کارشناسان" tone="amber"/><Stat icon="✓" label="تکمیل‌شده" value={counts[3].toLocaleString("fa-IR")} delta="پرونده‌های نهایی‌شده" tone="green"/></div>
    <div className="dash-grid"><section className="card chart-card"><div className="card-head"><div><h2>نمای کلی پرونده‌ها</h2><p>توزیع پرونده‌ها بر اساس مرحله فرایند</p></div><button className="subtle-btn" onClick={()=>setPage("reports")}>گزارش کامل ↗</button></div><div className="chart-area"><div className="chart-labels"><span>۱۰۰</span><span>۷۵</span><span>۵۰</span><span>۲۵</span><span>۰</span></div><div className="bars">{[38,62,46,75,56,89,66,48,72,94,60,82].map((h,i)=><div className="bar-column" key={i}><span style={{height:h+"%"}}></span><small>{["فر","ار","ار","خر","خرد","تیر","مرد","شهر","مهر","آبا","آذر","دی"][i]}</small></div>)}</div></div><div className="chart-legend"><span><i className="dot-blue"></i> پرونده‌های ثبت‌شده</span><span>آخرین به‌روزرسانی: امروز</span></div></section>
    <section className="card stage-card"><div className="card-head"><div><h2>وضعیت مراحل</h2><p>پیشرفت پرونده‌ها در گردش کار</p></div><span className="round-icon">◉</span></div><div className="donut-wrap"><div className="donut"><div><b>{apps.length.toLocaleString("fa-IR")}</b><small>پرونده</small></div></div><div className="legend">{[["در حال بررسی","blue","۴۲٪"],["نیازمند اقدام","amber","۲۴٪"],["تکمیل شده","green","۱۸٪"],["سایر موارد","gray","۱۶٪"]].map(x=><div key={x[0]}><span><i className={"dot-"+x[1]}></i>{x[0]}</span><b>{x[2]}</b></div>)}</div></div></section></div>
    <div className="bottom-grid"><section className="card"><div className="card-head"><div><h2>پرونده‌های اخیر</h2><p>آخرین پرونده‌های ثبت یا به‌روزرسانی‌شده</p></div><button className="subtle-btn" onClick={()=>setPage("applications")}>مشاهده همه ←</button></div><ApplicationsTable rows={apps.slice(0,4)} onSelect={setSelected}/></section><section className="card tasks-card"><div className="card-head"><div><h2>نیازمند پیگیری</h2><p>اقدام‌های پیشنهادی برای امروز</p></div><span className="count-pill">۳ مورد</span></div>{apps.filter(a=>a.status==="نیازمند اقدام"||a.status==="در حال بررسی").slice(0,3).map((a,i)=><button className="task-row" key={a.id} onClick={()=>setSelected(a)}><span className={"task-symbol t"+i}>{i===0?"◷":i===1?"▤":"↗"}</span><span className="task-text"><b>{a.customer}</b><small>{a.id} · {a.stage}</small></span><span className="task-arrow">←</span></button>)}</section></div></>}
   {page==="applications"&&!selected&&<section className="card list-card"><div className="card-head list-head"><div><h2>همه پرونده‌ها</h2><p>{filtered.length.toLocaleString("fa-IR")} پرونده مطابق فیلتر</p></div><button className="btn secondary" onClick={()=>{setQuery("");setStatus("همه وضعیت‌ها")}}>پاک‌کردن فیلترها</button></div><div className="filters"><label className="search-field">⌕ <input placeholder="جستجو بر اساس شماره پرونده، مشتری..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={status} onChange={e=>setStatus(e.target.value)}><option>همه وضعیت‌ها</option>{["در حال بررسی","نیازمند اقدام","در انتظار","تکمیل شده"].map(s=><option key={s}>{s}</option>)}</select><button className="btn secondary" onClick={()=>window.print()}>⇩ خروجی / چاپ</button></div><ApplicationsTable rows={filtered} onSelect={setSelected}/></section>}
   {selected&&<section className="detail-layout"><section className="card detail-main"><div className="detail-id"><div><span className="eyebrow">شماره پرونده</span><h2>{selected.id}</h2></div><Status value={selected.status}/></div><div className="detail-fields">{[["نام مشتری",selected.customer],["نوع تسهیلات",selected.type],["مبلغ درخواستی",selected.amount+" تومان"],["مرحله جاری",selected.stage],["تاریخ ثبت",selected.date],["شناسه پرونده",selected.id]].map(x=><div key={x[0]}><small>{x[0]}</small><b>{x[1]}</b></div>)}</div><div className="card-head"><div><h2>مراحل پرونده</h2><p>گردش کار پرونده از ثبت تا پرداخت</p></div></div><div className="workflow">{stages.map((s,i)=><div className={"workflow-step "+(s===selected.stage?"current":stages.indexOf(selected.stage)>i?"done":"")} key={s}><span>{stages.indexOf(selected.stage)>i?"✓":i+1}</span><div><b>{s}</b><small>{s===selected.stage?"مرحله جاری":stages.indexOf(selected.stage)>i?"تکمیل‌شده":"در انتظار انجام"}</small></div></div>)}</div><button className="btn secondary" onClick={()=>setSelected(null)}>← بازگشت به فهرست پرونده‌ها</button></section><aside className="card detail-aside"><h3>اقدامات پرونده</h3><p>دسترسی سریع به عملیات مرتبط با این پرونده</p><button className="btn primary full" onClick={()=>alert("عملیات مرحله بعد باید از طریق API گردش کار انجام شود.")}>ادامه فرایند ←</button><button className="btn secondary full" onClick={()=>window.print()}>چاپ خلاصه پرونده</button><div className="note"><b>نکته</b><p>تغییر مرحله پرونده باید با مجوز کاربر و از طریق API بک‌اند ثبت شود.</p></div></aside></section>}
   {page==="customers"&&!selected&&showCustomerForm&&<section className="card" style={{marginBottom:18,padding:22}}>
    <div className="card-head"><div><h2>ثبت مشتری جدید</h2><p>اطلاعات در بک‌اند ذخیره و شماره مشتری به‌صورت خودکار تولید می‌شود.</p></div><button type="button" className="btn secondary" onClick={()=>setShowCustomerForm(false)}>بستن</button></div>
    {customerFormError&&<p role="alert" className="notice">{customerFormError}</p>}
    <form onSubmit={async event=>{
     event.preventDefault();setCustomerSaving(true);setCustomerFormError("");
     try{
      const csrf=await apiRequest("/api/v1/auth/csrf/");
      const phones=customerPhone.trim()?[{title:"تلفن اصلی",number:customerPhone.trim()}]:[];
      const payload={
       customer_type:customerType,
       first_name:customerType==="individual"?customerFirstName.trim():"",
       last_name:customerType==="individual"?customerLastName.trim():"",
       organization_name:customerType==="organization"?customerOrganizationName.trim():"",
       phone_number:customerPhone.trim(),
       email:customerEmail.trim(),
       national_id:customerNationalId.trim(),
       birth_date:customerBirthDate||null,
       father_name:customerFatherName.trim(),
       occupation:customerOccupation.trim(),
       postal_code:customerPostalCode.trim(),
       sana_verified:customerSanaVerified,
       status:customerStatus,
       notes:customerNotes.trim(),
       ...(phones.length?{phones}:{})
      };
      const createdCustomer=await apiRequest("/api/v1/customers/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify(payload)});
      setCustomers(current=>[createdCustomer as CustomerRow,...current.filter(customer=>customer.id!==String(createdCustomer.id))]);
      setShowCustomerForm(false);setCustomerType("individual");setCustomerFirstName("");setCustomerLastName("");setCustomerOrganizationName("");setCustomerPhone("");setCustomerEmail("");setCustomerNationalId("");setCustomerBirthDate("");setCustomerFatherName("");setCustomerOccupation("");setCustomerPostalCode("");setCustomerSanaVerified(false);setCustomerStatus("active");setCustomerNotes("");setApiState("connected");setApiError("");setSectionError("");
     }catch(error){setCustomerFormError((error as Error).message||"ثبت مشتری ناموفق بود.");}
     finally{setCustomerSaving(false);}
    }}>
     <div className="form-grid">
      <div className="form-row"><label>نوع مشتری *</label><select className="field" required value={customerType} onChange={event=>setCustomerType(event.target.value as "individual"|"organization")}><option value="individual">حقیقی</option><option value="organization">حقوقی</option></select></div>
      {customerType==="individual"?<>
       <div className="form-row"><label>نام *</label><input className="field" required maxLength={100} value={customerFirstName} onChange={event=>setCustomerFirstName(event.target.value)} autoComplete="given-name"/></div>
       <div className="form-row"><label>نام خانوادگی *</label><input className="field" required maxLength={100} value={customerLastName} onChange={event=>setCustomerLastName(event.target.value)} autoComplete="family-name"/></div>
      </>:<div className="form-row"><label>نام سازمان / شرکت *</label><input className="field" required maxLength={200} value={customerOrganizationName} onChange={event=>setCustomerOrganizationName(event.target.value)}/></div>}
      <div className="form-row"><label>شماره تلفن</label><input className="field" type="tel" maxLength={32} value={customerPhone} onChange={event=>setCustomerPhone(event.target.value)} autoComplete="tel"/></div>
      <div className="form-row"><label>پست الکترونیکی</label><input className="field" type="email" maxLength={254} value={customerEmail} onChange={event=>setCustomerEmail(event.target.value)} autoComplete="email"/></div>
      <div className="form-row"><label>کد ملی / شناسه ملی</label><input className="field" inputMode="numeric" maxLength={20} value={customerNationalId} onChange={event=>setCustomerNationalId(event.target.value)}/></div>
      {customerType==="individual"&&<>
       <div className="form-row"><label>تاریخ تولد</label><input className="field" type="date" value={customerBirthDate} onChange={event=>setCustomerBirthDate(event.target.value)}/></div>
       <div className="form-row"><label>نام پدر</label><input className="field" maxLength={100} value={customerFatherName} onChange={event=>setCustomerFatherName(event.target.value)}/></div>
       <div className="form-row"><label>شغل</label><input className="field" maxLength={150} value={customerOccupation} onChange={event=>setCustomerOccupation(event.target.value)}/></div>
      </>}
      <div className="form-row"><label>کدپستی</label><input className="field" inputMode="numeric" maxLength={20} value={customerPostalCode} onChange={event=>setCustomerPostalCode(event.target.value)}/></div>
      <div className="form-row"><label>وضعیت مشتری</label><select className="field" value={customerStatus} onChange={event=>setCustomerStatus(event.target.value)}><option value="active">فعال</option><option value="needs_review">نیازمند بررسی</option><option value="inactive">غیرفعال</option></select></div>
      <div className="form-row"><label>یادداشت</label><input className="field" maxLength={2000} value={customerNotes} onChange={event=>setCustomerNotes(event.target.value)}/></div>
      <label className="form-row" style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={customerSanaVerified} onChange={event=>setCustomerSanaVerified(event.target.checked)}/> احراز ثنا انجام شده است</label>
     </div>
     <div style={{display:"flex",justifyContent:"flex-start",gap:8,marginTop:18}}><button className="btn primary" type="submit" disabled={customerSaving}>{customerSaving?"در حال ثبت…":"ثبت مشتری"}</button><button className="btn secondary" type="button" disabled={customerSaving} onClick={()=>setShowCustomerForm(false)}>انصراف</button></div>
    </form>
   </section>}
   {page==="customers"&&!selected&&<section className="card list-card"><div className="card-head"><div><h2>فهرست مشتریان</h2><p>{customers.length.toLocaleString("fa-IR")} مشتری دریافت‌شده از بک‌اند</p></div><button className="btn secondary" onClick={()=>setPage("applications")}>پرونده‌های تسهیلاتی</button></div>{sectionLoading?<p className="empty">در حال دریافت اطلاعات مشتریان…</p>:sectionError?<p className="empty" role="alert">{sectionError}</p>:<div className="table-wrap"><table><thead><tr><th>شماره مشتری</th><th>نام / شرکت</th><th>نوع</th><th>تلفن</th><th>وضعیت</th><th>تاریخ ثبت</th></tr></thead><tbody>{customers.map(customer=><tr key={customer.id}><td><b className="case-id">{customer.customer_number}</b></td><td><b>{customer.customer_type==="organization"?customer.organization_name:[customer.first_name,customer.last_name].filter(Boolean).join(" ")||"—"}</b></td><td>{customer.customer_type==="organization"?"حقوقی":"حقیقی"}</td><td>{customer.phone_number||"—"}</td><td><Status value={customer.status==="active"?"فعال":customer.status==="needs_review"?"نیازمند بررسی":customer.status==="archived"?"بایگانی‌شده":"غیرفعال"}/></td><td>{displayDate(customer.created_at)}</td></tr>)}{!customers.length&&<tr><td colSpan={6} className="empty">مشتری‌ای برای نمایش وجود ندارد.</td></tr>}</tbody></table></div>}</section>}
   {page==="tasks"&&!selected&&showTaskForm&&<section className="card" style={{marginBottom:18,padding:22}}>
    <div className="card-head"><div><h2>ثبت وظیفهٔ گردش کار</h2><p>وظیفه به پروندهٔ انتخاب‌شده وصل می‌شود و رویداد ایجاد آن در تاریخچهٔ بک‌اند ثبت خواهد شد.</p></div><button type="button" className="btn secondary" onClick={()=>setShowTaskForm(false)}>بستن</button></div>
    {taskFormError&&<p role="alert" className="notice">{taskFormError}</p>}
    {!apps.length&&<p className="note">برای ساخت وظیفه باید دست‌کم یک پروندهٔ تسهیلاتی در محدودهٔ دسترسی شما وجود داشته باشد.</p>}
    <form onSubmit={async event=>{
     event.preventDefault();setTaskSaving(true);setTaskFormError("");
     try{
      const csrf=await apiRequest("/api/v1/auth/csrf/");
      await apiRequest("/api/v1/tasks/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({
       application:taskApplication,
       title:taskTitle.trim(),
       description:taskDescription.trim(),
       priority:taskPriority,
       due_at:taskDueAt||null
      })});
      setShowTaskForm(false);setTaskApplication("");setTaskTitle("");setTaskDescription("");setTaskPriority("normal");setTaskDueAt("");setApiState("connected");setApiError("");
      try{setTasks(await getTasks());setSectionError("");}
      catch(refreshError){setSectionError("وظیفه ثبت شد، اما تازه‌سازی فهرست انجام نشد: "+((refreshError as Error).message||"خطای نامشخص"));}
     }catch(error){setTaskFormError((error as Error).message||"ثبت وظیفه ناموفق بود.");}
     finally{setTaskSaving(false);}
    }}>
     <div className="form-grid">
      <div className="form-row"><label>پروندهٔ تسهیلاتی *</label><select className="field" required value={taskApplication} onChange={event=>setTaskApplication(event.target.value)}><option value="">انتخاب پرونده</option>{apps.map(application=><option key={application.uuid} value={application.uuid}>{application.id} — {application.customer} — {application.type}</option>)}</select></div>
      <div className="form-row"><label>عنوان وظیفه *</label><input className="field" required maxLength={200} value={taskTitle} onChange={event=>setTaskTitle(event.target.value)} placeholder="مثلاً بررسی مدارک هویتی"/></div>
      <div className="form-row"><label>اولویت</label><select className="field" value={taskPriority} onChange={event=>setTaskPriority(event.target.value)}><option value="low">کم</option><option value="normal">عادی</option><option value="high">زیاد</option><option value="urgent">فوری</option></select></div>
      <div className="form-row"><label>موعد انجام (به وقت تهران)</label><input className="field" type="datetime-local" value={taskDueAt} onChange={event=>setTaskDueAt(event.target.value)}/></div>
      <div className="form-row"><label>شرح وظیفه</label><textarea className="field" rows={3} maxLength={5000} value={taskDescription} onChange={event=>setTaskDescription(event.target.value)} style={{minHeight:84,resize:"vertical"}}/></div>
     </div>
     <div style={{display:"flex",justifyContent:"flex-start",gap:8,marginTop:18}}><button className="btn primary" type="submit" disabled={taskSaving||!apps.length}>{taskSaving?"در حال ثبت…":"ثبت وظیفه"}</button><button className="btn secondary" type="button" disabled={taskSaving} onClick={()=>setShowTaskForm(false)}>انصراف</button></div>
    </form>
   </section>}
   {page==="tasks"&&!selected&&<section className="card list-card"><div className="card-head"><div><h2>وظایف و پیگیری</h2><p>{tasks.length.toLocaleString("fa-IR")} وظیفه در محدوده دسترسی شما</p></div><button className="btn secondary" onClick={()=>setPage("applications")}>پرونده‌ها</button></div>{sectionLoading?<p className="empty">در حال دریافت وظایف…</p>:sectionError?<p className="empty" role="alert">{sectionError}</p>:<div className="table-wrap"><table><thead><tr><th>شماره وظیفه</th><th>عنوان</th><th>پرونده</th><th>مسئول</th><th>اولویت</th><th>موعد</th><th>وضعیت</th><th>اقدام</th></tr></thead><tbody>{tasks.map(task=><tr key={task.id}><td><b className="case-id">{task.task_number}</b></td><td>{task.title}</td><td>{task.application_number||"—"}</td><td>{task.assigned_to_username||"—"}</td><td>{task.priority==="urgent"?"فوری":task.priority==="high"?"زیاد":task.priority==="low"?"کم":"عادی"}</td><td>{displayDate(task.due_at)}</td><td><Status value={task.is_overdue?"عقب‌افتاده":task.status==="open"?"باز":task.status==="in_progress"?"در حال انجام":task.status==="completed"?"انجام‌شده":"لغوشده"}/></td><td>{task.status==="open"?<button className="btn secondary" onClick={()=>void changeTaskStatus(task,"in_progress")}>شروع</button>:task.status==="in_progress"?<button className="btn secondary" onClick={()=>void changeTaskStatus(task,"completed")}>تکمیل</button>:<span>—</span>}</td></tr>)}{!tasks.length&&<tr><td colSpan={8} className="empty">وظیفه‌ای برای نمایش وجود ندارد.</td></tr>}</tbody></table></div>}</section>}
   {page==="reports"&&!selected&&<section className="card list-card"><div className="card-head"><div><h2>گزارش عملیاتی</h2><p>{report?"آخرین تولید: "+displayDate(report.generated_at):"گزارش زنده از بک‌اند"}</p></div><button className="btn secondary" onClick={()=>setPage("dashboard")}>بازگشت به داشبورد</button></div>{sectionLoading?<p className="empty">در حال دریافت گزارش…</p>:sectionError?<p className="empty" role="alert">{sectionError}</p>:report?<><div className="stat-grid"><Stat icon="♙" label="مشتریان" value={report.customers.total.toLocaleString("fa-IR")} delta={"فعال: "+report.customers.active.toLocaleString("fa-IR")} tone="blue"/><Stat icon="▤" label="پرونده‌های تسهیلاتی" value={report.applications.total.toLocaleString("fa-IR")} delta="طبق محدوده دسترسی کاربر" tone="violet"/><Stat icon="◷" label="وظایف عقب‌افتاده" value={report.tasks.overdue.toLocaleString("fa-IR")} delta={"امروز: "+report.tasks.due_today.toLocaleString("fa-IR")} tone="amber"/><Stat icon="✓" label="رسیدهای خدمات" value={report.service_receipts.count.toLocaleString("fa-IR")} delta={"مانده: "+formatMoney(report.service_receipts.outstanding_total)+" تومان"} tone="green"/></div><p className="note">این گزارش فقط داده‌هایی را نمایش می‌دهد که بک‌اند برای نقش و محدوده دسترسی شما مجاز دانسته است.</p></>:<p className="empty">گزارشی در دسترس نیست.</p>}</section>}
   {page==="settings"&&!selected&&<section className="card placeholder"><div className="placeholder-icon">{current.icon}</div><h2>{title[page]}</h2><p>تنظیمات مدیریتی و تغییر گذرواژه باید پس از تعیین قرارداد API و مجوزهای موردنیاز پیاده‌سازی شوند.</p><button className="btn primary" onClick={()=>setPage("applications")}>رفتن به پرونده‌های تسهیلاتی ←</button></section>}
   <footer><span>© ۱۴۰۵ سامانه امید</span><span className="connection"><i className={apiState==="connected"?"connected":""}></i>{apiState==="connected"?"متصل به API":apiState==="error"?"خطا در اتصال API":"در حال اتصال به API"}</span><span>نسخه رابط کاربری ۱.۰</span></footer>
   </div></main>
 </div>
}
function Stat({icon,label,value,delta,tone}:{icon:string;label:string;value:string;delta:string;tone:string}){return <section className="card stat"><div className={"stat-icon "+tone}>{icon}</div><div className="stat-info"><span>{label}</span><b>{value}</b><small>{delta}</small></div><span className="stat-menu">•••</span></section>}
function Status({value}:{value:string}){let cls=value==="تکمیل شده"?"green":value==="نیازمند اقدام"?"amber":value==="در انتظار"?"gray":"blue";return <span className={"status "+cls}><i></i>{value}</span>}
function ApplicationsTable({rows,onSelect}:{rows:Application[];onSelect:(a:Application)=>void}){return <div className="table-wrap"><table><thead><tr><th>شماره پرونده</th><th>مشتری / شرکت</th><th>نوع تسهیلات</th><th>مبلغ درخواستی</th><th>مرحله</th><th>وضعیت</th><th></th></tr></thead><tbody>{rows.map(a=><tr key={a.id} onClick={()=>onSelect(a)}><td><b className="case-id">{a.id}</b></td><td><div className="customer-cell"><span className="company-avatar">{a.customer.slice(0,1)}</span><b>{a.customer}</b></div></td><td>{a.type}</td><td className="amount">{a.amount} <small>تومان</small></td><td>{a.stage}</td><td><Status value={a.status}/></td><td><button className="row-action" aria-label="مشاهده پرونده">‹</button></td></tr>)}{!rows.length&&<tr><td colSpan={7} className="empty">پرونده‌ای با این مشخصات پیدا نشد.</td></tr>}</tbody></table></div>}
export default App;
