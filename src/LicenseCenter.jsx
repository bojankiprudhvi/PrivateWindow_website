import { useEffect, useState } from 'react'
import { supabase, supabaseReady } from './supabase.js'
import { loadLicenses, unbindDevice, validateLicense } from './licenseApi.js'

const masked = (key) => key ? `${key.slice(0, 8)}-${'•'.repeat(12)}-${key.slice(-4)}` : ''

export default function LicenseCenter({ close }) {
  const [session, setSession] = useState(null)
  const [licenses, setLicenses] = useState([])
  const [revealed, setRevealed] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(() => window.location.pathname === '/reset-password')
  const [newPassword, setNewPassword] = useState('')
  const [keyToCheck, setKeyToCheck] = useState('')
  const [validation, setValidation] = useState(null)

  const refresh = async () => {
    try {
      setLicenses((await loadLicenses()).licenses || [])
    } catch (fetchError) {
      setMessage('')
      setError(fetchError.message === 'Failed to fetch' ? 'The licensing backend is not deployed yet.' : fetchError.message)
    }
  }
  const action = async (work) => {
    setBusy(true); setError(''); setMessage('')
    try { await work() } catch (actionError) { setError(actionError.message) } finally { setBusy(false) }
  }

  useEffect(() => {
    if (!supabase) return undefined
    const finishCallback = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code)
        if (result.error) setError(result.error.message)
        else window.history.replaceState({}, document.title, recoveryMode ? '/reset-password' : '/')
      }
      const result = await supabase.auth.getSession()
      if (result.error) setError(result.error.message)
      setSession(result.data.session)
      if (result.data.session && !recoveryMode) refresh()
    }
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(nextSession)
      if (nextSession && event !== 'PASSWORD_RECOVERY' && !recoveryMode) setTimeout(refresh, 0)
      if (!nextSession) setLicenses([])
    })
    finishCallback()
    return () => data.subscription.unsubscribe()
  }, [])

  const submitAuthentication = (event) => {
    event.preventDefault()
    action(async () => {
      if (authMode === 'login') {
        const result = await supabase.auth.signInWithPassword({ email, password })
        if (result.error) throw result.error
      } else {
        const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (result.error) throw result.error
        setMessage(result.data.session
          ? 'Account created and signed in.'
          : 'If this is a new account, a confirmation email was sent. Existing users should log in or reset their password.')
      }
    })
  }
  const sendPasswordReset = () => action(async () => {
    if (!email) throw new Error('Enter your email first.')
    const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    if (result.error) throw result.error
    setMessage('If this email belongs to an account and the mail limit allows it, a password-reset link will arrive shortly. Check Spam and All Mail too.')
  })
  const updatePassword = (event) => {
    event.preventDefault()
    action(async () => {
      const result = await supabase.auth.updateUser({ password: newPassword })
      if (result.error) throw result.error
      setRecoveryMode(false)
      window.history.replaceState({}, document.title, '/')
      setMessage('Password updated successfully.')
      await refresh()
    })
  }
  return <div className="modal-backdrop license-backdrop" onMouseDown={close}>
    <section className="license-center" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={close} aria-label="Close">×</button>
      <p className="eyebrow">YOUR PRIVATE WINDOW ACCOUNT</p>
      <h2>{recoveryMode ? 'Set new password' : session ? 'My keys' : 'Log in'}</h2>
      {!supabaseReady && <div className="account-notice error">Supabase has not been configured.</div>}

      {recoveryMode && <form className="sign-in-panel" onSubmit={updatePassword}>
        <p>Choose a new password for your account.</p>
        {error && <div className="account-notice error">{error}</div>}
        <input type="password" required minLength="8" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password (minimum 8 characters)" autoFocus />
        <button className="button button-primary" disabled={busy}>{busy ? 'Updating…' : 'Set new password'}</button>
      </form>}

      {!session && !recoveryMode && supabaseReady && <form className="sign-in-panel" onSubmit={submitAuthentication}>
        <div className="auth-tabs"><button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setError(''); setMessage('') }}>Log in</button><button type="button" className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setError(''); setMessage('') }}>Create account</button></div>
        <p>{authMode === 'login' ? 'Log in to view and manage your keys.' : 'Create an account before requesting or purchasing a key.'}</p>
        {error && <div className="account-notice error">{error}</div>}
        {message && <div className="account-notice success">{message}</div>}
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
        <input type="password" required minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (minimum 8 characters)" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} />
        <button className="button button-primary" disabled={busy}>{busy ? 'Please wait…' : authMode === 'login' ? 'Log in' : 'Create account'}</button>
        {authMode === 'login' && <button type="button" className="forgot-password" onClick={sendPasswordReset}>Forgot password?</button>}
      </form>}

      {session && !recoveryMode && <>
        <div className="account-row"><div><span>Account</span><strong>{session.user.email}</strong></div></div>
        {error && <div className="account-notice error">{error}</div>}
        {message && <div className="account-notice success">{message}</div>}
        <div className="license-list">
          {!busy && !licenses.length && <p className="empty-license">No key is assigned to this account yet.</p>}
          {licenses.map((license) => <article className="license-row" key={license.id}>
            <div className="license-meta"><span className={`tier ${license.tier}`}>{license.tier}</span><small>{license.status} · {license.max_devices} device{license.max_devices > 1 ? 's' : ''}</small></div>
            <code>{revealed[license.id] ? license.key : masked(license.key)}</code>
            <div className="license-actions"><button onClick={() => setRevealed((old) => ({ ...old, [license.id]: !old[license.id] }))}>{revealed[license.id] ? 'Hide' : 'Reveal'}</button><button onClick={() => navigator.clipboard.writeText(license.key)}>Copy</button></div>
            <div className="device-list">{license.devices?.filter((device) => device.active).map((device) => <div key={device.id}><span>{device.device_name || 'Windows PC'}<small>Last verified {new Date(device.last_seen_at).toLocaleDateString()}</small></span><button disabled={busy} onClick={() => action(async () => { await unbindDevice(license.id, device.id); await refresh() })}>Unbind</button></div>)}</div>
            <small className="transfer-count">Transfers remaining: {license.transfers_remaining === null ? 'Unlimited' : license.transfers_remaining}</small>
          </article>)}
        </div>
        <form className="key-validator" onSubmit={(event) => { event.preventDefault(); action(async () => setValidation(await validateLicense(keyToCheck))) }}><label>Validate one of your keys</label><div><input value={keyToCheck} onChange={(event) => { setKeyToCheck(event.target.value); setValidation(null) }} placeholder="PW-…" /><button className="button price-button" disabled={!keyToCheck.trim()}>Validate</button></div>{validation && <p className={validation.valid ? 'valid-result' : 'invalid-result'}>{validation.valid ? `Valid ${validation.tier} key · ${validation.status}` : validation.message}</p>}</form>
      </>}
    </section>
  </div>
}
