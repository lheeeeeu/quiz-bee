// Automated end-to-end test script for SQLite-backed Quiz Bee Competition System
import { Database, db } from './db.js';
import { GameEngine } from './game-engine.js';

console.log('🧪 Starting End-to-End Cumulative Scoring & Portal Auth Verification...\n');

const mockIo = { emit: () => {} };
const engine = new GameEngine(mockIo);
engine.resetCompetition();

const dbInfo = db.getDatabaseInfo();
console.log(`✓ Step 1: SQLite DB initialized at ${dbInfo.file} (${dbInfo.counts.categories} rounds, ${dbInfo.counts.questions} questions, ${dbInfo.counts.teams} schools).`);

// Step 2: Q1 Correct (+3 pts) -> Total = 3
const q1 = db.getQuestion('q-easy-1');
engine.displayQuestion(q1.id);
engine.startTimer();
engine.submitAnswer('team-1', q1.id, 'Bit');
engine.submitAnswer('team-2', q1.id, 'Byte');
engine.expireTimer();

let lb = db.getLeaderboard();
if (lb.find(t => t.team_id === 'team-1').total_points !== 3) throw new Error('Group 1 should have 3 pts after Q1');
console.log('✓ Step 2: Group 1 got Q1 right -> Total = 3 pts.');

// Step 3: Q2 Correct (+3 pts) -> Cumulative Total = 6 pts (3 + 3)
const q2 = db.getQuestion('q-easy-2');
engine.displayQuestion(q2.id);
engine.startTimer();
engine.submitAnswer('team-1', q2.id, 'DNS');
engine.expireTimer();

lb = db.getLeaderboard();
const easyMatrix = db.getRoundMatrix('cat-easy');
const g1Easy = easyMatrix.rows.find(r => r.team_id === 'team-1');
if (lb.find(t => t.team_id === 'team-1').total_points !== 6 || g1Easy.total_points !== 6) {
  throw new Error(`Expected cumulative 6 pts (3 + 3), got lb=${lb.find(t => t.team_id === 'team-1').total_points}, matrix=${g1Easy.total_points}`);
}
console.log('✓ Step 3: Group 1 got Q2 right -> Cumulative Total = 6 pts (3 + 3) in Leaderboard & Round Matrix.');

// Step 4: Average Round Q1 (+5 pts) -> Cumulative Total = 11 pts (6 prev + 5 avg)
const qAvg1 = db.getQuestion('q-avg-1');
engine.displayQuestion(qAvg1.id);
engine.startTimer();
engine.submitAnswer('team-1', qAvg1.id, 'O(log n)');
engine.expireTimer();

lb = db.getLeaderboard();
const avgMatrix = db.getRoundMatrix('cat-avg');
const g1Avg = avgMatrix.rows.find(r => r.team_id === 'team-1');
if (lb.find(t => t.team_id === 'team-1').total_points !== 11 || g1Avg.previous_points !== 6 || g1Avg.total_points !== 11) {
  throw new Error(`Expected cumulative 11 pts (6 prev + 5 avg), got prev=${g1Avg.previous_points}, total=${g1Avg.total_points}`);
}
console.log('✓ Step 4: Cross-round cumulative verified -> Prev=6, Avg=+5, Cumulative Total=11 pts.');

// Step 5: Admin Group Code Generation (single & batch unique codes)
const regenerated = db.regenerateTeamCode('team-1');
if (!regenerated.code || regenerated.code === 'T01') throw new Error('Expected new generated code for team-1');
const allTeams = db.regenerateAllTeamCodes();
const uniqueCodes = new Set(allTeams.map(t => t.code));
if (uniqueCodes.size !== allTeams.length) throw new Error('Generated group codes must all be unique');
console.log(`✓ Step 5: Generated unique group codes for all ${allTeams.length} groups (sample: ${allTeams[0].code}, ${allTeams[1].code}).`);

// Step 6: Verify SQLite persistence across fresh connection
const freshDb = new Database();
if (freshDb.getLeaderboard().find(t => t.team_id === 'team-1').total_points !== 11) {
  throw new Error('Cumulative score did not persist across SQLite reopen');
}
console.log('✓ Step 6: Verified SQLite disk persistence across restart.');

// Restore spotless defaults for live use
engine.resetCompetition();
console.log('\n🎉 ALL CUMULATIVE SCORING, CODE GENERATION & SQLITE TESTS PASSED!\n');
