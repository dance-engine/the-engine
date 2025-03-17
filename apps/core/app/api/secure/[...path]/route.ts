import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";

const EXTERNAL_API_BASE_URL = "https://q8ut73qldj.execute-api.eu-west-1.amazonaws.com"; // Change this

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const {user, accessToken } = await withAuth(); // Get WorkOS token
  const path =  await params.path
  console.log(user,accessToken,path)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Construct external API URL dynamically
  const externalUrl = `${EXTERNAL_API_BASE_URL}/${path.join("/")}`;

  // Forward request to external API with Bearer token
  const response = await fetch(externalUrl, {
    method: req.method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return NextResponse.json(data, {status: response.status});
}
