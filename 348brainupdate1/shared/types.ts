/**
 * 348 BUSINESS BRAIN — CENTRAL DOMAIN TYPES & ARCHITECTURE CONTRACTS
 * Step 1: Foundation & Architecture
 */

// ==========================================
// 1. GOAL & OBJECTIVE HIERARCHY
// ==========================================
export type GoalLevel =
  | 'VISION'
  | 'THREE_YEAR'
  | 'ANNUAL'
  | 'QUARTERLY'
  | 'MONTHLY'
  | 'WEEKLY'
  | 'DAILY'
  | 'TASK';

export type GoalType =
  | 'VISION'
  | 'LONG_TERM'
  | 'ANNUAL'
  | 'QUARTERLY'
  | 'MONTHLY'
  | 'WEEKLY'
  | 'DAILY'
  | 'FINANCIAL'
  | 'BUSINESS'
  | 'PRODUCT'
  | 'MARKETING'
  | 'COMMUNITY'
  | 'PERSONAL_DEVELOPMENT'
  | string;

export type GoalStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'STAGNATING'
  | 'ACHIEVED'
  | 'PAUSED'
  | 'CANCELLED'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'ARCHIVED';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type StrategicImportance = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type StrategicAlignmentLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Goal {
  id: string;
  title: string;
  name?: string; // alias for title
  description: string;
  level: GoalLevel;
  type?: GoalType;
  status: GoalStatus;
  priority: PriorityLevel;
  startDate: string;
  targetDate: string;
  metricName: string;
  unit?: string;
  currentValue: number;
  targetValue: number;
  parentGoalId?: string | null;
  progress: number; // 0 - 100
  notes: string;
  successCriteria?: string;
  owner?: string;
  strategicImportance?: StrategicImportance;
  confidence?: number; // 0.0 - 1.0
  domain?: 'BUSINESS' | 'PERSONAL' | 'INVESTMENT';
  computedStatusReason?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

// ==========================================
// 2. PROJECT & TASK DOMAIN
// ==========================================
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'STALLED' | 'COMPLETED' | 'ARCHIVED';

export interface Project {
  id: string;
  title: string;
  description: string;
  goalId?: string | null; // Direct link to parent Goal
  parentGoalId?: string | null; // Alias for goalId
  status: ProjectStatus;
  priority: PriorityLevel;
  owner: string;
  startDate: string;
  dueDate: string;
  progress: number;
  objective?: string;
  classification?: ProjectClassificationType;
  classificationReason?: string;
  strategicAlignment?: StrategicAlignmentLevel;
  alignmentReason?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'DONE' | 'BLOCKED' | 'PARKED';

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId?: string | null;
  goalId?: string | null;
  status: TaskStatus;
  priority: PriorityLevel;
  dueDate?: string | null;
  estimatedHours?: number;
  actualHours?: number;
  autonomyLevel: AutonomyLevel;
  strategicAlignment?: StrategicAlignmentLevel;
  alignmentReason?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2B. STEP 2: FINANCIAL GOALS & ROADMAP
// ==========================================
export type FinancialDomain = 'BUSINESS' | 'PERSONAL' | 'INVESTMENT';

export type FinancialCategory =
  | 'REVENUE'
  | 'PROFIT'
  | 'COSTS'
  | 'CASH'
  | 'SAVINGS'
  | 'NET_WORTH'
  | 'INVESTMENT_CONTRIBUTIONS'
  | 'INVESTMENT_VALUE';

export interface FinancialGoal {
  id: string;
  goalId?: string | null;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: string;
  startDate: string;
  monthlyContribution: number;
  growthAssumptionPercent: number; // e.g. 5% annual or 0%
  domain: FinancialDomain;
  category: FinancialCategory;
  notes: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialRoadmapMetrics {
  goalId: string;
  name: string;
  domain: FinancialDomain;
  category: FinancialCategory;
  currentAmount: number;
  targetAmount: number;
  currency: string;
  progressPercent: number;
  remainingAmount: number;
  monthsToTarget: number;
  daysToTarget: number;
  requiredMonthlyRate: number;
  plannedMonthlyContribution: number;
  varianceMonthlyRate: number;
  status: 'ON_TRACK' | 'BEHIND' | 'CRITICAL' | 'ACHIEVED' | 'INSUFFICIENT_DATA';
  sufficiencyStatus: 'SUFFICIENT' | 'INSUFFICIENT_DATA';
  scenarios: {
    linearMonths: number;
    growthModelMonths: number;
    pessimisticRate: number;
    expectedRate: number;
    optimisticRate: number;
  };
  uncertainty: {
    lowEstimate: number;
    expectedEstimate: number;
    highEstimate: number;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  statement: string;
}

// ==========================================
// 2C. STEP 2: INVESTMENT TRACKING FOUNDATION
// ==========================================
export type InvestmentAssetType = 'STOCK' | 'ETF' | 'CRYPTO' | 'CASH' | 'OTHER';

export interface InvestmentItem {
  id: string;
  name: string;
  assetType: InvestmentAssetType;
  currency: string;
  quantity: number;
  averageEntryPrice: number;
  investedCapital: number;
  currentValue: number;
  fees: number;
  realizedPnL: number;
  unrealizedPnL: number;
  investmentDate: string;
  valuationDate: string;
  source: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2D. STEP 2: EPISTEMIC VALUE & ECONOMICS
// ==========================================
export type EpistemicValueType = 'FACT' | 'ESTIMATE' | 'ASSUMPTION' | 'SCENARIO';

export interface EpistemicValue<T = number> {
  value: T;
  epistemicType: EpistemicValueType;
  source?: string;
  confidence?: number; // 0.0 - 1.0
  notes?: string;
}

export interface ThreePointEstimate {
  min: number;
  expected: number;
  max: number;
}

export type ProjectPhaseType =
  | 'IDEA'
  | 'RESEARCH'
  | 'VALIDATION'
  | 'BUSINESS_MODEL'
  | 'OFFER'
  | 'MVP'
  | 'PRODUCTION'
  | 'MARKETING'
  | 'LAUNCH'
  | 'OPTIMIZATION'
  | 'SCALING';

export interface ProjectPhase {
  id: string;
  name: string;
  type?: ProjectPhaseType;
  order: number;
  description?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  tasks: string[];
  dependencies?: string[];
  estimatedEffortHours: ThreePointEstimate;
  actualEffortHours?: number;
  estimatedCost?: ThreePointEstimate;
  expectedOutput: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed?: boolean;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
  deliverable?: string;
  phaseId?: string;
  criteria?: string;
}

export interface ProjectAssumption {
  id?: string;
  category?: string;
  statement: string;
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  epistemicStatus?: string;
  validationMethod?: string;
  validated?: boolean;
}

export interface ProjectRisk {
  id?: string;
  title?: string;
  risk?: string;
  description?: string;
  probability?: 'LOW' | 'MEDIUM' | 'HIGH';
  impact?: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation?: string;
}

export interface ProjectOpportunity {
  id?: string;
  title?: string;
  opportunity?: string;
  description?: string;
  potential?: 'LOW' | 'MEDIUM' | 'HIGH';
  potentialValue?: string | number;
  action?: string;
}

export type ProjectClassificationType =
  | 'CASH_GENERATOR'
  | 'STRATEGIC_INVESTMENT'
  | 'RESOURCE_DRAIN'
  | 'UNCLASSIFIED';

export interface ProjectClassification {
  classification: ProjectClassificationType;
  reason: string;
  evidence: string[];
  confidence: number; // 0.0 - 1.0
}
export type ProjectClassificationResult = ProjectClassification;

export interface ProjectEconomics {
  revenue?: EpistemicValue<number> | number;
  costs?: EpistemicValue<number> | number;
  profit?: EpistemicValue<number> | number;
  hours?: EpistemicValue<number> | number;
  capitalRequired?: EpistemicValue<number> | number;
  expectedReturn?: EpistemicValue<number> | number;
  plannedRevenue?: number;
  plannedDirectCosts?: number;
  plannedFixedCosts?: number;
  plannedTotalCosts?: number;
  plannedProfit?: number;
  estimatedHours?: number;
  pricePerUnit?: number;
  variableCostPerUnit?: number;
  breakEvenUnits?: number | 'INSUFFICIENT_DATA';
  plannedRevenuePerHour?: number | 'INSUFFICIENT_DATA';
  plannedProfitPerHour?: number | 'INSUFFICIENT_DATA';
  actualRevenue?: number;
  actualDirectCosts?: number;
  actualFixedCosts?: number;
  actualTotalCosts?: number;
  actualProfit?: number;
  actualHours?: number;
  actualRevenuePerHour?: number | 'INSUFFICIENT_DATA';
  actualProfitPerHour?: number | 'INSUFFICIENT_DATA';
  plannedROI?: number | 'INSUFFICIENT_DATA';
  actualROI?: number | 'INSUFFICIENT_DATA';
  currency?: string;
  epistemicNotes?: string;
  revenuePerHour?: number | 'INSUFFICIENT_DATA';
  profitPerHour?: number | 'INSUFFICIENT_DATA';
  roiPercent?: number | 'INSUFFICIENT_DATA';
  paybackPeriodMonths?: number | 'INSUFFICIENT_DATA';
  sufficiencyStatus?: 'SUFFICIENT' | 'INSUFFICIENT_DATA';
}

export interface PlanVsReality {
  projectId?: string;
  evaluatedAt?: string;
  plannedHours?: number;
  actualHours?: number;
  varianceHoursPercent?: number;
  plannedCosts?: number;
  actualCosts?: number;
  varianceCostsPercent?: number;
  plannedCustomers?: number;
  actualCustomers?: number;
  varianceCustomersPercent?: number;
  plannedRevenue?: number;
  actualRevenue?: number;
  varianceRevenuePercent?: number;
  plannedDurationDays?: number;
  actualDurationDays?: number;
  varianceDurationPercent?: number;
  lessonExtracted?: string;
  budget?: {
    planned: number;
    actual: number;
    variance: number;
    variancePercent: number;
  };
  revenue?: {
    planned: number;
    actual: number;
    variance: number;
    variancePercent: number;
  };
  effort?: {
    plannedHours: number;
    actualHours: number;
    varianceHours: number;
  };
  scope?: {
    plannedPhasesCount: number;
    completedPhasesCount: number;
    completionPercent: number;
  };
  status?: 'ON_TRACK' | 'BEHIND' | 'CRITICAL' | 'AHEAD' | 'OVER_BUDGET' | 'DELAYED';
  explanations?: string[];
}

export interface ProjectPlan {
  id: string;
  projectId: string;
  objective: string;
  assumptions: any[];
  milestones: any[];
  phases: any[];
  risks: any[];
  opportunities: any[];
  economics: ProjectEconomics;
  classification: ProjectClassification;
  planVsReality?: PlanVsReality;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2E. STEP 2: BUSINESS SCENARIO ENGINE (WHAT-IF)
// ==========================================
export type DataProvenance = 'REAL' | 'ESTIMATE' | 'ASSUMPTION' | 'SCENARIO' | 'DEMO' | 'UNKNOWN';

export type ScenarioType = 'BASELINE' | 'OPTIMISTIC' | 'PESSIMISTIC' | 'CUSTOM';

export interface ScenarioAssumptions {
  price?: number;
  customers?: number;
  conversionPercent?: number;
  conversionRate?: number;
  churnRate?: number;
  marketingSpend?: number;
  productionHours?: number;
  hourlyRate?: number;
  fixedCosts?: number;
  timelineWeeks?: number;
  revenueMultiplier?: number;
  costMultiplier?: number;
  leadGrowthPercent?: number;
  churnRatePercent?: number;
  founderWeeklyHours?: number;
  capitalInjection?: number;
}

export interface ScenarioCalculationResult {
  scenarioType?: ScenarioType;
  assumptions: ScenarioAssumptions;
  projectedMonthlyRevenue: number;
  projectedMonthlyCosts?: number;
  projectedMonthlyExpenses?: number;
  projectedMonthlyNetProfit: number;
  projectedNetMarginPercent?: number;
  runwayMonths: number;
  breakEvenCustomers?: number;
  breakEvenMonthlyRevenue?: number;
  monthlyCustomerGrowth?: number;
  capacityStrainPercent?: number;
  warnings?: string[];
  revenue?: number;
  marketingCosts?: number;
  laborCosts?: number;
  fixedCosts?: number;
  totalCosts?: number;
  profit?: number;
  profitMarginPercent?: number;
  breakEvenRevenue?: number;
  requiredCustomersToTargetProfit?: (targetProfit: number) => number;
  estimatedTimelineWeeks?: number;
  uncertainty?: {
    lowRevenue: number;
    expectedRevenue: number;
    highRevenue: number;
    lowProfit: number;
    expectedProfit: number;
    highProfit: number;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  epistemicType?: 'SCENARIO';
  statement?: string;
  notes?: string;
  dataProvenance?: DataProvenance;
  isSimulatedFallback?: boolean;
}

// ==========================================
// 2F. STEP 2: RESOURCE ALLOCATION & STRATEGIC DRIFT
// ==========================================
export interface ResourceCategoryItem {
  category: string;
  amount: number;
  percent: number;
  alignedGoalTitle?: string;
}

export type CapacityStatus = 'NORMAL' | 'BALANCED' | 'NEAR_CAPACITY' | 'OVERLOADED' | 'UNDERUTILIZED';

export interface ResourceAllocationReport {
  period?: string;
  availableWeeklyHours?: number;
  committedWeeklyHours?: number;
  utilizationPercent?: number;
  capacityStatus?: CapacityStatus;
  byGoal?: Array<{
    goalId: string;
    goalTitle: string;
    allocatedHours: number;
    percentOfTotalHours: number;
  }>;
  byProject?: Array<{
    projectId: string;
    projectTitle: string;
    allocatedHours?: number;
    allocatedBudget?: number;
    percentOfTotalHours?: number;
    weeklyHours?: number;
    percent?: number;
    classification?: ProjectClassificationType;
    cost?: number;
  }>;
  byAlignment?: {
    highPercent: number;
    mediumPercent: number;
    lowPercent: number;
  };
  recommendations?: string[];
  time?: ResourceCategoryItem[];
  money?: ResourceCategoryItem[];
  attention?: ResourceCategoryItem[];
  alignmentAlerts?: Array<{
    goalTitle: string;
    targetPercent: number;
    actualPercent: number;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    confidence: number;
  }>;
  drainWarnings?: Array<{
    activityOrProject: string;
    resourceSharePercent: number;
    reason: string;
  }>;
  opportunities?: Array<{
    title: string;
    potential: string;
    strategicFit: 'HIGH' | 'MEDIUM';
  }>;
  dataSufficiency?: DataSufficiency;
}

// ==========================================
// 2G. STEP 2: STRATEGIC ALIGNMENT CHAIN
// ==========================================
export interface StrategicAlignmentChain {
  level: StrategicAlignmentLevel;
  score: number; // 0 - 100
  reasoning: string;
  evidence: string[];
  chain: {
    taskId?: string;
    taskTitle?: string;
    projectId?: string;
    projectTitle?: string;
    goalId?: string;
    goalTitle?: string;
    strategicDirection?: string;
  };
}

// ==========================================
// 2H. STEP 2: CEO OVERVIEW FOUNDATION
// ==========================================
export interface CEOOverviewData {
  whereWeStand?: string;
  whatMattersNow?: string[];
  whatIsStagnating?: string[];
  whereResourcesAreGoing?: {
    topTimeArea: string;
    topTimePercent: number;
    topMoneyArea: string;
    topMoneyPercent: number;
  };
  projectsCreatingValue?: Array<{ id: string; title: string; metric: string }>;
  projectsConsumingResources?: Array<{ id: string; title: string; costOrHours: string; status: string }>;
  recentChanges?: string[];
  biggestRisks?: Array<{ id: string; title: string; severity: string }>;
  biggestOpportunities?: Array<{ id: string; title: string; potential: string }>;
  financialSummary?: {
    totalRevenueTracked: number;
    totalProfitTracked: number;
    runwayOrCash: number;
    investmentPortfolioValue: number;
  };
  sufficiency?: DataSufficiency;
  topPriorities?: Array<{
    taskId: string;
    title: string;
    projectTitle?: string;
    goalTitle?: string;
    reason: string;
    urgency: 'HIGH' | 'MEDIUM';
  }>;
  goalsOverview?: {
    total: number;
    onTrack: number;
    atRisk: number;
    achieved: number;
  };
  financialHealth?: {
    currentCash: number | null;
    monthlyBurn: number | null;
    runwayMonths: number | null;
    baselineNetProfit: number | null;
    portfolioValue: number;
    dataStatus?: 'KNOWN' | 'ESTIMATED' | 'UNKNOWN' | 'NO_DATA';
    cashProvenance?: DataProvenance;
    burnProvenance?: DataProvenance;
    notes?: string;
  };
  projectPortfolio?: {
    cashGenerators: Array<{ projectId: string; title: string; revenue: number; profit: number }>;
    strategicInvestments: Array<{ projectId: string; title: string; plannedROI: number; status: string }>;
    resourceDrains: Array<{ projectId: string; title: string; reason: string; hoursSpent: number }>;
  };
  resourceCapacity?: {
    availableWeeklyHours: number;
    committedWeeklyHours: number;
    utilizationPercent: number;
    capacityStatus: CapacityStatus;
    highAlignmentPercent: number;
  };
  activeDrifts?: StrategicDriftAlert[];
  scenarioSummary?: {
    pessimisticRunway: number;
    primarySensitivityDriver: string;
    criticalThreshold: string;
  };
  time?: TimeStateSnapshot;
}

// ==========================================
// 3. BUSINESS MEMORY (STRUCTURED TYPES)
// ==========================================
export type MemoryType =
  | 'FACT'
  | 'GOAL'
  | 'DECISION'
  | 'OBSERVATION'
  | 'HYPOTHESIS'
  | 'RESULT'
  | 'LESSON'
  | 'PREFERENCE';

export type MemoryOrigin =
  | 'HUMAN'
  | 'BUSINESS_DATA'
  | 'ANALYSIS'
  | 'AI_OBSERVATION'
  | 'EXTERNAL_SOURCE';

export type MemoryStatus = 'ACTIVE' | 'ARCHIVED' | 'SUPERSEDED' | 'DISPROVEN';

export interface RelatedEntity {
  type: 'GOAL' | 'PROJECT' | 'TASK' | 'CONTENT' | 'DECISION' | 'CREATOR' | 'METRIC';
  id: string;
  name?: string;
}

export interface BusinessMemory {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  source: string;
  confidence: number; // 0.0 - 1.0
  timestamp: string;
  evidence: string[];
  origin: MemoryOrigin;
  relatedEntities: RelatedEntity[];
  status: MemoryStatus;
  isFactValidated: boolean; // Cannot be true if origin is unverified AI hypothesis
  isDemo?: boolean;
  tags?: string[];
}

// ==========================================
// 4. EVIDENCE SYSTEM & EPISTEMIC STATUS
// ==========================================
export type EpistemicStatus =
  | 'KNOWN'       // Verified ground truth
  | 'DERIVED'     // Computed mathematically from known data
  | 'ESTIMATED'   // Statistical estimate / approximation
  | 'HYPOTHESIS'  // Unverified assumption / proposal
  | 'FACT';

export interface EvidenceItem {
  id: string;
  claim: string;
  epistemicStatus: EpistemicStatus;
  sourceId: string;
  sourceName: string;
  originalDataRef?: string;
  confidence: number;
  collectedAt: string;
  verifierNotes?: string;
}

// ==========================================
// 5. DECISION MEMORY
// ==========================================
export interface DecisionMemory {
  id: string;
  what: string;
  why: string;
  date: string;
  context: string;
  alternatives: string[];
  expectedResult: string;
  actualResult?: string;
  evidence: string[];
  lesson?: string;
  status: 'PENDING_EVALUATION' | 'EVALUATED' | 'REVISED';
  isDemo?: boolean;
}

// ==========================================
// 6. AUTONOMY & APPROVAL SYSTEM
// ==========================================
export type AutonomyLevel = 'AUTO' | 'APPROVAL' | 'MANUAL';

export interface ApprovalPolicy {
  autonomyLevel: AutonomyLevel;
  requiresReviewBy: string;
  timeoutAction?: 'HOLD' | 'REJECT';
  description: string;
}

// ==========================================
// 7. STRATEGIC DRIFT ENGINE
// ==========================================
export interface ActivityCategoryDistribution {
  category: string;
  percent: number;
}

export interface StrategicDriftAlert {
  id: string;
  goalId?: string;
  goalTitle: string;
  goalWeightPercent: number;
  activityDistribution: ActivityCategoryDistribution[];
  driftSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  potentialReason: string;
  promptToCheck: string; // "Soll das so sein?"
  timestamp: string;
  acknowledged: boolean;
}

// ==========================================
// 8. PRIORITY ENGINE & STOP/PARKING RADAR
// ==========================================
export type PriorityRecommendation = 'DO_NOW' | 'SCHEDULE' | 'DELEGATE' | 'PARK' | 'STOP';

export interface PriorityEvaluationInput {
  impact: number;       // 1 - 10
  goalAlignment: number; // 1 - 10
  urgency: number;      // 1 - 10
  dependencies: number; // 1 - 10 (inverse constraint)
  opportunity: number;  // 1 - 10
  effort: number;       // 1 - 10
  opportunityCostNotes?: string;
}

export interface PriorityEvaluationResult {
  score: number;
  recommendation: PriorityRecommendation;
  parkingRadarFlag: boolean;
  justification: string;
}

// ==========================================
// 9. DATA SUFFICIENCY & CONFIDENCE
// ==========================================
export type DataSufficiencyLevel =
  | 'NO_DATA'
  | 'LIMITED'
  | 'SUFFICIENT'
  | 'HIGH_CONFIDENCE';

export interface DataSufficiency {
  level: DataSufficiencyLevel;
  confidence: number; // 0.0 - 1.0 (realistische, nicht künstlich erfundene Konfidenz)
  evidenceCount: number;
  sourceQualityScore: number; // 0.0 - 1.0 (basiert auf tatsächlicher Quellensicherheit)
  dataFreshnessScore: number; // 0.0 - 1.0 (Zeitnähe der Daten)
  dataConsistencyScore: number; // 0.0 - 1.0 (Widerspruchsfreiheit von Zielen und Fakten)
  dataWindowDays: number; // Beobachtetes Zeitfenster in Tagen
  evidenceStrength: number; // 0.0 - 1.0 (Verhältnis von KNOWN/DERIVED zu reinen Annahmen)
  statement: string; // z.B. "Nicht genügend Daten für eine belastbare Aussage."
}

// ==========================================
// 10. DATA SOURCES ARCHITECTURE
// ==========================================
export type DataSourceType =
  | 'INTERNAL_FILES'
  | 'SQLITE'
  | 'OBSIDIAN'
  | 'TRADING_OS_348'
  | 'CALENDAR'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'INSTAGRAM'
  | 'WEB'
  | 'RSS'
  | 'CREATOR_RESEARCH'
  | 'COMMUNITY_DATA';

export type DataSourceStatus =
  | 'CONNECTED'
  | 'AVAILABLE'
  | 'NOT_CONFIGURED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'DEMO';

export interface DataSource {
  id: string;
  name: string;
  description?: string;
  type: DataSourceType;
  status: DataSourceStatus;
  lastSync?: string | null;
  permissions: 'READ_ONLY' | 'READ_WRITE';
  reliability: number; // 0.0 - 1.0
  configuration: Record<string, unknown>;
  isDemo?: boolean;
}

// ==========================================
// 11. AUDIT LOG
// ==========================================
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string; // 'SYSTEM' | 'USER' | 'ENGINE_<Name>'
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason: string;
  source: string;
}

// ==========================================
// 12. INTERNAL EVENT SYSTEM
// ==========================================
export type BrainEventType =
  | 'GOAL_CREATED'
  | 'GOAL_UPDATED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_STALLED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'MEMORY_CREATED'
  | 'MEMORY_UPDATED'
  | 'DECISION_CREATED'
  | 'SOURCE_CONNECTED'
  | 'SOURCE_DISCONNECTED'
  | 'AI_PROVIDER_CHANGED'
  | 'SYSTEM_ERROR'
  | 'CONTENT_PUBLISHED'
  | 'CONTENT_ANALYZED'
  | 'CONTENT_IDEA_CREATED'
  | 'CONTENT_ITEM_CREATED'
  | 'KPI_CHANGED'
  | 'NEW_INSIGHT'
  | 'NEW_OPPORTUNITY'
  | 'NEW_RISK'
  | 'EXPERIMENT_COMPLETED'
  | 'STRATEGIC_DRIFT_DETECTED'
  | 'AUDIT_LOG_RECORDED'
  | 'MARKET_SIGNAL_DETECTED'
  | 'MARKET_INTELLIGENCE_UPDATED';

export interface BrainEvent<T = unknown> {
  id: string;
  type: BrainEventType;
  payload: T;
  timestamp: string;
  emitter: string;
}

// ==========================================
// 13. ENGINE STATUS ARCHITECTURE
// ==========================================
export type EngineStatus =
  | 'FOUNDATION'
  | 'READY'
  | 'ACTIVE'
  | 'DEMO'
  | 'DISABLED'
  | 'ERROR';

export interface EngineInfo {
  id: string;
  name: string;
  description: string;
  status: {
    status: EngineStatus;
    description: string;
    lastActive?: string;
  };
}

// ==========================================
// 14. 3-TIER TRANSFORMATION PIPELINE (Rule 15)
// RAW DATA -> ANALYSIS -> KNOWLEDGE
// ==========================================
export interface TransformedAnalysis<TRaw = unknown, TAnalysis = unknown, TKnowledge = unknown> {
  level1Raw: TRaw;
  level2Analysis: TAnalysis;
  level3Knowledge: TKnowledge;
  generatedAt: string;
  epistemicStatus: EpistemicStatus;
}

export interface ITransformPipeline<TInput, TRaw, TAnalysis, TKnowledge> {
  transform(input: TInput): TransformedAnalysis<TRaw, TAnalysis, TKnowledge>;
}

// ==========================================
// 15. CENTRAL BUSINESS STATE
// ==========================================
export interface BusinessStateSnapshot {
  whereWeStand: string;
  currentPriorities: string[];
  whatIsGoingWell: string[];
  whatNeedsImprovement: string[];
  whatIsStagnating: string[];
  whatHasChanged: string[];
  endangeredGoals: Array<{ id: string; title: string; riskFactor: string }>;
  activeOpportunities: Array<{ id: string; title: string; potential: string }>;
  activeRisks: Array<{ id: string; title: string; severity: string }>;
  nextActions: string[];
  whatNotToDo: string[];
  lastUpdated: string;
  sufficiency: DataSufficiency;
}

// ==========================================
// 16. SYSTEM HEALTH STATUS & AUTOMATION
// ==========================================
export type AutomationStatus = 'OFF' | 'READY' | 'ACTIVE' | 'PAUSED' | 'ERROR';

export interface SystemStatusSnapshot {
  aiStatus: 'CONNECTED' | 'MOCK' | 'DISCONNECTED' | 'ERROR';
  aiProvider: string;
  aiModelName: string;
  memoryStatus: 'READY' | 'INITIALIZING' | 'ERROR';
  databaseStatus: 'HEALTHY' | 'DEGRADED' | 'ERROR';
  connectedSourcesCount: number;
  totalSourcesCount: number;
  automationStatus: AutomationStatus;
  lastAnalysisTimestamp: string;
  memoryCount: number;
  goalCount: number;
  taskCount: number;
  projectCount: number;
  auditCount: number;
}

// ==========================================
// 17. STEP 3: SUPERBRAIN ORCHESTRATION CONTRACTS
// ==========================================

export type SuperbrainIntent =
  | 'OVERVIEW'
  | 'DEEP_DIVE'
  | 'RISK_ASSESSMENT'
  | 'SIMULATION'
  | 'WHAT_NOT_TO_DO'
  | 'GOAL_HEALTH'
  | 'CAPACITY_CHECK'
  | 'FINANCIAL_CHECK'
  | 'CONTENT'
  | 'CONTENT_IDEA'
  | 'CONTENT_PLAN'
  | 'CONTENT_DRAFT'
  | 'CONTENT_REPURPOSE'
  | 'CONTENT_PERFORMANCE';

export type SuperbrainDomain =
  | 'STRATEGY'
  | 'GOALS'
  | 'PLANNING'
  | 'TASKS'
  | 'PROJECTS'
  | 'FINANCE'
  | 'SCENARIOS'
  | 'RESOURCES'
  | 'ANALYTICS'
  | 'INTELLIGENCE'
  | 'CONTENT'
  | 'OPPORTUNITIES'
  | 'RISKS'
  | 'EXPERIMENTS'
  | 'MEMORY'
  | 'NOTIFICATIONS'
  | 'TIME';

export type EngineCapability =
  | 'STRATEGY_ALIGNMENT'
  | 'STRATEGIC_DRIFT'
  | 'GOAL_HIERARCHY'
  | 'GOAL_HEALTH'
  | 'CAPACITY_PLANNING'
  | 'TASK_PRIORITY'
  | 'PARKING_RADAR'
  | 'PROJECT_PHASES'
  | 'PROJECT_ECONOMICS'
  | 'PROJECT_CLASSIFICATION'
  | 'PLAN_VS_REALITY'
  | 'FINANCIAL_ROADMAP'
  | 'SAVINGS_COMPOUND'
  | 'PORTFOLIO_ANALYSIS'
  | 'RUNWAY_SIMULATION'
  | 'WHAT_IF_SCENARIOS'
  | 'SENSITIVITY_ANALYSIS'
  | 'RESOURCE_ALLOCATION'
  | 'CAPACITY_STRAIN'
  | 'DATA_TRANSFORMATION'
  | 'MARKET_INTELLIGENCE'
  | 'CONTENT_PIPELINE'
  | 'CONTENT_CREATION'
  | 'CONTENT_SCHEDULING'
  | 'CONTENT_REPURPOSING'
  | 'GET_CONTENT_DOMAIN_STATE'
  | 'GET_CONTENT_SNAPSHOT'
  | 'GENERATE_CONTENT_DRAFT'
  | 'GENERATE_CONTENT_VARIANTS'
  | 'SCHEDULE_CONTENT_PUBLICATION'
  | 'INGEST_CONTENT_IDEA'
  | 'OPPORTUNITY_RADAR'
  | 'RISK_DETECTION'
  | 'EXPERIMENT_CYCLE'
  | 'LONG_TERM_MEMORY'
  | 'FACT_VALIDATION'
  | 'DECISION_LOG'
  | 'NOTIFICATION_DISPATCH'
  | 'GET_CURRENT_SCHEDULE'
  | 'GET_DAY_CAPACITY'
  | 'GET_WEEK_CAPACITY'
  | 'DETECT_CONFLICTS'
  | 'EVALUATE_DEADLINES'
  | 'PLAN_DAY'
  | 'PLAN_WEEK'
  | 'SIMULATE_REPLAN'
  | 'PROPOSE_REPLAN';

export interface EngineDescriptor {
  engineId: string;
  name: string;
  domain: SuperbrainDomain;
  capabilities: EngineCapability[];
  inputRequirements: string[];
  outputTypes: string[];
  supportedIntents: SuperbrainIntent[];
  dataSources: string[];
  events: string[];
  provenanceSupport: DataProvenance[];
  availability: 'READY' | 'FOUNDATION' | 'OFFLINE';
}

export interface EngineInvocation {
  engineId: string;
  capability: EngineCapability;
  reason: string;
  inputParameters?: Record<string, unknown>;
}

export interface EngineResult {
  engineId: string;
  capability: EngineCapability;
  executedAt: string;
  executionTimeMs: number;
  status: 'SUCCESS' | 'ERROR' | 'SKIPPED' | 'NO_DATA';
  data: unknown;
  provenance: DataProvenance;
  dataSufficiency: DataSufficiencyLevel;
  errorMessage?: string;
}

export type EpistemicClassification = 'FACT' | 'OBSERVATION' | 'INTERPRETATION' | 'HYPOTHESIS';

export interface EvidenceChainItem {
  source: string;
  entityId?: string;
  entityType?: string;
  metricName?: string;
  value?: string | number;
  timestamp?: string;
  provenance: DataProvenance;
  claim: string;
  epistemicStatus: EpistemicStatus;
  fact?: string;
  sourceId?: string;
  confidenceScore?: number;
  reasoningStep?: string;
}

export interface SuperbrainInsight {
  id: string;
  type: 'RISK' | 'OPPORTUNITY' | 'CONFLICT' | 'DRIFT' | 'PROGRESS' | 'DEPRIORITIZE';
  title: string;
  summary: string;
  epistemicType: EpistemicClassification;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  domains: string[];
  evidenceChain: EvidenceChainItem[];
  potentialImpact: string;
  recommendedActionIds?: string[];
  dataProvenance: DataProvenance;
}

export type ConflictStatus = 'CONFLICT' | 'POSSIBLE_CONFLICT' | 'INTENTIONAL_CHANGE' | 'UNKNOWN';

export interface CrossDomainConflict {
  id: string;
  title: string;
  description: string;
  domains: string[];
  status: ConflictStatus;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: EvidenceChainItem[];
  suggestedResolution?: string;
}

export type AttentionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NOISE_FILTERED';

export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  priority: AttentionPriority;
  domain: string;
  provenance: DataProvenance;
  urgencyScore: number; // 1 - 10
  goalImpactScore: number; // 1 - 10
  financialImpactScore: number; // 1 - 10
  deadline?: string;
}

export interface SuperbrainAction {
  id: string;
  title: string;
  description: string;
  reason: string;
  domain: string;
  autonomyLevel: AutonomyLevel; // 'AUTO' | 'APPROVAL' | 'MANUAL'
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'EXPIRED';
  requiresApproval: boolean;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  reversible: boolean;
  expiresAt?: string;
  createdAt: string;
  executedAt?: string;
  payload?: Record<string, unknown>;
}

export interface WhatNotToDoItem {
  id: string;
  title: string;
  reason: string;
  effort: string;
  strategicAlignment: 'LOW' | 'NONE';
  suggestedAction: 'PARK' | 'DEPRIORITIZE' | 'STOP';
  targetEntityId?: string;
  targetEntityType?: 'TASK' | 'PROJECT' | 'EXPERIMENT' | 'IDEA';
}

export interface SuperbrainQuery {
  query: string;
  intent?: SuperbrainIntent;
  scope?: string[];
  timeHorizon?: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'QUARTER' | 'ANNUAL';
  forceRefresh?: boolean;
  maxActions?: number;
}

export interface EpistemicAudit {
  verifiedFactsCount: number;
  observationsCount: number;
  interpretationsCount: number;
  hypothesesCount: number;
  unverifiedAssumptionsFlagged: number;
  syntheticCalculationsCount: number;
  simulatedScenariosIsolated: boolean;
  provenanceCheckPassed: boolean;
  auditStatement: string;
}

export interface SuperbrainResponse {
  query: SuperbrainQuery;
  timestamp: string;
  executionTimeMs: number;
  executiveSummary: string;
  whatMattersNow: Array<{
    title: string;
    detail: string;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    domain: string;
    provenance: DataProvenance;
  }>;
  changesSinceLastBriefing: string[];
  risks: SuperbrainInsight[];
  opportunities: SuperbrainInsight[];
  conflicts: CrossDomainConflict[];
  goalStatus: {
    total: number;
    onTrack: number;
    atRisk: number;
    blocked: number;
    achieved: number;
    averageProgress: number;
  };
  recommendedActions: SuperbrainAction[];
  whatNotToDo: WhatNotToDoItem[];
  invocations: EngineInvocation[];
  engineResultsCount: number;
  evidenceCount: number;
  confidence: number; // 0.0 - 1.0
  dataSufficiency: DataSufficiency;
  unknownDomains: string[];
  approvalRequiredActionsCount: number;
  epistemicAudit: EpistemicAudit;
  aiSynthesized: boolean;
  aiModelUsed?: string;
}

export interface DomainStateMetadata<T = unknown> {
  domain: SuperbrainDomain;
  status: 'AVAILABLE' | 'PARTIAL' | 'UNKNOWN' | 'NO_DATA';
  lastUpdated: string;
  provenance: DataProvenance;
  dataSufficiency: DataSufficiencyLevel;
  confidence: number;
  dataAgeHours: number;
  data: T | null;
  notes?: string;
}

export interface BusinessDigitalTwin {
  strategy: DomainStateMetadata;
  goals: DomainStateMetadata;
  projects: DomainStateMetadata;
  tasks: DomainStateMetadata;
  resources: DomainStateMetadata;
  finance: DomainStateMetadata;
  scenarios: DomainStateMetadata;
  analytics: DomainStateMetadata;
  intelligence: DomainStateMetadata;
  content: DomainStateMetadata;
  opportunities: DomainStateMetadata;
  risks: DomainStateMetadata;
  experiments: DomainStateMetadata;
  memory: DomainStateMetadata;
  attention: DomainStateMetadata;
  time?: DomainStateMetadata;
  timestamp: string;
  overallSufficiency: DataSufficiency;
}

export interface DailyBriefing {
  date: string;
  generatedAt: string;
  executiveSummary: string;
  whatMattersNow: Array<{
    title: string;
    detail: string;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    domain: string;
    provenance: DataProvenance;
  }>;
  topRisks: SuperbrainInsight[];
  topOpportunities: SuperbrainInsight[];
  pendingApprovals: SuperbrainAction[];
  focusProtection: WhatNotToDoItem[];
  dataFreshness: {
    newestTimestamp: string;
    dataFreshnessScore: number;
    sufficiencyLevel: DataSufficiencyLevel;
  };
}

// ==========================================
// STEP 4: 348 LIFE & BUSINESS TIME OS
// Time & Calendar Brain Domain Contracts
// ==========================================

export type ShiftType =
  | 'EARLY'
  | 'LATE'
  | 'NIGHT'
  | 'OFF'
  | 'VACATION'
  | 'SICK'
  | 'OTHER';

export type ShiftStatus =
  | 'DETECTED'
  | 'REVIEW_REQUIRED'
  | 'CONFIRMED'
  | 'REJECTED';

export type ShiftSource =
  | 'SHIFT_PLAN_OCR'
  | 'MANUAL'
  | 'CALENDAR_IMPORT'
  | 'CSV_IMPORT'
  | 'RULE';

export interface ShiftRecord {
  id: string;
  date: string; // YYYY-MM-DD
  type: ShiftType;
  startTime: string; // HH:mm or ISO (e.g. "06:00" or "21:30")
  endTime: string; // HH:mm or ISO (e.g. "14:00" or "05:30" over midnight)
  timezone: string;
  source: ShiftSource;
  confidence: number; // 0.0 - 1.0
  status: ShiftStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface ShiftImportPreview {
  importId: string;
  rawInput?: string;
  fileName?: string;
  detectedShifts: ShiftRecord[];
  reviewRequiredCount: number;
  confidenceAverage: number;
  warnings: string[];
  status: 'PREVIEW_READY' | 'CONFIRMED' | 'REJECTED';
}

export type EventCategory =
  | 'WORK'
  | 'FAMILY'
  | 'APPOINTMENT'
  | 'BUSINESS'
  | 'PROJECT'
  | 'SPORT'
  | 'LEARNING'
  | 'SLEEP'
  | 'PERSONAL'
  | 'TRAVEL'
  | 'BUFFER'
  | 'OTHER';

export type EventFlexibility = 'FIXED' | 'PROTECTED' | 'FLEXIBLE' | 'OPTIONAL';

export type BusinessSubDomain =
  | 'STRATEGY'
  | 'CONTENT'
  | 'PROJECT'
  | 'ADMIN'
  | 'RESEARCH'
  | 'CUSTOMER'
  | 'DEVELOPMENT'
  | 'TRADING';

export type EventStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED';

export interface TimeEvent {
  id: string;
  title: string;
  category: EventCategory;
  start: string; // ISO string or YYYY-MM-DDTHH:mm:ss
  end: string; // ISO string or YYYY-MM-DDTHH:mm:ss
  timezone: string;
  source: string;
  priority: PriorityLevel;
  flexibility: EventFlexibility;
  protected: boolean;
  status: EventStatus;
  projectId?: string | null;
  goalId?: string | null;
  taskId?: string | null;
  businessDomain?: BusinessSubDomain | null;
  learningTopicId?: string | null;
  notes?: string;
  durationMinutes?: number;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface UserTimePreferences {
  id?: string;
  minSleepHours: number; // e.g. 7.0
  targetSleepHours: number; // e.g. 8.0
  preferredLearningMinutes: number; // e.g. 20
  typicalSportMinutes: number; // e.g. 60
  preferredBusinessBlockMinutes: number; // e.g. 90
  workToHomeMinutes: number; // e.g. 30
  workToSportMinutes: number; // e.g. 20
  sportToHomeMinutes: number; // e.g. 20
  lateShiftToSleepMinutes: number; // e.g. 60
  familyToBusinessMinutes: number; // e.g. 15
  businessToSleepMinutes: number; // e.g. 30
  defaultBufferMinutes: number; // e.g. 15
  protectedCategories: EventCategory[]; // e.g. ['FAMILY', 'WORK', 'SLEEP']
  timezone: string;
  provenance: DataProvenance;
  updatedAt: string;
}

export interface CapacityBreakdown {
  sleepHours: number;
  shiftWorkHours: number;
  commuteTravelHours: number;
  commuteHours?: number;
  familyProtectedHours: number;
  transitionBufferHours: number;
  fixedAppointmentsHours: number;
  scheduledBusinessHours: number;
  scheduledSportHours: number;
  scheduledLearningHours: number;
  otherBlockedHours: number;
}

export interface DayCapacitySnapshot {
  date: string;
  theoreticalAvailableHours: number;
  realisticAvailableHours: number;
  businessCapacityHours: number;
  deepWorkCapacityHours: number;
  learningCapacityMinutes: number;
  sportCapacityMinutes: number;
  breakdown: CapacityBreakdown;
  overloadStatus: 'OPTIMAL' | 'BALANCED' | 'STRAINED' | 'OVERLOADED' | 'INSUFFICIENT_DATA';
  overloadHours: number;
  dataSufficiency: DataSufficiency;
  provenance: DataProvenance;
  notes: string[];
}

export interface WeekCapacitySnapshot {
  startDate: string;
  endDate: string;
  totalHours: number;
  realisticAvailableHours: number;
  totalRealisticHours?: number;
  committedTaskHours: number;
  committedShiftHours: number;
  familyHours: number;
  sleepHours: number;
  varianceHours: number;
  overloadStatus: 'OPTIMAL' | 'BALANCED' | 'STRAINED' | 'OVERLOADED' | 'INSUFFICIENT_DATA';
  dailySnapshots: DayCapacitySnapshot[];
  dailyBreakdowns?: DayCapacitySnapshot[];
  dataSufficiency: DataSufficiency;
  provenance: DataProvenance;
}

export type TimeConflictType =
  | 'DIRECT_OVERLAP'
  | 'SHIFT_APPOINTMENT_COLLISION'
  | 'UNREALISTIC_SLEEP'
  | 'OVERLOAD'
  | 'DOUBLE_BOOKED_TASK'
  | 'DEADLINE_OUTSIDE_CAPACITY'
  | 'MISSING_BUFFER'
  | 'TRAVEL_BUFFER_VIOLATION'
  | 'PROTECTED_TIME_BREACH';

export type TimeConflictSeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'IMPORTANT'
  | 'NORMAL'
  | 'BACKGROUND';

export interface TimeConflict {
  id: string;
  type: TimeConflictType;
  severity: TimeConflictSeverity;
  affectedEventIds: string[];
  reason: string;
  evidence: EvidenceChainItem[];
  possibleResolution: string;
  detectedAt: string;
  status: 'ACTIVE' | 'RESOLVED' | 'IGNORED';
}

export interface ReplanMovedEvent {
  eventId: string;
  eventTitle: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
  reason: string;
  flexibility: EventFlexibility;
}

export interface ReplanProposal {
  id: string;
  triggerEventId?: string;
  reason: string;
  conflictsDetected: TimeConflict[];
  movedEvents: ReplanMovedEvent[];
  unresolvedConflicts: TimeConflict[];
  feasibilityStatus: 'FEASIBLE' | 'PARTIAL' | 'INFEASIBLE';
  summary: string;
  autonomyLevel: AutonomyLevel;
  createdAt: string;
  status: 'PROPOSED' | 'APPLIED' | 'REJECTED';
}

export type DeviationReason =
  | 'UNDERESTIMATED'
  | 'TIRED'
  | 'WORK_OVERRUN'
  | 'UNEXPECTED'
  | 'DISTRACTION'
  | 'HIGHER_PRIORITY'
  | 'TECHNICAL'
  | 'UNCLEAR'
  | 'UNREALISTIC'
  | 'OTHER';

export interface PlanRealityRecord {
  id: string;
  date: string;
  eventId?: string;
  taskId?: string;
  title: string;
  category: EventCategory;
  plannedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
  variancePercent: number;
  status: 'COMPLETED_ON_TIME' | 'OVERRUN' | 'UNDERRUN' | 'SKIPPED' | 'POSTPONED';
  deviationReason?: DeviationReason;
  notes?: string;
  createdAt: string;
}

export interface LearnedPattern {
  id: string;
  patternType:
    | 'DURATION_UNDERESTIMATE'
    | 'REPEATED_OVERRUN'
    | 'FATIGUE_AFTER_SHIFT'
    | 'LOW_ENERGY_WINDOW';
  categoryOrTopic: string;
  category?: string;
  sampleCount: number;
  averageDeviationPercent: number;
  recommendedBufferFactor?: number;
  evidence?: EvidenceChainItem[];
  confidence: number;
  observationStatement: string;
  recommendedAdjustment: string;
  status: 'OBSERVATION' | 'CANDIDATE_RULE' | 'APPLIED_RULE';
}

export interface MorningPlanTimelineItem {
  id: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  title: string;
  category: EventCategory;
  flexibility: EventFlexibility;
  notes?: string;
}

export interface MorningPlan {
  date: string;
  greeting: string;
  currentShift: ShiftRecord | null;
  timeline: MorningPlanTimelineItem[];
  capacity: {
    businessHours: number;
    learningMinutes: number;
    sportMinutes: number;
    realisticFreeHours: number;
  };
  warnings: string[];
  dataSufficiency: DataSufficiency;
  provenance: DataProvenance;
}

export interface DailyReviewItem {
  eventId?: string;
  taskId?: string;
  title: string;
  category: EventCategory;
  plannedMinutes: number;
  actualMinutes: number;
  completed: boolean;
  deviationReason?: DeviationReason;
  notes?: string;
}

export interface DailyReviewSummary {
  id: string;
  date: string;
  items: DailyReviewItem[];
  overallRating?: 'AS_PLANNED' | 'PARTIAL' | 'DISRUPTED';
  learnedTakeaways: string[];
  createdAt: string;
}

export interface TimeStateSnapshot {
  currentShift: ShiftRecord | null;
  nextShift: ShiftRecord | null;
  todayCapacity: DayCapacitySnapshot | null;
  weekCapacity: WeekCapacitySnapshot | null;
  plannedHours: number;
  availableHours: number;
  overloadStatus: 'BALANCED' | 'STRAINED' | 'OVERLOADED' | 'INSUFFICIENT_DATA';
  conflicts: TimeConflict[];
  upcomingProtectedEvents: TimeEvent[];
  dataSufficiency: DataSufficiency;
}

// ==========================================
// STEP 5: 348 MARKET INTELLIGENCE BRAIN
// ==========================================

export type MarketEpistemicLevel =
  | 'RAW_DATA'
  | 'FACT'
  | 'OBSERVATION'
  | 'ANALYSIS'
  | 'INTERPRETATION'
  | 'HYPOTHESIS'
  | 'UNKNOWN';

export type MarketSourceType =
  | 'PUBLIC_WEB'
  | 'NEWS'
  | 'VIDEO_CREATOR'
  | 'COMMUNITY'
  | 'MARKET_PRODUCT'
  | 'OWN_DATA'
  | 'MANUAL';

export type MarketSourceAvailability =
  | 'ACTIVE'
  | 'LIMITED'
  | 'UNAVAILABLE'
  | 'MANUAL';

export type MarketIntelligenceType =
  | 'MARKET_TREND'
  | 'CUSTOMER_PROBLEM'
  | 'CUSTOMER_DEMAND'
  | 'COMPETITOR'
  | 'COMPETITOR_CHANGE'
  | 'PRODUCT'
  | 'PRODUCT_LAUNCH'
  | 'PRICING_CHANGE'
  | 'CREATOR'
  | 'CONTENT_TREND'
  | 'TECHNOLOGY'
  | 'AI_DEVELOPMENT'
  | 'BUSINESS_MODEL'
  | 'INDUSTRY_CHANGE'
  | 'REGULATION'
  | 'MACRO_SIGNAL'
  | 'OPPORTUNITY'
  | 'RISK'
  | 'OTHER';

export type MarketFreshness =
  | 'FRESH'
  | 'RECENT'
  | 'AGING'
  | 'STALE'
  | 'UNKNOWN';

export interface MarketIntelligenceItem {
  id: string;
  type: MarketIntelligenceType;
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  sourceType: MarketSourceType;
  publishedAt?: string;
  retrievedAt: string;
  topic: string;
  market: string;
  audience?: string;
  entity?: string;
  tags: string[];
  rawData?: string;
  observation: string;
  analysis?: string;
  hypothesis?: string;
  confidence: number; // 0.0 - 1.0
  freshness: MarketFreshness;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED';
  provenance: DataProvenance;
  corroborationCount: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'DISPROVEN' | 'SUPERSEDED';
  relevance: 'CRITICAL' | 'HIGH' | 'IMPORTANT' | 'NORMAL' | 'BACKGROUND';
  businessImpact?: string;
  relatedGoals?: string[];
  relatedProjects?: string[];
  relatedProducts?: string[];
  relatedContent?: string[];
  relatedCustomers?: string[];
  relatedMemory?: string[];
  storyId?: string;
  whyRelevant?: string;
  epistemicLevel?: MarketEpistemicLevel;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface MarketStory {
  id: string;
  title: string;
  summary: string;
  topic: string;
  itemIds: string[];
  sourcesCount: number;
  independentSources: string[];
  firstSeenAt: string;
  lastUpdatedAt: string;
  status: 'ACTIVE' | 'RESOLVED' | 'ARCHIVED';
  confidence: number;
  corroborationLevel: 'SINGLE_SOURCE' | 'CORROBORATED' | 'STRONGLY_CORROBORATED';
  isDemo?: boolean;
}

export type TrendStatus =
  | 'EMERGING'
  | 'DEVELOPING'
  | 'ESTABLISHED'
  | 'WEAKENING'
  | 'UNKNOWN';

export interface MarketTrend {
  id: string;
  name: string;
  description: string;
  topic: string;
  market: string;
  status: TrendStatus;
  signalsCount: number;
  signalItemIds: string[];
  firstObserved: string;
  lastObserved: string;
  confidence: number;
  velocity: 'RAPID' | 'STEADY' | 'SLOW' | 'DECLINING';
  businessRelevance: 'HIGH' | 'MEDIUM' | 'LOW';
  strategicFitReason?: string;
  hypothesis: string;
  evidence: string[];
  isDemo?: boolean;
}

export interface CustomerProblem {
  id: string;
  problem: string;
  audience: string;
  context: string;
  frequency: 'RARE' | 'OCCASIONAL' | 'FREQUENT' | 'VERY_FREQUENT';
  evidence: string[];
  existingSolutions: string[];
  painIndicators: string[];
  potentialOpportunity: string;
  confidence: number;
  sourceItemIds: string[];
  relatedGoalId?: string;
  relatedProjectId?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export type CompetitorChangeType =
  | 'PRODUCT_LAUNCH'
  | 'PRICING_CHANGE'
  | 'FEATURE_UPDATE'
  | 'POSITIONING'
  | 'CONTENT_STRATEGY'
  | 'PARTNERSHIP'
  | 'TARGET_AUDIENCE'
  | 'MARKETING_CAMPAIGN'
  | 'WEBSITE_OFFER'
  | 'OTHER';

export interface CompetitorMovement {
  id: string;
  competitorName: string;
  changeType: CompetitorChangeType;
  whatChanged: string;
  whenOccurred: string;
  source: string;
  sourceUrl?: string;
  whyItMayMatter: string;
  evidence: string[];
  relatedBusinessArea: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceItemId?: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface MarketOpportunity {
  id: string;
  title: string;
  evidence: string[];
  reason: string;
  potentialUpside: string;
  requiredEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  uncertainty: 'LOW' | 'MEDIUM' | 'HIGH';
  strategicFit: 'HIGH' | 'MEDIUM' | 'LOW';
  relatedGoalId?: string;
  relatedProjectId?: string;
  relatedProductId?: string;
  nextValidationStep: string;
  hypothesis: string;
  sourceItemIds: string[];
  status: 'CANDIDATE' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  isDemo?: boolean;
}

export interface MarketRisk {
  id: string;
  title: string;
  marketChange: string;
  businessExposure: string;
  evidence: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  relatedGoalId?: string;
  relatedProjectId?: string;
  mitigationHypothesis?: string;
  sourceItemIds: string[];
  status: 'ACTIVE' | 'MITIGATED' | 'DISMISSED';
  createdAt: string;
  isDemo?: boolean;
}

export interface ResearchScope {
  query: string;
  targetMarkets?: string[];
  targetTopics?: string[];
  targetSources?: MarketSourceType[];
  timeHorizonDays?: number;
}

export interface ResearchResult {
  sessionId: string;
  query: string;
  scope: ResearchScope;
  sourcesConsulted: Array<{
    sourceId: string;
    name: string;
    status: MarketSourceAvailability;
    countFound: number;
  }>;
  itemsFound: MarketIntelligenceItem[];
  signalsCount: number;
  trendsIdentified: MarketTrend[];
  opportunitiesIdentified: MarketOpportunity[];
  risksIdentified: MarketRisk[];
  synthesizedAnalysis: string;
  epistemicSummary: {
    factsCount: number;
    observationsCount: number;
    hypothesesCount: number;
    unknownCount: number;
  };
  businessStateImpacts: Array<{
    targetType: 'PROJECT' | 'GOAL' | 'PRODUCT';
    targetId: string;
    targetTitle: string;
    previousAssessment: string;
    newAssessment: string;
    reason: string;
  }>;
  executedAt: string;
}

export interface MarketIntelligenceSnapshot {
  items: MarketIntelligenceItem[];
  stories: MarketStory[];
  trends: MarketTrend[];
  competitors: CompetitorMovement[];
  customerProblems: CustomerProblem[];
  opportunities: MarketOpportunity[];
  risks: MarketRisk[];
  recentChanges: string[];
  freshnessOverview: Record<MarketFreshness, number>;
  epistemicDistribution: Record<MarketEpistemicLevel, number>;
  sourcesStatus: Array<{
    id: string;
    name: string;
    type: string;
    status: MarketSourceAvailability;
    reliability: number;
  }>;
  dataSufficiency: DataSufficiency;
}

// ==========================================
// 21. STEP 6: CONTENT BRAIN & DISTRIBUTION CONTRACTS
// ==========================================

export type ContentStatus =
  | 'IDEA'
  | 'PLANNED'
  | 'BRIEF'
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type ContentIdeaStatus =
  | 'NEW'
  | 'VALIDATED'
  | 'PROMOTED'
  | 'PARKED'
  | 'DISCARDED';

export type ContentType =
  | 'SOCIAL_POST'
  | 'SHORT_VIDEO'
  | 'LONG_VIDEO'
  | 'CAROUSEL'
  | 'ARTICLE'
  | 'NEWSLETTER'
  | 'EMAIL'
  | 'SCRIPT'
  | 'EDUCATIONAL_POST';

export type ContentIdeaSourceType =
  | 'MANUAL'
  | 'MARKET_INTELLIGENCE'
  | 'UNIVERSAL_INBOX'
  | 'BUSINESS_MEMORY'
  | 'COMMUNITY'
  | 'TREND'
  | 'COMPETITOR'
  | 'CUSTOMER_PROBLEM';

export interface ContentIdea {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceType: ContentIdeaSourceType;
  status: ContentIdeaStatus;
  priority: PriorityLevel;
  topic: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  provenance: DataProvenance;
  confidence: number; // 0.0 - 1.0
  epistemicStatus: EpistemicStatus;
  linkedMarketIntelligenceIds: string[];
  linkedMemoryIds: string[];
  isDemo?: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  contentType: ContentType;
  format: string;
  status: ContentStatus;
  topic: string;
  body: string; // Draft / Content Body
  hook: string;
  cta: string;
  notes?: string;
  campaignId?: string;
  parentContentId?: string; // Repurposing parent-child hierarchy
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  publishedAt?: string;
  provenance: DataProvenance;
  confidence: number;
  epistemicStatus: EpistemicStatus;
  linkedIdeaId?: string;
  linkedMarketIntelligenceIds: string[];
  linkedMemoryIds: string[];
  targetPlatforms?: string[];
  timeEventId?: string; // Integrated with Time OS time_events
  isDemo?: boolean;
}

export interface ContentVariant {
  id: string;
  parentContentId: string;
  platform: string; // e.g. TikTok, Instagram, YouTube, LinkedIn, X, Discord, Website, Newsletter
  format: string;
  title: string;
  body: string;
  hook: string;
  cta: string;
  status: ContentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface ContentPlatform {
  id: string;
  name: string;
  enabled: boolean;
  supportedFormats: string[];
  metadata?: Record<string, unknown>;
}

export type ContentPublicationStatus =
  | 'PLANNED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export interface ContentPerformance {
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  leads?: number | null;
  conversions?: number | null;
  recordedAt?: string | null;
}

export interface ContentPublication {
  id: string;
  contentId: string;
  variantId?: string;
  platform: string;
  status: ContentPublicationStatus;
  scheduledAt: string;
  publishedAt?: string;
  externalId?: string;
  externalUrl?: string;
  timeEventId?: string; // Integrated with Time OS
  performance?: ContentPerformance | null; // Prepared for future Analytics Engine
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface ContentCampaign {
  id: string;
  name: string;
  description: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface ContentDomainState {
  totalIdeas: number;
  totalDrafts: number;
  inReviewCount: number;
  scheduledCount: number;
  publishedCount: number;
  backlogCount: number;
  activeContentVelocity: number;
  platformsCount: number;
  dataSufficiency: DataSufficiency;
}

export interface ContentSnapshot {
  ideas: ContentIdea[];
  items: ContentItem[];
  variants: ContentVariant[];
  platforms: ContentPlatform[];
  publications: ContentPublication[];
  campaigns: ContentCampaign[];
  metrics: ContentDomainState;
}


