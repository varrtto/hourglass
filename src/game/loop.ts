export const FIXED_DT = 1 / 60;
const MAX_STEPS = 5;

export function consumeFixedSteps(
  accumulator: number,
  dt: number,
  paused: boolean,
  step: (dt: number) => void,
): number {
  let acc = accumulator + dt;
  let steps = 0;
  while (acc >= FIXED_DT && steps < MAX_STEPS) {
    if (!paused) step(FIXED_DT);
    acc -= FIXED_DT;
    steps += 1;
  }
  if (acc > FIXED_DT * 2) acc = 0;
  return acc;
}
