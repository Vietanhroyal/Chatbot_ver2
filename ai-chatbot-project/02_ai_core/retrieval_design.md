# Knowledge Retrieval Strategy

Once the skill is selected, the agent must fetch accurate information to ground its response. This avoids hallucination. For the MVP, retrieval is kept straightforward.

## 1. Retrieval Planning
Before querying the database, the agent determines the optimal data source required to fulfill the user's request.
**Potential Data Sources:**
* FAQ (Static JSON or Markdown lists)
* Markdown Documents (Policy lists, admission rules)
* JSON Knowledge Base (Structured data about majors, prices)
* Vector DB (Planned for when documents scale significantly)
* CRM (Future phase)

## 2. Knowledge Retrieval (Execution)
The process of actually pulling the data from the chosen source.

**Examples of Retrieval Targets:**
* Tuition fees structure
* Program curriculum mappings/major details
* Admission policies and required scores
* Available scholarships
* Registration deadlines
* Frequently asked questions (General FAQ)
