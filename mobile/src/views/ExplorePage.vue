<template>
  <ion-page>
    <ion-content :fullscreen="true" class="lesson-content">
      <main class="shell" aria-labelledby="page-title">
        <header class="topline">
          <router-link class="brand" to="/" :aria-label="t('Explore the Moon')">
            <img class="brand-logo" src="/lunalens-logo.svg" alt="" />
            <span>LunaLens <span class="brand-subtitle">LEARN</span></span>
          </router-link>
          <ion-select
            class="language-select"
            :value="language"
            :aria-label="t('Choose language')"
            interface="popover"
            @ion-change="setLanguage($event.detail.value)"
          >
            <ion-select-option value="fr">FR</ion-select-option>
            <ion-select-option value="en">EN</ion-select-option>
            <ion-select-option value="zh">简中</ion-select-option>
          </ion-select>
        </header>

        <section class="hero" aria-labelledby="page-title">
          <p class="eyebrow">{{ t('Lunar exploration') }}</p>
          <h1 id="page-title">{{ t('Explore the Moon') }}</h1>
          <p class="intro">{{ t('Choose a place and a UTC date.') }}</p>
          <div class="moon-art" role="img" :aria-label="t('Lunar horizon illustration')">
            <div class="moon-sky">
              <span class="star star-one" aria-hidden="true"></span
              ><span class="star star-two" aria-hidden="true"></span
              ><span class="earth" aria-hidden="true"><span></span></span
              ><span class="earth-label">{{ t('Earth') }}</span>
            </div>
            <div class="moon-ground"><span class="ridge ridge-back"></span><span class="ridge ridge-front"></span></div>
            <span class="art-caption">{{ t('Moon surface view') }}</span>
          </div>
        </section>

        <section class="choice-card" aria-labelledby="choose-title">
          <div class="section-heading">
            <span class="step-number" aria-hidden="true">1</span>
            <div>
              <p class="eyebrow">{{ t('Start exploring') }}</p>
              <h2 id="choose-title">{{ t('Lunar exploration') }}</h2>
            </div>
          </div>

          <div class="form-grid">
            <ion-item class="field" lines="none">
              <ion-label position="stacked" for="site-choice">{{ t('Lunar place') }}</ion-label>
              <ion-select
                id="site-choice"
                v-model="selectedSite"
                interface="action-sheet"
                :aria-label="t('Lunar place')"
              >
                <ion-select-option v-for="site in learningSites" :key="site.id" :value="site.id">{{
                  t(site.id)
                }}</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item class="field" lines="none">
              <ion-label position="stacked" for="landing-date">{{ t('Day (UTC)') }}</ion-label>
              <ion-input
                id="landing-date"
                v-model="selectedDate"
                type="date"
                min="2026-01-01"
                max="2030-12-31"
                :aria-label="t('Day (UTC)')"
              ></ion-input>
            </ion-item>
          </div>

          <p class="field-hint" id="date-hint">{{ t('Data: 2026–2030 · day starts at 00:00 UTC') }}</p>
          <ion-button expand="block" class="start-button" :disabled="loading" @click="openLesson">
            {{ loading ? t('Loading lunar data…') : t('Show me this day') }}
            <span class="button-arrow" aria-hidden="true">→</span>
          </ion-button>
          <p v-if="errorMessage" class="error-note" role="alert">{{ errorMessage }}</p>
        </section>

        <details v-if="selectedSiteInfo" class="site-details">
          <summary>{{ t('About this place') }} <span class="expand-mark" aria-hidden="true">+</span></summary>
          <div class="site-details-body">
            <p>
              <strong>{{ t(selectedSiteInfo.group) }}</strong>
            </p>
            <p>
              <strong>{{ t('Coordinates') }}:</strong> {{ siteCoordinates }}
            </p>
            <p>{{ t('Approximate reference point; not a certified landing coordinate.') }}</p>
            <p>
              <strong>{{ t('Terrain horizon') }}:</strong> {{ selectedTerrainDescription }}
            </p>
            <p>
              {{
                t(
                  'Terrain profiles summarize regional ground shape at the source resolution. They are not precise landing-point measurements.',
                )
              }}
            </p>
            <p class="site-source">
              <strong>{{ t('Source') }}:</strong> {{ selectedSiteInfo.source }}
            </p>
          </div>
        </details>

        <section v-if="dailyResult" class="results-card" aria-labelledby="results-title" aria-live="polite">
          <div class="section-heading">
            <span class="step-number step-number-complete" aria-hidden="true">2</span>
            <div>
              <p class="eyebrow">{{ t('Your lunar day') }}</p>
              <h2 id="results-title">{{ t(displaySiteName) }}</h2>
            </div>
          </div>
          <p class="result-date">{{ dailyResult.date }} · 00:00–23:00 UTC</p>

          <div class="result-grid">
            <article class="result-item sunlight-result">
              <span class="result-icon" aria-hidden="true">☼</span>
              <h3>{{ t('Sunlight') }}</h3>
              <p class="result-number">
                {{ dailyResult.sunlightHours }} <span>{{ t('hours of 24') }}</span>
              </p>
              <p>{{ t('Hours when the Sun clears the modeled horizon.') }}</p>
              <details class="result-more">
                <summary>{{ t('Why does sunlight matter?') }}</summary>
                <p>
                  {{
                    t(
                      'Sunlight can provide energy, but hills can cast long shadows. Near the poles the Sun stays low, so small changes in terrain matter.',
                    )
                  }}
                </p>
              </details>
            </article>
            <article class="result-item earth-result">
              <span class="result-icon" aria-hidden="true">◎</span>
              <h3>{{ t('Earth in view') }}</h3>
              <p class="result-number">
                {{ dailyResult.earthVisibleHours }} <span>{{ t('hours of 24') }}</span>
              </p>
              <p>{{ t('Hours when Earth’s centre is above the modeled horizon.') }}</p>
              <details class="result-more">
                <summary>{{ t('What does “Earth in view” mean?') }}</summary>
                <p>
                  {{
                    t(
                      'A straight geometric view to Earth clears the modeled horizon. This does not check antennas, signal strength, or a full radio link.',
                    )
                  }}
                </p>
              </details>
            </article>
            <article class="result-item overlap-result">
              <span class="result-icon" aria-hidden="true">↗</span>
              <h3>{{ t('Together') }}</h3>
              <p class="result-number">
                {{ dailyResult.overlapHours }} <span>{{ t('hours of 24') }}</span>
              </p>
              <p>{{ t('Hours when both are true at once.') }}</p>
              <details class="result-more">
                <summary>{{ t('Why look at both?') }}</summary>
                <p>
                  {{
                    t(
                      'A mission may need sunlight and a direct view of Earth at the same time. This overlap is a helpful clue, not a mission guarantee.',
                    )
                  }}
                </p>
              </details>
            </article>
          </div>

          <div class="timeline-block">
            <h3>{{ t('Hourly sunlight and Earth view') }}</h3>
            <p class="timeline-key">
              <span class="key-sun" aria-hidden="true">☼</span> {{ t('Sunlight') }}
              <span class="key-earth" aria-hidden="true">◎</span> {{ t('Earth in view') }}
            </p>
            <ol class="timeline" :aria-label="t('Hourly sunlight and Earth view')">
              <li v-for="sample in dailyResult.samples" :key="sample.hour" class="timeline-hour">
                <span class="hour-label">{{ String(sample.hour).padStart(2, '0') }}</span>
                <span
                  class="hour-track"
                  :class="{
                    'has-sun': sample.sunlight,
                    'has-earth': sample.earthVisible,
                    'has-both': sample.sunlight && sample.earthVisible,
                  }"
                  aria-hidden="true"
                >
                  <span v-if="sample.sunlight">☼</span><span v-if="sample.earthVisible">◎</span
                  ><span v-if="!sample.sunlight && !sample.earthVisible">·</span>
                </span>
                <span class="sr-only"
                  >{{ String(sample.hour).padStart(2, '0') }}:00 UTC:
                  {{ sample.sunlight ? t('sunlight') : t('no sunlight') }},
                  {{ sample.earthVisible ? t('Earth in view') : t('Earth below the horizon') }}.</span
                >
              </li>
            </ol>
          </div>

          <details class="reading-note">
            <summary>
              {{ t('How to read the hourly timeline') }} <span class="expand-mark" aria-hidden="true">+</span>
            </summary>
            <p>
              {{
                t(
                  'Each square is one sample at the top of the hour in UTC. Sunlight counts when the Sun’s upper edge clears the modeled horizon. Earth counts when its centre clears the horizon. The totals count these 24 hourly samples.',
                )
              }}
            </p>
            <p>
              {{
                t(
                  'These are visibility estimates. They do not calculate temperature, available power, or a complete communications link.',
                )
              }}
            </p>
          </details>

          <details class="reflection-card">
            <summary>
              <span aria-hidden="true">✦</span> {{ t('Think like an explorer') }}
              <span class="expand-mark" aria-hidden="true">+</span>
            </summary>
            <p>
              {{
                t(
                  'What changed when you changed the place or day? Did sunlight and Earth in view change in the same way?',
                )
              }}
            </p>
          </details>

          <details class="temperature-note">
            <summary>{{ t('The app shows sunlight, not temperature') }}</summary>
            <p>
              {{
                t(
                  'The Moon’s surface can get very hot in sunlight and very cold in darkness. This app does not calculate a temperature for this site.',
                )
              }}
            </p>
            <a href="https://science.nasa.gov/moon/facts/" target="_blank" rel="noopener noreferrer"
              >{{ t('NASA Moon facts') }} ↗</a
            >
          </details>
          <p class="terrain-note">
            <strong>{{ t('Terrain') }}:</strong> {{ terrainNote }} <strong>{{ t('Data coverage') }}:</strong>
            {{ dailyResult.coverage.start }}–{{ dailyResult.coverage.end }}.
          </p>
          <p class="terrain-note">
            <strong>{{ t('Coordinates and site source') }}:</strong> {{ dailyResult.site.source }}.
            <strong>{{ t('Source') }}:</strong> NASA/JPL Horizons (DE441)
            <a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noopener noreferrer">↗</a>.
          </p>
        </section>

        <footer class="page-footer">
          <a href="https://luna-lens.gaobing1230.workers.dev" target="_blank" rel="noopener noreferrer"
            >{{ t('Full LunaLens website') }} <span class="external-hint">↗</span></a
          >
        </footer>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonButton, IonContent, IonInput, IonItem, IonLabel, IonPage, IonSelect, IonSelectOption } from '@ionic/vue';
import { getDailyResult, getLearningSites, type DailyResult } from '../services/learning-science';
import { useLanguage } from '../i18n';

const { language, setLanguage, t } = useLanguage();
const learningSites = getLearningSites();
const selectedSite = ref('apollo11');
const selectedDate = ref('2027-01-01');
const dailyResult = ref<DailyResult | null>(null);
const loading = ref(false);
const errorMessage = ref('');

const selectedSiteInfo = computed(() => learningSites.find((site) => site.id === selectedSite.value));
const displaySiteName = computed(() => dailyResult.value?.site.id ?? selectedSite.value);
const siteCoordinates = computed(() => {
  const site = selectedSiteInfo.value;
  if (!site) return '';
  const locale = language.value === 'fr' ? 'fr-FR' : language.value === 'zh' ? 'zh-CN' : 'en-US';
  const lat = Math.abs(site.lat).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const lonDegrees = ((site.lon % 360) + 360) % 360;
  const lon = lonDegrees.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${lat}° ${site.lat < 0 ? 'S' : 'N'}, ${lon}° E`;
});
const selectedTerrainDescription = computed(() => {
  const site = selectedSiteInfo.value;
  if (!site) return '';
  return site.horizon?.length
    ? t('LOLA terrain profile: {terrain}').replace('{terrain}', site.terrain)
    : t('No sampled terrain horizon is available; calculations use a smooth horizon.');
});
const terrainNote = computed(() =>
  dailyResult.value?.site.horizon
    ? t('A sampled terrain horizon is included.')
    : t('No sampled terrain horizon is available; a smooth horizon is used.'),
);

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : t('The offline lunar data could not be loaded.');
  const range = message.match(/Choose a date within the available data: (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})\./);
  if (range)
    return t('Choose a date within the available data: {start} to {end}.')
      .replace('{start}', range[1])
      .replace('{end}', range[2]);
  return t(message);
}

async function openLesson(): Promise<void> {
  if (!selectedDate.value) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    dailyResult.value = await getDailyResult(selectedSite.value, selectedDate.value);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.lesson-content {
  --background: #f4f1e9;
  --color: #19202a;
}

.shell {
  width: min(100% - 32px, 760px);
  margin: 0 auto;
  padding: max(16px, env(safe-area-inset-top)) 0 max(32px, env(safe-area-inset-bottom));
}

.topline,
.brand,
.offline-note,
.section-heading,
.concept-list li,
.page-footer {
  display: flex;
  align-items: center;
}

.topline {
  min-height: 48px;
  justify-content: space-between;
  gap: 12px;
}

.language-select {
  width: 70px;
  min-height: 36px;
  min-width: 70px;
  margin-left: auto;
  padding: 0 4px;
  --padding-start: 6px;
  --padding-end: 4px;
  border: 1px solid #d3d5d5;
  border-radius: 10px;
  background: #fffefa;
  color: #203b62;
  font-size: 12px;
  font-weight: 750;
}

.brand {
  gap: 10px;
  color: #19202a;
  text-decoration: none;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.brand-logo {
  display: block;
  width: 36px;
  height: 34px;
  object-fit: contain;
}

.brand-subtitle {
  margin-left: 5px;
  color: #576171;
  font-size: 10px;
  letter-spacing: 0.12em;
}

.offline-note {
  gap: 7px;
  color: #38465a;
  font-size: 12px;
  font-weight: 650;
}

.offline-dot {
  width: 9px;
  height: 9px;
  border: 2px solid #16734c;
  border-radius: 50%;
  background: #58c693;
}

.hero {
  padding-top: clamp(28px, 7vw, 54px);
}

.eyebrow {
  margin: 0 0 7px;
  color: #4c5a70;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

h1,
h2,
p {
  overflow-wrap: anywhere;
}

h1 {
  max-width: 650px;
  margin: 0;
  color: #172337;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(38px, 9vw, 62px);
  font-weight: 500;
  letter-spacing: -0.045em;
  line-height: 1.04;
}

.intro {
  max-width: 590px;
  margin: 16px 0 22px;
  color: #3a4657;
  font-size: 17px;
  line-height: 1.55;
}

.moon-art {
  position: relative;
  height: clamp(160px, 44vw, 230px);
  overflow: hidden;
  border-radius: 18px;
  background: #18243a;
  isolation: isolate;
}

.moon-sky {
  position: absolute;
  inset: 0 0 26%;
  background: radial-gradient(ellipse at 75% 110%, #31466a 0, #1e2a40 40%, #172236 75%);
}

.earth {
  position: absolute;
  top: 22%;
  right: 20%;
  width: clamp(45px, 12vw, 68px);
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid #c6e4f6;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #d9edf6 0 13%, #70b9d6 14% 47%, #33759b 48% 75%, #153755 76%);
  box-shadow: 0 0 24px #8fc5e777;
}

.earth span {
  position: absolute;
  top: 23%;
  left: 21%;
  width: 42%;
  height: 30%;
  border-radius: 60% 40% 58% 35%;
  background: #8aa984;
  transform: rotate(-25deg);
}

.earth-label {
  position: absolute;
  top: calc(22% + clamp(50px, 12vw, 72px));
  right: calc(20% - 5px);
  color: #f3f6fa;
  font-size: 12px;
  font-weight: 650;
}

.star {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #fff2cc;
}

.star-one {
  top: 25%;
  left: 22%;
}
.star-two {
  top: 52%;
  left: 54%;
}

.moon-ground {
  position: absolute;
  inset: auto -5% -17% -5%;
  height: 58%;
  overflow: hidden;
  border-radius: 50% 48% 0 0 / 33% 30% 0 0;
  background: linear-gradient(180deg, #afa995, #817d73 70%, #69665e);
}

.ridge {
  position: absolute;
  inset: auto -5% 40%;
  height: 70%;
  border-radius: 50% 48% 0 0 / 48% 48% 0 0;
  transform: rotate(-3deg);
}

.ridge-back {
  background: #c2bba8;
}
.ridge-front {
  inset: auto -5% 20% 38%;
  height: 65%;
  background: #928e81;
  transform: rotate(7deg);
}

.art-caption {
  position: absolute;
  right: 12px;
  bottom: 10px;
  z-index: 2;
  color: #fff;
  font-size: 11px;
  text-shadow: 0 1px 4px #000;
}

.choice-card,
.concept-card,
.results-card {
  margin-top: 20px;
  padding: clamp(18px, 5vw, 28px);
  border: 1px solid #d8d3c8;
  border-radius: 18px;
  background: #fffefa;
  box-shadow: 0 8px 24px #2835480d;
}

.section-heading {
  align-items: flex-start;
  gap: 13px;
  margin-bottom: 18px;
}

.step-number {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 50%;
  background: #e7edf5;
  color: #213d63;
  font-weight: 750;
}

.step-number-complete {
  background: #e1f2e9;
  color: #155f3d;
}

h2 {
  margin: 0;
  color: #172337;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(23px, 6vw, 30px);
  font-weight: 500;
  line-height: 1.15;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  min-height: 82px;
  --background: #f7f6f1;
  --border-radius: 11px;
  --padding-start: 13px;
  --inner-padding-end: 9px;
  border: 1px solid #d4d6d7;
  border-radius: 11px;
}

.field ion-label {
  margin-top: 8px;
  color: #39475a;
  font-size: 13px;
  font-weight: 650;
}

.field ion-select,
.field ion-input {
  min-height: 48px;
  color: #172337;
  font-size: 15px;
  font-weight: 600;
}

.field-hint {
  margin: 10px 2px 15px;
  color: #4d5867;
  font-size: 13px;
  line-height: 1.5;
}

.start-button {
  min-height: 52px;
  --background: #203b62;
  --background-activated: #142b4d;
  --border-radius: 12px;
  --box-shadow: none;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
}

.button-arrow {
  margin-left: 10px;
  font-size: 20px;
}

.lesson-intro,
.next-step,
.science-note {
  color: #39475a;
  font-size: 15px;
  line-height: 1.55;
}

.results-card {
  margin-top: 20px;
}

.site-details,
.reading-note {
  margin-top: 12px;
  padding: 0 15px;
  border: 1px solid #d9d5cb;
  border-radius: 13px;
  background: #fffefa;
}
.site-details summary,
.reading-note summary {
  display: flex;
  min-height: 48px;
  align-items: center;
  color: #234b73;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  list-style: none;
}
.site-details summary::-webkit-details-marker,
.reading-note summary::-webkit-details-marker {
  display: none;
}
.site-details summary .expand-mark,
.reading-note summary .expand-mark {
  margin-left: auto;
}
.site-details-body,
.reading-note p {
  color: #465365;
  font-size: 13px;
  line-height: 1.55;
}
.site-details-body {
  padding: 0 2px 9px;
  animation: result-reveal 0.22s ease-out;
}
.site-details-body p {
  margin: 7px 0;
}
.site-source {
  overflow-wrap: anywhere;
}
.reading-note p {
  margin: 0 0 9px;
  animation: result-reveal 0.22s ease-out;
}

.result-date {
  margin: -8px 0 16px 47px;
  color: #4d5867;
  font-size: 14px;
  font-weight: 650;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 11px;
}

.result-item {
  min-width: 0;
  padding: 15px;
  border: 1px solid #d9dce0;
  border-radius: 13px;
  background: #faf9f5;
}

.result-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 20px;
}

.sunlight-result .result-icon {
  color: #815500;
  background: #fff2ce;
}
.earth-result .result-icon {
  color: #145376;
  background: #e1f2f8;
}
.overlap-result .result-icon {
  color: #365032;
  background: #eaf1e1;
}

.result-item h3,
.timeline-block h3 {
  margin: 11px 0 5px;
  color: #1f2d40;
  font-size: 15px;
}

.result-number {
  margin: 0;
  color: #172337;
  font-size: 23px;
  font-weight: 750;
  line-height: 1.25;
}

.result-number span {
  display: block;
  color: #4d5867;
  font-size: 12px;
  font-weight: 600;
}

.result-item > p:not(.result-number) {
  margin: 9px 0 0;
  color: #465365;
  font-size: 13px;
  line-height: 1.45;
}

.result-more {
  grid-column: 1 / -1;
  margin-top: 11px;
  padding-top: 9px;
  border-top: 1px solid #e1e1dc;
}
.result-more summary {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  color: #234b73;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.result-more p {
  margin: 5px 0 3px;
  color: #465365;
  font-size: 13px;
  line-height: 1.5;
  animation: result-reveal 0.22s ease-out;
}
.reflection-card {
  margin-top: 18px;
  padding: 0 15px;
  border: 1px solid #d7dce2;
  border-radius: 13px;
  background: #eef2f6;
}
.reflection-card summary {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 9px;
  color: #24354e;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  list-style: none;
}
.reflection-card summary::-webkit-details-marker {
  display: none;
}
.reflection-card summary .expand-mark {
  margin-left: auto;
}
.reflection-card p {
  margin: 0;
  padding: 0 5px 14px 28px;
  color: #465365;
  font-size: 13px;
  line-height: 1.55;
  animation: result-reveal 0.22s ease-out;
}

.temperature-note {
  margin-top: 16px;
  padding: 0 14px;
  border: 1px solid #d9d5cb;
  border-radius: 12px;
  background: #fffefa;
}
.temperature-note summary {
  display: flex;
  min-height: 48px;
  align-items: center;
  color: #234b73;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}
.temperature-note p {
  margin: 0 0 8px;
  color: #465365;
  font-size: 13px;
  line-height: 1.5;
}
.temperature-note a {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  color: #173e6b;
  font-size: 12px;
  font-weight: 700;
}
@keyframes result-reveal {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.timeline-block {
  margin-top: 24px;
  padding-top: 17px;
  border-top: 1px solid #dedfdf;
}

.timeline-block h3 {
  margin: 0;
  font-size: 18px;
}

.timeline-key {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 7px 0 12px;
  color: #465365;
  font-size: 13px;
}

.key-sun {
  color: #815500;
}
.key-earth {
  margin-left: 8px;
  color: #145376;
}

.timeline {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline-hour {
  min-width: 0;
  text-align: center;
}
.hour-label {
  display: block;
  margin-bottom: 4px;
  color: #576171;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.hour-track {
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid #ccd1d7;
  border-radius: 7px;
  background: #f2f3f4;
  color: #59616b;
  font-size: 14px;
}

.hour-track.has-sun {
  border-color: #b27b15;
  background: #fff3d3;
  color: #704900;
}
.hour-track.has-earth {
  border-color: #4082a4;
  background: #e4f3f8;
  color: #145376;
}
.hour-track.has-both {
  border-color: #536b3f;
  background: repeating-linear-gradient(135deg, #e8f0df 0 6px, #dce9d0 6px 12px);
  color: #304729;
}

.terrain-note,
.error-note {
  color: #39475a;
  font-size: 13px;
  line-height: 1.55;
}

.terrain-note {
  margin: 12px 0 0;
}
.error-note {
  margin: 10px 0 0;
  color: #8b1d16;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.concept-list {
  display: grid;
  gap: 12px;
  margin: 18px 0;
  padding: 0;
  list-style: none;
}

.concept-list li {
  align-items: flex-start;
  gap: 13px;
  padding: 14px;
  border: 1px solid #e0dfda;
  border-radius: 12px;
  background: #faf9f5;
}

.concept-symbol {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 20px;
  font-weight: 700;
}

.sun-symbol {
  color: #815500;
  background: #fff2ce;
}
.earth-symbol {
  color: #145376;
  background: #e1f2f8;
}
.overlap-symbol {
  color: #365032;
  background: #eaf1e1;
}

.concept-list strong,
.concept-copy {
  display: block;
}
.concept-list strong {
  color: #1f2d40;
}
.concept-copy {
  margin-top: 3px;
  color: #465365;
  font-size: 14px;
  line-height: 1.45;
}

.science-note {
  margin: 18px 0 0;
  padding: 13px 15px;
  border-left: 4px solid #667e9d;
  border-radius: 0 9px 9px 0;
  background: #eef2f6;
  font-size: 13px;
}

.page-footer {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px 20px;
  margin: 22px 3px 0;
  color: #495463;
  font-size: 12px;
  line-height: 1.5;
}

.page-footer a {
  color: #173e6b;
  font-weight: 650;
}
.external-hint {
  color: #495463;
  font-weight: 400;
}

:global(:focus-visible) {
  outline: 3px solid #a04e00;
  outline-offset: 3px;
}

@media (max-width: 560px) {
  .shell {
    width: min(100% - 24px, 760px);
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .result-grid {
    grid-template-columns: 1fr;
  }
  .result-item {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    column-gap: 11px;
    align-items: center;
  }
  .result-icon {
    grid-row: span 2;
  }
  .result-item h3 {
    margin: 0;
  }
  .result-number {
    grid-column: 2;
    margin-top: 3px;
  }
  .result-item > p:not(.result-number) {
    grid-column: 1 / -1;
  }
  .result-more {
    grid-column: 1 / -1;
  }
  .timeline {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .page-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  :global(*),
  :global(*::before),
  :global(*::after) {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
