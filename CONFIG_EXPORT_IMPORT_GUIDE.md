# Hướng dẫn sử dụng chức năng xuất/nhập cấu hình IOBOX

## Tổng quan
Chức năng xuất/nhập cấu hình cho phép bạn:
- **Xuất cấu hình**: Lưu tất cả cài đặt hiện tại của thiết bị IOBOX vào file JSON
- **Nhập cấu hình**: Áp dụng lại các quy tắc logic (logic rules) từ file đã xuất trước đó. Lưu ý: phần cấu hình mạng sẽ được bỏ qua khi nhập.

## Cách sử dụng

### 1. Truy cập Config Manager
- Mở ứng dụng IOBOX Controller
- Click vào tab **"Config Manager"** trong sidebar bên trái
- Giao diện Config Manager sẽ hiển thị với 2 tùy chọn chính

### 2. Xuất cấu hình (Export Configuration)

#### Bước 1: Chuẩn bị
- Đảm bảo thiết bị IOBOX đã kết nối thành công
- Kiểm tra trạng thái "Connected" trong sidebar

#### Bước 2: Thực hiện xuất
- Click nút **"Export Configuration"**
- Hệ thống sẽ thu thập tất cả cấu hình từ thiết bị:
  - Thông tin thiết bị (Device Info)
  - Cấu hình mạng (Network Config)
  - Trạng thái IO (IO Status)
  - Cấu hình logic (Logic Config)
- File JSON sẽ được tải xuống tự động với tên: `iobox-config-YYYY-MM-DDTHH-MM-SS.json`

#### Bước 3: Lưu trữ file
- Lưu file cấu hình ở vị trí an toàn
- File này chứa tất cả cài đặt quan trọng của thiết bị

### 3. Nhập cấu hình (Import Configuration)

#### Bước 1: Chọn file
- Click nút **"Select Configuration File"**
- Chọn file JSON đã xuất trước đó
- Hệ thống sẽ đọc và xác thực file

#### Bước 2: Xem trước cấu hình
- Sau khi chọn file, thông tin cấu hình sẽ hiển thị:
  - Thời gian xuất file
  - Các thành phần cấu hình có sẵn
  - Trạng thái từng phần (thành công/lỗi)

#### Bước 3: Áp dụng cấu hình
- Click nút **"Apply Configuration"** để áp dụng
- Hệ thống sẽ:
  - Áp dụng các quy tắc logic (nếu có)
  - Hiển thị kết quả áp dụng

## Cấu trúc file cấu hình

File JSON xuất ra có cấu trúc như sau:

```json
{
  "exportInfo": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0",
    "deviceType": "IOBOX",
    "exportedBy": "IOBOX Controller App"
  },
  "deviceInfo": {
    "info": {
      "Model": "IOBOX-001",
      "localIp": "192.168.1.100"
    }
  },
  "networkConfig": {
    "config": {
      "ip": "192.168.1.100",
      "subnet": "255.255.255.0",
      "gateway": "192.168.1.1",
      "isStatic": true
    }
  },
  "ioStatus": {
    "digitalInputs": [...],
    "analogInputs": [...],
    "digitalOutputs": [...]
  },
  "logicConfig": {
    "rules": [
      {
        "output": "DO1",
        "enabled": true,
        "conditions": [...],
        "logic": "C1 && C2"
      }
    ]
  },
  "errors": {
    "deviceInfo": null,
    "networkConfig": null,
    "ioStatus": null,
    "logicConfig": null
  }
}
```

## Lưu ý quan trọng

### ⚠️ Cảnh báo
- **Backup trước khi import**: Luôn xuất cấu hình hiện tại trước khi nhập cấu hình mới
- **Import chỉ áp dụng logic**: Việc nhập sẽ chỉ áp dụng các quy tắc logic, không thay đổi cấu hình mạng
- **Thay đổi mạng thực hiện riêng**: Nếu cần đổi cấu hình mạng, hãy thực hiện tại màn hình Network và kiểm tra kết nối sau khi thay đổi

### ✅ Khuyến nghị
- Xuất cấu hình định kỳ để backup
- Lưu trữ file cấu hình ở nhiều nơi khác nhau
- Ghi chú thời gian và mục đích của mỗi file cấu hình
- Test cấu hình trên thiết bị không quan trọng trước khi áp dụng trên thiết bị chính

### 🔧 Xử lý sự cố

#### Lỗi "Invalid configuration file format"
- Kiểm tra file có phải là JSON hợp lệ không
- Đảm bảo file được xuất từ ứng dụng IOBOX Controller

#### Lưu ý về cấu hình mạng khi import
- Tính năng import không áp dụng cấu hình mạng. Hãy dùng tab Network để cấu hình mạng khi cần.

#### Lỗi "Logic config failed"
- Kiểm tra cú pháp logic expression
- Xác nhận các điều kiện input có tồn tại
- Kiểm tra quy tắc logic có hợp lệ không

## Tính năng nâng cao

### Tự động hóa
- Sử dụng API để tích hợp với hệ thống quản lý khác
- Tự động xuất cấu hình theo lịch trình
- So sánh cấu hình giữa các thiết bị

### Bảo mật
- File cấu hình chứa thông tin nhạy cảm
- Bảo vệ file cấu hình khỏi truy cập trái phép
- Sử dụng mã hóa nếu cần thiết

## Hỗ trợ

Nếu gặp vấn đề với chức năng xuất/nhập cấu hình:
1. Kiểm tra kết nối thiết bị
2. Xem log lỗi trong console trình duyệt
3. Thử xuất/nhập lại với file khác
4. Liên hệ hỗ trợ kỹ thuật nếu cần thiết
