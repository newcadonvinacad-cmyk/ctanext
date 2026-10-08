import { dbPool, getCachedOrgId } from "@/lib/db";

export interface UnifiedDocumentItem {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize?: number;
  fileSizeBytes?: number;
  mimeType: string;
  extension: string;
  category: string;
  sourceModule:
    | "design_proofs"
    | "site_surveys"
    | "purchase_orders"
    | "acceptances"
    | "factory_qc_records"
    | "general_files"
    | "user_upload";
  sourceRefCode?: string;
  sourceRefTitle?: string;
  sourceRefUrl?: string;
  createdAt: string;
  createdByName?: string;
  isSystem: boolean;
  folderId?: string | null;
}

export interface DocumentFolderItem {
  id: string;
  name: string;
  parentId?: string | null;
  color: string;
  icon: string;
  description?: string;
  itemCount: number;
  isSystem: boolean;
  systemCode?: string;
  createdAt?: string;
}

export class DocumentService {
  /**
   * Lấy danh mục tất cả thư mục hệ thống (Auto-categorized) kèm số lượng tệp thực tế
   */
  static async listAllFolders(orgId: string): Promise<{
    systemFolders: DocumentFolderItem[];
    userFolders: DocumentFolderItem[];
  }> {
    // 1. Thống kê số lượng từng nguồn hệ thống
    const [proofsCountRes, surveyCountRes, poCountRes, accCountRes, qcCountRes, filesCountRes] =
      await Promise.all([
        dbPool.query(
          "SELECT COUNT(*) FROM erp.design_proofs WHERE organization_id = $1 AND file_url IS NOT NULL",
          [orgId]
        ),
        dbPool.query(
          `SELECT COUNT(*) FROM (
            SELECT jsonb_array_elements(photos) as photo
            FROM erp.site_surveys
            WHERE organization_id = $1 AND photos IS NOT NULL AND jsonb_array_length(photos) > 0
          ) sub`,
          [orgId]
        ),
        dbPool.query(
          "SELECT COUNT(*) FROM erp.purchase_orders WHERE organization_id = $1 AND invoice_image IS NOT NULL AND invoice_image != ''",
          [orgId]
        ),
        dbPool.query(
          "SELECT COUNT(*) FROM erp.acceptances WHERE organization_id = $1 AND signature_data IS NOT NULL AND signature_data != ''",
          [orgId]
        ),
        dbPool.query(
          `SELECT COUNT(*) FROM (
            SELECT jsonb_array_elements(photos) as photo
            FROM erp.factory_qc_records
            WHERE organization_id = $1 AND photos IS NOT NULL AND jsonb_array_length(photos) > 0
          ) sub`,
          [orgId]
        ),
        dbPool.query(
          "SELECT COUNT(*) FROM erp.files WHERE organization_id = $1",
          [orgId]
        ),
      ]);

    const systemFolders: DocumentFolderItem[] = [
      {
        id: "sys_design_proofs",
        systemCode: "design_proofs",
        name: "Bản vẽ 2D/3D & Maket Nippon",
        color: "#b30024", // Đỏ Nippon
        icon: "palette",
        description: "Các maket thiết kế 2D/3D, bản vẽ kỹ thuật quy chuẩn đã xuất hoặc khách duyệt",
        itemCount: parseInt(proofsCountRes.rows[0]?.count || "0", 10),
        isSystem: true,
      },
      {
        id: "sys_site_surveys",
        systemCode: "site_surveys",
        name: "Ảnh Khảo Sát & Đo Đạc Mặt Bằng",
        color: "#0284c7", // Xanh dương
        icon: "compass",
        description: "Ảnh chụp hiện trạng kết cấu, dầm, nguồn điện, góc chụp đo đạc tại hiện trường",
        itemCount: parseInt(surveyCountRes.rows[0]?.count || "0", 10),
        isSystem: true,
      },
      {
        id: "sys_po_invoices",
        systemCode: "purchase_orders",
        name: "Hóa Đơn & Chứng Từ Mua Hàng",
        color: "#059669", // Xanh lá
        icon: "receipt",
        description: "Ảnh chụp hóa đơn vật tư ngoài công trình, chứng từ thanh toán PO qua AI OCR",
        itemCount: parseInt(poCountRes.rows[0]?.count || "0", 10),
        isSystem: true,
      },
      {
        id: "sys_acceptances",
        systemCode: "acceptances",
        name: "Biên Bản Nghiệm Thu & Chữ Ký",
        color: "#7c3aed", // Tím
        icon: "file-check",
        description: "Chữ ký điện tử của khách hàng và biên bản bàn giao nghiệm thu công trình",
        itemCount: parseInt(accCountRes.rows[0]?.count || "0", 10),
        isSystem: true,
      },
      {
        id: "sys_qc_records",
        systemCode: "factory_qc_records",
        name: "Kiểm Thử Xuất Xưởng & QC Test",
        color: "#d97706", // Cam vàng
        icon: "shield-check",
        description: "Ảnh kiểm thử đèn LED, aging test 4h, kiểm tra mối hàn khung sắt xuất xưởng",
        itemCount: parseInt(qcCountRes.rows[0]?.count || "0", 10),
        isSystem: true,
      },
      {
        id: "sys_general_files",
        systemCode: "general_files",
        name: "Tệp Lưu Trữ Chung (Evidence)",
        color: "#475569", // Xám slate
        icon: "cloud",
        description: "Tài liệu hệ thống và bằng chứng upload qua Supabase Storage",
        itemCount: parseInt(filesCountRes.rows[0]?.count || "0", 10),
        isSystem: true,
      },
    ];

    // 2. Lấy danh sách thư mục người dùng tự tạo
    const userFoldersRes = await dbPool.query(
      `SELECT f.*, 
              (SELECT COUNT(*) FROM erp.documents d WHERE d.folder_id = f.id) as doc_count
       FROM erp.document_folders f
       WHERE f.organization_id = $1
       ORDER BY f.created_at ASC`,
      [orgId]
    );

    const userFolders: DocumentFolderItem[] = userFoldersRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      color: row.color || "#0284c7",
      icon: row.icon || "folder",
      description: row.description || "",
      itemCount: parseInt(row.doc_count || "0", 10),
      isSystem: false,
      createdAt: row.created_at,
    }));

    return { systemFolders, userFolders };
  }

  /**
   * Truy vấn danh sách tệp tin hợp nhất theo Thư mục hoặc Toàn bộ hệ thống
   */
  static async listDocuments({
    orgId,
    folderId = "all",
    search = "",
    fileType = "all",
    sortBy = "date_desc",
  }: {
    orgId: string;
    folderId?: string;
    search?: string;
    fileType?: string;
    sortBy?: string;
  }): Promise<{
    files: UnifiedDocumentItem[];
    subFolders: DocumentFolderItem[];
    currentFolderInfo: {
      id: string;
      name: string;
      isSystem: boolean;
      color?: string;
      icon?: string;
      description?: string;
    };
  }> {
    let files: UnifiedDocumentItem[] = [];
    let subFolders: DocumentFolderItem[] = [];

    // ========================================================
    // CASE A: THƯ MỤC HỆ THỐNG HOẶC TOÀN BỘ (folderId === 'all' | 'sys_*')
    // ========================================================
    const includeProofs = folderId === "all" || folderId === "sys_design_proofs";
    const includeSurveys = folderId === "all" || folderId === "sys_site_surveys";
    const includePOs = folderId === "all" || folderId === "sys_po_invoices";
    const includeAcceptances = folderId === "all" || folderId === "sys_acceptances";
    const includeQC = folderId === "all" || folderId === "sys_qc_records";
    const includeGeneral = folderId === "all" || folderId === "sys_general_files";
    const includeUserDocs = folderId === "all";

    // Chuẩn bị query tệp người dùng tải lên
    let docQuery = `
      SELECT d.*, u.name as uploader_name
      FROM erp.documents d
      LEFT JOIN public."user" u ON d.created_by = u.id
      WHERE d.organization_id = $1
    `;
    const docParams: any[] = [orgId];

    if (folderId && folderId !== "all") {
      docQuery += ` AND d.folder_id = $2`;
      docParams.push(folderId);
    }
    docQuery += ` ORDER BY d.created_at DESC`;

    // TỐI ƯU HÓA: Thực thi song song tất cả các truy vấn nguồn tài liệu thay vì tuần tự (waterfall)
    const [
      proofsRes,
      surveysRes,
      poRes,
      accRes,
      qcRes,
      filesRes,
      userDocsRes,
    ] = await Promise.all([
      includeProofs
        ? dbPool.query(
            `SELECT p.id, p.code, p.title, p.file_url, p.thumbnail_url, p.created_at, p.status,
                    pr.name as project_name, pr.id as project_id
             FROM erp.design_proofs p
             LEFT JOIN erp.projects pr ON p.project_id = pr.id
             WHERE p.organization_id = $1 AND p.file_url IS NOT NULL AND p.file_url != ''
             ORDER BY p.created_at DESC`,
            [orgId]
          )
        : Promise.resolve({ rows: [] }),
      includeSurveys
        ? dbPool.query(
            `SELECT s.id, s.code, s.title, s.photos, s.survey_date, s.created_at, s.address,
                    c.name as customer_name, s.project_id
             FROM erp.site_surveys s
             LEFT JOIN erp.partners c ON s.customer_id = c.id
             WHERE s.organization_id = $1 AND s.photos IS NOT NULL AND jsonb_array_length(s.photos) > 0
             ORDER BY s.created_at DESC`,
            [orgId]
          )
        : Promise.resolve({ rows: [] }),
      includePOs
        ? dbPool.query(
            `SELECT po.id, po.code, po.invoice_image, po.created_at, po.status,
                    s.name as supplier_name
             FROM erp.purchase_orders po
             LEFT JOIN erp.partners s ON po.supplier_id = s.id
             WHERE po.organization_id = $1 AND po.invoice_image IS NOT NULL AND po.invoice_image != ''
             ORDER BY po.created_at DESC`,
            [orgId]
          )
        : Promise.resolve({ rows: [] }),
      includeAcceptances
        ? dbPool.query(
            `SELECT a.id, a.code, a.signature_data, a.surveyor_signature, a.created_at, a.project_id,
                    p.name as project_name
             FROM erp.acceptances a
             LEFT JOIN erp.projects p ON a.project_id = p.id
             WHERE a.organization_id = $1 AND (
               (a.signature_data IS NOT NULL AND a.signature_data != '') OR
               (a.surveyor_signature IS NOT NULL AND a.surveyor_signature != '')
             )
             ORDER BY a.created_at DESC`,
            [orgId]
          )
        : Promise.resolve({ rows: [] }),
      includeQC
        ? dbPool.query(
            `SELECT qc.id, qc.code, qc.photos, qc.qc_date, qc.created_at, qc.project_id,
                    p.name as project_name
             FROM erp.factory_qc_records qc
             LEFT JOIN erp.projects p ON qc.project_id = p.id
             WHERE qc.organization_id = $1 AND qc.photos IS NOT NULL AND jsonb_array_length(qc.photos) > 0
             ORDER BY qc.created_at DESC`,
            [orgId]
          )
        : Promise.resolve({ rows: [] }),
      includeGeneral
        ? dbPool.query(
            `SELECT f.id, f.object_key, f.mime_type, f.size_bytes, f.created_at, f.bucket,
                    u.name as uploader_name
             FROM erp.files f
             LEFT JOIN public."user" u ON f.uploaded_by = u.id
             WHERE f.organization_id = $1
             ORDER BY f.created_at DESC`,
            [orgId]
          )
        : Promise.resolve({ rows: [] }),
      includeUserDocs || (folderId && !folderId.startsWith("sys_"))
        ? dbPool.query(docQuery, docParams)
        : Promise.resolve({ rows: [] }),
    ]);

    // 1. Quét Bản vẽ & Maket (Design Proofs)
    if (includeProofs) {
      for (const row of proofsRes.rows) {
        const ext = getExtensionFromUrl(row.file_url) || "png";
        files.push({
          id: `proof_${row.id}`,
          name: `${row.title || "Maket Thiết kế"} (${row.code}).${ext}`,
          fileUrl: row.file_url,
          thumbnailUrl: row.thumbnail_url || row.file_url,
          fileSize: 450 * 1024, // Ước lượng ~450KB
          mimeType: getMimeTypeByExt(ext),
          extension: ext,
          category: "Bản vẽ 2D/3D & Maket",
          sourceModule: "design_proofs",
          sourceRefCode: row.code,
          sourceRefTitle: row.title,
          sourceRefUrl: row.project_id ? `/du-an/${row.project_id}` : "/du-an/thiet-ke-quy-chuan",
          createdAt: row.created_at,
          createdByName: "Bộ phận Thiết kế 360",
          isSystem: true,
          folderId: "sys_design_proofs",
        });
      }
    }

    // 2. Quét Ảnh khảo sát hiện trường (Site Surveys)
    if (includeSurveys) {
      for (const row of surveysRes.rows) {
        const photos = Array.isArray(row.photos) ? row.photos : [];
        photos.forEach((photo: any, index: number) => {
          const url = typeof photo === "string" ? photo : photo.url;
          if (!url) return;
          const caption = typeof photo === "object" ? photo.caption || photo.stage : `Ảnh ${index + 1}`;
          const ext = getExtensionFromUrl(url) || "jpg";

          files.push({
            id: `survey_${row.id}_${index}`,
            name: `[${row.code}] ${caption || row.title}.${ext}`,
            fileUrl: url,
            thumbnailUrl: url,
            fileSize: 680 * 1024,
            mimeType: getMimeTypeByExt(ext),
            extension: ext,
            category: "Ảnh Khảo sát Mặt bằng",
            sourceModule: "site_surveys",
            sourceRefCode: row.code,
            sourceRefTitle: row.title,
            sourceRefUrl: "/khao-sat",
            createdAt: row.survey_date || row.created_at,
            createdByName: "Kỹ thuật Khảo sát",
            isSystem: true,
            folderId: "sys_site_surveys",
          });
        });
      }
    }

    // 3. Quét Hóa đơn & Chứng từ PO (Purchase Orders)
    if (includePOs) {
      for (const row of poRes.rows) {
        const ext = getExtensionFromUrl(row.invoice_image) || "jpg";
        files.push({
          id: `po_${row.id}`,
          name: `Hóa đơn PO ${row.code} - ${row.supplier_name || "Vật tư"}.${ext}`,
          fileUrl: row.invoice_image,
          thumbnailUrl: row.invoice_image,
          fileSize: 520 * 1024,
          mimeType: getMimeTypeByExt(ext),
          extension: ext,
          category: "Hóa đơn & Mua hàng (PO)",
          sourceModule: "purchase_orders",
          sourceRefCode: row.code,
          sourceRefTitle: `Đơn mua ${row.code} (${row.supplier_name || ""})`,
          sourceRefUrl: "/mua-hang",
          createdAt: row.created_at,
          createdByName: "Thủ kho / Kế toán",
          isSystem: true,
          folderId: "sys_po_invoices",
        });
      }
    }

    // 4. Quét Biên bản nghiệm thu & Chữ ký khách hàng (Acceptances)
    if (includeAcceptances) {
      for (const row of accRes.rows) {
        const sigUrl = row.signature_data || row.surveyor_signature;
        if (!sigUrl) continue;
        files.push({
          id: `acc_${row.id}`,
          name: `Chữ ký số Nghiệm thu ${row.code} (${row.project_name || "Dự án"}).png`,
          fileUrl: sigUrl,
          thumbnailUrl: sigUrl,
          fileSize: 120 * 1024,
          mimeType: "image/png",
          extension: "png",
          category: "Nghiệm thu & Chữ ký",
          sourceModule: "acceptances",
          sourceRefCode: row.code,
          sourceRefTitle: `Biên bản nghiệm thu ${row.code}`,
          sourceRefUrl: row.project_id ? `/du-an/${row.project_id}` : "/du-an",
          createdAt: row.created_at,
          createdByName: "Khách hàng & Giám sát",
          isSystem: true,
          folderId: "sys_acceptances",
        });
      }
    }

    // 5. Quét Kiểm thử QC xuất xưởng (Factory QC Records)
    if (includeQC) {
      for (const row of qcRes.rows) {
        const photos = Array.isArray(row.photos) ? row.photos : [];
        photos.forEach((photo: any, index: number) => {
          const url = typeof photo === "string" ? photo : photo.url;
          if (!url) return;
          const ext = getExtensionFromUrl(url) || "jpg";
          files.push({
            id: `qc_${row.id}_${index}`,
            name: `Ảnh Test QC ${row.code} (${index + 1}).${ext}`,
            fileUrl: url,
            thumbnailUrl: url,
            fileSize: 750 * 1024,
            mimeType: getMimeTypeByExt(ext),
            extension: ext,
            category: "Kiểm thử QC Xuất xưởng",
            sourceModule: "factory_qc_records",
            sourceRefCode: row.code,
            sourceRefTitle: `Biên bản QC ${row.code}`,
            sourceRefUrl: row.project_id ? `/du-an/${row.project_id}` : "/du-an",
            createdAt: row.qc_date || row.created_at,
            createdByName: "KCS / QC Xưởng",
            isSystem: true,
            folderId: "sys_qc_records",
          });
        });
      }
    }

    // 6. Quét Tệp Lưu trữ Chung (Storage Files)
    if (includeGeneral) {
      for (const row of filesRes.rows) {
        const fileName = row.object_key.split("/").pop() || "evidence_file";
        const ext = fileName.split(".").pop() || "jpg";
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${row.bucket}/${row.object_key}`;

        files.push({
          id: `file_${row.id}`,
          name: fileName,
          fileUrl: publicUrl,
          thumbnailUrl: row.mime_type.startsWith("image/") ? publicUrl : undefined,
          fileSize: parseInt(row.size_bytes || "0", 10),
          mimeType: row.mime_type,
          extension: ext,
          category: "Tệp Lưu Trữ Chung",
          sourceModule: "general_files",
          sourceRefCode: "STORAGE",
          sourceRefTitle: fileName,
          createdAt: row.created_at,
          createdByName: row.uploader_name || "Hệ thống",
          isSystem: true,
          folderId: "sys_general_files",
        });
      }
    }

    // 7. Quét Tệp do Người dùng tự tải lên (Custom Documents)
    if (includeUserDocs || (folderId && !folderId.startsWith("sys_"))) {

      for (const row of userDocsRes.rows) {
        files.push({
          id: row.id,
          name: row.name,
          fileUrl: row.file_url,
          thumbnailUrl: row.mime_type?.startsWith("image/") ? row.file_url : undefined,
          fileSize: parseInt(row.file_size || "0", 10),
          mimeType: row.mime_type || "application/octet-stream",
          extension: row.extension || (row.name.split(".").pop() || ""),
          category: "Tài liệu Người dùng",
          sourceModule: "user_upload",
          sourceRefCode: row.source_ref_code,
          sourceRefTitle: row.name,
          createdAt: row.created_at,
          createdByName: row.uploader_name || row.created_by_name || "Người dùng",
          isSystem: false,
          folderId: row.folder_id,
        });
      }
    }

    // ========================================================
    // LẤY SUBFOLDERS NẾU ĐANG Ở CUSTOM FOLDER HOẶC ROOT
    // ========================================================
    if (folderId === "all" || !folderId.startsWith("sys_")) {
      const parentFilter = folderId === "all" ? "parent_id IS NULL" : "parent_id = $2";
      const params = folderId === "all" ? [orgId] : [orgId, folderId];

      const subFoldersRes = await dbPool.query(
        `SELECT f.*, (SELECT COUNT(*) FROM erp.documents d WHERE d.folder_id = f.id) as doc_count
         FROM erp.document_folders f
         WHERE f.organization_id = $1 AND ${parentFilter}
         ORDER BY f.created_at ASC`,
        params
      );

      subFolders = subFoldersRes.rows.map((row) => ({
        id: row.id,
        name: row.name,
        parentId: row.parent_id,
        color: row.color || "#0284c7",
        icon: row.icon || "folder",
        description: row.description || "",
        itemCount: parseInt(row.doc_count || "0", 10),
        isSystem: false,
        createdAt: row.created_at,
      }));
    }

    // ========================================================
    // BỘ LỌC TÌM KIẾM & PHÂN LOẠI FILE
    // ========================================================
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      files = files.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.sourceRefCode?.toLowerCase().includes(q) ||
          f.sourceRefTitle?.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.extension.toLowerCase().includes(q)
      );
    }

    if (fileType && fileType !== "all") {
      files = files.filter((f) => {
        const ext = f.extension.toLowerCase();
        if (fileType === "image") {
          return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) || f.mimeType.startsWith("image/");
        }
        if (fileType === "pdf") {
          return ext === "pdf" || f.mimeType.includes("pdf");
        }
        if (fileType === "cad") {
          return ["svg", "dwg", "dxf", "ai", "eps", "cdr"].includes(ext);
        }
        if (fileType === "spreadsheet") {
          return ["xlsx", "xls", "csv"].includes(ext);
        }
        return true;
      });
    }

    // ========================================================
    // SẮP XẾP FILE
    // ========================================================
    files.sort((a, b) => {
      if (sortBy === "date_asc") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "size_desc") {
        return (b.fileSize || 0) - (a.fileSize || 0);
      }
      // date_desc (mặc định)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // ========================================================
    // THÔNG TIN THƯ MỤC HIỆN TẠI (CURRENT FOLDER INFO)
    // ========================================================
    let currentFolderInfo = {
      id: folderId,
      name: "Tất cả Tài liệu & Tệp tin",
      isSystem: true,
      color: "#0f172a",
      icon: "hard-drive",
      description: "Kho lưu trữ hợp nhất toàn bộ dữ liệu tệp tin trong hệ thống ERP",
    };

    if (folderId === "sys_design_proofs") {
      currentFolderInfo = {
        id: folderId,
        name: "Bản vẽ 2D/3D & Maket Nippon",
        isSystem: true,
        color: "#b30024",
        icon: "palette",
        description: "Các maket thiết kế 2D/3D và bản vẽ kỹ thuật quy chuẩn xưởng in",
      };
    } else if (folderId === "sys_site_surveys") {
      currentFolderInfo = {
        id: folderId,
        name: "Ảnh Khảo Sát & Đo Đạc Mặt Bằng",
        isSystem: true,
        color: "#0284c7",
        icon: "compass",
        description: "Ảnh chụp đo đạc dầm, kết cấu và hiện trạng thực tế công trình",
      };
    } else if (folderId === "sys_po_invoices") {
      currentFolderInfo = {
        id: folderId,
        name: "Hóa Đơn & Chứng Từ Mua Hàng",
        isSystem: true,
        color: "#059669",
        icon: "receipt",
        description: "Ảnh chụp hóa đơn vật tư mua ngoài, phiếu thanh toán PO qua AI OCR",
      };
    } else if (folderId === "sys_acceptances") {
      currentFolderInfo = {
        id: folderId,
        name: "Biên Bản Nghiệm Thu & Chữ Ký",
        isSystem: true,
        color: "#7c3aed",
        icon: "file-check",
        description: "Chữ ký số khách hàng và biên bản nghiệm thu bàn giao",
      };
    } else if (folderId === "sys_qc_records") {
      currentFolderInfo = {
        id: folderId,
        name: "Kiểm Thử Xuất Xưởng & QC Test",
        isSystem: true,
        color: "#d97706",
        icon: "shield-check",
        description: "Ảnh kiểm tra đèn LED, aging test và kiểm thử chất lượng trước xuất xưởng",
      };
    } else if (folderId === "sys_general_files") {
      currentFolderInfo = {
        id: folderId,
        name: "Tệp Lưu Trữ Chung (Evidence)",
        isSystem: true,
        color: "#475569",
        icon: "cloud",
        description: "Tài liệu hệ thống và bằng chứng upload qua Storage Service",
      };
    } else if (folderId && folderId !== "all") {
      const fRes = await dbPool.query(
        "SELECT * FROM erp.document_folders WHERE id = $1 AND organization_id = $2",
        [folderId, orgId]
      );
      if (fRes.rows.length > 0) {
        const row = fRes.rows[0];
        currentFolderInfo = {
          id: row.id,
          name: row.name,
          isSystem: false,
          color: row.color || "#0284c7",
          icon: row.icon || "folder",
          description: row.description || "Thư mục tùy chỉnh nội bộ",
        };
      }
    }

    return {
      files,
      subFolders,
      currentFolderInfo,
    };
  }

  /**
   * Tạo thư mục mới do người dùng chỉ định
   */
  static async createFolder({
    orgId,
    name,
    parentId = null,
    color = "#0284c7",
    icon = "folder",
    description = "",
    userId,
  }: {
    orgId: string;
    name: string;
    parentId?: string | null;
    color?: string;
    icon?: string;
    description?: string;
    userId?: string;
  }) {
    const res = await dbPool.query(
      `INSERT INTO erp.document_folders 
        (organization_id, name, parent_id, color, icon, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [orgId, name.trim(), parentId || null, color, icon, description.trim(), userId || null]
    );
    return res.rows[0];
  }

  /**
   * Đổi tên hoặc chỉnh sửa thư mục
   */
  static async updateFolder({
    orgId,
    folderId,
    name,
    color,
    icon,
    description,
  }: {
    orgId: string;
    folderId: string;
    name?: string;
    color?: string;
    icon?: string;
    description?: string;
  }) {
    const res = await dbPool.query(
      `UPDATE erp.document_folders
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           icon = COALESCE($3, icon),
           description = COALESCE($4, description),
           updated_at = NOW()
       WHERE id = $5 AND organization_id = $6
       RETURNING *`,
      [name, color, icon, description, folderId, orgId]
    );
    return res.rows[0];
  }

  /**
   * Xóa thư mục tự tạo (kèm toàn bộ documents con)
   */
  static async deleteFolder({ orgId, folderId }: { orgId: string; folderId: string }) {
    await dbPool.query(
      "DELETE FROM erp.document_folders WHERE id = $1 AND organization_id = $2",
      [folderId, orgId]
    );
    return { success: true };
  }

  /**
   * Lưu metadata tệp tải lên vào thư mục
   */
  static async createDocument({
    orgId,
    folderId,
    name,
    fileUrl,
    fileSize = 0,
    mimeType = "application/octet-stream",
    extension = "",
    sourceRefCode,
    metadata = {},
    userId,
    userName,
  }: {
    orgId: string;
    folderId?: string | null;
    name: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    extension?: string;
    sourceRefCode?: string;
    metadata?: any;
    userId?: string;
    userName?: string;
  }) {
    const ext = extension || name.split(".").pop() || "";
    const res = await dbPool.query(
      `INSERT INTO erp.documents
        (organization_id, folder_id, name, file_url, file_size, mime_type, extension,
         source_module, source_ref_code, metadata, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'user_upload', $8, $9, $10, $11)
       RETURNING *`,
      [
        orgId,
        folderId || null,
        name.trim(),
        fileUrl,
        fileSize,
        mimeType,
        ext,
        sourceRefCode || null,
        metadata,
        userId || null,
        userName || null,
      ]
    );
    return res.rows[0];
  }

  /**
   * Xóa tệp tải lên
   */
  static async deleteDocument({ orgId, documentId }: { orgId: string; documentId: string }) {
    await dbPool.query(
      "DELETE FROM erp.documents WHERE id = $1 AND organization_id = $2",
      [documentId, orgId]
    );
    return { success: true };
  }
}

// ========================================================
// HELPER FUNCTIONS
// ========================================================
function getExtensionFromUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("data:image/svg")) return "svg";
  if (url.startsWith("data:image/png")) return "png";
  if (url.startsWith("data:image/jpeg")) return "jpg";
  if (url.startsWith("data:application/pdf")) return "pdf";

  try {
    const path = url.split("?")[0];
    const parts = path.split(".");
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
  } catch (e) {
    // fallback
  }
  return "";
}

function getMimeTypeByExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "xls":
      return "application/vnd.ms-excel";
    default:
      return "application/octet-stream";
  }
}
