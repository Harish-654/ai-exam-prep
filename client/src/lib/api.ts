import type { PrepResult } from './types'

export interface UploadOptions {
  pages?: string
  prompt?: string
}

export async function uploadDocument(file: File, options: UploadOptions = {}): Promise<PrepResult> {
  const form = new FormData()
  form.append('document', file)
  if (options.pages && options.pages.trim()) {
    form.append('pages', options.pages.trim())
  }
  if (options.prompt && options.prompt.trim()) {
    form.append('prompt', options.prompt.trim())
  }

  const res = await fetch('/api/generate-exam-prep', {
    method: 'POST',
    body: form,
  })

  let data: PrepResult & { success?: boolean; error?: string }
  try {
    data = await res.json()
  } catch {
    throw new Error('Server returned an unreadable response.')
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Request failed with status ${res.status}.`)
  }

  return data
}