import './Input.css'

interface InputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  error?: string
  disabled?: boolean
  name?: string
  className?: string
}

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  disabled = false,
  name,
  className = '',
}: InputProps) {
  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        name={name}
        className={`input-field ${error ? 'input-error' : ''}`}
      />
      {error && <div className="input-error-text">{error}</div>}
    </div>
  )
}
