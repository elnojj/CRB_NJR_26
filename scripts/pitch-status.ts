import { verifyPitchBeats } from '../src/three/beats/pitchVerification';

const report = verifyPitchBeats();
for (const row of report) {
  console.log(`${String(row.index + 1).padStart(2, '0')} ${row.jId} ${row.name} [${row.status.toUpperCase()}]`);
  for (const blocker of row.blockers) console.log(`    blocker: ${blocker}`);
  for (const item of row.pending) console.log(`    pending: ${item}`);
  for (const note of row.notes) console.log(`    note: ${note}`);
}
const count = (status: string): number => report.filter((r) => r.status === status).length;
console.log(`\n${count('ready')} ready, ${count('pending-media')} pending media, ${count('blocked')} blocked of ${report.length}`);
