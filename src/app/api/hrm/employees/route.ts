import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));

    // F02: Bắt buộc có quyền employee.read
    if (!isSuperAdmin && !capabilities["employee.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem danh sách nhân sự" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;

    const employees = await HrmService.listEmployeesWithPolicy(search, departmentId);

    // F14 & F02: Nếu không có quyền salary.read, ẩn hoàn toàn thông tin lương nhạy cảm khỏi response
    const hasSalaryRead = isSuperAdmin || capabilities["salary.read"]?.isEnabled;
    const sanitizedEmployees = employees.map((emp) => {
      if (hasSalaryRead) return emp;
      const { baseSalary, payBasis, policy, ...safeEmp } = emp;
      return safeEmp;
    });

    return NextResponse.json({ employees: sanitizedEmployees });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách nhân sự", details: err.message },
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

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));

    // F05: Bỏ đặc cách DIRECTOR / CEO; chỉ SUPER_ADMIN / ADMIN hoặc capability employee.create
    if (!isSuperAdmin && !capabilities["employee.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền thêm nhân viên mới" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Họ và tên nhân viên là bắt buộc" }, { status: 400 });
    }

    const employee = await HrmService.createEmployee({
      code: body.code,
      name: body.name,
      phone: body.phone,
      departmentId: body.departmentId,
      hireDate: body.hireDate,
      membershipId: body.membershipId,
      baseSalary: body.baseSalary ? Number(body.baseSalary) : undefined,
      payBasis: body.payBasis,
      templateCode: body.templateCode,
      policy: body.policy,
      createdBy: session.user.id,
    });

    return NextResponse.json({ success: true, employee }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo hồ sơ nhân viên", details: err.message },
      { status: 500 }
    );
  }
}
