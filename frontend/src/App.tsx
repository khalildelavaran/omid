import { useEffect, useMemo, useState } from "react";
import "./style.css";

type NavKey = "dashboard" | "applications" | "customers" | "tasks" | "reports" | "settings";
type Application = { id: string; customer: string; type: string; amount: string; stage: string; status: string; date: string };
type ApiUser = { id: number; username: string; first_name: string; last_name: string; role: string | null; role_label: string | null; must_change_password: boolean };
type ApiError = Error & { status?: number };
const nav: {key:NavKey;label:string;icon:string;group:string}[] = [
 {key:"dashboard",label:"داشبورد",icon:"▦",group:"فضای کاری"},
 {key:"applications",label:"پرونده‌های تسهیلاتی",icon:"▤",group:"فضای کاری"},
 {key:"customers",label:"مشتریان",icon:"♙",group:"فضای کاری"},
 {key:"tasks",label:"وظایف و پیگیری",icon:"◷",group:"عملیات"},
 {key:"reports",label:"گزارش‌ها",icon:"▥",group:"عملیات"},
 {key:"settings",label:"تنظیمات",icon:"⚙",group:"مدیریت"},
];
const stages = ["ثبت درخواست","تکمیل پرونده","بررسی مدارک","بررسی اعتباری","تصمیم اعتباری","قرارداد","پرداخت تسهیلات"];
const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
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
async function apiRequest(path: string, init: RequestInit = {}): Promise<any> {
 const response = await fetch(apiBase + path, {
  ...init,
  credentials: "same-origin",
  headers: { Accept: "application/json", ...((init.headers || {}) as Record<string, string>) },
 });
 let payload: any = {};
 try { payload = await response.json(); } catch { /* Some error responses have no JSON body. */ }
 if (!response.ok) {
  const error = new Error(payload.detail || "درخواست به سرور ناموفق بود.") as ApiError;
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
  id: String(x.application_number ?? x.id ?? "—"),
  customer: String(x.customer_display_name ?? x.customer_number ?? "مشتری"),
  type: productLabels[String(x.product_type)] || String(x.product_type || "تسهیلات"),
  amount: formatMoney(x.requested_amount),
  stage: statusLabels[String(x.status)] || "ثبت درخواست",
  status: statusLabels[String(x.status)] || String(x.status || "نامشخص"),
  date: displayDate(x.created_at),
 }));
}
function App(){
 const [page,setPage]=useState<NavKey>("dashboard");
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
   <div className="content"><div className="page-heading"><div><div className="eyebrow">مدیریت و عملیات</div><h1>{selected?"جزئیات پرونده":title[page]}</h1><p>{selected?"نمای کلی اطلاعات و مرحله جاری پرونده":description[page]}</p></div><div className="heading-actions">{page==="applications"&&<button className="btn primary" onClick={()=>alert("فرم ایجاد پرونده به API متصل خواهد شد.")}>＋ ایجاد پرونده جدید</button>}{page==="dashboard"&&<button className="btn primary" onClick={()=>setPage("applications")}>مشاهده پرونده‌ها <span>←</span></button>}</div></div>
   {page==="dashboard"&&!selected&&<><div className="stat-grid"><Stat icon="▤" label="کل پرونده‌ها" value={counts[0].toLocaleString("fa-IR")} delta="پرونده ثبت‌شده در سامانه" tone="blue"/><Stat icon="◷" label="در حال بررسی" value={counts[1].toLocaleString("fa-IR")} delta="در جریان فرایند" tone="violet"/><Stat icon="⚑" label="نیازمند اقدام" value={counts[2].toLocaleString("fa-IR")} delta="پیگیری توسط کارشناسان" tone="amber"/><Stat icon="✓" label="تکمیل‌شده" value={counts[3].toLocaleString("fa-IR")} delta="پرونده‌های نهایی‌شده" tone="green"/></div>
    <div className="dash-grid"><section className="card chart-card"><div className="card-head"><div><h2>نمای کلی پرونده‌ها</h2><p>توزیع پرونده‌ها بر اساس مرحله فرایند</p></div><button className="subtle-btn" onClick={()=>setPage("reports")}>گزارش کامل ↗</button></div><div className="chart-area"><div className="chart-labels"><span>۱۰۰</span><span>۷۵</span><span>۵۰</span><span>۲۵</span><span>۰</span></div><div className="bars">{[38,62,46,75,56,89,66,48,72,94,60,82].map((h,i)=><div className="bar-column" key={i}><span style={{height:h+"%"}}></span><small>{["فر","ار","ار","خر","خرد","تیر","مرد","شهر","مهر","آبا","آذر","دی"][i]}</small></div>)}</div></div><div className="chart-legend"><span><i className="dot-blue"></i> پرونده‌های ثبت‌شده</span><span>آخرین به‌روزرسانی: امروز</span></div></section>
    <section className="card stage-card"><div className="card-head"><div><h2>وضعیت مراحل</h2><p>پیشرفت پرونده‌ها در گردش کار</p></div><span className="round-icon">◉</span></div><div className="donut-wrap"><div className="donut"><div><b>{apps.length.toLocaleString("fa-IR")}</b><small>پرونده</small></div></div><div className="legend">{[["در حال بررسی","blue","۴۲٪"],["نیازمند اقدام","amber","۲۴٪"],["تکمیل شده","green","۱۸٪"],["سایر موارد","gray","۱۶٪"]].map(x=><div key={x[0]}><span><i className={"dot-"+x[1]}></i>{x[0]}</span><b>{x[2]}</b></div>)}</div></div></section></div>
    <div className="bottom-grid"><section className="card"><div className="card-head"><div><h2>پرونده‌های اخیر</h2><p>آخرین پرونده‌های ثبت یا به‌روزرسانی‌شده</p></div><button className="subtle-btn" onClick={()=>setPage("applications")}>مشاهده همه ←</button></div><ApplicationsTable rows={apps.slice(0,4)} onSelect={setSelected}/></section><section className="card tasks-card"><div className="card-head"><div><h2>نیازمند پیگیری</h2><p>اقدام‌های پیشنهادی برای امروز</p></div><span className="count-pill">۳ مورد</span></div>{apps.filter(a=>a.status==="نیازمند اقدام"||a.status==="در حال بررسی").slice(0,3).map((a,i)=><button className="task-row" key={a.id} onClick={()=>setSelected(a)}><span className={"task-symbol t"+i}>{i===0?"◷":i===1?"▤":"↗"}</span><span className="task-text"><b>{a.customer}</b><small>{a.id} · {a.stage}</small></span><span className="task-arrow">←</span></button>)}</section></div></>}
   {page==="applications"&&!selected&&<section className="card list-card"><div className="card-head list-head"><div><h2>همه پرونده‌ها</h2><p>{filtered.length.toLocaleString("fa-IR")} پرونده مطابق فیلتر</p></div><button className="btn secondary" onClick={()=>{setQuery("");setStatus("همه وضعیت‌ها")}}>پاک‌کردن فیلترها</button></div><div className="filters"><label className="search-field">⌕ <input placeholder="جستجو بر اساس شماره پرونده، مشتری..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={status} onChange={e=>setStatus(e.target.value)}><option>همه وضعیت‌ها</option>{["در حال بررسی","نیازمند اقدام","در انتظار","تکمیل شده"].map(s=><option key={s}>{s}</option>)}</select><button className="btn secondary" onClick={()=>window.print()}>⇩ خروجی / چاپ</button></div><ApplicationsTable rows={filtered} onSelect={setSelected}/></section>}
   {selected&&<section className="detail-layout"><section className="card detail-main"><div className="detail-id"><div><span className="eyebrow">شماره پرونده</span><h2>{selected.id}</h2></div><Status value={selected.status}/></div><div className="detail-fields">{[["نام مشتری",selected.customer],["نوع تسهیلات",selected.type],["مبلغ درخواستی",selected.amount+" تومان"],["مرحله جاری",selected.stage],["تاریخ ثبت",selected.date],["شناسه پرونده",selected.id]].map(x=><div key={x[0]}><small>{x[0]}</small><b>{x[1]}</b></div>)}</div><div className="card-head"><div><h2>مراحل پرونده</h2><p>گردش کار پرونده از ثبت تا پرداخت</p></div></div><div className="workflow">{stages.map((s,i)=><div className={"workflow-step "+(s===selected.stage?"current":stages.indexOf(selected.stage)>i?"done":"")} key={s}><span>{stages.indexOf(selected.stage)>i?"✓":i+1}</span><div><b>{s}</b><small>{s===selected.stage?"مرحله جاری":stages.indexOf(selected.stage)>i?"تکمیل‌شده":"در انتظار انجام"}</small></div></div>)}</div><button className="btn secondary" onClick={()=>setSelected(null)}>← بازگشت به فهرست پرونده‌ها</button></section><aside className="card detail-aside"><h3>اقدامات پرونده</h3><p>دسترسی سریع به عملیات مرتبط با این پرونده</p><button className="btn primary full" onClick={()=>alert("عملیات مرحله بعد باید از طریق API گردش کار انجام شود.")}>ادامه فرایند ←</button><button className="btn secondary full" onClick={()=>window.print()}>چاپ خلاصه پرونده</button><div className="note"><b>نکته</b><p>تغییر مرحله پرونده باید با مجوز کاربر و از طریق API بک‌اند ثبت شود.</p></div></aside></section>}
   {["customers","tasks","reports","settings"].includes(page)&&!selected&&<section className="card placeholder"><div className="placeholder-icon">{current.icon}</div><h2>{title[page]}</h2><p>ساختار رابط کاربری آماده است. اتصال این بخش به API اختصاصی در گام بعدی انجام می‌شود تا اطلاعات واقعی نمایش داده شود.</p><button className="btn primary" onClick={()=>setPage("applications")}>رفتن به پرونده‌های تسهیلاتی ←</button></section>}
   <footer><span>© ۱۴۰۵ سامانه امید</span><span className="connection"><i className={apiState==="connected"?"connected":""}></i>{apiState==="connected"?"متصل به API":apiState==="error"?"خطا در اتصال API":"در حال اتصال به API"}</span><span>نسخه رابط کاربری ۱.۰</span></footer>
   </div></main>
 </div>
}
function Stat({icon,label,value,delta,tone}:{icon:string;label:string;value:string;delta:string;tone:string}){return <section className="card stat"><div className={"stat-icon "+tone}>{icon}</div><div className="stat-info"><span>{label}</span><b>{value}</b><small>{delta}</small></div><span className="stat-menu">•••</span></section>}
function Status({value}:{value:string}){let cls=value==="تکمیل شده"?"green":value==="نیازمند اقدام"?"amber":value==="در انتظار"?"gray":"blue";return <span className={"status "+cls}><i></i>{value}</span>}
function ApplicationsTable({rows,onSelect}:{rows:Application[];onSelect:(a:Application)=>void}){return <div className="table-wrap"><table><thead><tr><th>شماره پرونده</th><th>مشتری / شرکت</th><th>نوع تسهیلات</th><th>مبلغ درخواستی</th><th>مرحله</th><th>وضعیت</th><th></th></tr></thead><tbody>{rows.map(a=><tr key={a.id} onClick={()=>onSelect(a)}><td><b className="case-id">{a.id}</b></td><td><div className="customer-cell"><span className="company-avatar">{a.customer.slice(0,1)}</span><b>{a.customer}</b></div></td><td>{a.type}</td><td className="amount">{a.amount} <small>تومان</small></td><td>{a.stage}</td><td><Status value={a.status}/></td><td><button className="row-action" aria-label="مشاهده پرونده">‹</button></td></tr>)}{!rows.length&&<tr><td colSpan={7} className="empty">پرونده‌ای با این مشخصات پیدا نشد.</td></tr>}</tbody></table></div>}
export default App;
