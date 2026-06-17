# Guard Plan - Split for 2 Devs

## Tổng quan

Plan gốc ở `01-prompt-injection-protection.md` có 6 phases. Để tối ưu, tách thành **2 streams song song**:

- **Dev A (Detection)**: Tập trung phát hiện & chặn input độc hại (Lớp 1, 2, 3)
- **Dev B (Hardening)**: Tập trung giảm thiểu ảnh hưởng & chặn leak (Lớp 4, 5 + RAG safety)

## Phân chia công việc

| Dev | Phụ trách | Files chính | Lý do tách |
|-----|-----------|-------------|------------|
| **Dev A** | Lớp 1, 2, 3 (Detection) | `common/guards/`, `ai-agent/nodes/input-guard.node.ts`, mới `injection-detection.node.ts` | Độc lập, không touch node khác |
| **Dev B** | Lớp 4, 5 + RAG safety | `ai-agent/nodes/*.ts` (refactor 5 nodes), mới `common/output-validator.service.ts`, `knowledge-base/sanitize.service.ts` | Độc lập, không touch detection logic |

## Điểm giao (Integration point)

Cả 2 dev đều touch `graph.ts` để wire node mới + update existing nodes. **Quy ước:**
- Dev A thêm node `injection_detection` sau `input_guard`
- Dev B sửa 5 nodes để dùng prompt template chuẩn (nhưng KHÔNG đổi logic detection)
- Cuối cùng 1 người (Dev A) merge graph.ts để tránh conflict

## File output

- `02-dev-a-detection.md` - Chi tiết cho Dev A
- `03-dev-b-hardening.md` - Chi tiết cho Dev B
- `04-integration.md` - Cách merge 2 streams
