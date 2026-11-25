import { describeHumanVerifierContract } from './human-verifier.contract';
import { InMemoryHumanVerifier } from './in-memory-human-verifier';

describeHumanVerifierContract('in-memory', () => {
  const verifier = new InMemoryHumanVerifier();
  return { verifier, humanToken: () => verifier.issue(), cleanup: () => undefined };
});
