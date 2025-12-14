import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const archiveBucketEnum = z.enum(["FINISHED", "UNFINISHED"])

const todoSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  description: z.string().optional().nullable(),
  status: z.enum(["WAIT", "IN_PROGRESS", "COMPLETE"]).default("WAIT"),
  customStatusId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  todayPinnedDate: z.string().datetime().optional().nullable(),
  links: z.array(z.string().url()).default([]),
  taskId: z.string().optional().nullable(),
  archivedAt: z.string().datetime().optional().nullable(),
  archivedBucket: archiveBucketEnum.optional().nullable(),
  archivedReason: z.string().max(500).optional().nullable(),
  archivedBySystem: z.boolean().optional(),
})

type SessionUser = {
  id: string
  email?: string | null
  name?: string | null
}

const ensureUserExists = async (user: SessionUser) => {
  if (!user?.id) return null

  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
  })

  if (existingUser) {
    return existingUser
  }

  const fallbackEmail = user.email ?? `${user.id}@temp.local`
  const fallbackName = user.name ?? fallbackEmail.split("@")[0]

  return prisma.user.create({
    data: {
      id: user.id,
      email: fallbackEmail,
      name: fallbackName,
    },
  })
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const url = new URL(request.url)
    const isArchivedQuery = url.searchParams.get("archived") === "true"
    const bucket = url.searchParams.get("bucket")
    const searchKeyword = url.searchParams.get("q")
    const dateFrom = url.searchParams.get("dateFrom")
    const dateTo = url.searchParams.get("dateTo")
    const statusesParam = [
      ...url.searchParams.getAll("status"),
      ...(url.searchParams.get("statuses")?.split(",") ?? []),
    ].filter(Boolean)
    const prioritiesParam = [
      ...url.searchParams.getAll("priority"),
      ...(url.searchParams.get("priorities")?.split(",") ?? []),
    ].filter(Boolean)
    const dueFrom = url.searchParams.get("dueFrom")
    const dueTo = url.searchParams.get("dueTo")
    const customStatusParams = [
      ...url.searchParams.getAll("customStatusId"),
      ...(url.searchParams.get("customStatusIds")?.split(",") ?? []),
    ].filter(Boolean)
    const tagsParam = [
      ...url.searchParams.getAll("tag"),
      ...(url.searchParams.get("tags")?.split(",") ?? []),
    ]
      .map((tag) => tag.trim())
      .filter(Boolean)
    const taskId = url.searchParams.get("taskId")
    const pageParam = Number(url.searchParams.get("page") ?? "1")
    const pageSizeParam = Number(url.searchParams.get("pageSize") ?? "20")
    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1
    const pageSize = Number.isFinite(pageSizeParam)
      ? Math.min(Math.max(pageSizeParam, 1), 100)
      : 20

    const where: any = {
      userId: session.user.id,
    }

    if (isArchivedQuery) {
      where.archivedAt = { not: null }
      if (bucket && archiveBucketEnum.safeParse(bucket).success) {
        where.archivedBucket = bucket
      }

      if (dateFrom || dateTo) {
        where.archivedAt = {
          ...where.archivedAt,
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        }
      }
    } else {
      where.archivedAt = null
    }

    if (searchKeyword) {
      where.title = { contains: searchKeyword, mode: "insensitive" }
    }

    if (statusesParam.length > 0) {
      const validStatuses = statusesParam.filter((status) =>
        ["WAIT", "IN_PROGRESS", "COMPLETE"].includes(status)
      )
      if (validStatuses.length > 0) {
        where.status = { in: validStatuses }
      }
    }

    if (prioritiesParam.length > 0) {
      const validPriorities = prioritiesParam.filter((priority) =>
        ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)
      )
      if (validPriorities.length > 0) {
        where.priority = { in: validPriorities }
      }
    }

    if (dueFrom || dueTo) {
      where.dueDate = {
        ...(dueFrom ? { gte: new Date(dueFrom) } : {}),
        ...(dueTo ? { lte: new Date(dueTo) } : {}),
      }
    }

    if (tagsParam.length > 0) {
      where.tags = { hasEvery: tagsParam }
    }

    if (customStatusParams.length > 0) {
      where.customStatusId = { in: customStatusParams }
    }

    if (taskId) {
      where.taskId = taskId
    }

    const queryOptions: any = {
      where,
      include: {
        attachments: true,
        customStatus: true,
      },
      orderBy: isArchivedQuery ? { archivedAt: "desc" } : { createdAt: "desc" },
    }

    if (isArchivedQuery) {
      queryOptions.skip = (page - 1) * pageSize
      queryOptions.take = pageSize
    }

    const todos = await prisma.todo.findMany(queryOptions)

    if (!isArchivedQuery) {
      return NextResponse.json(todos)
    }

    const total = await prisma.todo.count({ where })

    return NextResponse.json({
      data: todos,
      pagination: {
        total,
        page,
        pageSize,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "获取待办事项失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    await ensureUserExists(session.user)

    const body = await request.json()
    const data = todoSchema.parse(body)

    const lastTodoInGroup = await prisma.todo.findFirst({
      where: {
        userId: session.user.id,
        status: data.status,
        customStatusId: data.customStatusId ?? null,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    })

    const nextPosition = (lastTodoInGroup?.position ?? -1) + 1

    if (data.taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: data.taskId,
          userId: session.user.id,
        },
      })
      if (!task) {
        return NextResponse.json({ error: "任务不存在" }, { status: 404 })
      }
    }

    const todo = await prisma.todo.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        customStatusId: data.customStatusId || null,
        priority: data.priority,
        category: data.category,
        tags: data.tags,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        todayPinnedDate: data.todayPinnedDate ? new Date(data.todayPinnedDate) : null,
        links: data.links,
        taskId: data.taskId || null,
        userId: session.user.id,
        archivedAt: data.archivedAt ? new Date(data.archivedAt) : null,
        archivedBucket: data.archivedBucket || null,
        archivedReason: data.archivedReason || null,
        archivedBySystem: data.archivedBySystem ?? false,
        position: nextPosition,
      },
      include: {
        attachments: true,
        customStatus: true,
      },
    })

    return NextResponse.json(todo, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "创建待办事项失败" },
      { status: 500 }
    )
  }
}

