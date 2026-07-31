# Quality Standard

## Quick Verification
```bash
npm run verify:quick
```

권장 구성:
- format check
- lint
- typecheck

## Full Verification
```bash
npm run verify
```

권장 구성:
- quick verification
- test
- build

## Quality Gate
다음 중 하나라도 해당하면 완료로 처리하지 않는다.
- 빌드 실패
- 타입 오류
- Lint 오류
- 테스트 실패
- 기존 기능 영향 미확인
- 비밀정보 노출 가능성
- 문서와 코드 불일치
