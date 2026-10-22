import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./style.css";

type NavKey = "dashboard" | "applications" | "customers" | "tasks" | "services" | "reports" | "settings";
type Application = { uuid: string; id: string; customerId: string; customer: string; type: string; amount: string; stage: string; status: string; statusKey: string; date: string };
type ApplicationStatusAction = { status: string; label: string; variant: "primary" | "secondary"; requiresReason?: boolean };
type ApplicationEventRow = { id: string | number; event_type: string; previous_status: string | null; new_status: string | null; note: string; actor_username: string | null; created_at: string };
type ApplicationDocumentRow = { id:string; document_number:string; application:string; application_number:string; document_type:string; replaces_document:string|null; replaces_document_number:string|null; original_filename:string; content_type:string; size_bytes:number; sha256:string; status:string; review_note:string; uploaded_by:string; uploaded_by_username:string; reviewed_by:string|null; reviewed_by_username:string|null; reviewed_at:string|null; created_at:string; updated_at:string };
type GuaranteeRequestRow = { id:string; request_number:string; application:string; application_number:string; loan_customer_name:string; requester_customer:string|null; requester_customer_name:string; status:string; note:string; created_by:string; created_by_username:string; created_at:string; updated_at:string };
type GuaranteeRequestEventRow = { id:string; guarantee_request:string; event_type:string; previous_status:string; new_status:string; note:string; actor_username:string|null; created_at:string };
type ServiceCatalogRow = { id:string; code:string; name:string; description:string; price:string; online_cost:string; active:boolean };
type ServiceReceiptRow = { id:string; receipt_number:string; customer:string; customer_name:string; service:string; service_code:string; service_name:string; service_description_snapshot:string; price:string; discount:string; total:string; online_cost:string; company_commission:string; paid:string; amount_due:string; payment_method:string; performed_by:string; performed_by_name:string; note:string; created_by:string; created_by_username:string; created_at:string };
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
type CustomerRow = { id:string; customer_number:string; customer_type:string; first_name:string; last_name:string; organization_name:string; phone_number:string; email:string; national_id?:string; birth_date?:string|null; father_name?:string; occupation?:string; postal_code?:string; sana_verified?:boolean; notes?:string; status:string; created_at:string };
type TaskRow = { id:string; task_number:string; application:string; application_number:string; title:string; description:string; status:string; priority:string; assigned_to:string|number; assigned_to_username:string; created_by_username:string; due_at:string|null; completed_at:string|null; created_at:string; is_overdue:boolean };
type TaskEventRow = { id:string; task:string; event_type:string; previous_status:string|null; new_status:string|null; previous_assignee_username:string|null; new_assignee_username:string|null; previous_due_at:string|null; new_due_at:string|null; note:string; actor_username:string|null; created_at:string };
type FollowUpSuggestion = { key:string; title:string; description:string; priority:string };
type CasePartyRow = { id:string; application:string; person:string; person_display:string; role:string; relationship_to_applicant:string; membership_status:string; account_status:string; sort_order:number };
type StageInstanceRow = { id:string; application:string; application_number:string; party:string|null; party_person:string|null; code:string; status:string; assigned_to:number|string|null; started_at:string|null; due_at:string|null; completed_at:string|null; outcome:string; hold_reason:string; evidence_reference:string; follow_up_count:number };
type MeratAssessmentRow = {id:string;stage:string;requester:string;subject:string;relationship_to_applicant:string;submitted_at:string|null;external_reference:string;result:string;result_reason:string;reported_limit_rial:string|number|null;evidence_reference:string;recorded_by:string|null;created_at:string;updated_at:string};
type DisbursementRow = {id:string;disbursement_number:string;application:string;application_number:string;amount_rial:string|number;commission_rate_pct:string|number;commission_amount_rial:string|number;status:string;bank_reference:string;evidence_reference:string;recorded_by:string|null;confirmed_at:string|null;created_at:string;updated_at:string};
type OperationsReport = { generated_at:string; scope:string; customers:{total:number;active:number;inactive:number;archived:number}; applications:{total:number;by_status:Record<string,number>}; tasks:{total:number;open:number;in_progress:number;completed:number;cancelled:number;overdue:number;due_today:number}; guarantees:{total:number;by_status:Record<string,number>}; service_receipts:{count:number;gross_total:string;paid_total:string;outstanding_total:string} };
const nav: {key:NavKey;label:string;icon:string;group:string}[] = [
 {key:"dashboard",label:"داشبورد",icon:"▦",group:"فضای کاری"},
 {key:"applications",label:"پرونده‌های تسهیلاتی",icon:"▤",group:"فضای کاری"},
 {key:"customers",label:"مشتریان",icon:"♙",group:"فضای کاری"},
 {key:"tasks",label:"وظایف و پیگیری",icon:"◷",group:"عملیات"},
 {key:"services",label:"خدمات و رسیدها",icon:"◉",group:"عملیات"},
 {key:"reports",label:"گزارش‌ها",icon:"▥",group:"عملیات"},
 {key:"settings",label:"تنظیمات",icon:"⚙",group:"مدیریت"},
];

const apiBase = ""; // Same-origin only: Vite proxies /api locally and Cloudflare Worker proxies it in production.
const statusLabels: Record<string, string> = {
 under_review: "در حال بررسی",
 awaiting_documents: "نیازمند مدارک",
 awaiting_approval: "در انتظار تأیید",
 approved: "تأیید شده",
 rejected: "رد شده",
 cancelled: "لغو شده",
};
const applicationEventLabels: Record<string, string> = { created: "ثبت پرونده", status_changed: "تغییر وضعیت", note_added: "یادداشت پیگیری", archived: "بایگانی پرونده" };
const documentTypeLabels: Record<string,string> = { identity:"مدرک هویتی", address:"مدرک نشانی", income:"مدرک درآمد", bank_statement:"گردش حساب", contract:"قرارداد", other:"سایر مدارک" };
const documentStatusLabels: Record<string,string> = { pending_review:"در انتظار بررسی", accepted:"پذیرفته‌شده", rejected:"نیازمند اصلاح" };
const guaranteeStatusLabels: Record<string,string> = { registered:"ثبت‌شده", under_review:"در حال بررسی", approved:"تأیید شده", rejected:"رد شده", fulfilled:"انجام‌شده", cancelled:"لغو شده" };
const guaranteeEventLabels: Record<string,string> = { created:"ثبت درخواست ضمانت", status_changed:"تغییر وضعیت", note_added:"یادداشت پیگیری" };
const paymentMethodLabels: Record<string,string> = { pos:"کارت‌خوان", cash:"نقدی", bank_transfer:"واریز بانکی", other:"سایر" };
const casePartyRoleLabels:Record<string,string>={applicant:"متقاضی اصلی",guarantor:"ضامن",representative:"نماینده"};
const accountStatusLabels:Record<string,string>={unknown:"بررسی‌نشده",existing_verified:"حساب موجود تأییدشده",needs_opening:"نیازمند افتتاح"};
const membershipStatusLabels:Record<string,string>={active:"فعال",replaced:"جایگزین‌شده",removed:"خارج‌شده"};
const stageCodeLabels:Record<string,string>={documents:"مدارک",account:"وضعیت حساب",merat:"اعتبارسنجی مرآت",e_note:"سفته الکترونیک",loan_submission:"ثبت درخواست وام",bank_review:"بررسی بانک",disbursement:"واریز تسهیلات",settlement:"تسویه",handover:"تحویل نهایی"};
const stageStatusLabels:Record<string,string>={locked:"قفل‌شده",pending:"در انتظار",in_progress:"در جریان",action_needed:"نیازمند اقدام",completed:"تکمیل‌شده",bypassed:"عبور مجاز",rejected:"ردشده",on_hold:"تعلیق"};
const personStageDefinitions=[{code:"documents",label:"مدارک"},{code:"account",label:"وضعیت حساب"},{code:"merat",label:"اعتبارسنجی مرآت"},{code:"e_note",label:"سفته الکترونیک"}];
const caseStageDefinitions=[{code:"loan_submission",label:"ثبت درخواست وام"},{code:"bank_review",label:"بررسی بانک"},{code:"disbursement",label:"واریز تسهیلات"},{code:"settlement",label:"تسویه"},{code:"handover",label:"تحویل نهایی"}];
const completedStageStatuses=["completed","bypassed"];
const taskStatusLabels: Record<string,string> = { open:"باز", in_progress:"در حال انجام", completed:"انجام‌شده", cancelled:"لغوشده" };
const taskPriorityLabels: Record<string,string> = { low:"کم", normal:"عادی", high:"زیاد", urgent:"فوری" };
const taskEventLabels: Record<string,string> = { created:"ایجاد وظیفه", status_changed:"تغییر وضعیت", due_date_changed:"تغییر موعد", assigned:"تغییر مسئول", updated:"به‌روزرسانی", note_added:"یادداشت پیگیری" };
function parseIntegerMoney(value:string):bigint|null {
 const normalized=String(value||"").trim();
 if(!/^\d+$/.test(normalized))return null;
 try{return BigInt(normalized);}catch{return null;}
}
function createReceiptIdempotencyKey():string {
 if(typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function")return crypto.randomUUID();
 return "receipt-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
}
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
 organization_name: "نام سازمان", phone_number: "شماره تلفن", email: "ایمیل", name: "نام خدمت", active: "وضعیت فعالیت",
 national_id: "کد ملی / شناسه ملی", birth_date: "تاریخ تولد",
 father_name: "نام پدر", occupation: "شغل", postal_code: "کدپستی",
 sana_verified: "وضعیت احراز ثنا", status: "وضعیت پرونده", notes: "یادداشت",
 customer: "مشتری", product_type: "نوع تسهیلات", requested_amount: "مبلغ درخواستی", service: "خدمت", discount: "تخفیف", paid: "مبلغ دریافتی", payment_method: "روش پرداخت", price: "تعرفه خدمت", online_cost: "هزینه آنلاین",
 term_months: "مدت بازپرداخت", title: "عنوان", application: "پرونده",
 priority: "اولویت", due_at: "موعد انجام", description: "توضیحات",
 current_password: "گذرواژه فعلی", new_password: "گذرواژه جدید",
 status_note: "دلیل تصمیم", requester_customer: "درخواست‌دهنده ضمانت", document_type: "نوع سند", file: "فایل سند", note: "شرح / توضیح", reason: "دلیل تصمیم",
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
async function getAllApiRows(path: string, errorLabel: string): Promise<any[]> {
 const rows: any[] = [];
 let page = 1;
 let hasNext = true;
 while (hasNext) {
  const separator = path.includes("?") ? "&" : "?";
  const payload = await apiRequest(page === 1 ? path : path + separator + "page=" + page);
  if (Array.isArray(payload)) {
   if (page > 1) throw new Error("ساختار صفحه‌بندی پاسخ " + errorLabel + " معتبر نیست.");
   return payload;
  }
  if (!payload || !Array.isArray(payload.results)) {
   throw new Error("ساختار پاسخ " + errorLabel + " معتبر نیست.");
  }
  rows.push(...payload.results);
  hasNext = Boolean(payload.next);
  page += 1;
  if (page > 1001) throw new Error("تعداد صفحات " + errorLabel + " از حد مجاز بیشتر است.");
 }
 return rows;
}
function mapApplication(x: any): Application {
 return {
  uuid: String(x.id ?? ""),
  id: String(x.application_number ?? x.id ?? "—"),
  customerId: String(x.customer ?? ""),
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
 const rows = await getAllApiRows("/api/v1/applications/", "فهرست پرونده‌ها");
 return rows.map(mapApplication);
}
async function getApplicationEvents(applicationId: string): Promise<ApplicationEventRow[]> {
 return await getAllApiRows("/api/v1/applications/" + encodeURIComponent(applicationId) + "/events/", "تاریخچه پرونده") as ApplicationEventRow[];
}
async function getApplicationDocuments(applicationId: string): Promise<ApplicationDocumentRow[]> {
 return await getAllApiRows("/api/v1/documents/?application=" + encodeURIComponent(applicationId), "اسناد پرونده") as ApplicationDocumentRow[];
}
async function getServiceCatalog(activeOnly=true):Promise<ServiceCatalogRow[]> {
 return await getAllApiRows("/api/v1/services/catalog/"+(activeOnly?"?active=true":""), "فهرست خدمات") as ServiceCatalogRow[];
}
async function getServiceReceipts():Promise<ServiceReceiptRow[]> {
 return await getAllApiRows("/api/v1/services/receipts/", "فهرست رسیدهای خدمات") as ServiceReceiptRow[];
}
function displayDateTime(value: unknown): string {
 if (!value) return "—";
 const date = new Date(String(value));
 return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR", {year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit"}).format(date);
}
async function getCustomers(): Promise<CustomerRow[]> {
 return await getAllApiRows("/api/v1/customers/", "فهرست مشتریان") as CustomerRow[];
}
async function getTasks(): Promise<TaskRow[]> {
 return await getAllApiRows("/api/v1/tasks/", "فهرست وظایف") as TaskRow[];
}
async function getApplicationTasks(applicationId:string):Promise<TaskRow[]> {
 return await getAllApiRows("/api/v1/tasks/?application="+encodeURIComponent(applicationId), "وظایف پرونده") as TaskRow[];
}
async function getApplicationGuarantees(applicationId:string):Promise<GuaranteeRequestRow[]> {
 return await getAllApiRows("/api/v1/guarantees/?application="+encodeURIComponent(applicationId), "درخواست‌های ضمانت پرونده") as GuaranteeRequestRow[];
}
async function getOperationsReport(): Promise<OperationsReport> {
 const payload = await apiRequest("/api/v1/reports/operations/");
 if(!payload || typeof payload!=="object" || !payload.applications || !payload.applications.by_status) {
  throw new Error("ساختار پاسخ گزارش عملیاتی معتبر نیست.");
 }
 return payload as OperationsReport;
}
// TEMPORARY DESIGN PREVIEW: bypass only the frontend login screen while dashboard UI is being designed.
// Backend API endpoints remain authenticated. Set to false to restore the normal login flow.
const DESIGN_PREVIEW_MODE = false;
const PREVIEW_USER: ApiUser = {id:0,username:"design.preview",first_name:"کاربر",last_name:"پیش‌نمایش",role:"system_admin",role_label:"پیش‌نمایش طراحی",must_change_password:false};
const PREVIEW_REPORT: OperationsReport = {
 generated_at:"2026-10-22T08:00:00Z",scope:"organization",
 customers:{total:1284,active:1176,inactive:72,archived:36},
 applications:{total:246,by_status:{under_review:68,awaiting_documents:54,awaiting_approval:39,approved:62,rejected:17,cancelled:6}},
 tasks:{total:93,open:24,in_progress:31,completed:32,cancelled:6,overdue:8,due_today:12},
 guarantees:{total:44,by_status:{registered:9,under_review:14,approved:15,rejected:4,fulfilled:2}},
 service_receipts:{count:316,gross_total:"824000000",paid_total:"712000000",outstanding_total:"112000000"}
};
const PREVIEW_APPLICATIONS: Application[] = [
 {uuid:"preview-1",id:"OM-1405-0318",customerId:"preview-c1",customer:"شرکت توسعه آریا",type:"سرمایه در گردش",amount:"850000000",stage:"بررسی اولیه",status:"در حال بررسی",statusKey:"under_review",date:"2026-10-21"},
 {uuid:"preview-2",id:"OM-1405-0317",customerId:"preview-c2",customer:"مریم احمدی",type:"تسهیلات شخصی",amount:"250000000",stage:"تکمیل مدارک",status:"نیازمند مدارک",statusKey:"awaiting_documents",date:"2026-10-20"},
 {uuid:"preview-3",id:"OM-1405-0316",customerId:"preview-c3",customer:"بازرگانی سپهر",type:"اعتباری شرکتی",amount:"1200000000",stage:"تصمیم اعتباری",status:"در انتظار تأیید",statusKey:"awaiting_approval",date:"2026-10-19"},
 {uuid:"preview-4",id:"OM-1405-0315",customerId:"preview-c4",customer:"علی رضایی",type:"تسهیلات شخصی",amount:"180000000",stage:"تأیید اعتباری",status:"تأیید شده",statusKey:"approved",date:"2026-10-18"}
];
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
 const [editingCustomerId,setEditingCustomerId]=useState<string|null>(null);
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
 function beginCustomerEdit(customer:CustomerRow){
  setEditingCustomerId(customer.id);
  setCustomerFormError("");
  setCustomerType(customer.customer_type==="organization"?"organization":"individual");
  setCustomerFirstName(customer.first_name||"");
  setCustomerLastName(customer.last_name||"");
  setCustomerOrganizationName(customer.organization_name||"");
  setCustomerPhone(customer.phone_number||"");
  setCustomerEmail(customer.email||"");
  setCustomerNationalId(customer.national_id||"");
  setCustomerBirthDate(customer.birth_date||"");
  setCustomerFatherName(customer.father_name||"");
  setCustomerOccupation(customer.occupation||"");
  setCustomerPostalCode(customer.postal_code||"");
  setCustomerSanaVerified(Boolean(customer.sana_verified));
  setCustomerStatus(customer.status||"active");
  setCustomerNotes(customer.notes||"");
  setShowCustomerForm(true);
 }
 function resetCustomerForm(){
  setEditingCustomerId(null);setCustomerType("individual");setCustomerFirstName("");setCustomerLastName("");setCustomerOrganizationName("");setCustomerPhone("");setCustomerEmail("");setCustomerNationalId("");setCustomerBirthDate("");setCustomerFatherName("");setCustomerOccupation("");setCustomerPostalCode("");setCustomerSanaVerified(false);setCustomerStatus("active");setCustomerNotes("");setCustomerFormError("");setShowCustomerForm(false);
 }
 const [showTaskForm,setShowTaskForm]=useState(false);
 const [taskSaving,setTaskSaving]=useState(false);
 const [taskFormError,setTaskFormError]=useState("");
 const [taskApplication,setTaskApplication]=useState("");
 const [taskTitle,setTaskTitle]=useState("");
 const [taskDescription,setTaskDescription]=useState("");
 const [taskPriority,setTaskPriority]=useState("normal");
 const [taskDueAt,setTaskDueAt]=useState("");
 useEffect(()=>{
  if(DESIGN_PREVIEW_MODE){
   setAuthUser(PREVIEW_USER);
   setReport(PREVIEW_REPORT);
   setApps(PREVIEW_APPLICATIONS);
   setApiState("connecting");
   setAuthChecking(false);
   return;
  }
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
  if(DESIGN_PREVIEW_MODE){
   setSectionLoading(false);
   setSectionError("");
   setTasks([]);
   return;
  }
  if(!authUser || !["dashboard","applications","customers","tasks","reports"].includes(page)) return;
  let active=true;
  setSectionLoading(true);setSectionError("");
  const load=async()=>{
   try {
    if(page==="customers" || page==="applications"){
     const rows=await getCustomers();
     if(active)setCustomers(rows);
     if(page==="applications"){
      const applicationRows=await getApplications();
      if(active)setApps(applicationRows);
     }
    }
    if(page==="tasks"){
     const rows=await getTasks();
     if(active)setTasks(rows);
    } else if(page==="dashboard"){
     const [liveReport,liveTasks]=await Promise.all([getOperationsReport(),getTasks()]);
     if(active){setReport(liveReport);setTasks(liveTasks);}
    } else if(page==="reports"){
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
   setApplicationStatusSuccess("وضعیت پرونده با موفقیت به «"+(statusLabels[mapped.status]||mapped.status)+"» تغییر کرد.");
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
 const normalizedQuery=query.trim().toLocaleLowerCase("fa-IR");
 const filtered=useMemo(()=>apps.filter(a=>{
  const searchable=[a.id,a.customer,a.type,a.amount,a.stage,a.status,a.date].join(" ").toLocaleLowerCase("fa-IR");
  return searchable.includes(normalizedQuery)&&(status==="همه وضعیت‌ها"||a.status===status);
 }),[apps,normalizedQuery,status]);
 const filteredCustomers=useMemo(()=>customers.filter(customer=>{
  const name=customer.customer_type==="organization"?customer.organization_name:[customer.first_name,customer.last_name].filter(Boolean).join(" ");
  return [customer.customer_number,name,customer.phone_number,customer.email].some(value=>String(value||"").toLocaleLowerCase("fa-IR").includes(normalizedQuery));
 }),[customers,normalizedQuery]);
 const filteredTasks=useMemo(()=>tasks.filter(task=>
  [task.task_number,task.title,task.application_number,task.assigned_to_username,task.created_by_username,task.description].some(value=>String(value||"").toLocaleLowerCase("fa-IR").includes(normalizedQuery))
 ),[tasks,normalizedQuery]);
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
 const title:Record<NavKey,string>={dashboard:"داشبورد مدیریتی",applications:"پرونده‌های تسهیلاتی",customers:"مشتریان",tasks:"وظایف و پیگیری",services:"خدمات و رسیدها",reports:"گزارش‌ها",settings:"تنظیمات سامانه"};
 const description:Record<NavKey,string>={dashboard:"نمای کلی عملکرد و وضعیت پرونده‌های تسهیلاتی سامانه امید",applications:"مدیریت و پیگیری پرونده‌ها از ثبت درخواست تا پرداخت تسهیلات",customers:"فهرست مشتریان حقیقی و حقوقی و اطلاعات ارتباطی آن‌ها",tasks:"پیگیری اقدامات معوق و وظایف محول‌شده به کارشناسان",services:"ثبت و پیگیری رسیدهای خدمات، مبالغ دریافتی و مانده حساب",reports:"گزارش‌های مدیریتی و عملیاتی پرونده‌ها",settings:"تنظیمات عمومی و اتصال رابط کاربری به سرویس سامانه"};
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
   <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}><div style={{width:48,height:48,display:"grid",placeItems:"center",borderRadius:13,background:"#204a7b",color:"#fff",fontSize:26,fontWeight:800}}>ا</div><div><h1 style={{fontSize:22,margin:0,color:"#1b2b43"}}>سامانه امید</h1></div></div>
   <label style={{display:"block",fontSize:12,marginBottom:7,color:"#526176"}} htmlFor="omid-username">نام کاربری</label>
   <input id="omid-username" autoComplete="username" required value={username} onChange={event=>setUsername(event.target.value)} style={{width:"100%",height:44,padding:"0 12px",border:"1px solid #dce3ed",borderRadius:8,marginBottom:16}}/>
   <label style={{display:"block",fontSize:12,marginBottom:7,color:"#526176"}} htmlFor="omid-password">گذرواژه</label>
   <input id="omid-password" type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} style={{width:"100%",height:44,padding:"0 12px",border:"1px solid #dce3ed",borderRadius:8,marginBottom:16}}/>
   {(authError||apiError)&&<p role="alert" style={{fontSize:12,lineHeight:1.8,color:"#b42318",background:"#fff1f0",padding:10,borderRadius:8}}>{authError||apiError}</p>}
   <button type="submit" disabled={authSubmitting} style={{width:"100%",height:44,border:0,borderRadius:8,background:"#204a7b",color:"#fff",fontWeight:700,opacity:authSubmitting ? 0.7 : 1}}>{authSubmitting?"در حال ورود…":"ورود به سامانه"}</button>
   
  </form>
 </div>;
 if(authUser.must_change_password) return <PasswordChangeForm required onSuccess={()=>setAuthUser(current=>current?{...current,must_change_password:false}:current)}/>;
 return <div className="app" dir="rtl">
  <aside className={"sidebar "+(mobileOpen?"open":"")}><div className="brand"><div className="brand-mark">ا</div><div><b>سامانه امید</b><small>مدیریت مالی و تسهیلات</small></div><button className="mobile-close" onClick={()=>setMobileOpen(false)}>×</button></div>
   <div className="workspace"><span className="workspace-dot"></span><div><b>شرکت خدمات مالی امید</b><small>فضای کاری سازمانی</small></div><span className="down">⌄</span></div>
   {["فضای کاری","عملیات","مدیریت"].map(group=><div className="nav-group" key={group}><label>{group}</label>{nav.filter(n=>n.group===group).map(n=><button key={n.key} className={"nav-item "+(page===n.key?"active":"")} onClick={()=>{setPage(n.key);setSelected(null);setMobileOpen(false)}}><span className="nav-icon">{n.icon}</span>{n.label}{n.key==="tasks"&&activeTaskCount!==null&&activeTaskCount>0&&<i>{activeTaskCount.toLocaleString("fa-IR")}</i>}</button>)}</div>)}
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
    <section className="card stage-card"><div className="card-head"><div><h2>سهم هر وضعیت</h2><p>درصد واقعی از کل پرونده‌های گزارش</p></div><span className="round-icon">◉</span></div>{report?<div className="donut-wrap"><div className="donut" style={{background:statusDonutGradient}}><div><b>{report.applications.total.toLocaleString("fa-IR")}</b><small>پرونده</small></div></div><div className="legend">{applicationStatusMetrics.map(item=><div key={item.key} title={item.count.toLocaleString("fa-IR")+" پرونده"}><span><i className={"dot-"+item.tone}></i>{item.label}</span><b>{Math.round(report.applications.total>0?item.count/report.applications.total*100:0).toLocaleString("fa-IR")+"٪"}</b></div>)}</div></div>:<p className="empty">{sectionError?"سهم وضعیت‌ها به‌دلیل خطای دریافت داده در دسترس نیست.":"در انتظار دریافت گزارش…"}</p>}</section></div>
    <div className="bottom-grid"><section className="card"><div className="card-head"><div><h2>پرونده‌های اخیر</h2><p>آخرین پرونده‌های دریافت‌شده از API</p></div><button className="subtle-btn" onClick={()=>setPage("applications")}>مشاهده همه ←</button></div><ApplicationsTable rows={apps.slice(0,4)} onSelect={setSelected}/></section><section className="card tasks-card"><div className="card-head"><div><h2>نیازمند پیگیری</h2><p>{report?report.tasks.overdue.toLocaleString("fa-IR")+" وظیفه عقب‌افتاده، "+report.tasks.due_today.toLocaleString("fa-IR")+" موعد امروز":"آمار وظایف در دسترس نیست"}</p></div><span className="count-pill">{activeTaskCount===null?"—":"فعال: "+activeTaskCount.toLocaleString("fa-IR")}</span></div>
     {followUpTasks.map((task,i)=><button className="task-row" key={task.id} onClick={()=>setPage("tasks")}><span className={"task-symbol t"+i}>{task.is_overdue?"!":task.status==="in_progress"?"↻":"◷"}</span><span className="task-text"><b>{task.title}</b><small>{task.task_number} · {task.application_number||"بدون پرونده"}</small></span><span className="task-arrow">{task.is_overdue?"عقب‌افتاده":"مشاهده"}</span></button>)}
     {!sectionLoading&&!sectionError&&followUpTasks.length===0&&<p className="empty">وظیفهٔ بازی برای پیگیری وجود ندارد.</p>}
    </section></div></>}
   {page==="applications"&&!selected&&<section className="card list-card"><div className="card-head list-head"><div><h2>همه پرونده‌ها</h2><p>{filtered.length.toLocaleString("fa-IR")} پرونده مطابق فیلتر</p></div><button className="btn secondary" onClick={()=>{setQuery("");setStatus("همه وضعیت‌ها")}}>پاک‌کردن فیلترها</button></div><div className="filters"><label className="search-field">⌕ <input placeholder="جستجو بر اساس شماره پرونده، مشتری..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={status} onChange={e=>setStatus(e.target.value)}><option>همه وضعیت‌ها</option>{Object.values(statusLabels).filter((label,index,all)=>all.indexOf(label)===index).map(label=><option key={label}>{label}</option>)}</select><button className="btn secondary" onClick={()=>window.print()}>⇩ خروجی / چاپ</button></div><ApplicationsTable rows={filtered} onSelect={setSelected}/></section>}
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
   {selected&&<ApplicationGuarantees selected={selected} authUser={authUser}/>}
   {selected&&<ApplicationFollowUps selected={selected} authUser={authUser}/>}
   {selected&&<ApplicationStageWorkflow selected={selected} authUser={authUser}/>}  
   {page==="customers"&&!selected&&showCustomerForm&&<section className="card customer-form-card">
    <div className="card-head"><div><h2>{editingCustomerId?"ویرایش پروفایل مشتری":"ثبت مشتری جدید"}</h2><p>{editingCustomerId?"تغییرات در پرونده مشتری ذخیره و در سوابق سامانه ثبت می‌شود.":"اطلاعات در بک‌اند ذخیره و شماره مشتری به‌صورت خودکار تولید می‌شود."}</p></div><button type="button" className="btn secondary" onClick={resetCustomerForm}>بستن</button></div>
    {customerFormError&&<p role="alert" className="notice">{customerFormError}</p>}
    <form className="customer-form" onSubmit={async event=>{
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
       ...(!editingCustomerId&&phones.length?{phones}:{})
      };
      const customerPath=editingCustomerId?"/api/v1/customers/"+editingCustomerId+"/":"/api/v1/customers/";
      const savedCustomer=await apiRequest(customerPath,{method:editingCustomerId?"PATCH":"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify(payload)}) as CustomerRow;
      setCustomers(current=>editingCustomerId?current.map(customer=>customer.id===savedCustomer.id?savedCustomer:customer):[savedCustomer,...current.filter(customer=>customer.id!==savedCustomer.id)]);
      resetCustomerForm();setApiState("connected");setApiError("");setSectionError("");
     }catch(error){setCustomerFormError((error as Error).message||"ثبت مشتری ناموفق بود.");}
     finally{setCustomerSaving(false);}
    }}>
     <div className="customer-form-grid">
      <div className="customer-form-row"><label>نوع مشتری *</label><select className="field" required value={customerType} onChange={event=>setCustomerType(event.target.value as "individual"|"organization")}><option value="individual">حقیقی</option><option value="organization">حقوقی</option></select></div>
      {customerType==="individual"?<>
       <div className="customer-form-row"><label>نام *</label><input className="field" required maxLength={100} value={customerFirstName} onChange={event=>setCustomerFirstName(event.target.value)} autoComplete="given-name"/></div>
       <div className="customer-form-row"><label>نام خانوادگی *</label><input className="field" required maxLength={100} value={customerLastName} onChange={event=>setCustomerLastName(event.target.value)} autoComplete="family-name"/></div>
      </>:<div className="customer-form-row"><label>نام سازمان / شرکت *</label><input className="field" required maxLength={200} value={customerOrganizationName} onChange={event=>setCustomerOrganizationName(event.target.value)}/></div>}
      <div className="customer-form-row"><label>شماره تلفن</label><input className="field" type="tel" maxLength={32} value={customerPhone} onChange={event=>setCustomerPhone(event.target.value)} autoComplete="tel"/></div>
      <div className="customer-form-row"><label>پست الکترونیکی</label><input className="field" type="email" maxLength={254} value={customerEmail} onChange={event=>setCustomerEmail(event.target.value)} autoComplete="email"/></div>
      <div className="customer-form-row"><label>کد ملی / شناسه ملی</label><input className="field" inputMode="numeric" maxLength={20} value={customerNationalId} onChange={event=>setCustomerNationalId(event.target.value)}/></div>
      {customerType==="individual"&&<>
       <div className="customer-form-row"><label>تاریخ تولد</label><input className="field" type="date" value={customerBirthDate} onChange={event=>setCustomerBirthDate(event.target.value)}/></div>
       <div className="customer-form-row"><label>نام پدر</label><input className="field" maxLength={100} value={customerFatherName} onChange={event=>setCustomerFatherName(event.target.value)}/></div>
       <div className="customer-form-row"><label>شغل</label><input className="field" maxLength={150} value={customerOccupation} onChange={event=>setCustomerOccupation(event.target.value)}/></div>
      </>}
      <div className="customer-form-row"><label>کدپستی</label><input className="field" inputMode="numeric" maxLength={20} value={customerPostalCode} onChange={event=>setCustomerPostalCode(event.target.value)}/></div>
      <div className="customer-form-row"><label>وضعیت مشتری</label><select className="field" value={customerStatus} onChange={event=>setCustomerStatus(event.target.value)}><option value="active">فعال</option><option value="needs_review">نیازمند بررسی</option><option value="inactive">غیرفعال</option>{customerStatus==="archived"&&<option value="archived">بایگانی‌شده</option>}</select></div>
      <div className="customer-form-row"><label>یادداشت</label><input className="field" maxLength={2000} value={customerNotes} onChange={event=>setCustomerNotes(event.target.value)}/></div>
      <label className="customer-sana-field"><input type="checkbox" checked={customerSanaVerified} onChange={event=>setCustomerSanaVerified(event.target.checked)}/> احراز ثنا انجام شده است</label>
     </div>
     <div className="customer-form-actions"><button className="btn primary" type="submit" disabled={customerSaving}>{customerSaving?"در حال ذخیره…":editingCustomerId?"ذخیره تغییرات":"ثبت مشتری"}</button><button className="btn secondary" type="button" disabled={customerSaving} onClick={resetCustomerForm}>انصراف</button></div>
    </form>
   </section>}
   {page==="customers"&&!selected&&<section className="card list-card"><div className="card-head"><div><h2>فهرست مشتریان</h2><p>{filteredCustomers.length.toLocaleString("fa-IR")} از {customers.length.toLocaleString("fa-IR")} مشتری</p></div><button className="btn secondary" onClick={()=>setPage("applications")}>پرونده‌های تسهیلاتی</button></div>{sectionLoading?<p className="empty">در حال دریافت اطلاعات مشتریان…</p>:sectionError?<p className="empty" role="alert">{sectionError}</p>:<div className="table-wrap"><table><thead><tr><th>شماره مشتری</th><th>نام / شرکت</th><th>نوع</th><th>تلفن</th><th>وضعیت</th><th>تاریخ ثبت</th><th>اقدام</th></tr></thead><tbody>{filteredCustomers.map(customer=><tr key={customer.id}><td><b className="case-id">{customer.customer_number}</b></td><td><b>{customer.customer_type==="organization"?customer.organization_name:[customer.first_name,customer.last_name].filter(Boolean).join(" ")||"—"}</b></td><td>{customer.customer_type==="organization"?"حقوقی":"حقیقی"}</td><td>{customer.phone_number||"—"}</td><td><Status value={customer.status==="active"?"فعال":customer.status==="needs_review"?"نیازمند بررسی":customer.status==="archived"?"بایگانی‌شده":"غیرفعال"}/></td><td>{displayDate(customer.created_at)}</td><td><button type="button" className="btn secondary" onClick={()=>beginCustomerEdit(customer)}>ویرایش</button></td></tr>)}{!filteredCustomers.length&&<tr><td colSpan={7} className="empty">{normalizedQuery?"مشتری مطابق عبارت جستجو پیدا نشد.":"مشتری‌ای برای نمایش وجود ندارد."}</td></tr>}</tbody></table></div>}</section>}
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
   {page==="tasks"&&!selected&&<section className="card list-card"><div className="card-head"><div><h2>وظایف و پیگیری</h2><p>{filteredTasks.length.toLocaleString("fa-IR")} از {tasks.length.toLocaleString("fa-IR")} وظیفه در محدوده دسترسی شما</p></div><button className="btn secondary" onClick={()=>setPage("applications")}>پرونده‌ها</button></div>{sectionLoading?<p className="empty">در حال دریافت وظایف…</p>:sectionError?<p className="empty" role="alert">{sectionError}</p>:<div className="table-wrap"><table><thead><tr><th>شماره وظیفه</th><th>عنوان</th><th>پرونده</th><th>مسئول</th><th>اولویت</th><th>موعد</th><th>وضعیت</th><th>اقدام</th></tr></thead><tbody>{filteredTasks.map(task=><tr key={task.id}><td><b className="case-id">{task.task_number}</b></td><td>{task.title}</td><td>{task.application_number||"—"}</td><td>{task.assigned_to_username||"—"}</td><td>{task.priority==="urgent"?"فوری":task.priority==="high"?"زیاد":task.priority==="low"?"کم":"عادی"}</td><td>{displayDate(task.due_at)}</td><td><Status value={task.is_overdue?"عقب‌افتاده":task.status==="open"?"باز":task.status==="in_progress"?"در حال انجام":task.status==="completed"?"انجام‌شده":"لغوشده"}/></td><td>{task.status==="open"?<button className="btn secondary" onClick={()=>void changeTaskStatus(task,"in_progress")}>شروع</button>:task.status==="in_progress"?<button className="btn secondary" onClick={()=>void changeTaskStatus(task,"completed")}>تکمیل</button>:<span>—</span>}</td></tr>)}{!filteredTasks.length&&<tr><td colSpan={8} className="empty">{normalizedQuery?"وظیفه‌ای مطابق عبارت جستجو پیدا نشد.":"وظیفه‌ای برای نمایش وجود ندارد."}</td></tr>}</tbody></table></div>}</section>}
   {page==="reports"&&!selected&&<section className="card list-card"><div className="card-head"><div><h2>گزارش عملیاتی</h2><p>{report?"آخرین تولید: "+displayDate(report.generated_at):"گزارش زنده از بک‌اند"}</p></div><button className="btn secondary" onClick={()=>setPage("dashboard")}>بازگشت به داشبورد</button></div>{sectionLoading?<p className="empty">در حال دریافت گزارش…</p>:sectionError?<p className="empty" role="alert">{sectionError}</p>:report?<><div className="stat-grid"><Stat icon="♙" label="مشتریان" value={report.customers.total.toLocaleString("fa-IR")} delta={"فعال: "+report.customers.active.toLocaleString("fa-IR")} tone="blue"/><Stat icon="▤" label="پرونده‌های تسهیلاتی" value={report.applications.total.toLocaleString("fa-IR")} delta="طبق محدوده دسترسی کاربر" tone="violet"/><Stat icon="◷" label="وظایف عقب‌افتاده" value={report.tasks.overdue.toLocaleString("fa-IR")} delta={"امروز: "+report.tasks.due_today.toLocaleString("fa-IR")} tone="amber"/><Stat icon="✓" label="رسیدهای خدمات" value={report.service_receipts.count.toLocaleString("fa-IR")} delta={"مانده: "+formatMoney(report.service_receipts.outstanding_total)+" تومان"} tone="green"/></div><p className="note">این گزارش فقط داده‌هایی را نمایش می‌دهد که بک‌اند برای نقش و محدوده دسترسی شما مجاز دانسته است.</p></>:<p className="empty">گزارشی در دسترس نیست.</p>}</section>}
   {page==="services"&&!selected&&<ServiceReceiptsPage authUser={authUser}/>}
   {page==="settings"&&!selected&&<SettingsPage authUser={authUser} apiState={apiState} onPasswordChanged={()=>setAuthUser(current=>current?{...current,must_change_password:false}:current)}/>}
   <footer><span>© ۱۴۰۵ سامانه امید</span><span className="connection"><i className={apiState==="connected"?"connected":""}></i>{apiState==="connected"?"متصل به API":apiState==="error"?"خطا در اتصال API":"در حال اتصال به API"}</span><span>نسخه رابط کاربری ۱.۰</span></footer>
   </div></main>
 </div>
}
function ApplicationStageWorkflow({selected,authUser}:{selected:Application;authUser:ApiUser|null}){
 const [parties,setParties]=useState<CasePartyRow[]>([]);
 const [stages,setStages]=useState<StageInstanceRow[]>([]);
 const [customers,setCustomers]=useState<CustomerRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState("");
 const [customerError,setCustomerError]=useState("");
 const [message,setMessage]=useState("");
 const [partyFormOpen,setPartyFormOpen]=useState(false);
 const [partyPerson,setPartyPerson]=useState("");
 const [partyRole,setPartyRole]=useState("guarantor");
 const [partyRelationship,setPartyRelationship]=useState("");
 const [partyError,setPartyError]=useState("");
 const [partySaving,setPartySaving]=useState(false);
 const [partySavingId,setPartySavingId]=useState<string|null>(null);
 const [partyErrors,setPartyErrors]=useState<Record<string,string>>({});
 const [structureSaving,setStructureSaving]=useState(false);
 const [transitionDraft,setTransitionDraft]=useState<{stageId:string;action:string}|null>(null);
 const [transitionReason,setTransitionReason]=useState("");
 const [transitionEvidence,setTransitionEvidence]=useState("");
 const [transitionSavingId,setTransitionSavingId]=useState<string|null>(null);
 const [transitionErrors,setTransitionErrors]=useState<Record<string,string>>({});
 const role=authUser?.role||"";
 const canWrite=["system_admin","intake","case_worker"].includes(role);
 const isAdmin=role==="system_admin";

 async function fetchWorkflowData(){
  const [partyPayload,stagePayload]=await Promise.all([
   apiRequest("/api/v1/applications/parties/?application="+encodeURIComponent(selected.uuid)),
   apiRequest("/api/v1/applications/stages/?application="+encodeURIComponent(selected.uuid))
  ]);
  const partyRows=Array.isArray(partyPayload)?partyPayload:partyPayload.results;
  const stageRows=Array.isArray(stagePayload)?stagePayload:stagePayload.results;
  if(!Array.isArray(partyRows)||!Array.isArray(stageRows))throw new Error("ساختار پاسخ مراحل گردش کار معتبر نیست.");
  setParties(partyRows as CasePartyRow[]);
  setStages(stageRows as StageInstanceRow[]);
 }

 async function reloadWorkflow(){
  setLoadError("");
  try{await fetchWorkflowData();}
  catch(failure){setLoadError((failure as Error).message||"به‌روزرسانی مراحل گردش کار ناموفق بود.");}
 }

 useEffect(()=>{
  let active=true;
  setLoading(true);setLoadError("");setMessage("");setTransitionDraft(null);
  setParties([]);setStages([]);
  void Promise.all([
   apiRequest("/api/v1/applications/parties/?application="+encodeURIComponent(selected.uuid)),
   apiRequest("/api/v1/applications/stages/?application="+encodeURIComponent(selected.uuid))
  ]).then(([partyPayload,stagePayload])=>{
   const partyRows=Array.isArray(partyPayload)?partyPayload:partyPayload.results;
   const stageRows=Array.isArray(stagePayload)?stagePayload:stagePayload.results;
   if(!Array.isArray(partyRows)||!Array.isArray(stageRows))throw new Error("ساختار پاسخ مراحل گردش کار معتبر نیست.");
   if(active){setParties(partyRows as CasePartyRow[]);setStages(stageRows as StageInstanceRow[]);}
  }).catch(failure=>{
   if(active)setLoadError((failure as Error).message||"دریافت مراحل گردش کار ناموفق بود.");
  }).finally(()=>{if(active)setLoading(false);});
  if(canWrite){
   setCustomerError("");
   void getCustomers().then(rows=>{if(active)setCustomers(rows);}).catch(failure=>{
    if(active)setCustomerError((failure as Error).message||"دریافت فهرست مشتریان ناموفق بود.");
   });
  }else{setCustomers([]);setCustomerError("");}
  return ()=>{active=false;};
 },[selected.uuid,canWrite]);

 const activeParties=parties.filter(party=>party.membership_status==="active");
 const activeApplicant=activeParties.find(party=>party.role==="applicant");
 const missingCustomerOptions=customers.filter(customer=>customer.status==="active"&&!activeParties.some(party=>party.person===customer.id));
 const activeStageKeys=new Set(stages.filter(stage=>stage.party).map(stage=>String(stage.party)+":"+stage.code));
 const activeCaseStageCodes=new Set(stages.filter(stage=>!stage.party).map(stage=>stage.code));

 async function createMainApplicant(){
  if(!selected.customerId){setPartyError("شناسه مشتری اصلی پرونده در پاسخ سرور موجود نیست.");return;}
  setPartySaving(true);setPartyError("");setMessage("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   await apiRequest("/api/v1/applications/parties/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({
    application:selected.uuid,person:selected.customerId,role:"applicant",relationship_to_applicant:"",membership_status:"active",account_status:"unknown",sort_order:0
   })});
   setMessage("متقاضی اصلی به گردش کار پرونده اضافه شد و مراحل فردی ساخته شدند.");
   await reloadWorkflow();
  }catch(failure){setPartyError((failure as Error).message||"ثبت متقاضی اصلی در گردش کار ناموفق بود.");}
  finally{setPartySaving(false);}
 }

 async function createOtherParty(){
  if(!partyPerson){setPartyError("شخص موردنظر را انتخاب کنید.");return;}
  if(partyRole==="guarantor"&&!partyRelationship.trim()){setPartyError("نسبت ضامن با متقاضی اصلی را وارد کنید.");return;}
  setPartySaving(true);setPartyError("");setMessage("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   await apiRequest("/api/v1/applications/parties/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({
    application:selected.uuid,person:partyPerson,role:partyRole,relationship_to_applicant:partyRelationship.trim(),membership_status:"active",account_status:"unknown",sort_order:activeParties.length
   })});
   setPartyPerson("");setPartyRole("guarantor");setPartyRelationship("");setPartyFormOpen(false);
   setMessage("شخص جدید به پرونده افزوده شد و مراحل فردی او ایجاد شدند.");
   await reloadWorkflow();
  }catch(failure){setPartyError((failure as Error).message||"افزودن شخص به پرونده ناموفق بود.");}
  finally{setPartySaving(false);}
 }

 async function updatePartyAccountStatus(party:CasePartyRow,nextStatus:string){
  setPartySavingId(party.id);setPartyErrors(current=>({...current,[party.id]:""}));setMessage("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const updated=await apiRequest("/api/v1/applications/parties/"+party.id+"/",{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({account_status:nextStatus})}) as CasePartyRow;
   setParties(current=>current.map(item=>item.id===updated.id?updated:item));
   setMessage("وضعیت حساب شخص به‌روزرسانی شد.");
  }catch(failure){setPartyErrors(current=>({...current,[party.id]:(failure as Error).message||"به‌روزرسانی وضعیت حساب ناموفق بود."}));}
  finally{setPartySavingId(null);}
 }

 async function ensureWorkflowStructure(){
  setStructureSaving(true);setMessage("");setLoadError("");
  let createdCount=0;
  try{
   const missing:Array<{code:string;party:string|null}>=[];
   for(const party of activeParties){
    for(const def of personStageDefinitions){
     if(!activeStageKeys.has(party.id+":"+def.code))missing.push({code:def.code,party:party.id});
    }
   }
   for(const def of caseStageDefinitions){
    if(!activeCaseStageCodes.has(def.code))missing.push({code:def.code,party:null});
   }
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   for(const item of missing){
    const body:{application:string;code:string;party?:string}={application:selected.uuid,code:item.code};
    if(item.party)body.party=item.party;
    const created=await apiRequest("/api/v1/applications/stages/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify(body)}) as StageInstanceRow;
    setStages(current=>[...current.filter(stage=>stage.id!==created.id),created]);
    createdCount++;
   }
   setMessage(createdCount?createdCount.toLocaleString("fa-IR")+" مرحلهٔ گردش کار ایجاد شد.":"همه مراحل موردنیاز قبلاً ایجاد شده‌اند.");
   await reloadWorkflow();
  }catch(failure){
   setLoadError((failure as Error).message||"ایجاد مراحل گردش کار ناموفق بود؛ مراحل ثبت‌شده حفظ شده‌اند.");
   await reloadWorkflow();
  }finally{setStructureSaving(false);}
 }

 function isPrerequisiteComplete(code:string):boolean{
  return stages.some(stage=>!stage.party&&stage.code===code&&completedStageStatuses.includes(stage.status));
 }
 function areAllRequiredPersonStagesComplete():boolean{
  return activeParties.some(party=>party.role==="applicant")&&activeParties.every(party=>
   personStageDefinitions.every(def=>stages.some(stage=>stage.party===party.id&&stage.code===def.code&&completedStageStatuses.includes(stage.status)))
  );
 }
 function canStartStage(stage:StageInstanceRow):boolean{
  if(!["locked","pending","action_needed","on_hold"].includes(stage.status))return false;
  if(stage.code==="loan_submission")return areAllRequiredPersonStagesComplete();
  const prerequisites:Record<string,string>={bank_review:"loan_submission",disbursement:"bank_review",settlement:"disbursement",handover:"settlement"};
  const prior=prerequisites[stage.code];
  return !prior||isPrerequisiteComplete(prior);
 }
 function canBypassStage(stage:StageInstanceRow):boolean{
  if(stage.code==="loan_submission"&&!areAllRequiredPersonStagesComplete())return false;
  const prerequisites:Record<string,string>={bank_review:"loan_submission",disbursement:"bank_review",settlement:"disbursement",handover:"settlement"};
  const prior=prerequisites[stage.code];
  if(prior&&!isPrerequisiteComplete(prior))return false;
  if(stage.code==="account"&&partyForStage(stage)?.account_status!=="existing_verified")return false;
  return true;
 }
 function partyForStage(stage:StageInstanceRow):CasePartyRow|undefined{
  return stage.party?parties.find(party=>party.id===stage.party):undefined;
 }

 function startTransition(stage:StageInstanceRow,action:string){
  if(action==="start"||(action==="complete"&&!(stage.code==="account"&&partyForStage(stage)?.account_status==="needs_opening"))){
   void submitStageTransition(stage,action,"","");
   return;
  }
  setTransitionDraft({stageId:stage.id,action});
  setTransitionReason("");setTransitionEvidence("");
  setTransitionErrors(current=>({...current,[stage.id]:""}));
 }

 async function submitStageTransition(stage:StageInstanceRow,action:string,reason:string,evidenceReference:string){
  if(["hold","bypass"].includes(action)&&!reason.trim()){
   setTransitionErrors(current=>({...current,[stage.id]:"برای تعلیق یا عبور از مرحله، ثبت دلیل الزامی است."}));
   return;
  }
  if(action==="complete"&&stage.code==="account"&&partyForStage(stage)?.account_status==="needs_opening"&&!evidenceReference.trim()){
   setTransitionErrors(current=>({...current,[stage.id]:"برای تأیید افتتاح حساب، مرجع مدرک الزامی است."}));
   return;
  }
  setTransitionSavingId(stage.id);setTransitionErrors(current=>({...current,[stage.id]:""}));setMessage("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const updated=await apiRequest("/api/v1/applications/stages/"+stage.id+"/transition/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({action,reason,evidence_reference:evidenceReference})}) as StageInstanceRow;
   setStages(current=>current.map(item=>item.id===updated.id?updated:item));
   setTransitionDraft(null);setTransitionReason("");setTransitionEvidence("");
   setMessage("مرحلهٔ «"+(stageCodeLabels[updated.code]||updated.code)+"» به‌روزرسانی شد.");
  }catch(failure){setTransitionErrors(current=>({...current,[stage.id]:(failure as Error).message||"تغییر وضعیت مرحله ناموفق بود."}));}
  finally{setTransitionSavingId(null);}
 }

 function renderStage(stage:StageInstanceRow){
  const canTransition=canWrite&&stage.status!=="completed"&&stage.status!=="bypassed"&&stage.status!=="rejected";
  const needsAccountEvidence=stage.code==="account"&&partyForStage(stage)?.account_status==="needs_opening";
  const actions:Array<{action:string;label:string;variant:"primary"|"secondary"}>=[];
  if(canTransition&&canStartStage(stage))actions.push({action:"start",label:stage.status==="on_hold"?"ادامه مرحله":"شروع مرحله",variant:"primary"});
  if(canTransition&&stage.status==="in_progress")actions.push({action:"complete",label:"تکمیل مرحله",variant:"primary"});
  if(canTransition&&["pending","in_progress","action_needed"].includes(stage.status))actions.push({action:"hold",label:"تعلیق",variant:"secondary"});
  if(isAdmin&&canTransition&&canBypassStage(stage))actions.push({action:"bypass",label:"عبور با مجوز مدیر",variant:"secondary"});
  return <article key={stage.id} style={{border:"1px solid #e8edf3",borderRadius:8,padding:12,background:"#fff"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
    <div style={{minWidth:0,flex:1}}><b style={{fontSize:11,color:"#35465b"}}>{stageCodeLabels[stage.code]||stage.code}</b><div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center",marginTop:7}}><span style={{fontSize:9,color:stage.status==="completed"||stage.status==="bypassed"?"#24704f":stage.status==="on_hold"||stage.status==="action_needed"?"#a66b1f":"#718096",background:stage.status==="completed"||stage.status==="bypassed"?"#e8f7ef":stage.status==="on_hold"||stage.status==="action_needed"?"#fff4e5":"#f2f5f9",padding:"4px 7px",borderRadius:5}}>{stageStatusLabels[stage.status]||stage.status}</span>{stage.started_at&&<small style={{fontSize:9,color:"#8492a5"}}>شروع: {displayDateTime(stage.started_at)}</small>}{stage.completed_at&&<small style={{fontSize:9,color:"#8492a5"}}>پایان: {displayDateTime(stage.completed_at)}</small>}</div></div>
   </div>
   {stage.hold_reason&&["on_hold","bypassed"].includes(stage.status)&&<p style={{fontSize:10,color:"#a66b1f",lineHeight:1.8,margin:"8px 0 0"}}>دلیل تعلیق/عبور: {stage.hold_reason}</p>}
   {stage.evidence_reference&&<p style={{fontSize:10,color:"#66758a",lineHeight:1.8,margin:"6px 0 0"}}>مرجع مدرک: {stage.evidence_reference}</p>}
   {(stage.code==="merat"||stage.code==="disbursement")&&<MeratDisbursementPanel stage={stage} selected={selected} parties={parties} authUser={authUser}/> }
   {actions.length>0&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:11}}>{actions.map(item=><button key={item.action} type="button" className={"btn "+item.variant} disabled={transitionSavingId===stage.id} onClick={()=>startTransition(stage,item.action)}>{transitionSavingId===stage.id?"در حال ثبت…":item.label}</button>)}</div>}
   {transitionDraft?.stageId===stage.id&&<form onSubmit={event=>{event.preventDefault();void submitStageTransition(stage,transitionDraft.action,transitionReason,transitionEvidence);}} style={{marginTop:12,paddingTop:12,borderTop:"1px solid #edf1f6"}}>
    {["hold","bypass"].includes(transitionDraft.action)&&<div className="form-row"><label htmlFor={"stage-reason-"+stage.id}>دلیل مستند *</label><textarea id={"stage-reason-"+stage.id} className="field" rows={2} maxLength={500} required value={transitionReason} onChange={event=>setTransitionReason(event.target.value)} style={{minHeight:65,resize:"vertical"}}/></div>}
    {transitionDraft.action==="complete"&&needsAccountEvidence&&<div className="form-row"><label htmlFor={"stage-evidence-"+stage.id}>مرجع مدرک افتتاح حساب *</label><input id={"stage-evidence-"+stage.id} className="field" maxLength={500} required value={transitionEvidence} onChange={event=>setTransitionEvidence(event.target.value)} placeholder="شماره پیگیری یا مرجع مدرک"/></div>}
    {transitionErrors[stage.id]&&<p role="alert" className="notice">{transitionErrors[stage.id]}</p>}
    <div style={{display:"flex",gap:8,marginTop:10}}><button className="btn primary" type="submit" disabled={transitionSavingId===stage.id}>{transitionSavingId===stage.id?"در حال ثبت…":"تأیید عملیات"}</button><button type="button" className="btn secondary" disabled={transitionSavingId===stage.id} onClick={()=>setTransitionDraft(null)}>انصراف</button></div>
   </form>}
   {transitionErrors[stage.id]&&transitionDraft?.stageId!==stage.id&&<p role="alert" className="notice" style={{marginTop:9}}>{transitionErrors[stage.id]}</p>}
  </article>;
 }

 const completeCount=stages.filter(stage=>completedStageStatuses.includes(stage.status)).length;
 const caseStages=stages.filter(stage=>!stage.party).sort((a,b)=>caseStageDefinitions.findIndex(def=>def.code===a.code)-caseStageDefinitions.findIndex(def=>def.code===b.code));
 return <section className="card" style={{marginTop:16,padding:22}}>
  <div className="card-head"><div><h2>گردش کار عملیاتی تسهیلات</h2><p>مراحل به تفکیک اشخاص پرونده و کل پرونده؛ پیش‌نیازها و مجوز نهایی در بک‌اند کنترل می‌شوند.</p></div><span style={{fontSize:10,color:"#8492a5"}}>{completeCount.toLocaleString("fa-IR")} از {stages.length.toLocaleString("fa-IR")} مرحله تکمیل‌شده</span></div>
  {canWrite&&<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:16}}><button type="button" className="btn secondary" disabled={structureSaving} onClick={()=>void ensureWorkflowStructure()}>{structureSaving?"در حال ایجاد مراحل…":"ایجاد/تکمیل ساختار مراحل"}</button><small style={{fontSize:9,color:"#8492a5"}}>مراحل موجود تکرار نمی‌شوند؛ ساخت مرحله فقط از API رسمی انجام می‌شود.</small></div>}
  {loadError&&<p role="alert" className="notice">{loadError}</p>}
  {message&&<p role="status" className="note">{message}</p>}
  {loading?<p className="empty">در حال دریافت گردش کار…</p>:<>
   <section style={{border:"1px solid #edf1f6",borderRadius:9,padding:15,marginBottom:18}}>
    <div className="card-head"><div><h3 style={{margin:0,fontSize:12,color:"#35465b"}}>اشخاص پرونده</h3><p>متقاضی اصلی، ضامن‌ها و نمایندگان؛ مراحل فردی برای هر شخص فعال نگهداری می‌شوند.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{canWrite&&!activeApplicant&&<button type="button" className="btn primary" disabled={partySaving} onClick={()=>void createMainApplicant()}>{partySaving?"در حال ثبت…":"ثبت متقاضی اصلی"}</button>}{canWrite&&<button type="button" className="btn secondary" onClick={()=>{setPartyFormOpen(current=>!current);setPartyError("");}}>{partyFormOpen?"بستن":"＋ افزودن ضامن/نماینده"}</button>}</div></div>
    {partyFormOpen&&canWrite&&<form onSubmit={event=>{event.preventDefault();void createOtherParty();}} style={{marginTop:12,padding:14,border:"1px solid #edf1f6",borderRadius:8,background:"#fcfdff"}}>
     <div className="form-grid"><div className="form-row"><label htmlFor="workflow-party-person">شخص *</label><select id="workflow-party-person" className="field" required value={partyPerson} onChange={event=>setPartyPerson(event.target.value)}><option value="">انتخاب مشتری</option>{missingCustomerOptions.map(customer=><option key={customer.id} value={customer.id}>{customer.customer_number+" — "+(customer.customer_type==="organization"?customer.organization_name:[customer.first_name,customer.last_name].filter(Boolean).join(" ")||"مشتری")}</option>)}</select>{customerError&&<small role="alert" style={{color:"#b42318"}}>{customerError}</small>}</div><div className="form-row"><label htmlFor="workflow-party-role">نقش *</label><select id="workflow-party-role" className="field" value={partyRole} onChange={event=>setPartyRole(event.target.value)}><option value="guarantor">ضامن</option><option value="representative">نماینده</option></select></div><div className="form-row"><label htmlFor="workflow-party-relationship">{partyRole==="guarantor"?"نسبت ضامن با متقاضی *":"رابطه با متقاضی"}</label><input id="workflow-party-relationship" className="field" maxLength={80} required={partyRole==="guarantor"} value={partyRelationship} onChange={event=>setPartyRelationship(event.target.value)} /></div></div>
     {partyError&&<p role="alert" className="notice">{partyError}</p>}
     <div style={{display:"flex",gap:8,marginTop:10}}><button type="submit" className="btn primary" disabled={partySaving||!partyPerson}>{partySaving?"در حال ثبت…":"افزودن شخص"}</button><button type="button" className="btn secondary" disabled={partySaving} onClick={()=>setPartyFormOpen(false)}>انصراف</button></div>
    </form>}
    {!activeParties.length&&!partyFormOpen&&<p className="empty">هنوز شخص فعالی به گردش کار افزوده نشده است. ابتدا متقاضی اصلی را ثبت کنید.</p>}
    {parties.map(party=><article key={party.id} style={{marginTop:10,padding:12,border:"1px solid #edf1f6",borderRadius:8,background:party.membership_status==="active"?"#fff":"#f8fafd"}}>
     <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start",flexWrap:"wrap"}}><div><b style={{fontSize:11,color:"#35465b"}}>{party.person_display}</b><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}><span style={{fontSize:9,color:"#8492a5"}}>{casePartyRoleLabels[party.role]||party.role}</span><span style={{fontSize:9,color:"#8492a5"}}>{membershipStatusLabels[party.membership_status]||party.membership_status}</span><span style={{fontSize:9,color:"#8492a5"}}>وضعیت حساب: {accountStatusLabels[party.account_status]||party.account_status}</span>{party.relationship_to_applicant&&<span style={{fontSize:9,color:"#8492a5"}}>نسبت: {party.relationship_to_applicant}</span>}</div></div>{canWrite&&party.membership_status==="active"&&<div className="form-row" style={{minWidth:220}}><label htmlFor={"party-account-"+party.id}>وضعیت حساب</label><select id={"party-account-"+party.id} className="field" value={party.account_status} disabled={partySavingId===party.id} onChange={event=>void updatePartyAccountStatus(party,event.target.value)}><option value="unknown">بررسی‌نشده</option><option value="existing_verified">حساب موجود تأییدشده</option><option value="needs_opening">نیازمند افتتاح</option></select>{partyErrors[party.id]&&<small role="alert" style={{color:"#b42318"}}>{partyErrors[party.id]}</small>}</div>}</div>
     {party.membership_status==="active"&&<div style={{display:"grid",gap:8,marginTop:11}}>{personStageDefinitions.map(def=>{const stage=stages.find(row=>row.party===party.id&&row.code===def.code);return stage?renderStage(stage):<div key={def.code} style={{fontSize:9,color:"#a66b1f",padding:"6px 8px",background:"#fff4e5",borderRadius:5}}>مرحله «{def.label}» ایجاد نشده است؛ از «ایجاد/تکمیل ساختار مراحل» استفاده کنید.</div>;})}</div>}
    </article>)}
    {partyError&&!partyFormOpen&&<p role="alert" className="notice">{partyError}</p>}
   </section>
   <section style={{border:"1px solid #edf1f6",borderRadius:9,padding:15}}>
    <div className="card-head"><div><h3 style={{margin:0,fontSize:12,color:"#35465b"}}>مراحل کل پرونده</h3><p>بررسی بانک، واریز، تسویه و تحویل فقط پس از تکمیل پیش‌نیاز مربوط امکان‌پذیر است.</p></div></div>
    {caseStages.length?<div style={{display:"grid",gap:8}}>{caseStages.map(renderStage)}</div>:<p className="empty">مراحل کل پرونده هنوز ساخته نشده‌اند.</p>}
   </section>
  </>}
 </section>;
}

function MeratDisbursementPanel({stage,selected,parties,authUser}:{stage:StageInstanceRow;selected:Application;parties:CasePartyRow[];authUser:ApiUser|null}){
 const [assessments,setAssessments]=useState<MeratAssessmentRow[]>([]);
 const [disbursements,setDisbursements]=useState<DisbursementRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [externalReference,setExternalReference]=useState("");
 const [result,setResult]=useState("pending");
 const [resultReason,setResultReason]=useState("");
 const [reportedLimit,setReportedLimit]=useState("");
 const [evidenceReference,setEvidenceReference]=useState("");
 const [amountRial,setAmountRial]=useState("");
 const [bankReferences,setBankReferences]=useState<Record<string,string>>({});
 const [confirmationEvidence,setConfirmationEvidence]=useState<Record<string,string>>({});
 const role=authUser?.role||"";
 const canRecord=["system_admin","intake","case_worker"].includes(role);
 const canConfirm=["system_admin","finance"].includes(role);
 const applicant=parties.find(p=>p.membership_status==="active"&&p.role==="applicant");
 const party=stage.party?parties.find(p=>p.id===stage.party):undefined;
 const relation=party?.role==="applicant"?"متقاضی اصلی":(party?.relationship_to_applicant||"شخص پرونده");
 async function load(){
  setError("");
  try{
   if(stage.code==="merat"){
    const rows=await getAllApiRows("/api/v1/applications/merat-assessments/?application="+encodeURIComponent(selected.uuid), "سوابق مرآت");
    const own=(rows as MeratAssessmentRow[]).filter(row=>row.stage===stage.id);
    setAssessments(own);
    const latest=own[0];
    if(latest){setExternalReference(latest.external_reference||"");setResult(latest.result||"pending");setResultReason(latest.result_reason||"");setReportedLimit(latest.reported_limit_rial==null?"":String(latest.reported_limit_rial));setEvidenceReference(latest.evidence_reference||"");}
   }else{
    const rows=await getAllApiRows("/api/v1/applications/disbursements/?application="+encodeURIComponent(selected.uuid), "سوابق واریز");
    setDisbursements(rows as DisbursementRow[]);
   }
  }catch(failure){setError((failure as Error).message||"دریافت اطلاعات ناموفق بود.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{setLoading(true);void load();},[stage.id,selected.uuid]);
 async function csrfToken(){const payload=await apiRequest("/api/v1/auth/csrf/");return String(payload.csrfToken||"");}
 async function saveAssessment(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!applicant||!party){setError("متقاضی اصلی یا شخص مرحله در گردش کار موجود نیست.");return;}
  setSaving(true);setError("");setNotice("");
  try{
   const csrf=await csrfToken();
   const body={stage:stage.id,requester:applicant.person,subject:party.person,relationship_to_applicant:relation,external_reference:externalReference.trim(),result,result_reason:resultReason.trim(),reported_limit_rial:reportedLimit.trim()?Number(reportedLimit):null,evidence_reference:evidenceReference.trim()};
   const existing=assessments[0];
   const row=await apiRequest("/api/v1/applications/merat-assessments/"+(existing?existing.id+"/":""),{method:existing?"PATCH":"POST",headers:{"Content-Type":"application/json","X-CSRFToken":csrf},body:JSON.stringify(body)}) as MeratAssessmentRow;
   setAssessments(current=>[row,...current.filter(item=>item.id!==row.id)]);
   setNotice(existing?"نتیجهٔ مرآت به‌روزرسانی شد.":"نتیجهٔ مرآت ثبت شد. این ثبت دستی است و اتصال مستقیم به سرویس مرآت محسوب نمی‌شود.");
  }catch(failure){setError((failure as Error).message||"ثبت نتیجه مرآت ناموفق بود.");}
  finally{setSaving(false);}
 }
 async function recordDisbursement(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setSaving(true);setError("");setNotice("");
  try{
   const csrf=await csrfToken();
   const row=await apiRequest("/api/v1/applications/disbursements/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":csrf},body:JSON.stringify({application:selected.uuid,amount_rial:Number(amountRial)})}) as DisbursementRow;
   setDisbursements(current=>[row,...current]);setAmountRial("");
   setNotice("واریز ثبت شد؛ تا زمانی که مالی یا مدیر سامانه آن را تأیید نکند، واریز نهایی محسوب نمی‌شود.");
  }catch(failure){setError((failure as Error).message||"ثبت واریز ناموفق بود.");}
  finally{setSaving(false);}
 }
 async function confirmDisbursement(row:DisbursementRow){
  const bankReference=(bankReferences[row.id]||"").trim();
  const evidence=(confirmationEvidence[row.id]||"").trim();
  if(!bankReference||!evidence){setError("برای تأیید واریز، مرجع بانکی و مرجع مدرک را وارد کنید.");return;}
  setSaving(true);setError("");setNotice("");
  try{
   const csrf=await csrfToken();
   const updated=await apiRequest("/api/v1/applications/disbursements/"+row.id+"/confirm/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":csrf},body:JSON.stringify({bank_reference:bankReference,evidence_reference:evidence})}) as DisbursementRow;
   setDisbursements(current=>current.map(item=>item.id===updated.id?updated:item));
   setNotice("واریز تأیید شد و مرجع بانکی ثبت گردید.");
  }catch(failure){setError((failure as Error).message||"تأیید واریز ناموفق بود.");}
  finally{setSaving(false);}
 }
 const rial=(value:string|number|null|undefined)=>value==null||value===""?"—":Number(value).toLocaleString("fa-IR")+" ریال";
 return <div style={{marginTop:12,padding:12,border:"1px solid #dce5ef",borderRadius:8,background:"#f9fbfd"}}>
  <b style={{fontSize:11,color:"#35465b"}}>{stage.code==="merat"?"سوابق اعتبارسنجی مرآت":"عملیات و سوابق واریز"}</b>
  {loading?<p className="empty">در حال دریافت اطلاعات…</p>:stage.code==="merat"?<>
   {assessments.length>0&&<div style={{display:"grid",gap:7,marginTop:9}}>{assessments.map(row=><div key={row.id} style={{padding:9,border:"1px solid #e8edf3",borderRadius:6,background:"#fff",fontSize:10,lineHeight:1.9}}><div><b>نتیجه:</b> {(row.result==="pending"?"در انتظار":row.result==="approved"?"تأیید":row.result==="rejected"?"رد":row.result==="needs_correction"?"نیازمند اصلاح":row.result)} <span style={{marginRight:12}}><b>سقف اعلامی:</b> {rial(row.reported_limit_rial)}</span></div>{row.external_reference&&<div>شماره پیگیری: {row.external_reference}</div>}{row.result_reason&&<div>توضیح: {row.result_reason}</div>}{row.evidence_reference&&<div>مرجع مدرک: {row.evidence_reference}</div>}</div>)}</div>}
   {canRecord&&stage.status==="in_progress"&&<form onSubmit={saveAssessment} style={{display:"grid",gap:9,marginTop:10}}>
    <div className="form-grid"><div className="form-row"><label>شماره پیگیری مرآت</label><input className="field" maxLength={120} value={externalReference} onChange={e=>setExternalReference(e.target.value)} /></div><div className="form-row"><label>نتیجه *</label><select className="field" required value={result} onChange={e=>setResult(e.target.value)}><option value="pending">در انتظار</option><option value="approved">تأیید</option><option value="rejected">رد</option><option value="needs_correction">نیازمند اصلاح</option></select></div><div className="form-row"><label>سقف اعلامی (ریال)</label><input className="field" type="number" min="0" step="1" value={reportedLimit} onChange={e=>setReportedLimit(e.target.value)} /></div><div className="form-row"><label>مرجع مدرک</label><input className="field" maxLength={500} value={evidenceReference} onChange={e=>setEvidenceReference(e.target.value)} /></div></div>
    <div className="form-row"><label>توضیح نتیجه</label><textarea className="field" rows={2} maxLength={2000} value={resultReason} onChange={e=>setResultReason(e.target.value)} /></div>
    <button className="btn primary" type="submit" disabled={saving||!applicant||!party}>{saving?"در حال ثبت…":assessments.length?"به‌روزرسانی نتیجه مرآت":"ثبت نتیجه مرآت"}</button>
   </form>}
   {canRecord&&stage.status!=="in_progress"&&<p style={{fontSize:10,color:"#8492a5",marginTop:8}}>برای ثبت نتیجه، ابتدا مرحلهٔ مرآت را شروع کنید.</p>}
   {!canRecord&&<p style={{fontSize:10,color:"#8492a5",marginTop:8}}>دسترسی ثبت نتیجه برای نقش فعلی فعال نیست.</p>}
  </>:<>
   {stage.status!=="in_progress"&&<p style={{fontSize:10,color:"#8492a5",marginTop:8}}>ثبت واریز فقط هنگامی فعال است که مرحلهٔ واریز در جریان باشد.</p>}
   {canRecord&&stage.status==="in_progress"&&<form onSubmit={recordDisbursement} style={{display:"flex",gap:8,alignItems:"end",flexWrap:"wrap",marginTop:10}}><div className="form-row" style={{flex:"1 1 220px"}}><label>مبلغ واقعی واریز (ریال) *</label><input className="field" required type="number" min="1" step="1" value={amountRial} onChange={e=>setAmountRial(e.target.value)} /></div><button className="btn primary" type="submit" disabled={saving||!amountRial}>{saving?"در حال ثبت…":"ثبت واریز"}</button></form>}
   {disbursements.length>0?<div style={{display:"grid",gap:8,marginTop:10}}>{disbursements.map(row=><article key={row.id} style={{padding:10,border:"1px solid #e8edf3",borderRadius:6,background:"#fff",fontSize:10,lineHeight:1.9}}><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><b>{row.disbursement_number||"واریز"}</b><b>{row.status==="confirmed"?"تأییدشده":row.status==="failed"?"ناموفق":"در انتظار تأیید"}</b></div><div>مبلغ: {rial(row.amount_rial)}</div><div>کارمزد ({Number(row.commission_rate_pct).toLocaleString("fa-IR")}٪): {rial(row.commission_amount_rial)}</div>{row.bank_reference&&<div>مرجع بانکی: {row.bank_reference}</div>}{row.evidence_reference&&<div>مرجع مدرک: {row.evidence_reference}</div>}{row.confirmed_at&&<div>زمان تأیید: {displayDateTime(row.confirmed_at)}</div>}
    {canConfirm&&row.status==="pending"&&<div style={{display:"grid",gap:7,marginTop:9,paddingTop:9,borderTop:"1px solid #edf1f6"}}><div className="form-grid"><div className="form-row"><label>مرجع بانکی *</label><input className="field" required value={bankReferences[row.id]||""} onChange={e=>setBankReferences(current=>({...current,[row.id]:e.target.value}))}/></div><div className="form-row"><label>مرجع مدرک *</label><input className="field" required value={confirmationEvidence[row.id]||""} onChange={e=>setConfirmationEvidence(current=>({...current,[row.id]:e.target.value}))}/></div></div><button type="button" className="btn primary" disabled={saving} onClick={()=>void confirmDisbursement(row)}>{saving?"در حال تأیید…":"تأیید واریز"}</button></div>}
   </article>)}</div>:<p className="empty" style={{marginTop:8}}>هنوز واریزی ثبت نشده است.</p>}
   <p style={{fontSize:9,color:"#8492a5",marginTop:8}}>کارمزد از پاسخ سرور نمایش داده می‌شود؛ مقدار آن در مرورگر محاسبه نمی‌شود.</p>
  </>}
  {error&&<p role="alert" className="notice" style={{marginTop:9}}>{error}</p>}
  {notice&&<p role="status" className="note" style={{marginTop:9}}>{notice}</p>}
 </div>;
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
  void getAllApiRows("/api/v1/guarantees/?application="+encodeURIComponent(selected.uuid), "درخواست‌های ضمانت").then(rows=>{
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
   const rows=await getAllApiRows("/api/v1/guarantees/"+encodeURIComponent(request.id)+"/events/", "تاریخچه درخواست ضمانت");
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

function ApplicationFollowUps({selected,authUser}:{selected:Application;authUser:ApiUser|null}){
 const [tasks,setTasks]=useState<TaskRow[]>([]);
 const [documents,setDocuments]=useState<ApplicationDocumentRow[]>([]);
 const [guarantees,setGuarantees]=useState<GuaranteeRequestRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState("");
 const [contextWarning,setContextWarning]=useState("");
 const [formOpen,setFormOpen]=useState(false);
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [priority,setPriority]=useState("normal");
 const [dueAt,setDueAt]=useState("");
 const [saving,setSaving]=useState(false);
 const [formError,setFormError]=useState("");
 const [formSuccess,setFormSuccess]=useState("");
 const [updatingId,setUpdatingId]=useState<string|null>(null);
 const [openHistoryId,setOpenHistoryId]=useState<string|null>(null);
 const [eventsByTask,setEventsByTask]=useState<Record<string,TaskEventRow[]>>({});
 const [eventErrors,setEventErrors]=useState<Record<string,string>>({});
 const [eventsLoadingId,setEventsLoadingId]=useState<string|null>(null);
 const [noteDrafts,setNoteDrafts]=useState<Record<string,string>>({});
 const [noteErrors,setNoteErrors]=useState<Record<string,string>>({});
 const [noteSuccess,setNoteSuccess]=useState<Record<string,string>>({});
 const [noteSavingId,setNoteSavingId]=useState<string|null>(null);
 const canWrite=["system_admin","intake","case_worker"].includes(authUser?.role||"");

 useEffect(()=>{
  let active=true;
  setLoading(true);setLoadError("");setContextWarning("");
  setTasks([]);setDocuments([]);setGuarantees([]);
  setOpenHistoryId(null);setEventsByTask({});setEventErrors({});
  void Promise.allSettled([
   getApplicationTasks(selected.uuid),
   getApplicationDocuments(selected.uuid),
   getApplicationGuarantees(selected.uuid),
  ]).then(results=>{
   if(!active)return;
   const [taskResult,documentResult,guaranteeResult]=results;
   if(taskResult.status==="fulfilled")setTasks(taskResult.value);
   else setLoadError((taskResult.reason as Error)?.message||"دریافت وظایف پرونده ناموفق بود.");
   const warnings:string[]=[];
   if(documentResult.status==="fulfilled")setDocuments(documentResult.value);
   else warnings.push("وضعیت اسناد دریافت نشد");
   if(guaranteeResult.status==="fulfilled")setGuarantees(guaranteeResult.value);
   else warnings.push("وضعیت ضمانت‌ها دریافت نشد");
   setContextWarning(warnings.length?warnings.join("؛ ")+". پیشنهادهای پیگیری ممکن است کامل نباشند.":"");
  }).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[selected.uuid]);

 const suggestions=useMemo(()=>{
  if(!canWrite)return [];
  const candidates:FollowUpSuggestion[]=[];
  if(selected.statusKey==="awaiting_documents"){
   candidates.push({key:"application-documents",title:"پیگیری تکمیل مدارک پرونده "+selected.id,description:"وضعیت پرونده در انتظار تکمیل مدارک است. با مشتری تماس بگیرید و مدارک باقیمانده را پیگیری کنید.",priority:"high"});
  }
  const supersededIds=new Set(documents.map(item=>item.replaces_document).filter((value):value is string=>Boolean(value)));
  for(const item of documents){
   if(item.status==="rejected"&&!supersededIds.has(item.id)){
    candidates.push({key:"document-replacement-"+item.id,title:"پیگیری دریافت نسخه اصلاحی "+item.document_number,description:"مدرک "+(documentTypeLabels[item.document_type]||item.document_type)+" نیازمند اصلاح اعلام شده است."+ (item.review_note?" دلیل اعلام‌شده: "+item.review_note:"")+" پس از دریافت نسخه جدید، سند را دوباره بررسی کنید.",priority:"high"});
   }else if(item.status==="pending_review"){
    candidates.push({key:"document-review-"+item.id,title:"پیگیری بررسی سند "+item.document_number,description:"سند "+(documentTypeLabels[item.document_type]||item.document_type)+" در انتظار بررسی است؛ نتیجه بررسی و اقدام بعدی را پیگیری کنید.",priority:"normal"});
   }
  }
  for(const item of guarantees){
   if(item.status==="registered"){
    candidates.push({key:"guarantee-review-"+item.id,title:"پیگیری شروع بررسی ضمانت "+item.request_number,description:"درخواست ضمانت ثبت شده و هنوز وارد مرحله بررسی نشده است.",priority:"normal"});
   }else if(item.status==="under_review"){
    candidates.push({key:"guarantee-decision-"+item.id,title:"پیگیری تصمیم اعتباری ضمانت "+item.request_number,description:"درخواست ضمانت در حال بررسی است؛ نتیجه تصمیم اعتباری را پیگیری کنید.",priority:"high"});
   }else if(item.status==="approved"){
    candidates.push({key:"guarantee-fulfilment-"+item.id,title:"پیگیری تکمیل ضمانت "+item.request_number,description:"درخواست ضمانت تأیید شده است؛ اجرای ضمانت و تکمیل مراحل پرونده را پیگیری کنید.",priority:"normal"});
   }
  }
  const existingTitles=new Set(tasks.map(item=>item.title.trim().toLocaleLowerCase()));
  return candidates.filter(item=>!existingTitles.has(item.title.trim().toLocaleLowerCase()));
 },[canWrite,selected.statusKey,selected.id,documents,guarantees,tasks]);

 function startTaskForm(suggestion?:FollowUpSuggestion){
  setTitle(suggestion?.title||"");
  setDescription(suggestion?.description||"");
  setPriority(suggestion?.priority||"normal");
  setDueAt("");
  setFormError("");setFormSuccess("");setFormOpen(true);
 }
 function taskActions(task:TaskRow):{status:string;label:string;variant:"primary"|"secondary"}[]{
  if(!canWrite)return [];
  if(task.status==="open")return [
   {status:"in_progress",label:"شروع",variant:"primary"},
   {status:"completed",label:"انجام شد",variant:"secondary"},
   {status:"cancelled",label:"لغو وظیفه",variant:"secondary"},
  ];
  if(task.status==="in_progress")return [
   {status:"open",label:"بازگردانی به باز",variant:"secondary"},
   {status:"completed",label:"انجام شد",variant:"primary"},
   {status:"cancelled",label:"لغو وظیفه",variant:"secondary"},
  ];
  return [];
 }

 async function submitTask(){
  const taskTitle=title.trim();
  if(!taskTitle){setFormError("عنوان وظیفه الزامی است.");return;}
  setSaving(true);setFormError("");setFormSuccess("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const created=await apiRequest("/api/v1/tasks/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({
    application:selected.uuid,
    title:taskTitle,
    description:description.trim(),
    priority,
    due_at:dueAt||null
   })}) as TaskRow;
   setTasks(current=>[created,...current.filter(item=>item.id!==created.id)]);
   setFormOpen(false);setTitle("");setDescription("");setPriority("normal");setDueAt("");
   setFormSuccess("وظیفه «"+created.task_number+"» برای این پرونده ثبت شد.");
  }catch(failure){
   setFormError((failure as Error).message||"ثبت وظیفه ناموفق بود.");
  }finally{setSaving(false);}
 }

 async function changeStatus(task:TaskRow,nextStatus:string){
  if(nextStatus==="cancelled"&&!window.confirm("آیا از لغو وظیفه «"+task.title+"» مطمئن هستید؟"))return;
  setUpdatingId(task.id);setLoadError("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const updated=await apiRequest("/api/v1/tasks/"+task.id+"/",{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({status:nextStatus})}) as TaskRow;
   setTasks(current=>current.map(item=>item.id===updated.id?updated:item));
   setEventsByTask(current=>{const next={...current};delete next[task.id];return next;});
  }catch(failure){
   setLoadError((failure as Error).message||"تغییر وضعیت وظیفه ناموفق بود.");
  }finally{setUpdatingId(null);}
 }

 async function toggleTaskHistory(task:TaskRow){
  if(openHistoryId===task.id){setOpenHistoryId(null);return;}
  setOpenHistoryId(task.id);
  if(eventsByTask[task.id])return;
  setEventsLoadingId(task.id);setEventErrors(current=>({...current,[task.id]:""}));
  try{
   const rows=await getAllApiRows("/api/v1/tasks/"+encodeURIComponent(task.id)+"/events/", "تاریخچه وظیفه");
   setEventsByTask(current=>({...current,[task.id]:rows as TaskEventRow[]}));
  }catch(failure){
   setEventErrors(current=>({...current,[task.id]:(failure as Error).message||"دریافت تاریخچه وظیفه ناموفق بود."}));
  }finally{setEventsLoadingId(null);}
 }

 async function addTaskNote(task:TaskRow){
  const note=(noteDrafts[task.id]||"").trim();
  if(!note){setNoteErrors(current=>({...current,[task.id]:"متن یادداشت را وارد کنید."}));return;}
  setNoteSavingId(task.id);setNoteErrors(current=>({...current,[task.id]:""}));setNoteSuccess(current=>({...current,[task.id]:""}));
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const created=await apiRequest("/api/v1/tasks/"+task.id+"/notes/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({note})}) as TaskEventRow;
   setEventsByTask(current=>({...current,[task.id]:[...(current[task.id]||[]),created]}));
   setNoteDrafts(current=>({...current,[task.id]:""}));
   setNoteSuccess(current=>({...current,[task.id]:"یادداشت وظیفه ثبت شد."}));
  }catch(failure){
   setNoteErrors(current=>({...current,[task.id]:(failure as Error).message||"ثبت یادداشت وظیفه ناموفق بود."}));
  }finally{setNoteSavingId(null);}
 }

 return <section className="card" style={{marginTop:16,padding:22}}>
  <div className="card-head"><div><h2>وظایف و پیگیری‌های پرونده</h2><p>وظایف موجود، پیگیری پیشنهادی مدارک و ضمانت‌ها و سابقه اقدام‌ها در همین پرونده.</p></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><span style={{fontSize:10,color:"#8492a5"}}>{tasks.length.toLocaleString("fa-IR")} وظیفه</span>{canWrite&&<button type="button" className="btn primary" onClick={()=>startTaskForm()}>＋ ثبت وظیفه</button>}</div></div>
  {canWrite&&suggestions.length>0&&<div style={{marginBottom:18,padding:14,border:"1px solid #e7edf5",borderRadius:9,background:"#fbfcfe"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:10}}><b style={{fontSize:11,color:"#35465b"}}>پیشنهادهای پیگیری</b><small style={{fontSize:9,color:"#8492a5"}}>با انتخاب هر مورد، فرم از پیش پر می‌شود؛ وظیفه فقط با تأیید شما ثبت خواهد شد.</small></div>
   <div style={{display:"grid",gap:8}}>{suggestions.map(suggestion=><div key={suggestion.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",padding:"10px 0",borderTop:"1px solid #edf1f6"}}>
    <div style={{minWidth:0,flex:1}}><b style={{display:"block",fontSize:10,color:"#35465b"}}>{suggestion.title}</b><small style={{display:"block",fontSize:9,color:"#8492a5",lineHeight:1.8,marginTop:4}}>{suggestion.description}</small></div><button type="button" className="btn secondary" onClick={()=>startTaskForm(suggestion)}>ساخت وظیفه</button>
   </div>)}</div>
  </div>}
  {formOpen&&canWrite&&<form onSubmit={event=>{event.preventDefault();void submitTask();}} style={{marginBottom:18,padding:16,border:"1px solid #edf1f6",borderRadius:9,background:"#fcfdff"}}>
   <div className="card-head"><div><h3 style={{fontSize:12,margin:0,color:"#35465b"}}>ثبت وظیفه برای پرونده {selected.id}</h3><p>وظیفه به کاربر جاری واگذار می‌شود؛ رویداد ایجاد در بک‌اند ثبت خواهد شد.</p></div><button type="button" className="btn secondary" disabled={saving} onClick={()=>setFormOpen(false)}>بستن</button></div>
   <div className="form-grid">
    <div className="form-row"><label htmlFor="case-task-title">عنوان وظیفه *</label><input id="case-task-title" className="field" required maxLength={200} value={title} onChange={event=>setTitle(event.target.value)}/></div>
    <div className="form-row"><label htmlFor="case-task-priority">اولویت</label><select id="case-task-priority" className="field" value={priority} onChange={event=>setPriority(event.target.value)}><option value="low">کم</option><option value="normal">عادی</option><option value="high">زیاد</option><option value="urgent">فوری</option></select></div>
    <div className="form-row"><label htmlFor="case-task-due">موعد انجام</label><input id="case-task-due" className="field" type="datetime-local" value={dueAt} onChange={event=>setDueAt(event.target.value)}/></div>
    <div className="form-row"><label htmlFor="case-task-description">شرح پیگیری</label><textarea id="case-task-description" className="field" rows={3} maxLength={5000} value={description} onChange={event=>setDescription(event.target.value)} style={{minHeight:80,resize:"vertical"}}/></div>
   </div>
   {formError&&<p role="alert" className="notice">{formError}</p>}
   <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}><button type="submit" className="btn primary" disabled={saving||!title.trim()}>{saving?"در حال ثبت…":"ثبت وظیفه"}</button><button type="button" className="btn secondary" disabled={saving} onClick={()=>setFormOpen(false)}>انصراف</button></div>
  </form>}
  {formSuccess&&<p role="status" className="note">{formSuccess}</p>}
  {contextWarning&&<p className="note">{contextWarning}</p>}
  {loading?<p className="empty">در حال دریافت وظایف مرتبط، اسناد و ضمانت‌ها…</p>:loadError?<p role="alert" className="empty">{loadError}</p>:tasks.length===0?<p className="empty">هنوز وظیفه‌ای برای این پرونده ثبت نشده است.</p>:<div style={{display:"grid",gap:12}}>
   {tasks.map(task=>{
    const actions=taskActions(task);
    const dueColor=task.is_overdue?"#b42318":task.due_at?"#66758a":"#91a0b2";
    const dueLabel=task.is_overdue?"عقب‌افتاده":task.due_at?"موعد: "+displayDateTime(task.due_at):"بدون موعد";
    return <article key={task.id} style={{border:"1px solid #e8edf3",borderRadius:9,padding:15}}>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
      <div style={{minWidth:0,flex:1}}><b style={{fontSize:11,color:"#35465b"}}>{task.title}</b><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:7}}><span style={{fontSize:9,color:"#8492a5"}}>{task.task_number}</span><span style={{fontSize:9,color:task.status==="completed"?"#24704f":task.status==="cancelled"?"#7c8999":"#315d95",background:task.status==="completed"?"#e8f7ef":task.status==="cancelled"?"#f0f2f5":"#eef4fc",padding:"4px 7px",borderRadius:5}}>{taskStatusLabels[task.status]||task.status}</span><span style={{fontSize:9,color:"#8492a5"}}>اولویت: {taskPriorityLabels[task.priority]||task.priority}</span><span style={{fontSize:9,color:dueColor}}>{dueLabel}</span></div></div>
      <button type="button" className="btn secondary" onClick={()=>void toggleTaskHistory(task)}>{openHistoryId===task.id?"بستن سابقه":"سابقه و یادداشت‌ها"}</button>
     </div>
     {task.description&&<p style={{fontSize:10,lineHeight:1.9,color:"#66758a",whiteSpace:"pre-wrap",margin:"10px 0 0"}}>{task.description}</p>}
     <small style={{display:"block",fontSize:9,color:"#91a0b2",marginTop:8}}>مسئول: {task.assigned_to_username||"—"} · ثبت‌کننده: {task.created_by_username||"—"}</small>
     {actions.length>0&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:12,paddingTop:12,borderTop:"1px solid #edf1f6"}}>{actions.map(action=><button key={action.status} type="button" className={"btn "+action.variant} disabled={updatingId===task.id} onClick={()=>void changeStatus(task,action.status)}>{updatingId===task.id?"در حال ثبت…":action.label}</button>)}</div>}
     {openHistoryId===task.id&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #edf1f6"}}>
      {eventsLoadingId===task.id&&<p className="empty">در حال دریافت سابقه…</p>}
      {eventErrors[task.id]&&<p role="alert" className="notice">{eventErrors[task.id]}</p>}
      {(eventsByTask[task.id]||[]).length>0&&<div style={{display:"grid",gap:8,marginBottom:12}}>{[...(eventsByTask[task.id]||[])].reverse().map(item=><div key={item.id} style={{padding:10,borderRadius:7,background:"#f8fafd"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><b style={{fontSize:10,color:"#35465b"}}>{taskEventLabels[item.event_type]||item.event_type}</b><small style={{fontSize:9,color:"#91a0b2"}}>{displayDateTime(item.created_at)}</small></div>{item.previous_status&&item.new_status&&<p style={{fontSize:9,color:"#66758a",margin:"6px 0"}}>{taskStatusLabels[item.previous_status]||item.previous_status} ← {taskStatusLabels[item.new_status]||item.new_status}</p>}{item.note&&<p style={{fontSize:10,lineHeight:1.8,color:"#526176",whiteSpace:"pre-wrap",margin:"6px 0"}}>{item.note}</p>}<small style={{fontSize:9,color:"#91a0b2"}}>ثبت توسط: {item.actor_username||"کاربر سامانه"}</small></div>)}</div>}
      {(eventsByTask[task.id]||[]).length===0&&!eventsLoadingId&&!eventErrors[task.id]&&<p style={{fontSize:10,color:"#8492a5"}}>هنوز رویدادی برای نمایش بارگذاری نشده یا سابقه‌ای وجود ندارد.</p>}
      {canWrite&&<form onSubmit={event=>{event.preventDefault();void addTaskNote(task);}} style={{padding:12,background:"#fcfdff",border:"1px solid #edf1f6",borderRadius:8}}>
       <label htmlFor={"task-note-"+task.id} style={{display:"block",fontSize:10,color:"#526176",marginBottom:6}}>یادداشت پیگیری</label><textarea id={"task-note-"+task.id} className="field" rows={2} maxLength={5000} value={noteDrafts[task.id]||""} onChange={event=>setNoteDrafts(current=>({...current,[task.id]:event.target.value}))} style={{minHeight:65,resize:"vertical"}}/>
       {noteErrors[task.id]&&<p role="alert" className="notice">{noteErrors[task.id]}</p>}
       {noteSuccess[task.id]&&<p role="status" className="note">{noteSuccess[task.id]}</p>}
       <button type="submit" className="btn secondary" disabled={noteSavingId===task.id||!(noteDrafts[task.id]||"").trim()} style={{marginTop:8}}>{noteSavingId===task.id?"در حال ثبت…":"ثبت یادداشت"}</button>
      </form>}
     </div>}
    </article>;
   })}
  </div>}
  {!canWrite&&<p className="note">این نقش امکان مشاهده وظایف پرونده را دارد؛ ایجاد یا تغییر وظیفه مطابق مجوزهای بک‌اند محدود شده است.</p>}
 </section>;
}

function ServiceReceiptsPage({authUser}:{authUser:ApiUser|null}){
 const [catalogue,setCatalogue]=useState<ServiceCatalogRow[]>([]);
 const [customers,setCustomers]=useState<CustomerRow[]>([]);
 const [receipts,setReceipts]=useState<ServiceReceiptRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState("");
 const [customerError,setCustomerError]=useState("");
 const [query,setQuery]=useState("");
 const [paymentFilter,setPaymentFilter]=useState("all");
 const [createOpen,setCreateOpen]=useState(false);
 const [customerId,setCustomerId]=useState("");
 const [serviceId,setServiceId]=useState("");
 const [discount,setDiscount]=useState("0");
 const [paid,setPaid]=useState("0");
 const [paymentMethod,setPaymentMethod]=useState("pos");
 const [receiptNote,setReceiptNote]=useState("");
 const [saving,setSaving]=useState(false);
 const [createError,setCreateError]=useState("");
 const [createSuccess,setCreateSuccess]=useState("");
 const [receiptAttempt,setReceiptAttempt]=useState<{fingerprint:string;key:string}|null>(null);
 const [adminCatalog,setAdminCatalog]=useState<ServiceCatalogRow[]>([]);
 const [adminCatalogLoading,setAdminCatalogLoading]=useState(false);
 const [adminCatalogError,setAdminCatalogError]=useState("");
 const [catalogQuery,setCatalogQuery]=useState("");
 const [catalogFormOpen,setCatalogFormOpen]=useState(false);
 const [catalogEditId,setCatalogEditId]=useState<string|null>(null);
 const [catalogName,setCatalogName]=useState("");
 const [catalogDescription,setCatalogDescription]=useState("");
 const [catalogPrice,setCatalogPrice]=useState("");
 const [catalogOnlineCost,setCatalogOnlineCost]=useState("0");
 const [catalogSaving,setCatalogSaving]=useState(false);
 const [catalogSaveError,setCatalogSaveError]=useState("");
 const [catalogSaveSuccess,setCatalogSaveSuccess]=useState("");
 const [catalogTogglingId,setCatalogTogglingId]=useState<string|null>(null);
 const canCreate=["system_admin","intake","case_worker","finance"].includes(authUser?.role||"");
 const isAdmin=authUser?.role==="system_admin";
 const isAdminCatalogBusy=catalogSaving||Boolean(catalogTogglingId);

 useEffect(()=>{
  let active=true;
  setLoading(true);setLoadError("");
  void Promise.all([getServiceCatalog(),getServiceReceipts()]).then(([items,rows])=>{
   if(active){setCatalogue(items);setReceipts(rows);}
  }).catch(failure=>{
   if(active)setLoadError((failure as Error).message||"دریافت فهرست خدمات و رسیدها ناموفق بود.");
  }).finally(()=>{if(active)setLoading(false);});
  if(isAdmin){
   setAdminCatalogLoading(true);setAdminCatalogError("");
   void getServiceCatalog(false).then(items=>{if(active)setAdminCatalog(items);}).catch(failure=>{
    if(active)setAdminCatalogError((failure as Error).message||"دریافت کاتالوگ خدمات ناموفق بود.");
   }).finally(()=>{if(active)setAdminCatalogLoading(false);});
  }else{setAdminCatalog([]);setAdminCatalogLoading(false);setAdminCatalogError("");}
  if(canCreate){
   setCustomerError("");
   void getCustomers().then(rows=>{if(active)setCustomers(rows);}).catch(failure=>{
    if(active)setCustomerError((failure as Error).message||"دریافت فهرست مشتریان ناموفق بود.");
   });
  }else{setCustomers([]);setCustomerError("");}
  return ()=>{active=false;};
 },[canCreate,isAdmin]);

 const selectedService=catalogue.find(item=>item.id===serviceId)||null;
 const priceValue=selectedService?parseIntegerMoney(selectedService.price):null;
 const discountValue=parseIntegerMoney(discount||"0");
 const paidValue=parseIntegerMoney(paid);
 const onlineCostValue=selectedService?parseIntegerMoney(selectedService.online_cost):null;
 const totalValue=priceValue!==null&&discountValue!==null?priceValue-discountValue:null;
 let financialError="";
 if(selectedService&&priceValue!==null&&discountValue!==null){
  if(discountValue>priceValue)financialError="تخفیف نمی‌تواند از تعرفه خدمت بیشتر باشد.";
  else if(totalValue!==null&&onlineCostValue!==null&&totalValue<onlineCostValue)financialError="مبلغ نهایی نمی‌تواند از هزینه پرداخت آنلاین کمتر باشد.";
  else if(totalValue!==null&&paidValue!==null&&paidValue>totalValue)financialError="مبلغ دریافتی نمی‌تواند از مبلغ نهایی خدمت بیشتر باشد.";
 }
 const commissionValue=totalValue!==null&&onlineCostValue!==null?totalValue-onlineCostValue:null;
 const dueValue=totalValue!==null&&paidValue!==null?totalValue-paidValue:null;
 const filteredReceipts=receipts.filter(row=>{
  const haystack=[row.receipt_number,row.customer_name,row.service_name,row.service_code,row.created_by_username].join(" ").toLocaleLowerCase();
  return haystack.includes(query.trim().toLocaleLowerCase())&&(paymentFilter==="all"||row.payment_method===paymentFilter);
 });

 function resetCatalogForm(){
  setCatalogEditId(null);setCatalogName("");setCatalogDescription("");setCatalogPrice("");setCatalogOnlineCost("0");setCatalogFormOpen(false);setCatalogSaveError("");
 }
 function beginCatalogEdit(item:ServiceCatalogRow){
  setCatalogEditId(item.id);setCatalogName(item.name);setCatalogDescription(item.description||"");setCatalogPrice(String(item.price));setCatalogOnlineCost(String(item.online_cost));setCatalogSaveError("");setCatalogSaveSuccess("");setCatalogFormOpen(true);
 }
 async function saveCatalogItem(){
  const name=catalogName.trim();
  const price=parseIntegerMoney(catalogPrice);
  const onlineCost=parseIntegerMoney(catalogOnlineCost||"0");
  if(!name){setCatalogSaveError("نام خدمت الزامی است.");return;}
  if(name.length>200){setCatalogSaveError("نام خدمت نباید بیشتر از ۲۰۰ نویسه باشد.");return;}
  if(catalogDescription.trim().length>1000){setCatalogSaveError("توضیحات خدمت نباید بیشتر از ۱۰۰۰ نویسه باشد.");return;}
  if(price===null||onlineCost===null){setCatalogSaveError("تعرفه و هزینه آنلاین باید عدد صحیح نامنفی باشند.");return;}
  if(onlineCost>price){setCatalogSaveError("هزینه آنلاین نمی‌تواند از تعرفه خدمت بیشتر باشد.");return;}
  setCatalogSaving(true);setCatalogSaveError("");setCatalogSaveSuccess("");
  const editingId=catalogEditId;
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const payload={name,description:catalogDescription.trim(),price:price.toString(),online_cost:onlineCost.toString()};
   const path=editingId?"/api/v1/services/catalog/"+editingId+"/":"/api/v1/services/catalog/";
   const saved=await apiRequest(path,{method:editingId?"PATCH":"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify(payload)}) as ServiceCatalogRow;
   setAdminCatalog(current=>editingId?current.map(item=>item.id===saved.id?saved:item):[saved,...current]);
   setCatalogue(current=>saved.active?[saved,...current.filter(item=>item.id!==saved.id)]:current.filter(item=>item.id!==saved.id));
   setCatalogSaveSuccess((editingId?"اطلاعات خدمت «":"خدمت «")+saved.name+(editingId?"» به‌روزرسانی شد.":"» ثبت شد و در فهرست خدمات فعال قرار گرفت."));
   resetCatalogForm();
  }catch(failure){
   setCatalogSaveError((failure as Error).message||"ذخیره کاتالوگ خدمت ناموفق بود.");
  }finally{setCatalogSaving(false);}
 }
 async function toggleCatalogActive(item:ServiceCatalogRow){
  if(item.active&&!window.confirm("آیا از غیرفعال کردن خدمت «"+item.name+"» مطمئن هستید؟ رسیدهای قبلی حفظ می‌شوند."))return;
  setCatalogTogglingId(item.id);setAdminCatalogError("");setCatalogSaveSuccess("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const updated=await apiRequest("/api/v1/services/catalog/"+item.id+"/",{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||"")},body:JSON.stringify({active:!item.active})}) as ServiceCatalogRow;
   setAdminCatalog(current=>current.map(row=>row.id===updated.id?updated:row));
   setCatalogue(current=>updated.active?[updated,...current.filter(row=>row.id!==updated.id)]:current.filter(row=>row.id!==updated.id));
   if(!updated.active&&serviceId===updated.id)setServiceId("");
   setCatalogSaveSuccess(updated.active?"خدمت دوباره فعال شد.":"خدمت غیرفعال شد؛ رسیدهای قبلی دست‌نخورده باقی ماندند.");
  }catch(failure){
   setAdminCatalogError((failure as Error).message||"تغییر وضعیت خدمت ناموفق بود.");
  }finally{setCatalogTogglingId(null);}
 }
 const filteredAdminCatalog=adminCatalog.filter(item=>[item.name,item.code,item.description].join(" ").toLocaleLowerCase().includes(catalogQuery.trim().toLocaleLowerCase()));
 async function createReceipt(){
  if(!authUser)return;
  if(!customerId||!serviceId){setCreateError("مشتری و خدمت را انتخاب کنید.");return;}
  if(financialError){setCreateError(financialError);return;}
  if(paidValue===null){setCreateError("مبلغ دریافتی را به‌صورت عدد صحیح وارد کنید.");return;}
  const payload={
   customer:customerId,
   service:serviceId,
   performed_by:String(authUser.id),
   discount:discount||"0",
   paid:paid||"0",
   payment_method:paymentMethod,
   note:receiptNote.trim()
  };
  const fingerprint=JSON.stringify(payload);
  const key=receiptAttempt?.fingerprint===fingerprint?receiptAttempt.key:createReceiptIdempotencyKey();
  setReceiptAttempt({fingerprint,key});
  setSaving(true);setCreateError("");setCreateSuccess("");
  try{
   const csrf=await apiRequest("/api/v1/auth/csrf/");
   const created=await apiRequest("/api/v1/services/receipts/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":String(csrf.csrfToken||""),"Idempotency-Key":key},body:JSON.stringify(payload)}) as ServiceReceiptRow;
   setReceipts(current=>[created,...current.filter(item=>item.id!==created.id)]);
   setCreateOpen(false);
   setCustomerId("");setServiceId("");setDiscount("0");setPaid("0");setPaymentMethod("pos");setReceiptNote("");
   setReceiptAttempt(null);
   setCreateSuccess("رسید با شماره «"+created.receipt_number+"» ثبت شد. مبلغ نهایی: "+formatMoney(created.total)+" تومان.");
  }catch(failure){
   setCreateError((failure as Error).message||"ثبت رسید خدمات ناموفق بود. تلاش دوباره با همان اطلاعات از کلید جلوگیری از ثبت تکراری استفاده می‌کند.");
  }finally{setSaving(false);}
 }

 return <section className="card list-card">
  <div className="card-head list-head"><div><h2>رسیدهای خدمات</h2><p>اطلاعات از سرویس واقعی دریافت می‌شود؛ رسید صادرشده immutable است و حذف یا ویرایش نمی‌شود.</p></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><span style={{fontSize:10,color:"#8492a5"}}>{receipts.length.toLocaleString("fa-IR")} رسید در محدوده دسترسی</span>{canCreate&&<button type="button" className="btn primary" onClick={()=>{setCreateOpen(current=>!current);setCreateError("");setCreateSuccess("");}}>＋ ثبت رسید</button>}</div></div>
  {isAdmin&&<section style={{margin:"0 20px 18px",padding:18,border:"1px solid #e8edf3",borderRadius:9,background:"#fff"}}>
   <div className="card-head"><div><h2>مدیریت کاتالوگ خدمات</h2><p>تعرفه و هزینه آنلاین را تعریف یا اصلاح کنید؛ خدمات غیرفعال حذف نمی‌شوند و رسیدهای پیشین محفوظ می‌مانند.</p></div><button type="button" className="btn primary" onClick={()=>{if(catalogFormOpen&&!catalogEditId){resetCatalogForm();return;}resetCatalogForm();setCatalogFormOpen(true);setCatalogSaveSuccess("");}}>＋ افزودن خدمت</button></div>
   {catalogFormOpen&&<form onSubmit={event=>{event.preventDefault();void saveCatalogItem();}} style={{padding:16,border:"1px solid #edf1f6",borderRadius:9,background:"#fcfdff",marginBottom:16}}>
    <div className="card-head"><div><h3 style={{fontSize:12,margin:0,color:"#35465b"}}>{catalogEditId?"ویرایش مشخصات خدمت":"تعریف خدمت جدید"}</h3><p>کد خدمت را سامانه به‌صورت خودکار تولید می‌کند.</p></div><button type="button" className="btn secondary" disabled={catalogSaving} onClick={resetCatalogForm}>انصراف</button></div>
    <div className="form-grid">
     <div className="form-row"><label htmlFor="catalog-service-name">نام خدمت *</label><input id="catalog-service-name" className="field" required maxLength={200} value={catalogName} onChange={event=>setCatalogName(event.target.value)}/></div>
     <div className="form-row"><label htmlFor="catalog-service-price">تعرفه مشتری (تومان) *</label><input id="catalog-service-price" className="field" type="number" min="0" step="1" required value={catalogPrice} onChange={event=>setCatalogPrice(event.target.value)}/></div>
     <div className="form-row"><label htmlFor="catalog-online-cost">هزینه آنلاین (تومان) *</label><input id="catalog-online-cost" className="field" type="number" min="0" step="1" required value={catalogOnlineCost} onChange={event=>setCatalogOnlineCost(event.target.value)}/></div>
     <div className="form-row"><label htmlFor="catalog-service-description">توضیحات</label><textarea id="catalog-service-description" className="field" rows={3} maxLength={1000} value={catalogDescription} onChange={event=>setCatalogDescription(event.target.value)} style={{minHeight:80,resize:"vertical"}}/></div>
    </div>
    {catalogSaveError&&<p role="alert" className="notice">{catalogSaveError}</p>}
    <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}><button className="btn primary" type="submit" disabled={catalogSaving}>{catalogSaving?"در حال ذخیره…":catalogEditId?"ذخیره تغییرات":"ثبت خدمت"}</button><small style={{alignSelf:"center",fontSize:9,color:"#8492a5"}}>هزینه آنلاین بخشی از مبلغ نهایی است؛ اعتبارسنجی نهایی سمت سرور انجام می‌شود.</small></div>
   </form>}
   {adminCatalogError&&<p role="alert" className="notice">{adminCatalogError}</p>}
   {catalogSaveSuccess&&<p role="status" className="note">{catalogSaveSuccess}</p>}
   <div className="filters" style={{padding:"10px 0",borderTop:0,background:"transparent"}}><label className="search-field">⌕ <input placeholder="جستجو در نام یا کد خدمت..." value={catalogQuery} onChange={event=>setCatalogQuery(event.target.value)}/></label><span style={{fontSize:9,color:"#8492a5"}}>{filteredAdminCatalog.length.toLocaleString("fa-IR")} خدمت</span></div>
   {adminCatalogLoading?<p className="empty">در حال دریافت کاتالوگ خدمات…</p>:filteredAdminCatalog.length===0?<p className="empty">{adminCatalog.length?"خدمتی مطابق جستجو پیدا نشد.":"هنوز خدمتی ثبت نشده است؛ از «افزودن خدمت» استفاده کنید."}</p>:<div style={{display:"grid",gap:10}}>{filteredAdminCatalog.map(item=>{
    const price=parseIntegerMoney(item.price);const onlineCost=parseIntegerMoney(item.online_cost);const companyCommission=price!==null&&onlineCost!==null&&price>=onlineCost?price-onlineCost:null;
    return <article key={item.id} style={{padding:14,border:"1px solid #edf1f6",borderRadius:8,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
    <div style={{minWidth:0,flex:1}}><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><b style={{fontSize:11,color:"#35465b"}}>{item.name}</b><span style={{fontSize:9,color:item.active?"#24704f":"#7c8999",background:item.active?"#e8f7ef":"#f0f2f5",padding:"4px 7px",borderRadius:5}}>{item.active?"فعال":"غیرفعال"}</span><small style={{fontSize:9,color:"#91a0b2"}}>{item.code}</small></div>
     <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:7,fontSize:10,color:"#66758a"}}><span>تعرفه: {formatMoney(item.price)} تومان</span><span>هزینه آنلاین: {formatMoney(item.online_cost)} تومان</span><span>سهم شرکت: {companyCommission!==null?formatMoney(companyCommission.toString()):"—"} تومان</span></div>
     {item.description&&<p style={{fontSize:10,lineHeight:1.8,color:"#7c8999",margin:"7px 0 0",whiteSpace:"pre-wrap"}}>{item.description}</p>}
    </div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><button type="button" className="btn secondary" disabled={isAdminCatalogBusy||catalogTogglingId===item.id} onClick={()=>beginCatalogEdit(item)}>ویرایش</button><button type="button" className="btn secondary" disabled={isAdminCatalogBusy||catalogTogglingId===item.id} onClick={()=>void toggleCatalogActive(item)}>{catalogTogglingId===item.id?"در حال تغییر…":item.active?"غیرفعال‌سازی":"فعال‌سازی"}</button></div>
   </article>})}</div>}
  </section>}
  {createOpen&&canCreate&&<section style={{margin:"0 20px 18px",padding:18,border:"1px solid #edf1f6",borderRadius:9,background:"#fcfdff"}}>
   <div className="card-head"><div><h2>ثبت رسید خدمات</h2><p>مبالغ قطعی و سهم شرکت در سرور محاسبه می‌شود.</p></div><button type="button" className="btn secondary" disabled={saving} onClick={()=>setCreateOpen(false)}>بستن</button></div>
   <form onSubmit={event=>{event.preventDefault();void createReceipt();}}>
    <div className="form-grid">
     <div className="form-row"><label htmlFor="receipt-customer">مشتری *</label><select id="receipt-customer" className="field" required value={customerId} onChange={event=>setCustomerId(event.target.value)}><option value="">انتخاب مشتری</option>{customers.filter(customer=>customer.status==="active").map(customer=><option key={customer.id} value={customer.id}>{customer.customer_number+" — "+(customer.customer_type==="organization"?customer.organization_name:[customer.first_name,customer.last_name].filter(Boolean).join(" ")||"مشتری")}</option>)}</select>{customerError&&<small role="alert" style={{color:"#b42318"}}>{customerError}</small>}</div>
     <div className="form-row"><label htmlFor="receipt-service">خدمت *</label><select id="receipt-service" className="field" required value={serviceId} onChange={event=>setServiceId(event.target.value)}><option value="">انتخاب خدمت فعال</option>{catalogue.filter(item=>item.active).map(item=><option key={item.id} value={item.id}>{item.name+" — "+formatMoney(item.price)+" تومان"}</option>)}</select>{!catalogue.length&&!loading&&<small style={{color:"#a66b1f"}}>خدمت فعالی در کاتالوگ ثبت نشده است.</small>}</div>
     <div className="form-row"><label htmlFor="receipt-discount">تخفیف (تومان)</label><input id="receipt-discount" className="field" type="number" min="0" step="1" required value={discount} onChange={event=>setDiscount(event.target.value)}/></div>
     <div className="form-row"><label htmlFor="receipt-paid">مبلغ دریافتی (تومان) *</label><input id="receipt-paid" className="field" type="number" min="0" step="1" required value={paid} onChange={event=>setPaid(event.target.value)}/></div>
     <div className="form-row"><label htmlFor="receipt-method">روش پرداخت *</label><select id="receipt-method" className="field" required value={paymentMethod} onChange={event=>setPaymentMethod(event.target.value)}><option value="pos">کارت‌خوان</option><option value="cash">نقدی</option><option value="bank_transfer">واریز بانکی</option><option value="other">سایر</option></select></div>
     <div className="form-row"><label htmlFor="receipt-note">توضیح (اختیاری)</label><input id="receipt-note" className="field" maxLength={500} value={receiptNote} onChange={event=>setReceiptNote(event.target.value)} /></div>
    </div>
    {selectedService&&<div className="note" style={{marginTop:14}}>
     <b>پیش‌نمایش محاسبه</b>
     <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:8,fontSize:10,color:"#526176"}}><span>تعرفه: {formatMoney(selectedService.price)} تومان</span><span>هزینه آنلاین: {formatMoney(selectedService.online_cost)} تومان</span><span>مبلغ نهایی: {totalValue!==null&&totalValue>=0n?formatMoney(totalValue.toString()):"—"} تومان</span><span>سهم شرکت: {commissionValue!==null&&commissionValue>=0n?formatMoney(commissionValue.toString()):"—"} تومان</span><span>مانده: {dueValue!==null&&dueValue>=0n?formatMoney(dueValue.toString()):"—"} تومان</span></div>
    </div>}
    {financialError&&<p role="alert" className="notice">{financialError}</p>}
    {createError&&<p role="alert" className="notice">{createError}</p>}
    <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}><button type="submit" className="btn primary" disabled={saving||!customerId||!serviceId||!catalogue.length||Boolean(financialError)||paidValue===null}>{saving?"در حال ثبت…":"ثبت نهایی رسید"}</button><button type="button" className="btn secondary" disabled={saving} onClick={()=>setCreateOpen(false)}>انصراف</button><small style={{alignSelf:"center",fontSize:9,color:"#8492a5"}}>ثبت‌کننده و ارائه‌دهنده خدمت: {[authUser?.first_name,authUser?.last_name].filter(Boolean).join(" ")||authUser?.username}</small></div>
   </form>
  </section>}
  {createSuccess&&<p role="status" className="note" style={{margin:"0 20px 16px"}}>{createSuccess}</p>}
  <div className="filters"><label className="search-field">⌕ <input placeholder="جستجو بر اساس شماره رسید، مشتری، خدمت..." value={query} onChange={event=>setQuery(event.target.value)}/></label><select aria-label="فیلتر روش پرداخت" value={paymentFilter} onChange={event=>setPaymentFilter(event.target.value)}><option value="all">همه روش‌های پرداخت</option><option value="pos">کارت‌خوان</option><option value="cash">نقدی</option><option value="bank_transfer">واریز بانکی</option><option value="other">سایر</option></select></div>
  {loading?<p className="empty">در حال دریافت رسیدها…</p>:loadError?<p className="empty" role="alert">{loadError}</p>:<div className="table-wrap"><table><thead><tr><th>شماره رسید</th><th>مشتری</th><th>خدمت</th><th>مبلغ نهایی</th><th>دریافتی</th><th>مانده</th><th>روش پرداخت</th><th>تاریخ ثبت</th><th>ثبت‌کننده</th></tr></thead><tbody>{filteredReceipts.map(receipt=><tr key={receipt.id}><td><b className="case-id">{receipt.receipt_number}</b></td><td>{receipt.customer_name}</td><td><b>{receipt.service_name}</b><small style={{display:"block",fontSize:9,color:"#91a0b2",marginTop:4}}>{receipt.service_code}</small></td><td className="amount">{formatMoney(receipt.total)} <small>تومان</small></td><td>{formatMoney(receipt.paid)} تومان</td><td>{formatMoney(receipt.amount_due)} تومان</td><td>{paymentMethodLabels[receipt.payment_method]||receipt.payment_method}</td><td>{displayDateTime(receipt.created_at)}</td><td>{receipt.created_by_username||"—"}</td></tr>)}{!filteredReceipts.length&&<tr><td colSpan={9} className="empty">{receipts.length?"رسیدی مطابق فیلترها پیدا نشد.":"رسیدی برای نمایش وجود ندارد."}</td></tr>}</tbody></table></div>}
  {!canCreate&&<p className="note" style={{margin:16}}>دسترسی این نقش فقط برای مشاهده رسیدهای موجود است؛ تغییر یا حذف رسید صادرشده مجاز نیست.</p>}
 </section>;
}


function SettingsPage({authUser,apiState,onPasswordChanged}:{authUser:ApiUser|null;apiState:"connecting"|"connected"|"error";onPasswordChanged:()=>void}){
 const [tab,setTab]=useState<"account"|"company"|"employees"|"security"|"connection"|"management">("account");
 const [checking,setChecking]=useState(false);
 const [connectionResult,setConnectionResult]=useState<{ok:boolean;message:string}|null>(null);
 const tabs=[
  {key:"account" as const,label:"حساب کاربری",icon:"♙"},
  {key:"company" as const,label:"مشخصات شرکت",icon:"▤"},
  {key:"employees" as const,label:"کارمندان",icon:"♧"},
  {key:"security" as const,label:"امنیت و گذرواژه",icon:"▣"},
  {key:"connection" as const,label:"اتصال بک‌اند",icon:"⇄"},
  {key:"management" as const,label:"مدیریت و دسترسی",icon:"⚙"},
 ];
 async function checkConnection(){
  setChecking(true);setConnectionResult(null);
  try{
   await apiRequest("/api/v1/auth/me/");
   setConnectionResult({ok:true,message:"ارتباط با API برقرار است و نشست کاربری معتبر است."});
  }catch(error){
   const status=(error as ApiError).status;
   setConnectionResult(status===401||status===403
    ?{ok:false,message:"سرویس پاسخ می‌دهد، اما نشست یا مجوز این درخواست معتبر نیست. دوباره وارد سامانه شوید."}
    :{ok:false,message:(error as Error).message||"بررسی اتصال ناموفق بود."});
  }finally{setChecking(false);}
 }
 return <section className="card settings-page">
  <div className="section-head"><div><h2>تنظیمات سامانه</h2><p className="muted">حساب کاربری، امنیت و وضعیت اتصال سامانه را مدیریت کنید.</p></div></div>
  <div className="settings-tabs" role="tablist" aria-label="بخش‌های تنظیمات">
   {tabs.map(item=><button key={item.key} type="button" role="tab" aria-selected={tab===item.key} className={"settings-tab "+(tab===item.key?"active":"")} onClick={()=>setTab(item.key)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
  </div>
  {tab==="account"&&<section className="settings-panel" role="tabpanel">
   <h3>اطلاعات حساب کاربری</h3>
   <p className="muted">اطلاعات حساب فعال شما از سرویس احراز هویت دریافت شده است.</p>
   <div className="settings-info-grid">
    <div className="settings-info-item"><span>نام نمایشی</span><strong>{[authUser?.first_name,authUser?.last_name].filter(Boolean).join(" ")||"—"}</strong></div>
    <div className="settings-info-item"><span>نام کاربری</span><strong dir="ltr">{authUser?.username||"—"}</strong></div>
    <div className="settings-info-item"><span>نقش کاربری</span><strong>{authUser?.role_label||"تعریف‌نشده"}</strong></div>
    <div className="settings-info-item"><span>وضعیت حساب</span><strong className="settings-status">نشست فعال</strong></div>
   </div>
   <p className="note">تغییر نام کاربری، نقش و وضعیت فعال‌بودن حساب باید از مسیر مدیریت مجاز و سمت سرور انجام شود.</p>
  </section>}
  {tab==="company"&&<section className="settings-panel" role="tabpanel">
   <h3>مشخصات شرکت</h3>
   <p className="muted">اطلاعات هویتی و تماس شرکت در این بخش نگهداری می‌شود.</p>
   <div className="settings-feature-list">
    <div><strong>اطلاعات ثبتی</strong><span>نام رسمی شرکت، شناسه ملی و شماره ثبت</span><em>نیازمند اتصال به تنظیمات سازمان در بک‌اند</em></div>
    <div><strong>اطلاعات تماس</strong><span>نشانی، تلفن، ایمیل و وب‌سایت شرکت</span><em>نیازمند اتصال به تنظیمات سازمان در بک‌اند</em></div>
    <div><strong>اطلاعات مالی</strong><span>اطلاعات بانکی و مشخصات موردنیاز اسناد و گزارش‌ها</span><em>نیازمند تعریف فیلدها و سطح دسترسی در بک‌اند</em></div>
   </div>
   <p className="note">بخش «مشخصات شرکت» در تنظیمات بازگردانده شده است. در نسخه فعلی API خواندن و ذخیره این اطلاعات در دسترس نیست؛ بنابراین برای جلوگیری از نمایش فرم غیرواقعی، ویرایش تا پیاده‌سازی ذخیره‌سازی امن فعال نشده است.</p>
  </section>}
  {tab==="employees"&&<section className="settings-panel" role="tabpanel">
   <h3>کارمندان</h3>
   <p className="muted">مدیریت حساب‌های کارکنان سامانه، نقش‌ها و وضعیت دسترسی آن‌ها.</p>
   <div className="settings-feature-list">
    <div><strong>فهرست کارمندان</strong><span>مشاهده نام، نام کاربری، نقش و وضعیت حساب</span><em>نیازمند API فهرست کاربران</em></div>
    <div><strong>افزودن و ویرایش کارمند</strong><span>ایجاد حساب و تغییر اطلاعات یا نقش با کنترل دسترسی</span><em>نیازمند API مدیریتی امن</em></div>
    <div><strong>وضعیت دسترسی</strong><span>فعال‌سازی، غیرفعال‌سازی و بازبینی دسترسی‌ها</span><em>نیازمند کنترل سمت سرور و ثبت رویداد</em></div>
   </div>
   <p className="note">بخش «کارمندان» در تنظیمات بازگردانده شده است. هنوز API مدیریتی برای فهرست و تغییر حساب‌ها در این نسخه وجود ندارد؛ پس عملیات ساختگی یا تغییر محلی که روی سرور ذخیره نشود ارائه نمی‌شود.</p>
  </section>}
  {tab==="security"&&<section className="settings-panel" role="tabpanel">
   <h3>امنیت و گذرواژه</h3>
   <p className="muted">برای حفظ امنیت حساب، گذرواژه فعلی را وارد و یک گذرواژه جدید تعیین کنید.</p>
   <PasswordChangeForm required={false} onSuccess={onPasswordChanged}/>
  </section>}
  {tab==="connection"&&<section className="settings-panel" role="tabpanel">
   <h3>وضعیت اتصال بک‌اند</h3>
   <div className="settings-connection-row"><span className={"settings-connection-dot "+(apiState==="connected"?"ok":apiState==="error"?"error":"pending")}></span><div><strong>{apiState==="connected"?"اتصال برقرار":apiState==="error"?"خطا در اتصال":"در حال بررسی"}</strong><p className="muted">مسیر ارتباطی: API هم‌مبدأ سامانه امید</p></div></div>
   <p className="note">آزمون زیر هم دسترسی API و هم اعتبار نشست جاری را بررسی می‌کند؛ خطای مجوز لزوماً به معنی خاموش‌بودن سرویس نیست.</p>
   {connectionResult&&<p role="status" className={connectionResult.ok?"note":"notice"}>{connectionResult.message}</p>}
   <button type="button" className="btn primary" disabled={checking} onClick={checkConnection}>{checking?"در حال بررسی…":"آزمون اتصال"}</button>
  </section>}
  {tab==="management"&&<section className="settings-panel" role="tabpanel">
   <h3>مدیریت کاربران و دسترسی‌ها</h3>
   <p>مدیریت کاربران، نقش‌ها و مجوزها باید با کنترل دسترسی سمت سرور پیاده‌سازی شود. این بخش در نسخه فعلی هنوز ابزار اجرایی مدیریت کاربران ندارد.</p>
   <div className="settings-feature-list">
    <div><strong>کاربران</strong><span>ایجاد، غیرفعال‌سازی و مشاهده حساب‌ها</span><em>در انتظار پیاده‌سازی</em></div>
    <div><strong>نقش‌ها و مجوزها</strong><span>تخصیص نقش و کنترل دسترسی بر اساس مسئولیت</span><em>در انتظار پیاده‌سازی</em></div>
    <div><strong>سوابق امنیتی</strong><span>ثبت رویدادهای ورود و تغییرات مدیریتی</span><em>در انتظار پیاده‌سازی</em></div>
   </div>
   <p className="note">این موارد صرفاً وضعیت قابلیت‌ها را نشان می‌دهند و دکمه یا عملیات نمایشیِ بدون اتصال ایجاد نمی‌کنند.</p>
  </section>}
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
