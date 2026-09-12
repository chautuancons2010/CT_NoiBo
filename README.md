# Hệ thống nội bộ Châu Tuấn

Foundation cho hệ thống quản trị nội bộ Châu Tuấn, xây bằng Next.js App Router, TypeScript strict và Supabase-ready architecture.

## Stack

- Next.js App Router cho routing thật, deep link và production build.
- React + TypeScript strict cho UI.
- CSS design tokens trong `src/app/globals.css`.
- Zod cho validation client/server.
- Supabase-ready client/server boundary, chưa commit secret.
- Vitest cho test foundation.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000/dashboard`.

## Environment

Copy các biến từ `.env.example` sang `.env.local` và điền Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng server-side.

## Quality gate

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Supabase

Migration nền tảng nằm tại `supabase/migrations/202609090001_foundation_system_primitives.sql`.

Prompt 1 chỉ tạo system primitives: account mapping, role/permission, configuration, audit log, file metadata và webhook foundation. Không tạo domain tables cho nhân sự, chấm công, kho hoặc xuất nhập khẩu ở bước này.
Tài liệu module theo dõi dự án: [docs/project-monitoring.md](docs/project-monitoring.md).
