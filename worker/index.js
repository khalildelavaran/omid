export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#12243a">
<meta name="description" content="داشبورد مدیریتی سامانه امید برای مدیریت مشتریان و پرونده‌های تسهیلات">
<title>سامانه امید | داشبورد مدیریتی</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{font-family:Vazirmatn,Tahoma,sans-serif;color:#192b45;background:#f4f7fb;font-synthesis:none;text-rendering:optimizeLegibility}
*{box-sizing:border-box}
body{margin:0;min-height:100vh}
button,input{font:inherit}
.app{min-height:100vh;display:flex}
aside{width:248px;background:#12243a;color:#d3deec;padding:27px 17px;flex-shrink:0;display:flex;flex-direction:column}
.brand{font-size:25px;font-weight:800;color:#fff;padding:0 12px 31px;display:flex;align-items:center;gap:10px}
.brand-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;background:#52d6c4;color:#12243a;font-size:20px}
.brand span{color:#52d6c4}
.menu{display:grid;gap:7px}
.menu a{padding:13px 15px;border-radius:10px;color:#c6d2e2;text-decoration:none;font-size:13px;transition:background .15s}
.menu a.active,.menu a:hover{background:#203d56;color:#fff}
.menu a.active{border-right:3px solid #52d6c4}
.side-foot{margin-top:auto;padding:22px 12px 5px;font-size:11px;color:#8ea1b8;line-height:2}
main{flex:1;min-width:0;padding:30px clamp(16px,3vw,42px);max-width:1700px;margin-inline:auto}
header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:29px;flex-wrap:wrap}
h1{font-size:25px;margin:0 0 7px;font-weight:800;letter-spacing:-.5px}
.sub{color:#8492a6;font-size:12px}
.top{display:flex;align-items:center;gap:12px}
.search-wrap{position:relative}
.search{border:1px solid #e1e8f0;background:#fff;padding:12px 15px;border-radius:11px;width:min(290px,65vw);font-size:12px;outline:none}
.search:focus{border-color:#52bfae;box-shadow:0 0 0 3px #52d6c422}
.icon-btn{border:1px solid #e1e8f0;background:#fff;border-radius:11px;width:42px;height:42px;cursor:pointer;color:#60728a}
.avatar{background:#d9f5ef;color:#167d70;border-radius:50%;width:42px;height:42px;display:grid;place-items:center;font-weight:700;font-size:15px}
.date{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid #e6ecf3;padding:9px 12px;border-radius:10px;color:#65758b;font-size:11px;margin-bottom:22px}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}
.card{background:#fff;border:1px solid #e8edf4;border-radius:16px;padding:20px;box-shadow:0 4px 15px #172d4605;min-width:0}
.k-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.k-label{color:#75849a;font-size:12px}
.k-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#e8f8f5;color:#168b7a;font-size:18px}
.k-icon.blue{background:#edf1ff;color:#6578d6}.k-icon.amber{background:#fff4e2;color:#b77a16}.k-icon.purple{background:#f3edff;color:#8866c7}
.k-value{font-size:29px;font-weight:800;margin:13px 0 8px;letter-spacing:-1px}
.trend{font-size:10px;color:#15977e}.muted{font-size:10px;color:#98a4b5}
.section{display:grid;grid-template-columns:1.45fr 1fr;gap:15px;margin-top:18px}
h2{font-size:14px;margin:0 0 20px;font-weight:700}
.card-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.select{font-size:11px;color:#728198;border:1px solid #e5ebf2;background:#fff;border-radius:8px;padding:7px 10px}
.bars{height:145px;display:flex;align-items:end;justify-content:space-around;gap:12px;border-bottom:1px solid #e8edf4;padding:0 5px}
.bar{width:10%;max-width:43px;border-radius:7px 7px 2px 2px;background:linear-gradient(180deg,#54d8c5,#279f9e);position:relative}
.bar:hover{filter:brightness(.95)}
.months{display:flex;justify-content:space-around;color:#8a97a9;font-size:10px;padding-top:10px;gap:3px}
.status-row{display:flex;justify-content:space-between;align-items:center;margin:16px 0;font-size:12px}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-left:8px}
.progress{height:7px;background:#edf1f6;border-radius:10px;overflow:hidden}
.progress span{display:block;height:100%;border-radius:10px}
.table-card{margin-top:18px}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:11px}
th{text-align:right;color:#8492a6;font-weight:500;background:#f8fafc}
td,th{padding:14px 12px;border-bottom:1px solid #edf1f6}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover{background:#fbfcfe}
.pill{display:inline-block;border-radius:20px;padding:6px 10px;font-size:10px;background:#e6f7f3;color:#14816f}
.pill.wait{background:#fff3dc;color:#a76a0b}.pill.doc{background:#edf1ff;color:#586cc0}
.case-id{font-weight:700;color:#425b78}
.tasks{display:grid;gap:14px}
.task{display:flex;align-items:flex-start;gap:10px;font-size:12px;line-height:1.8}
.task-check{width:17px;height:17px;border:1px solid #cdd8e5;border-radius:5px;flex-shrink:0;margin-top:2px}
.task small{display:block;color:#91a0b3;font-size:10px}
footer{text-align:center;padding:24px 0 8px;color:#a0acbb;font-size:10px}
@media(max-width:1100px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.section{grid-template-columns:1fr}}
@media(max-width:650px){.app{display:block}aside{width:100%;padding:15px}.brand{padding:0 8px 15px}.menu{display:flex;overflow-x:auto}.menu a{white-space:nowrap;padding:10px 12px}.side-foot{display:none}main{padding:22px 13px}h1{font-size:21px}.grid{gap:10px}.card{padding:15px}.k-value{font-size:25px}.k-icon{width:32px;height:32px}.top{width:100%}.search-wrap{flex:1}.search{width:100%}.date{margin-bottom:16px}}
</style>
</head>
<body>
<div class="app">
<aside>
  <div class="brand"><div class="brand-mark">ا</div><div>امید<span> .</span></div></div>
  <nav class="menu" aria-label="منوی اصلی">
    <a class="active" href="#dashboard">▦ &nbsp; داشبورد</a>
    <a href="#customers">♙ &nbsp; مشتریان</a>
    <a href="#cases">▤ &nbsp; درخواست‌های تسهیلات</a>
    <a href="#tasks">↻ &nbsp; گردش کار</a>
    <a href="#cases">▧ &nbsp; اسناد و مدارک</a>
    <a href="#reports">▥ &nbsp; گزارش‌ها</a>
    <a href="#settings">⚙ &nbsp; تنظیمات</a>
  </nav>
  <div class="side-foot">سامانه مدیریت مشتریان<br>نسخه نمایشی · ۱۴۰۵</div>
</aside>
<main id="dashboard">
<header>
  <div><h1>داشبورد مدیریتی</h1><div class="sub">سلام، به سامانه امید خوش آمدید</div></div>
  <div class="top">
    <div class="search-wrap"><input id="search" class="search" placeholder="جست‌وجوی مشتری یا پرونده..." aria-label="جست‌وجو"></div>
    <button class="icon-btn" type="button" aria-label="اعلان‌ها" title="اعلان‌ها">♧</button>
    <div class="avatar" title="مدیر سامانه">ا</div>
  </div>
</header>
<div class="date">◷ &nbsp; امروز، ۲۴ مهر ۱۴۰۵</div>
<div class="grid">
  <div class="card"><div class="k-head"><span class="k-label">مشتریان ثبت‌شده</span><span class="k-icon">♙</span></div><div class="k-value">۲٬۴۸۶</div><div class="trend">↗ ۱۲٪ <span class="muted">نسبت به ماه قبل</span></div></div>
  <div class="card"><div class="k-head"><span class="k-label">پرونده‌های در جریان</span><span class="k-icon blue">▤</span></div><div class="k-value">۳۲۸</div><div class="trend">↗ ۲۴ پرونده جدید <span class="muted">این هفته</span></div></div>
  <div class="card"><div class="k-head"><span class="k-label">در انتظار تأیید</span><span class="k-icon amber">◷</span></div><div class="k-value">۴۷</div><div class="muted">نیازمند بررسی کارشناسی</div></div>
  <div class="card"><div class="k-head"><span class="k-label">تکمیل مدارک</span><span class="k-icon purple">✓</span></div><div class="k-value">۸۶٪</div><div class="trend">↗ ۴٪ <span class="muted">نسبت به ماه قبل</span></div></div>
</div>
<div class="section" id="reports">
  <div class="card">
    <div class="card-head"><h2>روند درخواست‌های تسهیلات</h2><span class="select">شش ماه اخیر⌄</span></div>
    <div class="bars" aria-label="نمودار نمایشی درخواست‌ها">
      <div class="bar" style="height:38%"></div><div class="bar" style="height:55%"></div><div class="bar" style="height:45%"></div><div class="bar" style="height:72%"></div><div class="bar" style="height:63%"></div><div class="bar" style="height:91%"></div>
    </div>
    <div class="months"><span>اردیبهشت</span><span>خرداد</span><span>تیر</span><span>مرداد</span><span>شهریور</span><span>مهر</span></div>
  </div>
  <div class="card">
    <h2>وضعیت پرونده‌ها</h2>
    <div class="status-row"><span><i class="dot" style="background:#35b9a5"></i>در حال بررسی</span><b>۴۸٪</b></div>
    <div class="progress"><span style="width:48%;background:#35b9a5"></span></div>
    <div class="status-row"><span><i class="dot" style="background:#f2bb5b"></i>نیازمند مدرک</span><b>۲۵٪</b></div>
    <div class="progress"><span style="width:25%;background:#f2bb5b"></span></div>
    <div class="status-row"><span><i class="dot" style="background:#7589e8"></i>تأیید شده</span><b>۲۷٪</b></div>
    <div class="progress"><span style="width:27%;background:#7589e8"></span></div>
  </div>
</div>
<div class="card table-card" id="cases">
  <div class="card-head"><h2>آخرین پرونده‌ها</h2><span class="sub">۴ پرونده اخیر</span></div>
  <div class="table-wrap"><table id="case-table">
    <thead><tr><th>شماره پرونده</th><th>نام مشتری</th><th>نوع تسهیلات</th><th>مبلغ درخواستی</th><th>وضعیت</th></tr></thead>
    <tbody>
      <tr><td class="case-id">OM-1405-0248</td><td>علی محمدی</td><td>سرمایه در گردش</td><td>۸۰۰ میلیون تومان</td><td><span class="pill">در حال بررسی</span></td></tr>
      <tr><td class="case-id">OM-1405-0247</td><td>سارا احمدی</td><td>تسهیلات شخصی</td><td>۲۵۰ میلیون تومان</td><td><span class="pill wait">در انتظار تأیید</span></td></tr>
      <tr><td class="case-id">OM-1405-0246</td><td>رضا کریمی</td><td>اعتباری شرکتی</td><td>۱٫۲ میلیارد تومان</td><td><span class="pill doc">تکمیل مدارک</span></td></tr>
      <tr><td class="case-id">OM-1405-0245</td><td>مریم حسینی</td><td>سرمایه در گردش</td><td>۵۰۰ میلیون تومان</td><td><span class="pill">در حال بررسی</span></td></tr>
    </tbody>
  </table></div>
</div>
<div class="section" id="tasks">
  <div class="card">
    <h2>کارهای نیازمند اقدام</h2>
    <div class="tasks">
      <div class="task"><span class="task-check"></span><div>بررسی مدارک پرونده OM-1405-0247<small>امروز · اولویت بالا</small></div></div>
      <div class="task"><span class="task-check"></span><div>پیگیری تکمیل مدارک مشتری<small>امروز · اولویت متوسط</small></div></div>
      <div class="task"><span class="task-check"></span><div>بازبینی درخواست‌های در انتظار تأیید<small>فردا · اولویت متوسط</small></div></div>
    </div>
  </div>
  <div class="card" id="customers">
    <h2>دسترسی سریع</h2>
    <div class="tasks">
      <div class="task"><span class="k-icon">＋</span><div>ثبت مشتری جدید<small>افزودن به فهرست مشتریان</small></div></div>
      <div class="task"><span class="k-icon blue">▤</span><div>ایجاد پرونده تسهیلات<small>شروع درخواست جدید</small></div></div>
      <div class="task"><span class="k-icon amber">▧</span><div>بررسی اسناد<small>مدیریت مدارک پرونده‌ها</small></div></div>
    </div>
  </div>
</div>
<footer>سامانه امید · نسخه نمایشی · اطلاعات این داشبورد نمونه هستند</footer>
</main>
</div>
<script>
const search = document.getElementById("search");
const rows = [...document.querySelectorAll("#case-table tbody tr")];
search.addEventListener("input", () => {
  const query = search.value.trim().toLocaleLowerCase("fa");
  rows.forEach(row => {
    row.hidden = !row.textContent.toLocaleLowerCase("fa").includes(query);
  });
});
</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store"
      }
    });
  }
};
