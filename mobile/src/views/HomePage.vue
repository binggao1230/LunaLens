<template>
  <ion-page>
    <ion-content :fullscreen="true" class="welcome-content">
      <main class="welcome-shell" aria-labelledby="welcome-title">
        <header class="welcome-topbar">
          <img class="welcome-logo" src="/lunalens-logo.svg" alt="LunaLens" />
          <ion-select
            class="language-select"
            :value="language"
            :aria-label="t('Choose language')"
            interface="popover"
            @ion-change="setLanguage($event.detail.value)"
          >
            <ion-select-option value="fr">FR</ion-select-option>
            <ion-select-option value="en">EN</ion-select-option>
            <ion-select-option value="zh">简体中文</ion-select-option>
          </ion-select>
        </header>

        <section class="welcome-hero">
          <div class="welcome-copy">
            <p class="eyebrow">{{ t('Lunar exploration') }}</p>
            <h1 id="welcome-title">{{ t('Explore the Moon') }}</h1>
            <p class="welcome-intro">{{ t('Choose a place. Choose a day. See what changes.') }}</p>
            <ion-button class="launch-button" expand="block" router-link="/explore">
              {{ t('Start exploring') }} <span aria-hidden="true">→</span>
            </ion-button>
            <p class="welcome-caption">
              {{ t('12 curated lunar places') }} <span aria-hidden="true">·</span> {{ t('Sunlight · Earth · terrain') }}
            </p>
          </div>

          <div class="welcome-illustration" role="img" :aria-label="t('Explore the Moon')">
            <span class="orbit orbit-one" aria-hidden="true"></span>
            <span class="orbit orbit-two" aria-hidden="true"></span>
            <span class="welcome-star star-a" aria-hidden="true">✦</span>
            <span class="welcome-star star-b" aria-hidden="true">·</span>
            <span class="welcome-star star-c" aria-hidden="true">✧</span>
            <span class="welcome-earth" aria-hidden="true"><i></i></span>
            <span class="welcome-horizon" aria-hidden="true"></span>
            <span class="welcome-crater crater-one" aria-hidden="true"></span>
            <span class="welcome-crater crater-two" aria-hidden="true"></span>
          </div>
        </section>

        <details class="moon-facts">
          <summary>
            <span aria-hidden="true">☼</span>
            {{ t('Moon light and temperature') }}
            <span class="expand-mark" aria-hidden="true">+</span>
          </summary>
          <div class="facts-body">
            <p>
              <strong>{{ t('The Moon has almost no air to hold heat.') }}</strong>
            </p>
            <p>
              {{
                t(
                  'In full sunlight, the surface can reach about 127°C. In darkness, it can fall to about −173°C. These are broad reference values, not a temperature forecast for your chosen place.',
                )
              }}
            </p>
            <p>
              {{
                t(
                  'One full cycle takes about 29.5 Earth days. Near the equator, daylight and darkness each last about two weeks. At the poles, hills and craters make the pattern very different.',
                )
              }}
            </p>
            <p class="facts-sources">
              <a href="https://science.nasa.gov/moon/facts/" target="_blank" rel="noopener noreferrer"
                >{{ t('NASA Moon facts') }} ↗</a
              >
              <a href="https://science.nasa.gov/moon/moonlight/" target="_blank" rel="noopener noreferrer"
                >{{ t('NASA: Moonlight and lunar day') }} ↗</a
              >
            </p>
          </div>
        </details>

        <footer class="welcome-footer">
          <span>{{ t('Ready to explore offline') }}</span>
          <router-link to="/explore">{{ t('Start exploring') }} <span aria-hidden="true">→</span></router-link>
        </footer>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonPage, IonSelect, IonSelectOption } from '@ionic/vue';
import { useLanguage } from '../i18n';

const { language, setLanguage, t } = useLanguage();
</script>

<style scoped>
.welcome-content {
  --background: #f4f1e9;
  --color: #19202a;
}
.welcome-shell {
  width: min(100% - 32px, 920px);
  margin: 0 auto;
  padding: max(14px, env(safe-area-inset-top)) 0 max(20px, env(safe-area-inset-bottom));
}
.welcome-topbar {
  display: flex;
  min-height: 50px;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.welcome-logo {
  display: block;
  width: 48px;
  height: 42px;
  object-fit: contain;
}
.language-select {
  min-height: 42px;
  min-width: 94px;
  padding: 0 9px;
  border: 1px solid #d3d5d5;
  border-radius: 12px;
  background: #fffefa;
  color: #203b62;
  font-size: 13px;
  font-weight: 750;
}
.welcome-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(270px, 0.85fr);
  align-items: center;
  gap: clamp(22px, 5vw, 54px);
  padding: clamp(24px, 6vw, 54px) 0 25px;
}
.welcome-copy {
  animation: rise-in 0.45s both;
}
.eyebrow {
  margin: 0 0 8px;
  color: #58647a;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
h1,
p {
  overflow-wrap: anywhere;
}
h1 {
  max-width: 560px;
  margin: 0;
  color: #172337;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(42px, 7vw, 68px);
  font-weight: 500;
  letter-spacing: -0.05em;
  line-height: 0.99;
}
.welcome-intro {
  max-width: 470px;
  margin: 14px 0 18px;
  color: #3d4858;
  font-size: 16px;
  line-height: 1.5;
}
.launch-button {
  width: min(100%, 340px);
  min-height: 54px;
  --background: #203b62;
  --background-activated: #142b4d;
  --border-radius: 13px;
  --box-shadow: 0 7px 16px #203b6222;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
}
.launch-button span {
  margin-left: 10px;
  font-size: 21px;
  transition: transform 0.2s ease;
}
.launch-button:hover span {
  transform: translateX(4px);
}
.welcome-caption {
  margin: 10px 0 0;
  color: #586273;
  font-size: 12px;
  line-height: 1.45;
}
.welcome-illustration {
  position: relative;
  min-height: 280px;
  overflow: hidden;
  border: 1px solid #40516a;
  border-radius: 24px;
  background: radial-gradient(ellipse at 66% 22%, #293c5a 0, #1b2941 42%, #121c2d 100%);
  isolation: isolate;
  animation: rise-in 0.55s 0.05s both;
}
.welcome-illustration::before {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(#fff9 1px, transparent 1px), radial-gradient(#cddcf866 1px, transparent 1px);
  background-position:
    20px 17px,
    54px 61px;
  background-size:
    87px 79px,
    113px 97px;
  content: '';
  opacity: 0.35;
}
.orbit {
  position: absolute;
  top: 21%;
  left: 31%;
  width: 67%;
  height: 38%;
  border: 1px solid #a9c4e244;
  border-radius: 50%;
  transform: rotate(-20deg);
}
.orbit-two {
  top: 15%;
  left: 24%;
  width: 80%;
  height: 47%;
  transform: rotate(24deg);
}
.welcome-earth {
  position: absolute;
  top: 18%;
  right: 22%;
  width: clamp(68px, 13vw, 95px);
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid #cae6f1;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 32%, #eef9f5 0 8%, #86c7d9 10% 31%, #357da1 32% 72%, #153750 74%);
  box-shadow: 0 0 30px #86c7d966;
  animation: float 5s ease-in-out infinite;
}
.welcome-earth i {
  position: absolute;
  top: 22%;
  left: 20%;
  width: 34%;
  height: 42%;
  border-radius: 45% 55% 35% 60%;
  background: #87a885;
  transform: rotate(25deg);
}
.welcome-star {
  position: absolute;
  z-index: 1;
  color: #f8df9b;
  animation: twinkle 3.2s ease-in-out infinite alternate;
}
.star-a {
  top: 25%;
  left: 17%;
  font-size: 17px;
}
.star-b {
  top: 43%;
  left: 56%;
  font-size: 25px;
  animation-delay: 0.7s;
}
.star-c {
  top: 15%;
  left: 72%;
  font-size: 19px;
  animation-delay: 1.1s;
}
.welcome-horizon {
  position: absolute;
  right: -12%;
  bottom: -34%;
  left: -12%;
  height: 66%;
  border: 1px solid #e1d7bb;
  border-radius: 50% 50% 0 0 / 23% 23% 0 0;
  background: linear-gradient(180deg, #b4ad99, #888477 63%, #64635e);
  box-shadow: 0 -12px 32px #c2bba822;
  transform: rotate(-4deg);
}
.welcome-horizon::before {
  position: absolute;
  top: 12%;
  left: 2%;
  width: 100%;
  height: 44%;
  border-radius: 50%;
  background: #d0c9b4;
  content: '';
  clip-path: polygon(0 72%, 15% 66%, 26% 25%, 34% 42%, 48% 12%, 62% 53%, 73% 25%, 82% 47%, 100% 35%, 100% 100%, 0 100%);
  opacity: 0.92;
}
.welcome-crater {
  position: absolute;
  z-index: 2;
  bottom: 20%;
  width: 48px;
  height: 16px;
  border: 2px solid #716e65;
  border-top-color: #d6d0bd;
  border-radius: 50%;
  transform: rotate(-8deg);
}
.crater-one {
  left: 25%;
}
.crater-two {
  right: 22%;
  bottom: 15%;
  width: 70px;
}
.moon-facts {
  border: 1px solid #d9d5cb;
  border-radius: 15px;
  background: #fffefa;
  box-shadow: 0 5px 18px #28354808;
}
.moon-facts summary {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 11px;
  padding: 0 15px;
  color: #1f2d40;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  list-style: none;
}
.moon-facts summary::-webkit-details-marker {
  display: none;
}
.moon-facts summary > span:first-child {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #b27b15;
  border-radius: 50%;
  background: #fff2ce;
  color: #815500;
  font-size: 19px;
}
.expand-mark {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  margin-left: auto;
  border: 1px solid #b8c0ca;
  border-radius: 50%;
  color: #43536a;
  font-size: 18px;
  line-height: 1;
  transition: transform 0.2s ease;
}
details[open] .expand-mark {
  transform: rotate(45deg);
}
.facts-body {
  padding: 0 18px 15px 60px;
  animation: reveal 0.24s ease-out;
}
.facts-body p {
  margin: 8px 0;
  color: #465365;
  font-size: 13px;
  line-height: 1.55;
}
.facts-body p strong {
  color: #1f2d40;
}
.facts-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.facts-sources a {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  color: #173e6b;
  font-size: 12px;
  font-weight: 700;
}
.welcome-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px 18px;
  margin: 14px 2px 0;
  color: #596273;
  font-size: 12px;
  line-height: 1.5;
}
.welcome-footer a {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #173e6b;
  font-weight: 650;
}
:global(:focus-visible) {
  outline: 3px solid #a04e00;
  outline-offset: 3px;
}
@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
@keyframes twinkle {
  from {
    opacity: 0.5;
    transform: scale(0.88);
  }
  to {
    opacity: 1;
    transform: scale(1.12);
  }
}
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 720px) {
  .welcome-shell {
    width: min(100% - 28px, 560px);
  }
  .welcome-hero {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 31px 0 20px;
  }
  h1 {
    max-width: 560px;
    font-size: clamp(42px, 12vw, 58px);
  }
  .welcome-intro {
    margin: 11px 0 15px;
    font-size: 15px;
  }
  .welcome-illustration {
    min-height: clamp(190px, 54vw, 270px);
  }
  .launch-button {
    width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
