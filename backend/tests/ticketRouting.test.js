const assert = require('assert/strict');

process.env.GEMINI_API_KEY = '';
process.env.API_KEY = '';

const { chooseAssignee, eligibleRoutingAdmins } = require('../lib/ticketRouting');

async function TestV1_LuminaAINeverAssignee() {
  const ticket = {
    id: 'ticket-1',
    title: 'Route me',
    description: 'A ticket that must go to a real admin.',
    type: 'software',
    priority: 'P4',
  };
  const admins = [
    {
      id: 'lumina-ai',
      email: 'lumina.ai@lumina.test',
      first_name: 'Lumina',
      last_name: 'AI',
      p1_count: 0,
      p2_count: 0,
      p3_count: 0,
      p4_count: 0,
      total_open: 0,
      load_score: 0,
    },
    {
      id: 'real-admin',
      email: 'manager.ian@lumina.test',
      first_name: 'Sage',
      last_name: 'Software',
      p1_count: 2,
      p2_count: 2,
      p3_count: 2,
      p4_count: 2,
      total_open: 8,
      load_score: 12,
    },
  ];

  assert.deepEqual(eligibleRoutingAdmins(admins).map((admin) => admin.id), ['real-admin']);

  const routing = await chooseAssignee(ticket, admins);
  assert.equal(routing.assignedAdminId, 'real-admin');
  assert.notEqual(routing.assignedAdminId, 'lumina-ai');
}

TestV1_LuminaAINeverAssignee()
  .then(() => {
    console.log('TestV1_LuminaAINeverAssignee passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
