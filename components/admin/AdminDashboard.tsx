"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Shield, User as UserIcon, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useNotification } from "@/components/ui/notification"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

type User = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: "USER" | "ADMIN"
  emailVerified: Date | null
  createdAt: Date
  updatedAt: Date
  _count: {
    todos: number
    tasks: number
    schedules: number
  }
}

type UserListResponse = {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const { confirm } = useConfirm()
  const { showSuccess, showError } = useNotification()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error("获取用户列表失败")

      const data: UserListResponse = await response.json()
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
    } catch (error) {
      showError("加载失败", "无法加载用户列表")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, search])

  const handleRoleChange = async (userId: string, newRole: "USER" | "ADMIN") => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "更新角色失败")
      }

      showSuccess("角色已更新", `用户角色已更改为 ${newRole === "ADMIN" ? "管理员" : "普通用户"}`)
      fetchUsers()
    } catch (error: any) {
      showError("更新失败", error.message)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmed = await confirm({
      title: "删除用户",
      message: `确定要删除用户 ${userEmail} 吗？此操作不可撤销。`,
      confirmText: "删除",
      cancelText: "取消",
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "删除用户失败")
      }

      showSuccess("用户已删除", "用户及其所有数据已被删除")
      fetchUsers()
    } catch (error: any) {
      showError("删除失败", error.message)
    }
  }

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "U"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">管理员面板</h1>
        <p className="text-muted-foreground mt-1">
          管理系统用户和权限
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理员</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "ADMIN").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">普通用户</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "USER").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户管理</CardTitle>
          <CardDescription>查看和管理所有注册用户</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户邮箱或姓名..."
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "未找到匹配的用户" : "暂无用户"}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>邮箱验证</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>数据统计</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback>
                                {getInitials(user.name, user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.name || "未设置"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.emailVerified ? (
                            <Badge variant="default">已验证</Badge>
                          ) : (
                            <Badge variant="secondary">未验证</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value: "USER" | "ADMIN") =>
                              handleRoleChange(user.id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">
                                <div className="flex items-center gap-2">
                                  <UserIcon className="h-4 w-4" />
                                  <span>普通用户</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="ADMIN">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  <span>管理员</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div>待办: {user._count.todos}</div>
                            <div>任务: {user._count.tasks}</div>
                            <div>日程: {user._count.schedules}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(user.createdAt), "PPP", {
                              locale: zhCN,
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  显示 {users.length} / {total} 个用户
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm">
                    第 {page} / {totalPages} 页
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
