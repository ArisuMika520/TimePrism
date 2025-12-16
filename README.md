<div align="center">
  <img src="public/tp logo512.png" alt="TimePrism Logo" width="200"/>
  <h1>TimePrism</h1>
</div>

一个集成了Todo、Task Manager（看板视图）和Schedule（日程）的现代化Web应用。

## 功能特性

- **Todo管理**: 创建、编辑、删除待办事项，支持优先级、分类、标签
- **Task Manager**: 看板视图，支持拖拽操作
- **Schedule**: 日程管理，支持月/周/日视图
- **S3图床**: 支持Cloudflare R2、Backblaze B2等S3兼容存储
- **Agent工作流**: 集成多模型API（OpenAI、Anthropic、DeepSeek、Kimi、自定义API）

## 界面展示

<div align="center">
  <img src="public/sample0.png" alt="主界面" width="800"/>
  <p><em>主界面</em></p>
</div>

<div align="center">
  <img src="public/sample1.png" alt="Todo管理" width="800"/>
  <p><em>Todo管理</em></p>
</div>

<div align="center">
  <img src="public/sample2.png" alt="Task看板" width="800"/>
  <p><em>任务看板</em></p>
</div>

<div align="center">
  <img src="public/sample3.png" alt="日程管理" width="800"/>
  <p><em>Task管理</em></p>
</div>

<div align="center">
  <img src="public/sample4.png" alt="消息中心" width="800"/>
  <p><em>聚焦搜索&命令面板（Ctrl+Alt+/）</em></p>
</div>

## 技术栈

- **框架**: Next.js 15+ (App Router)
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



必需的环境变量：
- `DATABASE_URL`: PostgreSQL数据库连接字符串
- `NEXTAUTH_SECRET`: NextAuth密钥（可以使用 `openssl rand -base64 32` 生成）
- `NEXTAUTH_URL`: 应用URL

可选的环境变量：
- **OAuth 登录**: Google、GitHub 登录配置
- **SMTP 邮件**: 邮件注册/验证码发送配置
- **S3 存储**: 图床配置

**详细配置指南**: 查看 [认证配置文档](./docs/AUTH_SETUP.md) 了解如何设置 Google、GitHub 登录和 SMTP 邮件服务。

### 3. 启动数据库

**方法1：使用 Docker**

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

### 6. 生产环境部署（本项目生产环境端口为5000）

#### 服务器部署步骤

**重要提示**: 确保在项目根目录下执行所有命令！

```bash
# 1. 找到项目目录（如果不知道项目位置）
# 通常项目会在以下位置之一：
# - /home/your-username/TimePrism
# - /var/www/TimePrism
# - /opt/TimePrism
# 或使用 find 命令查找
find / -name "package.json" -path "*/TimePrism/*" 2>/dev/null

# 2. 切换到项目目录
cd /path/to/TimePrism  # 替换为实际的项目路径

# 3. 确认在正确的目录（应该能看到 package.json）
ls -la package.json

# 4. 安装依赖（如果还没安装）
npm install

# 5. 配置环境变量
# 确保 .env 文件存在并配置正确
cp .env.example .env  # 如果有示例文件
nano .env  # 编辑环境变量

# 6. 初始化数据库
npm run db:generate
npm run db:push
# 或使用迁移
npm run db:migrate

# 7. 构建应用
npm run build

# 8. 启动 PM2 进程
npm run pm2:start
```

**常见错误**:
- ❌ 在错误的目录下执行命令（如 `/var/lib/postgresql/`）（我自己就创建完数据库后忘记退出了（（））
- ✅ 必须在项目根目录（包含 `package.json` 的目录）下执行

**验证当前目录**:
```bash
# 检查是否在项目目录
pwd  # 查看当前路径
ls package.json  # 应该能看到 package.json 文件
```

#### PM2 进程管理

TimePrism 使用 PM2 管理两个进程：

1. **timeprism** - 主应用进程（Web 服务器）
2. **timeprism-auto-archive** - 自动归档定时任务

#### 快速开始

```bash
# 1. 构建应用
npm run build

# 2. 启动所有 PM2 进程
npm run pm2:start
# 或
pm2 start ecosystem.config.js

# 应用将运行在 http://localhost:5000
```

#### 进程说明

**timeprism（主应用）**
- **作用**: 运行 Next.js 生产服务器，处理所有 HTTP 请求
- **运行模式**: 常驻进程，自动重启
- **端口**: 5000（生产环境）
- **日志**: `./logs/pm2-out.log` 和 `./logs/pm2-error.log`

**timeprism-auto-archive（自动归档任务）**
- **作用**: 定时执行待办事项自动归档任务
- **运行模式**: 定时任务，每天凌晨 3:00 执行
- **功能**:
  - 归档已完成的任务（状态为 `COMPLETE`）
  - 归档逾期的任务（已过截止日期且未完成）
  - 清理过期的归档记录（根据用户配置）
- **日志**: `./logs/auto-archive-out.log` 和 `./logs/auto-archive-error.log`
- **注意**: 该进程执行完会自动退出，等待下次定时触发

#### 常用 PM2 命令

```bash
# 查看所有进程状态
npm run pm2:status
# 或
pm2 status

# 查看实时日志
npm run pm2:logs
# 或
pm2 logs

# 查看特定进程日志
pm2 logs timeprism
pm2 logs timeprism-auto-archive

# 重启所有进程
npm run pm2:restart
# 或
pm2 restart ecosystem.config.js

# 重启特定进程
pm2 restart timeprism
pm2 restart timeprism-auto-archive

# 重载应用（零停机时间，仅适用于主应用）
npm run pm2:reload
# 或
pm2 reload timeprism

# 停止所有进程
npm run pm2:stop
# 或
pm2 stop ecosystem.config.js

# 停止特定进程
pm2 stop timeprism
pm2 stop timeprism-auto-archive

# 删除进程（从 PM2 列表中移除）
npm run pm2:delete
# 或
pm2 delete timeprism
pm2 delete timeprism-auto-archive

# 监控面板（实时查看 CPU、内存使用情况）
npm run pm2:monit
# 或
pm2 monit
```

#### 开机自启动

```bash
# 1. 保存当前 PM2 进程列表
npm run pm2:save
# 或
pm2 save

# 2. 设置开机自启动（需要 root 权限）
npm run pm2:startup
# 或
pm2 startup

# 3. 执行上一步生成的命令（例如）：
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-username --hp /home/your-username
```

#### 进程管理最佳实践

1. **首次部署**:
   ```bash
   npm run build
   npm run pm2:start
   npm run pm2:save
   ```

2. **更新代码后**:
   ```bash
   npm run build
   npm run pm2:reload  # 零停机时间重载
   ```

3. **查看日志排查问题**:
   ```bash
   # 查看主应用日志
   pm2 logs timeprism --lines 100
   
   # 查看归档任务日志
   pm2 logs timeprism-auto-archive --lines 100
   ```

4. **手动执行归档任务**（测试用）:
   ```bash
   # 直接运行脚本
   node scripts/auto-archive.js
   
   # 或通过 PM2 手动触发
   pm2 restart timeprism-auto-archive
   ```

#### 配置文件

PM2 配置位于 `ecosystem.config.js`，包含：
- 主应用配置（端口、环境变量、日志等）
- 自动归档任务配置（定时规则、日志等）

修改配置后需要重启进程：
```bash
pm2 delete ecosystem.config.js
pm2 start ecosystem.config.js
pm2 save
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

