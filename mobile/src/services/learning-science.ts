import ephemerisData from '../../../site/data/ephemeris.json';
import sitesData from '../../../site/data/sites.json';
import ephemerisUrl from '../../../site/data/ephemeris.f64?url';
import { Ephemeris } from '../../../site/js/engine/ephemeris.js';
import { Site } from '../../../site/js/engine/site.js';

export type LearningSite = {
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

export type DailyResult = {
  site: LearningSite;
  date: string;
  samples: Array<{ hour: number; sunlight: boolean; earthVisible: boolean }>;
  sunlightHours: number;
  earthVisibleHours: number;
  overlapHours: number;
  coverage: { start: string; end: string };
};

type EphemerisMetadata = { start: string; stepSeconds: number; count: number };
type SitesMetadata = { sites: LearningSite[] };

const metadata = ephemerisData as EphemerisMetadata;
const siteCatalog = sitesData as SitesMetadata;
let ephemerisPromise: Promise<InstanceType<typeof Ephemeris>> | undefined;

async function loadEphemeris() {
  ephemerisPromise ??= fetch(ephemerisUrl)
    .then((response) => {
      if (!response.ok) throw new Error('The offline lunar data could not be loaded.');
      return response.arrayBuffer();
    })
    .then((buffer) => new Ephemeris(buffer, metadata));
  return ephemerisPromise;
}

export function getLearningSites() {
  return siteCatalog.sites.filter((site) => site.id === 'apollo11' || site.id === 'shackleton-rim');
}

export async function getDailyResult(siteId: string, date: string): Promise<DailyResult> {
  const rawSite = getLearningSites().find((site) => site.id === siteId);
  if (!rawSite) throw new Error('Choose one of the available learning sites.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a valid UTC date.');

  const startMs = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(startMs) || new Date(startMs).toISOString().slice(0, 10) !== date) {
    throw new Error('Choose a valid calendar date.');
  }
  const dayEnd = startMs + 24 * 60 * 60 * 1000;
  const dataStart = Date.parse(metadata.start);
  const dataEnd = dataStart + (metadata.count - 1) * metadata.stepSeconds * 1000;
  if (startMs < dataStart || dayEnd - 60 * 60 * 1000 > dataEnd) {
    throw new Error(`Choose a date within the available data: ${metadata.start.slice(0, 10)} to ${new Date(dataEnd).toISOString().slice(0, 10)}.`);
  }

  const ephemeris = await loadEphemeris();
  const site = new Site(rawSite, ephemeris);
  const firstIndex = Math.round(ephemeris.indexOf(startMs));
  const series = site.series;
  const samples = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    sunlight: series.sunVis[firstIndex + hour] === 1,
    earthVisible: series.earthVis[firstIndex + hour] === 1,
  }));
  const sunlightHours = samples.filter((sample) => sample.sunlight).length;
  const earthVisibleHours = samples.filter((sample) => sample.earthVisible).length;
  const overlapHours = samples.filter((sample) => sample.sunlight && sample.earthVisible).length;

  return {
    site: rawSite,
    date,
    samples,
    sunlightHours,
    earthVisibleHours,
    overlapHours,
    coverage: { start: metadata.start.slice(0, 10), end: new Date(dataEnd).toISOString().slice(0, 10) },
  };
}
