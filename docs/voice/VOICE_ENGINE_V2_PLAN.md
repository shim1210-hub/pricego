# PriceGo 음성 엔진 v2 계획

## 현재 구현

- Android 기본 음성인식 엔진은 `expo-speech-recognition@56.0.1`을 사용한다.
- 통화 선택과 인식 언어는 분리한다. 현재 VND 기본 입력 언어는 `ko-KR`이다.
- 세션마다 식별자를 만들고 Partial, Final, End, Error, Timeout 로그에 포함한다.
- Listener는 인식 시작 직전에 등록하고 세션 종료·취소·오류·타임아웃마다 제거한다.
- 타임아웃은 native `start()`가 성공한 뒤 하나만 시작하며 Partial 수신 시 갱신한다.
- Final 결과가 없더라도 End 시 유효한 Partial 결과가 있으면 해당 결과를 후속 가격 파싱으로 전달한다.

## 장애 원인 후보

1. Standalone APK가 변경된 native 설정을 포함하지 않은 경우
2. Android 음성 서비스가 비활성화되었거나 `ko-KR`을 지원하지 않는 경우
3. 권한 거부·busy·network·speech-timeout 등 native 오류
4. 인식 결과는 도착했지만 통화 단위가 없어 가격 파싱에서 거절되는 경우

## 진단 로그

`PRICEGO_SPEECH_SESSION`, `PRICEGO_SPEECH_START`, `PRICEGO_SPEECH_PARTIAL`,
`PRICEGO_SPEECH_FINAL`, `PRICEGO_SPEECH_END`, `PRICEGO_SPEECH_ERROR`,
`PRICEGO_SPEECH_TIMEOUT`을 세션 단위로 확인한다. 음성 원문·개인정보는 운영 로그에 수집하지 않는다.

## Whisper 도입 계획

Whisper 또는 whisper.cpp는 이번 변경에서 설치하지 않는다. 도입 시 별도 PoC로 다음을 검증한다.

- APK 크기와 모델 다운로드 방식
- 저사양 Android 성능·배터리·메모리
- 오프라인 언어 지원 및 VAD
- 기본 Android 엔진 실패 시 fallback 경로
- 음성 데이터의 로컬 처리와 개인정보 보호

## 검증 순서

1. 새 APK 빌드 및 설치
2. 마이크 권한 확인
3. VND 선택 후 `ko-KR`로 1,000·10,000·300,000 발화
4. Partial만 수신되는 기기에서 End fallback 확인
5. 무음·권한 거부·busy·network 오류의 사용자 메시지 확인
6. 로그의 sessionId가 이전 세션과 섞이지 않는지 확인
