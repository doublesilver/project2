# Content Hub MVP v1

콘텐츠 허브 1차 MVP는 `automation`, `productivity`, `checklist` 3개 카테고리로 운영합니다.

## Category Map

```text
content-hub/
  README.md
  categories/
    automation/README.md
    productivity/README.md
    checklist/README.md
  templates/
    automation-article-template.md
    productivity-article-template.md
    checklist-article-template.md
```

## 카테고리 운영 원칙

- `automation`: 반복 업무를 제거하거나 시스템화하는 실행 가이드
- `productivity`: 개인/팀 생산성 향상을 위한 실행 프레임워크와 사례
- `checklist`: 실행 누락 방지를 위한 점검 항목 중심 문서

## 네이밍 규칙

- 카테고리 폴더는 영문 소문자 slug를 사용합니다.
- 신규 글 파일명은 `YYYY-MM-DD-짧은-slug.md` 형식을 사용합니다.
- 글 front matter의 `category` 값은 폴더명(`automation`, `productivity`, `checklist`)과 동일해야 합니다.

## 템플릿

- [Automation 글 템플릿](templates/automation-article-template.md)
- [Productivity 글 템플릿](templates/productivity-article-template.md)
- [Checklist 글 템플릿](templates/checklist-article-template.md)

## 게시 워크플로우

1. 카테고리에 맞는 템플릿을 선택합니다.
2. front matter를 채운 뒤 본문을 작성합니다.
3. 최소 2개 이상의 내부링크를 연결합니다.
4. 게시 전 체크리스트로 링크/문장/CTA를 점검합니다.

## Link QA Checklist

- 상대경로 링크가 실제 파일을 가리키는지 확인
- 앵커 링크(`#...`)가 실제 헤더와 일치하는지 확인
- 새 글에서 허브 루트와 카테고리 문서로 역링크를 넣었는지 확인
