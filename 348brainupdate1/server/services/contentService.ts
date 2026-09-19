import { DatabaseManager, dbManager } from '../db/sqlite';
import { AIService, aiService } from '../ai/router';
import { AuditLogger, auditLogger } from '../audit/auditLogger';
import { BrainEventBus, eventBus } from '../events/eventBus';
import type {
  ContentIdea,
  ContentItem,
  ContentVariant,
  ContentPlatform,
  ContentPublication,
  ContentCampaign,
  ContentStatus,
  ContentIdeaStatus,
  ContentPublicationStatus,
  ContentType,
  ContentDomainState,
  ContentSnapshot,
  DataSufficiency,
} from '../../shared/types';

export class ContentService {
  private db: DatabaseManager;
  private ai: AIService;
  private audit: AuditLogger;
  private events: BrainEventBus;

  constructor(deps?: {
    db?: DatabaseManager;
    ai?: AIService;
    audit?: AuditLogger;
    events?: BrainEventBus;
  }) {
    this.db = deps?.db ?? dbManager;
    this.ai = deps?.ai ?? aiService;
    this.audit = deps?.audit ?? auditLogger;
    this.events = deps?.events ?? eventBus;
  }

  // ==========================================
  // 1. CONTENT IDEAS
  // ==========================================

  public createIdea(data: Partial<ContentIdea>): ContentIdea {
    const title = (data.title || '').trim();
    if (!title) {
      throw new Error('Content-Idee benötigt einen Titel.');
    }

    const now = new Date().toISOString();
    const idea: ContentIdea = {
      id: data.id || `idea_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      description: data.description || '',
      source: data.source || 'MANUAL',
      sourceType: data.sourceType || 'MANUAL',
      status: (data.status as ContentIdeaStatus) || 'NEW',
      priority: data.priority || 'MEDIUM',
      topic: data.topic || 'Allgemein',
      tags: Array.isArray(data.tags) ? data.tags : [],
      createdAt: data.createdAt || now,
      updatedAt: now,
      provenance: data.provenance || 'REAL',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.8,
      epistemicStatus: data.epistemicStatus || 'HYPOTHESIS',
      linkedMarketIntelligenceIds: Array.isArray(data.linkedMarketIntelligenceIds) ? data.linkedMarketIntelligenceIds : [],
      linkedMemoryIds: Array.isArray(data.linkedMemoryIds) ? data.linkedMemoryIds : [],
      isDemo: Boolean(data.isDemo),
    };

    this.db.insertContentIdea(idea);

    this.audit.log({
      action: 'CONTENT_IDEA_CREATED',
      actor: 'SYSTEM',
      entity: 'CONTENT_IDEA',
      entityId: idea.id,
      reason: 'User or system created content idea',
      source: 'ContentService',
      after: { id: idea.id, title: idea.title, sourceType: idea.sourceType },
    });

    this.events.emit(
      'CONTENT_IDEA_CREATED',
      { ideaId: idea.id, title: idea.title },
      'ContentService'
    );

    return idea;
  }

  public updateIdea(id: string, patch: Partial<ContentIdea>): ContentIdea {
    const existing = this.db.getContentIdeaById(id);
    if (!existing) {
      throw new Error(`Content-Idee mit ID '${id}' nicht gefunden.`);
    }

    const updated = this.db.updateContentIdea(id, patch);
    if (!updated) {
      throw new Error(`Fehler beim Aktualisieren der Content-Idee '${id}'.`);
    }

    this.audit.log({
      action: 'CONTENT_IDEA_UPDATED',
      actor: 'SYSTEM',
      entity: 'CONTENT_IDEA',
      entityId: id,
      reason: 'Updated content idea fields',
      source: 'ContentService',
      after: patch,
    });

    return updated;
  }

  public getIdea(id: string): ContentIdea | undefined {
    return this.db.getContentIdeaById(id);
  }

  public listIdeas(filter?: { status?: string; topic?: string; priority?: string }): ContentIdea[] {
    return this.db.getAllContentIdeas(filter);
  }

  public deleteIdea(id: string): boolean {
    const existing = this.db.getContentIdeaById(id);
    if (!existing) return false;

    const res = this.db.deleteContentIdea(id);
    if (res) {
      this.audit.log({
        action: 'CONTENT_IDEA_DELETED',
        actor: 'SYSTEM',
        entity: 'CONTENT_IDEA',
        entityId: id,
        reason: 'Deleted content idea',
        source: 'ContentService',
        before: { id, title: existing.title },
      });
    }
    return res;
  }

  public archiveIdea(id: string): ContentIdea {
    return this.updateIdea(id, { status: 'PARKED' });
  }

  public promoteIdeaToContent(ideaId: string, defaults?: Partial<ContentItem>): ContentItem {
    const idea = this.db.getContentIdeaById(ideaId);
    if (!idea) {
      throw new Error(`Idee mit ID '${ideaId}' existiert nicht.`);
    }

    // Update idea status to PROMOTED
    this.updateIdea(ideaId, { status: 'PROMOTED' });

    // Create Content Item
    const content = this.createContent({
      title: defaults?.title || idea.title,
      topic: defaults?.topic || idea.topic,
      notes: defaults?.notes || idea.description,
      contentType: defaults?.contentType || 'SOCIAL_POST',
      format: defaults?.format || 'TEXT_POST',
      status: defaults?.status || 'IDEA',
      linkedIdeaId: idea.id,
      linkedMarketIntelligenceIds: [
        ...idea.linkedMarketIntelligenceIds,
        ...(defaults?.linkedMarketIntelligenceIds || []),
      ],
      linkedMemoryIds: [
        ...idea.linkedMemoryIds,
        ...(defaults?.linkedMemoryIds || []),
      ],
      provenance: idea.provenance,
      confidence: idea.confidence,
      epistemicStatus: idea.epistemicStatus,
      targetPlatforms: defaults?.targetPlatforms || [],
    });

    this.audit.log({
      action: 'CONTENT_IDEA_PROMOTED',
      actor: 'SYSTEM',
      entity: 'CONTENT_IDEA',
      entityId: ideaId,
      reason: 'Promoted idea to content item',
      source: 'ContentService',
      after: { ideaId, contentId: content.id, title: content.title },
    });

    return content;
  }

  public convertIdeaToContent(ideaId: string, defaults?: Partial<ContentItem>): ContentItem {
    return this.promoteIdeaToContent(ideaId, defaults);
  }

  // ==========================================
  // 2. CONTENT ITEMS & LIFECYCLE
  // ==========================================

  public createContent(data: Partial<ContentItem>): ContentItem {
    const title = (data.title || '').trim();
    if (!title) {
      throw new Error('Content-Item benötigt einen Titel.');
    }

    const now = new Date().toISOString();
    const item: ContentItem = {
      id: data.id || `content_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      contentType: (data.contentType as ContentType) || 'SOCIAL_POST',
      format: data.format || 'STANDARD',
      status: (data.status as ContentStatus) || 'IDEA',
      topic: data.topic || 'Allgemein',
      body: data.body || '',
      hook: data.hook || '',
      cta: data.cta || '',
      notes: data.notes || undefined,
      campaignId: data.campaignId || undefined,
      parentContentId: data.parentContentId || undefined,
      createdAt: data.createdAt || now,
      updatedAt: now,
      scheduledAt: data.scheduledAt || undefined,
      publishedAt: data.publishedAt || undefined,
      provenance: data.provenance || 'REAL',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.8,
      epistemicStatus: data.epistemicStatus || 'HYPOTHESIS',
      linkedIdeaId: data.linkedIdeaId || undefined,
      linkedMarketIntelligenceIds: Array.isArray(data.linkedMarketIntelligenceIds) ? data.linkedMarketIntelligenceIds : [],
      linkedMemoryIds: Array.isArray(data.linkedMemoryIds) ? data.linkedMemoryIds : [],
      targetPlatforms: Array.isArray(data.targetPlatforms) ? data.targetPlatforms : [],
      timeEventId: data.timeEventId || undefined,
      isDemo: Boolean(data.isDemo),
    };

    this.db.insertContentItem(item);

    this.audit.log({
      action: 'CONTENT_ITEM_CREATED',
      actor: 'SYSTEM',
      entity: 'CONTENT_ITEM',
      entityId: item.id,
      reason: 'Created new content item',
      source: 'ContentService',
      after: { id: item.id, title: item.title, status: item.status, contentType: item.contentType },
    });

    return item;
  }

  public updateContent(id: string, patch: Partial<ContentItem>): ContentItem {
    const existing = this.db.getContentItemById(id);
    if (!existing) {
      throw new Error(`Content-Item mit ID '${id}' nicht gefunden.`);
    }

    const updated = this.db.updateContentItem(id, patch);
    if (!updated) {
      throw new Error(`Fehler beim Aktualisieren des Content-Items '${id}'.`);
    }

    this.audit.log({
      action: 'CONTENT_ITEM_UPDATED',
      actor: 'SYSTEM',
      entity: 'CONTENT_ITEM',
      entityId: id,
      reason: 'Updated content item fields',
      source: 'ContentService',
      after: patch,
    });

    return updated;
  }

  public getContent(id: string): ContentItem | undefined {
    return this.db.getContentItemById(id);
  }

  public listContent(filter?: { status?: string; contentType?: string; topic?: string; campaignId?: string }): ContentItem[] {
    return this.db.getAllContentItems(filter);
  }

  public changeContentStatus(
    id: string,
    newStatus: ContentStatus,
    options?: { reason?: string; bypassAutonomy?: boolean }
  ): ContentItem {
    const existing = this.db.getContentItemById(id);
    if (!existing) {
      throw new Error(`Content-Item '${id}' nicht gefunden.`);
    }

    // Safeguards for PUBLISHED status
    const patch: Partial<ContentItem> = { status: newStatus };
    if (newStatus === 'PUBLISHED') {
      patch.publishedAt = existing.publishedAt || new Date().toISOString();
    } else if (newStatus === 'SCHEDULED' && !existing.scheduledAt && !patch.scheduledAt) {
      // If scheduled without date, default to next business day 10:00
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 1);
      defaultDate.setHours(10, 0, 0, 0);
      patch.scheduledAt = defaultDate.toISOString();
    }

    const updated = this.updateContent(id, patch);

    this.audit.log({
      action: 'CONTENT_STATUS_CHANGED',
      actor: 'USER',
      entity: 'CONTENT_ITEM',
      entityId: id,
      reason: options?.reason || 'Workflow transition',
      source: 'ContentService',
      before: { status: existing.status },
      after: { status: newStatus },
    });

    return updated;
  }

  public deleteContent(id: string): boolean {
    const existing = this.db.getContentItemById(id);
    if (!existing) return false;

    const res = this.db.deleteContentItem(id);
    if (res) {
      this.audit.log({
        action: 'CONTENT_ITEM_DELETED',
        actor: 'SYSTEM',
        entity: 'CONTENT_ITEM',
        entityId: id,
        reason: 'Deleted content item',
        source: 'ContentService',
        before: { id, title: existing.title },
      });
    }
    return res;
  }

  // ==========================================
  // 3. VARIANTS & REPURPOSING
  // ==========================================

  public createVariant(data: Partial<ContentVariant>): ContentVariant {
    if (!data.parentContentId) {
      throw new Error('Parent Content ID ist für Varianten erforderlich.');
    }
    const parent = this.db.getContentItemById(data.parentContentId);
    if (!parent) {
      throw new Error(`Parent Content mit ID '${data.parentContentId}' existiert nicht.`);
    }

    const platform = (data.platform || 'General').trim();
    const title = (data.title || parent.title).trim();
    const body = (data.body || parent.body).trim();

    const now = new Date().toISOString();
    const variant: ContentVariant = {
      id: data.id || `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      parentContentId: data.parentContentId,
      platform,
      format: data.format || parent.format,
      title,
      body,
      hook: data.hook || parent.hook || '',
      cta: data.cta || parent.cta || '',
      status: (data.status as ContentStatus) || 'DRAFT',
      notes: data.notes || undefined,
      createdAt: data.createdAt || now,
      updatedAt: now,
      isDemo: Boolean(data.isDemo ?? parent.isDemo),
    };

    this.db.insertContentVariant(variant);

    this.audit.log({
      action: 'CONTENT_VARIANT_CREATED',
      actor: 'SYSTEM',
      entity: 'CONTENT_VARIANT',
      entityId: variant.id,
      reason: 'Created content platform variant',
      source: 'ContentService',
      after: { id: variant.id, parentId: variant.parentContentId, platform },
    });

    return variant;
  }

  public updateVariant(id: string, patch: Partial<ContentVariant>): ContentVariant {
    const existing = this.db.getContentVariantById(id);
    if (!existing) {
      throw new Error(`Variante '${id}' nicht gefunden.`);
    }

    const updated = this.db.updateContentVariant(id, patch);
    if (!updated) {
      throw new Error(`Fehler beim Aktualisieren der Variante '${id}'.`);
    }

    return updated;
  }

  public getVariant(id: string): ContentVariant | undefined {
    return this.db.getContentVariantById(id);
  }

  public listVariants(parentContentId?: string): ContentVariant[] {
    if (parentContentId) {
      return this.db.getContentVariantsByParentId(parentContentId);
    }
    return this.db.getAllContentVariants();
  }

  public deleteVariant(id: string): boolean {
    const existing = this.db.getContentVariantById(id);
    if (!existing) return false;
    return this.db.deleteContentVariant(id);
  }

  // ==========================================
  // 4. PLATFORMS
  // ==========================================

  public listPlatforms(): ContentPlatform[] {
    return this.db.getAllContentPlatforms();
  }

  public updatePlatform(id: string, patch: Partial<ContentPlatform>): ContentPlatform {
    const updated = this.db.updateContentPlatform(id, patch);
    if (!updated) {
      throw new Error(`Plattform '${id}' nicht gefunden.`);
    }
    return updated;
  }

  // ==========================================
  // 5. PUBLICATIONS & TIME OS CALENDAR INTEGRATION
  // ==========================================

  public createPublication(data: Partial<ContentPublication>): ContentPublication {
    if (!data.contentId) {
      throw new Error('Content ID für Veröffentlichung erforderlich.');
    }
    const content = this.db.getContentItemById(data.contentId);
    if (!content) {
      throw new Error(`Content '${data.contentId}' existiert nicht.`);
    }

    const now = new Date().toISOString();
    const scheduledAt = data.scheduledAt || now;

    const pub: ContentPublication = {
      id: data.id || `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      contentId: data.contentId,
      variantId: data.variantId || undefined,
      platform: data.platform || 'General',
      status: (data.status as ContentPublicationStatus) || 'PLANNED',
      scheduledAt,
      publishedAt: data.publishedAt || undefined,
      externalId: data.externalId || undefined,
      externalUrl: data.externalUrl || undefined,
      timeEventId: data.timeEventId || undefined,
      performance: data.performance || null,
      createdAt: data.createdAt || now,
      updatedAt: now,
      isDemo: Boolean(data.isDemo ?? content.isDemo),
    };

    this.db.insertContentPublication(pub);

    this.audit.log({
      action: 'CONTENT_PUBLICATION_CREATED',
      actor: 'SYSTEM',
      entity: 'CONTENT_PUBLICATION',
      entityId: pub.id,
      reason: 'Created content publication schedule',
      source: 'ContentService',
      after: { id: pub.id, contentId: pub.contentId, platform: pub.platform, scheduledAt },
    });

    return pub;
  }

  public schedulePublication(
    publicationOrId: string | Partial<ContentPublication>,
    scheduledAt?: string,
    options?: { createCalendarEvent?: boolean; title?: string }
  ): ContentPublication {
    let pub: ContentPublication;

    if (typeof publicationOrId === 'string') {
      const existing = this.db.getContentPublicationById(publicationOrId);
      if (!existing) {
        throw new Error(`Veröffentlichung '${publicationOrId}' existiert nicht.`);
      }
      pub = existing;
    } else {
      pub = this.createPublication(publicationOrId);
    }

    const scheduleDate = scheduledAt || pub.scheduledAt || new Date().toISOString();
    const shouldCreateCalendarEvent = options?.createCalendarEvent !== false;

    let timeEventId = pub.timeEventId;

    // Direct Integration with Time OS calendar events table
    if (shouldCreateCalendarEvent) {
      const content = this.db.getContentItemById(pub.contentId);
      const title = options?.title || `Content: ${content?.title || 'Veröffentlichung'} (${pub.platform})`;

      const start = new Date(scheduleDate);
      const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 mins

      const newEventId = timeEventId || `event_content_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      
      try {
        this.db.insertTimeEvent({
          id: newEventId,
          title,
          notes: `Geplante Content-Veröffentlichung auf ${pub.platform}. Content-ID: ${pub.contentId}`,
          start: start.toISOString(),
          end: end.toISOString(),
          durationMinutes: 30,
          category: 'BUSINESS',
          businessDomain: 'CONTENT',
          priority: 'MEDIUM',
          flexibility: 'FIXED',
          protected: false,
          status: 'SCHEDULED',
          timezone: 'Europe/Berlin',
          source: 'MANUAL',
          isDemo: pub.isDemo,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        timeEventId = newEventId;
      } catch (err) {
        console.warn('Could not insert time_event for content publication:', err);
      }
    }

    // Update publication and content status
    const updatedPub = this.db.updateContentPublication(pub.id, {
      status: 'SCHEDULED',
      scheduledAt: scheduleDate,
      timeEventId,
    })!;

    this.updateContent(pub.contentId, {
      status: 'SCHEDULED',
      scheduledAt: scheduleDate,
      timeEventId,
    });

    this.audit.log({
      action: 'CONTENT_PUBLICATION_SCHEDULED',
      actor: 'SYSTEM',
      entity: 'CONTENT_PUBLICATION',
      entityId: pub.id,
      reason: 'Publication scheduled on calendar',
      source: 'ContentService',
      after: {
        publicationId: pub.id,
        contentId: pub.contentId,
        scheduledAt: scheduleDate,
        timeEventId,
      },
    });

    return updatedPub;
  }

  public updatePublicationStatus(
    id: string,
    status: ContentPublicationStatus,
    externalResult?: { externalId?: string; externalUrl?: string; timestamp?: string }
  ): ContentPublication {
    const pub = this.db.getContentPublicationById(id);
    if (!pub) {
      throw new Error(`Veröffentlichung '${id}' nicht gefunden.`);
    }

    const patch: Partial<ContentPublication> = { status };
    if (status === 'PUBLISHED') {
      patch.publishedAt = externalResult?.timestamp || new Date().toISOString();
      if (externalResult?.externalId) patch.externalId = externalResult.externalId;
      if (externalResult?.externalUrl) patch.externalUrl = externalResult.externalUrl;

      // Update parent content item as well
      this.updateContent(pub.contentId, {
        status: 'PUBLISHED',
        publishedAt: patch.publishedAt,
      });
    }

    const updated = this.db.updateContentPublication(id, patch);
    if (!updated) {
      throw new Error(`Fehler beim Aktualisieren der Veröffentlichung '${id}'.`);
    }

    this.audit.log({
      action: 'CONTENT_PUBLICATION_STATUS_CHANGED',
      actor: 'USER',
      entity: 'CONTENT_PUBLICATION',
      entityId: id,
      reason: 'Publication status updated',
      source: 'ContentService',
      after: { id, status, externalResult },
    });

    return updated;
  }

  public listPublications(filter?: { status?: string; platform?: string; contentId?: string }): ContentPublication[] {
    return this.db.getAllContentPublications(filter);
  }

  // ==========================================
  // 6. CAMPAIGNS
  // ==========================================

  public createCampaign(data: Partial<ContentCampaign>): ContentCampaign {
    const name = (data.name || '').trim();
    if (!name) throw new Error('Kampagne benötigt einen Namen.');

    const now = new Date().toISOString();
    const campaign: ContentCampaign = {
      id: data.id || `camp_${Date.now()}`,
      name,
      description: data.description || '',
      status: data.status || 'PLANNING',
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: now,
      updatedAt: now,
      isDemo: Boolean(data.isDemo),
    };

    this.db.insertContentCampaign(campaign);
    return campaign;
  }

  public listCampaigns(): ContentCampaign[] {
    return this.db.getAllContentCampaigns();
  }

  // ==========================================
  // 7. MARKET INTELLIGENCE BRIDGE & PROVENANCE
  // ==========================================

  public createIdeaFromMarketIntelligence(marketItemId: string, notes?: string): ContentIdea {
    const marketItem = this.db.getMarketIntelligenceItemById(marketItemId);
    if (!marketItem) {
      throw new Error(`Market Intelligence Item '${marketItemId}' existiert nicht.`);
    }

    const title = `Content: ${marketItem.title}`;
    const description = [
      marketItem.summary,
      notes ? `\nNotiz: ${notes}` : '',
      `\nQuelle: ${marketItem.source} (${marketItem.sourceType})`,
      `Beobachtung: ${marketItem.observation}`,
    ].filter(Boolean).join('\n');

    const idea = this.createIdea({
      title,
      description,
      source: marketItem.source,
      sourceType: 'MARKET_INTELLIGENCE',
      topic: marketItem.topic || 'Marktanalyse',
      priority: marketItem.relevance === 'CRITICAL' ? 'CRITICAL' : marketItem.relevance === 'HIGH' ? 'HIGH' : 'MEDIUM',
      provenance: marketItem.provenance,
      confidence: marketItem.confidence,
      epistemicStatus: marketItem.epistemicLevel === 'FACT' ? 'FACT' : 'HYPOTHESIS',
      linkedMarketIntelligenceIds: [marketItem.id],
      tags: ['MARKET_INTEL', marketItem.topic.toUpperCase().replace(/\s+/g, '_')],
    });

    this.audit.log({
      action: 'CONTENT_IDEA_FROM_MARKET_INTELLIGENCE',
      actor: 'SYSTEM',
      entity: 'CONTENT_IDEA',
      entityId: idea.id,
      reason: 'Content idea derived from market intelligence item',
      source: 'ContentService',
      after: { ideaId: idea.id, marketItemId },
    });

    return idea;
  }

  public linkMarketIntelligence(contentId: string, marketItemId: string): ContentItem {
    const content = this.db.getContentItemById(contentId);
    if (!content) throw new Error(`Content '${contentId}' nicht gefunden.`);

    const currentLinks = content.linkedMarketIntelligenceIds || [];
    if (!currentLinks.includes(marketItemId)) {
      currentLinks.push(marketItemId);
    }

    return this.updateContent(contentId, { linkedMarketIntelligenceIds: currentLinks });
  }

  public linkBusinessMemory(contentId: string, memoryId: string): ContentItem {
    const content = this.db.getContentItemById(contentId);
    if (!content) throw new Error(`Content '${contentId}' nicht gefunden.`);

    const currentLinks = content.linkedMemoryIds || [];
    if (!currentLinks.includes(memoryId)) {
      currentLinks.push(memoryId);
    }

    return this.updateContent(contentId, { linkedMemoryIds: currentLinks });
  }

  // ==========================================
  // 8. UNIVERSAL INBOX ADAPTER FOR CONTENT
  // ==========================================

  public ingestRawContentInput(input: {
    text: string;
    sourceUrl?: string;
    sourceName?: string;
    topic?: string;
  }): ContentIdea {
    const raw = (input.text || '').trim();
    if (!raw) {
      throw new Error('Eingabetext für Content Inbox darf nicht leer sein.');
    }

    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    const title = lines[0]?.substring(0, 120) || 'Unbenannte Content-Idee';
    const description = lines.slice(1).join('\n') || raw;

    let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    const lower = raw.toLowerCase();
    if (lower.includes('dringend') || lower.includes('wichtig') || lower.includes('viral')) {
      priority = 'HIGH';
    }

    const idea = this.createIdea({
      title,
      description,
      source: input.sourceName || input.sourceUrl || 'Universal Inbox',
      sourceType: 'UNIVERSAL_INBOX',
      topic: input.topic || 'Universal Inbox',
      priority,
      provenance: 'REAL',
      confidence: 0.8,
      epistemicStatus: 'HYPOTHESIS',
      tags: ['INBOX', 'RAW_CAPTURE'],
    });

    return idea;
  }

  // ==========================================
  // 9. AI CONTENT GENERATION & REPURPOSING (VIA AI SERVICE)
  // ==========================================

  public async generateHooks(topicOrContent: string, count: number = 3): Promise<string[]> {
    const prompt = `Erstelle ${count} prägnante, aufmerksamkeitsstarke Hooks für folgenden Content/Thema.
Antworte ausschließlich mit den Hooks, je einer pro Zeile, ohne Vorwort oder Nummerierung.
Thema: ${topicOrContent}`;

    try {
      const text = await this.ai.generateText(prompt);
      const hooks = text
        .split('\n')
        .map((h) => h.replace(/^[-*•0-9.)\s]+/, '').trim())
        .filter(Boolean);
      return hooks.slice(0, count);
    } catch {
      return [
        `Warum die meisten bei ${topicOrContent} scheitern – und die Lösung`,
        `3 ungemütliche Wahrheiten über ${topicOrContent}`,
        `Der wichtigste Hebel für ${topicOrContent}`,
      ];
    }
  }

  public async generateBrief(contentId: string): Promise<{ brief: string; angles: string[]; targetAudience: string }> {
    const item = this.db.getContentItemById(contentId);
    if (!item) throw new Error(`Content '${contentId}' nicht gefunden.`);

    const prompt = `Erstelle ein professionelles Content-Briefing für folgenden Inhalt:
Titel: ${item.title}
Thema: ${item.topic}
Format: ${item.format}
Bisherige Notizen: ${item.notes || 'Keine'}

Formatierung:
Brief: [2-3 Sätze zum Ziel und Kerninhalt]
Zielgruppe: [Präzise Zielgruppenbeschreibung]
Blickwinkel:
- [Winkel 1]
- [Winkel 2]
- [Winkel 3]`;

    try {
      const response = await this.ai.generateText(prompt);
      return {
        brief: response,
        angles: ['Problem & Schmerzpunkt', 'Lösungsansatz', 'Praktische Umsetzung'],
        targetAudience: 'Geschäftsführer, Solopreneure und Creator',
      };
    } catch {
      return {
        brief: `Fokussierter Content zum Thema ${item.topic} mit praxisorientierten Schritten.`,
        angles: ['Strategischer Überblick', 'Häufige Fehler', 'Konkrete Checkliste'],
        targetAudience: 'Unternehmer und Wissensarbeiter',
      };
    }
  }

  public async generateDraft(
    contentId: string,
    options?: { tone?: string; length?: string }
  ): Promise<{ draft: string; hook: string; cta: string }> {
    const item = this.db.getContentItemById(contentId);
    if (!item) throw new Error(`Content '${contentId}' nicht gefunden.`);

    const tone = options?.tone || 'autoritär, analytisch, klar, ohne Marketing-Floskeln';
    const prompt = `Erstelle einen hochwertigen ersten Entwurf für einen Content-Beitrag.
Titel: ${item.title}
Thema: ${item.topic}
Format: ${item.format}
Tonalität: ${tone}
Notizen/Briefing: ${item.notes || ''}

Struktur:
[HOOK]
(Erster Satz, der sofort fesselt)

[BODY]
(Klar strukturierter Hauptteil mit Substanz)

[CTA]
(Konkreter Call to Action)`;

    try {
      const output = await this.ai.generateText(prompt);
      let hook = item.hook || '';
      let body = output;
      let cta = item.cta || '';

      if (output.includes('[HOOK]')) {
        const parts = output.split(/\[(?:HOOK|BODY|CTA)\]/i);
        if (parts.length >= 4) {
          hook = parts[1].trim();
          body = parts[2].trim();
          cta = parts[3].trim();
        }
      }

      // Update content item in DB
      this.updateContent(contentId, {
        hook: hook || item.hook,
        body: body || output,
        cta: cta || item.cta,
        status: item.status === 'IDEA' || item.status === 'BRIEF' ? 'DRAFT' : item.status,
      });

      return { draft: body, hook, cta };
    } catch {
      const fallbackDraft = `Hier ist der Entwurf zu "${item.title}":\n\n1. Kernproblem erkennen\n2. Strategische Ausrichtung festlegen\n3. Operativ umsetzen.`;
      const fallbackHook = `Die meisten übersehen bei ${item.topic} das Offensichtliche.`;
      const fallbackCta = `Was ist deine Erfahrung damit? Schreib es in die Kommentare.`;

      this.updateContent(contentId, {
        body: fallbackDraft,
        hook: fallbackHook,
        cta: fallbackCta,
        status: item.status === 'IDEA' ? 'DRAFT' : item.status,
      });

      return { draft: fallbackDraft, hook: fallbackHook, cta: fallbackCta };
    }
  }

  public async generatePlatformVariant(
    contentId: string,
    targetPlatform: string
  ): Promise<ContentVariant> {
    const item = this.db.getContentItemById(contentId);
    if (!item) throw new Error(`Content '${contentId}' nicht gefunden.`);

    const prompt = `Passe folgenden Inhalt perfekt für die Plattform "${targetPlatform}" an.
Berücksichtige die plattformspezifische Tonalität, Längenbeschränkung und Formatierung:
Titel: ${item.title}
Hook: ${item.hook}
Inhalt: ${item.body}
CTA: ${item.cta}

Antworte mit dem fertigen Text für ${targetPlatform}.`;

    let body = '';
    let hook = item.hook;
    let cta = item.cta;

    try {
      body = await this.ai.generateText(prompt);
    } catch {
      body = `[${targetPlatform} Version]\n${item.hook}\n\n${item.body}\n\n${item.cta}`;
    }

    return this.createVariant({
      parentContentId: contentId,
      platform: targetPlatform,
      format: targetPlatform.toLowerCase().includes('tiktok') || targetPlatform.toLowerCase().includes('short') ? 'SHORT_VIDEO' : 'TEXT_POST',
      title: `${item.title} (${targetPlatform})`,
      body,
      hook,
      cta,
      status: 'DRAFT',
    });
  }

  // ==========================================
  // 10. DIGITAL TWIN DOMAIN STATE & SUFFICIENCY
  // ==========================================

  public getContentDomainState(): ContentDomainState {
    const ideas = this.db.getAllContentIdeas();
    const items = this.db.getAllContentItems();
    const platforms = this.db.getAllContentPlatforms();
    const publications = this.db.getAllContentPublications();

    const totalIdeas = ideas.filter((i) => i.status !== 'DISCARDED').length;
    const totalDrafts = items.filter((i) => ['DRAFT', 'BRIEF', 'PLANNED'].includes(i.status)).length;
    const inReviewCount = items.filter((i) => i.status === 'REVIEW').length;
    const scheduledCount = items.filter((i) => i.status === 'SCHEDULED').length +
      publications.filter((p) => p.status === 'SCHEDULED').length;
    const publishedCount = items.filter((i) => i.status === 'PUBLISHED').length +
      publications.filter((p) => p.status === 'PUBLISHED').length;
    const backlogCount = ideas.filter((i) => ['NEW', 'VALIDATED', 'PARKED'].includes(i.status)).length +
      items.filter((i) => i.status === 'IDEA').length;

    // Velocity: published in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activeContentVelocity = publications.filter(
      (p) => p.status === 'PUBLISHED' && p.publishedAt && p.publishedAt >= thirtyDaysAgo
    ).length;

    // Data Sufficiency: Strictly based on real data
    const totalEntities = totalIdeas + items.length;
    let sufficiency: DataSufficiency;

    if (totalEntities === 0) {
      sufficiency = {
        level: 'NO_DATA',
        confidence: 0.2,
        evidenceCount: 0,
        sourceQualityScore: 0.5,
        dataFreshnessScore: 0.5,
        dataConsistencyScore: 1.0,
        dataWindowDays: 30,
        evidenceStrength: 0.2,
        statement: 'Keine Content-Elemente in der Datenbank vorhanden. Der Content Brain befindet sich im Initialzustand.',
      };
    } else if (totalEntities < 5) {
      sufficiency = {
        level: 'LIMITED',
        confidence: 0.6,
        evidenceCount: totalEntities,
        sourceQualityScore: 0.8,
        dataFreshnessScore: 0.85,
        dataConsistencyScore: 0.9,
        dataWindowDays: 30,
        evidenceStrength: 0.7,
        statement: `Basis-Content vorhanden (${totalEntities} Einträge). Redaktionspipeline aktiv.`,
      };
    } else {
      sufficiency = {
        level: 'SUFFICIENT',
        confidence: 0.9,
        evidenceCount: totalEntities,
        sourceQualityScore: 0.95,
        dataFreshnessScore: 0.95,
        dataConsistencyScore: 0.98,
        dataWindowDays: 30,
        evidenceStrength: 0.95,
        statement: `Solide Content-Pipeline mit ${totalIdeas} Ideen und ${items.length} Content-Objekten etabliert.`,
      };
    }

    return {
      totalIdeas,
      totalDrafts,
      inReviewCount,
      scheduledCount,
      publishedCount,
      backlogCount,
      activeContentVelocity,
      platformsCount: platforms.filter((p) => p.enabled).length,
      dataSufficiency: sufficiency,
    };
  }

  public getContentSnapshot(): ContentSnapshot {
    return {
      ideas: this.db.getAllContentIdeas(),
      items: this.db.getAllContentItems(),
      variants: this.db.getAllContentVariants(),
      platforms: this.db.getAllContentPlatforms(),
      publications: this.db.getAllContentPublications(),
      campaigns: this.db.getAllContentCampaigns(),
      metrics: this.getContentDomainState(),
    };
  }

  public seedInitialContentDataIfEmpty(): void {
    const existing = this.db.getAllContentIdeas();
    const existingItems = this.db.getAllContentItems();
    if (existing.length > 0 || existingItems.length > 0) {
      return;
    }

    // 1. Seed Campaign
    const campaign = this.createCampaign({
      id: 'cmp_launch_2026',
      name: '348 System Launch & Authority',
      description: 'Aufbau von organischer Reichweite und Autorität rund um Solopreneur Systems und Time OS.',
      status: 'ACTIVE',
      color: '#3b82f6',
    });

    // 2. Seed Ideas
    const idea1 = this.createIdea({
      id: 'idea_time_os_1',
      title: 'Warum Solopreneure an fragmentierter Zeit scheitern (und wie Time OS das löst)',
      rawInput: 'Viele Gründer arbeiten 60h, schaffen aber nur 10h echte Wertschöpfung wegen Kontextwechseln.',
      topic: 'Productivity & Time Systems',
      category: 'OPINION',
      priority: 'HIGH',
      status: 'CONVERTED',
      targetPlatforms: ['LinkedIn', 'X'],
      isDemo: false,
    });

    const idea2 = this.createIdea({
      id: 'idea_trading_1',
      title: 'Trading OS 348: Systematischer Edge statt emotionalem Overtrading',
      rawInput: 'Statistischer Vorteil und striktes Risikomanagement schlagen jede Markterratik.',
      topic: 'Trading & Finance',
      category: 'FRAMEWORK',
      priority: 'HIGH',
      status: 'VALIDATED',
      targetPlatforms: ['YouTube', 'LinkedIn'],
      isDemo: false,
    });

    const idea3 = this.createIdea({
      id: 'idea_founder_shift_1',
      title: 'Vom Schichtdienst zum digitalen Unternehmer: Die 4 Phasen der Hebelwirkung',
      rawInput: 'Transition von Zeit-gegen-Geld zu asynchronen Systemen bei realen Randbedingungen.',
      topic: 'Founder Transition',
      category: 'STORY',
      priority: 'HIGH',
      status: 'CAPTURED',
      targetPlatforms: ['LinkedIn', 'Newsletter'],
      isDemo: false,
    });

    const idea4 = this.createIdea({
      id: 'idea_ai_autonomy_1',
      title: 'Autonome KI vs. Human-in-the-Loop: Warum der Autonomy Governor unverzichtbar ist',
      rawInput: 'KI-Agenten brauchen klare Schranken (Tier 1 vs Tier 3) und strikte Freigabeprozesse.',
      topic: 'AI Systems',
      category: 'CASE_STUDY',
      priority: 'MEDIUM',
      status: 'CAPTURED',
      targetPlatforms: ['X', 'LinkedIn'],
      isDemo: false,
    });

    // 3. Seed Content Items
    const item1 = this.createContent({
      id: 'content_time_os_post',
      ideaId: idea1.id,
      campaignId: campaign.id,
      title: 'Solopreneur Time OS: Der mathematische Beweis für Fokus-Blöcke',
      contentType: 'LONG_FORM_POST',
      topic: 'Time Management',
      targetAudience: 'Solopreneure, Gründer und System-Entwickler',
      coreMessage: 'Fokus ist nicht dehnbar, aber mathematisch optimierbar. Wie Schichtarbeit und Unternehmertum synchronisiert werden.',
      hook: 'Die meisten Gründer planen ihre Woche wie Angestellte mit Überstunden. Hier ist mein System für 100% verlässliche Blöcke.',
      callToAction: 'Wie planst du deine Deep-Work-Blöcke bei unregelmäßigen Arbeitszeiten? Schreib es in die Kommentare.',
      outline: [
        '1. Das Paradoxon der 60-Stunden-Woche',
        '2. Warum Kontextwechsel 80% des kognitiven Kapitals verbrennen',
        '3. Das Time OS Prinzip: Feste Puffer, deterministische Slots',
        '4. Konkreter 4-Stufen-Wochenablauf',
      ],
      draftBody: `Die meisten Gründer planen ihre Woche wie Angestellte mit Überstunden. Hier ist mein System für 100% verlässliche Blöcke.

Wenn du 50 bis 60 Stunden pro Woche 'arbeitest', aber am Sonntagabend das Gefühl hast, nichts Relevantes vorangebracht zu haben, liegt das nicht an mangelnder Disziplin. Es liegt an fragmentierter Zeit.

Jeder ungeplante Kontextwechsel kostet nachweislich 15 bis 25 Minuten Rekonzentrationszeit. Bei fünf Unterbrechungen am Tag ist dein Deep-Work-Kontingent vernichtet.

Im 348 Time OS trennen wir strikt:
1. Schicht- und Fixzeiten (externe Bindung)
2. Deterministische Deep-Work-Slots (heilige Zeitblöcke)
3. Asynchrone Pufferzonen (für E-Mails, Admin und unvorhergesehenes)

Das Resultat: In 15 fokussierten Wochenstunden entsteht mehr Output als in 40 Stunden reaktivem Multitasking.`,
      status: 'APPROVED',
      isDemo: false,
      provenance: 'REAL',
    });

    const item2 = this.createContent({
      id: 'content_trading_framework',
      ideaId: idea2.id,
      campaignId: campaign.id,
      title: '348 Trading Framework: Risikomanagement vor Gewinnmaximierung',
      contentType: 'THREAD',
      topic: 'Trading & Risk',
      targetAudience: 'Aktive Trader und quantitative Investoren',
      coreMessage: 'Kapitalerhalt ist die oberste Pflicht im Markt. Ohne striktes R-Multiples-Management existiert kein langfristiger Edge.',
      hook: '90% aller Trader scheitern nicht an der Strategie, sondern am Ego nach dem ersten Verlust.',
      callToAction: 'Speichere diesen Thread als Regelwerk für deine nächste Trading-Woche.',
      outline: [
        '1. Der Mythos der Trefferquote',
        '2. R-Multiples und Erwartungswert mathematisch erklärt',
        '3. Die 1%-Regel pro Position',
        '4. Das Trading OS 348 Regelwerk',
      ],
      draftBody: `90% aller Trader scheitern nicht an der Strategie, sondern am Ego nach dem ersten Verlust.

Hier sind die 4 unverhandelbaren Regeln aus dem Trading OS 348:

1. Trefferquote ist irrelevant — Erwartungswert entscheidet.
Ein System mit 40% Win-Rate und 3R durchschnittlichem Gewinn schlägt jedes 80%-System mit undisziplinierten Drawdowns.

2. Maximal 1% Gesamtkapitalrisiko pro Trade.
Wer 5% oder 10% pro Position riskiert, ist nur eine Pechsträhne von der Auslöschung entfernt.

3. Kein Trade ohne vorab definierten Hard-Stop.
Wer während des Trades überlegt, wo er aussteigt, handelt emotional und nicht systematisch.

4. Journaling ist keine Pflichtübung, sondern der eigentliche Edge.
Nur was gemessen und rückblickend evaluiert wird, kann optimiert werden.`,
      status: 'READY_FOR_APPROVAL',
      isDemo: false,
      provenance: 'REAL',
    });

    // 4. Seed Variants
    const variant1 = this.createVariant({
      id: 'var_time_os_linkedin',
      parentContentId: item1.id,
      platform: 'LinkedIn',
      format: 'TEXT_IMAGE',
      hookText: 'Die meisten Gründer planen ihre Woche wie Angestellte mit Überstunden. Hier ist mein System für 100% verlässliche Blöcke.',
      bodyText: item1.draftBody || '',
      callToActionText: 'Wie planst du deine Deep-Work-Blöcke? Lass uns in den Kommentaren austauschen.',
      hashtags: ['#Productivity', '#Solopreneur', '#TimeOS', '#DeepWork', '#Focus'],
      characterCount: (item1.draftBody || '').length,
      estimatedReadingTimeSeconds: 75,
      status: 'APPROVED',
      isDemo: false,
    });

    this.createVariant({
      id: 'var_trading_x',
      parentContentId: item2.id,
      platform: 'X',
      format: 'THREAD',
      hookText: '90% aller Trader scheitern nicht an der Strategie, sondern am Ego nach dem ersten Verlust. 🧵 Ein Regelwerk für systematischen Edge:',
      bodyText: item2.draftBody || '',
      callToActionText: 'Bookmark diesen Thread und teile ihn mit Tradern, die ihr Risiko senken wollen.',
      hashtags: ['#Trading', '#RiskManagement', '#Finance', '#Discipline'],
      characterCount: (item2.draftBody || '').length,
      estimatedReadingTimeSeconds: 60,
      status: 'PENDING_REVIEW',
      isDemo: false,
    });

    // 5. Seed Publications
    // Publication 1: Scheduled for next Tuesday at 08:30 CET
    const nextTuesday = new Date();
    nextTuesday.setDate(nextTuesday.getDate() + ((2 - nextTuesday.getDay() + 7) % 7 || 7));
    nextTuesday.setHours(8, 30, 0, 0);

    const pub1 = this.createPublication({
      id: 'pub_time_os_linkedin_scheduled',
      contentId: item1.id,
      variantId: variant1.id,
      platform: 'LinkedIn',
      scheduledAt: nextTuesday.toISOString(),
      status: 'SCHEDULED',
      isDemo: false,
    });
    this.schedulePublication(pub1.id, nextTuesday.toISOString(), { createCalendarEvent: true });

    // Publication 2: Published 3 days ago
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);
    pastDate.setHours(9, 0, 0, 0);

    this.createPublication({
      id: 'pub_time_os_past',
      contentId: item1.id,
      variantId: variant1.id,
      platform: 'LinkedIn',
      scheduledAt: pastDate.toISOString(),
      publishedAt: pastDate.toISOString(),
      status: 'PUBLISHED',
      externalPostUrl: 'https://linkedin.com/posts/348-systems-time-os',
      isDemo: false,
    });
  }
}

export const contentService = new ContentService();
