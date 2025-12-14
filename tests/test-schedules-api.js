// Schedule API测试

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

// 测试数据
let testUserId = null;
let testScheduleId = null;
let testScheduleId2 = null;
let testScheduleId3 = null;

// Schedule CRUD测试
async function testScheduleCRUD() {
  console.log('\n=== Schedule CRUD测试 ===');

  // 创建用户
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

  // 创建Schedule
  await runTest('创建Schedule', async () => {
    const start = new Date('2024-01-15T10:00:00Z');
    const end = new Date('2024-01-15T11:00:00Z');
    const schedule = await prisma.schedule.create({
      data: {
        title: '测试日程',
        description: '测试描述',
        startTime: start,
        endTime: end,
        allDay: false,
        location: '测试地点',
        userId: testUserId,
      },
    });
    testScheduleId = schedule.id;
    if (schedule.userId !== testUserId) {
      throw new Error('userId不正确');
    }
    if (schedule.title !== '测试日程') {
      throw new Error('标题不正确');
    }
  });

  // 创建全天日程
  await runTest('创建全天日程', async () => {
    const start = new Date('2024-01-16T00:00:00Z');
    const end = new Date('2024-01-16T23:59:59Z');
    const schedule = await prisma.schedule.create({
      data: {
        title: '全天日程',
        startTime: start,
        endTime: end,
        allDay: true,
        userId: testUserId,
      },
    });
    testScheduleId2 = schedule.id;
    if (!schedule.allDay) {
      throw new Error('allDay应该为true');
    }
  });

  // 创建带提醒的日程
  await runTest('创建带提醒的日程', async () => {
    const start = new Date('2024-01-17T14:00:00Z');
    const end = new Date('2024-01-17T15:00:00Z');
    const schedule = await prisma.schedule.create({
      data: {
        title: '带提醒的日程',
        startTime: start,
        endTime: end,
        reminder: 30, // 30分钟前提醒
        userId: testUserId,
      },
    });
    testScheduleId3 = schedule.id;
    if (schedule.reminder !== 30) {
      throw new Error('提醒时间不正确');
    }
  });

  // 获取用户的Schedules
  await runTest('获取用户的Schedules', async () => {
    const schedules = await prisma.schedule.findMany({
      where: { userId: testUserId },
      orderBy: { startTime: 'asc' },
    });
    if (schedules.length !== 3) {
      throw new Error('应该找到3个Schedule');
    }
  });

  // 更新Schedule
  await runTest('更新Schedule', async () => {
    const schedule = await prisma.schedule.update({
      where: { id: testScheduleId },
      data: {
        title: '更新后的日程',
        location: '新地点',
      },
    });
    if (schedule.title !== '更新后的日程' || schedule.location !== '新地点') {
      throw new Error('更新失败');
    }
  });

  // 删除Schedule
  await runTest('删除Schedule', async () => {
    await prisma.schedule.delete({
      where: { id: testScheduleId3 },
    });
    const schedule = await prisma.schedule.findUnique({
      where: { id: testScheduleId3 },
    });
    if (schedule) {
      throw new Error('Schedule应该被删除');
    }
  });
}

// 测试时间范围查询
async function testTimeRangeQuery() {
  console.log('\n=== 时间范围查询测试 ===');

  // 创建多个不同时间的Schedule
  await runTest('创建多个不同时间的Schedule', async () => {
    // 在查询范围内的
    await prisma.schedule.create({
      data: {
        title: '范围内日程1',
        startTime: new Date('2024-01-20T10:00:00Z'),
        endTime: new Date('2024-01-20T11:00:00Z'),
        userId: testUserId,
      },
    });

    await prisma.schedule.create({
      data: {
        title: '范围内日程2',
        startTime: new Date('2024-01-21T14:00:00Z'),
        endTime: new Date('2024-01-21T15:00:00Z'),
        userId: testUserId,
      },
    });

    // 在查询范围外的
    await prisma.schedule.create({
      data: {
        title: '范围外日程',
        startTime: new Date('2024-01-10T10:00:00Z'),
        endTime: new Date('2024-01-10T11:00:00Z'),
        userId: testUserId,
      },
    });

    await prisma.schedule.create({
      data: {
        title: '范围外日程2',
        startTime: new Date('2024-01-30T10:00:00Z'),
        endTime: new Date('2024-01-30T11:00:00Z'),
        userId: testUserId,
      },
    });
  });

  // 测试时间范围查询（开始时间在范围内）
  await runTest('时间范围查询 - 开始时间在范围内', async () => {
    const start = new Date('2024-01-19T00:00:00Z');
    const end = new Date('2024-01-22T23:59:59Z');
    
    const schedules = await prisma.schedule.findMany({
      where: {
        userId: testUserId,
        OR: [
          {
            startTime: {
              gte: start,
              lte: end,
            },
          },
          {
            endTime: {
              gte: start,
              lte: end,
            },
          },
          {
            AND: [
              { startTime: { lte: start } },
              { endTime: { gte: end } },
            ],
          },
        ],
      },
      orderBy: { startTime: 'asc' },
    });

    // 应该找到2个在范围内的日程
    const inRange = schedules.filter(s => 
      s.title === '范围内日程1' || s.title === '范围内日程2'
    );
    if (inRange.length !== 2) {
      throw new Error(`应该找到2个范围内的日程，实际找到${inRange.length}个`);
    }
  });

  // 测试跨天日程查询
  await runTest('跨天日程查询', async () => {
    // 创建一个跨天的日程
    const crossDaySchedule = await prisma.schedule.create({
      data: {
        title: '跨天日程',
        startTime: new Date('2024-01-25T20:00:00Z'),
        endTime: new Date('2024-01-26T02:00:00Z'),
        userId: testUserId,
      },
    });

    const start = new Date('2024-01-25T00:00:00Z');
    const end = new Date('2024-01-26T23:59:59Z');
    
    const schedules = await prisma.schedule.findMany({
      where: {
        userId: testUserId,
        id: crossDaySchedule.id,
        OR: [
          {
            startTime: {
              gte: start,
              lte: end,
            },
          },
          {
            endTime: {
              gte: start,
              lte: end,
            },
          },
          {
            AND: [
              { startTime: { lte: start } },
              { endTime: { gte: end } },
            ],
          },
        ],
      },
    });

    if (schedules.length === 0) {
      throw new Error('跨天日程应该被查询到');
    }
  });
}

// 测试重复事件
async function testRepeatEvents() {
  console.log('\n=== 重复事件测试 ===');

  // 创建重复事件
  await runTest('创建重复事件', async () => {
    const repeatRule = {
      type: 'daily',
      interval: 1,
      endDate: '2024-12-31T23:59:59Z',
    };

    const schedule = await prisma.schedule.create({
      data: {
        title: '每日重复事件',
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T10:00:00Z'),
        repeatRule: repeatRule,
        userId: testUserId,
      },
    });

    if (!schedule.repeatRule) {
      throw new Error('repeatRule应该被保存');
    }

    const savedRule = schedule.repeatRule;
    if (savedRule.type !== 'daily' || savedRule.interval !== 1) {
      throw new Error('重复规则不正确');
    }
  });

  // 测试周重复
  await runTest('创建周重复事件', async () => {
    const repeatRule = {
      type: 'weekly',
      interval: 1,
      daysOfWeek: [1, 3, 5], // 周一、周三、周五
      endDate: '2024-12-31T23:59:59Z',
    };

    const schedule = await prisma.schedule.create({
      data: {
        title: '周重复事件',
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T10:00:00Z'),
        repeatRule: repeatRule,
        userId: testUserId,
      },
    });

    const savedRule = schedule.repeatRule;
    if (savedRule.type !== 'weekly' || !savedRule.daysOfWeek) {
      throw new Error('周重复规则不正确');
    }
  });

  // 测试月重复
  await runTest('创建月重复事件', async () => {
    const repeatRule = {
      type: 'monthly',
      interval: 1,
      dayOfMonth: 15,
      endDate: '2024-12-31T23:59:59Z',
    };

    const schedule = await prisma.schedule.create({
      data: {
        title: '月重复事件',
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T10:00:00Z'),
        repeatRule: repeatRule,
        userId: testUserId,
      },
    });

    const savedRule = schedule.repeatRule;
    if (savedRule.type !== 'monthly' || savedRule.dayOfMonth !== 15) {
      throw new Error('月重复规则不正确');
    }
  });
}

// 测试与Task/Todo关联
async function testTaskTodoLink() {
  console.log('\n=== Task/Todo关联测试 ===');

  let testTaskId = null;
  let testTodoId = null;

  // 创建Task和Todo
  await runTest('创建Task和Todo', async () => {
    const taskList = await prisma.taskList.create({
      data: {
        name: '测试任务列表',
        userId: testUserId,
      },
    });

    const task = await prisma.task.create({
      data: {
        title: '测试任务',
        taskListId: taskList.id,
        userId: testUserId,
      },
    });
    testTaskId = task.id;

    const todo = await prisma.todo.create({
      data: {
        title: '测试Todo',
        userId: testUserId,
      },
    });
    testTodoId = todo.id;
  });

  // 创建关联Task的Schedule
  await runTest('创建关联Task的Schedule', async () => {
    const schedule = await prisma.schedule.create({
      data: {
        title: '关联任务的日程',
        startTime: new Date('2024-01-18T10:00:00Z'),
        endTime: new Date('2024-01-18T11:00:00Z'),
        taskId: testTaskId,
        userId: testUserId,
      },
    });

    if (schedule.taskId !== testTaskId) {
      throw new Error('taskId关联不正确');
    }
  });

  // 创建关联Todo的Schedule
  await runTest('创建关联Todo的Schedule', async () => {
    const schedule = await prisma.schedule.create({
      data: {
        title: '关联Todo的日程',
        startTime: new Date('2024-01-19T10:00:00Z'),
        endTime: new Date('2024-01-19T11:00:00Z'),
        todoId: testTodoId,
        userId: testUserId,
      },
    });

    if (schedule.todoId !== testTodoId) {
      throw new Error('todoId关联不正确');
    }
  });
}

// 测试用户隔离
async function testUserIsolation() {
  console.log('\n=== 用户隔离测试 ===');

  let testUserId2 = null;

  // 创建第二个用户
  await runTest('创建第二个用户', async () => {
    const user = await prisma.user.create({
      data: {
        email: `test2-${Date.now()}@example.com`,
        password: 'hashed',
        name: 'User 2',
      },
    });
    testUserId2 = user.id;
  });

  // 创建第二个用户的Schedule
  await runTest('创建第二个用户的Schedule', async () => {
    await prisma.schedule.create({
      data: {
        title: '用户2的日程',
        startTime: new Date('2024-01-20T10:00:00Z'),
        endTime: new Date('2024-01-20T11:00:00Z'),
        userId: testUserId2,
      },
    });
  });

  // 测试用户1无法访问用户2的Schedule
  await runTest('用户隔离 - 用户1无法访问用户2的Schedule', async () => {
    const schedules = await prisma.schedule.findMany({
      where: {
        userId: testUserId, // 用户1查询
        title: '用户2的日程',
      },
    });
    if (schedules.length > 0) {
      throw new Error('用户1不应该能访问用户2的Schedule');
    }
  });

  // 清理
  await prisma.user.delete({ where: { id: testUserId2 } }).catch(() => {});
}

// 主测试函数
async function runAllTests() {
  console.log('开始Schedule API测试...\n');

  try {
    await testScheduleCRUD();
    await testTimeRangeQuery();
    await testRepeatEvents();
    await testTaskTodoLink();
    await testUserIsolation();

    // 清理
    const schedules = await prisma.schedule.findMany({
      where: { userId: testUserId },
    });
    for (const schedule of schedules) {
      await prisma.schedule.delete({ where: { id: schedule.id } }).catch(() => {});
    }

    const taskLists = await prisma.taskList.findMany({
      where: { userId: testUserId },
    });
    for (const taskList of taskLists) {
      await prisma.taskList.delete({ where: { id: taskList.id } }).catch(() => {});
    }

    const todos = await prisma.todo.findMany({
      where: { userId: testUserId },
    });
    for (const todo of todos) {
      await prisma.todo.delete({ where: { id: todo.id } }).catch(() => {});
    }

    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
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






