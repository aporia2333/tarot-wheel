# 部署与安全配置

本项目使用 Supabase Auth、PostgreSQL 行级安全（RLS）和服务端 AES-256-GCM 加密保存抽牌历史。生产环境必须配置以下环境变量。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
READINGS_ENCRYPTION_KEY=your-32-byte-base64-key
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash
AI_ALLOWED_EMAILS=allowed-user@example.com,another-user@example.com
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

访客抽牌需要在 Supabase 项目的 `Authentication > Sign In / Providers` 中开启并保存 `Allow anonymous sign-ins`（部分控制台版本显示为 `Providers` 或 `Anonymous`）。这是 Supabase 项目级权限，应用代码或公开匿名 Key 无法开启它。设置说明见 [Supabase 匿名登录文档](https://supabase.com/docs/guides/auth/auth-anonymous)。

匿名访客同样有独立身份、RLS 隔离和加密历史，但清除浏览器数据或换设备后无法恢复记录。访客入口会复用已有的匿名或正式账号会话，避免重复创建身份而丢失历史；登录后返回原来访问的抽牌、结果或历史页面。权限未开启、限流、网络错误和验证要求会分别提示，并允许重试。

## DeepSeek AI 解读

AI 解读仅对 `AI_ALLOWED_EMAILS` 白名单内的正式登录账号开放，以保护 API 额度。多个邮箱以逗号分隔，匹配时忽略大小写；未配置或为空时所有账号均无 AI 权限。服务器会读取当前用户自己的加密历史、解密后将问题、Context、牌阵及抽到的牌发送给 DeepSeek，要求其返回逐张牌解读与综合总结；结果会重新加密后保存到同一条历史记录中。重复请求复用已完成的解读，并通过现有 `updated_at` 列与数据库触发器防止并发请求重复生成。

正式上线前，在 Vercel 的 Production 环境变量中配置上述变量。保留现有模型配置；`DEEPSEEK_MODEL` 可覆盖默认模型。部署前执行测试、类型检查、lint 与构建。已连接 Git 的 Vercel 项目可按其配置从 `main` 分支部署。

## 权限提示、速览与追问

`GET /api/interpret/access` 在点击前检查当前身份与服务器配置，响应使用私有、不缓存策略。访客和无权限账号可以查看来自牌库的正逆位参考；正式账号的 AI 权限继续由原邮箱白名单控制。

新生成的解读增加可选 `overview` 字段；旧历史没有该字段时继续显示原解读。`POST /api/interpret/follow-up` 只回答已完成解读的原牌面，不重抽、不补牌，沿用问题、背景、牌位和正逆位。每条阅读最多保存 3 次成功追问、最多发起 6 次生成尝试（含失败），限制在服务器执行。重复请求复用已保存的回答，并发和失败恢复沿用数据库版本条件更新。

追问、计数与任务状态作为可选字段保存到原记录的加密 JSON 中，继续受现有用户 RLS 保护；无需新增数据库表或迁移已有记录。质量评估命令与人工验收方法见 [`AI_QUALITY.md`](AI_QUALITY.md)。

## 自定义牌阵

自定义牌阵支持 1～13 张牌、牌阵名称、独立牌位名称及每个位置最多 300 字的可选含义。服务器只允许 `custom` 使用用户自定义的牌位；预设牌阵仍按权威定义规范化。名称、数量、顺序、重复牌位及牌位含义均会验证，牌数据和正逆位继续使用原有规则。

可选 `spread.positionMeanings` 与牌位一一对应，随阅读快照加密保存，进入 AI 解读与追问输入。旧三牌自定义记录不需要迁移。修改牌位定义会清空当前牌组与选牌，避免沿用旧抽牌事实。

编辑草稿保存在当前标签页的 sessionStorage，可刷新恢复；常用模板保存在当前浏览器的 localStorage，最多 20 个，支持更新和删除。模板暂不跨设备同步，也不随账号切换迁移。删除模板不删除已有历史。模板写入失败会明确提示，仍可使用该牌阵完成阅读。
