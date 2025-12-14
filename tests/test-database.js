// 数据库操作测试

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
let testTodoId = null;
let testTaskListId = null;
let testTaskId = null;
let testScheduleId = null;

async function cleanup() {
  console.log('\n清理测试数据...');
  
  try {
    if (testScheduleId) {
      await prisma.schedule.delete({ where: { id: testScheduleId } }).catch(() => {});
    }
    if (testTaskId) {
      await prisma.task.delete({ where: { id: testTaskId } }).catch(() => {});
    }
    if (testTodoId) {
      await prisma.todo.delete({ where: { id: testTodoId } }).catch(() => {});
    }
    if (testTaskListId) {
      await prisma.taskList.delete({ where: { id: testTaskListId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    console.log('✅ 清理完成');
  } catch (error) {
    console.error('清理失败:', error);
  }
}

// 测试基本CRUD操作
async function testBasicCRUD() {
  console.log('\n=== 基本CRUD操作测试 ===');

  // 创建User
  await runTest('创建User', async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'hashed_password',
        name: 'Test User',
      },
    });
    testUserId = user.id;
    if (!user.id) throw new Error('用户创建失败');
  });

  // 创建Todo
  await runTest('创建Todo', async () => {
    const todo = await prisma.todo.create({
      data: {
        title: '测试Todo',
        description: '测试描述',
        priority: 'MEDIUM',
        userId: testUserId,
      },
    });
    testTodoId = todo.id;
    if (!todo.id) throw new Error('Todo创建失败');
    if (todo.userId !== testUserId) throw new Error('userId不正确');
  });

  // 读取Todo
  await runTest('读取Todo', async () => {
    const todo = await prisma.todo.findUnique({
      where: { id: testTodoId },
    });
    if (!todo) throw new Error('Todo未找到');
    if (todo.title !== '测试Todo') throw new Error('Todo数据不正确');
  });

  // 更新Todo
  await runTest('更新Todo', async () => {
    const todo = await prisma.todo.update({
      where: { id: testTodoId },
      data: { completed: true },
    });
    if (!todo.completed) throw new Error('更新失败');
  });

  // 创建TaskList
  await runTest('创建TaskList', async () => {
    const taskList = await prisma.taskList.create({
      data: {
        name: '测试任务列表',
        userId: testUserId,
      },
    });
    testTaskListId = taskList.id;
    if (!taskList.id) throw new Error('TaskList创建失败');
  });

  // 创建Task
  await runTest('创建Task', async () => {
    const task = await prisma.task.create({
      data: {
        title: '测试任务',
        taskListId: testTaskListId,
        userId: testUserId,
      },
    });
    testTaskId = task.id;
    if (!task.id) throw new Error('Task创建失败');
    if (task.taskListId !== testTaskListId) throw new Error('taskListId不正确');
  });

  // 创建Schedule
  await runTest('创建Schedule', async () => {
    const start = new Date();
    const end = new Date(start.getTime() + 3600000);
    const schedule = await prisma.schedule.create({
      data: {
        title: '测试日程',
        startTime: start,
        endTime: end,
        userId: testUserId,
      },
    });
    testScheduleId = schedule.id;
    if (!schedule.id) throw new Error('Schedule创建失败');
  });
}

// 测试关系模型
async function testRelations() {
  console.log('\n=== 关系模型测试 ===');

  // 测试User -> Todo关系
  await runTest('User -> Todo 关系', async () => {
    const user = await prisma.user.findUnique({
      where: { id: testUserId },
      include: { todos: true },
    });
    if (!user) throw new Error('User未找到');
    if (!user.todos || user.todos.length === 0) {
      throw new Error('User的todos关系不正确');
    }
  });

  // 测试User -> TaskList -> Task关系
  await runTest('User -> TaskList -> Task 关系', async () => {
    const taskList = await prisma.taskList.findUnique({
      where: { id: testTaskListId },
      include: { tasks: true },
    });
    if (!taskList) throw new Error('TaskList未找到');
    if (!taskList.tasks || taskList.tasks.length === 0) {
      throw new Error('TaskList的tasks关系不正确');
    }
    if (taskList.tasks[0].userId !== testUserId) {
      throw new Error('Task的userId不正确');
    }
  });

  // 测试User -> Schedule关系
  await runTest('User -> Schedule 关系', async () => {
    const user = await prisma.user.findUnique({
      where: { id: testUserId },
      include: { schedules: true },
    });
    if (!user) throw new Error('User未找到');
    if (!user.schedules || user.schedules.length === 0) {
      throw new Error('User的schedules关系不正确');
    }
  });
}

// 测试级联删除
async function testCascadeDelete() {
  console.log('\n=== 级联删除测试 ===');

  // 创建Task和Attachment
  let testTaskId2 = null;
  let testAttachmentId = null;

  await runTest('创建Task和Attachment', async () => {
    const task = await prisma.task.create({
      data: {
        title: '测试任务（用于删除）',
        taskListId: testTaskListId,
        userId: testUserId,
      },
    });
    testTaskId2 = task.id;

    const attachment = await prisma.attachment.create({
      data: {
        filename: 'test.jpg',
        url: 'https://example.com/test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        taskId: testTaskId2,
      },
    });
    testAttachmentId = attachment.id;
  });

  // 测试删除Task后Attachment被级联删除
  await runTest('删除Task后Attachment被级联删除', async () => {
    await prisma.task.delete({
      where: { id: testTaskId2 },
    });

    const attachment = await prisma.attachment.findUnique({
      where: { id: testAttachmentId },
    });
    if (attachment) {
      throw new Error('Attachment应该被级联删除');
    }
  });

  // 测试删除TaskList后Tasks被级联删除
  await runTest('删除TaskList后Tasks被级联删除', async () => {
    // 创建新的TaskList和Task
    const taskList = await prisma.taskList.create({
      data: {
        name: '测试任务列表（用于删除）',
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

    await prisma.taskList.delete({
      where: { id: taskList.id },
    });

    const remainingTask = await prisma.task.findUnique({
      where: { id: task.id },
    });
    if (remainingTask) {
      throw new Error('Task应该被级联删除');
    }
  });
}

// 主测试函数
async function runAllTests() {
  console.log('开始数据库操作测试...\n');

  try {
    await testBasicCRUD();
    await testRelations();
    await testCascadeDelete();

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

    await cleanup();
    await prisma.$disconnect();

    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('测试执行出错:', error);
    await cleanup();
    await prisma.$disconnect();
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };






