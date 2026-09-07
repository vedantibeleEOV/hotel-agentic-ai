from fastapi import APIRouter
from app.schemas.agent import AgentRequest, AgentResponse
from app.services.llm_service import ask_ollama

router = APIRouter()


@router.post("/test-agent", response_model=AgentResponse, tags=["Agents"])
async def run_test_agent(request: AgentRequest):
    ai_response = await ask_ollama(request.query)
    return AgentResponse(
        status="success",
        agent_response=ai_response
    )
