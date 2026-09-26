# Cài database Signage ERP bằng SQL Editor

## Chạy file nào?

1. Mở đúng project Supabase → **SQL Editor → New query**.
2. Dán toàn bộ nội dung [SIGNAGE_ERP_INSTALL.sql](SIGNAGE_ERP_INSTALL.sql), chạy bằng quyền database owner (`postgres`). Không cần kết nối IPv4 từ máy cá nhân.
3. Kết quả cuối phải là `Installed successfully`, **170 permissions**, **5 roles**, **410 grants**, **5 migrations**.

File chạy trong một transaction: lỗi trước COMMIT thì toàn bộ phần cài đặt rollback. Nếu phiên SQL còn báo transaction aborted, chạy `ROLLBACK;` trước thao tác tiếp theo. Chạy lại installer khi ERP/IAM đã tồn tại sẽ chủ động dừng, không ghi đè; dùng migration mới cho lần nâng cấp sau.

## Nội dung được tạo

- 89 bảng nghiệp vụ trong `erp`, 11 bảng phân quyền trong `iam`; thêm `erp.schema_migrations` để theo dõi phiên bản/checksum.
- Bốn bảng Better Auth trong `public` nếu chưa có, lấy cấu trúc từ phiên bản thư viện đã cài. Bảng auth đã có được kiểm tra cột và giữ dữ liệu; cấu trúc không tương thích sẽ làm transaction dừng.
- Một doanh nghiệp cấu hình `SIGNAGE` / `Signage ERP` (có thể đổi tên hiển thị), 5 role mẫu, 170 permission, 410 grant và 10 đơn vị tính cơ bản.
- Khóa ngoại cùng doanh nghiệp, ràng buộc số liệu, chỉ mục, trigger chống chu trình và khoảng hiệu lực chồng nhau, kiểm tra scope/hạn mức, audit thay đổi quyền, RLS theo doanh nghiệp.
- Grant `SELECTED` được seed với `is_enabled=false`: gắn project/kho/phòng ban phù hợp rồi mới bật. Không seed phạm vi giả để mở quyền rộng hơn thiết kế.

Không chèn khách hàng, vật tư, đơn hàng, số dư kho/tiền, tài khoản hay mật khẩu mẫu. `created_by`/`updated_by` cho phép null ở cấu hình do hệ thống seed; sự kiện seed quyền được audit dưới actor_kind=system. Bản ghi nghiệp vụ do service tạo phải ghi actor xác thực.

## Gán quản trị viên đầu tiên

Tạo tài khoản thực bằng Better Auth khi luồng đăng ký/đăng nhập đã được triển khai. Sau đó mở [BOOTSTRAP_ADMIN.sql](BOOTSTRAP_ADMIN.sql), thay `target_user_id` bằng đúng ID tài khoản và chạy. Có thể làm cho quản trị viên thứ hai trước khi khóa `bootstrap_state`. Không tự gán toàn bộ người dùng đang có thành admin.

Script bootstrap yêu cầu database owner, không phải endpoint cho trình duyệt. Sau khi cấu hình xong, chạy câu UPDATE khóa bootstrap ở cuối file; các lần đổi quyền sau đi qua quy trình đề nghị/duyệt của ứng dụng.

## Ranh giới của bộ SQL

Đây là **schema, ràng buộc và seed**, chưa phải toàn bộ service ERP. Các luồng post kho/tiền, đối soát tổng công nợ, khóa kỳ, định giá, duyệt đa bước, quyền trường, lọc OWN/ASSIGNED/TEAM/SELECTED và bảo vệ quản trị viên cuối phải được triển khai tại service theo hai tài liệu thiết kế. Không gọi trực tiếp UPDATE trạng thái để thay thế các luồng đó.

RLS trong file chỉ cô lập organization theo `app.organization_id`; nó không tự biến ma trận role thành bộ authorization đầy đủ. Không cấp truy cập ERP/IAM cho `anon`/`authenticated`, không tạo runtime login hoặc cấp quyền rộng. Ứng dụng sau này cần DB role riêng, kiểm tra Better Auth/membership/permission phía server trước khi đặt context transaction. Việc cài SQL không tự sửa kết nối DATABASE_URL IPv6 của ứng dụng trên máy này.

Không có dữ liệu người dùng để tự chọn người quản trị. Vai trò tên SUPER_ADMIN cũng không thay thế kiểm tra hành động, trạng thái và cấm tự duyệt của service.

## Kiểm tra và nâng cấp

- [verify.sql](verify.sql) kiểm tra cấu trúc/seed ngay sau cài. Số lượng kỳ vọng dành cho bản cài v1; sau khi tùy chỉnh role/grant, không dùng so sánh số lượng seed để đánh giá quyền đúng/sai.
- `migrations/001...005` là các phần nguồn đã được gộp vào installer; không cần chạy riêng nếu đã chạy file tổng.
- `node tooling/sql-check/check.mjs` chạy PostgreSQL tạm trong bộ nhớ, không đọc `.env`, không kết nối database thật. Công cụ kiểm tra có dependency riêng tại `tooling/sql-check`.
- `node scripts/print-install-sql.mjs` in lại file tổng từ migrations (không kết nối mạng/database).
- `scripts/database.mjs` là runner tùy chọn qua DATABASE_URL đã chuẩn bị trước đó. Không cần chạy khi dùng SQL Editor; mode `check` chạy transaction rồi rollback, `apply` chạy migration chưa áp dụng dựa trên checksum.

Schema được kiểm thử cục bộ bằng PGlite (PostgreSQL trong WASM). Cần kiểm tra kết quả trong project Supabase thật sau khi bạn chạy file; chưa có lần cài đặt nào lên database từ phiên làm việc này.
