import os
import re
from typing import List, Dict, Any
from app.core.logging import logger

class PageContent:
    def __init__(self, page_number: int, text: str, section_title: str = "General"):
        self.page_number = page_number
        self.text = text
        self.section_title = section_title

class DocumentExtractor:
    """Extracts clean text and page-level metadata from PDF, DOCX, and TXT files."""

    @classmethod
    def clean_text(cls, text: str) -> str:
        """Clean extracted text: normalize whitespaces, remove non-printable characters."""
        if not text:
            return ""
        # Replace multiple spaces/newlines
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    _ocr_engine = None

    @classmethod
    def _get_ocr_engine(cls):
        """Lazy-load and cache the RapidOCR ONNX engine."""
        if cls._ocr_engine is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                cls._ocr_engine = RapidOCR()
                logger.info("Initialized RapidOCR engine for scanned document processing.")
            except Exception as e:
                logger.warning(f"Could not initialize RapidOCR: {e}")
                cls._ocr_engine = False
        return cls._ocr_engine if cls._ocr_engine is not False else None

    @classmethod
    def _ocr_page(cls, page) -> str:
        """Run OCR on a PyMuPDF page rendered as PNG pixmap."""
        engine = cls._get_ocr_engine()
        if not engine:
            return ""
        try:
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            result, _ = engine(img_bytes)
            if result:
                lines = [line[1] for line in result if line and len(line) > 1 and line[1].strip()]
                return cls.clean_text("\n".join(lines))
        except Exception as e:
            logger.warning(f"OCR processing failed for page: {e}")
        return ""

    @classmethod
    def extract_pdf(cls, file_path: str) -> List[PageContent]:
        """Extract text from PDF using PyMuPDF (fitz) page-by-page with RapidOCR fallback."""
        pages: List[PageContent] = []
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            for i, page in enumerate(doc):
                page_num = i + 1
                text = page.get_text("text")
                cleaned = cls.clean_text(text)

                # If text layer is sparse or absent, invoke RapidOCR on rendered image
                if len(cleaned) < 20:
                    ocr_text = cls._ocr_page(page)
                    if ocr_text:
                        cleaned = ocr_text

                # Check section header heuristic from first lines
                first_lines = cleaned.split("\n")[:3]
                section = "General"
                for line in first_lines:
                    line_clean = line.strip()
                    if 3 < len(line_clean) < 60 and not line_clean.endswith("."):
                        section = line_clean
                        break

                if not cleaned:
                    # Page has no text layer and OCR found no text
                    cleaned = f"[Scanned page {page_num}: image content detected without OCR text layer]"

                pages.append(PageContent(page_number=page_num, text=cleaned, section_title=section))
            doc.close()
            logger.info(f"Extracted {len(pages)} pages from PDF: {file_path}")
        except Exception as e:
            logger.error(f"Error extracting PDF {file_path}: {e}")
            raise
        return pages

    @classmethod
    def extract_docx(cls, file_path: str) -> List[PageContent]:
        """Extract text from DOCX using python-docx."""
        pages: List[PageContent] = []
        try:
            import docx
            doc = docx.Document(file_path)
            current_page_text = []
            current_section = "General"
            page_num = 1
            char_count = 0

            for para in doc.paragraphs:
                text = para.text.strip()
                if not text:
                    continue
                if para.style.name.startswith("Heading"):
                    current_section = text
                
                current_page_text.append(text)
                char_count += len(text)

                # Approximate page boundary for DOCX (~2500 chars per page)
                if char_count >= 2500:
                    page_text = cls.clean_text("\n\n".join(current_page_text))
                    pages.append(PageContent(page_number=page_num, text=page_text, section_title=current_section))
                    page_num += 1
                    current_page_text = []
                    char_count = 0

            if current_page_text or not pages:
                page_text = cls.clean_text("\n\n".join(current_page_text)) or "Empty document"
                pages.append(PageContent(page_number=page_num, text=page_text, section_title=current_section))

            logger.info(f"Extracted {len(pages)} estimated pages from DOCX: {file_path}")
        except Exception as e:
            logger.error(f"Error extracting DOCX {file_path}: {e}")
            raise
        return pages

    @classmethod
    def extract_text(cls, file_path: str) -> List[PageContent]:
        """Extract from plain text or markdown file."""
        pages: List[PageContent] = []
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            cleaned = cls.clean_text(content)
            # Break into ~2000 character pages
            chunk_size = 2000
            for i in range(0, max(len(cleaned), 1), chunk_size):
                page_num = (i // chunk_size) + 1
                segment = cleaned[i:i + chunk_size]
                pages.append(PageContent(page_number=page_num, text=segment, section_title=f"Section {page_num}"))
        except Exception as e:
            logger.error(f"Error extracting text file {file_path}: {e}")
            raise
        return pages

    @classmethod
    def extract(cls, file_path: str, file_type: str) -> List[PageContent]:
        """Unified extraction entry point based on file extension / type."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf" or file_type.lower() == "pdf":
            return cls.extract_pdf(file_path)
        elif ext in [".docx", ".doc"] or file_type.lower() in ["docx", "doc"]:
            return cls.extract_docx(file_path)
        else:
            return cls.extract_text(file_path)
