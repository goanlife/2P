import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://nnsylkjahuhttwajuxls.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_m1QgYsOmtYGpQH7ceCvGxA_DYQwwt35'

export const supabase = createClient(url, key)
