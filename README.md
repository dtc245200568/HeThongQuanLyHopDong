 BÁO CÁO THỰC HÀNH: HỆ THỐNG QUẢN LÝ HỢP ĐỒNG PHẦN MỀM (ĐỀ 34)
- Sinh viên thực hiện:Nguyễn Trọng Nhuận
- Mã số sinh viên: Dtc245200568
- Học phần: Triển khai và Quản trị Hệ thống Phần mềm (2026)
1. Danh sách dịch vụ và quy hoạch cổng mạng
- Nginx Reverse Proxy:Port `80` (Cổng tiếp nhận duy nhất, bảo mật HTTP Headers)
- Website Quản lý Hợp đồng (Node.js): Port `4000` (Chạy nội bộ `127.0.0.1`)
- PostgreSQL Database: Port `5432` (Lưu trữ bảng `contracts`, chỉ nghe localhost)
- pgAdmin 4 (Web Mode): Truy cập tại `http://<IP>:8080/pgadmin4`
- Grafana Server: Port `3000` (Dashboard giám sát thời gian thực)
- Prometheus Server: Port `9090` (Kéo metrics từ Web App và Node Exporter)
- Loki Server & Promtail: Port `3100` / `9080` (Thu thập và tra cứu 
log tập trung)

-2. Hướng dẫn khởi chạy hệ thống
1. Khởi động các dịch vụ nền tảng:
   ```bash
   sudo systemctl restart postgresql nginx contract-app
   sudo systemctl restart prometheus prometheus-node-exporter grafana-server
   sudo systemctl restart loki promtail
