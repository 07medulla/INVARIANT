import { useEffect, useMemo, useState } from 'react'
import './App.css'

const WORKER_URL = 'https://invariant-worker.proqruit.workers.dev'

const EXTERNAL_ROLES = ['CANDIDATE', 'CLIENT'] as const
const SECURE_ROLES = ['RECRUITER', 'FOUNDER', 'ADMIN'] as const

type Endpoint = 'pipeline' | 'fluidintel' | 'envelope'
type RoleKey = typeof EXTERNAL_ROLES[number] | typeof SECURE_ROLES[number]

type AccessProfile = {
  employeeCode: string
  password: string
  accessTier: 'OBSERVE' | 'EXECUTE' | 'ADMIN'
  authToken: string
}

type RoleProfile = {
  label: string
  description: string
  requiresCode: boolean
  code?: string
  composerHint: string
  humorLine: string
  permissions: {
    showPayload: boolean
    viewActivity: boolean
  }
}

const roleMatrix: Record<RoleKey, RoleProfile> = {
  CANDIDATE: {
    label: 'Candidate / Visitor',
    description: 'Confidence-inducing lane focused on interviews, schedules, and reassurance.',
    requiresCode: false,
    composerHint: 'Share your role, interview details, or scheduling questions.',
    humorLine: 'Let’s keep it professional, but I still see you.',
    permissions: { showPayload: false, viewActivity: false }
  },
  CLIENT: {
    label: 'Client Executive',
    description: 'Business-class tone. KPI summaries and delivery checkpoints only.',
    requiresCode: true,
    code: 'CLIENT-7320',
    composerHint: 'State engagement goals, talent gaps, or KPI questions.',
    humorLine: 'Authentication denied. Please consult your assistant before trying secret handshakes.',
    permissions: { showPayload: true, viewActivity: true }
  },
  RECRUITER: {
    label: 'Recruiter',
    description: 'Executes playbooks from the ProQruit recruiter canon.',
    requiresCode: true,
    code: 'RECRUIT-8827',
    composerHint: 'Log candidate progress, interview prep, or escalation details.',
    humorLine: 'Still no dice. Maybe review the recruiter training deck before another guess?',
    permissions: { showPayload: true, viewActivity: true }
  },
  FOUNDER: {
    label: 'Founder / Leadership',
    description: 'Full KPIs, Null Prime overlays, ops toggles.',
    requiresCode: true,
    code: 'FOUNDER-1113',
    composerHint: 'Issue directives, ask for ACE/FLUIDINTEL status, or trigger reports.',
    humorLine: 'Wrong code. I only open for the actual founders, not weekend tourists.',
    permissions: { showPayload: true, viewActivity: true }
  },
  ADMIN: {
    label: 'XIRO Admin (Medulla)',
    description: 'Uncapped access. Canonical envelope editor visible.',
    requiresCode: true,
    code: 'META-0000',
    composerHint: 'Inject system instructions or full envelope mutations.',
    humorLine: 'I appreciate the hustle, but admin runway is invite-only. Email joseph@proqruit.com.',
    permissions: { showPayload: true, viewActivity: true }
  }
}

const accessStorageKey = 'invariant-access-profile'
const baseUrlStorageKey = 'invariant-worker-url'
const payloadStorageKey = 'invariant-payload-draft'
const roleStorageKey = 'invariant-active-role'
const publicCountKey = 'invariant-public-count'

type ActivityEntry = {
  id: string
  endpoint: Endpoint
  status: 'success' | 'error'
  timestamp: string
  summary: string
}

type ChatMessage = {
  sender: 'XIRO' | 'YOU'
  text: string
}

const detectRole = (text: string): RoleKey | null => {
  const lower = text.toLowerCase()
  if (/(medulla|admin|system)/.test(lower)) return 'ADMIN'
  if (/(founder|lead|owner)/.test(lower)) return 'FOUNDER'
  if (/(recruiter|talent partner)/.test(lower)) return 'RECRUITER'
  if (/(client|customer|hiring manager)/.test(lower)) return 'CLIENT'
  if (/(candidate|applicant|job)/.test(lower)) return 'CANDIDATE'
  return null
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const templateFor = (endpoint: Endpoint, issuedBy: string) => {
  const now = new Date().toISOString()
  return {
    schema_checksum: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    meta: {
      message_id: generateUUID(),
      timestamp: now,
      session_id: 'field-session',
      origin: 'XIRO_UI',
      target: endpoint === 'pipeline' ? 'ACE' : endpoint === 'fluidintel' ? 'FLUIDINTEL' : 'INVARIANT',
      mode: 'TEXT',
      authority: 'SOURCE_PATTERN',
      geometry_version: 'XISM-1.0'
    },
    context: {
      trigger_reason: 'manual-ui-input',
      decision_window: {
        exists: true,
        deadline: new Date(Date.now() + 3600 * 1000).toISOString(),
        risk_class: 'LOW'
      },
      constraints: {
        budget: 0,
        time_horizon_days: 1,
        domain: 'GENERAL',
        non_negotiables: []
      }
    },
    query: {
      query_id: `query-${endpoint}-${Date.now()}`,
      issued_by: issuedBy,
      query_type: 'ASK',
      prompt: 'Describe the current operational status.',
      assumptions: []
    },
    response: {
      responding_substrate: 'XIRO_UI',
      response_type: 'TEXT',
      content: 'Awaiting XIRO response',
      confidence: 0.5,
      limitations: []
    },
    gates: {
      claim_detected: false,
      truth_required: false,
      cic_pass: true,
      execution_authorized: endpoint !== 'pipeline',
      truth_verified: false
    },
    state_update: {
      system_state: 'READY',
      next_valid_actions: [],
      silence_valid: false
    },
    claimSpec: {
      claim: 'Operator provided statement',
      authority: issuedBy,
      intent: 'diagnostic',
      risk_class: 'LOW'
    }
  }
}

function App() {
  const storedAccess = useMemo<AccessProfile>(() => {
    try {
      const raw = localStorage.getItem(accessStorageKey)
      if (!raw) return { employeeCode: '', password: '', accessTier: 'OBSERVE', authToken: '' }
      const parsed = JSON.parse(raw)
      return {
        employeeCode: parsed.employeeCode ?? '',
        password: parsed.password ?? '',
        accessTier: parsed.accessTier ?? 'OBSERVE',
        authToken: parsed.authToken ?? ''
      }
    } catch {
      return { employeeCode: '', password: '', accessTier: 'OBSERVE', authToken: '' }
    }
  }, [])

  const storedBaseUrl = useMemo(() => localStorage.getItem(baseUrlStorageKey) ?? WORKER_URL, [])
  const storedPayload = useMemo(() => localStorage.getItem(payloadStorageKey), [])
  const storedRole = useMemo<RoleKey>(() => {
    const raw = localStorage.getItem(roleStorageKey)
    if (!raw) return 'CANDIDATE'
    if (['CANDIDATE', 'CLIENT', 'RECRUITER', 'FOUNDER', 'ADMIN'].includes(raw)) return raw as RoleKey
    return 'CANDIDATE'
  }, [])
  const storedCount = useMemo(() => {
    const raw = localStorage.getItem(publicCountKey)
    return raw ? Number(raw) : 0
  }, [])

  const [baseUrl, setBaseUrl] = useState(storedBaseUrl)
  const [endpoint, setEndpoint] = useState<Endpoint>('pipeline')
  const [role, setRole] = useState<RoleKey>(storedRole)
  const [payload, setPayload] = useState(
    () => storedPayload ?? JSON.stringify(templateFor('pipeline', roleMatrix[storedRole].label), null, 2)
  )
  const [composerText, setComposerText] = useState(roleMatrix[storedRole].composerHint)
  const [authToken, setAuthToken] = useState(storedAccess.authToken)
  const [employeeCode, setEmployeeCode] = useState(storedAccess.employeeCode)
  const [password, setPassword] = useState(storedAccess.password)
  const [accessTier, setAccessTier] = useState<AccessProfile['accessTier']>(storedAccess.accessTier)
  const [rememberAccess, setRememberAccess] = useState(true)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [responseText, setResponseText] = useState('')
  const [errorText, setErrorText] = useState('')
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [securityCode, setSecurityCode] = useState('')
  const [isVerified, setIsVerified] = useState(role === 'CANDIDATE')
  const [attempts, setAttempts] = useState(0)
  const [authMessage, setAuthMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: 'XIRO', text: 'Hey. Who is here?' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [publicCount, setPublicCount] = useState(storedCount)
  const [chatLocked, setChatLocked] = useState(false)
  const [showConsole, setShowConsole] = useState(false)

  const isFounder = role === 'FOUNDER'
  const isAdmin = role === 'ADMIN'
  const isRecruiter = role === 'RECRUITER'
  const internalUnlocked = isVerified && (isFounder || isAdmin || isRecruiter)

  useEffect(() => {
    localStorage.setItem(baseUrlStorageKey, baseUrl)
  }, [baseUrl])

  useEffect(() => {
    localStorage.setItem(payloadStorageKey, payload)
  }, [payload])

  useEffect(() => {
    if (!rememberAccess) {
      localStorage.removeItem(accessStorageKey)
      return
    }
    const data: AccessProfile = { authToken, employeeCode, password, accessTier }
    localStorage.setItem(accessStorageKey, JSON.stringify(data))
  }, [authToken, employeeCode, password, accessTier, rememberAccess])

  useEffect(() => {
    localStorage.setItem(roleStorageKey, role)
    const template = templateFor(endpoint, roleMatrix[role].label)
    setPayload(JSON.stringify(template, null, 2))
    setComposerText(roleMatrix[role].composerHint)
    if (role === 'CANDIDATE') {
      setIsVerified(true)
      setAuthMessage('External mode active. Conversations stay recruitment-only.')
    } else {
      setIsVerified(false)
      setSecurityCode('')
      setAuthMessage('Enter your tier security code to unlock XIRO controls.')
      setShowConsole(true)
    }
  }, [role])

  useEffect(() => {
    localStorage.setItem(publicCountKey, publicCount.toString())
  }, [publicCount])

  const loadTemplate = (target: Endpoint) => {
    setEndpoint(target)
    setPayload(JSON.stringify(templateFor(target, roleMatrix[role].label), null, 2))
    setStatus('idle')
    setResponseText('')
  }

  const syncComposer = () => {
    try {
      const json = JSON.parse(payload)
      json.query = json.query ?? {}
      json.query.prompt = composerText
      json.meta = json.meta ?? {}
      json.meta.message_id = generateUUID()
      json.meta.timestamp = new Date().toISOString()
      setPayload(JSON.stringify(json, null, 2))
    } catch (err) {
      setStatus('error')
      setErrorText(`Unable to sync composer: ${(err as Error).message}`)
    }
  }

  const verifySecurityCode = () => {
    if (!roleMatrix[role].requiresCode) {
      setIsVerified(true)
      setAuthMessage('Visitor lane unlocked. Feel free to interact.')
      return
    }
    if (securityCode.trim() === roleMatrix[role].code) {
      setIsVerified(true)
      setAttempts(0)
      setAuthMessage('Access confirmed. XIRO is now operating at your tier.')
      return
    }
    const newAttempts = attempts + 1
    setAttempts(newAttempts)
    setIsVerified(false)
    if (newAttempts >= 3) {
      setAuthMessage('Still incorrect. Please email connect@proqruit.com so we can reissue your code.')
    } else {
      setAuthMessage(roleMatrix[role].humorLine)
    }
  }

  const sendPayload = async () => {
    if (!isVerified && roleMatrix[role].requiresCode) {
      setStatus('error')
      setErrorText('Authorization required before XIRO can transmit envelopes.')
      return
    }
    setStatus('loading')
    setErrorText('')
    setResponseText('')
    let parsed
    try {
      parsed = JSON.parse(payload)
    } catch (err) {
      setStatus('error')
      setErrorText(`Payload is not valid JSON: ${(err as Error).message}`)
      return
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    if (employeeCode) headers['X-Employee-Code'] = employeeCode
    if (password) headers['X-User-Password'] = password
    headers['X-Access-Tier'] = accessTier

    const url = `${baseUrl.replace(/\/$/, '')}/${endpoint}`
    const activityId = generateUUID()

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(parsed)
      })
      const text = await res.text()
      const display = (() => {
        try {
          return JSON.stringify(JSON.parse(text), null, 2)
        } catch {
          return text
        }
      })()
      setResponseText(display)
      if (!res.ok) {
        setStatus('error')
        setErrorText(`HTTP ${res.status}: ${res.statusText}`)
        setActivity((prev) => [
          { id: activityId, endpoint, status: 'error', timestamp: new Date().toISOString(), summary: `HTTP ${res.status}` },
          ...prev
        ])
      } else {
        setStatus('success')
        setActivity((prev) => [
          { id: activityId, endpoint, status: 'success', timestamp: new Date().toISOString(), summary: parsed.query?.prompt ?? 'Sent envelope' },
          ...prev
        ])
      }
    } catch (err) {
      setStatus('error')
      setErrorText((err as Error).message)
      setActivity((prev) => [
        { id: activityId, endpoint, status: 'error', timestamp: new Date().toISOString(), summary: (err as Error).message },
        ...prev
      ])
    }
  }

  const wittyPrompt = () => {
    const quips = [
      'Still waiting on the magic word: candidate, client, recruiter, founder, or admin.',
      'I run on keywords, not vibes. Say candidate, client, recruiter, founder, or admin.',
      'Without the role keyword I stay in public mode forever.',
      'Candidate, client, recruiter, founder, admin. Pick one and we move.',
      'I’m stainless, not psychic. Drop the role keyword so I know who you are.'
    ]
    return quips[Math.floor(Math.random() * quips.length)]
  }

  const handleChatSend = () => {
    if (!chatInput.trim() || chatLocked) return
    const text = chatInput.trim()
    setChatHistory((prev) => [...prev, { sender: 'YOU', text }])
    setChatInput('')

    const detected = detectRole(text)
    const resultingRole = detected ?? role

    if (detected) {
      if (detected !== role) {
        setRole(detected)
        setChatHistory((prev) => [
          ...prev,
          { sender: 'XIRO', text: `Alright ${roleMatrix[detected].label}. Present your keys if you have them.` }
        ])
      }
    } else {
      setChatHistory((prev) => [...prev, { sender: 'XIRO', text: wittyPrompt() }])
    }

    if (!detected && EXTERNAL_ROLES.includes(resultingRole)) {
      const newCount = publicCount + 1
      setPublicCount(newCount)
      if (newCount >= 3) {
        setChatLocked(true)
        setChatHistory((prev) => [
          ...prev,
          { sender: 'XIRO', text: 'For extended support please email connect@proqruit.com. This lane stays limited to three queries.' }
        ])
      }
    }
  }

  const roleProfile = roleMatrix[role]
  const showPayloadEditor = roleProfile.permissions.showPayload
  const showActivity = roleProfile.permissions.viewActivity
  const founderBusinessCards = [
    {
      title: 'Candidate falloff',
      detail: '12% WoW drop · strongest cities: BLR, HYD, Pune',
      cta: 'View funnel'
    },
    {
      title: 'Schedules today',
      detail: '31 interviews confirmed · 6 awaiting feedback',
      cta: 'Open calendar'
    },
    {
      title: 'Client spotlight',
      detail: 'ReQruit Logistics · 14 roles active · 3 offers pending',
      cta: 'See client deck'
    },
    {
      title: 'Recruiter pulse',
      detail: 'Top performer: Team North · 9 closures this week',
      cta: 'View leaderboard'
    }
  ]

  const adminSystemCards = [
    {
      title: 'Null Prime checksum',
      detail: 'All prisms synced · variance < 0.01%',
      cta: 'See digest'
    },
    {
      title: 'Metacore delta',
      detail: '5 new recruiter actions · 2 deferred · 0 escalations',
      cta: 'Inspect log'
    },
    {
      title: 'Recent directives',
      detail: 'Envelope patches pushed · FLUIDINTEL idle · CIC clear',
      cta: 'See directives'
    }
  ]

  const recruiterOpsCards = [
    {
      title: 'Pipeline',
      detail: '18 candidates in nurture · 7 require follow-up today',
      cta: 'Open board'
    },
    {
      title: 'Interview prep',
      detail: '3 candidates awaiting briefing packs',
      cta: 'Send prep'
    },
    {
      title: 'Compliance',
      detail: 'Background docs pending for 2 offers',
      cta: 'Upload docs'
    }
  ]

  const substrateStatuses = [
    { label: 'ACE Gate', status: 'READY', note: 'No anomalies detected' },
    { label: 'VAR', status: 'VERIFYING', note: '3 envelopes pending' },
    { label: 'FLUIDINTEL', status: 'IDLE', note: 'Awaiting authorized execution' },
    { label: 'NULL PRIME', status: 'STABLE', note: 'Checksum synced' }
  ]

  return (
    <div className={`xiro-shell ${internalUnlocked ? 'internal-unlocked' : ''}`}>
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">XIR</p>
          <div className="hero-title">
            <span>XIR</span>
            <button className="zero-button" onClick={() => setShowConsole((prev) => !prev)}>0</button>
          </div>
          <p className="hero-tagline">recruitment interface</p>
        </div>
      </section>

      <section className="chat-panel">
        <div className="chat-header">
          <h2>Converse with XIRO</h2>
          <p className="muted">Stay inside recruitment context. XIRO routes lanes automatically.</p>
        </div>
        <div className="chat-history">
          {chatHistory.map((msg, index) => (
            <div key={`${msg.sender}-${index}`} className={`chat-bubble ${msg.sender === 'YOU' ? 'you' : 'xiro'}`}>
              <span>{msg.text}</span>
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your message"
            disabled={chatLocked}
          />
          <button onClick={handleChatSend} disabled={chatLocked}>Send</button>
        </div>
        {chatLocked && <p className="muted">Lane locked. Continue via connect@proqruit.com.</p>}
      </section>

      {showConsole && isVerified && isFounder && (
        <section className="summary-grid business-grid fade-in">
          {founderBusinessCards.map((slide) => (
            <article className="summary-card founder-card" key={slide.title}>
              <p className="summary-title">{slide.title}</p>
              <p>{slide.detail}</p>
              <button>{slide.cta}</button>
            </article>
          ))}
        </section>
      )}

      {showConsole && isVerified && isAdmin && (
        <>
          <section className="summary-grid admin-grid fade-in">
            {adminSystemCards.map((slide) => (
              <article className="summary-card admin-card" key={slide.title}>
                <p className="summary-title">{slide.title}</p>
                <p>{slide.detail}</p>
                <button>{slide.cta}</button>
              </article>
            ))}
          </section>
          <section className="substrate-grid fade-in">
            {substrateStatuses.map((item) => (
              <article className="substrate-card" key={item.label}>
                <p className="label">{item.label}</p>
                <p className="status">{item.status}</p>
                <p className="note">{item.note}</p>
              </article>
            ))}
          </section>
        </>
      )}

      {showConsole && isVerified && isRecruiter && (
        <section className="summary-grid recruiter-grid fade-in">
          {recruiterOpsCards.map((slide) => (
            <article className="summary-card recruiter-card" key={slide.title}>
              <p className="summary-title">{slide.title}</p>
              <p>{slide.detail}</p>
              <button>{slide.cta}</button>
            </article>
          ))}
        </section>
      )}

      {showConsole && (
        <section className="panels-grid fade-in">
        <div className="panel access">
          <h2>Access stack</h2>
          <div className="form-control">
            <label htmlFor="role-select">Persona</label>
            <select id="role-select" value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
              {Object.entries(roleMatrix).map(([key, profile]) => (
                <option key={key} value={key}>
                  {profile.label}
                </option>
              ))}
            </select>
          </div>
          <p className="muted">{roleProfile.description}</p>

          <div className="form-control">
            <label htmlFor="base-url">Worker endpoint</label>
            <input id="base-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </div>

          <div className="endpoint-buttons">
            {(['pipeline', 'fluidintel', 'envelope'] as Endpoint[]).map((option) => (
              <button
                key={option}
                className={option === endpoint ? 'endpoint active' : 'endpoint'}
                onClick={() => loadTemplate(option)}
                disabled={!isVerified && roleProfile.requiresCode && option === 'envelope'}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>

          {roleProfile.requiresCode && (
            <div className="form-grid">
              <label>
                Tier security code
                <input
                  type="password"
                  value={securityCode}
                  onChange={(e) => setSecurityCode(e.target.value)}
                  placeholder="Enter access string"
                />
              </label>
              <button className="verify" onClick={verifySecurityCode}>Verify</button>
            </div>
          )}
          <p className="muted">{authMessage}</p>

          <div className="form-grid">
            <label>
              Employee code
              <input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="XR-104" />
            </label>
            <label>
              Access password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Access tier header
              <select value={accessTier} onChange={(e) => setAccessTier(e.target.value as AccessProfile['accessTier'])}>
                <option value="OBSERVE">Observe</option>
                <option value="EXECUTE">Execute</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <label>
              Session token (optional)
              <input value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Bearer token" />
            </label>
          </div>

          <label className="remember">
            <input type="checkbox" checked={rememberAccess} onChange={(e) => setRememberAccess(e.target.checked)} />
            Persist credentials locally (browser storage)
          </label>
        </div>

        <div className="panel payload">
          <h2>Envelope composer</h2>
          <p className="muted">{roleProfile.composerHint}</p>
          <div className="composer">
            <textarea value={composerText} onChange={(e) => setComposerText(e.target.value)} />
            {showPayloadEditor && <button onClick={syncComposer}>Sync into payload</button>}
          </div>

          {showPayloadEditor ? (
            <>
              <label className="payload-label">Canonical payload</label>
              <textarea className="payload-editor" value={payload} onChange={(e) => setPayload(e.target.value)} />
            </>
          ) : (
            <p className="muted">Payload editor hidden for this persona. XIRO will wrap your text automatically.</p>
          )}

          <div className="actions-row">
            <button className="send" onClick={sendPayload} disabled={status === 'loading'}>
              {status === 'loading' ? 'Transmitting…' : 'Send to XIRO'}
            </button>
            <button className="reset" onClick={() => loadTemplate(endpoint)}>Reset template</button>
          </div>
          {errorText && <p className="error-text">{errorText}</p>}
        </div>

        <div className="panel responses">
          <h2>Signal return</h2>
          <pre className="response-window">{responseText || 'Awaiting response…'}</pre>
          {showActivity ? (
            <>
              <h3>Activity</h3>
              <div className="activity-list">
                {activity.length === 0 && <p className="muted">No transmissions yet.</p>}
                {activity.map((item) => (
                  <div key={item.id} className="activity-card" data-status={item.status}>
                    <div>
                      <p className="label">{item.endpoint.toUpperCase()}</p>
                      <p className="summary">{item.summary}</p>
                    </div>
                    <time>{new Date(item.timestamp).toLocaleTimeString()}</time>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Activity log hidden for public/candidate lanes.</p>
          )}
        </div>
      </section>
      )}

      <footer className="meta-footer">
        <p>XIRO · Stainless neural assistant</p>
        <p>About · XIRO is the recruitment cognition prototype inside the INVARIANT system.</p>
        <p>Creator · Medulla · ProQruit Inc.</p>
        <p>
          Contact · <a href="mailto:connect@proqruit.com">connect@proqruit.com</a>
        </p>
      </footer>
    </div>
  )
}

export default App
