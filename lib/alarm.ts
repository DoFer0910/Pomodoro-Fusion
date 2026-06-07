// アラーム音の再生。Web Audio API で音を合成するため、外部の音声ファイルは不要。
// ブラウザ/Electron では AudioContext がユーザー操作起点でないと音を出せないため、
// AudioContext はタイマー開始などのユーザー操作のタイミングで初期化（warmUp）しておく。

import type { Settings } from "@/lib/types"

type AlarmSound = Settings["alarmSound"]

let audioContext: AudioContext | null = null

// AudioContext は遅延生成する。SSR/静的エクスポート時に window が無いケースを避けるため、
// 実際に音を鳴らす（またはウォームアップする）ときだけ生成する。
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!audioContext) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audioContext = new Ctor()
  }
  return audioContext
}

/**
 * タイマー開始など、ユーザー操作のタイミングで呼ぶ。
 * AudioContext を生成し、サスペンド状態なら resume しておくことで、
 * 後でタイマーが自動でゼロに達したとき（ユーザー操作が無い瞬間）でも音を鳴らせるようにする。
 */
export function warmUpAlarm(): void {
  const ctx = getAudioContext()
  if (ctx && ctx.state === "suspended") {
    void ctx.resume()
  }
}

// 単一のトーンを鳴らす小さなヘルパー。start からの相対秒で開始・終了する。
function playTone(
  ctx: AudioContext,
  options: {
    frequency: number
    startAt: number
    duration: number
    type?: OscillatorType
    gain?: number
  },
): void {
  const { frequency, startAt, duration, type = "sine", gain = 0.2 } = options
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()

  osc.type = type
  osc.frequency.value = frequency

  const t0 = ctx.currentTime + startAt
  // クリックノイズを避けるため、立ち上がり・減衰をエンベロープで滑らかにする。
  amp.gain.setValueAtTime(0, t0)
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.05)
}

// 柔らかいチャイム。基音＋オクターブ上の倍音を重ね、余韻を長めにする。
function playBell(ctx: AudioContext): void {
  playTone(ctx, { frequency: 880, startAt: 0, duration: 1.2, type: "sine", gain: 0.25 })
  playTone(ctx, { frequency: 1760, startAt: 0, duration: 0.9, type: "sine", gain: 0.08 })
  playTone(ctx, { frequency: 1318.5, startAt: 0.18, duration: 1.0, type: "sine", gain: 0.12 })
}

// 電子的な「ピピッ」という短い通知音。矩形波で 2 回鳴らす。
function playDigital(ctx: AudioContext): void {
  playTone(ctx, { frequency: 1200, startAt: 0, duration: 0.12, type: "square", gain: 0.15 })
  playTone(ctx, { frequency: 1200, startAt: 0.18, duration: 0.12, type: "square", gain: 0.15 })
}

/**
 * 設定に応じたアラーム音を鳴らす。"none" の場合は何もしない。
 */
export function playAlarm(sound: AlarmSound): void {
  if (sound === "none") return
  const ctx = getAudioContext()
  if (!ctx) return
  // 自動再生制約で suspended のままだと音が出ないため、毎回 resume を試みる。
  if (ctx.state === "suspended") void ctx.resume()

  if (sound === "digital") {
    playDigital(ctx)
  } else {
    playBell(ctx)
  }
}
