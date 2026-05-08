"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const path = require("path");
const promises = require("fs/promises");
const electron = require("electron");
const uuid = require("uuid");
ffmpeg.setFfmpegPath(ffmpegStatic);
async function exportVideo(options) {
  const tempDir = path.join(electron.app.getPath("temp"), "speedramp_export_" + uuid.v4());
  await promises.mkdir(tempDir, { recursive: true });
  try {
    const { clips, audioPath, outputPath, resolution, onProgress } = options;
    const width = resolution === "4K" ? 3840 : 1920;
    const height = resolution === "4K" ? 2160 : 1080;
    const processedClips = [];
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipOutPath = path.join(tempDir, `clip_${i}.mp4`);
      await new Promise((resolve, reject) => {
        const command = ffmpeg();
        if (clip.videoPath) {
          command.input(clip.videoPath);
        } else {
          command.input(clip.imagePath).loop(clip.duration).fps(30);
        }
        command.outputOptions([
          "-c:v libx264",
          "-pix_fmt yuv420p",
          `-s ${width}x${height}`,
          `-t ${clip.duration}`,
          "-y"
        ]).save(clipOutPath).on("end", () => resolve()).on("error", (err) => reject(new Error(`Failed to process clip ${i}: ${err.message}`)));
      });
      processedClips.push(clipOutPath);
      if (onProgress) onProgress(i / clips.length * 50);
    }
    const concatListPath = path.join(tempDir, "concat_list.txt");
    const concatContent = processedClips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    await promises.writeFile(concatListPath, concatContent, "utf-8");
    const mergedVideoPath = path.join(tempDir, "merged.mp4");
    await new Promise((resolve, reject) => {
      ffmpeg().input(concatListPath).inputOptions(["-f concat", "-safe 0"]).outputOptions(["-c copy", "-y"]).save(mergedVideoPath).on("end", () => resolve()).on("error", (err) => reject(new Error(`Failed to concat clips: ${err.message}`)));
    });
    if (onProgress) onProgress(75);
    await new Promise((resolve, reject) => {
      const finalCommand = ffmpeg().input(mergedVideoPath);
      if (audioPath) {
        finalCommand.input(audioPath);
        finalCommand.outputOptions(["-c:v copy", "-c:a aac", "-shortest", "-y"]);
      } else {
        finalCommand.outputOptions(["-c copy", "-y"]);
      }
      finalCommand.save(outputPath).on("progress", (p) => {
        if (onProgress && p.percent) {
          onProgress(75 + p.percent * 0.25);
        }
      }).on("end", () => resolve()).on("error", (err) => reject(new Error(`Failed to add audio: ${err.message}`)));
    });
    if (onProgress) onProgress(100);
    return outputPath;
  } catch (error) {
    console.error("Export error:", error);
    throw error;
  }
}
exports.exportVideo = exportVideo;
