export interface MediaFile {
  id: string
  path: string
  name: string
  type: 'image' | 'audio'
  thumbnailDataUrl?: string
  duration?: number // For audio, in seconds
}

export interface TimelineClip {
  id: string
  mediaId: string // Reference to MediaFile
  trackIndex: number
  startTime: number // In seconds
  duration: number // In seconds
  name: string
  thumbnailDataUrl?: string
  aiClipPath?: string // Path to AI-generated video clip
  aiStatus?: 'idle' | 'generating' | 'done' | 'error'
  motionType: MotionType
  focusPoint?: { x: number; y: number } // 0-1 normalized
  speedCurve: SpeedCurveData
}

export interface TimelineTrack {
  id: string
  name: string
  type: 'video' | 'audio'
  visible: boolean
  locked: boolean
}

export type MotionType =
  | 'panLeft'
  | 'panRight'
  | 'zoomIn'
  | 'zoomOut'
  | 'dolly'
  | 'orbit'
  | 'trackSubject'
  | 'custom'

export interface SpeedCurveData {
  type: SpeedCurvePreset | 'custom'
  keyframes: CurveKeyframe[]
}

export type SpeedCurvePreset =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'beatSync'
  | 'bounce'
  | 'smooth'

export interface CurveKeyframe {
  time: number // 0-1 normalized position along clip
  value: number // Speed multiplier (0.25 - 4.0)
  handleIn?: { x: number; y: number } // Bezier control point
  handleOut?: { x: number; y: number }
}

export interface BeatData {
  bpm: number
  beats: number[] // Timestamps in seconds
  onsets: number[] // Onset timestamps
  duration: number // Audio duration in seconds
}

export interface ProjectData {
  version: string
  name: string
  media: MediaFile[]
  tracks: TimelineTrack[]
  clips: TimelineClip[]
  audio?: MediaFile
  beatData?: BeatData
  settings: ProjectSettings
}

export interface ProjectSettings {
  resolution: '1080p' | '4K'
  fps: number
  format: 'mp4'
}

export interface AppSettings {
  apiProvider: 'fal' | 'replicate'
  apiKey: string
  language: 'en' | 'vi'
}
