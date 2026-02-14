import React from 'react';
import { cn } from '../common/cn';
import { 
  Bot, 
  Settings, 
  Bookmark, 
  Database, 
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

/**
 * 导航项配置
 */
interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'agent', label: 'Agent 切换', icon: Bot },
  { id: 'config', label: '配置总览', icon: Settings },
  { id: 'preset', label: '预设管理', icon: Bookmark },
  { id: 'models', label: '模型库', icon: Database },
  { id: 'import-export', label: '导入导出', icon: Download },
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
  const { 
    currentPage, 
    setCurrentPage, 
    isSidebarCollapsed, 
    toggleSidebar 
  } = useUIStore();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out',
          isSidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo 区域 */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-slate-800">OMO Model</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              'p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors',
              isSidebarCollapsed && 'mx-auto'
            )}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                  isSidebarCollapsed && 'justify-center',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                )} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* 底部信息 */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-t border-slate-100">
            <div className="text-xs text-slate-400 text-center">
              v1.0.0
            </div>
          </div>
        )}
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <h1 className="text-lg font-semibold text-slate-800">
            {navItems.find(item => item.id === currentPage)?.label || '首页'}
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
