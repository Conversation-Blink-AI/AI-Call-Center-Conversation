import { NextRequest } from "next/server"
import { POST as validateTokenPost } from "../validate-token/route"

export async function POST(req: NextRequest) {
  return validateTokenPost(req)
}
