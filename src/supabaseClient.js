import { createClient } from "@supabase/supabase-js";

// Estas dos variables son PÚBLICAS (anon key). Es seguro exponerlas:
// la seguridad real la dan las políticas RLS de Supabase.
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon);
