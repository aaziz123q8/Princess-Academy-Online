// Server-side localization for API responses (errors, notifications).
// Mirrors the client keys. The language is chosen from the `Accept-Language`
// header (or a saved user locale), defaulting to English.

const MESSAGES = {
  en: {
    "error.validation": "Please check the information you entered.",
    "error.exists": "That username or email is already taken.",
    "error.invalid_credentials": "Wrong email or password.",
    "error.unauthorized": "Please log in to continue.",
    "error.forbidden": "You don't have permission to do that.",
    "error.not_found": "Not found.",
    "error.server": "Something went wrong on our side. Please try again.",
    "auth.registered": "Welcome to Princess Academy!",
  },
  ar: {
    "error.validation": "يرجى التحقق من المعلومات التي أدخلتها.",
    "error.exists": "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل.",
    "error.invalid_credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "error.unauthorized": "يرجى تسجيل الدخول للمتابعة.",
    "error.forbidden": "ليس لديكِ الصلاحية للقيام بذلك.",
    "error.not_found": "غير موجود.",
    "error.server": "حدث خطأ ما لدينا. يرجى المحاولة مرة أخرى.",
    "auth.registered": "أهلاً بكِ في أكاديمية الأميرات!",
  },
};

export function pickLocale(req) {
  const header = (req.headers["accept-language"] || "").toLowerCase();
  if (header.startsWith("ar")) return "ar";
  return "en";
}

export function tr(locale, key) {
  const table = MESSAGES[locale] || MESSAGES.en;
  return table[key] || MESSAGES.en[key] || key;
}

/** Express middleware: attaches req.locale and req.t(key). */
export function localeMiddleware(req, _res, next) {
  req.locale = pickLocale(req);
  req.t = (key) => tr(req.locale, key);
  next();
}
