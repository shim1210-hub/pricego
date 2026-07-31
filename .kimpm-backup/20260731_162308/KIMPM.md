# KIMPM.md
## KimPM Project Development Constitution v1.1

> 좋은 코드는 단순히 실행되는 코드가 아니다.  
> 읽을 수 있고, 이해할 수 있고, 수정할 수 있고, 확장할 수 있어야 한다.

## Project Profile
- Project Name: `<PROJECT_NAME>`
- Service Purpose: `<SERVICE_PURPOSE>`
- Project Type: `<WEB | MOBILE | API | PLATFORM>`
- Repository: `<REPOSITORY_URL>`
- Local Path: `<LOCAL_PATH>`
- Default Branch: `<BRANCH_NAME>`
- Current Version: `<VERSION>`

## Technology Stack
- Runtime: `<NODE_VERSION>`
- Framework: `<NEXT_JS | EXPO | EXPRESS | OTHER>`
- Language: `<TYPESCRIPT | JAVASCRIPT>`
- Database: `<POSTGRESQL | OTHER>`
- Deployment: `<VERCEL | EAS | OTHER>`

## Architecture Rules
- 화면, 비즈니스 로직, 데이터 접근 책임을 구분한다.
- 프로젝트 규모보다 복잡한 구조를 만들지 않는다.
- 주요 구조 결정은 `docs/DECISION_LOG.md`에 기록한다.

## Maintainability Standard
- 필요한 주석
- 코드 간편화
- 가독성
- 명확한 네이밍
- 중복 제거
- 구조 단순화
- 변경 용이성
- 영향 범위 통제
- 코드와 문서의 일치

## Coding Rules
- 의미 없는 약어와 모호한 이름을 피한다.
- 함수는 하나의 핵심 책임만 수행한다.
- Early Return으로 조건 중첩을 줄인다.
- 매직 넘버와 반복 문자열은 상수로 관리한다.
- 단순한 코드를 과도하게 추상화하지 않는다.

## Comment Standard
주석이 필요한 경우:
- 비즈니스 규칙
- 복잡한 계산과 알고리즘
- 외부 시스템 제약
- 보안 판단
- 일반적이지 않은 예외 처리
- 임시 우회 구현
- 변경 시 주의사항

## Database Standard
- 테이블과 컬럼 구조를 확인한 뒤 개발한다.
- 컬럼 표준은 `docs/DB_STANDARD.md`를 따른다.
- DB 변경은 기존 데이터, API, 화면 영향까지 확인한다.
- 비밀정보는 `.env*`에 두고 Git 추적 여부를 확인한다.

## Git Standard
- 커밋 전 `git status`와 `git diff`를 확인한다.
- 하나의 커밋에는 하나의 명확한 목적을 담는다.
- 비밀정보와 불필요한 생성 파일을 커밋하지 않는다.

## Quality Standard
- 개발 중: `npm run verify:quick`
- 작업 완료 전: `npm run verify`
- 검증 실패 시 완료 처리 금지
- 상세 기준은 `docs/QUALITY_STANDARD.md` 참고

## AI Development Rules
1. `AGENTS.md` 확인
2. 요구사항과 현재 구조 확인
3. 영향 범위와 대상 파일 식별
4. 작은 단위로 구현
5. 필요한 주석과 문서 갱신
6. 자동 검증 실행
7. 변경 파일과 검증 결과 보고

## Prohibited Practices
- 추측 기반 구현
- 기존 기능 확인 없는 전면 수정
- 검증 없는 완료 보고
- 반복 하드코딩
- 비밀정보 커밋
- 무분별한 `any`
- 방치된 TODO와 FIXME
- 실제 코드와 불일치하는 문서
