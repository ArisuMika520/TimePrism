import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setAdmin() {
  const email = process.argv[2]
  
  if (!email) {
    console.error('请提供邮箱地址')
    console.log('用法: npx ts-node scripts/set-admin.ts your@email.com')
    process.exit(1)
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    console.log('✅ 用户已设置为管理员:')
    console.log(`  ID: ${user.id}`)
    console.log(`  邮箱: ${user.email}`)
    console.log(`  姓名: ${user.name || '未设置'}`)
    console.log(`  角色: ${user.role}`)
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error(`❌ 未找到邮箱为 ${email} 的用户`)
    } else {
      console.error('❌ 设置管理员失败:', error.message)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setAdmin()
