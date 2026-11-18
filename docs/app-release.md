# 앱 배포: TestFlight 빌드와 EAS Update

설치된 앱에 수정 사항을 반영하는 방법은 두 가지다.

| 무엇을 바꿨나 | 방법 | 걸리는 시간 |
| --- | --- | --- |
| 화면, 로직, 문구, 이미지 (JS·에셋) | **EAS Update** (OTA) | 몇 분, 앱 재시작 시 반영 |
| 네이티브 코드가 있는 라이브러리 추가·업데이트, Expo SDK 업그레이드, `app.json`의 아이콘·권한·플러그인·스플래시 등 네이티브 설정 | **새 빌드** (TestFlight) | 빌드 10~20분 + Apple 처리 10~30분 |

## EAS Update 보내기

```bash
npm run update:production -- "홈 화면 버튼 위치 수정"
```

- `production` 채널 = TestFlight/App Store 빌드. 내부 배포(`preview` 프로필) 빌드에는 `npm run update:preview -- "메시지"`.
- 스크립트(`scripts/eas-update.cjs`)는 `eas.json`의 해당 build 프로필 `env`(`EXPO_PUBLIC_*`)를 그대로 넣어 빌드와 같은 API 설정으로 업데이트를 만든다. `eas update --environment`는 로컬 `.env` 파일을 읽지 않으므로 `.env.local`의 값은 업데이트에 들어가지 않는다.
- 테스터는 앱을 완전히 종료했다가 다시 연다. 업데이트는 실행할 때 백그라운드로 받고 **그다음 실행**에 적용되므로 최대 두 번 껐다 켜야 할 수 있다.
- 문제가 생긴 업데이트는 `npx eas-cli@latest update:rollback`으로 직전 업데이트(없으면 빌드에 들어 있던 버전)로 되돌린다.

## 새 빌드 올리기 (TestFlight)

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

빌드 번호는 EAS가 자동으로 올린다(`appVersionSource: remote`, `autoIncrement`).

## 런타임 버전 규칙 (중요)

`runtimeVersion` 정책은 `appVersion`이다. 업데이트는 `app.json`의 `version`(현재 `1.0.0`)이 같은 빌드에만 전달된다.

- 네이티브 변경(위 표의 "새 빌드" 항목)을 했다면 **반드시 `app.json`의 `version`을 올리고**(예: `1.0.0` → `1.0.1`) 새 빌드를 만든다.
- `version`을 올리지 않고 네이티브 변경이 섞인 업데이트를 보내면, 이전 빌드가 없는 네이티브 모듈을 찾다가 실행 중 오류가 날 수 있다.
- JS만 바꾼 경우에는 `version`을 그대로 두고 업데이트만 보낸다.
