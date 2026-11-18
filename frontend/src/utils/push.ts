import { getPushKey, removePushSubscription, savePushSubscription } from '@/api/loopApi'

// Web push is an extra channel (next to the bell and email), opt-in per device.

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function keyToBytes(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration('/')
  return reg ? reg.pushManager.getSubscription() : null
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Dieser Browser unterstützt keine Push-Benachrichtigungen.')
  const key = await getPushKey()
  if (!key) throw new Error('Push ist auf diesem Server noch nicht eingerichtet.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Benachrichtigungen sind im Browser blockiert. Du kannst sie in den Website-Einstellungen erlauben.')
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) }))
  await savePushSubscription(sub.toJSON())
}

export async function disablePush(): Promise<void> {
  const sub = await currentPushSubscription()
  if (!sub) return
  await removePushSubscription(sub.endpoint).catch(() => {})
  await sub.unsubscribe()
}
