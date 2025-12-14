// 性能测试

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

// 性能指标
const performanceMetrics = {
  todoCreation: [],
  taskCreation: [],
  scheduleCreation: [],
  queryPerformance: [],
};

function formatTime(ms) {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

// 测试大量数据创建性能
async function testBulkCreationPerformance() {
  console.log('\n=== 大量数据创建性能测试 ===');

  let testUserId = null;
  const batchSize = 100;

  await runTest('创建测试用户', async () => {
    const user = await prisma.user.create({
      data: {
        email: `perf-test-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'Performance Test User',
      },
    });
    testUserId = user.id;
  });

  // 测试批量创建Todos
  await runTest(`批量创建${batchSize}个Todos`, async () => {
    const start = Date.now();
    
    const todos = [];
    for (let i = 0; i < batchSize; i++) {
      todos.push({
        title: `性能测试Todo ${i}`,
        description: `这是第${i}个测试待办事项`,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
        userId: testUserId,
      });
    }

    await prisma.todo.createMany({
      data: todos,
    });

    const duration = Date.now() - start;
    performanceMetrics.todoCreation.push(duration);
    console.log(`   耗时: ${formatTime(duration)} (平均: ${formatTime(duration / batchSize)}/个)`);
    
    if (duration > 5000) {
      console.log('   ⚠️  警告: 创建速度较慢，建议优化');
    }
  });

  // 测试批量创建Tasks
  await runTest(`批量创建${batchSize}个Tasks`, async () => {
    const taskList = await prisma.taskList.create({
      data: {
        name: '性能测试任务列表',
        userId: testUserId,
      },
    });

    const start = Date.now();
    
    const tasks = [];
    for (let i = 0; i < batchSize; i++) {
      tasks.push({
        title: `性能测试任务 ${i}`,
        status: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'][i % 4],
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
        position: i,
        taskListId: taskList.id,
        userId: testUserId,
      });
    }

    await prisma.task.createMany({
      data: tasks,
    });

    const duration = Date.now() - start;
    performanceMetrics.taskCreation.push(duration);
    console.log(`   耗时: ${formatTime(duration)} (平均: ${formatTime(duration / batchSize)}/个)`);
    
    if (duration > 5000) {
      console.log('   ⚠️  警告: 创建速度较慢，建议优化');
    }
  });

  // 测试批量创建Schedules
  await runTest(`批量创建${batchSize}个Schedules`, async () => {
    const start = Date.now();
    
    const schedules = [];
    const baseDate = new Date();
    for (let i = 0; i < batchSize; i++) {
      const startTime = new Date(baseDate.getTime() + i * 86400000); // 每天一个
      const endTime = new Date(startTime.getTime() + 3600000); // 1小时后
      schedules.push({
        title: `性能测试日程 ${i}`,
        startTime,
        endTime,
        userId: testUserId,
      });
    }

    await prisma.schedule.createMany({
      data: schedules,
    });

    const duration = Date.now() - start;
    performanceMetrics.scheduleCreation.push(duration);
    console.log(`   耗时: ${formatTime(duration)} (平均: ${formatTime(duration / batchSize)}/个)`);
    
    if (duration > 5000) {
      console.log('   ⚠️  警告: 创建速度较慢，建议优化');
    }
  });

  return testUserId;
}

// 测试查询性能
async function testQueryPerformance(testUserId) {
  console.log('\n=== 查询性能测试 ===');

  // 测试获取所有Todos
  await runTest('查询所有Todos（带索引）', async () => {
    const start = Date.now();
    const todos = await prisma.todo.findMany({
      where: { userId: testUserId },
      orderBy: { createdAt: 'desc' },
    });
    const duration = Date.now() - start;
    performanceMetrics.queryPerformance.push({ type: 'todos', duration, count: todos.length });
    console.log(`   查询${todos.length}条记录，耗时: ${formatTime(duration)}`);
    
    if (duration > 1000) {
      console.log('   ⚠️  警告: 查询速度较慢，建议检查索引');
    }
  });

  // 测试获取TaskLists with Tasks（关联查询）
  await runTest('查询TaskLists with Tasks（关联查询）', async () => {
    const start = Date.now();
    const taskLists = await prisma.taskList.findMany({
      where: { userId: testUserId },
      include: {
        tasks: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });
    const duration = Date.now() - start;
    const totalTasks = taskLists.reduce((sum, tl) => sum + tl.tasks.length, 0);
    performanceMetrics.queryPerformance.push({ type: 'taskLists', duration, count: taskLists.length, tasks: totalTasks });
    console.log(`   查询${taskLists.length}个TaskList和${totalTasks}个Task，耗时: ${formatTime(duration)}`);
    
    if (duration > 2000) {
      console.log('   ⚠️  警告: 关联查询速度较慢，建议优化');
    }
  });

  // 测试时间范围查询Schedules
  await runTest('时间范围查询Schedules', async () => {
    const start = Date.now();
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 86400000); // 30天后
    
    const schedules = await prisma.schedule.findMany({
      where: {
        userId: testUserId,
        OR: [
          {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            endTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            AND: [
              { startTime: { lte: startDate } },
              { endTime: { gte: endDate } },
            ],
          },
        ],
      },
      orderBy: { startTime: 'asc' },
    });
    const duration = Date.now() - start;
    performanceMetrics.queryPerformance.push({ type: 'schedules', duration, count: schedules.length });
    console.log(`   查询${schedules.length}条记录，耗时: ${formatTime(duration)}`);
    
    if (duration > 1000) {
      console.log('   ⚠️  警告: 时间范围查询速度较慢，建议检查索引');
    }
  });
}

// 测试数据库索引
async function testDatabaseIndexes() {
  console.log('\n=== 数据库索引测试 ===');

  let testUserId = null;

  await runTest('创建测试用户', async () => {
    const user = await prisma.user.create({
      data: {
        email: `index-test-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'Index Test User',
      },
    });
    testUserId = user.id;
  });

  // 测试userId索引
  await runTest('测试userId索引（Todo查询）', async () => {
    const start = Date.now();
    const todos = await prisma.todo.findMany({
      where: { userId: testUserId },
    });
    const duration = Date.now() - start;
    console.log(`   查询耗时: ${formatTime(duration)}`);
    
    if (duration > 500) {
      console.log('   ⚠️  警告: userId索引可能未生效');
    }
  });

  // 测试completed索引
  await runTest('测试completed索引（Todo查询）', async () => {
    const start = Date.now();
    const todos = await prisma.todo.findMany({
      where: { 
        userId: testUserId,
        completed: false,
      },
    });
    const duration = Date.now() - start;
    console.log(`   查询耗时: ${formatTime(duration)}`);
    
    if (duration > 500) {
      console.log('   ⚠️  警告: completed索引可能未生效');
    }
  });

  // 测试时间索引
  await runTest('测试时间索引（Schedule查询）', async () => {
    const start = Date.now();
    const schedules = await prisma.schedule.findMany({
      where: {
        userId: testUserId,
        startTime: {
          gte: new Date(),
        },
      },
      orderBy: { startTime: 'asc' },
    });
    const duration = Date.now() - start;
    console.log(`   查询耗时: ${formatTime(duration)}`);
    
    if (duration > 500) {
      console.log('   ⚠️  警告: startTime索引可能未生效');
    }
  });

  // 清理
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
}

// 测试N+1查询问题
async function testNPlusOneQuery() {
  console.log('\n=== N+1查询问题测试 ===');

  let testUserId = null;

  await runTest('创建测试数据', async () => {
    const user = await prisma.user.create({
      data: {
        email: `nplusone-test-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'N+1 Test User',
      },
    });
    testUserId = user.id;

    // 创建多个TaskLists和Tasks
    for (let i = 0; i < 10; i++) {
      const taskList = await prisma.taskList.create({
        data: {
          name: `任务列表 ${i}`,
          userId: testUserId,
        },
      });

      for (let j = 0; j < 10; j++) {
        await prisma.task.create({
          data: {
            title: `任务 ${i}-${j}`,
            taskListId: taskList.id,
            userId: testUserId,
            position: j,
          },
        });
      }
    }
  });

  // 测试N+1查询（错误方式）
  await runTest('检测N+1查询问题', async () => {
    const start = Date.now();
    
    // 正确方式：使用include一次性查询
    const taskLists = await prisma.taskList.findMany({
      where: { userId: testUserId },
      include: {
        tasks: true,
      },
    });

    const duration = Date.now() - start;
    console.log(`   使用include查询，耗时: ${formatTime(duration)}`);
    console.log(`   查询了${taskLists.length}个TaskList和${taskLists.reduce((sum, tl) => sum + tl.tasks.length, 0)}个Task`);
    
    if (duration > 1000) {
      console.log('   ⚠️  警告: 查询时间较长，可能存在优化空间');
    } else {
      console.log('   ✅ 查询性能良好，使用了正确的关联查询方式');
    }
  });

  // 清理
  const taskLists = await prisma.taskList.findMany({ where: { userId: testUserId } });
  for (const tl of taskLists) {
    await prisma.taskList.delete({ where: { id: tl.id } }).catch(() => {});
  }
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
}

// 主测试函数
async function runAllTests() {
  console.log('开始性能测试...\n');
  console.log('注意: 性能测试结果可能因硬件配置而异。\n');

  try {
    const testUserId = await testBulkCreationPerformance();
    await testQueryPerformance(testUserId);
    await testDatabaseIndexes();
    await testNPlusOneQuery();

    // 清理测试数据
    if (testUserId) {
      const todos = await prisma.todo.findMany({ where: { userId: testUserId } });
      for (const todo of todos) {
        await prisma.todo.delete({ where: { id: todo.id } }).catch(() => {});
      }

      const schedules = await prisma.schedule.findMany({ where: { userId: testUserId } });
      for (const schedule of schedules) {
        await prisma.schedule.delete({ where: { id: schedule.id } }).catch(() => {});
      }

      const taskLists = await prisma.taskList.findMany({ where: { userId: testUserId } });
      for (const taskList of taskLists) {
        await prisma.taskList.delete({ where: { id: taskList.id } }).catch(() => {});
      }

      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }

    // 输出性能总结
    console.log('\n=== 性能测试总结 ===');
    if (performanceMetrics.todoCreation.length > 0) {
      const avg = performanceMetrics.todoCreation.reduce((a, b) => a + b, 0) / performanceMetrics.todoCreation.length;
      console.log(`Todo创建平均耗时: ${formatTime(avg)}`);
    }
    if (performanceMetrics.taskCreation.length > 0) {
      const avg = performanceMetrics.taskCreation.reduce((a, b) => a + b, 0) / performanceMetrics.taskCreation.length;
      console.log(`Task创建平均耗时: ${formatTime(avg)}`);
    }
    if (performanceMetrics.scheduleCreation.length > 0) {
      const avg = performanceMetrics.scheduleCreation.reduce((a, b) => a + b, 0) / performanceMetrics.scheduleCreation.length;
      console.log(`Schedule创建平均耗时: ${formatTime(avg)}`);
    }

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






