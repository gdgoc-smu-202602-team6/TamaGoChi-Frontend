# Metro 개발 서버 안정화

2026-11-04(KST), Expo SDK 58의 현재 설치 버전에서 Web 개발 SSR의 `Requiring unknown module` / HTTP 500을 재현하고 수정했다. Backend CORS와 별개의 로컬 파일 감시 문제다.

## 원인과 수정

검증용 Chrome 프로필·내보낸 번들·테스트 컴파일 결과를 `.expo/validation`, `.expo/preview`, `.expo/tests`에 저장하고 있었다. 조사 시점의 로컬 `.expo/validation`만 122,128개 파일이었다. Git에서 제외된 파일도 Metro 감시 대상이 될 수 있다. Expo의 기본 제외 목록은 `.expo/types`와 Web 캐시 등을 제외하지만 이 세 폴더는 제외하지 않는다.

설치된 CLI의 파일 변경 리스너는 개발 SSR 모듈 레지스트리를 초기화한다. 검증 산출물이 계속 바뀌는 동안 SSR 요청이 겹치면 모듈을 찾지 못했다. 비교 서버에서 `.expo/tests`만 다시 감시하도록 했을 때 테스트 파일 갱신과 겹친 6개 요청 중 5개가 같은 `Requiring unknown module`로 500을 반환했다. 모듈 번호는 실행마다 달라질 수 있다.

루트 `metro.config.js`에서 `expo/metro-config`의 기본 설정과 기본 `blockList`를 유지하고 위 세 디렉터리만 추가 제외한다. 현재 프로젝트의 절대 경로와 디렉터리 경계를 사용하며 Windows/POSIX 경로 구분자를 처리한다. 앱 소스·에셋·네이티브 모듈·Expo의 가상 진입점은 계속 감시한다. 정규식 플래그도 기본 설정과 같게 유지한다.

`web.output: server`, 라우트 분할과 React Compiler 설정은 유지했다. 의존성 업그레이드·`node_modules` 수정·SSR 비활성화는 하지 않았다. [Expo Metro 설정](https://docs.expo.dev/guides/customizing-metro/)을 따른 공개 설정이다. [Expo의 관련 SSR 레지스트리 이슈](https://github.com/expo/expo/issues/51871)는 참고 자료이며 이 저장소의 재현 조건은 위 비교 실험으로 확인했다. 이 변경이 SDK의 모든 SSR 오류를 해결한다는 의미는 아니다.

## 실행과 확인

Metro 설정 변경 후 기존 개발 서버를 종료하고 다시 시작한다. 일반 개발에서는 `CI=1`을 설정하지 않는다. CI 모드는 감시와 Fast Refresh 검증에 적합하지 않다.

```powershell
$env:CI=$null
npm.cmd start -- --localhost --port 8081 --clear
```

다른 터미널에서 다음을 실행한다. 개발 서버 포트가 다르면 숫자를 바꾼다.

```powershell
npm.cmd run check:web-dev -- 8081
```

이 명령은 로컬 Metro 상태를 확인하고 인증·내 방·상점·공지·마이·공부·꾸미기·차단 안내의 10개 경로를 두 번씩 요청한다. HTTP 200·HTML 응답·모듈 오류 부재를 확인하며 실패 시 종료 코드가 0이 아니다. 브라우저 hydration·Fast Refresh·실기기 검증을 대신하지 않는다. 운영 API에 로그인하거나 쓰기 요청을 보내지 않는다.

기본 API 모드는 실제 계정 로그인이 필요하다. 로그인 없이 화면을 볼 때는 `.env.local`의 `EXPO_PUBLIC_DATA_MODE=mock`을 사용하거나 시작 터미널에 같은 환경 변수를 설정한다. 모드 변경 후 서버를 다시 시작한다. Web 주소는 Backend CORS 기준에 맞춰 `http://localhost:포트`를 사용한다.

공식 `expo export` / `expo serve`도 배포 번들 확인에 계속 사용할 수 있다. 개발 중 소스 수정 반영은 Metro에서 확인한다. 검증 출력은 위 세 생성 디렉터리 안에 두고 앱 소스 디렉터리에 생성하지 않는다.

## 검증 범위

- 타입·린트와 총 **373개 테스트**. 추가 3개는 생성 폴더 제외·경로 경계·기본 제외 유지·실제 앱/Expo 진입점 포함을 검증한다.
- 새 Mock/API 개발 서버에서 10개 경로를 두 번씩 요청해 **40/40 HTTP 200**을 확인했다.
- 수정한 서버에서 비교 실험과 같은 테스트 산출물을 68번 갱신하는 동안 **6/6 HTTP 200**, 모듈 오류 0회를 확인했다.
- 격리 Chrome의 Mock 개발 서버에서 **30/30 SSR 요청**, 검증/테스트 산출물 변경 시 HMR 미발생, 실제 화면 소스 수정·복원 시 Fast Refresh를 확인했다. 전체 페이지 재로드 없이 진행 중인 공부 기록을 그대로 유지하고 결과를 한 번만 저장했다. 운영 호출은 0회였다.
- API 모드 개발 서버에서도 운영 API를 차단한 가짜 응답으로 로그인 가드·로그인·마이/공부/안내 이동·새로고침 복구·동일 세션과 타이머 유지·시작/종료 각 1회·계정 분리를 확인했다. 320×568·390×844·1280×844에서 가로 넘침과 브라우저 예외가 없었다.
- 최종 설정으로 API Android/iOS Hermes·Web SSR과 Mock Web SSR을 새 디렉터리에 내보내기까지 통과했다. 기기용 네이티브 development build를 생성하거나 설치한 결과는 아니다.

브라우저 최초 cold bundle 준비가 25초를 넘어서 기존 검증 도구의 대기 시간이 한 번 초과됐다. 준비 완료 후 동일 검증을 통과했다. 캐시를 비운 첫 시작의 번들 시간까지 즉시 응답한다고 보장하지 않는다. 실제 Android development build·권한·앱 차단과 운영 계정 테스트는 별도 후속 작업이다.
