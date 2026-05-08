import type { TimelineClip } from '../types'

export function buildPrompt(clip: TimelineClip, imageName: string): string {
  const { motionType, focusPoint } = clip
  
  let basePrompt = `Cinematic high-quality video clip, `
  
  switch (motionType) {
    case 'zoomIn':
      basePrompt += 'slow smooth zoom in'
      break
    case 'zoomOut':
      basePrompt += 'slow smooth zoom out'
      break
    case 'panLeft':
      basePrompt += 'smooth pan to the left'
      break
    case 'panRight':
      basePrompt += 'smooth pan to the right'
      break
    case 'dolly':
      basePrompt += 'dolly shot moving forward'
      break
    case 'orbit':
      basePrompt += 'orbiting camera around the subject'
      break
    case 'trackSubject':
      basePrompt += 'tracking shot following the main subject'
      break
    case 'custom':
      return 'Enter your custom motion prompt here...'
    default:
      basePrompt += 'subtle cinematic movement'
  }

  if (focusPoint) {
    // Convert 0-1 coordinates to human-readable quadrants
    const horizontal = focusPoint.x < 0.33 ? 'left' : focusPoint.x > 0.66 ? 'right' : 'center'
    const vertical = focusPoint.y < 0.33 ? 'top' : focusPoint.y > 0.66 ? 'bottom' : 'center'
    
    if (horizontal === 'center' && vertical === 'center') {
      basePrompt += `, focusing on the center`
    } else {
      basePrompt += `, focusing on the ${vertical}-${horizontal} area`
    }
  }

  // Add generic style modifiers
  basePrompt += `, 4k, masterpiece, highly detailed, photorealistic, cinematic lighting`

  return basePrompt
}
