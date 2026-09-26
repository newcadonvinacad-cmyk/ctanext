export * from "./client";
export * from "./server";
export * from "./storage";

// Alias mặc định để tái sử dụng nhanh
import { supabaseClient } from "./client";
export const supabase = supabaseClient;
export default supabase;
