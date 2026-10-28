from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.submission import KnowledgeBaseDocument
from app.rag.vector_store import (
    COLLECTION_NAME,
    get_text_splitter,
    get_vector_store,
    load_markdown_documents,
)


class KnowledgeBaseIndexer:
    def index_all(self, db: Session) -> dict:
        kb_dir = settings.knowledge_base_path
        raw_documents = load_markdown_documents(kb_dir)
        if not raw_documents:
            raise ValueError(f"No markdown documents found in {kb_dir}")

        splitter = get_text_splitter()
        chunks = splitter.split_documents(raw_documents)

        vector_store = get_vector_store()
        vector_store.delete_collection()
        vector_store = get_vector_store()
        vector_store.add_documents(chunks)

        db.query(KnowledgeBaseDocument).delete()
        for doc in raw_documents:
            source = doc.metadata["source"]
            chunk_count = sum(1 for c in chunks if c.metadata.get("source") == source)
            record = KnowledgeBaseDocument(
                title=doc.metadata["title"],
                source_file=source,
                category=doc.metadata["category"],
                chunk_count=chunk_count,
                indexed_at=datetime.now(timezone.utc),
            )
            db.add(record)
        db.commit()

        return {
            "collection_name": COLLECTION_NAME,
            "documents_indexed": len(raw_documents),
            "chunks_created": len(chunks),
        }

    def get_status(self, db: Session) -> dict:
        records = db.query(KnowledgeBaseDocument).order_by(KnowledgeBaseDocument.title).all()
        total_chunks = sum(r.chunk_count for r in records)
        return {
            "is_indexed": len(records) > 0,
            "total_documents": len(records),
            "total_chunks": total_chunks,
            "collection_name": COLLECTION_NAME,
            "documents": [
                {
                    "title": r.title,
                    "source_file": r.source_file,
                    "category": r.category,
                    "chunk_count": r.chunk_count,
                    "indexed_at": r.indexed_at.isoformat() if r.indexed_at else None,
                }
                for r in records
            ],
        }


class KnowledgeBaseRetriever:
    def query(self, query_text: str, top_k: int = 4) -> list[dict]:
        vector_store = get_vector_store()
        results = vector_store.similarity_search_with_score(query_text, k=top_k)
        return [
            {
                "content": doc.page_content,
                "source": doc.metadata.get("source", "unknown"),
                "category": doc.metadata.get("category", "general"),
                "score": float(score),
            }
            for doc, score in results
        ]


knowledge_base_indexer = KnowledgeBaseIndexer()
knowledge_base_retriever = KnowledgeBaseRetriever()
