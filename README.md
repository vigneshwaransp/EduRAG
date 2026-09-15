# 🎓 EduRAG — Education Document RAG System

> **Turn your study material into an AI-powered learning assistant.**

EduRAG is an **AI-powered Retrieval-Augmented Generation (RAG) system** designed specifically for educational documents.

Upload your **textbooks, lecture notes, PDFs, study materials, research papers, or academic documents**, ask questions in natural language, and receive answers grounded in the information contained within your documents.

Instead of relying only on an LLM's pretrained knowledge, EduRAG retrieves the most relevant sections from your uploaded documents and provides them as context to the AI before generating a response.

---

## ✨ Why EduRAG?

Students often spend significant time searching through lengthy PDFs and study materials to find specific information.

Traditional keyword search can fail when the question is phrased differently from the document.

EduRAG solves this using **semantic search + Retrieval-Augmented Generation**.

### Traditional Approach

```text
Student
   ↓
Search PDF
   ↓
Find Keywords
   ↓
Read Multiple Pages
   ↓
Find Answer
```

### EduRAG Approach

```text
Student Question
       ↓
Query Embedding
       ↓
Semantic Search
       ↓
Relevant Document Chunks
       ↓
Context
       ↓
LLM
       ↓
Grounded Answer + Sources
```

---

# 🚀 Features

### 📄 Document Intelligence

* Upload educational documents
* Extract text automatically
* Process large documents
* Split content into meaningful chunks
* Preserve document and page metadata

### 🧠 AI-Powered RAG

* Semantic document retrieval
* Vector embeddings
* Similarity search
* Context-aware generation
* Configurable Top-K retrieval
* Optional reranking

### 💬 AI Tutor

Ask questions naturally about your study material.

Example:

> "Explain deadlock prevention with an example."

EduRAG retrieves the relevant content from your documents and generates an answer based on that context.

### 🔎 Semantic Search

Search documents by **meaning**, not just exact keywords.

### 📚 Source Citations

Responses can include:

```text
📄 Operating_Systems.pdf
Page 42
```

This makes it easier to verify where the answer came from.

### 📝 Smart Summaries

Generate:

* Chapter summaries
* Quick revision notes
* Important concepts
* Key definitions
* Exam-focused summaries

### 🧪 Quiz Generator

Generate quizzes directly from study materials.

Supported formats:

* Multiple Choice Questions
* True / False
* Short Answer
* Fill in the Blanks

### 🃏 Flashcards

Convert educational content into interactive flashcards for revision.

### 📊 Study Analytics

Track:

* Questions asked
* Documents studied
* Quiz performance
* Frequently studied topics
* Learning activity

---

# 🏗️ System Architecture

```text
                       ┌──────────────────┐
                       │      Student     │
                       └────────┬─────────┘
                                │
                    ┌───────────▼───────────┐
                    │      React Frontend   │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │      FastAPI Backend  │
                    └───────┬─────────┬─────┘
                            │         │
              Upload        │         │ Question
                            │         │
                ┌───────────▼───┐   ┌─▼──────────────┐
                │    Document   │   │ Query Embedding│
                │   Processing  │   └───────┬────────┘
                └───────┬───────┘           │
                        │                    │
                        ▼                    ▼
                 Text Extraction      Semantic Search
                        │                    │
                        ▼                    │
                    Chunking                 │
                        │                    │
                        ▼                    │
                   Embeddings                │
                        │                    │
                        └────────┬───────────┘
                                 ▼
                         ┌───────────────┐
                         │ Vector Store  │
                         └───────┬───────┘
                                 │
                                 ▼
                         Relevant Context
                                 │
                                 ▼
                           ┌──────────┐
                           │   LLM    │
                           └────┬─────┘
                                │
                                ▼
                      Answer + Citations
                                │
                                ▼
                           Student
```

---

# 🔄 RAG Pipeline

EduRAG follows a complete Retrieval-Augmented Generation pipeline.

```text
Document Upload
      ↓
Text Extraction
      ↓
Text Cleaning
      ↓
Semantic Chunking
      ↓
Embedding Generation
      ↓
Vector Database
      ↓
User Query
      ↓
Query Embedding
      ↓
Similarity Search
      ↓
Top-K Relevant Chunks
      ↓
Context Construction
      ↓
LLM
      ↓
Grounded Response
      ↓
Source Citations
```

---

# 🛠️ Tech Stack

| Layer               | Technology                 |
| ------------------- | -------------------------- |
| Frontend            | React + Vite               |
| Language            | TypeScript                 |
| Styling             | Tailwind CSS               |
| Animations          | Framer Motion              |
| Backend             | Python + FastAPI           |
| Database            | PostgreSQL                 |
| Vector Database     | ChromaDB                   |
| Embeddings          | Sentence Transformers      |
| Document Processing | PyMuPDF                    |
| AI                  | LLM API / Configurable LLM |
| Authentication      | JWT                        |
| ORM                 | SQLAlchemy                 |
| Deployment          | Docker                     |
| Version Control     | Git + GitHub               |

---

# 📂 Project Structure

```text
EduRAG/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── rag/
│   │   ├── database/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── uploads/
├── vectorstore/
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

# ⚙️ Installation

## 1. Clone the repository

```bash
git clone https://github.com/your-username/EduRAG.git
cd EduRAG
```

---

## 2. Backend Setup

Create a virtual environment:

```bash
python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

---

# 🔐 Environment Variables

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/edurag

JWT_SECRET=your_secret_key

LLM_API_KEY=your_api_key

EMBEDDING_MODEL=sentence-transformers-model

VECTOR_DB_URL=http://localhost:8000

CORS_ORIGINS=http://localhost:5173
```

Never commit `.env` files or API keys to GitHub.

---

# ▶️ Run Backend

```bash
uvicorn backend.app.main:app --reload
```

Backend will be available at:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

---

# 💻 Run Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🐳 Docker

Run the complete stack using:

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

---

# 🧠 How RAG Works

Suppose a student uploads:

```text
Operating_Systems.pdf
```

The document is processed into chunks:

```text
Chunk 1 → Introduction to OS
Chunk 2 → Process Management
Chunk 3 → CPU Scheduling
Chunk 4 → Deadlocks
...
```

Each chunk is converted into an embedding:

```text
Text Chunk
    ↓
Embedding Model
    ↓
Vector
```

The vectors are stored in the vector database.

When the student asks:

> "What are the four necessary conditions for deadlock?"

The question is embedded and compared with the stored document vectors.

The system retrieves the most relevant chunks:

```text
Operating_Systems.pdf
Page 41
Page 42
```

These chunks are provided to the LLM as context.

The LLM then generates the answer using the retrieved information.

---

# 🛡️ Hallucination Control

EduRAG is designed to reduce unsupported AI responses.

The generation layer follows the principle:

```text
Relevant Evidence Found?
        │
       YES
        ↓
Generate Grounded Answer
        │
        ↓
Attach Source Citation
```

If sufficient information is unavailable:

```text
Relevant Evidence Found?
        │
        NO
        ↓
Inform User That The
Answer Was Not Found
```

The system should **never fabricate document citations or page numbers**.

---

# 🎯 Use Cases

### Students

* Understand difficult concepts
* Search textbooks quickly
* Generate revision notes
* Prepare for examinations
* Generate practice quizzes
* Create flashcards

### Teachers

* Generate questions
* Summarize course material
* Create revision resources
* Search large academic documents

### Researchers

* Search research papers
* Retrieve relevant sections
* Compare information across documents
* Quickly understand lengthy papers

### Educational Institutions

* Create internal knowledge assistants
* Build course-specific AI tutors
* Provide document-grounded learning systems

---

# 🔮 Future Enhancements

* [ ] Multimodal RAG
* [ ] Image and diagram understanding
* [ ] Table-aware retrieval
* [ ] OCR for scanned documents
* [ ] Voice-based AI Tutor
* [ ] Tamil and multilingual support
* [ ] Personalized learning paths
* [ ] Spaced repetition
* [ ] Advanced RAG evaluation
* [ ] Hybrid keyword + vector retrieval
* [ ] Cross-document reasoning
* [ ] Teacher dashboard
* [ ] LMS integration
* [ ] Mobile application

---

# 📈 RAG Evaluation

The system can be evaluated using:

| Metric              | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| Retrieval Precision | Measures relevance of retrieved chunks              |
| Retrieval Recall    | Measures whether relevant information was retrieved |
| Context Relevance   | Measures usefulness of retrieved context            |
| Faithfulness        | Measures whether answers are supported by context   |
| Citation Accuracy   | Measures source correctness                         |
| Latency             | Measures response speed                             |

A dedicated evaluation dataset can be used to compare different:

* Chunk sizes
* Embedding models
* Top-K values
* Retrieval strategies
* LLMs

---

# 🔒 Security

EduRAG follows basic security principles:

* JWT authentication
* Password hashing
* User-level document isolation
* File validation
* File size restrictions
* Environment-based secrets
* API authentication
* Input validation
* CORS configuration
* Secure database access

Sensitive credentials should never be committed to the repository.

---

# 🧪 Testing

Run backend tests:

```bash
pytest
```

Frontend tests:

```bash
npm test
```

Test important components including:

* Document extraction
* Chunking
* Embedding generation
* Retrieval
* Citation mapping
* API endpoints
* Authentication
* RAG generation

---

# 🤝 Contributing

Contributions are welcome.

```bash
git checkout -b feature/your-feature
```

Make your changes and commit:

```bash
git add .
git commit -m "feat: add your feature"
```

Push:

```bash
git push origin feature/your-feature
```

Then open a Pull Request.

---

# 📜 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Author

**VIGNESHWARAN S P**

Computer Science Engineering
AI / ML • Full Stack Development • RAG Systems

GitHub: `@vigneshwaransp`

---

# ⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.

---

## 💡 Vision

EduRAG aims to move educational AI from:

> **"Ask an AI anything."**

to:

> **"Ask an AI about what you're actually studying."**

**Your documents. Your knowledge. Your AI tutor.**
