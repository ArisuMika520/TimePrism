// Task和TaskList API测试

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
let testTaskListId = null;
let testTaskListId2 = null;
let testTaskId = null;
let testTaskId2 = null;
let testTaskId3 = null;

// TaskList CRUD测试
async function testTaskListCRUD() {
  console.log('\n=== TaskList CRUD测试 ===');

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

  // 创建TaskList
  await runTest('创建TaskList', async () => {
    const taskList = await prisma.taskList.create({
      data: {
        name: '测试任务列表',
        description: '测试描述',
        position: 0,
        userId: testUserId,
      },
    });
    testTaskListId = taskList.id;
    if (taskList.userId !== testUserId) {
      throw new Error('userId不正确');
    }
  });

  // 创建第二个TaskList
  await runTest('创建第二个TaskList', async () => {
    const taskList = await prisma.taskList.create({
      data: {
        name: '测试任务列表2',
        position: 1,
        userId: testUserId,
      },
    });
    testTaskListId2 = taskList.id;
  });

  // 获取用户的TaskLists
  await runTest('获取用户的TaskLists', async () => {
    const taskLists = await prisma.taskList.findMany({
      where: { userId: testUserId },
      orderBy: { position: 'asc' },
    });
    if (taskLists.length !== 2) {
      throw new Error('应该找到2个TaskList');
    }
    if (taskLists[0].position !== 0 || taskLists[1].position !== 1) {
      throw new Error('位置排序不正确');
    }
  });

  // 更新TaskList
  await runTest('更新TaskList', async () => {
    const taskList = await prisma.taskList.update({
      where: { id: testTaskListId },
      data: { name: '更新后的名称', position: 2 },
    });
    if (taskList.name !== '更新后的名称' || taskList.position !== 2) {
      throw new Error('更新失败');
    }
  });
}

// Task CRUD测试
async function testTaskCRUD() {
  console.log('\n=== Task CRUD测试 ===');

  // 创建Task
  await runTest('创建Task', async () => {
    const task = await prisma.task.create({
      data: {
        title: '测试任务',
        description: '测试描述',
        priority: 'MEDIUM',
        status: 'TODO',
        position: 0,
        taskListId: testTaskListId,
        userId: testUserId,
      },
    });
    testTaskId = task.id;
    if (task.taskListId !== testTaskListId || task.userId !== testUserId) {
      throw new Error('关联ID不正确');
    }
  });

  // 创建更多Task
  await runTest('创建更多Task', async () => {
    const task2 = await prisma.task.create({
      data: {
        title: '测试任务2',
        position: 1,
        taskListId: testTaskListId,
        userId: testUserId,
      },
    });
    testTaskId2 = task2.id;

    const task3 = await prisma.task.create({
      data: {
        title: '测试任务3',
        position: 2,
        taskListId: testTaskListId,
        userId: testUserId,
      },
    });
    testTaskId3 = task3.id;
  });

  // 获取TaskList的Tasks
  await runTest('获取TaskList的Tasks', async () => {
    const taskList = await prisma.taskList.findUnique({
      where: { id: testTaskListId },
      include: { tasks: { orderBy: { position: 'asc' } } },
    });
    if (taskList.tasks.length !== 3) {
      throw new Error('应该找到3个Task');
    }
    if (taskList.tasks[0].position !== 0 || taskList.tasks[1].position !== 1) {
      throw new Error('位置排序不正确');
    }
  });

  // 更新Task
  await runTest('更新Task', async () => {
    const task = await prisma.task.update({
      where: { id: testTaskId },
      data: { status: 'IN_PROGRESS', priority: 'HIGH' },
    });
    if (task.status !== 'IN_PROGRESS' || task.priority !== 'HIGH') {
      throw new Error('更新失败');
    }
  });

  // 删除Task
  await runTest('删除Task', async () => {
    await prisma.task.delete({
      where: { id: testTaskId3 },
    });
    const task = await prisma.task.findUnique({
      where: { id: testTaskId3 },
    });
    if (task) {
      throw new Error('Task应该被删除');
    }
  });
}

// 测试任务移动（拖拽）
async function testTaskMove() {
  console.log('\n=== 任务移动测试 ===');

  // 测试在同一TaskList内移动
  await runTest('在同一TaskList内移动Task', async () => {
    // 将task2移动到位置0
    await prisma.task.update({
      where: { id: testTaskId2 },
      data: { position: 0 },
    });

    // 将原来的task移动到位置1
    await prisma.task.update({
      where: { id: testTaskId },
      data: { position: 1 },
    });

    const tasks = await prisma.task.findMany({
      where: { taskListId: testTaskListId },
      orderBy: { position: 'asc' },
    });

    if (tasks[0].id !== testTaskId2 || tasks[1].id !== testTaskId) {
      throw new Error('移动后顺序不正确');
    }
  });

  // 测试跨TaskList移动
  await runTest('跨TaskList移动Task', async () => {
    await prisma.task.update({
      where: { id: testTaskId },
      data: {
        taskListId: testTaskListId2,
        position: 0,
      },
    });

    const task = await prisma.task.findUnique({
      where: { id: testTaskId },
    });

    if (task.taskListId !== testTaskListId2) {
      throw new Error('TaskListId未更新');
    }

    // 验证原TaskList中不再有该Task
    const tasksInList1 = await prisma.task.findMany({
      where: { taskListId: testTaskListId },
    });
    if (tasksInList1.some(t => t.id === testTaskId)) {
      throw new Error('Task仍在原TaskList中');
    }
  });
}

// 测试级联删除
async function testCascadeDelete() {
  console.log('\n=== 级联删除测试 ===');

  // 创建新的TaskList和Task用于测试
  let testTaskListId3 = null;
  let testTaskId4 = null;

  await runTest('创建测试数据', async () => {
    const taskList = await prisma.taskList.create({
      data: {
        name: '测试任务列表（用于删除）',
        userId: testUserId,
      },
    });
    testTaskListId3 = taskList.id;

    const task = await prisma.task.create({
      data: {
        title: '测试任务（用于删除）',
        taskListId: testTaskListId3,
        userId: testUserId,
      },
    });
    testTaskId4 = task.id;
  });

  // 测试删除TaskList后Tasks被级联删除
  await runTest('删除TaskList后Tasks被级联删除', async () => {
    await prisma.taskList.delete({
      where: { id: testTaskListId3 },
    });

    const task = await prisma.task.findUnique({
      where: { id: testTaskId4 },
    });
    if (task) {
      throw new Error('Task应该被级联删除');
    }
  });
}

// 测试用户隔离
async function testUserIsolation() {
  console.log('\n=== 用户隔离测试 ===');

  let testUserId2 = null;
  let testTaskListId4 = null;

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

  // 创建第二个用户的TaskList
  await runTest('创建第二个用户的TaskList', async () => {
    const taskList = await prisma.taskList.create({
      data: {
        name: '用户2的任务列表',
        userId: testUserId2,
      },
    });
    testTaskListId4 = taskList.id;
  });

  // 测试用户1无法访问用户2的TaskList
  await runTest('用户隔离 - 用户1无法访问用户2的TaskList', async () => {
    const taskList = await prisma.taskList.findFirst({
      where: {
        id: testTaskListId4,
        userId: testUserId, // 尝试用用户1访问
      },
    });
    if (taskList) {
      throw new Error('用户1不应该能访问用户2的TaskList');
    }
  });

  // 清理
  await prisma.taskList.delete({ where: { id: testTaskListId4 } }).catch(() => {});
  await prisma.user.delete({ where: { id: testUserId2 } }).catch(() => {});
}

// 主测试函数
async function runAllTests() {
  console.log('开始Task和TaskList API测试...\n');

  try {
    await testTaskListCRUD();
    await testTaskCRUD();
    await testTaskMove();
    await testCascadeDelete();
    await testUserIsolation();

    // 清理
    if (testTaskId) {
      await prisma.task.delete({ where: { id: testTaskId } }).catch(() => {});
    }
    if (testTaskId2) {
      await prisma.task.delete({ where: { id: testTaskId2 } }).catch(() => {});
    }
    if (testTaskListId) {
      await prisma.taskList.delete({ where: { id: testTaskListId } }).catch(() => {});
    }
    if (testTaskListId2) {
      await prisma.taskList.delete({ where: { id: testTaskListId2 } }).catch(() => {});
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






