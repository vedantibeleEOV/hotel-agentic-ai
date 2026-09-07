from fastapi import APIRouter
from app.schemas.agent import AgentRequest, AgentResponse
from app.services.llm_service import ask_ollama

router = APIRouter()

@router.post("/gemini-test", tags=["Gemini"])
async def run_gemini_test():
    ai_response = await ask_ollama("My ac is not working")
    return AgentResponse(
        status="success",
        agent_response= ai_response
    )
