# TimePrism 认证配置指南

本文档详细说明如何配置 TimePrism 的认证系统，包括邮箱密码登录、Google OAuth 和 GitHub OAuth。

## 📋 目录

- [基础配置](#基础配置)
- [Google OAuth 配置](#google-oauth-配置)
- [GitHub OAuth 配置](#github-oauth-配置)
- [SMTP 邮件配置（可选）](#smtp-邮件配置可选)
- [测试配置](#测试配置)
- [常见问题](#常见问题)

---

## 基础配置

### 1. NEXTAUTH_SECRET

这是 NextAuth.js 的加密密钥，用于签名和加密 session token。

**生成密钥：**

```bash
# 使用 OpenSSL (推荐)
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**配置 `.env`：**

```env
NEXTAUTH_SECRET=your-generated-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

⚠️ **生产环境**：将 `NEXTAUTH_URL` 改为你的实际域名（如 `https://yourdomain.com`）

---

## Google OAuth 配置

### 1. 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 项目名称：`TimePrism`（或自定义）

### 2. 启用 Google+ API

1. 在左侧菜单选择 **API 和服务** > **已启用的 API 和服务**
2. 点击 **+ 启用 API 和服务**
3. 搜索并启用 **Google+ API**

### 3. 创建 OAuth 2.0 凭据

1. 在左侧菜单选择 **API 和服务** > **凭据**
2. 点击 **创建凭据** > **OAuth 客户端 ID**

3. 如果首次创建，需要先配置 **OAuth 同意屏幕**：
   - 用户类型：选择 **外部**（个人项目）或 **内部**（组织内部）
   - 应用名称：`TimePrism`
   - 用户支持电子邮件：你的邮箱
   - 开发者联系信息：你的邮箱
   - 范围：添加 `.../auth/userinfo.email` 和 `.../auth/userinfo.profile`
   - 测试用户：添加你的 Google 账号（用于测试）

4. 创建 OAuth 客户端 ID：
   - 应用类型：**Web 应用**
   - 名称：`TimePrism Web Client`
   - 已获授权的重定向 URI：
     ```
     http://localhost:3000/api/auth/callback/google
     https://yourdomain.com/api/auth/callback/google  # 生产环境
     ```

5. 复制 **客户端 ID** 和 **客户端密钥**

### 4. 配置环境变量

在 `.env` 文件中添加：

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 5. Google OAuth 配置检查清单

- ✅ Google+ API 已启用
- ✅ OAuth 同意屏幕已配置
- ✅ 重定向 URI 正确（包含 `/api/auth/callback/google`）
- ✅ 测试用户已添加（开发阶段）
- ✅ 客户端 ID 和密钥已添加到 `.env`

---

## GitHub OAuth 配置

### 1. 创建 GitHub OAuth App

1. 访问 [GitHub Settings - Developer settings](https://github.com/settings/developers)
2. 点击 **OAuth Apps** > **New OAuth App**

### 2. 填写应用信息

- **Application name**: `TimePrism`
- **Homepage URL**: `http://localhost:3000`（开发环境）或 `https://yourdomain.com`（生产环境）
- **Application description**: `TimePrism - 时间管理应用`（可选）
- **Authorization callback URL**: 
  ```
  http://localhost:3000/api/auth/callback/github
  ```
  或生产环境：
  ```
  https://yourdomain.com/api/auth/callback/github
  ```

### 3. 获取凭据

1. 创建后，复制 **Client ID**
2. 点击 **Generate a new client secret**，复制生成的 **Client Secret**

⚠️ **重要**：Client Secret 只显示一次，请立即保存

### 4. 配置环境变量

在 `.env` 文件中添加：

```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 5. GitHub OAuth 配置检查清单

- ✅ OAuth App 已创建
- ✅ Callback URL 正确（包含 `/api/auth/callback/github`）
- ✅ Client ID 和 Secret 已添加到 `.env`
- ✅ Homepage URL 与 NEXTAUTH_URL 一致

---

## SMTP 邮件配置（可选）

### 功能说明

SMTP 配置用于发送：
- 注册验证邮件
- 密码重置邮件
- 通知邮件

### 支持的邮件服务

#### 1. Gmail

1. 访问 [Google Account Security](https://myaccount.google.com/security)
2. 启用 **两步验证**
3. 创建 **应用专用密码**：
   - 选择应用：其他（自定义名称）
   - 名称：`TimePrism`
   - 复制生成的 16 位密码

配置：
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=TimePrism <your-email@gmail.com>
```

#### 2. Outlook/Hotmail

配置：
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=TimePrism <your-email@outlook.com>
```

#### 3. QQ 邮箱

1. 访问 [QQ邮箱设置](https://mail.qq.com/)
2. 设置 > 账户 > 开启 SMTP 服务
3. 生成授权码

配置：
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@qq.com
SMTP_PASS=your-authorization-code
SMTP_FROM=TimePrism <your-email@qq.com>
```

#### 4. 163 网易邮箱

配置：
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=your-authorization-code
SMTP_FROM=TimePrism <your-email@163.com>
```

#### 5. 企业邮箱

根据你的企业邮箱提供商配置相应参数。

---

## 测试配置

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 测试邮箱密码登录

1. 访问 `http://localhost:3000/auth/register`
2. 输入邮箱和密码注册
3. 登录成功后会跳转到仪表板

### 3. 测试 Google 登录

1. 访问 `http://localhost:3000/auth/signin`
2. 点击 **Google** 按钮
3. 选择 Google 账号登录
4. 授权后会跳转回应用

### 4. 测试 GitHub 登录

1. 访问 `http://localhost:3000/auth/signin`
2. 点击 **GitHub** 按钮
3. 授权 GitHub OAuth App
4. 授权后会跳转回应用

### 5. 测试 SMTP（如已配置）

可以添加以下测试脚本到项目：

```typescript
// scripts/test-email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'your-test-email@example.com',
      subject: 'TimePrism 邮件测试',
      html: '<p>这是一封测试邮件</p>',
    });
    console.log('✅ 邮件发送成功:', info.messageId);
  } catch (error) {
    console.error('❌ 邮件发送失败:', error);
  }
}

sendTestEmail();
```

运行测试：
```bash
npx ts-node scripts/test-email.ts
```

---

## 常见问题

### Q1: Google 登录提示 "Access blocked: This app's request is invalid"

**原因**：重定向 URI 配置不正确

**解决**：
1. 检查 Google Cloud Console 中的重定向 URI
2. 确保 URI 完全匹配（包括协议、域名、端口和路径）
3. 确保包含 `/api/auth/callback/google`

### Q2: GitHub 登录后跳转到错误页面

**原因**：Callback URL 配置错误

**解决**：
1. 检查 GitHub OAuth App 设置中的 Authorization callback URL
2. 确保 URL 包含 `/api/auth/callback/github`
3. 确保 NEXTAUTH_URL 与 Homepage URL 一致

### Q3: 登录成功但无法获取用户信息

**原因**：OAuth 授权范围不足

**解决**：
- **Google**: 确保 OAuth 同意屏幕中添加了 email 和 profile 范围
- **GitHub**: GitHub OAuth 默认提供 email 和 profile，检查用户的 GitHub 账号是否公开邮箱

### Q4: NEXTAUTH_SECRET 错误

**症状**：无法登录，session 无效

**解决**：
1. 重新生成 NEXTAUTH_SECRET
2. 确保密钥至少 32 字符
3. 确保没有多余的空格或换行符

### Q5: 生产环境 OAuth 不工作

**检查清单**：
1. ✅ NEXTAUTH_URL 设置为生产域名
2. ✅ Google/GitHub OAuth 重定向 URI 包含生产域名
3. ✅ 使用 HTTPS（生产环境必需）
4. ✅ 环境变量正确设置

### Q6: 邮件发送失败

**常见原因**：
1. SMTP 端口被防火墙阻止（尝试使用其他端口）
2. 需要启用"不够安全的应用"访问（Gmail）
3. 需要使用应用专用密码（Gmail、QQ邮箱等）
4. 授权码错误（QQ、163 等）

---

## 环境变量完整示例

```env
# ============================================
# Database
# ============================================
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/timeprism?schema=public

# ============================================
# NextAuth - 必需配置
# ============================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-here-at-least-32-characters

# ============================================
# OAuth Providers - Google
# ============================================
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# ============================================
# OAuth Providers - GitHub
# ============================================
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# ============================================
# SMTP Email (可选)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=TimePrism <your-email@gmail.com>

# ============================================
# S3 Storage
# ============================================
S3_BUCKET_NAME=your-bucket-name
S3_ENDPOINT=your-s3-endpoint
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_CDN_URL=your-cdn-url
S3_REGION=auto

# ============================================
# AI Model APIs (可选)
# ============================================
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
KIMI_API_KEY=
CUSTOM_API_URL=
CUSTOM_API_KEY=

# ============================================
# App
# ============================================
NODE_ENV=development
```

---

## 生产环境部署提示

1. **HTTPS 必需**：所有 OAuth 回调在生产环境必须使用 HTTPS
2. **域名绑定**：确保 NEXTAUTH_URL 使用实际域名
3. **更新回调 URL**：在 Google/GitHub 中添加生产环境回调 URL
4. **密钥安全**：不要将 `.env` 文件提交到 Git
5. **OAuth 发布**：Google OAuth 需要通过审核才能公开使用（或保持测试状态）

---

## 获取帮助

如遇问题，请：

1. 查看 [NextAuth.js 文档](https://next-auth.js.org/)
2. 检查浏览器控制台和服务器日志
3. 提交 Issue 到项目 GitHub
4. 联系项目维护者

---

**最后更新**: 2025-12-14
