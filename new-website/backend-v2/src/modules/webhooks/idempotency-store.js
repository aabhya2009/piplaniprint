export class InMemoryIdempotencyStore {
  constructor() {
    this.keys = new Set();
  }

  async has(key) {
    return this.keys.has(key);
  }

  async put(key) {
    this.keys.add(key);
  }
}
