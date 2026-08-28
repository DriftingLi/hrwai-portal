<template>
  <nav
    class="portal-navbar"
    :class="{ scrolled: scrolled || !isHome, hidden: navbarHidden }"
  >
    <div class="navbar-container">
      <!-- Logo -->
      <NuxtLink to="/" class="logo-link" @click="goHome">
        <img src="/images/HRWAIlogo.jpg" alt="和润天下" class="logo-img" />
        <div class="logo-text-wrap">
          <span class="logo-text">和润天下</span>
          <span class="logo-sub">HRWAI</span>
        </div>
      </NuxtLink>

      <!-- Desktop Nav -->
      <ul class="desktop-nav">
        <li v-for="item in menuItems" :key="item.key">
          <a
            :href="item.path"
            class="nav-link"
            :class="{ active: activeAnchor === item.key }"
            @click.prevent="handleNavClick(item)"
          >{{ item.label }}</a>
        </li>
      </ul>

      <!-- Mobile Hamburger -->
      <button
        class="hamburger"
        :class="{ open: mobileOpen }"
        @click="mobileOpen = !mobileOpen"
        aria-label="菜单"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>

    <!-- Mobile Menu -->
    <transition name="mobile-slide">
      <div v-if="mobileOpen" class="mobile-menu" :class="{ scrolled }">
        <a
          v-for="item in menuItems"
          :key="item.key"
          :href="item.path"
          class="mobile-link"
          @click.prevent="handleNavClick(item)"
        >{{ item.label }}</a>
      </div>
    </transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { PortalNavItem } from '~/config/portalNav'

defineProps<{ menuItems: PortalNavItem[] }>()

const router = useRouter()
const route = useRoute()
const scrolled = ref(false)
const navbarHidden = ref(false)
const mobileOpen = ref(false)
const activeAnchor = ref('home')
let lastScrollY = 0
// 导航点击触发的平滑滚动期间不隐藏导航条（避免锚点跳转后导航消失）
let suppressHideUntil = 0

// 非首页（浅色背景）时导航条常驻深色玻璃底，保证白色文字可读
const isHome = computed(() => route.path === '/')

function onScroll() {
  const y = window.scrollY
  scrolled.value = y > 80

  // 滚动方向感知：向下滚隐藏、向上滚显现；触顶 / 菜单展开 / 点击跳转期间常显
  if (y <= 80 || mobileOpen.value || Date.now() < suppressHideUntil) {
    navbarHidden.value = false
  } else if (y > lastScrollY + 4 && y > 400) {
    navbarHidden.value = true
  } else if (y < lastScrollY - 4) {
    navbarHidden.value = false
  }
  lastScrollY = y

  // 更新当前活动锚点
  const sections = ['hero', 'about', 'products', 'cooperation', 'service', 'featured', 'footer']
  for (const id of sections) {
    const el = document.getElementById(id)
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= 120 && rect.bottom >= 120) {
        activeAnchor.value = id === 'footer' ? 'contact' : id
        break
      }
    }
  }
}

function goHome() {
  if (router.currentRoute.value.path !== '/') {
    router.push('/')
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  activeAnchor.value = 'home'
}

async function handleNavClick(item: PortalNavItem) {
  mobileOpen.value = false
  if (!item.path) return

  // 解析路径与锚点
  const [path, hash] = item.path.split('#')
  const targetPath = path || '/'
  const currentPath = router.currentRoute.value.path

  if (targetPath !== currentPath) {
    await router.push(targetPath)
  }
  if (hash) {
    await nextTick()
    suppressHideUntil = Date.now() + 1200
    navbarHidden.value = false
    const el = document.getElementById(hash)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      activeAnchor.value = hash === 'footer' ? 'contact' : hash
    }
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    activeAnchor.value = 'home'
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.portal-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sticky);
  background: transparent;
  transition: background var(--duration-normal) var(--ease-default),
              box-shadow var(--duration-normal) var(--ease-default),
              transform var(--duration-normal) var(--ease-default),
              border-color var(--duration-normal) var(--ease-default);
  border-bottom: 1px solid transparent;
}
.portal-navbar.scrolled {
  background: var(--glass-bg-dark);
  -webkit-backdrop-filter: blur(var(--blur-glass));
  backdrop-filter: blur(var(--blur-glass));
  border-bottom-color: var(--glass-border-dark);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.25);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .portal-navbar.scrolled {
    background: rgba(15, 23, 42, 0.94);
  }
}
/* 向下滚动时导航条上滑隐藏（触顶 / 菜单展开 / 跳转期间不隐藏） */
.portal-navbar.hidden {
  transform: translateY(-100%);
}

.navbar-container {
  max-width: var(--container-page);
  margin: 0 auto;
  padding: 0 var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
  cursor: pointer;
}

.logo-img {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  object-fit: cover;
}
.logo-text-wrap {
  display: flex;
  flex-direction: column;
  line-height: 1;
}
.logo-text {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: #fff;
  letter-spacing: -0.025em;
}
.logo-sub {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-top: 2px;
}

.desktop-nav {
  display: none;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 32px;
  align-items: center;
}
.nav-link {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: color var(--duration-fast);
  cursor: pointer;
  position: relative;
}
.nav-link:hover,
.nav-link.active {
  color: #fff;
}
.nav-link.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 2px;
  background: var(--gradient-brand);
  border-radius: 2px;
}

.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.hamburger span {
  display: block;
  width: 24px;
  height: 2px;
  background: #fff;
  border-radius: 1px;
  transition: all var(--duration-normal);
}
.hamburger.open span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}
.hamburger.open span:nth-child(2) {
  opacity: 0;
}
.hamburger.open span:nth-child(3) {
  transform: rotate(-45deg) translate(5px, -5px);
}

.mobile-menu {
  display: none;
  flex-direction: column;
  background: var(--surface-dark);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border-darker);
}
.mobile-link {
  display: block;
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  color: var(--color-text-on-dark);
  text-decoration: none;
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-border-darker);
}
.mobile-link:last-of-type {
  border-bottom: none;
}

.mobile-slide-enter-active,
.mobile-slide-leave-active {
  transition: opacity var(--duration-normal), transform var(--duration-normal);
}
.mobile-slide-enter-from,
.mobile-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (min-width: 768px) {
  .desktop-nav {
    display: flex;
  }
  .hamburger {
    display: none;
  }
  .mobile-menu {
    display: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .portal-navbar {
    transition: none !important;
  }
}

@media (max-width: 767px) {
  .hamburger {
    display: flex;
  }
  .mobile-menu {
    display: flex;
  }
  .navbar-container {
    height: 60px;
    padding: 0 var(--space-4);
  }
  .logo-text {
    font-size: var(--text-lg);
  }
}
</style>
