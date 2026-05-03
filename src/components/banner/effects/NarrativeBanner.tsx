import { useEffect, useState } from "react"

interface Props {
  title: string
  message: string
  textColor: string
}

export default function NarrativeBanner({ title, message, textColor }: Props) {
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [displayedMsg, setDisplayedMsg] = useState('')
  const [titleDone, setTitleDone] = useState(false)

  useEffect(() => {
    setDisplayedTitle('')
    setDisplayedMsg('')
    setTitleDone(false)
    let i = 0
    const interval = setInterval(() => {
      if (i < title.length) {
        setDisplayedTitle(title.slice(0, i + 1))
        i++
      } else {
        clearInterval(interval)
        setTitleDone(true)
      }
    }, 45)
    return () => clearInterval(interval)
  }, [title])

  useEffect(() => {
    if (!titleDone) return
    let i = 0
    const interval = setInterval(() => {
      if (i < message.length) {
        setDisplayedMsg(message.slice(0, i + 1))
        i++
      } else {
        clearInterval(interval)
      }
    }, 30)
    return () => clearInterval(interval)
  }, [titleDone, message])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center pointer-events-none z-10">
      <p className="font-bold text-sm mb-1" style={{ color: textColor }}>
        {displayedTitle}
        {displayedTitle.length < title.length && (
          <span className="animate-pulse">|</span>
        )}
      </p>
      <p className="text-xs opacity-80" style={{ color: textColor }}>
        {displayedMsg}
        {titleDone && displayedMsg.length < message.length && (
          <span className="animate-pulse">|</span>
        )}
      </p>
    </div>
  )
}
