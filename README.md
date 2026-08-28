# 观象 · 邀请码内测版

观象是一款把确定性六爻计算、可信知识检索（RAG）与 AI 情境解读组合在一起的传统文化反思产品。当前生产目标为中国大陆火山引擎 veFaaS 北京区域；首期使用邀请码登录，产品免费，支付入口只展示方案、不产生扣费。

## 当前上线能力

- 确定性三枚铜钱算法：本卦、互卦、动爻与之卦不由大模型决定。
- 64 卦、384 爻、动爻取用规则和分主题解释框架。
- 轻量可信 RAG：先按卦号、爻位、问题类型精确召回，再做关键词相关度与来源多样性重排；经典原文和现代解释分层展示。
- AI 深度解读与连续追问：只结合确定卦象、问题、用户自愿提供的派生出生背景及历史上下文生成解释。
- 邀请码账户：邀请码经 HMAC 派生匿名用户 ID，服务端签发 HttpOnly 会话；不同邀请码的数据严格隔离。
- 持久化：用户资料、卦笺、额度、反馈和 AI 记录写入 AES-256-GCM 加密快照，并定时备份到私有 TOS。
- 免费内测额度：AI 深读 3 次/日、追问 10 次/日、合缘解读 2 次/日。
- 会员占位页：Plus ¥29/月，仅作产品演示，支付按钮固定为“内测中”。
- 用户可清空卦笺或删除全部个人数据。

## 已上线环境

- 正式内测地址：<https://sgd984809insdiggre4qm.apigateway-cn-beijing.volceapi.com/>
- veFaaS 应用：`guanxiang-oracle-beta`（应用 ID `1378b0de332d`）
- 函数：`l5ot898n`，北京区域，Node.js 20，0.5 vCPU / 1 GiB
- 弹性实例：最小 0、最大 3，不启用付费预留实例
- API 网关：`hydrogen-report-gateway` 下的独立服务与路由
- 私有备份桶：`guanxiang-oracle-beta-2131131001`
- 首次生产发布：2026-08-28；生产验收已覆盖健康检查、邀请登录、页面渲染、免费权益、真实 AI 深读与 TOS 加密备份。

## 技术结构

- Next.js 16 App Router，Node.js 20.9+
- React 19、TypeScript
- `output: standalone`，用于 veFaaS Node 运行时
- DeepSeek/OpenAI 兼容接口，可通过环境变量切换模型
- TOS S3 兼容接口，用于加密数据快照的最新副本与每日备份

## 本地运行

```bash
npm ci
npm run dev
```

默认打开 `http://localhost:3000`。本地开发若未设置 `SESSION_SECRET`，会使用仅限开发的临时默认值；生产环境不会回退到默认密钥。

## 生产构建与验收

```bash
npm run check
```

该命令依次执行 ESLint、TypeScript、veFaaS standalone 构建和端到端测试。测试覆盖公开健康页、登录拦截、邀请码校验、账户隔离、免费额度、支付关闭和私有 API 保护。

线上运行产物：`.next/standalone`；启动命令：`node server.js`；监听端口：`3000`。

## 生产环境变量

完整模板见 `.env.example`。必须配置：

- `INVITE_CODES`：每位测试者一个唯一邀请码，逗号分隔。
- `SESSION_SECRET`：会话签名密钥，至少 32 字符。
- `DATA_ENCRYPTION_KEY`：数据快照加密密钥，至少 32 字符；丢失后无法解密历史备份。
- `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`：模型服务配置。
- `TOS_ENDPOINT`、`TOS_REGION`、`TOS_BUCKET`、`TOS_ACCESS_KEY`、`TOS_SECRET_KEY`：私有备份桶配置。
- `SITE_URL`：发布后的 HTTPS 根地址。
- `PAYMENT_PROVIDER=disabled`：内测期禁止真实支付。

可生成 10 个邀请码和高强度随机密钥：

```bash
npm run secrets:generate
```

生成的 `.vefaas-secrets.env` 与 `内测邀请码.txt` 已被 Git 和 veFaaS 上传规则排除。补齐 AI、TOS 和站点地址后，可执行：

```bash
node --env-file=.vefaas-secrets.env scripts/check-production-env.mjs
```

不要把任何密钥提交到代码仓库、截图或聊天记录中。

## veFaaS 发布参数

- 区域：`cn-beijing`
- 框架：Next.js（动态 Node 服务）
- 运行时：`native-node20/v1`
- 构建命令：`npm run build:vefaas`
- 输出目录：`.next/standalone`
- 启动命令：`node server.js`
- 端口：`3000`
- 网关：复用现有 `hydrogen-report-gateway`，但创建独立服务与路由，不能覆盖其他项目路由。
- 内测初期保持 `minInstance=0`，不创建保留实例；若要避免冷启动，确认持续费用后再改为 1。

健康检查接口为 `/api/health`。其中 `ok` 表示进程存活，`ready` 只有在邀请码、会话密钥、加密存储、TOS 和 AI 均配置后才为 `true`。

## 数据与隐私边界

原始出生日期和时间只在当前页面用于推导文化标签，不保存；持久层只保存用户主动提交的资料、派生标签、卦笺和交互记录。掌心图片仅在设备端处理。内容只作传统文化娱乐和自我反思，不替代医疗、法律、投资或危机干预。

旧 ChatGPT Sites 配置已归档到 `docs/legacy-openai-hosting.json`，仅作迁移记录，不参与 veFaaS 上线，也不会删除原有线上站点。
