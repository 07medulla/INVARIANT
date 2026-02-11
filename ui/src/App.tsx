import { useEffect, useMemo, useState } from 'react'
import './App.css'

const WORKER_URL = 'https://invariant-worker.proqruit.workers.dev'

type Endpoint = 'pipeline' | 'fluidintel' | 'envelope'

type AccessProfile = {
  employeeCode: string
  password: string
  accessTier: 'OBSERVE' | 'EXECUTE' | 'ADMIN'
  authToken: string
}

const accessStorageKey = 'invariant-access-profile'
const baseUrlStorageKey = 'invariant-worker-url'
const payloadStorageKey = 'invariant-payload-draft'

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const templateFor = (endpoint: Endpoint) => {
  const now = new Date().toISOString()
  return {
    schema_checksum: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    meta: {
      message_id: generateUUID(),
      timestamp: now,
      session_id: 'field-session',
      origin: 'FIELD_UI',
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
      issued_by: 'FIELD_OPERATOR',
      query_type: 'ASK',
      prompt: 'Describe the current operational status.',
      assumptions: []
    },
    response: {
      responding_substrate: 'FIELD_UI',
      response_type: 'TEXT',
      content: 'Awaiting invariant response',
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
      authority: 'FIELD_OPERATOR',
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
      if (!raw) return {
        employeeCode: '',
        password: '',
        accessTier: 'OBSERVE',
        authToken: ''
      }
      const parsed = JSON.parse(raw)
      return {
        employeeCode: parsed.employeeCode ?? '',
        password: parsed.password ?? '',
        accessTier: parsed.accessTier ?? 'OBSERVE',
        authToken: parsed.authToken ?? ''
      }
    } catch (err) {
      console.warn('Unable to parse access profile', err)
      return {
        employeeCode: '',
        password: '',
        accessTier: 'OBSERVE',
        authToken: ''
      }
    }
  }, [])

  const storedBaseUrl = useMemo(() => localStorage.getItem(baseUrlStorageKey) ?? WORKER_URL, [])
  const storedPayload = useMemo(() => localStorage.getItem(payloadStorageKey), [])

  const [baseUrl, setBaseUrl] = useState(storedBaseUrl)
  const [endpoint, setEndpoint] = useState<Endpoint>('pipeline')
  const [payload, setPayload] = useState(() => storedPayload ?? JSON.stringify(templateFor('pipeline'), null, 2))
  const [composerText, setComposerText] = useState('Describe the operational curvature inputs...')
  const [authToken, setAuthToken] = useState(storedAccess.authToken)
  const [employeeCode, setEmployeeCode] = useState(storedAccess.employeeCode)
  const [password, setPassword] = useState(storedAccess.password)
  const [accessTier, setAccessTier] = useState<AccessProfile['accessTier']>(storedAccess.accessTier)
  const [rememberAccess, setRememberAccess] = useState(true)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [responseText, setResponseText] = useState('')
  const [errorText, setErrorText] = useState('')
  const [activity, setActivity] = useState<ActivityEntry[]>([])

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
    const data: AccessProfile = {
      authToken,
      employeeCode,
      password,
      accessTier
    }
    localStorage.setItem(accessStorageKey, JSON.stringify(data))
  }, [authToken, employeeCode, password, accessTier, rememberAccess])

  const loadTemplate = (target: Endpoint) => {
    setEndpoint(target)
    setPayload(JSON.stringify(templateFor(target), null, 2))
    setComposerText('Describe the operational curvature inputs...')
    setResponseText('')
    setStatus('idle')
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

    const controller = new AbortController()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
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
        body: JSON.stringify(parsed),
        signal: controller.signal
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">INVARIANT // FIELD CLIENT</p>
          <h1>Neural Gate Console</h1>
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
          <h2>Access stack</h2>
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
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>

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
              Access tier
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
            Persist credentials locally (encrypted by browser storage)
          </label>

          <div className="future-buttons">
            <span>Future integrations</span>
            <div>
              <button disabled>RecruitCRM</button>
              <button disabled>Sheets Sync</button>
              <button disabled>Multi-LLM Mesh</button>
            </div>
          </div>
        </div>

        <div className="panel payload">
          <h2>Envelope composer</h2>
          <div className="composer">
            <textarea value={composerText} onChange={(e) => setComposerText(e.target.value)} />
            <button onClick={syncComposer}>Sync into payload</button>
          </div>
          <label className="payload-label">Canonical payload</label>
          <textarea className="payload-editor" value={payload} onChange={(e) => setPayload(e.target.value)} />
          <div className="actions-row">
            <button className="send" onClick={sendPayload} disabled={status === 'loading'}>
              {status === 'loading' ? 'Transmitting…' : 'Send to INVARIANT'}
            </button>
            <button className="reset" onClick={() => loadTemplate(endpoint)}>Reset template</button>
          </div>
          {errorText && <p className="error-text">{errorText}</p>}
        </div>

        <div className="panel responses">
          <h2>Signal return</h2>
          <pre className="response-window">{responseText || 'Awaiting response…'}</pre>
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
        </div>
      </section>
    </div>
  )
}

export default App
