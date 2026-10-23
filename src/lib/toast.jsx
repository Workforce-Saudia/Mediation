import { useEffect, useState } from 'react'

let listeners = []

export function toast(msg, type = 'success') {
  const item = { id: Math.random().toString(36).slice(2), msg, type }
  listeners.forEach((l) => l(item))
}

export function Toaster() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const l = (item) => {
      setItems((s) => [...s, item])
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== item.id)), 4000)
    }
    listeners.push(l)
    return () => {
      listeners = listeners.filter((x) => x !== l)
    }
  }, [])
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((i) => (
        <div key={i.id} className={`toast toast-${i.type}`}>{i.msg}</div>
      ))}
    </div>
  )
}
