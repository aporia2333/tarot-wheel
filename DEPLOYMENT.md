# 部署与安全配置

本项目使用 Supabase Auth、PostgreSQL 行级安全（RLS）和服务端 AES-256-GCM 加密保存抽牌历史。生产环境必须配置以下环境变量。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
READINGS_ENCRYPTION_KEY=your-32-byte-base64-key
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash
```

`READINGS_ENCRYPTION_KEY` 与 `DEEPSEEK_API_KEY` 都只能放在服务器端环境变量，绝不能使用 `NEXT_PUBLIC_` 前缀，也绝不能提交进 Git。加密密钥丢失后，旧历史记录无法解密。

## Supabase

在 Supabase SQL Editor 执行 [`supabase/migrations/20260820_create_tarot_readings.sql`](supabase/migrations/20260820_create_tarot_readings.sql)。该迁移会建立历史表，并通过 RLS 确保用户只能访问自己的记录。

在 `Authentication > URL Configuration` 中设置：

```text
Site URL: https://your-domain.example
Redirect URLs:
https://your-domain.example/**
http://localhost:3000/**
```

若要支持无需邮箱的抽牌，在 `Authentication > Providers` 中开启 `Allow anonymous sign-ins`。匿名访客同样有独立身份、RLS 隔离和加密历史，但清除浏览器数据或换设备后无法恢复记录。

## DeepSeek AI 解读

AI 解读仅对正式登录账号开放，以保护 API 额度。服务器会读取当前用户自己的加密历史、解密后将问题、Context、牌阵及抽到的牌发送给 DeepSeek，要求其返回逐张牌解读与综合总结；结果会重新加密后保存到同一条历史记录中。

正式上线前，在 Vercel 的 Production 环境变量中配置所有五项变量。每次推送 `main` 分支后，Vercel 会自动部署。
