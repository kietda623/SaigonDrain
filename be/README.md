# SaigonDrain AI — Backend

Đây là vị trí dành sẵn cho backend của SaigonDrain AI. **Demo hiện tại chưa có backend**: không có server, API, cơ sở dữ liệu hay xác thực.

- Hai app frontend nằm trong `fe/user` và `fe/admin`, dùng dữ liệu mô phỏng tại `fe/*/src/data`.
- Frontend hiện không gọi API nào; toàn bộ luồng chạy bằng mock data.
- Khi cần triển khai backend thật, thêm package vào thư mục này và giữ khai báo workspace `be/*` trong `pnpm-workspace.yaml`.

Không đặt mã nguồn server tạm thời ở đây khi chưa có yêu cầu.
