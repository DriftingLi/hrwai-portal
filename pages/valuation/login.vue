<template>
  <ValuationShell title="登录估值工作区" subtitle="用同一个和润账号登录；登录后即可查看历史评估并下载报告。" active="">
    <form v-if="!user" class="login-card" @submit.prevent="submit">
      <label class="field">
        <span class="field-label">账号</span>
        <input
          v-model="account"
          class="field-input"
          type="text"
          autocomplete="username"
          required
          data-test="account"
        />
      </label>
      <label class="field">
        <span class="field-label">密码</span>
        <input
          v-model="password"
          class="field-input"
          type="password"
          autocomplete="current-password"
          required
          data-test="password"
        />
      </label>

      <p v-if="errorMessage" class="form-error" role="alert" data-test="login-error">{{ errorMessage }}</p>

      <button type="submit" class="btn-primary" :disabled="submitting" data-test="submit">
        {{ submitting ? '登录中…' : '登录' }}
      </button>

      <p class="login-hint">
        还没有账号？请联系和润业务人员开通；培训站与残值评估使用同一套账号。
      </p>
    </form>
    <p v-else class="login-hint">已登录，正在前往评估历史…</p>
  </ValuationShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useValuationApi } from '~/composables/useValuationApi'
import { valuationErrorMessage } from '~/api/valuation'
import { useValuationSession, VALUATION_SESSION_KEY } from '~/composables/useValuationSession'
import { sanitizeValuationRedirect } from '~/utils/valuationRedirect'

const route = useRoute()
const api = useValuationApi()
const { user } = useValuationSession()

const account = ref('')
const password = ref('')
const errorMessage = ref('')
const submitting = ref(false)

const redirectTarget = computed(() => sanitizeValuationRedirect(route.query.redirect))

// 已登录直接回跳（服务端会话仍有效时不再显示表单）
if (user.value) {
  await navigateTo(redirectTarget.value)
}

async function submit() {
  const trimmed = account.value.trim()
  if (!trimmed || !password.value) {
    errorMessage.value = '请输入账号与密码'
    return
  }
  errorMessage.value = ''
  submitting.value = true
  try {
    await api.login({ account: trimmed, password: password.value })
    clearNuxtData(VALUATION_SESSION_KEY)
    await navigateTo(redirectTarget.value)
  } catch (error) {
    errorMessage.value = valuationErrorMessage(error, '登录失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-card {
  max-width: 420px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.field-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}
.field-input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: var(--text-base);
}
.field-input:focus {
  outline: none;
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}
.btn-primary {
  min-height: 44px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--gradient-brand);
  color: #fff;
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.form-error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--text-sm);
}
.login-hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  line-height: var(--leading-relaxed);
}
@media (max-width: 640px) {
  .login-card {
    padding: var(--space-5);
  }
}
</style>
