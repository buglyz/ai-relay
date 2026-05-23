# AI Relay ⚡

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ParsifalC/ai-relay&env=RELAY_API_KEY,RELAY_ADMIN_KEY,RELAY_SIGNING_SECRET&envDescription=API%20authentication%20keys%20(required%20for%20security)&envLink=https://github.com/ParsifalC/ai-relay#environment-variables)

轻量级 AI API 中转服务，部署在 Vercel (Edge Runtime + KV)。
A lightweight AI API relay service, deployed on Vercel (Edge Runtime + KV).

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## English

### Features

- 🔄 **Multi-Key Rotation** — Round-Robin + 429 auto-backoff.
- 🔀 **Multi-Provider Routing** — OpenAI / Claude / DeepSeek / MiMo.
- 📊 **Usage Tracking** — Request count + token usage (Vercel KV).
- 📡 **Streaming Responses** — SSE pass-through.
- 🛡️ **OpenAI Compatible** — Connects directly via OpenAI SDK.
- 🔑 **Key Segregation & Temporary Keys** — Separate admin panel keys, api request keys, and support for generating stateless temporary keys.

### ⚡ Quick Deploy (One Click)

Deploy to Vercel in under 2 minutes — no coding required.

**Prerequisites:**
- A [Vercel account](https://vercel.com/signup) (free tier works)
- At least one AI provider API key (OpenAI, Claude, DeepSeek, or Xiaomi)

**Steps:**
1. Click the **Deploy with Vercel** button at the top of this README
2. Vercel will prompt you to fill in 3 required environment variables:
   - `RELAY_API_KEY` — Your client request auth key (choose any strong secret)
   - `RELAY_ADMIN_KEY` — Your admin dashboard login key (can be the same as above)
   - `RELAY_SIGNING_SECRET` — Secret for signing temporary keys (can be the same as above)
3. Click **Deploy** — done! Your relay service is live.

**After Deployment:**
1. Visit `https://your-project.vercel.app/health` to verify it's running
2. Visit `https://your-project.vercel.app/admin` and log in with your `RELAY_ADMIN_KEY`
3. In the Admin panel, go to **Provider Keys** and add your API keys (OpenAI, Claude, etc.)
4. Start making requests!

**Usage Example:**
```bash
curl -X POST https://your-project.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Using OpenAI SDK:**
```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_RELAY_API_KEY",
    base_url="https://your-project.vercel.app/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Manual Setup

#### 1. Clone & Install
```bash
git clone https://github.com/ParsifalC/ai-relay.git
cd ai-relay
npm install
```

#### 2. Configure Environment Variables
```bash
cp .env.local.example .env.local
# Edit .env.local and fill in your API Keys
```

#### 3. Local Development
```bash
npm run dev
# Visit http://localhost:3000
```

#### 4. Deploy to Vercel
```bash
npx vercel
```

### Environment Variables

| Variable | Description | Required |
|------|------|------|
| `RELAY_API_KEY` | Client request auth key (comma-separated) | ✅ |
| `RELAY_ADMIN_KEY` | Admin dashboard login key (comma-separated, falls back to `RELAY_API_KEY` if not set) | ⬜ |
| `RELAY_SIGNING_SECRET` | Secret for signing temporary keys (falls back to admin/api key if not set) | ⬜ |
| `OPENAI_KEYS` | OpenAI API Keys (comma-separated) | ⬜ |
| `CLAUDE_KEYS` | Anthropic API Keys | ⬜ |
| `DEEPSEEK_KEYS` | DeepSeek API Keys | ⬜ |
| `XIAOMI_KEYS` | Xiaomi API Keys | ⬜ |

> **Note:** Provider keys (OPENAI_KEYS, etc.) are configured via the Admin panel after deployment, not as Vercel environment variables. This is more secure — keys are stored in Vercel KV, not in your repo.

### Temporary Request Keys
You can generate temporary client request keys in the Admin Panel with specified durations (e.g. 1 hour, 1 day). 
- **Format**: `***${base64Payload}.${signature}`
- **Validation**: Statelessly validated using HMAC-SHA256 on the Vercel Edge.

---

<a name="中文"></a>
## 中文

### 特性

- 🔄 **多 Key 轮换** — Round-Robin + 429 自动退避
- 🔀 **多 Provider 路由** — OpenAI / Claude / DeepSeek / MiMo
- 📊 **用量追踪** — 调用次数 + Token 用量 (Vercel KV)
- 📡 **流式响应** — SSE 透传
- 🛡️ **OpenAI 兼容** — 直接用 OpenAI SDK 对接
- 🔑 **密钥分离与临时 Key** — 区分后台管理密钥和 API 请求密钥，并支持在后台生成无状态的临时密钥。

### ⚡ 一键部署

2 分钟内部署到 Vercel，无需写代码。

**前置条件：**
- 一个 [Vercel 账号](https://vercel.com/signup)（免费版即可）
- 至少一个 AI Provider 的 API Key（OpenAI、Claude、DeepSeek 或小米）

**步骤：**
1. 点击 README 顶部的 **Deploy with Vercel** 按钮
2. Vercel 会提示你填写 3 个必需的环境变量：
   - `RELAY_API_KEY` — 客户端请求鉴权密钥（自定义一个强密码即可）
   - `RELAY_ADMIN_KEY` — 后台管理登录密钥（可以和上面相同）
   - `RELAY_SIGNING_SECRET` — 临时 Key 签名密钥（可以和上面相同）
3. 点击 **Deploy** — 搞定！你的中转服务已上线。

**部署后：**
1. 访问 `https://你的项目.vercel.app/health` 确认服务正常
2. 访问 `https://你的项目.vercel.app/admin`，用 `RELAY_ADMIN_KEY` 登录
3. 在后台面板的 **Provider Keys** 中添加你的 API Key（OpenAI、Claude 等）
4. 开始调用！

**使用示例：**
```bash
curl -X POST https://你的项目.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "你好！"}]
  }'
```

**使用 OpenAI SDK：**
```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_RELAY_API_KEY",
    base_url="https://你的项目.vercel.app/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "你好！"}]
)
```

### 手动部署

#### 1. 克隆 & 安装
```bash
git clone https://github.com/ParsifalC/ai-relay.git
cd ai-relay
npm install
```

#### 2. 配置环境变量
```bash
cp .env.local.example .env.local
# 编辑 .env.local 填入你的 API Keys
```

#### 3. 本地开发
```bash
npm run dev
# 访问 http://localhost:3000
```

#### 4. 部署到 Vercel
```bash
npx vercel
```

### 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `RELAY_API_KEY` | 客户端请求鉴权密钥 (支持逗号分隔多个) | ✅ |
| `RELAY_ADMIN_KEY` | 后台管理登录密钥 (支持逗号分隔多个，未设置则回退到 `RELAY_API_KEY`) | ⬜ |
| `RELAY_SIGNING_SECRET` | 临时 Key 签名密钥 (未设置则回退到第一个管理/请求密钥) | ⬜ |
| `OPENAI_KEYS` | OpenAI API Keys (逗号分隔) | ⬜ |
| `CLAUDE_KEYS` | Anthropic API Keys | ⬜ |
| `DEEPSEEK_KEYS` | DeepSeek API Keys | ⬜ |
| `XIAOMI_KEYS` | Xiaomi API Keys | ⬜ |

> **注意：** Provider 密钥（OPENAI_KEYS 等）建议通过 Admin 后台面板配置，而非 Vercel 环境变量。这样更安全 — 密钥存储在 Vercel KV 中，不暴露在代码仓库里。

### 临时请求密钥
在后台面板中可以生成指定有效期的临时请求密钥（例如 1小时、1天）。
- **格式**：`***${base64Payload}.${signature}`
- **校验**：在 Vercel Edge 服务端采用 HMAC-SHA256 算法进行无状态签名校验。
