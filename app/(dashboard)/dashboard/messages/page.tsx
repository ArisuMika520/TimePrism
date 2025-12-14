import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MessagesPageClient } from "@/components/messages/MessagesPageClient"

export default async function MessagesPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return <MessagesPageClient userId={session.user.id} />
}

