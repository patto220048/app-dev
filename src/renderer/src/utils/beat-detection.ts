import type { BeatData } from '../types'

/**
 * Basic audio beat/onset detection using Web Audio API
 * Computes energy-based onset detection by calculating the difference
 * in amplitude across small windows.
 */
export async function detectBeats(audioUrl: string): Promise<BeatData> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  // Fetch and decode audio
  const response = await fetch(audioUrl)
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  
  const channelData = audioBuffer.getChannelData(0) // Use left channel
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration
  
  // Parameters
  const windowSize = Math.floor(sampleRate * 0.05) // 50ms window
  const hopSize = Math.floor(windowSize / 2)
  const numFrames = Math.floor(channelData.length / hopSize)
  
  const energies = new Float32Array(numFrames)
  
  // Calculate energy in each window
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize
    let energy = 0
    for (let j = 0; j < windowSize && start + j < channelData.length; j++) {
      energy += Math.abs(channelData[start + j])
    }
    energies[i] = energy / windowSize
  }
  
  // Calculate spectral flux (difference between successive windows)
  const flux = new Float32Array(numFrames)
  for (let i = 1; i < numFrames; i++) {
    flux[i] = Math.max(0, energies[i] - energies[i - 1])
  }
  
  // Smooth the flux to find general threshold
  const thresholdWindow = 10 // frames
  const thresholdMultiplier = 1.5
  const thresholds = new Float32Array(numFrames)
  
  for (let i = 0; i < numFrames; i++) {
    const start = Math.max(0, i - thresholdWindow)
    const end = Math.min(numFrames - 1, i + thresholdWindow)
    let sum = 0
    for (let j = start; j <= end; j++) {
      sum += flux[j]
    }
    thresholds[i] = (sum / (end - start + 1)) * thresholdMultiplier
  }
  
  // Peak picking
  const onsets: number[] = []
  for (let i = 1; i < numFrames - 1; i++) {
    if (flux[i] > thresholds[i] && flux[i] > flux[i - 1] && flux[i] > flux[i + 1]) {
      const timeInSeconds = (i * hopSize) / sampleRate
      onsets.push(timeInSeconds)
    }
  }
  
  // Estimate BPM (simple interval voting)
  const intervals: Record<string, number> = {}
  for (let i = 1; i < onsets.length; i++) {
    const interval = onsets[i] - onsets[i - 1]
    if (interval > 0.2 && interval < 2.0) { // between 30 and 300 BPM
      const rounded = Math.round(interval * 10) / 10
      intervals[rounded] = (intervals[rounded] || 0) + 1
    }
  }
  
  let bestInterval = 0.5 // Default 120bpm
  let maxCount = 0
  for (const [interval, count] of Object.entries(intervals)) {
    if (count > maxCount) {
      maxCount = count
      bestInterval = parseFloat(interval)
    }
  }
  
  const bpm = Math.round(60 / bestInterval)
  
  // Generate a regular beat grid based on estimated BPM starting from first onset
  const beats: number[] = []
  if (onsets.length > 0) {
    let currentBeat = onsets[0]
    const beatInterval = 60 / bpm
    while (currentBeat < duration) {
      beats.push(Math.round(currentBeat * 100) / 100)
      currentBeat += beatInterval
    }
  }

  return {
    bpm,
    beats,
    onsets,
    duration
  }
}
