"use client"

import { useEffect, useRef, useState } from "react"
import {
  getChordDiagram,
  getChordRootLabel,
  type ChordDiagram,
} from "../../features/chordpro/chord-diagrams"

type ChordDiagramTooltipProps = {
  chord: string
  stageMode: boolean
}

type TooltipPosition = {
  left: number
  top: number
}

const DIAGRAM_WIDTH = 176
const DIAGRAM_HEIGHT = 240

function getTooltipPosition(element: HTMLElement): TooltipPosition {
  const bounds = element.getBoundingClientRect()
  const left = Math.max(
    8,
    Math.min(
      bounds.left + bounds.width / 2 - DIAGRAM_WIDTH / 2,
      window.innerWidth - DIAGRAM_WIDTH - 8
    )
  )
  const top =
    bounds.bottom + DIAGRAM_HEIGHT + 12 < window.innerHeight
      ? bounds.bottom + 8
      : Math.max(8, bounds.top - DIAGRAM_HEIGHT - 8)

  return { left, top }
}

function Diagram({
  chord,
  shape,
  stageMode,
}: {
  chord: string
  shape: ChordDiagram
  stageMode: boolean
}) {
  const baseFret = shape.baseFret ?? 1
  const visibleFrets = 5
  const top = 34
  const fretHeight = 23
  const left = 30
  const stringGap = 23
  const diagramBottom = top + visibleFrets * fretHeight

  return (
    <svg
      viewBox="0 0 160 166"
      className="mx-auto block h-[150px] w-[144px]"
      role="img"
      aria-label={`${chord} guitar chord diagram`}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <line
          key={`string-${index}`}
          x1={left + index * stringGap}
          y1={top}
          x2={left + index * stringGap}
          y2={diagramBottom}
          stroke="currentColor"
          strokeOpacity=".48"
          strokeWidth={index === 0 || index === 5 ? 1.4 : 1}
        />
      ))}
      {Array.from({ length: visibleFrets + 1 }, (_, index) => (
        <line
          key={`fret-${index}`}
          x1={left}
          y1={top + index * fretHeight}
          x2={left + 5 * stringGap}
          y2={top + index * fretHeight}
          stroke="currentColor"
          strokeOpacity={index === 0 && baseFret === 1 ? ".9" : ".45"}
          strokeWidth={index === 0 && baseFret === 1 ? 3 : 1.2}
        />
      ))}
      {baseFret > 1 ? (
        <text
          x="5"
          y={top + fretHeight * 0.7}
          fontSize="11"
          fill={stageMode ? "#9fe7ff" : "#365c45"}
        >
          {baseFret}fr
        </text>
      ) : null}
      {shape.frets.map((fret, index) => {
        const x = left + index * stringGap

        if (fret < 0) {
          return (
            <text
              key={`muted-${index}`}
              x={x}
              y="22"
              textAnchor="middle"
              fontSize="15"
              fill="currentColor"
            >
              ×
            </text>
          )
        }

        if (fret === 0) {
          return (
            <circle
              key={`open-${index}`}
              cx={x}
              cy="16"
              r="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          )
        }

        return (
          <g key={`finger-${index}`}>
            <circle
              cx={x}
              cy={top + (fret - baseFret + 0.5) * fretHeight}
              r="7"
              fill={stageMode ? "#9fe7ff" : "#365c45"}
            />
            {shape.fingers[index] ? (
              <text
                x={x}
                y={top + (fret - baseFret + 0.5) * fretHeight + 3}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill={stageMode ? "#0d120f" : "#ffffff"}
              >
                {shape.fingers[index]}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

export default function ChordDiagramTooltip({
  chord,
  stageMode,
}: ChordDiagramTooltipProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<TooltipPosition | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const shape = getChordDiagram(chord)
  const root = getChordRootLabel(chord)

  function openTooltip(element: HTMLElement) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }

    setPosition(getTooltipPosition(element))
    setOpen(true)
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 140)
  }

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (
        target instanceof Node &&
        !buttonRef.current?.contains(target) &&
        !tooltipRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Show ${chord} chord diagram`}
        aria-expanded={open}
        className="cursor-help rounded-sm text-inherit decoration-dotted underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        onMouseEnter={(event) => openTooltip(event.currentTarget)}
        onMouseLeave={scheduleClose}
        onFocus={(event) => openTooltip(event.currentTarget)}
        onBlur={scheduleClose}
        onClick={(event) => {
          if (open) {
            setOpen(false)
          } else {
            openTooltip(event.currentTarget)
          }
        }}
      >
        {chord}
      </button>
      {open && position ? (
        <div
          ref={tooltipRef}
          role="tooltip"
          onMouseEnter={() => {
            if (closeTimer.current) clearTimeout(closeTimer.current)
          }}
          onMouseLeave={scheduleClose}
          className={`fixed z-[200] w-44 rounded-xl border p-3 text-center shadow-xl ${
            stageMode
              ? "border-white/15 bg-[#1d2922] text-white"
              : "border-[var(--border)] bg-white text-[var(--foreground)]"
          }`}
          style={{ left: position.left, top: position.top }}
        >
          <p className="text-sm font-bold">{chord}</p>
          {shape ? (
            <>
              <Diagram chord={chord} shape={shape} stageMode={stageMode} />
              {root !== chord ? (
                <p className="text-[10px] text-[var(--muted)]">
                  {root} shape · bass note shown in chord name
                </p>
              ) : null}
              <div className="mt-1 flex justify-center gap-3 text-[9px] text-[var(--muted)]">
                {["E", "A", "D", "G", "B", "e"].map((string) => (
                  <span key={string}>{string}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              No guitar diagram is available for this chord quality yet.
            </p>
          )}
        </div>
      ) : null}
    </>
  )
}
