import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SKILLS } from '../../common/constants';

export interface SkillEntity {
  id: number;
  code: string;
  name: string;
  systemPrompt: string;
  enabled: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SkillCacheEntry {
  prompt: string;
  version: number;
  ts: number;
}

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);
  private cache = new Map<string, SkillCacheEntry>();
  private readonly CACHE_TTL = 60_000;

  constructor(
    @InjectRepository(SkillEntity)
    private repo: Repository<SkillEntity>,
  ) {}

  async getSystemPromptOrFallback(
    code: string,
    fallbackMap: Record<string, string>,
  ): Promise<string> {
    try {
      const cached = this.cache.get(code);
      if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
        return cached.prompt;
      }

      const skill = await this.repo.findOne({
        where: { code, enabled: true },
      });

      if (skill?.systemPrompt) {
        this.cache.set(code, {
          prompt: skill.systemPrompt,
          version: skill.version,
          ts: Date.now(),
        });
        return skill.systemPrompt;
      }
    } catch (err) {
      this.logger.warn(
        `DB read failed for skills[${code}], using fallback`,
        err,
      );
    }

    return fallbackMap[code] ?? 'Answer based on the knowledge base.';
  }

  async getFallbackMap(): Promise<Record<string, string>> {
    return {
      [SKILLS.FAQ]: `## Hướng dẫn kỹ năng FAQ (Hỏi đáp chung)
- Trả lời trực tiếp và ngắn gọn.
- Sử dụng chính xác thông tin từ cơ sở kiến thức FAQ.
- Nếu có nhiều FAQ khớp, hãy cung cấp cái có liên quan nhất.
- Giữ câu trả lời ngắn (1-2 câu).
- Không thêm các diễn giải không cần thiết.`,
      [SKILLS.TUITION]: `## Hướng dẫn kỹ năng Học phí
- Trình bày học phí rõ ràng với con số chính xác.
- Luôn đề cập đến kỳ hạn học phí (theo học kỳ hoặc theo năm).
- Nếu người dùng hỏi về một ngành cụ thể, chỉ hiển thị học phí của ngành đó.
- Đề cập đến các lựa chọn hỗ trợ tài chính có sẵn (học bổng, vay vốn, trả góp).
- Nếu người dùng bày tỏ lo ngại về chi phí, hãy chuyển sang giọng điệu ủng hộ và làm nổi bật các lựa chọn thanh toán.`,
      [SKILLS.MAJOR_INFO]: `## Hướng dẫn kỹ năng Thông tin Ngành học
- Cung cấp các chi tiết thực tế: mã ngành, thời gian đào tạo, tổ hợp xét tuyển, triển vọng nghề nghiệp.
- Cấu trúc thông tin rõ ràng với các dấu đầu dòng trong bản dự thảo của bạn.
- Nếu người dùng hỏi về một ngành không có trong cơ sở kiến thức, hãy trả lời thành thật.
- Không so sánh các ngành trừ khi người dùng yêu cầu so sánh rõ ràng.`,
      [SKILLS.CAREER_CONSULTING]: `## Hướng dẫn kỹ năng Tư vấn nghề nghiệp
- Tập trung vào triển vọng nghề nghiệp và cơ hội việc làm sau khi tốt nghiệp.
- Đưa ra các gợi ý phát triển kỹ năng và định hướng phù hợp.
- Khuyến khích người dùng liên hệ tư vấn viên để được hỗ trợ chi tiết hơn.`,
      'persuasion_skill': `## Hướng dẫn kỹ năng Thuyết phục
- Sử dụng các kỹ thuật thuyết phục phù hợp với bối cảnh tuyển sinh.
- Nhấn mạnh lợi ích và giá trị của việc học tại trường.
- Đưa ra các lý do cụ thể và ví dụ thực tế.
- Tạo cảm giác cấp bách nhưng không gây áp lực.`,
      [SKILLS.HUMAN_HANDOFF]: `## Hướng dẫn kỹ năng Chuyển tiếp sang tư vấn viên
- Thông báo cho người dùng rằng họ sẽ được kết nối với tư vấn viên.
- Cảm ơn người dùng và hứa hỗ trợ nhanh nhất có thể.
- Không cung cấp thêm thông tin phức tạp — để tư vấn viên xử lý.`,
    };
  }

  invalidateCache(code?: string): void {
    if (code) {
      this.cache.delete(code);
    } else {
      this.cache.clear();
    }
  }
}