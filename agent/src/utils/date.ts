import { DateOnly as NativeDateOnly } from '@animo-id/mdoc'
export const DateOnly = NativeDateOnly

export const oneDayInMilliseconds = 24 * 60 * 60 * 1000
export const tenDaysInMilliseconds = 10 * oneDayInMilliseconds
export const oneYearInMilliseconds = 365 * oneDayInMilliseconds
export const serverStartupTimeInMilliseconds = Date.now()

export function dateToSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000)
}
