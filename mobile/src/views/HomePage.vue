<template>
  <ion-page>
    <ion-content :fullscreen="true" class="welcome-content">
      <main class="welcome-shell" aria-labelledby="welcome-title">
        <header class="welcome-topbar">
          <img class="welcome-logo" src="/lunalens-logo.svg" alt="LunaLens" />
          <span class="offline-pill"><span aria-hidden="true">●</span> Ready to explore offline</span>
        </header>

        <section class="welcome-hero">
          <div class="welcome-copy">
            <p class="eyebrow">A tiny field trip. A very big Moon.</p>
            <h1 id="welcome-title">Your Moon mission starts <em>here.</em></h1>
            <p class="welcome-intro">
              Pick a lunar place and a day. Discover when the ground is in sunlight, when Earth is in view, and why
              those are two different things.
            </p>
            <ion-button class="launch-button" expand="block" router-link="/explore">
              Start exploring <span aria-hidden="true">→</span>
            </ion-button>
            <p class="welcome-caption">A short, hands-on lesson for curious minds and classrooms.</p>
          </div>

          <div
            class="welcome-illustration"
            role="img"
            aria-label="Earth above a curved lunar horizon under a starry sky"
          >
            <span class="orbit orbit-one" aria-hidden="true"></span>
            <span class="orbit orbit-two" aria-hidden="true"></span>
            <span class="welcome-star star-a" aria-hidden="true">✦</span>
            <span class="welcome-star star-b" aria-hidden="true">·</span>
            <span class="welcome-star star-c" aria-hidden="true">✧</span>
            <span class="welcome-earth" aria-hidden="true"><i></i></span>
            <span class="welcome-earth-label" aria-hidden="true">Earth</span>
            <span class="welcome-horizon" aria-hidden="true"></span>
            <span class="welcome-crater crater-one" aria-hidden="true"></span>
            <span class="welcome-crater crater-two" aria-hidden="true"></span>
            <span class="illustration-label">Your view from the lunar surface</span>
          </div>
        </section>

        <section class="welcome-learning" aria-labelledby="learn-title">
          <div class="welcome-section-heading">
            <p class="eyebrow">Three clues to look for</p>
            <h2 id="learn-title">The Moon has more than one kind of “daylight.”</h2>
          </div>
          <div class="learn-cards">
            <details class="learn-card sun-card">
              <summary>
                <span class="learn-icon" aria-hidden="true">☼</span>
                <span><strong>Sunlight</strong><small>Can the Sun reach the ground?</small></span>
                <span class="expand-mark" aria-hidden="true">+</span>
              </summary>
              <p>
                Low hills can hide the Sun, even when it is daytime. Near the Moon’s south pole, the horizon can make
                sunlight change from place to place.
              </p>
            </details>
            <details class="learn-card earth-card">
              <summary>
                <span class="learn-icon" aria-hidden="true">◎</span>
                <span><strong>Earth in view</strong><small>Can you see Earth above the horizon?</small></span>
                <span class="expand-mark" aria-hidden="true">+</span>
              </summary>
              <p>
                Earth can be above the horizon while the ground is dark. “In view” is a geometric view of Earth; it does
                not check every part of a radio connection.
              </p>
            </details>
            <details class="learn-card both-card">
              <summary>
                <span class="learn-icon" aria-hidden="true">↗</span>
                <span><strong>Both together</strong><small>When do both happen at once?</small></span>
                <span class="expand-mark" aria-hidden="true">+</span>
              </summary>
              <p>
                That overlap is the interesting part: a place may have sunlight without Earth in view, Earth in view
                without sunlight, or both at the same time.
              </p>
            </details>
          </div>
        </section>

        <details class="classroom-tip">
          <summary>
            <span aria-hidden="true">✎</span> A quick idea for teachers and learners
            <span class="expand-mark" aria-hidden="true">+</span>
          </summary>
          <div>
            <p>
              Before exploring, make a prediction: will changing the place or the date change sunlight, Earth in view,
              or both?
            </p>
            <p>
              After exploring, compare your prediction with the timeline. There is no score—just a chance to explain
              what you noticed.
            </p>
          </div>
        </details>

        <footer class="welcome-footer">
          <span>Built for learning, not mission certification.</span>
          <a href="https://luna-lens.gaobing1230.workers.dev" target="_blank" rel="noopener noreferrer"
            >Visit the full LunaLens website <span aria-hidden="true">↗</span></a
          >
        </footer>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonPage } from '@ionic/vue';
</script>

<style scoped>
.welcome-content {
  --background: #f4f1e9;
  --color: #19202a;
}
.welcome-shell {
  width: min(100% - 32px, 1080px);
  margin: 0 auto;
  padding: max(18px, env(safe-area-inset-top)) 0 max(28px, env(safe-area-inset-bottom));
}
.welcome-topbar {
  display: flex;
  min-height: 48px;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.welcome-logo {
  display: block;
  width: 54px;
  height: 45px;
  object-fit: contain;
}
.offline-pill {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid #d6ddd5;
  border-radius: 999px;
  background: #fffefa;
  color: #31463b;
  font-size: 12px;
  font-weight: 650;
}
.offline-pill span {
  color: #418a5d;
  font-size: 10px;
}
.welcome-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.92fr);
  align-items: center;
  gap: clamp(24px, 5vw, 62px);
  padding: clamp(36px, 7vw, 74px) 0 44px;
}
.welcome-copy {
  animation: rise-in 0.65s both;
}
.eyebrow {
  margin: 0 0 10px;
  color: #58647a;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
h1,
h2,
p {
  overflow-wrap: anywhere;
}
h1 {
  max-width: 610px;
  margin: 0;
  color: #172337;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(43px, 8vw, 76px);
  font-weight: 500;
  letter-spacing: -0.05em;
  line-height: 0.99;
}
h1 em {
  color: #9b6320;
  font-weight: 500;
}
.welcome-intro {
  max-width: 540px;
  margin: 20px 0 23px;
  color: #3d4858;
  font-size: 17px;
  line-height: 1.6;
}
.launch-button {
  width: min(100%, 360px);
  min-height: 56px;
  --background: #203b62;
  --background-activated: #142b4d;
  --border-radius: 14px;
  --box-shadow: 0 8px 18px #203b6226;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
}
.launch-button span {
  margin-left: 12px;
  font-size: 22px;
  transition: transform 0.2s ease;
}
.launch-button:hover span {
  transform: translateX(4px);
}
.welcome-caption {
  margin: 11px 0 0;
  color: #5a6370;
  font-size: 12px;
}
.welcome-illustration {
  position: relative;
  min-height: 330px;
  overflow: hidden;
  border: 1px solid #40516a;
  border-radius: 26px;
  background: radial-gradient(ellipse at 66% 22%, #293c5a 0, #1b2941 42%, #121c2d 100%);
  isolation: isolate;
  animation: rise-in 0.75s 0.08s both;
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
  top: 23%;
  left: 38%;
  width: 58%;
  height: 32%;
  border: 1px solid #a9c4e244;
  border-radius: 50%;
  transform: rotate(-20deg);
}
.orbit-two {
  top: 19%;
  left: 31%;
  width: 72%;
  height: 42%;
  transform: rotate(24deg);
}
.welcome-earth {
  position: absolute;
  top: 20%;
  right: 23%;
  display: block;
  width: clamp(72px, 15vw, 104px);
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid #cae6f1;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 32%, #eef9f5 0 8%, #86c7d9 10% 31%, #357da1 32% 72%, #153750 74%);
  box-shadow: 0 0 34px #86c7d966;
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
.welcome-earth-label {
  position: absolute;
  top: calc(20% + clamp(78px, 15vw, 110px));
  right: calc(23% + 20px);
  color: #edf4fb;
  font-size: 13px;
  font-weight: 700;
}
.welcome-star {
  position: absolute;
  z-index: 1;
  color: #f8df9b;
  animation: twinkle 3.2s ease-in-out infinite alternate;
}
.star-a {
  top: 25%;
  left: 19%;
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
  bottom: -33%;
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
  bottom: 21%;
  width: 50px;
  height: 17px;
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
  width: 76px;
}
.illustration-label {
  position: absolute;
  right: 15px;
  bottom: 13px;
  z-index: 3;
  color: #fff;
  font-size: 11px;
  text-shadow: 0 1px 5px #000;
}
.welcome-learning {
  padding: 16px 0 0;
}
.welcome-section-heading {
  max-width: 580px;
  margin-bottom: 17px;
}
.welcome-section-heading h2 {
  margin: 0;
  color: #172337;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(25px, 5vw, 36px);
  font-weight: 500;
  line-height: 1.12;
}
.learn-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.learn-card {
  align-self: start;
  min-width: 0;
  padding: 16px;
  border: 1px solid #d9d5cb;
  border-radius: 15px;
  background: #fffefa;
  box-shadow: 0 5px 18px #28354808;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  animation: rise-in 0.55s both;
}
.learn-card:nth-child(2) {
  animation-delay: 0.08s;
}
.learn-card:nth-child(3) {
  animation-delay: 0.16s;
}
.learn-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 9px 24px #28354812;
}
.learn-card summary {
  display: grid;
  min-height: 54px;
  grid-template-columns: 40px minmax(0, 1fr) 22px;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  list-style: none;
}
.learn-card summary::-webkit-details-marker,
.classroom-tip summary::-webkit-details-marker {
  display: none;
}
.learn-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 20px;
}
.sun-card .learn-icon {
  color: #815500;
  background: #fff2ce;
}
.earth-card .learn-icon {
  color: #145376;
  background: #e1f2f8;
}
.both-card .learn-icon {
  color: #365032;
  background: #eaf1e1;
}
.learn-card strong,
.learn-card small {
  display: block;
}
.learn-card strong {
  color: #1f2d40;
  font-size: 15px;
}
.learn-card small {
  margin-top: 3px;
  color: #586273;
  font-size: 12px;
  line-height: 1.35;
}
.expand-mark {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 1px solid #b8c0ca;
  border-radius: 50%;
  color: #43536a;
  font-size: 17px;
  line-height: 1;
  transition: transform 0.2s ease;
}
details[open] .expand-mark {
  transform: rotate(45deg);
}
.learn-card > p {
  margin: 13px 0 0 50px;
  color: #465365;
  font-size: 13px;
  line-height: 1.55;
  animation: reveal 0.25s ease-out;
}
.classroom-tip {
  margin-top: 14px;
  padding: 0 16px;
  border: 1px solid #d7dce2;
  border-radius: 14px;
  background: #eef2f6;
}
.classroom-tip summary {
  display: flex;
  min-height: 54px;
  align-items: center;
  gap: 10px;
  color: #24354e;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  list-style: none;
}
.classroom-tip summary > span:first-child {
  font-size: 19px;
}
.classroom-tip .expand-mark {
  margin-left: auto;
}
.classroom-tip > div {
  padding: 0 5px 12px 30px;
  animation: reveal 0.25s ease-out;
}
.classroom-tip p {
  margin: 5px 0 9px;
  color: #465365;
  font-size: 13px;
  line-height: 1.55;
}
.welcome-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px 18px;
  margin: 22px 2px 0;
  color: #596273;
  font-size: 12px;
  line-height: 1.5;
}
.welcome-footer a {
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
    transform: translateY(10px);
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
    transform: translateY(-7px);
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
    gap: 24px;
    padding: 40px 0 34px;
  }
  h1 {
    max-width: 560px;
    font-size: clamp(43px, 12vw, 62px);
  }
  .welcome-illustration {
    min-height: clamp(220px, 62vw, 310px);
  }
  .learn-cards {
    grid-template-columns: 1fr;
  }
  .learn-card {
    padding: 13px 15px;
  }
  .learn-card summary {
    min-height: 54px;
  }
}
@media (max-width: 380px) {
  .offline-pill {
    padding: 0 9px;
    font-size: 11px;
  }
  .welcome-logo {
    width: 48px;
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
