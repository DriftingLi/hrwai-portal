import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.spec.ts'],
    globals: false,
    hookTimeout: 30000,
    testTimeout: 30000
  }
})
