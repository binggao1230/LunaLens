export type EphemerisMetadata = {
  start: string;
  stepSeconds: number;
  count: number;
};

export class Ephemeris {
  constructor(buffer: ArrayBuffer, metadata: EphemerisMetadata);
  readonly n: number;
  readonly t0: number;
  readonly stepMs: number;
  readonly tEnd: number;
  indexOf(milliseconds: number): number;
  timeOf(index: number): number;
  clampIndex(index: number): number;
  stateAt(index: number, output?: Float64Array): Float64Array;
}
