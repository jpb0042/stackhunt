/// <reference types="vite/client" />

export {}

declare global {
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>
  }

  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
  }

  interface DataTransferItem {
    webkitGetAsEntry(): FileSystemEntry | null
  }
}
