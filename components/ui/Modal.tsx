"use client"

import { ReactNode } from "react"

interface ModalProps {
  children: ReactNode
  onClose: () => void
}

export function Modal({ children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose} // close on background click
    >
      <div
        className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md"
        onClick={e => e.stopPropagation()} // prevent modal click from closing
      >
        {children}
      </div>
    </div>
  )
}
