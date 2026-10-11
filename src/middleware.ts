import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Các tuyến đường công khai không cần đăng nhập
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/health",
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Bỏ qua các tài nguyên tĩnh và API nội bộ của Better Auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Lấy session token của Better Auth từ Cookie
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const isPublicPath = PUBLIC_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(publicPath + "/")
  );

  // 3. Nếu chưa đăng nhập mà truy cập route được bảo vệ
  if (!sessionToken && !isPublicPath) {
    // Với các request API, trả về JSON 401 thay vì redirect sang trang đăng nhập HTML
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập", code: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    const redirectTarget = pathname + search;
    if (redirectTarget !== "/") {
      loginUrl.searchParams.set("redirect", redirectTarget);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. Nếu đã đăng nhập mà truy cập trang login/quên mật khẩu -> Điều hướng về dashboard
  if (sessionToken && isPublicPath) {
    const dashboardUrl = new URL("/", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Áp dụng middleware cho tất cả các đường dẫn ngoại trừ static files:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - files có đuôi mở rộng (svg, png, jpg, css, js...)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
  ],
};
