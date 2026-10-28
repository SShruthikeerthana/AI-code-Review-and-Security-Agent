from pathlib import Path

from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.rag.embeddings import get_embeddings

COLLECTION_NAME = "secure_coding_kb"


def get_text_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n## ", "\n### ", "\n\n", "\n", " ", ""],
    )


def load_markdown_documents(kb_dir: Path) -> list[Document]:
    documents: list[Document] = []
    if not kb_dir.exists():
        return documents

    for md_file in sorted(kb_dir.glob("**/*.md")):
        content = md_file.read_text(encoding="utf-8")
        category = _infer_category(md_file.stem)
        documents.append(
            Document(
                page_content=content,
                metadata={
                    "source": md_file.name,
                    "title": _title_from_filename(md_file.stem),
                    "category": category,
                    "filepath": str(md_file.relative_to(kb_dir)),
                },
            )
        )
    return documents


def _infer_category(stem: str) -> str:
    mapping = {
        "owasp_top_10": "owasp",
        "secure_coding_python": "python",
        "secure_coding_java": "java",
        "code_smells": "quality",
        "sql_injection": "owasp",
        "xss_prevention": "owasp",
        "authentication_best_practices": "security",
    }
    return mapping.get(stem, "general")


def _title_from_filename(stem: str) -> str:
    return stem.replace("_", " ").title()


def get_vector_store() -> Chroma:
    settings.chroma_path.mkdir(parents=True, exist_ok=True)
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=get_embeddings(),
        persist_directory=str(settings.chroma_path),
    )
