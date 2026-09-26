import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/supabase/storage";
import { geminiService } from "@/lib/ai/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: any = {
    status: "ok",
    service: "Signage ERP API (Next.js App Router)",
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // 1. Kiểm tra kết nối Supabase Storage Bucket
  try {
    const { data: buckets, error } = await supabaseServer.storage.listBuckets();
    if (error) {
      result.checks.supabase = { status: "warning", message: error.message };
    } else {
      const bucketExists = buckets.some((b) => b.name === STORAGE_BUCKET);
      result.checks.supabase = {
        status: "connected",
        activeBucket: STORAGE_BUCKET,
        bucketFound: bucketExists,
        totalBuckets: buckets.length,
      };
    }
  } catch (err: any) {
    result.checks.supabase = { status: "error", message: err.message };
  }

  // 2. Kiểm tra Gemini 3.5 Flash-Lite AI
  try {
    const aiResponse = await geminiService.generateText({
      prompt: "Ping test. Respond with 'PONG'.",
    });
    result.checks.gemini_ai = {
      status: "connected",
      model: "gemini-3.5-flash-lite",
      response: aiResponse,
    };
  } catch (err: any) {
    result.checks.gemini_ai = { status: "error", message: err.message };
  }

  return NextResponse.json(result);
}
