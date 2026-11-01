# SaigonDrain AI — Frontend demo

Hai giao diện demo cho sản phẩm **SaigonDrain AI** (ngập úng đô thị TP. Hồ Chí Minh), nằm trong một pnpm monorepo:

| App | Mô tả | Dev URL |
| --- | --- | --- |
| `apps/user` | Bản đồ dẫn đường an toàn, dự báo mưa/ngập, báo cáo cộng đồng cho người dân | http://localhost:5173 |
| `apps/admin` | Trung tâm điều hành: Tổng quan, Bản đồ, Báo cáo, Cảnh báo, Người dùng, Phân tích | http://localhost:5174 |

Dữ liệu là dữ liệu mô phỏng phục vụ demo, không có backend. App user dùng tile OpenStreetMap và OSRM công khai để vẽ tuyến đường.

Giao diện theo hướng **“Mực nước”** — thước đo mực nước, đường đồng mức, kênh rạch Sài Gòn; teal sâu cho hành động, cát ấm và coral cho nguy cơ. Token, typography, component và chuẩn accessibility nằm trong [DESIGN.md](DESIGN.md); bối cảnh sản phẩm trong [PRODUCT.md](PRODUCT.md).

## Tech stack

- React 19 + TypeScript 5.7
- Vite 8 + `@vitejs/plugin-react`
- Tailwind CSS v4 (`@tailwindcss/vite`)
- User: `maplibre-gl`
- Admin: `lucide-react`
- Font: Be Vietnam Pro (Google Fonts)

## Cấu trúc

```text
.
├─ apps/
│  ├─ user/                 # React app, port 5173
│  │  └─ src/
│  │     ├─ components/     # layout, map, journey, report, ui
│  │     ├─ data/           # mock data
│  │     ├─ types.ts
│  │     └─ index.css       # design system/global styles
│  └─ admin/                # React app, port 5174
│     └─ src/
│        ├─ components/     # layout, pages, overview, map, reports, alerts, users, ui
│        ├─ data/           # mock data
│        ├─ lib/            # analytics helpers
│        ├─ types.ts
│        └─ index.css
├─ docs/
│  ├─ saigondrain-product-brief.pdf
│  └─ plans/
├─ AGENTS.md                # hướng dẫn làm việc trong repo
├─ PRODUCT.md               # product truth
├─ DESIGN.md                # design system "Mực nước"
├─ package.json             # workspace scripts
└─ pnpm-workspace.yaml
```

## Yêu cầu

- Node.js >= 22
- pnpm 10+ (repo đang dùng pnpm 12)

## Cài đặt

```bash
pnpm install
```

## Chạy development

Chạy cả hai app song song:

```bash
pnpm dev
```

- User: http://localhost:5173
- Admin: http://localhost:5174

Chạy riêng từng app:

```bash
pnpm dev:user
pnpm dev:admin
```

Port được khai báo trong `apps/*/vite.config.ts` và có thể override bằng biến môi trường `PORT`:

```bash
# Git Bash / macOS / Linux
PORT=6001 pnpm dev:user

# PowerShell
$env:PORT=6001; pnpm dev:user
```

`strictPort` đang bật, nên nếu port bị chiếm app sẽ báo lỗi thay vì tự đổi port.

## Build & kiểm tra

```bash
pnpm build          # build cả hai app
pnpm build:user
pnpm build:admin
pnpm typecheck      # tsc --noEmit cho cả hai app
```

Preview bản build:

```bash
pnpm preview:user   # http://localhost:4173
pnpm preview:admin  # http://localhost:4174
```

## Tài liệu

- [Mô tả sản phẩm](docs/saigondrain-product-brief.pdf)
- [Design system “Mực nước”](DESIGN.md)
- [Bối cảnh sản phẩm](PRODUCT.md)
- [Kế hoạch prototype User](docs/plans/user-map-prototype.md)
- [Kế hoạch prototype Admin](docs/plans/admin-dashboard.md)

> Tài liệu gốc dùng tên **DrainGuard AI**; giao diện và repo đã được chuẩn hóa thành **SaigonDrain AI**.
