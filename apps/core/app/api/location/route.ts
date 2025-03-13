import { NextResponse } from "next/server";

const HERE_API_KEY = process.env.HERE_MAPS_API_KEY; // ✅ Load from .env

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&apiKey=${HERE_API_KEY}`
    );

    const data = await response.json();
    return NextResponse.json(data); // ✅ Return response
  } catch (error) {
    console.error("HERE API Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
