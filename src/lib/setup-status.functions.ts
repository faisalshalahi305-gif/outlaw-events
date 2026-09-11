import { createServerFn } from "@tanstack/react-start";

export type SetupVar = {
  name: string;
  label: string;
  required: boolean;
  configured: boolean;
  hint: string;
};

/**
 * Reports ONLY whether each variable has a value — never the value itself.
 */
export const getSetupStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ vars: SetupVar[]; ready: boolean }> => {
    const { envValue } = await import("./env.server");

    const has = (canonical: string) => Boolean(envValue(canonical));
    const raw = (name: string) => Boolean(process.env[name]?.trim());

    const vars: SetupVar[] = [
      {
        name: "EXTERNAL_SUPABASE_URL",
        label: "رابط مشروع Supabase",
        required: true,
        configured: has("SUPABASE_URL"),
        hint: "Project Settings → API → Project URL",
      },
      {
        name: "EXTERNAL_SUPABASE_PUBLISHABLE_KEY",
        label: "المفتاح العام (publishable / anon)",
        required: true,
        configured: has("SUPABASE_PUBLISHABLE_KEY"),
        hint: "Project Settings → API Keys → publishable",
      },
      {
        name: "EXTERNAL_SUPABASE_SERVICE_ROLE_KEY",
        label: "مفتاح الخدمة (service role)",
        required: true,
        configured: has("SUPABASE_SERVICE_ROLE_KEY"),
        hint: "Project Settings → API Keys → service_role (سري)",
      },
      {
        name: "GATE_SESSION_SECRET",
        label: "سر جلسات البوابة",
        required: true,
        configured: has("SESSION_SECRET"),
        hint: "نص عشوائي طويل (32 حرفًا فأكثر)",
      },
      {
        name: "GATE_HASH_SALT",
        label: "ملح التشفير للبوابة",
        required: true,
        configured: has("ADMIN_HASH_SALT"),
        hint: "نص عشوائي طويل — تغييره يبطل رموز الدخول الحالية",
      },
      {
        name: "EXTERNAL_DB_DIRECT_URL",
        label: "رابط الاتصال المباشر بقاعدة البيانات",
        required: false,
        configured: raw("EXTERNAL_DB_DIRECT_URL") || raw("LOVABLE_DB_MIGRATION_URL"),
        hint: "يُستخدم لتشغيل ترحيلات قاعدة البيانات فقط",
      },
      {
        name: "LOVABLE_CRON_SECRET",
        label: "سر المهام المجدولة",
        required: false,
        configured: raw("LOVABLE_CRON_SECRET"),
        hint: "اختياري — للمهام المجدولة",
      },
    ];

    return { vars, ready: vars.every((v) => !v.required || v.configured) };
  },
);
