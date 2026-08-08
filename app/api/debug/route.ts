import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  
  // Try to query ingredient_unit_conversions
  const { data, error } = await supabase.from("ingredient_unit_conversions").select("*");
  
  // Also query ingredients
  const { data: ingredients } = await supabase.from("ingredients").select("*");

  // Also check session
  const { data: session } = await supabase.auth.getSession();
  
  return NextResponse.json({
    data,
    error,
    ingredients,
    sessionUser: session?.session?.user?.id,
  });
}
