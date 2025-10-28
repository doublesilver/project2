# AI 기반 채용 공고 분석 및 매칭 플랫폼

## 🚀 프로젝트 소개

이 프로젝트는 신입 개발자를 위한 이상적인 기술 스택 포트폴리오를 목표로, AI, 고성능 백엔드, 데이터 엔지니어링 역량을 통합하여 하나의 완성된 시스템을 구축합니다. 채용 공고 데이터를 수집하고, 이를 기반으로 AI 서비스를 제공하며, 현대적인 백엔드 API를 통해 기능을 노출하는 'AI 기반 채용 공고 분석 및 매칭 플랫폼'입니다.

## ✨ 주요 기능

### 1. 데이터 수집 (Data Pipeline)
*   **역할**: 주기적으로 채용 사이트(예: `python.org/jobs`)의 데이터를 수집(크롤링)하고 전처리하여 PostgreSQL 데이터베이스에 적재합니다.
*   **기술**: `Scrapy`, `BeautifulSoup4`, `SQLAlchemy`, `psycopg2-binary`

### 2. 핵심 API 서버 (Core API Server)
*   **역할**: 데이터 파이프라인이 수집한 데이터를 외부(프론트엔드 등)에 제공하고, 사용자 관리 및 인증을 담당합니다.
*   **기술**: `FastAPI`, `PostgreSQL`, `SQLAlchemy ORM`, `JWT 인증`, `passlib`, `python-jose`, `uvicorn`

### 3. AI 지능형 서비스 (AI Service)
*   **역할**: Gemini AI를 활용하여 채용 공고 분석 및 매칭 기능을 제공합니다.
*   **기술**: `Google Gemini API (google-genai)`

## 🛠️ 기술 스택

*   **언어**: Python 3.x
*   **웹 프레임워크**: FastAPI
*   **데이터베이스**: PostgreSQL
*   **ORM**: SQLAlchemy
*   **크롤링**: Scrapy
*   **AI/ML**: Google Gemini API (google-genai)
*   **인증**: JWT (JSON Web Tokens)
*   **비밀번호 해싱**: bcrypt (passlib)
*   **환경 변수 관리**: python-dotenv

## 🚀 설치 및 실행 방법

### 1. 필수 요구사항
*   Python 3.x 설치
*   PostgreSQL 데이터베이스 설치 및 실행

### 2. 프로젝트 클론 및 디렉토리 이동
```bash
# 이 프로젝트는 C:\toy\ai-job-matcher 에 생성되어 있습니다.
cd C:\toy\ai-job-matcher
```

### 3. 가상 환경 설정 및 활성화
```bash
python -m venv venv
.array\venv\Scripts\activate
```

### 4. 의존성 설치
```bash
pip install -r requirements.txt # (아래 수동 설치 목록 참고)
# 또는 수동 설치:
pip install Scrapy BeautifulSoup4 Pandas SQLAlchemy psycopg2-binary
pip install fastapi "uvicorn[standard]" python-multipart
pip install "passlib[bcrypt]" python-jose
pip install google-genai
```

### 5. 환경 변수 설정
*   `C:\toy\ai-job-matcher` 디렉토리에 `.env` 파일을 생성합니다.
*   `GOOGLE_API_KEY`와 `SECRET_KEY`를 설정합니다. `SECRET_KEY`는 JWT 토큰 서명에 사용되는 비밀 키입니다. (예시: `openssl rand -hex 32` 명령어로 생성 가능)
*   `GOOGLE_API_KEY`는 [Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급받습니다.

    ```ini
    # .env 파일 예시
    DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:5432/YOUR_DB_NAME"
    GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
    SECRET_KEY="YOUR_JWT_SECRET_KEY_HERE"
    ```

### 6. 데이터베이스 설정
*   `job_scraper\job_scraper\settings.py` 파일에서 `DATABASE_URL`을 본인의 PostgreSQL 연결 정보로 수정합니다.
*   `.env` 파일의 `DATABASE_URL`도 동일하게 설정합니다.

### 7. 데이터 수집 (Scrapy 실행)
*   FastAPI 서버를 실행하기 전에, 먼저 데이터를 수집하여 데이터베이스를 채웁니다.
```bash
.array\venv\Scripts\activate
cd job_scraper
scrapy crawl python_jobs
```

### 8. FastAPI 서버 실행
*   프로젝트 루트 디렉토리(`C:\toy\ai-job-matcher`)에서 다음 명령어를 실행합니다.
```bash
.array\venv\Scripts\activate
uvicorn main:app --reload
```
*   서버가 시작되면 `http://127.0.0.1:8000`에서 접근할 수 있습니다.

## 🌐 API 엔드포인트

API 문서는 서버 실행 후 `http://127.0.0.1:8000/docs`에서 확인할 수 있습니다.

### 사용자 및 인증
*   **`POST /users/`**: 새로운 사용자 계정 생성 (회원가입)
*   **`POST /token`**: 사용자 로그인 및 JWT Access Token 발급
*   **`GET /users/me/`**: 현재 로그인된 사용자 정보 조회
*   **`POST /users/me/resume`**: 현재 로그인된 사용자의 이력서 업로드

### 채용 공고
*   **`GET /jobs/`**: 모든 채용 공고 목록 조회 (페이지네이션 지원)

### AI 서비스 (인증 필요)
*   **`GET /jobs/{job_id}/summary`**: 특정 채용 공고의 내용을 Gemini AI로 요약
*   **`GET /jobs/{job_id}/interview`**: 특정 채용 공고를 기반으로 Gemini AI가 면접 질문 생성
*   **`GET /users/me/match`**: 현재 사용자의 이력서와 가장 잘 맞는 채용 공고 3개를 Gemini AI로 추천

## 🧪 테스트 방법

1.  서버 실행 후 `http://127.0.0.1:8000/docs`에 접속합니다.
2.  `POST /users/`로 사용자 계정을 생성합니다.
3.  `POST /token`으로 로그인하여 `access_token`을 발급받습니다.
4.  페이지 상단의 **`Authorize`** 버튼을 클릭하고, `Bearer YOUR_ACCESS_TOKEN` 형식으로 토큰을 입력하여 인증합니다.
5.  각 AI 서비스 엔드포인트(`GET /jobs/{job_id}/summary`, `GET /jobs/{job_id}/interview`, `GET /users/me/match`)를 `Try it out` 기능을 통해 테스트합니다.
    *   `GET /users/me/match`를 테스트하기 전에 `POST /users/me/resume`를 통해 이력서를 먼저 업로드해야 합니다.

## 💡 향후 개선 사항
*   프론트엔드 개발을 통한 사용자 인터페이스 제공
*   데이터 수집 스케줄링 (Airflow 또는 APScheduler 연동)
*   클라우드 배포 (AWS, GCP 등)
*   AI 모델의 프롬프트 엔지니어링 고도화 및 다양한 AI 기능 추가
*   이력서 및 채용 공고 텍스트 임베딩을 활용한 벡터 검색 기반 매칭 시스템 도입
