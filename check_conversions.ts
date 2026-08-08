import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase
    .from("ingredient_unit_conversions")
    .select("*");
  console.log("Conversions:", JSON.stringify(data, null, 2), "Error:", error);
}

check();
