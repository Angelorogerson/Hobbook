import './EmptyState.css'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: string
  actionButton?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ title, description, icon = '📭', actionButton }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h2 className="empty-state-title">{title}</h2>
      {description && <p className="empty-state-description">{description}</p>}
      {actionButton && (
        <button className="empty-state-button" onClick={actionButton.onClick}>
          {actionButton.label}
        </button>
      )}
    </div>
  )
}
