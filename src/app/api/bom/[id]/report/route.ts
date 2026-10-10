import { workflowHttp } from "@/lib/production/http";
import { ProductionBomService } from "@/services/production-bom.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(req.url);
  const target = (url.searchParams.get("target") || "workshop") as "internal" | "workshop";
  const format = url.searchParams.get("format") || "json";
  const { id } = await params;

  return workflowHttp(async (ctx) => {
    const report = await ProductionBomService.getBomReport(ctx, id, { target });
    if (format === "html" || format === "print") {
      const html = ProductionBomService.generateBomPrintHtml(report);
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return report;
  });
}
