import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { generatePresignedPutUrl } from "@/lib/r2/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_MIME: Record<string, `frames/${string}` | `stickers/${string}`> = {
  "image/png": "frames/any",
  "image/jpeg": "frames/any",
  "image/webp": "frames/any",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized — login terlebih dahulu" },
        { status: 401 },
      );
    }

    const { data: adminCheck, error: adminErr } = await supabase
      .from("admin_roles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminErr || !adminCheck) {
      return NextResponse.json(
        { error: "Forbidden — admin access required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { scope, contentType, extension = "png" } = body as {
      scope?: "frame" | "sticker";
      contentType?: string;
      extension?: string;
    };

    if (!scope || !contentType) {
      return NextResponse.json(
        { error: "scope dan contentType wajib diisi" },
        { status: 400 },
      );
    }

    if (!(contentType in ALLOWED_MIME)) {
      return NextResponse.json(
        { error: `Content-Type tidak diizinkan: ${contentType}` },
        { status: 400 },
      );
    }

    const id = uuidv4();
    const ext = extension.replace(/^\./, "");

    let key: string;
    if (scope === "frame") {
      key = `frames/${id}/frame.${ext}`;
    } else {
      key = `stickers/${id}/sticker.${ext}`;
    }

    const presigned = await generatePresignedPutUrl(key, contentType, 900);

    return NextResponse.json({
      id,
      key,
      uploadUrl: presigned.url,
      publicUrl: presigned.publicUrl,
    });
  } catch (err: any) {
    console.error("[presigned-upload-url] error:", err);
    return NextResponse.json(
      {
        error: "Gagal generate presigned URL",
        details: process.env.NODE_ENV === "development" ? err?.message : undefined,
      },
      { status: 500 },
    );
  }
}
