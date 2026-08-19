# 上线配置指南

本项目的云端历史记录使用 Supabase Auth、PostgreSQL 行级安全（RLS）和服务端 AES-256-GCM 加密。没有配置 Supabase 时，项目会保留原来的本机浏览器存储模式，方便本地体验；**生产环境必须配置以下步骤**，否则不会有账号隔离或跨设备同步。

## 1. 创建 Supabase 项目

1. 新建一个 Supabase 项目。
2. 在 `Authentication > Providers` 中启用 Email。
3. 建议保留“确认邮箱”开启，并在 `Authentication > URL Configuration` 中填写生产站点地址，例如 `https://tarot.example.com`。
4. 在 `Project Settings > API` 取得 Project URL 和 anon/publishable key。anon key 可以给前端使用；**service_role key 绝不能放入本项目或 Vercel 的 `NEXT_PUBLIC_` 环境变量**。

## 2. 建表及访问隔离

将 [`supabase/migrations/20260820_create_tarot_readings.sql`](supabase/migrations/20260820_create_tarot_readings.sql) 的内容完整贴进 Supabase 的 SQL Editor 并执行。

这会创建 `tarot_readings` 表并启用 RLS。每一条 `SELECT`、`INSERT`、`UPDATE`、`DELETE` 都必须匹配当前登录用户的 `user_id`；前端即使篡改请求或猜中别人的 UUID，也不能读到对方记录。

## 3. 配置密钥

复制 `.env.example` 为 `.env.local`，填入：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
READINGS_ENCRYPTION_KEY=your-32-byte-base64-key
```

在 PowerShell 生成最后一项：

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

`READINGS_ENCRYPTION_KEY` 仅在服务器端使用，用来加密问题、补充信息、抽牌结果等整个记录负载。它不可丢失；丢失后旧记录无法解密。请把它存进可靠的密码管理器或密钥管理服务，勿提交到 Git。

## 4. 部署

1. 将代码推送至 GitHub 或其他 Git 远程仓库。
2. 在 Vercel 导入该仓库。
3. 在 Vercel 项目的 Environment Variables 中配置上面的三个变量，分别覆盖 Production、Preview（如需要）和 Development。
4. 部署后，把 Vercel 的正式域名写回 Supabase 的 Site URL 和 Redirect URLs。

本版本没有 DeepSeek 或任何第三方 AI 调用；不会将用户提问发送给 AI 服务。

## 5. 上线验收

用两个测试邮箱分别创建账户，并确认：

1. A 创建的记录能在 A 的另一台设备登录后看到。
2. B 的历史列表中没有 A 的记录。
3. A 复制 B 的结果链接，访问后显示“未找到”，不会显示 B 的内容。
4. 在 Supabase Table Editor 中，`encrypted_payload` 只有 `ciphertext`、`iv`、`tag` 等密文，不含问题明文。
5. 未登录请求 `/api/readings` 返回 401。

## 运行与密钥轮换

当前加密格式带有 `version: 1`。未来若轮换密钥，应保留旧密钥用于读取旧记录，按批次解密后用新密钥重新加密，再移除旧密钥；不能直接替换环境变量。
