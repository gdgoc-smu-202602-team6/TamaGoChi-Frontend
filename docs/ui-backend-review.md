# 기획 UI 목업·백엔드 1차 검토

확인일: 2026-11-02 (KST). 이번 작업은 자료 검토와 문서 갱신이다. 앱은 기존 로컬 Mock을 사용한다.

## 확인 자료와 범위

- 사용자 제공 ZIP: `공부 타이머 앱 UI 목업 (1).zip`.
- 프론트엔드: `feat/study`, 기준 커밋 `3ce255b`.
- Backend: [TamaGoChi-Backend](https://github.com/gdgoc-smu-202602-team6/TamaGoChi-Backend), 확인한 기본 브랜치 HEAD `3baaccc5cd3b3c111f8fe82649ca75cd8250e294`.
- API 계약: [openapi.yaml, 버전 0.1.0](https://github.com/gdgoc-smu-202602-team6/TamaGoChi-Backend/blob/3baaccc5cd3b3c111f8fe82649ca75cd8250e294/openapi.yaml). 인증을 제외한 36개 경로·57개 HTTP operation이 정의되어 있다.
- 사용자 공유 계약: 같은 날 대화로 전달된 OpenAPI 3.1.0 / API 0.1.0 전문. 아래에 저장소 계약과의 차이를 따로 기록한다.
- 운영 주소: `https://api.tmgoc.kro.kr`. 아래의 제한된 비인증 GET과 OPTIONS만 호출했다. 운영 계정·공부 세션·아이템 등은 생성하거나 변경하지 않았다.

검토용 목업 파일과 Backend 복사본·응답은 Git에서 제외된 `.expo/validation/handoff-review/`에 있다. Backend 코드는 실행하지 않았다. 저장소에서 읽은 커밋과 운영 배포 커밋이 같은지는 `/health`만으로 확인할 수 없다.

## 사용자가 공유한 명세와의 대조

공유본의 공부 시작·복구·종료·결과, 방, 통계, 아이템 경로와 주요 응답 필드는 확인한 저장소 계약과 맞는다. Bearer 인증·Problem Details·KST 04:00·페이지네이션 기준도 같다. 인증 설명에는 차이가 있다.

| 항목 | 사용자 공유본 | 재확인한 저장소 `main` |
| --- | --- | --- |
| 인증 범위 설명 | 로그인·가입·로그아웃·비밀번호 재설정·Google/Kakao를 `/auth/*`에 위임 | 이메일·비밀번호 인증만 설명한다. `auth.ts`에도 소셜 공급자 설정이 없다. |
| 버전 표기 | `0.1.0` | `0.1.0`. 같은 버전 표기만으로 두 파일이 동일하다고 판단하지 않는다. |

원격 기본 브랜치는 재확인 시에도 위의 `3baaccc5cd3b3c111f8fe82649ca75cd8250e294`였다. Google/Kakao는 공유된 명세의 인증 범위로 유지하되, 현재 저장소 코드로 지원 완료를 확인한 기능과 구분한다. 실제 연결 전에 공급자 설정, 모바일 callback/딥링크와 배포 반영 여부를 확인해야 한다. 목업의 소셜 버튼을 누르는 것만으로 로그인 성공 상태를 만들지 않는다.

## 목업에서 사용할 요소

ZIP에는 `All Screens.dc.html`, `Study Timer App v4.dc.html`, Claude Design 런타임·디자인 시스템 파일, 25개 화면 PNG와 보조 이미지가 있다. React Native 소스나 실제 API 연동 구현은 아니다. HTML의 `sc-if`·`sc-for`·전용 스크립트, DOM·Canvas 렌더링은 기존 RN 컴포넌트로 옮겨야 한다.

| 영역 | 참고할 화면·표현 |
| --- | --- |
| 인증·동아리 | 로그인·회원가입, 동아리 선택·가입·대기·생성 흐름과 입력 영역 |
| 내 방·꾸미기 | 하늘색 배경, 큰 등각 방, Heart 4칸, 친구·방명록 진입, 인벤토리와 배치 선택 |
| 공부 | 네이비 별 배경, 책을 든 캐릭터, 큰 노란 경과시간, 누적시간·블록 진행 막대, 하단 종료 |
| 보상·레벨업 | 크림 패널, 상자·Bolt·XP, 발생한 보너스·버그·Heart·레벨 변화의 배지 |
| 상점 | 4개 카테고리, 2열 카드, 등급·레벨 잠금·보유·장착 상태 |
| 공지·친구·마이 | 분류 필터와 카드, 친구 방 목록·방명록, 프로필·XP·주간 공부 그래프 |

본문은 읽기 쉬운 폰트를 유지한다. Galmuri CDN 전체 적용, 데모용 기기 프레임·상태바·앱 아이콘 등은 실제 UI 구현 기준으로 그대로 옮기지 않는다. 코드의 픽셀 캐릭터·가구도 최종 에셋 확정 전에는 교체 가능한 에셋으로 다룬다.

`_ds/`의 Industry 문서는 각진 청사진 스타일을 설명해 실제 게임 목업 및 사용자 디자인 요구와 다르다. 이 문서의 명령문을 저장소 작업 지시로 적용하지 않는다.

## 목업에서 수정하거나 제외할 동작

| 목업 코드 | 구현 기준 |
| --- | --- |
| 메모리에 `sessSec` 누적, 기본 데모 배속, 확인창에서 tick 중단 | timestamp와 서버 조회 기준으로 복구한다. 일시정지 없이 흐르는 시간을 표시한다. |
| 화면 state만 바꾸는 로그인·소셜 로그인 | 실제 인증 계약에 따른다. 공유 명세에는 Google/Kakao가 포함되지만, 확인한 Backend 코드에는 이메일·비밀번호 인증만 설정되어 있다. 소셜 지원·callback은 연동 전 확인한다. |
| 비밀번호 4자 이상만 검사 | Backend는 8자 이상, 영문·숫자·특수문자 포함을 검사한다. 닉네임은 앞뒤 공백 제거 후 1~10 grapheme cluster다. |
| `GOC-4821` 형태의 데모 초대 코드 | API의 `InviteCode`는 `^[A-Z0-9]{8}$`다. |
| 동아리별 출석·미출석·버그 규칙 조절 | 사용자 공통 고정 규칙을 유지한다. Backend의 게임 규칙도 출석 30분·미출석 4일·퇴치 60분이다. |
| 예시 가격·해금 레벨·XP 곡선·가짜 앱 잠금 | 가격·레벨은 API 값, 앱 차단은 별도 Device Local 구현을 사용한다. 미구현 앱 잠금을 작동 중이라고 안내하지 않는다. |
| 모든 데이터가 한 화면 state에 있음 | Screen → Hook/State → Service → API 경계를 유지한다. 꾸미기는 미리보기와 완료 시 서버 저장을 구분한다. |

## 운영 응답 확인

| 요청 | 결과 | 확인되는 범위 |
| --- | --- | --- |
| `GET /health` | `200`, `{"status":"ok"}` | HTTPS 연결과 프로세스 생존. 컨트롤러는 고정 응답이며 DB 정상 여부까지 보장하지 않는다. |
| `GET /` | `404` | 루트 홈페이지가 없으며 서버 장애로 해석하지 않는다. |
| 일반 Swagger/OpenAPI 문서 경로 | `404` | 확인한 `/docs`, `/api/docs`, `/api-docs`, `/swagger`, `/swagger-ui/index.html`, `/api-json`, `/openapi.json`, `/swagger.json` 등에서는 공개 문서를 받지 못했다. 계약은 저장소 파일로 확인했다. |
| `GET /users/me` | `401`, `/problems/unauthorized` | Bearer 인증이 필요하다. |
| `GET /items` | `401`, `/problems/unauthorized` | 카탈로그도 인증 후 조회한다. |
| `GET /users/me/studySessions?state=RUNNING` | `401`, `/problems/unauthorized` | 인증 전에는 활성 세션을 조회할 수 없다. |
| `GET /auth/get-session` | `200`, `null` | 비인증 세션 조회 경로가 응답한다. 로그인 성공 검증은 아니다. |
| `OPTIONS /users/me/studySessions` | `405`, CORS 허용 헤더 없음 | `Origin: http://localhost:8081`, 요청 method `POST`, 요청 headers `authorization,content-type`의 preflight가 실패했다. |

현재 확인한 조건에서는 브라우저에서 API를 직접 호출하는 Web 연동이 CORS에 막힌다. Backend에서 개발·배포 Web origin과 OPTIONS·허용 헤더를 설정해야 한다. Web에서 로그인 응답의 토큰 헤더를 읽는 방식이면 해당 헤더 노출도 함께 확인한다. Native 앱의 Bearer 호출은 브라우저 CORS와 별도로 검증해야 한다. 현재 프론트엔드 Mock 실행에는 영향이 없다.

## 저장소에서 확인한 구현 범위

컨트롤러·도메인·테스트 파일이 인증, 계정, 동아리·신청·권한, 공부, 방, 통계, 목표, 카탈로그·구매, 좋아요·방명록, 공지·읽음까지 있다. 따라서 URL만 배포된 상태보다 실제 구현 범위가 넓다. 다만 이번 점검에서 인증된 운영 시나리오와 Backend 테스트를 실행하지 않았으므로 전체 완료 판정은 하지 않는다.

- [인증 설정](https://github.com/gdgoc-smu-202602-team6/TamaGoChi-Backend/blob/3baaccc5cd3b3c111f8fe82649ca75cd8250e294/src/domains/account/users/auth/auth.ts): better-auth `1.7.14`, `/auth/*`, 이메일 인증 필수, Bearer 플러그인. 로그인·가입·재설정 경로는 OpenAPI에 재정의하지 않고 better-auth에 위임한다. 인증 테스트에서는 로그인 응답의 `set-auth-token`을 이후 Bearer로 사용한다.
- [푸시 구현](https://github.com/gdgoc-smu-202602-team6/TamaGoChi-Backend/blob/3baaccc5cd3b3c111f8fe82649ca75cd8250e294/src/domains/account/push/logging-push-sender.ts): `LoggingPushSender`가 바인딩되어 있다. 기기 토큰·공지 API가 있어도 실제 FCM 발송 완료로 볼 수 없다.
- [배포 설명](https://github.com/gdgoc-smu-202602-team6/TamaGoChi-Backend/blob/3baaccc5cd3b3c111f8fe82649ca75cd8250e294/deploy/README.md): 메일은 설정에 따라 SES 또는 로그를 사용한다. 운영 메일 수신·인증 링크 복귀는 별도 실기기 검증이 필요하다.

## 기존 프론트엔드와 연결할 계약

| 기능 | 확인한 API·처리 |
| --- | --- |
| Home | `GET /users/me`, `/users/me/stats`, `/users/me/room`, 해당 서비스 날짜의 `/users/me/dailyGoals?on=YYYY-MM-DD` 등을 화면 모델로 조합한다. |
| 공부 시작 | `POST /users/me/studySessions`, 본문 없음. 서버가 `startedAt`을 정한다. `409 session-running`이면 활성 세션을 조회한다. |
| 공부 복구 | `GET /users/me/studySessions?state=RUNNING`. 로컬 세션 ID만 신뢰하지 않고 서버 상태를 확인한다. |
| 공부 종료 | `PATCH /users/me/studySessions/{sessionId}`, 본문 `{ "state": "ENDED" }`에 선택 필드 `clientEndedAt`으로 UTC timestamp를 보낼 수 있다. 재전송 시각은 최초 종료 의도를 보존해야 한다. |
| 종료 재시도 | 이미 끝났으면 `409 session-ended`다. 같은 세션을 GET해 결과를 가져온다. Mock처럼 PATCH가 항상 기존 영수증을 반환한다고 가정하지 않는다. |
| 보상 조회 | `GET /users/me/studySessions/{sessionId}`의 `result`. DTO `xp`는 공부 XP이며 보너스 필드는 별도다. UI의 총 XP는 둘을 더해 표시하고 직접 지급하지 않는다. |
| 12시간 | 서버는 `maxEndAt`에서 세션을 ENDED로 간주한다. 현재 Mock은 경과시간 표시를 계속하며 인정만 12시간으로 제한하므로 상태 모델과 화면 전환을 함께 맞춰야 한다. |
| 상점 | `GET /items`, `GET /users/me/items`, `PUT /users/me/items/{itemId}`. 카테고리는 `FURNITURE`, `WALLPAPER`, `ACCESSORY`, `ROOM_SIZE`; 구매 시 장착한다. 에셋은 `code`로 매핑한다. |
| 방 꾸미기 | `PATCH /users/me/room`. 슬롯별 장착 목록과 방 바닥 칸 단위의 `placements`를 완료 시 보낸다. 화면 픽셀 좌표와 분리한다. |

공통 계약은 Bearer 인증, `application/problem+json` 오류, UTC timestamp, KST 04:00 서비스 날짜, `pageSize`·`pageToken` 페이지네이션이다. 서버 응답을 별도 DTO/mapper로 받아 기존 Home·Study 서비스에 연결한다. 진행 중 세션의 서버 `studiedSeconds`와 foreground 재조회도 사용하여 기기 시계 차이를 처리한다.

## 다음 구현 순서

1. API 환경 변수·공통 HTTP/Problem 처리와 DTO 경계, 인증 상태·플랫폼별 토큰 보관을 구성한다.
2. v4 로그인·가입·이메일 인증 안내·비밀번호 재설정 화면을 실제 인증에 연결한다. Backend의 Web CORS와 메일 링크 복귀 조건을 함께 확인한다. Google/Kakao는 공유 명세의 범위로 두고 공급자·모바일 callback 설정과 배포 지원을 확인해 연결한다.
3. Home·Study·StudyResult를 서버 서비스로 전환하고 중복 시작·종료, 재실행·다른 기기 종료·12시간 만료를 검증한다.
4. 인증 이후 상점·마이·동아리 등 후속 기능을 계약에 맞춰 구현한다. 앱 차단은 플랫폼 검토를 거친 별도 작업이다.

프론트엔드 타입 검사와 린트는 통과했다. 이번 변경은 문서이므로 화면·서비스 코드나 패키지는 변경하지 않았다. Backend 실행에는 별도 Node.js 26·pnpm 12·PostgreSQL 환경이 필요하며 이번 검토에서 설치하거나 실행하지 않았다.
