"use client"

import React, { useEffect, useState } from "react"

import { COLOUR_TOKENS } from "../tokens/colours"

type AboutMedia = {
  id: string
  title: string
  kind: string
  role: string
  playbackUrl: string
  driveFileId: string
}

type AboutBio = {
  id: string
  name: string
  role: string
  summary: string
  evidenceNote: string
  portraitUrl: string | null
  media: AboutMedia[]
}

type AboutResponse = {
  ok: boolean
  folderId?: string
  bios?: AboutBio[]
  error?: string
}

export function AboutUsDrivePanel() {
  const [bios, setBios] = useState<AboutBio[]>([])
  const [folderId, setFolderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch("/api/drive/about")
      .then(async (res) => {
        const data = (await res.json()) as AboutResponse
        if (!res.ok || !data.ok) {
          throw new Error(data.error || `About Us fetch failed (${res.status})`)
        }
        if (!cancelled) {
          setBios(data.bios || [])
          setFolderId(data.folderId || null)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      data-testid="about-us-drive-panel"
      className="rounded-xl border border-[rgba(197,204,214,0.22)] bg-[#101622]/90 p-3 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-[#D4AF37]">
            About Us · Drive Hotspot_26_media
          </div>
          <h3 className="font-display text-sm font-semibold text-[#F2F6F8]">
            NOJARA Studios · verified bios & media
          </h3>
        </div>
        {folderId ? (
          <a
            href={`https://drive.google.com/drive/folders/${folderId}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 min-h-[36px] px-2.5 py-1 rounded-lg font-mono text-[10px] border border-[rgba(197,204,214,0.22)] text-[#B4DDFF] hover:border-[#D4AF37] hover:text-[#F2F6F8]"
          >
            Open Drive
          </a>
        ) : null}
      </div>

      {loading ? (
        <p className="font-mono text-[11px] text-[#C5CCD6]">Loading Drive catalog…</p>
      ) : null}

      {error ? (
        <p className="font-mono text-[11px] text-[#FF5666]" role="alert">
          {error}
        </p>
      ) : null}

      {bios.map((bio) => (
        <article
          key={bio.id}
          className="rounded-lg border border-white/15 bg-[#142632]/75 p-3 space-y-2"
        >
          <div className="flex gap-3">
            {bio.portraitUrl ? (
              <img
                src={bio.portraitUrl}
                alt=""
                className="h-16 w-16 rounded-lg object-cover border border-white/20 shrink-0"
              />
            ) : (
              <div
                className="h-16 w-16 rounded-lg shrink-0 border border-white/15"
                style={{ backgroundColor: COLOUR_TOKENS.glassSolid }}
              />
            )}
            <div className="min-w-0">
              <h4 className="font-display text-sm text-[#F2F6F8] truncate">{bio.name}</h4>
              <div className="font-mono text-[11px] text-[#65ACFF]">{bio.role}</div>
            </div>
          </div>
          <p className="font-sans text-xs leading-relaxed text-[#D0DCE3]">{bio.summary}</p>
          <p className="font-mono text-[10px] text-[#BDCBD3]/90">{bio.evidenceNote}</p>
          {bio.media.length > 0 ? (
            <ul className="space-y-1.5 pt-1 border-t border-white/10">
              {bio.media.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 font-mono text-[10px]"
                >
                  <span className="truncate text-[#F2F6F8]">
                    {item.title}
                    <span className="text-[#C5CCD6]"> · {item.kind}</span>
                  </span>
                  <a
                    href={item.playbackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-[#9AFFE0] hover:text-[#F2F6F8]"
                  >
                    Play
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  )
}
