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
        <li
          v-for="item in menuItems"
          :key="item.key"
          class="nav-item"
          :class="{ 'has-children': hasChildren(item) }"
          @mouseenter="openDropdown(item)"
          @mouseleave="closeDropdown(item)"
          @focusin="openDropdown(item)"
          @focusout="onNavFocusOut($event, item)"
        >
          <a
            :href="item.path"
            class="nav-link"
            :class="{ active: activeAnchor === item.key }"
            :aria-haspopup="hasChildren(item) ? 'true' : undefined"
            :aria-expanded="hasChildren(item) ? openKey === item.key : undefined"
            @click.prevent="handleNavClick(item)"
            @keydown.esc="closeDropdown(item)"
          >{{ item.label }}<span
            v-if="hasChildren(item)"
            class="nav-caret"
            :class="{ open: openKey === item.key }"
            aria-hidden="true"
          /></a>

          <!-- 下拉：内容精选归档页入口（总览 + 各分类） -->
          <div
            v-if="hasChildren(item)"
            class="nav-dropdown"
            :class="{ open: openKey === item.key }"
          >
            <ul class="nav-dropdown-panel">
              <li v-for="child in item.children ?? []" :key="child.key">
                <NuxtLink
                  :to="child.path"
                  class="nav-dropdown-link"
                  :class="{ active: isChildActive(child) }"
                  @click="closeDropdowns"
                >{{ child.label }}</NuxtLink>
              </li>
            </ul>
          </div>
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
        <template v-for="item in menuItems" :key="item.key">
          <a
            :href="item.path"
            class="mobile-link"
            @click.prevent="handleNavClick(item)"
          >{{ item.label }}</a>
          <!-- 移动端没有 hover：内容精选的子项直接平铺，点一下就到归档页 -->
          <div v-if="hasChildren(item)" class="mobile-sub">
            <NuxtLink
              v-for="child in item.children ?? []"
              :key="child.key"
              :to="child.path"
              class="mobile-sub-link"
              :class="{ active: isChildActive(child) }"
              @click="onMobileChildClick"
            >{{ child.label }}</NuxtLink>
          </div>
        </template>
      </div>
    </transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { PortalNavChild, PortalNavItem } from '~/config/portalNav'

defineProps<{ menuItems: PortalNavItem[] }>()

const router = useRouter()
const route = useRoute()
const scrolled = ref(false)
const navbarHidden = ref(false)
const mobileOpen = ref(false)
// 当前展开的下拉项 key（悬停或键盘聚焦触发，同时只有一个）
const openKey = ref<string | null>(null)
// 内容精选区块：/news 归档页（含分类子页）+ /content 文章详情页。
// 这两类页面的指示器都固定停在「内容精选」，不随滚动或具体文章变化。
const NEWS_SECTION_PATH = /^\/(news|content)(\/|$)/
// 三维展台：列表页 /showcase 与车型详情页 /showcase/<slug> 同属一个入口
const SHOWCASE_PATH = /^\/showcase(\/|$)/
const activeAnchor = ref(resolveRouteAnchor())
let lastScrollY = 0
// 导航点击触发的平滑滚动期间不隐藏导航条（避免锚点跳转后导航消失）
let suppressHideUntil = 0

// 非首页（浅色背景）时导航条常驻深色玻璃底，保证白色文字可读
const isHome = computed(() => route.path === '/')

/**
 * 导航指示器的锚点来源：
 * - 首页：随滚动位置实时切换（见 onScroll）
 * - 内容精选区块（/news 归档页及其分类子页、/content 文章详情页）：固定「内容精选」
 * - 其它页面（评估页等）：沿用原行为，停在「首页」
 */
function resolveRouteAnchor(): string {
  if (route.path === '/') return 'home'
  if (SHOWCASE_PATH.test(route.path)) return 'showcase'
  if (NEWS_SECTION_PATH.test(route.path)) return 'featured'
  return 'home'
}

/* ---------- 内容精选下拉（桌面悬停 / 键盘聚焦，移动端平铺） ---------- */
function hasChildren(item: PortalNavItem): boolean {
  return (item.children?.length ?? 0) > 0
}

function openDropdown(item: PortalNavItem) {
  if (hasChildren(item)) openKey.value = item.key
}

function closeDropdown(item: PortalNavItem) {
  if (openKey.value === item.key) openKey.value = null
}

function closeDropdowns() {
  openKey.value = null
}

/** 焦点离开整个 <li>（含下拉面板）时才收起，避免从父项 Tab 到子项时闪退 */
function onNavFocusOut(event: FocusEvent, item: PortalNavItem) {
  const next = event.relatedTarget as Node | null
  const current = event.currentTarget as HTMLElement | null
  if (!current || !next || !current.contains(next)) closeDropdown(item)
}

/** 子项高亮：仅精确匹配当前路由（分类归档页之间互不干扰） */
function isChildActive(child: PortalNavChild): boolean {
  return route.path === child.path
}

/** 移动端子项：点完收起菜单（NuxtLink 负责 SPA 跳转） */
function onMobileChildClick() {
  mobileOpen.value = false
  closeDropdowns()
}

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

  // 更新当前活动锚点：仅首页按滚动位置判断；/news 等页面由路由固定，不被滚动覆盖
  if (route.path !== '/') return
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
  closeDropdowns()
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
    } else if (hash === 'featured' && currentPath === '/') {
      // 首页内容精选为空时区块不渲染（SectionFeatured 的 v-if）：停在首页时退回归档页，保证入口可用
      await router.push('/news')
      activeAnchor.value = 'featured'
    }
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    activeAnchor.value = resolveRouteAnchor()
  }
}

// 路由变化时重算指示器（离开首页后不再保留首页锚点的高亮）
watch(
  () => route.path,
  (path) => {
    activeAnchor.value = resolveRouteAnchor()
    navbarHidden.value = false
    closeDropdowns()
    // 回到首页时按当前滚动位置恢复区块高亮（push 完成后执行，避免被覆盖）
    if (path === '/') nextTick(() => onScroll())
  }
)

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

/* ---------- 内容精选下拉（桌面悬停/聚焦展开） ---------- */
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
}
.nav-caret {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 6px;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  vertical-align: middle;
  transition: transform var(--duration-fast) var(--ease-default);
}
.nav-caret.open {
  transform: rotate(180deg);
}
.nav-dropdown {
  position: absolute;
  top: 100%;
  left: 50%;
  /* 视觉间距用 padding 顶出来：这块透明区域仍属面板，鼠标从链接移下来不会中途丢失 hover */
  padding-top: 12px;
  transform: translate(-50%, -4px);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity var(--duration-fast) var(--ease-default),
              transform var(--duration-fast) var(--ease-default),
              visibility var(--duration-fast);
  z-index: calc(var(--z-sticky) + 1);
}
.nav-dropdown.open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translate(-50%, 0);
}
.nav-dropdown-panel {
  min-width: 176px;
  margin: 0;
  padding: var(--space-2);
  list-style: none;
  border-radius: var(--radius-lg);
  background: var(--glass-bg-dark);
  border: 1px solid var(--glass-border-dark);
  box-shadow: 0 16px 40px rgba(2, 8, 23, 0.45);
  -webkit-backdrop-filter: blur(var(--blur-glass));
  backdrop-filter: blur(var(--blur-glass));
}
.nav-dropdown-link {
  display: block;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  white-space: nowrap;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.nav-dropdown-link:hover,
.nav-dropdown-link:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.nav-dropdown-link.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
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
  /* 导航项 + 内容精选子项在手机上超过一屏：菜单内部滚动，别把「加入我们」截掉 */
  max-height: calc(100vh - 60px);
  max-height: calc(100dvh - 60px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
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
/* 移动端没有 hover：内容精选的子项平铺在父项下面 */
.mobile-sub {
  display: flex;
  flex-direction: column;
  padding: 0 0 var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-darker);
}
.mobile-sub-link {
  display: block;
  padding: 10px 0;
  font-size: var(--text-base);
  color: rgba(255, 255, 255, 0.78);
  text-decoration: none;
}
.mobile-sub-link.active {
  color: #fff;
  font-weight: var(--font-semibold);
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

/* 桌面导航在 1024px 起启用：8 个导航项（3D 展台固定在最右）在 768–1023 会挤在一起 */
@media (min-width: 1024px) {
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

@media (max-width: 1023px) {
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
