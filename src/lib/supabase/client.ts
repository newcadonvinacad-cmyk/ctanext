import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client dùng cho phía Client-side (Trình duyệt / React Client Components)
 * Sử dụng Publishable Key (chuẩn API Key mới của Supabase)
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://placeholder.supabase.co";

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "placeholder-publishable-key";

export const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);
