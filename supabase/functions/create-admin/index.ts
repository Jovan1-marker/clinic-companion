import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Create admin user
  const { data, error } = await supabase.auth.admin.createUser({
    email: "admin@aais.com",
    password: "admin123",
    email_confirm: true,
    user_metadata: { full_name: "Admin" },
  });

  if (error) {
    // If user already exists, just update role
    if (error.message.includes("already")) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const admin = users?.users?.find((u: any) => u.email === "admin@aais.com");
      if (admin) {
        await supabase.from("profiles").update({ role: "admin" }).eq("id", admin.id);
        return new Response(JSON.stringify({ message: "Admin role updated" }), { headers: { "Content-Type": "application/json" } });
      }
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Set role to admin
  await supabase.from("profiles").update({ role: "admin" }).eq("id", data.user.id);

  return new Response(JSON.stringify({ message: "Admin created", id: data.user.id }), { headers: { "Content-Type": "application/json" } });
});
