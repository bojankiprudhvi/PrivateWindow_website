import { useEffect, useState } from 'react'

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

const DEFAULT_INSTALLER = import.meta.env.VITE_INSTALLER_URL || '/downloads/PrivateWindow-1.0-windows-x64-Setup.exe'

function Logo() {
  return <a className="logo" href="#top" aria-label="Private Window home"><span className="logo-mark">◇</span><span>private<span>window</span></span></a>
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
  const [theme, setTheme] = useState(() => localStorage.getItem('privacy-screen-theme') || 'dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [installerUrl, setInstallerUrl] = useState(DEFAULT_INSTALLER)

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
    localStorage.setItem('privacy-screen-theme', theme)
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

  return <div id="top" className="site-shell">
    <header className="nav-wrap">
      <nav className="nav container" aria-label="Main navigation">
        <Logo />
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a><a href="#features" onClick={closeMenu}>Features</a><a href="#privacy" onClick={closeMenu}>Privacy</a>
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
            <div className="window-body"><aside><span className="mini-logo">◇</span><i></i><i></i><i></i><i></i><div></div><i></i></aside><div className="fake-content"><p>Good morning</p><h3>Your private workspace</h3><div className="fake-panel"><span className="pulse"></span><div><b>Privacy Active</b><small>Protected from capture</small></div><strong>•••</strong></div><div className="fake-lines"><i></i><i></i><i></i></div></div></div>
          </div>
          <div className="float-card card-one"><span>◈</span><div><small>SCREEN SHARING</small><b>Protected</b></div><i></i></div>
          <div className="float-card card-two"><span>≋</span><div><small>LIVE TRANSCRIPT</small><b>Listening…</b></div></div>
        </div>
      </section>

      <section className="trust-bar"><div className="container"><p>BUILT FOR PRIVATE WORK, CONVERSATIONS &amp; FOCUS</p><div><span>⌁</span><span>◌</span><span>△</span><span>◈</span><span>□</span></div></div></section>

      <section id="how-it-works" className="section steps-section container">
        <div className="section-heading reveal"><p className="eyebrow">HOW IT WORKS</p><h2>Privacy that fits<br />into your <em>flow.</em></h2></div>
        <div className="steps">{steps.map(([number, title, text], index) => <article className="step reveal" style={{ transitionDelay: `${index * 120}ms` }} key={number}><span className="step-number">{number}</span><div className="step-line"></div><h3>{title}</h3><p>{text}</p><span className="step-arrow">↘</span></article>)}</div>
      </section>

      <section className="comparison-section"><div className="container">
        <div className="comparison-heading reveal"><div><p className="eyebrow">SEE THE DIFFERENCE</p><h2>Private for you.<br /><em>Clear for everyone else.</em></h2></div><p>Private Window stays fully usable on your screen. With protection on, supported screen-sharing tools capture the desktop behind it instead of your private workspace.</p></div>
        <div className="comparison-grid">
          <figure className="comparison-card reveal"><figcaption><span className="card-label you-label">ON YOUR SCREEN</span><h3>You see your Private Window</h3><p>Your embedded app, controls, and transcript remain visible and usable.</p></figcaption><div className="comparison-image"><img src="/screenshots/11_application_attached.png" alt="Private Window workspace visible to its user" /><span className="image-badge">VISIBLE TO YOU</span></div></figure>
          <figure className="comparison-card audience-card reveal"><figcaption><span className="card-label audience-label">IN A SUPPORTED SCREEN SHARE</span><h3>Your audience sees the desktop behind it</h3><p>The Private Window workspace is excluded while protection is active.</p></figcaption><div className="comparison-image"><img src="/screenshots/Opposite_person_view_10.png" alt="Screen share view with Private Window excluded from capture" /><span className="image-badge audience-badge">EXCLUDED FROM CAPTURE</span></div></figure>
        </div>
        <p className="comparison-note reveal">Uses Windows display affinity. Compatibility depends on the capture method and Windows version; it is not a guarantee against every recording method.</p>
      </div></section>

      <section id="features" className="section feature-section"><div className="container feature-layout">
        <div className="feature-visual reveal"><div className="image-frame"><img src="/screenshots/11_application_attached.png" alt="Private Window hosting an application" /><div className="image-glow"></div></div><div className="caption-card"><span className="caption-icon">◈</span><div><small>ONE WINDOW. MORE CONTROL.</small><b>Keep your workspace where you need it.</b></div></div></div>
        <div className="feature-copy reveal"><p className="eyebrow">A QUIETER WAY TO WORK</p><h2>Everything you need.<br /><em>Nothing you don't.</em></h2><p className="section-copy">Private Window creates a calm, controlled layer around the Windows apps you already use—without changing the app itself.</p><div className="feature-list">{features.map((feature) => <div className="feature-item" key={feature.title}><span>{feature.icon}</span><div><h3>{feature.title}</h3><p>{feature.text}</p></div></div>)}</div></div>
      </div></section>

      <section id="privacy" className="section privacy-section container"><div className="privacy-copy reveal"><p className="eyebrow">PRIVATE BY DEFAULT</p><h2>Your work stays<br /><em>your work.</em></h2><p>Private Window is designed so your private workspace stays on your display instead of automatically becoming part of a screen share.</p><a href="#download" className="text-link">Learn about privacy <span>→</span></a></div><div className="privacy-card reveal"><div className="shield">◇</div><div className="privacy-content"><div><span className="live-dot"></span> Protection active</div><h3>Visible to you.<br />Excluded from supported capture.</h3><p>Windows display affinity is applied to the Private Window workspace and its dialogs while protection is enabled.</p></div><div className="privacy-grid"><span>YOUR SCREEN</span><span>SUPPORTED CAPTURE</span><b>VISIBLE</b><b className="muted-cell">EXCLUDED</b></div></div></section>

      <section id="download" className="section download-section"><div className="download-glow"></div><div className="container download-inner reveal"><p className="eyebrow">READY WHEN YOU ARE</p><h2>A little more privacy<br />goes a <em>long way.</em></h2><p>Get Private Window for Windows and make room for focused, private work.</p><a className="button button-light" href={installerUrl} onClick={handleDownload}>Download installer <span>↓</span></a><small>Version 1.0 · Windows 10 (2004+) · 64-bit</small></div></section>
    </main>

    <footer><div className="container footer-main"><Logo /><p>Private work deserves a private space.</p><div><a href="#privacy">Privacy</a><a href="#top">Support</a><a href="#top">Release notes</a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Private Window</span><span>Made for Windows</span></div></footer>
    {modalOpen && <DownloadModal close={() => setModalOpen(false)} />}
  </div>
}
