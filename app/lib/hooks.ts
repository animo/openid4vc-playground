import { useEffect, useRef } from 'react'

type Callback = () => void | Promise<void>

export const useInterval = ({
  callback,
  interval,
  enabled = true,
}: {
  callback: Callback
  interval: number
  enabled?: boolean
}) => {
  const savedCallback = useRef<Callback>(undefined)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => savedCallback.current?.(), interval)
    return () => clearInterval(id)
  }, [interval, enabled])
}
