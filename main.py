
import sys
import os
from datetime import datetime, timedelta, timezone
from typing import List, Annotated

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.ext.declarative import declarative_base
from passlib.context import CryptContext
from jose import JWTError, jwt
import bcrypt # Explicitly import bcrypt
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import AI service
from ai_services import summarize_text_async, generate_interview_questions_async, match_resume_to_jobs_async

# --- Database Configuration ---

# Add the Scrapy project settings to the Python path to import DATABASE_URL
scraper_settings_path = os.path.join(os.path.dirname(__file__), 'job_scraper', 'job_scraper')
sys.path.append(scraper_settings_path)

try:
    from settings import DATABASE_URL
except ImportError:
    print("ERROR: Could not import DATABASE_URL from Scrapy settings.")
    DATABASE_URL = "postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:5432/YOUR_DB_NAME" # Fallback

# SQLAlchemy setup
engine = create_engine(DATABASE_URL, connect_args={"client_encoding": "utf8"})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Models ---

class DBJob(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, index=True)
    title = Column(String)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)

class DBUser(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    resumes = relationship("DBResume", back_populates="owner")

class DBResume(Base):
    __tablename__ = "resumes"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("DBUser", back_populates="resumes")

# --- Security ---
SECRET_KEY = os.getenv("SECRET_KEY", "YOUR_JWT_SECRET_KEY_HERE")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Ensure bcrypt backend is loaded correctly
try:
    # Attempt to access bcrypt version to trigger potential errors early
    _ = bcrypt.__version__
except AttributeError:
    print("WARNING: bcrypt.__version__ not found. This might indicate an issue with bcrypt installation.")
except Exception as e:
    print(f"WARNING: Error checking bcrypt version: {e}")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password[:72]) # Truncate password to 72 bytes

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Pydantic Schemas ---

class Job(BaseModel):
    id: int
    url: str
    title: str
    company: str | None = None
    location: str | None = None
    class Config: from_attributes = True

class JobSummary(BaseModel):
    job_id: int
    title: str
    summary: str

class InterviewQuestions(BaseModel):
    job_id: int
    title: str
    questions: List[str]

class JobMatchResult(BaseModel):
    id: int
    title: str
    company: str | None = None
    class Config: from_attributes = True

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config: from_attributes = True

class ResumeBase(BaseModel):
    content: str

class ResumeCreate(ResumeBase):
    pass

class Resume(ResumeBase):
    id: int
    created_at: datetime
    owner_id: int
    class Config: from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# --- FastAPI App ---

app = FastAPI(title="AI Job Matching Platform API", version="0.2.0")

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(DBUser).filter(DBUser.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- API Endpoints ---

@app.post("/token", response_model=Token, summary="User Login")
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=User, summary="User Signup")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    db_user = DBUser(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/users/me/resume", response_model=Resume, summary="Upload Resume for Current User")
def upload_resume_for_user(resume: ResumeCreate, current_user: Annotated[DBUser, Depends(get_current_user)], db: Session = Depends(get_db)):
    db_resume = DBResume(**resume.model_dump(), owner_id=current_user.id)
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume

@app.get("/users/me/", response_model=User, summary="Get Current User Details")
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user

@app.get("/jobs/", response_model=List[Job], summary="Get All Job Postings")
def read_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    jobs = db.query(DBJob).offset(skip).limit(limit).all()
    return jobs

@app.get("/jobs/{job_id}/summary", response_model=JobSummary, summary="Summarize a Job Posting with AI")
async def get_job_summary(job_id: int, current_user: Annotated[DBUser, Depends(get_current_user)], db: Session = Depends(get_db)):
    """
    Summarizes the description of a specific job posting using the Gemini AI model.
    This is a protected endpoint and requires authentication.
    """
    db_job = db.query(DBJob).filter(DBJob.id == job_id).first()
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    summary_text = await summarize_text_async(db_job.description)
    
    return {"job_id": job_id, "title": db_job.title, "summary": summary_text}

@app.get("/jobs/{job_id}/interview", response_model=InterviewQuestions, summary="Generate Interview Questions for a Job")
async def get_job_interview_questions(job_id: int, current_user: Annotated[DBUser, Depends(get_current_user)], db: Session = Depends(get_db)):
    """
    Generates 5 interview questions based on the description of a specific job posting using the Gemini AI model.
    This is a protected endpoint and requires authentication.
    """
    db_job = db.query(DBJob).filter(DBJob.id == job_id).first()
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    questions = await generate_interview_questions_async(db_job.description)
    
    return {"job_id": job_id, "title": db_job.title, "questions": questions}

@app.get("/users/me/match", response_model=List[JobMatchResult], summary="Match Resume to Job Postings with AI")
async def match_resume_to_jobs(current_user: Annotated[DBUser, Depends(get_current_user)], db: Session = Depends(get_db)):
    """
    Matches the current user's uploaded resume to available job postings using the Gemini AI model.
    Returns the top 3 matching job postings.
    This is a protected endpoint and requires authentication.
    """
    # Fetch the user's resume
    user_resume = db.query(DBResume).filter(DBResume.owner_id == current_user.id).order_by(DBResume.created_at.desc()).first()
    if user_resume is None:
        raise HTTPException(status_code=404, detail="User has no resume uploaded. Please upload a resume first via POST /users/me/resume.")
    
    # Fetch all job postings
    all_jobs_db = db.query(DBJob).all()
    if not all_jobs_db:
        raise HTTPException(status_code=404, detail="No job postings available for matching.")
    
    # Convert DBJob objects to dictionaries for the AI service
    all_jobs_dicts = []
    for job in all_jobs_db:
        all_jobs_dicts.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "description": job.description
        })

    # Call AI service to match resume to jobs
    matched_jobs_data = await match_resume_to_jobs_async(user_resume.content, all_jobs_dicts)
    
    # Filter out any error messages from the AI service and return valid JobMatchResult objects
    valid_matches = []
    for match_data in matched_jobs_data:
        if "error" not in match_data:
            valid_matches.append(JobMatchResult(**match_data))

    return valid_matches


@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Job Matching Platform API. Go to /docs to see the API documentation."}
