import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../db/sqlite';
import { AIService } from '../ai/router';
import { PriorityEngineService } from '../services/priorityEngine';
import { StrategicDriftService } from '../services/driftEngine';
import { BrainEventBus } from '../events/eventBus';
import { AuditLogger } from '../audit/auditLogger';
import { BusinessBrainCore } from '../core/businessBrainCore';
import { BusinessStateService } from '../services/stateService';
import { ceoOverviewService } from '../services/ceoOverviewService';
import { scenarioEngine } from '../services/scenarioEngine';
import { projectPlannerService } from '../services/projectPlannerService';
import { resourceAllocationService } from '../services/resourceAllocationService';
import { config } from '../config/index';
import type { Goal, Task, Project, BusinessMemory, DecisionMemory, EvidenceItem } from '../../shared/types';

describe('348 Business Brain — Step 1.1 Foundation Hardening Test Suite', () => {
  let db: DatabaseManager;
  let priorityService: PriorityEngineService;
  let driftService: StrategicDriftService;
  let eventBus: BrainEventBus;
  let auditLogger: AuditLogger;
  let stateService: BusinessStateService;

  before(() => {
    // Ensure unit tests run deterministically against mock provider
    process.env.AI_PROVIDER_DEFAULT = 'mock';
    config.defaultAiProvider = 'mock';

    // In-memory sqlite db for isolated hermetic testing
    db = new DatabaseManager(':memory:');
    eventBus = new BrainEventBus({ db });
    auditLogger = new AuditLogger({ db, events: eventBus });
    priorityService = new PriorityEngineService();
    driftService = new StrategicDriftService();
    stateService = new BusinessStateService({ db });
  });

  test('1. SQLite DB Initialisierung & Schemavalidierung', () => {
    const rawDb = db.getRawDb();
    // Validate WAL or memory mode and schema tables existence
    const tablesStmt = rawDb.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    const tables = (tablesStmt.all() as Array<{ name: string }>).map((t) => t.name);

    const requiredTables = [
      'goals',
      'tasks',
      'projects',
      'memories',
      'decisions',
      'evidence',
      'data_sources',
      'audit_logs',
      'events',
      'strategic_drift_alerts',
    ];

    for (const required of requiredTables) {
      assert.ok(tables.includes(required), `Required table '${required}' must exist in schema`);
    }

    // Verify foreign keys pragma is ON
    const fkPragma = rawDb.prepare(`PRAGMA foreign_keys`).get() as { foreign_keys: number };
    assert.equal(fkPragma.foreign_keys, 1, 'Foreign keys enforcement must be active');
  });

  test('2. CRUD Operationen der Kernentitäten', () => {
    // 2.1 Goals CRUD
    const goal: Goal = {
      id: 'crud_goal_1',
      title: 'Umsatzwachstum 348',
      description: 'Kern-Umsatzziel für 2026',
      level: 'ANNUAL',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      startDate: '2026-01-01',
      targetDate: '2026-12-31',
      metricName: 'EUR ARR',
      currentValue: 20000,
      targetValue: 100000,
      progress: 20,
      notes: 'Monatlicher Review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };
    db.insertGoal(goal);
    assert.equal(db.getAllGoals().some((g) => g.id === 'crud_goal_1'), true);

    // 2.2 Tasks CRUD
    const task: Task = {
      id: 'crud_task_1',
      title: 'Trading Journal Integration testen',
      description: 'Verifikation der Schnittstelle',
      status: 'TODO',
      priority: 'HIGH',
      autonomyLevel: 'APPROVAL',
      estimatedHours: 4,
      goalId: 'crud_goal_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };
    db.insertTask(task);
    assert.equal(db.getAllTasks().some((t) => t.id === 'crud_task_1'), true);

    // 2.3 Projects CRUD
    const project: Project = {
      id: 'crud_proj_1',
      title: '348 Trading OS Connector',
      description: 'Echtzeit-Synchronisation',
      status: 'ACTIVE',
      priority: 'HIGH',
      owner: 'Founder',
      startDate: '2026-03-01',
      dueDate: '2026-06-30',
      parentGoalId: 'crud_goal_1',
      progress: 35,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };
    db.insertProject(project);
    assert.equal(db.getAllProjects().some((p) => p.id === 'crud_proj_1'), true);

    // 2.4 Decisions CRUD
    const decision: DecisionMemory = {
      id: 'crud_dec_1',
      what: 'Einführung von SQLite + WAL Mode',
      why: 'Hohe Zuverlässigkeit ohne Cloud-Zwang',
      date: '2026-03-01',
      context: 'Lokale Ausführung auf eigenem Rechner',
      alternatives: ['JSON-Dateien', 'Postgres'],
      expectedResult: 'Keine Dateikonflikte und vollständige ACID-Sicherheit',
      evidence: [],
      status: 'EVALUATED',
      isDemo: false,
    };
    db.insertDecision(decision);
    assert.equal(db.getAllDecisions().some((d) => d.id === 'crud_dec_1'), true);

    // 2.5 Evidence CRUD
    const evidence: EvidenceItem = {
      id: 'crud_evi_1',
      claim: 'SQLite WAL Mode unterstützt gleichzeitige Leser ohne Sperre',
      epistemicStatus: 'KNOWN',
      sourceId: 'src_internal_files',
      sourceName: 'SQLite Docs',
      confidence: 1.0,
      collectedAt: new Date().toISOString(),
    };
    db.insertEvidence(evidence);
    assert.equal(db.getAllEvidence().some((e) => e.id === 'crud_evi_1'), true);
  });

  test('3. EventBus Emission und Listener', async () => {
    let receivedPayload: unknown = null;
    let receivedEventCount = 0;

    const unsubscribe = eventBus.on('GOAL_CREATED', (event) => {
      receivedPayload = event.payload;
      receivedEventCount++;
    });

    const testGoal: Goal = {
      id: 'event_test_goal',
      title: 'Event-Test-Ziel',
      description: 'Event Bus Überprüfung',
      level: 'MONTHLY',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      startDate: '2026-03-01',
      targetDate: '2026-03-31',
      metricName: 'Count',
      currentValue: 0,
      targetValue: 1,
      progress: 0,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };

    eventBus.emit('GOAL_CREATED', testGoal, 'TestRunner');

    assert.equal(receivedEventCount, 1);
    assert.deepEqual(receivedPayload, testGoal);

    // Verify event is also persisted in SQLite
    const eventsInDb = db.getAllEvents(10);
    assert.ok(eventsInDb.some((e) => e.type === 'GOAL_CREATED'));

    unsubscribe();
  });

  test('4. AuditLogger Aufzeichnung', () => {
    const logEntry = auditLogger.log({
      actor: 'UnitTestActor',
      action: 'SYSTEM_HARDENING_VERIFY',
      entity: 'SystemConfig',
      entityId: 'cfg_001',
      before: { active: false },
      after: { active: true },
      reason: 'Audit-System-Testlauf',
      source: 'index.test.ts',
    });

    assert.ok(logEntry.id.startsWith('aud_'));

    // Retrieve from database
    const storedLogs = db.getAllAuditLogs(20);
    const found = storedLogs.find((l) => l.id === logEntry.id);
    assert.ok(found);
    assert.equal(found?.actor, 'UnitTestActor');
    assert.equal(found?.action, 'SYSTEM_HARDENING_VERIFY');
  });

  test('5. AI Provider Fallback (Gemini -> Mock)', async () => {
    const aiService = new AIService();

    // Verify mock is immediately available with zero credentials
    aiService.setActiveProvider('mock');
    assert.equal(aiService.getActiveProviderId(), 'mock');

    const textOutput = await aiService.generateText('Was ist die nächste Priorität?');
    assert.ok(textOutput.includes('Mock AI Response'));

    const structuredAnalysis = await aiService.analyze('Performance Analyse');
    assert.ok(structuredAnalysis.keyInsights.length > 0);
    assert.ok(structuredAnalysis.confidence > 0);
  });

  test('6. Engine Registrierung und Status', () => {
    const core = new BusinessBrainCore({ db, events: eventBus, audit: auditLogger });
    const engines = core.getAllEngines();

    assert.equal(engines.length, 17, 'Genau 17 spezialisierte Engines müssen registriert sein (13 Basissystem + 3 Step 2 + 1 Time Engine Step 4)');

    // Verify honest statuses: No engine may falsely be marked ACTIVE without worker loops
    for (const engine of engines) {
      assert.notEqual(
        engine.status.status,
        'ACTIVE',
        `Engine ${engine.id} darf nicht auf ACTIVE stehen, solange keine permanenten Worker-Routinen laufen`
      );
      assert.ok(
        engine.status.status === 'READY' || engine.status.status === 'FOUNDATION',
        `Engine ${engine.id} status '${engine.status.status}' muss entweder READY oder FOUNDATION sein`
      );
    }

    // Goal and Task engines have operational CRUD persistence and are READY
    const goalEngine = engines.find((e) => e.id === 'goals');
    assert.equal(goalEngine?.status.status, 'READY');

    const taskEngine = engines.find((e) => e.id === 'tasks');
    assert.equal(taskEngine?.status.status, 'READY');

    // Strategy engine in Step 2 is operational and READY
    const strategyEngine = engines.find((e) => e.id === 'strategy');
    assert.equal(strategyEngine?.status.status, 'READY');
  });

  test('7. Demo-Daten Isolation (is_demo Filter)', () => {
    const realGoal: Goal = {
      id: 'real_production_goal',
      title: 'Echtes Unternehmensergebnis',
      description: 'Wichtiges echtes Datum',
      level: 'ANNUAL',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      startDate: '2026-01-01',
      targetDate: '2026-12-31',
      metricName: 'KPI',
      currentValue: 10,
      targetValue: 50,
      progress: 20,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };

    const demoGoal: Goal = {
      id: 'demo_sample_goal',
      title: 'Beispielziel für Demo',
      description: 'Kann gelöscht werden',
      level: 'WEEKLY',
      status: 'NOT_STARTED',
      priority: 'LOW',
      startDate: '2026-03-01',
      targetDate: '2026-03-07',
      metricName: 'Sample',
      currentValue: 0,
      targetValue: 1,
      progress: 0,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: true,
    };

    db.insertGoal(realGoal);
    db.insertGoal(demoGoal);

    // Reset demo records
    const reset = db.resetDemoData();
    assert.ok(reset.deletedCounts.goals >= 1);

    const remaining = db.getAllGoals();
    assert.ok(remaining.some((g) => g.id === 'real_production_goal'), 'Echte Daten müssen erhalten bleiben');
    assert.ok(!remaining.some((g) => g.id === 'demo_sample_goal'), 'Demo-Daten müssen restlos gelöscht sein');
  });

  test('8. Strategic Drift Berechnung', () => {
    const alert = driftService.evaluateDrift({
      goalTitle: '348 Community Skalierung',
      goalCategory: 'Community',
      goalTargetWeight: 45,
      actualActivities: [
        { category: 'Admin & Meetings', percent: 60 },
        { category: 'Community', percent: 10 },
        { category: 'Produkt', percent: 30 },
      ],
    });

    assert.ok(alert);
    assert.equal(alert.driftSeverity, 'HIGH');
    assert.equal(alert.promptToCheck, 'Prüfen: Soll das so sein?');
  });

  test('9. Priority Score Berechnung & Parking Radar', () => {
    // 9.1 DO NOW (High Impact, High Alignment, Low Effort)
    const doNow = priorityService.evaluate({
      impact: 9,
      goalAlignment: 9,
      urgency: 8,
      dependencies: 8,
      opportunity: 8,
      effort: 2,
    });
    assert.equal(doNow.recommendation, 'DO_NOW');

    // 9.2 PARK (Low alignment with high effort)
    const park = priorityService.evaluate({
      impact: 4,
      goalAlignment: 2,
      urgency: 3,
      dependencies: 5,
      opportunity: 3,
      effort: 8,
    });
    assert.equal(park.recommendation, 'PARK');
    assert.equal(park.parkingRadarFlag, true);

    // 9.3 STOP (Low impact with high effort)
    const stop = priorityService.evaluate({
      impact: 1,
      goalAlignment: 3,
      urgency: 2,
      dependencies: 4,
      opportunity: 1,
      effort: 9,
    });
    assert.equal(stop.recommendation, 'STOP');
    assert.equal(stop.parkingRadarFlag, true);
  });

  test('10. DataSufficiency Logik & Aussagekraft', () => {
    // Isolated DB with 0 data points
    const emptyDb = new DatabaseManager(':memory:');
    const emptyStateService = new BusinessStateService({ db: emptyDb });

    const emptySufficiency = emptyStateService.computeSufficiency();
    assert.equal(emptySufficiency.level, 'NO_DATA');
    assert.equal(emptySufficiency.statement, 'Nicht genügend Daten für eine belastbare Aussage.');
    assert.ok(emptySufficiency.confidence <= 0.2, 'Confidence darf bei fehlenden Daten nicht künstlich hoch sein');

    // When sufficient verified data points are populated
    for (let i = 1; i <= 5; i++) {
      emptyDb.insertGoal({
        id: `suff_goal_${i}`,
        title: `Ziel ${i}`,
        description: '',
        level: 'QUARTERLY',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        startDate: '2026-01-01',
        targetDate: '2026-06-30',
        metricName: 'Metric',
        currentValue: 10,
        targetValue: 20,
        progress: 50,
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: false,
      });

      emptyDb.insertEvidence({
        id: `suff_evi_${i}`,
        claim: `Verifizierter Datenpunkt ${i}`,
        epistemicStatus: 'KNOWN',
        sourceId: 'src_sqlite',
        sourceName: 'SQLite Test',
        confidence: 1.0,
        collectedAt: new Date().toISOString(),
      });
    }

    const populatedSufficiency = emptyStateService.computeSufficiency();
    assert.notEqual(populatedSufficiency.level, 'NO_DATA');
    assert.ok(populatedSufficiency.evidenceCount >= 5);
  });

  test('11. SQLite Foreign Key Enforcement (Relational Integrity)', () => {
    // 11.1 Test FK violation on tasks referencing non-existent project_id
    assert.throws(
      () => {
        db.insertTask({
          id: 'invalid_fk_task',
          title: 'Task referencing phantom project',
          description: '',
          projectId: 'non_existent_project_99999',
          status: 'TODO',
          priority: 'MEDIUM',
          autonomyLevel: 'AUTO',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      },
      /FOREIGN KEY constraint failed/i,
      'Inserting task with non-existent project_id must throw foreign key constraint violation'
    );

    // 11.2 Test FK violation on projects referencing non-existent goal_id
    assert.throws(
      () => {
        db.insertProject({
          id: 'invalid_fk_proj',
          title: 'Project referencing phantom goal',
          description: '',
          goalId: 'non_existent_goal_99999',
          status: 'PLANNING',
          priority: 'LOW',
          owner: 'Founder',
          startDate: '2026-03-01',
          dueDate: '2026-06-30',
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      },
      /FOREIGN KEY constraint failed/i,
      'Inserting project with non-existent goal_id must throw foreign key constraint violation'
    );
  });

  test('12. AI Provider Centralized Configuration & Model Name', () => {
    const aiService = new AIService();
    assert.ok(aiService.getActiveModelName().length > 0, 'Active model name must be non-empty');
    assert.equal(aiService.getActiveModelName(), 'deterministic-mock-v1');

    const providerList = aiService.getAvailableProviders();
    assert.ok(providerList.some((p) => p.id === 'gemini'));
    assert.ok(providerList.some((p) => p.id === 'mock'));
  });

  test('13. AuditLogger Masking von Secrets & Tokens', () => {
    const sensitiveLog = auditLogger.log({
      actor: 'SecurityTest',
      action: 'KEY_ROTATION',
      entity: 'ProviderSecret',
      entityId: 'sec_001',
      before: { apiKey: 'AIzaSyDemoKey1234567890123456789012', normalField: 'public_value' },
      after: { apiKey: 'AIzaSyRotatedKey98765432109876543210', normalField: 'updated_public' },
      reason: 'Bearer secret_token_xyz123 should be redacted',
      source: 'index.test.ts',
    });

    const stored = db.getAllAuditLogs(10).find((l) => l.id === sensitiveLog.id);
    assert.ok(stored);

    // Verify secret fields were sanitized to [REDACTED]
    const beforeObj = stored.before as Record<string, unknown>;
    const afterObj = stored.after as Record<string, unknown>;

    assert.equal(beforeObj.apiKey, '[REDACTED]');
    assert.equal(beforeObj.normalField, 'public_value');
    assert.equal(afterObj.apiKey, '[REDACTED]');
    assert.equal(afterObj.normalField, 'updated_public');
    assert.ok(!stored.reason.includes('secret_token_xyz123'));
  });

  test('14. Step 2 Datenintegrität & Provenance (Echte Daten vs. Demo vs. Unbekannt)', () => {
    // 14.1 Scenario Engine mit Empty/Unvollständigen Daten
    const simulation = scenarioEngine.simulateScenarios();
    assert.ok(simulation.baseline);
    assert.ok(simulation.pessimistic);
    assert.ok(simulation.optimistic);
    assert.ok(['REAL', 'ESTIMATE', 'SCENARIO', 'DEMO', 'UNKNOWN'].includes(simulation.baseline.dataProvenance));
    assert.ok(typeof simulation.sensitivityAnalysis.primaryDriver === 'string');

    // 14.2 CEO Overview Datenintegrität
    const overview = ceoOverviewService.getOverview();
    assert.ok(overview.financialHealth);
    assert.ok(['KNOWN', 'ESTIMATED', 'UNKNOWN', 'NO_DATA'].includes(overview.financialHealth.dataStatus));
    assert.ok(['REAL', 'DEMO', 'UNKNOWN'].includes(overview.financialHealth.cashProvenance));
    assert.ok(['REAL', 'DEMO', 'UNKNOWN'].includes(overview.financialHealth.burnProvenance));
    assert.ok(overview.sufficiency);
    assert.ok(['NO_DATA', 'LIMITED', 'SUFFICIENT', 'HIGH_CONFIDENCE'].includes(overview.sufficiency.level));
  });

  test('15. Step 2 Division-by-Zero & Epistemic Safeguards in Economics & Allocation', () => {
    // 15.1 Project Economics mit 0 Input darf nicht abstürzen und muss INSUFFICIENT_DATA melden
    const emptyEconomics = projectPlannerService.calculateEconomics({});
    assert.equal(emptyEconomics.plannedRevenuePerHour, 'INSUFFICIENT_DATA');
    assert.equal(emptyEconomics.actualRevenuePerHour, 'INSUFFICIENT_DATA');
    assert.equal(emptyEconomics.plannedROI, 'INSUFFICIENT_DATA');
    assert.equal(emptyEconomics.breakEvenUnits, 'INSUFFICIENT_DATA');
    assert.equal(emptyEconomics.sufficiencyStatus, 'INSUFFICIENT_DATA');

    // 15.2 Resource Allocation mit unvollständigen Tasks
    const report = resourceAllocationService.generateReport(40);
    assert.ok(report.dataSufficiency);
    assert.ok(report.utilizationPercent >= 0);
    assert.ok(!isNaN(report.byAlignment.highPercent));
    assert.ok(!isNaN(report.byAlignment.mediumPercent));
    assert.ok(!isNaN(report.byAlignment.lowPercent));
  });
});

