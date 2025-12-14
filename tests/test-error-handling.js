// 错误处理测试

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

// 测试数据验证错误（400）
async function testValidationErrors() {
  console.log('\n=== 数据验证错误测试 (400) ===');

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

  // 测试无效优先级
  await runTest('无效优先级应该被拒绝', async () => {
    try {
      await prisma.todo.create({
        data: {
          title: '测试',
          priority: 'INVALID_PRIORITY', // 无效值
          userId: testUserId,
        },
      });
      throw new Error('无效优先级应该被拒绝');
    } catch (error) {
      // Prisma会抛出错误
      if (!error.message.includes('Invalid') && !error.message.includes('enum')) {
        throw error;
      }
    }
  });

  // 测试无效状态
  await runTest('无效状态应该被拒绝', async () => {
    try {
      await prisma.task.create({
        data: {
          title: '测试',
          status: 'INVALID_STATUS', // 无效值
          taskListId: 'dummy',
          userId: testUserId,
        },
      });
      throw new Error('无效状态应该被拒绝');
    } catch (error) {
      // 应该抛出错误（可能是外键错误或枚举错误）
      if (!error.message.includes('Invalid') && 
          !error.message.includes('enum') && 
          !error.message.includes('Foreign key')) {
        throw error;
      }
    }
  });

  // 测试无效日期格式（在API层面，这里测试数据库约束）
  await runTest('无效日期应该被处理', async () => {
    try {
      // Prisma会验证日期格式
      const todo = await prisma.todo.create({
        data: {
          title: '测试',
          dueDate: new Date('invalid-date'), // 无效日期
          userId: testUserId,
        },
      });
      // 如果创建成功，说明需要API层验证
      if (isNaN(todo.dueDate?.getTime())) {
        throw new Error('无效日期应该被拒绝');
      }
    } catch (error) {
      // 期望抛出错误
      if (!error.message.includes('Invalid') && !error.message.includes('date')) {
        throw error;
      }
    }
  });

  // 清理
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
}

// 测试资源不存在错误（404）
async function testNotFoundErrors() {
  console.log('\n=== 资源不存在错误测试 (404) ===');

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

  // 测试查询不存在的Todo
  await runTest('查询不存在的Todo应该返回null', async () => {
    const todo = await prisma.todo.findUnique({
      where: { id: 'non-existent-id' },
    });
    if (todo !== null) {
      throw new Error('不存在的Todo应该返回null');
    }
  });

  // 测试查询不存在的Task
  await runTest('查询不存在的Task应该返回null', async () => {
    const task = await prisma.task.findUnique({
      where: { id: 'non-existent-id' },
    });
    if (task !== null) {
      throw new Error('不存在的Task应该返回null');
    }
  });

  // 测试查询不存在的Schedule
  await runTest('查询不存在的Schedule应该返回null', async () => {
    const schedule = await prisma.schedule.findUnique({
      where: { id: 'non-existent-id' },
    });
    if (schedule !== null) {
      throw new Error('不存在的Schedule应该返回null');
    }
  });

  // 清理
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
}

// 测试外键约束错误
async function testForeignKeyErrors() {
  console.log('\n=== 外键约束错误测试 ===');

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

  // 测试使用不存在的taskListId创建Task
  await runTest('使用不存在的taskListId应该失败', async () => {
    try {
      await prisma.task.create({
        data: {
          title: '测试任务',
          taskListId: 'non-existent-tasklist-id',
          userId: testUserId,
        },
      });
      throw new Error('应该抛出外键约束错误');
    } catch (error) {
      if (!error.message.includes('Foreign key') && 
          !error.message.includes('constraint') &&
          !error.message.includes('Record to update not found')) {
        throw error;
      }
    }
  });

  // 测试使用不存在的userId创建Todo
  await runTest('使用不存在的userId应该失败', async () => {
    try {
      await prisma.todo.create({
        data: {
          title: '测试',
          userId: 'non-existent-user-id',
        },
      });
      throw new Error('应该抛出外键约束错误');
    } catch (error) {
      if (!error.message.includes('Foreign key') && 
          !error.message.includes('constraint') &&
          !error.message.includes('Record to update not found')) {
        throw error;
      }
    }
  });

  // 清理
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
}

// 测试边界情况
async function testEdgeCases() {
  console.log('\n=== 边界情况测试 ===');

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

  // 测试超长字符串
  await runTest('超长标题应该被处理', async () => {
    const longTitle = 'a'.repeat(10000); // 超长字符串
    try {
      const todo = await prisma.todo.create({
        data: {
          title: longTitle,
          userId: testUserId,
        },
      });
      // 如果创建成功，说明数据库允许，但API层应该验证长度
      if (todo.title.length > 1000) {
        // 假设合理长度限制为1000
        console.log('   警告: 数据库允许超长字符串，建议在API层添加长度限制');
      }
    } catch (error) {
      // 如果数据库有长度限制，会抛出错误
      if (!error.message.includes('value too long') && 
          !error.message.includes('exceeds maximum')) {
        throw error;
      }
    }
  });

  // 测试空数组tags
  await runTest('空数组tags应该被接受', async () => {
    const todo = await prisma.todo.create({
      data: {
        title: '测试',
        tags: [], // 空数组
        userId: testUserId,
      },
    });
    if (!Array.isArray(todo.tags) || todo.tags.length !== 0) {
      throw new Error('空数组tags应该被接受');
    }
  });

  // 测试大量tags
  await runTest('大量tags应该被处理', async () => {
    const manyTags = Array.from({ length: 100 }, (_, i) => `tag${i}`);
    const todo = await prisma.todo.create({
      data: {
        title: '测试',
        tags: manyTags,
        userId: testUserId,
      },
    });
    if (todo.tags.length !== 100) {
      throw new Error('大量tags应该被保存');
    }
  });

  // 测试null和undefined值
  await runTest('null值应该被正确处理', async () => {
    const todo = await prisma.todo.create({
      data: {
        title: '测试',
        description: null,
        category: null,
        dueDate: null,
        userId: testUserId,
      },
    });
    if (todo.description !== null || todo.category !== null || todo.dueDate !== null) {
      throw new Error('null值应该被正确保存');
    }
  });

  // 测试日期边界
  await runTest('日期边界值应该被处理', async () => {
    const pastDate = new Date('1900-01-01');
    const futureDate = new Date('2100-12-31');
    
    const todo1 = await prisma.todo.create({
      data: {
        title: '过去日期',
        dueDate: pastDate,
        userId: testUserId,
      },
    });

    const todo2 = await prisma.todo.create({
      data: {
        title: '未来日期',
        dueDate: futureDate,
        userId: testUserId,
      },
    });

    if (!todo1.dueDate || !todo2.dueDate) {
      throw new Error('日期边界值应该被保存');
    }
  });

  // 清理
  const todos = await prisma.todo.findMany({
    where: { userId: testUserId },
  });
  for (const todo of todos) {
    await prisma.todo.delete({ where: { id: todo.id } }).catch(() => {});
  }
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
}

// 测试并发操作
async function testConcurrency() {
  console.log('\n=== 并发操作测试 ===');

  let testUserId = null;
  let testTodoId = null;

  await runTest('创建测试数据', async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    const todo = await prisma.todo.create({
      data: {
        title: '测试',
        userId: testUserId,
      },
    });
    testTodoId = todo.id;
  });

  // 测试并发更新
  await runTest('并发更新应该正确处理', async () => {
    const updates = [
      prisma.todo.update({
        where: { id: testTodoId },
        data: { priority: 'HIGH' },
      }),
      prisma.todo.update({
        where: { id: testTodoId },
        data: { completed: true },
      }),
    ];

    await Promise.all(updates);

    const todo = await prisma.todo.findUnique({
      where: { id: testTodoId },
    });

    // 最后一次更新应该生效
    if (todo.priority !== 'HIGH' || !todo.completed) {
      throw new Error('并发更新可能有问题');
    }
  });

  // 清理
  await prisma.todo.delete({ where: { id: testTodoId } }).catch(() => {});
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
}

// 主测试函数
async function runAllTests() {
  console.log('开始错误处理和边界情况测试...\n');

  try {
    await testValidationErrors();
    await testNotFoundErrors();
    await testForeignKeyErrors();
    await testEdgeCases();
    await testConcurrency();

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






