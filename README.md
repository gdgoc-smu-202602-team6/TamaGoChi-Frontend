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
npm test
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
    study.tsx           # 공부 모드 (/study), 하단 탭 없음
    study-result/
      [sessionId].tsx   # 저장된 공부 결과, 하단 탭 없음
  components/
    app-tabs.tsx         # Android/iOS 네이티브 탭
    app-tabs.web.tsx     # Web 하단 탭
    screen-placeholder.tsx
    examples/           # 라우트에서 분리한 Expo 예제
    ui/                 # 공통 게임 카드·버튼·진행 막대·픽셀 아이콘
  features/
    home/               # 홈 화면, 전용 컴포넌트·훅·교체 가능한 임시 에셋
    study/              # 공부·결과 화면과 경과시간 훅
  constants/            # 공통 테마
  hooks/                # 공통 훅
  mocks/                # 화면과 분리한 Mock 시나리오
  services/             # 데이터 제공 인터페이스와 어댑터
  state/                # 진행 중 세션 복구·시작·종료 상태
  types/                # UI 데이터 모델 (API DTO 아님)
  utils/                # 시간 표시·임시 픽셀 에셋 유틸리티
```

내 방은 Claude Design 시안을 참고한 게임 화면으로 구현했습니다. Bolt·Level·Heart, 방·캐릭터, 오늘 공부시간, 출석·버그 퇴치 진행률을 분리된 Mock 데이터로 표시합니다. 공지·상점·마이는 기본 화면이며 Backend API는 아직 연결하지 않습니다.

공부 시작 → Study → 공부 끝내기 → StudyResult → 내 방 흐름을 연결했습니다. Study와 StudyResult는 루트 Stack에 있어 하단 탭을 표시하지 않습니다. 방 꾸미기·친구 방·방명록은 후속 화면 연결 전까지 비활성화되어 있습니다.

홈·공부 서비스는 `src/mocks/study-backend.ts`의 로컬 Mock과 AsyncStorage를 공유합니다. 기본 초기 데이터는 `src/services/mock-backend.ts`의 `initialHome`으로 지정한 `dirty` 시나리오입니다. `src/mocks/home.ts`에 `clean` 시나리오도 있습니다. 초기 데이터는 저장소가 비어 있을 때만 적용하며, 기존 세션이나 결과를 자동으로 지우지 않습니다. `createMockHomeService`는 개별 Home 컴포넌트 확인용으로 계속 사용할 수 있습니다.

공부 시간은 저장된 시작 시각과 현재 시각의 차이로 표시합니다. 새로고침·앱 재실행 후 진행 중 세션을 복구하며, 새 공부 시작 전에 `expo-network`로 연결 상태를 확인합니다. 종료 결과와 Bolt·출석·버그 진행은 한 번에 저장하고, 같은 세션의 종료 재시도는 기존 결과를 반환합니다. 실제 서버 API는 아직 연결하지 않았습니다.

방·캐릭터·가구·아이콘은 코드로 만든 임시 SVG 픽셀 에셋입니다. `RoomPreview`의 에셋 입력을 통해 개별 교체할 수 있습니다. 현재는 시스템 폰트를 사용하며, 픽셀 폰트 파일은 추가하지 않았습니다.

화면별 구현은 기능 폴더로 분리하고, 공통 UI만 `components/`에 둡니다. 공부 세션 모델·Mock의 범위와 API 교체 지점, 검증 방법은 [Study 흐름](docs/study-flow.md)을 참고합니다.

## UI 디자인 기준

팀의 Claude Design 시안 이미지를 주요 디자인 참고자료로 사용합니다. 기능 명세를 우선하며, 화면 구현 전에 시안에서 반영할 요소를 간단히 정리합니다. 공통 스타일, 화면별 배치와 명세상 조정 사항은 [UI 디자인 기준](docs/ui-design.md)을 참고합니다.

## 확인 방법

- 내 방 → 공지 → 상점 → 마이 → 내 방 순서로 눌러 화면과 선택 표시가 바뀌는지 확인합니다.
- Web에서 `/notice`, `/shop`, `/mypage`로 직접 접속하거나 새로고침해도 해당 탭이 선택되는지 확인합니다.
- 좁은 화면과 다크모드에서도 탭과 화면 내용이 보이는지 확인합니다.
- 내 방에서 Bolt·Level, 하트 4칸, 버그 수, 누적 공부시간과 두 진행 막대를 확인합니다. 작은 화면에서는 홈 안에서 스크롤하여 버튼과 하단 항목을 확인합니다.
- `clean` Mock에서는 버그와 퇴치 진행 막대가 사라지고 출석 완료·깨끗한 방·공부 시작 문구로 바뀌는지 확인합니다.
- Android에서 뒤로가기를 누르면 내 방 탭으로 돌아가는지 확인합니다.
- 공부를 시작한 뒤 `/study`에서 새로고침해도 같은 세션의 시간이 이어지는지 확인합니다. 세션이 실행 중인 상태로 내 방에 돌아오면 `진행 중인 공부 보기`로 돌아갈 수 있습니다.
- 공부를 종료한 뒤 결과를 새로고침해도 Bolt가 중복 지급되지 않고, 내 방 복귀 시 누적 시간·출석·버그 진행이 갱신되는지 확인합니다.
- `npm test`로 시간 경계·복구·중복 처리·보상·저장 실패 관련 테스트를 실행합니다. 테스트 빌드 결과는 Git에서 제외된 `.expo/tests/`에 생성합니다.

## 협업

`main`에서 직접 구현하지 않고 기능 브랜치에서 작업 후 PR로 통합합니다. 기능별 담당자는 아직 지정하지 않습니다. 루트/탭 레이아웃, 탭 컴포넌트, 공통 테마와 패키지 설정을 변경할 때는 수정 범위를 팀원과 공유합니다.

커밋 전 타입 검사와 린트를 실행하고 Conventional Commit 형식을 사용합니다. Codex가 작업한 커밋에는 마지막 trailer로 `Co-authored-by: Codex <noreply@openai.com>`을 추가합니다. Push는 현재 feature 브랜치만 `origin`으로 진행합니다.

기존 테마와 예제 자산은 재사용할 수 있도록 보존했습니다. `npm run reset-project`는 현재 작업한 소스까지 이동하거나 삭제하므로 초기화가 필요한 경우에만 사용합니다.

참고: [Expo Router 레이아웃](https://docs.expo.dev/router/basics/navigation-layouts/), [SDK 58 Native Tabs](https://docs.expo.dev/versions/v58.0.0/sdk/router/native-tabs/).
