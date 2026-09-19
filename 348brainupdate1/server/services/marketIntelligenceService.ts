import { DatabaseManager, dbManager } from '../db/sqlite';
import { AIService, aiService } from '../ai/router';
import { BrainEventBus, eventBus } from '../events/eventBus';
import { AuditLogger, auditLogger } from '../audit/auditLogger';
import { SourceManagerService, sourceManager } from './sourceManager';
import type {
  MarketIntelligenceItem,
  MarketStory,
  MarketTrend,
  CustomerProblem,
  CompetitorMovement,
  MarketOpportunity,
  MarketRisk,
  ResearchScope,
  ResearchResult,
  MarketIntelligenceSnapshot,
  MarketIntelligenceType,
  MarketFreshness,
  MarketSourceType,
  MarketSourceAvailability,
  MarketEpistemicLevel,
  DataProvenance,
  BusinessMemory,
  DataSufficiency,
  Goal,
  Project,
} from '../../shared/types';

export class MarketIntelligenceService {
  private db: DatabaseManager;
  private ai: AIService;
  private events: BrainEventBus;
  private audit: AuditLogger;
  private sources: SourceManagerService;

  constructor(deps?: {
    db?: DatabaseManager;
    ai?: AIService;
    events?: BrainEventBus;
    audit?: AuditLogger;
    sources?: SourceManagerService;
  }) {
    this.db = deps?.db ?? dbManager;
    this.ai = deps?.ai ?? aiService;
    this.events = deps?.events ?? eventBus;
    this.audit = deps?.audit ?? auditLogger;
    this.sources = deps?.sources ?? sourceManager;
  }

  /**
   * Ingests a new Market Intelligence item through the normalized pipeline.
   */
  public ingestItem(data: Partial<MarketIntelligenceItem>): MarketIntelligenceItem {
    const now = new Date();
    const nowIso = now.toISOString();

    const id = data.id || `mkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let rawType = (data.type as string) || 'OTHER';
    if (rawType === 'COMPETITOR_UPDATE') rawType = 'COMPETITOR_CHANGE';
    if (rawType === 'CUSTOMER_FEEDBACK') rawType = 'CUSTOMER_PROBLEM';
    if (rawType === 'NEWS') rawType = 'INDUSTRY_CHANGE';
    const type: MarketIntelligenceType = (rawType as MarketIntelligenceType) || 'OTHER';
    const source = (data.source || 'MANUAL').trim();
    const sourceType: MarketSourceType = data.sourceType || 'MANUAL';
    const observation = (data.observation || data.summary || data.title || '').trim();

    if (!observation) {
      throw new Error('Market Intelligence erfordert mindestens eine konkrete Beobachtung oder Summary.');
    }

    const title = (data.title || observation.substring(0, 80)).trim();
    const summary = (data.summary || observation).trim();
    const topic = (data.topic || 'Allgemeiner Markt').trim();
    const market = (data.market || 'Trading & Creator Economy').trim();
    const publishedAt = data.publishedAt || nowIso;
    const retrievedAt = data.retrievedAt || nowIso;

    // Epistemic classification
    const epistemicLevel: MarketEpistemicLevel =
      data.epistemicLevel || (data.hypothesis ? 'HYPOTHESIS' : data.rawData ? 'FACT' : 'OBSERVATION');

    // Freshness calculation
    const freshness = this.calculateFreshness(type, publishedAt);

    // Business relevance & "Warum sehe ich das?"
    const relevanceResult = this.calculateRelevance({
      title,
      summary,
      topic,
      market,
      entity: data.entity,
      type,
    });

    const provenance: DataProvenance = data.provenance || (data.isDemo ? 'DEMO' : 'REAL');

    const item: MarketIntelligenceItem = {
      id,
      type,
      title,
      summary,
      source,
      sourceUrl: data.sourceUrl,
      sourceType,
      publishedAt,
      retrievedAt,
      topic,
      market,
      audience: data.audience,
      entity: data.entity,
      tags: Array.isArray(data.tags) ? data.tags : [topic.toLowerCase()],
      rawData: data.rawData,
      observation,
      analysis: data.analysis,
      hypothesis: data.hypothesis,
      confidence: typeof data.confidence === 'number' ? Math.max(0, Math.min(1, data.confidence)) : 0.8,
      freshness,
      dataQuality: data.dataQuality || 'MEDIUM',
      provenance,
      corroborationCount: data.corroborationCount || 1,
      status: data.status || 'ACTIVE',
      relevance: data.relevance || relevanceResult.relevance,
      businessImpact: data.businessImpact || relevanceResult.businessImpact,
      relatedGoals: data.relatedGoals || relevanceResult.relatedGoals,
      relatedProjects: data.relatedProjects || relevanceResult.relatedProjects,
      relatedProducts: data.relatedProducts || [],
      relatedContent: data.relatedContent || [],
      relatedCustomers: data.relatedCustomers || [],
      relatedMemory: data.relatedMemory || [],
      storyId: data.storyId,
      whyRelevant: data.whyRelevant || relevanceResult.whyRelevant,
      epistemicLevel,
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso,
      isDemo: Boolean(data.isDemo),
    };

    // Story Clustering & Deduplication
    this.handleStoryClustering(item);

    // Trend Evaluation (multiple signals over time)
    this.evaluateTrendSignal(item);

    // Competitor Movement auto-logging
    if (
      type === 'COMPETITOR' ||
      type === 'COMPETITOR_CHANGE' ||
      type === 'PRICING_CHANGE' ||
      type === 'PRODUCT_LAUNCH'
    ) {
      this.autoLogCompetitorMovement(item);
    }

    // Customer Problem auto-logging
    if (type === 'CUSTOMER_PROBLEM' || type === 'CUSTOMER_DEMAND') {
      this.autoLogCustomerProblem(item);
    }

    // Save item
    this.db.upsertMarketIntelligenceItem(item);

    // Emit event & audit
    this.events.emit('MARKET_SIGNAL_DETECTED', {
      itemId: item.id,
      type: item.type,
      title: item.title,
      relevance: item.relevance,
      epistemicLevel: item.epistemicLevel,
    });

    this.audit.log({
      actor: 'ENGINE_INTELLIGENCE',
      action: 'INGEST_MARKET_INTELLIGENCE',
      entity: 'MarketIntelligenceItem',
      entityId: item.id,
      reason: `Markt-Signal aufgenommen: ${item.title} (Relevanz: ${item.relevance})`,
      source: item.source,
    });

    return item;
  }

  /**
   * Calculates category-dependent freshness.
   */
  public calculateFreshness(type: MarketIntelligenceType, dateStr?: string): MarketFreshness {
    if (!dateStr) return 'UNKNOWN';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'UNKNOWN';

    const now = new Date();
    const diffDays = Math.max(0, (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    // Volatile types (News, Pricing, Product Launches)
    if (type === 'PRICING_CHANGE' || type === 'PRODUCT_LAUNCH' || type === 'COMPETITOR_CHANGE') {
      if (diffDays <= 3) return 'FRESH';
      if (diffDays <= 14) return 'RECENT';
      if (diffDays <= 45) return 'AGING';
      return 'STALE';
    }

    // Medium types (Trends, Customer Problems, Competitor general, Content)
    if (
      type === 'MARKET_TREND' ||
      type === 'CUSTOMER_PROBLEM' ||
      type === 'CUSTOMER_DEMAND' ||
      type === 'COMPETITOR' ||
      type === 'CONTENT_TREND' ||
      type === 'CREATOR'
    ) {
      if (diffDays <= 7) return 'FRESH';
      if (diffDays <= 30) return 'RECENT';
      if (diffDays <= 90) return 'AGING';
      return 'STALE';
    }

    // Long-term macro types (Technology, AI, Regulation, Macro)
    if (
      type === 'TECHNOLOGY' ||
      type === 'AI_DEVELOPMENT' ||
      type === 'REGULATION' ||
      type === 'MACRO_SIGNAL' ||
      type === 'INDUSTRY_CHANGE' ||
      type === 'BUSINESS_MODEL'
    ) {
      if (diffDays <= 14) return 'FRESH';
      if (diffDays <= 60) return 'RECENT';
      if (diffDays <= 180) return 'AGING';
      return 'STALE';
    }

    // Default
    if (diffDays <= 7) return 'FRESH';
    if (diffDays <= 30) return 'RECENT';
    if (diffDays <= 90) return 'AGING';
    return 'STALE';
  }

  /**
   * Evaluates relevance for the user's business and active goals/projects.
   */
  public calculateRelevance(item: {
    title: string;
    summary: string;
    topic: string;
    market: string;
    entity?: string;
    type?: MarketIntelligenceType;
  }): {
    relevance: 'CRITICAL' | 'HIGH' | 'IMPORTANT' | 'NORMAL' | 'BACKGROUND';
    whyRelevant: string;
    businessImpact: string;
    relatedGoals: string[];
    relatedProjects: string[];
  } {
    const goals = this.db.getAllGoals();
    const projects = this.db.getAllProjects();

    const textToMatch = `${item.title} ${item.summary} ${item.topic} ${item.market} ${item.entity || ''}`.toLowerCase();

    // Generic stop-words that must never trigger strategic domain matching on their own
    const GENERIC_STOPWORDS = new Set([
      'trends', 'trend', 'markt', 'market', 'vergleich', 'ausführlicher', 'bester', 'beste', 'besten',
      'test', 'tests', 'testing', 'system', 'systeme', 'plattform', 'platform', 'module', 'modul',
      'engine', 'bereich', 'thema', 'themen', 'status', 'aktuell', 'aktuelle', 'aktueller', 'neue',
      'neues', 'neuer', 'erste', 'erster', 'erstes', 'einführung', 'launch', 'fokus', 'strategie',
      'strategisch', 'strategische', 'initial', 'readiness', 'level', 'planung', 'plan', 'ziel',
      'ziele', 'monate', 'woche', 'wochen', 'tage', 'bericht', 'report', 'review', 'tool', 'tools',
      'software', 'online', 'digital', 'service', 'services', 'growth', 'daten', 'basis', 'über',
      'durch', 'unter', 'einen', 'einem', 'einer', 'eines', 'diese', 'dieser', 'dieses', 'nicht',
      'mehr', 'sehr', 'nach', 'beim', 'beide', 'beiden', 'immer', 'schon', 'während', 'zeigen',
      'zeigt', 'soll', 'sollen', 'kann', 'können', 'haben', 'wird', 'werden', 'wurden', 'wurde',
      'about', 'after', 'again', 'against', 'almost', 'before', 'being', 'between', 'during',
      'first', 'further', 'general', 'having', 'might', 'other', 'overview', 'phase', 'should',
      'since', 'these', 'those', 'under', 'until', 'which', 'while', 'within', 'without', 'would'
    ]);

    const extractKeywords = (text: string): string[] => {
      const tokens = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}-]+/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !GENERIC_STOPWORDS.has(w));
      return Array.from(new Set(tokens));
    };

    const extractKeyPhrases = (text: string): string[] => {
      const normalized = text.toLowerCase();
      const phrases: string[] = [];
      const candidates = [
        'business brain',
        'trading os',
        'solo-ceo',
        'solo ceo',
        'ki-betriebssystem',
        'market intelligence',
        'creator economy',
        'content engine',
        'tilt-guard',
        'risk engine',
        'time os',
      ];
      for (const phrase of candidates) {
        if (normalized.includes(phrase)) {
          phrases.push(phrase);
        }
      }
      return phrases;
    };

    const itemKeywords = new Set(extractKeywords(textToMatch));
    const itemPhrases = extractKeyPhrases(textToMatch);

    const matchedGoals: Goal[] = [];
    for (const g of goals) {
      const gFull = `${g.title} ${g.metricName || ''} ${g.notes || ''} ${g.description || ''}`;
      const gKeywords = extractKeywords(gFull);
      const gPhrases = extractKeyPhrases(gFull);

      const sharedPhrases = itemPhrases.filter((p) => gPhrases.includes(p) || gFull.toLowerCase().includes(p));
      const sharedKeywords = gKeywords.filter((k) => itemKeywords.has(k));
      const hasDistinctiveKeyword = sharedKeywords.some((k) => k.length >= 8);

      if (sharedPhrases.length > 0 || sharedKeywords.length >= 2 || (sharedKeywords.length >= 1 && hasDistinctiveKeyword)) {
        matchedGoals.push(g);
      }
    }

    const matchedProjects: Project[] = [];
    for (const p of projects) {
      const pFull = `${p.title} ${p.description || ''} ${p.classification || ''}`;
      const pKeywords = extractKeywords(pFull);
      const pPhrases = extractKeyPhrases(pFull);

      const sharedPhrases = itemPhrases.filter((p) => pPhrases.includes(p) || pFull.toLowerCase().includes(p));
      const sharedKeywords = pKeywords.filter((k) => itemKeywords.has(k));
      const hasDistinctiveKeyword = sharedKeywords.some((k) => k.length >= 8);

      if (sharedPhrases.length > 0 || sharedKeywords.length >= 2 || (sharedKeywords.length >= 1 && hasDistinctiveKeyword)) {
        matchedProjects.push(p);
      }
    }

    // Broader domain alignment (Trading OS, Creator Economy, Autonomous AI OS, Solo-CEO tooling)
    const CORE_DOMAINS = [
      'trading', 'trader', 'broker', 'fintech', 'charting', 'backtest', 'portfolio',
      'creator', 'creator economy', 'content engine', 'youtube', 'audience',
      'solo-ceo', 'solo ceo', 'solo founder', 'solopreneur', 'business brain', 'operating system',
      'saas', 'automation', 'ai agent', 'ai_intelligence', 'deep research'
    ];
    const isDomainAligned = CORE_DOMAINS.some((d) => textToMatch.includes(d));

    // Competitor & market movement alignment
    const knownCompetitors = ['notion', 'motion', 'make', 'zapier', 'tradingview', 'clickup', 'linear', 'asana'];
    const entityLower = (item.entity || '').toLowerCase();
    const hasCompetitorAlignment =
      entityLower.length > 0 &&
      (knownCompetitors.includes(entityLower) ||
        this.db.getAllCompetitorMovements().some((c) => c.competitorName.toLowerCase() === entityLower));

    // 1. Direct Strategic Risk -> CRITICAL
    if (item.type === 'RISK' && (matchedGoals.length > 0 || matchedProjects.length > 0)) {
      return {
        relevance: 'CRITICAL',
        whyRelevant: `Direktes Risiko für aktives Vorhaben (${matchedProjects.map((p) => p.title).concat(matchedGoals.map((g) => g.title)).join(', ')})`,
        businessImpact: 'Erfordert Überprüfung der operativen Annahmen oder Schutzmaßnahmen.',
        relatedGoals: matchedGoals.map((g) => g.id),
        relatedProjects: matchedProjects.map((p) => p.id),
      };
    }

    // 2. Direct Strategic Goal/Project Alignment -> HIGH
    if (matchedGoals.length > 0 || matchedProjects.length > 0) {
      return {
        relevance: 'HIGH',
        whyRelevant: `Strategischer Bezug zu: ${matchedGoals.map((g) => g.title).concat(matchedProjects.map((p) => p.title)).join(' / ')}`,
        businessImpact: 'Bietet Validierungsevidenz oder Optimierungsimpulse für aktive Vorhaben.',
        relatedGoals: matchedGoals.map((g) => g.id),
        relatedProjects: matchedProjects.map((p) => p.id),
      };
    }

    // 3. Competitor movement or relevant market pricing change -> IMPORTANT
    if (
      (item.type === 'PRICING_CHANGE' || item.type === 'PRODUCT_LAUNCH' || item.type === 'COMPETITOR_CHANGE') &&
      (isDomainAligned || hasCompetitorAlignment)
    ) {
      return {
        relevance: 'IMPORTANT',
        whyRelevant: `Wettbewerbsbewegung im relevanten Marktsegment (${item.entity || 'Konkurrent'})`,
        businessImpact: 'Beeinflusst Preispositionierung und Wertversprechen eigener Angebote.',
        relatedGoals: [],
        relatedProjects: [],
      };
    }

    // 4. Broader core domain alignment without direct goal link -> NORMAL
    if (isDomainAligned || hasCompetitorAlignment) {
      return {
        relevance: 'NORMAL',
        whyRelevant: 'Gehört zum primären Tätigkeitsfeld des Unternehmens (Trading, Creator & Business OS).',
        businessImpact: 'Mittelbare Relevanz für Branchenbeobachtung und Inspiration.',
        relatedGoals: [],
        relatedProjects: [],
      };
    }

    // 5. Unrelated noise / no meaningful alignment -> BACKGROUND
    return {
      relevance: 'BACKGROUND',
      whyRelevant: 'Allgemeine Information ohne erkennbare Ausrichtung auf aktive Geschäftsfelder, Ziele oder Projekte.',
      businessImpact: 'Dient dem allgemeinen Marktverständnis als thematisches Hintergrundrauschen.',
      relatedGoals: [],
      relatedProjects: [],
    };
  }

  /**
   * Deduplicates or clusters reports into a MarketStory.
   */
  private handleStoryClustering(item: MarketIntelligenceItem): void {
    const existingStories = this.db.getAllMarketStories();
    const itemWords = new Set(
      `${item.title} ${item.entity || ''} ${item.topic}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    );

    // Find candidate story
    let matchedStory: MarketStory | undefined;
    for (const story of existingStories) {
      if (story.status !== 'ACTIVE') continue;
      const storyWords = `${story.title} ${story.topic}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const overlap = storyWords.filter((w) => itemWords.has(w)).length;
      if (overlap >= 2 || (item.entity && story.title.toLowerCase().includes(item.entity.toLowerCase()))) {
        matchedStory = story;
        break;
      }
    }

    if (matchedStory) {
      // Add to story
      if (!matchedStory.itemIds.includes(item.id)) {
        matchedStory.itemIds.push(item.id);
      }
      if (!matchedStory.independentSources.includes(item.source)) {
        matchedStory.independentSources.push(item.source);
        matchedStory.sourcesCount = matchedStory.independentSources.length;
      }
      matchedStory.lastUpdatedAt = new Date().toISOString();

      if (matchedStory.sourcesCount >= 3) {
        matchedStory.corroborationLevel = 'STRONGLY_CORROBORATED';
        matchedStory.confidence = Math.min(0.98, matchedStory.confidence + 0.1);
      } else if (matchedStory.sourcesCount >= 2) {
        matchedStory.corroborationLevel = 'CORROBORATED';
        matchedStory.confidence = Math.min(0.9, matchedStory.confidence + 0.08);
      }

      item.storyId = matchedStory.id;
      item.corroborationCount = matchedStory.sourcesCount;

      this.db.upsertMarketStory(matchedStory);
    } else {
      // Create initial story container
      const newStory: MarketStory = {
        id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: item.title,
        summary: item.summary,
        topic: item.topic,
        itemIds: [item.id],
        sourcesCount: 1,
        independentSources: [item.source],
        firstSeenAt: item.publishedAt || item.retrievedAt,
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        confidence: item.confidence,
        corroborationLevel: 'SINGLE_SOURCE',
        isDemo: item.isDemo,
      };
      item.storyId = newStory.id;
      this.db.upsertMarketStory(newStory);
    }
  }

  /**
   * Trend Engine: Evaluates signals over time. A single signal is NEVER a trend!
   */
  private evaluateTrendSignal(item: MarketIntelligenceItem): void {
    if (
      item.type !== 'MARKET_TREND' &&
      item.type !== 'TECHNOLOGY' &&
      item.type !== 'AI_DEVELOPMENT' &&
      item.type !== 'CONTENT_TREND' &&
      item.type !== 'CUSTOMER_DEMAND'
    ) {
      return;
    }

    const trends = this.db.getAllMarketTrends();
    const itemWords = new Set(
      `${item.title} ${item.topic} ${item.market}`.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
    );

    let matchedTrend: MarketTrend | undefined;
    for (const t of trends) {
      const tWords = `${t.name} ${t.topic}`.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      const overlap = tWords.filter((w) => itemWords.has(w)).length;
      if (overlap >= 2 || item.topic.toLowerCase() === t.topic.toLowerCase()) {
        matchedTrend = t;
        break;
      }
    }

    const nowIso = new Date().toISOString();

    if (matchedTrend) {
      if (!matchedTrend.signalItemIds.includes(item.id)) {
        matchedTrend.signalItemIds.push(item.id);
        matchedTrend.signalsCount = matchedTrend.signalItemIds.length;
      }
      matchedTrend.lastObserved = item.publishedAt || nowIso;
      matchedTrend.evidence.push(`Signal (${item.source}): ${item.title}`);

      // Status transition rules based on evidence density
      if (matchedTrend.signalsCount >= 5) {
        matchedTrend.status = 'ESTABLISHED';
        matchedTrend.confidence = Math.min(0.95, matchedTrend.confidence + 0.05);
      } else if (matchedTrend.signalsCount >= 2) {
        matchedTrend.status = 'DEVELOPING';
        matchedTrend.confidence = Math.min(0.85, matchedTrend.confidence + 0.05);
      }

      this.db.upsertMarketTrend(matchedTrend);
    } else {
      // First signal -> Create as EMERGING trend candidate
      const newTrend: MarketTrend = {
        id: `trend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Trend: ${item.topic}`,
        description: item.summary,
        topic: item.topic,
        market: item.market,
        status: 'EMERGING',
        signalsCount: 1,
        signalItemIds: [item.id],
        firstObserved: item.publishedAt || nowIso,
        lastObserved: item.publishedAt || nowIso,
        confidence: Math.max(0.6, item.confidence * 0.8),
        velocity: 'STEADY',
        businessRelevance: item.relevance === 'HIGH' || item.relevance === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        hypothesis: item.hypothesis || `Hypothese: Steigende Relevanz von ${item.topic} im Marktsegment ${item.market}.`,
        evidence: [`Initiale Beobachtung (${item.source}): ${item.title}`],
        isDemo: item.isDemo,
      };
      this.db.upsertMarketTrend(newTrend);
    }
  }

  /**
   * Auto-logs competitor changes into structured competitor profile table.
   */
  private autoLogCompetitorMovement(item: MarketIntelligenceItem): void {
    const competitorName = item.entity || item.source || 'Wettbewerber';
    let changeType: any = 'OTHER';

    if (item.type === 'PRICING_CHANGE') changeType = 'PRICING_CHANGE';
    else if (item.type === 'PRODUCT_LAUNCH') changeType = 'PRODUCT_LAUNCH';
    else if (item.type === 'COMPETITOR_CHANGE') changeType = 'FEATURE_UPDATE';

    const movement: CompetitorMovement = {
      id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      competitorName,
      changeType,
      whatChanged: item.title,
      whenOccurred: item.publishedAt || item.retrievedAt,
      source: item.source,
      sourceUrl: item.sourceUrl,
      whyItMayMatter: item.businessImpact || item.whyRelevant || 'Potenzielle Auswirkung auf eigene Marktposition.',
      evidence: [item.observation],
      relatedBusinessArea: item.topic,
      impactLevel: item.relevance === 'CRITICAL' || item.relevance === 'HIGH' ? 'HIGH' : 'MEDIUM',
      sourceItemId: item.id,
      createdAt: new Date().toISOString(),
      isDemo: item.isDemo,
    };

    this.db.upsertCompetitorMovement(movement);
  }

  /**
   * Auto-logs customer problem intelligence.
   */
  private autoLogCustomerProblem(item: MarketIntelligenceItem): void {
    const problemText = item.observation || item.title;
    const audience = item.audience || 'Trader & Creator';

    const problem: CustomerProblem = {
      id: `prob_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      problem: problemText,
      audience,
      context: item.topic,
      frequency: item.corroborationCount >= 3 ? 'FREQUENT' : 'OCCASIONAL',
      evidence: [item.observation],
      existingSolutions: [],
      painIndicators: [item.summary],
      potentialOpportunity: item.hypothesis || 'Automatisierte Lösung oder vereinfachtes Tooling anbieten.',
      confidence: item.confidence,
      sourceItemIds: [item.id],
      relatedGoalId: item.relatedGoals?.[0],
      relatedProjectId: item.relatedProjects?.[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: item.isDemo,
    };

    this.db.upsertCustomerProblem(problem);
  }

  /**
   * Promotes a verified market intelligence finding to Business Memory.
   * Safeguard: Hypotheses cannot be saved as FACT without primary evidence.
   */
  public promoteToMemory(
    itemId: string,
    targetType: 'OBSERVATION' | 'HYPOTHESIS' | 'RESULT' | 'LESSON' | 'FACT',
    notes?: string
  ): BusinessMemory {
    const item = this.db.getMarketIntelligenceItemById(itemId);
    if (!item) {
      throw new Error(`Market Intelligence Item mit ID ${itemId} nicht gefunden.`);
    }

    // Epistemic safeguard
    if (item.epistemicLevel === 'HYPOTHESIS' && targetType === 'FACT') {
      throw new Error(
        'Epistemischer Schutz: Eine Hypothese darf nicht ohne primäre Evidenz als FACT in das Business Memory übernommen werden.'
      );
    }

    const memoryId = `mem_mkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const existingTags = Array.isArray(item.tags) ? item.tags : [];
    const memoryTags = Array.from(new Set([...existingTags, 'market_intelligence']));

    const memory: BusinessMemory = {
      id: memoryId,
      title: item.title,
      type: targetType,
      status: 'ACTIVE',
      content: notes ? `${item.title}: ${item.summary}\n\nNotizen: ${notes}` : `${item.title}: ${item.summary}`,
      source: `Market Intelligence (${item.source})`,
      origin: 'EXTERNAL_SOURCE',
      confidence: item.confidence,
      timestamp: nowIso,
      evidence: item.rawData ? [item.rawData] : [item.observation],
      relatedEntities: item.relatedGoals && item.relatedGoals.length > 0
        ? [{ type: 'GOAL', id: item.relatedGoals[0] }]
        : item.relatedProjects && item.relatedProjects.length > 0
        ? [{ type: 'PROJECT', id: item.relatedProjects[0] }]
        : [],
      isFactValidated: targetType === 'FACT',
      isDemo: item.isDemo,
      tags: memoryTags,
    };

    const saved = this.db.insertMemory(memory);

    // Link back to item
    if (!item.relatedMemory) item.relatedMemory = [];
    item.relatedMemory.push(memoryId);
    this.db.upsertMarketIntelligenceItem(item);

    this.audit.log({
      actor: 'USER',
      action: 'PROMOTE_MARKET_INTELLIGENCE_TO_MEMORY',
      entity: 'BusinessMemory',
      entityId: memoryId,
      reason: `Erkenntnis aus Markt-Signal '${item.title}' als ${targetType} im Langzeitgedächtnis verankert`,
      source: item.source,
    });

    return saved?.memory || (saved as any);
  }

  /**
   * Full Research Workflow:
   * REQUEST -> SCOPE -> SOURCE SELECTION -> DATA COLLECTION -> VALIDATION -> ANALYSIS -> STATE IMPACT
   */
  public async runResearch(
    queryOrOptions: string | { query: string; scope?: any },
    scope?: ResearchScope
  ): Promise<ResearchResult> {
    const rawQuery = typeof queryOrOptions === 'string' ? queryOrOptions : queryOrOptions?.query || '';
    const rawScope = typeof queryOrOptions === 'object' && 'scope' in queryOrOptions ? queryOrOptions.scope : scope;
    const sessionId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const activeScope: ResearchScope = {
      query: (rawQuery || '').trim(),
      targetMarkets: (typeof rawScope === 'object' && rawScope?.targetMarkets) || ['Trading', 'SaaS', 'Creator'],
      targetTopics: (typeof rawScope === 'object' && rawScope?.targetTopics) || [],
      targetSources: (typeof rawScope === 'object' && rawScope?.targetSources) || ['PUBLIC_WEB', 'NEWS', 'COMMUNITY', 'MARKET_PRODUCT'],
      timeHorizonDays: (typeof rawScope === 'object' && rawScope?.timeHorizonDays) || 30,
    };

    // 1. Source Availability Check
    const allDbSources = this.sources.getSources();
    const sourcesConsulted: Array<{
      sourceId: string;
      name: string;
      status: MarketSourceAvailability;
      countFound: number;
    }> = [];

    for (const src of allDbSources) {
      const isAvailable = src.status === 'CONNECTED' || src.status === 'AVAILABLE' || src.status === 'DEMO';
      const status: MarketSourceAvailability = isAvailable
        ? 'ACTIVE'
        : src.status === 'NOT_CONFIGURED'
          ? 'UNAVAILABLE'
          : 'LIMITED';

      sourcesConsulted.push({
        sourceId: src.id,
        name: src.name,
        status,
        countFound: 0,
      });
    }

    // 2. Fetch relevant existing items from DB
    const allItems = this.db.getAllMarketIntelligenceItems();
    const queryTokens = activeScope.query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    const matchedItems = allItems.filter((item) => {
      const fullText = `${item.title} ${item.summary} ${item.observation} ${item.topic} ${item.entity || ''}`.toLowerCase();
      if (queryTokens.length === 0) return true;
      return queryTokens.some((token) => fullText.includes(token));
    });

    // Count findings per source
    for (const item of matchedItems) {
      const s = sourcesConsulted.find((src) => src.name.toLowerCase().includes(item.source.toLowerCase()) || src.sourceId === item.source);
      if (s) {
        s.countFound++;
      }
    }

    // 3. Epistemic Breakdown
    const factsCount = matchedItems.filter((i) => i.epistemicLevel === 'FACT').length;
    const observationsCount = matchedItems.filter((i) => i.epistemicLevel === 'OBSERVATION').length;
    const hypothesesCount = matchedItems.filter((i) => i.epistemicLevel === 'HYPOTHESIS').length;
    const unknownCount = sourcesConsulted.filter((s) => s.status === 'UNAVAILABLE').length;

    // 4. Run AI Analysis via model router (with fallback to deterministic synthesis)
    let aiSynthesis = '';
    try {
      const prompt = `Du bist der 348 Market Intelligence Brain Synthesizer.
Recherchierte Frage: "${activeScope.query}"
Gefundene Belege (${matchedItems.length}):
${matchedItems
  .slice(0, 8)
  .map((i, idx) => `[${idx + 1}] (${i.epistemicLevel}, Quelle: ${i.source}): ${i.title} - ${i.observation}`)
  .join('\n')}

Nicht verfügbare Quellen: ${sourcesConsulted
        .filter((s) => s.status === 'UNAVAILABLE')
        .map((s) => s.name)
        .join(', ') || 'Keine'}

Erstelle eine sachliche, epistemisch präzise Zusammenfassung:
1. Verifizierte Fakten & Beobachtungen
2. Offene Hypothesen & Unsicherheiten
3. Konkrete Business-Relevanz für ein Trading- & Creator-Software-Unternehmen`;

      const aiResponse = await this.ai.generateText(prompt);
      aiSynthesis = aiResponse;
    } catch {
      aiSynthesis = `Synthese für "${activeScope.query}": ${matchedItems.length} Signale ausgewertet. ${factsCount} Fakten, ${observationsCount} Beobachtungen, ${hypothesesCount} Hypothesen.`;
    }

    // 5. Match trends & opportunities
    const trendsIdentified = this.db.getAllMarketTrends().filter((t) =>
      queryTokens.some((q) => `${t.name} ${t.topic}`.toLowerCase().includes(q))
    );

    const opportunitiesIdentified = this.db.getAllMarketOpportunities().filter((o) =>
      queryTokens.some((q) => `${o.title} ${o.reason}`.toLowerCase().includes(q))
    );

    const risksIdentified = this.db.getAllMarketRisks().filter((r) =>
      queryTokens.some((q) => `${r.title} ${r.marketChange}`.toLowerCase().includes(q))
    );

    // 6. Business State Impacts
    const goals = this.db.getAllGoals();
    const businessStateImpacts: ResearchResult['businessStateImpacts'] = [];

    for (const g of goals.slice(0, 2)) {
      if (matchedItems.some((i) => i.relatedGoals?.includes(g.id))) {
        businessStateImpacts.push({
          targetType: 'GOAL',
          targetId: g.id,
          targetTitle: g.title,
          previousAssessment: `Status: ${g.status}`,
          newAssessment: 'Externe Marktvalidierung gestärkt',
          reason: `Neueste Marktbelege bestätigen die Zielrichtung von '${g.title}'`,
        });
      }
    }

    const result: ResearchResult = {
      sessionId,
      query: activeScope.query,
      scope: activeScope,
      sourcesConsulted,
      itemsFound: matchedItems,
      signalsCount: matchedItems.length,
      trendsIdentified,
      opportunitiesIdentified,
      risksIdentified,
      synthesizedAnalysis: aiSynthesis,
      epistemicSummary: {
        factsCount,
        observationsCount,
        hypothesesCount,
        unknownCount,
      },
      businessStateImpacts,
      executedAt: nowIso,
    };

    // Save session in DB
    this.db.saveResearchSession(result);

    return result;
  }

  /**
   * Universal Inbox raw input ingestion adapter.
   */
  public async ingestRawInput(input: {
    text: string;
    sourceUrl?: string;
    sourceName?: string;
    sourceType?: MarketSourceType;
  }): Promise<MarketIntelligenceItem> {
    const raw = (input.text || '').trim();
    if (!raw) {
      throw new Error('Eingabetext für Universal Inbox darf nicht leer sein.');
    }

    // Try light classification via AI if available, else regex / heuristic
    let title = raw.split('\n')[0].substring(0, 100);
    let topic = 'Allgemein';
    let market = 'Trading & Creator';
    let type: MarketIntelligenceType = 'OTHER';

    if (raw.toLowerCase().includes('preis') || raw.toLowerCase().includes('kosten') || raw.toLowerCase().includes('tier')) {
      type = 'PRICING_CHANGE';
      topic = 'Pricing & Monetarisierung';
    } else if (raw.toLowerCase().includes('problem') || raw.toLowerCase().includes('bug') || raw.toLowerCase().includes('fehlt')) {
      type = 'CUSTOMER_PROBLEM';
      topic = 'Kundenbedürfnis';
    } else if (raw.toLowerCase().includes('trend') || raw.toLowerCase().includes('wachstum') || raw.toLowerCase().includes('hype')) {
      type = 'MARKET_TREND';
      topic = 'Markttrend';
    } else if (raw.toLowerCase().includes('ki') || raw.toLowerCase().includes('ai') || raw.toLowerCase().includes('model')) {
      type = 'AI_DEVELOPMENT';
      topic = 'KI & Automatisierung';
    }

    const item = this.ingestItem({
      title,
      summary: raw,
      observation: raw,
      rawData: raw,
      source: input.sourceName || 'Universal Inbox',
      sourceUrl: input.sourceUrl,
      sourceType: input.sourceType || 'MANUAL',
      topic,
      market,
      type,
      epistemicLevel: 'OBSERVATION',
    });

    return item;
  }

  /**
   * Generates a full Market Intelligence snapshot for Business State and UI.
   */
  public getSnapshot(): MarketIntelligenceSnapshot {
    const items = this.db.getAllMarketIntelligenceItems();
    const stories = this.db.getAllMarketStories();
    const trends = this.db.getAllMarketTrends();
    const competitors = this.db.getAllCompetitorMovements();
    const customerProblems = this.db.getAllCustomerProblems();
    const opportunities = this.db.getAllMarketOpportunities();
    const risks = this.db.getAllMarketRisks();

    // Freshness Overview
    const freshnessOverview: Record<MarketFreshness, number> = {
      FRESH: 0,
      RECENT: 0,
      AGING: 0,
      STALE: 0,
      UNKNOWN: 0,
    };
    for (const it of items) {
      const f = this.calculateFreshness(it.type, it.publishedAt);
      freshnessOverview[f] = (freshnessOverview[f] || 0) + 1;
    }

    // Epistemic distribution
    const epistemicDistribution: Record<MarketEpistemicLevel, number> = {
      RAW_DATA: 0,
      FACT: 0,
      OBSERVATION: 0,
      ANALYSIS: 0,
      INTERPRETATION: 0,
      HYPOTHESIS: 0,
      UNKNOWN: 0,
    };
    for (const it of items) {
      const e = it.epistemicLevel || 'OBSERVATION';
      epistemicDistribution[e] = (epistemicDistribution[e] || 0) + 1;
    }

    // Recent changes (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentChanges = items
      .filter((i) => i.createdAt >= sevenDaysAgo || (i.publishedAt && i.publishedAt >= sevenDaysAgo))
      .slice(0, 10)
      .map((i) => `[${i.type}] ${i.title} (${i.source})`);

    // Sources status
    const allDbSources = this.sources.getSources();
    const sourcesStatus = allDbSources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      status: (s.status === 'CONNECTED' ? 'ACTIVE' : s.status === 'AVAILABLE' ? 'ACTIVE' : s.status === 'NOT_CONFIGURED' ? 'UNAVAILABLE' : 'LIMITED') as MarketSourceAvailability,
      reliability: s.reliability,
    }));

    const connectedSources = sourcesStatus.filter((s) => s.status === 'ACTIVE').length;
    const dataSufficiency: DataSufficiency = {
      level: items.length >= 5 ? 'HIGH_CONFIDENCE' : items.length > 0 ? 'SUFFICIENT' : 'LIMITED',
      confidence: items.length >= 5 ? 0.85 : 0.6,
      evidenceCount: items.length,
      sourceQualityScore: connectedSources >= 3 ? 0.85 : 0.6,
      dataFreshnessScore: freshnessOverview.FRESH / Math.max(1, items.length),
      dataConsistencyScore: 0.9,
      dataWindowDays: 30,
      evidenceStrength: (epistemicDistribution.FACT + epistemicDistribution.OBSERVATION) / Math.max(1, items.length),
      statement: `${items.length} Marktsignale erfasst across ${trends.length} Trends.`,
    };

    return {
      items,
      stories,
      trends,
      competitors,
      customerProblems,
      opportunities,
      risks,
      recentChanges,
      freshnessOverview,
      epistemicDistribution,
      sourcesStatus,
      dataSufficiency,
    };
  }

  /**
   * Seeds realistic demo data if no market intelligence items exist.
   */
  public seedInitialMarketDataIfEmpty(): void {
    const existing = this.db.getAllMarketIntelligenceItems();
    if (existing.length > 0) return;

    const now = new Date();
    const nowIso = now.toISOString();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();

    const sampleItems: Partial<MarketIntelligenceItem>[] = [
      {
        id: 'mkt_demo_1',
        type: 'PRICING_CHANGE',
        title: 'TradingView erhöht Preise für Premium-Abonnements um 25%',
        summary: 'TradingView hat seine monatlichen Pläne für Essential und Plus um 20-25% angehoben und neue API-Limits für Exporte eingeführt.',
        observation: 'Offizielle Preisseite von TradingView weist ab 1. März 2026 höhere Gebühren aus; Nutzer auf Twitter/X protestieren lautstark.',
        source: 'Web / Pricing Page',
        sourceUrl: 'https://tradingview.com/pricing',
        sourceType: 'MARKET_PRODUCT',
        topic: 'Broker & Software Pricing',
        market: 'Trading Software',
        entity: 'TradingView',
        confidence: 0.95,
        epistemicLevel: 'FACT',
        relevance: 'IMPORTANT',
        businessImpact: 'Erhöhte Wechselbereitschaft preissensibler Trader zu alternativen, lokalen Desktop- oder Web-Tools.',
        publishedAt: twoDaysAgo,
        isDemo: true,
      },
      {
        id: 'mkt_demo_2',
        type: 'CUSTOMER_PROBLEM',
        title: 'Trader klagen über psychologische Disziplin und Revenge-Trading',
        summary: 'In Reddit r/Daytrading und Trader-Foren häufen sich Berichte über mangelnde Ausführungsdisziplin bei hoher Marktvolatilität.',
        observation: 'Über 40 Kommentare in einem Reddit-Thread diskutieren, wie unkontrolliertes Re-Entering zu Drawdowns führt; existierende Journals erfassen den emotionalen Zustand nur mangelhaft.',
        source: 'Reddit r/Daytrading',
        sourceUrl: 'https://reddit.com/r/Daytrading',
        sourceType: 'COMMUNITY',
        topic: 'Trading Psychologie & Journaling',
        market: 'Retail Trading',
        confidence: 0.88,
        epistemicLevel: 'OBSERVATION',
        relevance: 'HIGH',
        businessImpact: 'Direkte Chance für unser Trading OS: Integrierter Tilt-Guard & automatische Auszeit-Sperren nach 3 Verlust-Trades.',
        publishedAt: fiveDaysAgo,
        isDemo: true,
      },
      {
        id: 'mkt_demo_3',
        type: 'MARKET_TREND',
        title: 'Verschiebung im Creator-Ökosystem hin zu datengetriebenen Bildungs-Deep-Dives',
        summary: 'YouTube-Analytics und Branchenberichte zeigen: Oberflächliche Lifestyle-Finanzvideos verlieren Watchtime, während methodische, transparente Fallstudien stark wachsen.',
        observation: 'Top 5 FinTech-Creators im DACH-Raum verzeichnen 30% höhere Retention bei Deep-Dive-Videos mit konkreten Daten und echten Backtesting-Zahlen.',
        source: 'Creator Intelligence & YouTube Feed',
        sourceType: 'VIDEO_CREATOR',
        topic: 'Content Trends',
        market: 'Creator Economy',
        confidence: 0.82,
        epistemicLevel: 'OBSERVATION',
        relevance: 'HIGH',
        businessImpact: 'Bestätigt unsere Strategie für faktenbasierten Content und automatisierte Dashboards statt generischer Markt-News.',
        publishedAt: tenDaysAgo,
        isDemo: true,
      },
      {
        id: 'mkt_demo_4',
        type: 'REGULATION',
        title: 'ESMA prüft verschärfte Transparenzvorschriften für KI-gestützte Handelssignale',
        summary: 'Die europäische Wertpapieraufsicht hat ein Konsultationspapier zu Transparenzpflichten bei algorithmischen Retail-Signaldiensten veröffentlicht.',
        observation: 'Konsultationspapier ESMA-2026-08 fordert klare Offenlegung von Backtesting-Methoden und Risikomodellen.',
        source: 'Finanznachrichten / Regulierungsbehörde',
        sourceType: 'NEWS',
        topic: 'Finanzmarkt-Regulierung',
        market: 'Financial Services EU',
        confidence: 0.92,
        epistemicLevel: 'FACT',
        relevance: 'IMPORTANT',
        businessImpact: 'Unser 348 Business Brain erfüllt bereits höchste Epistemic-Standards; Wettbewerber mit intransparenten Blackbox-Signalen geraten unter Druck.',
        publishedAt: twentyDaysAgo,
        isDemo: true,
      },
      {
        id: 'mkt_demo_5',
        type: 'AI_DEVELOPMENT',
        title: 'Lokale Inferenz-Modelle erreichen Echtzeit-Performance für Orderbuch-Analysen',
        summary: 'Neue leichtgewichtige Open-Source-Modelle können Orderströme und Anomalien auf lokaler Hardware in unter 50ms klassifizieren.',
        observation: 'GitHub-Benchmarks zeigen Durchsatz von 200 msgs/sec auf Standard-Hardware ohne Cloud-Latenz.',
        source: 'Public Web / Tech Docs',
        sourceType: 'PUBLIC_WEB',
        topic: 'KI & Trading Technologie',
        market: 'AI & FinTech',
        confidence: 0.85,
        epistemicLevel: 'ANALYSIS',
        relevance: 'HIGH',
        businessImpact: 'Ermöglicht Offline-First Analyse im Trading OS ohne teure Cloud-Infrastruktur.',
        publishedAt: fiveDaysAgo,
        isDemo: true,
      },
    ];

    for (const item of sampleItems) {
      this.ingestItem(item);
    }

    // Seed realistic opportunities
    this.db.upsertMarketOpportunity({
      id: 'opp_demo_1',
      title: 'Automatisierter Tilt-Guard & Trading-Disziplin-Assistent',
      evidence: ['Reddit r/Daytrading Umfrage', 'Feedback aus eigener Community'],
      reason: 'Bestehende Trading-Journals sind rein deskriptiv; Trader benötigen Echtzeit-Schutz vor Revenge-Trading.',
      potentialUpside: '+300 Abonnenten für Trading OS Premium',
      requiredEffort: 'MEDIUM',
      uncertainty: 'LOW',
      strategicFit: 'HIGH',
      nextValidationStep: 'Prototyp mit 10 Alpha-Tradern testen',
      hypothesis: 'Eine automatische 30-Minuten-Cool-down-Warnung nach 2 aufeinanderfolgenden Verlusttrades reduziert Drawdowns um mindestens 40%.',
      sourceItemIds: ['mkt_demo_2'],
      status: 'CANDIDATE',
      createdAt: nowIso,
      isDemo: true,
    });

    // Seed realistic risks
    this.db.upsertMarketRisk({
      id: 'risk_demo_1',
      title: 'Verschärfte API-Exportbeschränkungen durch Datenprovider',
      marketChange: 'Große Charting-Plattformen schränken externe Datenexporte ein',
      businessExposure: 'Exportierte CSVs könnten zeitverzögert oder kostenpflichtig werden',
      evidence: ['TradingView Preis- & Richtlinien-Update März 2026'],
      severity: 'HIGH',
      likelihood: 'MEDIUM',
      mitigationHypothesis: 'Direkte Broker-API-Anbindungen (Interactive Brokers, MetaTrader) priorisieren statt externer Charting-Scraper.',
      sourceItemIds: ['mkt_demo_1'],
      status: 'ACTIVE',
      createdAt: nowIso,
      isDemo: true,
    });
  }
}

export const marketIntelligenceService = new MarketIntelligenceService();
