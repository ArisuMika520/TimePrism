# 测试文档

## 测试脚本说明

### 核心测试脚本

#### 1. test-utils.js
测试工具库，提供：
- 用户创建和认证工具
- 测试数据生成器
- 断言工具
- 辅助函数

#### 2. test-database.js
数据库操作测试（不需要服务器运行）：
- 基本CRUD操作
- 关系模型验证
- 级联删除测试

#### 3. test-auth.js
认证API测试（需要服务器运行）：
- 用户注册
- 用户登录
- Session管理
- 未授权访问处理

#### 4. test-todos-api.js
Todo API测试（需要服务器运行）：
- Todo CRUD操作
- 用户隔离验证
- 数据验证

#### 5. test-tasks-api.js
Task和TaskList API测试（需要服务器运行）：
- TaskList CRUD操作
- Task CRUD操作
- 任务移动（同一列表内、跨列表）
- 级联删除

#### 6. test-schedules-api.js
Schedule API测试（需要服务器运行）：
- Schedule CRUD操作
- 时间范围查询
- 重复事件
- Task/Todo关联

#### 7. test-error-handling.js
错误处理测试（需要服务器运行）：
- 未授权访问
- 无效数据验证
- 资源不存在处理
- 边界情况处理

#### 8. test-upload-api.js
上传API测试（数据库层面，不需要服务器）：
- Attachment CRUD操作
- 文件关联（Task、Schedule、Todo）
- 权限验证

#### 9. test-upload-api-full.js
上传API完整测试（HTTP API，需要服务器和S3配置）：
- 文件上传端点
- 文件类型验证
- 文件大小限制
- 未授权访问处理

#### 10. test-performance.js
性能测试（需要服务器运行）：
- 批量操作性能
- 查询性能
- 响应时间测试

## 运行测试

### 快速开始

```bash
# 运行所有测试（推荐）
npm run test:all

# 运行数据库测试（不需要服务器）
npm run test:db

# 运行特定功能测试（需要服务器运行）
npm run test:todos      # Todo API测试
npm run test:tasks      # Task API测试
npm run test:schedules  # Schedule API测试
npm run test:auth       # 认证API测试
npm run test:errors     # 错误处理测试
npm run test:upload     # 上传API测试（数据库层面）
npm run test:upload:full # 上传API完整测试（HTTP API，需要S3配置）
npm run test:performance # 性能测试
```

### 运行API测试（需要服务器）

```bash
# 1. 先启动开发服务器
npm run dev

# 2. 在另一个终端运行测试
npm run test:todos
npm run test:tasks
npm run test:schedules
```

## 环境变量

测试脚本使用以下环境变量：
- `TEST_BASE_URL`: 测试服务器地址（默认: http://localhost:3000）
- `DATABASE_URL`: 数据库连接字符串（用于数据库测试）

## 测试覆盖

### 已实现 ✅
- ✅ 数据库基本CRUD操作
- ✅ 关系模型验证
- ✅ 级联删除测试
- ✅ API端点测试（Todo、Task、Schedule）
- ✅ 错误处理测试
- ✅ 用户隔离验证
- ✅ 上传功能测试（数据库层面和HTTP API）
- ✅ 性能测试

### 注意事项

1. **数据库测试**: `test-database.js` 和 `test-upload-api.js` 直接使用Prisma Client，不需要服务器运行。

2. **API测试**: 其他测试脚本需要服务器运行（`npm run dev`），并且需要处理NextAuth的session cookie。

3. **S3上传测试**: `test-upload-api-full.js` 需要：
   - 服务器运行
   - 有效的S3配置（.env文件中的S3相关配置）
   - 用户认证（session cookie）

4. **测试数据清理**: 测试会自动清理创建的测试数据，但如果有测试失败，可能需要手动清理。

5. **认证问题**: 部分API测试由于NextAuth的cookie机制限制，可能无法完全测试认证流程。建议使用真实的浏览器环境进行端到端测试。






