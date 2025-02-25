import { DateOnly } from '@credo-ts/core'

export const oneDayInMilliseconds = 24 * 60 * 60 * 1000
export const tenDaysInMilliseconds = 10 * oneDayInMilliseconds
export const oneYearInMilliseconds = 365 * oneDayInMilliseconds
export const serverStartupTimeInMilliseconds = Date.now()

export function dateToSeconds(date: Date | DateOnly) {
  const realDate = date instanceof DateOnly ? new Date(date.toISOString()) : date
  return Math.floor(realDate.getTime() / 1000)
}
