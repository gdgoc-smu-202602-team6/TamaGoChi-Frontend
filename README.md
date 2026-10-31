# 다마GoC치 (TamaGoChi)

공부 시간으로 꾸미는 나만의 공간. Expo SDK 58 · React Native · TypeScript · Expo Router로 개발하는 모바일 앱입니다.

## 실행

```bash
npm ci
npm start
```

Metro 터미널에서 `a`는 Android, `w`는 Web을 실행합니다. Android는 연결된 기기 또는 실행 중인 에뮬레이터가 필요합니다. Windows에서 iOS 시뮬레이터는 실행할 수 없습니다.

```bash
npm run web
npm run android
npm run typecheck
npm run lint
```

PowerShell 실행 정책으로 npm 실행이 막히면 `npm.cmd` 또는 `npx.cmd`를 사용합니다.

## 현재 화면과 구조

```text
src/
  app/
    _layout.tsx          # 루트 Stack, 테마, 스플래시
    (tabs)/
      _layout.tsx        # 메인 탭 레이아웃
      index.tsx          # 내 방 (/)
      notice.tsx         # 공지 (/notice)
      shop.tsx           # 상점 (/shop)
      mypage.tsx         # 마이 (/mypage)
  components/
    app-tabs.tsx         # Android/iOS 네이티브 탭
    app-tabs.web.tsx     # Web 하단 탭
    screen-placeholder.tsx
    examples/           # 라우트에서 분리한 Expo 예제
    ui/                 # 공통 게임 카드·버튼·진행 막대·픽셀 아이콘
  features/
    home/               # 홈 화면, 전용 컴포넌트·훅·교체 가능한 임시 에셋
  constants/            # 공통 테마
  hooks/                # 공통 훅
  mocks/                # 화면과 분리한 Mock 시나리오
  services/             # 데이터 제공 인터페이스와 어댑터
  types/                # UI 데이터 모델 (API DTO 아님)
  utils/                # 시간 표시·임시 픽셀 에셋 유틸리티
```

내 방은 Claude Design 시안을 참고한 게임 화면으로 구현했습니다. Bolt·Level·Heart, 방·캐릭터, 오늘 공부시간, 출석·버그 퇴치 진행률을 분리된 Mock 데이터로 표시합니다. 공지·상점·마이는 기본 화면이며 Backend API는 아직 연결하지 않습니다.

공부 시작·방 꾸미기·친구 방·방명록은 후속 화면 연결 전까지 비활성화되어 있습니다. 각 연결용 콜백은 `HomeScreen`에 분리되어 있으며, 공부 세션을 생성하거나 재화를 지급하지 않습니다.

홈 데이터 흐름은 `HomeScreen → useHome → HomeService → Mock`입니다. `src/mocks/home.ts`에 `dirty`/`clean` 시나리오가 있고, 기본은 `dirty`입니다. `src/services/home.ts`의 `createMockHomeService(mockHomeScenarios.clean)`으로 깨끗한 방 시나리오를 선택할 수 있습니다. 실제 API 계약이 전달되면 서비스 어댑터에서 응답을 UI 모델로 변환합니다.

방·캐릭터·가구·아이콘은 코드로 만든 임시 SVG 픽셀 에셋입니다. `RoomPreview`의 에셋 입력을 통해 개별 교체할 수 있습니다. 현재는 시스템 폰트를 사용하며, 픽셀 폰트 파일은 추가하지 않았습니다.

공부·공부 결과·방 꾸미기처럼 하단 탭이 없는 화면은 이후 `(tabs)` 밖의 루트 Stack에 추가합니다. 화면별 구현은 기능 폴더로 분리하고, 공통 UI만 `components/`에 둡니다.

## UI 디자인 기준

팀의 Claude Design 시안 이미지를 주요 디자인 참고자료로 사용합니다. 기능 명세를 우선하며, 화면 구현 전에 시안에서 반영할 요소를 간단히 정리합니다. 공통 스타일, 화면별 배치와 명세상 조정 사항은 [UI 디자인 기준](docs/ui-design.md)을 참고합니다.

## 확인 방법

- 내 방 → 공지 → 상점 → 마이 → 내 방 순서로 눌러 화면과 선택 표시가 바뀌는지 확인합니다.
- Web에서 `/notice`, `/shop`, `/mypage`로 직접 접속하거나 새로고침해도 해당 탭이 선택되는지 확인합니다.
- 좁은 화면과 다크모드에서도 탭과 화면 내용이 보이는지 확인합니다.
- 내 방에서 Bolt·Level, 하트 4칸, 버그 수, 누적 공부시간과 두 진행 막대를 확인합니다. 작은 화면에서는 홈 안에서 스크롤하여 버튼과 하단 항목을 확인합니다.
- `clean` Mock에서는 버그와 퇴치 진행 막대가 사라지고 출석 완료·깨끗한 방·공부 시작 문구로 바뀌는지 확인합니다.
- Android에서 뒤로가기를 누르면 내 방 탭으로 돌아가는지 확인합니다.

## 협업

`main`에서 직접 구현하지 않고 기능 브랜치에서 작업 후 PR로 통합합니다. 기능별 담당자는 아직 지정하지 않습니다. 루트/탭 레이아웃, 탭 컴포넌트, 공통 테마와 패키지 설정을 변경할 때는 수정 범위를 팀원과 공유합니다.

기존 테마와 예제 자산은 재사용할 수 있도록 보존했습니다. `npm run reset-project`는 현재 작업한 소스까지 이동하거나 삭제하므로 초기화가 필요한 경우에만 사용합니다.

참고: [Expo Router 레이아웃](https://docs.expo.dev/router/basics/navigation-layouts/), [SDK 58 Native Tabs](https://docs.expo.dev/versions/v58.0.0/sdk/router/native-tabs/).
