# @edumaker/edumaker-app

에듀메이커 블록코딩 앱. 이 저장소의 Scratch 편집기(`scratch-gui`)를 그대로 띄우고, 편집기 메뉴 막대에
에듀메이커 메뉴(콘텐츠·정보)를 넣고, 콘텐츠를 열면 편집기 왼쪽/오른쪽에 스토리 패널을 보여 준다.

## 실행

```sh
npm run build --workspace=packages/scratch-gui   # 편집기를 먼저 빌드 (dist/)
cd packages/edumaker-app
npm run dev        # 개발 서버: 편집기 dist 파일을 앱과 같은 위치에서 제공
npm run build      # dist/ 에 앱 + 편집기 사본 생성
npm test           # 린트 + Vitest
```

- 편집기 언어는 기본 한국어이며 `?locale=en`처럼 바꿀 수 있다.
- 편집기와 앱은 React 사본이 따로라서, 앱은 편집기에 문자열 설정과 빈 메뉴 칸 id(`extraMenuSlotId`)만
  넘기고 그 칸을 React portal로 채운다. 블록 검사는 편집기 VM(`runtime.targets`)을 읽어서 한다.

## 학급(반)으로 쓰기

허브(edumaker-hub-app)와 같은 Firebase 프로젝트(`edumaker-gallery`)의 학급을 그대로 쓴다.

- 학생 링크: `https://code.edumaker.kr/#class/{반ID}?pw={반 비밀번호}`. 비밀번호가 없거나 틀리면 입장 창이 뜬다.
  링크의 비밀번호는 이 탭의 sessionStorage에 두고 주소창에서 지운다(허브의 다른 앱과 같음).
- 입장은 허브의 서버 함수 `classLogin`(role `student`)으로 "반 출입증"을 받아 Firebase에 로그인한다.
- 관리자가 학급 문서(`classes/{반ID}`)의 `blocksLessons`(수업 id 배열)에 연 수업만 콘텐츠 메뉴에 보인다.
- 수업은 Firestore `blocksLessons/{수업ID}`(형식: `src/content/format.ts`의 `LessonDocument`), 그림·시작 프로젝트는
  Storage `blocks/lessons/{수업ID}/{경로}`에 있다. 읽기 권한은 허브 저장소의 Firestore·Storage 규칙이 정한다
  (그 반 출입증 + 그 반에 열린 수업만).
- 수업 데이터는 비공개 저장소 `edumaker-contents`에서 작성하고, 그 저장소의 자동화가 `scripts/content-plan.ts`로
  검사한 뒤 Firestore·Storage에 올린다.
- 반 링크 없이 열면 편집기만 쓴다(자유 코딩). 개발·시험 사이트에는 공개 샘플 수업이 보이고, 실서비스
  빌드(`VITE_SAMPLE_CONTENTS=false`)에서는 보이지 않는다.

## 배포

- 시험 사이트: GitHub Pages(`edumaker7.github.io/edumaker-code/{브랜치}/`), CI가 자동 배포.
- 실서비스(`code.edumaker.kr`): `develop`에 머지되면 CI의 Deploy 작업이 Firebase Hosting에 올린다. 저장소 비밀값
  `FIREBASE_SERVICE_ACCOUNT`(서비스 계정 JSON)와 변수 `FIREBASE_HOSTING_SITE`(Hosting 사이트 ID)가 있어야 동작한다.

## 콘텐츠

콘텐츠는 코드가 아니라 데이터(JSON)다. 앱은 콘텐츠 기준 URL의 `index.json`(목록)을 읽고, 항목마다 수업 파일을
불러온다. 기준 URL은 기본이 앱에 들어 있는 `contents/`(공개 시험용 샘플만)이고, 빌드할 때
`VITE_CONTENT_BASE_URL`로 바꿀 수 있다. 실제 수업 콘텐츠는 별도 비공개 저장소에서 관리하고 배포 시 이 위치에 둔다.

형식(버전 1)은 `src/content/format.ts`에 정의되어 있다.

```jsonc
// index.json
{ "formatVersion": 1, "lessons": [{ "id": "…", "title": "…", "category": "…", "summary": "…", "path": "unit/lesson.json" }] }

// 수업 파일 (경로는 이 파일 기준)
{
  "formatVersion": 1,
  "id": "…", "title": "…", "subtitle": "…",
  "panelSide": "left",                 // left | right
  "starterProject": "starter.sb3",     // 선택: 수업을 열 때 불러올 프로젝트
  "steps": [{
    "id": "…", "title": "…",
    "body": ["문단", "…"],
    "image": "images/a.png",           // 선택
    "mission": "…", "hint": "…",       // 선택
    "checks": [                         // 모두 통과해야 성공
      { "type": "hasBlock", "opcode": "motion_movesteps", "minCount": 1, "target": "any" },
      { "type": "hasBlockInScript", "hat": "event_whenflagclicked", "opcode": "looks_sayforsecs" },
      { "type": "hasSprites", "minCount": 2, "feedback": "스프라이트를 하나 더 추가해 보세요." }
    ]
  }]
}
```

미션이 있는 단계는 확인을 통과해야 "다음"으로 갈 수 있다. 확인에 실패하면 처음 실패한 검사의 `feedback`(없으면 기본 문구)을
보여 준다.

`target`은 `any`(기본) | `stage` | `sprite` | `{ "sprite": "이름" }`. opcode는 Scratch 블록 opcode다.
형식을 바꾸면 `CONTENT_FORMAT_VERSION`을 올린다. `test/format.test.ts`가 공개 샘플을 검증한다.

비공개 콘텐츠에는 Scratch 라이브러리 에셋(CC BY-SA)을 넣지 않는다(동일조건변경허락 조건이 콘텐츠에 걸릴 수 있음).
