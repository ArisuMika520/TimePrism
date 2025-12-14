import { handlers } from "@/lib/auth"
import { NextRequest } from "next/server"

// 包装 handlers 以确保正确处理 base URL
export async function GET(request: NextRequest) {
  return handlers.GET(request)
}

export async function POST(request: NextRequest) {
  return handlers.POST(request)
}

