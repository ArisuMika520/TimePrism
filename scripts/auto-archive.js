/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client")
const { startOfDay, subDays, subHours } = require("date-fns")

const prisma = new PrismaClient()

async function archiveTodosForUser(setting) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const graceValue = setting.unfinishedGraceDays ?? 0
  const graceUnit = setting.unfinishedGraceUnit ?? "DAY"
  const overdueThreshold =
    graceUnit === "HOUR"
      ? (graceValue > 0 ? subHours(now, graceValue) : now)
      : (graceValue > 0 ? subDays(todayStart, graceValue) : todayStart)

  const [completedTodos, overdueTodos] = await Promise.all([
    prisma.todo.findMany({
      where: {
        userId: setting.userId,
        status: "COMPLETE",
        archivedAt: null,
      },
    }),
    prisma.todo.findMany({
      where: {
        userId: setting.userId,
        archivedAt: null,
        status: { in: ["WAIT", "IN_PROGRESS"] },
        dueDate: { not: null, lt: overdueThreshold },
      },
    }),
  ])

  const entries = [
    ...completedTodos.map((todo) => ({
      todo,
      bucket: "FINISHED",
      reason: "自动归档：任务已完成",
    })),
    ...overdueTodos.map((todo) => ({
      todo,
      bucket: "UNFINISHED",
      reason: todo.dueDate
        ? `自动归档：已逾期（截止 ${todo.dueDate.toISOString().slice(0, 10)}）`
        : "自动归档：已逾期",
    })),
  ]

  if (!entries.length) {
    return { finished: 0, unfinished: 0 }
  }

  await prisma.$transaction(async (tx) => {
    for (const entry of entries) {
      await tx.todo.update({
        where: { id: entry.todo.id },
        data: {
          archivedAt: now,
          archivedBucket: entry.bucket,
          archivedReason: entry.reason,
          archivedBySystem: true,
        },
      })
    }

    await tx.todoArchiveLog.createMany({
      data: entries.map((entry) => ({
        todoId: entry.todo.id,
        userId: setting.userId,
        bucket: entry.bucket,
        reason: entry.reason,
        autoArchived: true,
        archivedAt: now,
        snapshot: {
          title: entry.todo.title,
          status: entry.todo.status,
          priority: entry.todo.priority,
          dueDate: entry.todo.dueDate
            ? entry.todo.dueDate.toISOString()
            : null,
          customStatusId: entry.todo.customStatusId,
          tags: entry.todo.tags,
        },
      })),
    })
  })

  return {
    finished: entries.filter((entry) => entry.bucket === "FINISHED").length,
    unfinished: entries.filter((entry) => entry.bucket === "UNFINISHED").length,
  }
}

async function cleanupOldArchives(setting) {
  const now = new Date()
  const tasks = []

  if (setting.cleanupFinishedAfterDays) {
    const cutoff = subDays(now, setting.cleanupFinishedAfterDays)
    tasks.push(
      prisma.todoArchiveLog.deleteMany({
        where: {
          userId: setting.userId,
          bucket: "FINISHED",
          archivedAt: { lt: cutoff },
        },
      }),
      prisma.todo.deleteMany({
        where: {
          userId: setting.userId,
          archivedBucket: "FINISHED",
          archivedAt: { lt: cutoff },
        },
      })
    )
  }

  if (setting.cleanupUnfinishedAfterDays) {
    const cutoff = subDays(now, setting.cleanupUnfinishedAfterDays)
    tasks.push(
      prisma.todoArchiveLog.deleteMany({
        where: {
          userId: setting.userId,
          bucket: "UNFINISHED",
          archivedAt: { lt: cutoff },
        },
      }),
      prisma.todo.deleteMany({
        where: {
          userId: setting.userId,
          archivedBucket: "UNFINISHED",
          archivedAt: { lt: cutoff },
        },
      })
    )
  }

  await Promise.all(tasks)
}

async function main() {
  const settings = await prisma.todoArchiveSetting.findMany({
    where: { autoArchiveEnabled: true },
  })

  if (!settings.length) {
    console.info("没有需要处理的归档配置，退出。")
    return
  }

  for (const setting of settings) {
    const summary = await archiveTodosForUser(setting)
    await cleanupOldArchives(setting)

    console.info(
      `[AutoArchive] 用户 ${setting.userId} 已归档 Finished=${summary.finished}, Unfinished=${summary.unfinished}`
    )
  }
}

main()
  .catch((error) => {
    console.error("自动归档任务执行失败:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

