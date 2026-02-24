import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ExternalLink, Trash2, Settings, Plus, ChevronDown, Edit } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Button } from '../common/Button';
import { cn } from '../common/cn';

const ICON_REQUEST_CONCURRENCY = 4;
const ICON_FAIL_TTL_MS = 6 * 60 * 60 * 1000;
const ICON_FAIL_CACHE_KEY = 'omo.providerIconFailCache.v1';

const iconPathCache = new Map<string, string | null>();
const iconInflight = new Map<string, Promise<string | null>>();
let iconQueueRunning = 0;
const iconQueueWaiters: Array<() => void> = [];

function runWithIconQueue<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      iconQueueRunning += 1;
      void task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          iconQueueRunning = Math.max(0, iconQueueRunning - 1);
          const next = iconQueueWaiters.shift();
          if (next) next();
        });
    };

    if (iconQueueRunning < ICON_REQUEST_CONCURRENCY) {
      run();
      return;
    }
    iconQueueWaiters.push(run);
  });
}

function readIconFailCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(ICON_FAIL_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed as Record<string, number> : {};
  } catch {
    return {};
  }
}

function writeIconFailCache(cache: Record<string, number>) {
  try {
    localStorage.setItem(ICON_FAIL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage errors
  }
}

function shouldSkipIconLoad(providerId: string): boolean {
  const cache = readIconFailCache();
  const failedAt = cache[providerId];
  if (!failedAt) return false;
  return Date.now() - failedAt < ICON_FAIL_TTL_MS;
}

function markIconLoadFailed(providerId: string) {
  const cache = readIconFailCache();
  cache[providerId] = Date.now();
  writeIconFailCache(cache);
}

function clearIconLoadFailed(providerId: string) {
  const cache = readIconFailCache();
  if (!(providerId in cache)) return;
  delete cache[providerId];
  writeIconFailCache(cache);
}

async function getProviderIconPath(providerId: string): Promise<string | null> {
  if (iconPathCache.has(providerId)) {
    return iconPathCache.get(providerId) ?? null;
  }

  if (shouldSkipIconLoad(providerId)) {
    iconPathCache.set(providerId, null);
    return null;
  }

  const existing = iconInflight.get(providerId);
  if (existing) return existing;

  const request = runWithIconQueue(async () => {
    try {
      const path = await invoke<string | null>('get_provider_icon', { providerId });
      if (path) {
        clearIconLoadFailed(providerId);
      } else {
        markIconLoadFailed(providerId);
      }
      iconPathCache.set(providerId, path ?? null);
      return path ?? null;
    } catch {
      markIconLoadFailed(providerId);
      iconPathCache.set(providerId, null);
      return null;
    } finally {
      iconInflight.delete(providerId);
    }
  });

  iconInflight.set(providerId, request);
  return request;
}

export interface ProviderInfo {
  id: string;
  name: string;
  npm: string | null;
  website_url: string | null;
  is_configured: boolean;
  is_builtin: boolean;
}

export interface ProviderPreset {
  id: string;
  name: string;
  npm: string | null;
  provider_type: string;
  env_prefix: string;
  base_url: string | null;
  description: string;
  website_url: string | null;
  icon: string | null;
}

export interface ProviderConfig {
  preset_id: string;
  api_key: string;
  base_url: string | null;
  is_active: boolean;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function CollapsibleSection({
  title,
  icon: Icon,
  iconColor,
  count,
  children,
  defaultExpanded = true,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconColor)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500">{count} 个</p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-slate-400 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      {isExpanded && <div className="p-4">{children}</div>}
    </div>
  );
}

function ProviderIcon({ providerId, name }: { providerId: string; name: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [iconPath, setIconPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '120px' });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadIcon() {
      setLoading(true);
      try {
        const path = await getProviderIconPath(providerId);
        if (!cancelled) {
          if (path) {
            setIconPath(path);
            setError(false);
          } else {
            setError(true);
            setIconPath(null);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setIconPath(null);
          setLoading(false);
        }
      }
    }

    void loadIcon();
    return () => { cancelled = true; };
  }, [providerId, shouldLoad]);

  return (
    <div ref={containerRef} className="w-12 h-12 flex-shrink-0">
      {!shouldLoad || loading ? (
        <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse" />
      ) : error || !iconPath ? (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-lg">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <img
          src={convertFileSrc(iconPath)}
          alt={name}
          className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-sm"
        />
      )}
    </div>
  );
}

interface ProviderCardProps {
  provider: ProviderInfo;
  onConfigure: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ProviderCard({ provider, onConfigure, onEdit, onDelete }: ProviderCardProps) {
  const { t } = useTranslation();

  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (provider.website_url) {
      window.open(provider.website_url, '_blank');
    }
  };

  return (
    <div
      className={`
        group relative bg-white rounded-xl border p-4
        transition-all duration-200 hover:shadow-md
        ${provider.is_configured
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-slate-200 hover:border-indigo-300'
        }
      `}
    >
      {provider.is_configured && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full flex items-center gap-1 shadow-sm">
          <CheckCircle2 className="w-3 h-3" />
          {t('provider.configured')}
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <ProviderIcon providerId={provider.id} name={provider.name} />

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 truncate" title={provider.name}>
            {provider.name}
          </h3>
          <p className="text-xs text-slate-500 truncate">
            {provider.is_builtin ? t('provider.builtinTag') : t('provider.customTag')}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {provider.is_configured ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="flex-1 justify-center text-xs"
            >
              <Edit className="w-3 h-3 mr-1" />
              {t('provider.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onConfigure}
            className="flex-1 justify-center text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            {t('provider.configure')}
          </Button>
        )}

        {provider.website_url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleWebsiteClick}
            className="justify-center text-xs text-slate-500 hover:text-indigo-600"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface ProviderListProps {
  configuredProviders: ProviderInfo[];
  unconfiguredProviders: ProviderInfo[];
  onConfigure: (provider: ProviderInfo) => void;
  onEdit: (provider: ProviderInfo) => void;
  onDelete: (provider: ProviderInfo) => void;
  onAddCustom: () => void;
}

export function ProviderList({
  configuredProviders,
  unconfiguredProviders,
  onConfigure,
  onEdit,
  onDelete,
  onAddCustom,
}: ProviderListProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <CollapsibleSection
        title={t('provider.configured')}
        icon={CheckCircle2}
        iconColor="bg-emerald-500"
        count={configuredProviders.length}
        defaultExpanded={configuredProviders.length > 0}
      >
        {configuredProviders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {configuredProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onConfigure={() => onConfigure(provider)}
                onEdit={() => onEdit(provider)}
                onDelete={() => onDelete(provider)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            {t('provider.noConfigured')}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={t('provider.builtin')}
        icon={Settings}
        iconColor="bg-indigo-500"
        count={unconfiguredProviders.length}
        defaultExpanded={configuredProviders.length === 0}
      >
        {unconfiguredProviders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {unconfiguredProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onConfigure={() => onConfigure(provider)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            {t('provider.noBuiltin')}
          </div>
        )}
      </CollapsibleSection>

      <button
        onClick={onAddCustom}
        className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-xl
                   flex items-center justify-center gap-2 text-indigo-600
                   hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">{t('provider.addCustom')}</span>
      </button>
    </div>
  );
}
