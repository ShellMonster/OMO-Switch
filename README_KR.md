# 🔄 OMO Switch

[![GitHub stars](https://img.shields.io/github/stars/ShellMonster/OMO-Switch?style=flat-square)](https://github.com/ShellMonster/OMO-Switch/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ShellMonster/OMO-Switch/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/ShellMonster/OMO-Switch?style=flat-square)](https://github.com/ShellMonster/OMO-Switch/releases)
![React](https://img.shields.io/badge/React-18.3.1-blue.svg?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131.svg?style=flat-square)
![Rust](https://img.shields.io/badge/Rust-1.75-000000.svg?style=flat-square)

[English](README_EN.md) | [简体中文](README.md) | [繁體中文](README_TW.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

**OMO Switch**는 [oh-my-opencode](https://github.com/oh-my-opencode/oh-my-opencode)를 위한 데스크톱 모델 설정 관리 도구입니다. **Tauri 2.0**을 기반으로 구축되어 AI 모델 전환, 프리셋 관리, 모델 라이브러리 탐색 및 자동 업데이트 기능을 제공합니다.

<p align="center">
  <img src="assets/demo_1.png" alt="OMO Switch 미리보기" width="800">
</p>

> 💡 **핵심 기능**：
> - **🤖 Agent 모델 전환**: 모든 Agent의 모델 설정을 시각적으로 관리
> - **📊 설정 개요**: 설정 상태, 연결된 공급자, 모델 할당을 실시간으로 확인
> - **🔑 Provider 관리**: API Key 및 모델 공급자 구성 및 관리
> - **💾 프리셋 관리**: 다양한 모델 설정 프리셋을 저장하고 로드
> - **🌐 모델 라이브러리**: 사용 가능한 모델, 가격 및 기능 정보 탐색
> - **📥 가져오기/내보내기**: 설정 파일 백업 및 복원
> - **🔄 자동 업데이트**: 한 번의 클릭으로 업데이트 확인 및 자동 다운로드 및 설치
> - **🌍 다국어 지원**: 중/영/일/한 5개 언어 지원

---

## 🌟 핵심 특징

- **🚀 최고의 성능**: **Tauri 2.0** + **React 18** 기반, 가볍고 빠륾며 리소스 사용량이 매우 낮음
- **🎨 현대적인 UI**: Tailwind CSS로 디자인되어 깔끔하고 아름다운 인터페이스
- **🔄 실시간 동기화**: 설정 변경이 즉시 적용되며 원본 설정을 자동 백업
- **💾 스마트 프리셋**: 여러 설정 프로파일을 저장하고 한 번의 클릭으로 다른 장면 전환
- **📦 자동 업데이트**: Tauri Updater를 통합하여 새 버전을 자동 알림하고 한 번의 클릭으로 설치
- **🌍 다국어**: 간체中文, 번체中文, 영어, 일본어, 한국어를 완전히 지원
- **🛡️ 안전하고 신뢰할 수 있음**: 모든 설정 작업 전에 자동 백업, 설정 검증 지원

---

## 🚀 기능 상세 설명

### 1. Agent 모델 전환
- **시각적 설정**: 모든 Agent의 모델 및 강도 수준을 그래픽으로 관리
- **일괄 작업**: Agent 설정 일괴 수정 지원
- **카테고리 관리**: 카테고리(Category)별로 Agent를 구성하여 일괄 설정이 용이
- **실시간 미리보기**: 설정 변경이 실시간으로 표시되며 수정 후 즉시 적용

### 2. 설정 개요
- **상태 모니터링**: 설정 파일 경로, 크기, 수정 시간을 실시간으로 표시
- **공급자 목록**: 연결된 모델 공급자 보기
- **모델 할당표**: 모든 Agent의 모델 할당을 한눈에 확인
- **설정 검증**: 설정 형식의 정확성을 자동으로 검증

### 3. 프리셋 관리
- **빠른 저장**: 현재 설정을 한 번의 클릭으로 프리셋으로 저장
- **다중 프리셋 전환**: 여러 프리셋을 생성하여 다른 작업 시나리오에 적응
- **프리셋 통계**: 프리셋에 포함된 Agent 및 Category 수를 표시
- **가져오기/낳볂내기**: 프리셋 설정 가져오기/낳볂내기 지원

### 4. 모델 라이브러리
- **모델 목록**: 사용 가능한 모든 모델 및 해당 공급자 보기
- **가격 정보**: 모델의 입력/출력 가격을 표시
- **기능 설명**: 모델 기능 및 사용 시나리오 확인
- **빠른 적용**: 한 번의 클릭으로 지정된 Agent에 모델 적용

### 5. 가져오기/낳볂내기
- **완전한 백업**: 모든 설정을 JSON 파일로 낳볂내기
- **안전한 가져오기**: 가져오기 전에 현재 설정을 자동으로 백업
- **히스토리**: 가져오기/낳볂내기 작업 히스토리 보기
- **장치 간 동기화**: 설정 파일을 통해 다른 장치 간 동기화

### 6. 설정 센터
- **언어 전환**: 5개 언어를 실시간으로 전환
- **버전 감지**: OpenCode 및 oh-my-opencode 버전 감지
- **자동 업데이트**: 앱 업데이트를 확인하고 한 번의 클릭으로 다운로드 및 설치
- **GitHub 링크**: 프로젝트 저장소에 빠르게 액세스

---

## 🏗️ 기술 아키텍처

### 핵심 기술 스택
- **프론트엔드**: React 18 + TypeScript + Tailwind CSS + Zustand
- **데스크톱 프레임워크**: Tauri 2.0 (Rust)
- **상태 관리**: Zustand + persist 미들웨어
- **다국어**: react-i18next
- **아이콘**: Lucide React
- **빌드 도구**: Vite

---

## 💻 개발자 가이드

### 1. 환경 준비
- **Node.js**: 18+ (20 사용 권장)
- **Rust**: 1.75+ (Tauri 빌드에 필수)
- **Bun** 또는 **npm**: 패키지 관리자

### 2. 의존성 설치
```bash
# bun 사용 (권장)
bun install

# 또는 npm 사용
npm install
```

### 3. 개발 모드
```bash
# 개발 서버 시작
bun run tauri:dev

# 또는 npm 사용
npm run tauri:dev
```

### 4. 애플리케이션 빌드
```bash
# 프로덕션 버전 빌드
bun run tauri:build

# 또는 npm 사용
npm run tauri:build
```

---

## 🔄 자동 업데이트 설정

프로젝트는 Tauri 공식 Updater 플러그인을 통합하여 자동 업데이트 확인 및 한 번의 클릭 설치를 지원합니다.

### 설정 단계

1. **서명 키 생성** (한 번만, 개인 키를 안전하게 보관)
```bash
cd src-tauri
bun run tauri signer generate -- -w ~/.tauri/omo-switch.key
```

2. **공개 키 설정**: `src-tauri/tauri.conf.json`에 공개 키 추가

3. **GitHub Secrets 설정**:
   - `TAURI_SIGNING_PRIVATE_KEY`: 개인 키 파일 내용
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: 개인 키 비밀번호(설정된 경우)

---

## 📄 오픈 소스 라이선스

이 프로젝트는 [MIT License](LICENSE)에 따라 오픈 소스로 공개되어 있습니다.

---

## 🙏 감사의 글

- 이 프로젝트는 [Tauri](https://tauri.app/)를 기반으로 구축되었습니다. Tauri 팀에 감사드립니다
- 강력한 Agent 프레임워크를 제공해 주신 [oh-my-opencode](https://github.com/oh-my-opencode/oh-my-opencode)에 감사드립니다
- 모든 기여자와 사용자의 지원에 감사드립니다

---

## 📞 문의하기

- **GitHub**: [https://github.com/ShellMonster/OMO-Switch](https://github.com/ShellMonster/OMO-Switch)
- **Issues**: [https://github.com/ShellMonster/OMO-Switch/issues](https://github.com/ShellMonster/OMO-Switch/issues)

---

<p align="center">
  Made with ❤️ by OMO Team
</p>
