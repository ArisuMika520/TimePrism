// 认证API测试

const {
  BASE_URL,
  createTestUser,
  randomEmail,
  assertStatus,
  assertHasFields,
} = require('./test-utils');

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

// 测试用户注册
async function testUserRegistration() {
  console.log('\n=== 用户注册测试 ===');

  let testEmail = null;

  // 测试正常注册
  await runTest('POST /api/auth/register - 正常注册', async () => {
    testEmail = randomEmail();
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'test123456',
        name: 'Test User',
      }),
    });

    assertStatus(response, 201);
    const data = await response.json();
    assertHasFields(data, ['message', 'user']);
    assertHasFields(data.user, ['id', 'email', 'name']);
    
    if (data.user.email !== testEmail) {
      throw new Error('返回的用户邮箱不正确');
    }
  });

  // 测试重复注册（应该失败）
  if (testEmail) {
    await runTest('POST /api/auth/register - 重复注册应该失败', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'test123456',
          name: 'Test User',
        }),
      });

      if (response.status !== 400) {
        throw new Error(`期望400，实际得到${response.status}`);
      }

      const data = await response.json();
      if (!data.error || !data.error.includes('已被注册')) {
        throw new Error('错误消息不正确');
      }
    });
  }

  // 测试无效邮箱
  await runTest('POST /api/auth/register - 无效邮箱应该失败', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'test123456',
      }),
    });

    if (response.status !== 400) {
      throw new Error(`期望400，实际得到${response.status}`);
    }
  });

  // 测试密码太短
  await runTest('POST /api/auth/register - 密码太短应该失败', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: randomEmail(),
        password: '12345', // 少于6个字符
      }),
    });

    if (response.status !== 400) {
      throw new Error(`期望400，实际得到${response.status}`);
    }
  });

  // 测试缺少必填字段
  await runTest('POST /api/auth/register - 缺少必填字段应该失败', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: randomEmail(),
        // 缺少password
      }),
    });

    if (response.status !== 400) {
      throw new Error(`期望400，实际得到${response.status}`);
    }
  });

  return testEmail;
}

// 测试用户登录（通过NextAuth）
async function testUserLogin(testEmail) {
  console.log('\n=== 用户登录测试 ===');

  if (!testEmail) {
    console.log('⚠️  跳过登录测试：没有测试用户');
    return null;
  }

  // 测试登录（NextAuth使用POST到/api/auth/callback/credentials）
  await runTest('POST /api/auth/callback/credentials - 正常登录', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: testEmail,
        password: 'test123456',
        redirect: 'false',
      }),
      redirect: 'manual',
    });

    // NextAuth可能返回302重定向或200
    if (response.status !== 200 && response.status !== 302) {
      throw new Error(`登录失败，状态码: ${response.status}`);
    }

    // 检查是否有session cookie
    const cookies = response.headers.get('set-cookie');
    if (!cookies) {
      throw new Error('登录成功但未设置cookie');
    }
  });

  // 测试错误密码
  await runTest('POST /api/auth/callback/credentials - 错误密码应该失败', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: testEmail,
        password: 'wrongpassword',
        redirect: 'false',
      }),
      redirect: 'manual',
    });

    // 错误密码应该返回错误状态
    if (response.status === 200 || response.status === 302) {
      throw new Error('错误密码不应该登录成功');
    }
  });

  // 测试不存在的用户
  await runTest('POST /api/auth/callback/credentials - 不存在用户应该失败', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'nonexistent@example.com',
        password: 'test123456',
        redirect: 'false',
      }),
      redirect: 'manual',
    });

    // 不存在的用户应该返回错误状态
    if (response.status === 200 || response.status === 302) {
      throw new Error('不存在用户不应该登录成功');
    }
  });
}

// 测试Session管理
async function testSessionManagement() {
  console.log('\n=== Session管理测试 ===');

  // 测试访问受保护的路由（未登录）
  await runTest('GET /api/todos - 未登录应该返回401', async () => {
    const response = await fetch(`${BASE_URL}/api/todos`);
    
    if (response.status !== 401) {
      throw new Error(`期望401，实际得到${response.status}`);
    }

    const data = await response.json();
    if (!data.error || !data.error.includes('未授权')) {
      throw new Error('错误消息不正确');
    }
  });
}

// 主测试函数
async function runAllTests() {
  console.log('开始认证API测试...\n');
  console.log(`测试服务器: ${BASE_URL}\n`);

  try {
    const testEmail = await testUserRegistration();
    await testUserLogin(testEmail);
    await testSessionManagement();

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

    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('测试执行出错:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };






