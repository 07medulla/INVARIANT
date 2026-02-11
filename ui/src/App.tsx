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
    description: 'Friendly recruitment lane. Conversational only.',
    requiresCode: false,
    composerHint: 'Share context once inside the console.',
    humorLine: 'You are already in the visitor lane.',
    permissions: { showPayload: false, viewActivity: false }
  },
  CLIENT: {
    label: 'Client Executive',
    description: 'Business-class view focused on delivery.',
    requiresCode: true,
    code: 'CLIENT-7320',
    composerHint: 'Pose KPI or delivery actions after authentication.',
    humorLine: 'Authentication denied. Consult your assistant for the proper key.',
    permissions: { showPayload: true, viewActivity: true }
  },
  RECRUITER: {
    label: 'Recruiter',
    description: 'Execution widgets and candidate operations.',
    requiresCode: true,
    code: 'RECRUIT-8827',
    composerHint: 'Log candidate status or prep notes after authentication.',
    humorLine: 'Still wrong. Try the recruiter deck again.',
    permissions: { showPayload: true, viewActivity: true }
  },
  FOUNDER: {
    label: 'Founder / Leadership',
    description: 'Business KPIs and allocator controls.',
    requiresCode: true,
    code: 'FOUNDER-1113',
    composerHint: 'Request KPI deltas or actions once unlocked.',
    humorLine: 'Founders only. Wrong code.',
    permissions: { showPayload: true, viewActivity: true }
  },
  ADMIN: {
    label: 'XIRO Admin (Medulla)',
    description: 'System status and Null Prime summaries.',
    requiresCode: true,
    code: 'META-0000',
    composerHint: 'Inject system directives after verification.',
    humorLine: 'Admin lane stays closed without the correct key. Ping joseph@proqruit.com.',
    permissions: { showPayload: true, viewActivity: true }
  }
}

const accessStorageKey = 'invariant-access-profile'
const baseUrlStorageKey = 'invariant-worker-url'
const payloadStorageKey = 'invariant-payload-draft'
const roleStorageKey = 'invariant-active-role'

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

const founderBusinessCards = [
  { title: 'Candidate falloff', detail: '12% WoW drop · BLR | HYD | Pune strongest', cta: 'View funnel' },
  { title: 'Schedules today', detail: '31 confirmed · 6 awaiting feedback', cta: 'Open calendar' },
  { title: 'Client spotlight', detail: 'ReQruit Logistics · 14 roles · 3 offers pending', cta: 'See client deck' },
  { title: 'Recruiter pulse', detail: 'Top team: North · 9 closures this week', cta: 'View leaderboard' }
]

const adminSystemCards = [
  { title: 'Null Prime checksum', detail: 'All prisms synced · variance < 0.01%', cta: 'See digest' },
  { title: 'Metacore delta', detail: '5 recruiter actions · 2 deferred · 0 escalations', cta: 'Inspect log' },
  { title: 'Recent directives', detail: 'Envelope patches pushed · FLUIDINTEL idle', cta: 'See directives' }
]

const recruiterOpsCards = [
  { title: 'Pipeline', detail: '18 candidates in nurture · 7 require follow-up today', cta: 'Open board' },
  { title: 'Interview prep', detail: '3 candidates awaiting briefing packs', cta: 'Send prep' },
  { title: 'Compliance', detail: 'Background docs pending for 2 offers', cta: 'Upload docs' }
]

const substrateStatuses = [
  { label: 'ACE Gate', status: 'READY', note: 'No anomalies detected' },
  { label: 'VAR', status: 'VERIFYING', note: '3 envelopes pending' },
  { label: 'FLUIDINTEL', status: 'IDLE', note: 'Awaiting authorized execution' },
  { label: 'NULL PRIME', status: 'STABLE', note: 'Checksum synced' }
]

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
  const [authMessage, setAuthMessage] = useState('External mode active. Conversations stay recruitment-only.')
  const [showConsole, setShowConsole] = useState(false)
  const [showLoginOverlay, setShowLoginOverlay] = useState(false)
  const [loginEmployeeId, setLoginEmployeeId] = useState('')
  const [loginSecurityCode, setLoginSecurityCode] = useState('')
  const [publicChat, setPublicChat] = useState<ChatMessage[]>([
    { sender: 'XIRO', text: 'Public XIRO online. Ask about ProQruit, hiring philosophy, or recruitment insights.' }
  ])
  const [publicInput, setPublicInput] = useState('')

  const publicReply = (text: string) => {
    const answers = [
      'ProQruit focuses on precision recruitment across India’s tier 1-4 cities. Tell me what you want to explore.',
      'Recruitment insight: consistent candidate experience + recruiter enablement drives the funnel.',
      'You can learn more about ProQruit at https://proqruit.com/.',
      'I can talk about ProQruit’s mission, talent intelligence, and public-facing updates.',
      'Need hiring context? I synthesize what ProQruit shares publicly.'
    ]
    return answers[Math.floor(Math.random() * answers.length)]
  }

  const handlePublicSend = () => {
    if (!publicInput.trim()) return
    const text = publicInput.trim()
    setPublicChat((prev) => [...prev, { sender: 'YOU', text }])
    setPublicInput('')
    setPublicChat((prev) => [...prev, { sender: 'XIRO', text: publicReply(text) }])
  }

  const openLoginOverlay = () => setShowLoginOverlay(true)
  const closeLoginOverlay = () => setShowLoginOverlay(false)

  const submitLoginOverlay = () => {
    setEmployeeCode(loginEmployeeId)
    setSecurityCode(loginSecurityCode)
    setShowConsole(true)
    setShowLoginOverlay(false)
    setAuthMessage('Select your persona and verify with your tier code.')
  }

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
    }
  }, [role])

  const verifySecurityCode = () => {
    if (!roleMatrix[role].requiresCode) {
      setIsVerified(true)
      setAuthMessage('Visitor lane unlocked.')
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
      setAuthMessage('Still incorrect. Email connect@proqruit.com so we can reissue your code.')
    } else {
      setAuthMessage(roleMatrix[role].humorLine)
    }
  }

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

  const roleProfile = roleMatrix[role]
  const showPayloadEditor = roleProfile.permissions.showPayload
  const showActivity = roleProfile.permissions.viewActivity
  const isFounder = role === 'FOUNDER'
  const isAdmin = role === 'ADMIN'
  const isRecruiter = role === 'RECRUITER'

  return (
    <div className={`xiro-shell ${isVerified && (isFounder || isAdmin || isRecruiter) ? 'internal-unlocked' : ''}`}>
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">XIRO</p>
          <h1>XIRO</h1>
          <p className="hero-tagline">powered by ProQruit</p>
          <div className="public-chat">
            <div className="chat-history">
              {publicChat.map((msg, idx) => (
                <div key={`${msg.sender}-${idx}`} className={`chat-bubble ${msg.sender === 'YOU' ? 'you' : 'xiro'}`}>
                  <span>{msg.text}</span>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                value={publicInput}
                onChange={(e) => setPublicInput(e.target.value)}
                placeholder="Ask XIRO about ProQruit"
              />
              <button onClick={handlePublicSend}>Send</button>
            </div>
          </div>
        </div>
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
        <p>XIRO · recruitment interface</p>
        <p>Creator · Medulla · ProQruit Inc.</p>
        <p>Contact · <a href="mailto:connect@proqruit.com">connect@proqruit.com</a></p>
        {!showConsole && (
          <button className="login-button" onClick={openLoginOverlay}>Login</button>
        )}
      </footer>

      {showLoginOverlay && (
        <div className="login-overlay" role="dialog" aria-modal="true">
          <div className="login-card">
            <h3>Internal login</h3>
            <label>
              Employee ID
              <input value={loginEmployeeId} onChange={(e) => setLoginEmployeeId(e.target.value)} />
            </label>
            <label>
              Security code
              <input type="password" value={loginSecurityCode} onChange={(e) => setLoginSecurityCode(e.target.value)} />
            </label>
            <div className="login-actions">
              <button onClick={submitLoginOverlay}>Enter console</button>
              <button onClick={closeLoginOverlay} className="ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
