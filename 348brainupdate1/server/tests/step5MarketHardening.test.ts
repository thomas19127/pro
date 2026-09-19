import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../db/sqlite';
import { MarketIntelligenceService } from '../services/marketIntelligenceService';
import { IntelligenceEngine, OpportunityEngine, RiskEngine } from '../core/engines/allEngines';
import { superbrainEngineRegistry } from '../core/superbrain/engineRegistry';
import type { MarketIntelligenceItem, Goal, Project } from '../../shared/types';

describe('348 Business Brain — Step 5 Market Intelligence Brain Validation & Hardening Pass', () => {
  let db: DatabaseManager;
  let marketService: MarketIntelligenceService;
  let intelligenceEngine: IntelligenceEngine;

  before(() => {
    process.env.AI_PROVIDER_DEFAULT = 'mock';

    // Hermetic isolated database instance in memory
    db = new DatabaseManager(':memory:');
    marketService = new MarketIntelligenceService({ db });
    intelligenceEngine = new IntelligenceEngine({ market: marketService, db });

    // Seed test goals and projects into the isolated db
    db.insertGoal({
      id: 'goal_ai_brain',
      title: '348 Business Brain Platform Launch',
      description: 'Markteinführung des autonomen KI-Betriebssystems für Solo-CEOs',
      level: 'ANNUAL',
      type: 'BUSINESS',
      priority: 'HIGH',
      targetDate: '2026-12-31',
      startDate: '2026-01-01',
      metricName: 'Launch Readiness',
      currentValue: 40,
      targetValue: 100,
      notes: 'Initial strategic goal for platform launch',
      status: 'ON_TRACK',
      progress: 40,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false,
    });

    db.insertProject({
      id: 'proj_intelligence',
      title: 'Market Intelligence Module',
      description: 'Autonomous Market Intelligence Engine for signals and trends',
      goalId: 'goal_ai_brain',
      status: 'ACTIVE',
      priority: 'HIGH',
      owner: 'CEO',
      startDate: new Date().toISOString(),
      dueDate: '2026-12-31',
      progress: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false,
    });
  });

  // ==========================================
  // TEST 1: Ingestion, Normalisierung & Defaults
  // ==========================================
  test('TEST 1: Ingestion, Normalisierung & Defaults', () => {
    const item = marketService.ingestItem({
      title: 'OpenAI launcht neues Agent-Framework für KMUs',
      summary: 'Ein neues Framework erlaubt die Orchestrierung autonomer Workflows mit API-Anbindung.',
      type: 'AI_DEVELOPMENT',
      source: 'TechCrunch',
      sourceUrl: 'https://techcrunch.com/openai-agents',
      tags: ['ai', 'agent', 'automation'],
      topic: 'AI_INTELLIGENCE',
      epistemicLevel: 'FACT',
      confidence: 0.95,
    });

    assert.ok(item.id, 'Item must have an ID');
    assert.strictEqual(item.title, 'OpenAI launcht neues Agent-Framework für KMUs');
    assert.strictEqual(item.freshness, 'FRESH', 'New item must be FRESH');
    assert.strictEqual(item.epistemicLevel, 'FACT');
    assert.strictEqual(item.source, 'TechCrunch');
    assert.ok(item.relevance, 'Item must have relevance category');

    // Retrieve from DB
    const fetched = db.getMarketIntelligenceItemById(item.id);
    assert.ok(fetched, 'Item must be persisted in SQLite');
    assert.strictEqual(fetched?.id, item.id);
  });

  // ==========================================
  // TEST 2: Epistemische Trennung & Strict Memory Promotion Guardrails
  // ==========================================
  test('TEST 2: Epistemische Trennung & Memory Promotion Guardrails', () => {
    // Ingest a hypothesis item
    const hypothesisItem = marketService.ingestItem({
      title: 'Hypothese: Nutzer wollen keine Chat-UIs mehr, sondern proaktive Dashboards',
      summary: 'Reine Beobachtung aus drei Foren-Diskussionen auf Reddit.',
      type: 'CUSTOMER_DEMAND',
      source: 'Reddit r/SaaS',
      epistemicLevel: 'HYPOTHESIS',
      confidence: 0.5,
      topic: 'CUSTOMER_NEEDS',
    });

    assert.strictEqual(hypothesisItem.epistemicLevel, 'HYPOTHESIS');

    // Attempting to promote a HYPOTHESIS directly as a FACT must throw an epistemic error!
    assert.throws(
      () => {
        marketService.promoteToMemory(hypothesisItem.id, 'FACT', 'Unzulässige Hochstufung zum Fakt');
      },
      /Epistemischer Schutz: Eine Hypothese darf nicht ohne primäre Evidenz als FACT/,
      'Epistemic safeguard must prevent promoting unverified hypothesis to FACT'
    );

    // Promoting as HYPOTHESIS or OBSERVATION must succeed
    const memory = marketService.promoteToMemory(
      hypothesisItem.id,
      'HYPOTHESIS',
      'Wichtige Annahme für zukünftige UX-Tests'
    );

    assert.ok(memory.id, 'Memory item must be created');
    assert.strictEqual(memory.type, 'HYPOTHESIS');
    assert.ok((memory as any).tags?.includes('market_intelligence'), 'Memory must be tagged with market_intelligence');
  });

  // ==========================================
  // TEST 3: Freshness & Verfallskurven
  // ==========================================
  test('TEST 3: Freshness-Berechnung nach Kategorie', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString();

    // Fast-decaying volatile types (PRICING_CHANGE):
    const freshFast = marketService.calculateFreshness('PRICING_CHANGE', new Date().toISOString());
    assert.strictEqual(freshFast, 'FRESH');

    const recentFast = marketService.calculateFreshness('PRICING_CHANGE', tenDaysAgo);
    assert.strictEqual(recentFast, 'RECENT');

    const staleFast = marketService.calculateFreshness('PRICING_CHANGE', sixtyDaysAgo);
    assert.strictEqual(staleFast, 'STALE');

    // Slower-decaying technology types (TECHNOLOGY): 10 days ago is still FRESH (<= 14d)
    const freshTech = marketService.calculateFreshness('TECHNOLOGY', tenDaysAgo);
    assert.strictEqual(freshTech, 'FRESH', 'Technology signals have a wider freshness window');
  });

  // ==========================================
  // TEST 4: Relevanz-Berechnung & Goal-Matching
  // ==========================================
  test('TEST 4: Relevanz-Berechnung & Goal-Matching', () => {
    // Highly relevant item matching "348 Business Brain" goal
    const relScore = marketService.calculateRelevance({
      title: 'Autonomes Business Brain und KI-Betriebssystem gewinnt Innovationspreis',
      summary: 'Solo-CEOs nutzen zunehmend ganzheitliche Business Brains zur Unternehmenssteuerung.',
      topic: 'AI_INTELLIGENCE',
      market: 'Solo-CEO OS',
    });

    assert.ok(
      relScore.relevance === 'HIGH' || relScore.relevance === 'CRITICAL',
      `Expected HIGH or CRITICAL relevance, got ${relScore.relevance}`
    );
    assert.ok(relScore.whyRelevant.includes('348 Business Brain Platform Launch'));

    // Background noise item
    const noiseScore = marketService.calculateRelevance({
      title: 'Gartenbau-Trends 2026: Die besten Rasenmäher im Vergleich',
      summary: 'Ein ausführlicher Test von Rasenmähern für Schrebergärtner.',
      topic: 'Gartenbau',
      market: 'Baumarkt',
    });

    assert.strictEqual(noiseScore.relevance, 'BACKGROUND');
  });

  // ==========================================
  // TEST 5: Story-Clustering & Multi-Quellen-Bestätigung
  // ==========================================
  test('TEST 5: Story-Clustering bei übereinstimmenden Ereignissen', () => {
    const item1 = marketService.ingestItem({
      title: 'Notion erhöht Preise für Team-Pläne um 25 Prozent',
      summary: 'Notion führt neue Preisstrukturen ein. Bestehende Workspaces zahlen ab sofort 25% mehr.',
      type: 'PRICING_CHANGE',
      source: 'TechCrunch',
      topic: 'MARKET_PRICING',
      entity: 'Notion',
    });

    const item2 = marketService.ingestItem({
      title: 'Kundenaufschrei nach Notion Preiserhöhung auf X und Reddit',
      summary: 'Zahlreiche Agenturinhaber beklagen die 25 Prozent Preiserhöhung bei Notion und suchen Alternativen.',
      type: 'PRICING_CHANGE',
      source: 'X / Twitter',
      topic: 'MARKET_PRICING',
      entity: 'Notion',
    });

    const stories = db.getAllMarketStories();
    assert.ok(stories.length > 0, 'A corroborated story must be generated from multiple matching signals');

    const notionStory = stories.find((s) => s.title.toLowerCase().includes('notion'));
    assert.ok(notionStory, 'Must find Notion-related story');
    assert.ok(notionStory!.sourcesCount >= 2, 'Sources count must reflect multiple independent sources');
  });

  // ==========================================
  // TEST 6: Automatische Signallogik für Wettbewerber & Kundenprobleme
  // ==========================================
  test('TEST 6: Auto-Logging von Wettbewerberbewegungen & Kundenproblemen', () => {
    // 1. Competitor update
    marketService.ingestItem({
      title: 'Motion launcht KI-Team-Kalender Feature',
      summary: 'Motion hat ein neues Feature ausgerollt, das Teamkalender vollautomatisch synchronisiert.',
      type: 'COMPETITOR_CHANGE',
      source: 'Motion Release Notes',
      sourceUrl: 'https://usemotion.com/changelog',
      entity: 'Motion',
    });

    const competitors = db.getAllCompetitorMovements();
    assert.ok(competitors.length > 0, 'Competitor movement must be logged');
    const motionMove = competitors.find((c) => c.competitorName.toLowerCase().includes('motion'));
    assert.ok(motionMove, 'Motion movement must be registered');

    // 2. Customer feedback with quote
    marketService.ingestItem({
      title: 'Frustration über unübersichtliche Zeiterfassung in bestehenden Apps',
      summary: '„Ich verbringe jede Woche 3 Stunden damit, manuell Kalender und Aufgaben abzugleichen. Es ist ein Albtraum!“',
      observation: '„Ich verbringe jede Woche 3 Stunden damit, manuell Kalender und Aufgaben abzugleichen. Es ist ein Albtraum!“',
      type: 'CUSTOMER_PROBLEM',
      source: 'User Interview #4',
      topic: 'CUSTOMER_NEEDS',
    });

    const problems = db.getAllCustomerProblems();
    assert.ok(problems.length > 0, 'Customer problem must be logged');
    const pain = problems.find((p) => p.evidence && p.evidence.some((e) => e.includes('Albtraum')));
    assert.ok(pain, 'Customer problem with quote evidence must be recorded');
  });

  // ==========================================
  // TEST 7: Research Workflow & AIService Abstraction
  // ==========================================
  test('TEST 7: Research Workflow & Synthese', async () => {
    const researchResult = await marketService.runResearch({
      query: 'Welche KI-Tools nutzen Solo-CEOs für ihre Wochenplanung?',
      scope: 'DEEP',
    });

    assert.ok(researchResult.sessionId, 'Research session must return a sessionId');
    assert.strictEqual(researchResult.query, 'Welche KI-Tools nutzen Solo-CEOs für ihre Wochenplanung?');
    assert.ok(researchResult.synthesizedAnalysis.length > 10, 'Synthesized analysis must be present');
    assert.ok(researchResult.sourcesConsulted.length > 0, 'Must record sources checked');
    assert.ok(researchResult.epistemicSummary !== undefined, 'Must provide epistemic summary');

    // Verify session persistence in SQLite
    const sessions = db.getAllResearchSessions();
    assert.ok(sessions.length > 0, 'Research session must be stored in database');
  });

  // ==========================================
  // TEST 8: Universal Inbox & Snapshot & Business Digital Twin
  // ==========================================
  test('TEST 8: Universal Inbox, Snapshot & Digital Twin Integration', async () => {
    // 1. Universal Inbox
    const inboxItem = await marketService.ingestRawInput({
      text: 'Spannender Thread über Re-Platforming bei B2B SaaS: Immer mehr Teams wechseln weg von monolithischen Tools.',
      sourceName: 'HackerNews',
      sourceType: 'COMMUNITY',
    });

    assert.ok(inboxItem.id);
    assert.strictEqual(inboxItem.source, 'HackerNews');

    // 2. Snapshot metrics
    const snapshot = marketService.getSnapshot();
    assert.ok(snapshot.items.length >= 5, 'Snapshot must report at least 5 signals');
    assert.ok(snapshot.epistemicDistribution.FACT >= 1);
    assert.ok(snapshot.freshnessOverview.FRESH >= 1);

    // 3. Engine Registry Status
    const registeredEngines = superbrainEngineRegistry.getAllEngines();
    const intelDescriptor = registeredEngines.find((e) => e.engineId === 'intelligence');
    assert.ok(intelDescriptor, 'Intelligence engine descriptor must be present');
    assert.strictEqual(intelDescriptor!.availability, 'READY', 'Market Intelligence Brain must be READY');

    // 4. Intelligence Engine Methods
    const engineSnapshot = intelligenceEngine.getSnapshot();
    assert.strictEqual(engineSnapshot.items.length, snapshot.items.length);
    const engineTrends = intelligenceEngine.getTrends();
    assert.ok(Array.isArray(engineTrends));

    // 5. Opportunities & Risks Engines
    const oppEngine = new OpportunityEngine({ db });
    const riskEngine = new RiskEngine({ db });

    oppEngine.addOpportunity({
      id: 'opp_test_1',
      title: 'All-in-One Business OS für Solo-CEOs',
      reason: 'Marktlücke durch Zersplitterung der Einzellösungen',
      potentialUpside: '50k MRR',
      requiredEffort: 'MEDIUM',
      uncertainty: 'LOW',
      strategicFit: 'HIGH',
      nextValidationStep: 'Landing Page mit Warteliste testen',
      hypothesis: 'Solo-CEOs zahlen gerne für konsolidierte Tools',
      evidence: ['Marktsignal aus User Interview'],
      sourceItemIds: [],
      status: 'ACCEPTED',
      createdAt: new Date().toISOString(),
    });

    riskEngine.addRisk({
      id: 'risk_test_1',
      title: 'Aggressive KI-Features von Bestandstools',
      marketChange: 'Große Player integrieren Basis-KI-Agenten',
      businessExposure: 'Preisdruck auf Standardfunktionen',
      evidence: ['Changelogs von Motion & Notion'],
      severity: 'HIGH',
      likelihood: 'MEDIUM',
      mitigationHypothesis: 'Fokus auf ganzheitliches Digital Twin & Executive Governance',
      sourceItemIds: [],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });

    const allOpps = oppEngine.getOpportunities();
    assert.ok(allOpps.some((o) => o.id === 'opp_test_1'));

    const allRisks = riskEngine.getRisks();
    assert.ok(allRisks.some((r) => r.id === 'risk_test_1'));
  });

  // ==========================================
  // TEST 9: Rauschfilter-Härtung & Edge-Cases
  // ==========================================
  test('TEST 9: Rauschfilter-Härtung & deterministische Hintergrundklassifizierung', () => {
    // 1. Completely unrelated noise topic with generic keywords (trends, vergleich, system)
    const applianceNoise = marketService.calculateRelevance({
      title: 'Kühlschrank-Trends 2026: Intelligente Kühlsysteme im Labor-Vergleich',
      summary: 'Ein ausführlicher Test von Kühlschränken und Gefriertruhen für Haushaltsküchen.',
      topic: 'Haushaltsgeräte',
      market: 'Weiße Ware',
    });
    assert.strictEqual(applianceNoise.relevance, 'BACKGROUND');

    // 2. Unrelated pricing change without business or competitor alignment
    const gardenPricing = marketService.calculateRelevance({
      title: 'Baumarkt erhöht Preise für Pflanzenerde und Gartengeräte',
      summary: 'Gartenmärkte passen Preise saisonbedingt um 15 Prozent an.',
      type: 'PRICING_CHANGE',
      topic: 'Gartenbau',
      market: 'Baumärkte',
      entity: 'GartenCenter Süd',
    });
    assert.strictEqual(gardenPricing.relevance, 'BACKGROUND');

    // 3. Legitimate domain alignment (Trading / Creator) without specific goal match preserves NORMAL
    const legitimateTradingSignal = marketService.calculateRelevance({
      title: 'Broker-Regulierung: Neue Margin-Anforderungen für europäische Trader',
      summary: 'Regulierungsbehörden verschärfen Hebelbeschränkungen im Krypto- und CFD-Trading.',
      type: 'REGULATION',
      topic: 'Trading Regulatory',
      market: 'FinTech',
    });
    assert.strictEqual(legitimateTradingSignal.relevance, 'NORMAL');

    // 4. Legitimate competitor pricing move preserves IMPORTANT
    const competitorMove = marketService.calculateRelevance({
      title: 'Notion führt neue Workspace-Preise ein',
      summary: 'Notion erhöht Preise für Kollaborations-Workspaces um 20%.',
      type: 'PRICING_CHANGE',
      topic: 'SaaS Productivity',
      market: 'Workspace OS',
      entity: 'Notion',
    });
    assert.strictEqual(competitorMove.relevance, 'IMPORTANT');
  });
});
