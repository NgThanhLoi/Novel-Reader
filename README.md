# Trình Đọc Truyện & Quản Lý Thư Viện (Cloudflare Serverless)

Ứng dụng đọc và quản lý thư viện tiểu thuyết trực tuyến tốc độ cao, hỗ trợ **EPUB**, **MOBI**, **JSON**, **TXT** với kiến trúc **Full-stack Cloudflare Pages + Functions + D1 Database + Workers KV + R2 Storage**.

---

## 1. Cấu trúc dự án sẵn sàng cho Cloudflare Pages
- `functions/api/novels/[[path]].ts`: Cloudflare Pages Functions (API Edge Serverless).
- `schema.sql`: Lược đồ SQL khởi tạo bảng trên **Cloudflare D1**.
- `wrangler.toml`: File cấu hình Cloudflare bindings (D1, KV, R2).
- `src/`: Mã nguồn giao diện React 19 + Tailwind CSS + Lucide Icons + Bộ giải mã EPUB/MOBI.

---

## 2. Các bước đưa lên GitHub & Triển khai Cloudflare Pages

### Bước 1: Đưa project lên GitHub
1. Trong giao diện Google AI Studio, bạn có thể bấm vào menu biểu tượng **Settings / Export** ở góc trên cùng và chọn **Export to GitHub** (hoặc tải ZIP về).
2. Nếu tải về máy, mở terminal trong thư mục và thực hiện:
   ```bash
   git init
   git add .
   git commit -m "feat: initial novel reader app with cloudflare serverless"
   git branch -M main
   git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
   git push -u origin main
   ```

---

### Bước 2: Tạo D1 Database, KV & R2 trên Cloudflare
Trong terminal máy tính của bạn (đã cài Node.js):

1. Đăng nhập Cloudflare CLI:
   ```bash
   npx wrangler login
   ```

2. Tạo cơ sở dữ liệu D1:
   ```bash
   npx wrangler d1 create novel-library-d1
   ```
   *Sao chép `database_id` được in ra màn hình và dán vào file `wrangler.toml`.*

3. Khởi tạo cấu trúc bảng D1 từ file `schema.sql`:
   ```bash
   npx wrangler d1 execute novel-library-d1 --file=schema.sql --remote
   ```

4. Tạo Workers KV cache:
   ```bash
   npx wrangler kv:namespace create NOVEL_CACHE
   ```
   *Sao chép `id` dán vào `wrangler.toml`.*

5. Tạo R2 Bucket:
   ```bash
   npx wrangler r2 bucket create novel-storage-r2
   ```

---

### Bước 3: Kết nối GitHub với Cloudflare Pages
1. Truy cập [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Chọn kho lưu trữ GitHub bạn vừa đẩy lên.
3. Trong phần **Build settings**:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Bấm **Save and Deploy**.
5. Sau khi deploy lần đầu, vào **Settings** của Pages project trên Dashboard:
   - Mục **Functions** > **D1 database bindings**: Thêm variable name `DB` trỏ đến `novel-library-d1`.
   - Mục **Functions** > **KV namespace bindings**: Thêm variable name `NOVEL_CACHE` trỏ đến `NOVEL_CACHE`.
   - Mục **Functions** > **R2 bucket bindings**: Thêm variable name `NOVEL_BUCKET` trỏ đến `novel-storage-r2`.
6. Thực hiện **Retry deployment** hoặc commit code mới để Pages Functions nhận toàn bộ bindings.

---

## 3. Chạy thử nghiệm cục bộ (Local Dev)
```bash
# Cài đặt dependencies
npm install

# Khởi chạy frontend
npm run dev

# Hoặc chạy mô phỏng toàn bộ Cloudflare Pages + Functions + D1 cục bộ:
npx wrangler pages dev dist
```
