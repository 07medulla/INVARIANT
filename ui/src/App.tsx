import { useEffect, useMemo, useState } from 'react'
import './App.css'

const WORKER_URL = 'https://invariant-worker.proqruit.workers.dev'

type Endpoint = 'pipeline' | 'fluidintel' | 'envelope'
type RoleKey = 'CANDIDATE' | 'CLIENT' | 'RECRUITER' | 'FOUNDER' | 'ADMIN'

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
  // placeholder codes – swap with secrets in production
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
    description: 'Friendly intake lane with confidence-building tone.',
    requiresCode: false,
    composerHint: 'Share what you need help with (role, status update, scheduling question, etc.)',
    humorLine: 'Let’s keep it professional, but I still see you.',
    permissions: { showPayload: false, viewActivity: false }
  },
  CLIENT: {
    label: 'Client Executive',
    description: 'Business-class tone. KPI snapshots only.',
    requiresCode: true,
    code: 'CLIENT-7320',
    composerHint: 'State engagement goals, talent gaps, or KPI questions.',
    humorLine: 'Authentication denied. Please consult your assistant before trying secret handshakes.',
    permissions: { showPayload: true, viewActivity: true }
  },
  RECRUITER: {
    label: 'Recruiter',
    description: 'Execution-only lane using the ProQruit training canon.',
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

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
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

type ActivityEntry = {
  id: string
  endpoint: Endpoint
  status: 'success' | 'error'
  timestamp: string
  summary: string
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
    } catch (err) {
      console.warn('Unable to parse access profile', err)
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
    () => storedPayload ?? JSON.stringify(templateFor('pipeline', storedRole), null, 2)
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
      setAuthMessage('Visitor lane stays open. Responses stay high-trust, low-noise.')
    } else {
      setIsVerified(false)
      setSecurityCode('')
      setAuthMessage('Enter your tier security code to unlock XIRO controls.')
    }
  }, [role])

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
      setAuthMessage('Candidate lane unlocked. Feel free to interact.')
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
    if (!isVerified) {
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">XIRO_UI · ProQruit Neural Console</p>
          <h1>XIRO conversational field kit</h1>
          <p className="muted">Role-specific panes keep conversations inside the correct trust boundary.</p>
        </div>
        <div className="status-pill" data-state={status}>
          <span className="dot" />
          <span className="label">
            {status === 'idle' && 'Idle'}
            {status === 'loading' && 'Dispatching'}
            {status === 'success' && 'Signal returned'}
            {status === 'error' && 'Error'}
          </span>
        </div>
      </header>

      <section className="panels-grid">
        <div className="panel access">
          <h2>Identity & pathway</h2>
          <div className="form-control">
            <label htmlFor="role-select">Persona</label>
            <select
              id="role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as RoleKey)}
            >
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
          <h2>Conversation composer</h2>
          <p className="muted">{roleProfile.composerHint}</p>
          <div className="composer">
            <textarea value={composerText} onChange={(e) => setComposerText(e.target.value)} />
            {showPayloadEditor && (
              <button onClick={syncComposer}>Sync into payload</button>
            )}
          </div>

          {showPayloadEditor ? (
            <>
              <label className="payload-label">Canonical payload</label>
              <textarea className="payload-editor" value={payload} onChange={(e) => setPayload(e.target.value)} />
            </>
          ) : (
            <p className="muted">Payload editor hidden for this persona. XIRO will wrap your text in a compliant envelope automatically.</p>
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
          {showActivity && (
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
          )}
          {!showActivity && <p className="muted">Activity log hidden for public/candidate lanes.</p>}
        </div>
      </section>
    </div>
  )
}

export default App
