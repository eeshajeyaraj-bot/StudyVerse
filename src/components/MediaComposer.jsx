import { useEffect, useRef, useState } from 'react'

const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function MediaComposer({ value, onChange, onSend, onUpload, uploading = false, placeholder = 'Message...' }) {
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const timerRef = useRef(null)
  const startedRef = useRef(0)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); clearInterval(timerRef.current) }, [])
  useEffect(() => { if (cameraOpen && videoRef.current) videoRef.current.srcObject = streamRef.current }, [cameraOpen])

  async function camera() {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) return setError('Camera requires HTTPS or localhost.')
    try { streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); setCameraOpen(true) }
    catch (e) { setError(`Camera could not be opened: ${e?.message || 'permission denied'}`) }
  }
  function closeCamera() { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setCameraOpen(false) }
  function capture() {
    const v = videoRef.current
    if (!v?.videoWidth) return setError('Camera is still starting. Try again.')
    const canvas = document.createElement('canvas'); canvas.width = v.videoWidth; canvas.height = v.videoHeight
    canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => { if (blob) onUpload(new File([blob], `studyverse-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })); closeCamera() }, 'image/jpeg', .92)
  }
  function choose(e) { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(f) }
  async function voice() {
    if (recording) return recorderRef.current?.stop()
    setError('')
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return setError('Voice recording is not supported by this browser.')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const types = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4']; const mime = types.find(t => MediaRecorder.isTypeSupported?.(t)) || ''
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); const chunks = []
      recorderRef.current = recorder; startedRef.current = Date.now(); setRecording(true)
      timerRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedRef.current) / 1000)), 250)
      recorder.ondataavailable = e => e.data.size && chunks.push(e.data)
      recorder.onstop = () => { clearInterval(timerRef.current); stream.getTracks().forEach(t => t.stop()); const type = recorder.mimeType || mime || 'audio/webm'; const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'; onUpload(new File([new Blob(chunks, { type })], `studyverse-voice-${Date.now()}.${ext}`, { type })); recorderRef.current = null; setRecording(false); setSeconds(0) }
      recorder.start()
    } catch (e) { setError(`Microphone could not be opened: ${e?.message || 'permission denied'}`) }
  }
  return <>
    <div className="sv-chat-tools">
      <button type="button" title="Open camera" onClick={camera}>📷</button>
      <button type="button" title="Send files, images or videos" onClick={() => fileRef.current?.click()}>📎</button>
      <input ref={fileRef} type="file" hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.ppt,.pptx,.xls,.xlsx" onChange={choose}/>
      <button type="button" className={recording ? 'sv-voice-button is-recording' : 'sv-voice-button'} title={recording ? 'Stop recording' : 'Record voice'} onClick={voice}>{recording ? `■ ${clock(seconds)}` : '🎙️'}</button>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}/>
      <button type="button" disabled={uploading || !value.trim()} onClick={onSend}>{uploading ? 'Uploading…' : 'Send'}</button>
      {error && <button type="button" className="sv-media-error" onClick={() => setError('')} title="Dismiss">{error} ×</button>}
    </div>
    {cameraOpen && <dialog className="sv-camera-dialog" open><div className="sv-camera-card"><div className="sv-camera-title"><strong>Take a photo</strong><button type="button" className="sv-camera-close" onClick={closeCamera}>×</button></div><video ref={videoRef} autoPlay playsInline muted/><div className="sv-camera-actions"><button type="button" onClick={closeCamera}>Cancel</button><button type="button" className="sv-camera-capture" onClick={capture}>● Capture</button></div></div></dialog>}
  </>
}
