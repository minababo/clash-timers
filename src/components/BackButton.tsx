import { BACK_BUTTON } from './buttonStyles'

interface BackButtonProps {
  label: string
  onClick: () => void
}

export function BackButton({ label, onClick }: BackButtonProps) {
  return (
    <button type="button" onClick={onClick} className={BACK_BUTTON}>
      <span aria-hidden="true">←</span>
      {label}
    </button>
  )
}
