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

const pageInfo: Record<string, { descriptionKey: string }> = {
  agent: { descriptionKey: 'pageDescriptions.agent' },
  config: { descriptionKey: 'pageDescriptions.config' },
  preset: { descriptionKey: 'pageDescriptions.preset' },
  provider: { descriptionKey: 'pageDescriptions.provider' },
  models: { descriptionKey: 'pageDescriptions.models' },
  'import-export': { descriptionKey: 'pageDescriptions.importExport' },
  settings: { descriptionKey: 'pageDescriptions.settings' },
};

interface MainLayoutProps {
  children: React.ReactNode;
}

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

  useEffect(() => {
    const timer = setTimeout(() => {
      void startPreload();
      void checkUpstreamUpdate().catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [startPreload, checkUpstreamUpdate]);

  const currentPageInfo = navItems.find(item => item.id === currentPage);
  const CurrentIcon = currentPageInfo?.icon || Bot;
  const title = t(currentPageInfo?.labelKey || 'layout.title');
  const description = t(pageInfo[currentPage]?.descriptionKey || 'layout.title');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar with glassmorphism */}
      <aside
        className={cn(
          'flex flex-col transition-all duration-300 ease-in-out z-20',
          'bg-white/60 backdrop-blur-xl border-r border-slate-200/50',
          isSidebarCollapsed ? 'w-16' : 'w-44'
        )}
      >
        <div className="flex items-center h-16 px-4 border-b border-slate-200/50">
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
                    ? 'bg-indigo-100/70 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                )}
                title={isSidebarCollapsed ? t(item.labelKey) : undefined}
              >
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                )} />
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

        <div className="p-3 border-t border-slate-200/50">
          <div className="text-center">
            {!isSidebarCollapsed && (
              <span className="text-xs text-slate-400">
                v{appVersion}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-30',
          'w-4 h-14 flex items-center justify-center',
          'bg-white/80 backdrop-blur-md border border-slate-200/50 border-l-0 rounded-r-lg shadow-sm',
          'text-slate-400 hover:text-slate-600 hover:bg-white hover:shadow',
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

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with glassmorphism */}
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 shadow-sm flex items-center px-6 z-10">
          {/* Left: Icon + Title + Description */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100/80 rounded-xl flex items-center justify-center">
              <CurrentIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
