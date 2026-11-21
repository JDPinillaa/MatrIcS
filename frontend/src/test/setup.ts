import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// `globals` is off on purpose, so Testing Library cannot auto-register its
// cleanup. Without this, each test would render on top of the previous DOM.
afterEach(() => {
  cleanup()
})
