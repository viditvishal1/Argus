import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabaseAuthConfigured()) {
    return NextResponse.json({ user: null, authConfigured: false });
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return NextResponse.json({
      user: user ? { id: user.id, email: user.email } : null,
      authConfigured: true,
    });
  } catch {
    return NextResponse.json({ user: null, authConfigured: true });
  }
}
