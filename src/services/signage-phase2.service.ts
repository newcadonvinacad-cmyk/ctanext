import { getDbPool, getCachedOrgId } from "@/lib/db";
import { getNextDocumentCode } from "@/lib/sequences";

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
      createdAt: r.created_at.toISOString(),
    }));
  }

  static async getSiteSurveyById(id: string): Promise<SiteSurveyDto | null> {
    const list = await this.listSiteSurveys();
    return list.find((s) => s.id === id) || null;
  }

  static async createSiteSurvey(input: CreateSiteSurveyInput, userId: string): Promise<SiteSurveyDto> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const code = await getNextDocumentCode(pool, orgId, "site_survey", "KS");

    const sql = `
      INSERT INTO erp.site_surveys (
        organization_id, code, customer_id, project_id, quotation_id,
        title, address, survey_date, surveyor_employee_id, status,
        width_meters, height_meters, depth_meters, floor_level, elevation_meters,
        structure_type, power_source, power_distance_meters, installation_method,
        obstacles, notes, photos, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, 'completed',
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, $22
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
      userId,
    ]);

    const created = await this.getSiteSurveyById(res.rows[0].id);
    return created!;
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

    if (!survey.customerId) {
      throw new Error("Phiếu khảo sát phải gắn với một Khách hàng trước khi lập báo giá!");
    }

    const area = Math.round((survey.widthMeters * survey.heightMeters) * 100) / 100;
    const estUnitPrice = 1850000; // Đơn giá dự toán tham chiếu chuẩn: 1.850.000 đ/m2 (Alu + Chữ nổi mica đèn LED)
    const lineTotal = Math.round(area > 0 ? area * estUnitPrice : 5000000);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const quoteCode = await getNextDocumentCode(client, orgId, "quotation", "BG");

      // 1. Lấy owner membership
      const memRes = await client.query("SELECT id FROM erp.memberships WHERE organization_id = $1 LIMIT 1", [orgId]);
      const ownerMembershipId = memRes.rows[0].id;

      // 2. Tạo quotation
      const qRes = await client.query(
        `INSERT INTO erp.quotations(
           organization_id, code, status, customer_id, owner_membership_id, created_by, updated_by
         ) VALUES ($1, $2, 'draft', $3, $4, $5, $5) RETURNING id`,
        [orgId, quoteCode, survey.customerId, ownerMembershipId, userId]
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
            installationNotes: `Lắp đặt tại ${survey.address}. Phương án: ${survey.installationMethod}, tầng: ${survey.floorLevel}.`,
          }),
          userId,
        ]
      );
      const revId = revRes.rows[0].id;

      // 4. Tạo dòng quotation_lines
      const itemRes = await client.query("SELECT id, base_unit_id FROM erp.items WHERE organization_id = $1 LIMIT 1", [orgId]);
      const itemId = itemRes.rows[0]?.id;
      const unitId = itemRes.rows[0]?.base_unit_id;

      await client.query(
        `INSERT INTO erp.quotation_lines (
           organization_id, revision_id, line_no, description, qty, unit_price,
           discount_amount, tax_rate, line_total, item_id, unit_id, created_by, updated_by
         ) VALUES ($1, $2, 1, $3, $4, $5, 0, 0.1, $6, $7, $8, $9, $9)`,
        [
          orgId,
          revId,
          `Gia công & Lắp dựng biển hiệu mặt tiền ${survey.title} (KT: ${survey.widthMeters}m x ${survey.heightMeters}m)`,
          area > 0 ? area : 1,
          estUnitPrice,
          lineTotal,
          itemId,
          unitId,
          userId,
        ]
      );

      // 5. Cập nhật survey
      await client.query(
        `UPDATE erp.site_surveys 
         SET quotation_id = $1, status = 'converted', updated_at = now(), updated_by = $2 
         WHERE id = $3`,
        [quotationId, userId, surveyId]
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

    const sql = `
      INSERT INTO erp.design_proofs (
        organization_id, code, project_id, quotation_id, title,
        version_no, file_url, thumbnail_url,
        background_material, letter_material, led_spec, power_spec,
        status, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        'pending', $13, $13
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

    const approvedAt = data.status === "approved" ? "now()" : "NULL";
    await pool.query(
      `UPDATE erp.design_proofs
       SET status = $1, client_feedback = $2, approved_by_name = $3,
           approved_at = ${approvedAt}, updated_at = now(), updated_by = $4
       WHERE organization_id = $5 AND id = $6`,
      [data.status, data.feedback || "", data.approvedByName || null, userId, orgId, proofId]
    );
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
       SET status = COALESCE($1, status),
           assigned_employee_id = COALESCE($2, assigned_employee_id),
           resolution_notes = COALESCE($3, resolution_notes),
           cost_amount = COALESCE($4, cost_amount),
           updated_at = now(),
           updated_by = $5
           ${resolvedClause}
       WHERE organization_id = $6 AND id = $7`,
      [data.status, data.assignedEmployeeId, data.resolutionNotes, data.costAmount, userId, orgId, ticketId]
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
