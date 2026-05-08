import { ipcMain, dialog, app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, basename, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { existsSync, copyFileSync } from 'fs'

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a']

export function registerIpcHandlers(): void {
  // Open file dialog for images
  ipcMain.handle('dialog:openImages', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
      ]
    })
    if (result.canceled) return []
    return result.filePaths.map((fp) => ({
      id: uuidv4(),
      path: fp,
      name: basename(fp),
      type: 'image' as const
    }))
  })

  // Open file dialog for audio
  ipcMain.handle('dialog:openAudio', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }
      ]
    })
    if (result.canceled) return null
    return {
      id: uuidv4(),
      path: result.filePaths[0],
      name: basename(result.filePaths[0]),
      type: 'audio' as const
    }
  })

  // Read file as base64
  ipcMain.handle('file:readAsBase64', async (_event, filePath: string) => {
    const buffer = await readFile(filePath)
    const ext = extname(filePath).toLowerCase()
    let mime = 'application/octet-stream'
    if (ext === '.png') mime = 'image/png'
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg'
    else if (ext === '.webp') mime = 'image/webp'
    else if (ext === '.mp3') mime = 'audio/mpeg'
    else if (ext === '.wav') mime = 'audio/wav'
    return `data:${mime};base64,${buffer.toString('base64')}`
  })

  // Read file as buffer
  ipcMain.handle('file:readBuffer', async (_event, filePath: string) => {
    const buffer = await readFile(filePath)
    return buffer
  })

  // Get app data path
  ipcMain.handle('app:getDataPath', () => {
    return app.getPath('userData')
  })

  // Save project
  ipcMain.handle('project:save', async (_event, data: string) => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'SpeedRamp Project', extensions: ['speedramp'] }],
      defaultPath: 'untitled.speedramp'
    })
    if (result.canceled || !result.filePath) return false
    await writeFile(result.filePath, data, 'utf-8')
    return result.filePath
  })

  // Load project
  ipcMain.handle('project:load', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'SpeedRamp Project', extensions: ['speedramp'] }]
    })
    if (result.canceled) return null
    const data = await readFile(result.filePaths[0], 'utf-8')
    return { path: result.filePaths[0], data: JSON.parse(data) }
  })

  // Save export
  ipcMain.handle('dialog:saveExport', async () => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
      defaultPath: 'speedramp-export.mp4'
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  // Get settings path
  ipcMain.handle('settings:getPath', () => {
    return join(app.getPath('userData'), 'settings.json')
  })

  // Export video
  ipcMain.handle('project:export', async (_event, options) => {
    const { exportVideo } = await import('../services/ffmpeg.service')
    return exportVideo(options)
  })

  // Save settings
  ipcMain.handle('settings:save', async (_event, settings: string) => {
    const settingsPath = join(app.getPath('userData'), 'settings.json')
    await writeFile(settingsPath, settings, 'utf-8')
    return true
  })

  // Load settings
  ipcMain.handle('settings:load', async () => {
    const settingsPath = join(app.getPath('userData'), 'settings.json')
    if (!existsSync(settingsPath)) return null
    const data = await readFile(settingsPath, 'utf-8')
    return JSON.parse(data)
  })
}
