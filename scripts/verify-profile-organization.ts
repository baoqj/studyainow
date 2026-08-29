import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../functions/api/profile/index.ts', import.meta.url), 'utf8');

for (const field of ['users.organization_role', 'users.organization_joined_at', 'organizations.name AS organization_name', 'organizations.public_id AS organization_public_id']) {
  assert.match(source, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `profile response must include ${field}`);
}
assert.match(source, /LEFT JOIN organizations ON organizations\.id = users\.organization_id/, 'profile organization data must remain user-owned through the organization foreign key');
assert.equal((source.match(/LEFT JOIN organizations ON organizations\.id = users\.organization_id/g) ?? []).length, 2, 'both GET and PUT responses must preserve organization data');

console.log(JSON.stringify({ profileOrganizationFields: true, getAndUpdateResponses: true }, null, 2));
