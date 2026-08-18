# Prompt hướng dẫn build Web Photobooth — cho Claude Design

## Bối cảnh tổng quan
Build một web photobooth simulation, cho phép người dùng chụp 4 tấm ảnh liên tiếp và ghép vào 1 dải photobooth dọc (giống photobooth thật ngoài đời). Tất cả resource hình ảnh (khung, background, giao diện) do người dùng tự thiết kế bằng Adobe Illustrator — Claude không tự thiết kế giao diện, chỉ code để tích hợp resource có sẵn.

**Cách cung cấp resource — 2 loại file cho mỗi thành phần:**
- **PNG (độ phân giải cao)** — file hiển thị thật, mang đầy đủ hiệu ứng (gradient, blend mode, outer glow...) mà SVG không lưu lại được. Đây là file sẽ được dùng để hiển thị lên web.
- **SVG (chỉ dùng định vị)** — bố cục y hệt file PNG tương ứng, nhưng chỉ chứa các hình chữ nhật đánh dấu vị trí (`camera-window`, `slot-x`, `booth`...), không mang style/hiệu ứng thật. File này không hiển thị ra ngoài, chỉ dùng để code đọc tọa độ (x, y, width, height) rồi định vị chính xác vùng camera/ảnh/nút bấm lên trên nền PNG.
- Với các thành phần cần định vị (khung chụp, dải sample, landing có booth click được), Ý cần gửi **cả 2 file PNG + SVG cho cùng 1 thành phần, cùng kích thước/tỷ lệ** để tọa độ khớp chính xác giữa 2 file.
- Với các thành phần không cần định vị vị trí bên trong (nút bấm, icon, background màn hình chụp không có phần tương tác), chỉ cần gửi **PNG**, không cần file SVG đi kèm.

---

## 1. Flow tổng thể theo thiết bị

### Trên mobile
- Màn hình mở đầu (landing) **hiển thị theo đúng hướng thật của máy** — nếu user đang cầm dọc thì thấy bố cục dọc, nếu đang cầm ngang thì thấy bố cục ngang (không ép cố định 1 hướng ở bước này).
- User bấm vào **hình cái booth** trên landing để bắt đầu vào chụp.
- Sau khi bấm vào booth: nếu máy **đang ở hướng dọc**, hiện **overlay yêu cầu xoay ngang** — overlay này do Claude tự build hoàn toàn bằng code (nền trắng, opacity ~50%, kèm dòng chữ **"Turn your phone sideways to start!"** + icon xoay điện thoại dựng bằng CSS/SVG đơn giản), **không cần Ý cung cấp asset thiết kế riêng cho phần này**. Overlay chỉ hiển thị khi: (a) user vừa bấm vào booth, VÀ (b) máy vẫn đang ở hướng dọc tại thời điểm đó. User tự xoay ngang điện thoại, overlay tự ẩn khi phát hiện máy đã chuyển sang ngang, rồi vào màn hình chụp chính thức.
- Nếu máy đã sẵn ở hướng ngang lúc bấm booth, bỏ qua overlay, vào thẳng màn hình chụp.
- Do trình duyệt không ép xoay màn hình được 100% (Screen Orientation API không hỗ trợ đầy đủ trên mọi trình duyệt, đặc biệt Safari iOS), xử lý bằng CSS `orientation` media query để style lại theo hướng thực tế của máy tại từng thời điểm (landing, overlay nhắc xoay, màn hình chụp).

### Trên desktop
- Không mô phỏng hiệu ứng "xoay dọc sang ngang" như mobile — vì màn hình desktop vốn đã ngang, xoay sẽ không có ý nghĩa và trông giả tạo.
- Landing desktop và màn hình chụp đều thiết kế ở bố cục ngang từ đầu, có transition chuyển cảnh (fade/slide) bình thường giữa các bước, không có animation xoay.
- Landing desktop và mobile dùng chung ngôn ngữ thiết kế (màu, font, mood) nhưng khác bố cục.

### Cách phân biệt thiết bị (kỹ thuật)
- Dùng media query theo loại thiết bị: `pointer: coarse` + `hover: none` (detect touch device) hoặc breakpoint theo `width`, KHÔNG dùng `orientation: portrait/landscape` để quyết định có hiệu ứng xoay hay không (vì máy tính bảng/màn hình dọc sẽ khiến logic sai).

---

## 2. Cấu trúc chụp ảnh

- Frame photobooth là **dải dọc gồm 4 ảnh** (4 khung hình).
- User chụp **từng khung một**, tuần tự.
- **Timer tùy chỉnh**: không dùng timer / 3 giây / 10 giây (setTimeout đơn giản trước khi trigger capture).
- Sau khi chụp mỗi tấm: hiện màn hình preview để user chọn **"Chụp lại"** hoặc **"Tiếp tục"** sang khung kế tiếp.

### Layout màn hình lúc chụp
- **Camera preview**: chỉ 1 khung to, nằm chính giữa màn hình — dùng chung cho cả 4 lượt chụp (không phải overlay đồng thời cả 4 ô).
- **Dải sample 4-ô**: nằm **bên cạnh** camera preview, đóng vai trò xem trước kết quả cuối cùng. Ban đầu 4 ô trống/placeholder. Chụp xong tấm nào, tấm đó được thả vào đúng vị trí ô tương ứng trong dải ngay lập tức, để user thấy tiến độ real-time. **Sau khi chụp đủ 4 tấm, chính dải này (đã đầy đủ 4 ảnh + khung trang trí) là file ảnh cuối cùng để user tải về** — không có bước ghép/tạo file xuất riêng biệt nào khác.
- Dải sample khi hiển thị ảnh đã chụp cần **đè khung trang trí lên trên ảnh** (giống bản in thật, không phải ảnh thô không viền).

### Camera + khung overlay
- Tỷ lệ khung camera: **4:3**.
- Mỗi lượt chụp (1 trong 4 khung) có **khung SVG riêng đè lên camera preview** — để user thấy mình nằm trong khung thật, dễ canh bố cục trước khi bấm chụp.
- Khung overlay **to hơn** vùng camera thực tế (không phải khung khít đúng camera).
- **Dùng chung 1 file khung cho cả bước canh pose và bước xem lại ảnh sau khi chụp** — vì đây là cùng 1 khung preview, chỉ khác là lớp bên dưới khung đổi từ video camera (lúc canh pose) sang ảnh tĩnh vừa chụp (lúc xem lại để chọn giữ/chụp lại). Khung trang trí giữ nguyên, không đổi qua 2 bước.
- Vì camera mobile mặc định thường không ra đúng 4:3, cần crop video stream về đúng 4:3 trước khi hiển thị, để khung khớp chính xác vị trí mặt user (WYSIWYG — chụp ra sao thấy vậy khi đang canh pose, không phải crop sau khi chụp).

---

## 3. Quy cách file PNG (hiển thị) + SVG (định vị) cần chuẩn bị

### Nguyên tắc chung khi export PNG từ Illustrator
- Xuất qua **File > Export > Export As > PNG**, hoặc **File > Export > Export for Screens** (khuyến khích dùng Export for Screens vì dễ xuất hàng loạt nhiều tỷ lệ/độ phân giải cùng lúc).
- **Độ phân giải cao**: xuất tối thiểu **@2x** (retina), khuyến khích **@3x** cho các màn hình full-screen (landing, background, khung, dải sample) vì đây là các thành phần chiếm phần lớn màn hình, dễ lộ vỡ nét nếu độ phân giải thấp. Nút bấm/icon xuất **@2x** là đủ. Lưu ý: **thu nhỏ ảnh từ độ phân giải cao xuống hiển thị nhỏ hơn luôn giữ được độ nét** (không mờ), chỉ phóng to từ file nhỏ lên mới bị vỡ nét — nên xuất @2x/@3x rồi để CSS/canvas scale nhỏ lại cho từng loại màn hình hoặc kích thước xuất file là an toàn.
- Giữ nguyên **nền trong suốt** (Transparent Background) khi export, để các vùng không có nội dung không bị đè nền trắng.
- Kích thước PNG xuất theo đúng **tỷ lệ màn hình thật** sẽ hiển thị (xem mục "3 tỷ lệ màn hình cần xuất" bên dưới) — không xuất tỷ lệ tùy ý rồi để CSS kéo giãn, vì sẽ làm sai bố cục so với thiết kế gốc.

### Nguyên tắc chung khi export SVG định vị từ Illustrator
- File SVG định vị **chỉ chứa các hình chữ nhật đánh dấu vị trí** (không chứa hoạ tiết/hiệu ứng thật — phần đó nằm ở file PNG).
- Artboard của file SVG định vị và file PNG tương ứng cần xuất từ **cùng 1 artboard gốc trong file .ai** (cùng tỷ lệ khung hình/aspect ratio, không dịch chuyển vị trí object giữa 2 lần xuất). **Không bắt buộc kích thước tuyệt đối phải giống hệt nhau** — PNG hoàn toàn có thể xuất @2x/@3x lớn hơn SVG (SVG xuất mặc định @1x) mà không cần xuất lại, vì code sẽ quy đổi tọa độ rectangle trong SVG về **tỷ lệ phần trăm (0–1)** dựa trên kích thước artboard của chính file SVG, rồi áp tỷ lệ đó lên kích thước thật của PNG — vị trí luôn khớp chính xác dù 2 file chênh lệch độ phân giải.
- Export qua **File > Export > Export As > SVG**, Advanced Options: Styling chọn **"Presentation Attributes"** hoặc **"Inline Style"** (không chọn "Internal CSS" — vì Internal CSS dùng class tự sinh kiểu `st0`, `st1` dễ bị trùng tên khi nhúng nhiều file SVG cùng lúc vào 1 trang, gây đè style sai giữa các file); Decimal places để **2–3 chữ số**; có thể tick **"Minify"**.
- Mỗi rectangle đánh dấu đặt tên object rõ ràng trong AI (vd: `camera-window`, `slot-1`, `booth`) — tên này giữ nguyên thành `id` trong SVG, dùng để code đọc tọa độ.
- Màu của các rectangle này không quan trọng (sẽ không hiển thị ra ngoài, chỉ dùng lấy tọa độ).

### 3 tỷ lệ màn hình cần xuất PNG
- **Desktop ngang** — dùng cho toàn bộ giao diện desktop (landing + màn hình chụp).
- **Mobile ngang** — dùng cho màn hình chụp trên mobile (sau khi đã vào booth và xoay ngang).
- **Mobile dọc** — **chỉ áp dụng cho landing page mobile** (trước khi bấm vào booth, lúc máy còn đang cầm dọc).

> Lưu ý: khung chụp (`frame-1..4`) và dải sample (`strip-complete`) có tỷ lệ nội dung cố định 4:3 (dùng cho vùng camera/ảnh), không gắn với tỷ lệ toàn màn hình — nên các file này **dùng chung 1 bản cho cả desktop và mobile ngang** (vì cùng hiển thị trong màn hình chụp dạng ngang), không cần tách riêng theo desktop/mobile. Chỉ **landing** là thực sự cần tách theo cả 3 tỷ lệ màn hình, vì bố cục landing khác nhau hoàn toàn giữa desktop/mobile ngang/mobile dọc. Ý xác nhận lại điểm này giúp mình trước khi export, để tránh xuất dư hoặc thiếu file.

### File khung chụp (4 khung)
Mỗi khung là **1 cặp file PNG + SVG cùng tỷ lệ**:
1. **PNG** — khung trang trí đầy đủ hiệu ứng, nền trong suốt ở vùng camera.
2. **SVG định vị** — chỉ chứa 1 rectangle tên `camera-window`, đúng vị trí/tỷ lệ **4:3** như vùng trong suốt trên file PNG.
- Vùng trong suốt trên PNG và vị trí `camera-window` trên SVG phải khớp chính xác nhau (cùng tọa độ), vì code sẽ dùng tọa độ từ SVG để đặt video/ảnh vào đúng chỗ trống trên PNG.

### File dải sample 4-ô hoàn chỉnh
1 cặp file PNG + SVG:
1. **PNG** — khung trang trí dải đầy đủ hiệu ứng, 4 vùng trong suốt tương ứng 4 vị trí ảnh.
2. **SVG định vị** — chứa 4 rectangle tên `slot-1`, `slot-2`, `slot-3`, `slot-4` (theo đúng thứ tự vị trí thật trong dải, từ trên xuống dưới), mỗi rectangle tỷ lệ **4:3**, đúng khớp vị trí 4 vùng trong suốt trên PNG.

**File này có 2 vai trò:**
- Trong lúc chụp: hiển thị real-time bên cạnh camera preview, thả ảnh vào từng slot khi chụp xong.
- Sau khi chụp đủ 4 tấm: dùng làm nguồn để dựng **file kết quả cuối cùng gồm 2 dải giống hệt nhau đặt cạnh nhau** (xem chi tiết ngay bên dưới) — không phải chỉ 1 dải đơn.

**Cấu trúc file tải về cuối cùng — 2 dải cạnh nhau:**
- Ảnh final KHÔNG phải là 1 dải đơn, mà là **2 bản copy giống hệt nhau của cùng 1 dải 4 ảnh, đặt liền kề nhau theo chiều ngang** trong cùng 1 file ảnh (đúng kiểu photobooth truyền thống — để cắt đôi chia 2 người hoặc giữ 1 bản dự phòng). Cả 2 dải dùng chung data ảnh đã chụp (không chụp lại/không có 2 bộ ảnh khác nhau).
- **Kích thước 1 dải đơn: 600 x 1800px** (đã chốt). Ảnh final ghép 2 dải cạnh nhau có kích thước tổng **1200 x 1800px** (2 dải x 600px chiều ngang, giữ nguyên 1800px chiều dọc) — **đã chốt chính xác**.
- Code sẽ ghép ảnh vào canvas theo tọa độ 4 slot (đọc từ `strip-complete.svg`) để dựng 1 dải hoàn chỉnh kích thước 600x1800px, sau đó **vẽ dải đó 2 lần cạnh nhau** lên canvas final kích thước 1200x1800px, đè `strip-complete.png` lên mỗi bản tương ứng, rồi export ra PNG/JPEG khi user bấm tải về.

**Cần cung cấp đủ:** 4 cặp file khung (PNG + SVG) + 1 cặp file dải sample (PNG + SVG). Tên file chính xác xem chi tiết ở **Mục 5**.

### Các resource khác cần chuẩn bị thêm
### Landing page & booth
- **Background landing** (3 tỷ lệ: mobile dọc, mobile ngang, desktop) — mỗi tỷ lệ 1 cặp PNG + SVG. PNG chỉ chứa phần nền/trang trí, **không vẽ sẵn hình cái booth vào trong** (vì booth giờ là ảnh riêng, xem bên dưới). SVG chỉ chứa rectangle `booth` để định vị vị trí + kích thước cần đặt ảnh booth vào, theo đúng tỷ lệ của từng màn hình.
- **Ảnh booth**: 1 file PNG riêng, độ phân giải cao, nền trong suốt, dùng chung cho cả 3 tỷ lệ màn hình — code sẽ tự scale ảnh này theo đúng kích thước rectangle `booth` đọc được từ file SVG tương ứng của từng tỷ lệ, không cần Ý tự tạo 3 bản resize khác nhau.
- Vì ảnh booth cần có **hiệu ứng khi nhấn** (feedback lúc user click/tap vào), tách riêng thành ảnh độc lập giúp code dễ áp animation (scale nhẹ, đổi opacity, đổ bóng...) trực tiếp lên ảnh này mà không ảnh hưởng phần background — không cần thiết kế thêm state "pressed" riêng, hiệu ứng nhấn sẽ xử lý bằng CSS/JS. Nếu Ý muốn tự thiết kế hình dạng riêng cho trạng thái đang nhấn (khác hẳn về hình khối, không chỉ là scale/opacity), báo thêm để mình note file `booth-pressed.png` riêng.
- Màn hình chụp (mobile ngang, desktop) — mỗi tỷ lệ 1 cặp PNG + SVG. SVG chứa rectangle định vị: `camera-preview-area`, `strip-preview-area`, `btn-capture`, `btn-retake`, `btn-next`, `icon-timer` (chi tiết xem Mục 5.4).
- Màn hình kết quả sau khi chụp xong (mobile, desktop) — mỗi tỷ lệ 1 cặp PNG + SVG, background riêng biệt với màn hình chụp. SVG chứa rectangle định vị: `final-strip-area`, `btn-download`, `btn-restart` (chi tiết xem Mục 5.5).
- Nút bấm, icon — chỉ cần PNG, không cần SVG định vị.

---

## 4. Các điểm đã chốt

- **Tỷ lệ mỗi ô trong dải 4-ảnh hoàn chỉnh: 4:3** (khớp tỷ lệ camera).
- **Chuyển giữa các tấm (tấm 1 → 2 → 3 → 4)**: không cần transition đặc biệt, chuyển ngay lập tức.
- **Quy trình nhận file**: sau khi Ý gửi đủ các cặp file PNG + SVG (xem chi tiết Mục 5), Claude sẽ kiểm tra một lượt xem đã đủ và đúng cấu trúc yêu cầu (kích thước khớp giữa PNG và SVG, tỷ lệ, id đặt tên, vùng trong suốt trên PNG...) chưa, rồi mới bắt đầu build.
- **Landing tách theo 3 tỷ lệ màn hình** (mobile dọc, mobile ngang, desktop); khung chụp và dải sample dùng chung 1 bản cho cả desktop và mobile ngang (xem chi tiết Mục 3).

---

## 5. Quy ước đặt tên file & layer (BẮT BUỘC — để tránh hỏi lại nhiều lần)

Tên file và tên object/layer trong Illustrator phải đặt **đúng chính xác** như dưới đây (không dấu, không khoảng trắng, dùng dấu gạch ngang `-`). Với các file cần cặp PNG + SVG, 2 file phải **cùng tên gốc**, chỉ khác đuôi mở rộng, để dễ đối chiếu khi code ráp lại.

### 5.1. Khung chụp (dùng chung cho cả "canh pose" và "xem lại ảnh", dùng chung cho cả desktop lẫn mobile ngang)
Mỗi khung là 1 cặp file, cùng tên gốc:
- `frame-1.png` + `frame-1.svg`
- `frame-2.png` + `frame-2.svg`
- `frame-3.png` + `frame-3.svg`
- `frame-4.png` + `frame-4.svg`

Trong đó:
- File `.png`: khung trang trí đầy đủ hiệu ứng (gradient/blend/glow), nền trong suốt ở vùng camera, độ phân giải cao (khuyến khích @3x).
- File `.svg`: chỉ chứa 1 rectangle tên **`camera-window`** (cố định, giống nhau ở cả 4 cặp), tỷ lệ 4:3, đúng khớp vị trí vùng trong suốt trên file `.png` tương ứng.

### 5.2. Dải sample 4-ô hoàn chỉnh (dùng chung cho cả desktop lẫn mobile ngang)
1 cặp file:
- `strip-complete.png` — khung trang trí dải đầy đủ hiệu ứng, 4 vùng trong suốt tương ứng 4 vị trí ảnh. **Tỷ lệ 1:3 (khớp kích thước tải về cố định 600x1800px)**, khuyến khích xuất @2x (1200x3600px) để giữ nét khi code resize xuống đúng 600x1800px lúc ghép file final.
- `strip-complete.svg` — chỉ chứa 4 rectangle tên cố định **`slot-1`**, **`slot-2`**, **`slot-3`**, **`slot-4`** (theo đúng thứ tự vị trí thật trong dải, từ trên xuống dưới), mỗi rectangle tỷ lệ 4:3, đúng khớp vị trí 4 vùng trong suốt trên file `.png`.

### 5.3. Landing page & booth (tách riêng theo 3 tỷ lệ màn hình)
**Background landing** — mỗi tỷ lệ là 1 cặp file, cùng tên gốc:
- `landing-mobile-portrait.png` + `landing-mobile-portrait.svg` — landing mobile khi máy đang ở hướng dọc.
- `landing-mobile-landscape.png` + `landing-mobile-landscape.svg` — landing mobile khi máy đang ở hướng ngang.
- `landing-desktop.png` + `landing-desktop.svg` — landing desktop (không có bản portrait vì luôn hiển thị ngang).

Trong đó:
- File `.png`: chỉ chứa nền/trang trí, **KHÔNG vẽ sẵn hình booth vào trong** (booth là ảnh riêng, xem bên dưới).
- File `.svg`: chỉ chứa 1 rectangle tên **`booth`** (cố định ở cả 3 file) — xác định vị trí (x, y) và kích thước (width, height) cần đặt ảnh booth vào, theo đúng tỷ lệ/bố cục riêng của từng màn hình. 3 file SVG này có thể có tọa độ `booth` khác nhau (vì bố cục landing khác nhau giữa 3 tỷ lệ), không cần giống hệt nhau.

**Ảnh booth** — 1 file riêng, dùng chung cho cả 3 tỷ lệ:
- `booth.png` — ảnh cái booth, nền trong suốt, độ phân giải cao (khuyến khích @3x vì sẽ bị scale ở nhiều kích thước khác nhau tùy màn hình). Code tự động scale ảnh này theo đúng kích thước rectangle `booth` đọc được từ SVG tương ứng của từng tỷ lệ — không cần Ý tạo riêng bản cho mobile dọc/ngang/desktop.
- Nếu muốn thiết kế riêng hình dạng cho trạng thái đang nhấn (khác về hình khối, không chỉ hiệu ứng scale/opacity do code xử lý): thêm file `booth-pressed.png`, cùng nền trong suốt, cùng kích thước gốc với `booth.png`.

### 5.4. Màn hình chụp (booth screen) — cặp PNG + SVG định vị
Mỗi tỷ lệ là 1 cặp file, cùng tên gốc:
- `booth-screen-mobile.png` + `booth-screen-mobile.svg` — màn hình chụp trên mobile (chế độ ngang, sau khi đã vào booth).
- `booth-screen-desktop.png` + `booth-screen-desktop.svg` — màn hình chụp trên desktop.

Trong đó:
- File `.png`: nền/trang trí màn hình chụp, không bao gồm camera preview, dải sample hay nút bấm (các phần này đặt riêng theo tọa độ từ SVG).
- File `.svg`: chứa các rectangle định vị, đặt tên cố định:
  - `camera-preview-area` — vị trí/kích thước khung camera preview (nơi đặt `frame-x.png` cùng video/ảnh chụp).
  - `strip-preview-area` — vị trí/kích thước dải sample (nơi đặt `strip-complete.png` cùng các ảnh đã chụp).
  - `btn-capture` — vị trí nút chụp.
  - `btn-retake` — vị trí nút chụp lại (chỉ hiện ở bước xem lại ảnh).
  - `btn-next` — vị trí nút tiếp tục (chỉ hiện ở bước xem lại ảnh).
  - `icon-timer` — vị trí icon/nút chọn & hiển thị timer (dùng cho cả việc chọn mốc timer: không dùng/3s/10s, và hiển thị đếm ngược lúc đang chụp).
- Nếu có thêm màn hình phụ (vd: màn hình hoàn tất, màn hình tải ảnh về), đặt tên theo pattern `[tên-màn-hình]-screen-mobile.png/.svg` / `-desktop.png/.svg`, và bổ sung rectangle tương ứng (vd: `btn-download`).

### 5.5. Màn hình kết quả (sau khi chụp xong, "result screen") — cặp PNG + SVG định vị
Mỗi tỷ lệ là 1 cặp file, cùng tên gốc:
- `result-screen-mobile.png` + `result-screen-mobile.svg` — màn hình kết quả trên mobile.
- `result-screen-desktop.png` + `result-screen-desktop.svg` — màn hình kết quả trên desktop.

Trong đó:
- File `.png`: nền/trang trí riêng cho màn hình kết quả (khác với nền màn hình chụp), không bao gồm ảnh strip final hay nút bấm (các phần này đặt riêng theo tọa độ từ SVG).
- File `.svg`: chứa các rectangle định vị, đặt tên cố định:
  - `final-strip-area` — vị trí/kích thước hiển thị ảnh kết quả cuối cùng (bản 2 dải đã ghép làm một, xem Mục 3).
  - `btn-download` — vị trí nút tải ảnh về.
  - `btn-restart` — vị trí nút "chụp lại từ đầu" / "one more time".

### 5.6. Nút bấm (chỉ PNG, không cần SVG)
Đặt tên theo pattern `btn-[chức-năng].png`, ví dụ:
- `btn-start.png` — nút bắt đầu chụp (ở landing, nếu tách riêng khỏi hình booth).
- `btn-capture.png` — nút chụp ảnh.
- `btn-retake.png` — nút chụp lại.
- `btn-next.png` — nút tiếp tục sang khung kế.
- `btn-download.png` — nút tải ảnh về (vị trí xác định qua rectangle `btn-download` ở Mục 5.5).
- `btn-restart.png` — nút "one more time" / chụp lại từ đầu (vị trí xác định qua rectangle `btn-restart` ở Mục 5.5).
- Nếu nút có 2 trạng thái (thường/disabled hoặc thường/hover), thêm hậu tố: `btn-capture-default.png`, `btn-capture-disabled.png`.

### 5.7. Icon (chỉ PNG, không cần SVG)
Đặt tên theo pattern `icon-[tên].png`, ví dụ:
- `icon-timer-off.png`, `icon-timer-3s.png`, `icon-timer-10s.png` — 3 icon riêng theo từng trạng thái timer, đổi hình khi user chọn mốc timer khác nhau. Vị trí hiển thị xác định qua rectangle `icon-timer` ở Mục 5.4 (cả 3 icon dùng chung 1 vị trí, chỉ đổi ảnh theo trạng thái đang chọn).
- `icon-close.png`, `icon-back.png` — nếu có nút thoát/quay lại.
- **Không cần cung cấp icon xoay điện thoại** — overlay nhắc xoay ngang (nền trắng opacity ~50%, kèm text tiếng Anh + icon xoay dựng bằng CSS/SVG) do Claude tự build hoàn toàn, xem chi tiết ở Mục 1.

### 5.8. Nguyên tắc chung áp dụng cho MỌI file ở mục 5
- Không dấu tiếng Việt, không khoảng trắng, không viết hoa đầu (dùng `kebab-case` toàn bộ).
- Cặp file PNG + SVG của cùng 1 thành phần phải **trùng tên gốc tuyệt đối** (chỉ khác đuôi mở rộng) và **xuất từ cùng 1 artboard gốc trong file .ai** (cùng tỷ lệ khung hình, không cần cùng kích thước tuyệt đối — PNG có thể xuất @2x/@3x, SVG xuất mặc định @1x là được, code sẽ tự quy đổi theo tỷ lệ phần trăm).
- Mỗi file chỉ chứa nội dung của đúng 1 thành phần (không gộp nhiều nút/icon chung 1 file trừ khi đã note rõ ở trên).
- Nếu phát sinh thêm resource ngoài danh sách này, giữ nguyên pattern đặt tên tương ứng (`landing-`, `booth-screen-`, `result-screen-`, `btn-`, `icon-`, `frame-`, `strip-`) và báo Claude biết tên + mục đích khi gửi file.

---

## 6. Ghi chú kỹ thuật khi build

- Camera access qua `getUserMedia` chỉ hoạt động trên HTTPS (hoặc localhost lúc test) — khi deploy thật cần host có SSL (Netlify, Vercel, GitHub Pages đều free và tự có HTTPS).
- **Thời điểm trigger xin quyền camera**: trình duyệt yêu cầu quyền truy cập camera (`getUserMedia`) chỉ trigger **sau khi user đã vào tới màn hình chụp (booth screen)**, không xin quyền sớm hơn ở bước landing hay lúc đang xem overlay nhắc xoay ngang — tránh làm user bối rối khi popup xin quyền xuất hiện quá sớm, trước khi họ hiểu ngữ cảnh cần dùng camera để làm gì.
- **Cách ráp PNG + SVG định vị**: với mỗi cặp file (vd: `frame-1.png` + `frame-1.svg`), code sẽ đọc tọa độ rectangle từ file `.svg` (không hiển thị file SVG này ra ngoài) để biết chính xác vị trí/kích thước vùng camera hoặc vùng click, sau đó đặt video/ảnh/vùng bấm vào đúng tọa độ đó, và hiển thị file `.png` đè lên trên cùng làm lớp trang trí.
- **Ráp booth lên landing**: với mỗi tỷ lệ màn hình, code đọc tọa độ rectangle `booth` từ file SVG landing tương ứng, scale `booth.png` (dùng chung 1 file gốc) về đúng kích thước đó rồi đặt vào đúng vị trí trên nền `landing-*.png`. Sự kiện click và hiệu ứng nhấn (scale/opacity khi tap) gắn trực tiếp lên ảnh `booth.png` đã đặt.
- Chụp ảnh dùng `<canvas>` để capture frame từ video stream, crop theo đúng tỷ lệ 4:3, sau đó vẽ thêm PNG khung trang trí lên trên bằng canvas API.
- File tải về cuối cùng = **ảnh ghép 2 bản dải giống hệt nhau đặt cạnh nhau, kích thước tổng cố định 1200 x 1800px** (mỗi dải 600x1800px), mỗi dải đã lấp đầy đủ 4 slot bằng ảnh thật, hoàn toàn độc lập với kích thước strip đang hiển thị trên màn hình (dù web đang render to/nhỏ theo desktop hay mobile). Quy trình: (1) ghép 4 ảnh đã crop vào canvas theo tọa độ đọc từ `strip-complete.svg` để dựng 1 dải hoàn chỉnh 600x1800px, đè `strip-complete.png` lên trên; (2) vẽ dải đó thêm 1 lần nữa cạnh bên lên canvas final 1200x1800px; (3) export ra PNG/JPEG khi user bấm tải về.
- Tuyệt đối không lấy kích thước DOM/CSS hiện tại của strip trên màn hình làm kích thước canvas xuất file — 2 giá trị này độc lập nhau, canvas xuất file phải luôn cố định 1200x1800px.
