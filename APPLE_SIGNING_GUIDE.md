# Apple 签名配置指南

## 前置要求
- Apple Developer 账号（$99/年）
- Mac 电脑

## 步骤

### 1. 创建证书签名请求 (CSR)
```bash
# 在 Mac 上打开终端，运行：
cd ~/Desktop
openssl genrsa -out omo-switch.key 2048
openssl req -new -key omo-switch.key -out omo-switch.csr \
  -subj "/emailAddress=your-email@example.com, CN=OMO Switch, C=CN"
```

### 2. 在 Apple Developer 网站创建证书
1. 访问 https://developer.apple.com/account/resources/certificates/list
2. 点击 + 号创建新证书
3. 选择 **Developer ID Application**（用于发布到 GitHub）
4. 上传刚才创建的 `omo-switch.csr` 文件
5. 下载证书（`.cer` 文件）

### 3. 导出为 .p12 格式
```bash
# 双击下载的 .cer 文件，导入到钥匙串访问
# 在钥匙串访问中找到该证书，右键导出为 .p12 格式
# 设置导出密码（记住这个密码）
```

### 4. 转换为 Base64
```bash
# 将 .p12 文件转为 base64（用于 GitHub Secrets）
base64 -i OMO-Switch.p12 -o certificate-base64.txt
```

### 5. 配置 GitHub Secrets
在 GitHub 仓库页面：
- Settings → Secrets and variables → Actions → New repository secret

添加两个 Secrets：
- **Name**: `APPLE_CERTIFICATE`
  **Value**: 粘贴 `certificate-base64.txt` 的内容
  
- **Name**: `APPLE_CERTIFICATE_PASSWORD`
  **Value**: 你导出 .p12 时设置的密码

### 6. 验证
推送一个标签测试：
```bash
git tag v0.1.1
git push origin v0.1.1
```

在 GitHub Actions 中查看构建日志，应该会显示签名成功。

---

## 替代方案（无签名）
如果不购买 Apple Developer 账号，构建的 app 会显示：
> "无法打开，因为无法验证开发者"

用户需要在 **系统设置 → 隐私与安全性** 中点击"仍要打开"。

对于开源工具来说，这是可接受的。
