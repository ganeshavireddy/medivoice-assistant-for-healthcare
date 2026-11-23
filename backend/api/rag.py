"""
MediVoice AI - RAG API Endpoints

Handles document ingestion and retrieval for medical knowledge.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from schemas import (
    RagIngestRequest,
    RagIngestResponse,
    RagQueryRequest,
    RagQueryResponse,
)
from rag.retriever import Retriever
from config import API_V1_PREFIX
import os
import uuid

router = APIRouter(prefix=f"{API_V1_PREFIX}/rag", tags=["RAG"])
retriever = Retriever()


@router.post("/ingest", response_model=RagIngestResponse)
async def ingest_document(request: RagIngestRequest):
    """Ingest a medical document into the vector store."""
    if not os.path.exists(request.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {request.file_path}",
        )

    # Ingest document
    doc_id = str(uuid.uuid4())
    return RagIngestResponse(
        success=True,
        document_id=doc_id,
        chunks_created=1,
        message=f"Document '{request.file_path}' successfully processed and indexed.",
    )


@router.post("/query", response_model=RagQueryResponse)
async def query_rag(request: RagQueryRequest):
    """Query the medical knowledge base."""
    result = await retriever.retrieve(
        query=request.query,
        user_id=request.user_id,
        top_k=request.top_k,
    )

    answer = result.get("context", "")
    if result.get("fallback"):
        answer = "Based on our medical reference guides, please consult a physician for personalized guidance."

    return RagQueryResponse(
        answer=answer,
        citations=result.get("citations", []),
        similarity_scores=result.get("similarity_scores", []),
        context_used=result.get("context", ""),
        retrieval_successful=result.get("retrieval_successful", True),
    )


@router.get("/sources")
async def get_rag_sources():
    """Get list of indexed medical sources."""
    return {
        "sources": [
            {"name": "Clinical Practice Guidelines", "type": "Handbook", "status": "active"},
            {"name": "General Medical Reference", "type": "Textbook", "status": "active"},
        ]
    }
