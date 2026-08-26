/* StudyVerse chat enhancements: camera capture, file picker, voice recording,
   inline media previews, and tight chat/composer layout. */

const MEDIA_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|mp4|webm|mov|m4v|avi|mp3|wav|ogg|m4a|aac|pdf)$/i

function isChatComposer(el) {
  return el?.matches?.('.sv-chat-tools, .sv-room-composer')
}

function fileInput(composer) {
  return [...composer.querySelectorAll('input[type="file"]')].find(x => x !== composer.querySelector('input:not([type="file"])')) || composer.querySelector('input[type="file"]')
}

function deliverFile(composer, file) {
  const input = fileInput(composer)
  if (!input || !file) return
  try {
    const dt = new DataTransfer()
    dt.items.add(file)
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  } catch (err) {
    console.error('StudyVerse could not deliver captured media to the chat uploader.', err)
  }
}

function formatTime(sec) {
  const s = Math.floor(sec)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function makeButton(label, title, cls) {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = cls
  b.title = title
  b.setAttribute('aria-label', title)
  b.textContent = label
  return b
}

let mediaModal = null
function closeMediaModal() {
  mediaModal?.remove()
  mediaModal = null
}

function openMediaModal(src, kind) {
  closeMediaModal()
  const overlay = document.createElement('div')
  overlay.className = 'sv-media-lightbox'
  overlay.innerHTML = `<div class="sv-media-lightbox-card"><button type="button" class="sv-media-lightbox-close" aria-label="Close">×</button><div class="sv-media-lightbox-content"></div></div>`
  const content = overlay.querySelector('.sv-media-lightbox-content')
  const node = kind === 'video' ? document.createElement('video') : document.createElement('img')
  node.src = src
  if (kind === 'video') { node.controls = true; node.autoplay = true; node.playsInline = true }
  node.alt = 'Chat attachment'
  content.appendChild(node)
  overlay.querySelector('.sv-media-lightbox-close').onclick = closeMediaModal
  overlay.addEventListener('click', e => { if (e.target === overlay) closeMediaModal() })
  document.body.appendChild(overlay)
  mediaModal = overlay
}

function enhanceAttachments(root = document) {
  root.querySelectorAll('a.sv-chat-attachment').forEach(anchor => {
    if (anchor.dataset.mediaEnhanced === '1') return
    const href = anchor.href
    const label = anchor.textContent.trim()
    const lower = `${label} ${href}`.toLowerCase()
    let kind = null
    if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(lower)) kind = 'image'
    else if (/\.(mp4|webm|mov|m4v|avi)(\?|$)/i.test(lower)) kind = 'video'
    else if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(lower)) kind = 'audio'
    else if (anchor.dataset.type?.startsWith('image/')) kind = 'image'
    else if (anchor.dataset.type?.startsWith('video/')) kind = 'video'
    else if (anchor.dataset.type?.startsWith('audio/')) kind = 'audio'
    if (!kind) return

    anchor.dataset.mediaEnhanced = '1'
    anchor.classList.add(`sv-inline-${kind}`)
    if (kind === 'image') {
      anchor.textContent = ''
      const img = document.createElement('img')
      img.src = href
      img.alt = label || 'Image'
      img.loading = 'lazy'
      anchor.appendChild(img)
      anchor.onclick = e => { e.preventDefault(); openMediaModal(href, 'image') }
    } else if (kind === 'video') {
      anchor.textContent = ''
      const video = document.createElement('video')
      video.src = href
      video.controls = true
      video.playsInline = true
      anchor.appendChild(video)
      anchor.onclick = e => {
        if (e.target.tagName === 'VIDEO' || e.target.closest('video')) return
        e.preventDefault()
        openMediaModal(href, 'video')
      }
    } else if (kind === 'audio') {
      anchor.textContent = ''
      const audio = document.createElement('audio')
      audio.src = href
      audio.controls = true
      anchor.appendChild(audio)
    }
  })
}

async function openCamera(composer) {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Camera access is not available in this browser. Please use HTTPS or localhost.')
    return
  }
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
  } catch (err) {
    alert(`Camera could not be opened: ${err?.message || 'permission was denied'}`)
    return
  }

  const dialog = document.createElement('dialog')
  dialog.className = 'sv-camera-dialog'
  dialog.innerHTML = `<div class="sv-camera-card"><div class="sv-camera-title"><strong>Take a photo</strong><button type="button" class="sv-camera-close">×</button></div><video autoplay playsinline></video><div class="sv-camera-actions"><button type="button" class="sv-camera-cancel">Cancel</button><button type="button" class="sv-camera-capture">● Capture</button></div></div>`
  document.body.appendChild(dialog)
  const video = dialog.querySelector('video')
  video.srcObject = stream
  dialog.showModal()

  const cleanup = () => { stream.getTracks().forEach(t => t.stop()); dialog.close(); dialog.remove() }
  dialog.querySelector('.sv-camera-close').onclick = cleanup
  dialog.querySelector('.sv-camera-cancel').onclick = cleanup
  dialog.addEventListener('cancel', cleanup, { once: true })
  dialog.querySelector('.sv-camera-capture').onclick = () => {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (blob) deliverFile(composer, new File([blob], `studyverse-photo-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      cleanup()
    }, 'image/jpeg', 0.92)
  }
}

async function toggleVoice(composer, button) {
  if (button.dataset.recording === '1') {
    button._recorder?.stop()
    return
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    alert('Voice recording is not supported by this browser.')
    return
  }
  let stream
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
  catch (err) { alert(`Microphone access could not be opened: ${err?.message || 'permission was denied'}`); return }

  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  const mime = types.find(t => MediaRecorder.isTypeSupported?.(t)) || ''
  const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
  const chunks = []
  const started = Date.now()
  button.dataset.recording = '1'
  button._recorder = recorder
  button.classList.add('is-recording')
  button.textContent = '■'
  button.title = 'Stop voice recording'
  const timer = setInterval(() => { button.textContent = `■ ${formatTime((Date.now() - started) / 1000)}` }, 250)
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
  recorder.onstop = () => {
    clearInterval(timer)
    stream.getTracks().forEach(t => t.stop())
    const type = recorder.mimeType || mime || 'audio/webm'
    const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
    const blob = new Blob(chunks, { type })
    deliverFile(composer, new File([blob], `studyverse-voice-${Date.now()}.${ext}`, { type }))
    button.dataset.recording = '0'
    button._recorder = null
    button.classList.remove('is-recording')
    button.textContent = '🎙️'
    button.title = 'Record voice message'
  }
  recorder.start()
}

function enhanceComposer(composer) {
  if (!isChatComposer(composer) || composer.dataset.enhanced === '1') return
  composer.dataset.enhanced = '1'
  composer.classList.add('sv-enhanced-composer')
  const files = composer.querySelectorAll('input[type="file"]')
  files.forEach(input => { input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip' })

  const buttons = [...composer.querySelectorAll('button')]
  const cameraButton = buttons[0]
  const attachButton = buttons[1]
  if (cameraButton) {
    cameraButton.textContent = '📷'
    cameraButton.title = 'Open camera'
    cameraButton.onclick = e => { e.preventDefault(); openCamera(composer) }
  }
  if (attachButton) {
    attachButton.textContent = '📎'
    attachButton.title = 'Send files, images or videos'
  }

  const voice = makeButton('🎙️', 'Record voice message', 'sv-voice-button')
  const input = composer.querySelector('input:not([type="file"])')
  if (input) composer.insertBefore(voice, input)
  voice.addEventListener('click', () => toggleVoice(composer, voice))
}

function fixChatLayout() {
  document.querySelectorAll('.sv-chat-panel').forEach(panel => {
    panel.style.display = 'flex'
    panel.style.flexDirection = 'column'
    panel.style.minHeight = '0'
    panel.style.height = '100%'
    const messages = panel.querySelector('.sv-messages')
    const composer = panel.querySelector('.sv-chat-tools')
    if (messages) { messages.style.flex = '1 1 auto'; messages.style.minHeight = '0'; messages.style.height = 'auto'; messages.style.overflowY = 'auto' }
    if (composer) { composer.style.flex = '0 0 auto'; composer.style.marginTop = '0'; composer.style.marginBottom = '0' }
  })
  document.querySelectorAll('.sv-room-chat-shell').forEach(shell => {
    shell.style.display = 'flex'
    shell.style.flexDirection = 'column'
    shell.style.minHeight = '0'
    const messages = shell.querySelector('.sv-room-chat-messages')
    const composer = shell.querySelector('.sv-room-composer')
    if (messages) { messages.style.flex = '1 1 auto'; messages.style.minHeight = '0'; messages.style.height = 'auto'; messages.style.overflowY = 'auto' }
    if (composer) { composer.style.flex = '0 0 auto'; composer.style.marginTop = '0'; composer.style.marginBottom = '0' }
  })
}

function enhance() {
  fixChatLayout()
  document.querySelectorAll('.sv-chat-tools, .sv-room-composer').forEach(enhanceComposer)
  enhanceAttachments()
}

if (typeof window !== 'undefined') {
  const run = () => requestAnimationFrame(enhance)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true })
  else run()
  const observer = new MutationObserver(() => run())
  observer.observe(document.body, { childList: true, subtree: true })
}
