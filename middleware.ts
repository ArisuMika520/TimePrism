import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // 获取正确的 base URL（优先使用请求头中的 host）
  const host = req.headers.get("host") || req.nextUrl.host
  const protocol = req.headers.get("x-forwarded-proto") || (req.nextUrl.protocol === "https:" ? "https" : "http")
  const baseUrl = `${protocol}://${host}`

  // 保护的路由
  const protectedPaths = ["/dashboard", "/todos", "/tasks", "/schedule"]
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  // 认证相关路由
  const authPaths = ["/auth"]
  const isAuthPath = authPaths.some(path => pathname.startsWith(path))

  // 如果未登录且访问受保护的路由，重定向到登录页
  if (isProtectedPath && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", baseUrl))
  }

  // 如果已登录且访问认证页面，重定向到仪表板
  if (isAuthPath && isLoggedIn && pathname !== "/auth/error") {
    return NextResponse.redirect(new URL("/dashboard", baseUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

