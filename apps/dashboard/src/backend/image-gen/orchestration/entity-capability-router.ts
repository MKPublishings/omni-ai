import blackwellAgentProfilesConfig from '../../../config/blackwell-agent-profiles.json';
import type { AgentProfile, Department, Priority } from '../../mind/contracts/taskShardContracts';
import { generateTaskShards } from '../../tools/auto_tokenizer/taskShardGenerator';
import type {
  ImageGenerationPriority,
  IonImageExecutionCapability,
  IonImageExecutionPlan,
  ParsedIntent,
  StyleFamilyId,
  UserInput,
} from '../shared/types';

const CAPABILITY_BY_DEPARTMENT: Record<Department, IonImageExecutionCapability> = {
  Infra: 'infrastructure',
  Creative: 'prompt-engineering',
  Ops: 'render',
  Research: 'simulation',
  Finance: 'cost-optimization',
};

function mapPriority(priority: ImageGenerationPriority | undefined): Priority {
  if (priority === 'retry') {
    return 'critical';
  }
  if (priority === 'interactive') {
    return 'high';
  }
  return 'normal';
}

function toDepartmentSet(input: {
  styleFamily: StyleFamilyId;
  anatomyStrictMode: boolean;
  variationMode: UserInput['variationMode'];
}): Department[] {
  const departments = new Set<Department>(['Infra', 'Ops', 'Creative']);

  if (input.anatomyStrictMode || input.variationMode === 'high') {
    departments.add('Research');
  }

  if (input.styleFamily === 'semi_realistic_2_5d' || input.styleFamily === 'gritty_seinen') {
    departments.add('Finance');
  }

  return Array.from(departments);
}

function parseProfilesFromConfig(): AgentProfile[] {
  const root = blackwellAgentProfilesConfig as { agents?: unknown };
  const agents = Array.isArray(root.agents) ? root.agents : [];

  return agents
    .map((agent): AgentProfile | null => {
      const record = agent as Record<string, unknown>;
      const id = String(record.id || '').trim();
      const role = String(record.role || '').trim();
      const department = String(record.department || '').trim();
      const ritual = String(record.ritual || '').trim();
      const handoffTargets = Array.isArray(record.handoff_targets)
        ? record.handoff_targets
            .map((target) => String(target || '').trim())
            .filter(Boolean)
        : [];

      const roleValid = role === 'Engineer' || role === 'Synthesizer' || role === 'Archivist' || role === 'Analyst' || role === 'Manager';
      const departmentValid =
        department === 'Research' ||
        department === 'Ops' ||
        department === 'Finance' ||
        department === 'Creative' ||
        department === 'Infra' ||
        department === 'All';

      if (!id || !roleValid || !departmentValid || !ritual) {
        return null;
      }

      return {
        id,
        role: role as AgentProfile['role'],
        department: department as AgentProfile['department'],
        ritual,
        handoff_targets: handoffTargets,
      };
    })
    .filter((profile): profile is AgentProfile => Boolean(profile));
}

const FALLBACK_PROFILES: AgentProfile[] = [
  {
    id: 'agent.engineer.blackwell',
    role: 'Engineer',
    department: 'Infra',
    ritual: 'Forge execution paths and preserve deterministic output contracts.',
    handoff_targets: ['agent.conductor.blackwell'],
  },
  {
    id: 'agent.conductor.blackwell',
    role: 'Manager',
    department: 'Ops',
    ritual: 'Maintain orchestration continuity and avoid queue starvation.',
    handoff_targets: ['agent.engineer.blackwell'],
  },
];

function resolveProfiles(): AgentProfile[] {
  const fromConfig = parseProfilesFromConfig();
  return fromConfig.length > 0 ? fromConfig : FALLBACK_PROFILES;
}

function makeWorkstreams(intent: ParsedIntent, departments: Department[]): string[] {
  return departments.map((department) => {
    if (department === 'Infra') {
      return `Provision render lane for ${intent.subject} with resilient checkpoint fallback.`;
    }
    if (department === 'Ops') {
      return `Execute queue-safe render workflow for ${intent.action || 'scene assembly'}.`;
    }
    if (department === 'Creative') {
      return `Refine style and prompt composition for ${intent.mood || 'coherent'} mood.`;
    }
    if (department === 'Research') {
      return `Run simulation-assisted anatomy consistency checks for ${intent.subject}.`;
    }

    return `Optimize token and compute budget for ${intent.setting || 'image generation task'}.`;
  });
}

export function buildIonImageExecutionPlan(input: {
  userInput: UserInput;
  styleFamily: StyleFamilyId;
  intent: ParsedIntent;
  maxConcurrentJobs: number;
}): IonImageExecutionPlan {
  const departments = toDepartmentSet({
    styleFamily: input.styleFamily,
    anatomyStrictMode: Boolean(input.userInput.anatomyStrictMode),
    variationMode: input.userInput.variationMode,
  });
  const priority = mapPriority(input.userInput.priority);
  const workstreams = makeWorkstreams(input.intent, departments);
  const profiles = resolveProfiles();

  const generation = generateTaskShards(
    {
      title: `ION image generation for ${input.userInput.userId}`,
      department: 'Ops',
      priority,
      summary: `Orchestrate image generation with cross-entity support for prompt: ${input.userInput.prompt}`,
      input_payload: {
        prompt: input.userInput.prompt,
        styleFamily: input.styleFamily,
        anatomyStrictMode: Boolean(input.userInput.anatomyStrictMode),
        variationMode: input.userInput.variationMode || 'off',
        objectives: workstreams,
        workstreams,
      },
      legacy_weight: 1,
      created_by: 'agent.conductor.blackwell',
    },
    profiles,
  );

  const entities = generation.assignmentPlan.map((assignment) => {
    const shard = generation.shards.find((candidate) => candidate.id === assignment.shard_id);
    const department = shard?.department || 'Ops';
    const capability = CAPABILITY_BY_DEPARTMENT[department] || 'render';

    return {
      agentId: assignment.assigned_agent_id,
      role: assignment.role,
      department,
      capability,
      shardId: assignment.shard_id,
      rationale: shard?.summary || 'Assigned by ION shard planner.',
    };
  });

  const uniqueCapabilities = Array.from(new Set(entities.map((entity) => entity.capability)));

  return {
    ticketId: generation.ticket.id,
    planner: 'blackwell-shard-router',
    priority,
    departments,
    capabilities: uniqueCapabilities,
    estimatedParallelism: Math.max(1, Math.min(input.maxConcurrentJobs, entities.length || 1)),
    simulationSupportEnabled: departments.includes('Research'),
    entities,
  };
}
