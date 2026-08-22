import { supabase } from './supabase.js'

const apiBase = import.meta.env.VITE_LICENSE_API_URL
async function request(path, options = {}) {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('Sign in to continue.')
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, ...options.headers } })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'The request could not be completed.')
  return result
}
export const loadLicenses = () => request('/v1/account/licenses')
export const issueFreeKey = () => request('/v1/licenses/free', { method: 'POST', body: '{}' })
export const validateLicense = (licenseKey) => request('/v1/licenses/check', { method: 'POST', body: JSON.stringify({ license_key: licenseKey }) })
export const unbindDevice = (licenseId, deviceId) => request('/v1/account/unbind', { method: 'POST', body: JSON.stringify({ license_id: licenseId, device_id: deviceId }) })
