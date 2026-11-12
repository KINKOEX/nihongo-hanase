(function () {
  const lessons = window.LESSONS_DATA || [];
  if (!lessons.length) return;

  const STORAGE_KEY = "nihongo_business_player_v1";

  const audioEl = document.getElementById("audioEl");
  const sidebar = document.getElementById("sidebar");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");
  const openSidebarBtn = document.getElementById("openSidebarBtn");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  const searchInput = document.getElementById("searchInput");
  const trackListEl = document.getElementById("trackList");
  const completedCountEl = document.getElementById("completedCount");
  const resetProgressBtn = document.getElementById("resetProgressBtn");

  const trackBadge = document.getElementById("trackBadge");
  const categoryBadge = document.getElementById("categoryBadge");
  const unitLabel = document.getElementById("unitLabel");
  const lessonTitle = document.getElementById("lessonTitle");
  const lessonTitleZh = document.getElementById("lessonTitleZh");

  const toggleFuriganaBtn = document.getElementById("toggleFuriganaBtn");
  const toggleZhBtn = document.getElementById("toggleZhBtn");
  const toggleBlindBtn = document.getElementById("toggleBlindBtn");
  const toggleAutoScrollBtn = document.getElementById("toggleAutoScrollBtn");
  const toggleThemeBtn = document.getElementById("toggleThemeBtn");

  const sectionJumpBar = document.getElementById("sectionJumpBar");
  const sectionJumpPills = document.getElementById("sectionJumpPills");
  const transcriptContainer = document.getElementById("transcriptContainer");
  const transcriptList = document.getElementById("transcriptList");

  const currentTimeLabel = document.getElementById("currentTimeLabel");
  const durationLabel = document.getElementById("durationLabel");
  const seekSlider = document.getElementById("seekSlider");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const prevTrackBtn = document.getElementById("prevTrackBtn");
  const nextTrackBtn = document.getElementById("nextTrackBtn");
  const prevLineBtn = document.getElementById("prevLineBtn");
  const nextLineBtn = document.getElementById("nextLineBtn");
  const loopLineBtn = document.getElementById("loopLineBtn");
  const autoNextBtn = document.getElementById("autoNextBtn");
  const speedSelect = document.getElementById("speedSelect");
  const volumeSlider = document.getElementById("volumeSlider");

  const saved = loadSavedState();
  const state = {
    currentTrackIndex: clamp(saved.currentTrackIndex ?? 0, 0, lessons.length - 1),
    showFurigana: saved.showFurigana ?? true,
    showZh: saved.showZh ?? true,
    blindMode: saved.blindMode ?? false,
    autoScroll: saved.autoScroll ?? true,
    autoNext: saved.autoNext ?? true,
    darkTheme: saved.darkTheme ?? false,
    speed: saved.speed ?? 1,
    volume: saved.volume ?? 1,
    completedIds: new Set(Array.isArray(saved.completedIds) ? saved.completedIds : []),
    activeLineIndex: -1,
    loopLineIndex: null,
    isSeeking: false,
    rafId: null,
    searchQuery: ""
  };

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function loadSavedState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentTrackIndex: state.currentTrackIndex,
          showFurigana: state.showFurigana,
          showZh: state.showZh,
          blindMode: state.blindMode,
          autoScroll: state.autoScroll,
          autoNext: state.autoNext,
          darkTheme: state.darkTheme,
          speed: state.speed,
          volume: state.volume,
          completedIds: Array.from(state.completedIds)
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function getSpeakerRole(speaker) {
    if (!speaker || speaker === "ナレーション" || speaker === "効果音") return "narrator";
    if (["リビングストン", "陳", "アラン", "フランス人社員"].includes(speaker)) return "main";
    if (["上司", "主任", "永井", "江藤", "部長"].includes(speaker)) return "boss";
    return "partner";
  }

  function applyVisualSettings() {
    document.documentElement.setAttribute("data-theme", state.darkTheme ? "dark" : "light");
    toggleThemeBtn.textContent = state.darkTheme ? "☀️" : "🌙";

    transcriptList.classList.toggle("hide-furigana", !state.showFurigana);
    lessonTitle.classList.toggle("hide-furigana", !state.showFurigana);
    transcriptList.classList.toggle("hide-zh", !state.showZh);
    transcriptList.classList.toggle("blind-mode", state.blindMode);

    toggleFuriganaBtn.classList.toggle("active", state.showFurigana);
    toggleZhBtn.classList.toggle("active", state.showZh);
    toggleBlindBtn.classList.toggle("active", state.blindMode);
    toggleAutoScrollBtn.classList.toggle("active", state.autoScroll);
    autoNextBtn.classList.toggle("active", state.autoNext);
    loopLineBtn.classList.toggle("active", state.loopLineIndex !== null);
  }

  function renderSidebar() {
    const q = state.searchQuery.trim().toLowerCase();
    trackListEl.innerHTML = "";

    const grouped = new Map();
    lessons.forEach((lesson, idx) => {
      if (q) {
        const hay = [
          String(lesson.id).padStart(2, "0"),
          lesson.titleJa,
          lesson.titleZh,
          lesson.unit,
          lesson.category,
          ...lesson.lines.map((l) => `${l.ja} ${l.zh}`)
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return;
      }
      if (!grouped.has(lesson.unit)) grouped.set(lesson.unit, []);
      grouped.get(lesson.unit).push({ lesson, idx });
    });

    if (grouped.size === 0) {
      const empty = document.createElement("p");
      empty.style.padding = "18px 12px";
      empty.style.fontSize = "13px";
      empty.style.color = "var(--text-muted)";
      empty.textContent = "找不到符合的課文或字幕關鍵字。";
      trackListEl.appendChild(empty);
    } else {
      grouped.forEach((items, unitName) => {
        const groupTitle = document.createElement("div");
        groupTitle.className = "track-group-title";
        groupTitle.textContent = unitName;
        trackListEl.appendChild(groupTitle);

        items.forEach(({ lesson, idx }) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "track-item";
          if (idx === state.currentTrackIndex) btn.classList.add("active");
          if (state.completedIds.has(lesson.id)) btn.classList.add("done");

          const numSpan = document.createElement("span");
          numSpan.className = "track-num";
          numSpan.textContent = String(lesson.id).padStart(2, "0");

          const infoDiv = document.createElement("div");
          infoDiv.className = "track-info";

          const nameJa = document.createElement("div");
          nameJa.className = "track-name-ja";
          nameJa.textContent = `${lesson.spokenNumber}. ${lesson.titleJa}`;

          const nameZh = document.createElement("div");
          nameZh.className = "track-name-zh";

          const zhText = document.createElement("span");
          zhText.textContent = lesson.titleZh;

          const metaTag = document.createElement("span");
          metaTag.className = "track-tag";
          metaTag.textContent = `${lesson.category} · ${formatTime(lesson.duration)}`;

          nameZh.appendChild(zhText);
          nameZh.appendChild(metaTag);

          infoDiv.appendChild(nameJa);
          infoDiv.appendChild(nameZh);
          btn.appendChild(numSpan);
          btn.appendChild(infoDiv);

          btn.addEventListener("click", () => {
            loadTrack(idx, true);
            closeSidebar();
          });

          trackListEl.appendChild(btn);
        });
      });
    }

    completedCountEl.textContent = `已完成 ${state.completedIds.size} / ${lessons.length} 課`;
  }

  function renderTranscript(lesson) {
    transcriptList.innerHTML = "";
    sectionJumpPills.innerHTML = "";

    const sections = [];
    lesson.lines.forEach((line, idx) => {
      if (line.section) {
        sections.push({ label: line.section, idx });
      }

      const card = document.createElement("div");
      card.className = "line-card";
      if (line.isHeader) card.classList.add("is-header");
      card.dataset.lineIdx = String(idx);

      const main = document.createElement("div");
      main.className = "line-main";

      const meta = document.createElement("div");
      meta.className = "line-meta";

      const timeEl = document.createElement("span");
      timeEl.className = "line-time";
      timeEl.textContent = formatTime(line.start);

      const speakerEl = document.createElement("span");
      speakerEl.className = "speaker-badge";
      speakerEl.dataset.role = getSpeakerRole(line.speaker);
      speakerEl.textContent = line.speaker;

      meta.appendChild(timeEl);
      meta.appendChild(speakerEl);

      const jaEl = document.createElement("div");
      jaEl.className = "line-ja";
      jaEl.innerHTML = line.ruby || line.ja;

      const zhEl = document.createElement("div");
      zhEl.className = "line-zh";
      zhEl.textContent = line.zh;

      main.appendChild(meta);
      main.appendChild(jaEl);
      main.appendChild(zhEl);

      const actions = document.createElement("div");
      actions.className = "line-actions";

      const loopBtn = document.createElement("button");
      loopBtn.type = "button";
      loopBtn.className = "line-btn";
      loopBtn.textContent = "🔁 循環";
      loopBtn.title = "單句循環播放此句";
      loopBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (state.loopLineIndex === idx) {
          setLoopLine(null);
        } else {
          setLoopLine(idx, true);
        }
      });
      actions.appendChild(loopBtn);

      if (!line.isHeader) {
        const revealBtn = document.createElement("button");
        revealBtn.type = "button";
        revealBtn.className = "line-btn reveal-btn";
        revealBtn.textContent = "👁 顯示";
        revealBtn.title = "在盲聽模式中顯示/隱藏這一句";
        revealBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const nowRevealed = card.classList.toggle("revealed");
          revealBtn.textContent = nowRevealed ? "🙈 隱藏" : "👁 顯示";
        });
        actions.appendChild(revealBtn);
      }

      card.appendChild(main);
      card.appendChild(actions);

      card.addEventListener("click", () => {
        if (state.loopLineIndex !== null && state.loopLineIndex !== idx) {
          setLoopLine(null);
        }
        seekAndPlay(line.start);
      });

      transcriptList.appendChild(card);
    });

    if (sections.length > 0) {
      sectionJumpBar.hidden = false;
      sections.forEach(({ label, idx }) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "jump-pill";
        pill.textContent = label;
        pill.addEventListener("click", () => {
          setLoopLine(null);
          const targetLine = lesson.lines[idx];
          seekAndPlay(targetLine.start);
        });
        sectionJumpPills.appendChild(pill);
      });
    } else {
      sectionJumpBar.hidden = true;
    }
  }

  function loadTrack(index, autoplay = false) {
    state.currentTrackIndex = clamp(index, 0, lessons.length - 1);
    state.activeLineIndex = -1;
    state.loopLineIndex = null;

    const lesson = lessons[state.currentTrackIndex];
    trackBadge.textContent = `Track ${String(lesson.id).padStart(2, "0")} / ${lessons.length}`;
    categoryBadge.textContent = lesson.category;
    unitLabel.textContent = lesson.unit;
    lessonTitle.innerHTML = `${lesson.spokenNumber}　${lesson.titleRuby || lesson.titleJa}`;
    lessonTitleZh.textContent = lesson.titleZh;

    audioEl.src = lesson.audio;
    audioEl.playbackRate = state.speed;
    audioEl.volume = state.volume;
    seekSlider.value = 0;
    seekSlider.max = lesson.duration || 100;
    currentTimeLabel.textContent = "0:00";
    durationLabel.textContent = formatTime(lesson.duration);

    renderSidebar();
    renderTranscript(lesson);
    applyVisualSettings();
    updateMediaSession(lesson);
    transcriptContainer.scrollTop = 0;
    saveState();

    if (autoplay) {
      audioEl.play().catch(() => {});
    } else {
      updatePlayButton(false);
    }
  }

  function updateMediaSession(lesson) {
    if (!("mediaSession" in navigator) || !lesson) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${lesson.spokenNumber}. ${lesson.titleJa}`,
        artist: `${lesson.unit}｜${lesson.titleZh}`,
        album: "にほんごで働く！ビジネス日本語30時間"
      });
      navigator.mediaSession.setActionHandler("play", () => audioEl.play().catch(() => {}));
      navigator.mediaSession.setActionHandler("pause", () => audioEl.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        if (state.currentTrackIndex > 0) loadTrack(state.currentTrackIndex - 1, true);
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        if (state.currentTrackIndex < lessons.length - 1) loadTrack(state.currentTrackIndex + 1, true);
      });
    } catch {
      // Ignore on unsupported browsers
    }
  }

  function seekAndPlay(timeSec) {
    audioEl.currentTime = Math.max(0, timeSec);
    syncActiveLine();
    audioEl.play().catch(() => {});
  }

  function setLoopLine(lineIdx, startPlaying = false) {
    state.loopLineIndex = lineIdx;
    const cards = transcriptList.querySelectorAll(".line-card");
    cards.forEach((card, i) => {
      const isTarget = i === lineIdx;
      card.classList.toggle("loop-target", isTarget);
      const btn = card.querySelector(".line-btn");
      if (btn) btn.classList.toggle("active", isTarget);
    });
    loopLineBtn.classList.toggle("active", lineIdx !== null);

    if (lineIdx !== null && startPlaying) {
      const lesson = lessons[state.currentTrackIndex];
      const line = lesson.lines[lineIdx];
      if (line) seekAndPlay(line.start);
    }
  }

  function syncActiveLine() {
    const lesson = lessons[state.currentTrackIndex];
    if (!lesson) return;
    const t = audioEl.currentTime;

    // Handle single-line loop
    if (state.loopLineIndex !== null && !audioEl.paused) {
      const loopLine = lesson.lines[state.loopLineIndex];
      if (loopLine && t >= loopLine.end + 0.12) {
        audioEl.currentTime = loopLine.start;
        return;
      }
    }

    // Mark track completed when reaching 80%
    if (audioEl.duration && t / audioEl.duration >= 0.8 && !state.completedIds.has(lesson.id)) {
      state.completedIds.add(lesson.id);
      saveState();
      renderSidebar();
    }

    let matched = -1;
    for (let i = 0; i < lesson.lines.length; i++) {
      const l = lesson.lines[i];
      if (t >= l.start - 0.05 && t <= l.end + 0.12) {
        matched = i;
      }
    }

    if (matched !== state.activeLineIndex) {
      const prevCard = state.activeLineIndex >= 0 ? transcriptList.children[state.activeLineIndex] : null;
      if (prevCard) prevCard.classList.remove("active");

      state.activeLineIndex = matched;
      const nextCard = matched >= 0 ? transcriptList.children[matched] : null;
      if (nextCard) {
        nextCard.classList.add("active");
        if (state.autoScroll) {
          nextCard.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }
    }

    if (!state.isSeeking) {
      currentTimeLabel.textContent = formatTime(t);
      if (audioEl.duration) {
        seekSlider.max = audioEl.duration;
        seekSlider.value = t;
      }
    }
  }

  function startRafLoop() {
    stopRafLoop();
    const tick = () => {
      syncActiveLine();
      if (!audioEl.paused) {
        state.rafId = requestAnimationFrame(tick);
      }
    };
    state.rafId = requestAnimationFrame(tick);
  }

  function stopRafLoop() {
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }

  function updatePlayButton(isPlaying) {
    playPauseBtn.textContent = isPlaying ? "⏸" : "▶";
  }

  function togglePlayPause() {
    if (audioEl.paused) {
      audioEl.play().catch(() => {});
    } else {
      audioEl.pause();
    }
  }

  function jumpLine(delta) {
    const lesson = lessons[state.currentTrackIndex];
    if (!lesson || !lesson.lines.length) return;
    let targetIdx;
    if (state.activeLineIndex >= 0) {
      targetIdx = clamp(state.activeLineIndex + delta, 0, lesson.lines.length - 1);
    } else {
      const t = audioEl.currentTime;
      if (delta > 0) {
        targetIdx = lesson.lines.findIndex((l) => l.start > t + 0.05);
        if (targetIdx < 0) targetIdx = lesson.lines.length - 1;
      } else {
        targetIdx = 0;
        for (let i = lesson.lines.length - 1; i >= 0; i--) {
          if (lesson.lines[i].start < t - 0.3) {
            targetIdx = i;
            break;
          }
        }
      }
    }
    if (state.loopLineIndex !== null) {
      setLoopLine(targetIdx, true);
    } else {
      seekAndPlay(lesson.lines[targetIdx].start);
    }
  }

  function openSidebar() {
    sidebar.classList.add("open");
    sidebarBackdrop.classList.add("open");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarBackdrop.classList.remove("open");
  }

  // Event Listeners
  audioEl.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(audioEl.duration)) {
      durationLabel.textContent = formatTime(audioEl.duration);
      seekSlider.max = audioEl.duration;
    }
  });

  audioEl.addEventListener("play", () => {
    updatePlayButton(true);
    startRafLoop();
  });

  audioEl.addEventListener("pause", () => {
    updatePlayButton(false);
    stopRafLoop();
    syncActiveLine();
  });

  audioEl.addEventListener("timeupdate", () => {
    if (audioEl.paused) syncActiveLine();
  });

  audioEl.addEventListener("ended", () => {
    stopRafLoop();
    updatePlayButton(false);
    const lesson = lessons[state.currentTrackIndex];
    if (lesson && !state.completedIds.has(lesson.id)) {
      state.completedIds.add(lesson.id);
      saveState();
      renderSidebar();
    }
    if (state.autoNext && state.currentTrackIndex < lessons.length - 1) {
      loadTrack(state.currentTrackIndex + 1, true);
    }
  });

  playPauseBtn.addEventListener("click", togglePlayPause);

  prevTrackBtn.addEventListener("click", () => {
    if (state.currentTrackIndex > 0) loadTrack(state.currentTrackIndex - 1, true);
  });

  nextTrackBtn.addEventListener("click", () => {
    if (state.currentTrackIndex < lessons.length - 1) loadTrack(state.currentTrackIndex + 1, true);
  });

  prevLineBtn.addEventListener("click", () => jumpLine(-1));
  nextLineBtn.addEventListener("click", () => jumpLine(1));

  seekSlider.addEventListener("input", () => {
    state.isSeeking = true;
    currentTimeLabel.textContent = formatTime(Number(seekSlider.value));
  });

  seekSlider.addEventListener("change", () => {
    audioEl.currentTime = Number(seekSlider.value);
    state.isSeeking = false;
    syncActiveLine();
  });

  loopLineBtn.addEventListener("click", () => {
    if (state.loopLineIndex !== null) {
      setLoopLine(null);
    } else {
      const lesson = lessons[state.currentTrackIndex];
      let idx = state.activeLineIndex;
      if (idx < 0) {
        idx = lesson.lines.findIndex((l) => !l.isHeader);
        if (idx < 0) idx = 0;
      }
      setLoopLine(idx, audioEl.paused);
    }
  });

  autoNextBtn.addEventListener("click", () => {
    state.autoNext = !state.autoNext;
    applyVisualSettings();
    saveState();
  });

  speedSelect.value = String(state.speed);
  speedSelect.addEventListener("change", () => {
    state.speed = Number(speedSelect.value) || 1;
    audioEl.playbackRate = state.speed;
    saveState();
  });

  volumeSlider.value = String(state.volume);
  volumeSlider.addEventListener("input", () => {
    state.volume = Number(volumeSlider.value);
    audioEl.volume = state.volume;
    saveState();
  });

  toggleFuriganaBtn.addEventListener("click", () => {
    state.showFurigana = !state.showFurigana;
    applyVisualSettings();
    saveState();
  });

  toggleZhBtn.addEventListener("click", () => {
    state.showZh = !state.showZh;
    applyVisualSettings();
    saveState();
  });

  toggleBlindBtn.addEventListener("click", () => {
    state.blindMode = !state.blindMode;
    if (!state.blindMode) {
      transcriptList.querySelectorAll(".line-card.revealed").forEach((c) => {
        c.classList.remove("revealed");
        const b = c.querySelector(".reveal-btn");
        if (b) b.textContent = "👁 顯示";
      });
    }
    applyVisualSettings();
    saveState();
  });

  toggleAutoScrollBtn.addEventListener("click", () => {
    state.autoScroll = !state.autoScroll;
    applyVisualSettings();
    saveState();
  });

  toggleThemeBtn.addEventListener("click", () => {
    state.darkTheme = !state.darkTheme;
    applyVisualSettings();
    saveState();
  });

  searchInput.addEventListener("input", () => {
    state.searchQuery = searchInput.value;
    renderSidebar();
  });

  resetProgressBtn.addEventListener("click", () => {
    state.completedIds.clear();
    saveState();
    renderSidebar();
  });

  openSidebarBtn.addEventListener("click", openSidebar);
  closeSidebarBtn.addEventListener("click", closeSidebar);
  sidebarBackdrop.addEventListener("click", closeSidebar);

  document.addEventListener("click", (e) => {
    if (e.detail > 0) {
      const btn = e.target && e.target.closest && e.target.closest("button");
      if (btn) btn.blur();
    }
  });

  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;

    if (e.code === "Space") {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      jumpLine(-1);
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      jumpLine(1);
    } else if (e.code === "ArrowUp") {
      e.preventDefault();
      if (state.currentTrackIndex > 0) loadTrack(state.currentTrackIndex - 1, true);
    } else if (e.code === "ArrowDown") {
      e.preventDefault();
      if (state.currentTrackIndex < lessons.length - 1) loadTrack(state.currentTrackIndex + 1, true);
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      loopLineBtn.click();
    }
  });

  // Init
  loadTrack(state.currentTrackIndex, false);
})();
