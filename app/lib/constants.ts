export const USE_WINDOW_LOCATION_AS_API_BASE = process.env.NEXT_PUBLIC_USE_WINDOW_LOCATION_AS_API_BASE

let windowLocationApiBase = `${window.location.protocol}//${window.location.host}${window.location.pathname}`
windowLocationApiBase = windowLocationApiBase.endsWith('/')
  ? windowLocationApiBase.slice(0, windowLocationApiBase.length - 1)
  : windowLocationApiBase

export const NEXT_PUBLIC_API_URL =
  USE_WINDOW_LOCATION_AS_API_BASE === 'true'
    ? `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
