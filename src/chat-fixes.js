/* Final chat interaction fixes. Runs in capture phase so React's hidden file-input handlers cannot hijack camera clicks. */

(() => {
  if (typeof window === 'undefined' || window.__svChatFixesLoaded) return
  window.__svChatFixesLoaded = true

  const composerFor = el => el?.closest?.('.sv-chat-tools, .sv-room-composer')

  const fileInputs = composer => [...(composer?.querySelectorAll('input[type="file"]') || [])]

  const openAttachmentPicker = composer => {
    const inputs = fileInputs(composer)
    const input = inputs[inputs.length - 1]
    if (input) input.click()
  }

  const openCamera = async composer => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera access is not available in this browser. Please open StudyVerse using HTTPS or localhost.')
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      })
    } catch (err) {
      alert(`Camera could not be opened: ${err?.message || 'permission was denied'}`)
      return
    }

    const dialog = document.createElement('dialog')
    dialog.className = 'sv-camera-dialog'
    dialog.innerHTML = `
      <div class="sv-camera-card">
        <div class="sv-camera-title">
          <strong>Take a photo</strong>
          <button type="button" class="sv-camera-close" aria-label="Close camera">×</button>
        </div>
        <video autoplay playsinline muted></video>
        <div class="sv-camera-actions">
          <button type="button" class="sv-camera-cancel">Cancel</button>
          <button type="button" class="sv-camera-capture">● Capture</button>
        </div>
      </div>`

    document.body.appendChild(dialog)
    const video = dialog.querySelector('video')
    video.srcObject = stream

    const cleanup = () => {
      stream.getTracks().forEach(track => track.stop())
      if (dialog.open) dialog.close()
      dialog.remove()
    }

    dialog.querySelector('.sv-camera-close').onclick = cleanup
    dialog.querySelector('.sv-camera-cancel').onclick = cleanup
    dialog.addEventListener('cancel', event => { event.preventDefault(); cleanup() }, { once: true })

    dialog.querySelector('.sv-camera-capture').onclick = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        if (!blob) return cleanup()
        const file = new File([blob], `studyverse-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        const input = fileInputs(composer)[0]
        if (!input) return cleanup()
        const dt = new DataTransfer()
        dt.items.add(file)
        input.files = dt.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
        cleanup()
      }, 'image/jpeg', 0.92)
    }

    dialog.showModal()
  }

  const fixLayout = () => {
    document.querySelectorAll('.sv-messages, .sv-room-chat-messages').forEach(messages => {
      messages.style.justifyContent = 'flex-end'
    })
    document.querySelectorAll('.sv-chat-tools, .sv-room-composer').forEach(composer => {
      composer.style.marginTop = '0'
      composer.style.marginBottom = '0'
    })
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement
    const cameraButton = target?.closest?.('.sv-chat-tools > button:first-child, .sv-room-composer > button:first-child')
    const attachButton = target?.closest?.('.sv-chat-tools > button:nth-child(2), .sv-room-composer > button:nth-child(2)')

    if (cameraButton) {
      const composer = composerFor(cameraButton)
      event.preventDefault()
      event.stopImmediatePropagation()
      openCamera(composer)
      return
    }

    if (attachButton) {
      const composer = composerFor(attachButton)
      event.preventDefault()
      event.stopImmediatePropagation()
      openAttachmentPicker(composer)
    }
  }, true)

  fixLayout()
  new MutationObserver(fixLayout).observe(document.body, { childList: true, subtree: true })
})()
