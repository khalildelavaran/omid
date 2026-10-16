export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/favicon.ico") return new Response(null, { status: 204 });

    const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#12243a">
<meta name="description" content="سامانه مدیریت مشتریان و پرونده‌های تسهیلات امید">
<title>سامانه امید</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
.profile-section{border-top:1px solid #edf1f6;padding-top:19px;margin-top:22px}.profile-section>h2,.profile-section-head h2{margin:0 0 15px}.profile-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:13px}.profile-repeat-list{display:grid;gap:12px}.profile-repeat-row{display:grid;grid-template-columns:1fr 1.5fr .9fr auto;align-items:end;gap:10px;padding:13px;background:#f8fafc;border:1px solid #e8edf4;border-radius:12px}.profile-repeat-row.phone-row{grid-template-columns:1fr 1.5fr auto}.profile-doc-list{display:grid;gap:12px}.profile-doc-row{display:grid;grid-template-columns:.8fr 1fr 1.3fr;align-items:end;gap:10px;padding:14px;background:#f8fafc;border:1px solid #e8edf4;border-radius:12px}.profile-doc-row .profile-doc-preview{grid-column:1/-1;min-height:20px}.profile-doc-preview img{max-width:180px;max-height:140px;object-fit:contain;border:1px solid #dce5ed;border-radius:8px;background:white}.profile-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.profile-info-card{border:1px solid #e8edf4;border-radius:10px;padding:13px;background:#fbfcfe;min-width:0}.profile-info-card p{margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}.profile-info-card small{color:#8492a6;font-size:10px}.profile-document-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.profile-document-card{border:1px solid #e8edf4;border-radius:12px;padding:12px;min-width:0;overflow:hidden}.profile-document-preview{height:150px;display:grid;place-items:center;background:#f8fafc;border-radius:8px;margin-bottom:10px;overflow:hidden}.profile-document-preview img{width:100%;height:100%;object-fit:contain}.profile-document-card p{margin:6px 0}.check-line{display:flex;align-items:center;gap:9px;min-height:42px}.check-line input{accent-color:#168d7d;width:16px;height:16px}
:root{font-family:Vazirmatn,Tahoma,sans-serif;color:#192b45;background:#f4f7fb;font-synthesis:none;text-rendering:optimizeLegibility}
*{box-sizing:border-box}body{margin:0;min-height:100vh}button,input,select,textarea{font:inherit}button,a{ -webkit-tap-highlight-color:transparent}
.app{min-height:100vh;display:flex}aside{width:245px;background:#12243a;color:#d3deec;padding:25px 16px;flex-shrink:0;display:flex;flex-direction:column;min-height:100vh}
.brand{font-size:25px;font-weight:800;color:#fff;padding:0 12px 28px;display:flex;align-items:center;gap:10px}.brand-mark{width:35px;height:35px;display:grid;place-items:center;border-radius:11px;background:#52d6c4;color:#12243a;font-size:20px}.brand span{color:#52d6c4}
.menu{display:grid;gap:6px}.menu a{padding:12px 14px;border-radius:10px;color:#c6d2e2;text-decoration:none;font-size:13px;transition:background .15s}.menu a.active,.menu a:hover{background:#203d56;color:#fff}.menu a.active{border-right:3px solid #52d6c4}
.side-foot{margin-top:auto;padding:22px 12px 5px;font-size:11px;color:#8ea1b8;line-height:2}
main{flex:1;min-width:0;padding:28px clamp(15px,3vw,40px);max-width:1750px;margin-inline:auto;width:100%}
header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:25px;flex-wrap:wrap}h1{font-size:24px;margin:0 0 6px;font-weight:800;letter-spacing:-.4px}.sub{color:#8492a6;font-size:12px}.top{display:flex;align-items:center;gap:10px}.search{border:1px solid #e1e8f0;background:#fff;padding:11px 14px;border-radius:11px;width:min(280px,60vw);font-size:12px;outline:none}.search:focus,input:focus,select:focus,textarea:focus{border-color:#52bfae;box-shadow:0 0 0 3px #52d6c422;outline:none}.icon-btn{border:1px solid #e1e8f0;background:#fff;border-radius:11px;width:41px;height:41px;cursor:pointer;color:#60728a}.avatar{background:#d9f5ef;color:#167d70;border-radius:50%;width:41px;height:41px;display:grid;place-items:center;font-weight:700;font-size:15px}
.page-meta{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}.crumb{font-size:11px;color:#94a0b0}.actions{display:flex;gap:8px;flex-wrap:wrap}.btn{border:1px solid #dfe7ef;background:#fff;color:#52657c;border-radius:9px;padding:9px 13px;font-size:11px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px}.btn:hover{background:#f8fbfd}.btn.primary{background:#168d7d;color:#fff;border-color:#168d7d}.btn.primary:hover{background:#117969}.btn.danger{color:#b64d4d}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.card{background:#fff;border:1px solid #e8edf4;border-radius:15px;padding:19px;box-shadow:0 4px 15px #172d4605;min-width:0}.k-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.k-label{color:#75849a;font-size:12px}.k-icon{width:37px;height:37px;border-radius:12px;display:grid;place-items:center;background:#e8f8f5;color:#168b7a;font-size:17px}.k-icon.blue{background:#edf1ff;color:#6578d6}.k-icon.amber{background:#fff4e2;color:#b77a16}.k-icon.purple{background:#f3edff;color:#8866c7}.k-value{font-size:27px;font-weight:800;margin:12px 0 7px;letter-spacing:-.5px}.trend{font-size:10px;color:#15977e}.muted{font-size:10px;color:#98a4b5}
.section{display:grid;grid-template-columns:1.4fr 1fr;gap:14px;margin-top:16px}h2{font-size:14px;margin:0 0 17px;font-weight:700}.card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:15px}.card-head h2{margin:0}.table-card{margin-top:16px}.table-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.field,.filter{border:1px solid #e1e8f0;background:#fff;border-radius:9px;padding:10px 12px;font-size:11px;color:#42556e;min-width:0}.field{width:100%}.filter{min-width:145px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:11px}th{text-align:right;color:#8492a6;font-weight:500;background:#f8fafc}td,th{padding:13px 12px;border-bottom:1px solid #edf1f6}tbody tr:last-child td{border-bottom:0}tbody tr:hover{background:#fbfcfe}.pill{display:inline-block;border-radius:20px;padding:5px 9px;font-size:10px;background:#e6f7f3;color:#14816f}.pill.wait{background:#fff3dc;color:#a76a0b}.pill.doc{background:#edf1ff;color:#586cc0}.pill.bad{background:#fdecec;color:#b34444}.pill.gray{background:#eef1f5;color:#64748b}.id{font-weight:700;color:#425b78}.empty{padding:28px;text-align:center;color:#8a97a9;font-size:12px}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.form-row{display:grid;gap:7px}.form-row label{font-size:11px;color:#60718a}.form-row.full{grid-column:1/-1}textarea.field{resize:vertical;min-height:85px}.notice{padding:12px 14px;background:#f0faf8;border:1px solid #d5f0ea;color:#277b70;border-radius:10px;font-size:11px;line-height:1.9;margin-bottom:16px}
.bars{height:145px;display:flex;align-items:end;justify-content:space-around;gap:12px;border-bottom:1px solid #e8edf4;padding:0 5px}.bar{width:10%;max-width:43px;border-radius:7px 7px 2px 2px;background:linear-gradient(180deg,#54d8c5,#279f9e)}.months{display:flex;justify-content:space-around;color:#8a97a9;font-size:10px;padding-top:10px;gap:3px}.status-row{display:flex;justify-content:space-between;align-items:center;margin:15px 0;font-size:12px}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-left:8px}.progress{height:7px;background:#edf1f6;border-radius:10px;overflow:hidden}.progress span{display:block;height:100%;border-radius:10px}
.task-list{display:grid;gap:0}.task{display:flex;align-items:flex-start;gap:10px;padding:13px 0;border-bottom:1px solid #edf1f6;font-size:12px;line-height:1.8}.task:last-child{border:0}.task input{margin-top:5px;accent-color:#168d7d}.task small{display:block;color:#91a0b3;font-size:10px}
.setting-row{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:15px 0;border-bottom:1px solid #edf1f6;font-size:12px}.setting-row:last-child{border:0}.setting-row small{display:block;color:#91a0b3;margin-top:4px;font-size:10px}
.toast{position:fixed;bottom:22px;left:22px;background:#12243a;color:white;border-radius:10px;padding:12px 16px;font-size:12px;box-shadow:0 8px 25px #12243a33;z-index:20;display:none}
footer{text-align:center;padding:24px 0 8px;color:#a0acbb;font-size:10px}
@media(max-width:1100px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.section{grid-template-columns:1fr}}
@media(max-width:650px){.profile-repeat-row,.profile-repeat-row.phone-row,.profile-doc-row,.profile-info-grid,.profile-document-grid{grid-template-columns:1fr}.profile-doc-row .profile-doc-preview{grid-column:auto}.app{display:block}aside{width:100%;min-height:0;padding:14px}.brand{padding:0 8px 14px}.menu{display:flex;overflow-x:auto}.menu a{white-space:nowrap;padding:10px 12px}.side-foot{display:none}main{padding:20px 12px}h1{font-size:21px}.grid{gap:9px}.card{padding:14px}.k-value{font-size:24px}.k-icon{width:32px;height:32px}.top{width:100%}.search{width:100%;flex:1}.form-grid{grid-template-columns:1fr}.form-row.full{grid-column:auto}.page-meta{align-items:flex-start}}
/* تکمیل تجربه کاربری */
:root{scroll-behavior:smooth}
.card{transition:box-shadow .18s ease,border-color .18s ease}
.card:hover{border-color:#dce6ef;box-shadow:0 8px 24px #172d4609}
.btn{transition:transform .15s ease,background .15s ease,border-color .15s ease}
.btn:active{transform:translateY(1px)}
.btn:focus-visible,.menu a:focus-visible,.icon-btn:focus-visible{outline:3px solid #52d6c477;outline-offset:2px}
input,select,textarea{color:#243850}
input::placeholder,textarea::placeholder{color:#a1adbc}
.table-wrap{border-radius:10px}
tbody tr[hidden]{display:none}
.empty-state{padding:34px 18px;text-align:center;color:#8795a8}
.empty-state strong{display:block;color:#52657c;font-size:13px;margin-bottom:6px}
.toast{max-width:min(420px,calc(100vw - 32px));line-height:1.8}
@media(max-width:650px){.table-card{padding:12px}.table-tools>*{flex:1 1 100%;max-width:none!important}.actions .btn{flex:1}.setting-row{align-items:flex-start;flex-wrap:wrap}.setting-row .field{max-width:100%!important}}

</style>
</head>
<body>
<div class="app">
<aside>
  <div class="brand"><div class="brand-mark">ا</div><div>امید<span> .</span></div></div>
  <nav class="menu" aria-label="منوی اصلی">
    <a href="/" data-page="dashboard">▦ &nbsp; داشبورد</a>
    <a href="/customers" data-page="customers">♙ &nbsp; مشتریان</a>
    <a href="/applications" data-page="applications">▤ &nbsp; درخواست‌های تسهیلات</a>
    <a href="/workflow" data-page="workflow">↻ &nbsp; گردش کار</a>
    <a href="/reports" data-page="reports">▥ &nbsp; گزارش‌ها</a>
    <a href="/settings" data-page="settings">⚙ &nbsp; تنظیمات</a>
  </nav>
  <div class="side-foot">سامانه مدیریت مشتریان<br>نسخه نمایشی · ۱۴۰۵</div>
</aside>
<main>
<header>
  <div><h1 id="page-title">داشبورد مدیریتی</h1><div class="sub" id="page-subtitle">نمای کلی وضعیت مشتریان و پرونده‌های تسهیلات</div></div>
  <div class="top"><input id="global-search" class="search" placeholder="جست‌وجو در صفحه..." aria-label="جست‌وجو در صفحه"><button class="icon-btn" type="button" aria-label="اعلان‌ها" title="اعلان‌ها" id="notifications">♧</button><div class="avatar" title="مدیر سامانه">ا</div></div>
</header>
<div id="page-meta" class="page-meta"></div>
<div id="content"><div class="grid"><div class="card"><div class="k-head"><span class="k-label">مشتریان ثبت‌شده</span><span class="k-icon ">♙</span></div><div class="k-value">۲٬۴۸۶</div><div class="muted">نمونه آماری داشبورد</div></div><div class="card"><div class="k-head"><span class="k-label">پرونده‌های در جریان</span><span class="k-icon blue">▤</span></div><div class="k-value">۳۲۸</div><div class="muted">در حال پیگیری</div></div><div class="card"><div class="k-head"><span class="k-label">در انتظار تأیید</span><span class="k-icon amber">◷</span></div><div class="k-value">۴۷</div><div class="muted">نیازمند بررسی</div></div><div class="card"><div class="k-head"><span class="k-label">تکمیل مدارک</span><span class="k-icon purple">✓</span></div><div class="k-value">۸۶٪</div><div class="muted">شاخص نمونه</div></div></div><div class="section"><div class="card"><div class="card-head"><h2>روند درخواست‌های تسهیلات</h2><span class="muted">شش ماه اخیر · نمونه</span></div><div class="bars"><div class="bar" style="height:38%"></div><div class="bar" style="height:55%"></div><div class="bar" style="height:45%"></div><div class="bar" style="height:72%"></div><div class="bar" style="height:63%"></div><div class="bar" style="height:91%"></div></div><div class="months"><span>اردیبهشت</span><span>خرداد</span><span>تیر</span><span>مرداد</span><span>شهریور</span><span>مهر</span></div></div><div class="card"><h2>وضعیت پرونده‌ها</h2><div class="status-row"><span><i class="dot" style="background:#35b9a5"></i>در حال بررسی</span><b>۴۸٪</b></div><div class="progress"><span style="width:48%;background:#35b9a5"></span></div><div class="status-row"><span><i class="dot" style="background:#f2bb5b"></i>نیازمند مدرک</span><b>۲۵٪</b></div><div class="progress"><span style="width:25%;background:#f2bb5b"></span></div><div class="status-row"><span><i class="dot" style="background:#7589e8"></i>تأیید شده</span><b>۲۷٪</b></div><div class="progress"><span style="width:27%;background:#7589e8"></span></div></div></div><div class="card table-card"><div class="card-head"><h2>آخرین پرونده‌ها</h2><a class="btn" href="/applications" data-link>مشاهده همه ←</a></div><div class="table-wrap"><table><thead><tr><th>شماره پرونده</th><th>نام مشتری</th><th>نوع تسهیلات</th><th>مبلغ درخواستی</th><th>وضعیت</th></tr></thead><tbody><tr><td class="id">OM-1405-0248</td><td>علی محمدی</td><td>سرمایه در گردش</td><td>۸۰۰ میلیون تومان</td><td><span class="pill doc">در حال بررسی</span></td></tr><tr><td class="id">OM-1405-0247</td><td>سارا احمدی</td><td>تسهیلات شخصی</td><td>۲۵۰ میلیون تومان</td><td><span class="pill wait">در انتظار تأیید</span></td></tr><tr><td class="id">OM-1405-0246</td><td>شرکت پارس تجارت</td><td>اعتباری شرکتی</td><td>۱٫۲ میلیارد تومان</td><td><span class="pill gray">تکمیل مدارک</span></td></tr><tr><td class="id">OM-1405-0245</td><td>مریم حسینی</td><td>سرمایه در گردش</td><td>۵۰۰ میلیون تومان</td><td><span class="pill doc">در حال بررسی</span></td></tr></tbody></table></div></div><div class="section"><div class="card"><h2>کارهای نیازمند اقدام</h2><div class="task-list"><div class="task"><input type="checkbox" data-task="0"><div>بررسی مدارک پرونده OM-1405-0247<small>امروز · آرمان صالحی · اولویت بالا</small></div></div><div class="task"><input type="checkbox" data-task="1"><div>پیگیری تکمیل مدارک شرکت پارس تجارت<small>امروز · امیر کاظمی · اولویت متوسط</small></div></div><div class="task"><input type="checkbox" data-task="2"><div>بازبینی درخواست‌های در انتظار تأیید<small>فردا · مدیر سامانه · اولویت متوسط</small></div></div></div></div><div class="card"><h2>دسترسی سریع</h2><div class="task-list"><div class="task"><span class="k-icon">＋</span><div><a href="/customers/new" data-link>ثبت مشتری جدید</a><small>افزودن مشتری به سامانه</small></div></div><div class="task"><span class="k-icon blue">▤</span><div><a href="/applications/new" data-link>ایجاد پرونده تسهیلات</a><small>شروع درخواست جدید</small></div></div><div class="task"><span class="k-icon amber">▧</span><div><a href="/documents" data-link>بررسی اسناد</a><small>مدیریت مدارک پرونده‌ها</small></div></div></div></div></div></div>
<footer>سامانه امید · نسخه نمایشی · داده‌های این نسخه نمونه هستند</footer>
</main>
</div>
<div id="toast" class="toast" role="status"></div>
<script>
const customers = [
 {id:"CU-1405-0312",name:"علی محمدی",type:"حقیقی",phone:"09121234567",email:"ali@example.com",status:"فعال",manager:"مریم رضایی"},
 {id:"CU-1405-0311",name:"شرکت پارس تجارت",type:"حقوقی",phone:"02188776655",email:"info@pars.example",status:"فعال",manager:"امیر کاظمی"},
 {id:"CU-1405-0310",name:"سارا احمدی",type:"حقیقی",phone:"09129876543",email:"sara@example.com",status:"نیازمند بررسی",manager:"مریم رضایی"},
 {id:"CU-1405-0309",name:"رضا کریمی",type:"حقیقی",phone:"09351234567",email:"reza@example.com",status:"فعال",manager:"آرمان صالحی"},
 {id:"CU-1405-0308",name:"گروه بازرگانی آریا",type:"حقوقی",phone:"02144556677",email:"contact@arya.example",status:"غیرفعال",manager:"امیر کاظمی"}
];
const applications = [
 {id:"OM-1405-0248",customer:"علی محمدی",type:"سرمایه در گردش",amount:"۸۰۰ میلیون تومان",status:"در حال بررسی",manager:"مریم رضایی",date:"۱۴۰۵/۰۷/۲۴"},
 {id:"OM-1405-0247",customer:"سارا احمدی",type:"تسهیلات شخصی",amount:"۲۵۰ میلیون تومان",status:"در انتظار تأیید",manager:"آرمان صالحی",date:"۱۴۰۵/۰۷/۲۳"},
 {id:"OM-1405-0246",customer:"شرکت پارس تجارت",type:"اعتباری شرکتی",amount:"۱٫۲ میلیارد تومان",status:"تکمیل مدارک",manager:"امیر کاظمی",date:"۱۴۰۵/۰۷/۲۲"},
 {id:"OM-1405-0245",customer:"مریم حسینی",type:"سرمایه در گردش",amount:"۵۰۰ میلیون تومان",status:"در حال بررسی",manager:"مریم رضایی",date:"۱۴۰۵/۰۷/۲۱"},
 {id:"OM-1405-0244",customer:"رضا کریمی",type:"تسهیلات شخصی",amount:"۱۵۰ میلیون تومان",status:"تأیید شده",manager:"آرمان صالحی",date:"۱۴۰۵/۰۷/۲۰"}
];
applications.forEach(a=>{a.activity=[{type:"ثبت پرونده",text:"پرونده در سامانه ثبت شد.",date:a.date},{type:"وضعیت",text:"وضعیت اولیه: "+a.status,date:a.date}];});
const tasks = [
 {title:"بررسی مدارک پرونده OM-1405-0247",owner:"آرمان صالحی",due:"امروز",priority:"بالا",done:false},
 {title:"پیگیری تکمیل مدارک شرکت پارس تجارت",owner:"امیر کاظمی",due:"امروز",priority:"متوسط",done:false},
 {title:"بازبینی درخواست‌های در انتظار تأیید",owner:"مدیر سامانه",due:"فردا",priority:"متوسط",done:false},
 {title:"ثبت نتیجه تماس با مشتری",owner:"مریم رضایی",due:"پس‌فردا",priority:"عادی",done:true}
];
const staff = [
 {name:"حسین بهدارند",role:"مدیر",phone:"",status:"فعال"},
 {name:"مهرنوش شهبازی",role:"معاون",phone:"",status:"فعال"},
 {name:"فرنوش شهبازی",role:"قراردادها",phone:"",status:"فعال"},
 {name:"ظریفه بساک",role:"پذیرش",phone:"",status:"فعال"}
];
const bankCatalog = ["بانک رسالت","بانک ملی ایران","بانک سپه"];
const docs = [
 {name:"فرم درخواست تسهیلات",case:"OM-1405-0248",type:"فرم",status:"تأیید شده",date:"۱۴۰۵/۰۷/۲۴"},
 {name:"تصویر کارت ملی",case:"OM-1405-0247",type:"هویتی",status:"در انتظار بررسی",date:"۱۴۰۵/۰۷/۲۳"},
 {name:"صورت‌های مالی شرکت",case:"OM-1405-0246",type:"مالی",status:"نیازمند تکمیل",date:"۱۴۰۵/۰۷/۲۲"},
 {name:"گواهی محل سکونت",case:"OM-1405-0245",type:"پشتیبان",status:"تأیید شده",date:"۱۴۰۵/۰۷/۲۱"}
];
// نگهداری داده‌های نمایشی در همین مرورگر؛ این ذخیره‌سازی جایگزین بک‌اند نیست.
const DEMO_STORAGE_KEY = "omid-demo-v2";
function restoreDemoData(){
 try{
  const saved=JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)||"null");
  if(!saved||typeof saved!=="object")return;
  if(Array.isArray(saved.customers)){customers.splice(0,customers.length,...saved.customers);}
  if(Array.isArray(saved.applications)){applications.splice(0,applications.length,...saved.applications);}
  if(Array.isArray(saved.tasks)){tasks.splice(0,tasks.length,...saved.tasks);}
  if(Array.isArray(saved.docs)){docs.splice(0,docs.length,...saved.docs);}
  if(Array.isArray(saved.staff)){staff.splice(0,staff.length,...saved.staff);}
  if(Array.isArray(saved.bankCatalog)){bankCatalog.splice(0,bankCatalog.length,...saved.bankCatalog);}
 }catch(error){console.warn("Omid demo data could not be restored",error);}
}
function persistDemoData(){
 try{
  localStorage.setItem(DEMO_STORAGE_KEY,JSON.stringify({customers,applications,tasks,docs,staff,bankCatalog}));
 }catch(error){console.warn("Omid demo data could not be saved",error);toast("ذخیره محلی در این مرورگر در دسترس نیست.");}
}
restoreDemoData();
const pageInfo = {
 dashboard:["داشبورد مدیریتی","نمای کلی وضعیت مشتریان و پرونده‌های تسهیلات"],
 customers:["مدیریت مشتریان","ثبت، جست‌وجو و پیگیری اطلاعات مشتریان"],
 applications:["درخواست‌های تسهیلات","مدیریت پرونده‌های اعتباری از ثبت تا تصمیم نهایی"],
 workflow:["گردش کار","وظایف، ارجاع‌ها و اقدام‌های در انتظار"],
 documents:["اسناد و مدارک","پیگیری وضعیت مدارک مرتبط با پرونده‌ها"],
 reports:["گزارش‌های مدیریتی","نمای کلی عملکرد و وضعیت پرونده‌ها"],
 settings:["تنظیمات سامانه","تنظیمات پایه و ترجیحات محیط کار"]
};
let currentPage = "dashboard";
let customerFilter = "";
let customerTypeFilter = "";
let applicationFilter = "";
let applicationStatusFilter = "";
let documentFilter = "";
function esc(value){return String(value).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function statusPill(status){
 let cls = status.includes("انتظار") ? "wait" : status.includes("مدرک") || status.includes("بررسی") || status.includes("نیازمند") ? "doc" : status.includes("غیرفعال") || status.includes("رد") ? "bad" : status.includes("فعال") || status.includes("تأیید شده") ? "" : "gray";
 return '<span class="pill '+cls+'">'+esc(status)+'</span>';
}
function setMeta(text,button){
 document.getElementById("page-meta").innerHTML = '<div class="crumb">سامانه امید / '+text+'</div><div class="actions">'+(button||"")+'</div>';
}
function stat(label,value,icon,kind,caption){return '<div class="card"><div class="k-head"><span class="k-label">'+label+'</span><span class="k-icon '+(kind||'')+'">'+icon+'</span></div><div class="k-value">'+value+'</div><div class="muted">'+caption+'</div></div>';}
function table(headers,rows){return '<div class="table-wrap"><table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';}
function renderDashboard(){
 setMeta("داشبورد",'<button class="btn" data-action="refresh">↻ به‌روزرسانی</button>');
 const recent = applications.slice(0,4).map(a=>'<tr><td class="id">'+a.id+'</td><td>'+a.customer+'</td><td>'+a.type+'</td><td>'+a.amount+'</td><td>'+statusPill(a.status)+'</td></tr>').join('');
 return '<div class="grid">'+stat("مشتریان ثبت‌شده","۲٬۴۸۶","♙","","نمونه آماری داشبورد")+stat("پرونده‌های در جریان","۳۲۸","▤","blue","در حال پیگیری")+stat("در انتظار تأیید","۴۷","◷","amber","نیازمند بررسی")+stat("تکمیل مدارک","۸۶٪","✓","purple","شاخص نمونه")+'</div>'+
 '<div class="section"><div class="card"><div class="card-head"><h2>روند درخواست‌های تسهیلات</h2><span class="muted">شش ماه اخیر · نمونه</span></div><div class="bars"><div class="bar" style="height:38%"></div><div class="bar" style="height:55%"></div><div class="bar" style="height:45%"></div><div class="bar" style="height:72%"></div><div class="bar" style="height:63%"></div><div class="bar" style="height:91%"></div></div><div class="months"><span>اردیبهشت</span><span>خرداد</span><span>تیر</span><span>مرداد</span><span>شهریور</span><span>مهر</span></div></div><div class="card"><h2>وضعیت پرونده‌ها</h2><div class="status-row"><span><i class="dot" style="background:#35b9a5"></i>در حال بررسی</span><b>۴۸٪</b></div><div class="progress"><span style="width:48%;background:#35b9a5"></span></div><div class="status-row"><span><i class="dot" style="background:#f2bb5b"></i>نیازمند مدرک</span><b>۲۵٪</b></div><div class="progress"><span style="width:25%;background:#f2bb5b"></span></div><div class="status-row"><span><i class="dot" style="background:#7589e8"></i>تأیید شده</span><b>۲۷٪</b></div><div class="progress"><span style="width:27%;background:#7589e8"></span></div></div></div>'+
 '<div class="card table-card"><div class="card-head"><h2>آخرین پرونده‌ها</h2><a class="btn" href="/applications" data-link>مشاهده همه ←</a></div>'+table(["شماره پرونده","نام مشتری","نوع تسهیلات","مبلغ درخواستی","وضعیت"],recent)+'</div>'+
 '<div class="section"><div class="card"><h2>کارهای نیازمند اقدام</h2><div class="task-list">'+tasks.filter(t=>!t.done).slice(0,3).map(t=>'<div class="task"><input type="checkbox" data-task="'+tasks.indexOf(t)+'"><div>'+t.title+'<small>'+t.due+' · '+t.owner+' · اولویت '+t.priority+'</small></div></div>').join('')+'</div></div><div class="card"><h2>دسترسی سریع</h2><div class="task-list"><div class="task"><span class="k-icon">＋</span><div><a href="/customers/new" data-link>ثبت مشتری جدید</a><small>افزودن مشتری به سامانه</small></div></div><div class="task"><span class="k-icon blue">▤</span><div><a href="/applications/new" data-link>ایجاد پرونده تسهیلات</a><small>شروع درخواست جدید</small></div></div><div class="task"><span class="k-icon amber">▧</span><div><a href="/documents" data-link>بررسی اسناد</a><small>مدیریت مدارک پرونده‌ها</small></div></div></div></div></div>';
}
function renderCustomers(){
 setMeta("مشتریان",'<button class="btn" data-action="export-customers">⇩ خروجی CSV</button><button class="btn primary" data-link="/customers/new">＋ ثبت مشتری جدید</button>');
 if(location.pathname.endsWith("/new")) return renderCustomerForm();
 const editParts=location.pathname.split("/"); const editMatch=editParts.length===4&&editParts[1]==="customers"&&editParts[3]==="edit"?[null,editParts[2]]:null;
 if(editMatch) return renderCustomerForm(customers.find(c=>c.id===decodeURIComponent(editMatch[1]))||null);
 const filtered=customers.filter(c=>(c.name+" "+c.id+" "+c.phone+" "+c.manager+" "+c.email).toLowerCase().includes(customerFilter.toLowerCase())&&(!customerTypeFilter||c.type===customerTypeFilter));
 const rows=filtered.map(c=>'<tr><td class="id">'+esc(c.id)+'</td><td>'+esc(c.name)+'</td><td>'+esc(c.type)+'</td><td>'+esc(c.phone)+'</td><td>'+esc(c.manager)+'</td><td>'+statusPill(c.status)+'</td><td><button class="btn" data-action="customer-detail" data-id="'+esc(c.id)+'">جزئیات</button></td></tr>').join('');
 const realCount=customers.filter(c=>c.type==="حقیقی").length,legalCount=customers.filter(c=>c.type==="حقوقی").length,reviewCount=customers.filter(c=>c.status==="نیازمند بررسی").length;
 return '<div class="grid">'+stat("کل مشتریان",customers.length,"♙","","داده‌های نمایشی")+stat("مشتریان حقیقی",realCount,"♧","blue","بر اساس فهرست")+stat("مشتریان حقوقی",legalCount,"▦","purple","بر اساس فهرست")+stat("نیازمند بررسی",reviewCount,"◷","amber","نیازمند پیگیری")+'</div><div class="card table-card"><div class="card-head"><h2>فهرست مشتریان</h2><span class="muted">'+filtered.length+' رکورد از '+customers.length+'</span></div><div class="table-tools"><input class="field" style="max-width:330px" id="customer-search" placeholder="نام، کد یا شماره تماس..." value="'+esc(customerFilter)+'"><select class="filter" id="customer-type"><option value="" '+(!customerTypeFilter?'selected':'')+'>همه انواع مشتری</option><option '+(customerTypeFilter==="حقیقی"?'selected':'')+'>حقیقی</option><option '+(customerTypeFilter==="حقوقی"?'selected':'')+'>حقوقی</option></select></div>'+table(["کد مشتری","نام / عنوان","نوع","شماره تماس","مسئول پرونده","وضعیت","عملیات"],rows||'<tr><td colspan="7" class="empty">مشتری‌ای مطابق جست‌وجو پیدا نشد.</td></tr>')+'</div>';
}
function profileRows(items,kind){
 const list=Array.isArray(items)?items:[];
 if(!list.length)list.push({});
 return list.map(item=>{
  const remove='<button type="button" class="btn danger" data-action="remove-profile-row" aria-label="حذف ردیف">حذف</button>';
  if(kind==="address")return '<div class="profile-repeat-row" data-profile-row="address"><div class="form-row"><label>عنوان آدرس</label><input class="field" name="addressTitle" value="'+esc(item.title||"")+'" placeholder="خانه، محل کار..."></div><div class="form-row"><label>آدرس کامل</label><textarea class="field" name="addressValue" rows="2" placeholder="استان، شهر، خیابان، پلاک...">'+esc(item.value||"")+'</textarea></div><div class="form-row"><label>کدپستی</label><input class="field" name="addressPostal" inputmode="numeric" value="'+esc(item.postalCode||"")+'" placeholder="کدپستی این آدرس"></div>'+remove+'</div>';
  if(kind==="phone")return '<div class="profile-repeat-row phone-row" data-profile-row="phone"><div class="form-row"><label>عنوان شماره</label><input class="field" name="phoneTitle" value="'+esc(item.title||"")+'" placeholder="موبایل اصلی، منزل..."></div><div class="form-row"><label>شماره تماس</label><input class="field" name="phoneValue" inputmode="tel" value="'+esc(item.number||"")+'" placeholder="شماره تماس"></div>'+remove+'</div>';
  const knownBank=bankCatalog.includes(item.bank||""); const bankOptions=bankCatalog.map(b=>'<option value="'+esc(b)+'" '+(item.bank===b?"selected":"")+' >'+esc(b)+'</option>').join(""); const legacyBank=item.bank&&!knownBank?'<option selected value="'+esc(item.bank)+'">'+esc(item.bank)+' (ثبت قبلی)</option>':""; return '<div class="profile-repeat-row" data-profile-row="bank"><div class="form-row"><label>نام بانک</label><select class="field" name="bankName" required><option value="">انتخاب بانک</option>'+bankOptions+legacyBank+'</select></div><div class="form-row"><label>شماره حساب</label><input class="field" name="bankNumber" inputmode="numeric" value="'+esc(item.accountNumber||"")+'" placeholder="شماره حساب"></div><div class="form-row"><label>عنوان حساب (اختیاری)</label><input class="field" name="bankTitle" value="'+esc(item.title||"")+'" placeholder="مثلاً حساب تسهیلات"></div>'+remove+'</div>';
 }).join("");
}
function customerDocumentRow(doc={}){
 const types=["کارت ملی","مدرک شغلی","پرینت بانکی","سند","سایر"];
 return '<div class="profile-doc-row" data-customer-doc-row><div class="form-row"><label>نوع مدرک</label><select class="field" name="customerDocType">'+types.map(t=>'<option '+(doc.type===t?"selected":"")+'>'+t+'</option>').join("")+'</select></div><div class="form-row"><label>عنوان / توضیح</label><input class="field" name="customerDocTitle" value="'+esc(doc.title||"")+'" placeholder="مثلاً کارت ملی پشت و رو"></div><div class="form-row"><label>تصویر یا فایل مدرک</label><input class="field" type="file" name="customerDocFile" accept="image/*,application/pdf"></div><input type="hidden" name="customerDocExistingUrl" value="'+esc(doc.dataUrl||"")+'"><input type="hidden" name="customerDocExistingName" value="'+esc(doc.fileName||"")+'"><div class="profile-doc-preview">'+(doc.dataUrl?(String(doc.dataUrl).startsWith("data:image/")?'<img src="'+esc(doc.dataUrl)+'" alt="پیش‌نمایش مدرک">':'<span class="muted">فایل ذخیره‌شده: '+esc(doc.fileName||"مدرک")+'</span>'):'<span class="muted">هنوز فایلی انتخاب نشده است.</span>')+'</div><button type="button" class="btn danger" data-action="remove-profile-row">حذف مدرک</button></div>';
}
function renderCustomerForm(customer=null){
 const editing=!!customer;
 const firstName=customer?.firstName??(customer?.type==="حقوقی"?(customer?.name||""):(String(customer?.name||"").trim().split(/\s+/)[0]||""));
 const lastName=customer?.lastName??(customer?.type==="حقوقی"?"":String(customer?.name||"").trim().split(/\s+/).slice(1).join(" "));
 const addresses=Array.isArray(customer?.addresses)?customer.addresses:[];
 const phones=Array.isArray(customer?.phones)&&customer.phones.length?customer.phones:[{title:"موبایل اصلی",number:customer?.phone||""}];
 const banks=Array.isArray(customer?.bankAccounts)?customer.bankAccounts:[];
 const documents=Array.isArray(customer?.documents)?customer.documents:[];
 setMeta(editing?"مشتریان / ویرایش پروفایل":"مشتریان / پروفایل مشتری جدید",'<button class="btn" data-link="/customers">← بازگشت به فهرست</button>');
 return '<div class="card"><div class="card-head"><h2>'+(editing?"پروفایل مشتری":"ایجاد پروفایل مشتری")+'</h2>'+(editing?'<span class="pill">کد مشتری: '+esc(customer.id)+'</span>':'')+'</div><div class="notice">اطلاعات پروفایل، آدرس‌ها، شماره‌ها، حساب‌ها و مدارک در این نسخه فقط در حافظه محلی همین مرورگر ذخیره می‌شوند. برای اطلاعات هویتی و مالی واقعی، اتصال به سرور امن و کنترل دسترسی لازم است.</div><form id="customer-form" data-edit-id="'+(editing?esc(customer.id):"")+'"><section class="profile-section"><h2>اطلاعات هویتی</h2><div class="form-grid"><div class="form-row"><label>نوع مشتری *</label><select class="field" name="type" required><option value="حقیقی" '+(customer?.type!=="حقوقی"?"selected":"")+'>حقیقی</option><option value="حقوقی" '+(customer?.type==="حقوقی"?"selected":"")+'>حقوقی</option></select></div><div class="form-row"><label>نام *</label><input class="field" name="firstName" required value="'+esc(firstName)+'" placeholder="نام"></div><div class="form-row"><label>نام خانوادگی</label><input class="field" name="lastName" value="'+esc(lastName)+'" placeholder="نام خانوادگی"></div><div class="form-row"><label>کد ملی</label><input class="field" name="nationalId" inputmode="numeric" maxlength="10" value="'+esc(customer?.nationalId||"")+'" placeholder="کد ملی"></div><div class="form-row"><label>تاریخ تولد</label><input class="field" name="birthDate" type="date" value="'+esc(customer?.birthDate||"")+'"></div><div class="form-row"><label>نام پدر</label><input class="field" name="fatherName" value="'+esc(customer?.fatherName||"")+'" placeholder="نام پدر"></div><div class="form-row"><label>شغل</label><input class="field" name="occupation" value="'+esc(customer?.occupation||"")+'" placeholder="شغل یا سمت"></div><div class="form-row"><label>کدپستی اصلی</label><input class="field" name="postalCode" inputmode="numeric" value="'+esc(customer?.postalCode||"")+'" placeholder="کدپستی"></div><div class="form-row"><label>ایمیل</label><input class="field" name="email" type="email" value="'+esc(customer?.email||"")+'" placeholder="name@example.com"></div><div class="form-row"><label>مسئول پرونده</label><select class="field" name="manager"><option '+(customer?.manager==="مریم رضایی"?"selected":"")+'>مریم رضایی</option><option '+(customer?.manager==="امیر کاظمی"?"selected":"")+'>امیر کاظمی</option><option '+(customer?.manager==="آرمان صالحی"?"selected":"")+'>آرمان صالحی</option></select></div><div class="form-row"><label>وضعیت مشتری</label><select class="field" name="status"><option '+(!customer||customer.status==="فعال"?"selected":"")+'>فعال</option><option '+(customer?.status==="نیازمند بررسی"?"selected":"")+'>نیازمند بررسی</option><option '+(customer?.status==="غیرفعال"?"selected":"")+'>غیرفعال</option></select></div><div class="form-row"><label class="check-line"><input type="checkbox" name="sana" '+(customer?.sana?"checked":"")+'> مشتری در سامانه ثنا ثبت‌نام دارد</label></div><div class="form-row full"><label>یادداشت</label><textarea class="field" name="notes" placeholder="توضیحات تکمیلی">'+esc(customer?.notes||"")+'</textarea></div></div></section><section class="profile-section"><div class="profile-section-head"><h2>آدرس‌ها</h2><button class="btn" type="button" data-action="add-profile-row" data-kind="address">＋ افزودن آدرس</button></div><div id="profile-addresses" class="profile-repeat-list">'+profileRows(addresses,"address")+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>شماره‌های تماس</h2><button class="btn" type="button" data-action="add-profile-row" data-kind="phone">＋ افزودن شماره</button></div><div id="profile-phones" class="profile-repeat-list">'+profileRows(phones,"phone")+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>حساب‌های بانکی</h2><button class="btn" type="button" data-action="add-profile-row" data-kind="bank">＋ افزودن حساب بانکی</button></div><div id="profile-banks" class="profile-repeat-list">'+profileRows(banks,"bank")+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>مدارک مشتری</h2><button class="btn" type="button" data-action="add-customer-doc">＋ افزودن مدرک</button></div><p class="muted">تصاویر و فایل‌های انتخاب‌شده داخل همین پروفایل نمایش داده می‌شوند. برای نسخه نمایشی فایل‌ها در حافظه مرورگر ذخیره می‌شوند.</p><div id="profile-documents" class="profile-doc-list">'+(documents.length?documents.map(customerDocumentRow).join(""):customerDocumentRow())+'</div></section><div class="actions" style="margin-top:22px"><button class="btn primary" type="submit">'+(editing?"ذخیره پروفایل":"ایجاد پروفایل مشتری")+'</button><button class="btn" type="reset">بازنشانی فرم</button></div></form></div>';
}
function renderApplications(){
 setMeta("درخواست‌های تسهیلات",'<button class="btn" data-action="export-applications">⇩ خروجی CSV</button><button class="btn primary" data-link="/applications/new">＋ پرونده جدید</button>');
 if(location.pathname.endsWith("/new")) return renderApplicationForm();
 const filtered=applications.filter(a=>(a.id+" "+a.customer+" "+a.type+" "+a.manager+" "+a.status).toLowerCase().includes(applicationFilter.toLowerCase())&&(!applicationStatusFilter||a.status===applicationStatusFilter));
 const rows=filtered.map(a=>'<tr><td class="id">'+esc(a.id)+'</td><td>'+esc(a.customer)+'</td><td>'+esc(a.type)+'</td><td>'+esc(a.amount)+'</td><td>'+esc(a.manager)+'</td><td>'+statusPill(a.status)+'</td><td><button class="btn" data-action="application-detail" data-id="'+esc(a.id)+'">مشاهده</button></td></tr>').join('');
 return '<div class="grid">'+stat("کل پرونده‌ها",applications.length,"▤","","داده نمونه")+stat("در حال بررسی",applications.filter(a=>a.status==="در حال بررسی").length,"↻","blue","در گردش کار")+stat("تکمیل مدارک",applications.filter(a=>a.status==="تکمیل مدارک").length,"▧","amber","اقدام مشتری لازم است")+stat("تأیید شده",applications.filter(a=>a.status==="تأیید شده").length,"✓","purple","در نمونه فعلی")+'</div><div class="card table-card"><div class="card-head"><h2>فهرست درخواست‌ها</h2><span class="muted">'+filtered.length+' پرونده</span></div><div class="table-tools"><input id="application-search" class="field" style="max-width:350px" placeholder="شماره پرونده، مشتری یا نوع تسهیلات..." value="'+esc(applicationFilter)+'"><select class="filter" id="application-status"><option value="" '+(!applicationStatusFilter?'selected':'')+'>همه وضعیت‌ها</option><option '+(applicationStatusFilter==="در حال بررسی"?'selected':'')+'>در حال بررسی</option><option '+(applicationStatusFilter==="در انتظار تأیید"?'selected':'')+'>در انتظار تأیید</option><option '+(applicationStatusFilter==="تکمیل مدارک"?'selected':'')+'>تکمیل مدارک</option><option '+(applicationStatusFilter==="تأیید شده"?'selected':'')+'>تأیید شده</option><option '+(applicationStatusFilter==="رد شده"?'selected':'')+'>رد شده</option></select></div>'+table(["شماره پرونده","مشتری","نوع تسهیلات","مبلغ درخواستی","کارشناس","وضعیت","عملیات"],rows||'<tr><td colspan="7" class="empty">پرونده‌ای پیدا نشد.</td></tr>')+'</div>';
}
function applicationCustomerResults(query,selectedId){
 const q=String(query||"").trim().toLocaleLowerCase("fa");
 const matches=customers.filter(c=>!q||(String(c.name||"")+" "+String(c.id||"")+" "+String(c.nationalId||"")+" "+String(c.phone||"")+" "+String((c.phones||[]).map(p=>p.number||"").join(" "))).toLocaleLowerCase("fa").includes(q));
 const shown=matches.slice(0,12);
 if(!shown.length)return '<div class="empty" style="padding:14px">مشتری‌ای با این مشخصات پیدا نشد.</div>';
 return shown.map(c=>'<button type="button" class="customer-pick-option" data-action="select-application-customer" data-customer-id="'+esc(c.id)+'" style="display:flex;width:100%;justify-content:space-between;align-items:center;gap:12px;text-align:right;padding:11px 13px;border:0;border-bottom:1px solid #edf1f6;background:'+(c.id===selectedId?'#eefaf7':'#fff')+';cursor:pointer;color:#243850"><span><b>'+esc(c.name)+'</b><small style="display:block;color:#8492a6;margin-top:4px">'+esc(c.id||"بدون کد")+(c.nationalId?' · کد ملی '+esc(c.nationalId):'')+(c.phone?' · '+esc(c.phone):'')+'</small></span><span class="pill">'+(c.id===selectedId?'انتخاب‌شده':'انتخاب')+'</span></button>').join("");
}
function renderApplicationForm(){
 const requestedCustomerId=new URLSearchParams(location.search).get("customerId")||"";
 const selectedCustomer=customers.find(c=>c.id===requestedCustomerId)||null;
 setMeta("درخواست‌ها / پرونده جدید",'<button class="btn" data-link="/applications">← بازگشت به فهرست</button>');
 return '<div class="card"><h2>ایجاد پرونده تسهیلات</h2><div class="notice">برای فهرست بزرگ مشتریان، نام، کد مشتری، کد ملی یا شماره تماس را جست‌وجو کنید. حداکثر ۱۲ نتیجه در هر جست‌وجو نمایش داده می‌شود.</div><form id="application-form"><div class="form-grid"><div class="form-row full"><label>جست‌وجو و انتخاب مشتری *</label><input class="field" id="application-customer-search" autocomplete="off" placeholder="نام مشتری، کد مشتری، کد ملی یا شماره تماس را بنویسید..." value="'+esc(selectedCustomer?selectedCustomer.name+" · "+selectedCustomer.id:"")+'"><input type="hidden" name="customerId" id="application-customer-id" value="'+esc(selectedCustomer?.id||"")+'"><input type="hidden" name="customer" id="application-customer-name" value="'+esc(selectedCustomer?.name||"")+'"><div id="application-customer-results" class="profile-repeat-list" style="margin-top:8px;border:1px solid #e8edf4;border-radius:10px;overflow:hidden">'+(selectedCustomer?applicationCustomerResults(selectedCustomer.name,selectedCustomer.id):'<div class="empty" style="padding:14px">برای یافتن مشتری، بخشی از نام، کد مشتری، کد ملی یا شماره تماس را وارد کنید.</div>')+'</div><small id="application-customer-selected" class="muted">'+(selectedCustomer?'مشتری انتخاب‌شده: '+esc(selectedCustomer.name)+' · '+esc(selectedCustomer.id):'هنوز مشتری‌ای انتخاب نشده است.')+'</small></div><div class="form-row"><label>نوع تسهیلات *</label><select class="field" name="type" required><option>سرمایه در گردش</option><option>تسهیلات شخصی</option><option>اعتباری شرکتی</option><option>خرید تجهیزات</option></select></div><div class="form-row"><label>مبلغ درخواستی (تومان) *</label><input class="field" name="amount" type="number" min="1" required placeholder="مثلاً 250000000"></div><div class="form-row"><label>مدت بازپرداخت (ماه)</label><input class="field" name="term" type="number" min="1" max="240" placeholder="مثلاً 36"></div><div class="form-row"><label>مسئول پرونده</label><select class="field" name="manager"><option>مریم رضایی</option><option>امیر کاظمی</option><option>آرمان صالحی</option></select></div><div class="form-row"><label>وضعیت اولیه</label><select class="field" name="status"><option>در حال بررسی</option><option>تکمیل مدارک</option></select></div><div class="form-row full"><label>توضیحات / هدف تسهیلات</label><textarea class="field" name="notes" placeholder="شرح مختصر درخواست"></textarea></div></div><div class="actions" style="margin-top:18px"><button class="btn primary" type="submit">ثبت نمایشی پرونده</button><button class="btn" type="reset">پاک کردن فرم</button></div></form></div>';
}
function renderWorkflow(){
 setMeta("گردش کار",'<button class="btn" data-action="refresh">↻ به‌روزرسانی</button>');
 const open=tasks.filter(t=>!t.done).length,done=tasks.length-open,high=tasks.filter(t=>!t.done&&t.priority==="بالا").length;
 const taskRows=tasks.map((t,i)=>'<div class="task"><input type="checkbox" data-task="'+i+'" '+(t.done?'checked':'')+'><div style="flex:1;'+(t.done?'text-decoration:line-through;color:#8b99aa':'')+'">'+esc(t.title)+'<small>مسئول: '+esc(t.owner)+' · سررسید: '+esc(t.due)+'</small></div>'+statusPill(t.priority)+' <button class="btn danger" data-action="delete-task" data-task-id="'+i+'" aria-label="حذف وظیفه">حذف</button></div>').join('');
 return '<div class="grid">'+stat("کل وظایف",tasks.length,"↻","","فهرست نمایشی")+stat("باز",open,"◷","amber","در انتظار اقدام")+stat("انجام‌شده",done,"✓","blue","تکمیل‌شده")+stat("اولویت بالا",high,"!","purple","وظایف باز با اولویت بالا")+'</div><div class="section"><div class="card"><h2>افزودن وظیفه یا پیگیری</h2><div class="notice">این فرم نسخه نمایشی است؛ وظایف در حافظه محلی همین مرورگر ذخیره می‌شوند.</div><form id="task-form"><div class="form-row"><label>عنوان وظیفه *</label><input class="field" name="title" required maxlength="120" placeholder="مثلاً پیگیری مدارک مشتری"></div><div class="form-grid" style="margin-top:14px"><div class="form-row"><label>مسئول</label><select class="field" name="owner"><option>مریم رضایی</option><option>امیر کاظمی</option><option>آرمان صالحی</option><option>مدیر سامانه</option></select></div><div class="form-row"><label>سررسید</label><select class="field" name="due"><option>امروز</option><option>فردا</option><option>پس‌فردا</option><option>این هفته</option><option>بدون سررسید</option></select></div><div class="form-row full"><label>اولویت</label><select class="field" name="priority"><option>عادی</option><option>متوسط</option><option>بالا</option></select></div></div><button class="btn primary" type="submit" style="margin-top:15px">＋ افزودن وظیفه</button></form></div><div class="card"><h2>مراحل معمول پرونده</h2><div class="task-list"><div class="task"><span class="k-icon">۱</span><div>ثبت درخواست<small>ایجاد پرونده و مشخصات اولیه</small></div></div><div class="task"><span class="k-icon blue">۲</span><div>بررسی مدارک<small>کنترل مدارک هویتی و مالی</small></div></div><div class="task"><span class="k-icon amber">۳</span><div>ارزیابی و تأیید<small>ارجاع به مسئول مجاز</small></div></div><div class="task"><span class="k-icon purple">۴</span><div>نتیجه و بایگانی<small>ثبت تصمیم و اطلاع‌رسانی</small></div></div></div></div></div><div class="card table-card"><div class="card-head"><h2>فهرست وظایف و پیگیری‌ها</h2><span class="muted">'+tasks.length+' وظیفه</span></div><div class="task-list">'+(taskRows||'<div class="empty">هنوز وظیفه‌ای ثبت نشده است.</div>')+'</div></div>';
}
function renderDocuments(){
 setMeta("اسناد و مدارک",'<button class="btn primary" data-link="/documents/new">＋ افزودن مدرک</button>');
 const filtered=docs.filter(d=>(d.name+" "+d.case+" "+d.type+" "+d.status).toLowerCase().includes(documentFilter.toLowerCase()));
 const rows=filtered.map(d=>'<tr><td>'+esc(d.name)+'</td><td class="id">'+esc(d.case)+'</td><td>'+esc(d.type)+'</td><td><select class="filter" data-document-status data-doc-index="'+docs.indexOf(d)+'" aria-label="تغییر وضعیت مدرک '+esc(d.name)+'">'+["تأیید شده","در انتظار بررسی","نیازمند تکمیل"].map(status=>'<option '+(d.status===status?'selected':'')+'>'+status+'</option>').join('')+'</select></td><td>'+esc(d.date)+'</td><td><button class="btn" data-action="document-detail" data-id="'+esc(d.case)+'">جزئیات</button></td></tr>').join('');
 return '<div class="grid">'+stat("کل مدارک",docs.length,"▧","","داده‌های نمایشی")+stat("تأیید شده",docs.filter(d=>d.status==="تأیید شده").length,"✓","","بر اساس فهرست")+stat("در انتظار بررسی",docs.filter(d=>d.status==="در انتظار بررسی").length,"◷","amber","نیازمند بررسی کارشناسی")+stat("نیازمند تکمیل",docs.filter(d=>d.status==="نیازمند تکمیل").length,"!","purple","پیگیری از مشتری")+'</div><div class="card table-card"><div class="card-head"><h2>فهرست مدارک اخیر</h2><span class="muted">اطلاعات نمایشی</span></div><div class="table-tools"><input class="field" id="document-search" style="max-width:350px" placeholder="جست‌وجوی نام مدرک یا شماره پرونده" value="'+esc(documentFilter)+'"></div>'+table(["عنوان مدرک","شماره پرونده","دسته‌بندی","وضعیت","تاریخ ثبت","عملیات"],rows)+'</div><div class="notice" style="margin-top:15px">بارگذاری فایل، اسکن بدافزار، سطح دسترسی و نگهداری امن اسناد پس از اتصال سرویس ذخیره‌سازی پیاده‌سازی می‌شود. فعلاً هیچ فایلی بارگذاری نمی‌شود.</div>';
}
function renderDocumentForm(){
 setMeta("اسناد و مدارک / افزودن مدرک",'<button class="btn" data-link="/documents">← بازگشت به فهرست</button>');
 return '<div class="card"><h2>ثبت مشخصات مدرک</h2><div class="notice">این فرم فقط مشخصات مدرک را در همین مرورگر ذخیره می‌کند؛ فایل واقعی بارگذاری نمی‌شود. اتصال فضای امن اسناد در مرحله بعد انجام خواهد شد.</div><form id="document-form"><div class="form-grid"><div class="form-row"><label>عنوان مدرک *</label><input class="field" name="name" required maxlength="120" placeholder="مثلاً تصویر کارت ملی"></div><div class="form-row"><label>شماره پرونده *</label><select class="field" name="case" required><option value="">انتخاب پرونده</option>'+applications.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.id)+' — '+esc(a.customer)+'</option>').join('')+'</select></div><div class="form-row"><label>دسته‌بندی *</label><select class="field" name="type" required><option>هویتی</option><option>مالی</option><option>ضمانت</option><option>قرارداد</option><option>سایر</option></select></div><div class="form-row"><label>وضعیت اولیه</label><select class="field" name="status"><option>در انتظار بررسی</option><option>نیازمند تکمیل</option><option>تأیید شده</option></select></div></div><div class="actions" style="margin-top:18px"><button class="btn primary" type="submit">ثبت مشخصات مدرک</button><button class="btn" type="reset">پاک کردن فرم</button></div></form></div>';
}
function renderDocumentDetail(caseId){
 const related=docs.filter(d=>d.case===caseId);
 const app=applications.find(a=>a.id===caseId);
 setMeta("اسناد و مدارک / جزئیات",'<button class="btn" data-link="/documents">← بازگشت به فهرست</button>');
 if(!related.length)return '<div class="card"><h2>مدرکی پیدا نشد</h2><button class="btn" data-link="/documents">بازگشت به فهرست</button></div>';
 return '<div class="card"><div class="card-head"><h2>مدارک پرونده '+esc(caseId)+'</h2>'+statusPill(related.every(d=>d.status==="تأیید شده")?"تأیید شده":"در انتظار بررسی")+'</div><div class="form-grid"><div class="form-row"><label>مشتری</label><div>'+esc(app?.customer||"—")+'</div></div><div class="form-row"><label>تعداد مدارک</label><div>'+related.length+'</div></div></div><div class="card-head" style="margin-top:20px"><h2>فهرست مدارک پرونده</h2></div>'+table(["عنوان مدرک","دسته‌بندی","وضعیت","تاریخ ثبت"],related.map(d=>'<tr><td>'+esc(d.name)+'</td><td>'+esc(d.type)+'</td><td>'+statusPill(d.status)+'</td><td>'+esc(d.date)+'</td></tr>').join(""))+'<div class="notice" style="margin-top:14px">فایل واقعی این مدارک در این نسخه نگهداری نمی‌شود؛ این صفحه فقط اطلاعات نمایشی را نشان می‌دهد.</div></div>';
}
function renderReports(){
 setMeta("گزارش‌ها",'<button class="btn" data-action="export-report">⇩ خروجی CSV</button>');
 const total=applications.length,waiting=applications.filter(a=>["در انتظار تأیید","در حال بررسی"].includes(a.status)).length,approved=applications.filter(a=>a.status==="تأیید شده").length,documentsPending=applications.filter(a=>a.status==="تکمیل مدارک").length;
 const rows=[["در حال بررسی",applications.filter(a=>a.status==="در حال بررسی").length,"پیگیری کارشناسی"],["تکمیل مدارک",documentsPending,"اطلاع‌رسانی به مشتری"],["در انتظار تأیید",applications.filter(a=>a.status==="در انتظار تأیید").length,"ارجاع به تأییدکننده"],["تأیید شده",approved,"آماده مرحله بعد"],["رد شده",applications.filter(a=>a.status==="رد شده").length,"اعلام نتیجه"]];
 const summary=rows.map(r=>'<tr><td>'+statusPill(r[0])+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>').join('');
 const totalAmount=applications.reduce((sum,a)=>{const raw=String(a.amount).replace(/[٬,]/g,"");const parts=raw.match(/[0-9۰-۹٫.]+/g)||[];const n=parts.map(p=>Number(p.replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace("٫","."))).reduce((x,y)=>x+y,0);return sum+n;},0);
 const pct=n=>total?Math.round(n/total*100):0;
 return '<div class="grid">'+stat("پرونده‌های ثبت‌شده",total,"▤","","بر اساس فهرست فعلی")+stat("مجموع مبلغ نمایشی",totalAmount.toLocaleString("fa-IR"),"↗","blue","جمع اعداد درج‌شده در مبالغ")+stat("تکمیل مدارک",pct(documentsPending)+"٪","✓","purple","سهم پرونده‌های نیازمند مدارک")+stat("در انتظار تصمیم",waiting,"◷","amber","در حال بررسی یا انتظار تأیید")+'</div><div class="section"><div class="card"><h2>تفکیک وضعیت پرونده‌ها</h2>'+rows.map(r=>'<div class="status-row"><span>'+esc(r[0])+'</span><b>'+r[1]+' · '+pct(r[1])+'٪</b></div><div class="progress"><span style="width:'+pct(r[1])+'%;background:'+(r[0]==="تأیید شده"?"#7589e8":r[0]==="تکمیل مدارک"?"#f2bb5b":"#35b9a5")+'"></span></div>').join('')+'</div><div class="card"><h2>راهنمای گزارش</h2><div class="notice">این گزارش از پرونده‌های نمونه‌ای که در حال حاضر در رابط کاربری وجود دارند محاسبه می‌شود و آمار سازمانی واقعی نیست.</div><div class="setting-row"><div>تعداد مشتریان در نمونه</div><b>'+customers.length+'</b></div><div class="setting-row"><div>تعداد پرونده‌های تأییدشده</div><b>'+approved+'</b></div><div class="setting-row"><div>پرونده‌های نیازمند مدارک</div><b>'+documentsPending+'</b></div></div></div><div class="card table-card"><h2>خلاصه درخواست‌ها</h2>'+table(["وضعیت","تعداد","اقدام پیشنهادی"],summary)+'</div>';
}
function renderSettings(){
 const roleOptions=["مدیر","معاون","قراردادها","پذیرش"];
 const bankRows=bankCatalog.map((bank,index)=>'<tr><td>'+esc(bank)+'</td><td><button type="button" class="btn danger" data-action="delete-bank" data-bank-index="'+index+'">حذف</button></td></tr>').join("");
 const staffRows=staff.map((person,index)=>'<tr><td>'+esc(person.name)+'</td><td><span class="pill">'+esc(person.role)+'</span></td><td>'+esc(person.phone||"—")+'</td><td>'+esc(person.status||"فعال")+'</td><td><button type="button" class="btn danger" data-action="delete-staff" data-staff-index="'+index+'">حذف</button></td></tr>').join("");
 setMeta("تنظیمات",'<button class="btn primary" data-action="save-settings">ذخیره ترجیحات</button>');
 return '<div class="section" style="margin-top:0"><div class="card"><div class="card-head"><h2>بانک‌های قابل انتخاب</h2><span class="muted">'+bankCatalog.length+' بانک</span></div><p class="muted">بانک‌های این فهرست در بخش حساب‌های بانکی پروفایل مشتری قابل انتخاب هستند.</p><div class="table-wrap">'+table(["نام بانک","عملیات"],bankRows)+'</div><section class="profile-section"><h2>افزودن بانک</h2><form id="bank-catalog-form"><div class="form-grid"><div class="form-row"><label>نام بانک *</label><input class="field" name="bankCatalogName" required maxlength="100" placeholder="مثلاً بانک تجارت"></div></div><div class="actions" style="margin-top:14px"><button class="btn primary" type="submit">＋ افزودن بانک</button></div></form></section></div><div class="card"><div class="card-head"><h2>کارمندان و نقش‌ها</h2><span class="muted">'+staff.length+' کارمند</span></div><div class="notice">در این بخش می‌توانید فهرست کارکنان و نقش سازمانی آن‌ها را مدیریت کنید. این نقش‌ها فعلاً برای دسته‌بندی و نمایش هستند و هنوز مجوزهای واقعی دسترسی را کنترل نمی‌کنند.</div><div class="table-wrap">'+table(["نام کارمند","نقش","شماره تماس","وضعیت","عملیات"],staffRows)+'</div><section class="profile-section"><h2>افزودن کارمند</h2><form id="staff-form"><div class="form-grid"><div class="form-row"><label>نام و نام خانوادگی *</label><input class="field" name="staffName" required placeholder="نام کامل کارمند"></div><div class="form-row"><label>نقش سازمانی *</label><select class="field" name="staffRole" required>'+roleOptions.map(r=>'<option>'+r+'</option>').join("")+'</select></div><div class="form-row"><label>شماره تماس (اختیاری)</label><input class="field" name="staffPhone" inputmode="tel" placeholder="شماره تماس"></div><div class="form-row"><label>وضعیت</label><select class="field" name="staffStatus"><option>فعال</option><option>غیرفعال</option></select></div></div><div class="actions" style="margin-top:14px"><button class="btn primary" type="submit">＋ ثبت کارمند</button></div></form></section></div><div class="card"><h2>تنظیمات عمومی</h2><div class="setting-row"><div>عنوان سامانه<small>نامی که در پنل نمایش داده می‌شود</small></div><input class="field" style="max-width:220px" value="سامانه امید"></div><div class="setting-row"><div>زبان رابط کاربری<small>زبان نمایش پنل</small></div><select class="field" style="max-width:180px"><option>فارسی</option></select></div><div class="setting-row"><div>منطقه زمانی<small>زمان نمایش رویدادها</small></div><select class="field" style="max-width:180px"><option>Asia/Tehran</option></select></div></div><div class="card"><h2>وضعیت اتصال</h2><div class="setting-row"><div>رابط برنامه‌نویسی (API)<small>اتصال به بک‌اند Django</small></div>'+statusPill("هنوز متصل نیست")+'</div><div class="setting-row"><div>پایگاه داده<small>PostgreSQL</small></div>'+statusPill("در انتظار اتصال")+'</div><div class="setting-row"><div>درگاه پیامک<small>قابل تنظیم در مرحله بعد</small></div>'+statusPill("پیکربندی نشده")+'</div></div></div><div class="card" style="margin-top:15px"><h2>امنیت و دسترسی</h2><div class="notice">قبل از استفاده عملیاتی، ورود امن، نقش‌ها و مجوزها، ثبت رویدادهای ممیزی و مدیریت اسرار محیط باید تکمیل و آزموده شوند.</div><div class="setting-row"><div>احراز هویت کاربران<small>ورود و نشست امن</small></div><span class="pill wait">در حال توسعه</span></div><div class="setting-row"><div>ثبت رویدادهای ممیزی<small>ردیابی تغییرات پرونده‌ها</small></div><span class="pill wait">در حال توسعه</span></div></div>';
}
function renderCustomerDetail(id){
 const c=customers.find(x=>x.id===id);if(!c)return '<div class="card">مشتری پیدا نشد.</div>';
 setMeta("مشتریان / پروفایل مشتری",'<button class="btn" data-link="/customers">← بازگشت به فهرست</button><button class="btn primary" data-link="/customers/'+encodeURIComponent(c.id)+'/edit">ویرایش پروفایل</button>');
 const related=applications.filter(a=>a.customer===c.name);
 const addresses=Array.isArray(c.addresses)?c.addresses:[],phones=Array.isArray(c.phones)&&c.phones.length?c.phones:[{title:"شماره اصلی",number:c.phone||""}],banks=Array.isArray(c.bankAccounts)?c.bankAccounts:[],documents=Array.isArray(c.documents)?c.documents:[];
 const info=(label,value)=>'<div class="form-row"><label>'+label+'</label><div>'+esc(value||"—")+'</div></div>';
 const addressHtml=addresses.length?addresses.map(a=>'<div class="profile-info-card"><b>'+esc(a.title||"آدرس")+'</b><p>'+esc(a.value||"—")+'</p><small>کدپستی: '+esc(a.postalCode||"—")+'</small></div>').join(""):'<div class="empty">آدرسی ثبت نشده است.</div>';
 const phoneHtml=phones.length?phones.map(p=>'<div class="profile-info-card"><b>'+esc(p.title||"شماره تماس")+'</b><p dir="ltr">'+esc(p.number||"—")+'</p></div>').join(""):'<div class="empty">شماره‌ای ثبت نشده است.</div>';
 const bankHtml=banks.length?banks.map(b=>'<div class="profile-info-card"><b>'+esc(b.bank||"بانک")+'</b><p>'+esc(b.title||"حساب بانکی")+'</p><small>شماره حساب: '+esc(b.accountNumber||"—")+'</small></div>').join(""):'<div class="empty">حساب بانکی ثبت نشده است.</div>';
 const docHtml=documents.length?documents.map(d=>'<div class="profile-document-card"><div class="profile-document-preview">'+(d.dataUrl&&String(d.dataUrl).startsWith("data:image/")?'<a href="'+esc(d.dataUrl)+'" target="_blank" rel="noopener"><img src="'+esc(d.dataUrl)+'" alt="'+esc(d.title||d.type||"مدرک مشتری")+'"></a>':d.dataUrl?'<a class="btn" href="'+esc(d.dataUrl)+'" target="_blank" rel="noopener">مشاهده / بازکردن فایل</a>':'<span class="muted">فایلی پیوست نشده</span>')+'</div><div><b>'+esc(d.title||d.type||"مدرک")+'</b><p class="muted">'+esc(d.type||"سایر")+'</p><small>'+esc(d.fileName||"")+'</small></div></div>').join(""):'<div class="empty">هنوز مدرکی به پروفایل مشتری افزوده نشده است.</div>';
 return '<div class="card"><div class="card-head"><div><h2>'+esc(c.name)+'</h2><span class="muted">کد مشتری: '+esc(c.id)+'</span></div>'+statusPill(c.status)+'</div><section class="profile-section"><h2>اطلاعات هویتی</h2><div class="form-grid">'+info("نوع مشتری",c.type)+info("نام",c.firstName||c.name)+info("نام خانوادگی",c.lastName)+info("کد ملی",c.nationalId)+info("تاریخ تولد",c.birthDate)+info("نام پدر",c.fatherName)+info("شغل",c.occupation)+info("کدپستی اصلی",c.postalCode)+info("ایمیل",c.email)+info("مسئول پرونده",c.manager)+info("سامانه ثنا",c.sana?"ثبت‌نام دارد":"ثبت‌نام نشده / نامشخص")+info("یادداشت",c.notes)+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>آدرس‌ها</h2><span class="muted">'+addresses.length+' مورد</span></div><div class="profile-info-grid">'+addressHtml+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>شماره‌های تماس</h2><span class="muted">'+phones.length+' مورد</span></div><div class="profile-info-grid">'+phoneHtml+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>حساب‌های بانکی</h2><span class="muted">'+banks.length+' مورد</span></div><div class="profile-info-grid">'+bankHtml+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>مدارک مشتری</h2><span class="muted">'+documents.length+' مدرک</span><button class="btn primary" data-link="/customers/'+encodeURIComponent(c.id)+'/edit">افزودن / مدیریت مدارک</button></div><div class="profile-document-grid">'+docHtml+'</div></section><section class="profile-section"><div class="card-head"><h2>پرونده‌های مرتبط</h2><span class="muted">'+related.length+' مورد</span></div>'+(related.length?table(["شماره پرونده","نوع تسهیلات","مبلغ","وضعیت","عملیات"],related.map(a=>'<tr><td class="id">'+esc(a.id)+'</td><td>'+esc(a.type)+'</td><td>'+esc(a.amount)+'</td><td>'+statusPill(a.status)+'</td><td><button class="btn" data-action="application-detail" data-id="'+esc(a.id)+'">مشاهده</button></td></tr>').join("")):'<div class="empty">هنوز پرونده‌ای برای این مشتری ثبت نشده است.</div>')+'<div class="actions" style="margin-top:18px"><button class="btn primary" data-link="/applications/new?customerId='+encodeURIComponent(c.id)+'">ایجاد پرونده تسهیلات</button></div></section></div>';
}
function renderApplicationDetail(id){
 const a=applications.find(x=>x.id===id);if(!a)return '<div class="card">پرونده پیدا نشد.</div>';
 setMeta("درخواست‌ها / جزئیات پرونده",'<button class="btn" data-link="/applications">← بازگشت</button>');
 const relatedDocs=docs.filter(d=>d.case===a.id);
 const docRows=relatedDocs.map(d=>'<tr><td>'+esc(d.name)+'</td><td>'+esc(d.type)+'</td><td>'+statusPill(d.status)+'</td><td>'+esc(d.date)+'</td></tr>').join('');
 const activity=(a.activity||[]).slice().reverse().map(ev=>'<div class="task"><span class="k-icon blue">◷</span><div style="flex:1"><b>'+esc(ev.type)+'</b><small>'+esc(ev.text)+'</small><small>'+esc(ev.date)+'</small></div></div>').join('');
 return '<div class="card"><div class="card-head"><h2>پرونده '+esc(a.id)+'</h2>'+statusPill(a.status)+'</div><div class="form-grid"><div class="form-row"><label>مشتری</label><div>'+esc(a.customer)+'</div></div><div class="form-row"><label>نوع تسهیلات</label><div>'+esc(a.type)+'</div></div><div class="form-row"><label>مبلغ درخواستی</label><div>'+esc(a.amount)+'</div></div><div class="form-row"><label>مسئول پرونده</label><div>'+esc(a.manager)+'</div></div><div class="form-row"><label>تاریخ ثبت</label><div>'+esc(a.date)+'</div></div></div><div class="setting-row"><div>تغییر وضعیت پرونده<small>هر تغییر در تاریخچه همین نشست ثبت می‌شود</small></div><select class="field" id="application-detail-status" data-app-id="'+esc(a.id)+'" style="max-width:220px"><option '+(a.status==="در حال بررسی"?"selected":"")+'>در حال بررسی</option><option '+(a.status==="در انتظار تأیید"?"selected":"")+'>در انتظار تأیید</option><option '+(a.status==="تکمیل مدارک"?"selected":"")+'>تکمیل مدارک</option><option '+(a.status==="تأیید شده"?"selected":"")+'>تأیید شده</option><option '+(a.status==="رد شده"?"selected":"")+'>رد شده</option></select></div><div class="card" style="margin-top:18px"><div class="card-head"><h2>مدارک مرتبط</h2><span class="muted">'+relatedDocs.length+' مدرک</span></div>'+ (docRows?table(["نام مدرک","نوع","وضعیت","تاریخ"],docRows):'<div class="empty">مدرکی برای این پرونده در داده نمونه ثبت نشده است.</div>')+'<div class="actions"><button class="btn" data-link="/documents">رفتن به مدیریت مدارک</button></div></div><div class="section"><div class="card"><h2>ثبت یادداشت پیگیری</h2><form id="application-note-form" data-app-id="'+esc(a.id)+'"><div class="form-row"><label>یادداشت *</label><textarea class="field" name="note" required maxlength="1000" placeholder="نتیجه تماس، اقدام بعدی یا نکته پرونده..."></textarea></div><div class="actions" style="margin-top:12px"><button class="btn primary" type="submit">ثبت یادداشت</button></div></form></div><div class="card"><h2>تاریخچه پرونده</h2><div class="task-list">'+(activity||'<div class="empty">هنوز رویدادی ثبت نشده است.</div>')+'</div></div></div><div class="notice">این تاریخچه و یادداشت‌ها فقط در حافظه موقت رابط کاربری هستند. برای استفاده واقعی، ذخیره‌سازی سمت سرور، کنترل دسترسی و گزارش ممیزی لازم است.</div><div class="actions"><button class="btn" data-link="/workflow">مشاهده گردش کار</button></div></div>';
}
function render(){
 let path=location.pathname; while(path.length>1&&path.endsWith("/"))path=path.slice(0,-1);
 let page=path.split("/")[1]||"dashboard";
 if(page==="new")page=path.split("/")[0]==="customers"?"customers":"applications";
 if(!pageInfo[page])page="dashboard";
 currentPage=page;
 document.getElementById("page-title").textContent=pageInfo[page][0];
 document.getElementById("page-subtitle").textContent=pageInfo[page][1];
 document.querySelectorAll(".menu a").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
 document.getElementById("global-search").placeholder=page==="customers"?"جست‌وجوی مشتری...":page==="applications"?"جست‌وجوی پرونده...":"جست‌وجو در صفحه...";
 let html="";
 if(path.startsWith("/customers/")&&path.endsWith("/edit")) html=renderCustomers();
 else if(path==="/documents/new") html=renderDocumentForm();
 else if(path.startsWith("/documents/")) html=renderDocumentDetail(decodeURIComponent(path.split("/")[2]||""));
 else if(path.startsWith("/customers/")&&!path.endsWith("/new")) html=renderCustomerDetail(decodeURIComponent(path.split("/")[2]||""));
 else if(path.startsWith("/applications/")&&!path.endsWith("/new")) html=renderApplicationDetail(decodeURIComponent(path.split("/")[2]||""));
 else if(page==="dashboard")html=renderDashboard();
 else if(page==="customers")html=renderCustomers();
 else if(page==="applications")html=renderApplications();
 else if(page==="workflow")html=renderWorkflow();
 else if(page==="documents")html=renderDocuments();
 else if(page==="reports")html=renderReports();
 else if(page==="settings")html=renderSettings();
 document.getElementById("content").innerHTML=html;
 document.getElementById("global-search").value="";
}
// اگر داده‌های محلی قدیمی یا ناسازگار باشند، خطا نباید بخش اصلی صفحه را خالی بگذارد.
const renderPage = render;
render = function(){
 try { renderPage(); }
 catch(error) {
  console.error("Omid render failed", error);
  const content = document.getElementById("content");
  if(content) content.innerHTML = '<div class="card"><h2>بارگذاری صفحه با مشکل مواجه شد</h2><p class="muted">داده‌های نمایشی این مرورگر با نسخه فعلی سازگار نیستند. صفحه را یک بار بازخوانی کنید؛ اگر مشکل ادامه داشت، داده‌های محلی نسخه نمایشی را پاک‌سازی می‌کنیم.</p><button class="btn primary" type="button" onclick="location.reload()">بارگذاری دوباره</button></div>';
 }
};
function navigate(path){if(!path||typeof path!=="string")return;try{const target=new URL(path,location.origin);if(target.origin!==location.origin){location.href=target.href;return;}location.href=target.pathname+target.search+target.hash;}catch(error){console.error("Omid navigation failed",error);location.href=path;}}
function toast(message){const el=document.getElementById("toast");el.textContent=message;el.style.display="block";clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.style.display="none",3200);}
document.addEventListener("click",e=>{
 const customerPick=e.target.closest("[data-action=\"select-application-customer\"]");
 if(customerPick){
  const customer=customers.find(c=>c.id===customerPick.dataset.customerId);
  if(customer){const search=document.getElementById("application-customer-search"),idField=document.getElementById("application-customer-id"),nameField=document.getElementById("application-customer-name"),results=document.getElementById("application-customer-results"),label=document.getElementById("application-customer-selected");if(search)search.value=customer.name+" · "+customer.id;if(idField)idField.value=customer.id;if(nameField)nameField.value=customer.name;if(results)results.innerHTML=applicationCustomerResults(customer.name,customer.id);if(label)label.textContent="مشتری انتخاب‌شده: "+customer.name+" · "+customer.id;}
  return;
 }
 const link=e.target.closest("[data-link]");
 if(link){const destination=link.dataset.link||link.getAttribute("href");if(destination){e.preventDefault();navigate(destination);}return;}
 const anchor=e.target.closest("a[data-page]");
 if(anchor){e.preventDefault();navigate(anchor.getAttribute("href"));return;}
 const action=e.target.closest("[data-action]");
 if(action){
  const act=action.dataset.action;
  if(act==="add-profile-row"){
   const kind=action.dataset.kind;
   const target=kind==="address"?"profile-addresses":kind==="phone"?"profile-phones":"profile-banks";
   const container=document.getElementById(target);
   if(container)container.insertAdjacentHTML("beforeend",profileRows([{}],kind));
  }
  if(act==="add-customer-doc"){
   document.getElementById("profile-documents")?.insertAdjacentHTML("beforeend",customerDocumentRow());
  }
  if(act==="remove-profile-row"){
   const row=action.closest("[data-profile-row], [data-customer-doc-row]");
   if(row){
    const parent=row.parentElement;
    row.remove();
    if(parent&&!parent.children.length){
     if(parent.id==="profile-addresses")parent.innerHTML=profileRows([{}],"address");
     if(parent.id==="profile-phones")parent.innerHTML=profileRows([{}],"phone");
     if(parent.id==="profile-banks")parent.innerHTML=profileRows([{}],"bank");
     if(parent.id==="profile-documents")parent.innerHTML=customerDocumentRow();
    }
   }
  }
  if(act==="delete-bank"){
   const idx=Number(action.dataset.bankIndex);
   if(Number.isInteger(idx)&&idx>=0&&idx<bankCatalog.length){const removed=bankCatalog.splice(idx,1)[0];persistDemoData();document.getElementById("content").innerHTML=renderSettings();toast("بانک از فهرست انتخاب حذف شد. حساب‌های قبلی مشتریان تغییر نمی‌کنند.");}
  }
  if(act==="delete-staff"){
   const idx=Number(action.dataset.staffIndex);
   if(Number.isInteger(idx)&&idx>=0&&idx<staff.length){
    const removed=staff[idx];
    staff.splice(idx,1);
    persistDemoData();
    document.getElementById("content").innerHTML=renderSettings();
    toast("کارمند "+removed.name+" از فهرست حذف شد.");
   }
  }
  if(act==="refresh"){render();toast("صفحه با داده‌های نمایشی فعلی به‌روزرسانی شد.");}
  if(act==="delete-task"){const idx=Number(action.dataset.taskId);if(Number.isInteger(idx)&&idx>=0&&idx<tasks.length){tasks.splice(idx,1);persistDemoData();document.getElementById("content").innerHTML=renderWorkflow();toast("وظیفه حذف شد و در همین مرورگر ذخیره شد.");}}
  if(act==="customer-detail")navigate("/customers/"+encodeURIComponent(action.dataset.id));
  if(act==="application-detail")navigate("/applications/"+encodeURIComponent(action.dataset.id));
  if(act==="document-detail")navigate("/documents/"+encodeURIComponent(action.dataset.id));
  if(act==="upload-demo")navigate("/documents/new");
  if(act==="save-settings")try{localStorage.setItem("omid-ui-preferences",JSON.stringify({title:"سامانه امید",language:"fa",timezone:"Asia/Tehran"}));toast("ترجیحات رابط در همین مرورگر ذخیره شد.");}catch(error){toast("ذخیره ترجیحات در این مرورگر ممکن نیست.");}
  if(act==="export-report"||act==="export-applications"||act==="export-customers"){
   const isCustomers=act==="export-customers";
   const headers=isCustomers?["کد مشتری","نام","نوع","تلفن","ایمیل","مسئول","وضعیت"]:["شماره پرونده","مشتری","نوع تسهیلات","مبلغ","وضعیت"];
   const rows=isCustomers?customers.map(c=>[c.id,c.name,c.type,c.phone,c.email,c.manager,c.status]):applications.map(a=>[a.id,a.customer,a.type,a.amount,a.status]);
   const csv=[headers,...rows].map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\\n");
   const blob=new Blob(["\\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=isCustomers?"omid-customers.csv":act==="export-applications"?"omid-applications.csv":"omid-report.csv";link.click();URL.revokeObjectURL(url);
  }
 }
});
document.addEventListener("input",e=>{
 if(e.target.id==="customer-search"){customerFilter=e.target.value;const pos=e.target.selectionStart;const html=renderCustomers();document.getElementById("content").innerHTML=html;const next=document.getElementById("customer-search");next.focus();next.setSelectionRange(pos,pos);}
 if(e.target.id==="application-search"){applicationFilter=e.target.value;const pos=e.target.selectionStart;const html=renderApplications();document.getElementById("content").innerHTML=html;const next=document.getElementById("application-search");next.focus();next.setSelectionRange(pos,pos);}
 if(e.target.id==="document-search"){documentFilter=e.target.value;const pos=e.target.selectionStart;document.getElementById("content").innerHTML=renderDocuments();const next=document.getElementById("document-search");next.focus();next.setSelectionRange(pos,pos);}
 if(e.target.id==="application-customer-search"){
  const query=e.target.value;const idField=document.getElementById("application-customer-id"),nameField=document.getElementById("application-customer-name"),results=document.getElementById("application-customer-results"),label=document.getElementById("application-customer-selected");if(idField)idField.value="";if(nameField)nameField.value="";if(label)label.textContent="برای ادامه، یکی از نتایج جست‌وجو را انتخاب کنید.";if(results)results.innerHTML=applicationCustomerResults(query,"");
 }
 if(e.target.id==="global-search"){
  const q=e.target.value.trim();
  if(currentPage==="customers"){customerFilter=q;document.getElementById("content").innerHTML=renderCustomers();}
  else if(currentPage==="applications"){applicationFilter=q;document.getElementById("content").innerHTML=renderApplications();}
  else if(q){document.querySelectorAll("#content tr, #content .task").forEach(el=>el.hidden=!el.textContent.includes(q));}
 }
});
document.addEventListener("change",e=>{
 if(e.target.matches('input[name="customerDocFile"]')){
  const file=e.target.files?.[0],preview=e.target.closest("[data-customer-doc-row]")?.querySelector(".profile-doc-preview");
  if(preview&&file){
   if(file.size>3*1024*1024){e.target.value="";toast("هر فایل باید حداکثر ۳ مگابایت باشد.");return;}
   if(file.type.startsWith("image/")){
    const reader=new FileReader();reader.onload=()=>{preview.innerHTML='<img src="'+String(reader.result).replace(/"/g,"&quot;")+'" alt="پیش‌نمایش مدرک">';};reader.readAsDataURL(file);
   }else preview.textContent="فایل انتخاب شد: "+file.name;
  }
 }
 if(e.target.id==="customer-type"){customerTypeFilter=e.target.value;document.getElementById("content").innerHTML=renderCustomers();}
 if(e.target.id==="application-status"){applicationStatusFilter=e.target.value;document.getElementById("content").innerHTML=renderApplications();}
 if(e.target.id==="application-detail-status"){const item=applications.find(a=>a.id===e.target.dataset.appId);if(item&&item.status!==e.target.value){const previous=item.status;item.status=e.target.value;item.activity=item.activity||[];item.activity.push({type:"تغییر وضعیت",text:"وضعیت از «"+previous+"» به «"+item.status+"» تغییر کرد.",date:new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short"}).format(new Date())});persistDemoData();toast("وضعیت و تاریخچه پرونده ذخیره شد.");render();}}
 if(e.target.matches("[data-document-status]")){const doc=docs[Number(e.target.dataset.docIndex)];if(doc){doc.status=e.target.value;persistDemoData();document.getElementById("content").innerHTML=renderDocuments();toast("وضعیت مدرک در همین مرورگر ذخیره شد.");}}
 if(e.target.matches("[data-task]")){
  const t=tasks[Number(e.target.dataset.task)];if(t){t.done=e.target.checked;persistDemoData();toast(t.done?"وظیفه انجام‌شده ذخیره شد.":"وظیفه به فهرست بازگشت و ذخیره شد.");}
 }
});
document.addEventListener("submit",async e=>{
 if(e.target.id==="bank-catalog-form"){
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target).entries());
  const name=String(data.bankCatalogName||"").trim();
  if(!name)return;
  if(bankCatalog.some(b=>b.toLocaleLowerCase("fa")===name.toLocaleLowerCase("fa"))){toast("این بانک قبلاً در فهرست ثبت شده است.");return;}
  bankCatalog.push(name);persistDemoData();document.getElementById("content").innerHTML=renderSettings();toast("بانک جدید به فهرست انتخاب اضافه شد.");
 }
 if(e.target.id==="staff-form"){
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target).entries());
  const name=String(data.staffName||"").trim();
  const role=String(data.staffRole||"").trim();
  if(!name||!role){toast("نام و نقش کارمند را وارد کنید.");return;}
  if(staff.some(p=>p.name.trim()===name&&p.role===role)){toast("این کارمند با همین نقش قبلاً ثبت شده است.");return;}
  staff.push({name,role,phone:String(data.staffPhone||"").trim(),status:data.staffStatus||"فعال"});
  persistDemoData();
  document.getElementById("content").innerHTML=renderSettings();
  toast("کارمند در فهرست تنظیمات ثبت شد.");
 }
 if(e.target.id==="task-form"){
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target).entries());
  const title=String(data.title||"").trim();
  if(!title)return;
  tasks.unshift({title,owner:data.owner||"تعیین نشده",due:data.due||"بدون سررسید",priority:data.priority||"عادی",done:false});
  persistDemoData();
  document.getElementById("content").innerHTML=renderWorkflow();
  toast("وظیفه در همین مرورگر ذخیره شد.");
 }
 if(e.target.id==="customer-form"){
  e.preventDefault();
  const form=e.target;
  const data=Object.fromEntries(new FormData(form).entries());
  const editId=form.dataset.editId;
  const collectRows=(selector,kind)=>{
   return [...form.querySelectorAll(selector)].map(row=>{
    const val=name=>String(row.querySelector('[name="'+name+'"]')?.value||"").trim();
    if(kind==="address")return {title:val("addressTitle"),value:val("addressValue"),postalCode:val("addressPostal")};
    if(kind==="phone")return {title:val("phoneTitle"),number:val("phoneValue")};
    return {bank:val("bankName"),accountNumber:val("bankNumber"),title:val("bankTitle")};
   }).filter(x=>Object.values(x).some(v=>v));
  };
  const documents=[];
  for(const row of form.querySelectorAll("[data-customer-doc-row]")){
   const type=row.querySelector('[name="customerDocType"]')?.value||"سایر";
   const title=String(row.querySelector('[name="customerDocTitle"]')?.value||"").trim();
   const file=row.querySelector('[name="customerDocFile"]')?.files?.[0];
   let dataUrl=row.querySelector('[name="customerDocExistingUrl"]')?.value||"";
   let fileName=row.querySelector('[name="customerDocExistingName"]')?.value||"";
   if(file){
    if(file.size>3*1024*1024){toast("هر فایل باید حداکثر ۳ مگابایت باشد.");return;}
    dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=reject;reader.readAsDataURL(file);});
    fileName=file.name;
   }
   if(title||file||dataUrl)documents.push({type,title:title||fileName||type,fileName,dataUrl});
  }
  const firstName=String(data.firstName||"").trim();
  const lastName=String(data.lastName||"").trim();
  const name=(firstName+" "+lastName).trim();
  if(!name){toast("نام مشتری را وارد کنید.");return;}
  const profile={
   name,type:data.type||"حقیقی",firstName,lastName,nationalId:String(data.nationalId||"").trim(),
   birthDate:data.birthDate||"",fatherName:String(data.fatherName||"").trim(),occupation:String(data.occupation||"").trim(),
   postalCode:String(data.postalCode||"").trim(),email:String(data.email||"").trim(),
   manager:data.manager||"تعیین نشده",status:data.status||"فعال",notes:String(data.notes||"").trim(),
   sana:form.querySelector('[name="sana"]')?.checked===true,
   addresses:collectRows('[data-profile-row="address"]',"address"),
   phones:collectRows('[data-profile-row="phone"]',"phone"),
   bankAccounts:collectRows('[data-profile-row="bank"]',"bank"),
   documents
  };
  profile.phone=profile.phones[0]?.number||"";
  if(editId){
   const existing=customers.find(c=>c.id===editId);
   if(existing)Object.assign(existing,profile);
   persistDemoData();
   customerFilter="";customerTypeFilter="";navigate("/customers/"+encodeURIComponent(editId));
   toast("پروفایل مشتری در همین مرورگر ذخیره شد.");
  }else{
   const id="CU-1405-"+String(313+customers.length-5).padStart(4,"0");
   customers.unshift({id,...profile});
   persistDemoData();
   customerFilter="";customerTypeFilter="";navigate("/customers/"+encodeURIComponent(id));
   toast("پروفایل مشتری ایجاد و در همین مرورگر ذخیره شد.");
  }
 }
 if(e.target.id==="application-note-form"){
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target).entries());
  const item=applications.find(a=>a.id===e.target.dataset.appId);
  const note=String(data.note||"").trim();
  if(item&&note){item.activity=item.activity||[];item.activity.push({type:"یادداشت پیگیری",text:note,date:new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short"}).format(new Date())});persistDemoData();render();toast("یادداشت به تاریخچه نمایشی پرونده اضافه شد؛ ذخیره دائمی نیست.");}
 }
 if(e.target.id==="document-form"){
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target).entries());
  const name=String(data.name||"").trim();
  if(!name||!data.case)return;
  docs.unshift({name,case:data.case,type:data.type||"سایر",status:data.status||"در انتظار بررسی",date:new Intl.DateTimeFormat("fa-IR").format(new Date())});
  persistDemoData();
  documentFilter="";
  navigate("/documents");
  toast("مشخصات مدرک در همین مرورگر ذخیره شد؛ فایل واقعی بارگذاری نشده است.");
 }
 if(e.target.id==="application-form"){
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target).entries());
  const id="OM-1405-"+String(249+applications.length-5).padStart(4,"0");
  const selectedCustomer=customers.find(c=>c.id===String(data.customerId||""));
  if(!selectedCustomer||selectedCustomer.name!==String(data.customer||"")){toast("لطفاً مشتری را از نتایج جست‌وجو انتخاب کنید.");return;}
  const created={id,customer:selectedCustomer.name,customerId:selectedCustomer.id,type:data.type,amount:Number(data.amount).toLocaleString("fa-IR")+" تومان",term:data.term||"",status:data.status||"در حال بررسی",manager:data.manager||"تعیین نشده",notes:String(data.notes||"").trim(),date:new Intl.DateTimeFormat("fa-IR").format(new Date()),activity:[]};
  created.activity.push({type:"ثبت پرونده",text:"پرونده در سامانه ثبت شد.",date:created.date});
  if(data.notes&&String(data.notes).trim())created.activity.push({type:"توضیحات اولیه",text:String(data.notes).trim(),date:created.date});
  applications.unshift(created);
  persistDemoData();
  applicationFilter="";navigate("/applications");toast("پرونده در همین مرورگر ذخیره شد.");
 }
});
document.getElementById("notifications").addEventListener("click",()=>toast("اعلان جدیدی در نسخه نمایشی وجود ندارد."));
window.addEventListener("popstate",render);
render();
</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      }
    });
  }
};
