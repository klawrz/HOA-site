import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

const MAX_UPLOAD_SIZE = 15 * 1024 * 1024 // 15MB

// Files are stored on local disk under public/uploads - fine for this dev
// environment, not committed to git (see .gitignore). A real deployment
// would swap this for object storage without changing the callers.
export async function saveUploadedFile(
  file: File,
  subdir: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  if (file.size === 0) return { success: false, error: "Empty file" }
  if (file.size > MAX_UPLOAD_SIZE) return { success: false, error: "File is too large (max 15MB)" }

  const uploadDir = path.join(process.cwd(), "public", "uploads", subdir)
  await mkdir(uploadDir, { recursive: true })
  const ext = path.extname(file.name).slice(0, 20)
  const filename = `${randomUUID()}${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, filename), buffer)

  return { success: true, url: `/uploads/${subdir}/${filename}` }
}

export async function resolveFileUrl(formData: FormData, fallbackUrl: string | null, subdir: string) {
  const uploaded = formData.get("file")
  if (uploaded instanceof File && uploaded.size > 0) {
    const result = await saveUploadedFile(uploaded, subdir)
    if (!result.success) return { success: false as const, error: result.error }
    return { success: true as const, url: result.url }
  }
  return { success: true as const, url: fallbackUrl }
}
