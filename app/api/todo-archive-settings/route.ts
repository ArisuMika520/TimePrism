import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

const settingsSchema = z.object({
  autoArchiveEnabled: z.boolean().optional(),
  autoArchiveTime: z
    .string()
    .regex(timePattern, "时间格式需为 HH:mm")
    .optional(),
  unfinishedGraceDays: z.number().int().min(0).max(720).optional(),
  unfinishedGraceUnit: z.enum(["DAY", "HOUR"]).optional(),
  cleanupFinishedAfterDays: z
    .number()
    .int()
    .min(1)
    .max(365)
    .nullable()
    .optional(),
  cleanupUnfinishedAfterDays: z
    .number()
    .int()
    .min(1)
    .max(365)
    .nullable()
    .optional(),
})

const DEFAULT_SETTINGS = {
  autoArchiveEnabled: true,
  autoArchiveTime: "09:00",
  unfinishedGraceDays: 1,
  unfinishedGraceUnit: "DAY" as "DAY" | "HOUR",
  cleanupFinishedAfterDays: 90,
  cleanupUnfinishedAfterDays: 30,
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const settings = await prisma.todoArchiveSetting.findUnique({
      where: { userId: session.user.id },
    })

    return NextResponse.json({
      ...DEFAULT_SETTINGS,
      ...(settings ?? {}),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "获取归档设置失败" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = settingsSchema.parse(body)

    const normalizedData = {
      ...DEFAULT_SETTINGS,
      ...data,
    }

    const updated = await prisma.todoArchiveSetting.upsert({
      where: { userId: session.user.id },
      update: {
        autoArchiveEnabled: normalizedData.autoArchiveEnabled,
        autoArchiveTime: normalizedData.autoArchiveTime,
        unfinishedGraceDays: normalizedData.unfinishedGraceDays,
        unfinishedGraceUnit: normalizedData.unfinishedGraceUnit,
        cleanupFinishedAfterDays: normalizedData.cleanupFinishedAfterDays,
        cleanupUnfinishedAfterDays: normalizedData.cleanupUnfinishedAfterDays,
      },
      create: {
        userId: session.user.id,
        autoArchiveEnabled: normalizedData.autoArchiveEnabled,
        autoArchiveTime: normalizedData.autoArchiveTime,
        unfinishedGraceDays: normalizedData.unfinishedGraceDays,
        unfinishedGraceUnit: normalizedData.unfinishedGraceUnit,
        cleanupFinishedAfterDays: normalizedData.cleanupFinishedAfterDays,
        cleanupUnfinishedAfterDays: normalizedData.cleanupUnfinishedAfterDays,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "更新归档设置失败" },
      { status: 500 }
    )
  }
}

