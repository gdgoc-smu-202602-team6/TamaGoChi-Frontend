# Home·Study 서버 연동

## 실행 모드

기본값은 `EXPO_PUBLIC_DATA_MODE=api`다. 로그인 상태를 복구한 뒤 Home·Study·결과와 탭에 접근한다. 이메일 로그인 성공 시 내 방으로 이동한다. 인증이 없으면 로그인으로 이동하고, 인증 복구 중 네트워크 오류가 나면 저장된 토큰을 유지한 채 재시도를 안내한다. 가입 승인 여부로 개인 공부 기능을 제한하지 않는다.

기존 Mock은 `.env.local`의 `EXPO_PUBLIC_DATA_MODE=mock`으로 선택한다. 변경 뒤 Metro를 다시 시작하거나 새로 export한다. Mock에서만 로그인 없이 내 방 미리보기를 열 수 있다. API 오류 시 Mock으로 자동 전환하지 않으며, Mock 기록을 계정 서버 데이터와 합치지 않는다.

공부 화면은 `앱 차단 미적용`을 표시하고 [앱 차단 안내](app-blocking-plan.md)로 이동할 수 있다. 안내 이동/복귀는 시작·종료 요청을 보내지 않으며, 현재 타이머·복구·정산 로직을 바꾸지 않는다. 실제 네이티브 차단은 별도 기기 구현이 남아 있다.

Web SSR에서는 export와 serve에 같은 `.env.local`/모드 설정을 사용한다. Mock 탭은 서버와 첫 클라이언트 렌더에서 동일한 준비 화면을 표시한 뒤 마운트해 초기 HTML 불일치를 방지한다. Mock의 Home → Study → 결과 → Home도 브라우저에서 확인했으며 운영 API 호출은 0회였다.

## 데이터와 화면

Backend 기준은 [OpenAPI 0.1.0](https://github.com/gdgoc-smu-202602-team6/TamaGoChi-Backend/blob/98441b9ec93e1089f6419476286bc4ef812b6e44/openapi.yaml)과 같은 커밋의 컨트롤러다. 새 의존성 없이 기존 HTTP·인증·AsyncStorage를 재사용했다.

```text
RequireAuth → GameServicesProvider (계정·로그인 세션별)
  → StudyProvider / useHome / useStudyResult
  → HomeService / StudyService
  → 계정에 고정된 AuthorizedClient → Backend
  → 계정·API 주소별 복구 기록
```

| 화면/동작 | API와 표시 기준 |
| --- | --- |
| Home | `/users/me`, `/users/me/stats`, `/users/me/room`을 조회해 닉네임·Bolt·Level·Heart·오늘 공부시간·출석·버그 상태를 표시한다. 방 꾸미기 연결 후 `/items`·`/users/me/items`도 읽어 실제 장착·배치를 표시한다. KST 04:00 날짜 분리·보상·상태 정산은 서버 값이다. |
| 시작 | 활성 세션을 먼저 조회한다. 없으면 본문 없이 `POST /users/me/studySessions`. `409 session-running`은 활성 세션을 다시 조회한다. |
| 복구 | `GET /users/me/studySessions?state=RUNNING&pageSize=1`. 마지막 활성 세션 ID를 기억해 목록에서 사라진 세션도 단건 조회한다. |
| Study | 서버의 `studiedSeconds` 수신값과 monotonic 경과시간으로 표시한다. 기기의 UTC 시계가 서버와 달라도 표시를 시작 시각의 단순 차이로 계산하지 않는다. |
| 종료 | 원래 버튼을 누른 기기의 UTC 시각을 먼저 보관한 뒤 `PATCH /users/me/studySessions/{id}`에 `state: ENDED`, `clientEndedAt`을 전송한다. 이 시각은 표시용 시계나 보상에서 역산하지 않는다. 서버가 계약에 따라 수용·보정·상한 처리한다. |
| 종료 재시도 | `409 session-ended`이면 같은 ID를 GET한다. 결과를 조회해 재사용하며 클라이언트에서 보상을 지급하지 않는다. |
| 결과 | DTO `xp`는 공부 XP이고 출석·목표 보너스를 더해 총 XP를 표시한다. Bolt·버그 퇴치·Heart 변화·레벨업도 서버 응답을 표시한다. |
| 내 방 복귀 | 완료 안내 ID를 확인 처리한 뒤 `dismissTo('/')`로 돌아가 Home을 다시 조회한다. 결과 URL 새로고침은 결과 조회만 수행한다. |

화면은 기존 Home·Study의 하늘색·네이비·크림 카드·노란 버튼을 유지했다. 후속 [방 꾸미기](room-edit-flow.md)에서 Home·Study·결과가 같은 렌더러로 현재 장착 아이템·배치 좌표를 표시하도록 연결했다. 그림은 여전히 교체 가능한 임시 SVG이며 최종 아트워크는 별도다.

## 연결 중단·다른 기기·12시간

- 시작 응답이 유실돼도 다음 시도에서 활성 세션을 먼저 조회하므로 새 세션을 임의로 더 만들지 않는다. 오프라인 상태에서 로컬 세션을 만들어 성공 처리하지 않는다.
- 종료 의도는 네트워크 전송 전에 AsyncStorage에 저장한다. 재전송·재실행에서도 최초 `clientEndedAt`을 유지한다. 복구 시 미전송 종료가 있으면 먼저 처리한 뒤 활성 상태를 조회한다.
- 서버가 종료했지만 응답이나 로컬 저장이 실패하면 종료 의도를 남긴다. 다음 요청의 `session-ended`와 GET 결과로 완료 처리를 회복한다. 저장 실패·손상 레코드는 알리고 자동 삭제하지 않는다.
- 복구 레코드는 `@tamagochi/api-study/v1/{API 주소}/{사용자 ID}` 아래에 버전·활성/완료 ID·미전송 종료 의도만 보관한다. 재화·보상·서버 통계·인증 토큰은 이 레코드에 저장하지 않는다. 기존 Mock 키와 분리한다.
- foreground 복귀와 활성 상태의 30초 간격에 서버를 조회한다. 기억한 세션이 다른 기기에서 끝났으면 단건 GET으로 결과를 확인한다. 서버 실시간 push/WebSocket을 가정하지 않는다.
- 타이머 표시는 `maxEndAt - startedAt`에서 멈추고 서버 상태를 재확인한다. 서버가 12시간에 ENDED로 판정한 결과로 이동하며, 자동 만료 시 클라이언트 PATCH로 보상을 만들지 않는다.
- 사용자나 로그인 토큰이 바뀌면 게임 Provider와 화면 상태를 새로 만든다. 요청은 해당 로그인 때의 고정 토큰을 사용하고, 폐기된 scope의 늦은 응답을 버린다. 다른 계정의 토큰을 나중에 읽어 이전 계정의 요청에 붙이지 않는다.
- 만료된 인증으로 게임 API가 401을 반환하면 인증 복구를 요청해 세션을 정리하고 로그인으로 이동한다.

앱 재시작 후에는 인증·서버 상태 복구에 네트워크가 필요하다. 연결이 없으면 토큰과 종료 의도를 보존하고 재시도를 안내한다. 로컬에서 임의로 서버 보상을 보여주지 않는다. 여러 Web 탭의 로컬 레코드 쓰기를 잠그는 기능은 없으며, 세션 단일성·정산은 서버 계약에 의존한다.

## 검증

```bash
npm run typecheck
npm run lint -- --no-cache
npm test
```

47개 테스트 중 서버 어댑터·계정 요청 격리 관련 18개를 추가했다. Home 매핑, 서버 시계 기준 표시, 중복 시작·종료, POST/PATCH 응답 유실, 오프라인 종료 의도와 재실행, 저장 실패·손상, 다른 기기의 종료, 12시간 만료, 잘못된 결과 ID와 계정 변경 중 늦은 응답을 검증한다.

격리된 Chrome 프로필에서 API 계약에 맞는 테스트 응답을 주입해 로그인 → Home → 시작 응답 유실·복구 → Study 새로고침 → 오프라인 종료 → 재실행 후 종료 재전송 → 결과·결과 새로고침 → Home 갱신을 확인했다. 12시간 자동 만료 시 PATCH 없이 결과로 이동, 다른 계정 로그인 시 상태 격리, 인증 만료 시 로그인 복귀, 320·390·1280px의 가로 넘침도 확인했다. 운영 계정·공부 세션·재화는 생성하거나 변경하지 않았다.

실제 인증 계정과 두 대의 모바일 기기를 이용한 서버 공부·동시 종료·오프라인 재전송·SecureStore·배경 복귀 검증은 남아 있다. 서버의 KST 날짜 정산 정확성까지 프론트엔드 fixture 테스트가 증명하는 것은 아니다.

## Web 개발 서버

기존 Metro SSR `unknown module` 오류는 남아 있다. SDK 58의 공식 `asyncRoutes.web: production` 설정으로 개발 분할을 꺼 보는 확인도 수행했지만 직접 접속에서 500이 계속 발생해 설정을 원복했다. 앱 설정·의존성 소스를 우회 수정하지 않았다. 위 브라우저 검증은 프로덕션 SSR 내보내기와 공식 `expo serve`로 수행했다.

```powershell
npx.cmd expo export --platform web --output-dir .expo/validation/study-api-preview
npx.cmd expo serve .expo/validation/study-api-preview --port 8082
```

Backend의 localhost CORS는 [후속 점검 결과](auth-flow.md)에 따라 정상이다. 이 개발 서버 문제와 Backend CORS를 같은 원인으로 취급하지 않는다.
