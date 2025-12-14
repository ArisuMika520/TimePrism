import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }
    }),
    // Google OAuth - 仅在配置了凭据时启用
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // GitHub OAuth - 仅在配置了凭据时启用
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // OAuth 登录时，确保用户存在于数据库中
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          if (!user.email) return false

          // 查找或创建用户
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          })

          if (!existingUser) {
            // 创建新用户
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email.split("@")[0],
                image: user.image,
                emailVerified: new Date(), // OAuth 用户邮箱已验证
              },
            })
            user.id = newUser.id
          } else {
            // 更新现有用户信息
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
              },
            })
            user.id = existingUser.id
          }
        } catch (error) {
          console.error("Error in signIn callback:", error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.image = user.image
      }
      if (trigger === "update") {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, email: true, image: true },
          })
          if (dbUser) {
            token.name = dbUser.name
            token.email = dbUser.email
            token.image = dbUser.image
          }
        } catch (error) {
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string | null
        session.user.email = token.email as string
        session.user.image = token.image as string | null
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // 如果 baseUrl 包含 localhost，但环境变量设置了正确的 URL，使用环境变量
      let finalBaseUrl = baseUrl
      if (baseUrl.includes("localhost") && process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
        finalBaseUrl = process.env.NEXTAUTH_URL
      }
      
      // 如果 url 是相对路径，使用 baseUrl 构建完整 URL
      if (url.startsWith("/")) {
        return `${finalBaseUrl}${url}`
      }
      
      // 如果 url 是完整的 URL
      try {
        const urlObj = new URL(url)
        // 如果 URL 包含 localhost，但 baseUrl 不包含，使用 baseUrl 的 origin
        if (urlObj.hostname === "localhost" && !finalBaseUrl.includes("localhost")) {
          return `${finalBaseUrl}${urlObj.pathname}${urlObj.search}${urlObj.hash}`
        }
        // 检查是否是同源
        if (urlObj.origin === new URL(finalBaseUrl).origin) {
          return url
        }
      } catch {
        // URL 解析失败，使用相对路径处理
      }
      
      // 默认重定向到 dashboard
      return `${finalBaseUrl}/dashboard`
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})

