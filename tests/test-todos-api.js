// Todo API测试

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

function logTest(name, passed, error = null) {
  if (passed) {
    console.log(`✅ ${name}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${name}`);
    if (error) {
      console.error(`   错误: ${error.message}`);
      testResults.errors.push({ test: name, error: error.message });
    }
    testResults.failed++;
  }
}

async function runTest(name, testFn) {
  try {
    await testFn();
    logTest(name, true);
  } catch (error) {
    logTest(name, false, error);
  }
}

// 创建测试用户并获取session
async function createTestUserWithSession() {
  const email = `test-${Date.now()}@example.com`;
  const password = 'test123456';
  
  // 创建用户
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Test User',
    },
  });

  // 注意：由于NextAuth使用JWT session，我们需要实际的HTTP请求来获取session
  // 这里我们直接使用Prisma来测试API逻辑，或者创建一个测试辅助函数
  return { user, email, password };
}

// 直接使用Prisma测试API逻辑
async function testTodoAPILogic() {
  console.log('\n=== Todo API逻辑测试（使用Prisma直接测试）===');

  let testUserId = null;
  let testUserId2 = null;
  let testTodoId = null;

  // 创建两个测试用户
  await runTest('创建测试用户', async () => {
    const user1 = await prisma.user.create({
      data: {
        email: `test1-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'User 1',
      },
    });
    testUserId = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: `test2-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'User 2',
      },
    });
    testUserId2 = user2.id;
  });

  // 测试创建Todo
  await runTest('创建Todo', async () => {
    const todo = await prisma.todo.create({
      data: {
        title: '测试Todo',
        description: '测试描述',
        priority: 'MEDIUM',
        category: '测试',
        tags: ['test'],
        userId: testUserId,
      },
    });
    testTodoId = todo.id;
    if (todo.userId !== testUserId) {
      throw new Error('userId不正确');
    }
  });

  // 测试获取用户的Todos（用户隔离）
  await runTest('获取用户的Todos - 用户隔离', async () => {
    const todos = await prisma.todo.findMany({
      where: { userId: testUserId },
    });
    if (todos.length === 0) {
      throw new Error('应该找到用户的todos');
    }
    if (todos.some(t => t.userId !== testUserId)) {
      throw new Error('返回了其他用户的todos');
    }
  });

  // 测试用户2无法访问用户1的Todo
  await runTest('用户隔离 - 用户2无法访问用户1的Todo', async () => {
    const todo = await prisma.todo.findFirst({
      where: {
        id: testTodoId,
        userId: testUserId2, // 尝试用用户2访问
      },
    });
    if (todo) {
      throw new Error('用户2不应该能访问用户1的todo');
    }
  });

  // 测试更新Todo
  await runTest('更新Todo', async () => {
    const todo = await prisma.todo.update({
      where: { id: testTodoId },
      data: { completed: true, priority: 'HIGH' },
    });
    if (!todo.completed || todo.priority !== 'HIGH') {
      throw new Error('更新失败');
    }
  });

  // 测试删除Todo
  await runTest('删除Todo', async () => {
    await prisma.todo.delete({
      where: { id: testTodoId },
    });
    const todo = await prisma.todo.findUnique({
      where: { id: testTodoId },
    });
    if (todo) {
      throw new Error('Todo应该被删除');
    }
  });

  // 清理
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  await prisma.user.delete({ where: { id: testUserId2 } }).catch(() => {});
}

// 测试数据验证
async function testDataValidation() {
  console.log('\n=== 数据验证测试 ===');

  let testUserId = null;

  await runTest('创建测试用户', async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'Test User',
      },
    });
    testUserId = user.id;
  });

  // 测试空标题应该失败（在API层面，这里直接测试数据库约束）
  await runTest('空标题应该被拒绝', async () => {
    try {
      await prisma.todo.create({
        data: {
          title: '', // 空标题
          userId: testUserId,
        },
      });
      // 如果创建成功，说明验证不够严格
      throw new Error('空标题应该被拒绝');
    } catch (error) {
      // 期望抛出错误
      if (!error.message.includes('title') && !error.message.includes('constraint')) {
        // 如果不是预期的错误，重新抛出
        throw error;
      }
    }
  });

  // 测试无效优先级
  await runTest('无效优先级应该被拒绝', async () => {
    try {
      await prisma.todo.create({
        data: {
          title: '测试',
          priority: 'INVALID', // 无效优先级
          userId: testUserId,
        },
      });
      throw new Error('无效优先级应该被拒绝');
    } catch (error) {
      // 期望抛出错误
      if (!error.message.includes('priority') && !error.message.includes('Invalid')) {
        throw error;
      }
    }
  });

  // 清理
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
}

// 主测试函数
async function runAllTests() {
  console.log('开始Todo API测试...\n');

  try {
    await testTodoAPILogic();
    await testDataValidation();

    // 输出测试结果
    console.log('\n=== 测试结果 ===');
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`总计: ${testResults.passed + testResults.failed}`);

    if (testResults.errors.length > 0) {
      console.log('\n错误详情:');
      testResults.errors.forEach(({ test, error }) => {
        console.log(`  - ${test}: ${error}`);
      });
    }

    await prisma.$disconnect();
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('测试执行出错:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };






