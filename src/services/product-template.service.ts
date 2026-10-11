import { getDbPool } from "@/lib/db";
import { evaluateFormula, evaluateCondition } from "@/lib/safe-math-evaluator";
import {
  STANDARD_IRON_OPTIONS,
  STANDARD_SURFACE_OPTIONS,
  STANDARD_LED_OPTIONS,
  STANDARD_POWER_OPTIONS,
  STANDARD_LETTER_OPTIONS,
} from "@/lib/signage-bom-calculator";

export interface ProductTemplateDto {
  id: string;
  code: string;
  name: string;
  signageType: string;
  versionNo: number;
  description: string;
  parameterSchema: Array<{
    key: string;
    label: string;
    type: "number" | "boolean" | "string";
    default: any;
    options?: Array<{ label: string; value: any }>;
  }>;
  isActive: boolean;
  lines?: ProductTemplateLineDto[];
  isCustomProduct?: boolean;
  bomLines?: any[];
}

export interface ProductTemplateLineDto {
  id: string;
  templateId: string;
  lineNo: number;
  groupCode: string;
  lineType: "material" | "service" | "posm";
  description: string;
  formulaExpression: string;
  defaultRepresentativeId: string | null;
  representativeName?: string;
  unitName: string;
  wasteRate: number;
  conditionExpression: string;
  notes: string;
  unitPrice?: number;
}

export interface CalculatedBomLine {
  lineNo: number;
  groupCode: string;
  lineType: "material" | "service" | "posm";
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  representativeId: string | null;
  notes: string;
}

export interface TemplateBomCalculationResult {
  templateId: string;
  templateCode: string;
  templateName: string;
  items: CalculatedBomLine[];
  totalCost: number;
}

export class ProductTemplateService {
  private static async getOrgId(): Promise<string> {
    const pool = getDbPool();
    const res = await pool.query(`SELECT id FROM erp.organizations LIMIT 1`);
    return res.rows[0]?.id;
  }

  /**
   * Lấy danh sách mẫu sản phẩm đang hoạt động
   */
  static async listTemplates(): Promise<ProductTemplateDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const sql = `
      SELECT id, code, name, signage_type, version_no, description, parameter_schema, is_active
      FROM erp.product_templates
      WHERE (organization_id = $1 OR organization_id IS NULL) AND is_active = true
      ORDER BY name ASC
    `;
    const res = await pool.query(sql, [orgId]);

    const systemTemplates: ProductTemplateDto[] = res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      signageType: r.signage_type,
      versionNo: r.version_no,
      description: r.description || "",
      parameterSchema: Array.isArray(r.parameter_schema)
        ? r.parameter_schema
        : typeof r.parameter_schema === "string"
        ? JSON.parse(r.parameter_schema)
        : [],
      isActive: r.is_active,
    }));

    // Bổ sung các Thành Phẩm Định Mức từ erp.items (quản lý tại tab Định Mức & Bóc Tách BOM)
    let customProductTemplates: ProductTemplateDto[] = [];
    try {
      const productItemsRes = await pool.query(
        `
        SELECT 
          id, code, name, 'custom_product' as signage_type, 1 as version_no,
          'Thành phẩm định mức xưởng' as description,
          '[]'::jsonb as parameter_schema,
          is_active,
          specification->'bom' as bom_lines
        FROM erp.items
        WHERE (organization_id = $1 OR organization_id IS NULL)
          AND (kind = 'product' OR (specification->>'bom') IS NOT NULL)
          AND is_active = true
        ORDER BY code ASC
      `,
        [orgId]
      );

      customProductTemplates = productItemsRes.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        signageType: "custom_product",
        versionNo: 1,
        description: r.description || "Thành phẩm định mức xưởng",
        parameterSchema: [],
        isActive: r.is_active,
        isCustomProduct: true,
        bomLines: Array.isArray(r.bom_lines) ? r.bom_lines : [],
      }));
    } catch (itemErr) {
      console.warn("Lỗi nạp thành phẩm định mức từ erp.items:", itemErr);
    }

    return [...customProductTemplates, ...systemTemplates];
  }

  /**
   * Lấy chi tiết mẫu kèm toàn bộ dòng công thức định mức
   */
  static async getTemplateById(id: string): Promise<ProductTemplateDto | null> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const tRes = await pool.query(
      `
      SELECT id, code, name, signage_type, version_no, description, parameter_schema, is_active
      FROM erp.product_templates
      WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)
    `,
      [id, orgId]
    );

    if (tRes.rows.length === 0) {
      // Thử tìm trong erp.items nếu là Thành phẩm định mức
      try {
        const itemRes = await pool.query(
          `SELECT id, code, name, specification->'bom' as bom_lines, is_active FROM erp.items WHERE id = $1`,
          [id]
        );
        if (itemRes.rows.length > 0) {
          const it = itemRes.rows[0];
          const bomLines = Array.isArray(it.bom_lines) ? it.bom_lines : [];
          const itemIds = bomLines.map((b: any) => b.itemId).filter(Boolean);
          const priceMap: Record<string, number> = {};
          if (itemIds.length > 0) {
            try {
              const prRes = await pool.query(
                `SELECT id, COALESCE(cost_price, 0) as price FROM erp.items WHERE id = ANY($1::uuid[])`,
                [itemIds]
              );
              for (const r of prRes.rows) {
                priceMap[r.id] = Number(r.price) || 0;
              }
            } catch (prErr) {
              console.warn("Lỗi tra cứu giá NVL thành phẩm:", prErr);
            }
          }

          return {
            id: it.id,
            code: it.code,
            name: it.name,
            signageType: "custom_product",
            versionNo: 1,
            description: "Thành phẩm định mức xưởng",
            parameterSchema: [],
            isActive: it.is_active,
            isCustomProduct: true,
            bomLines,
            lines: bomLines.map((b: any, idx: number) => ({
              id: b.id || `line-${idx}`,
              templateId: it.id,
              lineNo: idx + 1,
              groupCode: "custom_material",
              lineType: "material" as const,
              description: b.name,
              formulaExpression: String(b.quantity || 1),
              defaultRepresentativeId: b.itemId || null,
              unitName: b.unit || "Cái",
              wasteRate: 0,
              conditionExpression: "",
              notes: b.note || "",
              unitPrice: priceMap[b.itemId] || 0,
            })),
          };
        }
      } catch (e) {
        console.warn("Lỗi lấy chi tiết thành phẩm định mức:", e);
      }
      return null;
    }
    const t = tRes.rows[0];

    const lRes = await pool.query(
      `
      SELECT 
        l.id, l.template_id, l.line_no, l.group_code, l.line_type, l.description,
        l.formula_expression, l.default_representative_id, l.unit_name, l.waste_rate,
        l.condition_expression, l.notes,
        mr.name as representative_name,
        COALESCE(i.cost_price, 0) as item_price
      FROM erp.product_template_lines l
      LEFT JOIN erp.material_representatives mr ON mr.id = l.default_representative_id
      LEFT JOIN erp.items i ON i.id = mr.default_item_id
      WHERE l.template_id = $1
      ORDER BY l.line_no ASC
    `,
      [id]
    );

    const lines: ProductTemplateLineDto[] = lRes.rows.map((r) => ({
      id: r.id,
      templateId: r.template_id,
      lineNo: r.line_no,
      groupCode: r.group_code,
      lineType: r.line_type,
      description: r.description,
      formulaExpression: r.formula_expression,
      defaultRepresentativeId: r.default_representative_id,
      representativeName: r.representative_name,
      unitName: r.unit_name,
      wasteRate: Number(r.waste_rate) || 0,
      conditionExpression: r.condition_expression || "",
      notes: r.notes || "",
      unitPrice: Number(r.item_price) || 0,
    }));

    return {
      id: t.id,
      code: t.code,
      name: t.name,
      signageType: t.signage_type,
      versionNo: t.version_no,
      description: t.description || "",
      parameterSchema: Array.isArray(t.parameter_schema)
        ? t.parameter_schema
        : typeof t.parameter_schema === "string"
        ? JSON.parse(t.parameter_schema)
        : [],
      isActive: t.is_active,
      lines,
    };
  }

  /**
   * Tính toán dự toán BOM tự động từ mẫu và kích thước tham số thực tế
   */
  static async calculateBomFromTemplate(
    templateId: string,
    input: {
      widthMeters: number;
      heightMeters: number;
      depthMeters?: number;
      quantity?: number;
      parameters?: Record<string, any>;
      selectedSpecs?: Record<string, any>;
    }
  ): Promise<TemplateBomCalculationResult> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Không tìm thấy mẫu sản phẩm với ID: ${templateId}`);
    }

    const w = Number(input.widthMeters) || 1.0;
    const h = Number(input.heightMeters) || 1.0;
    const d = Number(input.depthMeters) || 0.1;
    const qty = Number(input.quantity) || 1.0;

    // Chuẩn bị biến đầu vào cho Parser
    const variables: Record<string, number | boolean | string> = {
      w,
      h,
      d,
      width: w,
      height: h,
      depth: d,
      area: w * h,
      perimeter: 2 * (w + h),
      quantity: qty,
      grid_cm: 40,
      faces: 1,
      is_lit: true,
      has_logo: false,
      ...(input.parameters || {}),
    };

    const calculatedItems: CalculatedBomLine[] = [];
    let totalCost = 0;

    for (const line of template.lines || []) {
      // 1. Kiểm tra điều kiện
      if (line.conditionExpression && line.conditionExpression.trim()) {
        const conditionPass = evaluateCondition(line.conditionExpression, variables);
        if (!conditionPass) continue;
      }

      // 2. Tính số lượng
      let calcQty = evaluateFormula(line.formulaExpression, variables);
      if (calcQty <= 0) continue;

      // Nhân với số lượng thành phẩm
      calcQty = calcQty * qty;

      let unitPrice = line.unitPrice || 0;
      let description = line.description;
      let unitName = line.unitName;

      // Áp dụng quy cách vật tư người dùng đã chọn (selectedSpecs)
      if (input.selectedSpecs) {
        const specCode = input.selectedSpecs[line.groupCode];
        if (specCode) {
          if (specCode === "NONE" || specCode === "KHONG-KHUNG") {
            continue; // Người khảo sát đã chọn không dùng nhóm này
          }

          let matchedOpt = null;
          if (line.groupCode === "frame") {
            matchedOpt = STANDARD_IRON_OPTIONS.find((o) => o.code === specCode);
          } else if (line.groupCode === "face") {
            matchedOpt = STANDARD_SURFACE_OPTIONS.find((o) => o.code === specCode);
          } else if (line.groupCode === "lighting") {
            matchedOpt = STANDARD_LED_OPTIONS.find((o) => o.code === specCode);
          } else if (line.groupCode === "power") {
            matchedOpt = STANDARD_POWER_OPTIONS.find((o) => o.code === specCode);
          } else if (line.groupCode === "letters" || line.groupCode === "logo") {
            matchedOpt = STANDARD_LETTER_OPTIONS.find((o) => o.code === specCode);
          }

          if (matchedOpt) {
            unitPrice = matchedOpt.defaultPrice;
            description = `${line.description}: ${matchedOpt.name}`;
            if (matchedOpt.unit) {
              unitName = matchedOpt.unit;
            }
          }
        }
      }

      // Đơn giá ước tính fallback nếu chưa có giá
      if (unitPrice === 0) {
        if (line.groupCode === "frame") unitPrice = 165000; // Cây sắt
        else if (line.groupCode === "face") {
          unitPrice = unitName === "Tấm" ? 380000 : 120000;
        } else if (line.groupCode === "lighting") unitPrice = 8500; // Bóng LED
        else if (line.groupCode === "power") unitPrice = 450000; // Bộ nguồn
        else if (line.groupCode === "sub_materials") unitPrice = 65000;
        else unitPrice = 50000;
      }

      const amount = Math.round(calcQty * unitPrice);
      totalCost += amount;

      calculatedItems.push({
        lineNo: line.lineNo,
        groupCode: line.groupCode,
        lineType: line.lineType,
        description,
        quantity: Math.round(calcQty * 100) / 100,
        unit: unitName,
        unitPrice,
        amount,
        representativeId: line.defaultRepresentativeId,
        notes: line.notes,
      });
    }

    // Nếu người dùng chọn chữ nổi từ selectedSpecs và template chưa có dòng chữ nổi
    if (input.selectedSpecs?.letters && input.selectedSpecs.letters !== "NONE") {
      const letterOpt = STANDARD_LETTER_OPTIONS.find((o) => o.code === input.selectedSpecs?.letters);
      if (letterOpt && !calculatedItems.some((it) => it.groupCode === "letters")) {
        const letterAmount = letterOpt.defaultPrice * qty;
        totalCost += letterAmount;
        calculatedItems.push({
          lineNo: calculatedItems.length + 1,
          groupCode: "letters",
          lineType: "material",
          description: `Bộ chữ thương hiệu: ${letterOpt.name}`,
          quantity: qty,
          unit: letterOpt.unit || "Bộ",
          unitPrice: letterOpt.defaultPrice,
          amount: letterAmount,
          representativeId: null,
          notes: "Quy cách chữ nổi theo khảo sát",
        });
      }
    }

    return {
      templateId: template.id,
      templateCode: template.code,
      templateName: template.name,
      items: calculatedItems,
      totalCost,
    };
  }
}
