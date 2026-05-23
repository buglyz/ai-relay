<div align="center">

# ⚡ AI Relay

**A lightweight, open-source AI API relay service built on Vercel Edge Runtime**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ParsifalC/ai-relay&env=RELAY_API_KEY,RELAY_ADMIN_KEY,RELAY_SIGNING_SECRET&envDescription=API%20authentication%20keys%20(required%20for%20security)&envLink=https://github.com/ParsifalC/ai-relay#environment-variables)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Edge Runtime](https://img.shields.io/badge/Edge_Runtime-⚡-black?logo=vercel)](https://vercel.com/docs/functions/edge-functions)
[![Vercel KV](https://img.shields.io/badge/Vercel_KV-Redis-black?logo=redis)](https://vercel.com/docs/storage/vercel-kv)

[English](README_EN.md) · [中文](README.md)

</div>

---

### ✨ Features

- **Multi-Key Rotation** — Round-Robin with automatic 429 backoff
- **Multi-Provider Routing** — OpenAI · Claude · DeepSeek · MiMo · Custom
- **Multi-Level Fallback** — Provider → Key chain failover
- **Circuit Breaker** — Automatic failover when provider is down
- **Admin Dashboard** — Full management panel at `/admin`
  - Key management (add / delete / test connectivity)
  - Quota configuration with KV persistence
  - Model connectivity testing
  - Temporary API key generation (HMAC-SHA256 signed)
  - Custom provider management (CRUD)
  - Real-time key pool sync
- **Usage Tracking** — Request counts + token usage via Vercel KV
- **Streaming Responses** — SSE pass-through for real-time output
- **OpenAI Compatible** — Works directly with the OpenAI SDK
- **Key Segregation** — Separate admin / API / temporary keys
- **Health Check** — `/health` endpoint for monitoring
- **Virtual Model Mapping** — Map virtual model names to real models
- **One-Click Deploy** — Deploy to Vercel in under 2 minutes
- **📱 Mobile Friendly** — Responsive admin dashboard, manage relay strategies on the go

### 📸 Screenshots

**Admin Dashboard — Overview**

![Admin Dashboard Overview](docs/screenshots/admin-overview.png)

Quota status, daily usage stats, and token consumption trends at a glance.

**Admin Dashboard — Key Management**

![Admin Dashboard Key Management](docs/screenshots/admin-keys.png)

Multi-provider key pool with status indicators and model prefix mapping.

**Admin Dashboard — Tools**

![Admin Dashboard Tools](docs/screenshots/admin-tools.png)

Temporary key generation and model connectivity testing.

### 🚀 Quick Start

#### One-Click Deploy (Recommended)

> **Prerequisites:** A [Vercel account](https://vercel.com/signup) (free tier works) and at least one AI provider API key.

1. Click the **Deploy with Vercel** button at the top of this README
2. Fill in the 3 required environment variables:
   - `RELAY_API_KEY` — Client request auth key (choose any strong secret)
   - `RELAY_ADMIN_KEY` — Admin dashboard login key (can be the same as above)
   - `RELAY_SIGNING_SECRET` — Secret for signing temporary keys (can be the same as above)
3. Click **Deploy** — done!

**After Deployment:**
1. Visit `https://your-project.vercel.app/health` to verify it's running
2. Visit `https://your-project.vercel.app/admin` and log in with your `RELAY_ADMIN_KEY`
3. Go to **Provider Keys** and add your API keys (OpenAI, Claude, etc.)
4. Start making requests!

#### Manual Setup

```bash
git clone https://github.com/ParsifalC/ai-relay.git
cd ai-relay
npm install

cp .env.local.example .env.local
# Edit .env.local and fill in your API keys

npm run dev  # http://localhost:3000
npx vercel   # deploy to Vercel
```

### 📖 Usage

**Endpoint:**
```
POST https://your-project.vercel.app/v1/chat/completions
```

**curl:**
```bash
curl -X POST https://your-project.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_R...KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello!"}]}'
```

**OpenAI SDK:**
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

**Temporary Keys:**
Generate time-limited keys in the Admin panel.
- **Format:** `***${base64Payload}.${signature}`
- **Validation:** Stateless HMAC-SHA256 verification on Vercel Edge

### 🔧 Configuration

#### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RELAY_API_KEY` | Client request auth key (comma-separated) | ✅ |
| `RELAY_ADMIN_KEY` | Admin dashboard login key (comma-separated, falls back to `RELAY_API_KEY`) | ⬜ |
| `RELAY_SIGNING_SECRET` | Temporary key signing secret (falls back to admin/api key) | ⬜ |
| `OPENAI_KEYS` | OpenAI API Keys (comma-separated) | ⬜ |
| `CLAUDE_KEYS` | Anthropic API Keys | ⬜ |
| `DEEPSEEK_KEYS` | DeepSeek API Keys | ⬜ |
| `XIAOMI_KEYS` | Xiaomi API Keys | ⬜ |

> [!NOTE]
> Provider keys (OPENAI_KEYS, etc.) are configured via the Admin panel after deployment, not as Vercel environment variables. Keys are stored in Vercel KV, not in your repo.

#### Supported Providers

| Provider | Models | Status |
|----------|--------|--------|
| OpenAI | gpt-4o, gpt-4, gpt-3.5-turbo, … | ✅ Built-in |
| Anthropic (Claude) | claude-3.5-sonnet, claude-3-opus, … | ✅ Built-in |
| DeepSeek | deepseek-chat, deepseek-coder, … | ✅ Built-in |
| Xiaomi (MiMo) | mimo-7b, … | ✅ Built-in |
| Custom | Any OpenAI-compatible API | ✅ Configurable |

### 🏗️ Architecture

```
Client → Edge Runtime (global, <50ms latency)
              ├─ Circuit Breaker
              ├─ Multi-Level Fallback (Provider → Key)
              ├─ Key Rotation (Round-Robin + 429 backoff)
              └─ Vercel KV (keys, quotas, usage)
```

### 📊 Admin Dashboard

Access at `/admin` with your `RELAY_ADMIN_KEY`:

| Feature | Description |
|---------|-------------|
| **Provider Keys** | Manage API keys for all providers |
| **Quota Config** | Set dynamic quotas per provider |
| **Model Testing** | Test connectivity to specific models |
| **Temporary Keys** | Generate time-limited API keys |
| **Custom Providers** | Add / edit / delete custom providers |
| **Usage Stats** | View request counts and token usage |
| **Key Pool Status** | Real-time sync status of all keys |

> 💡 **Mobile Friendly**: The admin dashboard features a responsive design, allowing you to adjust relay strategies, view usage, and manage keys from your phone anytime, anywhere.

### 🏁 Comparison with Similar Projects

AI Relay is a **lightweight, self-deployable relay layer** — not a full platform. Here's how it differs from other popular solutions:

| Feature | AI Relay | OpenRouter | OneAPI / new-api | FastGPT |
|---------|----------|------------|------------------|---------|
| **Deployment** | Vercel one-click (Edge) | SaaS only | Self-hosted (Docker) | Self-hosted (Docker) |
| **Infra Cost** | Free (Vercel free tier) | Pay-per-use | Requires server | Requires server |
| **Cold Start** | < 50ms (Edge) | N/A (SaaS) | Seconds | Seconds |
| **Admin UI** | ✅ Built-in | ✅ Web dashboard | ✅ Web dashboard | ✅ Web dashboard |
| **Multi-Key Rotation** | ✅ Round-robin + 429 backoff | ✅ Managed | ✅ | ✅ |
| **Circuit Breaker** | ✅ Provider-level | ❌ | ❌ | ❌ |
| **Fallback Chains** | ✅ Provider → Key (configurable) | ✅ Auto | ✅ Basic | ✅ Basic |
| **Concurrency Control** | ✅ Token bucket + queue | Rate-limited | ❌ | ❌ |
| **Webhook Alerts** | ✅ WeCom/Feishu/DingTalk/Slack | ❌ | ❌ | ✅ Webhook |
| **Virtual Model Mapping** | ✅ | ✅ | ✅ | ✅ |
| **Temp API Keys** | ✅ HMAC-SHA256 signed | ❌ | ✅ | ✅ |
| **OpenAI Compatible** | ✅ | ✅ | ✅ | Partial |
| **Primary Use Case** | Personal / small team relay | API marketplace | Multi-key management | Knowledge base + API |

**When to choose AI Relay:**
- You want a **zero-cost, serverless** relay that deploys in 2 minutes
- You need **multi-provider fallback** with circuit breaker protection
- You prefer **Edge Runtime** for global low-latency access
- You don't need a full platform — just a reliable API proxy layer

**When to choose alternatives:**
- **OpenRouter**: You want access to 100+ models via a managed marketplace with billing built in
- **OneAPI / new-api**: You need a mature self-hosted solution with extensive token management and user systems
- **FastGPT**: You're building a knowledge-base application and need integrated RAG capabilities

### 🙏 Acknowledgments & References

AI Relay stands on the shoulders of these excellent open-source projects:

- **[OpenRouter](https://openrouter.ai)** — Pioneered the multi-provider API aggregation model; demonstrated that unified endpoints dramatically simplify AI application development
- **[OneAPI](https://github.com/songquanpeng/one-api) / [new-api](https://github.com/Calcium-Ion/new-api)** — The go-to open-source API management system; inspired our multi-key rotation and quota management design
- **[FastGPT](https://github.com/labring/FastGPT)** — Showed how API relay can be tightly integrated with knowledge-base workflows; our webhook system draws from their notification architecture
- **[Vercel](https://vercel.com)** — Edge Runtime and KV storage make serverless AI relay possible with zero infrastructure overhead
- **[OpenAI](https://platform.openai.com)** — The OpenAI-compatible API standard has become the de facto interface for LLM services

### 🎯 Use Cases

| Scenario | Description |
|----------|-------------|
| **Individual Developers** | Consolidate multiple API keys into a single endpoint; never hit rate limits mid-debugging thanks to automatic key rotation and fallback |
| **Small Teams / Startups** | Share a relay instance across the team with quota management; admin dashboard provides visibility without exposing raw API keys |
| **CI/CD Pipelines** | Use temporary HMAC-signed keys for ephemeral build agents; keys auto-expire, no cleanup needed |
| **Multi-Region Apps** | Edge Runtime ensures < 50ms latency worldwide; circuit breaker prevents cascading failures when a provider has regional outages |
| **Cost Optimization** | Route requests to cheaper providers (e.g., DeepSeek for simple tasks, GPT-4o for complex ones) via virtual model mapping |
| **Enterprise Internal Tools** | Deploy as an internal API gateway with webhook alerts to WeCom/Feishu/DingTalk for usage monitoring and anomaly detection |

---

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---