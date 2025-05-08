export class LimitedSizeCollection<T> {
  private map: Map<string, T> = new Map()

  constructor(private maxSize = 500) {}

  set(key: string, value: T) {
    // Add or update the entry
    this.map.set(key, value)

    // If we've exceeded the maximum size, remove the oldest entry
    if (this.map.size > this.maxSize) {
      // Get the first key (oldest) using the iterator
      const oldestKey = this.map.keys().next().value
      if (oldestKey) this.map.delete(oldestKey)
    }

    return this
  }

  get(key: string) {
    return this.map.get(key)
  }
}
