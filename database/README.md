# Cài database Signage ERP bằng SQL Editor

## Kiểm tra trước khi chạy phiên bản ứng dụng mới

- `npm run check`: kiểm tra TypeScript và toàn bộ test cục bộ, gồm cài đầy đủ migration với dữ liệu role mẫu, hoàn tác migration, truy vấn đọc, API và lưu biểu mẫu. Không chạy bài kiểm thử đồng thời cần PostgreSQL riêng.
- `npm run db:status`: chỉ đọc lịch sử migration/checksum của database trong cấu hình ứng dụng.
- `npm run db:verify`: dựng schema chuẩn trong PostgreSQL tạm, so toàn bộ tên/kiểu cột với database thật và kiểm tra lịch sử migration. Trả mã lỗi nếu còn thiếu; không sửa database.
- `npm run db:check -- --only=020_feature_plan_enhancements.sql`: chạy thử đúng migration trong giao dịch rồi hoàn tác, gồm kiểm tra ràng buộc hoãn.
- `npm run db:migrate -- --only=020_feature_plan_enhancements.sql`: **ghi thay đổi vào database thật** sau khi đã kiểm tra và được phép triển khai.
- `npm run check:release`: chạy kiểm thử, kiểm tra database thật rồi mới build; dùng làm điều kiện cho quy trình phát hành. Đây không phải lệnh tự cập nhật database.

Các lệnh database không in thông tin kết nối hay dữ liệu nghiệp vụ. Nếu có migration cũ chưa ghi lịch sử nhưng bảng đã tồn tại, cần đối chiếu trước khi ghi nhận/nâng cấp; runner dừng khi gặp khoảng trống lịch sử thay vì tự chạy lại dữ liệu seed cũ. Không đánh dấu đã áp dụng chỉ để làm xanh kiểm tra.

`verify.sql` và số lượng seed bên dưới thuộc bản cài ban đầu, không dùng để kết luận phiên bản ứng dụng hiện tại đã sẵn sàng. Dùng `db:verify` cho database đã nâng cấp. Kiểm tra cột không thay thế kiểm thử luồng ghi, phân quyền, tích hợp và trình duyệt.

### Kiểm tra truy vấn của trang và modal

- `tests/read-service-contract.test.cjs`: 36 truy vấn service chạy trong giao dịch chỉ đọc.
- `tests/api-query-contract.test.cjs`: 72 API đọc trang/danh mục/tab dự án chạy trong giao dịch chỉ đọc; thêm 7 luồng tạo/sửa qua API (khách hàng, nhân viên, ca làm, khảo sát, thư mục và hai API vật tư), dữ liệu sai/trùng và một trường hợp chặn ghi khi thiếu quyền. Payload vật tư khớp `ItemModal.tsx` và trang vật tư; kiểm tra đọc lại quy cách, trạng thái và cấu hình kho.
- `tests/form-query-contract.test.cjs`: 17 kịch bản service tạo → đọc lại → sửa/duyệt/xóa, bao gồm nhà cung cấp, dự án/công việc, vật tư/kho, HR, khảo sát, thiết kế, QC, bảo hành và tài liệu.

Các bài này chạy SQL thật trên PGlite dùng đủ migration, không dùng database thật. Kiểm thử API gọi route handler trực tiếp với danh tính/quyền mẫu; không thay thế kiểm thử đăng nhập, mọi vai trò/phạm vi, thao tác trình duyệt, upload/AI bên ngoài hoặc tải đồng thời PostgreSQL. Khi thêm modal hoặc câu truy vấn mới, thêm trường hợp tương ứng vào bộ kiểm tra này; cần cả đọc lại dữ liệu đã lưu, không chỉ kiểm tra mã thành công.

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
