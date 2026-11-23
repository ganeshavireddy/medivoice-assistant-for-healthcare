"""
MediVoice AI - RAG Schemas

Pydantic models for RAG retrieval and querying.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class RagIngestRequest(BaseModel):
    """Schema for RAG document ingestion."""
    file_path: str = Field(..., description="Path to document to ingest")
    document_type: str = Field("pdf", description="Type of document")


class RagIngestResponse(BaseModel):
    """Schema for RAG ingestion response."""
    success: bool
    document_id: str
    chunks_created: int
    message: str


class RagQueryRequest(BaseModel):
    """Schema for RAG query request."""
    query: str = Field(..., description="User question or search query")
    top_k: int = Field(5, ge=1, le=20, description="Number of top results")
    user_id: int = Field(..., description="Authenticated user ID")


class RagQueryResponse(BaseModel):
    """Schema for RAG query response."""
    answer: str = Field(..., description="Generated answer")
    citations: List[Dict] = Field(default_factory=list, description="Source citations")
    similarity_scores: List[float] = Field(default_factory=list)
    context_used: str = Field("", description="Retrieved context")
    retrieval_successful: bool = Field(True)
    answer_relevance: Optional[float] = Field(None)


class SourceReference(BaseModel):
    """Schema for a source reference."""
    source: str = Field(..., description="Document source")
    page: Optional[int] = Field(None, description="Page number")
    similarity_score: float = Field(..., ge=0, le=1, description="Similarity score")
    content_snippet: str = Field(..., description="Content excerpt")
