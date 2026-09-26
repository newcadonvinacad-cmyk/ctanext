import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getDbPool, AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const canRead = capabilities["company_setting.read"]?.isEnabled || (session.user as any).role === "admin";
    if (!canRead) {
      return NextResponse.json({ error: "Không có quyền xem cấu hình doanh nghiệp" }, { status: 403 });
    }

    const pool = getDbPool();
    const orgRes = await pool.query(
      `SELECT m.organization_id, o.code, o.name, o.currency, o.timezone
       FROM erp.memberships m
       JOIN erp.organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1 LIMIT 1`,
      [session.user.id]
    );

    let org = orgRes.rows[0];
    if (!org) {
      const fallback = await pool.query(
        "SELECT id as organization_id, code, name, currency, timezone FROM erp.organizations LIMIT 1"
      );
      org = fallback.rows[0];
    }

    const settingRes = await pool.query(
      `SELECT value FROM erp.company_settings WHERE organization_id = $1 AND key = 'company_profile' LIMIT 1`,
      [org.organization_id]
    );

    const profile = settingRes.rows[0]?.value || {};

    return NextResponse.json({
      success: true,
      settings: {
        companyName: profile.companyName || org.name || "CÔNG TY TNHH QUẢNG CÁO & NỘI THẤT SIGNAGE",
        companyCode: org.code || "SIGNAGE",
        taxCode: profile.taxCode || "0109887766",
        hotline: profile.hotline || "0988.123.456",
        address: profile.address || "KCN Triều Khúc, Thanh Xuân, Hà Nội",
        email: profile.email || "contact@signage-erp.vn",
        representative: profile.representative || "Nguyễn Văn Giám Đốc",
        bankAccount: profile.bankAccount || "19038888888888",
        bankName: profile.bankName || "Techcombank - CN Hà Nội",
        currency: org.currency || "VND",
        timezone: org.timezone || "Asia/Ho_Chi_Minh",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải thông tin doanh nghiệp", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const canUpdate = capabilities["company_setting.update"]?.isEnabled || (session.user as any).role === "admin";
    if (!canUpdate) {
      return NextResponse.json(
        { error: "Không có quyền cập nhật cấu hình doanh nghiệp (cần quyền company_setting.update)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const pool = getDbPool();

    const orgRes = await pool.query(
      `SELECT organization_id FROM erp.memberships WHERE user_id = $1 LIMIT 1`,
      [session.user.id]
    );
    const orgId = orgRes.rows[0]?.organization_id || (await pool.query("SELECT id FROM erp.organizations LIMIT 1")).rows[0]?.id;

    if (!orgId) {
      return NextResponse.json({ error: "Không tìm thấy tổ chức" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        "SELECT set_config('app.organization_id', $1, true), set_config('app.current_user_id', $2, true)",
        [orgId, session.user.id]
      );

      const profile = {
        companyName: body.companyName || "",
        taxCode: body.taxCode || "",
        hotline: body.hotline || "",
        address: body.address || "",
        email: body.email || "",
        representative: body.representative || "",
        bankAccount: body.bankAccount || "",
        bankName: body.bankName || "",
      };

      // 1. Upsert company_profile in erp.company_settings
      await client.query(
        `INSERT INTO erp.company_settings (organization_id, key, value, created_by, updated_by)
         VALUES ($1, 'company_profile', $2, $3, $3)
         ON CONFLICT (organization_id, key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`,
        [orgId, JSON.stringify(profile), session.user.id]
      );

      // 2. Update erp.organizations name if companyName provided
      if (body.companyName) {
        await client.query(
          `UPDATE erp.organizations
           SET name = $1, updated_at = now(), updated_by = $2
           WHERE id = $3`,
          [body.companyName.trim(), session.user.id, orgId]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Cập nhật cấu hình doanh nghiệp thành công",
        settings: profile,
      });
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lưu cấu hình doanh nghiệp", details: err.message },
      { status: 500 }
    );
  }
}
