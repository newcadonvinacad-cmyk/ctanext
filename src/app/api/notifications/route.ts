import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth-cache";
import { NotificationService } from "@/services/notification.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 30;
    const onlyUnread = searchParams.get("onlyUnread") === "true";

    const data = await NotificationService.listUserNotifications(
      session.user.id,
      limit,
      onlyUnread
    );

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải thông báo", details: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    if (body.all) {
      await NotificationService.markAllAsRead(session.user.id);
      return NextResponse.json({ success: true, message: "Đã đánh dấu tất cả là đã đọc" });
    }

    if (body.id) {
      await NotificationService.markAsRead(body.id, session.user.id);
      return NextResponse.json({ success: true, message: "Đã đánh dấu đã đọc" });
    }

    return NextResponse.json({ error: "Thiếu id hoặc cờ all" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật thông báo", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.title || !body.message) {
      return NextResponse.json({ error: "Thiếu tiêu đề hoặc nội dung thông báo" }, { status: 400 });
    }

    const notification = await NotificationService.createNotification({
      userId: body.userId || session.user.id,
      title: body.title,
      message: body.message,
      type: body.type || "info",
      link: body.link,
      metadata: body.metadata,
    });

    return NextResponse.json({ success: true, notification }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo thông báo", details: err.message },
      { status: 500 }
    );
  }
}
