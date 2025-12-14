// 测试工具库

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * 创建测试用户
 */
async function createTestUser(email, password, name) {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email || `test-${Date.now()}@example.com`,
      password: password || 'test123456',
      name: name || 'Test User',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`创建用户失败: ${error.error || response.statusText}`);
  }

  return await response.json();
}

/**
 * 登录并获取session cookie
 */
async function loginUser(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      email,
      password,
      redirect: 'false',
    }),
    redirect: 'manual',
  });

  // 获取cookie
  const cookies = response.headers.get('set-cookie');
  if (!cookies) {
    throw new Error('登录失败：未获取到session cookie');
  }

  return cookies;
}

/**
 * 创建带认证的fetch请求
 */
function createAuthenticatedFetch(cookies) {
  return async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (cookies) {
      headers['Cookie'] = cookies;
    }

    return fetch(`${BASE_URL}${url}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  };
}

/**
 * 生成随机字符串
 */
function randomString(length = 8) {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * 生成随机邮箱
 */
function randomEmail() {
  return `test-${Date.now()}-${randomString(4)}@example.com`;
}

/**
 * 生成测试Todo数据
 */
function generateTodoData(overrides = {}) {
  return {
    title: `测试Todo ${Date.now()}`,
    description: '这是一个测试待办事项',
    priority: 'MEDIUM',
    category: '测试',
    tags: ['test', 'todo'],
    dueDate: new Date(Date.now() + 86400000).toISOString(), // 明天
    ...overrides,
  };
}

/**
 * 生成测试TaskList数据
 */
function generateTaskListData(overrides = {}) {
  return {
    name: `测试任务列表 ${Date.now()}`,
    description: '这是一个测试任务列表',
    position: 0,
    ...overrides,
  };
}

/**
 * 生成测试Task数据
 */
function generateTaskData(taskListId, overrides = {}) {
  return {
    title: `测试任务 ${Date.now()}`,
    description: '这是一个测试任务',
    priority: 'MEDIUM',
    status: 'TODO',
    tags: ['test', 'task'],
    position: 0,
    taskListId,
    ...overrides,
  };
}

/**
 * 生成测试Schedule数据
 */
function generateScheduleData(overrides = {}) {
  const start = new Date();
  const end = new Date(start.getTime() + 3600000); // 1小时后

  return {
    title: `测试日程 ${Date.now()}`,
    description: '这是一个测试日程',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    allDay: false,
    location: '测试地点',
    ...overrides,
  };
}

/**
 * 断言响应状态码
 */
function assertStatus(response, expectedStatus) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `期望状态码 ${expectedStatus}，实际得到 ${response.status}`
    );
  }
}

/**
 * 断言响应包含字段
 */
function assertHasFields(data, fields) {
  for (const field of fields) {
    if (!(field in data)) {
      throw new Error(`响应缺少字段: ${field}`);
    }
  }
}

/**
 * 等待指定时间
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 清理测试数据（删除测试用户及其所有数据）
 */
async function cleanupTestUser(userId, cookies) {
  const authFetch = createAuthenticatedFetch(cookies);
  
  // 注意：这需要实现删除用户的API，或者直接使用Prisma
  // 这里只是示例，实际可能需要直接操作数据库
  console.log(`清理测试用户: ${userId}`);
}

module.exports = {
  BASE_URL,
  createTestUser,
  loginUser,
  createAuthenticatedFetch,
  randomString,
  randomEmail,
  generateTodoData,
  generateTaskListData,
  generateTaskData,
  generateScheduleData,
  assertStatus,
  assertHasFields,
  sleep,
  cleanupTestUser,
};






