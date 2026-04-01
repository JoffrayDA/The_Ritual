import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'error' | 'success' | 'info'
  onDismiss: () => void
}

export function Toast({ message, type = 'info', onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const colorClass =
    type === 'error' ? 'bg-red-600' :
    type === 'success' ? 'bg-green-600' :
    'bg-gray-700'

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg ${colorClass}`}>
      {message}
    </div>
  )
}

// Gestionnaire de toasts global
interface ToastState {
  id: number
  message: string
  type: 'error' | 'success' | 'info'
}

let toastId = 0
let setToastsGlobal: React.Dispatch<React.SetStateAction<ToastState[]>> | null = null

export function showToast(message: string, type: 'error' | 'success' | 'info' = 'info') {
  if (setToastsGlobal) {
    const id = ++toastId
    setToastsGlobal(prev => [...prev, { id, message, type }])
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  useEffect(() => {
    setToastsGlobal = setToasts
    return () => { setToastsGlobal = null }
  }, [])

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <>
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => dismiss(t.id)} />
      ))}
    </>
  )
}
