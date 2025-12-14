#!/usr/bin/env node

/**
 * 批量修复 Next.js 15 中动态路由参数的异步类型问题
 * 将 { params }: { params: { id: string } } 改为 { params }: { params: Promise<{ id: string }> }
 * 并在函数开头添加 const { id } = await params
 * 同时替换所有 params.id 为 id
 */

const fs = require('fs');
const path = require('path');

const files = [
  'app/api/custom-statuses/[id]/route.ts',
  'app/api/messages/[id]/route.ts',
  'app/api/notifications/[id]/read/route.ts',
  'app/api/project-custom-statuses/[id]/route.ts',
  'app/api/projects/[id]/route.ts',
  'app/api/schedules/[id]/route.ts',
  'app/api/task-lists/[id]/route.ts',
  'app/api/tasks/[id]/route.ts',
  'app/api/todos/[id]/route.ts',
  'app/api/todos/[id]/attachments/route.ts',
  'app/api/upload/[id]/route.ts',
];

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`跳过: ${filePath} (文件不存在)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // 匹配所有的路由处理函数
  const routeHandlerPattern = /export async function (GET|POST|PUT|PATCH|DELETE)\(\s*request: Request,\s*\{ params \}: \{ params: \{ id: string \} \}\s*\) \{/g;
  
  content = content.replace(routeHandlerPattern, (match, method) => {
    modified = true;
    return `export async function ${method}(\n  request: Request,\n  { params }: { params: Promise<{ id: string }> }\n) {\n  const { id } = await params`;
  });

  // 替换所有 params.id 为 id
  if (content.includes('params.id')) {
    content = content.replace(/params\.id/g, 'id');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ 已修复: ${filePath}`);
  } else {
    console.log(`- 跳过: ${filePath} (无需修改)`);
  }
}

console.log('开始批量修复 Next.js 15 动态路由参数类型...\n');

files.forEach(fixFile);

console.log('\n修复完成!');
