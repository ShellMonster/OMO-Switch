import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getName, getVersion } from '@tauri-apps/api/app';
import { cn } from '../common/cn';
import { 
  Bot, 
  Settings, 
  Bookmark, 
  Database, 
  Download,
  ChevronLeft,
  ChevronRight,
  Cog,
  KeyRound
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { usePreloadStore } from '../../store/preloadStore';
import appLogo from '../../assets/logo.png';

interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'agent', labelKey: 'nav.agent', icon: Bot },
  { id: 'config', labelKey: 'nav.config', icon: Settings },
  { id: 'preset', labelKey: 'nav.preset', icon: Bookmark },
  { id: 'provider', labelKey: 'nav.provider', icon: KeyRound },
  { id: 'models', labelKey: 'nav.models', icon: Database },
  { id: 'import-export', labelKey: 'nav.importExport', icon: Download },
  { id: 'settings', labelKey: 'nav.settings', icon: Cog },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * 主布局组件
 * 
 * 包含：
 * - 可折叠的左侧边栏
 * - 顶部标题栏
 * - 主内容区域
 * 
 * 侧边栏导航：
 * - Agent 切换
 * - 配置总览
 * - 预设管理
 * - 模型库
 * - 导入导出
 */
export function MainLayout({ children }: MainLayoutProps) {
  const { t } = useTranslation();
  const { 
    currentPage, 
    setCurrentPage, 
    isSidebarCollapsed, 
    toggleSidebar 
  } = useUIStore();
  const startPreload = usePreloadStore(s => s.startPreload);
  const checkUpstreamUpdate = usePreloadStore(s => s.checkUpstreamUpdate);
  
  // 从 Tauri API 动态读取应用名称
  const [appName, setAppName] = useState('OMO Switch');
  const [appVersion, setAppVersion] = useState('0.1.0');

  useEffect(() => {
    getName()
      .then(n => setAppName(n))
      .catch(() => setAppName('OMO Switch'));
    getVersion()
      .then(v => setAppVersion(v))
      .catch(() => setAppVersion('0.1.0'));
  }, []);

  // App 启动时延迟预加载数据（等待首屏渲染完成）
  // 优化启动体验：先显示 UI，500ms 后再开始加载数据
  // 同时后台静默检查上游配置更新（不阻塞、不弹窗）
  useEffect(() => {
    const timer = setTimeout(() => {
      void startPreload();
      void checkUpstreamUpdate().catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [startPreload, checkUpstreamUpdate]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out',
          isSidebarCollapsed ? 'w-16' : 'w-44'
        )}
      >
        {/* Logo 区域 - 展开时显示应用名称 */}
        <div className="flex items-center h-16 px-4 border-b border-slate-100">
          <img 
            src={appLogo} 
            alt={appName}
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
          />
          {!isSidebarCollapsed && (
            <span className="ml-3 font-semibold text-slate-800 truncate">
              {appName}
            </span>
          )}
        </div>

        {/* 导航菜单 - 添加 overflow-hidden 防止文字溢出 */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  'w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                  'whitespace-nowrap',
                  isSidebarCollapsed ? 'gap-0 justify-center' : 'gap-3',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
                title={isSidebarCollapsed ? t(item.labelKey) : undefined}
              >
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                )} />
                {/* 使用 opacity 过渡而不是条件渲染，避免布局跳动 */}
                <span className={cn(
                  'flex-1 text-left text-base font-medium truncate transition-opacity duration-200',
                  isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                )}>
                  {t(item.labelKey)}
                </span>
              </button>
            );
          })}
        </nav>

        {/* 底部版本号 */}
        <div className="p-3 border-t border-slate-100">
          <div className="text-center">
            {!isSidebarCollapsed && (
              <span className="text-xs text-slate-400">
                v{appVersion}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* 折叠按钮 - 垂直居中，矩形贴着侧边栏 */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-10',
          'w-4 h-14 flex items-center justify-center',
          'bg-white border border-slate-200 border-l-0 rounded-r-lg shadow-sm',
          'text-slate-400 hover:text-slate-600 hover:bg-slate-50 hover:shadow',
          'transition-all duration-300',
          isSidebarCollapsed ? 'left-16' : 'left-44'
        )}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <h1 className="text-lg font-semibold text-slate-800">
            {t(navItems.find(item => item.id === currentPage)?.labelKey || 'layout.title')}
          </h1>
        </header>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
