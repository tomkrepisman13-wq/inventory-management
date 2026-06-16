# ניהול מלאי

אפליקציית React + Vite לניהול מלאי בעברית, עם סריקת ברקוד מהמצלמה, שמירה ב-localStorage וייצוא דוח מלאי למייל.

## הרצה מקומית

```bash
npm install
npm run dev
```

## סריקת ברקוד אמיתית

הסריקה משתמשת במצלמת המכשיר דרך הדפדפן. בפריסה אונליין חייבים לפתוח את האתר דרך HTTPS, אחרת רוב הדפדפנים לא יאפשרו הרשאת מצלמה.

Netlify ו-Vercel נותנים HTTPS אוטומטית.

## שליחת מייל אמיתית עם EmailJS

כדי שהכפתור "שלח" ישלח מייל בלי שרת, פותחים חשבון ב-EmailJS ויוצרים:

- Email Service
- Email Template
- Public Key

לאחר מכן מגדירים את המשתנים הבאים בסביבת הפריסה:

```bash
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=public_key_xxxxxxx
```

בתבנית של EmailJS כדאי להשתמש בשדות:

```text
{{to_email}}
{{inventory_report}}
{{inventory_json}}
```

אם המשתנים לא מוגדרים, האפליקציה תפתח הודעת מייל מוכנה דרך `mailto:` כגיבוי.

## פריסה ל-Netlify

1. מריצים:

```bash
npm run build
```

2. מעלים את תיקיית `dist` ל-Netlify Drop, או מחברים את הפרויקט ל-Netlify.

קובץ `netlify.toml` כבר מוכן ומגדיר:

- build command: `npm run build`
- publish directory: `dist`
- redirect ל-`index.html`

## פריסה ל-Vercel

אפשר לחבר את התיקייה/ריפו ל-Vercel עם ההגדרות:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

גם ב-Vercel צריך להגדיר את משתני ה-EmailJS תחת Environment Variables.
