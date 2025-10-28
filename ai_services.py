import os
from google import genai
from starlette.concurrency import run_in_threadpool # 동기 API 호출을 위한 헬퍼 함수

# --- AI Service Configuration ---

try:
    api_key = os.getenv("GOOGLE_API_KEY")
    print(f"DEBUG: GOOGLE_API_KEY loaded: {api_key is not None and api_key != ''}")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables.")
    
    # Initialize the client with the API key
    client = genai.Client(api_key=api_key)
    
    # 모델 이름을 gemini-2.5-flash로 변경하여 안정성을 높입니다.
    MODEL_NAME = "gemini-2.5-flash" 

except Exception as e:
    print(f"Error configuring Google AI client: {e}")
    print("Please ensure you have a .env file with your GOOGLE_API_KEY.")
    client = None 

async def summarize_text_async(text: str) -> str:
    """
    Uses the Gemini API to summarize the given text.
    """
    if client is None:
        return "(AI service is unavailable due to configuration error)"
    
    if not text or not text.strip():
        return "(No description to summarize.)"

    try:
        # Use run_in_threadpool for synchronous API calls within an async function
        response = await run_in_threadpool(
            client.models.generate_content, 
            model=MODEL_NAME, 
            contents=[f"Please summarize the following job description in three concise bullet points, in Korean:\n\n---\n{text}\n---"]
        )
        
        return response.text
        
    except Exception as e:
        print(f"Gemini API call failed: {e}")
        return f"(Error summarizing text: API call failed with exception: {e})"

async def generate_interview_questions_async(job_description: str) -> List[str]:
    """
    Uses the Gemini API to generate 5 interview questions based on a job description.
    """
    if client is None:
        return ["(AI service is unavailable due to configuration error)"]
    
    if not job_description or not job_description.strip():
        return ["(No job description provided to generate questions.)"]

    prompt = f"Based on the following job description, generate 5 relevant interview questions, in Korean. Return them as a numbered list.\n\n---\n{job_description}\n---"
    
    try:
        response = await run_in_threadpool(
            client.models.generate_content,
            model=MODEL_NAME,
            contents=[prompt]
        )
        # Assuming the response text is a numbered list, split it into a list of strings
        questions_raw = response.text.strip().split('\n')
        questions = [q.strip() for q in questions_raw if q.strip()]
        return questions
        
    except Exception as e:
        print(f"Gemini API call failed for interview questions: {e}")
        return [f"(Error generating interview questions: API call failed with exception: {e})"]

async def match_resume_to_jobs_async(resume_content: str, jobs: List[dict]) -> List[dict]:
    """
    Uses the Gemini API to match a resume with a list of job descriptions and return the top 3 matches.
    """
    if client is None:
        return [{"error": "AI service is unavailable due to configuration error"}]
    
    if not resume_content or not resume_content.strip():
        return [{"error": "No resume content provided for matching."}]
    
    if not jobs:
        return [{"error": "No job postings available for matching."}]

    # Format job descriptions for the prompt
    formatted_jobs = []
    for i, job in enumerate(jobs):
        formatted_jobs.append(f"Job ID: {job['id']}\nTitle: {job['title']}\nCompany: {job['company']}\nDescription: {job['description']}\n---")
    jobs_text = "\n".join(formatted_jobs)

    prompt = f"""Given the following resume and a list of job postings, identify the top 3 job postings that best match the resume. 
Return the result as a JSON array of objects, where each object contains the 'id', 'title', and 'company' of the matched job. 
If fewer than 3 matches are found, return all matches. If no matches, return an empty array. 

Resume:
---
{resume_content}
---

Job Postings:
---
{jobs_text}
---

Return only the JSON array, no other text.
"""
    
    try:
        response = await run_in_threadpool(
            client.models.generate_content,
            model=MODEL_NAME,
            contents=[prompt]
        )
        # Gemini might return markdown, try to extract JSON
        response_text = response.text.strip()
        if response_text.startswith("```json") and response_text.endswith("```"):
            response_text = response_text[7:-3].strip()
        
        import json
        matched_jobs = json.loads(response_text)
        return matched_jobs
        
    except Exception as e:
        print(f"Gemini API call failed for job matching: {e}")
        return [{"error": f"Error matching jobs: API call failed with exception: {e}"}]
