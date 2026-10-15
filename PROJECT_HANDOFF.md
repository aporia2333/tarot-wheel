# Taro Web 2.0 项目交接说明

> 审计日期：2026-10-02  
> 项目目录：`E:\taro web 2.0`  
> 当前分支：`main`  
> 审计时提交：`25bc0df Refine cut page status and actions`

## 1. 项目结论

Taro Web 2.0 是一个移动端优先的塔罗抽牌 Web 应用。核心抽牌流程、账号登录、匿名访客、云端加密历史和 DeepSeek AI 解读均已接入。

当前项目属于“可构建、可部署的 MVP”，接下来的重点应放在自动化测试、流程状态持久化、账号闭环、生产配置验证和用户体验完善。

审计结果：

- Git `main` 与 `origin/main` 同步，工作区干净。
- `npm run build` 成功，TypeScript 严格检查通过。
- `npm run lint` 通过，有 2 条 `<img>` 图片优化警告。
- 当前没有自动化测试、CI 配置、README 或 AGENTS.md。
- 仓库原有的 `项目说明.log` 已部分过时，应以本文件和当前代码为准。

## 2. 产品功能

完整用户流程：

```text
首页
  → 输入问题与背景信息
  → 选择牌阵和抽牌数量
  → 洗牌
  → 切牌
  → 从 78 张牌圆轮中选牌
  → 保存结果
  → 查看牌面和 AI 解读
  → 历史记录
```

现有功能：

- 78 张完整塔罗牌，包括 22 张大阿卡纳和 56 张小阿卡纳。
- 16 种牌阵，支持 1～13 张牌。
- Fisher–Yates 随机洗牌。
- 随机切牌，可多次切牌或跳过。
- 抽牌时随机生成正位或逆位。
- 支持撤回最后一张选择。
- 邮箱注册、登录、退出和密码修改。
- Supabase 匿名访客模式。
- Supabase 云端历史记录。
- 服务端 AES-256-GCM 加密。
- PostgreSQL RLS 用户数据隔离。
- DeepSeek 逐张牌解读和综合总结。
- AI 调用账号白名单控制。
- 未配置 Supabase 时自动降级为 LocalStorage 本地模式。

## 3. 技术架构

主要技术：

- Next.js 14.2.35，App Router
- React 18.3.1
- TypeScript，严格模式
- Tailwind CSS 3.4
- Framer Motion 11
- Zustand 5
- Supabase Auth、PostgreSQL 和 RLS
- Node.js `crypto` AES-256-GCM
- DeepSeek Chat Completions API

审计机器环境：

- Node.js：`v24.16.0`
- npm：`11.13.0`
- 项目目前没有 `.nvmrc`、`.node-version` 或 `package.json#engines`。

## 4. 关键目录与文件

```text
src/
├─ app/                         页面与服务器 API
│  ├─ api/interpret/            DeepSeek AI 解读接口
│  ├─ api/readings/             历史记录列表与保存接口
│  ├─ api/readings/[id]/        单条历史读取与删除接口
│  ├─ account/                  账户安全与密码修改
│  ├─ cut/                      切牌页
│  ├─ draw/                     圆轮抽牌页
│  ├─ history/                  历史记录页
│  ├─ login/                    登录与注册页
│  ├─ question/                 问题与背景信息页
│  ├─ result/[id]/              抽牌结果页
│  ├─ shuffle/                  洗牌页
│  └─ spreads/                  牌阵选择页
├─ components/                  页面组件与动画组件
├─ data/                        塔罗牌和牌阵数据
├─ lib/
│  ├─ ai/deepseek.ts            DeepSeek 请求与响应解析
│  ├─ crypto/readings.ts        历史记录加解密
│  ├─ readings/client.ts        云端/本地历史统一客户端
│  ├─ supabase/                 浏览器端和服务端客户端
│  ├─ ids.ts                    历史记录 ID
│  ├─ shuffle.ts                洗牌与切牌算法
│  └─ storage.ts                LocalStorage 历史
├─ store/readingFlowStore.ts    当前抽牌流程的 Zustand 状态
└─ types.ts                     核心 TypeScript 类型

public/cards/                   网站实际使用的 78 张牌图
supabase/migrations/            数据库迁移
middleware.ts                   Supabase Session Cookie 刷新
DEPLOYMENT.md                   部署与安全配置
start.bat                       Windows 一键开发启动
```

## 5. 页面和状态流

### 首页 `/`

显示产品介绍、开始抽牌、历史记录、登录状态和访客模式入口。

### 问题页 `/question`

收集：

- `question`：用户问题，可为空。
- `contextInfo`：背景信息，可为空。

内容进入 Zustand 内存状态。

### 牌阵页 `/spreads`

- 共 16 种牌阵。
- 每页显示 8 种。
- 可选择牌阵支持的抽牌数量。
- 牌阵最终转换为 `TarotSpread` 存入 Zustand。

### 洗牌页 `/shuffle`

- 对 78 张牌执行 Fisher–Yates 洗牌。
- 用户可重复洗牌。
- 新牌序写入 Zustand，并清空之前选择的牌。

### 切牌页 `/cut`

- 从随机位置切分并前后交换牌组。
- 可重复切牌或跳过。
- 更新 Zustand 中的牌序。

### 抽牌页 `/draw`

- 使用三层圆轮展示 78 张牌背。
- 用户选择指定数量的牌。
- 每张牌随机生成正位或逆位。
- 支持撤回最后一张。
- 确认后构建 `TarotReading` 并保存。
- 配置 Supabase 时，该页面要求正式或匿名登录。

### 结果页 `/result/[id]`

- 根据 ID 加载云端或本地历史。
- 显示问题、背景、牌阵、牌位、牌面和正逆位。
- 已接入 AI 解读面板。

### 历史页 `/history`

- 云端模式最多读取最近 100 条。
- 本地模式最多保存并读取最近 50 条。
- 当前只支持查看，没有删除按钮。

## 6. 核心数据结构

`TarotReading` 包含：

```ts
interface TarotReading {
  readingId: string;
  question: string;
  contextInfo: string;
  spread: TarotSpread;
  selectedCards: SelectedCard[];
  createdAt: string;
  aiInterpretation?: AiInterpretation;
  aiStatus?: "not_started" | "pending" | "completed" | "failed";
}
```

历史记录保存的是当次牌阵和牌数据快照，而不是只保存牌的 ID。这有利于以后牌库数据发生变化时仍能还原旧结果，但会增加单条记录体积。

## 7. 历史记录模式

### Supabase 云端模式

只要同时配置以下变量，客户端就会使用云端模式：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

保存流程：

```text
浏览器提交 TarotReading
  → Next.js API 验证登录和基本数据格式
  → 服务端 AES-256-GCM 加密
  → 写入 Supabase tarot_readings 表
  → PostgreSQL RLS 限制为当前 user_id
```

数据库迁移文件：

```text
supabase/migrations/20260820_create_tarot_readings.sql
```

表结构核心字段：

- `id`：历史 UUID。
- `user_id`：Supabase 用户 ID。
- `encrypted_payload`：加密后的完整历史 JSON。
- `created_at` / `updated_at`：时间戳。

### LocalStorage 本地模式

如果 Supabase 公共变量没有配置：

- 历史存入浏览器 `localStorage`。
- Key 为 `tarot_readings_v1`。
- 最多保留最近 50 条。
- 无法跨设备同步。
- 清除浏览器数据后不可恢复。
- AI 解读不可用。

## 8. 认证和权限

支持两类 Supabase 用户：

1. 正式邮箱账号。
2. 匿名访客账号。

`RequireCloudAuth` 用于保护抽牌、结果和历史页面。在 Supabase 未配置时会直接放行，并使用本地模式。

需要注意：

- 匿名用户同样有独立 `user_id` 和 RLS 隔离。
- 当前没有匿名账号升级或历史迁移逻辑。
- 匿名用户改为正式登录后，旧匿名用户的历史可能不再可访问。
- 当前没有忘记密码、邮箱变更或删除账号功能。

## 9. 加密与安全

云端历史使用 AES-256-GCM 加密：

- 密钥来自 `READINGS_ENCRYPTION_KEY`。
- 必须是 32 字节 Base64。
- 每次加密使用随机 12 字节 IV。
- 认证标签和密文一起保存在 JSONB 中。
- 加解密只在 Node.js 服务端执行。

重要约束：

- 不得给 `READINGS_ENCRYPTION_KEY` 添加 `NEXT_PUBLIC_` 前缀。
- 密钥丢失后无法解密已有历史。
- 当前没有密钥版本轮换或旧密钥兼容方案。
- 不应将 `.env.local`、真实密钥或用户数据提交到 Git。

## 10. AI 解读

AI 生成流程：

```text
正式账号点击生成
  → API 验证 UUID、登录状态和邮箱白名单
  → 从 Supabase 读取加密历史
  → 服务端解密
  → 将问题、背景、牌阵、牌位、牌名、关键词和正逆位发送给 DeepSeek
  → 验证 DeepSeek JSON 结构
  → 将解读写回 TarotReading
  → 再次加密保存
```

权限规则：

- 未登录：401。
- 匿名用户：403。
- 不在 `AI_ALLOWED_EMAILS` 中：403。
- 已生成完成：直接返回缓存，不重复调用付费 API。

AI 输出包含：

- 与抽牌顺序一致的逐张牌解读。
- 综合总结与行动提醒。
- 系统提示要求避免绝对预言，以及避免替用户做医疗、法律、财务或重大人生决定。

AI 会将用户填写的问题和背景发送给 DeepSeek，产品界面已有相应提示。

## 11. 环境变量

模板位于 `.env.example`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
READINGS_ENCRYPTION_KEY=replace-with-a-32-byte-base64-key
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash
AI_ALLOWED_EMAILS=user@example.com
```

变量用途：

| 变量 | 位置 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 浏览器与服务端 | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 浏览器与服务端 | Supabase 公共匿名 Key |
| `READINGS_ENCRYPTION_KEY` | 仅服务端 | 历史记录加解密 |
| `DEEPSEEK_API_KEY` | 仅服务端 | 调用 DeepSeek |
| `DEEPSEEK_MODEL` | 仅服务端 | 指定模型，可省略 |
| `AI_ALLOWED_EMAILS` | 仅服务端 | 允许调用 AI 的邮箱列表 |

审计时的本机配置状态：

- Supabase URL：已配置。
- Supabase匿名 Key：已配置。
- 历史加密 Key：已配置。
- DeepSeek API Key：未配置。
- DeepSeek 模型：未配置，将使用代码默认值。
- AI 邮箱白名单：未配置。

本文件不记录任何真实密钥值。

## 12. 本地运行

PowerShell：

```powershell
cd "E:\taro web 2.0"
npm.cmd install
npm.cmd run dev
```

然后访问：

```text
http://localhost:3000
```

也可以双击根目录下的 `start.bat`。该脚本会检查 Node.js 和 npm，在缺少 `node_modules` 时运行安装，然后打开浏览器并启动开发服务器。

## 13. 检查与生产运行

```powershell
# ESLint
npm.cmd run lint

# 生产构建，同时进行 TypeScript 检查
npm.cmd run build

# 启动生产构建
npm.cmd run start
```

审计结果：

- 生产构建成功。
- 所有页面成功生成。
- 两条 ESLint 警告来自 `ReadingCardsDisplay.tsx` 和 `TarotCard.tsx` 使用原生 `<img>`。

## 14. 部署

现有文档假设使用 Vercel，并在推送 `main` 后自动部署。但仓库中没有 `vercel.json` 或可证明项目已绑定的配置，需要到 Vercel 控制台核实。

上线前必须确认：

1. Supabase migration 已执行。
2. Supabase RLS 已启用且策略存在。
3. Supabase Anonymous Sign-ins 已按需求开启。
4. Supabase Site URL 和 Redirect URLs 正确。
5. Vercel Production 环境变量完整。
6. `READINGS_ENCRYPTION_KEY` 已安全备份。
7. DeepSeek 模型名称在目标账号中可用。
8. `AI_ALLOWED_EMAILS` 使用实际授权邮箱。
9. 正式账号、匿名访客、历史记录和 AI 均进行生产环境冒烟测试。

建议的 Supabase URL 配置：

```text
Site URL: https://your-domain.example
Redirect URLs:
https://your-domain.example/**
http://localhost:3000/**
```

## 15. 已知问题与技术债

### 高优先级

1. **没有自动化测试**  
   登录、访客、抽牌、加密、历史和 AI 都依赖人工验证。

2. **抽牌流程刷新后会丢失**  
   Zustand 没有持久化。问题、牌阵、牌序和已选牌只存在当前页面内存中。

3. **匿名账号历史迁移缺失**  
   从访客改为正式账号后，旧匿名账号的历史可能不可访问。

4. **AI 本地环境不完整**  
   审计时未配置 DeepSeek Key 和 AI 白名单，尚未完成真实 AI 请求验证。

5. **原项目说明过时**  
   `项目说明.log` 仍声称历史只使用 LocalStorage、AI 面板尚未挂载，与当前代码不符。

### 中优先级

6. 历史删除 API 已存在，但没有删除按钮。
7. 本地 `clearReadings` 已存在，但没有界面入口。
8. 没有忘记密码、邮箱变更和删除账号流程。
9. `RequireCloudAuth` 只在挂载时检查用户，不订阅保护页内的登出状态变化。
10. API 对历史对象的验证较浅，没有完整验证牌阵和每张牌的结构。
11. 加密密钥没有轮换机制。
12. 项目没有锁定 Node.js 版本。
13. 没有 CI/CD 检查配置。

### 低优先级与清理项

14. `ReadingCardsDisplay.tsx` 和 `TarotCard.tsx` 使用 `<img>`，存在 Next.js 图片优化警告。
15. `ResultCard` 组件目前未使用。
16. `deleteReading` 和 `clearReadings` 目前没有 UI 调用方。
17. 根目录与 `src/data` 各有一份完全相同的塔罗 JSON。
18. `cards/` 与 `public/cards/` 各有一套完全相同的 78 张图片。
19. 代码预留 `/cards/back.png`，但该文件不存在；当前界面使用 CSS 牌背，所以暂不影响主流程。
20. 圆轮同时渲染 78 个 Framer Motion 元素，需在低端移动设备上验证性能。

## 16. 建议开发路线

### 第一阶段：建立可靠基线

1. 新建准确的 `README.md` 和 `AGENTS.md`。
2. 锁定 Node.js LTS 版本。
3. 引入测试框架。
4. 为洗牌、切牌、加密、数据验证编写单元测试。
5. 为登录、访客、完整抽牌、历史和 AI 权限编写 Playwright 测试。
6. 配置 CI，在每次提交检查 lint、类型、测试和 build。

### 第二阶段：完成产品闭环

1. 使用 `sessionStorage` 或 Zustand persist 保存未完成流程。
2. 完成匿名账号升级与历史归属迁移方案。
3. 增加历史删除和确认交互。
4. 增加忘记密码与重置密码流程。
5. 完善云端和 AI 错误状态。

### 第三阶段：性能与维护

1. 优化塔罗图片加载方式。
2. 验证圆轮在移动设备上的帧率和触控体验。
3. 删除或接入未使用组件。
4. 清理重复 JSON 和图片资源。
5. 增加错误监控、日志和关键产品指标。

## 17. Codex 接手规则建议

后续让 Codex 修改本项目时，建议遵循以下流程：

1. 先读取本文件、`DEPLOYMENT.md`、`package.json` 和相关业务代码。
2. 修改前运行 `git status --short`，不要覆盖用户现有改动。
3. 不读取或输出 `.env.local` 中的真实值。
4. 不把服务端密钥改成 `NEXT_PUBLIC_*`。
5. 涉及历史格式时，考虑现有加密数据的向后兼容。
6. 涉及认证时，同时验证正式账号和匿名账号。
7. 涉及 AI 时，保留服务器端白名单和缓存机制。
8. 每次实现后至少运行：

```powershell
npm.cmd run lint
npm.cmd run build
```

9. 若增加测试，再运行完整测试套件。
10. 在没有明确授权时，不执行数据库破坏性迁移、不更换加密密钥、不删除生产数据。

## 18. 项目当前定位

最准确的项目定位是：

> 核心 MVP 已经跑通，下一步进入稳定性、账号闭环、自动化测试和生产验收阶段。

