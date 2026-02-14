import { ConfigDashboard } from '../components/Dashboard/ConfigDashboard';

/**
 * 配置页面
 * 
 * 集成配置状态总览仪表板，展示：
 * - 配置文件元数据
 * - Agent模型分配
 * - 已连接提供商
 * - 配置验证状态
 */
export function ConfigPage() {
  return <ConfigDashboard />;
}
