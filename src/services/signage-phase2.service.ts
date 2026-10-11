import { getDbPool, getCachedOrgId } from "@/lib/db";
import { getNextDocumentCode } from "@/lib/sequences";
import { calculateSignageBom } from "@/lib/signage-bom-calculator";

export interface SiteSurveyMetadata {
  regionKV?: "HCM" | "MIỀN TÂY" | "MIỀN ĐÔNG" | "MIỀN TRUNG" | string;
  workType?: "BẢNG HIỆU" | "SỬA CHỮA MIỀN TÂY" | "KHẢO SÁT" | "THÙNG RỖNG" | string;
  dealerName?: string;
  dealerPhone?: string;
  dealerAddress?: string;
  signMaterial?: string; // Bảng alu, Bảng bạt UV, Bảng fomex 10li + decal...
  subAccessories?: string; // Thay mica logo 65x65, lườn, thay dải màu...
  hasMicaLogo65?: boolean;
  hasSideTrim?: boolean;
  hasColorStrip?: boolean;
  displayShelves?: string; // Kệ màu, kệ thông tin SP, kệ hình ảnh, kệ sắt...
  furniture?: string; // Bàn lễ tân, hộp bàn lễ tân, ghế làm việc...
  otherPosm?: string; // HĐ ngôi nhà, dán decal kệ sắt cũ...
  repairScope?: string; // Sửa địa chỉ, sửa bảng, sửa tay nắm kệ gỗ, bắn lại trần alu cũ bị bung...
  surveyScope?: string; // Ks bảng, ks SR (showroom)...
  executionStatus?: string; // Đang chốt, Đã chốt, Đang thi công, Đã hoàn thành...
  deliverySchedule?: string; // TC ngày 12-10, giao tháng 3, giao 2 bộ tháng 3...
  siteNotes?: string; // Dọn kệ cho đại lý không có người, hỗ trợ làm sớm...
  workItems?: string[]; // Danh sách gạch đầu dòng hạng mục công việc & đo đạc thực tế
}

export interface SiteSurveyDto {
  id: string;
  code: string;
  title: string;
  address: string;
  surveyDate: string;
  status: "draft" | "completed" | "converted";
  customerId: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  projectId: string | null;
  projectCode?: string | null;
  projectName?: string | null;
  quotationId: string | null;
  quotationCode?: string | null;
  surveyorEmployeeId: string | null;
  surveyorName?: string | null;
  widthMeters: number;
  heightMeters: number;
  depthMeters: number;
  floorLevel: string;
  elevationMeters: number;
  structureType: string;
  powerSource: string;
  powerDistanceMeters: number;
  installationMethod: string;
  obstacles: string;
  notes: string;
  photos: Array<{ url: string; caption?: string; stage?: string }>;
  customerSignature?: string | null;
  surveyorSignature?: string | null;
  metadata?: SiteSurveyMetadata;
  createdAt: string;
}

export interface CreateSiteSurveyInput {
  customerId?: string | null;
  projectId?: string | null;
  quotationId?: string | null;
  title: string;
  address: string;
  surveyDate?: string;
  surveyorEmployeeId?: string | null;
  widthMeters?: number;
  heightMeters?: number;
  depthMeters?: number;
  floorLevel?: string;
  elevationMeters?: number;
  structureType?: string;
  powerSource?: string;
  powerDistanceMeters?: number;
  installationMethod?: string;
  obstacles?: string;
  notes?: string;
  photos?: Array<{ url: string; caption?: string; stage?: string }>;
  metadata?: SiteSurveyMetadata;
  status?: "draft" | "completed" | "converted";
}

export interface DesignProofDto {
  id: string;
  code: string;
  title: string;
  projectId: string | null;
  projectCode?: string | null;
  projectName?: string | null;
  quotationId: string | null;
  versionNo: number;
  fileUrl: string;
  thumbnailUrl: string | null;
  backgroundMaterial: string;
  letterMaterial: string;
  ledSpec: string;
  powerSpec: string;
  status: "pending" | "feedback" | "approved" | "rejected";
  clientFeedback: string;
  approvedAt: string | null;
  approvedByName: string | null;
  createdAt: string;
}

export interface CreateDesignProofInput {
  projectId?: string | null;
  quotationId?: string | null;
  title: string;
  versionNo?: number;
  fileUrl: string;
  thumbnailUrl?: string | null;
  backgroundMaterial?: string;
  letterMaterial?: string;
  ledSpec?: string;
  powerSpec?: string;
  status?: "pending" | "feedback" | "approved" | "rejected";
  clientFeedback?: string;
  approvedByName?: string;
}

export interface FactoryQcDto {
  id: string;
  code: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  inspectorEmployeeId: string | null;
  inspectorName?: string;
  qcDate: string;
  status: "pending" | "passed" | "failed";
  agingTestHours: number;
  voltageDropCheck: boolean;
  waterproofCheck: boolean;
  frameWeldCheck: boolean;
  lightUniformityCheck: boolean;
  accessoriesChecklist: Array<{ item: string; checked: boolean; note?: string }>;
  photos: Array<{ url: string; caption?: string }>;
  defectNotes: string;
  createdAt: string;
}

export interface CreateFactoryQcInput {
  projectId: string;
  inspectorEmployeeId?: string | null;
  qcDate?: string;
  status?: "pending" | "passed" | "failed";
  agingTestHours?: number;
  voltageDropCheck?: boolean;
  waterproofCheck?: boolean;
  frameWeldCheck?: boolean;
  lightUniformityCheck?: boolean;
  accessoriesChecklist?: Array<{ item: string; checked: boolean; note?: string }>;
  photos?: Array<{ url: string; caption?: string }>;
  defectNotes?: string;
}

export interface ServiceTicketDto {
  id: string;
  code: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  title: string;
  issueType: "led_power" | "structural" | "decal_acrylic" | "weather_damage" | "other";
  priority: "urgent" | "high" | "medium" | "low";
  status: "received" | "dispatched" | "in_progress" | "resolved" | "cancelled";
  isWarranty: boolean;
  reportedAt: string;
  assignedEmployeeId: string | null;
  assignedEmployeeName?: string;
  resolutionNotes: string;
  resolvedAt: string | null;
  costAmount: number;
  photos: Array<{ url: string; caption?: string }>;
  createdAt: string;
}

export interface CreateServiceTicketInput {
  projectId: string;
  customerId: string;
  title: string;
  issueType?: "led_power" | "structural" | "decal_acrylic" | "weather_damage" | "other";
  priority?: "urgent" | "high" | "medium" | "low";
  isWarranty?: boolean;
  assignedEmployeeId?: string | null;
  photos?: Array<{ url: string; caption?: string }>;
}

export class SignagePhase2Service {
  private static async getOrgId(): Promise<string> {
    return getCachedOrgId("SIGNAGE");
  }

  static async listSiteSurveys(filters?: {
    status?: string;
    customerId?: string;
    projectId?: string;
    search?: string;
  }): Promise<SiteSurveyDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        s.*,
        p.name as customer_name,
        p.phone as customer_phone,
        prj.code as project_code,
        prj.name as project_name,
        q.code as quotation_code,
        e.name as surveyor_name
      FROM erp.site_surveys s
      LEFT JOIN erp.partners p ON p.id = s.customer_id
      LEFT JOIN erp.projects prj ON prj.id = s.project_id
      LEFT JOIN erp.quotations q ON q.id = s.quotation_id
      LEFT JOIN erp.employees e ON e.id = s.surveyor_employee_id
      WHERE s.organization_id = $1
    `;
    const params: any[] = [orgId];

    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND s.status = $${params.length}`;
    }
    if (filters?.customerId) {
      params.push(filters.customerId);
      sql += ` AND s.customer_id = $${params.length}`;
    }
    if (filters?.projectId) {
      params.push(filters.projectId);
      sql += ` AND s.project_id = $${params.length}`;
    }
    if (filters?.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      sql += ` AND (LOWER(s.title) LIKE $${params.length} OR LOWER(s.code) LIKE $${params.length} OR LOWER(s.address) LIKE $${params.length})`;
    }

    sql += ` ORDER BY s.created_at DESC`;

    const res = await pool.query(sql, params);
    if (res.rows.length === 0 && !filters?.customerId && !filters?.projectId) {
      // Dữ liệu mẫu chuẩn thực tế ngành quảng cáo & Nippon Paint
      let fallbackList = DEFAULT_NIPPON_MATRIX_SURVEYS as SiteSurveyDto[];
      if (filters?.status) {
        fallbackList = fallbackList.filter((s) => s.status === filters.status);
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        fallbackList = fallbackList.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q) ||
            s.address.toLowerCase().includes(q) ||
            (s.metadata?.dealerName && s.metadata.dealerName.toLowerCase().includes(q))
        );
      }
      return fallbackList;
    }

    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      address: r.address,
      surveyDate: r.survey_date ? new Date(r.survey_date).toISOString().split("T")[0] : "",
      status: r.status,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      projectId: r.project_id,
      projectCode: r.project_code || null,
      projectName: r.project_name,
      quotationId: r.quotation_id,
      quotationCode: r.quotation_code,
      surveyorEmployeeId: r.surveyor_employee_id,
      surveyorName: r.surveyor_name,
      widthMeters: Number(r.width_meters) || 0,
      heightMeters: Number(r.height_meters) || 0,
      depthMeters: Number(r.depth_meters) || 0,
      floorLevel: r.floor_level || "Tầng 1",
      elevationMeters: Number(r.elevation_meters) || 0,
      structureType: r.structure_type || "concrete_beam",
      powerSource: r.power_source || "220v_single_phase",
      powerDistanceMeters: Number(r.power_distance_meters) || 0,
      installationMethod: r.installation_method || "ladder",
      obstacles: r.obstacles || "",
      notes: r.notes || "",
      photos: Array.isArray(r.photos) ? r.photos : [],
      customerSignature: r.customer_signature || null,
      surveyorSignature: r.surveyor_signature || null,
      metadata: r.metadata && typeof r.metadata === "object" ? r.metadata : {},
      createdAt: r.created_at.toISOString(),
    }));
  }

  static async getSiteSurveyById(id: string): Promise<SiteSurveyDto | null> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `
      SELECT 
        s.*,
        p.name as customer_name,
        p.phone as customer_phone,
        prj.code as project_code,
        prj.name as project_name,
        q.code as quotation_code,
        e.name as surveyor_name
      FROM erp.site_surveys s
      LEFT JOIN erp.partners p ON p.id = s.customer_id
      LEFT JOIN erp.projects prj ON prj.id = s.project_id
      LEFT JOIN erp.quotations q ON q.id = s.quotation_id
      LEFT JOIN erp.employees e ON e.id = s.surveyor_employee_id
      WHERE s.id = $1 AND (s.organization_id = $2 OR s.organization_id IS NULL)
    `,
      [id, orgId]
    );

    if (res.rows.length > 0) {
      const r = res.rows[0];
      return {
        id: r.id,
        code: r.code,
        title: r.title,
        address: r.address,
        surveyDate: r.survey_date ? new Date(r.survey_date).toISOString().split("T")[0] : "",
        status: r.status,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        projectId: r.project_id,
        projectCode: r.project_code || null,
        projectName: r.project_name,
        quotationId: r.quotation_id,
        quotationCode: r.quotation_code,
        surveyorEmployeeId: r.surveyor_employee_id,
        surveyorName: r.surveyor_name,
        widthMeters: Number(r.width_meters) || 0,
        heightMeters: Number(r.height_meters) || 0,
        depthMeters: Number(r.depth_meters) || 0,
        floorLevel: r.floor_level || "Tầng 1",
        elevationMeters: Number(r.elevation_meters) || 0,
        structureType: r.structure_type || "concrete_beam",
        powerSource: r.power_source || "220v_single_phase",
        powerDistanceMeters: Number(r.power_distance_meters) || 0,
        installationMethod: r.installation_method || "ladder",
        obstacles: r.obstacles || "",
        notes: r.notes || "",
        photos: Array.isArray(r.photos) ? r.photos : [],
        customerSignature: r.customer_signature || null,
        surveyorSignature: r.surveyor_signature || null,
        metadata: r.metadata && typeof r.metadata === "object" ? r.metadata : {},
        createdAt: r.created_at.toISOString(),
      };
    }

    const fallbackItem = (DEFAULT_NIPPON_MATRIX_SURVEYS as SiteSurveyDto[]).find((s) => s.id === id);
    if (fallbackItem) return fallbackItem;
    return null;
  }

  static async createSiteSurvey(input: CreateSiteSurveyInput, userId: string): Promise<SiteSurveyDto> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const code = await getNextDocumentCode(pool, orgId, "site_survey", "KS");

    const surveyStatus = input.status || "draft";
    const sql = `
      INSERT INTO erp.site_surveys (
        organization_id, code, customer_id, project_id, quotation_id,
        title, address, survey_date, surveyor_employee_id, status,
        width_meters, height_meters, depth_meters, floor_level, elevation_meters,
        structure_type, power_source, power_distance_meters, installation_method,
        obstacles, notes, photos, metadata, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $24
      ) RETURNING id
    `;

    const res = await pool.query(sql, [
      orgId,
      code,
      input.customerId || null,
      input.projectId || null,
      input.quotationId || null,
      input.title.trim(),
      input.address.trim(),
      input.surveyDate || new Date().toISOString().split("T")[0],
      input.surveyorEmployeeId || null,
      surveyStatus,
      input.widthMeters || 0,
      input.heightMeters || 0,
      input.depthMeters || 0,
      input.floorLevel || "Tầng 1",
      input.elevationMeters || 0,
      input.structureType || "concrete_beam",
      input.powerSource || "220v_single_phase",
      input.powerDistanceMeters || 0,
      input.installationMethod || "ladder",
      input.obstacles || "",
      input.notes || "",
      JSON.stringify(input.photos || []),
      JSON.stringify(input.metadata || {}),
      userId,
    ]);

    const created = await this.getSiteSurveyById(res.rows[0].id);
    return created!;
  }

  static async updateSiteSurvey(
    id: string,
    input: Partial<CreateSiteSurveyInput>,
    userId: string
  ): Promise<SiteSurveyDto> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const sql = `
      UPDATE erp.site_surveys
      SET
        title = COALESCE($1, title),
        address = COALESCE($2, address),
        width_meters = COALESCE($3, width_meters),
        height_meters = COALESCE($4, height_meters),
        depth_meters = COALESCE($5, depth_meters),
        floor_level = COALESCE($6, floor_level),
        elevation_meters = COALESCE($7, elevation_meters),
        structure_type = COALESCE($8, structure_type),
        power_source = COALESCE($9, power_source),
        installation_method = COALESCE($10, installation_method),
        notes = COALESCE($11, notes),
        metadata = COALESCE($12, metadata),
        customer_id = CASE WHEN $16::boolean = true THEN $17 ELSE customer_id END,
        project_id = CASE WHEN $18::boolean = true THEN $19 ELSE project_id END,
        survey_date = CASE WHEN $20::boolean = true THEN $21 ELSE survey_date END,
        status = COALESCE($22, status),
        surveyor_employee_id = CASE WHEN $23::boolean = true THEN $24 ELSE surveyor_employee_id END,
        updated_by = $13,
        updated_at = now()
      WHERE id = $14 AND (organization_id = $15 OR organization_id IS NULL)
    `;

    await pool.query(sql, [
      input.title !== undefined ? input.title.trim() : null,
      input.address !== undefined ? input.address.trim() : null,
      input.widthMeters !== undefined ? input.widthMeters : null,
      input.heightMeters !== undefined ? input.heightMeters : null,
      input.depthMeters !== undefined ? input.depthMeters : null,
      input.floorLevel !== undefined ? input.floorLevel : null,
      input.elevationMeters !== undefined ? input.elevationMeters : null,
      input.structureType !== undefined ? input.structureType : null,
      input.powerSource !== undefined ? input.powerSource : null,
      input.installationMethod !== undefined ? input.installationMethod : null,
      input.notes !== undefined ? input.notes : null,
      input.metadata !== undefined ? JSON.stringify(input.metadata) : null,
      userId,
      id,
      orgId,
      input.customerId !== undefined,
      input.customerId || null,
      input.projectId !== undefined,
      input.projectId || null,
      input.surveyDate !== undefined,
      input.surveyDate || null,
      input.status || null,
      input.surveyorEmployeeId !== undefined,
      input.surveyorEmployeeId || null,
    ]);

    const updated = await this.getSiteSurveyById(id);
    return updated!;
  }

  static async deleteSiteSurvey(id: string, userId: string): Promise<boolean> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    await pool.query("DELETE FROM erp.site_surveys WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)", [id, orgId]);
    return true;
  }

  /**
   * 1-Click chuyển Khảo Sát thành Báo Giá Dự Toán (Pre-sales Survey to Quotation)
   */
  static async convertSurveyToQuotation(
    surveyId: string,
    userId: string
  ): Promise<{ quotationId: string; quotationCode: string }> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const survey = await this.getSiteSurveyById(surveyId);
    if (!survey) throw new Error("Không tìm thấy phiếu khảo sát!");

    // P1-14: Chặn chuyển đổi nhiều lần nếu đã có quotation_id hoặc status = 'converted'
    if (survey.status === "converted" || survey.quotationId) {
      throw new Error("Phiếu khảo sát này đã được chuyển thành báo giá trước đó!");
    }

    const area = Math.round((survey.widthMeters * survey.heightMeters) * 100) / 100;
    const estUnitPrice = 1850000; // Đơn giá dự toán tham chiếu chuẩn: 1.850.000 đ/m2 (Alu + Chữ nổi mica đèn LED)
    const lineTotal = Math.round(area > 0 ? area * estUnitPrice : 5000000);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 0. P1-15: Tự động liên kết khách hàng theo SĐT/MST (không gộp nhầm theo tên trùng)
      let resolvedCustomerId = survey.customerId;
      if (!resolvedCustomerId) {
        const dealerName = survey.metadata?.dealerName || survey.title || "Khách hàng khảo sát";
        const dealerPhone = (survey.metadata?.dealerPhone || survey.customerPhone || "").trim();
        let existingPartnerId: string | null = null;

        if (dealerPhone) {
          const pRes = await client.query(
            "SELECT id FROM erp.partners WHERE organization_id = $1 AND phone = $2 LIMIT 1",
            [orgId, dealerPhone]
          );
          if (pRes.rows.length > 0) {
            existingPartnerId = pRes.rows[0].id;
          }
        }

        if (existingPartnerId) {
          resolvedCustomerId = existingPartnerId;
        } else {
          const partnerCode = `KH-${Date.now().toString().slice(-6)}`;
          const insRes = await client.query(
            `INSERT INTO erp.partners(organization_id, code, name, phone, address, is_customer, is_supplier, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, true, false, $6, $6) RETURNING id`,
            [orgId, partnerCode, dealerName, dealerPhone, survey.address, userId]
          );
          resolvedCustomerId = insRes.rows[0].id;
        }
      }

      // Đảm bảo survey tồn tại trong DB
      let actualSurveyId = survey.id;
      const sCheck = await client.query("SELECT id FROM erp.site_surveys WHERE id = $1 AND organization_id = $2", [actualSurveyId, orgId]);
      if (sCheck.rows.length === 0) {
        const insertSurvey = await client.query(
          `INSERT INTO erp.site_surveys(
            organization_id, code, customer_id, title, address, survey_date, status,
            width_meters, height_meters, depth_meters, metadata, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10, $11, $11) RETURNING id`,
          [
            orgId,
            survey.code || "KS-NEW",
            resolvedCustomerId,
            survey.title,
            survey.address,
            survey.surveyDate || new Date().toISOString().split("T")[0],
            survey.widthMeters || 0,
            survey.heightMeters || 0,
            survey.depthMeters || 0,
            JSON.stringify(survey.metadata || {}),
            userId,
          ]
        );
        actualSurveyId = insertSurvey.rows[0].id;
      }

      // P1-11: Lấy chi phí từ BOM dự toán + nhân công + % lợi nhuận (thay vì giá cố định)
      const bomRes = await client.query(
        "SELECT * FROM erp.project_boms WHERE survey_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 1",
        [actualSurveyId, orgId]
      );
      let estMaterialCost = 0;
      if (bomRes.rows.length > 0) {
        estMaterialCost = Number(bomRes.rows[0].estimated_material_cost || 0);
      } else {
        const bomCalc = calculateSignageBom({
          widthMeters: survey.widthMeters || 0,
          heightMeters: survey.heightMeters || 0,
          depthMeters: survey.depthMeters || 0.2,
          signageType: "alu_letters",
          signMaterial: survey.metadata?.signMaterial,
          hasMicaLogo65: Boolean(survey.metadata?.hasMicaLogo65),
          hasSideTrim: Boolean(survey.metadata?.hasSideTrim),
          hasColorStrip: Boolean(survey.metadata?.hasColorStrip),
          subAccessories: survey.metadata?.subAccessories,
          displayShelves: survey.metadata?.displayShelves,
          furniture: survey.metadata?.furniture,
          otherPosm: survey.metadata?.otherPosm,
          repairScope: survey.metadata?.repairScope,
        });
        estMaterialCost = bomCalc.totalEstimatedMaterialCost;
      }

      const area = Math.round((survey.widthMeters * survey.heightMeters) * 100) / 100;
      const laborAndInstallCost = Math.round(Math.max(estMaterialCost * 0.3, area * 350000, 500000));
      const baseCost = estMaterialCost + laborAndInstallCost;
      const profitMargin = 0.2; // 20% lợi nhuận
      const lineTotal = Math.round(baseCost * (1 + profitMargin));
      const estUnitPrice = area > 0 ? Math.round(lineTotal / area) : lineTotal;

      const quoteCode = await getNextDocumentCode(client, orgId, "quotation", "BG");

      // P1-12: Lấy membership của chính người đang thao tác, nếu không có mới fallback
      const userMemRes = await client.query(
        "SELECT id FROM erp.memberships WHERE organization_id = $1 AND user_id = $2 LIMIT 1",
        [orgId, userId]
      );
      let ownerMembershipId = userMemRes.rows[0]?.id;
      if (!ownerMembershipId) {
        const memRes = await client.query("SELECT id FROM erp.memberships WHERE organization_id = $1 LIMIT 1", [orgId]);
        ownerMembershipId = memRes.rows[0]?.id;
      }

      // 2. Tạo quotation
      const qRes = await client.query(
        `INSERT INTO erp.quotations(
           organization_id, code, status, customer_id, owner_membership_id, created_by, updated_by
         ) VALUES ($1, $2, 'draft', $3, $4, $5, $5) RETURNING id`,
        [orgId, quoteCode, resolvedCustomerId, ownerMembershipId, userId]
      );
      const quotationId = qRes.rows[0].id;

      // 3. Tạo revision 1
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      const taxAmount = Math.round(lineTotal * 0.1);
      const total = lineTotal + taxAmount;

      const revRes = await client.query(
        `INSERT INTO erp.quotation_revisions(
           organization_id, quotation_id, revision_no, valid_until, currency,
           subtotal, discount_amount, tax_amount, total, terms_snapshot, created_by, updated_by
         ) VALUES ($1, $2, 1, $3, 'VND', $4, 0, $5, $6, $7, $8, $8) RETURNING id`,
        [
          orgId,
          quotationId,
          validUntil.toISOString().split("T")[0],
          lineTotal,
          taxAmount,
          total,
          JSON.stringify({
            surveyCode: survey.code,
            dimensions: `${survey.widthMeters}m x ${survey.heightMeters}m (${area} m²)`,
            estimatedMaterialCost: estMaterialCost,
            laborAndInstallCost,
            installationNotes: `Lắp đặt tại ${survey.address}. Phương án: ${survey.installationMethod}, tầng: ${survey.floorLevel}.`,
          }),
          userId,
        ]
      );
      const revId = revRes.rows[0].id;

      // P1-13: Dòng dịch vụ biển hiệu trọn gói để item_id = null và unit_id = null
      await client.query(
        `INSERT INTO erp.quotation_lines (
           organization_id, revision_id, line_no, description, qty, unit_price,
           discount_amount, tax_rate, line_total, item_id, unit_id, created_by, updated_by
         ) VALUES ($1, $2, 1, $3, $4, $5, 0, 0.1, $6, NULL, NULL, $7, $7)`,
        [
          orgId,
          revId,
          `Gia công & Lắp dựng biển hiệu mặt tiền ${survey.title} (KT: ${survey.widthMeters}m x ${survey.heightMeters}m)`,
          area > 0 ? area : 1,
          estUnitPrice,
          lineTotal,
          userId,
        ]
      );

      // 5. Cập nhật survey
      await client.query(
        `UPDATE erp.site_surveys 
         SET quotation_id = $1, status = 'converted', updated_at = now(), updated_by = $2 
         WHERE id = $3`,
        [quotationId, userId, actualSurveyId]
      );

      await client.query("COMMIT");
      return { quotationId, quotationCode: quoteCode };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ----------------------------------------------------
  // M2.2: DUYỆT MARKET THIẾT KẾ 2D/3D (DESIGN PROOFING)
  // ----------------------------------------------------
  static async listDesignProofs(filters?: {
    projectId?: string;
    quotationId?: string;
    status?: string;
  }): Promise<DesignProofDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        dp.*,
        p.code as project_code,
        p.name as project_name
      FROM erp.design_proofs dp
      LEFT JOIN erp.projects p ON p.id = dp.project_id
      WHERE dp.organization_id = $1
    `;
    const params: any[] = [orgId];

    if (filters?.projectId) {
      params.push(filters.projectId);
      sql += ` AND dp.project_id = $${params.length}`;
    }
    if (filters?.quotationId) {
      params.push(filters.quotationId);
      sql += ` AND dp.quotation_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND dp.status = $${params.length}`;
    }

    sql += ` ORDER BY dp.version_no DESC, dp.created_at DESC`;

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      projectId: r.project_id,
      projectCode: r.project_code,
      projectName: r.project_name,
      quotationId: r.quotation_id,
      versionNo: r.version_no,
      fileUrl: r.file_url,
      thumbnailUrl: r.thumbnail_url,
      backgroundMaterial: r.background_material,
      letterMaterial: r.letter_material,
      ledSpec: r.led_spec,
      powerSpec: r.power_spec,
      status: r.status,
      clientFeedback: r.client_feedback || "",
      approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
      approvedByName: r.approved_by_name,
      createdAt: r.created_at.toISOString(),
    }));
  }

  static async createDesignProof(input: CreateDesignProofInput, userId: string): Promise<DesignProofDto> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const code = await getNextDocumentCode(pool, orgId, "design_proof", "MK");

    const status = input.status || "pending";
    let approvedByName: string | null = null;
    if (status === "approved") {
      if (input.approvedByName) {
        approvedByName = input.approvedByName;
      } else {
        const uRes = await pool.query(`SELECT name FROM public."user" WHERE id = $1`, [userId]);
        approvedByName = uRes.rows[0]?.name || "Người duyệt";
      }
    }

    const sql = `
      INSERT INTO erp.design_proofs (
        organization_id, code, project_id, quotation_id, title,
        version_no, file_url, thumbnail_url,
        background_material, letter_material, led_spec, power_spec,
        status, client_feedback, approved_at, approved_by_name, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, ${status === "approved" ? "now()" : "NULL"}, $15, $16, $16
      ) RETURNING id
    `;

    const res = await pool.query(sql, [
      orgId,
      code,
      input.projectId || null,
      input.quotationId || null,
      input.title.trim(),
      input.versionNo || 1,
      input.fileUrl.trim(),
      input.thumbnailUrl || null,
      input.backgroundMaterial || "Alu Alcorest 3mm EV2002",
      input.letterMaterial || "Inox vàng gương 304 uốn nổi lọng mica",
      input.ledSpec || "Module LED 3 mắt Hàn Quốc 12V",
      input.powerSpec || "Bộ nguồn chống nước Meanwell 12V 400W ngoài trời",
      status,
      input.clientFeedback || null,
      approvedByName,
      userId,
    ]);

    const list = await this.listDesignProofs({ projectId: input.projectId || undefined });
    return list.find((p) => p.id === res.rows[0].id)!;
  }

  static async updateDesignProofStatus(
    proofId: string,
    data: {
      status: "pending" | "feedback" | "approved" | "rejected";
      feedback?: string;
      approvedByName?: string;
    },
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let approvedByName = data.approvedByName || null;
    if (data.status === "approved" && !approvedByName) {
      const uRes = await pool.query(`SELECT name FROM public."user" WHERE id = $1`, [userId]);
      approvedByName = uRes.rows[0]?.name || "Người duyệt";
    }

    const approvedAt = data.status === "approved" ? "now()" : "NULL";
    await pool.query(
      `UPDATE erp.design_proofs
       SET status = $1, client_feedback = $2, approved_by_name = $3,
           approved_at = ${approvedAt}, updated_at = now(), updated_by = $4
       WHERE id = $6 AND (organization_id = $5 OR organization_id IS NULL)`,
      [data.status, data.feedback || "", approvedByName, userId, orgId, proofId]
    );
  }

  static async updateDesignProof(
    proofId: string,
    data: Partial<CreateDesignProofInput & { clientFeedback?: string; status?: string }>,
    userId: string
  ): Promise<DesignProofDto> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const sql = `
      UPDATE erp.design_proofs
      SET
        title = COALESCE($1, title),
        version_no = COALESCE($2, version_no),
        file_url = COALESCE($3, file_url),
        thumbnail_url = COALESCE($4, thumbnail_url),
        background_material = COALESCE($5, background_material),
        letter_material = COALESCE($6, letter_material),
        led_spec = COALESCE($7, led_spec),
        power_spec = COALESCE($8, power_spec),
        status = COALESCE($9, status),
        client_feedback = COALESCE($10, client_feedback),
        updated_by = $11,
        updated_at = now()
      WHERE id = $12 AND (organization_id = $13 OR organization_id IS NULL)
    `;

    await pool.query(sql, [
      data.title !== undefined ? data.title.trim() : null,
      data.versionNo !== undefined ? data.versionNo : null,
      data.fileUrl !== undefined ? data.fileUrl.trim() : null,
      data.thumbnailUrl !== undefined ? data.thumbnailUrl : null,
      data.backgroundMaterial !== undefined ? data.backgroundMaterial : null,
      data.letterMaterial !== undefined ? data.letterMaterial : null,
      data.ledSpec !== undefined ? data.ledSpec : null,
      data.powerSpec !== undefined ? data.powerSpec : null,
      data.status !== undefined ? data.status : null,
      data.clientFeedback !== undefined ? data.clientFeedback : null,
      userId,
      proofId,
      orgId,
    ]);

    const list = await this.listDesignProofs();
    return list.find((p) => p.id === proofId)!;
  }

  static async deleteDesignProof(proofId: string, userId: string): Promise<boolean> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    await pool.query("DELETE FROM erp.design_proofs WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)", [proofId, orgId]);
    return true;
  }

  // ----------------------------------------------------
  // M2.3: KIỂM THỬ XUẤT XƯỞNG & QC ĐÈN LED (FACTORY QC)
  // ----------------------------------------------------
  static async listFactoryQcRecords(filters?: {
    projectId?: string;
    status?: string;
  }): Promise<FactoryQcDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        q.*,
        p.code as project_code,
        p.name as project_name,
        e.name as inspector_name
      FROM erp.factory_qc_records q
      JOIN erp.projects p ON p.id = q.project_id
      LEFT JOIN erp.employees e ON e.id = q.inspector_employee_id
      WHERE q.organization_id = $1
    `;
    const params: any[] = [orgId];

    if (filters?.projectId) {
      params.push(filters.projectId);
      sql += ` AND q.project_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND q.status = $${params.length}`;
    }

    sql += ` ORDER BY q.created_at DESC`;

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      projectId: r.project_id,
      projectCode: r.project_code,
      projectName: r.project_name,
      inspectorEmployeeId: r.inspector_employee_id,
      inspectorName: r.inspector_name,
      qcDate: r.qc_date ? new Date(r.qc_date).toISOString().split("T")[0] : "",
      status: r.status,
      agingTestHours: Number(r.aging_test_hours) || 4.0,
      voltageDropCheck: Boolean(r.voltage_drop_check),
      waterproofCheck: Boolean(r.waterproof_check),
      frameWeldCheck: Boolean(r.frame_weld_check),
      lightUniformityCheck: Boolean(r.light_uniformity_check),
      accessoriesChecklist: Array.isArray(r.accessories_checklist) ? r.accessories_checklist : [],
      photos: Array.isArray(r.photos) ? r.photos : [],
      defectNotes: r.defect_notes || "",
      createdAt: r.created_at.toISOString(),
    }));
  }

  static async createFactoryQcRecord(input: CreateFactoryQcInput, userId: string): Promise<FactoryQcDto> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const code = await getNextDocumentCode(pool, orgId, "factory_qc", "QC");

    const defaultChecklist = [
      { item: "Bu-lông nở sắt neo dầm (M10/M12)", checked: true, note: "Đầy đủ 8 bộ" },
      { item: "Bộ nguồn 12V dự phòng kèm theo", checked: true, note: "1 nguồn 400W sơ cua" },
      { item: "Keo silicon ngoài trời & băng dính điện 3M", checked: true, note: "2 lọ keo A500" },
      { item: "Dây cáp nguồn chịu nhiệt & aptomat chống giật", checked: true, note: "Dây Cadisun 2x2.5" },
    ];

    const sql = `
      INSERT INTO erp.factory_qc_records (
        organization_id, code, project_id, inspector_employee_id, qc_date, status,
        aging_test_hours, voltage_drop_check, waterproof_check, frame_weld_check, light_uniformity_check,
        accessories_checklist, photos, defect_notes, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $15
      ) RETURNING id
    `;

    const res = await pool.query(sql, [
      orgId,
      code,
      input.projectId,
      input.inspectorEmployeeId || null,
      input.qcDate || new Date().toISOString().split("T")[0],
      input.status || "passed",
      input.agingTestHours ?? 4.0,
      input.voltageDropCheck ?? true,
      input.waterproofCheck ?? true,
      input.frameWeldCheck ?? true,
      input.lightUniformityCheck ?? true,
      JSON.stringify(input.accessoriesChecklist || defaultChecklist),
      JSON.stringify(input.photos || []),
      input.defectNotes || "",
      userId,
    ]);

    const list = await this.listFactoryQcRecords({ projectId: input.projectId });
    return list.find((q) => q.id === res.rows[0].id)!;
  }

  // ----------------------------------------------------
  // M2.4: SỔ BẢO HÀNH & TICKET SỰ CỐ (SERVICE TICKETS)
  // ----------------------------------------------------
  static async listServiceTickets(filters?: {
    projectId?: string;
    customerId?: string;
    status?: string;
    priority?: string;
  }): Promise<ServiceTicketDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        st.*,
        p.code as project_code,
        p.name as project_name,
        pt.name as customer_name,
        pt.phone as customer_phone,
        e.name as assigned_employee_name
      FROM erp.service_tickets st
      JOIN erp.projects p ON p.id = st.project_id
      JOIN erp.partners pt ON pt.id = st.customer_id
      LEFT JOIN erp.employees e ON e.id = st.assigned_employee_id
      WHERE st.organization_id = $1
    `;
    const params: any[] = [orgId];

    if (filters?.projectId) {
      params.push(filters.projectId);
      sql += ` AND st.project_id = $${params.length}`;
    }
    if (filters?.customerId) {
      params.push(filters.customerId);
      sql += ` AND st.customer_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND st.status = $${params.length}`;
    }
    if (filters?.priority) {
      params.push(filters.priority);
      sql += ` AND st.priority = $${params.length}`;
    }

    sql += ` ORDER BY st.created_at DESC`;

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      projectId: r.project_id,
      projectCode: r.project_code,
      projectName: r.project_name,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      title: r.title,
      issueType: r.issue_type,
      priority: r.priority,
      status: r.status,
      isWarranty: Boolean(r.is_warranty),
      reportedAt: r.reported_at ? new Date(r.reported_at).toISOString() : "",
      assignedEmployeeId: r.assigned_employee_id,
      assignedEmployeeName: r.assigned_employee_name,
      resolutionNotes: r.resolution_notes || "",
      resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
      costAmount: Number(r.cost_amount) || 0,
      photos: Array.isArray(r.photos) ? r.photos : [],
      createdAt: r.created_at.toISOString(),
    }));
  }

  static async createServiceTicket(input: CreateServiceTicketInput, userId: string): Promise<ServiceTicketDto> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const code = await getNextDocumentCode(pool, orgId, "service_ticket", "SC");

    const sql = `
      INSERT INTO erp.service_tickets (
        organization_id, code, project_id, customer_id, title,
        issue_type, priority, status, is_warranty,
        assigned_employee_id, photos, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, 'received', $8,
        $9, $10, $11, $11
      ) RETURNING id
    `;

    const res = await pool.query(sql, [
      orgId,
      code,
      input.projectId,
      input.customerId,
      input.title.trim(),
      input.issueType || "led_power",
      input.priority || "medium",
      input.isWarranty ?? true,
      input.assignedEmployeeId || null,
      JSON.stringify(input.photos || []),
      userId,
    ]);

    const list = await this.listServiceTickets({ projectId: input.projectId });
    return list.find((t) => t.id === res.rows[0].id)!;
  }

  static async updateServiceTicket(
    ticketId: string,
    data: {
      status?: "received" | "dispatched" | "in_progress" | "resolved" | "cancelled";
      assignedEmployeeId?: string | null;
      resolutionNotes?: string;
      costAmount?: number;
    },
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const resolvedClause = data.status === "resolved" ? ", resolved_at = now()" : "";
    await pool.query(
      `UPDATE erp.service_tickets
       SET status = COALESCE($1::text, status),
           assigned_employee_id = COALESCE($2::uuid, assigned_employee_id),
           resolution_notes = COALESCE($3::text, resolution_notes),
           cost_amount = COALESCE($4::numeric, cost_amount),
           updated_at = now(),
           updated_by = $5
           ${resolvedClause}
       WHERE organization_id = $6 AND id = $7`,
      [data.status ?? null, data.assignedEmployeeId ?? null, data.resolutionNotes ?? null, data.costAmount ?? null, userId, orgId, ticketId]
    );
  }

  static async getProjectWarrantyInfo(projectId: string): Promise<{
    warrantyMonths: number;
    warrantyUntil: string | null;
    maintenanceNotes: string | null;
    isUnderWarranty: boolean;
    ticketsCount: number;
  }> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const projRes = await pool.query(
      `SELECT warranty_months, warranty_until, maintenance_notes 
       FROM erp.projects WHERE organization_id = $1 AND id = $2`,
      [orgId, projectId]
    );
    if (projRes.rows.length === 0) {
      return { warrantyMonths: 12, warrantyUntil: null, maintenanceNotes: null, isUnderWarranty: false, ticketsCount: 0 };
    }

    const r = projRes.rows[0];
    const warrantyMonths = Number(r.warranty_months) || 12;
    const warrantyUntil = r.warranty_until ? new Date(r.warranty_until).toISOString().split("T")[0] : null;
    const isUnderWarranty = warrantyUntil ? new Date(warrantyUntil) >= new Date() : false;

    const ticketRes = await pool.query(
      `SELECT COUNT(*) as count FROM erp.service_tickets WHERE organization_id = $1 AND project_id = $2`,
      [orgId, projectId]
    );

    return {
      warrantyMonths,
      warrantyUntil,
      maintenanceNotes: r.maintenance_notes,
      isUnderWarranty,
      ticketsCount: parseInt(ticketRes.rows[0].count || "0", 10),
    };
  }
}

export const DEFAULT_NIPPON_MATRIX_SURVEYS: Array<Partial<SiteSurveyDto>> = [
  // 1. MINH THANH (HCM - BẢNG HIỆU)
  {
    id: "survey-minh-thanh",
    code: "KS-HCM-01",
    title: "MINH THANH",
    address: "908 Âu Cơ, Phường 14, Quận Tân Bình, HCM",
    surveyDate: "2025-10-01",
    status: "completed",
    widthMeters: 6.0,
    heightMeters: 2.0,
    depthMeters: 0.2,
    floorLevel: "Tầng 1",
    elevationMeters: 3.5,
    structureType: "Khung sắt hộp 25x25",
    powerSource: "220V 1 pha",
    powerDistanceMeters: 8,
    installationMethod: "Giàn giáo 1 tầng",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "HCM",
      workType: "BẢNG HIỆU",
      dealerName: "MINH THANH",
      dealerPhone: "028 3810 2581 - 0988 775 445",
      dealerAddress: "908 Âu Cơ, Phường 14, Quận Tân Bình, HCM",
      signMaterial: "Bảng alu ngoài trời",
      hasMicaLogo65: true,
      hasSideTrim: true,
      hasColorStrip: true,
      subAccessories: "thay mica logo 65 x 65",
      workItems: ["thay mica logo 65 x 65"],
      executionStatus: "đã chốt",
    },
    createdAt: new Date().toISOString(),
  },
  // 2. ĐẠI HỒNG ÂN (HCM - BẢNG HIỆU)
  {
    id: "survey-dai-hong-an",
    code: "KS-HCM-02",
    title: "ĐẠI HỒNG ÂN",
    address: "125-127 Gò Dầu, P. Tân Quý, Q. Tân Phú, HCM",
    surveyDate: "2025-10-02",
    status: "completed",
    widthMeters: 2.9,
    heightMeters: 0.62,
    depthMeters: 0.05,
    floorLevel: "Tầng 1",
    elevationMeters: 3.0,
    structureType: "Khung sắt hộp 20x20",
    powerSource: "220V 1 pha",
    powerDistanceMeters: 5,
    installationMethod: "Thang nhôm",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "HCM",
      workType: "BẢNG HIỆU",
      dealerName: "ĐẠI HỒNG ÂN",
      dealerPhone: "0285 4449 491",
      dealerAddress: "125-127 Gò Dầu, P. Tân Quý, Q. Tân Phú, HCM",
      signMaterial: "Bảng fomex 10li + decal",
      subAccessories: "bảng fomex 10li + decal 0.62m x 2.9m",
      workItems: ["bảng fomex 10li + decal 0.62m x 2.9m"],
      executionStatus: "đã chốt",
    },
    createdAt: new Date().toISOString(),
  },
  // 3. ĐẠT TIẾN (HCM - BẢNG HIỆU)
  {
    id: "survey-dat-tien",
    code: "KS-HCM-03",
    title: "ĐẠT TIẾN",
    address: "44 Cao Lỗ, Phường 4, Quận 8, TP. HCM",
    surveyDate: "2025-10-03",
    status: "completed",
    widthMeters: 4.0,
    heightMeters: 3.7,
    depthMeters: 0.15,
    floorLevel: "Tầng 1",
    elevationMeters: 4.0,
    structureType: "Khung sắt hộp mạ kẽm",
    powerSource: "220V 1 pha",
    powerDistanceMeters: 10,
    installationMethod: "Giàn giáo 2 tầng",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "HCM",
      workType: "BẢNG HIỆU",
      dealerName: "ĐẠT TIẾN",
      dealerPhone: "0912 154 377 - 0989 722734",
      dealerAddress: "44 Cao Lỗ, Phường 4, Quận 8, TP. HCM",
      signMaterial: "Bảng bạt UV",
      workItems: ["bảng bạt UV 3.7m x 4m"],
      executionStatus: "đang chốt",
    },
    createdAt: new Date().toISOString(),
  },
  // 4. NAM LONG PHÁT (HCM - BẢNG HIỆU)
  {
    id: "survey-nam-long-phat-bh",
    code: "KS-HCM-04",
    title: "NAM LONG PHÁT - BẢNG HIỆU",
    address: "16/5 Phan Văn Hớn, Ấp Nam Lân, Bà Điểm, Hóc Môn, TP.HCM",
    surveyDate: "2025-10-04",
    status: "completed",
    widthMeters: 6.0,
    heightMeters: 2.38,
    depthMeters: 0.2,
    floorLevel: "Tầng 1",
    elevationMeters: 3.5,
    structureType: "Dầm bê tông + Khung sắt 30x30",
    powerSource: "220V 1 pha",
    powerDistanceMeters: 12,
    installationMethod: "Giàn giáo 2 tầng",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "HCM",
      workType: "BẢNG HIỆU",
      dealerName: "NAM LONG PHÁT",
      dealerPhone: "0962 464 230 - 0379 417 968",
      dealerAddress: "16/5 Phan Văn Hớn, Ấp Nam Lân, Bà Điểm, Hóc Môn, TP.HCM",
      signMaterial: "Bảng alu ngoài trời & Bạt UV",
      workItems: [
        "bảng alu 2.38m x 6m, 1m x 2.38m",
        "bảng bạt UV 0.9m x 5.9m",
      ],
      executionStatus: "đã chốt",
    },
    createdAt: new Date().toISOString(),
  },
  // 5. NAM LONG PHÁT (HCM - HẠNG MỤC NỘI THẤT)
  {
    id: "survey-nam-long-phat-nt",
    code: "KS-HCM-05",
    title: "NAM LONG PHÁT - NỘI THẤT SHOWROOM",
    address: "16/5 Phan Văn Hớn, Ấp Nam Lân, Bà Điểm, Hóc Môn, TP.HCM",
    surveyDate: "2025-10-04",
    status: "completed",
    widthMeters: 2.78,
    heightMeters: 2.4,
    depthMeters: 0.6,
    floorLevel: "Showroom Tầng 1",
    elevationMeters: 0,
    structureType: "Nội thất trong nhà",
    powerSource: "220V",
    powerDistanceMeters: 5,
    installationMethod: "Thủ công",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "HCM",
      workType: "NỘI THẤT / SHOWROOM",
      dealerName: "NAM LONG PHÁT",
      dealerPhone: "0962 464 230 - 0379 417 968",
      dealerAddress: "16/5 Phan Văn Hớn, Ấp Nam Lân, Bà Điểm, Hóc Môn, TP.HCM",
      signMaterial: "Gỗ MDF chống ẩm & Kệ sắt tĩnh điện",
      displayShelves: "Kệ màu 2.4m x 2.78m, Kệ thông tin sp 1.2m x 2.78m, Kệ hình ảnh sp 0.85m x 2.78m, 1 Kệ sắt 1.2m",
      furniture: "2 bàn lễ tân = 1.5m (đóng riêng) + 1 ghế làm việc, hộp bàn lễ tân 2.4m x 2.78m",
      otherPosm: "HĐ ngôi nhà, dán lại decal kệ sắt cũ dly",
      workItems: [
        "Kệ màu 2.4m x 2.78m",
        "Kệ thông tin sp 2025 = 1.2m x 2.78m",
        "Kệ hình ảnh sp 2025 = 0.85m x 2.78m",
        "2 bàn lễ tân = 1.5m (đóng riêng) + 1 ghế làm việc",
        "hộp bàn lễ tân 2.4m x 2.78m",
        "HĐ ngôi nhà",
        "1 Kệ sắt 1.2m",
        "dán lại decal kệ sắt cũ dly",
      ],
      executionStatus: "đang thi công",
    },
    createdAt: new Date().toISOString(),
  },
  // 6. CHAO VISAL (MIỀN TÂY - BẢNG HIỆU)
  {
    id: "survey-chao-visal",
    code: "KS-MT-01",
    title: "CHAO VISAL",
    address: "Ấp Nôpôk, Xã Nhị Trường, Vĩnh Long",
    surveyDate: "2025-10-05",
    status: "completed",
    widthMeters: 5.0,
    heightMeters: 1.98,
    depthMeters: 0.15,
    floorLevel: "Tầng 1",
    elevationMeters: 3.2,
    structureType: "Khung sắt hộp mạ kẽm",
    powerSource: "220V 1 pha",
    powerDistanceMeters: 10,
    installationMethod: "Giàn giáo",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN TÂY",
      workType: "BẢNG HIỆU",
      dealerName: "CHAO VISAL",
      dealerPhone: "0974 901 674 - 0943 122 731",
      dealerAddress: "Ấp Nôpôk, Xã Nhị Trường, Vĩnh Long",
      signMaterial: "Bảng bạt UV",
      workItems: ["bảng bạt UV 1.98m x 5m"],
      executionStatus: "đã chốt",
    },
    createdAt: new Date().toISOString(),
  },
  // 7. ĐẠI DŨNG (MIỀN ĐÔNG - BẢNG HIỆU)
  {
    id: "survey-dai-dung",
    code: "KS-MD-01",
    title: "ĐẠI DŨNG",
    address: "Số 51/2, Quốc lộ 1A, Khu Phố 6, Phường Hố Nai, TP. Biên Hòa, TP. Đồng Nai",
    surveyDate: "2025-10-06",
    status: "completed",
    widthMeters: 4.85,
    heightMeters: 1.5,
    depthMeters: 0.2,
    floorLevel: "Tầng 1",
    elevationMeters: 3.5,
    structureType: "Khung sắt hộp mạ kẽm",
    powerSource: "220V 1 pha",
    powerDistanceMeters: 10,
    installationMethod: "Giàn giáo",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN ĐÔNG",
      workType: "BẢNG HIỆU",
      dealerName: "ĐẠI DŨNG",
      dealerPhone: "0971 750 975",
      dealerAddress: "Số 51/2, Quốc lộ 1A, Khu Phố 6, Phường Hố Nai, TP. Biên Hòa, TP. Đồng Nai",
      signMaterial: "Bảng alu & Bạt UV",
      displayShelves: "2 kệ sắt 120",
      furniture: "1 bàn lễ tân 150 + ghế",
      otherPosm: "giao 1 thùng 3",
      workItems: [
        "bảng alu 1.5m x 4.85m",
        "bảng bạt UV 0.6m x 4.8m",
        "2 kệ sắt 120",
        "1 bàn lễ tân 150 + ghế",
        "giao 1 thùng 3",
      ],
      executionStatus: "đang chốt",
    },
    createdAt: new Date().toISOString(),
  },
  // 8. NHÀ MÁY NIPPON (MIỀN ĐÔNG - BẢNG HIỆU)
  {
    id: "survey-nha-may-nippon",
    code: "KS-MD-02",
    title: "NHÀ MÁY NIPPON",
    address: "Số 14, Đường 3A, KCN Biên Hòa II, TP Biên Hòa, TP. Đồng Nai",
    surveyDate: "2025-10-06",
    status: "completed",
    widthMeters: 15.6,
    heightMeters: 2.4,
    depthMeters: 0.2,
    floorLevel: "Nhà xưởng KCN",
    elevationMeters: 5.0,
    structureType: "Khung kèo thép nhà xưởng",
    powerSource: "380V / 220V",
    powerDistanceMeters: 20,
    installationMethod: "Xe thang / Giàn giáo cao",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN ĐÔNG",
      workType: "BẢNG HIỆU",
      dealerName: "NHÀ MÁY NIPPON",
      dealerPhone: "",
      dealerAddress: "Số 14, Đường 3A, KCN Biên Hòa II, TP Biên Hòa, TP. Đồng Nai",
      signMaterial: "Bảng bạt UV",
      workItems: ["hàng bạt UV 2.4m x 15.6m (đang chốt)"],
      executionStatus: "đang chốt",
    },
    createdAt: new Date().toISOString(),
  },
  // 9. SINH (MIỀN TRUNG - BẢNG HIỆU)
  {
    id: "survey-sinh",
    code: "KS-MTR-01",
    title: "SINH",
    address: "Số 10B, Cao Thắng, P. Bình Hưng, TP. Phan Thiết, T. Bình Thuận",
    surveyDate: "2025-10-07",
    status: "completed",
    widthMeters: 5.1,
    heightMeters: 0.3,
    depthMeters: 0.1,
    floorLevel: "Tầng 1",
    elevationMeters: 3.0,
    structureType: "Khung sắt sẵn có",
    powerSource: "220V",
    powerDistanceMeters: 5,
    installationMethod: "Thang nhôm",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN TRUNG",
      workType: "BẢNG HIỆU",
      dealerName: "SINH",
      dealerPhone: "0948 877 062",
      dealerAddress: "Số 10B, Cao Thắng, P. Bình Hưng, TP. Phan Thiết, T. Bình Thuận",
      signMaterial: "Bảng alu ngoài trời",
      workItems: [
        "thay dải màu 0.3m x 5.1m",
        "thay dải màu 0.3m x 2.8m (bảo hành)",
      ],
      executionStatus: "bảo hành",
    },
    createdAt: new Date().toISOString(),
  },
  // 10. ANDY (MIỀN TÂY - SỬA CHỮA)
  {
    id: "survey-andy",
    code: "KS-SC-01",
    title: "ANDY - SỬA CHỮA",
    address: "388 Nguyễn Văn Cừ, P. An Khánh, Q. Ninh Kiều, TP. Cần Thơ",
    surveyDate: "2025-10-08",
    status: "completed",
    widthMeters: 4.0,
    heightMeters: 1.5,
    depthMeters: 0.15,
    floorLevel: "Tầng 1",
    elevationMeters: 3.0,
    structureType: "Khung sắt",
    powerSource: "220V",
    powerDistanceMeters: 5,
    installationMethod: "Thang nhôm",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN TÂY",
      workType: "SỬA CHỮA MIỀN TÂY",
      dealerName: "ANDY",
      dealerPhone: "0292 3898 969",
      dealerAddress: "388 Nguyễn Văn Cừ, P. An Khánh, Q. Ninh Kiều, TP. Cần Thơ",
      repairScope: "sửa địa chỉ",
      workItems: ["sửa địa chỉ"],
      executionStatus: "cần làm sớm",
    },
    createdAt: new Date().toISOString(),
  },
  // 11. VÕ THÀNH PHÁT (MIỀN TÂY - SỬA CHỮA)
  {
    id: "survey-vo-thanh-phat",
    code: "KS-SC-02",
    title: "VÕ THÀNH PHÁT - SỬA CHỮA",
    address: "39 Nguyễn Văn Cừ, Phường Cái Khế, Cần Thơ",
    surveyDate: "2025-10-08",
    status: "completed",
    widthMeters: 1.2,
    heightMeters: 2.0,
    depthMeters: 0.4,
    floorLevel: "Showroom Tầng 1",
    elevationMeters: 0,
    structureType: "Kệ gỗ nội thất",
    powerSource: "",
    powerDistanceMeters: 0,
    installationMethod: "Thủ công",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN TÂY",
      workType: "SỬA CHỮA MIỀN TÂY",
      dealerName: "VÕ THÀNH PHÁT",
      dealerPhone: "0292 6271 666",
      dealerAddress: "39 Nguyễn Văn Cừ, Phường Cái Khế, Cần Thơ",
      repairScope: "rớt tay nắm kệ gỗ 1.2m",
      workItems: ["rớt tay nắm kệ gỗ 1.2m"],
      executionStatus: "chờ xử lý",
    },
    createdAt: new Date().toISOString(),
  },
  // 12. TÀI LỢI (MIỀN TÂY - SỬA CHỮA)
  {
    id: "survey-tai-loi",
    code: "KS-SC-03",
    title: "TÀI LỢI - SỬA CHỮA",
    address: "425 Trần Phú, Phường 7, Thành Phố Bạc Liêu, Tỉnh Bạc Liêu",
    surveyDate: "2025-10-09",
    status: "completed",
    widthMeters: 8.0,
    heightMeters: 2.0,
    depthMeters: 0.2,
    floorLevel: "Mặt tiền Tầng 1",
    elevationMeters: 3.5,
    structureType: "Trần alu khung sắt",
    powerSource: "220V",
    powerDistanceMeters: 5,
    installationMethod: "Giàn giáo",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN TÂY",
      workType: "SỬA CHỮA MIỀN TÂY",
      dealerName: "TÀI LỢI",
      dealerPhone: "0291 382 9346 - 0913 990 066",
      dealerAddress: "425 Trần Phú, Phường 7, Thành Phố Bạc Liêu, Tỉnh Bạc Liêu",
      repairScope: "bắn lại trần alu cũ bung (hỗ trợ làm sớm)",
      siteNotes: "hỗ trợ làm sớm",
      workItems: ["bắn lại trần alu cũ bung (hỗ trợ làm sớm)"],
      executionStatus: "gấp - hỗ trợ làm sớm",
    },
    createdAt: new Date().toISOString(),
  },
  // 13. THẾ VINH (MIỀN TÂY - SỬA CHỮA & NỘI THẤT)
  {
    id: "survey-the-vinh",
    code: "KS-SC-04",
    title: "THẾ VINH - HẠNG MỤC NỘI THẤT & MÁI CHE",
    address: "Số F1-63, Đường số 6, KDC 586, Phường Phú Thứ, Quận Cái Răng, TP Cần Thơ",
    surveyDate: "2025-10-09",
    status: "completed",
    widthMeters: 5.3,
    heightMeters: 2.78,
    depthMeters: 0.6,
    floorLevel: "Tầng 1 Showroom & Mặt tiền",
    elevationMeters: 3.0,
    structureType: "Khung sắt mạ kẽm + Nội thất MDF",
    powerSource: "220V",
    powerDistanceMeters: 8,
    installationMethod: "Giàn giáo + lắp ráp",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN TÂY",
      workType: "SỬA CHỮA MIỀN TÂY",
      dealerName: "THẾ VINH",
      dealerPhone: "0947 777 746",
      dealerAddress: "Số F1-63, Đường số 6, KDC 586, Phường Phú Thứ, Quận Cái Răng, TP Cần Thơ",
      displayShelves: "Kệ hình ảnh sp 2025 = 0.85m x 2.78m (đóng riêng), 2 kệ sắt 90, sắp xếp lại kệ cũ",
      furniture: "Bàn Lễ tân 1.75m (đóng riêng) + ghế làm việc, bọc bàn lễ tân 3.07m x 2.5m (có hộc tủ bên dưới), bộ bàn tròn 4 ghế",
      otherPosm: "mái che làm mới 4.7m, 5.3m, 1m",
      deliverySchedule: "TC ngày 12-10",
      siteNotes: "dọn kệ cho dly ko có người",
      workItems: [
        "Kệ hình ảnh sp 2025 = 0.85m x 2.78m (đóng riêng)",
        "Bàn Lễ tân 1.75m (đóng riêng) + ghế làm việc",
        "bọc bàn lễ tân 3.07m x 2.5m (có hộc tủ bên dưới)",
        "2 kệ sắt 90 - bộ bàn tròn 4 ghế",
        "sắp xếp lại kệ cũ",
        "mái che làm mới 4.7m, 5.3m, 1m",
        "TC ngày 12-10 ( dọn kệ cho dly ko có người)",
      ],
      executionStatus: "lịch TC 12-10",
    },
    createdAt: new Date().toISOString(),
  },
  // 14. CÔNG TY ĐẠI CHÂU PHÁT (MIỀN TÂY - KHẢO SÁT)
  {
    id: "survey-dai-chau-phat",
    code: "KS-SURVEY-01",
    title: "CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI DỊCH VỤ ĐẠI CHÂU PHÁT",
    address: "D7, Đường Lê Hồng Phong, Phường An Hòa, Thành phố Rạch Giá, Tỉnh Kiên Giang",
    surveyDate: "2025-10-10",
    status: "completed",
    widthMeters: 6.0,
    heightMeters: 2.0,
    depthMeters: 0.2,
    floorLevel: "Tầng 1",
    elevationMeters: 3.5,
    structureType: "Mặt bằng chuẩn bị làm bảng",
    powerSource: "220V",
    powerDistanceMeters: 10,
    installationMethod: "Khảo sát mặt bằng",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN TÂY",
      workType: "KHẢO SÁT",
      dealerName: "CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI DỊCH VỤ ĐẠI CHÂU PHÁT",
      dealerPhone: "0919915945",
      dealerAddress: "D7, Đường Lê Hồng Phong, Phường An Hòa, Thành phố Rạch Giá, Tỉnh Kiên Giang",
      surveyScope: "ks bảng",
      workItems: ["ks bảng"],
      executionStatus: "đã khảo sát",
    },
    createdAt: new Date().toISOString(),
  },
  // 15. ĐẶNG THIỆU (MIỀN ĐÔNG - KHẢO SÁT)
  {
    id: "survey-dang-thieu",
    code: "KS-SURVEY-02",
    title: "HỘ KINH DOANH CỬA HÀNG SƠN - THẠCH CAO ĐẶNG THIỆU",
    address: "Tổ 15, Ấp 3, Xã Thanh Sơn, Thành Phố Đồng Nai",
    surveyDate: "2025-10-10",
    status: "completed",
    widthMeters: 8.0,
    heightMeters: 2.2,
    depthMeters: 0.2,
    floorLevel: "Tầng 1",
    elevationMeters: 3.5,
    structureType: "Mặt bằng chuẩn bị làm bảng",
    powerSource: "220V",
    powerDistanceMeters: 10,
    installationMethod: "Khảo sát mặt bằng",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN ĐÔNG",
      workType: "KHẢO SÁT",
      dealerName: "HỘ KINH DOANH CỬA HÀNG SƠN - THẠCH CAO ĐẶNG THIỆU",
      dealerPhone: "0367696215",
      dealerAddress: "Tổ 15, Ấp 3, Xã Thanh Sơn, Thành Phố Đồng Nai",
      surveyScope: "ks bảng",
      workItems: ["ks bảng"],
      executionStatus: "đã khảo sát",
    },
    createdAt: new Date().toISOString(),
  },
  // 16. THÀNH VẠN PHÁT (HCM - KHẢO SÁT)
  {
    id: "survey-thanh-van-phat",
    code: "KS-SURVEY-03",
    title: "THÀNH VẠN PHÁT",
    address: "139A3 Đ. Số 9, Phường Linh Xuân, TP. Thủ Đức, TP. Hồ Chí Minh",
    surveyDate: "2025-10-10",
    status: "completed",
    widthMeters: 10.0,
    heightMeters: 2.5,
    depthMeters: 0.2,
    floorLevel: "Tầng 1 Showroom",
    elevationMeters: 4.0,
    structureType: "Mặt bằng Bảng hiệu & Showroom",
    powerSource: "220V",
    powerDistanceMeters: 15,
    installationMethod: "Khảo sát tổng thể",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "HCM",
      workType: "KHẢO SÁT",
      dealerName: "THÀNH VẠN PHÁT",
      dealerPhone: "0989335133",
      dealerAddress: "139A3 Đ. Số 9, Phường Linh Xuân, TP. Thủ Đức, TP. Hồ Chí Minh",
      surveyScope: "ks bảng + SR",
      workItems: ["ks bảng + SR"],
      executionStatus: "đang lên thiết kế",
    },
    createdAt: new Date().toISOString(),
  },
  // 17. ĐẠT LÂM BÌNH DƯƠNG (MIỀN ĐÔNG - THÙNG RỖNG)
  {
    id: "survey-dat-lam",
    code: "KS-TR-01",
    title: "ĐẠT LÂM BÌNH DƯƠNG",
    address: "Số 66 Đường Cách Mạng Tháng Tám, KP. Đông Tư, Phường Lái Thiêu, Bình Dương",
    surveyDate: "2025-10-10",
    status: "completed",
    widthMeters: 1.0,
    heightMeters: 1.0,
    depthMeters: 0.5,
    floorLevel: "Kho / Cửa hàng",
    elevationMeters: 0,
    structureType: "Giao nhận vật phẩm POSM",
    powerSource: "",
    powerDistanceMeters: 0,
    installationMethod: "Xe giao hàng",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN ĐÔNG",
      workType: "THÙNG RỖNG",
      dealerName: "ĐẠT LÂM BÌNH DƯƠNG",
      dealerPhone: "0355 999 018",
      dealerAddress: "Số 66 Đường Cách Mạng Tháng Tám, KP. Đông Tư, Phường Lái Thiêu, Bình Dương",
      deliverySchedule: "giao thùng 3 + thùng 2 mẫu mới",
      workItems: ["giao thùng 3 + thùng 2 mẫu mới"],
      executionStatus: "đã giao hàng",
    },
    createdAt: new Date().toISOString(),
  },
  // 18. MESCO (TÂY NGUYÊN / MIỀN TRUNG - THÙNG RỖNG)
  {
    id: "survey-mesco",
    code: "KS-TR-02",
    title: "MESCO",
    address: "Đường N1, KCN Becamex, Xã Canh Vinh, Tỉnh Gia Lai",
    surveyDate: "2025-10-10",
    status: "completed",
    widthMeters: 1.2,
    heightMeters: 1.2,
    depthMeters: 0.6,
    floorLevel: "KCN Becamex",
    elevationMeters: 0,
    structureType: "Giao nhận POSM",
    powerSource: "",
    powerDistanceMeters: 0,
    installationMethod: "Xe tải giao hàng",
    obstacles: "",
    notes: "",
    photos: [],
    metadata: {
      regionKV: "MIỀN TRUNG",
      workType: "THÙNG RỖNG",
      dealerName: "MESCO",
      dealerPhone: "0935 573 855",
      dealerAddress: "Đường N1, KCN Becamex, Xã Canh Vinh, Tỉnh Gia Lai",
      otherPosm: "HD ngôi nhà",
      deliverySchedule: "giao 2 bộ thùng 3 + thùng 2 mẫu mới",
      workItems: [
        "giao 2 bộ thùng 3 + thùng 2 mẫu mới",
        "HD ngôi nhà",
      ],
      executionStatus: "đã xuất kho",
    },
    createdAt: new Date().toISOString(),
  },
];

