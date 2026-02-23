# Hướng Dẫn Cài Đặt Serverless Backend bằng Google Sheets & Apps Script (Tự Động 100%)

Với việc nâng cấp ứng dụng lên hệ thống **Lưu Trữ Linh Động**, File Google Sheet của bạn giờ đây vừa đóng vai trò quản lý **Lượt chơi theo SĐT**, vừa quản lý thời gian thực **Số Lượng Tồn Kho** của các phần thưởng.

Thay vì phải tạo các bảng một cách thủ công dễ gây nhầm lẫn tên cột, tôi đã thiết kế cho bạn một đoạn mã "Tự Động Thiết Lập Tất Cả".

## Bước 1: Dán Mã Google Apps Script mới
1. Tạo một file Google Sheet Mới Tinh (hoặc dùng file cũ đều được).
2. Từ Menu Sheet, bấm **Tiện ích mở rộng > Apps Script**.
3. Xoá toàn bộ mã chữ cũ đang có trên màn hình.
4. Copy và dán toàn bộ đoạn mã v3 tuyệt đối siêu cấp VIP pro này vào:

```javascript
// Khai báo tên các Sheet cho dễ bảo trì
const SHEET_USERS = "Users";
const SHEET_INVENTORY = "Inventory";
const SHEET_LOGS = "Logs";

// ==========================================
// HÀM TỰ ĐỘNG TẠO BẢNG & DỮ LIỆU MẪU (CHẠY 1 LẦN DUY NHẤT)
// ==========================================
function setupEnvironment() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Khởi tạo Sheet Users
  var userSheet = ss.getSheetByName(SHEET_USERS);
  if (!userSheet) {
    userSheet = ss.insertSheet(SHEET_USERS);
    userSheet.appendRow(["Số Điện Thoại", "Lượt Chơi", "Tên Khách"]);
    userSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#d9ead3");
  }

  // 2. Khởi tạo Sheet Logs
  var logSheet = ss.getSheetByName(SHEET_LOGS);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOGS);
    logSheet.appendRow(["Thời Gian", "Số Điện Thoại", "Giải Thưởng"]);
    logSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#fff2cc");
  }

  // 3. Khởi tạo Sheet Inventory và Nạp Dữ Liệu Các Gói Lì Xì
  var invSheet = ss.getSheetByName(SHEET_INVENTORY);
  if (!invSheet) {
    invSheet = ss.insertSheet(SHEET_INVENTORY);
    invSheet.appendRow(["Tên Giải", "Lời Chúc", "Số Lượng Còn Lại", "Là Lời Chúc? (TRUE/FALSE)"]);
    invSheet.getRange("A1:D1").setFontWeight("bold").setBackground("#fce5cd");
    
    // Nạp data mặc định cho chủ thớt (Cứ sửa tẹt ga nhé!)
    var defaultPrizes = [
        ["Lộc Khai Xuân", "10.000 VNĐ", 100, false],
        ["Lộc Đầu Năm", "50.000 VNĐ", 50, false],
        ["Phát Tài Phát Lộc", "100.000 VNĐ", 20, false],
        ["Đại Cát Đại Lợi", "200.000 VNĐ", 5, false],
        ["Vạn Sự Như Ý", "500.000 VNĐ", 1, false],
        ["Sức Khoẻ Dồi Dào", "Ăn No Chóng Lớn", 999, true],
        ["Thăng Quan Tiến Chức", "Công Việc Thuận Lợi", 999, true],
        ["May Mắn Cả Năm", "Tình Duyên Viên Mãn", 999, true],
        ["Thêm Lộc Thêm Tài", "Tiền Vào Như Nước", 999, true]
    ];
    
    for (var i = 0; i < defaultPrizes.length; i++) {
        invSheet.appendRow(defaultPrizes[i]);
    }
  }

  // Căn chỉnh giao diện cho đẹp mắt
  try { ss.deleteSheet(ss.getSheetByName("Trang tính 1")); } catch(e) {}
  try { ss.deleteSheet(ss.getSheetByName("Trang tính 2")); } catch(e) {}
  
  // Bật Popup xác nhận đã Xong Set Up
  SpreadsheetApp.getUi().alert("Hệ thống Database Serverless Lì Xì đã sẵn sàng! Mời sếp qua Bước 2: Deploy.");
}


// ==========================================
// HỆ THỐNG API (KHÔNG ĐƯỢC XÓA) - XỬ LÝ LƯỢT VÀ QUÀ
// ==========================================

// Hàm xử lý yêu cầu GET (Lấy dữ liệu Lượt chơi & Kho Quà)
function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inventorySheet = ss.getSheetByName(SHEET_INVENTORY);
  
  // Hành động 1: Lấy danh sách kho quà (Không cần SĐT, load ngay khi vào Web)
  if (action === 'get_inventory') {
      var inventory = [];
      var dataInv = inventorySheet.getDataRange().getValues();
      for (var j = 1; j < dataInv.length; j++) {
         var qty = parseInt(dataInv[j][2]) || 0;
         if (qty > 0) {
             inventory.push({
                 title: dataInv[j][0],
                 text: dataInv[j][1],
                 isWish: String(dataInv[j][3]).toUpperCase() === 'TRUE'
             });
         }
      }
      return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          inventory: inventory
      })).setMimeType(ContentService.MimeType.JSON);
  }

  // Hành động 2: Kiểm tra Đăng nhập & Lượt chơi
  if(action === 'login') {
    var phone = e.parameter.phone;
    var name = e.parameter.name;
    var userSheet = ss.getSheetByName(SHEET_USERS);
    
    // 1. Kiểm tra Lượt chơi trong sheet Users
    var userTurns = 0;
    var userFound = false;
    var dataUsers = userSheet.getDataRange().getValues();
    
    // Xử lý xoá số 0 ở đầu để so sánh (Google Sheet hay tự cắt số 0 của SĐT)
    var normalizedInputPhone = String(phone).replace(/\\D/g,'').replace(/^0+/, '');

    for (var i = 1; i < dataUsers.length; i++) {
        var sheetPhone = String(dataUsers[i][0]).replace(/\\D/g,'').replace(/^0+/, '');
        if (sheetPhone === normalizedInputPhone) {
            userTurns = parseInt(dataUsers[i][1]) || 0;
            userFound = true;
            break;
        }
    }
    
    // Sinh Khách Hàng mới toanh vào Data
    if (!userFound) {
       userSheet.appendRow([phone, 0, name]);
    }
    
    // 2. Lấy danh sách Quà Tặng còn tồn kho
    var inventory = [];
    var dataInv = inventorySheet.getDataRange().getValues();
    for (var j = 1; j < dataInv.length; j++) {
       var qty = parseInt(dataInv[j][2]) || 0;
       if (qty > 0) {
           inventory.push({
               title: dataInv[j][0],
               text: dataInv[j][1],
               isWish: String(dataInv[j][3]).toUpperCase() === 'TRUE'
           });
       }
    }
    
    // 3. Trả kết quả JSON về Web
    if (userTurns > 0) {
      if(inventory.length === 0) {
         return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Rất tiếc, kho quà đã hết sạch. Admin sẽ bổ sung sau."})).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          turns: userTurns,
          inventory: inventory
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Bạn chưa có lượt chơi!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
}

// Hàm xử lý yêu cầu POST (Trừ lượt, Trừ quà và Lưu Log khi có người trúng Quà)
function doPost(e) {
  var phone = e.parameter.phone;
  var prizeTitle = e.parameter.prizeTitle;
  var prizeText = e.parameter.prizeText;
  
  if (!phone && !prizeTitle) {
    try {
      var data = JSON.parse(e.postData.contents);
      phone = data.phone; prizeTitle = data.prizeTitle; prizeText = data.prizeText;
    } catch(err) {}
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var normalizedInputPhone = String(phone).replace(/\\D/g,'').replace(/^0+/, '');
  
  // 1. Trừ 1 Lượt trong Users
  var userSheet = ss.getSheetByName(SHEET_USERS);
  var dataUsers = userSheet.getDataRange().getValues();
  for (var i = 1; i < dataUsers.length; i++) {
      var sheetPhone = String(dataUsers[i][0]).replace(/\\D/g,'').replace(/^0+/, '');
      if (sheetPhone === normalizedInputPhone) {
          var currentTurns = parseInt(dataUsers[i][1]);
          if (currentTurns > 0) {
             userSheet.getRange(i + 1, 2).setValue(currentTurns - 1); 
          }
          break;
      }
  }
  
  // 2. Trừ 1 Số Lượng Tồn Kho Quà đó Mới Gắp trong Inventory
  var invSheet = ss.getSheetByName(SHEET_INVENTORY);
  var dataInv = invSheet.getDataRange().getValues();
  for (var j = 1; j < dataInv.length; j++) {
      if (dataInv[j][0] == prizeTitle) {
          var currentQty = parseInt(dataInv[j][2]);
          if (currentQty > 0) {
              invSheet.getRange(j + 1, 3).setValue(currentQty - 1);
          }
          break;
      }
  }
  
  // 3. Mở sổ ghi tên Trúng Giải vào Log
  var logSheet = ss.getSheetByName(SHEET_LOGS);
  logSheet.appendRow([new Date(), phone, prizeTitle + " - " + prizeText]);
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}
```

5. Nhấn Save (biểu tượng cái Đĩa mềm).

## Bước 2: Kích Hoạt Hệ Thống "Xây Nhà" Tự Động
1. Hãy quan sát trên thanh công cụ Của Apps Script, ngay kế bên chữ **Chạy (Run)** và **Gỡ lỗi (Debug)**, sẽ có 1 cái hộp Chọn (Dropdown box) hiện chữ `doGet` hoặc `setupEnvironment`.
2. Vui lòng bấm vào hộp đó và chọn chữ **`setupEnvironment`**.
3. Bấm Nút Bấm **Chạy (Run)**.
4. Một cái bảng báo Quyền (Authorization Required) sẽ hiện lên. Bạn Bấm Review Permissions -> Chọn tk Google của bạn -> Advanced (Nâng Cao) -> "Go to Lixi Script (unsafe)". Chọn **Allow**.
5. Nhảy qua File Sheet gốc dòm thành quả. Bùm! 3 Sheet đã được Tự động tạo và Trang Trí Header tô màu cẩn thận với 999 Món quà được bày biện sẵn!

## Bước 3: Triển Khai App Script thành WebAPI và lấy Liên Kết (URL)
1. Nhấn **Triển Khai (Deploy) > Buổi triển khai mới (New deployment)**.
2. Tại Loại Chọn Hình Bánh Răng (Select type) bên góc Trái mờ mờ trên màn hình: Hãy click vô và check chọn **Web App**.
3. Tại phần "Thực thi dưới dạng": CHỌN TAY THÀNH CHỮ **`TÔI` (ME)**. (Rất quan Trọng).
4. Tại phần "Quyền truy cập": Chọn **Bất kỳ ai (Anyone)**.
5. Cuối cùng bấm chữ **Triển Khai (Deploy) >**.
6. **Sao chép URL Web app** (Đoạn Code Loằng Ngoằng Dài Dài Bắt đầu bằng chữ https://script.google.com/...)
7. Vào file code Frontend `script.js` ở dòng số 3, thay thế vùng giữa 2 chữ ngoặc kép `""` cái URL đó.
8. Hoàn tất & Tận hưởng!

## Cách Bơm Lượt Chơi Nữ Hoàng Cho Khách:
Mã QR MoMo đã được ghim sẵn. 
- Mở file Google Sheet, qua tab `Users`. Tìm Số Điện Thoại đó.
- Sửa số Ô Lược (ví dụ SĐT đó đag bị 0 Lượt). Đổi lẹ từ `0` thành `1` (hoặc chục Lượt tuỳ tâm).
- Nhắn khách: "Tài trợ em 5 xị mà Em mới check Lượt có rồi đó nghen chị", Bảo khách load lại trang Lì xì F5 phát là thấy liền. Khách cứ quay, Quà cứ trừ dần dần đến hết nhé sếp!
