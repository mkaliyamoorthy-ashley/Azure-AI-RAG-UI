import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Send, Upload, FileText, MessageSquare, Bot, User,
  Sparkles, FileSpreadsheet, File, CheckCircle2,
  AlertCircle, Loader2, BookOpen, Zap
} from 'lucide-react'

// Backend API URL - Update this to your Azure App Service URL
const API_URL = import.meta.env.VITE_API_URL || 'https://magesh-azure-ai-rag.azurewebsites.net/api'

// Icon mapping for file types
const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase()
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet className="w-4 h-4" />
  if (['pdf'].includes(ext)) return <FileText className="w-4 h-4" />
  return <File className="w-4 h-4" />
}

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState([])
  const [uploadStatus, setUploadStatus] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages])
  useEffect(() => { fetchDocuments() }, [])

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents`)
      setDocuments(response.data.documents || [])
    } catch (error) { console.error('Error fetching documents:', error) }
  }

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0])
  }

  const handleFileUpload = (e) => { if (e.target.files?.[0]) processFile(e.target.files[0]) }

  const processFile = async (file) => {
    setUploading(true)
    setUploadStatus({ type: 'loading', message: `Processing ${file.name}...` })
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploadStatus({ type: 'success', message: `${file.name} indexed (${response.data.chunks} chunks)` })
      fetchDocuments()
      setTimeout(() => setUploadStatus(null), 4000)
    } catch (error) {
      setUploadStatus({ type: 'error', message: error.response?.data?.detail || error.message })
    } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput(''); setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/chat`, { question: input })
      setMessages(prev => [...prev, {
        role: 'assistant', content: response.data.answer, sources: response.data.sources
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant', content: `Error: ${error.response?.data?.detail || error.message}`
      }])
    } finally { setLoading(false) }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">Azure RAG</h1>
              <p className="text-xs text-slate-500">Document Intelligence</p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="p-4">
          <div
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
              ${uploading ? 'pointer-events-none opacity-60' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" disabled={uploading} />
            <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center
              ${dragActive ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <Upload className={`w-5 h-5 ${dragActive ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <p className="text-sm font-medium text-slate-700">Drop files here</p>
            <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, XLS, XLSX</p>
          </div>

          {/* Upload Status */}
          {uploadStatus && (
            <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 text-sm
              ${uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
                uploadStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              {uploadStatus.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {uploadStatus.type === 'error' && <AlertCircle className="w-4 h-4" />}
              {uploadStatus.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
              <span className="truncate">{uploadStatus.message}</span>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-auto p-4 pt-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Documents</h2>
            <span className="badge badge-secondary">{documents.length}</span>
          </div>
          <div className="space-y-1">
            {documents.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 group">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                  {getFileIcon(doc.name)}
                </div>
                <span className="text-sm text-slate-600 truncate flex-1">{doc.name}</span>
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No documents yet</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Zap className="w-3 h-3" />
            <span>Powered by Azure OpenAI + AI Search</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">AI Assistant</h2>
              <p className="text-xs text-slate-500">Ask questions about your documents</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Start a Conversation</h3>
              <p className="text-slate-500 max-w-md">Upload documents and ask questions. I'll search through your files and provide answers with sources.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-2xl ${msg.role === 'user' ? 'order-1' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
                }`}>
                  <p className="prose-chat whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.sources?.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <BookOpen className="w-3 h-3 text-slate-400" />
                    {msg.sources.map((src, j) => (
                      <span key={j} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{src}</span>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Searching documents...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Ask a question about your documents..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading} />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span className="font-medium">Send</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

