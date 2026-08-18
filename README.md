# 분열된 세계 ONLINE — 소스 구조 (위임 버전)

기존 단일 HTML을 **콘텐츠(JSON) / 로직(JS) / 껍데기(HTML)** 로 분리한 것입니다.
개발은 여러 파일로 하고, **배포는 여전히 단일 HTML 하나**입니다. GAS 웹앱 배포 방식은 그대로입니다.

## 폴더

```
game_src/
 ├─ data/          ← 콘텐츠. 여기만 고치면 게임 내용이 바뀝니다 (코드 지식 불필요)
 │   ├─ balance.json    경험치/골드/드랍 배율, 테스트 지급액
 │   ├─ items.json      아이템 63종, 장착 부위, 상점 분류
 │   ├─ classes.json    직업 3종 스탯, 스킬 12종, 물약 슬롯
 │   ├─ monsters.json   몬스터 14종, 변신 6종, 동족 링크 반경
 │   ├─ zones.json      지역 6곳(크기·게이트·NPC·스폰), 지형 색
 │   ├─ story.json      세계관 도입부, 인트로 6장면, 퀘스트 8종, 기록물 12종
 │   └─ npcs.json       진영 6, 필드 NPC 9종, 지역별 배치, 포탈, 축복, 습격/배신
 ├─ src/           ← 로직. 27개 모듈 (_order.json 순서대로 합쳐짐)
 ├─ shell/template.html  ← HTML 껍데기 + CSS. {{DATA}}/{{CODE}} 자리에 주입됨
 ├─ build.py       ← 빌드 스크립트
 └─ dist/          ← 산출물 (직접 수정 금지)
```

## 빌드

```
python build.py            빌드 (경량 · 칩튠 BGM)
python build.py --music    실제 음원 내장 빌드
python build.py --check    빌드 + 문법검사(node 있을 때)
python build.py --out "C:\경로\원하는이름.html"
```

산출물 HTML 하나만 배포하면 됩니다.
GAS에 올릴 때는 이 파일 내용을 `index.html`에 붙여넣습니다.

### 음악

| 빌드 | 크기 | BGM |
|---|---|---|
| `python build.py` | 약 240 KB | 칩튠(WebAudio 자동 연주) |
| `python build.py --music` | 약 2.7 MB | `assets/music/*.mp3` 내장 |

음원은 `assets/music/` 에 `intro.mp3` `field.mp3` `dungeon.mp3` 세 개만 두면 됩니다.
지역별 배정은 `src/05b_music.js` 의 `MUSICMAP` 한 줄로 바뀝니다.

```js
var MUSICMAP = { town:"intro", field:"field", dun:"dungeon", dun2:"dungeon" };
```

- 게임 안에서 **⚙ 설정 → 음악 종류**로 실제 음악 ↔ 칩튠을 바꿀 수 있습니다.
- 음원이 없는 빌드에서는 이 항목이 아예 표시되지 않고 자동으로 칩튠으로 동작합니다.
- 브라우저 자동재생 정책 때문에 **첫 클릭·키 입력 시점에 재생이 시작**됩니다(정상 동작).
- 음원 교체 시 `ffmpeg -i 원본 -vn -b:a 96k out.mp3` 정도면 충분합니다.

## 자주 하는 작업

| 하고 싶은 것 | 고칠 파일 |
|---|---|
| 몬스터 체력·경험치·드랍 조정 | `data/monsters.json` |
| 아이템 성능·가격·직업 제한 | `data/items.json` |
| 퀘스트 대사·목표·보상 | `data/story.json` |
| 인트로 문구 | `data/story.json` 의 `INTRO` |
| 지역 크기·몬스터 배치 | `data/zones.json` |
| 테스트 배율 끄기(정식 공개용) | `data/balance.json` 의 `XP_MULT`, `TEST_GOLD` |
| 스킬 수치·습득 레벨 | `data/classes.json` |
| 포탈 요금·해금 레벨 | `data/npcs.json` 의 `PORTAL` |
| 축복 효과·지속시간·가격 | `data/npcs.json` 의 `BUFFS` |
| 필드 NPC 능력치·대사·드랍 | `data/npcs.json` 의 `FNPC` |
| 지역별 NPC 수 | `data/npcs.json` 의 `NSPAWN` |
| 습격 빈도·배신 확률 | `data/npcs.json` 의 `AMBUSH` |
| 세력 관계(누가 누구와 싸우나) | `data/npcs.json` 의 `HOSTILE` |

> data/*.json 은 **JSON 문법**입니다. 마지막 항목 뒤에 쉼표를 남기면 빌드가 실패하니 주의하십시오.
> 빌드가 실패하면 어느 파일인지 콘솔에 표시됩니다.

## 주의

- `dist/` 안의 HTML은 빌드 산출물입니다. 여기를 고치면 다음 빌드에서 사라집니다.
- 파일 저장은 **UTF-8** 로 하십시오(메모장은 "UTF-8"로 저장).
- 세이브 포맷은 분리 전후가 동일합니다. 기존 .sav 파일 그대로 사용 가능합니다.

## 환경 설정 (게임 내 ⚙ 설정 / [O] 키)

플레이어가 직접 바꾸는 값입니다. `data/` 가 아니라 **브라우저에 저장**되며 세이브 파일과 무관합니다.
기본값을 바꾸려면 `src/01b_options.js` 상단의 `OPT` 초기값을 고치십시오.

| 항목 | 내용 |
|---|---|
| 화면 배율 | 자동 / 100~300%. 예전에는 100%가 상한이라 큰 모니터에서 작게 보였습니다 |
| 픽셀 선명도 | 배율을 0.5 단위로 내림 → 캔버스가 항상 정수배로 확대되어 도트·글씨가 뭉개지지 않음 |
| 시야 범위 | 캔버스 내부 해상도(480×288 ~ 720×432). 넓힐수록 맵이 많이 보이고 도트는 작아짐 |
| 배경음악 / 효과음 | 켜기·끄기 + 음량 5단계 (WebAudio 게인 노드) |
| 화면 흔들림 · 데미지 숫자 | 끄기 가능 |
| 미니맵 · 퀘스트 추적 | 끄기 가능 |
| 몬스터 밀도 | 1.0 / 1.6 / 2.2 / 3.0배. **보스·중간보스는 배율에서 제외** |

`VW`/`VH` 가 캔버스 내부 해상도입니다. 렌더·입력 좌표 변환이 전부 이 값을 참조하므로
해상도를 바꿔도 클릭 좌표가 어긋나지 않습니다.

## 진영 / 세력전

필드 NPC의 적대 판정은 **오직 진영(fac) 값 하나**로 결정됩니다. `data/npcs.json` 의 `HOSTILE` 표가 전부입니다.

추후 세력전을 붙일 때는 전투 코드를 고칠 필요 없이 런타임에 한 줄이면 됩니다.

```js
setWar("guard","cult",true);    // 노스가드 ↔ 환원교단 전쟁 개시
setWar("guard","cult",false);   // 휴전 (서로 잡고 있던 표적도 자동으로 놓음)
```

새 세력을 추가하려면 `FACTION` 에 항목 하나, `HOSTILE` 에 줄 하나, `FNPC` 에 그 진영 소속 NPC를
넣으면 됩니다. 렌더·AI·미니맵 색까지 전부 자동으로 따라옵니다.

## 다음 단계 후보

1. `canon/*.yaml` 을 읽어 `data/story.json` 을 자동 생성 — 소설 설정을 고치면 게임에 자동 반영
2. `assets/` 스프라이트 폴더 분리 (Phase 2 스프라이트 작업과 연결)
3. `data/` 검증 스크립트 — 없는 아이템 키를 퀘스트 보상에 쓰는 등의 실수를 빌드 때 잡아줌
