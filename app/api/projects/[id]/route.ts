import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const updateProjectSchema = z.object({
  name: z.string().min(1, "项目名称不能为空").optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  position: z.number().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        taskLists: {
          include: {
            tasks: {
              orderBy: { position: "asc" },
              include: {
                attachments: true,
                todos: {
                  orderBy: { position: "asc" },
                },
                customStatus: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    return NextResponse.json(
      { error: "获取项目详情失败" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = updateProjectSchema.parse(body)

    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingProject) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 })
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data,
      include: {
        taskLists: {
          include: {
            tasks: {
              orderBy: { position: "asc" },
              include: {
                attachments: true,
                todos: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "更新项目失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingProject) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 })
    }

    await prisma.project.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "删除项目失败" },
      { status: 500 }
    )
  }
}

