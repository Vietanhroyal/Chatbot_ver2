import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SKILLS } from '../common/constants';
import { FaqEntry, KnowledgeSearchResult } from './knowledge-base.types';

/**
 * Loads static knowledge files and provides a search interface.
 *
 * MVP: Simple keyword matching + skill-based routing.
 * Future: Replace with Vector DB (Chroma/Milvus) without
 *         changing the public API surface.
 */
@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  // In development, __dirname is in dist/, so we look for data/ there.
  // nest-cli.json will be configured to copy src/knowledge-base/data to dist/
  private readonly dataDir = path.join(__dirname, 'data');

  private faqData: FaqEntry[] = [];
  private admissionsData = '';
  private tuitionData = '';
  private majorsData = '';
  private scholarshipsData = '';

  onModuleInit() {
    this.loadAllData();
  }

  /**
   * Main search method called by the knowledge-retrieval node.
   *
   * @param query - The user's question or search keywords
   * @param skill - Optional skill filter to narrow down the data source
   * @returns Combined relevant context as a string
   */
  async search(
    query: string,
    skill?: string,
  ): Promise<KnowledgeSearchResult[]> {
    this.logger.log(`Searching KB | skill=${skill} | query="${query}"`);

    // Skill-based routing: return the entire relevant document
    switch (skill) {
      case SKILLS.TUITION:
        return [{ content: this.tuitionData, source: 'tuition.md' }];

      case SKILLS.MAJOR_INFO:
      case SKILLS.CAREER_CONSULTING:
        return [{ content: this.majorsData, source: 'majors.md' }];

      case SKILLS.SCHOLARSHIP:
        return [{ content: this.scholarshipsData, source: 'scholarships.md' }];

      case SKILLS.FAQ:
        return this.searchFaq(query);

      default:
        // No specific skill — search across all sources
        return this.searchAll(query);
    }
  }

  /**
   * Search FAQ entries by keyword matching.
   */
  private searchFaq(query: string): KnowledgeSearchResult[] {
    const lowerQuery = query.toLowerCase();
    const matches = this.faqData.filter(
      (entry) =>
        entry.question.toLowerCase().includes(lowerQuery) ||
        entry.answer.toLowerCase().includes(lowerQuery),
    );

    if (matches.length === 0) {
      // Return all FAQs as context if no specific match
      return this.faqData.map((entry) => ({
        content: `Q: ${entry.question}\nA: ${entry.answer}`,
        source: `faq.json#${entry.id}`,
      }));
    }

    return matches.map((entry) => ({
      content: `Q: ${entry.question}\nA: ${entry.answer}`,
      source: `faq.json#${entry.id}`,
    }));
  }

  /**
   * Fallback: search across all data sources by keyword.
   */
  private searchAll(query: string): KnowledgeSearchResult[] {
    const results: KnowledgeSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Check each data source for keyword matches
    const sources = [
      { data: this.tuitionData, name: 'tuition.md' },
      { data: this.majorsData, name: 'majors.md' },
      { data: this.admissionsData, name: 'admissions.md' },
      { data: this.scholarshipsData, name: 'scholarships.md' },
    ];

    for (const source of sources) {
      if (source.data.toLowerCase().includes(lowerQuery)) {
        results.push({ content: source.data, source: source.name });
      }
    }

    // Always include FAQ matches
    const faqResults = this.searchFaq(query);
    results.push(...faqResults);

    return results;
  }

  /**
   * Loads all static data files into memory.
   * Called once at module initialization.
   */
  private loadAllData(): void {
    this.faqData = this.loadJson<FaqEntry[]>('faq.json', []);
    this.admissionsData = this.loadMarkdown('admissions.md');
    this.tuitionData = this.loadMarkdown('tuition.md');
    this.majorsData = this.loadMarkdown('majors.md');
    this.scholarshipsData = this.loadMarkdown('scholarships.md');

    this.logger.log(
      `Knowledge Base loaded: ${this.faqData.length} FAQs, ` +
      `${[this.admissionsData, this.tuitionData, this.majorsData, this.scholarshipsData]
        .filter(Boolean).length} documents`,
    );
  }

  private loadJson<T>(filename: string, fallback: T): T {
    try {
      // In NestJS, when running from dist/, __dirname points to dist/knowledge-base/
      // The data files are copied to dist/knowledge-base/data/
      const filePath = path.join(this.dataDir, filename);
      if (!fs.existsSync(filePath)) {
        // Fallback for when running in dev mode or before first build
        const devPath = path.join(process.cwd(), 'src', 'knowledge-base', 'data', filename);
        if (fs.existsSync(devPath)) {
          const raw = fs.readFileSync(devPath, 'utf-8');
          return JSON.parse(raw) as T;
        }
        this.logger.warn(`File not found: ${filePath} or ${devPath}`);
        return fallback;
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn(`Failed to load ${filename}: ${error}`);
      return fallback;
    }
  }

  private loadMarkdown(filename: string): string {
    try {
      const filePath = path.join(this.dataDir, filename);
      if (!fs.existsSync(filePath)) {
        const devPath = path.join(process.cwd(), 'src', 'knowledge-base', 'data', filename);
        if (fs.existsSync(devPath)) {
          return fs.readFileSync(devPath, 'utf-8');
        }
        return '';
      }
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      this.logger.warn(`Failed to load ${filename}: ${error}`);
      return '';
    }
  }
}
