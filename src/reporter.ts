import pc from 'picocolors';
import { SuiteResult, TestResult } from './types.js';

export function printSuiteResult(result: SuiteResult, verbose: boolean = false): void {
  console.log('\n' + pc.bold(pc.cyan('============================================================')));
  console.log(pc.bold(` MCP Cross-Client Suite: ${pc.white(result.suiteName)}`));
  console.log(pc.bold(pc.cyan('============================================================')));

  // Group by test name
  const testsByName = new Map<string, TestResult[]>();
  for (const r of result.results) {
    if (!testsByName.has(r.testName)) {
      testsByName.set(r.testName, []);
    }
    testsByName.get(r.testName)!.push(r);
  }

  for (const [testName, clientResults] of testsByName.entries()) {
    console.log(`\n${pc.bold('Test:')} ${pc.white(testName)}`);

    for (const cr of clientResults) {
      const clientLabel = cr.client.toUpperCase().padEnd(8);
      const transportLabel = `(${cr.transport})`.padEnd(8);
      const duration = pc.dim(`${cr.durationMs}ms`);

      if (cr.passed) {
        console.log(`  ${pc.green('✔')} ${pc.bold(clientLabel)} ${pc.dim(transportLabel)} ${duration}`);
      } else {
        console.log(`  ${pc.red('✖')} ${pc.bold(pc.red(clientLabel))} ${pc.dim(transportLabel)} ${duration}`);
        if (cr.error) {
          const indentedError = cr.error
            .split('\n')
            .map(line => `      ${pc.red(line)}`)
            .join('\n');
          console.log(indentedError);
        }

        if (cr.details?.argumentsSent) {
          console.log(pc.yellow(`      Arguments sent by client LLM:`));
          console.log(pc.dim(`      ${JSON.stringify(cr.details.argumentsSent, null, 2).replace(/\n/g, '\n      ')}`));
        }
      }

      if (verbose && cr.details?.rawResponse) {
        console.log(pc.dim(`      Response: ${JSON.stringify(cr.details.rawResponse)}`));
      }
    }
  }

  console.log('\n' + pc.bold(pc.cyan('------------------------------------------------------------')));
  const passStr = pc.green(`${result.passed} passed`);
  const failStr = result.failed > 0 ? pc.red(`${result.failed} failed`) : `${result.failed} failed`;
  const totalStr = `${result.total} total`;
  const timeStr = pc.dim(`(${result.durationMs}ms)`);

  console.log(pc.bold(` Results: ${passStr}, ${failStr}, ${totalStr} ${timeStr}`));
  console.log(pc.bold(pc.cyan('============================================================\n')));
}
