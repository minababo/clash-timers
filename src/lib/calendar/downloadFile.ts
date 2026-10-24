/** Saves `content` as a file via a temporary object URL and <a download>. */
export function downloadFile(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  // Revoking straight away can cancel the download in some browsers (notably Safari).
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
