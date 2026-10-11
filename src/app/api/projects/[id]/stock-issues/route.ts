import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { SignagePhase3Service } from "@/services/signage-phase3.service";
import { AuthorizationService } from "@/services/authorization.service";
import { getDbPool, getCachedOrgId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const orgId = await getCachedOrgId();
    const pool = getDbPool();

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const canCreateStock = capabilities["stock_document.create"]?.isEnabled;
    const canUpdateProject = capabilities["project.update"]?.isEnabled;
    const canReadProject = capabilities["project.read"]?.isEnabled;

    if (!canCreateStock && !canUpdateProject && !canReadProject) {
      return NextResponse.json({ error: "Không có quyền tạo phiếu xuất kho cho dự án" }, { status: 403 });
    }

    const body = await req.json();
    const { warehouseId, surveyId, purpose, items, saveBom, bomPayload } = body;

    if (!warehouseId) {
      return NextResponse.json({ error: "Vui lòng chọn Kho xuất vật tư!" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Danh sách vật tư xuất kho không được để trống!" }, { status: 400 });
    }

    // 1. Lấy toàn bộ items và material_representatives của tổ chức để map chính xác
    const dbItemsRes = await pool.query(
      `SELECT i.id, i.code, i.name, i.base_unit_id, u.code as unit_code, u.name as unit_name
       FROM erp.items i
       LEFT JOIN erp.units u ON u.id = i.base_unit_id
       WHERE i.organization_id = $1 AND i.is_active = true`,
      [orgId]
    );
    const dbItems = dbItemsRes.rows;

    const repsRes = await pool.query(
      `SELECT mr.id, mr.code, mr.name, mr.default_item_id, mr.default_unit_id
       FROM erp.material_representatives mr
       WHERE mr.organization_id = $1`,
      [orgId]
    );
    const reps = repsRes.rows;

    // Alias mapping cho các mã quy cách chuẩn trong Signage BOM
    const CODE_ALIASES: Record<string, string> = {
      "SAT-HOP-20": "SH-2020",
      "SAT-HOP-25": "SH-2525",
      "SAT-HOP-30": "SH-3030",
      "SAT-CHONG-25": "SH-2525",
      "ALU-ALCO-3MM": "ALU-ALCO-3MM",
      "ALU-ALCO-006": "ALU-ALCO-3MM",
      "ALU-TRIEU-CHEN": "ALU-TRIEU-3MM",
      "LED-NC-12W": "LED-MOD-3B",
      "LED-GOQ-072W": "LED-MOD-3B",
      "NGUON-MEANWELL-400W": "NGUON-MEANWELL-400W",
      "NGUON-MEANWELL-350W": "NGUON-MEANWELL-400W",
      "NGUON-TO-ONG-33A": "NGUON-12V-33A",
      "KEO-TITEBOND": "KEO-TITEBOND",
      "KEO-SILICONE-A500": "KEO-APOLLO-A500",
      "KEO-APOLLO-A500": "KEO-APOLLO-A500",
      "BAT-3M-UV": "BAT-3M-UV",
      "BAT-HIFLEX-UV": "BAT-HIFLEX-36",
      "MICA-DAILOAN-2MM": "MICA-DAILOAN-2MM",
      "MICA-DAILOAN-3MM": "MICA-DAILOAN-3MM",
    };

    const resolvedLines = [];
    for (const it of items) {
      const qty = Number(it.quantity) || 0;
      if (qty <= 0) continue;

      const rawCode = String(it.itemCode || "").trim();
      const rawName = String(it.itemName || "").trim().toLowerCase();
      const targetAlias = CODE_ALIASES[rawCode] || rawCode;

      // 1a. Khớp theo mã SKU trực tiếp hoặc alias
      let matched = dbItems.find(
        (i) => i.code.toLowerCase() === targetAlias.toLowerCase() || i.code.toLowerCase() === rawCode.toLowerCase()
      );

      // 1b. Khớp theo tên vật tư nếu chưa khớp mã
      if (!matched && rawName) {
        matched = dbItems.find(
          (i) => i.name.toLowerCase() === rawName || i.name.toLowerCase().includes(rawName)
        );
      }

      // 1c. Khớp theo đại diện quy cách (material_representatives)
      if (!matched) {
        const cat = String(it.category || "");
        let repKey = "accessories";
        if (cat === "Khung sắt") repKey = "frame";
        else if (cat === "Mặt dựng") repKey = "face";
        else if (cat === "Hệ thống LED") repKey = "lighting";
        else if (cat === "Nguồn điện") repKey = "power";
        else if (cat === "Logo & Nhận diện") repKey = "letters";

        const rep = reps.find((r) => r.code === repKey);
        if (rep?.default_item_id) {
          matched = dbItems.find((i) => i.id === rep.default_item_id);
        }
      }

      if (matched) {
        resolvedLines.push({
          itemId: matched.id,
          unitId: matched.base_unit_id,
          qty,
          unitCostSnapshot: Number(it.unitPrice) || 0,
        });
      }
    }

    if (resolvedLines.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy vật tư kho hợp lệ để xuất!" }, { status: 400 });
    }

    // 2. Tạo Phiếu Xuất Kho NVL (status: submitted - Chờ thủ kho duyệt xuất kho)
    const docId = await InventoryService.createDocument(
      {
        type: "issue",
        purpose: purpose?.trim() || `Xuất NVL sản xuất công trình (Dự án ${projectId})`,
        sourceWarehouseId: warehouseId,
        projectId,
        submitNow: true,
        lines: resolvedLines,
      },
      session.user.id
    );

    const docRowRes = await pool.query("SELECT code FROM erp.stock_documents WHERE id = $1 LIMIT 1", [docId]);
    const documentCode = docRowRes.rows[0]?.code || "PXK";

    // 3. Nếu yêu cầu lưu BOM kỹ thuật liên kết
    let bomId = null;
    let bomCode = null;
    if (saveBom && bomPayload) {
      try {
        const bom = await SignagePhase3Service.createProjectBom(
          {
            ...bomPayload,
            projectId,
            surveyId: surveyId || undefined,
            itemsJson: items,
          },
          session.user.id
        );
        bomId = bom.id;
        bomCode = bom.code;
      } catch (bomErr) {
        console.warn("Lưu BOM tự động song song phiếu kho cảnh báo:", bomErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        documentId: docId,
        documentCode,
        bomId,
        bomCode,
        linesCount: resolvedLines.length,
        message: `Đã lập thành công Phiếu xuất kho NVL ${documentCode} (${resolvedLines.length} mặt hàng)!`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Lỗi tạo phiếu xuất kho NVL cho dự án:", err);
    return NextResponse.json({ error: err.message || "Lỗi tạo phiếu xuất kho" }, { status: 500 });
  }
}
