import { NextResponse } from "next/server"

export async function GET() {
  const providers = {
    credentials: true,
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  }

  return NextResponse.json(providers)
}
