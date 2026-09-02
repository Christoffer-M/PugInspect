import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

export async function notify(title: string, body: string) {
  let ok = await isPermissionGranted();
  if (!ok) ok = (await requestPermission()) === "granted";
  if (ok) sendNotification({ title, body });
}

// ponytail: a synthesized blip instead of shipping an audio asset.
// One context for the app's lifetime: browsers cap concurrent AudioContexts, so
// constructing one per blip eventually throws inside the frame handler.
let ctx: AudioContext | undefined;

export function ding() {
  try {
    ctx ??= new AudioContext();
    // Autoplay policy can leave it suspended until the window is interacted with.
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    return; // no audio device: a missing blip must never break the applicant list
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}
