import type { Ephemeris } from './ephemeris.js';

export type SiteDefinition = {
  id: string;
  name: string;
  group: string;
  lat: number;
  lon: number;
  source: string;
  terrain: string;
  groundM: number | null;
  horizon: number[] | null;
};

export type SiteSeries = {
  n: number;
  sunVis: Uint8Array;
  earthVis: Uint8Array;
  sunEl: Float32Array;
  earthEl: Float32Array;
  sunAz: Float32Array;
  earthAz: Float32Array;
  sunHor: Float32Array;
  earthHor: Float32Array;
  sunClr: Float32Array;
  earthClr: Float32Array;
};

export class Site {
  constructor(raw: SiteDefinition, ephemeris: Ephemeris);
  readonly eph: Ephemeris;
  readonly series: SiteSeries;
  readonly hasTerrain: boolean;
  horizonAt(azimuthDegrees: number): number;
  maxHorizon(): number;
}
