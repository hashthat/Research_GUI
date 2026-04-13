export default function Toolbar({
  activeTab, onTabChange,
  hasDocument, onPaste, onOpenFile, onSave, onLoad, onExport, onClear
}) {
  return (
    <div className="toolbar">
      <div className="tab-bar">
        <button className={`tab-btn${activeTab === 'annotate' ? ' tab-btn-active' : ''}`} onClick={() => onTabChange('annotate')}>Annotate</button>
        <button className={`tab-btn${activeTab === 'write' ? ' tab-btn-active' : ''}`} onClick={() => onTabChange('write')}>Write</button>
      </div>
      <div className="toolbar-sep" />
      <span className="toolbar-title">Story Tool</span>
      <div className="toolbar-sep" />
      <button className="btn" onClick={onPaste} title="Paste text">
        Paste Text
      </button>
      <button className="btn" onClick={onOpenFile} title="Open .txt or .docx file">
        Open File
      </button>
      {hasDocument && (
        <>
          <div className="toolbar-sep" />
          <button className="btn" onClick={onSave} title="Save project as JSON">
            Save Project
          </button>
        </>
      )}
      <button className="btn" onClick={onLoad} title="Load saved project">
        Load Project
      </button>
      {hasDocument && (
        <>
          <div className="toolbar-sep" />
          <button className="btn btn-accent" onClick={onExport}>
            Export PDF
          </button>
          <button className="btn btn-danger" onClick={onClear} title="Clear document and annotations">
            Clear
          </button>
        </>
      )}
    </div>
  )
}
