// FIXME: export is broken, need update in protokol
// import { DateOnly as NativeDateOnly } from '@protokoll/mdoc-client/dist/cjs/src/cbor'
// export const DateOnly = NativeDateOnly
export const DateOnly = Date

export const oneDayInMilliseconds = 24 * 60 * 60 * 1000
export const tenDaysInMilliseconds = 10 * oneDayInMilliseconds
export const oneYearInMilliseconds = 365 * oneDayInMilliseconds
export const serverStartupTimeInMilliseconds = Date.now()

export function dateToSeconds(date: Date) {
  Math.floor(date.getTime() / 1000)
}
