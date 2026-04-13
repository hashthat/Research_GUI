import { getShortTitle } from '../utils/apaFormatter'

export default function SourceTabs({ sources, activeSourceId, onSelect, onAdd, onRemove }) {
  const maxSources = 5

  return (
    <div className="source-tabs">
      {sources.map((src) => (
        <button
          key={src.id}
          className={`source-tab${src.id === activeSourceId ? ' source-tab-active' : ''}`}
          onClick={() => onSelect(src.id)}
          title={src.apa?.title || 'Source'}
        >
          <span>{getShortTitle(src.apa, src.fileName || 'Untitled')}</span>
          <span
            className="source-tab-del"
            role="button"
            tabIndex={0}
            title="Remove source"
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Remove source "${getShortTitle(src.apa, src.fileName || 'Untitled')}"? Annotations will be lost.`)) {
                onRemove(src.id)
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click() }}
          >
            ×
          </span>
        </button>
      ))}
      <button
        className="btn source-tab source-tab-add"
        onClick={onAdd}
        disabled={sources.length >= maxSources}
        title={sources.length >= maxSources ? 'Maximum 5 sources' : 'Add a source'}
      >
        + Add Source
      </button>
    </div>
  )
}
