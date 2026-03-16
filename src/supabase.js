import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://nnsylkjahuhttwajuxls.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uc3lsa2phaHVodHR3YWp1eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDY4NjQsImV4cCI6MjA4ODk4Mjg2NH0.9_IjGbG9D-mPapRHiKCGGDHLYXZBRIKyxwS8efr2ezA'

export const supabase = createClient(url, key)
