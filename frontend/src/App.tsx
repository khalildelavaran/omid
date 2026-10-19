import { useEffect, useMemo, useState } from "react";
import "./style.css";

type NavKey = "dashboard" | "applications" | "customers" | "tasks" | "reports" | "settings";
type Application = { id: string; customer: string; type: string; amount: string; stage: string; status: string; date: string };
const initialApplications: Application[] = [
 { id:"OM-1405-0248", customer:"شرکت آریا گستر", type:"تسهیلات سرمایه در گردش", amount:"۱۲,۰۰۰,۰۰۰,۰۰۰", stage:"بررسی مدارک", status:"در حال بررسی", date:"۱۴۰۵/۰۷/۲۵" },
 { id:"OM-1405-0247", customer:"پارس تجارت ایرانیان", type:"تسهیلات توسعه کسب‌وکار", amount:"۸,۵۰۰,۰۰۰,۰۰۰", stage:"تکمیل پرونده", status:"نیازمند اقدام", date:"۱۴۰۵/۰۷/۲۴" },
 { id:"OM-1405-0246", customer:"گروه صنعتی سپهر", type:"تأمین مالی شرکتی", amount:"۲۰,۰۰۰,۰۰۰,۰۰۰", stage:"تصمیم اعتباری", status:"در انتظار", date:"۱۴۰۵/۰۷/۲۲" },
 { id:"OM-1405-0245", customer:"نگین سازه", type:"تسهیلات سرمایه در گردش", amount:"۵,۰۰۰,۰۰۰,۰۰۰", stage:"پرداخت تسهیلات", status:"تکمیل شده", date:"۱۴۰۵/۰۷/۲۰" },
 { id:"OM-1405-0244", customer:"توسعه بازرگانی آریا", type:"تسهیلات توسعه کسب‌وکار", amount:"۳,۲۰۰,۰۰۰,۰۰۰", stage:"ثبت درخواست", status:"در حال بررسی", date:"۱۴۰۵/۰۷/۱۸" },
];
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
async function getApplications(): Promise<Application[] | null> {
 if (!apiBase) return null;
 try {
  const r = await fetch(apiBase + "/api/v1/applications/", {headers:{Accept:"application/json"}});
  if (!r.ok) return null;
  const payload = await r.json();
  const rows = Array.isArray(payload) ? payload : payload.results;
  if (!Array.isArray(rows)) return null;
  return rows.map((x:any) => ({id:String(x.application_number ?? x.id ?? "—"), customer:String(x.customer_name ?? x.customer?.name ?? "مشتری"), type:String(x.facility_type_display ?? x.facility_type ?? "تسهیلات"), amount:Number(x.requested_amount ?? 0).toLocaleString("fa-IR"), stage:String(x.current_stage_display ?? x.current_stage ?? "ثبت درخواست"), status:String(x.status_display ?? x.status ?? "در حال بررسی"), date:String(x.created_at ?? "").slice(0,10) || "—"}));
 } catch { return null; }
}
function App(){
 const [page,setPage]=useState<NavKey>("dashboard");
 const [apps,setApps]=useState(initialApplications);
 const [query,setQuery]=useState("");
 const [status,setStatus]=useState("همه وضعیت‌ها");
 const [selected,setSelected]=useState<Application|null>(null);
 const [mobileOpen,setMobileOpen]=useState(false);
 const [apiState,setApiState]=useState<"demo"|"connected">("demo");
 useEffect(()=>{getApplications().then(rows=>{if(rows){setApps(rows);setApiState("connected")}})},[]);
 const filtered=useMemo(()=>apps.filter(a=>(a.id+" "+a.customer+" "+a.type).toLowerCase().includes(query.toLowerCase())&&(status==="همه وضعیت‌ها"||a.status===status)),[apps,query,status]);
 const current=nav.find(n=>n.key===page)!;
 const counts=[apps.length,apps.filter(a=>a.status==="در حال بررسی").length,apps.filter(a=>a.status==="نیازمند اقدام").length,apps.filter(a=>a.status==="تکمیل شده").length];
 const title:Record<NavKey,string>={dashboard:"داشبورد مدیریتی",applications:"پرونده‌های تسهیلاتی",customers:"مشتریان",tasks:"وظایف و پیگیری",reports:"گزارش‌ها",settings:"تنظیمات سامانه"};
 const description:Record<NavKey,string>={dashboard:"نمای کلی عملکرد و وضعیت پرونده‌های تسهیلاتی سامانه امید",applications:"مدیریت و پیگیری پرونده‌ها از ثبت درخواست تا پرداخت تسهیلات",customers:"فهرست مشتریان حقیقی و حقوقی و اطلاعات ارتباطی آن‌ها",tasks:"پیگیری اقدامات معوق و وظایف محول‌شده به کارشناسان",reports:"گزارش‌های مدیریتی و عملیاتی پرونده‌ها",settings:"تنظیمات عمومی و اتصال رابط کاربری به سرویس سامانه"};
 return <div className="app" dir="rtl">
  <aside className={"sidebar "+(mobileOpen?"open":"")}><div className="brand"><div className="brand-mark">ا</div><div><b>سامانه امید</b><small>مدیریت مالی و تسهیلات</small></div><button className="mobile-close" onClick={()=>setMobileOpen(false)}>×</button></div>
   <div className="workspace"><span className="workspace-dot"></span><div><b>شرکت خدمات مالی امید</b><small>فضای کاری سازمانی</small></div><span className="down">⌄</span></div>
   {["فضای کاری","عملیات","مدیریت"].map(group=><div className="nav-group" key={group}><label>{group}</label>{nav.filter(n=>n.group===group).map(n=><button key={n.key} className={"nav-item "+(page===n.key?"active":"")} onClick={()=>{setPage(n.key);setSelected(null);setMobileOpen(false)}}><span className="nav-icon">{n.icon}</span>{n.label}{n.key==="tasks"&&<i>۵</i>}</button>)}</div>)}
   <div className="sidebar-bottom"><div className="help-icon">?</div><div><b>به راهنمایی نیاز دارید؟</b><small>راهنمای استفاده از سامانه</small></div><span>›</span></div>
   <div className="user-card"><div className="avatar">خد</div><div><b>خلیل دلاوران</b><small>مدیر سامانه</small></div><span>•••</span></div>
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
   <footer><span>© ۱۴۰۵ سامانه امید</span><span className="connection"><i className={apiState==="connected"?"connected":""}></i>{apiState==="connected"?"متصل به API":"حالت نمایشی · API تنظیم نشده"}</span><span>نسخه رابط کاربری ۱.۰</span></footer>
   </div></main>
 </div>
}
function Stat({icon,label,value,delta,tone}:{icon:string;label:string;value:string;delta:string;tone:string}){return <section className="card stat"><div className={"stat-icon "+tone}>{icon}</div><div className="stat-info"><span>{label}</span><b>{value}</b><small>{delta}</small></div><span className="stat-menu">•••</span></section>}
function Status({value}:{value:string}){let cls=value==="تکمیل شده"?"green":value==="نیازمند اقدام"?"amber":value==="در انتظار"?"gray":"blue";return <span className={"status "+cls}><i></i>{value}</span>}
function ApplicationsTable({rows,onSelect}:{rows:Application[];onSelect:(a:Application)=>void}){return <div className="table-wrap"><table><thead><tr><th>شماره پرونده</th><th>مشتری / شرکت</th><th>نوع تسهیلات</th><th>مبلغ درخواستی</th><th>مرحله</th><th>وضعیت</th><th></th></tr></thead><tbody>{rows.map(a=><tr key={a.id} onClick={()=>onSelect(a)}><td><b className="case-id">{a.id}</b></td><td><div className="customer-cell"><span className="company-avatar">{a.customer.slice(0,1)}</span><b>{a.customer}</b></div></td><td>{a.type}</td><td className="amount">{a.amount} <small>تومان</small></td><td>{a.stage}</td><td><Status value={a.status}/></td><td><button className="row-action" aria-label="مشاهده پرونده">‹</button></td></tr>)}{!rows.length&&<tr><td colSpan={7} className="empty">پرونده‌ای با این مشخصات پیدا نشد.</td></tr>}</tbody></table></div>}
export default App;
