/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function resetPassword(username, newPassword) {
  try {
    // 首先尝试通过 name 字段查找用户
    let user = await prisma.user.findFirst({
      where: {
        name: username
      }
    })

    // 如果通过 name 找不到，尝试通过 email 查找（可能 email 包含用户名）
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          email: {
            contains: username,
            mode: 'insensitive'
          }
        }
      })
    }

    // 如果还是找不到，尝试精确匹配 email
    if (!user) {
      user = await prisma.user.findUnique({
        where: {
          email: username
        }
      })
    }

    if (!user) {
      console.error(`❌ 未找到用户: ${username}`)
      console.log("\n可用的用户列表:")
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true
        }
      })
      allUsers.forEach(u => {
        console.log(`  - Name: ${u.name || '(无)'}, Email: ${u.email}`)
      })
      return false
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    console.log(`✅ 成功重置用户密码！`)
    console.log(`   用户ID: ${user.id}`)
    console.log(`   用户名: ${user.name || '(无)'}`)
    console.log(`   邮箱: ${user.email}`)
    console.log(`   新密码: ${newPassword}`)
    return true
  } catch (error) {
    console.error("❌ 重置密码失败:", error)
    return false
  }
}

async function main() {
  const username = process.argv[2] || "ArisuMika"
  const newPassword = process.argv[3] || "123"

  console.log(`正在重置用户 "${username}" 的密码为 "${newPassword}"...\n`)

  const success = await resetPassword(username, newPassword)

  if (!success) {
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error("脚本执行失败:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




