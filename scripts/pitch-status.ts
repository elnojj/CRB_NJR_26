import { verifyPitchBeats } from '../src/three/beats/pitchVerification';

const report = verifyPitchBeats();
for (const row of report) {
  console.log(`${String(row.index + 1).padStart(2, '0')} ${row.jId} ${row.name} [${row.status.toUpperCase()}]`);
  for (const blocker of row.blockers) console.log(`    blocker: ${blocker}`);
  for (const note of row.notes) console.log(`    note: ${note}`);
}
const blocked = report.filter((r) => r.status === 'blocked').length;
console.log(`\n${report.length - blocked} ready, ${blocked} blocked of ${report.length}`);
