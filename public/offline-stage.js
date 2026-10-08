(() => {
  const idMatch = window.location.pathname.match(
    /^\/setlists\/([0-9a-f-]+)\/live\/?$/i
  )
  const setlistId = idMatch?.[1]
  const userId = localStorage.getItem("worshipflow-offline-user")
  const errorView = document.getElementById("error")
  const stage = document.getElementById("stage")
  const footer = document.getElementById("footer")
  const dbName = "worshipflow-offline-stage"
  const storeName = "setlists"
  let songs = []
  let index = 0
  let fontSize = 30
  let showChords = true
  let transposeOffset = 0

  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  const flatNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
  const noteIndexes = { C: 0, "B#": 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4, "E#": 5, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11 }

  function transposeNote(value, amount) {
    const match = value.match(/^([A-Ga-g])([#b]?)(.*)$/)
    if (!match) return value
    const root = `${match[1].toUpperCase()}${match[2]}`
    const noteIndex = noteIndexes[root]
    if (noteIndex === undefined) return value
    const names = root.includes("b") ? flatNames : noteNames
    return `${names[(noteIndex + amount + 120) % 12]}${match[3]}`
  }

  function transposeChord(chord, amount) {
    const match = chord.match(/^([A-Ga-g][#b]?)(.*)$/)
    if (!match) return chord
    const slash = match[2].indexOf("/")
    if (slash < 0) return `${transposeNote(match[1], amount)}${match[2]}`
    const quality = match[2].slice(0, slash)
    const bass = match[2].slice(slash + 1)
    return `${transposeNote(match[1], amount)}${quality}/${bass ? transposeNote(bass, amount) : ""}`
  }

  function transpositionBetween(fromKey, toKey) {
    const from = fromKey?.match(/^([A-Ga-g])([#b]?)/)
    const to = toKey?.match(/^([A-Ga-g])([#b]?)/)
    if (!from || !to) return 0
    const fromIndex = noteIndexes[`${from[1].toUpperCase()}${from[2]}`]
    const toIndex = noteIndexes[`${to[1].toUpperCase()}${to[2]}`]
    if (fromIndex === undefined || toIndex === undefined) return 0
    const amount = (toIndex - fromIndex + 12) % 12
    return amount > 6 ? amount - 12 : amount
  }

  function text(id, value) {
    document.getElementById(id).textContent = value
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  function loadSnapshot() {
    return openDatabase().then((database) => new Promise((resolve, reject) => {
      const request = database
        .transaction(storeName, "readonly")
        .objectStore(storeName)
        .get(`${userId}:${setlistId}`)
      request.onsuccess = () => {
        database.close()
        resolve(request.result)
      }
      request.onerror = () => {
        database.close()
        reject(request.error)
      }
    }))
  }

  function chartLines(source) {
    return source.split(/\r\n?|\n/).flatMap((line) => {
      const section = line.match(
        /^\{\s*start_of_(verse|chorus|bridge|pre_chorus|intro|outro|tag|interlude)\s*\}$/i
      )
      if (section) {
        return [{ section: section[1].replace("_", " ") }]
      }
      if (/^\{\s*(start_of|end_of)_/i.test(line) || /^\{\s*[a-z0-9_]+\s*:/i.test(line)) {
        return []
      }
      if (/^\{\s*end_of_/i.test(line)) {
        return []
      }
      return [{ line }]
    })
  }

  function render() {
    const song = songs[index]
    if (!song) return

    text("counter", `${index + 1} / ${songs.length}`)
    text("section", `${song.section || "Worship"} · Song ${index + 1}`)
    text("title", song.title)
    text("artist", song.artist || "")
    document.getElementById("artist").hidden = !song.artist
    const note = document.getElementById("note")
    note.textContent = song.notes ? `Arrangement note: ${song.notes}` : ""
    note.hidden = !song.notes
    document.getElementById("previous").disabled = index === 0
    document.getElementById("next").disabled = index === songs.length - 1
    const sourceKey = song.source.match(/^\{\s*key\s*:\s*([^}]+)\s*\}$/im)?.[1]?.trim()
    const transpose = transpositionBetween(sourceKey, song.key) + transposeOffset
    const displayKey = song.key ? transposeNote(song.key, transposeOffset) : sourceKey ? transposeNote(sourceKey, transpose) : null
    text("transpose-label", transpose > 0 ? `+${transpose}` : String(transpose))

    const meta = document.getElementById("meta")
    meta.replaceChildren()
    ;[
      displayKey ? `Key ${displayKey}` : null,
      song.capo !== null ? `Capo ${song.capo}` : null,
      song.tempo ? `${song.tempo} BPM` : null,
    ].filter(Boolean).forEach((value) => {
      const badge = document.createElement("span")
      badge.textContent = value
      badge.style.cssText = "padding:.35rem .7rem;border-radius:999px;background:#ffffff12"
      meta.append(badge)
    })

    const chart = document.getElementById("chart")
    chart.replaceChildren()
    chartLines(song.source).forEach((item) => {
      if ("section" in item) {
        const heading = document.createElement("p")
        heading.className = "section-heading"
        heading.textContent = item.section
        chart.append(heading)
        return
      }

      const line = document.createElement("p")
      line.style.margin = item.line ? "0 0 .3rem" : "0 0 1rem"
      line.style.fontSize = `${fontSize}px`
      const displayedLine = item.line.replace(/\[([^\]]+)\]/g, (_, chord) =>
        `[${transposeChord(chord, transpose)}]`
      )
      line.textContent = showChords
        ? displayedLine
        : displayedLine.replace(/\[[^\]]+\]/g, "")
      chart.append(line)
    })
  }

  document.getElementById("previous").addEventListener("click", () => {
    index = Math.max(0, index - 1)
    render()
  })
  document.getElementById("next").addEventListener("click", () => {
    index = Math.min(songs.length - 1, index + 1)
    render()
  })
  document.getElementById("toggle-chords").addEventListener("click", (event) => {
    showChords = !showChords
    event.currentTarget.textContent = showChords ? "Hide chords" : "Show chords"
    event.currentTarget.setAttribute("aria-pressed", String(showChords))
    render()
  })
  document.getElementById("smaller").addEventListener("click", () => {
    fontSize = Math.max(20, fontSize - 2)
    render()
  })
  document.getElementById("larger").addEventListener("click", () => {
    fontSize = Math.min(56, fontSize + 2)
    render()
  })
  document.getElementById("transpose-down").addEventListener("click", () => {
    transposeOffset = Math.max(-12, transposeOffset - 1)
    render()
  })
  document.getElementById("transpose-up").addEventListener("click", () => {
    transposeOffset = Math.min(12, transposeOffset + 1)
    render()
  })
  document.getElementById("fullscreen").addEventListener("click", async (event) => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        event.currentTarget.textContent = "Fullscreen"
      } else {
        await document.documentElement.requestFullscreen()
        event.currentTarget.textContent = "Exit fullscreen"
      }
    } catch {
      text("saved", "Fullscreen is not available in this browser.")
    }
  })
  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") document.getElementById("previous").click()
    if (event.key === "ArrowRight") document.getElementById("next").click()
  })

  if (!setlistId || !userId || !("indexedDB" in window)) {
    errorView.hidden = false
    return
  }

  loadSnapshot()
    .then((snapshot) => {
      if (
        !snapshot ||
        snapshot.setlistId !== setlistId ||
        snapshot.userId !== userId ||
        !Array.isArray(snapshot.songs)
      ) {
        errorView.hidden = false
        return
      }

      songs = snapshot.songs
      text("setlist", snapshot.setlistName)
      text(
        "saved",
        `Offline copy saved ${new Date(snapshot.savedAt).toLocaleString()}`
      )

      if (songs.length === 0) {
        text("title", "No songs in this service")
        stage.hidden = false
        return
      }

      stage.hidden = false
      footer.hidden = false
      render()
    })
    .catch((error) => {
      console.error("Unable to load offline stage snapshot:", error)
      errorView.hidden = false
    })
})()
