/**
 * Prompt hệ thống cho node clarification-resolution.
 * Model: gpt-4o-mini
 *
 * Đánh giá xem tin nhắn mới của người dùng có thực sự trả lời
 * câu hỏi làm rõ đang chờ hay không.
 *
 * Biến đầu vào: {user_message}, {pending_question}, {pending_type}, {missing_fields}
 * Đầu ra mong đợi: JSON { resolved: boolean, extracted_data: object | null }
 */
export const CLARIFICATION_RESOLUTION_PROMPT = `
Bạn đang đánh giá xem câu trả lời của người dùng có giải quyết được câu hỏi làm rõ đã hỏi trước đó hay không.

## Câu hỏi đang chờ
Loại: {pending_type}
Câu hỏi đã hỏi: "{pending_question}"
Thông tin cần thiết: {missing_fields}

## Câu trả lời của người dùng
"{user_message}"

## Nhiệm vụ
1. Xác định xem câu trả lời của người dùng có cung cấp thông tin chúng ta đã hỏi hay không.
2. Nếu CÓ: Trích xuất dữ liệu liên quan từ câu trả lời của họ.
3. Nếu KHÔNG: Người dùng có thể đã đổi chủ đề, đưa ra câu trả lời không liên quan, hoặc nói "tôi không biết".

## Định dạng đầu ra (Chỉ JSON)
{
  "resolved": true | false,
  "extracted_data": {
    "<tên_trường_thông_tin>": "<giá_trị_trích_xuất>"
  } | null,
  "reasoning": "Giải thích ngắn gọn về quyết định của bạn"
}
`.trim()
