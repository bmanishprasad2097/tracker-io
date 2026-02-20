import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl animate-fade-up"
        style={{
          background: 'linear-gradient(145deg, #0e0e22 0%, #0a0a18 100%)',
          border: '1px solid #1e1e3a',
          boxShadow: '0 20px 60px #00000080, 0 0 0 1px #1e1e3a',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #15152a' }}
        >
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#4a4a6a' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#d0d0f0'; (e.currentTarget as HTMLElement).style.background = '#ffffff0a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a4a6a'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
