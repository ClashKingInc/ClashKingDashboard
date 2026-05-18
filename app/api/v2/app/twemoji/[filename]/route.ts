import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const TWEMOJI_64_DIR = path.join(process.cwd(), "node_modules", "emoji-datasource-twitter", "img", "twitter", "64");

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  if (!/^[a-z0-9-]+\.png$/i.test(filename)) {
    return NextResponse.json({ error: "invalid_filename" }, { status: 400 });
  }

  const filePath = path.join(TWEMOJI_64_DIR, filename);
  try {
    const file = await fs.readFile(filePath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}

