import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client dùng cho phía Server-side (Route Handlers / Server Components)
 * Sử dụng Secret Key (chuẩn mới của Supabase) để thực thi các tác vụ quản trị,
 * phân quyền hoặc xử lý an toàn mà không lộ key ra trình duyệt.
 */
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "placeholder-key";

export function getSupabaseServerClient() {
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Khởi tạo sẵn instance server client dùng ngay
export const supabaseServer = getSupabaseServerClient();
