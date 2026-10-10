import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  Container,
  HandCoins,
  Home,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Wallet,
  WalletCards,
  X,
} from 'lucide-react';
import type { User, View } from '../types';
import type { OrderLanguage } from '../lib/orderLanguage';

interface AppShellProps {
  user: User;
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  orderLanguage?: OrderLanguage;
  onOrderLanguageChange?: (language: OrderLanguage) => void;
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

const customerOrdersNavigation: NavigationItem = {
  label: '客户订单',
  view: 'customer-orders',
  icon: ClipboardList,
};

const cargoContainersNavigation: NavigationItem = {
  label: '货柜情况',
  view: 'cargo-containers',
  icon: Container,
};

const orderNavigation: Record<OrderLanguage, NavigationItem[]> = {
  fr: [
    { label: 'Liste des prix', view: 'home', icon: Package },
    { label: 'Saisie commande', view: 'order-entry', icon: ShoppingCart },
    { label: 'Gestion comptable', view: 'order-accounting', icon: WalletCards },
    { label: 'Gestion des dettes', view: 'order-debts', icon: HandCoins },
  ],
  zh: [
    { label: '价格表', view: 'home', icon: Package },
    { label: '录入订单', view: 'order-entry', icon: ShoppingCart },
    { label: '记账管理', view: 'order-accounting', icon: WalletCards },
    { label: '欠款管理', view: 'order-debts', icon: HandCoins },
  ],
  en: [
    { label: 'Price list', view: 'home', icon: Package },
    { label: 'New order', view: 'order-entry', icon: ShoppingCart },
    { label: 'Accounting', view: 'order-accounting', icon: WalletCards },
    { label: 'Debts', view: 'order-debts', icon: HandCoins },
  ],
};

function OrderLanguagePicker({ language, onChange }: { language: OrderLanguage; onChange: (language: OrderLanguage) => void }) {
  return (
    <div role="group" aria-label={language === 'fr' ? 'Langue' : language === 'zh' ? '语言' : 'Language'} className="flex shrink-0 items-center gap-1 rounded-lg border border-stone-600/60 bg-stone-800/60 p-1">
      {([['zh', '中'], ['fr', 'FR'], ['en', 'EN']] as const).map(([value, label]) => (
        <button key={value} type="button" lang={value} onClick={() => onChange(value)} aria-label={value === 'zh' ? '中文' : value === 'fr' ? 'Français' : 'English'} aria-pressed={language === value} className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${language === value ? 'bg-[#e7d7bf] text-stone-900' : 'text-stone-300 hover:bg-stone-700 hover:text-white'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

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

export function AppShell({ user, currentView, onViewChange, onLogout, orderLanguage = 'fr', onOrderLanguageChange, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const roleLabel = user.role === 'admin' ? '管理员' : user.role === 'order' ? orderLanguage === 'zh' ? '订单录入' : orderLanguage === 'en' ? 'Orders' : 'Saisie' : '查询员';
  const logoutLabel = orderLanguage === 'zh' ? '退出登录' : orderLanguage === 'en' ? 'Log out' : 'Se déconnecter';

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
  const visibleManagementNavigation = [
    managementNavigation[0],
    cargoContainersNavigation,
    ...managementNavigation.slice(1),
    ...(user.role === 'admin' ? [customerOrdersNavigation] : []),
  ];

  if (user.role === 'order') {
    return (
      <div className="app-shell min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="app-sidebar hidden md:flex">
          <Brand />

          <nav className="mt-10 flex min-h-0 flex-1 flex-col overflow-y-auto" aria-label={orderLanguage === 'zh' ? '订单导航' : orderLanguage === 'en' ? 'Order navigation' : 'Navigation commandes'}>
            <span className="shell-nav-label">{orderLanguage === 'zh' ? '订单' : orderLanguage === 'en' ? 'ORDERS' : 'COMMANDES'}</span>
            <div className="space-y-1">
              {orderNavigation[orderLanguage].map((item) => (
                <NavigationButton
                  key={item.view}
                  item={item}
                  active={currentView === item.view}
                  onClick={() => navigate(item.view)}
                />
              ))}
            </div>
          </nav>

          {onOrderLanguageChange && <div className="px-4 pb-4"><OrderLanguagePicker language={orderLanguage} onChange={onOrderLanguageChange} /></div>}

          <div className="sidebar-account">
            <span className="account-status" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold text-stone-100">{user.username}</strong>
              <span className="block text-[11px] tracking-[0.08em] text-stone-500">{roleLabel}</span>
            </span>
            <button type="button" onClick={onLogout} className="sidebar-logout" title={logoutLabel}>
              <LogOut size={17} />
              <span className="sr-only">{logoutLabel}</span>
            </button>
          </div>
        </aside>

        <header className="mobile-shell-header md:hidden">
          <Brand compact />
          {onOrderLanguageChange && <OrderLanguagePicker language={orderLanguage} onChange={onOrderLanguageChange} />}
          <button type="button" onClick={onLogout} className="button-secondary button-icon" title={logoutLabel}>
            <LogOut size={18} />
            <span className="sr-only">{logoutLabel}</span>
          </button>
        </header>

        <main className="app-main min-w-0">{children}</main>

        <nav className="mobile-navigation order-mobile-navigation md:hidden" aria-label={orderLanguage === 'zh' ? '手机订单导航' : orderLanguage === 'en' ? 'Mobile order navigation' : 'Navigation commandes mobile'}>
          {orderNavigation[orderLanguage].map((item) => (
            <NavigationButton
              key={item.view}
              item={item}
              active={currentView === item.view}
              onClick={() => navigate(item.view)}
            />
          ))}
        </nav>
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
            {visibleManagementNavigation.map((item) => (
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
              <MobileMenuGroup label="经营" items={visibleManagementNavigation} currentView={currentView} onNavigate={navigate} />
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
