import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { city, country } = await req.json();

    if (!city || !country) {
      return NextResponse.json(
        { error: "City and country are required" },
        { status: 400 }
      );
    }

    const query = encodeURIComponent(`${city}, ${country}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "MapToPoster/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoding service error" },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Location lookup timed out. Please try again." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
