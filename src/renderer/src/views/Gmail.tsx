import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Send,
  RefreshCw,
  Search,
  ArrowLeft,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Inbox,
  PenTool,
  Lock,
  ChevronRight
} from 'lucide-react'
import { auth as firebaseAuth, googleAuthProvider } from '../services/firebase'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
  body?: string
  unread: boolean
}

interface OperatorUser {
  name: string
  email: string
  provider: string
  syncTime: string
  avatar: string
  accessToken?: string
}

export default function GmailView(): JSX.Element {
  const [token, setToken] = useState<string>('')
  const [operator, setOperator] = useState<OperatorUser | null>(null)
  const [emails, setEmails] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null)
  const [selectedEmailBody, setSelectedEmailBody] = useState<string>('')
  const [loadingBody, setLoadingBody] = useState<boolean>(false)
  
  // Compose Email States
  const [showCompose, setShowCompose] = useState<boolean>(false)
  const [composeTo, setComposeTo] = useState<string>('')
  const [composeSubject, setComposeSubject] = useState<string>('')
  const [composeBody, setComposeBody] = useState<string>('')
  const [sending, setSending] = useState<boolean>(false)
  const [showConfirmSend, setShowConfirmSend] = useState<boolean>(false)
  
  // Status Messages
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null)

  // Load auth state from local storage or main process
  const checkAuth = async () => {
    try {
      const stored = localStorage.getItem('novax_operator')
      if (stored) {
        const parsed = JSON.parse(stored) as OperatorUser
        if (parsed.accessToken) {
          setToken(parsed.accessToken)
          setOperator(parsed)
          return
        }
      }
      
      // If no token in local storage, check if Electron main has it
      if (window.electron?.ipcRenderer) {
        const tokenRes = await window.electron.ipcRenderer.invoke('google-get-tokens')
        if (tokenRes && tokenRes.access_token) {
          setToken(tokenRes.access_token)
          const localProfile = await window.electron.ipcRenderer.invoke('get-offline-profile')
          if (localProfile) {
            setOperator({
              name: localProfile.name,
              email: localProfile.email,
              provider: 'GOOGLE_AUTH',
              syncTime: localProfile.syncTime || new Date().toLocaleTimeString(),
              avatar: localProfile.avatar || '',
              accessToken: tokenRes.access_token
            })
          }
        }
      }
    } catch (e) {
      console.error('[Gmail View] Auth retrieval error:', e)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  // Fetch emails once authenticated
  useEffect(() => {
    if (token) {
      fetchInbox()
    }
  }, [token])

  // Handle Google Sign-In for Web Preview
  const handleConnectGmail = async () => {
    setLoading(true)
    setStatusMsg(null)
    try {
      const result = await signInWithPopup(firebaseAuth, googleAuthProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const accessToken = credential?.accessToken

      if (accessToken) {
        const operatorUser: OperatorUser = {
          name: result.user.displayName || 'Operator',
          email: result.user.email || '',
          provider: 'GOOGLE_AUTH',
          syncTime: new Date().toLocaleTimeString(),
          avatar: result.user.photoURL || '',
          accessToken: accessToken
        }
        localStorage.setItem('novax_operator', JSON.stringify(operatorUser))
        setToken(accessToken)
        setOperator(operatorUser)
        
        // Push activity log to local store if available
        if (window.electron?.ipcRenderer) {
          await window.electron.ipcRenderer.invoke('save-offline-profile', operatorUser)
        }
      } else {
        throw new Error('Access token was not returned from Google authorization.')
      }
    } catch (err: any) {
      console.error('[Gmail Connect] Error:', err)
      setStatusMsg({ text: err.message || 'Google OAuth failed.', isError: true })
    } finally {
      setLoading(false)
    }
  }

  // Fetch inbox emails using Gmail REST API
  const fetchInbox = async () => {
    if (!token) return
    setLoading(true)
    setStatusMsg(null)
    try {
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.status === 401) {
        // Token expired, clear token
        handleSignOut()
        throw new Error('Session expired. Please reconnect your Google Account.')
      }

      const data = await res.json()
      if (!data.messages || data.messages.length === 0) {
        setEmails([])
        setLoading(false)
        return
      }

      // Fetch message details in parallel
      const detailedEmails = await Promise.all(
        data.messages.map(async (msg: { id: string }) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const detail = await detailRes.json()
          
          const headers = detail.payload?.headers || []
          const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)'
          const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender'
          const dateVal = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || ''
          const isUnread = detail.labelIds?.includes('UNREAD') || false

          return {
            id: detail.id,
            threadId: detail.threadId,
            subject,
            from,
            date: dateVal,
            snippet: detail.snippet || '',
            unread: isUnread
          }
        })
      )

      setEmails(detailedEmails)
    } catch (err: any) {
      console.error('[Gmail Fetch] Inbox fetch error:', err)
      setStatusMsg({ text: err.message || 'Failed to retrieve emails.', isError: true })
    } finally {
      setLoading(false)
    }
  }

  // Fetch email body details
  const fetchEmailBody = async (email: GmailMessage) => {
    setSelectedEmail(email)
    setSelectedEmailBody('')
    setLoadingBody(true)
    try {
      const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const detail = await detailRes.json()
      
      // Parse body helper
      let bodyText = ''
      const parts = detail.payload?.parts
      if (parts) {
        const textPart = parts.find((p: any) => p.mimeType === 'text/plain') || parts[0]
        if (textPart && textPart.body?.data) {
          bodyText = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'))
        }
      } else if (detail.payload?.body?.data) {
        bodyText = atob(detail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
      }

      setSelectedEmailBody(bodyText || email.snippet || '(Empty Body)')
      
      // Mark as read in Gmail if unread
      if (email.unread) {
        await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}/batchModify`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
        })
        // Update local unread state
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, unread: false } : e))
      }
    } catch (err: any) {
      console.error('[Gmail Body] Fetch body error:', err)
      setSelectedEmailBody('Error downloading email payload: ' + err.message)
    } finally {
      setLoadingBody(false)
    }
  }

  // Construct MIME and send email via Gmail REST API
  const handleSendEmail = async () => {
    setSending(true)
    setStatusMsg(null)
    try {
      const emailContent = [
        `To: ${composeTo}`,
        `Subject: ${composeSubject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        composeBody
      ].join('\r\n')
      
      const rawBase64 = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawBase64 })
      })

      if (res.ok) {
        setStatusMsg({ text: 'Email transmitted successfully!', isError: false })
        setComposeTo('')
        setComposeSubject('')
        setComposeBody('')
        setShowCompose(false)
        setShowConfirmSend(false)
        fetchInbox()
      } else {
        const errData = await res.json()
        throw new Error(errData.error?.message || 'Send operation rejected.')
      }
    } catch (err: any) {
      console.error('[Gmail Send] error:', err)
      setStatusMsg({ text: err.message || 'Failed to dispatch email.', isError: true })
    } finally {
      setSending(false)
    }
  }

  const handleSignOut = async () => {
    localStorage.removeItem('novax_operator')
    setToken('')
    setOperator(null)
    setEmails([])
    setSelectedEmail(null)
    if (window.electron?.ipcRenderer) {
      await window.electron.ipcRenderer.invoke('google-sign-out')
    }
  }

  return (
    <div className="h-full w-full flex flex-col font-sans select-text text-zinc-100">
      
      {/* AUTHENTICATION PORTAL */}
      {!token ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md bg-zinc-950/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-1/2 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
            
            <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Mail className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white mb-2 font-mono uppercase">
              Secure Gmail Connector
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-8">
              Authorize secure network access to connect your Google Workspace. Read, manage, and dispatch communications directly from the NOVA-X Nerve System.
            </p>

            {statusMsg && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center gap-3 text-left">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{statusMsg.text}</span>
              </div>
            )}

            <button
              onClick={handleConnectGmail}
              disabled={loading}
              className="group cursor-pointer w-full py-4 bg-white text-black font-mono font-bold text-xs tracking-widest uppercase rounded-xl transition-all duration-300 hover:bg-neutral-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 border border-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'UPLINKING CORES...' : 'AUTHORIZE GMAIL CONNECTION'}
            </button>
          </div>
        </div>
      ) : (
        
        /* GMAIL WORKSPACE */
        <div className="flex-1 flex gap-4 overflow-hidden h-full pb-2">
          
          {/* EMAIL LIST SIDEBAR (LEFT) */}
          <div className="w-1/2 flex flex-col bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            
            {/* Toolbar */}
            <div className="p-4 border-b border-white/5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Nerve Inbox
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchInbox}
                    disabled={loading}
                    className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Refresh Inbox"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowCompose(true)}
                    className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-0.5">
                      Compose
                    </span>
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search network transcripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchInbox()}
                  className="w-full bg-zinc-900/80 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40 transition-colors"
                />
              </div>
            </div>

            {/* Email list container */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {loading && emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-500 font-mono text-xs gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-emerald-500" />
                  Synchronizing records...
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-500 font-mono text-xs gap-2">
                  <Mail className="h-6 w-6 text-zinc-700" />
                  No communications fetched.
                </div>
              ) : (
                emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => fetchEmailBody(email)}
                    className={`p-4 transition-all duration-200 cursor-pointer text-left relative flex flex-col gap-1.5 ${
                      selectedEmail?.id === email.id
                        ? 'bg-emerald-500/5 border-l-2 border-emerald-500'
                        : 'hover:bg-white/[0.02] border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 max-w-[70%]">
                        {email.unread && (
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        )}
                        <span className={`text-xs font-semibold truncate ${email.unread ? 'text-white' : 'text-zinc-300'}`}>
                          {email.from.split('<')[0].trim()}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500">
                        {new Date(email.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    <h4 className={`text-xs font-mono truncate ${email.unread ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                      {email.subject}
                    </h4>
                    <p className="text-[11px] text-zinc-500 line-clamp-1 leading-relaxed">
                      {email.snippet}
                    </p>
                  </div>
                ))
              )}
            </div>
            
            {/* Account Info Footer */}
            <div className="p-3 bg-zinc-950 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {operator?.avatar ? (
                  <img src={operator.avatar} className="h-6 w-6 rounded-full border border-white/10" />
                ) : (
                  <div className="h-6 w-6 bg-zinc-800 rounded-full flex items-center justify-center">
                    <User className="h-3 w-3 text-zinc-400" />
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-mono font-bold leading-none text-zinc-300">
                    {operator?.name}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    {operator?.email}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-[9px] font-mono text-zinc-500 hover:text-red-400 cursor-pointer tracking-wider uppercase"
              >
                UPLINK OFF
              </button>
            </div>
          </div>

          {/* EMAIL CONTENT VIEWER (RIGHT) */}
          <div className="w-1/2 flex flex-col bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            {selectedEmail ? (
              <div className="flex-1 flex flex-col h-full">
                
                {/* Header detail */}
                <div className="p-5 border-b border-white/5 text-left flex flex-col gap-3 bg-zinc-950/20">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {selectedEmail.subject}
                    </h3>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-mono text-[10px] uppercase w-12">From:</span>
                      <span className="font-semibold text-zinc-300">{selectedEmail.from}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-mono text-[10px] uppercase w-12">Date:</span>
                      <span className="font-mono text-zinc-400 text-[11px]">{selectedEmail.date}</span>
                    </div>
                  </div>
                </div>

                {/* Body content */}
                <div className="flex-1 p-5 overflow-y-auto text-left font-sans text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap select-text">
                  {loadingBody ? (
                    <div className="flex flex-col items-center justify-center h-48 text-zinc-500 font-mono gap-3">
                      <RefreshCw className="h-5 w-5 animate-spin text-emerald-500" />
                      Downloading full transmission data...
                    </div>
                  ) : (
                    selectedEmailBody
                  )}
                </div>
                
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 font-mono text-xs gap-3">
                <div className="h-10 w-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-600">
                  <Mail className="h-4 w-4" />
                </div>
                Select a message block to initiate reading
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPOSE EMAIL MODAL */}
      <AnimatePresence>
        {showCompose && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col text-left"
            >
              <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-200">
                    New Core Dispatch
                  </span>
                </div>
                <button
                  onClick={() => setShowCompose(false)}
                  className="text-zinc-500 hover:text-white font-sans text-xs font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Compose Inputs */}
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Recipient (To)</label>
                  <input
                    type="email"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="agent.coordination@target.com"
                    className="w-full bg-zinc-900/60 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Subject</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="System Command Execution Report"
                    className="w-full bg-zinc-900/60 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
                <div className="flex-1 min-h-[200px] flex flex-col">
                  <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Transmission Message</label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Identify nodes, log outputs..."
                    className="w-full flex-1 bg-zinc-900/60 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/40 resize-none min-h-[160px]"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-white/5 bg-zinc-900/20 flex justify-between items-center">
                <span className="text-[10px] font-mono text-zinc-500">
                  DISPATCH SECURITY LEVEL: G-OAUTH
                </span>
                
                <button
                  onClick={() => setShowConfirmSend(true)}
                  disabled={!composeTo || !composeSubject || !composeBody}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-mono font-bold text-[11px] tracking-wider uppercase rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Transmit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SAFETY EXPLICIT CONFIRMATION DIALOG */}
      <AnimatePresence>
        {showConfirmSend && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[110] animate-in fade-in duration-150">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-red-500/20 rounded-2xl p-6 shadow-2xl relative text-left"
            >
              <div className="h-12 w-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 animate-pulse" />
              </div>

              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white mb-2">
                Confirm Outer Transmission?
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-6">
                Are you absolutely sure you want to dispatch this email transmission? This is a real Google Workspace API action and will send a real message to:
                <span className="block mt-2 font-mono text-emerald-400 font-bold bg-zinc-950 p-2 rounded-lg border border-white/5">
                  {composeTo}
                </span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmSend(false)}
                  className="flex-1 py-2.5 border border-white/10 rounded-xl font-mono text-[10px] tracking-widest uppercase text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sending}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-bold text-[10px] tracking-widest uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {sending ? 'Sending...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  )
}
