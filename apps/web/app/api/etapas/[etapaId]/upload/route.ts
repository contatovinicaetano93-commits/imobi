import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ etapaId: string }> }
) {
  const { etapaId } = await params;
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { latitude, longitude, accuracyMetros, foto } = await req.json();

  try {
    // Convert base64 to buffer
    const base64Data = foto.split(",")[1] || foto;
    const fileBuffer = Buffer.from(base64Data, "base64");

    // Create FormData
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: "image/jpeg" });
    formData.append("file", blob, "evidence.jpg");
    formData.append("etapaId", etapaId);
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
    formData.append("accuracyMetros", String(accuracyMetros));

    const res = await fetch(`${API_URL}/api/v1/evidencias/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(error, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
