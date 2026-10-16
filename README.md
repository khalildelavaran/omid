# سامانه امید (Omid CRM)

سامانه داخلی مدیریت ارتباط با مشتریان و فرایندهای شرکت مالی با تمرکز بر وام، تسهیلات، اعتباردهی، پیگیری پرونده‌ها، اسناد و ارتباط با مشتری.

> وضعیت: اسکلت اولیه backend ثبت شده است؛ این پروژه هنوز محصول آماده بهره‌برداری نیست. تصمیم‌های فرایندی، حقوقی و امنیتی باید پیش از production تأیید شوند.

## مستندات

- [معماری کلان](docs/architecture/overview.md)
- [مدل دامنه و داده](docs/architecture/domain-and-data.md)
- [امنیت و کنترل دسترسی](docs/architecture/security.md)
- [API و یکپارچه‌سازی‌ها](docs/architecture/api-and-integrations.md)
- [استقرار، پشتیبان‌گیری و مشاهده‌پذیری](docs/architecture/operations.md)
- [نقشه راه پیاده‌سازی](docs/architecture/roadmap.md)
- [وضعیت پیاده‌سازی و کارهای باقی‌مانده](docs/architecture/implementation-status.md)
- [راهنمای اجرای backend](backend/README.md)

## فناوری‌های فعلی

- Backend: Python + Django + Django REST Framework
- Database: PostgreSQL برای توسعه از طریق Docker Compose؛ SQLite به‌عنوان fallback تنظیمات محلی
- Frontend: Next.js + TypeScript (هنوز ایجاد نشده)
- معماری: Modular Monolith

## شروع سریع backend

از ریشه مخزن:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
docker compose up -d db
python backend/manage.py migrate
python backend/manage.py runserver
```

در ویندوز، فایل `.env.example` را به `.env` کپی کنید. endpoint سلامت: `http://127.0.0.1:8000/api/v1/health/`.

رمز دیتابیس داخل فایل نمونه فقط برای توسعه محلی است؛ در production باید credential امن و جداگانه استفاده شود.

## اصول مهم

1. هر پرونده مشتری و تسهیلات باید مالکیت، وضعیت و تاریخچه تغییرات روشن داشته باشد.
2. دسترسی بر اساس نقش و دامنه دسترسی به پرونده‌ها در backend کنترل شود.
3. عملیات حساس و تغییرات مهم ثبت رویداد ممیزی داشته باشند.
4. رمزها، کلیدها، OTPها و اطلاعات محرمانه در مخزن کد یا لاگ ثبت نشوند.
5. درگاه پیامک، امضا و پرداخت از طریق adapter قابل‌تعویض یکپارچه شوند.
6. این سامانه در ابتدا جایگزین دفتر کل حسابداری یا سامانه بانکی اصلی فرض نمی‌شود.

## گام بعدی

تثبیت مدل کاربر و سیاست احراز هویت، سپس مدل مشتری و پرونده با مجوزهای object-level و آزمون‌های مربوط. وضعیت دقیق در [implementation-status.md](docs/architecture/implementation-status.md) نگهداری می‌شود.
