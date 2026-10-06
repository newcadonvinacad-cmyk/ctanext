import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth-cache";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Kiểm tra session từ lớp đệm Cache
    const session = await getCachedSession();
    const sessionUser = session?.user || null;

    // Nếu chưa đăng nhập, trả về 401 Unauthorized
    if (!sessionUser) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "Chưa đăng nhập hoặc phiên làm việc đã hết hạn",
          user: null,
          roles: [],
          capabilities: {},
          defaultRoute: "/login",
        },
        { status: 401 }
      );
    }

    const userId = sessionUser.id;
    const userEmail = sessionUser.email;
    const userName = sessionUser.name;

    // 2. Nạp quyền động từ Database PostgreSQL (erp.memberships -> iam.user_roles -> iam.role_grants)
    const { roles, capabilities, membershipStatus, membershipId, employeeId } =
      await AuthorizationService.getUserCapabilities(userId);

    const defaultRoute = AuthorizationService.resolveDefaultRoute(
      roles,
      capabilities
    );

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userId,
        email: userEmail,
        name: userName,
        membershipId: membershipId || null,
        employeeId: employeeId || null,
      },
      roles,
      capabilities,
      defaultRoute,
      membershipStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi nạp thông tin phân quyền phiên", details: err.message },
      { status: 500 }
    );
  }
}
