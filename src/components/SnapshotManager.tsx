/**
 * Snapshot Manager Component
 * 
 * A comprehensive CRUD interface for managing tldraw snapshots.
 * Uses Ant Design for UI components with full create, read, update, delete operations.
 * 
 * Features:
 * - Toggle visibility with a floating button
 * - Modal/Dialog interface when opened
 * - List all snapshots with metadata (name, date, size)
 * - Create new snapshot with custom name
 * - Load snapshot into editor
 * - Rename existing snapshot
 * - Delete snapshot with confirmation
 * - Auto-save toggle for current snapshot
 * - Manual save button
 * - Import multiple snapshots (auto-rename on duplicate)
 * - Export selected snapshots
 * 
 * Rendered via React Portal to avoid pointer-event conflicts with tldraw.
 * 
 * @module components/SnapshotManager
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Table,
  Modal,
  Input,
  Space,
  Popconfirm,
  Tag,
  Tooltip,
  message,
  Switch,
  Typography,
  Empty,
  Spin,
  FloatButton,
  Upload,
  Dropdown,
  Progress,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  SaveOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  EditOutlined,
  CloudUploadOutlined,
  FileImageOutlined,
  SyncOutlined,
  FolderOutlined,
  UploadOutlined,
  DownloadOutlined,
  ExportOutlined,
  ImportOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { getSnapshot, loadSnapshot, useEditor } from 'tldraw'
import type { SnapshotInfo } from '../types'
import {
  fetchSnapshots,
  saveSnapshot,
  loadSnapshotFromServer,
  deleteSnapshot,
  updateSnapshot,
  renameSnapshot,
  importSnapshots,
  exportSnapshots,
  exportSingleSnapshot,
} from '../services/snapshotApi'

const { Text, Title } = Typography

/** Auto-save interval in milliseconds (5 seconds) */
const AUTO_SAVE_INTERVAL = 5000

/** LocalStorage key for persisting current snapshot */
const CURRENT_SNAPSHOT_KEY = 'tldraw-current-snapshot'

/**
 * Snapshot Manager Component
 * 
 * Provides a full CRUD interface for managing snapshots with Ant Design UI.
 * Rendered via React Portal to avoid pointer-event conflicts with tldraw.
 * 
 * @returns JSX element with snapshot management interface
 */
function SnapshotManager() {
  const editor = useEditor()
  
  /** Visibility of the snapshot manager modal */
  const [isVisible, setIsVisible] = useState(false)
  
  /** List of available snapshots */
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  
  /** Loading state for data fetching */
  const [loading, setLoading] = useState(false)
  
  /** Current active snapshot - initialized from localStorage */
  const [currentSnapshot, setCurrentSnapshot] = useState<{ name: string; filename: string } | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_SNAPSHOT_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  
  /** Auto-save enabled state */
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  
  /** Saving state indicator */
  const [isSaving, setIsSaving] = useState(false)
  
  /** Create modal visibility */
  const [createModalVisible, setCreateModalVisible] = useState(false)
  
  /** Rename modal visibility */
  const [renameModalVisible, setRenameModalVisible] = useState(false)
  
  /** Snapshot being renamed */
  const [renamingSnapshot, setRenamingSnapshot] = useState<SnapshotInfo | null>(null)
  
  /** New name input for create/rename */
  const [newName, setNewName] = useState('')
  
  /** Selected row keys for export */
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  
  /** Import progress */
  const [importProgress, setImportProgress] = useState<number | null>(null)
  
  /** File input ref for import */
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Fetches all snapshots from the server
   */
  const loadSnapshots = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchSnapshots()
      setSnapshots(data)
    } catch (error) {
      message.error('Failed to load snapshots')
      console.error('Failed to fetch snapshots:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Creates a new snapshot with the given name
   */
  const handleCreate = useCallback(async () => {
    if (!newName.trim()) {
      message.warning('Please enter a snapshot name')
      return
    }

    setIsSaving(true)
    try {
      const { document, session } = getSnapshot(editor.store)
      const filename = await saveSnapshot(newName.trim(), { document, session })
      
      setCurrentSnapshot({ name: newName.trim(), filename })
      setAutoSaveEnabled(true)
      message.success(`Snapshot "${newName}" created successfully`)
      setCreateModalVisible(false)
      setNewName('')
      loadSnapshots()
    } catch (error) {
      message.error('Failed to create snapshot')
      console.error('Failed to create snapshot:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editor, newName, loadSnapshots])

  /**
   * Loads a snapshot into the editor
   */
  const handleLoad = useCallback(async (snapshot: SnapshotInfo) => {
    try {
      const data = await loadSnapshotFromServer(snapshot.filename)
      loadSnapshot(editor.store, data as any)
      
      setCurrentSnapshot({ name: snapshot.name, filename: snapshot.filename })
      setAutoSaveEnabled(true)
      message.success(`Snapshot "${snapshot.name}" loaded`)
    } catch (error) {
      message.error('Failed to load snapshot')
      console.error('Failed to load snapshot:', error)
    }
  }, [editor])

  /**
   * Renames a snapshot
   */
  const handleRename = useCallback(async () => {
    if (!renamingSnapshot || !newName.trim()) {
      message.warning('Please enter a new name')
      return
    }

    try {
      await renameSnapshot(renamingSnapshot.filename, newName.trim())
      
      // Update current snapshot if renaming the active one
      if (currentSnapshot?.filename === renamingSnapshot.filename) {
        setCurrentSnapshot({ name: newName.trim(), filename: `${newName.trim()}.json` })
      }
      
      message.success('Snapshot renamed successfully')
      setRenameModalVisible(false)
      setRenamingSnapshot(null)
      setNewName('')
      loadSnapshots()
    } catch (error) {
      message.error('Failed to rename snapshot')
      console.error('Failed to rename snapshot:', error)
    }
  }, [renamingSnapshot, newName, currentSnapshot, loadSnapshots])

  /**
   * Deletes a snapshot
   */
  const handleDelete = useCallback(async (snapshot: SnapshotInfo) => {
    try {
      await deleteSnapshot(snapshot.filename)
      
      // Clear current snapshot if deleting the active one
      if (currentSnapshot?.filename === snapshot.filename) {
        setCurrentSnapshot(null)
        setAutoSaveEnabled(true)
      }
      
      message.success('Snapshot deleted')
      loadSnapshots()
    } catch (error) {
      message.error('Failed to delete snapshot')
      console.error('Failed to delete snapshot:', error)
    }
  }, [currentSnapshot, loadSnapshots])

  /**
   * Manually updates the current snapshot
   */
  const handleManualSave = useCallback(async () => {
    if (!currentSnapshot) {
      message.warning('No snapshot selected')
      return
    }

    setIsSaving(true)
    try {
      const { document, session } = getSnapshot(editor.store)
      await updateSnapshot(currentSnapshot.filename, { document, session })
      message.success('Snapshot saved')
    } catch (error) {
      message.error('Failed to save snapshot')
      console.error('Failed to save snapshot:', error)
    } finally {
      setIsSaving(false)
    }
  }, [currentSnapshot, editor])

  /**
   * Opens the rename modal
   */
  const openRenameModal = useCallback((snapshot: SnapshotInfo) => {
    setRenamingSnapshot(snapshot)
    setNewName(snapshot.name)
    setRenameModalVisible(true)
  }, [])

  /**
   * Handles file import
   */
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setImportProgress(0)
    
    try {
      const fileArray = Array.from(files)
      const importedNames = await importSnapshots(fileArray, (current, total) => {
        setImportProgress((current / total) * 100)
      })
      
      if (importedNames.length > 0) {
        message.success(`Imported ${importedNames.length} snapshot(s)`)
        loadSnapshots()
      }
    } catch (error) {
      message.error('Failed to import snapshots')
      console.error('Failed to import snapshots:', error)
    } finally {
      setImportProgress(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [loadSnapshots])

  /**
   * Handles export of selected snapshots
   */
  const handleExport = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select snapshots to export')
      return
    }

    try {
      const filenames = selectedRowKeys as string[]
      
      if (filenames.length === 1) {
        await exportSingleSnapshot(filenames[0])
      } else {
        await exportSnapshots(filenames)
      }
      
      message.success('Snapshots exported')
    } catch (error) {
      message.error('Failed to export snapshots')
      console.error('Failed to export snapshots:', error)
    }
  }, [selectedRowKeys])

  /**
   * Handles export of a single snapshot
   */
  const handleExportSingle = useCallback(async (filename: string) => {
    try {
      await exportSingleSnapshot(filename)
      message.success('Snapshot exported')
    } catch (error) {
      message.error('Failed to export snapshot')
      console.error('Failed to export snapshot:', error)
    }
  }, [])

  /**
   * Formats file size for display
   */
  const formatSize = (bytes: number): string => {
    return (bytes / 1024).toFixed(1) + ' KB'
  }

  /**
   * Formats date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString()
  }

  // Auto-save effect
  useEffect(() => {
    if (!autoSaveEnabled || !currentSnapshot) return

    const autoSave = async () => {
      if (isSaving) return
      setIsSaving(true)
      try {
        const { document, session } = getSnapshot(editor.store)
        await updateSnapshot(currentSnapshot.filename, { document, session })
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setIsSaving(false)
      }
    }

    const intervalId = setInterval(autoSave, AUTO_SAVE_INTERVAL)
    return () => clearInterval(intervalId)
  }, [autoSaveEnabled, currentSnapshot, editor, isSaving])

  // Load snapshots when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      loadSnapshots()
    }
  }, [isVisible, loadSnapshots])

  // Persist current snapshot to localStorage
  useEffect(() => {
    if (currentSnapshot) {
      localStorage.setItem(CURRENT_SNAPSHOT_KEY, JSON.stringify(currentSnapshot))
    } else {
      localStorage.removeItem(CURRENT_SNAPSHOT_KEY)
    }
  }, [currentSnapshot])

  // Auto-load saved snapshot on mount
  useEffect(() => {
    const loadSavedSnapshot = async () => {
      if (currentSnapshot) {
        try {
          const data = await loadSnapshotFromServer(currentSnapshot.filename)
          loadSnapshot(editor.store, data as any)
          message.info(`Restored snapshot "${currentSnapshot.name}"`)
        } catch (error) {
          console.error('Failed to restore snapshot:', error)
          // Clear invalid snapshot reference
          setCurrentSnapshot(null)
          localStorage.removeItem(CURRENT_SNAPSHOT_KEY)
        }
      }
    }
    loadSavedSnapshot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Table row selection config
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    },
  }

  // Table columns configuration
  const columns: ColumnsType<SnapshotInfo> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: SnapshotInfo) => (
        <Space>
          <FileImageOutlined />
          <Text strong={currentSnapshot?.filename === record.filename}>
            {name}
          </Text>
          {currentSnapshot?.filename === record.filename && (
            <Tag color="green">Active</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => formatSize(size),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: SnapshotInfo) => (
        <Space>
          <Tooltip title="Load">
            <Button
              type="primary"
              icon={<FolderOpenOutlined />}
              size="small"
              onClick={() => handleLoad(record)}
            >
              Load
            </Button>
          </Tooltip>
          <Tooltip title="Rename">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => openRenameModal(record)}
            />
          </Tooltip>
          <Tooltip title="Export">
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleExportSingle(record.filename)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this snapshot?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return createPortal(
    <>
      {/* Floating toggle button */}
      <FloatButton
        icon={<FolderOutlined />}
        type={currentSnapshot ? 'primary' : 'default'}
        onClick={() => setIsVisible(true)}
        tooltip="Open Snapshot Manager"
        style={{ 
          right: 24, 
          bottom: 24,
          width: 48,
          height: 48,
          zIndex: 10000,
        }}
        badge={{
          count: currentSnapshot ? 1 : 0,
          color: '#52c41a',
        }}
      />

      {/* Main Snapshot Manager Modal */}
      <Modal
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              Snapshot Manager
            </Title>
            {currentSnapshot && (
              <Tag color="blue" icon={<FileImageOutlined />}>
                {currentSnapshot.name}
              </Tag>
            )}
          </Space>
        }
        open={isVisible}
        onCancel={() => setIsVisible(false)}
        footer={null}
        width={900}
        centered
      >
        {/* Toolbar */}
        <Space style={{ marginBottom: 16 }} wrap>
          {/* Current snapshot controls */}
          {currentSnapshot && (
            <>
              <Space size="small">
                <Text type="secondary">Auto-save:</Text>
                <Switch
                  checked={autoSaveEnabled}
                  onChange={setAutoSaveEnabled}
                  checkedChildren="ON"
                  unCheckedChildren="OFF"
                  size="small"
                />
              </Space>
              {!autoSaveEnabled && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleManualSave}
                  loading={isSaving}
                  size="small"
                >
                  Save
                </Button>
              )}
            </>
          )}
          
          {/* Create new button */}
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={() => setCreateModalVisible(true)}
            size="small"
          >
            New Snapshot
          </Button>
          
          {/* Import button */}
          <Button
            icon={<ImportOutlined />}
            onClick={() => fileInputRef.current?.click()}
            size="small"
          >
            Import
          </Button>
          
          {/* Export selected button */}
          {selectedRowKeys.length > 0 && (
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              Export ({selectedRowKeys.length})
            </Button>
          )}
          
          {/* Refresh button */}
          <Button
            icon={<SyncOutlined />}
            onClick={loadSnapshots}
            loading={loading}
            size="small"
          >
            Refresh
          </Button>
        </Space>

        {/* Import progress */}
        {importProgress !== null && (
          <Progress percent={Math.round(importProgress)} size="small" style={{ marginBottom: 16 }} />
        )}

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          multiple
          style={{ display: 'none' }}
          onChange={handleImport}
        />

        {/* Snapshots Table */}
        <Spin spinning={loading}>
          {snapshots.length === 0 ? (
            <Empty
              description="No snapshots yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Space>
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                  size="small"
                >
                  Create First Snapshot
                </Button>
                <Button
                  icon={<ImportOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  size="small"
                >
                  Import Snapshots
                </Button>
              </Space>
            </Empty>
          ) : (
            <Table
              dataSource={snapshots}
              columns={columns}
              rowKey="filename"
              rowSelection={rowSelection}
              pagination={{ pageSize: 5 }}
              size="small"
            />
          )}
        </Spin>
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Create New Snapshot"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false)
          setNewName('')
        }}
        okText="Create"
        confirmLoading={isSaving}
      >
        <Input
          placeholder="Enter snapshot name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleCreate}
          prefix={<FileImageOutlined />}
          autoFocus
        />
      </Modal>

      {/* Rename Modal */}
      <Modal
        title="Rename Snapshot"
        open={renameModalVisible}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalVisible(false)
          setRenamingSnapshot(null)
          setNewName('')
        }}
        okText="Rename"
      >
        <Input
          placeholder="Enter new name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleRename}
          prefix={<EditOutlined />}
          autoFocus
        />
      </Modal>
    </>,
    document.body
  )
}

export default SnapshotManager
