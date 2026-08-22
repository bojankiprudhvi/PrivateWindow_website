import { useEffect, useState } from 'react'
import LicenseCenter from './LicenseCenter.jsx'
import { supabase } from './supabase.js'
import { issueFreeKey } from './licenseApi.js'

const features = [
  { icon: '◈', title: 'Protected presentation', text: 'When protection is enabled, the Private Window workspace is excluded from supported Windows capture APIs.' },
  { icon: '◌', title: 'Live transcription', text: 'Listen to call audio or your microphone, then turn speech into text on your device by default.' },
  { icon: '⌗', title: 'One focused window', text: 'Bring a running app into the workspace, keep it above your call, and control it from one place.' },
]

const steps = [
  ['01', 'Choose an app', 'Open Private Window, select a running application, and bring it into your private workspace.'],
  ['02', 'Turn on protection', 'Private Window asks Windows to exclude its workspace and dialogs from supported capture methods.'],
  ['03', 'Present with confidence', 'You continue seeing the workspace on your monitor while people viewing your screen share see what is behind it.'],
]

const compatibility = [
  { name: 'Microsoft Teams', logo: '/platforms/microsoft-teams.svg' },
  { name: 'Zoom', logo: '/platforms/zoom.svg' },
  { name: 'Google Meet', logo: '/platforms/google-meet.svg' },
  { name: 'Cisco Webex', logo: '/platforms/webex.svg' },
  { name: 'Slack Huddles', logo: '/platforms/slack.svg' },
]

const pricingPlans = [
  { id: 'single', tag: 'CASUAL', name: 'Single', price: '₹1,500', details: ['1 active device', '2 transfers per year', 'Remote device management'] },
  { id: 'pro', tag: 'MULTI-DEVICE', name: 'Pro', price: '₹2,999', details: ['2 active devices', '5 transfers per year', 'Desktop and laptop use'] },
  { id: 'power', tag: 'FREELANCER', name: 'Power', price: '₹4,999', details: ['3 active devices', 'Unlimited transfers', 'For frequent hardware changes'] },
]

const DEFAULT_INSTALLER = import.meta.env.VITE_INSTALLER_URL || '/downloads/PrivateWindow-1.0-windows-x64-Setup.exe'
const SUPPORT_EMAIL = 'privatewindowapp@gmail.com'

function Logo() {
  return <a className="logo" href="#top" aria-label="Private Window home"><img className="logo-mark" src="/private-window-mark.svg" alt="" /><span>private<span>window</span></span></a>
}

function ThemeToggle({ theme, setTheme }) {
  return <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><span>{theme === 'dark' ? '☼' : '☾'}</span></button>
}

function DownloadModal({ close }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={close} aria-label="Close">×</button>
      <div className="modal-icon">↓</div>
      <p className="eyebrow">RELEASE IN PREPARATION</p>
      <h2 id="modal-title">The first download is on its way.</h2>
      <p>We are packaging and verifying the Windows release. This button will point to the signed Private Window release archive as soon as it is ready.</p>
      <button className="button button-primary" onClick={close}>Got it</button>
    </section>
  </div>
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('private-window-theme') || localStorage.getItem('privacy-screen-theme') || 'dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [installerUrl, setInstallerUrl] = useState(DEFAULT_INSTALLER)
  const [licenseCenterOpen, setLicenseCenterOpen] = useState(() => window.location.pathname === '/reset-password')
  const [accountSession, setAccountSession] = useState(null)

  useEffect(() => {
    if (!supabase) return undefined
    supabase.auth.getSession().then(({ data }) => setAccountSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAccountSession(session))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // Load installer metadata published by the deploy script. Falls back to the
    // build-time URL or local copy if the fetch fails.
    fetch('/downloads/installer.json')
      .then((r) => {
        if (!r.ok) throw new Error('no metadata')
        return r.json()
      })
      .then((data) => {
        if (data && data.url) setInstallerUrl(data.url)
      })
      .catch(() => {
        /* ignore and keep the default */
      })
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('private-window-theme', theme)
  }, [theme])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => isIntersecting && target.classList.add('is-visible')), { threshold: 0.12 })
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const closeMenu = () => setMenuOpen(false)
  const openDownload = () => { setModalOpen(true); closeMenu() }
  const handleDownload = (e) => {
    e.preventDefault()
    window.open(installerUrl, '_blank', 'noopener')
    closeMenu()
  }
  const contactForPlan = (plan) => {
    if (!accountSession) { setLicenseCenterOpen(true); return }
    const salesEmail = import.meta.env.VITE_SALES_EMAIL
    if (!salesEmail || salesEmail.startsWith('PASTE_')) { window.alert('Sales contact email is not configured yet.'); return }
    const subject = `Private Window ${plan.name} license`
    const body = `Hello, I want to purchase the ${plan.name} plan (${plan.price}).\n\nMy account email: ${accountSession.user.email}\n\nPlease send payment instructions and assign the key to this account.`
    window.location.href = `mailto:${salesEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }
  const getFreeKey = async () => {
    if (!accountSession) { setLicenseCenterOpen(true); return }
    try { await issueFreeKey(); setLicenseCenterOpen(true) }
    catch (error) { window.alert(error.message) }
  }

  return <div id="top" className="site-shell">
    <header className="nav-wrap">
      <nav className="nav container" aria-label="Main navigation">
        <Logo />
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a><a href="#compatibility" onClick={closeMenu}>Compatibility</a><a href="#features" onClick={closeMenu}>Features</a><a href="#live-captions" onClick={closeMenu}>Live captions</a><a href="#pricing" onClick={closeMenu}>Pricing</a><a href="#privacy" onClick={closeMenu}>Privacy</a>
          <button className="nav-account" onClick={() => { setLicenseCenterOpen(true); closeMenu() }}>{accountSession ? 'My keys' : 'Log in'}</button>
          {accountSession && <button className="nav-logout" onClick={() => { supabase.auth.signOut(); closeMenu() }}>Log out</button>}
          <a className="nav-download" href={installerUrl} onClick={handleDownload}>Download <span>↓</span></a>
        </div>
        <ThemeToggle theme={theme} setTheme={setTheme} />
        <button className="menu-button" aria-expanded={menuOpen} aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}><i></i><i></i></button>
      </nav>
    </header>

    <main>
      <section className="hero container">
        <div className="hero-copy reveal is-visible">
          <div className="status"><span></span> BUILT FOR WINDOWS</div>
          <h1>Your screen,<br /><em>on your terms.</em></h1>
          <p className="hero-text">A focused, private workspace for your calls, apps, and conversations—built to stay yours.</p>
          <div className="hero-actions"><a className="button button-primary" href={installerUrl} onClick={handleDownload}>Download for Windows <span>↓</span></a><a className="text-link" href="#how-it-works">See how it works <span>↓</span></a></div>
          <p className="platform-note">Windows 10 version 2004 or later <b>·</b> Offline-first</p>
        </div>
        <div className="hero-art reveal is-visible">
          <div className="orb orb-one"></div><div className="orb orb-two"></div>
          <div className="app-window">
            <div className="window-top"><div className="window-dots"><i></i><i></i><i></i></div><span>Private Window</span><small>×</small></div>
            <div className="window-body"><aside><img className="mini-logo" src="/private-window-mark.svg" alt="" /><i></i><i></i><i></i><i></i><div></div><i></i></aside><div className="fake-content"><p>Good morning</p><h3>Your private workspace</h3><div className="fake-panel"><span className="pulse"></span><div><b>Privacy Active</b><small>Protected from capture</small></div><strong>•••</strong></div><div className="fake-lines"><i></i><i></i><i></i></div></div></div>
          </div>
          <div className="float-card card-one"><span>◈</span><div><small>SCREEN SHARING</small><b>Protected</b></div><i></i></div>
          <div className="float-card card-two"><span>≋</span><div><small>LIVE TRANSCRIPT</small><b>Listening…</b></div></div>
        </div>
      </section>

      <section id="compatibility" className="section compatibility-section"><div className="container">
        <div className="compatibility-heading reveal">
          <div><p className="eyebrow">MEETING &amp; CAPTURE COMPATIBILITY</p><h2>Works with the calls<br />you already <em>join.</em></h2></div>
          <p>Private Window uses a Windows protection API, so you do not install a meeting add-on. Protection applies when the meeting or recording app uses a supported Windows capture path.</p>
        </div>
        <div className="platform-grid">
          {compatibility.map((platform) => <article className="platform-card reveal" key={platform.name}><span className="platform-logo"><img src={platform.logo} alt="" /></span><div><h3>{platform.name}</h3><span className="compatibility-status supported"><i></i>Supported</span></div></article>)}
        </div>
        <div className="requirements-panel reveal">
          <div><span>WINDOWS</span><strong>Windows 10 version 2004 or newer</strong><small>Windows 11 supported · x64 installer</small></div>
          <div><span>SHARING MODE</span><strong>Desktop or supported window capture</strong><small>Behavior depends on the capture engine selected by the calling app.</small></div>
          <div><span>IMPORTANT</span><strong>Not a universal recording blocker</strong><small>Hardware capture, cameras, remote-control tools, and unsupported APIs may still see the window.</small></div>
        </div>
        <p className="compatibility-note reveal"><b>Before your first important meeting:</b> run a quick test share with the calling app you plan to use and confirm that Private Window is hidden from the other participant’s view.</p>
      </div></section>

      <section id="how-it-works" className="section steps-section container">
        <div className="section-heading reveal"><p className="eyebrow">HOW IT WORKS</p><h2>Privacy that fits<br />into your <em>flow.</em></h2></div>
        <div className="steps">{steps.map(([number, title, text], index) => <article className="step reveal" style={{ transitionDelay: `${index * 120}ms` }} key={number}><span className="step-number">{number}</span><div className="step-line"></div><h3>{title}</h3><p>{text}</p><span className="step-arrow">↘</span></article>)}</div>
      </section>

      <section className="comparison-section"><div className="container">
        <div className="comparison-heading reveal"><div><p className="eyebrow">SEE THE DIFFERENCE</p><h2>Private for you.<br /><em>Clear for everyone else.</em></h2></div><p>Private Window stays fully usable on your screen. With protection on, supported screen-sharing tools capture the desktop behind it instead of your private workspace.</p></div>
        <div className="comparison-grid">
          <figure className="comparison-card reveal"><figcaption><span className="card-label you-label">YOUR VIEW · SAME MEETING</span><h3>You see Private Window</h3><p>Your embedded app, controls, and live transcript remain visible and usable.</p></figcaption><div className="comparison-image"><img src="/screenshots/comparison-your-view.png" alt="Your view of a Google Meet call with Private Window visible over the meeting" /><span className="image-badge">VISIBLE TO YOU</span></div></figure>
          <figure className="comparison-card audience-card reveal"><figcaption><span className="card-label audience-label">OTHERS’ VIEW · SAME MEETING</span><h3>Others do not see Private Window</h3><p>The same meeting remains visible while the protected workspace is excluded.</p></figcaption><div className="comparison-image"><img src="/screenshots/comparison-others-view.png" alt="Other participant's view of the same Google Meet call without Private Window visible" /><span className="image-badge audience-badge">PRIVATE WINDOW EXCLUDED</span></div></figure>
        </div>
        <p className="comparison-note reveal">Uses Windows display affinity. Compatibility depends on the capture method and Windows version; it is not a guarantee against every recording method.</p>
      </div></section>

      <section id="features" className="section feature-section"><div className="container feature-layout">
        <div className="feature-visual reveal"><div className="image-frame"><img src="/screenshots/private-window-latest.png" alt="Latest Private Window interface hosting an application beside live transcription" /><div className="image-glow"></div></div><div className="caption-card"><span className="caption-icon">◈</span><div><small>ONE WINDOW. MORE CONTROL.</small><b>Keep your app and live transcript together.</b></div></div></div>
        <div className="feature-copy reveal"><p className="eyebrow">A QUIETER WAY TO WORK</p><h2>Everything you need.<br /><em>Nothing you don't.</em></h2><p className="section-copy">Private Window creates a calm, controlled layer around the Windows apps you already use—without changing the app itself.</p><div className="feature-list">{features.map((feature) => <div className="feature-item" key={feature.title}><span>{feature.icon}</span><div><h3>{feature.title}</h3><p>{feature.text}</p></div></div>)}</div></div>
      </div></section>

      <section id="live-captions" className="section captions-section"><div className="container captions-layout">
        <div className="captions-copy reveal">
          <p className="eyebrow">LIVE ENGLISH CAPTIONS</p>
          <h2>Hear the call.<br /><em>See the words.</em></h2>
          <p>Private Window can listen to call audio—or your microphone—and turn English speech into text beside the app you are using.</p>
          <div className="caption-points">
            <div><span>01</span><p><b>Free and offline by default</b><small>Local recognition uses whisper.cpp. After the one-time English model download, call audio stays on your computer.</small></p></div>
            <div><span>02</span><p><b>Designed for live conversation</b><small>Dim provisional words update while someone speaks. Finalized text replaces them after a pause.</small></p></div>
            <div><span>03</span><p><b>Safe auto-paste</b><small>Only finalized sentences are pasted into the embedded application—never temporary guesses.</small></p></div>
          </div>
        </div>
        <div className="caption-demo reveal" aria-label="Example of a live transcript becoming final">
          <div className="caption-demo-top"><span><i></i> Listening to call audio</span><small>LOCAL · ENGLISH</small></div>
          <div className="caption-demo-body">
            <p className="caption-final">Do you have any ideas about the Linux kernel?</p>
            <p className="caption-preview">We could begin with the system architec…</p>
          </div>
          <div className="caption-demo-footer"><span>Provisional text</span><b>Final text is ready to paste</b></div>
        </div>
      </div>
      <div className="container caption-options reveal">
        <article><span className="option-tag">BEST FOR MOST PCS</span><h3>Base English</h3><p>The recommended balance of live response and English accuracy on a modern Windows computer.</p></article>
        <article><span className="option-tag">MORE ACCURATE · SLOWER</span><h3>Small English</h3><p>Better recognition on difficult audio, but live updates require a stronger CPU and may arrive later.</p></article>
        <article><span className="option-tag">OPTIONAL</span><h3>Hosted recognition</h3><p>Use a compatible speech service when accuracy matters more than offline privacy. Audio is sent to that provider.</p></article>
      </div>
      <p className="container captions-note">Caption speed and accuracy depend on microphone quality, call audio, accent, background noise and computer performance. Recognition may make mistakes.</p>
      </section>

      <section id="privacy" className="section privacy-section container"><div className="privacy-copy reveal"><p className="eyebrow">PRIVATE BY DEFAULT</p><h2>Your work stays<br /><em>your work.</em></h2><p>Private Window is designed so your private workspace stays on your display instead of automatically becoming part of a screen share.</p><a href="#download" className="text-link">Learn about privacy <span>→</span></a></div><div className="privacy-card reveal"><div className="shield"><img src="/private-window-mark.svg" alt="" /></div><div className="privacy-content"><div><span className="live-dot"></span> Protection active</div><h3>Visible to you.<br />Excluded from supported capture.</h3><p>Windows display affinity is applied to the Private Window workspace and its dialogs while protection is enabled.</p></div><div className="privacy-grid"><span>YOUR SCREEN</span><span>SUPPORTED CAPTURE</span><b>VISIBLE</b><b className="muted-cell">EXCLUDED</b></div></div></section>

      <section id="pricing" className="section pricing-section"><div className="container">
        <div className="section-heading pricing-heading reveal"><p className="eyebrow">SIMPLE LICENSING</p><h2>Start free.<br /><em>Keep your key.</em></h2><p>Sign in once to receive and manage a key that belongs only to your account.</p></div>
        <div className="pricing-grid">
          <article className="price-card reveal"><span className="price-tag">FREE ACCESS</span><h3>Free key</h3><div className="price">₹0</div><p>Available while the launch promotion is active.</p><ul><li>One account-owned key</li><li>One Windows device</li><li>Managed from your dashboard</li></ul><button className="button button-primary" onClick={getFreeKey}>{accountSession ? 'Get free key' : 'Log in to get a key'}</button></article>
          {pricingPlans.map((plan) => <article className="price-card reveal" key={plan.id}><span className="price-tag">{plan.tag}</span><h3>{plan.name}</h3><div className="price">{plan.price}</div><p>Pay offline for now; the key is assigned to your signed-in account.</p><ul>{plan.details.map((detail) => <li key={detail}>{detail}</li>)}</ul><button className="button button-primary" onClick={() => contactForPlan(plan)}>{accountSession ? 'Contact to purchase' : 'Log in to purchase'}</button></article>)}
        </div>
      </div></section>

      <section id="support" className="section support-section"><div className="container support-inner reveal">
        <div className="support-mark" aria-hidden="true">@</div>
        <div className="support-copy"><p className="eyebrow">TALK TO US</p><h2>Found an issue?<br /><em>Have an enhancement in mind?</em></h2><p>Tell us what happened, what you expected, or what would make Private Window better for you. Feedback from real usage helps shape future improvements.</p></div>
        <a className="support-email" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Private Window feedback')}`}><span>WRITE TO US</span><strong>{SUPPORT_EMAIL}</strong><small>Issues · Suggestions · Enhancement requests</small></a>
      </div></section>

      <section id="download" className="section download-section"><div className="download-glow"></div><div className="container download-inner reveal"><p className="eyebrow">READY WHEN YOU ARE</p><h2>A little more privacy<br />goes a <em>long way.</em></h2><p>Get Private Window for Windows and make room for focused, private work.</p><a className="button button-light" href={installerUrl} onClick={handleDownload}>Download installer <span>↓</span></a><small>Version 1.0 · Windows 10 (2004+) · 64-bit</small></div></section>
    </main>

    <footer><div className="container footer-main"><Logo /><p>Private work deserves a private space.</p><div><a href="#privacy">Privacy</a><a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Private Window support')}`}>Support</a><a href="#top">Release notes</a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Private Window</span><span>Made for Windows</span></div></footer>
    {modalOpen && <DownloadModal close={() => setModalOpen(false)} />}
    {licenseCenterOpen && <LicenseCenter close={() => setLicenseCenterOpen(false)} />}
  </div>
}
