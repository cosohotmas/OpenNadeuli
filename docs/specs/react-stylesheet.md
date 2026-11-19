# React 스타일시트 로드

## Why

프리뷰에서 기본 브라우저 스타일로 표시되어 사용자가 채팅 화면과 입력 영역을 구분하기 어렵다.

## Goal

- Vite 배포 HTML에 CSS 링크가 1개 이상 존재하고 해당 자산이 HTTP 200과 `text/css`를 반환한다.
- 범위 제외는 초기 HTML 화면과 기능의 복원이다.

## What

- Vite 개발과 프리뷰, 배포 빌드에서 기존 React 스타일을 적용한다.

## How

- React 진입점에서 기존 `frontend/src/styles.css`를 가져온다.

## AC

- Given Vite 프로덕션 빌드. When 생성된 HTML을 읽고 CSS 링크를 요청한다. Then Vite가 생성한 스타일시트를 받으며 채팅 레이아웃에 적용된다.
