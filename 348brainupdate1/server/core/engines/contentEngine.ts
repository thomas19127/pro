import { BaseBrainEngine } from './baseEngine';
import { contentService, ContentService } from '../../services/contentService';
import { dbManager, DatabaseManager } from '../../db/sqlite';
import type {
  EngineCapability,
  EngineResult,
  ContentIdea,
  ContentItem,
  ContentVariant,
  ContentPlatform,
  ContentPublication,
  ContentSnapshot,
  ContentDomainState,
  ContentStatus,
  ContentPublicationStatus,
} from '../../../shared/types';

export class ContentEngine extends BaseBrainEngine {
  public readonly id = 'content';
  public readonly name = 'Content Brain (Content & Distribution Engine)';
  public readonly description =
    'Vollständige Content-Pipeline von Ideenfindung über Hook-Generierung, plattformspezifische Varianten, Redaktionskalender-Planung (Time OS) bis zur Publikation.';

  public readonly service: ContentService;
  private db: DatabaseManager;

  constructor(deps?: { db?: DatabaseManager; service?: ContentService }) {
    super();
    this.status = 'READY';
    this.statusDescription =
      '348 Content Brain operativ aktiv. Redaktionspipeline, Varianten-Multiplikator und Time OS Kalender-Kopplung einsatzbereit.';
    this.db = deps?.db || dbManager;
    this.service = deps?.service || contentService;
  }

  /**
   * Universal execution interface for Superbrain capability invocations
   */
  public async executeCapability(
    capability: EngineCapability,
    params?: Record<string, unknown>
  ): Promise<EngineResult> {
    const startTime = Date.now();
    this.lastActive = new Date().toISOString();

    try {
      switch (capability) {
        case 'GET_CONTENT_DOMAIN_STATE': {
          const state = this.service.getContentDomainState();
          return {
            engineId: this.id,
            capability,
            executedAt: new Date().toISOString(),
            executionTimeMs: Date.now() - startTime,
            status: 'SUCCESS',
            data: state,
            provenance: 'REAL',
            dataSufficiency: state.dataSufficiency.level,
          };
        }

        case 'GET_CONTENT_SNAPSHOT': {
          const snapshot = this.service.getContentSnapshot();
          return {
            engineId: this.id,
            capability,
            executedAt: new Date().toISOString(),
            executionTimeMs: Date.now() - startTime,
            status: 'SUCCESS',
            data: snapshot,
            provenance: 'REAL',
            dataSufficiency: snapshot.metrics.dataSufficiency.level,
          };
        }

        case 'GENERATE_CONTENT_DRAFT': {
          const contentId = params?.contentId as string;
          if (!contentId) throw new Error('contentId Parameter ist für GENERATE_CONTENT_DRAFT erforderlich.');
          const result = await this.service.generateDraft(contentId, {
            tone: params?.tone as string,
            length: params?.length as string,
          });
          return {
            engineId: this.id,
            capability,
            executedAt: new Date().toISOString(),
            executionTimeMs: Date.now() - startTime,
            status: 'SUCCESS',
            data: result,
            provenance: 'ESTIMATE',
            dataSufficiency: 'SUFFICIENT',
          };
        }

        case 'GENERATE_CONTENT_VARIANTS': {
          const contentId = params?.contentId as string;
          const targetPlatform = (params?.platform as string) || 'LinkedIn';
          if (!contentId) throw new Error('contentId Parameter ist erforderlich.');
          const variant = await this.service.generatePlatformVariant(contentId, targetPlatform);
          return {
            engineId: this.id,
            capability,
            executedAt: new Date().toISOString(),
            executionTimeMs: Date.now() - startTime,
            status: 'SUCCESS',
            data: variant,
            provenance: 'ESTIMATE',
            dataSufficiency: 'SUFFICIENT',
          };
        }

        case 'SCHEDULE_CONTENT_PUBLICATION': {
          const publicationId = params?.publicationId as string;
          const scheduledAt = params?.scheduledAt as string;
          const scheduled = this.service.schedulePublication(publicationId, scheduledAt, {
            createCalendarEvent: true,
          });
          return {
            engineId: this.id,
            capability,
            executedAt: new Date().toISOString(),
            executionTimeMs: Date.now() - startTime,
            status: 'SUCCESS',
            data: scheduled,
            provenance: 'REAL',
            dataSufficiency: 'SUFFICIENT',
          };
        }

        case 'INGEST_CONTENT_IDEA': {
          const text = params?.text as string;
          if (!text) throw new Error('Text ist für INGEST_CONTENT_IDEA erforderlich.');
          const idea = this.service.ingestRawContentInput({
            text,
            sourceName: params?.sourceName as string,
            sourceUrl: params?.sourceUrl as string,
            topic: params?.topic as string,
          });
          return {
            engineId: this.id,
            capability,
            executedAt: new Date().toISOString(),
            executionTimeMs: Date.now() - startTime,
            status: 'SUCCESS',
            data: idea,
            provenance: 'REAL',
            dataSufficiency: 'SUFFICIENT',
          };
        }

        default:
          return {
            engineId: this.id,
            capability,
            executedAt: new Date().toISOString(),
            executionTimeMs: Date.now() - startTime,
            status: 'SKIPPED',
            data: null,
            provenance: 'UNKNOWN',
            dataSufficiency: 'NO_DATA',
            errorMessage: `Capability '${capability}' wird von ContentEngine nicht unterstützt.`,
          };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        engineId: this.id,
        capability,
        executedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        status: 'ERROR',
        data: null,
        provenance: 'UNKNOWN',
        dataSufficiency: 'NO_DATA',
        errorMessage: msg,
      };
    }
  }

  // Direct programmatic helper methods
  public createIdea(data: Partial<ContentIdea>): ContentIdea {
    this.lastActive = new Date().toISOString();
    return this.service.createIdea(data);
  }

  public getIdeas(filter?: { status?: string; topic?: string; priority?: string }): ContentIdea[] {
    this.lastActive = new Date().toISOString();
    return this.service.listIdeas(filter);
  }

  public createContent(data: Partial<ContentItem>): ContentItem {
    this.lastActive = new Date().toISOString();
    return this.service.createContent(data);
  }

  public getAllContent(filter?: { status?: string; contentType?: string; topic?: string; campaignId?: string }): ContentItem[] {
    this.lastActive = new Date().toISOString();
    return this.service.listContent(filter);
  }

  public changeStatus(id: string, status: ContentStatus, reason?: string): ContentItem {
    this.lastActive = new Date().toISOString();
    return this.service.changeContentStatus(id, status, { reason });
  }

  public createVariant(data: Partial<ContentVariant>): ContentVariant {
    this.lastActive = new Date().toISOString();
    return this.service.createVariant(data);
  }

  public getVariants(parentContentId?: string): ContentVariant[] {
    this.lastActive = new Date().toISOString();
    return this.service.listVariants(parentContentId);
  }

  public getPlatforms(): ContentPlatform[] {
    this.lastActive = new Date().toISOString();
    return this.service.listPlatforms();
  }

  public getPublications(filter?: { status?: string; platform?: string; contentId?: string }): ContentPublication[] {
    this.lastActive = new Date().toISOString();
    return this.service.listPublications(filter);
  }

  public schedulePublication(publicationId: string, scheduledAt?: string): ContentPublication {
    this.lastActive = new Date().toISOString();
    return this.service.schedulePublication(publicationId, scheduledAt, { createCalendarEvent: true });
  }

  public updatePublicationStatus(
    id: string,
    status: ContentPublicationStatus,
    externalResult?: { externalId?: string; externalUrl?: string; timestamp?: string }
  ): ContentPublication {
    this.lastActive = new Date().toISOString();
    return this.service.updatePublicationStatus(id, status, externalResult);
  }

  public getSnapshot(): ContentSnapshot {
    this.lastActive = new Date().toISOString();
    return this.service.getContentSnapshot();
  }

  public getDomainState(): ContentDomainState {
    this.lastActive = new Date().toISOString();
    return this.service.getContentDomainState();
  }
}

export const contentEngine = new ContentEngine();
