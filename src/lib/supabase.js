import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Chave publicável (sb_publishable_...). A antiga "anon" ainda é aceita, mas o
// Supabase desliga as antigas até o fim de 2026.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

// Enquanto o app roda no mock (Etapa 4) não existe .env.local; a conexão fica
// nula em vez de quebrar o app na partida. Só dados.js usa este arquivo.
export const supabase = url && key ? createClient(url, key) : null
