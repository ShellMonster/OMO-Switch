# Issues - OMO Model Switcher

## Problems & Gotchas

(Issues encountered and how they were resolved)

## [2026-02-14] Task 1: Rust 版本兼容性问题

**问题**: time crate 0.3.47 需要 Rust 1.88.0，但系统 Rust 版本是 1.87.0

**解决方案**: 降级 time crate 到 0.3.36
```bash
cargo update time --precise 0.3.36
```

**影响**: 无功能影响，只是使用了稍旧的 time crate 版本

---

## [2026-02-14] Task 1: 缺少图标文件

**问题**: src-tauri/icons/ 目录不存在，导致 cargo build 失败

**解决方案**: 从参考项目复制图标文件
```bash
cp -r /Users/daozhang/Trae_AI/文生图前后端/desktop/src-tauri/icons /Users/daozhang/Trae_AI/OMO模型插件/omo-model-switcher/src-tauri/
```

**注意**: 生产环境需要替换为 OMO Model Switcher 的专属图标

