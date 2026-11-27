// @ts-check
// The balance test (Endringsprompt 6, section 7): the automatic test player plays many rounds with different run
// seeds and characters, at full speed and with no drawing, and reports how long they last, when the combinations
// come, the level pace, help per second per weapon and combination, how often each boss fires the player, the capture
// points taken, and how often every card is offered.
// Run:  node tools/bot-test.js [rounds] [date]      (or: powershell -File tools/node.ps1 tools/bot-test.js)
//   --god      only the good bot (skill 0.9)      --ekspert   only the expert bot (skill 1)
//   --json=fil also writes every round to a JSON file
import fs from 'node:fs';
import { CONFIG } from '../js/config.js';
import { playBotRound, botReport, testSeed } from '../js/bot.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const n = Number(args[0] || CONFIG.botTest.rounds);
const date = args[1] || '2026-11-27';
const groups = process.argv.includes('--god') ? [['God spiller', 0.9]] : process.argv.includes('--ekspert') ? [['Ekspert', 1]] : [['God spiller', 0.9], ['Ekspert', 1]];
const json = process.argv.find((a) => a.startsWith('--json='))?.slice(7);

const all = {};
const start = Date.now();
for (const [name, skill] of groups) {
  const rounds = [];
  for (let i = 0; i < n; i++) {
    rounds.push(playBotRound({ date, character: i % CONFIG.characters.length, runSeed: testSeed(i), skill: /** @type {number} */ (skill) }));
    if ((i + 1) % 20 === 0) process.stderr.write(`  ${name}: ${i + 1}/${n}\n`);
  }
  all[name] = rounds;
  console.log(botReport(rounds, `${name} (ferdighet ${skill})`));
  console.log('');
}
console.log(`(${Math.round((Date.now() - start) / 1000)} s, dagens vakt ${date})`);
if (json) fs.writeFileSync(json, JSON.stringify(all));
