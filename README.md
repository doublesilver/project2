# 🤖 AI 기반 스마트 채용 공고 매칭 플랫폼
"Data Engineering부터 AI Service까지, End-to-End 시스템 구축"

💡 **"단순한 채용 게시판이 아닙니다."** Scrapy로 수집한 데이터를 LLM(Gemini)이 분석하고, 최적의 인재를 매칭해주는 지능형 채용 어시스턴트입니다.

<div align="center">

📚 **API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Local Only)

</div>

---

## 📑 목차
- [프로젝트 개요](#-프로젝트-개요)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시스템 아키텍처](#-시스템-아키텍처)
- [API 엔드포인트](#-api-엔드포인트)
- [설치 및 실행](#-설치-및-실행)
- [콘텐츠 허브 MVP (1차)](content-hub/README.md)
- [README 내부링크 규칙](#readme-internal-link-rules)
- [향후 개선 계획](#-향후-개선-계획)

---

## 📋 프로젝트 개요
| 항목 | 내용 |
|------|------|
| **프로젝트명** | AI Job Matcher (지능형 채용 분석 플랫폼) |
| **핵심 목표** | 데이터 수집(ETL) → API 서빙 → AI 분석으로 이어지는 Full-Cycle 백엔드 역량 증명 |
| **주요 특징** | 자동화된 크롤링, RAG 기반 매칭, JWT 보안 시스템 |
| **개발 환경** | Python 3.11, Windows/Linux |

---

## ✨ 주요 기능

```mermaid
graph TD
    Root((AI Job Matcher))
    
    Root --> A["데이터 파이프라인"]
    A --> A1["Scrapy 크롤러"]
    A --> A2["채용 사이트 자동 수집"]
    A --> A3["데이터 전처리 및 정제"]
    A --> A4["PostgreSQL 적재"]

    Root --> B["핵심 API 서버"]
    B --> B1["FastAPI 고성능 서버"]
    B --> B2["JWT 인증 / 인가"]
    B --> B3["사용자 이력서 관리"]
    B --> B4["RESTful 설계"]

    Root --> C["AI 인텔리전스"]
    C --> C1["Google Gemini Pro 연동"]
    C --> C2["공고 자동 요약"]
    C --> C3["예상 면접 질문 생성"]
    C --> C4["이력서-공고 매칭 점수"]
```

### 1. 🕷️ 자동화된 데이터 수집 (ETL)
- **Scrapy 프레임워크**를 활용하여 python.org/jobs 등 주요 채용 사이트 데이터 크롤링
- 비정형 HTML 데이터를 구조화된 데이터(Schema)로 변환하여 DB 적재

### 2. 🧠 AI 기반 분석 서비스 (GenAI)
- **공고 요약**: 긴 채용 공고(JD)를 3줄 핵심 요약으로 변환
- **면접 코칭**: JD를 분석하여 "나올 법한 기술 면접 질문 5가지" 자동 생성
- **스마트 매칭**: 사용자 이력서와 공고 간의 적합도(Fit Score) 분석 및 추천

### 3. 🔐 안전한 사용자 관리
- **JWT (JSON Web Token)** 기반의 Stateless 인증 시스템 구축
- **bcrypt 알고리즘**을 사용한 비밀번호 단방향 암호화 저장

---

## 🛠 기술 스택

### Backend & Core
| 기술 | 용도 | 선택 이유 |
|------|------|----------|
| **Python 3.11** | 주 언어 | 풍부한 라이브러리 생태계 및 AI 연동 용이성 |
| **FastAPI** | Web Framework | Flask/Django 대비 압도적인 성능 및 비동기 지원 |
| **SQLAlchemy** | ORM | Python 객체와 관계형 데이터베이스 매핑 |
| **Pydantic** | Validation | 데이터 유효성 검사 및 설정 관리 |

### Data & AI
| 기술 | 용도 | 선택 이유 |
|------|------|----------|
| **PostgreSQL** | Database | 대용량 데이터 처리 및 안정성 |
| **Scrapy** | Crawler | 비동기 기반의 고성능 웹 크롤링 프레임워크 |
| **Gemini API** | LLM | 최신 성능의 멀티모달 AI 모델 활용 |

---

## 🏗 시스템 아키텍처

```mermaid
flowchart LR
    subgraph External["🌐 External Sources"]
        JobSite["Job Boards"]
        Gemini["Google Gemini API"]
    end

    subgraph DataPipeline["⚙️ Data Pipeline"]
        Scrapy["Scrapy Crawler"]
    end

    subgraph Server["🖥️ Backend Server"]
        FastAPI["FastAPI"]
        Auth["JWT Auth"]
        AIService["AI Controller"]
    end

    subgraph Database["💾 Storage"]
        PG[("PostgreSQL")]
    end

    subgraph Client["👤 User"]
        UserBrowser["Web Client"]
    end

    JobSite -->|Crawl| Scrapy
    Scrapy -->|Insert| PG
    
    UserBrowser -->|Request| FastAPI
    FastAPI -->|Query| PG
    FastAPI <-->|Inference| Gemini
```

---

## 🌐 API 엔드포인트
| 태그 | 메서드 | 엔드포인트 | 설명 | 인증 |
|---|---|---|---|---|
| Auth | POST | `/users/` | 회원가입 | ❌ |
| Auth | POST | `/token` | 로그인 (JWT 발급) | ❌ |
| User | GET | `/users/me/` | 내 정보 조회 | ✅ |
| Resume | POST | `/users/me/resume` | 이력서 등록 | ✅ |
| Job | GET | `/jobs/` | 채용 공고 목록 (Paging) | ❌ |
| AI | GET | `/jobs/{id}/summary` | 공고 3줄 요약 | ✅ |
| AI | GET | `/jobs/{id}/interview` | 예상 면접 질문 생성 | ✅ |
| AI | GET | `/users/me/match` | 이력서 기반 공고 추천 | ✅ |

---

## 🚀 설치 및 실행

### 1. 환경 설정
```bash
# 1. 프로젝트 클론
git clone https://github.com/your-username/ai-job-matcher.git
cd ai-job-matcher

# 2. 가상환경 생성 및 활성화
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# 3. 의존성 설치
pip install -r requirements.txt
```

### 2. 환경 변수 (.env) 설정
프로젝트 루트에 `.env` 파일을 생성하고 아래 내용을 입력하세요.

```ini
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/job_db"

# Security
SECRET_KEY="your_secret_key_generated_by_openssl"
ALGORITHM="HS256"

# AI Service
GOOGLE_API_KEY="your_gemini_api_key"
```

### 3. 데이터 수집 (Crawling)
서버 실행 전, 초기 데이터를 수집합니다.

```bash
cd job_scraper
scrapy crawl python_jobs
cd ..
```

### 4. 서버 실행
```bash
uvicorn main:app --reload
```
- **Server**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🧩 콘텐츠 허브 MVP (1차)

### 확정 카테고리 구조
- 허브 루트: [content-hub/README.md](content-hub/README.md)
- 자동화 카테고리: [content-hub/categories/automation/README.md](content-hub/categories/automation/README.md)
- 생산성 카테고리: [content-hub/categories/productivity/README.md](content-hub/categories/productivity/README.md)
- 체크리스트 카테고리: [content-hub/categories/checklist/README.md](content-hub/categories/checklist/README.md)

### 글 템플릿 3종 최종본
- [자동화 글 템플릿](content-hub/templates/automation-article-template.md)
- [생산성 글 템플릿](content-hub/templates/productivity-article-template.md)
- [체크리스트 글 템플릿](content-hub/templates/checklist-article-template.md)

<a id="readme-internal-link-rules"></a>

### README 내부링크 규칙 (예시 5개)
1. 폴더/파일 링크는 항상 상대경로를 사용합니다. 예: [콘텐츠 허브 루트](content-hub/README.md)
2. 카테고리 링크는 영문 소문자 slug 폴더를 직접 가리킵니다. 예: [자동화 카테고리](content-hub/categories/automation/README.md)
3. 템플릿 링크는 `content-hub/templates/` 하위의 고정 파일명을 사용합니다. 예: [체크리스트 템플릿](content-hub/templates/checklist-article-template.md)
4. 문서 내 특정 섹션 이동은 앵커를 사용합니다. 예: [Hub Link QA Checklist](content-hub/README.md#link-qa-checklist)
5. 같은 `README.md` 내 이동은 헤더 앵커를 사용합니다. 예: [설치 및 실행](#-설치-및-실행)

---

## 💡 향후 개선 계획
- [ ] **Vector Search 도입**: FAISS/Pinecone을 활용한 시맨틱(의미 기반) 검색 구현
- [ ] **Task Scheduling**: Airflow를 도입하여 매일 새벽 3시 자동 크롤링 파이프라인 구축
- [ ] **Cloud Deployment**: AWS EC2 + Docker를 활용한 배포 자동화 (CI/CD)
- [ ] **Frontend**: React 기반의 대시보드 UI 개발

---

## 📜 License
MIT License

<div align="center">

Made with 💻 & 🤖 by a Future Backend Engineer

</div>
