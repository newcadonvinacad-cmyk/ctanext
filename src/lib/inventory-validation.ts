import { z } from "zod";

const code = z.string().trim().min(1, "Vui lòng nhập mã").max(50).transform(v => v.toUpperCase());
const name = z.string().trim().min(1, "Vui lòng nhập tên").max(200);
export const warehouseSchema = z.object({
  code, name,
  type: z.enum(["workshop", "distribution", "vehicle", "transit"]),
  isActive: z.boolean().default(true),
});
export const categorySchema = z.object({ code, name });
export const unitSchema = z.object({ code, name, dimension: z.string().trim().min(1, "Vui lòng chọn đại lượng").max(50) });
export const catalogItemSchema = z.object({
  code, name, kind: z.enum(["material", "product", "tool", "service"]),
  categoryId: z.string().uuid("Vui lòng chọn loại vật tư"),
  baseUnitId: z.string().uuid("Vui lòng chọn đơn vị tính"),
  specJson: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
  conversions: z.array(z.object({ unitId: z.string().uuid(), factorToBase: z.number().positive().finite() })).default([]),
}).superRefine((v, ctx) => {
  const seen = new Set<string>([v.baseUnitId]);
  v.conversions.forEach((c, index) => {
    if (seen.has(c.unitId)) ctx.addIssue({ code: "custom", path: ["conversions", index], message: "Đơn vị quy đổi không được trùng nhau hoặc trùng đơn vị gốc" });
    seen.add(c.unitId);
  });
});
export type CatalogItemInput = z.infer<typeof catalogItemSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
