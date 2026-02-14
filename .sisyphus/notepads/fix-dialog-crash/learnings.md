# Fix Dialog Crash - Learnings

## 2026-02-14 修复记录

### 问题现象
App 打包成功但启动后图标闪现即消失（闪退）。

### 根因
Tauri 2 的 dialog 插件在 `tauri.conf.json` 中配置了无效的参数：
```json
"plugins": {
  "dialog": {
    "all": true,
    "open": true,
    "save": true
  }
}
```

Tauri 2 dialog 插件**不接受任何配置参数**，期望的是 unit 类型（空）。

### 错误信息
```
PluginInitialization("dialog", "Error deserializing 'plugins.dialog' within your Tauri configuration: invalid type: map, expected unit")
```

### 解决方案
将配置改为空对象：
```json
"plugins": {}
```

### 关键区别
- **Tauri 1.x**: dialog 插件需要在 `tauri.conf.json` 中配置权限
- **Tauri 2.x**: dialog 插件不接受配置，权限通过 Capability 系统管理

### 验证步骤
1. ✅ 修复 `tauri.conf.json`
2. ✅ `cargo test` - 20 个测试通过
3. ✅ `npm run tauri build` - 构建成功
4. ✅ App 启动后进程存活 3 秒以上

### 注意事项
- DMG 打包脚本可能因环境原因失败，但 `.app` 文件可正常使用
- Dialog 权限在 Tauri 2 中通过 `capabilities/` 目录配置，而非 `tauri.conf.json`

### 提交记录
- Commit: `e210f63`
- Message: `fix(config): remove invalid dialog plugin config causing crash`
