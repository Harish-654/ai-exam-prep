const { loadRecent } = require('./memory');

const HOUR_MS = 60 * 60 * 1000;

const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_past_plans',
      description:
        'Retrieve summaries of previously generated study plans (file name, total hours, module titles) so this plan can stay consistent with earlier sessions.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'How many recent plans to return (1-10). Defaults to 5.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compute_study_schedule',
      description:
        'Compute real study session date slots for a number of hours, starting tomorrow at 09:00. Use this when you need concrete dates for the plan.',
      parameters: {
        type: 'object',
        properties: {
          totalHours: { type: 'number', description: 'Total hours to schedule.' },
          hoursPerDay: { type: 'number', description: 'Hours available per day. Defaults to 2.' },
        },
        required: ['totalHours'],
      },
    },
  },
];

function computeStudySchedule({ totalHours, hoursPerDay } = {}) {
  const total = Number(totalHours);
  if (!Number.isFinite(total) || total <= 0) {
    return { error: 'totalHours must be a positive number' };
  }
  const perDay = Number(hoursPerDay) > 0 ? Number(hoursPerDay) : 2;

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);

  const slots = [];
  let remaining = total;
  let dayOffset = 0;
  while (remaining > 0 && slots.length < 60) {
    const hours = Math.min(perDay, remaining);
    const slotStart = new Date(start.getTime());
    slotStart.setDate(start.getDate() + dayOffset);
    const slotEnd = new Date(slotStart.getTime() + hours * HOUR_MS);
    slots.push({
      day: dayOffset + 1,
      date: slotStart.toISOString().slice(0, 10),
      startISO: slotStart.toISOString(),
      endISO: slotEnd.toISOString(),
      hours,
    });
    remaining = Math.round((remaining - hours) * 100) / 100;
    dayOffset += 1;
  }

  return { totalHours: total, hoursPerDay: perDay, days: slots.length, slots };
}

async function runTool(name, args = {}) {
  switch (name) {
    case 'get_past_plans':
      return { plans: loadRecent(args.limit) };
    case 'compute_study_schedule':
      return computeStudySchedule(args);
    default:
      return { error: 'Unknown tool: ' + name };
  }
}

module.exports = { toolDefinitions, runTool, computeStudySchedule };
