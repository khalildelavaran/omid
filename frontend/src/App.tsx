import { useEffect, useMemo, useState } from "react";
import "./style.css";

type NavKey = "dashboard" | "applications" | "customers" | "tasks" | "reports" | "settings";
type Application = { uuid: string; id: string; customer: string; type: string; amount: string; stage: string; status: string; statusKey: string; date: string };
type ApplicationStatusAction = { status: string; label: string; variant: "primary" | "secondary"; requiresReason?: boolean };
type ApplicationEventRow = { id: string | number; event_type: string; previous_status: string | null; new_status: string | null; note: string; actor_username: string | null; created_at: string };
type ApplicationDocumentRow = { id:string; document_number:string; application:string; application_number:string; document_type:string; replaces_document:string|null; replaces_document_number:string|null; original_filename:string; content_type:string; size_bytes:number; sha256:string; status:string; review_note:string; uploaded_by:string; uploaded_by_username:string; reviewed_by:string|null; reviewed_by_username:string|null; reviewed_at:string|null; created_at:string; updated_at:string };
type GuaranteeRequestRow = { id:string; request_number:string; application:string; application_number:string; loan_customer_name:string; requester_customer:string|null; requester_customer_name:string; status:string; note:string; created_by:string; created_by_username:string; created_at:string; updated_at:string };
type GuaranteeRequestEventRow = { id:string; guarantee_request:string; event_type:string; previous_status:string; new_status:string; note:string; actor_username:string|null; created_at:string };
type GuaranteeStatusAction = { status:string; label:string; variant:"primary"|"secondary"; requiresReason?:boolean };
const workflowStages = [
 {key:"under_review",label:"بررسی اولیه"},
 {key:"awaiting_documents",label:"تکمیل مدارک"},
 {key:"awaiting_approval",label:"تصمیم اعتباری"},
];
const staffWorkflowActions: Record<string, ApplicationStatusAction[]> = {
 under_review: [
  {status:"awaiting_documents",label:"درخواست تکمیل مدارک",variant:"secondary"},
  {status:"awaiting_approval",label:"ارسال برای تأیید اعتباری",variant:"primary"},
  {status:"cancelled",label:"لغو پرونده",variant:"secondary"},
 ],
 awaiting_documents: [
  {status:"under_review",label:"بازگشت به بررسی",variant:"secondary"},
  {status:"awaiting_approval",label:"ارسال برای تأیید اعتباری",variant:"primary"},
  {status:"cancelled",label:"لغو پرونده",variant:"secondary"},
 ],
 awaiting_approval: [
  {status:"under_review",label:"بازگشت به بررسی",variant:"secondary"},
  {status:"cancelled",label:"لغو پرونده",variant:"secondary"},
 ],
};
function getApplicationStatusActions(application: Application, role: string | null): ApplicationStatusAction[] {
 if(role==="credit_approver" && application.statusKey==="awaiting_approval") {
  return [
   {status:"approved",label:"تأیید اعتباری",variant:"primary"},
   {status:"rejected",label:"رد درخواست",variant:"secondary",requiresReason:true},
  ];
 }
 if(role==="system_admin"||role==="intake"||role==="case_worker") {
  return staffWorkflowActions[application.statusKey] || [];
 }
 return [];
}
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

const apiBase = ""; // Same-origin only: Vite proxies /api locally and Cloudflare Worker proxies it in production.
const statusLabels: Record<string, string> = {
 under_review: "در حال بررسی",
 awaiting_documents: "نیازمند اقدام",
 awaiting_approval: "در انتظار",
 approved: "تأیید شده",
 rejected: "رد شده",
 cancelled: "لغو شده",
};
const applicationEventLabels: Record<string, string> = { created: "ثبت پرونده", status_changed: "تغییر وضعیت", note_added: "یادداشت پیگیری", archived: "بایگانی پرونده" };
const documentTypeLabels: Record<string,string> = { identity:"مدرک هویتی", address:"مدرک نشانی", income:"مدرک درآمد", bank_statement:"گردش حساب", contract:"قرارداد", other:"سایر مدارک" };
const documentStatusLabels: Record<string,string> = { pending_review:"در انتظار بررسی", accepted:"پذیرفته‌شده", rejected:"نیازمند اصلاح" };
const guaranteeStatusLabels: Record<string,string> = { registered:"ثبت‌شده", under_review:"در حال بررسی", approved:"تأیید شده", rejected:"رد شده", fulfilled:"انجام‌شده", cancelled:"لغو شده" };
const guaranteeEventLabels: Record<string,string> = { created:"ثبت درخواست ضمانت", status_changed:"تغییر وضعیت", note_added:"یادداشت پیگیری" };
function getGuaranteeStatusActions(request:GuaranteeRequestRow,role:string|null):GuaranteeStatusAction[]{
 if(["system_admin","intake","case_worker"].includes(role||"")){
  if(request.status==="registered")return [{status:"under_review",label:"شروع بررسی",variant:"primary"},{status:"cancelled",label:"لغو درخواست",variant:"secondary",requiresReason:true}];
  if(request.status==="under_review")return [{status:"cancelled",label:"لغو درخواست",variant:"secondary",requiresReason:true}];
 }
 if(role==="credit_approver"&&request.status==="under_review")return [{status:"approved",label:"تأیید ضمانت",variant:"primary"},{status:"rejected",label:"رد ضمانت",variant:"secondary",requiresReason:true}];
 if(role==="finance"&&request.status==="approved")return [{status:"fulfilled",label:"ثبت انجام ضمانت",variant:"primary"}];
 return [];
}
const productLabels: Record<string, string> = {
 working_capital: "تسهیلات سرمایه در گردش",
 personal: "تسهیلات شخصی",
 corporate_credit: "اعتباری شرکتی",
 equipment: "خرید تجهیزات",
};
const dashboardStatusDefinitions = [
 {key:"under_review",label:"در حال بررسی",chartLabel:"بررسی",tone:"blue",color:"#315d95"},
 {key:"awaiting_documents",label:"نیازمند مدارک",chartLabel:"مدارک",tone:"amber",color:"#e8ad58"},
 {key:"awaiting_approval",label:"در انتظار تأیید",chartLabel:"تأیید",tone:"violet",color:"#8e80db"},
 {key:"approved",label:"تأیید شده",chartLabel:"قبول",tone:"green",color:"#58b58c"},
 {key:"rejected",label:"رد شده",chartLabel:"رد",tone:"gray",color:"#b4bfcc"},
 {key:"cancelled",label:"لغو شده",chartLabel:"لغو",tone:"gray",color:"#8d98a9"},
] as const;
function buildStatusGradient(metrics: {count:number;color:string}[], total:number): string {
 if(total<=0) return "conic-gradient(#dbe2ea 0 100%)";
 let offset=0;
 const stops=metrics.map(item=>{
  const end=offset+(item.count/total)*100;
  const stop=`${item.color} ${offset}% ${end}%`;
  offset=end;
  return stop;
 });
 return `conic-gradient(${stops.join(",")})`;
}
const apiFieldLabels: Record<string, string> = {
 customer_type: "نوع مشتری", first_name: "نام", last_name: "نام خانوادگی",
 organization_name: "نام سازمان", phone_number: "شماره تلفن", email: "ایمیل",
 national_id: "کد ملی / شناسه ملی", birth_date: "تاریخ تولد",
 father_name: "نام پدر", occupation: "شغل", postal_code: "کدپستی",
 sana_verified: "وضعیت احراز ثنا", status: "وضعیت پرونده", notes: "یادداشت",
 customer: "مشتری", product_type: "نوع تسهیلات", requested_amount: "مبلغ درخواستی",
 term_months: "مدت بازپرداخت", title: "عنوان", application: "پرونده",
 priority: "اولویت", due_at: "موعد انجام", description: "شرح وظیفه",
 current_password: "گذرواژه فعلی", new_password: "گذرواژه جدید",
 status_note: "دلیل تصمیم",
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
function mapApplication(x: any): Application {
 return {
  uuid: String(x.id ?? ""),
  id: String(x.application_number ?? x.id ?? "—"),
  customer: String(x.customer_display_name ?? x.customer_number ?? "مشتری"),
  type: productLabels[String(x.product_type)] || String(x.product_type || "تسهیلات"),
  amount: formatMoney(x.requested_amount),
  stage: statusLabels[String(x.status)] || "ثبت درخواست",
  status: statusLabels[String(x.status)] || String(x.status || "نامشخص"),
  statusKey: String(x.status || ""),
  date: displayDate(x.created_at),
 };
}
async function getApplications(): Promise<Application[]> {
 const payload = await apiRequest("/api/v1/applications/");
 const rows = Array.isArray(payload) ? payload : payload.results;
 if (!Array.isArray(rows)) throw new Error("ساختار پاسخ فهرست پرونده‌ها معتبر نیست.");
 return rows.map(mapApplication);
}
async function getApplicationEvents(applicationId: string): Promise<ApplicationEventRow[]> {
 const payload = await apiRequest("/api/v1/applications/" + applicationId + "/events/");
 const rows = Array.isArray(payload) ? payload : payload.results;
 if (!Array.isArray(rows)) throw new Error("ساختار پاسخ تاریخچه پرونده معتبر نیست.");
 return rows as ApplicationEventRow[];
}
async function getApplicationDocuments(applicationId: string): Promise<ApplicationDocumentRow[]> {
 const payload = await apiRequest("/api/v1/documents/?application=" + encodeURIComponent(applicationId));
 const rows = Array.isArray(payload) ? payload : payload.results;
 if (!Array.isArray(rows)) throw new Error("ساختار پاسخ اسناد پرونده معتبر نیست.");
 return rows as ApplicationDocumentRow[];
}
function displayDateTime(value: unknown): string {
 if (!value) return "—";
 const date = new Date(String(value));
 return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR", {year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit"}).format(date);
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
async function getOperationsReport(): Promise<OperationsReport> {
 const payload = await apiRequest("/api/v1/reports/operations/");
 if(!payload || typeof payload!=="object" || !payload.applications || !payload.applications.by_status) {
  throw new Error("ساختار پاسخ گزارش عملیاتی معتبر نیست.");
 }
 return payload as OperationsReport;
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
 const [applicationStatusSaving,setApplicationStatusSaving]=useState(false);
 const [applicationStatusError,setApplicationStatusError]=useState("");
 const [applicationStatusSuccess,setApplicationStatusSuccess]=useState("");
 const [applicationDecisionNote,setApplicationDecisionNote]=useState("");
 const [applicationEvents,setApplicationEvents]=useState<ApplicationEventRow[]>([]);
 const [applicationEventsLoading,setApplicationEventsLoading]=useState(false);
 const [applicationEventsError,setApplicationEventsError]=useState("");
 const [applicationNote,setApplicationNote]=useState("");
 const [applicationNoteSaving,setApplicationNoteSaving]=useState(false);
 const [applicationNoteError,setApplicationNoteError]=useState("");
 const [applicationNoteSuccess,setApplicationNoteSuccess]=useState("");
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
  setApplicationDecisionNote("");
  setApplicationStatusError("");
  setApplicationStatusSuccess("");
 },[selected?.uuid]);
 useEffect(()=>{
  const applicationId=selected?.uuid;
  setApplicationEvents([]);
  setApplicationEventsError("");
  setApplicationNote("");
  setApplicationNoteError("");
  setApplicationNoteSuccess("");
  if(!applicationId){setApplicationEventsLoading(false);return;}
  let active=true;
  setApplicationEventsLoading(true);
  void getApplicationEvents(applicationId).then(rows=>{
   if(active){setApplicationEvents(rows);setApplicationEventsError("");}
  }).catch(error=>{
   if(active)setApplicationEventsError((error as Error).message||"دریافت تاریخچه پرونده ناموفق بود.");
  }).finally(()=>{if(active)setApplicationEventsLoading(false);});
  return ()=>{active=false;};
 },[selected?.uuid]);
 useEffect(()=>{
  if(!authUser || !["dashboard","customers","tasks","reports"].includes(page)) return;
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
    } else if(page==="dashboard"){
     const [liveReport,liveTasks]=await Promise.all([getOperationsReport(),getTasks()]);
     if(active){setReport(liveReport);setTasks(liveTasks);}
    } else {
     const liveReport=await getOperationsReport();
     if(active)setReport(liveReport);
    }
    if(active){setApiState("connected");setApiError("");}
   } catch(error) {
    if(active){const message=(error as Error).message||"دریافت اطلاعات ناموفق بود.";setSectionError(message);setApiError(message);if((error as ApiError).status===502||(error as ApiError).status===503)setApiState("error");}
   } finally {if(active)setSectionLoading(false);}
  };
  void load();
  return ()=>{active=false;};
 },[authUser,page]);
 async function changeApplicationStatus(nextStatus:string){
  if(!selected)return;
  const action=getApplicationStatusActions(selected,authUser?.role||null).find(item=>item.status===nextStatus);
  if(!action)return;
  if(action.requiresReason&&!applicationDecisionNote.trim()){
   setApplicationStatusError("برای رد درخواست، ثبت دلیل تصمیم الزامی است.");
   return;
  }
  if(nextStatus==="cancelled"&&!window.confirm("آیا از لغو این پرونده مطمئن هستید؟ پس از لغو، تغییر وضعیت عادی ممکن نخواهد بود."))return;
  if(nextStatus==="rejected"&&!window.confirm("آیا از ثبت تصمیم نهایی رد درخواست مطمئن هستید؟"))return;
  setApplicationStatusSaving(true);setApplicationStatusError("");setApplicationStatusSuccess("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const updated=await apiRequest("/api/v1/applications/"+selected.uuid+"/",{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({status:nextStatus,...(action.requiresReason?{status_note:applicationDecisionNote.trim()}:{})})});
   const mapped=mapApplication(updated);
   setSelected(mapped);
   setApps(current=>current.map(item=>item.uuid===mapped.uuid?mapped:item));
   setApplicationDecisionNote("");
   try {
    setApplicationEvents(await getApplicationEvents(mapped.uuid));
    setApplicationEventsError("");
   } catch(historyError) {
    setApplicationEventsError("وضعیت تغییر کرد، اما تاریخچه تازه نشد: "+((historyError as Error).message||"خطای نامشخص"));
   }
   setApplicationStatusSuccess("وضعیت پرونده با موفقیت به «"+mapped.status+"» تغییر کرد.");
   setApiState("connected");setApiError("");
  }catch(error){
   setApplicationStatusError((error as Error).message||"تغییر وضعیت پرونده ناموفق بود.");
  }finally{setApplicationStatusSaving(false);}
 }
 async function addApplicationNote(){
  if(!selected)return;
  const note=applicationNote.trim();
  if(!note){setApplicationNoteError("متن یادداشت را وارد کنید.");return;}
  setApplicationNoteSaving(true);setApplicationNoteError("");setApplicationNoteSuccess("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const created=await apiRequest("/api/v1/applications/"+selected.uuid+"/notes/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({note})});
   setApplicationEvents(current=>[...current,created as ApplicationEventRow]);
   setApplicationNote("");
   setApplicationNoteSuccess("یادداشت پیگیری ثبت شد.");
   setApiState("connected");setApiError("");
  }catch(error){
   setApplicationNoteError((error as Error).message||"ثبت یادداشت پیگیری ناموفق بود.");
  }finally{setApplicationNoteSaving(false);}
 }
 async function changeTaskStatus(task:TaskRow,nextStatus:string){
  try{const csrf=await apiRequest("/api/v1/auth/csrf/");await apiRequest("/api/v1/tasks/"+task.id+"/",{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({status:nextStatus})});setTasks(await getTasks());setSectionError("");}catch(error){setSectionError((error as Error).message||"به‌روزرسانی وضعیت وظیفه ناموفق بود.");}
 }
 const filtered=useMemo(()=>apps.filter(a=>(a.id+" "+a.customer+" "+a.type).toLowerCase().includes(query.toLowerCase())&&(status==="همه وضعیت‌ها"||a.status===status)),[apps,query,status]);
 const current=nav.find(n=>n.key===page)!;
 const counts=report?[
  report.applications.total,
  report.applications.by_status.under_review??0,
  report.applications.by_status.awaiting_documents??0,
  report.applications.by_status.approved??0
]:null;
 const applicationStatusMetrics=dashboardStatusDefinitions.map(item=>({
  ...item,
  count:Number(report?.applications.by_status?.[item.key]??0),
 }));
 const statusDonutGradient=buildStatusGradient(applicationStatusMetrics,report?.applications.total??0);
 const maxStatusCount=Math.max(1,...applicationStatusMetrics.map(item=>item.count));
 const followUpTasks=tasks.filter(task=>task.status==="open"||task.status==="in_progress").slice(0,3);
 const activeTaskCount=report?report.tasks.open+report.tasks.in_progress:null;
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
 if(authUser.must_change_password) return <PasswordChangeForm required onSuccess={()=>setAuthUser(current=>current?{...current,must_change_password:false}:current)}/>;
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
   {page==="applications"&&!selected&&showApplicationForm&&<section className="card" style={{marginBottom:18,padding:22}}><div className="card-head"><div><h2>ثبت پرونده تسهیلاتی</h2><p>پرونده در سرور ثبت می‌شود و شماره آن توسط بک‌اند تولید خواهد شد.</p></div><button className="btn secondary" onClick={()=>setShowApplicationForm(false)}>بستن</button></div>{applicationFormError&&<p role="alert" className="notice">{applicationFormError}</p>}<form onSubmit={async event=>{event.preventDefault();setApplicationSaving(true);setApplicationFormError("");try{const csrf=await apiRequest("/api/v1/auth/csrf/");const created=await apiRequest("/api/v1/applications/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({customer:applicationCustomer,product_type:applicationProduct,requested_amount:applicationAmount,term_months:applicationTerm?Number(applicationTerm):null,purpose:applicationPurpose,notes:applicationNotes})});setApps(current=>[mapApplication(created),...current.filter(item=>item.uuid!==String(created.id))]);setShowApplicationForm(false);setApplicationCustomer("");setApplicationAmount("");setApplicationPurpose("");setApplicationNotes("");setApiState("connected");setApiError("");setApplicationFormError("");}catch(error){setApplicationFormError((error as Error).message||"ثبت پرونده انجام نشد.");}finally{setApplicationSaving(false);}}}><div className="form-grid"><div className="form-row"><label>مشتری *</label><select className="field" required value={applicationCustomer} onChange={e=>setApplicationCustomer(e.target.value)}><option value="">انتخاب مشتری</option>{customers.filter(x=>x.status==="active").map(x=><option key={x.id} value={x.id}>{x.customer_number} — {x.customer_type==="organization"?x.organization_name:[x.first_name,x.last_name].filter(Boolean).join(" ")}</option>)}</select></div><div className="form-row"><label>نوع تسهیلات *</label><select className="field" value={applicationProduct} onChange={e=>setApplicationProduct(e.target.value)}><option value="working_capital">سرمایه در گردش</option><option value="personal">تسهیلات شخصی</option><option value="corporate_credit">اعتباری شرکتی</option><option value="equipment">خرید تجهیزات</option></select></div><div className="form-row"><label>مبلغ درخواستی (تومان) *</label><input className="field" required min="1" type="number" step="1" value={applicationAmount} onChange={e=>setApplicationAmount(e.target.value)}/></div><div className="form-row"><label>مدت بازپرداخت (ماه)</label><input className="field" min="1" max="240" type="number" value={applicationTerm} onChange={e=>setApplicationTerm(e.target.value)}/></div><div className="form-row"><label>هدف درخواست</label><input className="field" maxLength={250} value={applicationPurpose} onChange={e=>setApplicationPurpose(e.target.value)}/></div><div className="form-row"><label>یادداشت</label><input className="field" value={applicationNotes} onChange={e=>setApplicationNotes(e.target.value)}/></div></div><div className="actions" style={{marginTop:16}}><button className="btn primary" disabled={applicationSaving||!customers.length}>{applicationSaving?"در حال ثبت…":"ثبت پرونده در سامانه"}</button><button type="button" className="btn secondary" onClick={()=>setShowApplicationForm(false)}>انصراف</button></div>{customers.length===0&&<p className="muted">برای ثبت پرونده ابتدا باید دست‌کم یک مشتری فعال در محدوده دسترسی شما وجود داشته باشد.</p>}</form></section>}
   {page==="dashboard"&&!selected&&<>
    {sectionError&&<p className="notice" role="alert">{sectionError}</p>}
    {sectionLoading&&!report&&<p className="note">در حال دریافت آمار عملیاتی و وظایف از سرور…</p>}
    <div className="stat-grid"><Stat icon="▤" label="کل پرونده‌ها" value={counts?counts[0].toLocaleString("fa-IR"):"—"} delta={report?.scope==="assigned_records"?"پرونده‌های تخصیص‌یافته به شما":"طبق گزارش عملیاتی زنده"} tone="blue"/><Stat icon="◷" label="در حال بررسی" value={counts?counts[1].toLocaleString("fa-IR"):"—"} delta="وضعیت ثبت‌شده در بک‌اند" tone="violet"/><Stat icon="⚑" label="نیازمند مدارک" value={counts?counts[2].toLocaleString("fa-IR"):"—"} delta="پرونده‌های منتظر تکمیل مدارک" tone="amber"/><Stat icon="✓" label="تأیید شده" value={counts?counts[3].toLocaleString("fa-IR"):"—"} delta="تصمیم‌های تأییدشده در بک‌اند" tone="green"/></div>
    <div className="dash-grid"><section className="card chart-card"><div className="card-head"><div><h2>توزیع پرونده‌ها بر اساس وضعیت</h2><p>تعداد واقعی؛ ستون‌ها نسبت به بیشترین وضعیت مقیاس شده‌اند</p></div><button className="subtle-btn" onClick={()=>setPage("reports")}>گزارش کامل ↗</button></div>
     {!report?<p className="empty">{sectionError?"نمودار به‌دلیل خطای دریافت داده در دسترس نیست.":"در انتظار دریافت گزارش…"}</p>:<>
      <div className="chart-area"><div className="chart-labels"><span>۱۰۰٪</span><span>۷۵٪</span><span>۵۰٪</span><span>۲۵٪</span><span>۰</span></div><div className="bars">{applicationStatusMetrics.map(item=><div className="bar-column" key={item.key} title={item.label+": "+item.count.toLocaleString("fa-IR")}><span style={{height:(item.count/maxStatusCount*100)+"%"}}></span><small>{item.chartLabel}</small></div>)}</div></div>
      <div className="chart-legend"><span><i className="dot-blue"></i> هر ستون یک وضعیت را نشان می‌دهد</span><span>{report.scope==="assigned_records"?"فقط پرونده‌های مجاز شما":"داده‌های کل سازمان"} · آخرین به‌روزرسانی: {displayDate(report.generated_at)}</span></div>
     </>}
    </section>
    <section className="card stage-card"><div className="card-head"><div><h2>سهم هر وضعیت</h2><p>درصد واقعی از کل پرونده‌های گزارش</p></div><span className="round-icon">◉</span></div>{report?<div className="donut-wrap"><div className="donut" style={{background:statusDonutGradient}}><div><b>{report.applications.total.toLocaleString("fa-IR")}</b><small>پرونده</small></div></div><div className="legend">{applicationStatusMetrics.map(item=><div key={item.key} title={item.count.toLocaleString("fa-IR")+" پرونده"}><span><i className={"dot-"+item.tone}></i>{item.label}</span><b>{Math.round(item.count/report.applications.total*100).toLocaleString("fa-IR")+"٪"}</b></div>)}</div></div>:<p className="empty">{sectionError?"سهم وضعیت‌ها به‌دلیل خطای دریافت داده در دسترس نیست.":"در انتظار دریافت گزارش…"}</p>}</section></div>
    <div className="bottom-grid"><section className="card"><div className="card-head"><div><h2>پرونده‌های اخیر</h2><p>آخرین پرونده‌های دریافت‌شده از API</p></div><button className="subtle-btn" onClick={()=>setPage("applications")}>مشاهده همه ←</button></div><ApplicationsTable rows={apps.slice(0,4)} onSelect={setSelected}/></section><section className="card tasks-card"><div className="card-head"><div><h2>نیازمند پیگیری</h2><p>{report?report.tasks.overdue.toLocaleString("fa-IR")+" وظیفه عقب‌افتاده، "+report.tasks.due_today.toLocaleString("fa-IR")+" موعد امروز":"آمار وظایف در دسترس نیست"}</p></div><span className="count-pill">{activeTaskCount===null?"—":"فعال: "+activeTaskCount.toLocaleString("fa-IR")}</span></div>
     {followUpTasks.map((task,i)=><button className="task-row" key={task.id} onClick={()=>setPage("tasks")}><span className={"task-symbol t"+i}>{task.is_overdue?"!":task.status==="in_progress"?"↻":"◷"}</span><span className="task-text"><b>{task.title}</b><small>{task.task_number} · {task.application_number||"بدون پرونده"}</small></span><span className="task-arrow">{task.is_overdue?"عقب‌افتاده":"مشاهده"}</span></button>)}
     {!sectionLoading&&!sectionError&&followUpTasks.length===0&&<p className="empty">وظیفهٔ بازی برای پیگیری وجود ندارد.</p>}
    </section></div></>}
   {page==="applications"&&!selected&&<section className="card list-card"><div className="card-head list-head"><div><h2>همه پرونده‌ها</h2><p>{filtered.length.toLocaleString("fa-IR")} پرونده مطابق فیلتر</p></div><button className="btn secondary" onClick={()=>{setQuery("");setStatus("همه وضعیت‌ها")}}>پاک‌کردن فیلترها</button></div><div className="filters"><label className="search-field">⌕ <input placeholder="جستجو بر اساس شماره پرونده، مشتری..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={status} onChange={e=>setStatus(e.target.value)}><option>همه وضعیت‌ها</option>{["در حال بررسی","نیازمند اقدام","در انتظار","تکمیل شده"].map(s=><option key={s}>{s}</option>)}</select><button className="btn secondary" onClick={()=>window.print()}>⇩ خروجی / چاپ</button></div><ApplicationsTable rows={filtered} onSelect={setSelected}/></section>}
   {selected&&<section className="detail-layout"><section className="card detail-main"><div className="detail-id"><div><span className="eyebrow">شماره پرونده</span><h2>{selected.id}</h2></div><Status value={selected.status}/></div><div className="detail-fields">{[["نام مشتری",selected.customer],["نوع تسهیلات",selected.type],["مبلغ درخواستی",selected.amount+" تومان"],["مرحله جاری",selected.stage],["تاریخ ثبت",selected.date],["شناسه پرونده",selected.id]].map(x=><div key={x[0]}><small>{x[0]}</small><b>{x[1]}</b></div>)}</div><div className="card-head"><div><h2>مراحل پرونده</h2><p>گردش کار پرونده از ثبت تا پرداخت</p></div></div><div className="workflow">{["approved","rejected","cancelled"].includes(selected.statusKey)?<div className={"workflow-step "+(selected.statusKey==="approved"?"done":"current")}><span>{selected.statusKey==="approved"?"✓":"!"}</span><div><b>{selected.status}</b><small>پرونده به وضعیت نهایی رسیده است.</small></div></div>:workflowStages.map((stageItem,i)=>{const currentStage=workflowStages.findIndex(item=>item.key===selected.statusKey);return <div className={"workflow-step "+(stageItem.key===selected.statusKey?"current":currentStage>i?"done":"")} key={stageItem.key}><span>{currentStage>i?"✓":i+1}</span><div><b>{stageItem.label}</b><small>{stageItem.key===selected.statusKey?"مرحله جاری":currentStage>i?"تکمیل‌شده":"در انتظار انجام"}</small></div></div>;})}</div><button className="btn secondary" onClick={()=>setSelected(null)}>← بازگشت به فهرست پرونده‌ها</button></section><aside className="card detail-aside"><h3>اقدامات پرونده</h3><p>اقدام‌های مجاز بر اساس نقش کاربر و وضعیت فعلی</p>
   {applicationStatusError&&<p role="alert" className="notice">{applicationStatusError}</p>}
   {applicationStatusSuccess&&<p role="status" className="note">{applicationStatusSuccess}</p>}
   {getApplicationStatusActions(selected,authUser?.role||null).some(action=>action.requiresReason)&&<div className="form-row" style={{marginTop:12}}><label htmlFor="application-decision-note">دلیل رد درخواست *</label><textarea id="application-decision-note" className="field" rows={3} maxLength={1000} value={applicationDecisionNote} onChange={event=>setApplicationDecisionNote(event.target.value)} placeholder="دلیل تصمیم اعتباری را ثبت کنید." style={{minHeight:84,resize:"vertical"}}/></div>}
   {getApplicationStatusActions(selected,authUser?.role||null).map(action=><button key={action.status} className={"btn "+action.variant+" full"} disabled={applicationStatusSaving||(action.requiresReason&&!applicationDecisionNote.trim())} onClick={()=>void changeApplicationStatus(action.status)}>{applicationStatusSaving?"در حال ثبت…":action.label}</button>)}
   {getApplicationStatusActions(selected,authUser?.role||null).length===0&&<p className="note">برای نقش فعلی یا وضعیت این پرونده، تغییر وضعیت مجازی وجود ندارد.</p>}
   <button className="btn secondary full" onClick={()=>window.print()}>چاپ خلاصه پرونده</button></aside></section>}
   {selected&&<section className="card" style={{marginTop:16,padding:22}}>
    <div className="card-head"><div><h2>تاریخچه و یادداشت‌های پیگیری</h2><p>رویدادهای ثبت‌شده در بک‌اند؛ یادداشت‌های پیگیری به سابقه پرونده اضافه می‌شوند.</p></div><span style={{fontSize:10,color:"#8492a5"}}>{applicationEvents.length.toLocaleString("fa-IR")} رویداد</span></div>
    {applicationEventsLoading&&<p className="empty">در حال دریافت تاریخچه پرونده…</p>}
    {applicationEventsError&&<p role="alert" style={{fontSize:11,lineHeight:1.9,color:"#b42318",background:"#fff1f0",padding:10,borderRadius:8}}>{applicationEventsError}</p>}
    {!applicationEventsLoading&&!applicationEventsError&&applicationEvents.length===0&&<p className="empty">هنوز رویدادی برای این پرونده ثبت نشده است.</p>}
    {applicationEvents.length>0&&<div style={{display:"grid",gap:10}}>{[...applicationEvents].reverse().map(item=><article key={item.id} style={{border:"1px solid #edf1f6",borderRadius:8,padding:14,background:"#fcfdff"}}>
     <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><b style={{fontSize:11,color:"#35465b"}}>{applicationEventLabels[item.event_type]||item.event_type}</b><small style={{fontSize:9,color:"#91a0b2"}}>{displayDateTime(item.created_at)}</small></div>
     {item.previous_status&&item.new_status?<p style={{fontSize:10,color:"#66758a",margin:"9px 0 0"}}>وضعیت: {statusLabels[item.previous_status]||item.previous_status} ← {statusLabels[item.new_status]||item.new_status}</p>:item.new_status?<p style={{fontSize:10,color:"#66758a",margin:"9px 0 0"}}>وضعیت ثبت‌شده: {statusLabels[item.new_status]||item.new_status}</p>:null}
     {item.note&&<p style={{fontSize:11,lineHeight:2,color:"#526176",whiteSpace:"pre-wrap",overflowWrap:"anywhere",margin:"9px 0"}}>{item.note}</p>}
     <small style={{fontSize:9,color:"#91a0b2"}}>ثبت توسط: {item.actor_username||"کاربر سامانه"}</small>
    </article>)}</div>}
    {["system_admin","intake","case_worker"].includes(authUser?.role||"")&&<form onSubmit={event=>{event.preventDefault();void addApplicationNote();}} style={{marginTop:20,paddingTop:18,borderTop:"1px solid #edf1f6"}}>
     <div className="form-row"><label htmlFor="application-followup-note">ثبت یادداشت پیگیری</label><textarea id="application-followup-note" className="field" required rows={4} maxLength={5000} value={applicationNote} onChange={event=>setApplicationNote(event.target.value)} placeholder="یادداشت مرتبط با پیگیری پرونده را بنویسید." style={{minHeight:100,resize:"vertical"}}/></div>
     <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginTop:12}}><small style={{fontSize:9,color:"#91a0b2"}}>{applicationNote.length.toLocaleString("fa-IR")} از ۵۰۰۰ نویسه</small><button className="btn primary" type="submit" disabled={applicationNoteSaving||!applicationNote.trim()}>{applicationNoteSaving?"در حال ثبت…":"ثبت یادداشت"}</button></div>
     {applicationNoteError&&<p role="alert" style={{fontSize:11,lineHeight:1.9,color:"#b42318",background:"#fff1f0",padding:10,borderRadius:8,marginTop:10}}>{applicationNoteError}</p>}
     {applicationNoteSuccess&&<p role="status" style={{fontSize:11,lineHeight:1.9,color:"#24704f",background:"#e8f7ef",padding:10,borderRadius:8,marginTop:10}}>{applicationNoteSuccess}</p>}
    </form>}
    {!["system_admin","intake","case_worker"].includes(authUser?.role||"")&&<p className="note">دسترسی این نقش فقط برای مشاهده تاریخچه پرونده مجاز است.</p>}
   </section>}
   {selected&&<ApplicationDocuments selected={selected} authUser={authUser}/>}
   {selected&&<ApplicationGuarantees selected={selected} authUser={authUser}/ >}
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
   {page==="settings"&&!selected&&<PasswordChangeForm required={false} onSuccess={()=>setAuthUser(current=>current?{...current,must_change_password:false}:current)}/>}
   <footer><span>© ۱۴۰۵ سامانه امید</span><span className="connection"><i className={apiState==="connected"?"connected":""}></i>{apiState==="connected"?"متصل به API":apiState==="error"?"خطا در اتصال API":"در حال اتصال به API"}</span><span>نسخه رابط کاربری ۱.۰</span></footer>
   </div></main>
 </div>
}
function ApplicationDocuments({selected,authUser}:{selected:Application;authUser:ApiUser|null}){
 const [documents,setDocuments]=useState<ApplicationDocumentRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [uploadFile,setUploadFile]=useState<File|null>(null);
 const [uploadType,setUploadType]=useState("identity");
 const [uploadInputKey,setUploadInputKey]=useState(0);
 const [uploading,setUploading]=useState(false);
 const [uploadError,setUploadError]=useState("");
 const [uploadSuccess,setUploadSuccess]=useState("");
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({});
 const [reviewErrors,setReviewErrors]=useState<Record<string,string>>({});
 const [reviewMessages,setReviewMessages]=useState<Record<string,string>>({});
 const [reviewingId,setReviewingId]=useState<string|null>(null);
 const [replacementTargetId,setReplacementTargetId]=useState<string|null>(null);
 const [replacementFiles,setReplacementFiles]=useState<Record<string,File|null>>({});
 const [replacementErrors,setReplacementErrors]=useState<Record<string,string>>({});
 const [replacementMessages,setReplacementMessages]=useState<Record<string,string>>({});
 const [replacingId,setReplacingId]=useState<string|null>(null);
 const [downloadingId,setDownloadingId]=useState<string|null>(null);
 const canUpload=["system_admin","intake","case_worker"].includes(authUser?.role||"");
 const canReview=["system_admin","case_worker"].includes(authUser?.role||"");

 useEffect(()=>{
  let active=true;
  setLoading(true);
  setError("");
  setDocuments([]);
  setUploadError("");
  setUploadSuccess("");
  void getApplicationDocuments(selected.uuid).then(rows=>{
   if(active)setDocuments(rows);
  }).catch(fetchError=>{
   if(active)setError((fetchError as Error).message||"دریافت اسناد پرونده ناموفق بود.");
  }).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[selected.uuid]);

 function formatFileSize(bytes:number):string {
  if(!Number.isFinite(bytes)||bytes<0)return "—";
  if(bytes<1024)return bytes.toLocaleString("fa-IR")+" بایت";
  if(bytes<1024*1024)return (bytes/1024).toLocaleString("fa-IR",{maximumFractionDigits:1})+" کیلوبایت";
  return (bytes/(1024*1024)).toLocaleString("fa-IR",{maximumFractionDigits:1})+" مگابایت";
 }

 async function uploadDocument(){
  if(!uploadFile){setUploadError("ابتدا فایل سند را انتخاب کنید.");return;}
  if(uploadFile.size>10*1024*1024){setUploadError("حداکثر حجم هر سند ۱۰ مگابایت است.");return;}
  setUploading(true);setUploadError("");setUploadSuccess("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const body=new FormData();
   body.set("application",selected.uuid);
   body.set("document_type",uploadType);
   body.set("file",uploadFile);
   const created=await apiRequest("/api/v1/documents/",{method:"POST",headers:{"X-CSRFToken":String(csrf.csrfToken||"")},body}) as ApplicationDocumentRow;
   setDocuments(current=>[created,...current]);
   setUploadFile(null);setUploadType("identity");setUploadInputKey(current=>current+1);
   setUploadSuccess("سند با موفقیت بارگذاری شد و برای بررسی ارسال شد.");
  }catch(uploadFailure){
   setUploadError((uploadFailure as Error).message||"بارگذاری سند ناموفق بود.");
  }finally{setUploading(false);}
 }

 async function reviewDocument(documentRow:ApplicationDocumentRow,nextStatus:"accepted"|"rejected"){
  const note=(reviewNotes[documentRow.id]||"").trim();
  if(nextStatus==="rejected"&&!note){
   setReviewErrors(current=>({...current,[documentRow.id]:"برای اعلام نیاز به اصلاح، توضیح الزامی است."}));
   return;
  }
  if(!window.confirm(nextStatus==="accepted"?"آیا پذیرش این سند را تأیید می‌کنید؟":"آیا سند را برای اصلاح برمی‌گردانید؟"))return;
  setReviewingId(documentRow.id);
  setReviewErrors(current=>({...current,[documentRow.id]:""}));
  setReviewMessages(current=>({...current,[documentRow.id]:""}));
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const updated=await apiRequest("/api/v1/documents/"+documentRow.id+"/review/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({status:nextStatus,note})}) as ApplicationDocumentRow;
   setDocuments(current=>current.map(item=>item.id===updated.id?updated:item));
   setReviewNotes(current=>({...current,[documentRow.id]:""}));
   setReviewMessages(current=>({...current,[documentRow.id]:"وضعیت بررسی سند ثبت شد."}));
  }catch(reviewFailure){
   setReviewErrors(current=>({...current,[documentRow.id]:(reviewFailure as Error).message||"ثبت نتیجه بررسی سند ناموفق بود."}));
  }finally{setReviewingId(null);}
 }

 async function replaceDocument(documentRow:ApplicationDocumentRow){
  const file=replacementFiles[documentRow.id];
  if(!file){setReplacementErrors(current=>({...current,[documentRow.id]:"فایل جایگزین را انتخاب کنید."}));return;}
  if(file.size>10*1024*1024){setReplacementErrors(current=>({...current,[documentRow.id]:"حداکثر حجم هر سند ۱۰ مگابایت است."}));return;}
  setReplacingId(documentRow.id);
  setReplacementErrors(current=>({...current,[documentRow.id]:""}));
  setReplacementMessages(current=>({...current,[documentRow.id]:""}));
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const body=new FormData();
   body.set("file",file);
   const created=await apiRequest("/api/v1/documents/"+documentRow.id+"/replace/",{method:"POST",headers:{"X-CSRFToken":String(csrf.csrfToken||"")},body}) as ApplicationDocumentRow;
   setDocuments(current=>[created,...current]);
   setReplacementFiles(current=>({...current,[documentRow.id]:null}));
   setReplacementTargetId(null);
   setReplacementMessages(current=>({...current,[documentRow.id]:"نسخه جدید ثبت شد؛ نسخه قبلی در تاریخچه باقی ماند."}));
  }catch(replacementFailure){
   setReplacementErrors(current=>({...current,[documentRow.id]:(replacementFailure as Error).message||"جایگزینی سند ناموفق بود."}));
  }finally{setReplacingId(null);}
 }

 async function downloadDocument(documentRow:ApplicationDocumentRow){
  if(documentRow.status==="rejected")return;
  setDownloadingId(documentRow.id);
  try{
   const response=await fetch(apiBase+"/api/v1/documents/"+documentRow.id+"/download/",{credentials:"same-origin",headers:{Accept:"application/octet-stream, application/json"}});
   if(!response.ok){
    let payload:any={};
    try{payload=await response.json();}catch{/* Some error responses have no JSON body. */}
    throw new Error(getApiErrorMessage(payload)||"دریافت فایل سند ناموفق بود.");
   }
   const blob=await response.blob();
   const url=URL.createObjectURL(blob);
   const anchor=document.createElement("a");
   anchor.href=url;
   anchor.download=documentRow.original_filename||documentRow.document_number;
   document.body.appendChild(anchor);
   anchor.click();
   anchor.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(downloadFailure){
   setError((downloadFailure as Error).message||"دریافت فایل سند ناموفق بود.");
  }finally{setDownloadingId(null);}
 }

 return <section className="card" style={{marginTop:16,padding:22}}>
  <div className="card-head"><div><h2>اسناد و مدارک پرونده</h2><p>فایل‌ها به‌صورت خصوصی در بک‌اند نگهداری و نتیجه بررسی ثبت می‌شود.</p></div><span style={{fontSize:10,color:"#8492a5"}}>{documents.length.toLocaleString("fa-IR")} سند</span></div>
  {canUpload&&<form onSubmit={event=>{event.preventDefault();void uploadDocument();}} style={{padding:16,border:"1px solid #edf1f6",borderRadius:9,background:"#fcfdff",marginBottom:18}}>
   <h3 style={{margin:"0 0 12px",fontSize:12,color:"#35465b"}}>بارگذاری سند جدید</h3>
   <div className="form-grid">
    <div className="form-row"><label htmlFor="application-document-type">نوع سند *</label><select id="application-document-type" className="field" required value={uploadType} onChange={event=>setUploadType(event.target.value)}><option value="identity">مدرک هویتی</option><option value="address">مدرک نشانی</option><option value="income">مدرک درآمد</option><option value="bank_statement">گردش حساب</option><option value="contract">قرارداد</option><option value="other">سایر مدارک</option></select></div>
    <div className="form-row"><label htmlFor="application-document-file">فایل سند (PDF، JPEG یا PNG؛ حداکثر ۱۰ مگابایت) *</label><input key={uploadInputKey} id="application-document-file" className="field" type="file" required accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event=>setUploadFile(event.target.files?.[0]||null)}/>{uploadFile&&<small style={{color:"#8492a5"}}>{uploadFile.name} · {formatFileSize(uploadFile.size)}</small>}</div>
   </div>
   {uploadError&&<p role="alert" className="notice">{uploadError}</p>}
   {uploadSuccess&&<p role="status" className="note">{uploadSuccess}</p>}
   <div style={{display:"flex",justifyContent:"flex-start",marginTop:12}}><button className="btn primary" type="submit" disabled={uploading||!uploadFile}>{uploading?"در حال بارگذاری…":"بارگذاری سند"}</button></div>
  </form>}
  {loading?<p className="empty">در حال دریافت اسناد پرونده…</p>:error?<p role="alert" className="empty">{error}</p>:documents.length===0?<p className="empty">هنوز سندی برای این پرونده ثبت نشده است.</p>:<div style={{display:"grid",gap:12}}>
   {documents.map(documentRow=>{
    const superseded=documents.some(item=>item.replaces_document===documentRow.id);
    const stateColor=documentRow.status==="accepted"?"#24704f":documentRow.status==="rejected"?"#b42318":"#a66b1f";
    const stateBackground=documentRow.status==="accepted"?"#e8f7ef":documentRow.status==="rejected"?"#fff1f0":"#fff4e5";
    return <article key={documentRow.id} style={{border:"1px solid #e8edf3",borderRadius:9,padding:15}}>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
      <div style={{minWidth:0,flex:1}}><b style={{fontSize:11,color:"#35465b",overflowWrap:"anywhere"}}>{documentRow.original_filename}</b><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:7}}><span style={{fontSize:9,color:"#8492a5"}}>{documentRow.document_number}</span><span style={{fontSize:9,color:"#8492a5"}}>{documentTypeLabels[documentRow.document_type]||documentRow.document_type}</span><span style={{fontSize:9,color:"#8492a5"}}>{formatFileSize(documentRow.size_bytes)}</span><span style={{fontSize:9,color:"#8492a5"}}>{displayDateTime(documentRow.created_at)}</span><span style={{fontSize:9,fontWeight:700,color:stateColor,background:stateBackground,padding:"4px 7px",borderRadius:5}}>{documentStatusLabels[documentRow.status]||documentRow.status}</span></div></div>
      <button type="button" className="btn secondary" disabled={downloadingId===documentRow.id||documentRow.status==="rejected"} onClick={()=>void downloadDocument(documentRow)}>{downloadingId===documentRow.id?"در حال دریافت…":documentRow.status==="rejected"?"نیازمند نسخه اصلاحی":"دریافت فایل"}</button>
     </div>
     {documentRow.replaces_document_number&&<p style={{fontSize:10,color:"#66758a",margin:"9px 0 0"}}>جایگزین نسخه قبلی: {documentRow.replaces_document_number}</p>}
     {documentRow.review_note&&<p style={{fontSize:10,lineHeight:1.9,color:documentRow.status==="rejected"?"#b42318":"#66758a",background:documentRow.status==="rejected"?"#fff8f7":"#f7f9fc",padding:9,borderRadius:6,margin:"10px 0 0"}}>یادداشت بررسی: {documentRow.review_note}{documentRow.reviewed_by_username?" · بررسی توسط "+documentRow.reviewed_by_username:""}{documentRow.reviewed_at?" · "+displayDateTime(documentRow.reviewed_at):""}</p>}
     {documentRow.status==="rejected"&&canUpload&&!superseded&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #edf1f6"}}>
      {replacementTargetId===documentRow.id?<form onSubmit={event=>{event.preventDefault();void replaceDocument(documentRow);}}>
       <div className="form-row"><label htmlFor={"replacement-file-"+documentRow.id}>فایل جایگزین (همان نوع سند؛ حداکثر ۱۰ مگابایت)</label><input id={"replacement-file-"+documentRow.id} className="field" type="file" required accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event=>setReplacementFiles(current=>({...current,[documentRow.id]:event.target.files?.[0]||null}))}/></div>
       {replacementErrors[documentRow.id]&&<p role="alert" className="notice">{replacementErrors[documentRow.id]}</p>}
       <div style={{display:"flex",gap:8,marginTop:10}}><button className="btn primary" type="submit" disabled={replacingId===documentRow.id||!replacementFiles[documentRow.id]}>{replacingId===documentRow.id?"در حال ثبت…":"ثبت نسخه جایگزین"}</button><button type="button" className="btn secondary" disabled={replacingId===documentRow.id} onClick={()=>setReplacementTargetId(null)}>انصراف</button></div>
      </form>:<button type="button" className="btn secondary" onClick={()=>{setReplacementTargetId(documentRow.id);setReplacementErrors(current=>({...current,[documentRow.id]:""}));}}>بارگذاری نسخه اصلاح‌شده</button>}
     </div>}
     {documentRow.status==="rejected"&&superseded&&<p style={{fontSize:9,color:"#8492a5",margin:"9px 0 0"}}>برای این نسخه، سند جایگزین ثبت شده است.</p>}
     {canReview&&documentRow.status==="pending_review"&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #edf1f6"}}>
      <div className="form-row"><label htmlFor={"document-review-note-"+documentRow.id}>توضیح بررسی (برای بازگرداندن جهت اصلاح الزامی است)</label><textarea id={"document-review-note-"+documentRow.id} className="field" rows={2} maxLength={1000} value={reviewNotes[documentRow.id]||""} onChange={event=>setReviewNotes(current=>({...current,[documentRow.id]:event.target.value}))} style={{minHeight:65,resize:"vertical"}}/></div>
      {reviewErrors[documentRow.id]&&<p role="alert" className="notice">{reviewErrors[documentRow.id]}</p>}
      {reviewMessages[documentRow.id]&&<p role="status" className="note">{reviewMessages[documentRow.id]}</p>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}><button type="button" className="btn primary" disabled={reviewingId===documentRow.id} onClick={()=>void reviewDocument(documentRow,"accepted")}>{reviewingId===documentRow.id?"در حال ثبت…":"پذیرش سند"}</button><button type="button" className="btn secondary" disabled={reviewingId===documentRow.id||!(reviewNotes[documentRow.id]||"").trim()} onClick={()=>void reviewDocument(documentRow,"rejected")}>{reviewingId===documentRow.id?"در حال ثبت…":"اعلام نیاز به اصلاح"}</button></div>
     </div>}
    </article>;
   })}
  </div>}
  {!canUpload&&<p className="note">دسترسی این نقش برای مشاهده و دریافت اسناد است.</p>}
 </section>;
}

function ApplicationGuarantees({selected,authUser}:{selected:Application;authUser:ApiUser|null}){
 const [requests,setRequests]=useState<GuaranteeRequestRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState("");
 const [customers,setCustomers]=useState<CustomerRow[]>([]);
 const [customerError,setCustomerError]=useState("");
 const [createOpen,setCreateOpen]=useState(false);
 const [requesterCustomer,setRequesterCustomer]=useState("");
 const [requestNote,setRequestNote]=useState("");
 const [saving,setSaving]=useState(false);
 const [createError,setCreateError]=useState("");
 const [createSuccess,setCreateSuccess]=useState("");
 const [transitionReasons,setTransitionReasons]=useState<Record<string,string>>({});
 const [transitionErrors,setTransitionErrors]=useState<Record<string,string>>({});
 const [transitionMessages,setTransitionMessages]=useState<Record<string,string>>({});
 const [transitioningId,setTransitioningId]=useState<string|null>(null);
 const [openHistoryId,setOpenHistoryId]=useState<string|null>(null);
 const [eventsById,setEventsById]=useState<Record<string,GuaranteeRequestEventRow[]>>({});
 const [eventErrors,setEventErrors]=useState<Record<string,string>>({});
 const [loadingEventsId,setLoadingEventsId]=useState<string|null>(null);
 const canCreate=["system_admin","intake","case_worker"].includes(authUser?.role||"");

 useEffect(()=>{
  let active=true;
  setLoading(true);setLoadError("");setRequests([]);
  void apiRequest("/api/v1/guarantees/?application="+encodeURIComponent(selected.uuid)).then(payload=>{
   const rows=Array.isArray(payload)?payload:payload.results;
   if(!Array.isArray(rows))throw new Error("ساختار پاسخ درخواست‌های ضمانت معتبر نیست.");
   if(active)setRequests(rows as GuaranteeRequestRow[]);
  }).catch(failure=>{
   if(active)setLoadError((failure as Error).message||"دریافت درخواست‌های ضمانت ناموفق بود.");
  }).finally(()=>{if(active)setLoading(false);});
  if(canCreate){
   setCustomerError("");
   void getCustomers().then(rows=>{if(active)setCustomers(rows);}).catch(failure=>{
    if(active)setCustomerError((failure as Error).message||"دریافت فهرست مشتریان برای انتخاب درخواست‌دهنده ناموفق بود.");
   });
  }else{setCustomers([]);setCustomerError("");}
  return ()=>{active=false;};
 },[selected.uuid,canCreate]);

 async function createRequest(){
  setSaving(true);setCreateError("");setCreateSuccess("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const created=await apiRequest("/api/v1/guarantees/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({
    application:selected.uuid,
    requester_customer:requesterCustomer||null,
    note:requestNote.trim()
   })}) as GuaranteeRequestRow;
   setRequests(current=>[created,...current]);
   setRequesterCustomer("");setRequestNote("");setCreateOpen(false);
   setCreateSuccess("درخواست ضمانت با شماره «"+created.request_number+"» ثبت شد.");
  }catch(failure){
   setCreateError((failure as Error).message||"ثبت درخواست ضمانت ناموفق بود.");
  }finally{setSaving(false);}
 }

 async function transitionRequest(request:GuaranteeRequestRow,action:GuaranteeStatusAction){
  const reason=(transitionReasons[request.id]||"").trim();
  if(action.requiresReason&&!reason){
   setTransitionErrors(current=>({...current,[request.id]:"برای رد یا لغو درخواست، ثبت دلیل الزامی است."}));
   return;
  }
  if(["rejected","cancelled"].includes(action.status)&&!window.confirm("آیا از ثبت این تصمیم برای درخواست ضمانت مطمئن هستید؟"))return;
  setTransitioningId(request.id);
  setTransitionErrors(current=>({...current,[request.id]:""}));
  setTransitionMessages(current=>({...current,[request.id]:""}));
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const updated=await apiRequest("/api/v1/guarantees/"+request.id+"/transition/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({status:action.status,reason})}) as GuaranteeRequestRow;
   setRequests(current=>current.map(item=>item.id===updated.id?updated:item));
   setTransitionReasons(current=>({...current,[request.id]:""}));
   setTransitionMessages(current=>({...current,[request.id]:"وضعیت درخواست ضمانت تغییر کرد."}));
   setEventsById(current=>{const next={...current};delete next[request.id];return next;});
  }catch(failure){
   setTransitionErrors(current=>({...current,[request.id]:(failure as Error).message||"تغییر وضعیت درخواست ضمانت ناموفق بود."}));
  }finally{setTransitioningId(null);}
 }

 async function toggleHistory(request:GuaranteeRequestRow){
  if(openHistoryId===request.id){setOpenHistoryId(null);return;}
  setOpenHistoryId(request.id);
  if(eventsById[request.id])return;
  setLoadingEventsId(request.id);
  setEventErrors(current=>({...current,[request.id]:""}));
  try{
   const payload=await apiRequest("/api/v1/guarantees/"+request.id+"/events/");
   const rows=Array.isArray(payload)?payload:payload.results;
   if(!Array.isArray(rows))throw new Error("ساختار پاسخ تاریخچه درخواست ضمانت معتبر نیست.");
   setEventsById(current=>({...current,[request.id]:rows as GuaranteeRequestEventRow[]}));
  }catch(failure){
   setEventErrors(current=>({...current,[request.id]:(failure as Error).message||"دریافت تاریخچه درخواست ضمانت ناموفق بود."}));
  }finally{setLoadingEventsId(null);}
 }

 return <section className="card" style={{marginTop:16,padding:22}}>
  <div className="card-head"><div><h2>درخواست‌های ضمانت پرونده</h2><p>ثبت درخواست، بررسی اعتباری، پیگیری وضعیت و تاریخچه از طریق بک‌اند.</p></div><span style={{fontSize:10,color:"#8492a5"}}>{requests.length.toLocaleString("fa-IR")} درخواست</span></div>
  {canCreate&&<div style={{marginBottom:18}}>
   <button type="button" className="btn primary" onClick={()=>{setCreateOpen(current=>!current);setCreateError("");setCreateSuccess("");}}>{createOpen?"بستن فرم":"＋ ثبت درخواست ضمانت"}</button>
   {createOpen&&<form onSubmit={event=>{event.preventDefault();void createRequest();}} style={{marginTop:14,padding:16,border:"1px solid #edf1f6",borderRadius:9,background:"#fcfdff"}}>
    <div className="form-grid">
     <div className="form-row"><label htmlFor="guarantee-requester">درخواست‌دهنده (اختیاری)</label><select id="guarantee-requester" className="field" value={requesterCustomer} onChange={event=>setRequesterCustomer(event.target.value)}><option value="">بدون درخواست‌دهنده جداگانه</option>{customers.map(customer=><option key={customer.id} value={customer.id}>{customer.customer_number+" — "+(customer.customer_type==="organization"?customer.organization_name:[customer.first_name,customer.last_name].filter(Boolean).join(" ")||"مشتری")}</option>)}</select>{customerError&&<small role="alert" style={{color:"#b42318"}}>{customerError}</small>}</div>
     <div className="form-row"><label htmlFor="guarantee-request-note">شرح درخواست</label><textarea id="guarantee-request-note" className="field" rows={3} maxLength={1000} value={requestNote} onChange={event=>setRequestNote(event.target.value)} placeholder="مثلاً درخواست صدور ضمانت برای پرونده" style={{minHeight:84,resize:"vertical"}}/></div>
    </div>
    {createError&&<p role="alert" className="notice">{createError}</p>}
    <div style={{display:"flex",gap:8,marginTop:12}}><button className="btn primary" type="submit" disabled={saving}>{saving?"در حال ثبت…":"ثبت درخواست"}</button><button className="btn secondary" type="button" disabled={saving} onClick={()=>setCreateOpen(false)}>انصراف</button></div>
   </form>}
   {createSuccess&&<p role="status" className="note">{createSuccess}</p>}
  </div>}
  {loading?<p className="empty">در حال دریافت درخواست‌های ضمانت…</p>:loadError?<p role="alert" className="empty">{loadError}</p>:requests.length===0?<p className="empty">برای این پرونده درخواستی ثبت نشده است.</p>:<div style={{display:"grid",gap:12}}>
   {requests.map(request=>{
    const actions=getGuaranteeStatusActions(request,authUser?.role||null);
    return <article key={request.id} style={{border:"1px solid #e8edf3",borderRadius:9,padding:15}}>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:0}}><b style={{fontSize:11,color:"#35465b"}}>{request.request_number}</b><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:7}}><span style={{fontSize:9,color:"#8492a5"}}>وضعیت: {guaranteeStatusLabels[request.status]||request.status}</span><span style={{fontSize:9,color:"#8492a5"}}>ثبت: {displayDateTime(request.created_at)}</span><span style={{fontSize:9,color:"#8492a5"}}>ثبت‌کننده: {request.created_by_username||"کاربر سامانه"}</span></div></div>
      <button type="button" className="btn secondary" onClick={()=>void toggleHistory(request)}>{openHistoryId===request.id?"بستن تاریخچه":"مشاهده تاریخچه"}</button>
     </div>
     <div style={{display:"grid",gap:5,marginTop:10,fontSize:10,color:"#66758a"}}><span>مشتری وام‌گیرنده: {request.loan_customer_name||selected.customer}</span><span>درخواست‌دهنده ضمانت: {request.requester_customer_name||"مشخص نشده"}</span>{request.note&&<span style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>شرح: {request.note}</span>}</div>
     {openHistoryId===request.id&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #edf1f6"}}>
      {loadingEventsId===request.id&&<p className="empty">در حال دریافت تاریخچه…</p>}
      {eventErrors[request.id]&&<p role="alert" className="notice">{eventErrors[request.id]}</p>}
      {(eventsById[request.id]||[]).length>0&&<div style={{display:"grid",gap:8}}>{[...(eventsById[request.id]||[])].reverse().map(item=><div key={item.id} style={{padding:10,borderRadius:7,background:"#f8fafd"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><b style={{fontSize:10,color:"#35465b"}}>{guaranteeEventLabels[item.event_type]||item.event_type}</b><small style={{fontSize:9,color:"#91a0b2"}}>{displayDateTime(item.created_at)}</small></div>{item.previous_status&&item.new_status&&<p style={{fontSize:9,color:"#66758a",margin:"6px 0"}}>{guaranteeStatusLabels[item.previous_status]||item.previous_status} ← {guaranteeStatusLabels[item.new_status]||item.new_status}</p>}{item.note&&<p style={{fontSize:10,lineHeight:1.8,color:"#526176",whiteSpace:"pre-wrap",margin:"6px 0"}}>{item.note}</p>}<small style={{fontSize:9,color:"#91a0b2"}}>ثبت توسط: {item.actor_username||"کاربر سامانه"}</small></div>)}</div>}
     </div>}
     {actions.length>0&&<div style={{marginTop:13,paddingTop:12,borderTop:"1px solid #edf1f6"}}>
      {actions.some(action=>action.requiresReason)&&<div className="form-row"><label htmlFor={"guarantee-transition-reason-"+request.id}>دلیل تصمیم (برای رد یا لغو الزامی است)</label><textarea id={"guarantee-transition-reason-"+request.id} className="field" rows={2} maxLength={1000} value={transitionReasons[request.id]||""} onChange={event=>setTransitionReasons(current=>({...current,[request.id]:event.target.value}))} style={{minHeight:65,resize:"vertical"}}/></div>}
      {transitionErrors[request.id]&&<p role="alert" className="notice">{transitionErrors[request.id]}</p>}
      {transitionMessages[request.id]&&<p role="status" className="note">{transitionMessages[request.id]}</p>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>{actions.map(action=><button key={action.status} type="button" className={"btn "+action.variant} disabled={transitioningId===request.id||(action.requiresReason&&!(transitionReasons[request.id]||"").trim())} onClick={()=>void transitionRequest(request,action)}>{transitioningId===request.id?"در حال ثبت…":action.label}</button>)}</div>
     </div>}
    </article>;
   })}
  </div>}
  {!canCreate&&<p className="note">دسترسی این نقش فقط مطابق مجوزهای بک‌اند برای مشاهده و انتقال وضعیت‌های مجاز است.</p>}
 </section>;
}

function PasswordChangeForm({required,onSuccess}:{required:boolean;onSuccess:()=>void}){
 const [currentPassword,setCurrentPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const form=<form onSubmit={async event=>{
  event.preventDefault();setError("");setSuccess("");
  if(newPassword!==confirmPassword){setError("گذرواژه جدید و تکرار آن یکسان نیستند.");return;}
  if(currentPassword===newPassword){setError("گذرواژه جدید باید با گذرواژه فعلی متفاوت باشد.");return;}
  setSaving(true);
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const result=await apiRequest("/api/v1/auth/change-password/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({current_password:currentPassword,new_password:newPassword})});
   setCurrentPassword("");setNewPassword("");setConfirmPassword("");
   setSuccess(String(result.detail||"گذرواژه با موفقیت تغییر کرد."));
   onSuccess();
  }catch(requestError){setError((requestError as Error).message||"تغییر گذرواژه ناموفق بود.");}
  finally{setSaving(false);}
 }}>
  {error&&<p role="alert" className="notice">{error}</p>}
  {success&&<p role="status" className="note">{success}</p>}
  <div className="form-grid">
   <div className="form-row"><label htmlFor={required?"required-current-password":"settings-current-password"}>گذرواژه فعلی *</label><input id={required?"required-current-password":"settings-current-password"} className="field" type="password" autoComplete="current-password" required value={currentPassword} onChange={event=>setCurrentPassword(event.target.value)} /></div>
   <div className="form-row"><label htmlFor={required?"required-new-password":"settings-new-password"}>گذرواژه جدید *</label><input id={required?"required-new-password":"settings-new-password"} className="field" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={event=>setNewPassword(event.target.value)} /></div>
   <div className="form-row"><label htmlFor={required?"required-confirm-password":"settings-confirm-password"}>تکرار گذرواژه جدید *</label><input id={required?"required-confirm-password":"settings-confirm-password"} className="field" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} /></div>
  </div>
  <p className="note">قدرت و قواعد نهایی گذرواژه در سمت سرور بررسی می‌شود؛ پس از تغییر، نشست فعلی حفظ خواهد شد.</p>
  <div style={{display:"flex",justifyContent:"flex-start",gap:8,marginTop:16}}><button className="btn primary" type="submit" disabled={saving}>{saving?"در حال تغییر…":"تغییر گذرواژه"}</button></div>
 </form>;
 if(required)return <div dir="rtl" style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"#f5f7fb",fontFamily:"Vazirmatn,Tahoma,sans-serif"}}><section className="card" style={{width:"100%",maxWidth:600,padding:28}}><div className="brand" style={{marginBottom:20,paddingBottom:18}}><div className="brand-mark">ا</div><div><b>سامانه امید</b><small>تکمیل امن ورود</small></div></div><h1 style={{fontSize:21,margin:"0 0 8px",color:"#1b2b43"}}>تغییر گذرواژه الزامی است</h1><p style={{fontSize:12,color:"#8492a5",lineHeight:1.9,margin:"0 0 20px"}}>برای ادامهٔ کار، ابتدا گذرواژه فعلی را تأیید و گذرواژه جدیدی تعیین کنید.</p>{form}</section></div>;
 return <section className="card list-card" style={{padding:22,maxWidth:720}}><div className="card-head"><div><h2>تغییر گذرواژه</h2><p>برای حفظ امنیت حساب، گذرواژه فعلی لازم است.</p></div></div>{form}</section>;
}
function Stat({icon,label,value,delta,tone}:{icon:string;label:string;value:string;delta:string;tone:string}){return <section className="card stat"><div className={"stat-icon "+tone}>{icon}</div><div className="stat-info"><span>{label}</span><b>{value}</b><small>{delta}</small></div><span className="stat-menu">•••</span></section>}
function Status({value}:{value:string}){let cls=value==="تکمیل شده"?"green":value==="نیازمند اقدام"?"amber":value==="در انتظار"?"gray":"blue";return <span className={"status "+cls}><i></i>{value}</span>}
function ApplicationsTable({rows,onSelect}:{rows:Application[];onSelect:(a:Application)=>void}){return <div className="table-wrap"><table><thead><tr><th>شماره پرونده</th><th>مشتری / شرکت</th><th>نوع تسهیلات</th><th>مبلغ درخواستی</th><th>مرحله</th><th>وضعیت</th><th></th></tr></thead><tbody>{rows.map(a=><tr key={a.id} onClick={()=>onSelect(a)}><td><b className="case-id">{a.id}</b></td><td><div className="customer-cell"><span className="company-avatar">{a.customer.slice(0,1)}</span><b>{a.customer}</b></div></td><td>{a.type}</td><td className="amount">{a.amount} <small>تومان</small></td><td>{a.stage}</td><td><Status value={a.status}/></td><td><button className="row-action" aria-label="مشاهده پرونده">‹</button></td></tr>)}{!rows.length&&<tr><td colSpan={7} className="empty">پرونده‌ای با این مشخصات پیدا نشد.</td></tr>}</tbody></table></div>}
export default App;
