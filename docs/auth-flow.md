# 이메일 인증 흐름

## 현재 범위

이메일 로그인·회원가입 → 이메일 인증 안내, 인증 메일 재요청, 비밀번호 재설정 요청·새 비밀번호 입력과 내 계정을 구현했다. API 모드는 로그인 후 내 방으로 이동하고 마이에서 내 계정을 연다. 화면은 v4 목업의 캐릭터·하늘색 배경·크림 카드·네이비 테두리·노란 선택 상태와 버튼을 사용한다. 캐릭터와 폰트는 기존 임시 에셋·시스템 폰트다.

인증 서비스는 실제 Backend 경로를 호출한다. 후속 Home·Study 연동부터 기본 API 모드는 로그인 후 서버의 내 방으로 이동한다. 게임 탭·공부·결과는 인증 복구 후 접근하고, 401에 인증을 다시 확인한다. Mock은 `EXPO_PUBLIC_DATA_MODE=mock`을 명시한 개발 미리보기로 분리했다. 계정과 게임 API 요청 격리·종료 복구 정책은 [서버 Study 흐름](study-api-flow.md)을 참고한다. Mock 재화·기록을 로그인 계정의 서버 데이터로 업로드하거나 합치지 않는다.

Google/Kakao는 공유 명세의 범위에 유지하지만, 확인한 Backend `main`에는 소셜 공급자가 설정되어 있지 않아 작동하는 버튼으로 추가하지 않았다. 동아리 가입 승인으로 개인 공부 기능을 제한하는 가드도 추가하지 않았다.

## 라우트

| 경로 | 기능 |
| --- | --- |
| `/login` | 이메일·비밀번호 로그인. 미인증 오류에 인증 메일 확인 진입을 제공한다. |
| `/signup` | 닉네임·이메일·비밀번호로 가입하고 인증 안내로 이동한다. 가입 성공만으로 인증 상태를 만들지 않는다. |
| `/verify-email` | 이메일 확인·재발송. 이메일 링크를 열어 서버에서 인증한 뒤 앱으로 돌아와 로그인한다. |
| `/forgot-password` | 재설정 메일을 요청한다. 계정 존재 여부를 확정하는 성공 문구를 표시하지 않는다. |
| `/reset-password?token=...` | 새 비밀번호·확인 입력. 토큰 누락·중복 query·링크 오류는 제출을 막는다. |
| `/account` | 인증된 내 계정 조회·로그아웃. 직접 접근 시 복구를 기다리고, 세션이 없으면 로그인으로 이동한다. |

인증·계정 화면은 루트 Stack에 있어 하단 게임 탭을 표시하지 않는다. 비밀번호와 이메일은 라우트 params에 넣지 않는다. 인증 안내의 이메일 초깃값은 메모리에만 유지한다. 재설정 토큰은 메일 callback의 query에서 받아 API 본문으로만 보내고, 화면·오류·로그에 출력하거나 저장하지 않는다. 새 토큰으로 화면이 바뀌면 폼 상태도 초기화한다.

## 계약과 계층

```text
Auth screens → AuthProvider / useAuthAction → AuthService
  → createHttpClient → Backend
  → TokenStore → Native SecureStore / Web sessionStorage
```

Backend 기준은 [검토 문서](ui-backend-review.md)의 pinned commit과 better-auth `1.7.14`다. 인증은 해당 라이브러리에 위임된 경로이므로 [이메일·비밀번호 문서](https://better-auth.com/docs/authentication/email-password)와 [Bearer 문서](https://better-auth.com/docs/plugins/bearer), 저장소의 인증 설정·e2e 테스트를 함께 확인했다. 인증 SDK 패키지는 추가하지 않고 확인한 HTTP 계약을 서비스에 모았다.

| 요청 | 본문·처리 |
| --- | --- |
| `POST /auth/sign-in/email` | `email`, `password`. `set-auth-token` 응답 헤더를 읽고, 해당 토큰으로 `GET /users/me`가 성공한 뒤 보관한다. |
| `GET /users/me` | `Authorization: Bearer ...`. 응답의 `id`, `email`, `nickname`을 UI 모델로 변환한다. |
| `POST /auth/sign-up/email` | `name`, `email`, `password`. 인증 메일 확인 단계로 이동한다. |
| `POST /auth/send-verification-email` | `email`. 가입한 계정의 인증 메일을 다시 요청한다. |
| `POST /auth/request-password-reset` | `email`, `redirectTo`. 메일 링크를 열면 Backend가 앱 callback에 `token` 또는 `error`를 붙여 이동한다. |
| `POST /auth/reset-password` | `token`, `newPassword`. 성공 후 새 비밀번호로 로그인한다. |
| `POST /auth/sign-out` | Bearer 토큰과 빈 JSON 본문. 성공 또는 세션 만료 401 뒤 로컬 토큰을 지운다. |

공통 HTTP는 15초 timeout, JSON·Problem Details·better-auth 오류 코드, 비 JSON 오류와 잘못된 성공 응답을 처리한다. 에러 객체에 응답 본문·요청 본문·토큰을 담지 않고, UI에는 알려진 코드에 대응하는 한국어 안내만 표시한다. 쿠키 인증과 섞이지 않도록 fetch는 `credentials: omit`을 사용한다.

로그인/복구/로그아웃은 서비스에서 직렬 처리하고 Provider에서 이전 요청의 늦은 결과를 무시한다. 입력 제출 중에는 중복 탭을 막는다. 토큰 저장 실패는 로그인 성공으로 처리하지 않으며, 로그아웃의 서버 요청이나 로컬 삭제 실패도 재시도할 수 있도록 알린다. 복구 중 401은 토큰을 지우고 로그인으로 이동하지만, 네트워크·서버 오류에서는 저장된 토큰을 보존한다.

닉네임은 앞뒤 공백을 제거한 1~10 grapheme cluster다. 비밀번호는 영문·숫자·특수문자를 포함한 최소 8 grapheme cluster, better-auth 기본 상한 128 코드 단위를 검사한다. `Intl.Segmenter`가 없는 런타임에서는 복합 emoji 이름을 잘못 거절하지 않고 서버의 grapheme 검사를 따른다. 로그인에서는 새 비밀번호 규칙을 재적용하지 않아 기존 자격 증명을 그대로 서버에 보낸다. 비밀번호 앞뒤 공백은 제거하지 않는다.

## 저장소와 환경 설정

`expo-secure-store ~58.0.2`를 Expo SDK 58 권장 버전으로 설치하고 config plugin을 추가했다. [SDK 문서](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/)에 따라 모바일은 SecureStore 비동기 API를 사용한다. Web은 세션 저장소를 사용해 같은 탭의 새로고침에서 복구하고 탭을 닫으면 보관을 끝낸다. 사용자 비밀번호·사용자 객체는 저장하지 않는다. 백엔드 base URL마다 다른 키를 사용하며 기존 Mock 공부 기록을 지우지 않는다.

`.env.example`을 참고해 공개 설정을 `.env.local`에 지정할 수 있다.

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://api.tmgoc.kro.kr
EXPO_PUBLIC_AUTH_RESET_REDIRECT_URL=tamagochifrontend://reset-password
```

Web에서는 두 번째 값을 실제 Web origin의 `/reset-password` URL로 설정한다. 설정이 없으면 `Linking.createURL('/reset-password')`로 현재 환경에 맞는 주소를 만든다. Expo Go와 development build의 URL은 다를 수 있으므로 메일 링크 복귀를 검증할 때 해당 실행 환경의 주소를 사용한다. 공개 환경 변수에 API 비밀키·토큰을 넣지 않는다.

## 실제 서버 연동 상태와 남은 조건

- 2026-11-02 후속 점검에서 Backend [`98441b9`](https://github.com/gdgoc-smu-202602-team6/TamaGoChi-Backend/commit/98441b9ec93e1089f6419476286bc4ef812b6e44)의 trusted origin 기반 CORS와 `TRUSTED_ORIGINS=http://localhost:*` 예시 설정을 확인했다. 운영 서버에서도 localhost:8081·8082·19006의 인증·일반 API preflight가 204이며 요청 origin·authorization/content-type을 허용한다. 초기 점검의 CORS 404/405 문제는 localhost 조건에서 해결됐다.
- 격리된 Chrome의 `http://localhost:8082`에서 테스트 응답 대체 없이 운영 API를 호출했다. `/health` 200, 잘못된 Bearer를 넣은 `/users/me` 401, `/auth/get-session` 200(null), 올바른 JSON에 잘못된 이메일을 넣은 로그인 400을 모두 브라우저에서 읽었다. 존재하지 않는 임의의 테스트 이메일로 로그인했을 때도 연결 실패 안내가 아닌 이메일·비밀번호 확인 안내를 표시했다. 계정 생성·메일 요청·비밀번호 변경은 수행하지 않았다.
- 토큰 노출은 사용 중인 [better-auth 1.7.14 bearer 구현](https://github.com/better-auth/better-auth/blob/v1.7.14/packages/better-auth/src/plugins/bearer/index.ts)이 토큰 발급 시 `set-auth-token`과 `Access-Control-Expose-Headers`를 함께 설정하는 것을 확인했다. 성공 로그인 응답에서 브라우저가 토큰을 읽는지는 유효한 인증 계정으로 추가 검증해야 한다.
- `127.0.0.1`과 임의의 외부 origin은 허용되지 않았다. 현재 로컬 Web 테스트 주소는 `http://localhost:포트`를 사용한다. 실제 Web 배포 origin·모바일 callback scheme은 Backend의 trusted origin/scheme에 별도 등록해야 한다.
- 유효하지 않은 재설정 토큰으로 callback 허용 여부를 확인했다. `http://localhost:8082/reset-password`는 302로 `?error=INVALID_TOKEN`에 복귀하고, 외부 callback은 403 `INVALID_CALLBACK_URL`이었다. 따라서 localhost callback 신뢰는 반영됐지만 실제 메일 수신·유효한 토큰으로 재설정하는 전체 흐름을 검증한 것은 아니다.
- 이메일 인증은 서버의 메일 링크를 연 뒤 앱으로 돌아와 로그인하는 최소 흐름이다. 운영 SES 메일 도착, 모바일 callback 복귀, 실제 계정 로그인·로그아웃·저장소 동작은 실기기 확인이 남아 있다.

## 검증

```bash
npm run typecheck
npm run lint -- --no-cache
npm test
```

기존 공부 테스트 15개와 인증·HTTP 테스트 14개를 실행한다. 추가 테스트는 로그인 헤더·DTO 변환, 가입 후 미인증, 토큰 저장/삭제 실패, 복구와 로그아웃 경합, 만료·오프라인 보존, 메일·재설정 요청 형식, 오류 내용 비노출, timeout·비 JSON 응답을 확인한다. UI 검증은 별도 Chrome 프로필에서 네트워크 응답을 테스트 fixture로 대체한다.

타입 검사·린트·29개 테스트와 Android/iOS Hermes·Web SSR 번들 내보내기가 통과했다. 프로덕션 Web 빌드에서 가입 → 인증 안내·재요청 → 미인증 로그인 거절 → 로그인 → 계정 새로고침 복구 → 로그아웃 실패·재시도 → 만료된 토큰 정리 → 비밀번호 재설정 요청·입력을 확인했다. 320·390·1280px에서 가로 넘침과 입력 잘림이 없고, 인증 화면에서 탭을 숨기며 게임 복귀 시 4개 탭이 나타나는 것도 확인했다. 검증 중 애플리케이션 예외는 없었고 운영 API 쓰기는 없었다. 실제 기기에서 SecureStore·키보드·메일 링크 복귀를 확인한 결과는 아니다.

Expo Router의 자동 생성 타입이 예전 라우트만 포함하면 `npm start`를 실행해 갱신한 후 타입 검사를 실행한다. 라우트 문자열을 강제 캐스팅하거나 생성 파일을 직접 편집하지 않는다.

개발 서버에서 라우트를 새로고침할 때 `Requiring unknown module "59"`가 재현됐다. [기존 캐시 재생성](study-flow.md) 후에도 이번 실행에서는 다시 발생했다. 앱의 SSR 설정·라이브러리 소스는 바꾸지 않았으며, 위의 전체 브라우저 검증은 공식 `expo serve`로 프로덕션 내보내기를 실행한 결과다. 개발 서버 문제를 해결한 것으로 보고하지 않는다. 로컬에서 같은 문제가 있으면 다음 명령으로 검증한 방식의 미리보기를 열 수 있다.

Backend CORS 수정 후 별도 Metro(`--clear`, localhost:8083)에서도 `/login` → `/signup` → `/account` 직접 요청 중 동일 오류와 500이 발생했고 뒤이은 요청은 200이었다. 이 개발용 SSR 모듈 오류는 Backend CORS 수정과 별개로 남아 있다.

```powershell
npx.cmd expo export --platform web --output-dir .expo/validation/auth-export
npx.cmd expo serve .expo/validation/auth-export --port 8082
```
