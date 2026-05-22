import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  if (!/^[a-z0-9-]+\.png$/i.test(filename)) {
    return NextResponse.json({ error: "invalid_filename" }, { status: 400 });
  }

  // Redirect to the published emoji-datasource-twitter assets to avoid bundling
  // the full local emoji asset tree during Next/Turbopack builds.
  const target = `https://cdn.jsdelivr.net/npm/emoji-datasource-twitter/img/twitter/64/${filename}`;
  return NextResponse.redirect(target, { status: 307 });
}

