    (function () {
      var STORAGE_FOCUS = "estudie_focusMin";
      var STORAGE_BREAK = "estudie_breakMin";
      var STORAGE_TASK = "estudie_task";
      var STORAGE_PROFILE = "estudie_profile";

      var PROFILES = {
        intense: { focus: 25, break: 5 },
        learn: { focus: 45, break: 15 },
        light: { focus: 50, break: 10 },
        relax: { focus: 20, break: 10 },
      };

      var hints = [
        "Anota depois do bloco, se precisar.",
        "Perdeu o fio? Volta quando der.",
        "Ritmo importa mais que perfeição.",
        "Um bloco de cada vez.",
      ];

      function clamp(n, lo, hi) {
        return Math.min(hi, Math.max(lo, n));
      }

      function isAllowedAudioUrl(url) {
        if (typeof url !== "string") return false;
        var t = url.trim();
        if (!t) return false;
        if (/^javascript:/i.test(t)) return false;
        if (t.indexOf("..") !== -1) return false;
        if (t.indexOf("audio/") !== 0) return false;
        if (/^https?:\/\//i.test(t)) return false;
        return /\.mp3$/i.test(t);
      }

      function loadInt(key, def, lo, hi) {
        var v = parseInt(localStorage.getItem(key), 10);
        if (!Number.isFinite(v)) return def;
        return clamp(v, lo, hi);
      }

      var savedProfile = localStorage.getItem(STORAGE_PROFILE);
      var profileId = PROFILES[savedProfile] ? savedProfile : "intense";
      document.documentElement.setAttribute("data-profile", profileId);

      var focusMin = loadInt(STORAGE_FOCUS, PROFILES[profileId].focus, 1, 180);
      var breakMin = loadInt(STORAGE_BREAK, PROFILES[profileId].break, 1, 120);

      var display = document.getElementById("display");
      var ring = document.getElementById("ring");
      var modeLabel = document.getElementById("modeLabel");
      var taskPeek = document.getElementById("taskPeek");
      var toggle = document.getElementById("toggle");
      var resetBtn = document.getElementById("reset");
      var addFiveBtn = document.getElementById("addFive");
      var hintEl = document.getElementById("hint");
      var modeButtons = document.querySelectorAll(".modes button");
      var profileButtons = document.querySelectorAll(".profiles button");
      var focusMinInput = document.getElementById("focusMin");
      var breakMinInput = document.getElementById("breakMin");
      var taskInput = document.getElementById("taskGoal");
      var soundToggle = document.getElementById("soundToggle");
      var musicToggle = document.getElementById("musicToggle");
      var musicSelect = document.getElementById("musicSelect");
      var volSlider = document.getElementById("vol");
      var bgMusic = document.getElementById("bgMusic");
      var devCreditEl = document.getElementById("devCredit");

      function audioHintWithDev(messagePlain) {
        if (!hintEl) return;
        hintEl.textContent = "";
        hintEl.appendChild(document.createTextNode(messagePlain));
        if (devCreditEl) {
          hintEl.appendChild(document.createElement("br"));
          var wrap = document.createElement("span");
          wrap.className = "hint-dev-append";
          wrap.appendChild(devCreditEl.cloneNode(true));
          hintEl.appendChild(wrap);
        }
      }

      var STORAGE_MUSIC_INDEX = "estudie_musicIndex";

      var MUSIC_TRACKS = [
        { title: "Calma", url: "audio/calma.mp3" },
        { title: "Foco", url: "audio/foco.mp3" },
        { title: "Leve", url: "audio/leve.mp3" },
        { title: "Ambiente", url: "audio/ambiente.mp3" },
        { title: "Estudo", url: "audio/estudo.mp3" },
      ];
      focusMinInput.value = String(focusMin);
      breakMinInput.value = String(breakMin);
      taskInput.value = localStorage.getItem(STORAGE_TASK) || "";

      MUSIC_TRACKS.forEach(function (t, i) {
        var opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = t.title;
        musicSelect.appendChild(opt);
      });
      var mi = clamp(parseInt(localStorage.getItem(STORAGE_MUSIC_INDEX), 10) || 0, 0, MUSIC_TRACKS.length - 1);
      musicSelect.value = String(mi);

      var lastPrefetchedUrl = "";
      var musicLoadToken = 0;

      function getMusicIndex() {
        return clamp(parseInt(musicSelect.value, 10) || 0, 0, MUSIC_TRACKS.length - 1);
      }

      function safeTrackUrlAt(idx) {
        var t = MUSIC_TRACKS[clamp(idx, 0, MUSIC_TRACKS.length - 1)];
        if (!t || !isAllowedAudioUrl(t.url)) return "";
        return t.url.trim();
      }

      function prefetchSelectedTrack() {
        var idx = getMusicIndex();
        var url = safeTrackUrlAt(idx);
        if (!url || lastPrefetchedUrl === url) return;
        lastPrefetchedUrl = url;
        bgMusic.src = url;
        bgMusic.loop = true;
        try {
          bgMusic.load();
        } catch (_) {}
      }

      prefetchSelectedTrack();

      profileButtons.forEach(function (b) {
        var on = b.dataset.profile === profileId;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });

      function getFocusSec() {
        return focusMin * 60;
      }

      function getBreakSec() {
        return breakMin * 60;
      }

      var mode = "focus";
      var total = getFocusSec();
      var remaining = total;
      var running = false;
      var intervalId = null;

      var audioCtx = null;
      var noiseNode = null;
      var gainNode = null;
      var filterNode = null;
      var soundOn = false;

      function format(sec) {
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
      }

      function readMinutesFromInputs() {
        var f = parseInt(focusMinInput.value, 10);
        var b = parseInt(breakMinInput.value, 10);
        focusMin = clamp(Number.isFinite(f) ? f : 25, 1, 180);
        breakMin = clamp(Number.isFinite(b) ? b : 5, 1, 120);
        focusMinInput.value = String(focusMin);
        breakMinInput.value = String(breakMin);
        localStorage.setItem(STORAGE_FOCUS, String(focusMin));
        localStorage.setItem(STORAGE_BREAK, String(breakMin));
      }

      function syncDurationToMode() {
        total = mode === "focus" ? getFocusSec() : getBreakSec();
        remaining = total;
      }

      function setDurationInputsDisabled(disabled) {
        focusMinInput.disabled = disabled;
        breakMinInput.disabled = disabled;
      }

      function setProgress() {
        var p = total > 0 ? (total - remaining) / total : 0;
        ring.style.setProperty("--progress", String(p));
      }

      function updateTaskPeek() {
        var t = taskInput.value.trim();
        taskPeek.textContent = mode === "focus" && t ? t : "";
        taskPeek.setAttribute("aria-hidden", t && mode === "focus" ? "false" : "true");
      }

      function render() {
        display.textContent = format(remaining);
        setProgress();
        if (modeLabel) modeLabel.textContent = mode === "focus" ? "Foco" : "Pausa";
        ring.setAttribute("data-mode", mode);
        toggle.textContent = running ? "Pausar" : remaining === total && !running ? "Iniciar" : "Continuar";
        setDurationInputsDisabled(running);
        addFiveBtn.disabled = total <= 0;
        updateTaskPeek();
      }

      function pickHint() {
        if (!hintEl) return;
        var i = Math.floor(Math.random() * hints.length);
        hintEl.textContent = hints[i];
      }

      function stopTick() {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        running = false;
      }

      function onComplete() {
        stopTick();
        remaining = 0;
        render();
        pickHint();
        try {
          if ("vibrate" in navigator) navigator.vibrate(200);
        } catch (_) {}
      }

      function tick() {
        if (remaining <= 0) {
          onComplete();
          return;
        }
        remaining -= 1;
        render();
        if (remaining === 0) onComplete();
      }

      function startTick() {
        if (intervalId) return;
        running = true;
        intervalId = setInterval(tick, 1000);
      }

      function applyMode(next) {
        stopTick();
        mode = next;
        readMinutesFromInputs();
        syncDurationToMode();
        modeButtons.forEach(function (btn) {
          var active = btn.dataset.mode === mode;
          btn.classList.toggle("active", active);
          btn.setAttribute("aria-selected", active ? "true" : "false");
        });
        if (hintEl) {
          if (mode === "break") {
            hintEl.textContent = "Buffer de descanso ativo. Respira.";
          } else {
            pickHint();
          }
        }
        render();
      }

      function applyProfile(id) {
        if (!PROFILES[id]) return;
        profileId = id;
        document.documentElement.setAttribute("data-profile", profileId);
        localStorage.setItem(STORAGE_PROFILE, profileId);
        var p = PROFILES[profileId];
        if (!running) {
          focusMin = p.focus;
          breakMin = p.break;
          focusMinInput.value = String(focusMin);
          breakMinInput.value = String(breakMin);
          localStorage.setItem(STORAGE_FOCUS, String(focusMin));
          localStorage.setItem(STORAGE_BREAK, String(breakMin));
          syncDurationToMode();
        }
        profileButtons.forEach(function (btn) {
          var on = btn.dataset.profile === profileId;
          btn.classList.toggle("active", on);
          btn.setAttribute("aria-pressed", on ? "true" : "false");
        });
        render();
      }

      function onDurationInputsChanged() {
        if (running) return;
        readMinutesFromInputs();
        syncDurationToMode();
        render();
      }

      function makePinkBuffer(ac, seconds) {
        var len = (ac.sampleRate * seconds) | 0;
        var buf = ac.createBuffer(1, len, ac.sampleRate);
        var ch = buf.getChannelData(0);
        var b0 = 0,
          b1 = 0,
          b2 = 0,
          b3 = 0,
          b4 = 0,
          b5 = 0,
          b6 = 0;
        for (var i = 0; i < len; i++) {
          var white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          ch[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          ch[i] *= 0.11;
        }
        return buf;
      }

      function stopPinkNoise() {
        if (noiseNode) {
          try {
            noiseNode.stop();
          } catch (_) {}
          noiseNode.disconnect();
          noiseNode = null;
        }
        if (filterNode) {
          filterNode.disconnect();
          filterNode = null;
        }
        if (gainNode) {
          gainNode.disconnect();
          gainNode = null;
        }
        soundOn = false;
        soundToggle.setAttribute("aria-pressed", "false");
        soundToggle.textContent = "Rosa";
      }

      function stopMusicPlayback() {
        musicLoadToken += 1;
        try {
          bgMusic.pause();
        } catch (_) {}
        musicToggle.disabled = false;
        musicToggle.setAttribute("aria-pressed", "false");
        musicToggle.textContent = "Música";
      }

      function getVol01() {
        return (parseInt(volSlider.value, 10) || 0) / 100;
      }

      function updateAllVolume() {
        var u = getVol01();
        if (gainNode && audioCtx) {
          gainNode.gain.setValueAtTime(u * 0.35, audioCtx.currentTime);
        }
        bgMusic.volume = Math.min(1, u * 0.72);
      }

      function startPinkNoise() {
        stopMusicPlayback();
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();

        stopPinkNoise();

        var buf = makePinkBuffer(audioCtx, 3);
        noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buf;
        noiseNode.loop = true;

        filterNode = audioCtx.createBiquadFilter();
        filterNode.type = "lowpass";
        filterNode.frequency.value = 2800;
        filterNode.Q.value = 0.7;

        gainNode = audioCtx.createGain();
        gainNode.gain.value = getVol01() * 0.35;

        noiseNode.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        noiseNode.start();
        soundOn = true;
        soundToggle.setAttribute("aria-pressed", "true");
        soundToggle.textContent = "Sem rosa";
      }

      function startMusicPlayback() {
        stopPinkNoise();
        var idx = getMusicIndex();
        musicSelect.value = String(idx);
        localStorage.setItem(STORAGE_MUSIC_INDEX, String(idx));
        var url = safeTrackUrlAt(idx);
        if (!url) {
          audioHintWithDev("Caminho da trilha inválido. Em MUSIC_TRACKS usa só ficheiros em audio/… (MP3, sem .. nem URL externa).");
          return;
        }

        musicLoadToken += 1;
        var token = musicLoadToken;

        function applySrcIfNeeded() {
          if (lastPrefetchedUrl === url) return;
          lastPrefetchedUrl = url;
          bgMusic.src = url;
          bgMusic.loop = true;
          try {
            bgMusic.load();
          } catch (_) {}
        }

        applySrcIfNeeded();
        updateAllVolume();

        function tryPlay() {
          if (token !== musicLoadToken) return;
          musicToggle.disabled = false;
          bgMusic.play().then(
            function () {
              if (token !== musicLoadToken) return;
              musicToggle.setAttribute("aria-pressed", "true");
              musicToggle.textContent = "Pausar";
            },
            function () {
              if (token !== musicLoadToken) return;
              musicToggle.setAttribute("aria-pressed", "false");
              musicToggle.textContent = "Música";
              audioHintWithDev(
                "Não foi possível tocar. Verifica a pasta audio/, formato MP3 e servidor em localhost (evita abrir por file://)."
              );
            }
          );
        }

        if (bgMusic.readyState >= 2) {
          tryPlay();
        } else {
          musicToggle.textContent = "A carregar...";
          musicToggle.disabled = true;
          var onReady = function () {
            bgMusic.removeEventListener("canplay", onReady);
            if (token !== musicLoadToken) return;
            tryPlay();
          };
          bgMusic.addEventListener("canplay", onReady);
        }
      }

      toggle.addEventListener("click", function () {
        if (remaining === 0) {
          readMinutesFromInputs();
          syncDurationToMode();
          remaining = total;
        }
        if (running) {
          stopTick();
          render();
        } else {
          startTick();
          render();
        }
      });

      resetBtn.addEventListener("click", function () {
        stopTick();
        readMinutesFromInputs();
        syncDurationToMode();
        remaining = total;
        render();
      });

      addFiveBtn.addEventListener("click", function () {
        if (total <= 0) return;
        total += 300;
        remaining += 300;
        render();
      });

      modeButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          applyMode(btn.dataset.mode);
        });
      });

      profileButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          applyProfile(btn.dataset.profile);
        });
      });

      focusMinInput.addEventListener("change", onDurationInputsChanged);
      breakMinInput.addEventListener("change", onDurationInputsChanged);
      focusMinInput.addEventListener("blur", function () {
        if (!running) onDurationInputsChanged();
      });
      breakMinInput.addEventListener("blur", function () {
        if (!running) onDurationInputsChanged();
      });

      taskInput.addEventListener("input", updateTaskPeek);
      taskInput.addEventListener("blur", function () {
        localStorage.setItem(STORAGE_TASK, taskInput.value);
        updateTaskPeek();
      });

      soundToggle.addEventListener("click", function () {
        if (soundOn) stopPinkNoise();
        else startPinkNoise();
      });

      musicToggle.addEventListener("click", function () {
        if (!bgMusic.paused) {
          stopMusicPlayback();
          return;
        }
        startMusicPlayback();
      });

      musicSelect.addEventListener("change", function () {
        localStorage.setItem(STORAGE_MUSIC_INDEX, musicSelect.value);
        prefetchSelectedTrack();
        if (!bgMusic.paused) {
          startMusicPlayback();
        }
      });

      musicSelect.addEventListener("focus", prefetchSelectedTrack);

      bgMusic.addEventListener("error", function () {
        musicLoadToken += 1;
        musicToggle.disabled = false;
        musicToggle.setAttribute("aria-pressed", "false");
        musicToggle.textContent = "Música";
        audioHintWithDev("Erro no ficheiro de áudio. Confirma audio/, MP3 e servidor local.");
      });

      volSlider.addEventListener("input", updateAllVolume);

      document.addEventListener("keydown", function (e) {
        if (e.code !== "Space" && e.key !== " ") return;
        var el = e.target;
        if (el.closest && (el.closest("input") || el.closest("textarea") || el.closest("select"))) return;
        if (el.isContentEditable) return;
        e.preventDefault();
        toggle.click();
      });

      pickHint();
      render();
      updateAllVolume();
    })();
