import { type NextRequest } from "next/server";
import { resolveTenorMedia } from "@/lib/tenor-media";

export async function GET(request: NextRequest) {
  return resolveTenorMedia(request);
}
