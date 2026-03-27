/**
 * Snapshot Manager Component
 * 
 * A comprehensive CRUD interface for managing tldraw snapshots with folder support.
 * Uses Ant Design for UI components with full create, read, update, delete operations.
 * 
 * Features:
 * - Toggle visibility with a floating button
 * - Modal/Dialog interface when opened
 * - Folder-based organization with tree view
 * - Drag and drop to move files/folders
 * - Create, rename, delete folders
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
  Breadcrumb,
  Dropdown,
  Menu,
  Card,
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
  FolderAddOutlined,
  HomeOutlined,
  RightOutlined,
  MoreOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { getSnapshot, loadSnapshot, useEditor } from 'tldraw'
import type { SnapshotInfo, SnapshotFolder, SnapshotItem } from '../types'
import {
  fetchSnapshotsWithFolders,
  saveSnapshot,
  loadSnapshotFromServer,
  deleteSnapshot,
  updateSnapshot,
  renameSnapshot,
  renameFolder,
  createFolder,
  deleteFolder,
  moveSnapshot,
  importSnapshots,
  exportSnapshots,
  exportSingleSnapshot,
  getFolderContents,
  getFolderPath,
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
  
  /** List of folders */
  const [folders, setFolders] = useState<SnapshotFolder[]>([])
  
  /** Current folder being viewed (null for root) */
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  
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
  
  /** Create folder modal visibility */
  const [createFolderModalVisible, setCreateFolderModalVisible] = useState(false)
  
  /** Rename modal visibility */
  const [renameModalVisible, setRenameModalVisible] = useState(false)
  
  /** Item being renamed */
  const [renamingItem, setRenamingItem] = useState<SnapshotItem | null>(null)
  
  /** New name input for create/rename */
  const [newName, setNewName] = useState('')
  
  /** Selected items for export */
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  
  /** Import progress */
  const [importProgress, setImportProgress] = useState<number | null>(null)
  
  /** File input ref for import */
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Fetches all snapshots and folders from the server
   */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { snapshots: snapshotData, folders: folderData } = await fetchSnapshotsWithFolders()
      setSnapshots(snapshotData)
      setFolders(folderData)
    } catch (error) {
      message.error('Failed to load data')
      console.error('Failed to fetch data:', error)
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
      const filename = await saveSnapshot(newName.trim(), { document, session }, undefined, currentFolderId)
      
      setCurrentSnapshot({ name: newName.trim(), filename })
      setAutoSaveEnabled(true)
      message.success(`Snapshot "${newName}" created successfully`)
      setCreateModalVisible(false)
      setNewName('')
      loadData()
    } catch (error) {
      message.error('Failed to create snapshot')
      console.error('Failed to create snapshot:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editor, newName, loadData, currentFolderId])

  /**
   * Creates a new folder
   */
  const handleCreateFolder = useCallback(async () => {
    if (!newName.trim()) {
      message.warning('Please enter a folder name')
      return
    }

    try {
      await createFolder(newName.trim(), currentFolderId)
      message.success(`Folder "${newName}" created`)
      setCreateFolderModalVisible(false)
      setNewName('')
      loadData()
    } catch (error) {
      message.error('Failed to create folder')
      console.error('Failed to create folder:', error)
    }
  }, [newName, currentFolderId, loadData])

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
   * Renames a snapshot or folder
   */
  const handleRename = useCallback(async () => {
    if (!renamingItem || !newName.trim()) {
      message.warning('Please enter a new name')
      return
    }

    try {
      if (renamingItem.type === 'folder') {
        await renameFolder(renamingItem.id, newName.trim())
      } else {
        const newFilename = await renameSnapshot(renamingItem.filename, newName.trim())
        
        // Update current snapshot if renaming the active one
        if (currentSnapshot?.filename === renamingItem.filename) {
          setCurrentSnapshot({ name: newName.trim(), filename: newFilename })
        }
      }
      
      message.success('Renamed successfully')
      setRenameModalVisible(false)
      setRenamingItem(null)
      setNewName('')
      loadData()
    } catch (error) {
      message.error('Failed to rename')
      console.error('Failed to rename:', error)
    }
  }, [renamingItem, newName, currentSnapshot, loadData])

  /**
   * Deletes a snapshot
   */
  const handleDeleteSnapshot = useCallback(async (snapshot: SnapshotInfo) => {
    try {
      await deleteSnapshot(snapshot.filename)
      
      // Clear current snapshot if deleting the active one
      if (currentSnapshot?.filename === snapshot.filename) {
        setCurrentSnapshot(null)
        setAutoSaveEnabled(true)
      }
      
      message.success('Snapshot deleted')
      loadData()
    } catch (error) {
      message.error('Failed to delete snapshot')
      console.error('Failed to delete snapshot:', error)
    }
  }, [currentSnapshot, loadData])

  /**
   * Deletes a folder
   */
  const handleDeleteFolder = useCallback(async (folder: SnapshotFolder, deleteContents: boolean) => {
    try {
      await deleteFolder(folder.id, deleteContents)
      message.success('Folder deleted')
      loadData()
    } catch (error) {
      message.error('Failed to delete folder')
      console.error('Failed to delete folder:', error)
    }
  }, [loadData])

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
  }, [editor, currentSnapshot])

  /**
   * Opens the rename modal for an item
   */
  const openRenameModal = useCallback((item: SnapshotItem) => {
    setRenamingItem(item)
    setNewName(item.name)
    setRenameModalVisible(true)
  }, [])

  /**
   * Navigates to a folder
   */
  const navigateToFolder = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId)
    setSelectedItems(new Set())
  }, [])

  /**
   * Handles importing snapshots
   */
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setImportProgress(0)
    try {
      const filenames = await importSnapshots(Array.from(files), (current, total) => {
        setImportProgress(Math.round((current / total) * 100))
      }, currentFolderId)

      message.success(`Imported ${filenames.length} snapshot(s)`)
      loadData()
    } catch (error) {
      message.error('Failed to import snapshots')
      console.error('Failed to import snapshots:', error)
    } finally {
      setImportProgress(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [loadData, currentFolderId])

  /**
   * Handles exporting selected snapshots
   */
  const handleExport = useCallback(async () => {
    const selectedFilenames = Array.from(selectedItems).filter(id => 
      snapshots.find(s => s.filename === id)
    )
    
    if (selectedFilenames.length === 0) {
      message.warning('No snapshots selected')
      return
    }

    try {
      await exportSnapshots(selectedFilenames)
      message.success('Snapshots exported')
    } catch (error) {
      message.error('Failed to export snapshots')
      console.error('Failed to export snapshots:', error)
    }
  }, [selectedItems, snapshots])

  /**
   * Handles exporting a single snapshot
   */
  const handleExportSingle = useCallback(async (filename: string) => {
    try {
      await exportSingleSnapshot(filename)
    } catch (error) {
      message.error('Failed to export snapshot')
      console.error('Failed to export snapshot:', error)
    }
  }, [])

  /**
   * Moves a snapshot to a different folder
   */
  const handleMoveSnapshot = useCallback(async (filename: string, targetFolderId: string | null) => {
    try {
      await moveSnapshot(filename, targetFolderId)
      message.success('Snapshot moved')
      loadData()
    } catch (error) {
      message.error('Failed to move snapshot')
      console.error('Failed to move snapshot:', error)
    }
  }, [loadData])

  /**
   * Toggles item selection
   */
  const toggleSelection = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  /**
   * Formats file size for display
   */
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

  // Load data when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      loadData()
    }
  }, [isVisible, loadData])

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

  // Get current folder contents
  const currentItems = getFolderContents(currentFolderId, snapshots, folders)
  const breadcrumbPath = getFolderPath(currentFolderId, folders)

  // Folder context menu items
  const getFolderMenuItems = (folder: SnapshotFolder): MenuProps['items'] => [
    {
      key: 'open',
      icon: <FolderOpenOutlined />,
      label: 'Open',
      onClick: () => navigateToFolder(folder.id),
    },
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: 'Rename',
      onClick: () => openRenameModal({ ...folder, type: 'folder' }),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete-keep',
      icon: <DeleteOutlined />,
      label: 'Delete (keep files)',
      onClick: () => handleDeleteFolder(folder, false),
    },
    {
      key: 'delete-all',
      icon: <DeleteOutlined />,
      label: 'Delete (with files)',
      danger: true,
      onClick: () => handleDeleteFolder(folder, true),
    },
  ]

  // Move to folder menu items
  const getMoveMenuItems = (filename: string): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'root',
        icon: <HomeOutlined />,
        label: 'Root',
        onClick: () => handleMoveSnapshot(filename, null),
      },
    ]

    // Add all folders except current
    folders.forEach(folder => {
      if (folder.id !== currentFolderId) {
        items.push({
          key: folder.id,
          icon: <FolderOutlined />,
          label: folder.name,
          onClick: () => handleMoveSnapshot(filename, folder.id),
        })
      }
    })

    return items
  }

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
            <FolderOutlined />
            <span>Snapshot Manager</span>
            {currentSnapshot && (
              <Tag color="green" icon={<FileImageOutlined />}>
                {currentSnapshot.name}
              </Tag>
            )}
          </Space>
        }
        open={isVisible}
        onCancel={() => setIsVisible(false)}
        footer={null}
        width={900}
        styles={{
          body: { maxHeight: '70vh', overflowY: 'auto' }
        }}
      >
        {/* Toolbar */}
        <Space style={{ marginBottom: 16 }} wrap>
          {/* Auto-save controls */}
          <>
            <Space size="small">
              <Text type="secondary">Auto-save:</Text>
              <Switch
                checked={autoSaveEnabled}
                onChange={setAutoSaveEnabled}
                size="small"
              />
            </Space>
            {!autoSaveEnabled && (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleManualSave}
                loading={isSaving}
                disabled={!currentSnapshot}
              >
                Save
              </Button>
            )}
          </>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => {
              setNewName('')
              setCreateModalVisible(true)
            }}
          >
            New Snapshot
          </Button>

          <Button
            icon={<FolderAddOutlined />}
            onClick={() => {
              setNewName('')
              setCreateFolderModalVisible(true)
            }}
          >
            New Folder
          </Button>

          <Button
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </Button>
          
          {selectedItems.size > 0 && (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Export ({selectedItems.size})
            </Button>
          )}
        </Space>

        {/* Breadcrumb navigation */}
        <div style={{ marginBottom: 16 }}>
          <Breadcrumb
            items={[
              {
                title: (
                  <a onClick={() => navigateToFolder(null)}>
                    <HomeOutlined /> Root
                  </a>
                ),
              },
              ...breadcrumbPath.map(folder => ({
                title: (
                  <a onClick={() => navigateToFolder(folder.id)}>
                    <FolderOutlined /> {folder.name}
                  </a>
                ),
              })),
            ]}
          />
        </div>

        {/* Content area */}
        <Spin spinning={loading}>
          {currentItems.length === 0 ? (
            <Empty
              description="No snapshots or folders"
              style={{ padding: '40px 0' }}
            >
              <Space>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => {
                    setNewName('')
                    setCreateModalVisible(true)
                  }}
                >
                  Create Snapshot
                </Button>
                <Button
                  icon={<FolderAddOutlined />}
                  onClick={() => {
                    setNewName('')
                    setCreateFolderModalVisible(true)
                  }}
                >
                  Create Folder
                </Button>
              </Space>
            </Empty>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {currentItems.map(item => (
                <Card
                  key={item.type === 'folder' ? item.id : item.filename}
                  size="small"
                  hoverable
                  style={{
                    backgroundColor: selectedItems.has(
                      item.type === 'folder' ? item.id : item.filename
                    ) ? '#e6f7ff' : undefined,
                  }}
                  onClick={() => {
                    if (item.type === 'folder') {
                      navigateToFolder(item.id)
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedItems.has(
                        item.type === 'folder' ? item.id : item.filename
                      )}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleSelection(
                          item.type === 'folder' ? item.id : item.filename
                        )
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Icon */}
                    {item.type === 'folder' ? (
                      <FolderOutlined style={{ fontSize: 24, color: '#faad14' }} />
                    ) : (
                      <FileImageOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                    )}

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong>{item.name}</Text>
                        {item.type === 'file' &&
                          currentSnapshot?.filename === item.filename && (
                            <Tag color="green">Active</Tag>
                          )
                        }
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.type === 'folder' 
                          ? `${folders.filter(f => f.parentId === item.id).length} folders, ${snapshots.filter(s => s.parentId === item.id).length} snapshots`
                          : `${formatSize(item.size)} • ${formatDate(item.createdAt)}`
                        }
                      </Text>
                    </div>

                    {/* Actions */}
                    <Space>
                      {item.type === 'file' && (
                        <>
                          <Tooltip title="Load">
                            <Button
                              type="primary"
                              icon={<FolderOpenOutlined />}
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLoad(item)
                              }}
                            >
                              Load
                            </Button>
                          </Tooltip>
                          <Dropdown menu={{ items: getMoveMenuItems(item.filename) }} trigger={['click']}>
                            <Button
                              icon={<RightOutlined />}
                              size="small"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Dropdown>
                          <Tooltip title="Export">
                            <Button
                              icon={<DownloadOutlined />}
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleExportSingle(item.filename)
                              }}
                            />
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Rename">
                        <Button
                          icon={<EditOutlined />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            openRenameModal(item)
                          }}
                        />
                      </Tooltip>
                      {item.type === 'folder' ? (
                        <Dropdown menu={{ items: getFolderMenuItems(item) }} trigger={['click']}>
                          <Button
                            icon={<MoreOutlined />}
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      ) : (
                        <Popconfirm
                          title="Delete this snapshot?"
                          description="This action cannot be undone."
                          onConfirm={(e) => {
                            e?.stopPropagation()
                            handleDeleteSnapshot(item)
                          }}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="Delete">
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              size="small"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Tooltip>
                        </Popconfirm>
                      )}
                    </Space>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Spin>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          multiple
          style={{ display: 'none' }}
          onChange={handleImport}
        />

        {/* Import progress */}
        {importProgress !== null && (
          <div style={{ marginTop: 16 }}>
            <Text>Importing... {importProgress}%</Text>
          </div>
        )}
      </Modal>

      {/* Create Snapshot Modal */}
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
          placeholder="Snapshot name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleCreate}
          autoFocus
        />
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        title="Create New Folder"
        open={createFolderModalVisible}
        onOk={handleCreateFolder}
        onCancel={() => {
          setCreateFolderModalVisible(false)
          setNewName('')
        }}
        okText="Create"
      >
        <Input
          placeholder="Folder name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleCreateFolder}
          autoFocus
        />
      </Modal>

      {/* Rename Modal */}
      <Modal
        title={`Rename ${renamingItem?.type === 'folder' ? 'Folder' : 'Snapshot'}`}
        open={renameModalVisible}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalVisible(false)
          setRenamingItem(null)
          setNewName('')
        }}
        okText="Rename"
      >
        <Input
          placeholder="New name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleRename}
          autoFocus
        />
      </Modal>
    </>,
    document.body
  )
}

export { SnapshotManager }
