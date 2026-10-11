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

    if (!canCreateStock && !canUpdateProject) {
      return NextResponse.json(
        { error: "Không có quyền tạo phiếu xuất kho cho dự án (Yêu cầu quyền stock_document.create hoặc project.update)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { warehouseId, surveyId, purpose, items, saveBom, bomPayload } = body;

    if (!warehouseId) {
      return NextResponse.json({ error: "Vui lòng chọn Kho xuất vật tư!" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Danh sách vật tư xuất kho không được để trống!" }, { status: 400 });
    }

    // 1. Lưu BOM trước nếu được yêu cầu để lấy bomId gắn vào phiếu xuất kho
    let bomId: string | null = body.bomId || null;
    let bomCode: string | null = null;
    if (saveBom && bomPayload) {
      try {
        const bom = await SignagePhase3Service.createProjectBom(
          {
            ...bomPayload,
            projectId,
            surveyId: surveyId || undefined,
            itemsJson: items,
            customItems: items,
          },
          session.user.id
        );
        bomId = bom.id;
        bomCode = bom.code;
      } catch (bomErr: any) {
        console.error("Lỗi lưu BOM kỹ thuật trước khi tạo phiếu kho:", bomErr);
        return NextResponse.json(
          { error: `Lỗi lưu bảng BOM: ${bomErr.message || "Không thể lưu BOM"}` },
          { status: 500 }
        );
      }
    }

    // 2. Lấy toàn bộ items hiện có của tổ chức
    const dbItemsRes = await pool.query(
      `SELECT i.id, i.code, i.name, i.base_unit_id, u.code as unit_code, u.name as unit_name
       FROM erp.items i
       LEFT JOIN erp.units u ON u.id = i.base_unit_id
       WHERE i.organization_id = $1 AND i.is_active = true`,
      [orgId]
    );
    const dbItems = dbItemsRes.rows;

    // Alias mapping chuẩn cho các mã SKU tương đương hợp lệ
    const CODE_ALIASES: Record<string, string> = {
      "SAT-HOP-20": "SH-2020",
      "SAT-HOP-25": "SH-2525",
      "SAT-HOP-30": "SH-3030",
      "SAT-CHONG-25": "SH-2525",
      "ALU-TRIEU-CHEN": "ALU-TRIEU-3MM",
      "LED-NC-12W": "LED-MOD-3B",
      "NGUON-TO-ONG-33A": "NGUON-12V-33A",
      "KEO-TITEBOND": "KEO-TITEBOND",
      "KEO-ALU-TITEBOND": "KEO-TITEBOND",
      "KEO-SILICONE-A500": "KEO-APOLLO-A500",
      "KEO-SILICONE-APOLLO": "KEO-APOLLO-A500",
      "KEO-APOLLO-A500": "KEO-APOLLO-A500",
      "KEO-502-NHO": "KEO-502",
      "KEO-DINH-VI": "BANG-KEO-XOP",
      "BAT-3M-UV": "BAT-3M-UV",
      "BAT-HIFLEX-UV": "BAT-HIFLEX-36",
      "TOLE-VIEN-1M": "TOLE-VIEN",
      "NEP-VINOX": "NEP-VINOX",
      "DAI-MAU-THUONG-HIEU": "DECAL-DAI-MAU",
      "MICA-TEXT": "MICA-TEXT",
      "CHAN-KE-SAT": "CHAN-KE",
      "MAM-KE-SAT": "MAM-KE",
      "PHU-KIEN-KE": "PHU-KIEN-KE",
      "FOMEX-DECAL": "FOMEX-10MM-DECAL",
      "BAT-MAI-CHE": "BAT-MAI-CHE",
      "PHU-KIEN-MAI-CHE": "PHU-KIEN-MAI-CHE",
      "DECAL-MAI-CHE": "DECAL-MAI-CHE",
      "MICA-DAILOAN-2MM": "MICA-DAILOAN-2MM",
      "MICA-DAILOAN-3MM": "MICA-DAILOAN-3MM",
    };

    const unmappedLines: Array<{ itemCode: string; itemName: string }> = [];
    const resolvedLines = [];

    for (const it of items) {
      const qty = Number(it.quantity) || 0;
      if (qty <= 0) continue;

      const rawCode = String(it.itemCode || "").trim();
      const rawName = String(it.itemName || "").trim();
      const targetAlias = CODE_ALIASES[rawCode] || rawCode;

      // 1. Khớp theo mã SKU trực tiếp hoặc alias
      let matched = dbItems.find(
        (i) =>
          i.code.toLowerCase() === targetAlias.toLowerCase() ||
          i.code.toLowerCase() === rawCode.toLowerCase()
      );

      // 2. Khớp theo tên vật tư chính xác
      if (!matched && rawName) {
        matched = dbItems.find(
          (i) => i.name.toLowerCase() === rawName.toLowerCase()
        );
      }

      // 3. Tự động khởi tạo mặt hàng nếu chưa có trong kho với kind: 'material' đầy đủ
      if (!matched && (targetAlias || rawCode)) {
        try {
          const unitName = it.unit || "Cái";
          let unitRes = await pool.query(
            `SELECT id, code, name FROM erp.units WHERE organization_id = $1 AND (code ILIKE $2 OR name ILIKE $2) LIMIT 1`,
            [orgId, unitName]
          );
          let unitId = unitRes.rows[0]?.id;
          if (!unitId) {
            const anyUnitRes = await pool.query(
              `SELECT id, code, name FROM erp.units WHERE organization_id = $1 LIMIT 1`,
              [orgId]
            );
            unitId = anyUnitRes.rows[0]?.id;
          }
          if (unitId) {
            const newItemRes = await pool.query(
              `INSERT INTO erp.items (organization_id, code, name, kind, track_stock, base_unit_id, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, 'material', true, $4, true, NOW(), NOW())
               ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
               RETURNING id, code, name, base_unit_id`,
              [orgId, targetAlias || rawCode, it.itemName || targetAlias || rawCode, unitId]
            );
            matched = newItemRes.rows[0];
          }
        } catch (itemCreateErr) {
          console.error("Lỗi tự động tạo vật tư kho:", itemCreateErr);
        }
      }

      if (!matched) {
        unmappedLines.push({ itemCode: rawCode, itemName: it.itemName });
        continue;
      }

      // 4. Quy đổi đơn vị tính giữa BOM và Kho
      let convertedQty = qty;
      const bomUnitLower = String(it.unit || "").trim().toLowerCase();
      const dbUnitCode = String(matched.unit_code || matched.unit_name || "").trim().toLowerCase();

      if (bomUnitLower.includes("cây") && (dbUnitCode === "m" || dbUnitCode === "mét" || dbUnitCode === "met")) {
        convertedQty = qty * 6; // 1 Cây 6m = 6 Mét
      } else if ((bomUnitLower === "m" || bomUnitLower === "mét" || bomUnitLower === "met") && dbUnitCode.includes("cây")) {
        convertedQty = Math.round((qty / 6) * 100) / 100;
      }

      // 5. Lấy giá vốn kho thực tế nếu có, fallback về đơn giá dự toán BOM
      let unitCostSnapshot = Number(it.unitPrice) || 0;
      try {
        const costRes = await pool.query(
          `SELECT moving_average_cost, latest_cost FROM erp.item_costs WHERE item_id = $1 LIMIT 1`,
          [matched.id]
        );
        const actualCost = Number(costRes.rows[0]?.moving_average_cost || costRes.rows[0]?.latest_cost) || 0;
        if (actualCost > 0) {
          unitCostSnapshot = actualCost;
        }
      } catch {
        // Giữ unitCostSnapshot mặc định
      }

      resolvedLines.push({
        itemId: matched.id,
        unitId: matched.base_unit_id,
        qty: convertedQty,
        unitCostSnapshot,
      });
    }

    // Nếu có dòng không khớp được, CHẶN và báo lỗi chi tiết, KHÔNG âm thầm bỏ dòng!
    if (unmappedLines.length > 0) {
      return NextResponse.json(
        {
          error: `Không thể lập phiếu xuất kho: Có ${unmappedLines.length} vật tư chưa khớp với danh mục kho!`,
          details: `Các dòng chưa khớp: ${unmappedLines.map((u) => `"${u.itemName}" (${u.itemCode})`).join(", ")}. Vui lòng gán mã kho hợp lệ trước khi xuất.`,
          unmappedLines,
        },
        { status: 400 }
      );
    }

    if (resolvedLines.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy vật tư kho hợp lệ để xuất!" }, { status: 400 });
    }

    // 6. Tìm Lệnh Sản Xuất đang chạy của dự án để gắn liên kết trực tiếp
    const prodRes = await pool.query(
      `SELECT id FROM erp.production_orders 
       WHERE organization_id = $1 AND project_id = $2 AND status IN ('draft', 'released', 'in_progress') 
       ORDER BY created_at DESC LIMIT 1`,
      [orgId, projectId]
    );
    const productionOrderId = prodRes.rows[0]?.id || null;

    // 7. Tạo Phiếu Xuất Kho NVL (status: submitted - Chờ thủ kho duyệt xuất kho)
    const docId = await InventoryService.createDocument(
      {
        type: "issue",
        purpose: purpose?.trim() || `Xuất NVL sản xuất công trình (Dự án ${projectId})`,
        sourceWarehouseId: warehouseId,
        projectId,
        productionOrderId,
        submitNow: true,
        lines: resolvedLines,
      },
      session.user.id
    );

    const docRowRes = await pool.query("SELECT code FROM erp.stock_documents WHERE id = $1 LIMIT 1", [docId]);
    const documentCode = docRowRes.rows[0]?.code || "PXK";

    // 8. Cập nhật metadata phiếu kho để lưu vết BOM và Khảo sát
    if (bomId || surveyId) {
      try {
        await pool.query(
          `UPDATE erp.stock_documents 
           SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb 
           WHERE id = $1`,
          [docId, JSON.stringify({ bomId, bomCode, surveyId: surveyId || null })]
        );
      } catch (metaErr) {
        console.warn("Không thể lưu metadata phiếu kho (bỏ qua):", metaErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        documentId: docId,
        documentCode,
        bomId,
        bomCode,
        productionOrderId,
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
