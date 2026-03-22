import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null)
  const [err, setErr]         = useState(null)

  const handle = async () => {
    if (!email.trim()) { setErr('Inserisci la tua email.'); return; }
    setLoading(true); setErr(null); setMsg(null);
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
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '12px 14px', fontSize: 15,
    border: '1.5px solid #D1D5DB', borderRadius: 9,
    background: '#FAFAFA', color: '#111',
    fontFamily: 'system-ui,sans-serif',
    outline: 'none', boxSizing: 'border-box',
    WebkitAppearance: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0D1B2A 0%, #152232 60%, #1C2E40 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: 'system-ui,sans-serif',
    }}>
      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: 18, padding: '36px 32px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,.35)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, background: '#F59E0B',
            borderRadius: 14, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 14,
            boxShadow: '0 4px 16px rgba(245,158,11,.35)',
          }}>🔧</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0D1B2A', letterSpacing: '-.02em' }}>
            ManuMan
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            {mode === 'login'  ? 'Accedi al tuo account' :
             mode === 'signup' ? 'Crea un nuovo account' :
             'Recupera la password'}
          </div>
        </div>

        {/* Tabs login/signup */}
        {mode !== 'reset' && (
          <div style={{
            display: 'flex', background: '#F3F4F6', borderRadius: 10,
            padding: 3, marginBottom: 20, gap: 3,
          }}>
            {[['login','Accedi'],['signup','Registrati']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setErr(null); setMsg(null); }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#0D1B2A' : '#6B7280',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,.12)' : 'none',
                  transition: 'all .15s',
                }}>{l}</button>
            ))}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nome@azienda.it"
              style={inp}
              onKeyDown={e => e.key === 'Enter' && handle()}
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
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
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#DC2626', lineHeight: 1.4,
            }}>⚠ {err}</div>
          )}
          {msg && (
            <div style={{
              background: '#F0FDF4', border: '1px solid #A7F3D0',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#065F46', lineHeight: 1.4,
            }}>✅ {msg}</div>
          )}

          <button onClick={handle} disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading ? '#D1D5DB' : '#F59E0B',
              color: '#0D1B2A', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4, transition: 'background .15s',
              WebkitAppearance: 'none',
            }}>
            {loading ? '...' :
             mode === 'login'  ? 'Accedi →' :
             mode === 'signup' ? 'Crea account →' :
             'Invia email di reset →'}
          </button>
        </div>

        {/* Link password dimenticata */}
        {mode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => { setMode('reset'); setErr(null); setMsg(null); }}
              style={{ background: 'none', border: 'none', color: '#6B7280',
                fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              Password dimenticata?
            </button>
          </div>
        )}
        {mode === 'reset' && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => { setMode('login'); setErr(null); setMsg(null); }}
              style={{ background: 'none', border: 'none', color: '#6B7280',
                fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              ← Torna al login
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 20, left: 0, right: 0,
        textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.3)',
      }}>
        © 2026 ManuMan — Gestione Manutenzioni
      </div>
    </div>
  )
}
