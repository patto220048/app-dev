import { create } from 'zustand'
import type { MediaFile, TimelineTrack, TimelineClip, BeatData, SpeedCurvePreset } from '../types'
import { v4 as uuidv4 } from 'uuid'

interface ProjectState {
  // Media
  images: MediaFile[]
  audio: MediaFile | null
  addImages: (files: MediaFile[]) => void
  removeImage: (id: string) => void
  setAudio: (file: MediaFile | null) => void

  // Tracks
  tracks: TimelineTrack[]
  addTrack: () => void
  removeTrack: (id: string) => void

  // Clips
  clips: TimelineClip[]
  selectedClipId: string | null
  addClip: (clip: TimelineClip) => void
  updateClip: (id: string, partial: Partial<TimelineClip>) => void
  removeClip: (id: string) => void
  selectClip: (id: string | null) => void
  addImageToTimeline: (image: MediaFile, trackIndex: number, startTime: number) => void

  // Beat data
  beatData: BeatData | null
  setBeatData: (data: BeatData | null) => void

  // Playback
  currentTime: number
  isPlaying: boolean
  totalDuration: number
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void

  // Auto arrange
  autoArrangeToBeats: () => void

  // Zoom
  pixelsPerSecond: number
  setPixelsPerSecond: (pps: number) => void
}

const DEFAULT_CLIP_DURATION = 5 // seconds

export const useProjectStore = create<ProjectState>((set, get) => ({
  images: [],
  audio: null,
  tracks: [
    { id: 'track-1', name: 'Video 1', type: 'video', visible: true, locked: false },
    { id: 'track-2', name: 'Video 2', type: 'video', visible: true, locked: false },
    { id: 'track-3', name: 'Video 3', type: 'video', visible: true, locked: false }
  ],
  clips: [],
  selectedClipId: null,
  beatData: null,
  currentTime: 0,
  isPlaying: false,
  totalDuration: 30,
  pixelsPerSecond: 50,

  addImages: (files) =>
    set((state) => ({ images: [...state.images, ...files] })),

  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((f) => f.id !== id),
      clips: state.clips.filter((c) => c.mediaId !== id)
    })),

  setAudio: (file) => set({ audio: file }),

  addTrack: () =>
    set((state) => {
      const num = state.tracks.filter((t) => t.type === 'video').length + 1
      return {
        tracks: [
          ...state.tracks,
          {
            id: uuidv4(),
            name: `Video ${num}`,
            type: 'video',
            visible: true,
            locked: false
          }
        ]
      }
    }),

  removeTrack: (id) =>
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== id),
      clips: state.clips.filter((c) => {
        const trackIdx = state.tracks.findIndex((t) => t.id === id)
        return c.trackIndex !== trackIdx
      })
    })),

  addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),

  updateClip: (id, partial) =>
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, ...partial } : c))
    })),

  removeClip: (id) =>
    set((state) => ({
      clips: state.clips.filter((c) => c.id !== id),
      selectedClipId: state.selectedClipId === id ? null : state.selectedClipId
    })),

  selectClip: (id) => set({ selectedClipId: id }),

  addImageToTimeline: (image, trackIndex, startTime) => {
    const clip: TimelineClip = {
      id: uuidv4(),
      mediaId: image.id,
      trackIndex,
      startTime,
      duration: DEFAULT_CLIP_DURATION,
      name: image.name,
      thumbnailDataUrl: image.thumbnailDataUrl,
      aiStatus: 'idle',
      motionType: 'zoomIn',
      speedCurve: {
        type: 'easeInOut',
        keyframes: [
          { time: 0, value: 1 },
          { time: 0.5, value: 2 },
          { time: 1, value: 1 }
        ]
      }
    }
    set((state) => ({ clips: [...state.clips, clip] }))
  },

  setBeatData: (data) => set({ beatData: data }),

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => {
    set({ isPlaying: playing })
    // Dispatch global events for direct audio control (bypasses browser autoplay restrictions)
    if (playing) {
      window.dispatchEvent(new CustomEvent('app-play'))
    } else {
      window.dispatchEvent(new CustomEvent('app-pause'))
    }
  },

  autoArrangeToBeats: () => {
    const { images, beatData, tracks } = get()
    if (!beatData || images.length === 0) return

    const videoTracks = tracks.filter((t) => t.type === 'video')
    const beats = beatData.beats
    const newClips: TimelineClip[] = []

    // Smart stride calculation: try to keep clips between 1.5s and 4s
    const bpm = beatData.bpm || 120
    const beatDuration = 60 / bpm
    let stride = 1
    if (beatDuration < 0.5) stride = 4 // Fast music: every 4th beat
    else if (beatDuration < 1.0) stride = 2 // Medium: every 2nd beat
    
    // Select the beats to use
    const selectedBeats: number[] = []
    for (let i = 0; i < beats.length; i += stride) {
      selectedBeats.push(beats[i])
    }

    images.forEach((img, i) => {
      // Use the selected beats, loop back if we run out of images vs beats
      const beatIdx = i
      if (beatIdx >= selectedBeats.length) return

      const startTime = selectedBeats[beatIdx]
      const nextBeatTime = selectedBeats[beatIdx + 1] || startTime + (beatDuration * stride)
      const duration = nextBeatTime - startTime

      // Alternate tracks for a professional look
      const trackIndex = i % videoTracks.length

      newClips.push({
        id: uuidv4(),
        mediaId: img.id,
        trackIndex,
        startTime,
        duration: Math.max(duration, 0.5),
        name: img.name,
        thumbnailDataUrl: img.thumbnailDataUrl,
        aiStatus: 'idle',
        motionType: i % 2 === 0 ? 'zoomIn' : 'zoomOut', // Alternate motion
        speedCurve: {
          type: 'beatSync',
          keyframes: [
            { time: 0, value: 0.2 }, // Start slow
            { time: 0.2, value: 3.5 }, // Quick burst at beat
            { time: 0.5, value: 1.0 }, // Settle
            { time: 0.8, value: 1.0 }, // Hold
            { time: 1, value: 0.2 } // End slow
          ]
        }
      })
    })

    set({ clips: newClips })
  },

  setPixelsPerSecond: (pps) => set({ pixelsPerSecond: Math.max(10, Math.min(200, pps)) })
}))
