/**
 * MDJ gallery uploader — closes the offline-media loop.
 *
 * Photos/videos captured while the glasses had no WiFi are kept at full
 * quality in the glasses gallery. The existing gallery sync pulls them
 * to the phone; this service then pushes each synced file over the
 * PHONE's internet to the MDJ glasses server, which files it into the
 * client's Drive folder — the same folder the traveler app's album
 * reads from. Result: tap sync → photos appear in the album, full
 * quality, no WiFi ever needed at capture time.
 *
 * Design notes (matching mdjPush.ts house style — best-effort, never
 * throws into callers):
 * - Fed by mediaProcessingQueue right after a file is validated and
 *   persisted locally. Strictly event-driven: uploads run only as a
 *   consequence of a user-triggered sync — no timers, no polling.
 * - Sequential single-flight queue; each file is a raw-body POST via
 *   RNFS.uploadFiles(binaryStreamOnly) so large videos never enter JS
 *   memory.
 * - Dedup manifest (.mdj-uploaded.json under MentraPhotos) survives app
 *   restarts; the server is idempotent too (capture-time + size), so a
 *   lost manifest only costs bandwidth, never duplicates.
 * - Failures stay un-manifested and retry on the next sync.
 */

import * as RNFS from "@dr.pogodin/react-native-fs"

import socketComms from "@/services/SocketComms"

const TAG = "[MdjGalleryUploader]"

const BACKEND = "https://mentra.mydailyjourneys.com"
// Static bearer baked into the MDJ build (server: MDJ_GALLERY_UPLOAD_TOKEN).
// Rotating it = update server .env + ship an app update.
const UPLOAD_TOKEN = "f8b0982afca0e35799b256db91b34cc0803badfab8cd39e8"

const MANIFEST_PATH = `${RNFS.DocumentDirectoryPath}/MentraPhotos/.mdj-uploaded.json`

export interface MdjUploadItem {
  /** Unique capture id (dedup key on the phone side). */
  id: string
  /** Absolute local path of the final processed file. */
  filePath: string
  /** Original capture timestamp (epoch ms). Falls back to now. */
  timestamp?: number
  isVideo: boolean
}

class MdjGalleryUploader {
  private queue: MdjUploadItem[] = []
  private running = false
  private manifest: Record<string, true> | null = null

  /** Queue a freshly-synced file for upload. Fire-and-forget. */
  enqueue(item: MdjUploadItem): void {
    this.queue.push(item)
    void this.processQueue()
  }

  private async loadManifest(): Promise<Record<string, true>> {
    if (this.manifest) return this.manifest
    try {
      const raw = await RNFS.readFile(MANIFEST_PATH, "utf8")
      this.manifest = JSON.parse(raw) as Record<string, true>
    } catch {
      this.manifest = {}
    }
    return this.manifest
  }

  private async saveManifest(): Promise<void> {
    if (!this.manifest) return
    try {
      await RNFS.writeFile(MANIFEST_PATH, JSON.stringify(this.manifest), "utf8")
    } catch (err) {
      console.warn(`${TAG} manifest save failed:`, err)
    }
  }

  private async processQueue(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const manifest = await this.loadManifest()
      while (this.queue.length > 0) {
        const item = this.queue.shift()!
        if (manifest[item.id]) continue
        const ok = await this.uploadOne(item)
        if (ok) {
          manifest[item.id] = true
          await this.saveManifest()
        }
        // On failure we simply drop it from the in-memory queue; the next
        // gallery sync re-enqueues it (id not in manifest → retried).
      }
    } finally {
      this.running = false
    }
  }

  private async uploadOne(item: MdjUploadItem): Promise<boolean> {
    const userEmail = socketComms.userid
    if (!userEmail) {
      console.warn(`${TAG} no signed-in account yet — will retry on next sync`)
      return false
    }
    const filepath = item.filePath.replace(/^file:\/\//, "")
    try {
      const stat = await RNFS.stat(filepath)
      if (!stat.isFile() || Number(stat.size) === 0) {
        console.warn(`${TAG} skipping ${item.id} — missing/empty file`)
        return false
      }
      const name = filepath.split("/").pop() || (item.isVideo ? "video.mp4" : "photo.jpg")
      const result = await RNFS.uploadFiles({
        toUrl: `${BACKEND}/gallery-upload`,
        files: [
          {
            name: "file",
            filename: name,
            filepath,
            filetype: item.isVideo ? "video/mp4" : "image/jpeg",
          },
        ],
        method: "POST",
        binaryStreamOnly: true,
        headers: {
          "Authorization": `Bearer ${UPLOAD_TOKEN}`,
          "X-User-Email": userEmail,
          "X-Captured-At": String(item.timestamp || Date.now()),
          "X-Media-Name": name,
          "Content-Type": "application/octet-stream",
        },
      }).promise
      if (result.statusCode >= 200 && result.statusCode < 300) {
        console.log(`${TAG} ✅ uploaded ${item.id} (${stat.size}b)`)
        return true
      }
      console.warn(`${TAG} upload of ${item.id} got HTTP ${result.statusCode}: ${result.body?.slice?.(0, 200)}`)
      return false
    } catch (err) {
      console.warn(`${TAG} upload of ${item.id} failed:`, err)
      return false
    }
  }
}

export const mdjGalleryUploader = new MdjGalleryUploader()
