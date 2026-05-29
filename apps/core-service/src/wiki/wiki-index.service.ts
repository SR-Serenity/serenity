import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class WikiIndexService {
  private readonly logger = new Logger(WikiIndexService.name);
  private readonly aiBaseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8001/api/internal/v1';
  private readonly internalToken = process.env.AI_INTERNAL_API_TOKEN;

  constructor(private readonly prisma: PrismaService) {}

  async indexPage(pageId: string) {
    const page = await this.prisma.wikiPage.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        orgId: true,
        title: true,
        contentMarkdown: true,
        contentJson: true,
        visibility: true,
        departmentId: true,
        createdById: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!page || page.deletedAt) {
      return;
    }

    try {
      await axios.post(
        `${this.aiBaseUrl}/ai/wiki/index`,
        {
          orgId: page.orgId,
          pageId: page.id,
          title: page.title,
          contentMarkdown: page.contentMarkdown,
          contentJson: page.contentJson ?? null,
          metadata: {
            visibility: page.visibility,
            departmentId: page.departmentId,
            createdById: page.createdById,
            updatedAt: page.updatedAt.toISOString(),
          },
        },
        {
          headers: this.internalToken ? { 'x-internal-api-token': this.internalToken } : {},
          timeout: 10000,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to index wiki page ${pageId}: ${error}`);
    }
  }

  async deletePage(orgId: string, pageId: string) {
    try {
      await axios.post(
        `${this.aiBaseUrl}/ai/wiki/delete`,
        { orgId, pageId },
        {
          headers: this.internalToken ? { 'x-internal-api-token': this.internalToken } : {},
          timeout: 10000,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to delete wiki index ${pageId}: ${error}`);
    }
  }
}
