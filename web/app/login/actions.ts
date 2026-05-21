"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export async function login(formData: FormData) {
  const email = formData.get("email")
  const password = formData.get("password")

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/login?error=invalid")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Mensagem generica — nao revela se o email existe (evita user enumeration)
    redirect("/login?error=credentials")
  }

  redirect("/dashboard")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
