import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { terminalURL } from '@/api/labs'

type Props = {
  terminalPath: string
  /** Fires when the shell is actually attached, which is what the start modal
   *  waits for. The POST that created the container returns well before this. */
  onReady?: () => void
  onClosed: (reason: string) => void
}

/** Keystrokes go up as binary frames and control messages as text, matching what
 *  the server splits on. Sending resize as just another line of input would let
 *  anything a student types be read as a command. */
export function LabTerminal({ terminalPath, onReady, onClosed }: Props) {
  const host = useRef<HTMLDivElement>(null)
  // The callback is read at close time, not capture time, so a re-render of the
  // parent does not tear down the socket and drop the session with it.
  const closed = useRef(onClosed)
  closed.current = onClosed
  const ready = useRef(onReady)
  ready.current = onReady

  useEffect(() => {
    const el = host.current
    if (!el) return

    const term = new Terminal({
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 13,
      cursorBlink: true,
      // The container is the only thing that ever writes here, so nothing is
      // echoed locally: what shows up is what the shell actually sent back.
      convertEol: false,
      theme: { background: '#0b0e14', foreground: '#d4d7dd' },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(el)
    fit.fit()

    const ws = new WebSocket(terminalURL(terminalPath))
    ws.binaryType = 'arraybuffer'
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    const sendResize = () => {
      fit.fit()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }),
        )
      }
    }

    ws.onopen = () => {
      sendResize()
      term.focus()
      ready.current?.()
    }
    ws.onmessage = (e) => {
      term.write(
        typeof e.data === 'string' ? e.data : decoder.decode(e.data as ArrayBuffer),
      )
    }
    ws.onclose = (e) => {
      term.write('\r\n\x1b[33m— ' + (e.reason || 'mất kết nối') + ' —\x1b[0m\r\n')
      closed.current(e.reason || 'mất kết nối')
    }
    ws.onerror = () => {
      term.write('\r\n\x1b[31m— lỗi kết nối terminal —\x1b[0m\r\n')
    }

    const typed = term.onData((d) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(encoder.encode(d))
    })

    const observer = new ResizeObserver(sendResize)
    observer.observe(el)

    return () => {
      observer.disconnect()
      typed.dispose()
      // Detach the handler first: a close that this cleanup caused is a page
      // navigation, not the session ending, and must not be reported as one.
      ws.onclose = null
      ws.close()
      term.dispose()
    }
  }, [terminalPath])

  return <div ref={host} className="h-full w-full" />
}
