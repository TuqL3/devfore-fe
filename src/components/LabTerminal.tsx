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
      lineHeight: 1.3,
      letterSpacing: 0.3,
      cursorBlink: true,
      cursorStyle: 'bar',
      // Enough to scroll back through a long ls or a build log; the session is
      // short-lived, so this never grows into real memory.
      scrollback: 2000,
      // The container is the only thing that ever writes here, so nothing is
      // echoed locally: what shows up is what the shell actually sent back.
      convertEol: false,
      // The full palette, not just background and foreground: anything the shell
      // colours — ls, grep, the prompt — falls back to xterm's default ANSI set
      // otherwise, which is the one bright primary look the rest of the app is not.
      theme: {
        background: '#0b0e14',
        foreground: '#d4d7dd',
        cursor: '#7fd1a0',
        cursorAccent: '#0b0e14',
        selectionBackground: '#2a3348',
        black: '#1c2028',
        red: '#e06c75',
        green: '#7fd1a0',
        yellow: '#e5c07b',
        blue: '#75aadb',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#d4d7dd',
        brightBlack: '#6b7280',
        brightRed: '#f08a92',
        brightGreen: '#98e0b6',
        brightYellow: '#f0d19b',
        brightBlue: '#93c0e8',
        brightMagenta: '#d79ae8',
        brightCyan: '#7fcfd8',
        brightWhite: '#f0f2f5',
      },
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
      const reason = e.reason || 'connection lost'
      term.write('\r\n\x1b[33m— ' + reason + ' —\x1b[0m\r\n')
      closed.current(reason)
    }
    ws.onerror = () => {
      term.write('\r\n\x1b[31m— ' + 'terminal connection error' + ' —\x1b[0m\r\n')
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
