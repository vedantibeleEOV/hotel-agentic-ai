# Docker Infrastructure Rule for Hotel Operations AI

- **PostgreSQL**: Always use Docker for the PostgreSQL database (`hotel_postgres` container on port `5432`). Database connection string format: `postgresql://postgres:postgres@localhost:5432/hotel_operations_db` (or `postgres:5432` inside container network).
- **LLM Service**: Always use Docker for local LLM execution (`hotel_llm` container running Ollama/OpenAI-compatible server on port `11434`). LLM Base URL: `http://localhost:11434/v1` (or `http://llm:11434/v1` inside container network).
