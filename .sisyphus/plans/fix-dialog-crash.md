# 修复 OMO Model Switcher 启动闪退

## TL;DR

> **概要**: 修复 Tauri 2 dialog 插件配置错误导致的 App 启动闪退，重新打包并验证。
>
> **交付物**:
> - 修复后的 `tauri.conf.json`
> - 重新打包的 DMG 安装包
> - 验证 App 正常启动
>
> **预估工作量**: Quick（5分钟）
> **并行执行**: NO — 顺序执行
> **关键路径**: 修复配置 → 重新打包 → 验证启动

---

## Context

### 原始问题
App 打包成功（DMG 4.0MB），但双击打开后图标闪现即消失（闪退）。

### 根因分析
启动时报错：
```
PluginInitialization("dialog", "Error deserializing 'plugins.dialog' within your Tauri configuration: invalid type: map, expected unit")
```

`src-tauri/tauri.conf.json` 中 `plugins.dialog` 配置了一个对象 `{"all": true, "open": true, "save": true}`，但 Tauri 2 的 dialog 插件不接受任何配置参数（期望 unit 类型，即空值）。Dialog 权限应通过 Tauri 2 的 capability 系统管理，而非 config 文件。

---

## Work Objectives

### 核心目标
移除 `tauri.conf.json` 中无效的 `plugins.dialog` 配置，使 App 正常启动。

### 具体交付
- 修复后的 `tauri.conf.json`
- 重新生成的 release build 和 DMG

### 完成标准
- [x] App 正常启动，不闪退（.app 文件可直接运行）
- [x] 20 个 Rust 测试全部通过
- [x] 前端构建成功

### Must NOT Have（护栏）
- 不要改动 dialog 插件的 Rust 代码（`main.rs` 中的 `tauri_plugin_dialog::init()` 是正确的）
- 不要改动 capabilities 配置
- 不要改动其他任何文件

---

## Verification Strategy

### Test Decision
- **基础设施存在**: YES
- **自动化测试**: YES（已有 20 个 Rust 测试）
- **框架**: cargo test

### Agent-Executed QA Scenarios (MANDATORY)

所有验证由 agent 自动执行，无需人工操作。

---

## TODOs

- [x] 1. 修复 tauri.conf.json 并重新打包

  **What to do**:
  - 打开 `omo-model-switcher/src-tauri/tauri.conf.json`
  - 将第 26-32 行的：
    ```json
    "plugins": {
      "dialog": {
        "all": true,
        "open": true,
        "save": true
      }
    },
    ```
    替换为：
    ```json
    "plugins": {},
    ```
  - 运行 Rust 测试确认无破坏：`cd omo-model-switcher/src-tauri && cargo test`
  - 重新打包：`cd omo-model-switcher && npm run tauri build`
  - 验证 App 启动

  **Must NOT do**:
  - 不要修改 `main.rs` 或任何 Rust 源码
  - 不要修改 capabilities 配置
  - 不要修改前端代码

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - 纯配置修改 + 构建，无需特殊技能
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 不涉及 UI 改动
    - `playwright`: 这是桌面 App，不是 Web

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None（最终任务）
  - **Blocked By**: None（可立即开始）

  **References**:

  **Pattern References**:
  - `omo-model-switcher/src-tauri/tauri.conf.json:26-32` — 需要修改的 plugins.dialog 配置（当前值无效）

  **API/Type References**:
  - Tauri 2 dialog 插件不接受配置参数，期望 unit 类型（空）

  **Documentation References**:
  - 错误信息：`PluginInitialization("dialog", "Error deserializing 'plugins.dialog' within your Tauri configuration: invalid type: map, expected unit")`

  **WHY Each Reference Matters**:
  - `tauri.conf.json:26-32` — 这是唯一需要改的地方，把 dialog 对象配置清空即可

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

   - [x] `tauri.conf.json` 中 `plugins` 值为 `{}`（空对象）
   - [x] `cd omo-model-switcher/src-tauri && cargo test` → 20 tests passed
   - [x] `cd omo-model-switcher && npm run tauri build` → 构建成功，.app 已生成
   - [x] App 启动不闪退

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: App 启动不再闪退
    Tool: Bash
    Preconditions: 构建完成，.app 文件存在
    Steps:
      1. 运行: "/Users/daozhang/Trae_AI/OMO模型插件/omo-model-switcher/src-tauri/target/release/bundle/macos/OMO Model Switcher.app/Contents/MacOS/omo-model-switcher" 2>&1 &
      2. 等待 3 秒
      3. 检查进程是否存在: pgrep -f "omo-model-switcher"
      4. Assert: 进程存在（PID 返回非空）
      5. 检查 stderr 无 PluginInitialization 错误
      6. 终止进程: pkill -f "omo-model-switcher"
    Expected Result: App 进程持续运行，无闪退，无 PluginInitialization 错误
    Evidence: 进程列表输出 + stderr 捕获

  Scenario: Rust 测试全部通过
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd omo-model-switcher/src-tauri && cargo test 2>&1
      2. Assert: 输出包含 "test result: ok. 20 passed"
      3. Assert: 输出不包含 "FAILED"
    Expected Result: 20 个测试全部通过
    Evidence: cargo test 输出
  ```

  **Evidence to Capture:**
  - [ ] cargo test 输出截图
  - [ ] App 启动后进程列表
  - [ ] DMG 文件路径和大小

  **Commit**: YES
  - Message: `fix(config): remove invalid dialog plugin config causing crash`
  - Files: `src-tauri/tauri.conf.json`
  - Pre-commit: `cargo test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(config): remove invalid dialog plugin config causing crash` | `src-tauri/tauri.conf.json` | `cargo test` + App 启动验证 |

---

## Success Criteria

### Verification Commands
```bash
cd omo-model-switcher/src-tauri && cargo test  # Expected: 20 passed
cd omo-model-switcher && npm run tauri build    # Expected: DMG generated
# App 启动后进程存活 3 秒以上，无 PluginInitialization 错误
```

### Final Checklist
- [x] `plugins.dialog` 配置已移除
- [x] 20 个 Rust 测试通过
- [x] .app 文件已生成（DMG 脚本失败但不影响使用）
- [x] App 正常启动不闪退
