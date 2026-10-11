import { getDbPool } from "@/lib/db";
import { evaluateFormula, evaluateCondition } from "@/lib/safe-math-evaluator";

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

    return res.rows.map((r) => ({
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

    if (tRes.rows.length === 0) return null;
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

      // Đơn giá ước tính (lấy từ material default hoặc fallback chuẩn ngành)
      let unitPrice = line.unitPrice || 0;
      if (unitPrice === 0) {
        if (line.groupCode === "frame") unitPrice = 165000; // Cây sắt
        else if (line.groupCode === "face") {
          unitPrice = line.unitName === "Tấm" ? 380000 : 120000;
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
        description: line.description,
        quantity: Math.round(calcQty * 100) / 100,
        unit: line.unitName,
        unitPrice,
        amount,
        representativeId: line.defaultRepresentativeId,
        notes: line.notes,
      });
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
