export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Same-origin API bridge. The backend origin is an optional Worker
    // environment variable; never accept an upstream URL from the browser.
    if (url.pathname.startsWith("/api/")) {
      const configuredOrigin = String(env?.OMID_API_ORIGIN || "").trim();
      if (!configuredOrigin) {
        return new Response(JSON.stringify({
          detail: "اتصال بک‌اند پیکربندی نشده است. متغیر OMID_API_ORIGIN را در تنظیمات Worker تعریف کنید."
        }), {
          status: 503,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff"
          }
        });
      }

      let backend;
      try {
        backend = new URL(configuredOrigin);
      } catch (_error) {
        return new Response(JSON.stringify({ detail: "مقدار OMID_API_ORIGIN معتبر نیست." }), {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff"
          }
        });
      }

      if (backend.protocol !== "https:" || backend.username || backend.password ||
          backend.pathname !== "/" || backend.search || backend.hash) {
        return new Response(JSON.stringify({
          detail: "OMID_API_ORIGIN باید یک origin مستقل HTTPS باشد؛ مسیر، query یا اطلاعات ورود مجاز نیست."
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff"
          }
        });
      }

      try {
        const target = new URL(url.pathname + url.search, backend.origin);
        const initialRequest = new Request(target.toString(), request);
        const forwardedHeaders = new Headers(initialRequest.headers);
        forwardedHeaders.delete("host");
        forwardedHeaders.set("X-Forwarded-Host", url.host);
        forwardedHeaders.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
        const upstreamRequest = new Request(initialRequest, {
          headers: forwardedHeaders,
          redirect: "manual"
        });
        const upstreamResponse = await fetch(upstreamRequest);
        const responseHeaders = new Headers(upstreamResponse.headers);
        responseHeaders.set("Cache-Control", "no-store");
        responseHeaders.set("X-Content-Type-Options", "nosniff");

        // Keep same-origin redirects inside the Worker proxy.
        const locationHeader = responseHeaders.get("Location");
        if (locationHeader) {
          try {
            const redirectUrl = new URL(locationHeader, backend.origin);
            if (redirectUrl.origin === backend.origin) {
              responseHeaders.set(
                "Location",
                url.origin + redirectUrl.pathname + redirectUrl.search + redirectUrl.hash
              );
            }
          } catch (_error) {
            // Preserve a non-URL Location value; the upstream response is still returned.
          }
        }
        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers: responseHeaders
        });
      } catch (_error) {
        return new Response(JSON.stringify({
          detail: "ارتباط با بک‌اند برقرار نشد؛ تنظیمات origin و دسترس‌پذیری سرویس را بررسی کنید."
        }), {
          status: 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff"
          }
        });
      }
    }

    // Serve the React/Vite build configured in wrangler.toml after routing API calls.
    // The API proxy above must run first so cookies and CSRF stay same-origin.
    if (env?.ASSETS) return env.ASSETS.fetch(request);

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
.settings-tabs{display:flex;align-items:center;gap:6px;overflow-x:auto;padding:7px;background:#fff;border:1px solid #e5ebf2;border-radius:14px;margin-bottom:16px;position:sticky;top:8px;z-index:5;box-shadow:0 5px 18px #172d4608}.settings-tab{flex:0 0 auto;border:1px solid transparent;border-radius:9px;padding:10px 15px;background:transparent;color:#63748a;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap}.settings-tab:hover{background:#f4f7fb;color:#192b45}.settings-tab[aria-selected="true"]{background:#e9f7f4;border-color:#c9ebe4;color:#087e70}[data-settings-panel][hidden]{display:none!important}.settings-layout{display:block}.settings-layout>.card{margin-bottom:15px}@media(max-width:650px){.settings-tabs{top:4px;margin:0 -2px 12px;padding:5px}.settings-tab{padding:9px 12px;font-size:12px}}
.live-workflow-card{margin-top:16px;display:grid;gap:14px}.live-workflow-card .card{min-width:0}.live-case-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:14px}.live-case-summary>div{display:grid;gap:5px;background:#f8fafc;border:1px solid #e8edf4;padding:11px;border-radius:10px;min-width:0}.live-case-summary small{font-size:10px;color:#8290a4}.live-case-summary b{font-size:12px;overflow-wrap:anywhere}.live-add-party{margin-top:16px;padding:14px;border:1px solid #e7edf4;border-radius:12px}.live-add-party h3{font-size:13px;margin:0 0 12px}.live-stage-actions{display:flex;gap:5px;flex-wrap:wrap}.live-stage-actions .btn{font-size:10px;padding:6px 8px}@media(max-width:720px){.live-case-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}.case-workspace{margin-top:16px;display:grid;gap:14px}.case-workspace-header{display:grid;grid-template-columns:1fr minmax(240px,380px);align-items:center;gap:20px}.case-workspace-header h2{margin:5px 0 8px}.case-workspace-header p{margin:0;line-height:1.8}.eyebrow{font-size:10px;color:#168d7d;font-weight:700}.case-workspace-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,1fr);gap:14px;align-items:start}.case-party-list{display:grid;gap:12px}.case-party-card{border:1px solid #e7edf4;border-radius:13px;padding:14px;background:#fcfdff}.case-party-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.case-party-head h3{font-size:14px;margin:9px 0 4px}.case-party-head small,.case-party-account small{display:block;color:#8492a6;font-size:10px}.case-party-account{display:grid;gap:5px;text-align:left;max-width:45%}.case-party-account b{font-size:11px}.case-stage-list{display:grid;gap:7px}.case-stage-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;border-top:1px solid #edf1f6;padding-top:8px;font-size:11px}.case-stage-row .btn{padding:6px 8px;font-size:10px}.case-workspace-side{display:grid;gap:14px}.case-workspace-side .card{margin:0}.case-triple{display:grid;gap:10px;margin-bottom:13px}.case-triple>div{display:grid;gap:4px;background:#f8fafc;border:1px solid #edf1f6;border-radius:9px;padding:10px}.case-triple small{color:#8492a6;font-size:10px}.case-triple b{font-size:12px}.finance-metric,.case-check-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #edf1f6;font-size:11px}.finance-metric b{font-size:12px}.case-workspace-side .notice{margin:13px 0;font-size:10px}@media(max-width:900px){.case-workspace-grid{grid-template-columns:1fr}.case-workspace-header{grid-template-columns:1fr}}@media(max-width:560px){.case-stage-row{grid-template-columns:1fr auto}.case-stage-row .btn{grid-column:1/-1;justify-self:start}.case-party-head{flex-direction:column}.case-party-account{text-align:right;max-width:none}.case-workspace-header{padding:14px}}:root{font-family:Vazirmatn,Tahoma,sans-serif;color:#192b45;background:#f4f7fb;font-synthesis:none;text-rendering:optimizeLegibility}
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
.jalali-picker{position:relative;width:100%}.jalali-picker-input{cursor:pointer;background:#fff}.jalali-calendar{position:absolute;z-index:1000;top:calc(100% + 6px);right:0;width:min(310px,calc(100vw - 40px));padding:12px;background:#fff;border:1px solid #dfe7ef;border-radius:13px;box-shadow:0 12px 32px #12243a24;direction:rtl}.jalali-calendar[hidden]{display:none}.jalali-calendar-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.jalali-calendar-title{font-weight:700;font-size:13px}.jalali-calendar-nav{border:1px solid #e1e8f0;background:#f8fafc;border-radius:8px;width:32px;height:32px;cursor:pointer}.jalali-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}.jalali-calendar-grid span,.jalali-calendar-grid button{display:grid;place-items:center;min-height:32px;font-size:11px}.jalali-calendar-grid span{color:#8a97a9}.jalali-calendar-grid button{border:0;background:transparent;border-radius:7px;cursor:pointer;color:#243850}.jalali-calendar-grid button:hover{background:#e8f8f5}.jalali-calendar-grid button.selected{background:#168d7d;color:#fff}.jalali-calendar-grid button.today{outline:1px solid #168d7d}.jalali-calendar-footer{display:flex;justify-content:space-between;margin-top:9px}.jalali-calendar-footer button{border:0;background:transparent;color:#168d7d;cursor:pointer;font:inherit;font-size:11px;padding:6px}.toast{position:fixed;bottom:22px;left:22px;background:#12243a;color:white;border-radius:10px;padding:12px 16px;font-size:12px;box-shadow:0 8px 25px #12243a33;z-index:20;display:none}
footer{text-align:center;padding:24px 0 8px;color:#a0acbb;font-size:10px}
@media(max-width:1100px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.section{grid-template-columns:1fr}}
@media(max-width:650px){.profile-repeat-row,.profile-repeat-row.phone-row,.profile-doc-row,.profile-info-grid,.profile-document-grid{grid-template-columns:1fr}.profile-doc-row .profile-doc-preview{grid-column:auto}.app{display:block}aside{width:100%;min-height:0;padding:14px}.brand{padding:0 8px 14px}.menu{display:flex;overflow-x:auto}.menu a{white-space:nowrap;padding:10px 12px}.side-foot{display:none}main{padding:20px 12px}h1{font-size:21px}.grid{gap:9px}.card{padding:14px}.k-value{font-size:24px}.k-icon{width:32px;height:32px}.top{width:100%}.search{width:100%;flex:1}.form-grid{grid-template-columns:1fr}.form-row.full{grid-column:auto}.page-meta{align-items:flex-start}}
.omid-modal-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(12,28,47,.55);display:flex;align-items:center;justify-content:center;padding:20px}.omid-modal{width:min(520px,100%);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border:1px solid #e5ebf2;border-radius:18px;padding:24px;box-shadow:0 24px 80px #07182b45}.omid-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}.omid-modal-head h2{margin:0;font-size:16px}.omid-modal-actions{display:flex;justify-content:flex-start;gap:8px;margin-top:20px}.omid-modal .form-grid{grid-template-columns:1fr}.omid-modal-backdrop[hidden]{display:none!important}@media(max-width:520px){.omid-modal-backdrop{padding:12px}.omid-modal{padding:18px}}
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


/* پروفایل مشتری: چیدمان چندستونه، خوانا و کم‌اسکرول برای کار روزمره */
.customer-profile-edit-card{padding:12px 14px}
.customer-profile-edit-card>.card-head{margin-bottom:8px}
.customer-profile-edit-card>.notice{padding:6px 9px;margin-bottom:7px;font-size:12px;line-height:1.45}
.customer-profile-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:16px;row-gap:0;align-items:start}
.customer-profile-form>.profile-section:first-child{grid-column:1/-1}
.customer-profile-form .profile-section{padding-top:8px;margin-top:8px;min-width:0}
.customer-profile-form .profile-section>h2,.customer-profile-form .profile-section-head h2{font-size:17px;line-height:1.4;margin-bottom:7px}
.customer-profile-form .form-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px 10px}
.customer-profile-form .form-row{gap:3px;min-width:0}
.customer-profile-form .form-row label{font-size:14px;line-height:1.4;color:#354a63}
.customer-profile-form .field{font-size:14px;padding:6px 9px;min-height:37px;border-radius:7px}
.customer-profile-form textarea.field{min-height:48px}
.customer-profile-form .form-row.full{grid-column:1/-1}
.customer-profile-form .profile-repeat-list{gap:6px}
.customer-profile-form .profile-repeat-row,.customer-profile-form .profile-doc-row{padding:7px;gap:7px}
.customer-profile-form .profile-section-head{margin-bottom:6px}
.customer-profile-form .profile-section-head .btn{padding:7px 9px;font-size:12px}
.customer-profile-form .check-line{min-height:34px;font-size:14px}
.customer-profile-form .profile-doc-list{gap:7px}
.customer-profile-form .profile-doc-row{grid-template-columns:1fr 1fr;align-items:end}
.customer-profile-form .profile-doc-row .profile-doc-preview{grid-column:1/-1}
.customer-profile-form>.actions{grid-column:1/-1;margin-top:10px!important;position:sticky;bottom:0;z-index:4;background:#ffffffed;backdrop-filter:blur(8px);padding:8px 0;border-top:1px solid #edf1f6}
.customer-profile-form .muted{font-size:11px}
@media(max-width:1200px){.customer-profile-form .form-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:1000px){.customer-profile-form{grid-template-columns:1fr}.customer-profile-form>.profile-section:first-child{grid-column:auto}.customer-profile-form .form-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:850px){.customer-profile-form .form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){.customer-profile-edit-card{padding:12px}.customer-profile-form .form-grid{grid-template-columns:1fr}.customer-profile-form .form-row.full{grid-column:auto}.customer-profile-form .profile-repeat-row,.customer-profile-form .profile-repeat-row.phone-row,.customer-profile-form .profile-doc-row{grid-template-columns:1fr}.customer-profile-form .profile-doc-row .profile-doc-preview{grid-column:auto}.customer-profile-form>.actions{position:static;background:transparent;backdrop-filter:none}}

/* پروفایل نمایشی مشتری: چیدمان واقعی صفحه جزئیات */
.customer-detail-card{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:20px;row-gap:0;align-items:start;padding:16px 18px}
.customer-detail-card>.card-head{grid-column:1/-1;padding-bottom:12px;margin-bottom:2px;border-bottom:1px solid #e8edf4}
.customer-detail-card>.profile-section{min-width:0;padding-top:12px;margin-top:10px}
.customer-detail-card>.profile-section:nth-of-type(1),.customer-detail-card>.profile-section:nth-of-type(5),.customer-detail-card>.profile-section:nth-of-type(6){grid-column:1/-1}
.customer-detail-card>.profile-section:nth-of-type(1) .form-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:10px 12px}
.customer-detail-card>.profile-section:nth-of-type(1) .form-row{min-width:0;overflow-wrap:anywhere}
.customer-detail-card>.profile-section:nth-of-type(1) .form-row label{font-size:13px;color:#64748b;margin-bottom:4px}
.customer-detail-card>.profile-section:nth-of-type(1) .form-row>div{font-size:14px;line-height:1.6;color:#172b4d}
.customer-detail-card .profile-info-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.customer-detail-card .profile-info-card,.customer-detail-card .profile-document-card{min-width:0;border:1px solid #e6edf5;border-radius:10px;padding:10px 12px;background:#fbfdff}
.customer-detail-card .profile-section-head{gap:8px;margin-bottom:9px}
.customer-detail-card .profile-section-head h2,.customer-detail-card .card-head h2{font-size:17px}
.customer-detail-card .profile-document-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.customer-detail-actions{display:flex;flex-wrap:wrap;gap:9px;align-items:center;padding:10px 12px!important;margin:0!important;border:1px solid #dbe7f5;border-radius:12px;background:#f7faff}
.customer-detail-actions>strong{margin-inline-end:4px;color:#243b5a}
.page-meta:has(.customer-detail-actions){position:relative;justify-content:flex-start}
.page-meta:has(.customer-detail-actions)>.crumb{display:none}
.page-meta:has(.customer-detail-actions)>.actions{width:100%;justify-content:flex-end}
.page-meta:has(.customer-detail-actions)>.actions>.btn{flex:0 0 auto;min-width:0;padding:7px 9px;font-size:10px}
.customer-detail-actions{justify-content:center;max-width:100%;position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap}
@media(max-width:760px){.page-meta:has(.customer-detail-actions){display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start}.page-meta:has(.customer-detail-actions)>.actions{display:flex;width:100%;justify-content:flex-end}.page-meta:has(.customer-detail-actions)>.actions>.customer-detail-actions{position:static;left:auto;transform:none;align-self:center;white-space:normal;order:-1}}
@media(max-width:1000px){.customer-detail-card>.profile-section:nth-of-type(1) .form-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.customer-detail-card .profile-document-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.customer-detail-card{grid-template-columns:1fr;padding:12px}.customer-detail-card>.card-head,.customer-detail-card>.profile-section,.customer-detail-card>.profile-section:nth-of-type(1),.customer-detail-card>.profile-section:nth-of-type(5),.customer-detail-card>.profile-section:nth-of-type(6){grid-column:1}.customer-detail-card>.profile-section:nth-of-type(1) .form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.customer-detail-card .profile-info-grid,.customer-detail-card .profile-document-grid{grid-template-columns:1fr}}
@media(max-width:480px){.customer-detail-card>.profile-section:nth-of-type(1) .form-grid{grid-template-columns:1fr}.customer-detail-actions{align-items:stretch}.customer-detail-actions>.btn{flex:1 1 100%}}

/* Workflow wizard redesign and readable type scale */
:root{font-size:16px}body{font-size:15px;line-height:1.65}main{padding-top:30px}h1{font-size:28px;line-height:1.45}h2{font-size:18px;line-height:1.5}.sub,.crumb{font-size:14px}.menu a{font-size:15px;padding:13px 14px}.k-label{font-size:14px}.k-value{font-size:30px}.muted{font-size:13px}.btn{font-size:13px;padding:10px 15px;min-height:40px}.field,.filter,.search{font-size:14px;min-height:44px}.form-row label{font-size:14px}table{font-size:14px}td,th{padding:15px 13px}.pill{font-size:12px;padding:5px 11px}.notice{font-size:14px;line-height:1.9;padding:14px 16px}.task{font-size:14px}.task small,.setting-row small{font-size:12px}
.loan-wizard-section{margin-top:22px}.loan-wizard-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:16px;flex-wrap:wrap}.loan-wizard-section-head h2{font-size:22px;margin:4px 0 6px}.loan-wizard-section-head p{margin:0;color:#708198;font-size:15px;line-height:1.8}.loan-case-count{background:#e8f8f5;color:#147c70;border:1px solid #ccefe7;border-radius:999px;padding:8px 14px;font-size:14px;font-weight:700}.loan-wizard-list{display:grid;gap:20px}.loan-wizard-card{background:#fff;border:1px solid #e2eaf1;border-radius:20px;padding:24px;box-shadow:0 8px 28px #172d4609;min-width:0}.loan-wizard-top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:18px;border-bottom:1px solid #edf1f6}.loan-wizard-identity{display:flex;align-items:center;gap:14px;min-width:0}.loan-case-mark{width:52px;height:52px;flex-shrink:0;display:grid;place-items:center;border-radius:16px;background:#e5f7f3;color:#138777;font-size:25px}.loan-case-id{color:#168d7d;font-size:13px;font-weight:800;letter-spacing:.2px}.loan-wizard-identity h3{font-size:20px;margin:2px 0 3px;overflow-wrap:anywhere}.loan-route-caption{color:#78889d;font-size:14px}.loan-wizard-controls{display:grid;grid-template-columns:minmax(220px,.9fr) minmax(240px,1.1fr);gap:24px;align-items:end;padding:20px 0}.loan-progress-summary{display:grid;gap:8px}.loan-progress-summary>div:first-child{display:flex;justify-content:space-between;align-items:center;font-size:14px}.loan-progress-summary b{font-size:18px;color:#168d7d}.loan-progress-summary .progress{height:10px;background:#eaf0f5}.loan-progress-summary .progress span{background:linear-gradient(90deg,#32b8a4,#168d7d)}.loan-progress-summary small{font-size:12px;color:#8795a8}.loan-wizard-current{padding:20px 22px;border:1px solid #bfe9df;border-radius:16px;background:linear-gradient(115deg,#f0fbf8,#f8fcff);margin-bottom:22px}.loan-current-kicker{display:flex;align-items:center;gap:8px;color:#168777;font-size:13px;font-weight:800}.loan-current-pulse{width:9px;height:9px;border-radius:50%;background:#1ba58f;box-shadow:0 0 0 5px #1ba58f1b}.loan-wizard-current h4{font-size:20px;margin:9px 0 5px}.loan-wizard-current p{font-size:15px;line-height:1.9;color:#52657b;margin:0}.loan-current-actions{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:15px}.loan-current-actions .btn{min-height:46px;font-size:14px}.loan-stepper-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:13px;flex-wrap:wrap}.loan-stepper-heading b{font-size:16px}.loan-wizard-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.loan-wizard-step{display:flex;align-items:flex-start;gap:12px;padding:14px;border:1px solid #e7edf4;border-radius:13px;background:#fbfcfe;min-width:0}.loan-step-number{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:#edf1f5;color:#738399;font-size:14px;font-weight:800}.loan-step-copy{min-width:0;display:grid;gap:4px}.loan-step-copy b{font-size:14px;line-height:1.6}.loan-step-copy small{font-size:12px;line-height:1.6;color:#8492a6}.loan-wizard-step.is-done{background:#f2fbf8;border-color:#d5f0e8}.loan-wizard-step.is-done .loan-step-number{background:#168d7d;color:#fff}.loan-wizard-step.is-done .loan-step-copy b{color:#287d70}.loan-wizard-step.is-current{background:#fff;border:2px solid #168d7d;box-shadow:0 4px 15px #168d7d12}.loan-wizard-step.is-current .loan-step-number{background:#168d7d;color:#fff}.loan-wizard-step.is-current .loan-step-copy b{color:#116f63}.loan-wizard-step.is-locked{opacity:.72}
@media(max-width:760px){.loan-wizard-card{padding:17px}.loan-wizard-controls{grid-template-columns:1fr;gap:17px}.loan-wizard-steps{grid-template-columns:1fr}.loan-wizard-top{align-items:flex-start}.loan-wizard-identity h3{font-size:18px}.loan-wizard-current h4{font-size:18px}}@media(max-width:480px){.loan-wizard-top{flex-direction:column}.loan-wizard-top>.btn{width:100%}.loan-wizard-section-head h2{font-size:19px}.loan-wizard-current{padding:16px}.loan-current-actions{align-items:stretch}.loan-current-actions .btn{width:100%}}/* Keep every workflow step in a clear left-to-right visual sequence (RTL-aware). */
.loan-wizard-steps{display:flex;gap:12px;overflow-x:auto;padding:3px 2px 14px;scroll-snap-type:x proximity;align-items:stretch}
.loan-wizard-step{position:relative;flex:0 0 238px;scroll-snap-align:start;min-height:96px}
.loan-wizard-step:not(:last-child)::after{content:"←";position:absolute;left:-11px;top:calc(50% - 12px);z-index:2;display:grid;place-items:center;width:20px;height:24px;border-radius:8px;background:#e9f1f5;color:#7890a4;font-size:14px;font-weight:800}
.loan-wizard-step.is-current{transform:translateY(-2px)}
small{font-size:12px}
.eyebrow{font-size:12px}
.case-stage-row,.finance-metric,.case-check-row{font-size:13px}
@media(max-width:760px){.loan-wizard-steps{display:grid;grid-template-columns:1fr;overflow:visible;gap:9px}.loan-wizard-step{flex:1;min-height:0}.loan-wizard-step:not(:last-child)::after{content:"↓";left:calc(50% - 10px);top:auto;bottom:-16px;width:20px;height:20px}}
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
    <a href="/services" data-page="services">▧ &nbsp; خدمات و دریافت‌ها</a>
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
window.__OMID_REQUEST_PATH=${JSON.stringify(url.pathname)};
window.__OMID_API_PROXY_CONFIGURED=${JSON.stringify(Boolean(env?.OMID_API_ORIGIN))};
let backendSessionUser = null;
let backendSessionMessage = "نشست کارکنان هنوز بررسی نشده است.";

async function omidApiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store"
  });
  let body = {};
  try { body = await response.json(); } catch (_error) { body = {}; }
  return { response, body };
}

function omidApiErrorMessage(body, status) {
  if (body && typeof body.detail === "string" && body.detail.trim()) return body.detail;
  if (body && typeof body === "object") {
    for (const value of Object.values(body)) {
      if (typeof value === "string" && value.trim()) return value;
      if (Array.isArray(value)) {
        const first = value.find(item => typeof item === "string" && item.trim());
        if (first) return first;
      }
    }
  }
  return "درخواست به بک‌اند با وضعیت " + status + " پاسخ داده شد.";
}

async function omidApiCsrfToken() {
  const result = await omidApiRequest("/api/v1/auth/csrf/", { method: "GET" });
  if (!result.response.ok) throw new Error(omidApiErrorMessage(result.body, result.response.status));
  if (!result.body || typeof result.body.csrfToken !== "string" || !result.body.csrfToken) {
    throw new Error("توکن CSRF از بک‌اند دریافت نشد.");
  }
  return result.body.csrfToken;
}

function updateOmidSessionStatus(message) {
  backendSessionMessage = message;
  const element = document.getElementById("backend-session-status");
  if (element) element.textContent = message;
}

function omidBackendUserSummary(user) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const name = fullName || user.username || "کاربر داخلی";
  let message = "نشست فعال است: " + name + " (" + (user.username || "بدون نام کاربری") + ") · نقش: " + (user.role_label || user.role || "تعریف‌نشده");
  if (user.must_change_password) message += " · تغییر گذرواژه الزامی است.";
  return message;
}

window.addEventListener("error",function(event){
 try{
  var box=document.getElementById("omid-runtime-diagnostic");
  if(!box){box=document.createElement("div");box.id="omid-runtime-diagnostic";box.style.cssText="position:fixed;z-index:99999;inset:auto 12px 12px 12px;background:#7f1d1d;color:#fff;padding:14px;border-radius:10px;font:12px/1.8 Tahoma,sans-serif;direction:rtl;white-space:pre-wrap";
  document.body.appendChild(box);}
  box.textContent="خطای اجرای سامانه امید\\nمسیر مرورگر: "+location.pathname+"\\nمسیر پاسخ سرور: "+window.__OMID_REQUEST_PATH+"\\nپیام: "+(event.message||"خطای نامشخص")+"\\nفایل/خط: "+(event.filename||"")+" : "+(event.lineno||"");
 }catch(ignore){}
});
window.addEventListener("unhandledrejection",function(event){
 try{
  var box=document.getElementById("omid-runtime-diagnostic");
  if(!box){box=document.createElement("div");box.id="omid-runtime-diagnostic";box.style.cssText="position:fixed;z-index:99999;inset:auto 12px 12px 12px;background:#7f1d1d;color:#fff;padding:14px;border-radius:10px;font:12px/1.8 Tahoma,sans-serif;direction:rtl;white-space:pre-wrap";document.body.appendChild(box);}
  box.textContent="خطای ناهمگام سامانه امید\\nمسیر مرورگر: "+location.pathname+"\\nمسیر پاسخ سرور: "+window.__OMID_REQUEST_PATH+"\\nپیام: "+String(event.reason);
 }catch(ignore){}
});
</script>
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
const guaranteeRequests = [];
const serviceCatalog = [];
const serviceRecords = [];
const companySettings = {name:"",registrationNumber:"",nationalId:"",economicCode:"",address:"",phone:"",representative:"",representativeTitle:""};
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
  if(Array.isArray(saved.guaranteeRequests)){guaranteeRequests.splice(0,guaranteeRequests.length,...saved.guaranteeRequests);}
  if(Array.isArray(saved.serviceCatalog)){serviceCatalog.splice(0,serviceCatalog.length,...saved.serviceCatalog);}
  if(Array.isArray(saved.serviceRecords)){serviceRecords.splice(0,serviceRecords.length,...saved.serviceRecords);}
  if(Array.isArray(saved.staff)){staff.splice(0,staff.length,...saved.staff);}
  if(Array.isArray(saved.bankCatalog)){bankCatalog.splice(0,bankCatalog.length,...saved.bankCatalog);}
  if(saved.companySettings&&typeof saved.companySettings==="object"){Object.assign(companySettings,saved.companySettings);}
 }catch(error){console.warn("Omid demo data could not be restored",error);}
}
function persistDemoData(){
 try{
  localStorage.setItem(DEMO_STORAGE_KEY,JSON.stringify({customers,applications,tasks,docs,guaranteeRequests,staff,bankCatalog,companySettings,serviceCatalog,serviceRecords}));
 }catch(error){console.warn("Omid demo data could not be saved",error);toast("ذخیره محلی در این مرورگر در دسترس نیست.");}
}
restoreDemoData();
const pageInfo = {
 dashboard:["داشبورد مدیریتی","نمای کلی وضعیت مشتریان و پرونده‌های تسهیلات"],
 customers:["مدیریت مشتریان","ثبت، جست‌وجو و پیگیری اطلاعات مشتریان"],
 applications:["درخواست‌های تسهیلات","مدیریت پرونده‌های اعتباری از ثبت تا تصمیم نهایی"],
 guarantees:["درخواست ضمانت","انتخاب پرونده تسهیلات و ثبت درخواست ضمانت"],
 workflow:["گردش کار","وظایف، ارجاع‌ها و اقدام‌های در انتظار"],
 documents:["اسناد و مدارک","پیگیری وضعیت مدارک مرتبط با پرونده‌ها"],
 reports:["گزارش‌های مدیریتی","نمای کلی عملکرد و وضعیت پرونده‌ها"],
 settings:["تنظیمات سامانه","تنظیمات پایه و ترجیحات محیط کار"],
 services:["خدمات و دریافت‌ها","تعریف تعرفه‌ها، ثبت خدمات مشتریان و صدور رسید A5"]
};
let currentPage = "dashboard";
let workflowWorkspaceCaseId = "";
let liveWorkflowData = {loaded:false, applications:[], parties:[], stages:[], customers:[], meratAssessments:[], disbursements:[], selectedId:"", loading:false};
let customerFilter = "";
let customerTypeFilter = "";
let applicationFilter = "";
let applicationStatusFilter = "";
let documentFilter = "";
function esc(value){return String(value).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const persianDigits="۰۱۲۳۴۵۶۷۸۹",latinDigits="0123456789",faMonths=["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"],faWeekdays=["ش","ی","د","س","چ","پ","ج"];
const faCalendar=new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn",{year:"numeric",month:"numeric",day:"numeric",timeZone:"UTC"});
function toFaDigits(v){return String(v??"").replace(/[0-9]/g,d=>persianDigits[Number(d)]).replace(/[٠-٩]/g,d=>persianDigits[d.charCodeAt(0)-1632]);}
function toEnDigits(v){return String(v??"").replace(/[۰-۹]/g,d=>latinDigits[persianDigits.indexOf(d)]).replace(/[٠-٩]/g,d=>latinDigits[d.charCodeAt(0)-1632]);}
function moneyInput(v){const normalized=toEnDigits(String(v??"").replace(/[٬,،\s]/g,""));if(normalized==="")return 0;const n=Number(normalized);return Number.isFinite(n)?n:NaN;}
function faParts(d){const o={};faCalendar.formatToParts(d).forEach(p=>{if(["year","month","day"].includes(p.type))o[p.type]=Number(p.value);});return o;}
function isoDay(d){return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0");}
function fromIso(v){const m=/^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(v||""));return m?new Date(Date.UTC(+m[1],+m[2]-1,+m[3])):null;}
function jalaliFirst(y,m){const base=Date.UTC(y+621,2,20)+(m-1)*30*86400000;for(let i=-40;i<=40;i++){const d=new Date(base+i*86400000),p=faParts(d);if(p.year===y&&p.month===m&&p.day===1)return d;}return new Date(base);}
function isoToFa(v){const d=fromIso(v);if(!d)return "";const p=faParts(d);return toFaDigits(p.year+"/"+String(p.month).padStart(2,"0")+"/"+String(p.day).padStart(2,"0"));}
function jalaliCalendarHtml(input,y,m){const first=jalaliFirst(y,m),offset=(first.getUTCDay()+1)%7;let ny=y,nm=m+1;if(nm>12){nm=1;ny++;}const count=Math.round((jalaliFirst(ny,nm)-first)/86400000),selected=input.dataset.isoValue||"",today=isoDay(new Date());let cells=faWeekdays.map(w=>"<span>"+w+"</span>").join("");for(let i=0;i<offset;i++)cells+="<span></span>";for(let d=1;d<=count;d++){const iso=isoDay(new Date(first.getTime()+(d-1)*86400000));cells+='<button type="button" data-jalali-day="'+iso+'" class="'+(iso===selected?"selected ":"")+(iso===today?"today":"")+'">'+toFaDigits(d)+'</button>';}return '<div class="jalali-calendar-head"><button type="button" class="jalali-calendar-nav" data-jalali-month="-1">›</button><div class="jalali-calendar-title">'+faMonths[m-1]+" "+toFaDigits(y)+'</div><button type="button" class="jalali-calendar-nav" data-jalali-month="1">‹</button></div><div class="jalali-calendar-grid">'+cells+'</div><div class="jalali-calendar-footer"><button type="button" data-jalali-today>امروز</button><button type="button" data-jalali-clear>پاک‌کردن</button></div>';}
function drawJalaliCalendar(w){const i=w.querySelector("[data-jalali-visible]"),p=w.querySelector(".jalali-calendar");if(i&&p)p.innerHTML=jalaliCalendarHtml(i,+p.dataset.year,+p.dataset.month);}
function initJalaliPickers(root){(root||document).querySelectorAll('input[type="date"]').forEach(n=>{const iso=n.value||"",name=n.name,w=document.createElement("div"),i=document.createElement("input"),h=document.createElement("input"),p=document.createElement("div"),today=faParts(new Date()),chosen=fromIso(iso),parts=chosen?faParts(chosen):today;w.className="jalali-picker";i.type="text";i.readOnly=true;i.className=(n.className||"")+" jalali-picker-input";i.placeholder="انتخاب تاریخ شمسی";i.value=isoToFa(iso);i.dataset.jalaliVisible="1";i.dataset.isoValue=iso;i.setAttribute("aria-label","تاریخ شمسی");h.type="hidden";h.name=name;h.value=iso;h.dataset.jalaliHidden="1";p.className="jalali-calendar";p.hidden=true;p.dataset.year=parts.year;p.dataset.month=parts.month;w.append(i,h,p);n.parentNode.insertBefore(w,n);n.remove();drawJalaliCalendar(w);});}
function localizeNumbers(root){const scope=root||document.body,walk=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT),nodes=[];let n;while(n=walk.nextNode())if(n.parentElement&&!n.parentElement.closest("script,style,noscript,textarea,[data-no-localize]"))nodes.push(n);nodes.forEach(n=>{const v=toFaDigits(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v;});if(scope.querySelectorAll){scope.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="password"]):not([type="email"]):not([type="url"]),textarea').forEach(e=>{if(e.value)e.value=toFaDigits(e.value);if(e.placeholder)e.placeholder=toFaDigits(e.placeholder);});scope.querySelectorAll("[title],[aria-label]").forEach(e=>{if(e.title)e.title=toFaDigits(e.title);const a=e.getAttribute("aria-label");if(a)e.setAttribute("aria-label",toFaDigits(a));});}}
function installPersianLocale(){localizeNumbers(document.body);initJalaliPickers(document);if(window.__omidLocaleObserver)return;window.__omidLocaleObserver=new MutationObserver(records=>records.forEach(r=>{if(r.type==="childList")r.addedNodes.forEach(n=>{if(n.nodeType===1){localizeNumbers(n);initJalaliPickers(n);}else if(n.nodeType===3&&n.parentElement&&!n.parentElement.closest("script,style,noscript,textarea,[data-no-localize]"))n.nodeValue=toFaDigits(n.nodeValue);});else if(r.type==="characterData"&&r.target.parentElement&&!r.target.parentElement.closest("script,style,noscript,textarea,[data-no-localize]")){const v=toFaDigits(r.target.nodeValue);if(v!==r.target.nodeValue)r.target.nodeValue=v;}}));window.__omidLocaleObserver.observe(document.body,{subtree:true,childList:true,characterData:true});}
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
 return '<div class="card customer-profile-edit-card"><div class="card-head"><h2>'+(editing?"پروفایل مشتری":"ایجاد پروفایل مشتری")+'</h2>'+(editing?'<span class="pill">کد مشتری: '+esc(customer.id)+'</span>':'')+'</div><div class="notice">اطلاعات پروفایل، آدرس‌ها، شماره‌ها، حساب‌ها و مدارک در این نسخه فقط در حافظه محلی همین مرورگر ذخیره می‌شوند. برای اطلاعات هویتی و مالی واقعی، اتصال به سرور امن و کنترل دسترسی لازم است.</div><form id="customer-form" class="customer-profile-form" data-edit-id="'+(editing?esc(customer.id):"")+'"><section class="profile-section"><h2>اطلاعات هویتی</h2><div class="form-grid"><div class="form-row"><label>نوع مشتری *</label><select class="field" name="type" required><option value="حقیقی" '+(customer?.type!=="حقوقی"?"selected":"")+'>حقیقی</option><option value="حقوقی" '+(customer?.type==="حقوقی"?"selected":"")+'>حقوقی</option></select></div><div class="form-row"><label>نام / نام سازمان *</label><input class="field" name="firstName" required value="'+esc(firstName)+'" placeholder="نام"></div><div class="form-row"><label>نام خانوادگی</label><input class="field" name="lastName" value="'+esc(lastName)+'" placeholder="نام خانوادگی"></div><div class="form-row"><label>کد ملی / شناسه ملی</label><input class="field" name="nationalId" inputmode="numeric" maxlength="20" value="'+esc(customer?.nationalId||"")+'" placeholder="کد ملی"></div><div class="form-row"><label>تاریخ تولد</label><input class="field" name="birthDate" type="date" value="'+esc(customer?.birthDate||"")+'"></div><div class="form-row"><label>نام پدر</label><input class="field" name="fatherName" value="'+esc(customer?.fatherName||"")+'" placeholder="نام پدر"></div><div class="form-row"><label>شغل</label><input class="field" name="occupation" value="'+esc(customer?.occupation||"")+'" placeholder="شغل یا سمت"></div><div class="form-row"><label>کدپستی اصلی</label><input class="field" name="postalCode" inputmode="numeric" value="'+esc(customer?.postalCode||"")+'" placeholder="کدپستی"></div><div class="form-row"><label>ایمیل</label><input class="field" name="email" type="email" value="'+esc(customer?.email||"")+'" placeholder="name@example.com"></div><div class="form-row"><label>مسئول پرونده</label><select class="field" name="manager"><option '+(customer?.manager==="مریم رضایی"?"selected":"")+'>مریم رضایی</option><option '+(customer?.manager==="امیر کاظمی"?"selected":"")+'>امیر کاظمی</option><option '+(customer?.manager==="آرمان صالحی"?"selected":"")+'>آرمان صالحی</option></select></div><div class="form-row"><label>وضعیت مشتری</label><select class="field" name="status"><option '+(!customer||customer.status==="فعال"?"selected":"")+'>فعال</option><option '+(customer?.status==="نیازمند بررسی"?"selected":"")+'>نیازمند بررسی</option><option '+(customer?.status==="غیرفعال"?"selected":"")+'>غیرفعال</option></select></div><div class="form-row"><label class="check-line"><input type="checkbox" name="sana" '+(customer?.sana?"checked":"")+'> مشتری در سامانه ثنا ثبت‌نام دارد</label></div><div class="form-row full"><label>یادداشت</label><textarea class="field" name="notes" placeholder="توضیحات تکمیلی">'+esc(customer?.notes||"")+'</textarea></div></div></section><section class="profile-section"><div class="profile-section-head"><h2>آدرس‌ها</h2><button class="btn" type="button" data-action="add-profile-row" data-kind="address">＋ افزودن آدرس</button></div><div id="profile-addresses" class="profile-repeat-list">'+profileRows(addresses,"address")+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>شماره‌های تماس</h2><button class="btn" type="button" data-action="add-profile-row" data-kind="phone">＋ افزودن شماره</button></div><div id="profile-phones" class="profile-repeat-list">'+profileRows(phones,"phone")+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>حساب‌های بانکی</h2><button class="btn" type="button" data-action="add-profile-row" data-kind="bank">＋ افزودن حساب بانکی</button></div><div id="profile-banks" class="profile-repeat-list">'+profileRows(banks,"bank")+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>مدارک مشتری</h2><button class="btn" type="button" data-action="add-customer-doc">＋ افزودن مدرک</button></div><p class="muted">تصاویر و فایل‌های انتخاب‌شده داخل همین پروفایل نمایش داده می‌شوند. برای نسخه نمایشی فایل‌ها در حافظه مرورگر ذخیره می‌شوند.</p><div id="profile-documents" class="profile-doc-list">'+(documents.length?documents.map(customerDocumentRow).join(""):customerDocumentRow())+'</div></section><div class="actions" style="margin-top:22px"><button class="btn primary" type="submit">'+(editing?"ذخیره پروفایل":"ایجاد پروفایل مشتری")+'</button><button class="btn" type="reset">بازنشانی فرم</button></div></form></div>';
}
function renderApplications(){
 setMeta("درخواست‌های تسهیلات",'<button class="btn" data-action="export-applications">⇩ خروجی CSV</button><button class="btn primary" data-link="/applications/new">＋ پرونده جدید</button>');
 if(getAppPath().endsWith("/new")) return renderApplicationForm();
 const filtered=applications.filter(a=>(a.id+" "+a.customer+" "+a.type+" "+a.manager+" "+a.status).toLowerCase().includes(applicationFilter.toLowerCase())&&(!applicationStatusFilter||a.status===applicationStatusFilter));
 const rows=filtered.map(a=>'<tr><td class="id">'+esc(a.id)+'</td><td>'+esc(a.customer)+'</td><td>'+esc(a.type)+'</td><td>'+esc(a.amount)+'</td><td>'+esc(a.manager)+'</td><td>'+statusPill(a.status)+'</td><td><button class="btn" data-action="application-detail" data-id="'+esc(a.id)+'">مشاهده</button></td></tr>').join('');
 return '<div class="grid">'+stat("کل پرونده‌ها",applications.length,"▤","","داده نمونه")+stat("در حال بررسی",applications.filter(a=>a.status==="در حال بررسی").length,"↻","blue","در گردش کار")+stat("تکمیل مدارک",applications.filter(a=>a.status==="تکمیل مدارک").length,"▧","amber","اقدام مشتری لازم است")+stat("تأیید شده",applications.filter(a=>a.status==="تأیید شده").length,"✓","purple","در نمونه فعلی")+'</div><div class="card table-card"><div class="card-head"><h2>فهرست درخواست‌ها</h2><span class="muted">'+filtered.length+' پرونده</span></div><div class="table-tools"><input id="application-search" class="field" style="max-width:350px" placeholder="شماره پرونده، مشتری یا نوع تسهیلات..." value="'+esc(applicationFilter)+'"><select class="filter" id="application-status"><option value="" '+(!applicationStatusFilter?'selected':'')+'>همه وضعیت‌ها</option><option '+(applicationStatusFilter==="در حال بررسی"?'selected':'')+'>در حال بررسی</option><option '+(applicationStatusFilter==="در انتظار تأیید"?'selected':'')+'>در انتظار تأیید</option><option '+(applicationStatusFilter==="تکمیل مدارک"?'selected':'')+'>تکمیل مدارک</option><option '+(applicationStatusFilter==="تأیید شده"?'selected':'')+'>تأیید شده</option><option '+(applicationStatusFilter==="رد شده"?'selected':'')+'>رد شده</option></select></div>'+table(["شماره پرونده","مشتری","نوع تسهیلات","مبلغ درخواستی","کارشناس","وضعیت","عملیات"],rows||'<tr><td colspan="7" class="empty">پرونده‌ای پیدا نشد.</td></tr>')+'</div>';
}
function applicationCustomerResults(query,selectedId,context){
 const q=String(query||"").trim().toLocaleLowerCase("fa");
 const matches=customers.filter(c=>!q||(String(c.name||"")+" "+String(c.id||"")+" "+String(c.nationalId||"")+" "+String(c.phone||"")+" "+String((c.phones||[]).map(p=>p.number||"").join(" "))).toLocaleLowerCase("fa").includes(q));
 const shown=matches.slice(0,12);
 if(!shown.length)return '<div class="empty" style="padding:14px">مشتری‌ای با این مشخصات پیدا نشد.</div>';
 return shown.map(c=>'<button type="button" class="customer-pick-option" data-action="'+((context==="service")?"select-service-customer":"select-application-customer")+'" data-customer-id="'+esc(c.id)+'" style="display:flex;width:100%;justify-content:space-between;align-items:center;gap:12px;text-align:right;padding:11px 13px;border:0;border-bottom:1px solid #edf1f6;background:'+(c.id===selectedId?'#eefaf7':'#fff')+';cursor:pointer;color:#243850"><span><b>'+esc(c.name)+'</b><small style="display:block;color:#8492a6;margin-top:4px">'+esc(c.id||"بدون کد")+(c.nationalId?' · کد ملی '+esc(c.nationalId):'')+(c.phone?' · '+esc(c.phone):'')+'</small></span><span class="pill">'+(c.id===selectedId?'انتخاب‌شده':'انتخاب')+'</span></button>').join("");
}
function renderApplicationForm(){
 const requestedCustomerId=new URLSearchParams(location.search).get("customerId")||"";
 const selectedCustomer=customers.find(c=>c.id===requestedCustomerId)||null;
 setMeta("درخواست‌ها / پرونده جدید",'<button class="btn" data-link="/applications">← بازگشت به فهرست</button>');
 return '<div class="card"><h2>ایجاد پرونده تسهیلات</h2><div class="notice">برای فهرست بزرگ مشتریان، نام، کد مشتری، کد ملی یا شماره تماس را جست‌وجو کنید. حداکثر ۱۲ نتیجه در هر جست‌وجو نمایش داده می‌شود.</div><form id="application-form"><div class="form-grid"><div class="form-row full"><label>جست‌وجو و انتخاب مشتری *</label><input class="field" id="application-customer-search" autocomplete="off" placeholder="نام مشتری، کد مشتری، کد ملی یا شماره تماس را بنویسید..." value="'+esc(selectedCustomer?selectedCustomer.name+" · "+selectedCustomer.id:"")+'"><input type="hidden" name="customerId" id="application-customer-id" value="'+esc(selectedCustomer?.id||"")+'"><input type="hidden" name="customer" id="application-customer-name" value="'+esc(selectedCustomer?.name||"")+'"><div id="application-customer-results" class="profile-repeat-list" style="margin-top:8px;border:1px solid #e8edf4;border-radius:10px;overflow:hidden">'+(selectedCustomer?applicationCustomerResults(selectedCustomer.name,selectedCustomer.id):'<div class="empty" style="padding:14px">برای یافتن مشتری، بخشی از نام، کد مشتری، کد ملی یا شماره تماس را وارد کنید.</div>')+'</div><small id="application-customer-selected" class="muted">'+(selectedCustomer?'مشتری انتخاب‌شده: '+esc(selectedCustomer.name)+' · '+esc(selectedCustomer.id):'هنوز مشتری‌ای انتخاب نشده است.')+'</small></div><div class="form-row full"><label>مسیر گردش کار *</label><select class="field" name="loanRoute" id="loan-route" required><option value="company_score_fast" selected>وام فوری از امتیاز شرکت</option><option value="customer_account_score">وام از امتیاز حساب مشتری</option></select><small class="muted">انتخاب مسیر، مراحل اختصاصی پیگیری پرونده را مشخص می‌کند.</small></div><div class="form-row"><label>نوع تسهیلات *</label><select class="field" name="type" required><option>سرمایه در گردش</option><option>تسهیلات شخصی</option><option>اعتباری شرکتی</option><option>خرید تجهیزات</option></select></div><div class="form-row"><label>مبلغ درخواستی (تومان) *</label><input class="field" name="amount" type="text" inputmode="decimal" required placeholder="مثلاً 250000000"></div><div class="form-row"><label>مدت بازپرداخت (ماه)</label><input class="field" name="term" type="text" inputmode="numeric" placeholder="مثلاً 36"></div><div class="form-row"><label>مسئول پرونده</label><select class="field" name="manager"><option>مریم رضایی</option><option>امیر کاظمی</option><option>آرمان صالحی</option></select></div><div class="form-row"><label>وضعیت اولیه</label><select class="field" name="status"><option>در حال بررسی</option><option>تکمیل مدارک</option></select></div><div class="form-row full"><label>توضیحات / هدف تسهیلات</label><textarea class="field" name="notes" placeholder="شرح مختصر درخواست"></textarea></div></div><div class="actions" style="margin-top:18px"><button class="btn primary" type="submit">ثبت نمایشی پرونده</button><button class="btn" type="reset">پاک کردن فرم</button></div></form></div>';
}
const loanWorkflowDefinitions={
 company_score_fast:{label:"وام فوری از امتیاز شرکت",description:"استفاده از امتیاز شرکتی پس از احراز اختیار، میزان امتیاز و شرایط بانکی",stages:[
 {key:"intake",label:"ثبت درخواست و احراز طرفین",help:"ثبت متقاضی، شرکت دارنده امتیاز، مبلغ و مدت موردنظر"},
 {key:"company_docs",label:"بررسی مدارک و اختیار شرکت",help:"مدارک شرکت، اختیار امضاکنندگان و مجوز استفاده از امتیاز بررسی شود"},
 {key:"score_check",label:"استعلام امتیاز شرکت",help:"میزان امتیاز، قابلیت استفاده، مدت اعتبار و شرایط انتقال از منبع مجاز ثبت شود"},
 {key:"credit_check",label:"اعتبارسنجی متقاضی",help:"نتیجه اعتبارسنجی و توان بازپرداخت بررسی شود"},
 {key:"guarantee",label:"تکمیل تضمین‌های لازم",help:"نوع و وضعیت ضمانت یا سفته مطابق ضوابط بانک مشخص و ثبت شود"},
 {key:"company_approval",label:"تأیید تخصیص امتیاز",help:"تأیید کتبی شرکت و تطبیق مبلغ/مدت با نتیجه استعلام"},
 {key:"bank_submit",label:"ثبت درخواست در بانک",help:"درخواست توسط متقاضی/نماینده مجاز در مسیر رسمی بانک ثبت شود"},
 {key:"bank_review",label:"بررسی بانک",help:"پیگیری نتیجه بررسی بانکی و پاسخ به نواقص احتمالی"},
 {key:"contract",label:"تأیید و امضای قرارداد",help:"شرایط نهایی، مبلغ، اقساط و تعهدات پیش از امضا کنترل شود"},
 {key:"disbursement",label:"پرداخت و بستن پرونده",help:"واریز وجه و برنامه بازپرداخت ثبت و پرونده بایگانی شود"}]},
 customer_account_score:{label:"وام از امتیاز حساب مشتری",description:"استعلام امتیاز حساب خود مشتری و پیگیری درخواست در مسیر رسمی بانک",stages:[
 {key:"intake",label:"ثبت درخواست و حساب",help:"ثبت شماره حساب/سپرده موردنظر، مبلغ و مدت بازپرداخت"},
 {key:"account_check",label:"بررسی حساب و مالکیت",help:"فعال بودن حساب و تطبیق مالکیت آن با متقاضی کنترل شود"},
 {key:"score_estimate",label:"برآورد امتیاز و اقساط",help:"نتیجه رسمی برآورد تسهیلات، مبلغ قابل دریافت و مدت بازپرداخت ثبت شود"},
 {key:"credit_check",label:"اعتبارسنجی متقاضی",help:"نتیجه اعتبارسنجی و شرایط اعلام‌شده از سامانه مربوط ثبت شود"},
 {key:"guarantee",label:"تکمیل تضمین‌های لازم",help:"بر اساس نتیجه اعتبارسنجی و ضوابط روز بانک، تضمین موردنیاز تعیین شود"},
 {key:"bank_submit",label:"ثبت درخواست در بانک",help:"متقاضی از مسیر رسمی بانک درخواست تسهیلات را ثبت کند"},
 {key:"bank_review",label:"بررسی بانک",help:"وضعیت درخواست و نواقص احتمالی از مسیر رسمی پیگیری شود"},
 {key:"disbursement",label:"پرداخت و بستن پرونده",help:"واریز وجه، تاریخ شروع اقساط و اسناد نهایی ثبت شود"}]}
};
function getLoanWorkflow(app){const route=loanWorkflowDefinitions[app&&app.loanRoute]?app.loanRoute:"company_score_fast";return {route,definition:loanWorkflowDefinitions[route]};}
function getLoanStageIndex(app){const {definition}=getLoanWorkflow(app);const index=definition.stages.findIndex(stage=>stage.key===(app&&app.loanStage));return index<0?0:index;}
function setLoanRoute(app,route){if(!loanWorkflowDefinitions[route]||getLoanWorkflow(app).route===route)return false;const previous=getLoanWorkflow(app).definition.label;app.loanRoute=route;app.loanStage=loanWorkflowDefinitions[route].stages[0].key;app.activity=Array.isArray(app.activity)?app.activity:[];app.activity.push({type:"تغییر مسیر تسهیلات",text:"مسیر از «"+previous+"» به «"+loanWorkflowDefinitions[route].label+"» تغییر کرد و مرحله به ابتدای مسیر بازگشت.",date:new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short"}).format(new Date())});persistDemoData();return true;}
function setLoanStage(app,stageKey){const {route,definition}=getLoanWorkflow(app);const currentIndex=getLoanStageIndex(app),nextIndex=definition.stages.findIndex(stage=>stage.key===stageKey);if(nextIndex<0)return false;if(nextIndex>currentIndex+1){toast("برای جلوگیری از رد کردن مراحل، ابتدا مرحله جاری را تکمیل کنید.");return false;}const previous=definition.stages[currentIndex],next=definition.stages[nextIndex];if(app.loanStage===next.key)return false;app.loanRoute=route;app.loanStage=next.key;app.activity=Array.isArray(app.activity)?app.activity:[];const date=new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short"}).format(new Date());app.activity.push({type:"تغییر مرحله گردش کار",text:"مرحله از «"+previous.label+"» به «"+next.label+"» تغییر کرد.",date});app.status=next.key==="disbursement"?"تأیید شده":app.status==="رد شده"?"در حال بررسی":app.status;persistDemoData();return true;}
function ensureCaseWorkspace(app){
 if(!Array.isArray(app.caseParties)||!app.caseParties.length){
  app.caseParties=[
   {id:"applicant-"+app.id,role:"متقاضی",name:app.customer||"متقاضی پرونده",accountStatus:"نیازمند بررسی",stages:{}},
   {id:"guarantor-"+app.id,role:"ضامن",name:"ضامن نمونه",accountStatus:"حساب موجود تأیید نشده",stages:{}}
  ];
 }
 const labels=[["documents","مدارک هویتی و پرونده"],["account","وضعیت حساب"],["merat","اعتبارسنجی مرآت"],["enote","سفته الکترونیکی"]];
 app.caseParties.forEach(p=>{if(!p.stages||typeof p.stages!=="object")p.stages={};labels.forEach(([key])=>{if(!p.stages[key])p.stages[key]="در انتظار";});});
 if(!app.meratTriplet)app.meratTriplet={requester:app.customer||"",subject:app.customer||"",relation:"خود مشتری",status:"ثبت نشده"};
 if(!Number.isFinite(Number(app.commissionRate)))app.commissionRate=25;
 if(!Array.isArray(app.disbursementEntries))app.disbursementEntries=[];
 return {labels};
}
function renderCaseWorkspace(active){
 if(!active.length)return "";
 let app=active.find(a=>a.id===workflowWorkspaceCaseId)||active[0];workflowWorkspaceCaseId=app.id;
 const {labels}=ensureCaseWorkspace(app);
 const partyCards=app.caseParties.map(p=>{
  const stages=labels.map(([key,label])=>{
   const value=p.stages[key]||"در انتظار";
   const cls=value==="تکمیل‌شده"?"":" wait";
   return '<div class="case-stage-row"><span>'+esc(label)+'</span><span class="pill'+cls+'">'+esc(value)+'</span><button type="button" class="btn" data-action="toggle-party-stage" data-app-id="'+esc(app.id)+'" data-party-id="'+esc(p.id)+'" data-stage-key="'+esc(key)+'">'+(value==="تکمیل‌شده"?"بازگشت به انتظار":"تکمیل شد")+'</button></div>';
  }).join("");
  return '<article class="case-party-card"><div class="case-party-head"><div><span class="pill '+(p.role==="متقاضی"?"doc":"gray")+'">'+esc(p.role)+'</span><h3>'+esc(p.name)+'</h3><small>'+esc(p.id)+'</small></div><div class="case-party-account"><small>وضعیت حساب</small><b>'+esc(p.accountStatus||"ثبت نشده")+'</b></div></div><div class="case-stage-list">'+stages+'</div></article>';
 }).join("");
 const disbursementTotal=app.disbursementEntries.reduce((sum,d)=>sum+(Number(d.amount)||0),0);
 return '<section class="case-workspace"><div class="card case-workspace-header"><div><div class="eyebrow">فضای کاری پرونده</div><h2>متقاضی، ضامنین و مراحل مستقل</h2><p class="muted">وضعیت‌های این بخش در نسخه فعلی فقط در مرورگر ذخیره می‌شوند و هنوز جایگزین گردش کار سمت سرور نیستند.</p></div><div class="form-row"><label for="workflow-workspace-case">انتخاب پرونده</label><select class="field" id="workflow-workspace-case">'+active.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===app.id?"selected":"")+'>'+esc(a.id+" · "+a.customer)+'</option>').join("")+'</select></div></div><div class="case-workspace-grid"><div class="card"><div class="card-head"><h2>اشخاص پرونده</h2><span class="muted">'+toFaDigits(app.caseParties.length)+' شخص در نمای نمونه</span></div><div class="case-party-list">'+partyCards+'</div><div class="notice" style="margin-top:14px">مدارک، حساب، مرآت و سفته برای هر شخص جداگانه نمایش داده می‌شوند. این وضعیت‌ها نمایشی‌اند.</div></div><div class="case-workspace-side"><div class="card"><div class="card-head"><h2>سه‌گانه مرآت</h2><span class="pill gray">'+esc(app.meratTriplet.status)+'</span></div><div class="case-triple"><div><small>درخواست‌کننده</small><b>'+esc(app.meratTriplet.requester||"ثبت نشده")+'</b></div><div><small>شخص مورد ارزیابی</small><b>'+esc(app.meratTriplet.subject||"ثبت نشده")+'</b></div><div><small>نسبت با مشتری اصلی</small><b>'+esc(app.meratTriplet.relation||"ثبت نشده")+'</b></div></div><button type="button" class="btn" data-action="edit-merat-triplet" data-app-id="'+esc(app.id)+'">ویرایش سه‌گانه</button></div><div class="card"><div class="card-head"><h2>برآورد مالی پرونده</h2><span class="pill doc">نسخه نمایشی</span></div><div class="finance-metric"><span>نرخ پیش‌فرض کارمزد</span><b>'+toFaDigits(app.commissionRate)+'٪</b></div><div class="finance-metric"><span>مجموع واریزی ثبت‌شده</span><b>'+toFaDigits(disbursementTotal.toLocaleString("en-US"))+' تومان</b></div><div class="finance-metric"><span>تعداد ثبت‌های واریز</span><b>'+toFaDigits(app.disbursementEntries.length)+'</b></div><div class="notice">نرخ واقعی و محاسبه کارمزد باید از پاسخ API خوانده شود. این نمایش، تأیید یا تسویه بانکی محسوب نمی‌شود.</div><button type="button" class="btn" data-action="application-detail" data-id="'+esc(app.id)+'">جزئیات پرونده و قرارداد</button></div><div class="card"><h2>کنترل‌های پیش از ارسال</h2><div class="case-check-row"><span>حداقل یک متقاضی فعال</span><span class="pill">بررسی نمایشی</span></div><div class="case-check-row"><span>مراحل الزامی اشخاص</span><span class="pill wait">نیازمند اتصال API</span></div><div class="case-check-row"><span>تأیید مستندات بانکی</span><span class="pill wait">نیازمند کنترل سرور</span></div></div></div></div></section>';
}
function liveApiList(body){return Array.isArray(body)?body:Array.isArray(body.results)?body.results:[];}
function liveStageLabel(code){return ({documents:"مدارک هویتی و پرونده",account:"وضعیت حساب",merat:"اعتبارسنجی مرآت",e_note:"سفته الکترونیکی",loan_submission:"ثبت درخواست وام",bank_review:"بررسی بانک",disbursement:"واریز تسهیلات",settlement:"تسویه",handover:"تحویل نهایی"})[code]||code;}
function liveStatusLabel(status){return ({locked:"قفل‌شده",pending:"در انتظار",in_progress:"در جریان",action_needed:"نیازمند اقدام",completed:"تکمیل‌شده",bypassed:"عبور مجاز",rejected:"ردشده",on_hold:"تعلیق"})[status]||status;}
function liveMeratResultLabel(result){return ({pending:"در انتظار نتیجه",approved:"تأیید",rejected:"رد",needs_correction:"نیازمند اصلاح"})[result]||result;}
function renderLiveWorkflow(){
 const d=liveWorkflowData;
 if(!d.loaded)return '<div class="card live-workflow-card"><div class="card-head"><div><h2>گردش کار متصل به بک‌اند</h2><p class="muted">داده‌ها فقط پس از درخواست صریح از API خوانده می‌شوند؛ این بخش از داده‌های نمونه جداست.</p></div><button type="button" class="btn primary" data-action="load-live-workflow" '+(d.loading?'disabled':'')+'>'+(d.loading?'در حال دریافت…':'بارگذاری داده‌های واقعی')+'</button></div><div class="notice">برای استفاده، ابتدا در تنظیمات Worker مقدار OMID_API_ORIGIN را تنظیم و با حساب کارکنان وارد شوید.</div></div>';
 const app=d.applications.find(a=>String(a.id)===String(d.selectedId))||d.applications[0];
 if(!app)return '<div class="card live-workflow-card"><div class="card-head"><h2>گردش کار متصل به بک‌اند</h2><button class="btn" data-action="load-live-workflow">بارگذاری مجدد</button></div><div class="empty">در API پرونده‌ای قابل نمایش پیدا نشد.</div></div>';
 const parties=d.parties.filter(p=>String(p.application)===String(app.id));
 const stages=d.stages.filter(x=>String(x.application)===String(app.id));
 const assessments=d.meratAssessments.filter(x=>stages.some(st=>String(st.id)===String(x.stage)));
 const disbursements=d.disbursements.filter(x=>String(x.application)===String(app.id));
 const customerOptions=d.customers.map(c=>'<option value="'+esc(c.id)+'">'+esc((c.first_name||"")+" "+(c.last_name||"")+" · "+(c.customer_number||c.id))+'</option>').join("");
 const partyRows=parties.map(p=>{
  const ownStages=stages.filter(st=>String(st.party||"")===String(p.id));
  return '<article class="case-party-card"><div class="case-party-head"><div><span class="pill '+(p.role==="applicant"?"doc":"gray")+'">'+esc(({applicant:"متقاضی اصلی",guarantor:"ضامن",representative:"نماینده"})[p.role]||p.role)+'</span><h3>'+esc(p.person_display||p.person)+'</h3><small>'+esc(p.membership_status||"")+' · '+esc(({unknown:"حساب بررسی‌نشده",existing_verified:"حساب موجود تأییدشده",needs_opening:"نیازمند افتتاح"})[p.account_status]||p.account_status||"")+'</small></div></div><div class="live-party-account"><label>وضعیت حساب</label><select class="field" data-account-status-select><option value="unknown" '+(p.account_status==="unknown"?"selected":"")+'>بررسی‌نشده</option><option value="existing_verified" '+(p.account_status==="existing_verified"?"selected":"")+'>حساب موجود و تأییدشده</option><option value="needs_opening" '+(p.account_status==="needs_opening"?"selected":"")+'>نیازمند افتتاح</option></select><button class="btn" data-action="save-party-account-status" data-party-id="'+esc(p.id)+'">ذخیره وضعیت حساب</button></div><div class="case-stage-list">'+ownStages.map(st=>'<div class="case-stage-row"><span>'+esc(liveStageLabel(st.code))+'</span><span class="pill '+(["completed","bypassed"].includes(st.status)?"":" wait")+'">'+esc(liveStatusLabel(st.status))+'</span><span class="live-stage-actions">'+(st.status==="pending"||st.status==="action_needed"?'<button class="btn" data-action="live-stage-transition" data-stage-id="'+esc(st.id)+'" data-transition="start">شروع</button>':"")+(st.code==="account"&&p.account_status==="existing_verified"&&backendSessionUser&&backendSessionUser.role==="system_admin"&&(st.status==="pending"||st.status==="action_needed")?'<button class="btn" data-action="live-stage-transition" data-stage-id="'+esc(st.id)+'" data-transition="bypass">عبور مجاز</button>':"")+(st.status==="in_progress"?'<button class="btn primary" data-action="live-stage-transition" data-stage-id="'+esc(st.id)+'" data-transition="complete">تکمیل</button><button class="btn" data-action="live-stage-transition" data-stage-id="'+esc(st.id)+'" data-transition="hold">تعلیق</button>':"")+'</span></div>').join("")+'</div></article>';
 }).join("");
 const caseStages=stages.filter(st=>!st.party);
 const meratRows=parties.filter(p=>p.membership_status==="active").map(p=>{
  const st=stages.find(x=>String(x.party||"")===String(p.id)&&x.code==="merat");
  if(!st)return "";
  const record=assessments.find(x=>String(x.stage)===String(st.id));
  const requesterOptions=parties.filter(x=>x.membership_status==="active").map(x=>'<option value="'+esc(x.person)+'" '+(record&&String(record.requester)===String(x.person)?"selected":"")+'>'+esc(x.person_display||x.person)+'</option>').join("");
  return '<form class="card live-merat-form" data-stage-id="'+esc(st.id)+'" data-assessment-id="'+esc(record?.id||"")+'"><h3>مرآت · '+esc(p.person_display||p.person)+'</h3><p class="muted">درخواست‌کننده، شخص اعتبارسنجی‌شونده و رابطه باید مطابق پرونده ثبت شوند. این فرم نتیجه دستی را ثبت می‌کند و به سامانه مرآت متصل نیست.</p><input type="hidden" name="stage" value="'+esc(st.id)+'"><input type="hidden" name="subject" value="'+esc(p.person)+'"><div class="form-grid"><div class="form-row"><label>درخواست‌کننده *</label><select class="field" name="requester" required><option value="">انتخاب شخص فعال</option>'+requesterOptions+'</select></div><div class="form-row"><label>رابطه با متقاضی اصلی *</label><input class="field" name="relationship_to_applicant" required maxlength="80" value="'+esc(record?.relationship_to_applicant||p.relationship_to_applicant||"")+'"></div><div class="form-row"><label>وضعیت نتیجه</label><select class="field" name="result"><option value="pending" '+(!record||record.result==="pending"?"selected":"")+'>در انتظار نتیجه</option><option value="approved" '+(record?.result==="approved"?"selected":"")+'>تأیید</option><option value="rejected" '+(record?.result==="rejected"?"selected":"")+'>رد</option><option value="needs_correction" '+(record?.result==="needs_correction"?"selected":"")+'>نیازمند اصلاح</option></select></div><div class="form-row"><label>تاریخ ارسال (اختیاری)</label><input class="field" type="datetime-local" name="submitted_at" value="'+esc(record?.submitted_at?String(record.submitted_at).slice(0,16):"")+'"></div><div class="form-row"><label>شناسه مرجع بیرونی</label><input class="field" name="external_reference" maxlength="120" value="'+esc(record?.external_reference||"")+'"></div><div class="form-row"><label>حد اعتبار گزارش‌شده (ریال)</label><input class="field" name="reported_limit_rial" inputmode="numeric" value="'+esc(record?.reported_limit_rial??"")+'"></div><div class="form-row full"><label>شرح نتیجه</label><input class="field" name="result_reason" maxlength="500" value="'+esc(record?.result_reason||"")+'"></div><div class="form-row full"><label>مرجع مدرک / محل نگهداری مدرک</label><input class="field" name="evidence_reference" maxlength="500" value="'+esc(record?.evidence_reference||"")+'"></div></div><button class="btn primary" type="submit">'+(record?"به‌روزرسانی ارزیابی":"ثبت ارزیابی مرآت")+'</button><span class="muted">'+(record?"آخرین نتیجه: "+esc(liveMeratResultLabel(record.result)):"هنوز ارزیابی ثبت نشده")+'</span></form>';
 }).join("");
 const confirmedDisbursements=disbursements.filter(x=>x.status==="confirmed");
 const confirmedTotal=confirmedDisbursements.reduce((sum,x)=>sum+Number(x.amount_rial||0),0);
 const pendingTotal=disbursements.filter(x=>x.status==="pending").reduce((sum,x)=>sum+Number(x.amount_rial||0),0);
 const commissionTotal=confirmedDisbursements.reduce((sum,x)=>sum+Number(x.commission_amount_rial||0),0);
 const disbursementRows=disbursements.map(x=>'<div class="case-stage-row"><span><b>'+esc(x.disbursement_number||x.id)+'</b><small style="display:block">'+toFaDigits(Number(x.amount_rial||0).toLocaleString("en-US"))+' ریال · کارمزد '+esc(x.commission_rate_pct)+'٪ · سهم محاسبه‌شده '+toFaDigits(Number(x.commission_amount_rial||0).toLocaleString("en-US"))+' ریال</small><small style="display:block">'+esc(x.bank_reference||"مرجع بانکی پس از تأیید ثبت می‌شود")+'</small></span><span class="pill '+(x.status==="confirmed"?"":" wait")+'">'+esc(({pending:"در انتظار تأیید",confirmed:"تأییدشده",failed:"ناموفق"})[x.status]||x.status)+'</span><span class="live-stage-actions">'+(x.status==="pending"&&(backendSessionUser&&(backendSessionUser.role||(backendSessionUser.profile&&backendSessionUser.profile.role)))&&["system_admin","finance"].includes((backendSessionUser&&(backendSessionUser.role||(backendSessionUser.profile&&backendSessionUser.profile.role))))?'<button class="btn primary" data-action="confirm-live-disbursement" data-disbursement-id="'+esc(x.id)+'">تأیید واریز</button>':"")+'</span></div>').join("");
 return '<section class="live-workflow-card"><div class="card"><div class="card-head"><div><div class="eyebrow">اتصال زنده به API</div><h2>گردش کار واقعی پرونده</h2><p class="muted">تغییرات از طریق بک‌اند و با کنترل مجوز سرور ثبت می‌شوند.</p></div><button class="btn" data-action="load-live-workflow">به‌روزرسانی</button></div><div class="form-row"><label for="live-workflow-app">پرونده</label><select class="field" id="live-workflow-app">'+d.applications.map(a=>'<option value="'+esc(a.id)+'" '+(String(a.id)===String(app.id)?"selected":"")+'>'+esc((a.application_number||a.id)+" · "+(a.customer_display_name||a.customer_number||"مشتری"))+'</option>').join("")+'</select></div><div class="live-case-summary"><div><small>شماره پرونده</small><b>'+esc(app.application_number||app.id)+'</b></div><div><small>مشتری</small><b>'+esc(app.customer_display_name||app.customer_number||app.customer)+'</b></div><div><small>وضعیت</small><b>'+esc(app.status)+'</b></div><div><small>نرخ کارمزد ثبت‌شده</small><b>'+esc(app.loan_commission_pct)+'٪</b></div></div>'+( (backendSessionUser&&(backendSessionUser.role||(backendSessionUser.profile&&backendSessionUser.profile.role)))==="system_admin"?'<form id="live-commission-form" class="live-add-party"><h3>تغییر نرخ کارمزد پرونده</h3><input type="hidden" name="application" value="'+esc(app.id)+'"><div class="form-grid"><div class="form-row"><label>نرخ جدید (درصد)</label><input class="field" type="number" name="rate" min="0" max="100" step="0.01" required value="'+esc(app.loan_commission_pct??"25.00")+'"></div><div class="form-row"><label>دلیل تغییر (الزامی)</label><input class="field" name="reason" maxlength="500" required placeholder="دلیل مستند تغییر نرخ"></div></div><button class="btn primary" type="submit">ثبت نرخ جدید با ثبت رویداد حسابرسی</button><p class="muted">نرخ جدید فقط روی واریزهایی که پس از تغییر تأیید می‌شوند اعمال می‌شود؛ نرخ و مبلغ واریزهای قبلاً تأییدشده ثابت می‌ماند.</p></form>':'')+'</div><div class="case-workspace-grid"><div class="card"><div class="card-head"><h2>متقاضی و ضامنین</h2><span class="muted">'+toFaDigits(parties.length)+' شخص</span></div><div class="case-party-list">'+(partyRows||'<div class="empty">هنوز شخصی به پرونده متصل نشده است.</div>')+'</div><form id="live-add-party-form" class="live-add-party"><h3>افزودن ضامن یا نماینده</h3><input type="hidden" name="application" value="'+esc(app.id)+'"><div class="form-grid"><div class="form-row"><label>شخص *</label><select class="field" name="person" required><option value="">انتخاب مشتری</option>'+customerOptions+'</select></div><div class="form-row"><label>نقش *</label><select class="field" name="role" required><option value="guarantor">ضامن</option><option value="representative">نماینده</option></select></div><div class="form-row full"><label>نسبت با متقاضی</label><input class="field" name="relationship_to_applicant" maxlength="80" placeholder="مثلاً همکار یا شریک تجاری"></div></div><button class="btn primary" type="submit">افزودن شخص به پرونده</button></form></div><div class="card"><div class="card-head"><h2>مراحل سطح پرونده</h2><span class="muted">'+toFaDigits(caseStages.length)+' مرحله</span></div><div class="case-stage-list">'+caseStages.map(st=>'<div class="case-stage-row"><span>'+esc(liveStageLabel(st.code))+'</span><span class="pill '+(["completed","bypassed"].includes(st.status)?"":" wait")+'">'+esc(liveStatusLabel(st.status))+'</span><span class="live-stage-actions">'+(st.status==="pending"||st.status==="action_needed"?'<button class="btn" data-action="live-stage-transition" data-stage-id="'+esc(st.id)+'" data-transition="start">شروع</button>':"")+(st.status==="in_progress"?'<button class="btn primary" data-action="live-stage-transition" data-stage-id="'+esc(st.id)+'" data-transition="complete">تکمیل</button><button class="btn" data-action="live-stage-transition" data-stage-id="'+esc(st.id)+'" data-transition="hold">تعلیق</button>':"")+'</span></div>').join("")+'</div><div class="notice">تکمیل مراحل و ثبت درخواست وام توسط سرور اعتبارسنجی می‌شود. عملیات غیرمجاز یا ناقص رد خواهد شد.</div></div></div><div class="card"><div class="card-head"><h2>ارزیابی‌های مرآت</h2><span class="muted">ثبت نتیجه و مستندات</span></div><div class="case-workspace-grid">'+(meratRows||'<div class="empty">برای ثبت مرآت، ابتدا اشخاص فعال و مراحل مرآت آن‌ها را ایجاد کنید.</div>')+'</div></div><div class="card"><div class="card-head"><h2>واریز و کارمزد</h2><span class="muted">مبالغ واقعی بر حسب ریال</span></div><div class="notice">ثبت واریز به معنی تأیید آن نیست. کارمزد فقط بر اساس مبلغ واریز تأییدشده و نرخ مصوب پرونده محاسبه می‌شود.</div><div class="live-case-summary"><div><small>مجموع واریز تأییدشده</small><b>'+toFaDigits(confirmedTotal.toLocaleString("en-US"))+' ریال</b></div><div><small>مجموع در انتظار تأیید</small><b>'+toFaDigits(pendingTotal.toLocaleString("en-US"))+' ریال</b></div><div><small>مجموع کارمزد تأییدشده</small><b>'+toFaDigits(commissionTotal.toLocaleString("en-US"))+' ریال</b></div><div><small>تعداد واریزها</small><b>'+toFaDigits(disbursements.length)+'</b></div></div><div class="case-stage-list">'+(disbursementRows||'<div class="empty">هنوز واریزی برای این پرونده ثبت نشده است.</div>')+'</div><form id="live-disbursement-form" class="live-add-party"><input type="hidden" name="application" value="'+esc(app.id)+'"><h3>ثبت واریز واقعی</h3><div class="form-grid"><div class="form-row"><label>مبلغ واریزی (ریال) *</label><input class="field" name="amount_rial" required inputmode="numeric" min="1" type="text" dir="ltr" placeholder="مثلاً 1000000000"></div><div class="form-row"><label>مرجع مدرک (اختیاری)</label><input class="field" name="evidence_reference" maxlength="500" placeholder="شماره سند یا مسیر امن نگهداری مدرک"></div></div><button class="btn primary" type="submit">ثبت واریز در انتظار تأیید</button></form></div></section>';
}
async function loadLiveWorkflow(){
 if(!window.__OMID_API_PROXY_CONFIGURED)throw new Error("OMID_API_ORIGIN در Worker تنظیم نشده است.");
 if(!backendSessionUser){const me=await omidApiRequest("/api/v1/auth/me/");if(!me.response.ok)throw new Error("ابتدا با حساب کارکنان وارد بک‌اند شوید.");backendSessionUser=me.body.user;}
 if(!backendSessionUser||!backendSessionUser.is_staff)throw new Error("نشست کاربر داخلی معتبر نیست.");
 liveWorkflowData.loading=true;document.getElementById("content").innerHTML=renderWorkflow();
 const [appsRes,customersRes]=await Promise.all([omidApiRequest("/api/v1/applications/"),omidApiRequest("/api/v1/customers/")]);
 if(!appsRes.response.ok)throw new Error(omidApiErrorMessage(appsRes.body,appsRes.response.status));
 if(!customersRes.response.ok)throw new Error(omidApiErrorMessage(customersRes.body,customersRes.response.status));
 liveWorkflowData.applications=liveApiList(appsRes.body);liveWorkflowData.customers=liveApiList(customersRes.body);
 if(!liveWorkflowData.selectedId||!liveWorkflowData.applications.some(a=>String(a.id)===String(liveWorkflowData.selectedId)))liveWorkflowData.selectedId=String(liveWorkflowData.applications[0]?.id||"");
 liveWorkflowData.parties=[];liveWorkflowData.stages=[];liveWorkflowData.meratAssessments=[];liveWorkflowData.disbursements=[];
 if(liveWorkflowData.selectedId){
  const [partyRes,stageRes,meratRes,disbursementRes]=await Promise.all([omidApiRequest("/api/v1/applications/parties/?application="+encodeURIComponent(liveWorkflowData.selectedId)),omidApiRequest("/api/v1/applications/stages/?application="+encodeURIComponent(liveWorkflowData.selectedId)),omidApiRequest("/api/v1/applications/merat-assessments/?application="+encodeURIComponent(liveWorkflowData.selectedId)),omidApiRequest("/api/v1/applications/disbursements/?application="+encodeURIComponent(liveWorkflowData.selectedId))]);
  if(!partyRes.response.ok)throw new Error(omidApiErrorMessage(partyRes.body,partyRes.response.status));
  if(!stageRes.response.ok)throw new Error(omidApiErrorMessage(stageRes.body,stageRes.response.status));
  if(!meratRes.response.ok)throw new Error(omidApiErrorMessage(meratRes.body,meratRes.response.status));
  if(!disbursementRes.response.ok)throw new Error(omidApiErrorMessage(disbursementRes.body,disbursementRes.response.status));
  liveWorkflowData.parties=liveApiList(partyRes.body);liveWorkflowData.stages=liveApiList(stageRes.body);liveWorkflowData.meratAssessments=liveApiList(meratRes.body);liveWorkflowData.disbursements=liveApiList(disbursementRes.body);
 }
 liveWorkflowData.loaded=true;liveWorkflowData.loading=false;
}
async function refreshLiveWorkflowForApplication(appId){
 liveWorkflowData.selectedId=String(appId);const [partyRes,stageRes,meratRes,disbursementRes]=await Promise.all([omidApiRequest("/api/v1/applications/parties/?application="+encodeURIComponent(appId)),omidApiRequest("/api/v1/applications/stages/?application="+encodeURIComponent(appId)),omidApiRequest("/api/v1/applications/merat-assessments/?application="+encodeURIComponent(liveWorkflowData.selectedId)),omidApiRequest("/api/v1/applications/disbursements/?application="+encodeURIComponent(appId))]);
 if(!partyRes.response.ok)throw new Error(omidApiErrorMessage(partyRes.body,partyRes.response.status));
 if(!stageRes.response.ok)throw new Error(omidApiErrorMessage(stageRes.body,stageRes.response.status));
 if(!meratRes.response.ok)throw new Error(omidApiErrorMessage(meratRes.body,meratRes.response.status));
 if(!disbursementRes.response.ok)throw new Error(omidApiErrorMessage(disbursementRes.body,disbursementRes.response.status));
 liveWorkflowData.parties=liveApiList(partyRes.body);liveWorkflowData.stages=liveApiList(stageRes.body);liveWorkflowData.meratAssessments=liveApiList(meratRes.body);liveWorkflowData.disbursements=liveApiList(disbursementRes.body);
 const appRes=await omidApiRequest("/api/v1/applications/"+encodeURIComponent(appId)+"/");if(appRes.response.ok){const fresh=appRes.body;liveWorkflowData.applications=liveWorkflowData.applications.map(a=>String(a.id)===String(appId)?fresh:a);}
 liveWorkflowData.loaded=true;liveWorkflowData.loading=false;document.getElementById("content").innerHTML=renderWorkflow();
}
function renderWorkflow(){
 setMeta("گردش کار تسهیلات",'<button class="btn" data-action="refresh">↻ به‌روزرسانی</button><button class="btn primary" data-link="/applications/new">＋ پرونده جدید</button>');
 const active=applications.filter(a=>a.status!=="رد شده"),completed=active.filter(a=>getLoanStageIndex(a)>=getLoanWorkflow(a).definition.stages.length-1).length,companyCases=active.filter(a=>getLoanWorkflow(a).route==="company_score_fast").length,customerCases=active.filter(a=>getLoanWorkflow(a).route==="customer_account_score").length;
 const wizardCards=active.map(a=>{const w=getLoanWorkflow(a),idx=getLoanStageIndex(a),stage=w.definition.stages[idx],next=w.definition.stages[idx+1],progress=Math.round(idx/(w.definition.stages.length-1)*100);const steps=w.definition.stages.map((st,i)=>'<div class="loan-wizard-step '+(i<idx?'is-done':i===idx?'is-current':'is-locked')+'"><span class="loan-step-number">'+(i<idx?'✓':toFaDigits(i+1))+'</span><div class="loan-step-copy"><b>'+esc(st.label)+'</b><small>'+(i<idx?'این مرحله پشت سر گذاشته شده':i===idx?'مرحله جاری · اقدام موردنیاز':'پس از تکمیل مراحل قبل')+'</small></div></div>').join("");return '<article class="loan-wizard-card"><div class="loan-wizard-top"><div class="loan-wizard-identity"><span class="loan-case-mark">▤</span><div><div class="loan-case-id">'+esc(a.id)+'</div><h3>'+esc(a.customer)+'</h3><span class="loan-route-caption">'+esc(w.definition.label)+'</span></div></div><button class="btn" data-action="application-detail" data-id="'+esc(a.id)+'">جزئیات پرونده</button></div><div class="loan-wizard-controls"><div class="form-row"><label for="route-'+esc(a.id)+'">مسیر رسیدگی</label><select class="field" id="route-'+esc(a.id)+'" data-loan-route data-app-id="'+esc(a.id)+'">'+Object.entries(loanWorkflowDefinitions).map(([key,def])=>'<option value="'+esc(key)+'" '+(key===w.route?'selected':'')+'>'+esc(def.label)+'</option>').join("")+'</select></div><div class="loan-progress-summary"><div><span>پیشرفت پرونده</span><b>'+toFaDigits(progress)+'٪</b></div><div class="progress"><span style="width:'+progress+'%"></span></div><small>مرحله '+toFaDigits(idx+1)+' از '+toFaDigits(w.definition.stages.length)+'</small></div></div><div class="loan-wizard-current"><div class="loan-current-kicker"><span class="loan-current-pulse"></span>مرحله جاری</div><h4>'+esc(stage.label)+'</h4><p>'+esc(stage.help)+'</p><div class="loan-current-actions">'+(next?'<button class="btn primary" data-action="advance-loan-stage" data-id="'+esc(a.id)+'">تکمیل این مرحله و رفتن به مرحله بعد ←</button>':'<span class="pill">آخرین مرحله مسیر</span>')+'<span class="muted">با ثبت مرحله بعد، تاریخچه پرونده به‌روزرسانی می‌شود.</span></div></div><div class="loan-stepper-heading"><b>نقشه راه پرونده</b><span class="muted">مرحله‌ها به ترتیب انجام می‌شوند</span></div><div class="loan-wizard-steps">'+steps+'</div></article>';}).join("");
 const taskRows=tasks.map((t,i)=>'<div class="task"><input type="checkbox" data-task="'+i+'" '+(t.done?'checked':'')+'><div style="flex:1;'+(t.done?'text-decoration:line-through;color:#8b99aa':'')+'">'+esc(t.title)+'<small>مسئول: '+esc(t.owner)+' · سررسید: '+esc(t.due)+'</small></div>'+statusPill(t.priority)+' <button class="btn danger" data-action="delete-task" data-task-id="'+i+'" aria-label="حذف وظیفه">حذف</button></div>').join("");
 return '<div class="grid">'+stat("پرونده‌های فعال",active.length,"▤","","گردش کار تسهیلات")+stat("امتیاز شرکت",companyCases,"◈","blue","وام فوری از امتیاز شرکت")+stat("امتیاز حساب مشتری",customerCases,"◎","amber","وام بر اساس امتیاز حساب")+stat("رسیده به مرحله پایانی",completed,"✓","purple","نیازمند کنترل نتیجه پرداخت")+'</div><div class="notice" style="margin-top:16px">هر پرونده گردش کار مستقل دارد. با تغییر مرحله، رویداد در تاریخچه پرونده ثبت می‌شود. عنوان مرحله به معنی تأیید بانک یا تضمین پرداخت نیست؛ نتیجه فقط با مستندات و پاسخ رسمی ثبت می‌شود.</div><section class="loan-wizard-section"><div class="loan-wizard-section-head"><div><div class="eyebrow">مسیر مرحله‌به‌مرحله</div><h2>پرونده‌ها و گام بعدی هر پرونده</h2><p>برای هر پرونده، مرحله جاری مشخص است؛ گام بعدی فقط پس از تکمیل مرحله فعلی انجام می‌شود.</p></div><span class="loan-case-count">'+toFaDigits(active.length)+' پرونده فعال</span></div><div class="loan-wizard-list">'+(wizardCards||'<div class="card empty">پرونده فعالی وجود ندارد. برای شروع، یک پرونده جدید بسازید.</div>')+'</div></section>'+renderCaseWorkspace(active)+renderLiveWorkflow()+'<div class="section"><div class="card"><h2>افزودن وظیفه یا پیگیری</h2><div class="notice">وظایف عمومی برای پیگیری‌های خارج از مراحل پرونده هستند و در این نسخه در همین مرورگر ذخیره می‌شوند.</div><form id="task-form"><div class="form-row"><label>عنوان وظیفه *</label><input class="field" name="title" required maxlength="120" placeholder="مثلاً پیگیری نتیجه اعتبارسنجی پرونده"></div><div class="form-grid" style="margin-top:14px"><div class="form-row"><label>مسئول</label><select class="field" name="owner"><option>مریم رضایی</option><option>امیر کاظمی</option><option>آرمان صالحی</option><option>مدیر سامانه</option></select></div><div class="form-row"><label>سررسید</label><select class="field" name="due"><option>امروز</option><option>فردا</option><option>پس‌فردا</option><option>این هفته</option><option>بدون سررسید</option></select></div><div class="form-row full"><label>اولویت</label><select class="field" name="priority"><option>عادی</option><option>متوسط</option><option>بالا</option></select></div></div><button class="btn primary" type="submit" style="margin-top:15px">＋ افزودن وظیفه</button></form></div><div class="card"><h2>راهنمای دو مسیر</h2><div class="task-list">'+Object.values(loanWorkflowDefinitions).map(w=>'<div class="task"><span class="k-icon blue">↻</span><div><b>'+esc(w.label)+'</b><small>'+esc(w.description)+'</small><small>'+toFaDigits(w.stages.length)+' مرحله قابل پیگیری</small></div></div>').join("")+'</div><p class="muted">پیش‌نیازها و تضمین‌ها باید با ضوابط روز بانک و مدارک پرونده تأیید شوند.</p></div></div><div class="card table-card"><div class="card-head"><h2>فهرست وظایف و پیگیری‌های عمومی</h2><span class="muted">'+tasks.length+' وظیفه</span></div><div class="task-list">'+(taskRows||'<div class="empty">هنوز وظیفه‌ای ثبت نشده است.</div>')+'</div></div>';
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
  const serviceRows=serviceCatalog.map((item,index)=>'<tr><td>'+esc(item.code||"—")+'</td><td>'+esc(item.name)+'<small style="display:block;color:#98a4b5;margin-top:4px">'+esc(item.description||"")+'</small></td><td>'+esc(formatMoney(item.price))+'</td><td>'+(item.active===false?'<span class="pill gray">غیرفعال</span>':'<span class="pill">فعال</span>')+'</td><td><div class="actions"><button type="button" class="btn" data-action="edit-service" data-service-index="'+index+'">ویرایش</button><button type="button" class="btn" data-action="toggle-service" data-service-index="'+index+'">'+(item.active===false?"فعال‌سازی":"غیرفعال‌سازی")+'</button><button type="button" class="btn danger" data-action="delete-service" data-service-index="'+index+'">حذف</button></div></td></tr>').join("");
 const staffRows=staff.map((person,index)=>'<tr><td>'+esc(person.name)+'</td><td><span class="pill">'+esc(person.role)+'</span></td><td>'+esc(person.phone||"—")+'</td><td>'+esc(person.status||"فعال")+'</td><td><button type="button" class="btn danger" data-action="delete-staff" data-staff-index="'+index+'">حذف</button></td></tr>').join("");
 setMeta("تنظیمات",'<button class="btn primary" data-action="save-settings">ذخیره تنظیمات</button>');
 return '<nav class="settings-tabs" role="tablist" aria-label="بخش‌های تنظیمات"><button type="button" class="settings-tab" role="tab" data-action="settings-tab" data-tab="company" aria-selected="true">مشخصات شرکت</button><button type="button" class="settings-tab" role="tab" data-action="settings-tab" data-tab="banks" aria-selected="false">بانک‌ها</button><button type="button" class="settings-tab" role="tab" data-action="settings-tab" data-tab="staff" aria-selected="false">کارمندان و نقش‌ها</button><button type="button" class="settings-tab" role="tab" data-action="settings-tab" data-tab="general" aria-selected="false">عمومی</button><button type="button" class="settings-tab" role="tab" data-action="settings-tab" data-tab="connection" aria-selected="false">وضعیت اتصال</button><button type="button" class="settings-tab" role="tab" data-action="settings-tab" data-tab="security" aria-selected="false">امنیت و دسترسی</button><button type="button" class="settings-tab" role="tab" data-action="settings-tab" data-tab="services" aria-selected="false">خدمات و تعرفه‌ها</button></nav><div class="settings-layout"><div class="card" data-settings-panel="company"><h2>مشخصات شرکت برای قراردادها</h2><p class="muted">اطلاعات این قسمت در پیش‌نویس قرارداد وام فوری از امتیاز شرکت درج می‌شود.</p><div class="form-grid"><div class="form-row"><label>نام کامل شرکت</label><input class="field" id="company-name" value="'+esc(companySettings.name)+'" maxlength="200" placeholder="نام رسمی شرکت"></div><div class="form-row"><label>شماره ثبت</label><input class="field" id="company-registration" value="'+esc(companySettings.registrationNumber)+'" maxlength="80"></div><div class="form-row"><label>شناسه ملی</label><input class="field" id="company-national-id" value="'+esc(companySettings.nationalId)+'" maxlength="80"></div><div class="form-row"><label>کد اقتصادی</label><input class="field" id="company-economic-code" value="'+esc(companySettings.economicCode)+'" maxlength="80"></div><div class="form-row"><label>تلفن شرکت</label><input class="field" id="company-phone" value="'+esc(companySettings.phone)+'" maxlength="60"></div><div class="form-row"><label>نام نماینده مجاز</label><input class="field" id="company-representative" value="'+esc(companySettings.representative)+'" maxlength="160"></div><div class="form-row"><label>سمت نماینده</label><input class="field" id="company-representative-title" value="'+esc(companySettings.representativeTitle)+'" maxlength="100"></div><div class="form-row full"><label>نشانی رسمی شرکت</label><textarea class="field" id="company-address" rows="2" maxlength="1000">'+esc(companySettings.address)+'</textarea></div></div><div class="actions" style="margin-top:12px"><button class="btn primary" data-action="save-settings">ذخیره مشخصات شرکت</button></div></div><div class="card" data-settings-panel="banks" hidden><div class="card-head"><h2>بانک‌های قابل انتخاب</h2><span class="muted">'+bankCatalog.length+' بانک</span></div><p class="muted">بانک‌های این فهرست در بخش حساب‌های بانکی پروفایل مشتری قابل انتخاب هستند.</p><div class="table-wrap">'+table(["نام بانک","عملیات"],bankRows)+'</div><section class="profile-section"><h2>افزودن بانک</h2><form id="bank-catalog-form"><div class="form-grid"><div class="form-row"><label>نام بانک *</label><input class="field" name="bankCatalogName" required maxlength="100" placeholder="مثلاً بانک تجارت"></div></div><div class="actions" style="margin-top:14px"><button class="btn primary" type="submit">＋ افزودن بانک</button></div></form></section></div><div class="card" data-settings-panel="staff" hidden><div class="card-head"><h2>کارمندان و نقش‌ها</h2><span class="muted">'+staff.length+' کارمند</span></div><div class="notice">در این بخش می‌توانید فهرست کارکنان و نقش سازمانی آن‌ها را مدیریت کنید. این نقش‌ها فعلاً برای دسته‌بندی و نمایش هستند و هنوز مجوزهای واقعی دسترسی را کنترل نمی‌کنند.</div><div class="table-wrap">'+table(["نام کارمند","نقش","شماره تماس","وضعیت","عملیات"],staffRows)+'</div><section class="profile-section"><h2>افزودن کارمند</h2><form id="staff-form"><div class="form-grid"><div class="form-row"><label>نام و نام خانوادگی *</label><input class="field" name="staffName" required placeholder="نام کامل کارمند"></div><div class="form-row"><label>نقش سازمانی *</label><select class="field" name="staffRole" required>'+roleOptions.map(r=>'<option>'+r+'</option>').join("")+'</select></div><div class="form-row"><label>شماره تماس (اختیاری)</label><input class="field" name="staffPhone" inputmode="tel" placeholder="شماره تماس"></div><div class="form-row"><label>وضعیت</label><select class="field" name="staffStatus"><option>فعال</option><option>غیرفعال</option></select></div></div><div class="actions" style="margin-top:14px"><button class="btn primary" type="submit">＋ ثبت کارمند</button></div></form></section></div><div class="card" data-settings-panel="general" hidden><h2>تنظیمات عمومی</h2><div class="setting-row"><div>عنوان سامانه<small>نامی که در پنل نمایش داده می‌شود</small></div><input class="field" style="max-width:220px" value="سامانه امید"></div><div class="setting-row"><div>زبان رابط کاربری<small>زبان نمایش پنل</small></div><select class="field" style="max-width:180px"><option>فارسی</option></select></div><div class="setting-row"><div>منطقه زمانی<small>زمان نمایش رویدادها</small></div><select class="field" style="max-width:180px"><option>Asia/Tehran</option></select></div></div><div class="card" data-settings-panel="connection" hidden><h2>وضعیت اتصال</h2><div class="setting-row"><div>پراکسی API<small>ارسال هم‌مبدأ درخواست‌ها به Django از طریق Worker</small></div>'+statusPill(window.__OMID_API_PROXY_CONFIGURED?"آدرس تنظیم شده؛ نیازمند آزمون":"پیکربندی نشده")+'</div><div class="setting-row"><div>پایگاه داده<small>PostgreSQL از طریق بک‌اند</small></div>'+statusPill("وضعیت از آزمون API مشخص می‌شود")+'</div><div class="setting-row"><div>درگاه پیامک<small>قابل تنظیم در مرحله بعد</small></div>'+statusPill("پیکربندی نشده")+'</div><div class="actions" style="margin-top:16px"><button class="btn primary" type="button" data-action="check-api-connection">آزمون اتصال به بک‌اند</button></div><p class="muted">برای فعال شدن اتصال، مقدار OMID_API_ORIGIN در Environment Variables همین Worker باید به origin امن HTTPS بک‌اند اشاره کند. تا وقتی این مقدار تنظیم نشده، داده‌های رابط همچنان نمایشی و محلی هستند.</p>'+(window.__OMID_API_PROXY_CONFIGURED?'<div class="profile-section"><h3>آزمون نشست کارکنان</h3><p class="muted">این فرم فقط ورود نشست داخلی Django را بررسی می‌کند و هنوز مجوز کاربری را به صفحات مشتریان یا پرونده‌ها متصل نمی‌کند.</p><div class="notice" id="backend-session-status" role="status">'+esc(backendSessionMessage)+'</div><form id="backend-login-form"><div class="form-grid"><div class="form-row"><label for="backend-login-username">نام کاربری</label><input class="field" id="backend-login-username" name="username" type="text" autocomplete="username" maxlength="150" required></div><div class="form-row"><label for="backend-login-password">گذرواژه</label><input class="field" id="backend-login-password" name="password" type="password" autocomplete="current-password" maxlength="256" required></div></div><div class="actions" style="margin-top:12px"><button class="btn primary" type="submit">ورود و آزمون نشست</button><button class="btn" type="button" data-action="check-backend-session">بررسی نشست</button><button class="btn" type="button" data-action="logout-backend-session">خروج از بک‌اند</button></div></form><p class="muted">گذرواژه در localStorage ذخیره نمی‌شود و پس از تلاش برای ورود از فرم پاک می‌شود. داده‌های صفحهٔ اصلی تا پیاده‌سازی اتصال ماژول‌ها همچنان نمایشی هستند.</p></div>':'<div class="profile-section"><h3>آزمون نشست کارکنان</h3><div class="notice" id="backend-session-status" role="status">'+esc(backendSessionMessage)+'</div><p class="muted">فرم ورود تا تنظیم OMID_API_ORIGIN غیرفعال است؛ در این وضعیت نباید گذرواژه‌ای دریافت شود.</p></div>')+'</div></div></div><div class="card" data-settings-panel="services" hidden><div class="card-head"><h2>فهرست خدمات و تعرفه‌ها</h2><span class="muted">'+serviceCatalog.length+' خدمت</span></div><p class="muted">تعرفه‌ها به تومان ثبت می‌شوند. هنگام ثبت خدمت برای مشتری، تعرفه مصوب نمایش داده می‌شود.</p><div class="table-wrap">'+table(["کد","نام خدمت","تعرفه (تومان)","وضعیت","عملیات"],serviceRows||'<tr><td colspan="5" class="empty">هنوز خدمتی تعریف نشده است.</td></tr>')+'</div><section class="profile-section"><h2>تعریف خدمت جدید</h2><form id="service-catalog-form"><div class="form-grid"><div class="form-row"><label>نام خدمت *</label><input class="field" name="serviceName" required maxlength="160" placeholder="مثلاً تشکیل پرونده"></div><div class="form-row"><label>تعرفه (تومان) *</label><input class="field" type="text" inputmode="numeric" dir="ltr" autocomplete="off" name="servicePrice" required placeholder="مثلاً 2500000"></div><div class="form-row"><label>وضعیت</label><select class="field" name="serviceActive"><option value="yes">فعال</option><option value="no">غیرفعال</option></select></div><div class="form-row full"><label>توضیحات (اختیاری)</label><textarea class="field" name="serviceDescription" rows="2" maxlength="500"></textarea></div></div><div class="actions" style="margin-top:14px"><button class="btn primary" type="submit">＋ ثبت خدمت</button></div></form></section></div><div class="card" data-settings-panel="security" style="margin-top:0" hidden><h2>امنیت و دسترسی</h2><div class="notice">قبل از استفاده عملیاتی، ورود امن، نقش‌ها و مجوزها، ثبت رویدادهای ممیزی و مدیریت اسرار محیط باید تکمیل و آزموده شوند.</div><div class="setting-row"><div>احراز هویت کاربران<small>ورود و نشست امن</small></div><span class="pill wait">در حال توسعه</span></div><div class="setting-row"><div>ثبت رویدادهای ممیزی<small>ردیابی تغییرات پرونده‌ها</small></div><span class="pill wait">در حال توسعه</span></div></div></div>';
}
function formatMoney(value){return toFaDigits(Math.round(Number(value)||0).toLocaleString("en-US"));}
function renderServices(){
 const path=getAppPath(),isNew=path==="/services/new";
 const activeServices=serviceCatalog.filter(x=>x.active!==false);
 const records=serviceRecords.slice().reverse();
 const requestedCustomerId=new URLSearchParams(location.search).get("customerId")||"";
 const requestedCustomer=customers.find(c=>c.id===requestedCustomerId);
 const rows=records.map(r=>'<tr><td class="id">'+esc(r.receiptId)+'</td><td>'+esc(r.customerName)+'</td><td>'+esc(r.serviceName)+'</td><td>'+esc(formatMoney(r.total))+' تومان</td><td>'+esc(formatMoney(r.paid))+' تومان</td><td>'+esc(r.staffName)+'</td><td>'+esc(r.date)+'</td><td><button class="btn" data-action="print-service" data-record-id="'+esc(r.id)+'">چاپ رسید A5</button></td></tr>').join("");
 setMeta("خدمات و دریافت‌ها",'<button class="btn" data-link="/settings">تعریف خدمات و تعرفه‌ها</button><button class="btn primary" data-link="/services/new">＋ ثبت خدمت برای مشتری</button>');
 const form=isNew?'<div class="card"><div class="card-head"><h2>ثبت خدمت و دریافت وجه</h2><button class="btn" style="margin-inline-start:auto" data-link="/services">بازگشت به فهرست</button></div>'+(activeServices.length?'<form id="service-record-form"><div class="form-grid"><div class="form-row full"><label>جستجو و انتخاب مشتری *</label><input class="field" id="service-customer-search" type="text" autocomplete="off" value="'+esc(requestedCustomer?requestedCustomer.name+" · "+requestedCustomer.id:"")+'" placeholder="نام، کد مشتری، کد ملی یا شماره تماس را وارد کنید"><input type="hidden" name="customerId" id="service-customer-id" value="'+esc(requestedCustomer?requestedCustomer.id:"")+'"><div id="service-customer-results" class="profile-repeat-list" style="margin-top:8px;border:1px solid #e8edf4;border-radius:10px;overflow:hidden">'+(requestedCustomer?applicationCustomerResults(requestedCustomer.name,requestedCustomer.id,"service"):'<div class="empty" style="padding:14px">برای یافتن مشتری، بخشی از نام، کد مشتری، کد ملی یا شماره تماس را وارد کنید.</div>')+'</div><small id="service-customer-selected" class="muted">'+(requestedCustomer?"مشتری انتخاب‌شده: "+esc(requestedCustomer.name)+" · "+esc(requestedCustomer.id):"هنوز مشتری‌ای انتخاب نشده است.")+'</small></div><div class="form-row"><label>خدمت *</label><select class="field" name="serviceId" id="service-record-service" required><option value="">انتخاب خدمت</option>'+activeServices.map(x=>'<option value="'+esc(x.id)+'" data-price="'+Number(x.price||0)+'">'+esc(x.name)+' · '+esc(formatMoney(x.price))+' تومان</option>').join("")+'</select></div><div class="form-row"><label>کارمند ارائه‌دهنده *</label><select class="field" name="staffName" required><option value="">انتخاب کارمند</option>'+staff.filter(x=>x.status!=="غیرفعال").map(x=>'<option>'+esc(x.name)+'</option>').join("")+'</select></div><div class="form-row"><label>تعرفه خدمت (تومان)</label><input class="field" id="service-record-price" readonly placeholder="پس از انتخاب خدمت"></div><div class="form-row"><label>تخفیف (تومان)</label><input class="field" type="number" min="0" step="1000" name="discount" value="0"></div><div class="form-row"><label>مبلغ نهایی (تومان)</label><input class="field" id="service-record-total" readonly value=""></div><div class="form-row"><label>مبلغ دریافت‌شده (تومان) *</label><input class="field" type="text" inputmode="numeric" dir="ltr" autocomplete="off" name="paid" required value="0" placeholder="مبلغ به تومان"></div><div class="form-row"><label>روش پرداخت *</label><select class="field" name="paymentMethod" required><option value="کارت‌خوان">کارت‌خوان</option><option value="نقدی">نقدی</option><option value="واریز بانکی">واریز بانکی</option><option value="سایر">سایر</option></select></div><div class="form-row full"><label>توضیحات (اختیاری)</label><textarea class="field" name="note" rows="2" maxlength="500" placeholder="شرح تکمیلی خدمت"></textarea></div></div><div class="notice" style="margin-top:14px">شماره رسید پس از ثبت به‌صورت خودکار ایجاد می‌شود. مبلغ و شرح خدمت در سابقه ثبت‌شده ثابت می‌ماند.</div><div class="actions"><button class="btn primary" type="submit">ثبت خدمت و صدور رسید</button></div></form>':'<div class="empty">برای ثبت خدمت ابتدا از بخش تنظیمات، دست‌کم یک خدمت فعال و تعرفه آن را تعریف کنید.</div>')+'</div>':'';
 return '<div class="grid">'+stat("خدمات تعریف‌شده",serviceCatalog.length,"▧","","فهرست تعرفه‌ها")+stat("رسیدهای صادرشده",serviceRecords.length,"▤","blue","سوابق ثبت‌شده")+stat("کل مبالغ ثبت‌شده",formatMoney(serviceRecords.reduce((n,r)=>n+(Number(r.total)||0),0))+" تومان","◉","purple","مبلغ خدمات")+stat("مجموع دریافتی",formatMoney(serviceRecords.reduce((n,r)=>n+(Number(r.paid)||0),0))+" تومان","✓","amber","مبلغ دریافت‌شده")+'</div>'+form+'<div class="card table-card"><div class="card-head"><h2>سوابق خدمات و رسیدها</h2><span class="muted">'+records.length+' رسید</span></div><div class="table-wrap">'+table(["شماره رسید","مشتری","خدمت","مبلغ خدمت","دریافتی","کارمند","تاریخ","رسید"],rows||'<tr><td colspan="8" class="empty">هنوز خدمتی برای مشتری ثبت نشده است.</td></tr>')+'</div></div>';
}
function printServiceReceipt(recordId){
 const r=serviceRecords.find(x=>x.id===recordId);if(!r){toast("رسید پیدا نشد.");return;}
 const w=window.open("","_blank","width=900,height=700");if(!w){toast("مرورگر پنجره چاپ را مسدود کرد؛ اجازه بازشدن پنجره را بدهید.");return;}
 const company=companySettings.name||"شرکت امید";
 const html='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>رسید '+esc(r.receiptId)+'</title><style>@page{size:A5 portrait;margin:10mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#17283d;margin:0;font-size:12px;line-height:1.9}.receipt{width:100%;min-height:185mm;border:1px solid #9aa8b8;padding:8mm;position:relative}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #168d7d;padding-bottom:12px;margin-bottom:14px}.brand{font-size:18px;font-weight:bold}.muted{color:#65758a;font-size:10px}.title{text-align:center;font-size:16px;font-weight:bold;margin:10px 0 18px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 15px;margin-bottom:14px}.line{padding:7px 0;border-bottom:1px solid #e0e6ed}.amounts{margin-top:14px;border:1px solid #d7e0e9;padding:10px;border-radius:5px}.amounts div{display:flex;justify-content:space-between;padding:4px 0}.total{font-size:14px;font-weight:bold;color:#087e70;border-top:1px solid #d7e0e9;margin-top:4px;padding-top:8px!important}.foot{display:flex;justify-content:space-between;gap:15px;margin-top:28px}.sign{width:42%;border-top:1px solid #aab5c3;padding-top:6px;text-align:center;font-size:10px}.note{margin-top:12px;font-size:10px;white-space:pre-wrap}.stamp{position:absolute;bottom:12mm;left:12mm;border:1px dashed #aab5c3;padding:7px 12px;color:#68778a;font-size:10px}@media screen{body{background:#edf1f6;padding:18px}.receipt{background:#fff;max-width:148mm;margin:auto;box-shadow:0 4px 25px #12243a18}}@media print{body{padding:0}.receipt{border:1px solid #9aa8b8;box-shadow:none}}</style></head><body><article class="receipt"><div class="head"><div><div class="brand">'+esc(company)+'</div><div class="muted">'+esc(companySettings.address||"")+'</div><div class="muted">تلفن: '+esc(companySettings.phone||"—")+'</div></div><div><b>رسید دریافت وجه</b><div>شماره: '+esc(r.receiptId)+'</div><div>تاریخ: '+esc(r.date)+'</div></div></div><div class="title">رسید ارائه خدمت به مشتری</div><div class="meta"><div>نام مشتری: <b>'+esc(r.customerName)+'</b></div><div>کد مشتری: '+esc(r.customerId)+'</div><div>خدمت: <b>'+esc(r.serviceName)+'</b></div><div>کارمند: '+esc(r.staffName)+'</div><div>روش پرداخت: '+esc(r.paymentMethod)+'</div><div>کد خدمت: '+esc(r.serviceCode||"—")+'</div></div><div class="line">شرح خدمت: '+esc(r.description||r.note||r.serviceName)+'</div><div class="amounts"><div><span>تعرفه خدمت</span><b>'+esc(formatMoney(r.price))+' تومان</b></div><div><span>تخفیف</span><b>'+esc(formatMoney(r.discount))+' تومان</b></div><div class="total"><span>مبلغ نهایی خدمت</span><span>'+esc(formatMoney(r.total))+' تومان</span></div><div><span>مبلغ دریافت‌شده</span><b>'+esc(formatMoney(r.paid))+' تومان</b></div><div><span>مانده قابل پرداخت</span><b>'+esc(formatMoney(Math.max(0,r.total-r.paid)))+' تومان</b></div></div><div class="note">'+(r.note?'توضیحات: '+esc(r.note):"")+'</div><div class="foot"><div class="sign">امضا / مهر شرکت</div><div class="sign">امضای مشتری (در صورت نیاز)</div></div><div class="stamp">این رسید در سامانه امید ثبت شده است.</div></article></body></html>';
 w.document.open();w.document.write(html);w.document.close();w.focus();w.print();
}
function renderCustomerDetail(id){
 const c=customers.find(x=>x.id===id);if(!c)return '<div class="card">مشتری پیدا نشد.</div>';
 setMeta("مشتریان / پروفایل مشتری",'<div class="card customer-detail-actions" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px 12px;margin:0"><strong style="white-space:nowrap">خدمات مالی</strong><button class="btn primary" data-link="/applications/new?customerId='+encodeURIComponent(c.id)+'">＋ ایجاد پرونده تسهیلات</button><button class="btn primary" data-link="/guarantees/new?requesterId='+encodeURIComponent(c.id)+'">درخواست ضمانت</button><button class="btn primary" data-link="/services/new?customerId='+encodeURIComponent(c.id)+'">＋ ثبت خدمت</button></div><button class="btn primary" data-link="/customers/'+encodeURIComponent(c.id)+'/edit">ویرایش پروفایل</button><button class="btn" data-link="/customers">← بازگشت به فهرست</button>');
 const related=applications.filter(a=>a.customer===c.name);
 const addresses=Array.isArray(c.addresses)?c.addresses:[],phones=Array.isArray(c.phones)&&c.phones.length?c.phones:[{title:"شماره اصلی",number:c.phone||""}],banks=Array.isArray(c.bankAccounts)?c.bankAccounts:[],documents=Array.isArray(c.documents)?c.documents:[];
 const info=(label,value)=>'<div class="form-row"><label>'+label+'</label><div>'+esc(value||"—")+'</div></div>';
 const addressHtml=addresses.length?addresses.map(a=>'<div class="profile-info-card"><b>'+esc(a.title||"آدرس")+'</b><p>'+esc(a.value||"—")+'</p><small>کدپستی: '+esc(a.postalCode||"—")+'</small></div>').join(""):'<div class="empty">آدرسی ثبت نشده است.</div>';
 const phoneHtml=phones.length?phones.map(p=>'<div class="profile-info-card"><b>'+esc(p.title||"شماره تماس")+'</b><p dir="ltr">'+esc(p.number||"—")+'</p></div>').join(""):'<div class="empty">شماره‌ای ثبت نشده است.</div>';
 const bankHtml=banks.length?banks.map(b=>'<div class="profile-info-card"><b>'+esc(b.bank||"بانک")+'</b><p>'+esc(b.title||"حساب بانکی")+'</p><small>شماره حساب: '+esc(b.accountNumber||"—")+'</small></div>').join(""):'<div class="empty">حساب بانکی ثبت نشده است.</div>';
 const docHtml=documents.length?documents.map(d=>'<div class="profile-document-card"><div class="profile-document-preview">'+(d.dataUrl&&String(d.dataUrl).startsWith("data:image/")?'<a href="'+esc(d.dataUrl)+'" target="_blank" rel="noopener"><img src="'+esc(d.dataUrl)+'" alt="'+esc(d.title||d.type||"مدرک مشتری")+'"></a>':d.dataUrl?'<a class="btn" href="'+esc(d.dataUrl)+'" target="_blank" rel="noopener">مشاهده / بازکردن فایل</a>':'<span class="muted">فایلی پیوست نشده</span>')+'</div><div><b>'+esc(d.title||d.type||"مدرک")+'</b><p class="muted">'+esc(d.type||"سایر")+'</p><small>'+esc(d.fileName||"")+'</small></div></div>').join(""):'<div class="empty">هنوز مدرکی به پروفایل مشتری افزوده نشده است.</div>';
 return '<div class="card customer-detail-card"><div class="card-head"><div><h2>'+esc(c.name)+'</h2><span class="muted">کد مشتری: '+esc(c.id)+'</span></div>'+statusPill(c.status)+'</div><section class="profile-section"><h2>اطلاعات هویتی</h2><div class="form-grid">'+info("نام",c.firstName||c.name)+info("نام خانوادگی",c.lastName)+info("کد ملی",c.nationalId)+info("تاریخ تولد",isoToFa(c.birthDate)||c.birthDate)+info("نام پدر",c.fatherName)+info("شغل",c.occupation)+info("کدپستی اصلی",c.postalCode)+info("ایمیل",c.email)+info("مسئول پرونده",c.manager)+info("سامانه ثنا",c.sana?"ثبت‌نام دارد":"ثبت‌نام نشده / نامشخص")+info("یادداشت",c.notes)+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>آدرس‌ها</h2><span class="muted">'+addresses.length+' مورد</span></div><div class="profile-info-grid">'+addressHtml+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>شماره‌های تماس</h2><span class="muted">'+phones.length+' مورد</span></div><div class="profile-info-grid">'+phoneHtml+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>حساب‌های بانکی</h2><span class="muted">'+banks.length+' مورد</span></div><div class="profile-info-grid">'+bankHtml+'</div></section><section class="profile-section"><div class="profile-section-head"><h2>مدارک مشتری</h2><span class="muted">'+documents.length+' مدرک</span><button class="btn primary" data-link="/customers/'+encodeURIComponent(c.id)+'/edit">افزودن / مدیریت مدارک</button></div><div class="profile-document-grid">'+docHtml+'</div></section><section class="profile-section"><div class="card-head"><h2>پرونده‌های مرتبط</h2><span class="muted">'+related.length+' مورد</span></div>'+(related.length?table(["شماره پرونده","نوع تسهیلات","مبلغ","وضعیت","عملیات"],related.map(a=>'<tr><td class="id">'+esc(a.id)+'</td><td>'+esc(a.type)+'</td><td>'+esc(a.amount)+'</td><td>'+statusPill(a.status)+'</td><td><button class="btn" data-action="application-detail" data-id="'+esc(a.id)+'">مشاهده</button></td></tr>').join("")):'<div class="empty">هنوز پرونده‌ای برای این مشتری ثبت نشده است.</div>')+'<div class="actions" style="margin-top:18px"><button class="btn primary" data-link="/applications/new?customerId='+encodeURIComponent(c.id)+'">ایجاد پرونده تسهیلات</button><button class="btn" data-link="/guarantees/new?requesterId='+encodeURIComponent(c.id)+'">درخواست ضمانت</button></div></section></div>';
}
function guaranteeApplicationResults(query,selectedId){
 const raw=toEnDigits(String(query||"").trim()).toLocaleLowerCase("fa");
 const normalize=v=>toEnDigits(String(v||"")).toLocaleLowerCase("fa");
 const sorted=applications.slice().sort((a,b)=>normalize(b.date).localeCompare(normalize(a.date))||String(b.id).localeCompare(String(a.id)));
 const matches=sorted.filter(a=>{
  const c=customers.find(x=>x.name===a.customer||x.id===a.customerId);
  const haystack=[a.id,a.applicationNumber,a.customer,a.customerId,a.type,a.status,c&&c.nationalId,c&&c.phone,...(c&&Array.isArray(c.phones)?c.phones.map(p=>p.number):[])].map(normalize).join(" ");
  return !raw||haystack.includes(raw);
 }).slice(0,15);
 if(!matches.length)return '<div class="empty" style="padding:14px">پرونده‌ای با این شماره یا مشخصات مشتری پیدا نشد.</div>';
 return matches.map(a=>{
  const c=customers.find(x=>x.name===a.customer||x.id===a.customerId);
  const selected=a.id===selectedId;
  return '<button type="button" class="customer-pick-option" data-action="select-guarantee-application" data-application-id="'+esc(a.id)+'" style="display:flex;width:100%;justify-content:space-between;align-items:center;gap:12px;text-align:right;padding:12px 13px;border:0;border-bottom:1px solid #edf1f6;background:'+(selected?'#eefaf7':'#fff')+';cursor:pointer;color:#243850"><span><b>'+esc(a.id)+'</b><small style="display:block;color:#52657c;margin-top:4px">'+esc(a.customer)+' · '+esc(a.type)+' · '+esc(a.amount)+'</small><small style="display:block;color:#8492a6;margin-top:4px">'+(c&&c.nationalId?'کد ملی '+esc(c.nationalId)+' · ':'')+(c&&c.phone?'موبایل '+esc(c.phone):'شماره تماس ثبت نشده')+' · تاریخ '+esc(a.date||"نامشخص")+'</small></span><span class="pill">'+(selected?'انتخاب‌شده':esc(a.status||"پرونده تسهیلات"))+'</span></button>';
 }).join("");
}
function renderGuaranteeRequest(){
 const params=new URLSearchParams(location.search);
 const requester=customers.find(c=>c.id===params.get("requesterId"));
 const selectedId=params.get("applicationId")||"";
 setMeta("درخواست ضمانت",'<button class="btn" data-link="'+(requester?"/customers/"+encodeURIComponent(requester.id):"/customers")+'">← بازگشت</button>');
 const selected=applications.find(a=>a.id===selectedId);
 return '<div class="card"><div class="card-head"><div><h2>ثبت درخواست ضمانت</h2><span class="muted">ابتدا پرونده تسهیلات موردنظر را انتخاب کنید.</span></div><span class="pill wait">نسخه نمایشی</span></div><div class="notice">فهرست به‌صورت پیش‌فرض از جدیدترین پرونده‌های تسهیلات شروع می‌شود. می‌توانید با شماره پرونده، نام مشتری، کد ملی یا موبایل جست‌وجو کنید؛ سپس پرونده مرتبط را انتخاب کنید.</div><form id="guarantee-request-form" data-requester-id="'+esc(requester?requester.id:"")+'"><div class="form-grid"><div class="form-row full"><label>درخواست‌دهنده ضمانت</label><input class="field" readonly value="'+esc(requester?requester.name+" · "+requester.id:"از فهرست مشتریان انتخاب نشده")+'"><small class="muted">درخواست‌دهنده می‌تواند با مشتریِ پرونده تسهیلات متفاوت باشد.</small></div><div class="form-row full"><label for="guarantee-application-search">جست‌وجوی پرونده تسهیلات *</label><input id="guarantee-application-search" class="field" autocomplete="off" placeholder="شماره پرونده، نام مشتری، کد ملی یا موبایل..." value="'+esc(selected?selected.id:"")+'"><input type="hidden" name="applicationId" id="guarantee-application-id" value="'+esc(selected?selected.id:"")+'"><div id="guarantee-application-results" style="border:1px solid #e8edf4;border-radius:10px;overflow:hidden;max-height:360px;overflow-y:auto;margin-top:6px">'+guaranteeApplicationResults(selected?selected.id:"",selected?selected.id:"")+'</div><div id="guarantee-application-selected" class="notice" style="margin-top:10px;margin-bottom:0">'+(selected?"پرونده انتخاب‌شده: "+esc(selected.id)+" · "+esc(selected.customer):"یک پرونده را از نتایج بالا انتخاب کنید.")+'</div></div><div class="form-row full"><label for="guarantee-note">توضیحات (اختیاری)</label><textarea class="field" id="guarantee-note" name="note" rows="3" maxlength="1000" placeholder="توضیحات تکمیلی درخواست ضمانت"></textarea></div></div><div class="actions" style="margin-top:18px"><button class="btn primary" type="submit">ثبت درخواست ضمانت</button><button class="btn" type="button" data-link="'+(requester?"/customers/"+encodeURIComponent(requester.id):"/customers")+'">انصراف</button></div></form></div><div class="card table-card"><div class="card-head"><h2>درخواست‌های ضمانت ثبت‌شده در این مرورگر</h2><span class="muted">'+guaranteeRequests.length+' مورد</span></div>'+(guaranteeRequests.length?table(["شماره درخواست","پرونده تسهیلات","مشتری پرونده","وضعیت","تاریخ ثبت"],guaranteeRequests.slice().reverse().map(g=>'<tr><td class="id">'+esc(g.id)+'</td><td>'+esc(g.applicationId)+'</td><td>'+esc(g.customer)+'</td><td>'+statusPill(g.status)+'</td><td>'+esc(g.date)+'</td></tr>').join("")):'<div class="empty">هنوز درخواست ضمانتی در این مرورگر ثبت نشده است.</div>')+'</div><div class="notice">توجه: در حال حاضر این رابط از داده‌های نمایشی و ذخیره‌سازی همین مرورگر استفاده می‌کند؛ ثبت درخواست در پایگاه داده مرکزی یا ارسال برای واحد ضمانت هنوز متصل نشده است.</div>';
}
function renderApplicationDetail(id){
 const a=applications.find(x=>x.id===id);if(!a)return '<div class="card">پرونده پیدا نشد.</div>';
 const showCompanyContract=getLoanWorkflow(a).route==="company_score_fast";
 const contract=a.contractDetails||{};
 const customerRecord=customers.find(c=>c.id===a.customerId)||customers.find(c=>c.name===a.customer)||{};
 const contractCard='<div class="card" style="margin-top:18px"><div class="card-head"><h2>قرارداد تسهیلات</h2><span class="muted">پیش‌نویس بر اساس تنظیمات شرکت و مشخصات پرونده</span></div><div class="notice">این بخش پیش‌نویس داخلی است و تا بررسی حقوقی، تکمیل اطلاعات و امضای طرفین، قرارداد معتبر یا تأییدشده محسوب نمی‌شود.</div><div class="form-grid"><div class="form-row"><label>نام شرکت</label><div>'+esc(companySettings.name||"در تنظیمات ثبت نشده")+'</div></div><div class="form-row"><label>شماره ثبت / شناسه ملی</label><div>'+esc([companySettings.registrationNumber,companySettings.nationalId].filter(Boolean).join(" / ")||"در تنظیمات ثبت نشده")+'</div></div><div class="form-row"><label>کد اقتصادی</label><div>'+esc(companySettings.economicCode||"ثبت نشده")+'</div></div><div class="form-row"><label>نماینده شرکت</label><div>'+esc([companySettings.representative,companySettings.representativeTitle].filter(Boolean).join(" · ")||"در تنظیمات ثبت نشده")+'</div></div><div class="form-row"><label>مشتری / طرف قرارداد</label><div>'+esc(customerRecord.name||a.customer||"—")+'</div></div><div class="form-row"><label>شناسه مشتری</label><div>'+esc(customerRecord.id||a.customerId||"—")+'</div></div><div class="form-row"><label>نوع تسهیلات</label><div>'+esc(a.type||"—")+'</div></div><div class="form-row"><label>مبلغ مصوب تسهیلات (تومان) *</label><input class="field" id="contract-approved-amount" value="'+esc(contract.approvedAmount??(a.amount||"").replace(/[^0-9۰-۹٠-٩.,٫\s]/g,""))+'" maxlength="80" placeholder="مبلغ مصوب نهایی"></div><div class="form-row"><label>مدت بازپرداخت (ماه) *</label><input class="field" id="contract-term" value="'+esc(contract.term||a.term||"")+'" inputmode="numeric" maxlength="4" placeholder="مثلاً ۳۶"></div><div class="form-row"><label>مبلغ هر قسط (تومان)</label><input class="field" id="contract-installment" value="'+esc(contract.installment||"")+'" maxlength="80" placeholder="طبق برنامه بازپرداخت"></div><div class="form-row"><label>کارمزد / نرخ مصوب</label><input class="field" id="contract-rate" value="'+esc(contract.rate||"")+'" maxlength="100" placeholder="طبق تأیید رسمی بانک"></div><div class="form-row"><label>تضمین‌ها و وثایق</label><input class="field" id="contract-guarantees" value="'+esc(contract.guarantees||"")+'" maxlength="500" placeholder="طبق مصوبه نهایی"></div><div class="form-row"><label>تاریخ قرارداد</label><input class="field" id="contract-date" value="'+esc(contract.date||"")+'" maxlength="30" placeholder="تاریخ نهایی امضا"></div><div class="form-row full"><label>شرایط تکمیلی و تعهدات</label><textarea class="field" id="contract-terms" rows="3" maxlength="3000" placeholder="شرایط مصوب و تعهدات طرفین">'+esc(contract.terms||"")+'</textarea></div></div><div class="actions" style="margin-top:12px"><button class="btn primary" data-action="save-contract" data-app-id="'+esc(a.id)+'">ذخیره مشخصات قرارداد</button></div><div class="setting-row"><div>نشانی شرکت</div><span>'+esc(companySettings.address||"ثبت نشده")+'</span></div><div class="setting-row"><div>تلفن شرکت</div><span>'+esc(companySettings.phone||"ثبت نشده")+'</span></div></div>';
 setMeta("درخواست‌ها / جزئیات پرونده",'<button class="btn" data-link="/applications">← بازگشت</button>');
 const relatedDocs=docs.filter(d=>d.case===a.id);
 const docRows=relatedDocs.map(d=>'<tr><td>'+esc(d.name)+'</td><td>'+esc(d.type)+'</td><td>'+statusPill(d.status)+'</td><td>'+esc(d.date)+'</td></tr>').join('');
 const activity=(a.activity||[]).slice().reverse().map(ev=>'<div class="task"><span class="k-icon blue">◷</span><div style="flex:1"><b>'+esc(ev.type)+'</b><small>'+esc(ev.text)+'</small><small>'+esc(ev.date)+'</small></div></div>').join('');
 const workflow=getLoanWorkflow(a),stageIndex=getLoanStageIndex(a),currentStage=workflow.definition.stages[stageIndex],nextStage=workflow.definition.stages[stageIndex+1],progress=Math.round(stageIndex/(workflow.definition.stages.length-1)*100);
 const workflowSteps=workflow.definition.stages.map((st,i)=>'<div class="loan-wizard-step '+(i<stageIndex?'is-done':i===stageIndex?'is-current':'is-locked')+'"><span class="loan-step-number">'+(i<stageIndex?'✓':toFaDigits(i+1))+'</span><div class="loan-step-copy"><b>'+esc(st.label)+'</b><small>'+(i<stageIndex?'این مرحله پشت سر گذاشته شده':i===stageIndex?'مرحله جاری · اقدام موردنیاز':'پس از تکمیل مراحل قبل')+'</small></div></div>').join('');
 const workflowPanel='<section class="loan-wizard-section" style="margin:18px 0"><article class="loan-wizard-card"><div class="loan-wizard-top"><div class="loan-wizard-identity"><span class="loan-case-mark">▤</span><div><div class="loan-case-id">'+esc(a.id)+'</div><h3>گردش کار پرونده</h3><span class="loan-route-caption">'+esc(workflow.definition.label)+'</span></div></div><span class="pill">'+toFaDigits(stageIndex+1)+' از '+toFaDigits(workflow.definition.stages.length)+' مرحله</span></div><div class="loan-wizard-controls"><div class="form-row"><label for="detail-route-'+esc(a.id)+'">مسیر رسیدگی</label><select class="field" id="detail-route-'+esc(a.id)+'" data-loan-route data-app-id="'+esc(a.id)+'">'+Object.entries(loanWorkflowDefinitions).map(([key,def])=>'<option value="'+esc(key)+'" '+(key===workflow.route?'selected':'')+'>'+esc(def.label)+'</option>').join('')+'</select></div><div class="loan-progress-summary"><div><span>پیشرفت پرونده</span><b>'+toFaDigits(progress)+'٪</b></div><div class="progress"><span style="width:'+progress+'%"></span></div><small>مرحله '+toFaDigits(stageIndex+1)+' از '+toFaDigits(workflow.definition.stages.length)+'</small></div></div><div class="loan-wizard-current"><div class="loan-current-kicker"><span class="loan-current-pulse"></span>مرحله جاری</div><h4>'+esc(currentStage.label)+'</h4><p>'+esc(currentStage.help)+'</p><div class="loan-current-actions">'+(nextStage?'<button class="btn primary" data-action="advance-loan-stage" data-id="'+esc(a.id)+'">تکمیل این مرحله و رفتن به مرحله بعد ←</button>':'<span class="pill">آخرین مرحله مسیر</span>')+'<span class="muted">با ثبت مرحله بعد، تاریخچه پرونده به‌روزرسانی می‌شود.</span></div></div><div class="loan-stepper-heading"><b>نقشه راه پرونده</b><span class="muted">مرحله‌ها به ترتیب انجام می‌شوند</span></div><div class="loan-wizard-steps">'+workflowSteps+'</div></article></section>';
 return '<div class="card"><div class="card-head"><h2>پرونده '+esc(a.id)+'</h2>'+statusPill(a.status)+'</div>'+workflowPanel+'<div class="form-grid"><div class="form-row"><label>مشتری</label><div>'+esc(a.customer)+'</div></div><div class="form-row"><label>نوع تسهیلات</label><div>'+esc(a.type)+'</div></div><div class="form-row"><label>مبلغ درخواستی</label><div>'+esc(a.amount)+'</div></div><div class="form-row"><label>مسئول پرونده</label><div>'+esc(a.manager)+'</div></div><div class="form-row"><label>مسیر گردش کار</label><select class="field" data-loan-route data-app-id="'+esc(a.id)+'">'+Object.entries(loanWorkflowDefinitions).map(([key,def])=>'<option value="'+esc(key)+'" '+(key===getLoanWorkflow(a).route?'selected':'')+'>'+esc(def.label)+'</option>').join("")+'</select></div><div class="form-row"><label>مرحله جاری</label><div>'+esc(getLoanWorkflow(a).definition.stages[getLoanStageIndex(a)].label)+'</div></div><div class="form-row"><label>تاریخ ثبت</label><div>'+esc(a.date)+'</div></div></div><div class="setting-row"><div>مرحله گردش کار<small>مرحله بعدی را فقط پس از بررسی مدارک و اقدام لازم انتخاب کنید</small></div><select class="field" data-loan-stage data-app-id="'+esc(a.id)+'" style="max-width:300px">'+getLoanWorkflow(a).definition.stages.map(st=>'<option value="'+esc(st.key)+'" '+(st.key===getLoanWorkflow(a).definition.stages[getLoanStageIndex(a)].key?"selected":"")+'">'+esc(st.label)+'</option>').join("")+'</select></div><div class="setting-row"><div>تغییر وضعیت پرونده<small>هر تغییر در تاریخچه همین نشست ثبت می‌شود</small></div><select class="field" id="application-detail-status" data-app-id="'+esc(a.id)+'" style="max-width:220px"><option '+(a.status==="در حال بررسی"?"selected":"")+'>در حال بررسی</option><option '+(a.status==="در انتظار تأیید"?"selected":"")+'>در انتظار تأیید</option><option '+(a.status==="تکمیل مدارک"?"selected":"")+'>تکمیل مدارک</option><option '+(a.status==="تأیید شده"?"selected":"")+'>تأیید شده</option><option '+(a.status==="رد شده"?"selected":"")+'>رد شده</option></select></div>'+(showCompanyContract?contractCard:'')+'<div class="card" style="margin-top:18px"><div class="card-head"><h2>مدارک مرتبط</h2><span class="muted">'+relatedDocs.length+' مدرک</span></div>'+ (docRows?table(["نام مدرک","نوع","وضعیت","تاریخ"],docRows):'<div class="empty">مدرکی برای این پرونده در داده نمونه ثبت نشده است.</div>')+'<div class="actions"><button class="btn" data-link="/documents">رفتن به مدیریت مدارک</button></div></div><div class="section"><div class="card"><h2>ثبت یادداشت پیگیری</h2><form id="application-note-form" data-app-id="'+esc(a.id)+'"><div class="form-row"><label>یادداشت *</label><textarea class="field" name="note" required maxlength="1000" placeholder="نتیجه تماس، اقدام بعدی یا نکته پرونده..."></textarea></div><div class="actions" style="margin-top:12px"><button class="btn primary" type="submit">ثبت یادداشت</button></div></form></div><div class="card"><h2>تاریخچه پرونده</h2><div class="task-list">'+(activity||'<div class="empty">هنوز رویدادی ثبت نشده است.</div>')+'</div></div></div><div class="notice">این تاریخچه و یادداشت‌ها فقط در حافظه موقت رابط کاربری هستند. برای استفاده واقعی، ذخیره‌سازی سمت سرور، کنترل دسترسی و گزارش ممیزی لازم است.</div><div class="actions"><button class="btn" data-link="/workflow">مشاهده گردش کار</button></div></div>';
}
function getAppPath(){
 let path=location.pathname||window.__OMID_REQUEST_PATH||"/";
 if(!path.startsWith("/"))path="/"+path;
 while(path.length>1&&path.endsWith("/"))path=path.slice(0,-1);
 return path;
}
function render(){
 let path=getAppPath();
 let page=path.split("/")[1]||"dashboard";
 if(page==="new")page=path.split("/")[1]==="customers"?"customers":"applications";
 if(!pageInfo[page])page="dashboard";
 currentPage=page;
 document.getElementById("page-title").textContent=pageInfo[page][0];
 document.getElementById("page-subtitle").textContent=pageInfo[page][1];
 document.querySelectorAll(".menu a").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
 document.getElementById("global-search").placeholder=page==="customers"?"جست‌وجوی مشتری...":page==="applications"?"جست‌وجوی پرونده...":"جست‌وجو در صفحه...";
 let html="";
 if(path==="/guarantees/new") html=renderGuaranteeRequest();
 else if(path.startsWith("/customers/")&&path.endsWith("/edit")) html=renderCustomers();
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
 else if(page==="services")html=renderServices();
 document.getElementById("content").innerHTML=html;
  installPersianLocale();
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
function navigate(path){if(!path||typeof path!=="string")return;try{const target=new URL(path,location.origin);if(target.origin!==location.origin){location.assign(target.href);return;}const destination=target.pathname+target.search+target.hash;if(destination===location.pathname+location.search+location.hash){render();return;}location.assign(destination);}catch(error){console.error("Omid navigation failed",error);location.assign(path);}}
function toast(message){const el=document.getElementById("toast");el.textContent=message;el.style.display="block";clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.style.display="none",3200);}
document.addEventListener("input",e=>{const x=e.target;if(!x.matches('input:not([type="email"]):not([type="url"]):not([type="password"]):not([type="file"]):not([type="hidden"]),textarea'))return;const p=x.selectionStart,a=x.value,b=toFaDigits(a);if(a!==b){x.value=b;try{x.setSelectionRange(p+(b.length-a.length),p+(b.length-a.length));}catch(_){}}},true);
document.addEventListener("submit",e=>{if(e.target.querySelectorAll)e.target.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="email"]):not([type="url"]):not([type="password"]),textarea').forEach(x=>x.value=toEnDigits(x.value));},true);
document.addEventListener("click",e=>{const mb=e.target.closest("[data-jalali-month]");if(mb){const w=mb.closest(".jalali-picker"),p=w.querySelector(".jalali-calendar");let y=+p.dataset.year,m=+p.dataset.month+(+mb.dataset.jalaliMonth);if(m<1){m=12;y--;}if(m>12){m=1;y++;}p.dataset.year=y;p.dataset.month=m;drawJalaliCalendar(w);return;}const db=e.target.closest("[data-jalali-day]");if(db){const w=db.closest(".jalali-picker"),i=w.querySelector("[data-jalali-visible]"),h=w.querySelector("[data-jalali-hidden]");h.value=db.dataset.jalaliDay;i.dataset.isoValue=h.value;i.value=isoToFa(h.value);w.querySelector(".jalali-calendar").hidden=true;h.dispatchEvent(new Event("change",{bubbles:true}));return;}const tb=e.target.closest("[data-jalali-today]");if(tb){const w=tb.closest(".jalali-picker"),v=isoDay(new Date()),i=w.querySelector("[data-jalali-visible]");w.querySelector("[data-jalali-hidden]").value=v;i.dataset.isoValue=v;i.value=isoToFa(v);w.querySelector(".jalali-calendar").hidden=true;return;}const cb=e.target.closest("[data-jalali-clear]");if(cb){const w=cb.closest(".jalali-picker");w.querySelector("[data-jalali-hidden]").value="";w.querySelector("[data-jalali-visible]").value="";w.querySelector("[data-jalali-visible]").dataset.isoValue="";w.querySelector(".jalali-calendar").hidden=true;return;}const di=e.target.closest("[data-jalali-visible]");if(di){const w=di.closest(".jalali-picker"),p=w.querySelector(".jalali-calendar"),d=fromIso(di.dataset.isoValue),a=d?faParts(d):faParts(new Date());p.dataset.year=a.year;p.dataset.month=a.month;drawJalaliCalendar(w);p.hidden=false;return;}if(!e.target.closest(".jalali-picker"))document.querySelectorAll(".jalali-calendar").forEach(p=>p.hidden=true);},true);
document.addEventListener("click",async e=>{
 const customerPick=e.target.closest('[data-action="select-application-customer"]');
 if(customerPick){
  const customer=customers.find(c=>c.id===customerPick.dataset.customerId);
  if(customer){const search=document.getElementById("application-customer-search"),idField=document.getElementById("application-customer-id"),nameField=document.getElementById("application-customer-name"),results=document.getElementById("application-customer-results"),label=document.getElementById("application-customer-selected");if(search)search.value=customer.name+" · "+customer.id;if(idField)idField.value=customer.id;if(nameField)nameField.value=customer.name;if(results)results.innerHTML=applicationCustomerResults(customer.name,customer.id);if(label)label.textContent="مشتری انتخاب‌شده: "+customer.name+" · "+customer.id;}
  return;
 }
 const serviceCustomerPick=e.target.closest('[data-action="select-service-customer"]');
 if(serviceCustomerPick){const customer=customers.find(c=>c.id===serviceCustomerPick.dataset.customerId);if(customer){const search=document.getElementById("service-customer-search"),idField=document.getElementById("service-customer-id"),results=document.getElementById("service-customer-results"),label=document.getElementById("service-customer-selected");if(search)search.value=customer.name+" · "+customer.id;if(idField)idField.value=customer.id;if(results)results.innerHTML=applicationCustomerResults(customer.name,customer.id,"service");if(label)label.textContent="مشتری انتخاب‌شده: "+customer.name+" · "+customer.id;}return;}
 const link=e.target.closest("[data-link]");
 if(link){const destination=link.dataset.link||link.getAttribute("href");if(destination){e.preventDefault();navigate(destination);}return;}
 const anchor=e.target.closest("a[data-page]");
 if(anchor){e.preventDefault();navigate(anchor.getAttribute("href"));return;}
 const action=e.target.closest("[data-action]");
 if(action){
  const act=action.dataset.action;
  if(act==="print-service"){printServiceReceipt(action.dataset.recordId);return;}
   if(act==="edit-service"){
    const index=Number(action.dataset.serviceIndex),item=serviceCatalog[index];
    if(item){
     let modal=document.getElementById("service-edit-modal");
     if(!modal){
      modal=document.createElement("div");modal.id="service-edit-modal";modal.className="omid-modal-backdrop";modal.hidden=true;
      modal.innerHTML='<section class="omid-modal" role="dialog" aria-modal="true" aria-labelledby="service-edit-title"><div class="omid-modal-head"><h2 id="service-edit-title">ویرایش خدمت و تعرفه</h2><button type="button" class="btn" data-action="close-service-edit">بستن</button></div><form id="service-edit-form"><input type="hidden" name="serviceIndex"><div class="form-grid"><div class="form-row"><label>نام خدمت *</label><input class="field" name="serviceName" required maxlength="160"></div><div class="form-row"><label>تعرفه خدمت (تومان) *</label><input class="field" type="text" inputmode="numeric" dir="ltr" autocomplete="off" name="servicePrice" required></div><div class="form-row"><label>توضیحات (اختیاری)</label><textarea class="field" name="serviceDescription" rows="3" maxlength="500"></textarea></div></div><div class="omid-modal-actions"><button class="btn primary" type="submit">ذخیره تغییرات</button><button class="btn" type="button" data-action="close-service-edit">انصراف</button></div></form></section>';
      document.body.appendChild(modal);
     }
     const form=modal.querySelector("#service-edit-form");form.elements.serviceIndex.value=String(index);form.elements.serviceName.value=item.name||"";form.elements.servicePrice.value=String(item.price??0);form.elements.serviceDescription.value=item.description||"";modal.hidden=false;form.elements.serviceName.focus();
    }
    return;
   }
   if(act==="close-service-edit"){const modal=document.getElementById("service-edit-modal");if(modal)modal.hidden=true;return;}
   if(act==="delete-service"){const index=Number(action.dataset.serviceIndex),item=serviceCatalog[index];if(item){if(!confirm("خدمت «"+item.name+"» حذف شود؟ این کار فقط خدمت را از فهرست تعرفه‌ها حذف می‌کند؛ رسیدهای قبلی باقی می‌مانند."))return;serviceCatalog.splice(index,1);persistDemoData();document.getElementById("content").innerHTML=renderSettings();document.querySelector('[data-action="settings-tab"][data-tab="services"]')?.click();toast("خدمت از فهرست تعرفه‌ها حذف شد.");}return;}
  if(act==="toggle-service"){const item=serviceCatalog[Number(action.dataset.serviceIndex)];if(item){item.active=item.active===false;persistDemoData();document.getElementById("content").innerHTML=renderSettings();document.querySelector('[data-action="settings-tab"][data-tab="services"]')?.click();toast(item.active?"خدمت فعال شد.":"خدمت غیرفعال شد.");}return;}
  if(act==="settings-tab"){
   const tab=action.dataset.tab;
   document.querySelectorAll("[data-settings-panel]").forEach(panel=>{panel.hidden=panel.dataset.settingsPanel!==tab;});
   document.querySelectorAll("[data-action='settings-tab']").forEach(button=>button.setAttribute("aria-selected",String(button.dataset.tab===tab)));
   return;
  }
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
  if(act==="select-guarantee-application"){
   const selected=applications.find(a=>a.id===action.dataset.applicationId);
   const hidden=document.getElementById("guarantee-application-id"),search=document.getElementById("guarantee-application-search"),results=document.getElementById("guarantee-application-results"),label=document.getElementById("guarantee-application-selected");
   if(selected&&hidden&&search&&results&&label){hidden.value=selected.id;search.value=selected.id;results.innerHTML=guaranteeApplicationResults("",selected.id);label.textContent="پرونده انتخاب‌شده: "+selected.id+" · "+selected.customer+" · "+selected.type;}
   return;
  }
  if(act==="check-backend-session"){
    if(!window.__OMID_API_PROXY_CONFIGURED){toast("ابتدا OMID_API_ORIGIN را در Worker تنظیم کنید.");return;}
    try{
      const result=await omidApiRequest("/api/v1/auth/me/",{method:"GET"});
      if(result.response.ok&&result.body&&result.body.user&&result.body.user.is_staff&&result.body.user.role&&result.body.user.role!=="customer"){
        backendSessionUser=result.body.user;
        updateOmidSessionStatus(omidBackendUserSummary(backendSessionUser)+" رابط اصلی هنوز از داده‌های نمایشی استفاده می‌کند.");
        toast("نشست کارکنان معتبر است؛ داده‌های برنامه هنوز به API متصل نیستند.");
      }else if(result.response.ok){
        backendSessionUser=null;
        updateOmidSessionStatus("نشست وجود دارد، اما نقش کاربر برای استفاده داخلی مجاز نیست.");
        toast("حساب نشست فعلی نقش مجاز کارکنان را ندارد.");
      }else if(result.response.status===401||result.response.status===403){
        backendSessionUser=null;
        updateOmidSessionStatus("نشست کارکنان فعال نیست؛ با حساب داخلی وارد شوید.");
        toast("نشست فعالی پیدا نشد. ابتدا ورود به بک‌اند را انجام دهید.");
      }else{
        throw new Error(omidApiErrorMessage(result.body,result.response.status));
      }
    }catch(error){
      const message=String(error&&error.message||"خطا در بررسی نشست.");
      updateOmidSessionStatus("بررسی نشست ناموفق بود: "+message);
      toast(message);
    }
    return;
  }
  if(act==="logout-backend-session"){
    if(!window.__OMID_API_PROXY_CONFIGURED){toast("ابتدا OMID_API_ORIGIN را در Worker تنظیم کنید.");return;}
    try{
      const csrfToken=await omidApiCsrfToken();
      const result=await omidApiRequest("/api/v1/auth/logout/",{
        method:"POST",
        headers:{"Content-Type":"application/json","X-CSRFToken":csrfToken},
        body:JSON.stringify({})
      });
      if(!result.response.ok)throw new Error(omidApiErrorMessage(result.body,result.response.status));
      backendSessionUser=null;
      updateOmidSessionStatus("از نشست بک‌اند خارج شدید. داده‌های نمایشی رابط تغییری نکرده‌اند.");
      toast("از بک‌اند خارج شدید.");
    }catch(error){
      const message=String(error&&error.message||"خروج از بک‌اند ناموفق بود.");
      updateOmidSessionStatus("خروج ناموفق بود: "+message);
      toast(message);
    }
    return;
  }
  if(act==="check-api-connection"){
    fetch("/api/v1/health/",{method:"GET",credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}})
     .then(async response=>{
      let body={};
      try{body=await response.json();}catch(_error){}
      if(response.ok)toast("بک‌اند پاسخ می‌دهد؛ اکنون امکان آزمون نشست کارکنان وجود دارد، اما همگام‌سازی داده‌ها هنوز فعال نشده است.");
      else if(response.status===503)toast(body.detail||"آدرس بک‌اند تنظیم نشده است؛ OMID_API_ORIGIN را در Worker تعریف کنید.");
      else toast("بک‌اند پاسخ داد، اما وضعیت "+response.status+" برگشت.");
     })
     .catch(()=>toast("اتصال شبکه برقرار نشد؛ origin بک‌اند و دسترس‌پذیری آن را بررسی کنید."));
    return;
  }
  if(act==="refresh"){render();toast("صفحه با داده‌های نمایشی فعلی به‌روزرسانی شد.");}
  if(act==="delete-task"){const idx=Number(action.dataset.taskId);if(Number.isInteger(idx)&&idx>=0&&idx<tasks.length){tasks.splice(idx,1);persistDemoData();document.getElementById("content").innerHTML=renderWorkflow();toast("وظیفه حذف شد و در همین مرورگر ذخیره شد.");}}
  if(act==="customer-detail")navigate("/customers/"+encodeURIComponent(action.dataset.id));
  if(act==="load-live-workflow"){
   liveWorkflowData.loading=true;document.getElementById("content").innerHTML=renderWorkflow();
   try{await loadLiveWorkflow();document.getElementById("content").innerHTML=renderWorkflow();toast("داده‌های گردش کار از بک‌اند بارگذاری شد.");}
   catch(error){liveWorkflowData.loading=false;document.getElementById("content").innerHTML=renderWorkflow();toast(String(error&&error.message||"بارگذاری از بک‌اند ناموفق بود."));}
   return;
  }
  if(act==="save-party-account-status"){
   const partyId=action.dataset.partyId,card=action.closest(".case-party-card"),select=card?.querySelector("[data-account-status-select]");
   if(!partyId||!select){toast("وضعیت حساب قابل خواندن نیست.");return;}
   try{const result=await omidApiRequest("/api/v1/applications/parties/"+encodeURIComponent(partyId)+"/",{method:"PATCH",headers:{"Content-Type":"application/json","X-CSRFToken":await omidApiCsrfToken()},body:JSON.stringify({account_status:select.value})});if(!result.response.ok)throw new Error(omidApiErrorMessage(result.body,result.response.status));await refreshLiveWorkflowForApplication(liveWorkflowData.selectedId);toast("وضعیت حساب شخص در بک‌اند ذخیره شد.");}
   catch(error){toast(String(error&&error.message||"ذخیره وضعیت حساب ناموفق بود."));}return;
  }
  if(act==="confirm-live-disbursement"){
   const id=action.dataset.disbursementId;
   const bankReference=prompt("مرجع بانکی واریز تأییدشده را وارد کنید:");
   if(bankReference===null)return;
   if(!bankReference.trim()){toast("مرجع بانکی الزامی است.");return;}
   const evidenceReference=prompt("مرجع مدرک واریز را وارد کنید (اختیاری):","")||"";
   try{const result=await omidApiRequest("/api/v1/applications/disbursements/"+encodeURIComponent(id)+"/confirm/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":await omidApiCsrfToken()},body:JSON.stringify({bank_reference:bankReference.trim(),evidence_reference:evidenceReference.trim()})});if(!result.response.ok)throw new Error(omidApiErrorMessage(result.body,result.response.status));await refreshLiveWorkflowForApplication(liveWorkflowData.selectedId);toast("واریز در بک‌اند تأیید شد؛ نرخ کارمزد بر اساس پرونده ثبت و محاسبه شد.");}
   catch(error){toast(String(error&&error.message||"تأیید واریز ناموفق بود."));}return;
  }
  if(act==="live-stage-transition"){
   const stageId=action.dataset.stageId,command=action.dataset.transition;let body={action:command};
   if(command==="hold"||command==="bypass"){const reason=prompt(command==="bypass"?"دلیل مستند عبور از مرحله حساب را وارد کنید:":"دلیل تعلیق مرحله را وارد کنید:");if(reason===null)return;if(!reason.trim()){toast("دلیل این عملیات الزامی است.");return;}body.reason=reason.trim();}
   if(command==="complete"){
    const stage=liveWorkflowData.stages.find(x=>String(x.id)===String(stageId));
    if(stage&&stage.code==="account"){
     const party=liveWorkflowData.parties.find(x=>String(x.id)===String(stage.party||stage.party_id||stage.partyId));
     const evidenceRequired=party&&party.account_status==="needs_opening";
     const evidence=prompt(evidenceRequired?"مرجع مدرک افتتاح حساب الزامی است:":"مرجع مدرک تأیید حساب (در صورت نیاز):","");
     if(evidence===null)return;
     if(evidenceRequired&&!evidence.trim()){toast("برای تکمیل مرحله افتتاح حساب، مرجع مدرک الزامی است.");return;}
     if(evidence.trim())body.evidence_reference=evidence.trim();
    }
   }
   try{const result=await omidApiRequest("/api/v1/applications/stages/"+encodeURIComponent(stageId)+"/transition/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":await omidApiCsrfToken()},body:JSON.stringify(body)});if(!result.response.ok)throw new Error(omidApiErrorMessage(result.body,result.response.status));await refreshLiveWorkflowForApplication(liveWorkflowData.selectedId);toast("مرحله در بک‌اند به‌روزرسانی شد.");}
   catch(error){toast(String(error&&error.message||"تغییر مرحله ناموفق بود."));}
   return;
  }
  if(act==="toggle-party-stage"){
   const app=applications.find(a=>a.id===action.dataset.appId);
   if(app){ensureCaseWorkspace(app);const party=app.caseParties.find(p=>p.id===action.dataset.partyId);const key=action.dataset.stageKey;if(party&&key){party.stages[key]=party.stages[key]==="تکمیل‌شده"?"در انتظار":"تکمیل‌شده";persistDemoData();document.getElementById("content").innerHTML=renderWorkflow();toast("وضعیت نمایشی مرحله شخص به‌روزرسانی شد.");}}
   return;
  }
  if(act==="edit-merat-triplet"){
   const app=applications.find(a=>a.id===action.dataset.appId);if(!app)return;ensureCaseWorkspace(app);
   const current=app.meratTriplet;
   const requester=prompt("درخواست‌کننده مرآت:",current.requester||"");if(requester===null)return;
   const subject=prompt("شخص مورد ارزیابی:",current.subject||"");if(subject===null)return;
   const relation=prompt("نسبت با مشتری اصلی:",current.relation||"خود مشتری");if(relation===null)return;
   app.meratTriplet={requester:requester.trim(),subject:subject.trim(),relation:relation.trim(),status:"ثبت محلی · تأییدنشده"};
   persistDemoData();document.getElementById("content").innerHTML=renderWorkflow();toast("سه‌گانه مرآت در داده نمایشی مرورگر ذخیره شد؛ هنوز به API متصل نیست.");return;
  }
  if(act==="advance-loan-stage"){const item=applications.find(a=>a.id===action.dataset.id);if(item){const w=getLoanWorkflow(item),next=w.definition.stages[getLoanStageIndex(item)+1];if(next&&setLoanStage(item,next.key)){render();toast("مرحله پرونده به «"+next.label+"» تغییر کرد.");}}return;}
  if(act==="application-detail")navigate("/applications/"+encodeURIComponent(action.dataset.id));
  if(act==="document-detail")navigate("/documents/"+encodeURIComponent(action.dataset.id));
  if(act==="upload-demo")navigate("/documents/new");
  if(act==="save-settings"){companySettings.name=(document.getElementById("company-name")?.value||"").trim();companySettings.registrationNumber=(document.getElementById("company-registration")?.value||"").trim();companySettings.nationalId=(document.getElementById("company-national-id")?.value||"").trim();companySettings.economicCode=(document.getElementById("company-economic-code")?.value||"").trim();companySettings.phone=(document.getElementById("company-phone")?.value||"").trim();companySettings.representative=(document.getElementById("company-representative")?.value||"").trim();companySettings.representativeTitle=(document.getElementById("company-representative-title")?.value||"").trim();companySettings.address=(document.getElementById("company-address")?.value||"").trim();try{persistDemoData();localStorage.setItem("omid-ui-preferences",JSON.stringify({title:"سامانه امید",language:"fa",timezone:"Asia/Tehran"}));toast("مشخصات شرکت و تنظیمات ذخیره شد.");}catch(error){toast("ذخیره تنظیمات در این مرورگر ممکن نیست.");}}
  if(act==="save-contract"){const app=applications.find(a=>a.id===action.dataset.appId);if(!app){toast("پرونده پیدا نشد.");return;}const val=id=>(document.getElementById(id)?.value||"").trim();const approvedAmount=val("contract-approved-amount"),term=val("contract-term");if(!approvedAmount||!term){toast("مبلغ مصوب و مدت بازپرداخت الزامی است.");return;}app.contractDetails={approvedAmount,term,installment:val("contract-installment"),rate:val("contract-rate"),guarantees:val("contract-guarantees"),date:val("contract-date"),terms:val("contract-terms"),updatedAt:new Date().toISOString()};app.activity=Array.isArray(app.activity)?app.activity:[];app.activity.push({type:"ذخیره مشخصات قرارداد",text:"پیش‌نویس قرارداد برای پرونده "+app.id+" ذخیره شد.",date:new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short"}).format(new Date())});persistDemoData();toast("مشخصات پیش‌نویس قرارداد ذخیره شد.");render();}
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
 if(e.target.id==="customer-search"){customerFilter=toEnDigits(e.target.value);const pos=e.target.selectionStart;const html=renderCustomers();document.getElementById("content").innerHTML=html;const next=document.getElementById("customer-search");next.focus();next.setSelectionRange(pos,pos);}
 if(e.target.id==="application-search"){applicationFilter=toEnDigits(e.target.value);const pos=e.target.selectionStart;const html=renderApplications();document.getElementById("content").innerHTML=html;const next=document.getElementById("application-search");next.focus();next.setSelectionRange(pos,pos);}
 if(e.target.id==="document-search"){documentFilter=toEnDigits(e.target.value);const pos=e.target.selectionStart;document.getElementById("content").innerHTML=renderDocuments();const next=document.getElementById("document-search");next.focus();next.setSelectionRange(pos,pos);}
 if(e.target.id==="application-customer-search"){
  const query=e.target.value;const idField=document.getElementById("application-customer-id"),nameField=document.getElementById("application-customer-name"),results=document.getElementById("application-customer-results"),label=document.getElementById("application-customer-selected");if(idField)idField.value="";if(nameField)nameField.value="";if(label)label.textContent="برای ادامه، یکی از نتایج جست‌وجو را انتخاب کنید.";if(results)results.innerHTML=applicationCustomerResults(query,"");
 }
 if(e.target.id==="guarantee-application-search"){
  const hidden=document.getElementById("guarantee-application-id"),results=document.getElementById("guarantee-application-results"),label=document.getElementById("guarantee-application-selected");
  if(hidden)hidden.value="";
  if(label)label.textContent="یک پرونده را از نتایج بالا انتخاب کنید.";
  if(results)results.innerHTML=guaranteeApplicationResults(e.target.value,"");
 }
 if(e.target.id==="global-search"){
  const q=toEnDigits(e.target.value.trim());
  if(currentPage==="customers"){customerFilter=q;document.getElementById("content").innerHTML=renderCustomers();}
  else if(currentPage==="applications"){applicationFilter=q;document.getElementById("content").innerHTML=renderApplications();}
  else if(q){document.querySelectorAll("#content tr, #content .task").forEach(el=>el.hidden=!el.textContent.includes(q));}
 }
});
document.addEventListener("input",e=>{if(e.target.name==="discount"&&e.target.form?.id==="service-record-form")updateServiceTotal();if(e.target.id==="service-customer-search"){const idField=document.getElementById("service-customer-id"),results=document.getElementById("service-customer-results"),label=document.getElementById("service-customer-selected");if(idField)idField.value="";if(label)label.textContent="برای ادامه، یکی از نتایج جست‌وجو را انتخاب کنید.";if(results)results.innerHTML=applicationCustomerResults(e.target.value,"","service");}});
document.addEventListener("change",e=>{
 if(e.target.id==="workflow-workspace-case"){workflowWorkspaceCaseId=e.target.value;document.getElementById("content").innerHTML=renderWorkflow();return;}
 if(e.target.id==="live-workflow-app"){refreshLiveWorkflowForApplication(e.target.value).catch(error=>toast(String(error&&error.message||"بارگذاری پرونده ناموفق بود.")));return;}if(e.target.id==="service-record-service")updateServiceTotal();});
function updateServiceTotal(){const form=document.getElementById("service-record-form");if(!form)return;const select=form.querySelector('[name="serviceId"]'),price=Number(select?.selectedOptions?.[0]?.dataset.price||0),discount=moneyInput(form.querySelector('[name="discount"]')?.value),priceField=document.getElementById("service-record-price"),totalField=document.getElementById("service-record-total"),paidField=form.querySelector('[name="paid"]'),total=Math.max(0,price-discount);if(priceField)priceField.value=formatMoney(price);if(totalField)totalField.value=formatMoney(total);if(paidField)paidField.value=String(total);}
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
 if(e.target.matches("[data-loan-route]")){const item=applications.find(a=>a.id===e.target.dataset.appId);if(item&&setLoanRoute(item,e.target.value)){toast("مسیر تسهیلات تغییر کرد؛ مرحله به ابتدای مسیر برگشت.");render();}}
 if(e.target.matches("[data-loan-stage]")){const item=applications.find(a=>a.id===e.target.dataset.appId);if(item&&setLoanStage(item,e.target.value)){toast("مرحله گردش کار پرونده به‌روزرسانی شد.");render();}else render();}
 if(e.target.id==="application-detail-status"){const item=applications.find(a=>a.id===e.target.dataset.appId);if(item&&item.status!==e.target.value){const previous=item.status;item.status=e.target.value;item.activity=item.activity||[];item.activity.push({type:"تغییر وضعیت",text:"وضعیت از «"+previous+"» به «"+item.status+"» تغییر کرد.",date:new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short"}).format(new Date())});persistDemoData();toast("وضعیت و تاریخچه پرونده ذخیره شد.");render();}}
 if(e.target.matches("[data-document-status]")){const doc=docs[Number(e.target.dataset.docIndex)];if(doc){doc.status=e.target.value;persistDemoData();document.getElementById("content").innerHTML=renderDocuments();toast("وضعیت مدرک در همین مرورگر ذخیره شد.");}}
 if(e.target.matches("[data-task]")){
  const t=tasks[Number(e.target.dataset.task)];if(t){t.done=e.target.checked;persistDemoData();toast(t.done?"وظیفه انجام‌شده ذخیره شد.":"وظیفه به فهرست بازگشت و ذخیره شد.");}
 }
});
document.addEventListener("submit",async e=>{
 if(e.target.classList.contains("live-merat-form")){
  e.preventDefault();const form=e.target;const data=Object.fromEntries(new FormData(form).entries());
  if(!data.stage||!data.subject||!data.requester||!String(data.relationship_to_applicant||"").trim()){toast("مرحله، درخواست‌کننده، شخص و رابطه را کامل کنید.");return;}
  const payload={stage:data.stage,subject:data.subject,requester:data.requester,relationship_to_applicant:String(data.relationship_to_applicant).trim(),result:data.result||"pending",external_reference:String(data.external_reference||"").trim(),result_reason:String(data.result_reason||"").trim(),evidence_reference:String(data.evidence_reference||"").trim()};
  if(data.submitted_at)payload.submitted_at=new Date(data.submitted_at).toISOString();
  if(String(data.reported_limit_rial||"").trim()){const limit=moneyInput(data.reported_limit_rial);if(!Number.isSafeInteger(limit)||limit<0){toast("حد اعتبار باید عدد صحیح نامنفی و بر حسب ریال باشد.");return;}payload.reported_limit_rial=limit;}
  try{const existingId=form.dataset.assessmentId;const url="/api/v1/applications/merat-assessments/"+(existingId?encodeURIComponent(existingId)+"/":"");const result=await omidApiRequest(url,{method:existingId?"PATCH":"POST",headers:{"Content-Type":"application/json","X-CSRFToken":await omidApiCsrfToken()},body:JSON.stringify(payload)});if(!result.response.ok)throw new Error(omidApiErrorMessage(result.body,result.response.status));await refreshLiveWorkflowForApplication(liveWorkflowData.selectedId);toast(existingId?"ارزیابی مرآت به‌روزرسانی شد.":"ارزیابی مرآت ثبت شد.");}
  catch(error){toast(String(error&&error.message||"ثبت ارزیابی مرآت ناموفق بود."));}return;
 }
 if(e.target.id==="live-commission-form"){
  e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());const rate=Number(data.rate);
  if(!data.application||!Number.isFinite(rate)||rate<0||rate>100||!String(data.reason||"").trim()){toast("نرخ باید بین صفر تا ۱۰۰ باشد و دلیل تغییر الزامی است.");return;}
  try{const result=await omidApiRequest("/api/v1/applications/"+encodeURIComponent(data.application)+"/commission/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":await omidApiCsrfToken()},body:JSON.stringify({rate,reason:String(data.reason).trim()})});if(!result.response.ok)throw new Error(omidApiErrorMessage(result.body,result.response.status));await loadLiveWorkflow();toast("نرخ کارمزد پرونده به‌روزرسانی و رویداد حسابرسی ثبت شد.");}
  catch(error){toast(String(error&&error.message||"تغییر نرخ کارمزد ناموفق بود."));}return;
 }
 if(e.target.id==="live-disbursement-form"){
  e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());const amount=moneyInput(data.amount_rial);
  if(!data.application||!Number.isSafeInteger(amount)||amount<=0){toast("مبلغ واریزی باید عدد صحیح مثبت و بر حسب ریال باشد.");return;}
  const payload={application:data.application,amount_rial:amount,evidence_reference:String(data.evidence_reference||"").trim()};
  try{const result=await omidApiRequest("/api/v1/applications/disbursements/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":await omidApiCsrfToken()},body:JSON.stringify(payload)});if(!result.response.ok)throw new Error(omidApiErrorMessage(result.body,result.response.status));await refreshLiveWorkflowForApplication(data.application);toast("واریز ثبت شد و تا تأیید مالی در وضعیت انتظار می‌ماند.");}
  catch(error){toast(String(error&&error.message||"ثبت واریز ناموفق بود."));}return;
 }
 if(e.target.id==="live-add-party-form"){
  e.preventDefault();const form=e.target;const data=Object.fromEntries(new FormData(form).entries());
  if(!data.person||!data.application){toast("پرونده و شخص را انتخاب کنید.");return;}
  try{
   const csrf=await omidApiCsrfToken();
   const result=await omidApiRequest("/api/v1/applications/parties/",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":csrf},body:JSON.stringify({application:data.application,person:data.person,role:data.role,relationship_to_applicant:data.relationship_to_applicant||"",membership_status:"active",account_status:"unknown"})});
   if(!result.response.ok)throw new Error(omidApiErrorMessage(result.body,result.response.status));
   await refreshLiveWorkflowForApplication(data.application);toast("شخص با موفقیت به پرونده اضافه شد و مراحل مستقل او در بک‌اند ایجاد شد.");
  }catch(error){toast(String(error&&error.message||"افزودن شخص ناموفق بود."));}
  return;
 }

 if(e.target.id==="backend-login-form"){
  e.preventDefault();
  const form=e.target;
  const formData=new FormData(form);
  const username=String(formData.get("username")||"").trim();
  const password=String(formData.get("password")||"");
  if(!window.__OMID_API_PROXY_CONFIGURED){toast("ابتدا OMID_API_ORIGIN را در Worker تنظیم کنید.");return;}
  if(!username||!password){toast("نام کاربری و گذرواژه را وارد کنید.");return;}
  try{
   const csrfToken=await omidApiCsrfToken();
   const result=await omidApiRequest("/api/v1/auth/login/",{
    method:"POST",
    headers:{"Content-Type":"application/json","X-CSRFToken":csrfToken},
    body:JSON.stringify({username,password})
   });
   if(!result.response.ok)throw new Error(omidApiErrorMessage(result.body,result.response.status));
   const user=result.body&&result.body.user;
   if(!user||!user.is_staff||!user.role)throw new Error("پاسخ ورود بک‌اند کامل نیست؛ نقش کاربر داخلی تأیید نشد.");
   backendSessionUser=user;
   updateOmidSessionStatus(omidBackendUserSummary(user)+" این ورود فقط آزمون نشست است؛ داده‌های صفحهٔ اصلی هنوز نمایشی هستند.");
   form.reset();
   toast("ورود بک‌اند موفق بود؛ صفحهٔ اصلی هنوز از API داده دریافت نمی‌کند.");
  }catch(error){
   const message=String(error&&error.message||"ورود به بک‌اند ناموفق بود.");
   updateOmidSessionStatus("ورود ناموفق بود: "+message);
   toast(message);
  }finally{
   const passwordInput=form.querySelector("#backend-login-password");
   if(passwordInput)passwordInput.value="";
  }
  return;
 }
 if(e.target.id==="service-edit-form"){
   e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());const index=Number(data.serviceIndex),item=serviceCatalog[index],name=String(data.serviceName||"").trim(),price=moneyInput(data.servicePrice);
   if(!item){toast("خدمت برای ویرایش پیدا نشد.");return;}
   if(!name){toast("نام خدمت الزامی است.");return;}
   if(serviceCatalog.some((x,i)=>i!==index&&x.name.toLocaleLowerCase("fa")===name.toLocaleLowerCase("fa"))){toast("خدمتی با این نام قبلاً ثبت شده است.");return;}
   if(!Number.isFinite(price)||price<0){toast("تعرفه معتبر نیست؛ لطفاً مبلغ را به عدد وارد کنید.");return;}
   item.name=name;item.price=price;item.description=String(data.serviceDescription||"").trim();persistDemoData();
   const modal=document.getElementById("service-edit-modal");if(modal)modal.hidden=true;
   document.getElementById("content").innerHTML=renderSettings();document.querySelector('[data-action="settings-tab"][data-tab="services"]')?.click();toast("نام، تعرفه و توضیحات خدمت به‌روزرسانی شد.");
  }
  if(e.target.id==="service-catalog-form"){
  e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());const name=String(data.serviceName||"").trim();const price=moneyInput(data.servicePrice);
  if(!name||!Number.isFinite(price)||price<0){toast("نام خدمت و تعرفه معتبر الزامی است.");return;}
  if(serviceCatalog.some(x=>x.name.toLocaleLowerCase("fa")===name.toLocaleLowerCase("fa"))){toast("خدمتی با این نام قبلاً ثبت شده است.");return;}
  let serial=serviceCatalog.reduce((max,item)=>{const match=String(item.code||item.id||"").match(/(?:SV-|SRV-)(\\d+)/i);return match?Math.max(max,Number(match[1])):max;},0)+1;let id="SV-"+String(serial).padStart(4,"0");while(serviceCatalog.some(item=>item.id===id||item.code===id)){serial++;id="SV-"+String(serial).padStart(4,"0");}
  serviceCatalog.push({id,code:id,name,price,description:String(data.serviceDescription||"").trim(),active:data.serviceActive!=="no",createdAt:new Date().toISOString()});
  persistDemoData();document.getElementById("content").innerHTML=renderSettings();document.querySelector('[data-action="settings-tab"][data-tab="services"]')?.click();toast("خدمت و تعرفه آن ثبت شد.");
 }
 if(e.target.id==="service-record-form"){
  e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());const customer=customers.find(c=>c.id===data.customerId),service=serviceCatalog.find(x=>x.id===data.serviceId&&x.active!==false);
  const price=Number(service?.price||0),discount=moneyInput(data.discount),paid=moneyInput(data.paid),total=Math.max(0,price-discount);
  if(!customer||!service||!data.staffName){toast("مشتری، خدمت و کارمند را انتخاب کنید.");return;}
  if(discount>price){toast("تخفیف نمی‌تواند بیشتر از تعرفه خدمت باشد.");return;}
  if(paid>total){toast("مبلغ دریافتی نمی‌تواند از مبلغ نهایی بیشتر باشد.");return;}
  const serial=String(serviceRecords.length+1).padStart(5,"0"),receiptId="SR-"+new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn",{year:"numeric",timeZone:"Asia/Tehran"}).format(new Date())+"-"+serial;
  const record={id:"service-"+Date.now().toString(36),receiptId,customerId:customer.id,customerName:customer.name,serviceId:service.id,serviceCode:service.code,serviceName:service.name,description:service.description||"",staffName:String(data.staffName),price,discount,total,paid,paymentMethod:String(data.paymentMethod||""),note:String(data.note||"").trim(),date:new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeZone:"Asia/Tehran"}).format(new Date()),createdAt:new Date().toISOString()};
  serviceRecords.push(record);persistDemoData();navigate("/services");toast("خدمت ثبت شد؛ رسید "+receiptId+" آماده چاپ A5 است.");
 }
 if(e.target.id==="guarantee-request-form"){
  e.preventDefault();
  const applicationId=String(new FormData(e.target).get("applicationId")||"").trim();
  const selected=applications.find(a=>a.id===applicationId);
  if(!selected){toast("ابتدا پرونده تسهیلات را از نتایج جست‌وجو انتخاب کنید.");return;}
  const requesterId=String(e.target.dataset.requesterId||"");
  const requester=customers.find(c=>c.id===requesterId);
  const request={id:"GR-1405-"+String(guaranteeRequests.length+1).padStart(4,"0"),requesterId,requester:requester?requester.name:"مشتری پنل",applicationId:selected.id,customer:selected.customer,status:"ثبت‌شده",note:String(new FormData(e.target).get("note")||"").trim(),date:new Intl.DateTimeFormat("fa-IR",{dateStyle:"short"}).format(new Date())};
  guaranteeRequests.push(request);
  persistDemoData();
  document.getElementById("content").innerHTML=renderGuaranteeRequest();
  toast("درخواست ضمانت برای پرونده "+selected.id+" ثبت شد. این ثبت فعلاً محلی و نمایشی است.");
 }
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
  if(!firstName){toast("نام مشتری یا نام سازمان را وارد کنید.");return;}
  if((data.type||"حقیقی")==="حقیقی"&&!lastName){toast("برای مشتری حقیقی، نام خانوادگی الزامی است.");return;}
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
  const amountValue=Number(data.amount),termValue=data.term?Number(data.term):null;
  if(!Number.isFinite(amountValue)||amountValue<=0){toast("مبلغ باید عددی بزرگ‌تر از صفر باشد.");return;}
  if(termValue!==null&&(!Number.isInteger(termValue)||termValue<1||termValue>240)){toast("مدت تسهیلات باید بین ۱ تا ۲۴۰ ماه باشد.");return;}
  const id="OM-1405-"+String(249+applications.length-5).padStart(4,"0");
  const selectedCustomer=customers.find(c=>c.id===String(data.customerId||""));
  if(!selectedCustomer||selectedCustomer.name!==String(data.customer||"")){toast("لطفاً مشتری را از نتایج جست‌وجو انتخاب کنید.");return;}
  const loanRoute=loanWorkflowDefinitions[data.loanRoute]?data.loanRoute:"company_score_fast";
  const created={id,customer:selectedCustomer.name,customerId:selectedCustomer.id,type:data.type,loanRoute,loanStage:loanWorkflowDefinitions[loanRoute].stages[0].key,amount:Number(data.amount).toLocaleString("fa-IR")+" تومان",term:data.term||"",status:data.status||"در حال بررسی",manager:data.manager||"تعیین نشده",notes:String(data.notes||"").trim(),date:new Intl.DateTimeFormat("fa-IR").format(new Date()),activity:[]};
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
