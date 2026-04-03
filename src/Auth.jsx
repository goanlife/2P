import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [mode, setMode]     = useState('login')
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [loading, setLoad]  = useState(false)
  const [msg, setMsg]       = useState(null)
  const [err, setErr]       = useState(null)

  const handle = async () => {
    if (!email.trim()) { setErr('Inserisci la tua email.'); return }
    setLoad(true); setErr(null); setMsg(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass })
        if (error) throw error
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password: pass })
        if (error) throw error
        setMsg('Controlla la tua email per confermare la registrazione.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
        if (error) throw error
        setMsg('Email di reset inviata. Controlla la tua casella.')
      }
    } catch (e) { setErr(e.message) }
    finally { setLoad(false) }
  }

  const inp = {
    width: '100%', padding: '14px', fontSize: 16,  /* 16px = no zoom iOS */
    border: '1.5px solid #D1D5DB', borderRadius: 10,
    background: '#FAFAFA', color: '#111',
    fontFamily: 'system-ui,sans-serif',
    outline: 'none', boxSizing: 'border-box',
    WebkitAppearance: 'none', appearance: 'none',
    minHeight: 52,  /* touch target */
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #0D1B2A 0%, #152232 60%, #1C2E40 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top,0px) + 20px) 16px calc(env(safe-area-inset-bottom,0px) + 20px)',
      fontFamily: 'system-ui,sans-serif',
      boxSizing: 'border-box',
    }}>
      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: 20, padding: 'clamp(24px, 6vw, 40px) clamp(20px, 6vw, 36px)',
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,.35)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60, background: '#0EA5E9',
            borderRadius: 16, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 14,
            boxShadow: '0 4px 20px rgba(14,165,233,.35)',
          }}>⚙</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '.05em', fontFamily: "'Oxanium',system-ui" }}>
            MANUМАН
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            {mode === 'login'  ? 'Accedi al tuo account' :
             mode === 'signup' ? 'Crea un nuovo account' :
             'Recupera la password'}
          </div>
        </div>

        {/* Tabs login/signup */}
        {mode !== 'reset' && (
          <div style={{
            display: 'flex', background: '#F1F5F9', borderRadius: 12,
            padding: 4, marginBottom: 24, gap: 4,
          }}>
            {[['login','Accedi'],['signup','Registrati']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setErr(null); setMsg(null) }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 9, border: 'none',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44,
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#0EA5E9' : '#64748B',
                  boxShadow: mode === m ? '0 1px 6px rgba(0,0,0,.10)' : 'none',
                  transition: 'all .15s',
                }}>{l}</button>
            ))}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 7, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email" value={email} inputMode="email"
              onChange={e => setEmail(e.target.value)}
              placeholder="nome@azienda.it"
              style={inp}
              onKeyDown={e => e.key === 'Enter' && handle()}
              autoComplete="email" autoCapitalize="none" autoCorrect="off"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 7, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                Password {mode === 'signup' && <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(min. 6 caratteri)</span>}
              </label>
              <input
                type="password" value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                style={inp}
                onKeyDown={e => e.key === 'Enter' && handle()}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}

          {err && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 10, padding: '12px 14px',
              fontSize: 14, color: '#DC2626', lineHeight: 1.5,
            }}>⚠ {err}</div>
          )}
          {msg && (
            <div style={{
              background: '#F0FDF4', border: '1px solid #A7F3D0',
              borderRadius: 10, padding: '12px 14px',
              fontSize: 14, color: '#065F46', lineHeight: 1.5,
            }}>✅ {msg}</div>
          )}

          <button onClick={handle} disabled={loading}
            style={{
              width: '100%', padding: '15px',
              background: loading ? '#D1D5DB' : '#0EA5E9',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 6, transition: 'all .15s',
              minHeight: 52,  /* touch target 52px */
              WebkitAppearance: 'none',
              fontFamily: "'Oxanium',system-ui", letterSpacing: '.04em',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(14,165,233,.3)',
            }}>
            {loading ? '...' :
             mode === 'login'  ? 'Accedi →' :
             mode === 'signup' ? 'Crea account →' :
             'Invia email →'}
          </button>
        </div>

        {mode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button onClick={() => { setMode('reset'); setErr(null); setMsg(null) }}
              style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 8 }}>
              Password dimenticata?
            </button>
          </div>
        )}
        {mode === 'reset' && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button onClick={() => { setMode('login'); setErr(null); setMsg(null) }}
              style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 8 }}>
              ← Torna al login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
