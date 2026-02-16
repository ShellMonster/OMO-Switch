import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { toast } from '../common/Toast';
import { listPresets, loadPreset, savePreset } from '../../services/tauri';
import { usePresetStore } from '../../store/presetStore';

interface PresetSelectorProps {
  onLoadPreset?: () => void; // 加载预设后的回调
}

/**
 * 预设选择器组件
 *
 * 功能特性：
 * - 下拉选择器显示所有预设 + 默认配置选项
 * - 切换预设时自动应用配置
 * - "另存为"按钮保存当前配置为新预设
 * - 所有操作都有 Toast 提示
 *
 * 设计思路：
 * - 与 AgentPage 头部风格保持一致（圆角、渐变背景）
 * - 紧凑布局，适合放在页面顶部作为快速操作栏
 */
export function PresetSelector({ onLoadPreset }: PresetSelectorProps) {
  const { t } = useTranslation();

  // 从状态管理获取当前激活的预设和预设列表缓存
  const {
    activePreset,
    setActivePreset,
    clearActivePreset,
    presetList,
    setPresetList,
    isLoadingPresetList,
    setIsLoadingPresetList,
  } = usePresetStore();

  // 本地状态
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /**
   * 加载预设列表（仅当缓存为空时才调用 API）
   */
  const loadPresetListIfNeeded = async () => {
    // 如果已有缓存且不在加载中，直接返回
    if (presetList.length > 0 || isLoadingPresetList) {
      return;
    }

    setIsLoadingPresetList(true);
    try {
      const names = await listPresets();
      setPresetList(names);
    } catch (err) {
      console.error('Failed to load preset list:', err);
    } finally {
      setIsLoadingPresetList(false);
    }
  };

  // 组件挂载时加载预设列表（有缓存则跳过）
  useEffect(() => {
    loadPresetListIfNeeded();
  }, []);

  /**
   * 处理预设选择变化
   * - 选择空值（默认配置）：清除激活状态
   * - 选择预设：加载预设并设置为激活状态
   */
  const handleSelectChange = async (value: string) => {
    // 选择默认配置
    if (value === '') {
      try {
        clearActivePreset();
        toast.success(t('presetSelector.switchSuccess', { name: t('presetSelector.default') }));
        onLoadPreset?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('presetSelector.switchFailed'));
      }
      return;
    }

    // 选择具体预设
    setIsLoading(true);
    try {
      await loadPreset(value);
      setActivePreset(value);
      toast.success(t('presetSelector.switchSuccess', { name: value }));
      onLoadPreset?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('presetSelector.switchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理"另存为"操作
   * 保存当前配置为新预设
   */
  const handleSaveAs = async () => {
    // 验证输入
    if (!newPresetName.trim()) {
      return;
    }

    const name = newPresetName.trim();
    setIsSaving(true);

    try {
      // 调用后端保存预设
      await savePreset(name);
      // 设置为当前激活预设
      setActivePreset(name);
      // 刷新预设列表缓存
      const names = await listPresets();
      setPresetList(names);
      // 关闭弹窗
      setShowSaveModal(false);
      setNewPresetName('');
      // 显示成功提示
      toast.success(t('presetSelector.saveSuccess', { name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('presetSelector.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 构建下拉选项
   * - 第一项：默认配置（value 为空字符串）
   * - 其他项：从 listPresets 获取的预设名称
   */
  const selectOptions = [
    { value: '', label: t('presetSelector.default') },
    ...presetList.map((name: string) => ({ value: name, label: name })),
  ];

  // 当前选中的值（null 转换为空字符串以匹配默认选项）
  const currentValue = activePreset ?? '';

  return (
    <>
      <Select
        value={currentValue}
        onChange={handleSelectChange}
        options={selectOptions}
        disabled={isLoading}
        placeholder={t('select.placeholder')}
      />

      {/* 另存为弹窗 */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setNewPresetName('');
        }}
        title={t('presetSelector.saveAs')}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowSaveModal(false);
                setNewPresetName('');
              }}
              disabled={isSaving}
            >
              {t('button.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAs}
              isLoading={isSaving}
              disabled={!newPresetName.trim()}
            >
              {t('button.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('presetManager.presetName')}
            </label>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder={t('presetManager.presetNamePlaceholder')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPresetName.trim() && !isSaving) {
                  handleSaveAs();
                }
              }}
            />
          </div>
          <p className="text-sm text-slate-500">
            {t('presetManager.saveDescription')}
          </p>
        </div>
      </Modal>
    </>
  );
}
