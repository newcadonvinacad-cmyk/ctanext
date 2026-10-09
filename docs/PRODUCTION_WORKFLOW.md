# Sản xuất theo maket và lô dự án

Chức năng nằm trong **Sản xuất & Thi công → Sản xuất**. Luồng mới dùng cùng sổ kho và công nợ của hệ thống.

## Chuẩn bị dữ liệu

1. Maket phải được duyệt và lưu thông số, kích thước cùng ID khảo sát của đúng dự án. Không lấy khảo sát đầu tiên hoặc kích thước mẫu.
2. Trong **Gán vật tư đại diện**, chọn mã hàng thật, đơn vị có quy đổi và hệ số định mức cho từng quy cách. Danh mục này ghi nhớ gán để lập BOM sau; BOM đã có không bị sửa theo.
3. Trong **BOM dự án**, lập từ maket rồi kiểm tra khung, diện tích mặt, bộ chữ và những nhu cầu bổ sung thực tế. Không tự thêm LED, nguồn hoặc phụ kiện. Khung bao cần bổ sung xương/giằng; hệ số diện tích, số mặt, quy cách tấm và hao hụt do người lập xác nhận. Dòng thiếu gán hoặc đơn vị chưa quy đổi chặn gửi duyệt.
4. Thành phẩm đại diện là mã hàng chung. Thành phẩm có BOM danh mục trong `items.specification.bom` được triển khai nhiều cấp; định mức danh mục tính cho một đơn vị cơ sở của thành phẩm. Thành phẩm chưa có BOM dùng chính hàng tồn. BOM dự án có trường sản lượng tương ứng BOM để tính đúng số bộ hoặc diện tích cần sản xuất.
5. BOM cũ giữ nguyên. Mở trong chức năng mới, gắn maket đã duyệt, bổ sung/gán các dòng thực tế và lưu; BOM đã chốt phải tạo phiên bản mới trước khi sửa.

## Thao tác

- Một lệnh chứa nhiều BOM/hạng mục của cùng dự án. Chọn thành phẩm đại diện, đơn vị, sản lượng, tổ xưởng, kho cấp từng NVL, công đoạn và xác nhận có điện/LED. Có thể gắn nhánh sản xuất dưới công việc WBS đã có; cấu trúc cũ được giữ.
- Gửi duyệt chốt BOM và tạo đủ phiếu NVL chờ duyệt, tách theo kho, kể cả khi tồn chưa đủ. Duyệt phân bổ lại theo các lô thực có tại kho nguồn và chặn khi thiếu; nhập bổ sung rồi duyệt lại được. Duyệt giữ vật tư; thủ kho xác nhận thực tế mới giảm tồn. Hạng mục chỉ bắt đầu khi đã cấp đủ.
- Ghi từng công đoạn và lượng NVL thực dùng của lần ghi, hao hụt, sản lượng, ghi chú, ảnh. Công đoạn cuối xác nhận bằng QC. Tiêu chí QC ban đầu chưa xác nhận; sản phẩm điện thêm tiêu chí điện/ánh sáng.
- Ảnh được thu nhỏ tại trình duyệt và lưu cùng nhật ký có phân quyền trong database; không tải ảnh sản xuất lên kho ảnh công khai. Mỗi lần ghi giới hạn tổng ảnh 3 MB; có thể chia nhiều lần ghi nếu cần.
- QC đạt từng phần tạo phiếu nhập chờ duyệt với UUID/mã lô riêng. Lỗi quay lại hoàn thiện và QC lại. Chỉ ghi sổ nhập mới tăng tồn và lượng đã nhập; đủ các hạng mục mới hoàn tất lệnh.
- Cấp bổ sung và trả dư có phiếu riêng. Trả dư chọn đúng lô đã cấp, không vượt lượng chưa dùng sau khi trừ các phiếu trả chờ duyệt. Không sửa chứng từ đã ghi sổ.
- **Bán hàng → Bán theo lô sản xuất**: chọn dự án/lệnh, từng lô và kho đã nhập. Duyệt đơn giữ hàng và tạo phiếu xuất chờ duyệt theo kho. Xác nhận xuất thực tế cập nhật tồn và lượng giao. Việc tạo/duyệt phiếu không lập thêm công nợ.
- Hủy phiếu/đơn chưa ghi sổ giải phóng lượng giữ. Với chứng từ đã ghi sổ, lập phiếu đảo và duyệt/xác nhận phiếu đảo. Lô nhập đã sử dụng/giữ bán không thể đảo nếu không đủ hàng; NVL đã vào gia công phải xử lý trả dư theo lượng thực dùng. Nghiệp vụ điều chỉnh công nợ sử dụng chứng từ tài chính hiện có.

## Quyền và triển khai

Kiểm tra quyền ở máy chủ theo tổ chức, dự án, kho, hạn mức và phân công công đoạn. Cần cấp quyền sản xuất tương ứng và gán kho cho người có phạm vi ASSIGNED/SELECTED. Nhân sự xưởng đọc/ghi hạng mục được phân công; QC cần quyền riêng; xác nhận thực tế cần quyền ghi sổ kho.

`019_production_workflow.sql` bổ sung bảng/liên kết, giữ cột cũ, chuyển lệnh một thành phẩm cũ sang hạng mục và khóa BOM đã chốt. Migration không thay đổi số dư kho hoặc đơn bán. Tính năng được ẩn đến khi marker migration và quyền mới sẵn sàng.

Kiểm tra và triển khai đúng migration mới, không chạy lại toàn bộ các migration cũ:

```text
node scripts/migrate-production.mjs check
node scripts/migrate-production.mjs apply
```

Hai lệnh đọc cấu hình database của ứng dụng; `check` hoàn tác toàn bộ. `apply` chạy trong giao dịch, có khóa triển khai và nhận diện migration đã áp dụng.

## Kiểm thử

```text
npm run test:production
npx tsc --noEmit --incremental false
node tests/e2e/test_production_workflow.cjs
node tests/nippon-shop-drawing.test.cjs
node tests/e2e/test_maquette_project_surveys.mjs
node tests/e2e/test_maquette_measured_outlines.mjs
node tests/e2e/test_maquette_auto_dimensions.mjs
node scripts/test-production-concurrency.mjs
npm run build
```

Dịch vụ dùng PostgreSQL PGlite dùng một lần, baseline migration thật và ràng buộc SQL thật, không kết nối `DATABASE_URL`. Kiểm thử trình duyệt cần ứng dụng ở localhost:3000 và phiên kiểm thử admin đã lưu trong tệp bị Git bỏ qua. Tất cả thao tác ghi của luồng trình duyệt được chặn và chuyển vào database dùng một lần; chỉ xác thực/đọc giao diện dùng máy chủ đang chạy. Ảnh kết quả lưu ở `scratch`.

Các ca bao gồm BOM nhiều cấp/quy đổi/vòng lặp, nguồn khảo sát/maket, nhiều hạng mục, khóa phiên bản, cấp bổ sung/trả dư, QC lỗi rồi sửa, nhập từng phần, hai dự án cùng mã hàng, tranh giữ lô, gửi lại yêu cầu, đảo chứng từ và không trùng công nợ.

Kiểm thử đồng thời dùng PostgreSQL thực với nhiều kết nối độc lập: gửi trùng yêu cầu, duyệt/ghi sổ cùng lúc và hai đơn tranh một lô. Script tạo database trống có tên `codex_prod_test_<UUID>` và dấu nhận diện riêng, rồi xóa đúng database đó khi kết thúc. Cần tài khoản có quyền tạo database; database ứng dụng chỉ dùng làm kết nối quản trị, không nhận dữ liệu kiểm thử. Script kiểm tra tên và dấu nhận diện trước khi xóa. SQL dịch vụ khóa hàng trong giao dịch để bảo vệ tồn và tránh trùng chứng từ.
