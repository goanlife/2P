import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [mode, setMode]     = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState(null)
  const [err, setErr]       = useState(null)

  const handle = async () => {
    setLoading(true); setErr(null); setMsg(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password: pass })
        if (error) throw error
        setMsg('Controlla la tua email per confermare la registrazione.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setMsg('Email di reset inviata. Controlla la tua casella.')
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#F5F4F0', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'white', borderRadius:16, border:'0.5px solid #E5E4E0', padding:'36px 40px', width:'min(400px,94vw)', boxShadow:'0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🔧</div>
          <div style={{ fontSize:22, fontWeight:600, color:'#1a1a1a' }}>ManuMan</div>
          <div style={{ fontSize:13, color:'#888', marginTop:4 }}>Gestione manutenzioni</div>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {['login','signup'].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setErr(null);setMsg(null)}}
              style={{ flex:1, padding:'9px 0', borderRadius:8, border:'0.5px solid', fontSize:13, fontWeight:500, cursor:'pointer',
                background:mode===m?'#185FA5':'white', color:mode===m?'white':'#555',
                borderColor:mode===m?'#185FA5':'#ddd' }}>
              {m==='login'?'Accedi':'Registrati'}
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gap:12 }}>
          <div>
            <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:4 }}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="nome@azienda.it"
              style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:8, border:'0.5px solid #ddd', fontSize:14 }} />
          </div>
          {mode !== 'reset' && (
            <div>
              <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:4 }}>Password</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e=>e.key==='Enter'&&handle()}
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:8, border:'0.5px solid #ddd', fontSize:14 }} />
            </div>
          )}
        </div>

        {err && <div style={{ background:'#FCEBEB', border:'0.5px solid #F09595', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#A32D2D', marginTop:14 }}>{err}</div>}
        {msg && <div style={{ background:'#EAF3DE', border:'0.5px solid #97C459', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#3B6D11', marginTop:14 }}>{msg}</div>}

        <button onClick={handle} disabled={loading}
          style={{ width:'100%', marginTop:20, padding:'11px 0', borderRadius:8, background: loading?'#aaa':'#185FA5', color:'white', border:'none', fontSize:14, fontWeight:500, cursor: loading?'not-allowed':'pointer' }}>
          {loading ? 'Caricamento...' : mode==='login' ? 'Accedi' : mode==='signup' ? 'Crea account' : 'Invia email di reset'}
        </button>

        {mode==='login' && (
          <div style={{ textAlign:'center', marginTop:14 }}>
            <button onClick={()=>{setMode('reset');setErr(null);setMsg(null)}}
              style={{ background:'none', border:'none', color:'#185FA5', fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
              Password dimenticata?
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
