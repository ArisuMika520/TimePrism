# TimePrism

一个集成了Todo、Task Manager（看板视图）和Schedule（日程）的现代化Web应用。

## 功能特性

- **Todo管理**: 创建、编辑、删除待办事项，支持优先级、分类、标签
- **Task Manager**: 看板视图（仿AppFlowy设计），支持拖拽操作
- **Schedule**: 日程管理（仿飞书设计），支持月/周/日视图
- **S3图床**: 支持Cloudflare R2、Backblaze B2等S3兼容存储
- **Agent工作流**: 集成多模型API（OpenAI、Anthropic、DeepSeek、Kimi、自定义API）

## 技术栈

- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: NextAuth.js v5
- **UI**: shadcn/ui + Tailwind CSS
- **状态管理**: Zustand
- **图床**: AWS S3 SDK (支持Cloudflare R2/B2)
- **进程管理**: PM2

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件并填写以下配置：

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/timeprism?schema=public

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production

# OAuth Providers (Optional)
# See docs/AUTH_SETUP.md for detailed setup instructions
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# SMTP Email Configuration (Optional)
# Used for email verification, password reset, etc.
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=
SMTP_FROM_EMAIL=

# S3 Storage
S3_BUCKET_NAME=
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_CDN_URL=
S3_REGION=auto

# AI Model APIs
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
KIMI_API_KEY=
CUSTOM_API_URL=
CUSTOM_API_KEY=

# App
NODE_ENV=development
```

必需的环境变量：
- `DATABASE_URL`: PostgreSQL数据库连接字符串
- `NEXTAUTH_SECRET`: NextAuth密钥（可以使用 `openssl rand -base64 32` 生成）
- `NEXTAUTH_URL`: 应用URL

可选的环境变量：
- **OAuth 登录**: Google、GitHub 登录配置
- **SMTP 邮件**: 邮件发送配置
- **S3 存储**: 图床配置
- **AI 模型**: API 密钥

**详细配置指南**: 查看 [认证配置文档](./docs/AUTH_SETUP.md) 了解如何设置 Google、GitHub 登录和 SMTP 邮件服务。

### 3. 启动数据库

**方法1：使用 Docker（推荐）**

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: timeprism-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: timeprism
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

然后启动 PostgreSQL：

```bash
# 启动数据库
docker-compose up -d

# 查看数据库状态
docker-compose ps

# 停止数据库
docker-compose down
```

启动后，数据库连接信息：
- 主机: `localhost`
- 端口: `5432`
- 用户名: `postgres`
- 密码: `postgres`
- 数据库: `timeprism`

确保 `.env` 文件中的 `DATABASE_URL` 设置为：
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/timeprism?schema=public
```

**方法2：使用本地 PostgreSQL**

如果已安装 PostgreSQL，请确保服务正在运行：

```bash
# Windows (以管理员身份运行)
net start postgresql-x64-16  # 版本号可能不同

# 或使用服务管理器启动 PostgreSQL 服务
```

然后创建数据库：
```sql
CREATE DATABASE timeprism;
```

### 4. 初始化数据库

```bash
# 生成Prisma客户端
npm run db:generate

# 推送Schema到数据库
npm run db:push

# 或使用迁移
npm run db:migrate
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 6. 生产环境部署

使用PM2管理进程：

```bash
# 构建应用
npm run build

# 启动PM2
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 停止应用
pm2 stop timeprism

# 重启应用
pm2 restart timeprism
```

## 项目结构

```
TimePrism/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证相关路由
│   ├── (dashboard)/       # 主应用路由
│   └── api/               # API路由
├── components/            # React组件
│   ├── ui/               # shadcn/ui组件
│   ├── todos/            # Todo组件
│   ├── tasks/            # Task Manager组件
│   └── schedule/         # Schedule组件
├── lib/                  # 工具库
│   ├── db/               # Prisma客户端
│   ├── auth/             # NextAuth配置
│   ├── s3/               # S3存储服务
│   └── agent/            # Agent工作流引擎
├── hooks/                # React Hooks
├── types/                # TypeScript类型定义
├── store/                # Zustand状态管理
├── scripts/              # 工具脚本
├── tests/                # 测试文件
├── prisma/               # Prisma schema和migrations
└── ecosystem.config.js   # PM2配置
```

## S3图床配置

支持标准的S3兼容存储服务：

- **Cloudflare R2**: 设置endpoint为R2的endpoint
- **Backblaze B2**: 设置endpoint为B2的S3兼容endpoint
- **其他S3兼容服务**: 配置相应的endpoint

环境变量：
- `S3_BUCKET_NAME`: 桶名
- `S3_ENDPOINT`: endpoint地址
- `S3_ACCESS_KEY_ID`: Access Key ID
- `S3_SECRET_ACCESS_KEY`: Secret Access Key
- `S3_CDN_URL`: CDN地址（可选，用于CF Worker代理）
- `S3_REGION`: 区域（默认"auto"）

## Agent工作流

支持多个AI模型API：

- **OpenAI**: 设置 `OPENAI_API_KEY`
- **Anthropic**: 设置 `ANTHROPIC_API_KEY`
- **DeepSeek**: 设置 `DEEPSEEK_API_KEY`
- **Kimi**: 设置 `KIMI_API_KEY`
- **自定义API**: 设置 `CUSTOM_API_URL` 和 `CUSTOM_API_KEY`

### 预置工作流

1. **总结任务进度**: 自动总结用户的所有任务和待办事项
2. **生成任务文档**: 为任务生成详细文档并自动嵌入

## 开发

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# Prisma Studio（数据库管理工具）
npm run db:studio
```

## 许可证

AGPL-3.0 许可证

