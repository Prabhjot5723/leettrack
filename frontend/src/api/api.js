// Single place all HTTP calls to the FastAPI backend go through.
// Components should call these functions instead of writing raw fetch() calls.
//
// Every request (except login/register) sends the login token in the
// Authorization header. The backend decides WHO the user is from that token,
// so no function here takes a user id any more.

// VITE_API_URL is baked in when you run `npm run build` (see frontend/.env.example).
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
const TOKEN_KEY = 'leettrack_token'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // storage unavailable — user will simply have to log in again next visit
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

function errorMessage(body, status) {
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => d.msg || 'Invalid input').join('. ')
  }
  return `Request failed (${status})`
}

async function request(path, options = {}, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  } catch (err) {
    throw new ApiError(
      'Unable to reach the backend. Make sure the FastAPI server is running.',
      0
    )
  }

  let body = null
  try {
    body = await res.json()
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    // Token missing/expired on a protected call -> send the user to login.
    if (res.status === 401 && auth) {
      clearToken()
      window.dispatchEvent(new Event('leettrack:unauthorized'))
    }
    throw new ApiError(errorMessage(body, res.status), res.status)
  }

  return body
}

// ---------------------------------------------------------------- auth

export function login(identifier, password) {
  // identifier = email OR username
  return request(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ identifier, password }) },
    { auth: false }
  )
}

export function register(username, email, password) {
  return request(
    '/api/auth/register',
    { method: 'POST', body: JSON.stringify({ username, email, password }) },
    { auth: false }
  )
}

export function forgotPassword(email) {
  // Always succeeds the same way, whether or not the email has an account.
  return request(
    '/api/auth/forgot-password',
    { method: 'POST', body: JSON.stringify({ email }) },
    { auth: false }
  )
}

export function resetPassword(token, new_password) {
  return request(
    '/api/auth/reset-password',
    { method: 'POST', body: JSON.stringify({ token, new_password }) },
    { auth: false }
  )
}

export function changePassword(current_password, new_password) {
  return request('/api/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  })
}

// ---------------------------------------------------------------- data

export function getUser() {
  return request('/api/me')
}

export function getDailyPlan(simulatedDate) {
  // simulatedDate: 'YYYY-MM-DD'. Omit for today's plan; pass another date to
  // preview the dashboard as of that date (the "Simulated Date" feature).
  const query = simulatedDate ? `?simulated_date=${simulatedDate}` : ''
  return request(`/api/me/daily-plan${query}`)
}

export function completeQuestion({ question_id, platform, difficulty }) {
  return request('/api/questions/complete', {
    method: 'POST',
    body: JSON.stringify({ question_id, platform, difficulty }),
  })
}

export function completeRevision({ question_id, platform, difficulty, revision_counter }) {
  return request('/api/revisions/complete', {
    method: 'POST',
    body: JSON.stringify({ question_id, platform, difficulty, revision_counter }),
  })
}

export function getSolvedQuestions() {
  return request('/api/me/solved')
}

export function getUpcomingRevisions() {
  return request('/api/me/revisions')
}

export function getQuestions(filters = {}) {
  const params = new URLSearchParams()
  if (filters.difficulty) params.set('difficulty', filters.difficulty)
  if (filters.topic) params.set('topic', filters.topic)
  if (filters.platform) params.set('platform', filters.platform)
  const qs = params.toString()
  return request(`/api/questions${qs ? `?${qs}` : ''}`)
}

export function getProgress() {
  return request('/api/me/progress')
}

export { ApiError }
