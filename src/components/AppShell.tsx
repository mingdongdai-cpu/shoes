import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  HandCoins,
  Home,
  LogOut,
  Menu,
  Package,
  Wallet,
  X,
} from 'lucide-react';
import type { User, View } from '../types';

interface AppShellProps {
  user: User;
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  children: ReactNode;
}

interface NavigationItem {
  label: string;
  view: View;
  icon: typeof Home;
}

const primaryNavigation: NavigationItem[] = [
  { label: '首页概览', view: 'home', icon: Home },
  { label: '数据看板', view: 'dashboard', icon: BarChart3 },
];

const inventoryNavigation: NavigationItem[] = [
  { label: '库存预警', view: 'inventory-warnings', icon: AlertTriangle },
  { label: '滞销品', view: 'inventory-stale', icon: AlertTriangle },
  { label: '库存总览', view: 'inventory-stock', icon: Package },
  { label: '销量明细', view: 'inventory-comparison', icon: BarChart3 },
];

const managementNavigation: NavigationItem[] = [
  { label: '进出库管理', view: 'stock', icon: ArrowLeftRight },
  { label: '商品管理', view: 'products', icon: Package },
  { label: '记账管理', view: 'expenses', icon: Wallet },
  { label: '欠账管理', view: 'debts', icon: HandCoins },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <span className={compact ? 'brand-mark brand-mark-compact' : 'brand-mark'}>
        <img src="/top-star-mark.png" alt="" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <strong className={compact ? 'brand-name brand-name-compact' : 'brand-name'}>TOP STAR</strong>
        {!compact && <span className="brand-subtitle">SHOES · LOMÉ</span>}
      </span>
    </div>
  );
}

function NavigationButton({
  item,
  active,
  onClick,
}: {
  item: NavigationItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`shell-nav-item ${active ? 'shell-nav-item-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={18} strokeWidth={1.7} />
      <span>{item.label}</span>
    </button>
  );
}

export function AppShell({ user, currentView, onViewChange, onLogout, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const roleLabel = user.role === 'admin' ? '管理员' : user.role === 'order' ? 'Saisie' : '查询员';

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    document.body.classList.add('mobile-menu-visible');
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('mobile-menu-visible');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navigate = (view: View) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  if (user.role === 'order') {
    return (
      <div className="app-shell min-h-screen">
        <header className="order-shell-header">
          <Brand compact />
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-stone-500 sm:inline">{roleLabel} · {user.username}</span>
            <button type="button" onClick={onLogout} className="button-secondary button-icon" title="Se déconnecter">
              <LogOut size={18} />
              <span className="sr-only">Se déconnecter</span>
            </button>
          </div>
        </header>
        <main className="order-shell-content">{children}</main>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="app-sidebar hidden md:flex">
        <Brand />

        <nav className="mt-10 flex min-h-0 flex-1 flex-col overflow-y-auto" aria-label="主导航">
          <span className="shell-nav-label">概览</span>
          <div className="space-y-1">
            {primaryNavigation.map((item) => (
              <NavigationButton
                key={item.view}
                item={item}
                active={currentView === item.view}
                onClick={() => navigate(item.view)}
              />
            ))}
          </div>

          <span className="shell-nav-label mt-7">库存</span>
          <div className="space-y-1">
            {inventoryNavigation.map((item) => (
              <NavigationButton
                key={item.view}
                item={item}
                active={currentView === item.view}
                onClick={() => navigate(item.view)}
              />
            ))}
          </div>

          <span className="shell-nav-label mt-7">经营</span>
          <div className="space-y-1">
            {managementNavigation.map((item) => (
              <NavigationButton
                key={item.view}
                item={item}
                active={currentView === item.view}
                onClick={() => navigate(item.view)}
              />
            ))}
          </div>
        </nav>

        <div className="sidebar-account">
          <span className="account-status" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-stone-100">{user.username}</strong>
            <span className="block text-[11px] tracking-[0.08em] text-stone-500">{roleLabel}</span>
          </span>
          <button type="button" onClick={onLogout} className="sidebar-logout" title="退出登录">
            <LogOut size={17} />
            <span className="sr-only">退出登录</span>
          </button>
        </div>
      </aside>

      <header className="mobile-shell-header md:hidden">
        <Brand compact />
        <button type="button" onClick={onLogout} className="button-secondary button-icon" title="退出登录">
          <LogOut size={18} />
          <span className="sr-only">退出登录</span>
        </button>
      </header>

      <main className="app-main min-w-0">{children}</main>

      <nav className="mobile-navigation md:hidden" aria-label="手机底部导航">
        <NavigationButton
          item={{ label: '首页', view: 'home', icon: Home }}
          active={currentView === 'home'}
          onClick={() => navigate('home')}
        />
        <NavigationButton
          item={{ label: '看板', view: 'dashboard', icon: BarChart3 }}
          active={currentView === 'dashboard'}
          onClick={() => navigate('dashboard')}
        />
        <NavigationButton
          item={{ label: '进出库', view: 'stock', icon: ArrowLeftRight }}
          active={currentView === 'stock'}
          onClick={() => navigate('stock')}
        />
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`mobile-nav-item ${mobileMenuOpen ? 'mobile-nav-item-active' : ''}`}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-all-navigation"
        >
          <Menu size={20} strokeWidth={1.7} />
          <span>更多</span>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-menu-layer md:hidden" role="presentation" onMouseDown={() => setMobileMenuOpen(false)}>
          <section
            id="mobile-all-navigation"
            className="mobile-menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="全部功能"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-handle" aria-hidden="true" />
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow">NAVIGATION</span>
                <h2 className="display-title mt-1 text-2xl">全部功能</h2>
              </div>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="button-secondary button-icon">
                <X size={19} />
                <span className="sr-only">关闭菜单</span>
              </button>
            </div>

            <div className="mobile-menu-groups">
              <MobileMenuGroup label="概览" items={primaryNavigation} currentView={currentView} onNavigate={navigate} />
              <MobileMenuGroup label="库存" items={inventoryNavigation} currentView={currentView} onNavigate={navigate} />
              <MobileMenuGroup label="经营" items={managementNavigation} currentView={currentView} onNavigate={navigate} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MobileMenuGroup({
  label,
  items,
  currentView,
  onNavigate,
}: {
  label: string;
  items: NavigationItem[];
  currentView: View;
  onNavigate: (view: View) => void;
}) {
  return (
    <section>
      <h3 className="shell-nav-label mb-2">{label}</h3>
      <div className="mobile-menu-grid">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.view;
          return (
            <button
              type="button"
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`mobile-menu-item ${active ? 'mobile-menu-item-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
