// Upload API测试（数据库层面和逻辑测试）

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
let testTaskId = null;
let testScheduleId = null;
let testAttachmentId = null;
let testAttachmentId2 = null;

// Attachment CRUD测试
async function testAttachmentCRUD() {
  console.log('\n=== Attachment CRUD测试 ===');

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

  // 创建Task和Schedule
  await runTest('创建Task和Schedule', async () => {
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

    const schedule = await prisma.schedule.create({
      data: {
        title: '测试日程',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        userId: testUserId,
      },
    });
    testScheduleId = schedule.id;
  });

  // 创建关联Task的Attachment
  await runTest('创建关联Task的Attachment', async () => {
    const attachment = await prisma.attachment.create({
      data: {
        filename: 'test-image.jpg',
        url: 'https://example.com/uploads/test-image.jpg',
        mimeType: 'image/jpeg',
        size: 102400, // 100KB
        taskId: testTaskId,
      },
    });
    testAttachmentId = attachment.id;
    if (attachment.taskId !== testTaskId) {
      throw new Error('taskId关联不正确');
    }
    if (attachment.mimeType !== 'image/jpeg') {
      throw new Error('mimeType不正确');
    }
  });

  // 创建关联Schedule的Attachment
  await runTest('创建关联Schedule的Attachment', async () => {
    const attachment = await prisma.attachment.create({
      data: {
        filename: 'test-image2.png',
        url: 'https://example.com/uploads/test-image2.png',
        mimeType: 'image/png',
        size: 204800, // 200KB
        scheduleId: testScheduleId,
      },
    });
    testAttachmentId2 = attachment.id;
    if (attachment.scheduleId !== testScheduleId) {
      throw new Error('scheduleId关联不正确');
    }
  });

  // 获取Task的Attachments
  await runTest('获取Task的Attachments', async () => {
    const task = await prisma.task.findUnique({
      where: { id: testTaskId },
      include: { attachments: true },
    });
    if (!task.attachments || task.attachments.length === 0) {
      throw new Error('应该找到关联的attachments');
    }
    if (task.attachments[0].id !== testAttachmentId) {
      throw new Error('attachment ID不正确');
    }
  });

  // 获取Schedule的Attachments
  await runTest('获取Schedule的Attachments', async () => {
    const schedule = await prisma.schedule.findUnique({
      where: { id: testScheduleId },
      include: { attachments: true },
    });
    if (!schedule.attachments || schedule.attachments.length === 0) {
      throw new Error('应该找到关联的attachments');
    }
    if (schedule.attachments[0].id !== testAttachmentId2) {
      throw new Error('attachment ID不正确');
    }
  });

  // 删除Attachment
  await runTest('删除Attachment', async () => {
    await prisma.attachment.delete({
      where: { id: testAttachmentId2 },
    });
    const attachment = await prisma.attachment.findUnique({
      where: { id: testAttachmentId2 },
    });
    if (attachment) {
      throw new Error('Attachment应该被删除');
    }
  });
}

// 测试文件类型验证逻辑
async function testFileTypeValidation() {
  console.log('\n=== 文件类型验证测试 ===');

  // 测试允许的图片类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  await runTest('验证允许的图片类型', async () => {
    for (const mimeType of allowedTypes) {
      const attachment = await prisma.attachment.create({
        data: {
          filename: `test.${mimeType.split('/')[1]}`,
          url: `https://example.com/test.${mimeType.split('/')[1]}`,
          mimeType: mimeType,
          size: 1024,
        },
      });
      if (attachment.mimeType !== mimeType) {
        throw new Error(`mimeType ${mimeType} 保存不正确`);
      }
      await prisma.attachment.delete({ where: { id: attachment.id } });
    }
  });

  // 注意：数据库层面不限制mimeType，验证在API层面
  await runTest('数据库允许任意mimeType（API层验证）', async () => {
    const attachment = await prisma.attachment.create({
      data: {
        filename: 'test.pdf',
        url: 'https://example.com/test.pdf',
        mimeType: 'application/pdf', // 不允许的类型
        size: 1024,
      },
    });
    // 数据库允许，但API应该拒绝
    console.log('   注意: 数据库允许任意mimeType，API层应该验证');
    await prisma.attachment.delete({ where: { id: attachment.id } });
  });
}

// 测试文件大小验证逻辑
async function testFileSizeValidation() {
  console.log('\n=== 文件大小验证测试 ===');

  // 测试不同大小的文件
  await runTest('小文件应该被接受', async () => {
    const attachment = await prisma.attachment.create({
      data: {
        filename: 'small.jpg',
        url: 'https://example.com/small.jpg',
        mimeType: 'image/jpeg',
        size: 1024, // 1KB
      },
    });
    if (attachment.size !== 1024) {
      throw new Error('文件大小不正确');
    }
    await prisma.attachment.delete({ where: { id: attachment.id } });
  });

  await runTest('大文件应该被接受（数据库层面）', async () => {
    const attachment = await prisma.attachment.create({
      data: {
        filename: 'large.jpg',
        url: 'https://example.com/large.jpg',
        mimeType: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB，超过10MB限制
      },
    });
    // 数据库允许，但API应该拒绝（10MB限制）
    console.log('   注意: 数据库允许大文件，API层应该验证（10MB限制）');
    await prisma.attachment.delete({ where: { id: attachment.id } });
  });
}

// 测试级联删除
async function testCascadeDelete() {
  console.log('\n=== 级联删除测试 ===');

  let testTaskId2 = null;
  let testAttachmentId3 = null;

  // 创建Task和Attachment
  await runTest('创建测试数据', async () => {
    const taskList = await prisma.taskList.create({
      data: {
        name: '测试任务列表（用于删除）',
        userId: testUserId,
      },
    });

    const task = await prisma.task.create({
      data: {
        title: '测试任务（用于删除）',
        taskListId: taskList.id,
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
    testAttachmentId3 = attachment.id;
  });

  // 测试删除Task后Attachment被级联删除
  await runTest('删除Task后Attachment被级联删除', async () => {
    await prisma.task.delete({
      where: { id: testTaskId2 },
    });

    const attachment = await prisma.attachment.findUnique({
      where: { id: testAttachmentId3 },
    });
    if (attachment) {
      throw new Error('Attachment应该被级联删除');
    }
  });

  // 测试删除Schedule后Attachment被级联删除
  await runTest('删除Schedule后Attachment被级联删除', async () => {
    const schedule = await prisma.schedule.create({
      data: {
        title: '测试日程（用于删除）',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        userId: testUserId,
      },
    });

    const attachment = await prisma.attachment.create({
      data: {
        filename: 'test2.jpg',
        url: 'https://example.com/test2.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        scheduleId: schedule.id,
      },
    });

    await prisma.schedule.delete({
      where: { id: schedule.id },
    });

    const remainingAttachment = await prisma.attachment.findUnique({
      where: { id: attachment.id },
    });
    if (remainingAttachment) {
      throw new Error('Attachment应该被级联删除');
    }
  });
}

// 测试权限验证逻辑
async function testPermissionValidation() {
  console.log('\n=== 权限验证测试 ===');

  let testUserId2 = null;
  let testTaskId3 = null;
  let testAttachmentId4 = null;

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

  // 创建第二个用户的Task和Attachment
  await runTest('创建第二个用户的数据', async () => {
    const taskList = await prisma.taskList.create({
      data: {
        name: '用户2的任务列表',
        userId: testUserId2,
      },
    });

    const task = await prisma.task.create({
      data: {
        title: '用户2的任务',
        taskListId: taskList.id,
        userId: testUserId2,
      },
    });
    testTaskId3 = task.id;

    const attachment = await prisma.attachment.create({
      data: {
        filename: 'user2-image.jpg',
        url: 'https://example.com/user2-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        taskId: testTaskId3,
      },
    });
    testAttachmentId4 = attachment.id;
  });

  // 测试用户1无法访问用户2的Attachment（通过Task）
  await runTest('用户隔离 - 用户1无法访问用户2的Attachment', async () => {
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: testAttachmentId4,
        task: {
          userId: testUserId, // 尝试用用户1访问
        },
      },
    });
    if (attachment) {
      throw new Error('用户1不应该能访问用户2的Attachment');
    }
  });

  // 清理
  await prisma.attachment.delete({ where: { id: testAttachmentId4 } }).catch(() => {});
  await prisma.task.delete({ where: { id: testTaskId3 } }).catch(() => {});
  const taskLists = await prisma.taskList.findMany({ where: { userId: testUserId2 } });
  for (const tl of taskLists) {
    await prisma.taskList.delete({ where: { id: tl.id } }).catch(() => {});
  }
  await prisma.user.delete({ where: { id: testUserId2 } }).catch(() => {});
}

// 主测试函数
async function runAllTests() {
  console.log('开始Upload API测试（数据库层面）...\n');
  console.log('注意: 此测试主要验证数据库层面的Attachment操作。');
  console.log('实际的S3上传功能需要S3配置才能完整测试。\n');

  try {
    await testAttachmentCRUD();
    await testFileTypeValidation();
    await testFileSizeValidation();
    await testCascadeDelete();
    await testPermissionValidation();

    // 清理
    if (testAttachmentId) {
      await prisma.attachment.delete({ where: { id: testAttachmentId } }).catch(() => {});
    }
    if (testTaskId) {
      await prisma.task.delete({ where: { id: testTaskId } }).catch(() => {});
    }
    if (testScheduleId) {
      await prisma.schedule.delete({ where: { id: testScheduleId } }).catch(() => {});
    }
    const taskLists = await prisma.taskList.findMany({ where: { userId: testUserId } });
    for (const tl of taskLists) {
      await prisma.taskList.delete({ where: { id: tl.id } }).catch(() => {});
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






