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
    shop/               # 카탈로그·구매·보유/장착 상태와 교체 가능한 미리보기
    profile/            # 마이 프로필·주간 통계·다음 날짜 목표 예약
  constants/            # 공통 테마
  hooks/                # 공통 훅
  mocks/                # 화면과 분리한 Mock 시나리오
  services/             # 데이터 제공 인터페이스와 어댑터
  state/                # 진행 중 세션 복구·시작·종료 상태
  types/                # UI 데이터 모델 (API DTO 아님)
  utils/                # 시간 표시·임시 픽셀 에셋 유틸리티
```

내 방은 Claude Design 시안을 참고한 게임 화면으로 구현했습니다. 기본 API 모드는 로그인 후 서버의 Bolt·Level·Heart·오늘 공부시간·출석·버그 상태를 표시합니다. 상점은 서버 카탈로그와 구매 API에 연결했습니다. 마이에서는 프로필·XP·오늘/주간 공부·연속 출석을 확인하고 하루 목표를 예약할 수 있습니다. 공지·동아리와 방 꾸미기 등은 후속 작업 범위입니다.

앱을 열면 이메일 로그인·회원가입·이메일 인증 안내·비밀번호 재설정 화면을 이용할 수 있습니다. 로그인 후 내 방으로 이동하며, 마이에서 계정 조회·로그아웃을 열 수 있습니다. API 환경 변수, Web CORS·메일 callback 조건과 검증 범위는 [인증 흐름](docs/auth-flow.md)을 참고합니다.

공부 시작 → Study → 공부 끝내기 → StudyResult → 내 방 흐름을 연결했습니다. Study와 StudyResult는 루트 Stack에 있어 하단 탭을 표시하지 않습니다. 방 꾸미기·친구 방·방명록은 후속 화면 연결 전까지 비활성화되어 있습니다.

`GameServicesProvider`가 계정별 Home·Study·Shop·Profile 서비스를 제공합니다. 서버 DTO·매핑·인증 요청은 `src/services/api/`에 분리했습니다. 새 로그인에는 고정된 토큰과 새 화면 상태를 사용하며 다른 계정의 늦은 응답을 버립니다. API 호출 실패 시 Mock으로 자동 전환하지 않습니다.

상점에는 가구·벽지·캐릭터·방 확장 카테고리와 두 열 카드, 가격·등급·해금 레벨, 보유·장착 상태를 표시합니다. 새 구매는 서버에서 같은 부위의 아이템과 교체해 장착하며, 구매 후 잔액·보유 목록·장착 상태를 다시 조회합니다. Mock 상점도 공부 보상과 같은 Bolt 잔액을 사용합니다. 세부 계약과 검증 범위는 [상점 흐름](docs/shop-flow.md)을 참고합니다.

마이의 주간 차트는 월~일의 실제 공부 시간과 날짜별 목표선을 표시합니다. 목표는 30~720분, 10분 단위이며 다음 서비스 날짜의 한국시간 오전 4시부터 적용합니다. 같은 적용일에는 한 번만 예약할 수 있습니다. 화면·API·Mock 검증과 아직 연결하지 않은 설정은 [마이 흐름](docs/profile-flow.md)에 정리했습니다.

공부 시간 표시는 서버의 경과시간과 monotonic 시간 차이를 사용합니다. 활성 세션 조회·시작·종료·결과를 서버 API에 연결했으며, 중복 요청의 409는 기존 세션·결과를 조회해 처리합니다. 미전송 종료는 계정별 AsyncStorage에 최초 시각과 함께 보관하고 재실행 후 재전송합니다. 보상과 KST 날짜별 정산은 서버 결과만 표시합니다. 세부 동작·검증·실기기 확인 범위는 [서버 Study 흐름](docs/study-api-flow.md)을 참고합니다.

로컬 Mock 미리보기는 `.env.local`에 `EXPO_PUBLIC_DATA_MODE=mock`을 명시한 뒤 다시 시작합니다. 기존 `dirty`·`clean` 시나리오와 Mock 공부 테스트를 유지하며, Mock 데이터를 실제 계정으로 옮기지 않습니다. Mock 자체 설명은 [Mock Study 흐름](docs/study-flow.md)에 있습니다.

방·캐릭터·가구·아이콘은 코드로 만든 임시 SVG 픽셀 에셋입니다. `RoomPreview`의 에셋 입력을 통해 개별 교체할 수 있습니다. 실제 카탈로그 에셋·장착 아이템·서버 배치 좌표를 방 그림에 반영하는 작업은 꾸미기 단계의 범위입니다. 현재는 시스템 폰트를 사용하며, 픽셀 폰트 파일은 추가하지 않았습니다.

화면별 구현은 기능 폴더로 분리하고, 공통 UI만 `components/`에 둡니다. 공부 세션 모델·Mock의 범위와 API 교체 지점, 검증 방법은 [Study 흐름](docs/study-flow.md)을 참고합니다.

## UI 디자인 기준

팀의 Claude Design 시안 이미지와 기획파트의 v4 HTML·PNG 목업을 주요 디자인 참고자료로 사용합니다. 기능 명세를 우선하며, 화면 구현 전에 시안에서 반영할 요소를 간단히 정리합니다. 공통 스타일, 화면별 배치와 명세상 조정 사항은 [UI 디자인 기준](docs/ui-design.md)을 참고합니다. 자료와 Backend 계약을 대조한 내용은 [UI·백엔드 검토](docs/ui-backend-review.md)에 있습니다.

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
