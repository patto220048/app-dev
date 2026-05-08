import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { join } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic as string)

interface ExportOptions {
  clips: {
    imagePath: string
    videoPath?: string // AI generated video, if available
    duration: number
    speedCurve: {
      time: number
      value: number
    }[]
  }[]
  audioPath?: string
  outputPath: string
  resolution: '1080p' | '4K'
  onProgress?: (percent: number) => void
}

export async function exportVideo(options: ExportOptions): Promise<string> {
  const tempDir = join(app.getPath('temp'), 'speedramp_export_' + uuidv4())
  await mkdir(tempDir, { recursive: true })

  try {
    const { clips, audioPath, outputPath, resolution, onProgress } = options
    const width = resolution === '4K' ? 3840 : 1920
    const height = resolution === '4K' ? 2160 : 1080

    // Step 1: Process each clip (generate dummy video from image if needed, and apply speed ramp)
    const processedClips: string[] = []
    
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]
      const clipOutPath = join(tempDir, `clip_${i}.mp4`)
      
      // Calculate speed ramp filter (setpts)
      // FFmpeg setpts uses expressions. A basic speed multiplier needs integration of the curve.
      // For a simple implementation, if the curve is static or we just want a linear approximation:
      // We will generate a complex filter string for variable speed if possible, 
      // but FFmpeg's setpts is notoriously difficult for variable curves.
      // Instead, we divide the clip into smaller segments or use a simplified equation.
      // For now, we will create a 1x speed video from the image, 
      // and in a full implementation we'd use a custom frame interpolator or advanced FFmpeg math.
      // Let's implement a basic image-to-video for the mocked AI.
      
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg()
        
        if (clip.videoPath) {
          command.input(clip.videoPath)
        } else {
          // Fallback: loop the image to create a static video
          command
            .input(clip.imagePath)
            .loop(clip.duration)
            .fps(30)
        }

        command
          .outputOptions([
            '-c:v libx264',
            '-pix_fmt yuv420p',
            `-s ${width}x${height}`,
            `-t ${clip.duration}`,
            '-y'
          ])
          .save(clipOutPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(new Error(`Failed to process clip ${i}: ${err.message}`)))
      })
      
      processedClips.push(clipOutPath)
      if (onProgress) onProgress((i / clips.length) * 50) // First 50% for clip processing
    }

    // Step 2: Concatenate clips
    const concatListPath = join(tempDir, 'concat_list.txt')
    const concatContent = processedClips.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
    await writeFile(concatListPath, concatContent, 'utf-8')

    const mergedVideoPath = join(tempDir, 'merged.mp4')
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy', '-y'])
        .save(mergedVideoPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Failed to concat clips: ${err.message}`)))
    })

    if (onProgress) onProgress(75)

    // Step 3: Add audio if exists
    await new Promise<void>((resolve, reject) => {
      const finalCommand = ffmpeg().input(mergedVideoPath)
      
      if (audioPath) {
        finalCommand.input(audioPath)
        // Ensure audio length matches video length or stops when video stops
        finalCommand.outputOptions(['-c:v copy', '-c:a aac', '-shortest', '-y'])
      } else {
        finalCommand.outputOptions(['-c copy', '-y'])
      }

      finalCommand
        .save(outputPath)
        .on('progress', (p) => {
          if (onProgress && p.percent) {
            onProgress(75 + (p.percent * 0.25))
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Failed to add audio: ${err.message}`)))
    })

    if (onProgress) onProgress(100)
    return outputPath

  } catch (error) {
    console.error('Export error:', error)
    throw error
  }
}
