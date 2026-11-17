# 공부 중 앱 차단: 플랫폼 검토와 구현 계획

## 이번 단계의 결론과 구현 범위

2026-11-04(KST), Expo SDK 58·React Native 0.88.1의 현재 저장소와 Android/Apple/Expo의 공식 자료를 확인했다. 기능 명세의 앱 차단은 Device Local 기능이며 Backend가 다른 앱을 중지시키는 기능이 아니다. 현재 저장소에는 차단용 네이티브 모듈·앱 식별자·기기 빌드 설정이 없다.

이번 단계는 플랫폼 검토와 `/app-blocking` 안내 화면, 마이·Study 진입을 구현한다. 실제 앱 선택·권한 요청·제한·해제는 아직 구현하지 않았다. 안내 화면은 Web에서 브라우저의 미지원, Android/iOS에서 현재 앱 버전의 미지원을 설명한다. 기기의 권한을 조회해서 거절 상태를 판정한 화면이 아니다. Fake 앱 목록·가짜 활성 토글·차단 수량을 추가하지 않는다. 공부 화면의 `앱 차단 미적용`은 현재 구현에 맞는 고정 안내이며 실제 네이티브 적용을 확인하는 기능이 생기기 전까지 활성 상태로 바꾸지 않는다.

사용자가 백엔드와 논의한 ‘개발하기 편한 기기로 진행’ 기준에 따라 Windows에서 개발·검증하기 쉬운 **Android development build 우선**으로 진행한다. 실제 기기/OS 버전·Android 패키지명은 아직 정해지지 않았으며 배포용 식별자나 빌드/배포 계정을 임의로 만들지 않는다. iOS는 후속 별도 구현 범위로 유지한다. 아래 네이티브 방식과 연결 조건은 후속 구현 제안이며 현재 적용된 기능은 아니다.

## 플랫폼별 검토

| 플랫폼/방식 | 확인한 제약과 판단 |
| --- | --- |
| Web | 일반 웹 앱에서 다른 네이티브 앱 사용을 제한하지 않는다. 브라우저 이탈을 차단 성공·공부 실패로 해석하지 않는다. 타이머는 계속 사용할 수 있다. |
| Expo Go | 앱에 새로 작성한 네이티브 서비스를 넣을 수 없어 최종 차단 검증 환경으로 사용하지 않는다. Local Expo Module과 development build가 필요하다. [Expo 설명](https://docs.expo.dev/workflow/customizing/) |
| Android UsageStats | 사용 이력/통계 접근 API다. 사용 정보 권한을 받는 것만으로 다른 앱의 실행을 막을 수 있다고 처리하지 않는다. 실제 제한은 별도로 검증해야 한다. [UsageStatsManager](https://developer.android.com/reference/android/app/usage/UsageStatsManager) |
| Android DevicePolicyManager | `setPackagesSuspended`는 device/profile owner 또는 지정된 delegate 등 관리 권한을 전제로 한다. 일반 사용자용 공부 앱의 기본 구현으로 채택하지 않는다. [공식 API](https://developer.android.com/reference/android/app/admin/DevicePolicyManager#setPackagesSuspended(android.content.ComponentName,%20java.lang.String[],%20boolean)) |
| Android 접근성/네이티브 서비스 | 전경 앱 전환 감지와 제한 화면을 기술 후보로 검토할 수 있지만 실제 OS 동작과 목적 적합성을 먼저 검증해야 한다. 접근성 도구로 허위 지정하지 않는다. 일반 앱에는 별도 고지·동의와 Play 선언/검토가 필요하며, 설치/권한 획득이 배포 승인을 뜻하지 않는다. [서비스 지침](https://developer.android.com/guide/topics/ui/accessibility/service), [Play 공식 정책](https://support.google.com/googleplay/android-developer/answer/10964491?hl=en) |
| Android 앱 목록 | 필요한 launchable 앱 범위부터 검토하며 설치된 전체 패키지를 무조건 수집하지 않는다. `QUERY_ALL_PACKAGES`를 기본값으로 추가하지 않는다. [패키지 가시성](https://developer.android.com/training/package-visibility/declaring) |
| iOS | iOS 16에서 추가된 Family Controls individual authorization, 시스템 선택의 opaque token, ManagedSettings shield와 DeviceActivity를 검토한다. 앱 설치 목록을 Android 패키지 문자열처럼 다루지 않는다. [Apple WWDC22](https://developer.apple.com/videos/play/wwdc2022/110336/) |
| iOS 배포 | Family Controls capability가 필요하며 배포 entitlement는 Apple 계정 소유자의 요청·승인 대상이다. 앱/extension 식별자·공유 저장소·프로비저닝과 실제 iPhone 검증이 필요하다. [Family Controls 설정](https://developer.apple.com/documentation/Xcode/configuring-family-controls), [배포 권한 요청](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement) |

Android의 후보 서비스가 스토어 정책에 적합하거나 모든 OS 버전에서 안정적으로 동작한다고 결론 내리지 않았다. 먼저 별도 기기 빌드에서 앱 전환·종료·권한 회수와 배포 요구를 검증한 뒤 제품의 제한 방식으로 확정한다. iOS는 entitlement와 시스템 shield 경로를 별도로 진행한다.

## 기존 프로젝트에 미치는 영향

[Expo의 권장 방식](https://docs.expo.dev/modules/get-started/)에 따라 앱 전용 기능은 `modules/` 아래 Local Expo Module로 분리하는 것을 제안한다. 생성되는 루트 `android/`·`ios/`를 직접 유지하지 않고 CNG와 config plugin으로 manifest·capability·extension 구성을 관리한다. 네이티브 코드를 추가하면 Expo Go 대신 새 development build가 필요하며, OTA/JS 번들만으로 네이티브 구현을 배포할 수 있다고 안내하지 않는다.

공통 TypeScript는 지원 여부·권한·선택·실제 적용 영수증을 구분하고, Android/iOS 구현은 서로 다른 선택/제한 API를 캡슐화한다. 현재 단계에서는 의미 없는 저장소·활성 상태 machine·가짜 어댑터를 추가하지 않았다. 설치 앱/선택 token/권한·차단 상태를 Backend 계정 데이터에 업로드하는 API도 만들지 않는다. 향후 계정별 기기 로컬 기록을 추가하면 기존 계정 탈퇴 정리와 로그인 전환 처리에 함께 연결해야 한다.

현재 `StudySession`은 `startedAt`과 화면용 `timing`을 제공한다. API DTO의 `maxEndAt`은 지금 화면 모델로 그대로 노출되지 않는다. 네이티브 연동 단계에서는 API·Mock 매핑과 테스트를 함께 바꾸어 검증한 종료 한계를 전달해야 하며, JS `performance.now()`와 네이티브 monotonic clock의 원점을 동일하게 취급하지 않는다. 공부 정산·볼트·XP는 계속 기존 StudyService와 서버 결과를 따른다.

## 공부 세션 연결 조건 — 후속 구현 기준

| 시점 | 필요한 동작 |
| --- | --- |
| 선택/권한 | 실제 OS 선택과 권한 확인을 완료하고, 확인 전·거절·회수·미지원·오류를 구분한다. 권한 획득만으로 차단 중을 표시하지 않는다. |
| 시작/복구 | 확인된 활성 세션과 사용자 scope에 한정된 lease로 적용한다. 네이티브가 같은 세션·선택·종료 한계의 적용을 확인해야 활성 상태를 표시한다. 공부 시작을 실패한 차단 기능이 막거나 가짜 제한을 성공으로 표시하지 않는다. |
| 로컬 종료 요청 | 사용자가 공부를 끝내면 원래 종료 시각 보관·서버 재전송과 별개로 로컬 제한을 해제한다. 서버 정산 실패 때문에 기기를 계속 잠그지 않는다. |
| 12시간/프로세스 종료 | JS interval이 멈춰도 제한이 무기한 남지 않게 네이티브 만료를 둔다. 시간 변경·재부팅과 앱 종료를 실제 기기에서 검증하며 검증되지 않은 오래된 lease를 무조건 재적용하지 않는다. |
| 다른 기기에서 종료 | 서버 복구/foreground 조회가 종료를 확인하면 이 기기의 제한도 해제한다. 푸시/상시 연결 없이 백그라운드에서 다른 기기 종료를 즉시 알 수 있다고 약속하지 않는다. |
| 권한 회수/로그아웃/탈퇴 | 실제 적용 상태를 재확인하고 이전 scope의 제한을 해제한다. 이전 비동기 적용 완료가 새 계정의 적용을 되살리지 않도록 네이티브에서도 세대/lease를 검사한다. |

자기 앱·공부 종료/기기 설정 진입을 막아 사용자가 제한을 해제할 수 없는 설계는 사용하지 않는다. 앱 선택·권한·제한 실패는 공부 시간이나 보상에 임의의 벌점을 주는 규칙으로 확장하지 않는다.

## 다음 구현을 시작할 자료와 순서

1. Android 우선으로 검증할 OS 버전·기기와 팀의 Android 패키지명을 정한다. iOS Bundle ID와 검증 기기는 후속 플랫폼 작업에서 정한다.
2. Android는 필요한 범위의 앱 선택과 권한/서비스의 실제 제한·해제를 별도 development build에서 검증한다. iOS는 Family Controls capability/배포 entitlement·extension 구성과 시스템 picker/shield를 검증한다.
3. 동작이 확인된 플랫폼 어댑터를 StudyProvider에 연결해 위 생명주기와 로컬 데이터 정리를 테스트한 뒤 선택/권한 UI를 제공한다.
4. 권한 거부/회수·설정 이동·백그라운드·강제 종료·재부팅·기기 시간 변경·오프라인 종료·12시간·계정 전환·다중 기기 종료를 검증한다. 스토어 제출 조건도 별도로 확인한다.

## 이번 코드 검증

타입·린트와 기존 **370개 테스트**, API Android/iOS/Web·Mock Web 번들이 통과했다. 안내/네비게이션 변경에 정적인 문구를 복제하는 단위 테스트는 추가하지 않았다. 운영 API를 차단한 격리 Chrome의 가짜 API로 인증 가드·마이/Study 진입·탭 숨김·미적용 문구·가짜 권한 토글 없음·동일 세션/타이머 유지·안내 새로고침 뒤 복구·시작 1회/종료 1회·종료 후/다른 계정의 복귀 버튼 미노출을 확인했다. Mock도 안내 이동 중 원래 공부 기록 보존과 정상 종료 결과 1개를 확인했다. 320×568·390×844·1280×844 화면을 확인했고 운영 쓰기·Mock 운영 호출은 없었다. 실제 차단·기기 권한·실기기 빌드가 검증됐다는 뜻은 아니다.

미리보기는 `http://localhost:8082/app-blocking`이다. 마이 설정의 `앱 차단 안내`에서 열 수 있고(공부 화면은 같은 문구의 안내 창만 띄운다) 활성 세션이 확인되면 `진행 중인 공부로` 돌아간다. 공부를 시작하거나 끝내는 버튼을 이 안내 화면에 추가하지 않았다.
