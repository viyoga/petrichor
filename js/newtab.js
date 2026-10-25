/**
 * VIYOGA NEWTAB — Startpage Engine
 * (feature logic carried over from the old sonder page; visuals rebuilt on
 *  viyoga's own tokens — base.css is the site's stylesheet)
 * Features:
 * - Real-time 24h clock with seconds & lowercase date formatter
 * - Live performance stats (load, ping, fps, resolution)
 * - Interactive tasks checklist with due tags & localStorage persistence
 * - Open-Meteo weather fetch with instant fallback
 * - 12 shortcut links with SVG icons & single-key navigation
 * - Floating search overlay triggered by '/' or typing, with bang shortcuts
 */

(() => {
  'use strict';

  // ══════════════════════════════════════════════════════════════════
  // 1. DATETIME (24-Hour with seconds)
  // ══════════════════════════════════════════════════════════════════
  const timeDisplay = document.getElementById('timeDisplay');
  const dateDisplay = document.getElementById('dateDisplay');

  function updateDateTime() {
    const now = new Date();
    
    // 24-hour HH:mm:ss
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    timeDisplay.innerHTML = `${hours}:${minutes}<i>:${seconds}</i>`;

    // sunday, january 11, 2026 (exact lowercase format)
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const month = now.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
    const day = now.getDate();
    const year = now.getFullYear();
    dateDisplay.textContent = `${weekday}, ${month} ${day}, ${year}`;
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);

  // ══════════════════════════════════════════════════════════════════
  // 2. LIVE SYSTEM STATS (cpu, ram, down, up)
  // ══════════════════════════════════════════════════════════════════
  const statCpu = document.getElementById('statCpu');
  const statRam = document.getElementById('statRam');
  const statDown = document.getElementById('statDown');
  const statUp = document.getElementById('statUp');
  const statGpu = document.getElementById('statGpu');
  const statTemp = document.getElementById('statTemp');
  const statDisk = document.getElementById('statDisk');
  const statSwap = document.getElementById('statSwap');

  // Fastfetch elements
  const ffUser = document.getElementById('ffUser');
  const ffOs = document.getElementById('ffOs');
  const ffOsAge = document.getElementById('ffOsAge');
  const ffKernel = document.getElementById('ffKernel');
  const ffUptime = document.getElementById('ffUptime');
  const ffWm = document.getElementById('ffWm');
  const ffShell = document.getElementById('ffShell');
  const ffPalette = document.getElementById('ffPalette');
  const ffBrowser = document.getElementById('ffBrowser');
  const ffAvatar = document.getElementById('ffAvatar');

  function detectBrowser() {
    const ua = navigator.userAgent;
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      return 'Brave Nightly';
    }
    if (ua.includes('Brave')) return 'Brave Nightly';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/')) return 'Brave Nightly';
    if (ua.includes('Firefox/')) return 'Firefox';
    return 'Chromium';
  }
  if (ffBrowser) ffBrowser.textContent = detectBrowser();

  // Load cached stats so there is no layout jump or empty display
  try {
    const cached = localStorage.getItem('viyoga_system_stats');
    if (cached) {
      const data = JSON.parse(cached);
      if (data.cpu) statCpu.textContent = data.cpu;
      if (data.ram) statRam.textContent = data.ram;
      if (data.down) statDown.textContent = data.down;
      if (data.up) statUp.textContent = data.up;
      if (data.gpu) statGpu.textContent = data.gpu;
      if (data.temp && statTemp) statTemp.textContent = data.temp;
      if (data.disk && statDisk) statDisk.textContent = data.disk;
      if (data.swap && statSwap) statSwap.textContent = data.swap;
      if (data.system) {
        if (ffUptime && data.system.uptime) ffUptime.textContent = data.system.uptime;
        if (ffPalette && data.system.palette) ffPalette.textContent = data.system.palette;
        if (ffOsAge && data.system.os_age) ffOsAge.textContent = data.system.os_age;
      }
    }
  } catch (_) {}

  // ══════════════════════════════════════════════════════════════════
  // 2. LIVE SYSTEM STATS & FASTFETCH
  // ══════════════════════════════════════════════════════════════════
  async function fetchSystemStats() {
    try {
      const res = await fetch('http://127.0.0.1:9191/stats', {
        cache: 'no-store',
        signal: AbortSignal.timeout(1500)
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.cpu !== undefined) statCpu.textContent = data.cpu;
      if (data.ram !== undefined) statRam.textContent = data.ram;
      if (data.down !== undefined) statDown.textContent = data.down;
      if (data.up !== undefined) statUp.textContent = data.up;
      if (data.gpu !== undefined) statGpu.textContent = data.gpu;
      if (data.temp !== undefined && statTemp) statTemp.textContent = data.temp;
      if (data.disk !== undefined && statDisk) statDisk.textContent = data.disk;
      if (data.swap !== undefined && statSwap) statSwap.textContent = data.swap;

      // Functional thresholds for stats (data-driven color)
      if (data.cpu_val !== undefined) {
        statCpu.className = 'stat-value' + (data.cpu_val >= 80 ? ' val-alert' : (data.cpu_val >= 50 ? ' val-warn' : ''));
      }
      if (data.ram_val !== undefined) {
        statRam.className = 'stat-value' + (data.ram_val >= 85 ? ' val-alert' : (data.ram_val >= 70 ? ' val-warn' : ''));
      }
      if (data.gpu_val !== undefined && data.gpu_val !== null) {
        statGpu.className = 'stat-value' + (data.gpu_val >= 80 ? ' val-alert' : (data.gpu_val >= 50 ? ' val-warn' : ''));
      }
      if (data.temp_val !== undefined && data.temp_val !== null && statTemp) {
        statTemp.className = 'stat-value' + (data.temp_val >= 80 ? ' val-alert' : (data.temp_val >= 70 ? ' val-warn' : ''));
      }
      if (data.disk_val !== undefined && data.disk_val !== null && statDisk) {
        statDisk.className = 'stat-value' + (data.disk_val >= 90 ? ' val-alert' : (data.disk_val >= 80 ? ' val-warn' : ''));
      }
      if (data.swap_val !== undefined && data.swap_val !== null && statSwap) {
        statSwap.className = 'stat-value' + (data.swap_val >= 80 ? ' val-alert' : (data.swap_val >= 50 ? ' val-warn' : ''));
      }

      // Fastfetch updates
      if (data.system) {
        if (ffUser && data.system.user) ffUser.textContent = data.system.user;
        if (ffOs && data.system.os) ffOs.textContent = data.system.os;
        if (ffOsAge && data.system.os_age) ffOsAge.textContent = data.system.os_age;
        if (ffKernel && data.system.kernel) ffKernel.textContent = data.system.kernel;
        if (ffUptime && data.system.uptime) ffUptime.textContent = data.system.uptime;
        if (ffWm && data.system.wm) ffWm.textContent = data.system.wm;
        if (ffShell && data.system.shell) ffShell.textContent = data.system.shell;
        if (ffPalette && data.system.palette) ffPalette.textContent = data.system.palette;
      }

      // Avatar sync
      if (data.avatar?.key && ffAvatar) {
        const targetSrc = 'http://127.0.0.1:9191/avatar?v=' + encodeURIComponent(data.avatar.key);
        if (ffAvatar.getAttribute('data-loaded-key') !== data.avatar.key) {
          ffAvatar.src = targetSrc;
          ffAvatar.setAttribute('data-loaded-key', data.avatar.key);
        }
      }

      localStorage.setItem('viyoga_system_stats', JSON.stringify({
        cpu: data.cpu,
        ram: data.ram,
        down: data.down,
        up: data.up,
        gpu: data.gpu,
        system: data.system
      }));
    } catch (_) {
      // If service is temporarily offline, keep previous/cached values
    }
  }

  fetchSystemStats();

  // Poll stats every 1s when active, pause when tab is hidden
  let statsTimer = null;
  function startStatsPolling() {
    if (statsTimer) clearInterval(statsTimer);
    statsTimer = setInterval(fetchSystemStats, 1000);
  }

  function stopStatsPolling() {
    if (statsTimer) {
      clearInterval(statsTimer);
      statsTimer = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopStatsPolling();
    } else {
      fetchSystemStats();
      startStatsPolling();
    }
  });

  startStatsPolling();

  // ══════════════════════════════════════════════════════════════════
  // 3. TASKS CHECKLIST (Interactive + LocalStorage)
  // ══════════════════════════════════════════════════════════════════
  const tasksCount = document.getElementById('tasksCount');
  const tasksList = document.getElementById('tasksList');
  const taskForm = document.getElementById('taskForm');
  const taskInput = document.getElementById('taskInput');

  // A fresh install starts empty — the old page's sample homework is gone.
  const DEFAULT_TASKS = [];

  function loadTasks() {
    try {
      const raw = localStorage.getItem('viyoga_tasks');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return DEFAULT_TASKS;
  }

  function saveTasks(tasks) {
    localStorage.setItem('viyoga_tasks', JSON.stringify(tasks));
  }

  let tasks = loadTasks();

  function renderTasks(focusedId = null) {
    tasksCount.textContent = `${tasks.length} tasks`;

    if (tasks.length === 0) {
      tasksList.innerHTML = `<div class="task-row" style="color: var(--fg-muted); font-style: italic;">no tasks remaining</div>`;
      return;
    }

    tasksList.innerHTML = tasks.map(t => `
      <div class="task-row ${t.completed ? 'completed' : ''}" data-id="${t.id}" tabindex="0" role="checkbox" aria-checked="${t.completed}">
        <span class="task-check">${t.completed ? '[x]' : '[ ]'}</span>
        <span class="task-text">${escapeHtml(t.text)}</span>
        ${t.due ? `<span class="task-due">${escapeHtml(t.due)}</span>` : ''}
        <span class="task-del" title="Delete task">×</span>
      </div>
    `).join('');

    if (focusedId) {
      const el = tasksList.querySelector(`.task-row[data-id="${focusedId}"]`);
      if (el) el.focus();
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Toggle or Delete task on click
  tasksList.addEventListener('click', (e) => {
    const row = e.target.closest('.task-row');
    if (!row) return;
    const id = row.getAttribute('data-id');

    if (e.target.classList.contains('task-check') || e.target.classList.contains('task-text')) {
      tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      saveTasks(tasks);
      renderTasks(id);
    } else if (e.target.classList.contains('task-del')) {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks(tasks);
      renderTasks();
    }
  });

  // Keyboard navigation & controls on tasks list
  tasksList.addEventListener('keydown', (e) => {
    const row = e.target.closest('.task-row');
    if (!row) return;
    const id = row.getAttribute('data-id');
    const rows = Array.from(tasksList.querySelectorAll('.task-row[data-id]'));
    const idx = rows.indexOf(row);

    // Toggle complete: Space, 'x', or Enter
    if (e.key === ' ' || e.key === 'x' || e.key === 'X' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      saveTasks(tasks);
      renderTasks(id);
      return;
    }

    // Delete task: 'd', Delete, or Backspace
    if (e.key === 'd' || e.key === 'D' || e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      const nextToFocus = rows[idx + 1] ? rows[idx + 1].getAttribute('data-id') : (rows[idx - 1] ? rows[idx - 1].getAttribute('data-id') : null);
      tasks = tasks.filter(t => t.id !== id);
      saveTasks(tasks);
      renderTasks(nextToFocus);
      if (!nextToFocus && tasks.length === 0) taskInput.focus();
      return;
    }

    // Next item: ArrowDown or 'j'
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      e.stopPropagation();
      if (idx < rows.length - 1) {
        rows[idx + 1].focus();
      } else {
        taskInput.focus();
      }
      return;
    }

    // Prev item: ArrowUp or 'k'
    if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      e.stopPropagation();
      if (idx > 0) {
        rows[idx - 1].focus();
      }
      return;
    }

    // Escape: Blur task row back to page
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      row.blur();
      return;
    }
  });

  // Add new task
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = taskInput.value.trim();
    if (!val) return;

    let text = val;
    let due = '';

    // Parse "@due" or "// due"
    if (val.includes('@')) {
      const parts = val.split('@');
      text = parts[0].trim();
      due = parts.slice(1).join('@').trim();
    } else if (val.includes('//')) {
      const parts = val.split('//');
      text = parts[0].trim();
      due = parts.slice(1).join('//').trim();
    }

    const newTask = {
      id: String(Date.now()),
      text: text || val,
      due: due,
      completed: false
    };

    tasks.push(newTask);
    saveTasks(tasks);
    renderTasks();
    taskInput.value = '';

    // Scroll to bottom of task list
    tasksList.scrollTop = tasksList.scrollHeight;
  });

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      taskInput.blur();
    } else if (e.key === 'ArrowUp' && (taskInput.selectionStart === 0 || taskInput.value === '')) {
      const rows = tasksList.querySelectorAll('.task-row[data-id]');
      if (rows.length > 0) {
        e.preventDefault();
        rows[rows.length - 1].focus();
      }
    }
  });

  renderTasks();

  // ══════════════════════════════════════════════════════════════════
  // 4. WEATHER (Open-Meteo API + Exact fallback)
  // ══════════════════════════════════════════════════════════════════
  const weatherTemp = document.getElementById('weatherTemp');
  const weatherCondition = document.getElementById('weatherCondition');
  const statHumi = document.getElementById('statHumi');
  const statPrec = document.getElementById('statPrec');
  const statUv = document.getElementById('statUv');
  const statWind = document.getElementById('statWind');
  const statFeel = document.getElementById('statFeel');
  const statAqi = document.getElementById('statAqi');
  const weatherForecast = document.getElementById('weatherForecast');

  function wmoCondition(code) {
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'sunny';
    if (code === 3) return 'overcast';
    if (code >= 45 && code <= 48) return 'fog';
    if (code >= 51 && code <= 55) return 'drizzle';
    if (code >= 61 && code <= 65) return 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'showers';
    if (code >= 95) return 'thunderstorm';
    return 'clear';
  }

  function getWeatherPhrase(condition, date = new Date()) {
    const hour = date.getHours();
    const isNight = hour >= 21 || hour < 5;
    const isEvening = hour >= 17 && hour < 21;
    const isMorning = hour >= 5 && hour < 12;
    const timeOfDay = isNight ? 'tonight' : (isEvening ? 'this evening' : (isMorning ? 'this morning' : 'today'));

    const cond = (condition || '').toLowerCase();
    switch (cond) {
      case 'clear':
        if (isNight) return 'the sky is clear tonight';
        if (isEvening) return 'clear skies this evening';
        return 'the sky is clear today';
      case 'sunny':
        if (isNight) return 'clear and calm tonight';
        if (isMorning) return "it's bright and sunny this morning";
        return "it's sunny and warm outside";
      case 'overcast':
        if (isNight) return 'overcast skies tonight';
        if (isEvening) return "it's cloudy this evening";
        return "it's cloudy outside";
      case 'cloudy':
        return "it's cloudy outside";
      case 'rain':
        return `it's raining ${timeOfDay}`;
      case 'drizzle':
        return `light drizzle ${timeOfDay}`;
      case 'showers':
        return `passing showers ${timeOfDay}`;
      case 'thunderstorm':
        return `thunderstorms ${timeOfDay}`;
      case 'snow':
        return `it's snowing ${timeOfDay}`;
      case 'fog':
        return isMorning ? 'mist and fog this morning' : 'foggy outside';
      default:
        return cond ? `${cond} ${timeOfDay}` : 'clear skies today';
    }
  }

  const weatherBadge = document.getElementById('weatherBadge');

  async function fetchLiveWeather() {
    try {
      // 1. Try local server first (Noctalia's live weather cache)
      try {
        const localRes = await fetch('http://127.0.0.1:9191/weather', {
          cache: 'no-store',
          signal: AbortSignal.timeout(1500)
        });
        if (localRes.ok) {
          const localData = await localRes.json();
          if (localData && localData.ok) {
            if (weatherBadge) {
              weatherBadge.textContent = 'open-meteo';
            }
            localStorage.setItem('viyoga_weather_cache', JSON.stringify({ timestamp: Date.now(), data: localData }));
            applyWeatherData(localData);
            return;
          }
        }
      } catch (_) {}

      // 2. Check local cache (30 min TTL)
      const cached = localStorage.getItem('viyoga_weather_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          applyWeatherData(parsed.data);
          return;
        }
      }

      // 3. Fallback coordinates (configurable via search bar '!loc <lat> <lon>')
      const lat = parseFloat(localStorage.getItem('viyoga_weather_lat')) || 40.7128;
      const lon = parseFloat(localStorage.getItem('viyoga_weather_lon')) || -74.0060;

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,uv_index&timezone=auto&forecast_days=2`;
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;

      const [wRes, aqiRes] = await Promise.all([
        fetch(weatherUrl, { signal: AbortSignal.timeout(4000) }),
        fetch(aqiUrl, { signal: AbortSignal.timeout(4000) }).catch(() => null)
      ]);

      if (!wRes.ok) return;
      const wData = await wRes.json();
      let aqiVal = 95;
      if (aqiRes && aqiRes.ok) {
        const aData = await aqiRes.json();
        if (aData.current?.us_aqi) aqiVal = Math.round(aData.current.us_aqi);
      }

      const current = wData.current;
      const hourly = wData.hourly;

      const now = new Date();
      const currentHour = now.getHours();
      const forecastRows = [];

      for (let i = 1; i <= 5; i++) {
        const targetHour = (Math.floor(currentHour / 3) * 3 + (i * 3)) % 24;
        const timeStr = `${String(targetHour).padStart(2, '0')}:00`;
        const hourIdx = i * 3;
        const temp = hourly.temperature_2m[hourIdx] !== undefined 
          ? Math.round(hourly.temperature_2m[hourIdx]) 
          : 22;
        const cond = hourly.weather_code[hourIdx] !== undefined
          ? wmoCondition(hourly.weather_code[hourIdx])
          : 'clear';

        forecastRows.push({ time: timeStr, temp: `${temp}°`, cond });
      }

      const payload = {
        temp: `${Math.round(current.temperature_2m)}°`,
        condition: wmoCondition(current.weather_code),
        humi: `${Math.round(current.relative_humidity_2m)}%`,
        prec: `${Math.round(current.precipitation)}%`,
        uv: String(Math.round(hourly.uv_index?.[0] || 0)),
        wind: `${Math.round(current.wind_speed_10m)} kmh`,
        feel: `${Math.round(current.apparent_temperature)}°`,
        aqi: String(aqiVal),
        forecast: forecastRows
      };

      if (weatherBadge) weatherBadge.textContent = 'open-meteo';
      localStorage.setItem('viyoga_weather_cache', JSON.stringify({ timestamp: Date.now(), data: payload }));
      applyWeatherData(payload);
    } catch (_) {}
  }

  function applyWeatherData(data) {
    if (!data) return;
    if (data.temp) weatherTemp.textContent = data.temp;
    if (data.condition) {
      weatherCondition.textContent = getWeatherPhrase(data.condition);
      weatherCondition.className = 'weather-condition cond-' + data.condition;
    }
    if (data.humi) statHumi.textContent = data.humi;
    if (data.prec) statPrec.textContent = data.prec;
    if (data.uv) {
      statUv.textContent = data.uv;
      const uvNum = parseFloat(data.uv);
      statUv.className = 'stat-value' + (uvNum >= 6 ? ' val-warn' : '');
    }
    if (data.wind) statWind.textContent = data.wind;
    if (data.feel) statFeel.textContent = data.feel;
    if (data.aqi) {
      statAqi.textContent = data.aqi;
      const aqiNum = parseFloat(data.aqi);
      statAqi.className = 'stat-value' + (aqiNum >= 150 ? ' val-alert' : (aqiNum >= 100 ? ' val-warn' : ''));
    }

    if (data.forecast && data.forecast.length) {
      weatherForecast.innerHTML = data.forecast.map(f => `
        <div>
          <small>${f.time}</small>
          <strong>${f.temp}</strong>
          <em class="cond-${f.cond}">${f.cond}</em>
        </div>
      `).join('');
    }
  }

  fetchLiveWeather();

  // ══════════════════════════════════════════════════════════════════
  // 5. SHORTCUT LINKS (Customizable with Add/Remove & Hotkeys)
  // ══════════════════════════════════════════════════════════════════
  const LINKS_STORAGE_KEY = 'petrichor_custom_links';

  const DEFAULT_LINKS = [
    {
      key: 'g',
      name: 'github',
      url: 'https://github.com',
      svg: '<svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>'
    },
    {
      key: 'y',
      name: 'youtube',
      url: 'https://youtube.com',
      svg: '<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
    },
    {
      key: 'r',
      name: 'reddit',
      url: 'https://reddit.com',
      svg: '<svg viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>'
    },
    {
      key: 'w',
      name: 'wikipedia',
      url: 'https://wikipedia.org',
      svg: '<svg viewBox="0 0 24 24"><path d="M12.09 13.12L9.58 6.54h1.77l1.64 4.54 1.63-4.54h1.76l-2.5 6.58 2.68 6.88h-1.83l-1.74-4.82-1.76 4.82H8.96l2.67-6.88h.46zM2.84 6.54h1.86l3.37 8.94 2.14-5.69-1.39-3.25h1.76l2.13 5.48 2.15-5.48h1.76l-1.4 3.25 2.14 5.69 3.37-8.94h1.86l-4.4 11.58h-1.64l-2.29-5.9-2.28 5.9h-1.64L2.84 6.54z"/></svg>'
    },
    {
      key: 'm',
      name: 'gmail',
      url: 'https://mail.google.com',
      svg: '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>'
    },
    {
      key: 'c',
      name: 'chatgpt',
      url: 'https://chatgpt.com',
      svg: '<svg viewBox="0 0 24 24"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.607 1.5-2.602-1.5z"/></svg>'
    },
    {
      key: 'a',
      name: 'claude',
      url: 'https://claude.ai',
      svg: '<svg viewBox="0 0 24 24"><path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v3.4l2.4-2.4a1.5 1.5 0 1 1 2.1 2.1l-2.4 2.4h3.4a1.5 1.5 0 1 1 0 3h-3.4l2.4 2.4a1.5 1.5 0 0 1-2.1 2.1l-2.4-2.4v3.4a1.5 1.5 0 1 1-3 0v-3.4l-2.4 2.4a1.5 1.5 0 1 1-2.1-2.1l2.4-2.4H4.5a1.5 1.5 0 1 1 0-3h3.4l-2.4-2.4a1.5 1.5 0 1 1 2.1-2.1l2.4 2.4V3.5A1.5 1.5 0 0 1 12 2z"/></svg>'
    },
    {
      key: 's',
      name: 'spotify',
      url: 'https://open.spotify.com',
      svg: '<svg viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>'
    },
    {
      key: 'd',
      name: 'duckduckgo',
      url: 'https://duckduckgo.com',
      svg: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0 .83-.67 1.5-1.5 1.5S10 17.33 10 16.5V11h3v5.5zm-.5-7.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>'
    },
    {
      key: 'x',
      name: 'x',
      url: 'https://x.com',
      svg: '<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
    },
    {
      key: 'v',
      name: 'vimeo',
      url: 'https://vimeo.com',
      svg: '<svg viewBox="0 0 24 24"><path d="M22.396 7.164c-.093 2.026-1.507 4.799-4.245 8.32C15.323 19.161 12.935 21 10.98 21c-1.214 0-2.24-1.12-3.08-3.36-.56-2.052-1.12-4.105-1.68-6.158-.622-2.24-1.29-3.36-2.004-3.36-.156 0-.7.328-1.634.98l-.98-1.26c1.026-.902 2.04-1.797 3.042-2.684 1.37-1.182 2.4-1.804 3.09-1.867 1.616-.156 2.612.948 2.986 3.313.404 2.553.684 4.148.84 4.786.467 2.149.98 3.224 1.54 3.224.436 0 1.09-.685 1.96-2.053.87-1.37 1.34-2.413 1.4-3.13.125-1.183-.343-1.774-1.4-1.774-.5 0-1.012.115-1.54.343 1.028-3.363 3.003-4.99 5.924-4.88 2.164.08 3.193 1.47 3.086 4.167z"/></svg>'
    }
  ];

  function loadLinks() {
    try {
      const stored = localStorage.getItem(LINKS_STORAGE_KEY);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed = parsed.filter(l => !l.url.includes('viyoga.pages.dev') && l.name !== 'viyoga');
          if (parsed.length > 0) return parsed;
        }
      }
    } catch (_) {}
    return [...DEFAULT_LINKS];
  }

  let currentLinks = loadLinks();

  function saveLinks(links) {
    currentLinks = links;
    localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
    renderLinks();
  }

  function getIconForLink(link) {
    if (link.svg) return link.svg;
    try {
      const u = new URL(link.url);
      const domain = u.hostname;
      return `<img class="link-favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><svg class="link-fallback-icon" style="display:none" viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s2.24-5-5-5z" fill="currentColor"/></svg>`;
    } catch (_) {
      return `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg>`;
    }
  }

  const linksGrid = document.getElementById('linksGrid');

  function renderLinks() {
    if (!linksGrid) return;
    const itemsHtml = currentLinks.map(link => `
      <a href="${link.url}" class="link-item" data-key="${link.key}" title="${escapeHtml(link.name)} [${link.key}]">
        <span class="link-icon">${getIconForLink(link)}</span>
        <span class="link-name">${escapeHtml(link.name)}</span>
        <span class="link-key-tag">[${link.key}]</span>
        <button class="link-del-btn" data-key="${link.key}" type="button" title="Delete shortcut [${link.key}]" aria-label="Delete">×</button>
      </a>
    `).join('');

    const addCardHtml = `
      <button class="link-item link-add-card" id="addLinkCardBtn" type="button" title="Add custom shortcut">
        <span class="link-icon"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg></span>
        <span class="link-name">add site...</span>
        <span class="link-key-tag">[+]</span>
      </button>
    `;

    linksGrid.innerHTML = itemsHtml + addCardHtml;

    // Attach delete listeners
    linksGrid.querySelectorAll('.link-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const delKey = btn.dataset.key;
        if (delKey) {
          saveLinks(currentLinks.filter(l => l.key !== delKey));
        }
      });
    });

    const addCard = document.getElementById('addLinkCardBtn');
    if (addCard) {
      addCard.addEventListener('click', openAddLinkModal);
    }
  }

  // Modal elements
  const linkModal = document.getElementById('linkModal');
  const linkForm = document.getElementById('linkForm');
  const linkNameInput = document.getElementById('linkNameInput');
  const linkUrlInput = document.getElementById('linkUrlInput');
  const linkKeyInput = document.getElementById('linkKeyInput');
  const closeLinkModalBtn = document.getElementById('closeLinkModal');
  const cancelLinkBtn = document.getElementById('cancelLinkBtn');
  const addLinkHeaderBtn = document.getElementById('addLinkHeaderBtn');
  const resetLinksHeaderBtn = document.getElementById('resetLinksHeaderBtn');

  function openAddLinkModal() {
    if (!linkModal) return;
    linkModal.classList.add('active');
    linkModal.setAttribute('aria-hidden', 'false');
    linkForm.reset();
    setTimeout(() => linkNameInput && linkNameInput.focus(), 50);
  }

  function closeAddLinkModal() {
    if (!linkModal) return;
    linkModal.classList.remove('active');
    linkModal.setAttribute('aria-hidden', 'true');
  }

  if (addLinkHeaderBtn) addLinkHeaderBtn.addEventListener('click', openAddLinkModal);
  if (resetLinksHeaderBtn) {
    resetLinksHeaderBtn.addEventListener('click', () => {
      if (confirm('Reset all shortcuts to defaults?')) {
        localStorage.removeItem(LINKS_STORAGE_KEY);
        saveLinks([...DEFAULT_LINKS]);
      }
    });
  }
  if (closeLinkModalBtn) closeLinkModalBtn.addEventListener('click', closeAddLinkModal);
  if (cancelLinkBtn) cancelLinkBtn.addEventListener('click', closeAddLinkModal);

  if (linkModal) {
    linkModal.addEventListener('click', (e) => {
      if (e.target === linkModal) closeAddLinkModal();
    });
  }

  // Auto-suggest hotkey when typing site name
  if (linkNameInput) {
    linkNameInput.addEventListener('input', () => {
      const val = linkNameInput.value.trim().toLowerCase();
      if (!val || (linkKeyInput && linkKeyInput.value && linkKeyInput.dataset.manual === 'true')) return;
      const usedKeys = new Set(currentLinks.map(l => l.key.toLowerCase()));
      usedKeys.add('t');
      usedKeys.add(' ');
      usedKeys.add('/');
      for (const ch of val) {
        if (/^[a-z0-9]$/.test(ch) && !usedKeys.has(ch)) {
          linkKeyInput.value = ch;
          break;
        }
      }
    });
  }

  if (linkKeyInput) {
    linkKeyInput.addEventListener('input', () => {
      linkKeyInput.dataset.manual = 'true';
    });
  }

  if (linkForm) {
    linkForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = linkNameInput.value.trim();
      let url = linkUrlInput.value.trim();
      let key = linkKeyInput.value.trim().toLowerCase();

      if (!name || !url || !key) return;

      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      // Check if key already in use
      const existingIdx = currentLinks.findIndex(l => l.key === key);
      const newEntry = { key, name, url };

      if (existingIdx !== -1) {
        const updated = [...currentLinks];
        updated[existingIdx] = newEntry;
        saveLinks(updated);
      } else {
        saveLinks([...currentLinks, newEntry]);
      }

      closeAddLinkModal();
    });
  }

  renderLinks();

  // ══════════════════════════════════════════════════════════════════
  // 6. SEARCH OVERLAY, NEOVIM CURSOR, HISTORY & SUGGESTIONS
  // ══════════════════════════════════════════════════════════════════
  const searchOverlay = document.getElementById('searchOverlay');
  const searchInput = document.getElementById('searchInput');
  const searchPlaceholder = document.getElementById('searchPlaceholder');
  const searchBlockCursor = document.getElementById('searchBlockCursor');
  const searchSuggestions = document.getElementById('searchSuggestions');

  const BANGS = {
    '/rr': { home: 'https://www.reddit.com/', search: 'https://www.reddit.com/search/?q=' },
    '!rr': { home: 'https://www.reddit.com/', search: 'https://www.reddit.com/search/?q=' },
    '/yt': { home: 'https://www.youtube.com/', search: 'https://www.youtube.com/results?search_query=' },
    '!yt': { home: 'https://www.youtube.com/', search: 'https://www.youtube.com/results?search_query=' },
    '/ss': { home: 'https://www.startpage.com/', search: 'https://www.startpage.com/sp/search?query=' },
    '!ss': { home: 'https://www.startpage.com/', search: 'https://www.startpage.com/sp/search?query=' },
    '/dd': { home: 'https://duckduckgo.com/', search: 'https://duckduckgo.com/?q=' },
    '!dd': { home: 'https://duckduckgo.com/', search: 'https://duckduckgo.com/?q=' },
    'dd':  { home: 'https://duckduckgo.com/', search: 'https://duckduckgo.com/?q=' },
    '/gg': { home: 'https://www.google.com/', search: 'https://www.google.com/search?q=' },
    '!gg': { home: 'https://www.google.com/', search: 'https://www.google.com/search?q=' },
    'gg':  { home: 'https://www.google.com/', search: 'https://www.google.com/search?q=' }
  };

  const HISTORY_KEY = 'petrichor_search_history';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegex(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getLocalHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistoryItem({ query, url, title, type = 'search' }) {
    if (!query && !url) return;
    const history = getLocalHistory();
    const cleanQuery = (query || '').trim();
    const cleanUrl = (url || '').trim();
    const cleanTitle = (title || cleanQuery || cleanUrl).trim();

    const existingIndex = history.findIndex(item => {
      if (cleanUrl && item.url && cleanUrl.toLowerCase() === item.url.toLowerCase()) return true;
      if (cleanQuery && item.query && cleanQuery.toLowerCase() === item.query.toLowerCase()) return true;
      return false;
    });

    let count = 1;
    if (existingIndex !== -1) {
      count = (history[existingIndex].count || 1) + 1;
      history.splice(existingIndex, 1);
    }

    history.unshift({
      query: cleanQuery,
      url: cleanUrl,
      title: cleanTitle,
      type: type,
      timestamp: Date.now(),
      count
    });

    if (history.length > 150) history.length = 150;

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {}
  }

  function initHistoryIfEmpty() {
    if (!localStorage.getItem(HISTORY_KEY)) {
      const initial = [
        { query: 'youtube', title: 'YouTube', url: 'https://youtube.com', type: 'url', timestamp: Date.now() - 10000, count: 8 },
        { query: 'reddit', title: 'Reddit', url: 'https://reddit.com', type: 'url', timestamp: Date.now() - 20000, count: 6 },
        { query: 'arch wiki hyprland', title: 'ArchWiki · Hyprland', url: 'https://wiki.archlinux.org/title/Hyprland', type: 'url', timestamp: Date.now() - 30000, count: 5 },
        { query: 'wallhaven', title: 'Wallhaven', url: 'https://wallhaven.cc', type: 'url', timestamp: Date.now() - 40000, count: 4 },
        { query: 'github', title: 'GitHub', url: 'https://github.com', type: 'url', timestamp: Date.now() - 50000, count: 4 }
      ];
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(initial));
      } catch {}
    }
  }
  initHistoryIfEmpty();

  function queryBrowserHistory(searchTerm) {
    return new Promise((resolve) => {
      const historyApi = (typeof chrome !== 'undefined' && chrome.history) ? chrome.history :
                         (typeof browser !== 'undefined' && browser.history) ? browser.history : null;
      if (!historyApi || typeof historyApi.search !== 'function') {
        resolve([]);
        return;
      }
      try {
        historyApi.search({ text: searchTerm, maxResults: 8, startTime: 0 }, (results) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            resolve([]);
            return;
          }
          const formatted = (results || []).map(r => ({
            query: r.title || r.url,
            title: r.title || r.url,
            url: r.url,
            type: 'url',
            timestamp: r.lastVisitTime || 0,
            count: r.visitCount || 1,
            source: 'browser'
          }));
          resolve(formatted);
        });
      } catch {
        resolve([]);
      }
    });
  }

  async function fetchAllSuggestions(rawQuery) {
    const q = rawQuery.trim().toLowerCase();
    const local = getLocalHistory();
    let browserVisits = [];
    try {
      browserVisits = await queryBrowserHistory(rawQuery.trim());
    } catch {}

    const bookmarks = LINKS.map(l => ({
      query: l.name,
      title: l.name,
      url: l.url,
      type: 'url',
      source: 'bookmark',
      count: 15,
      timestamp: 0
    }));

    const bangs = [];
    if (q.startsWith('/') || q.startsWith('!')) {
      for (const [bang, target] of Object.entries(BANGS)) {
        if (bang.startsWith(q)) {
          bangs.push({
            query: bang,
            title: `${bang} (bang shortcut)`,
            url: target.home,
            type: 'bang',
            source: 'bang',
            count: 10,
            timestamp: 0
          });
        }
      }
    }

    const combined = [...bangs, ...local, ...bookmarks, ...browserVisits];
    const seen = new Set();
    const unique = [];

    for (const item of combined) {
      const key = (item.url || item.query || '').toLowerCase().replace(/\/+$/, '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }

    if (!q) {
      return unique
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0) || (b.count || 0) - (a.count || 0))
        .slice(0, 5);
    }

    const scored = [];
    for (const item of unique) {
      const titleLower = (item.title || '').toLowerCase();
      const queryLower = (item.query || '').toLowerCase();
      const urlLower = (item.url || '').toLowerCase();

      let score = 0;
      if (titleLower.startsWith(q) || queryLower.startsWith(q)) score += 100;
      else if (urlLower.startsWith(q) || urlLower.startsWith('https://' + q) || urlLower.startsWith('http://' + q)) score += 80;
      else if (titleLower.includes(q) || queryLower.includes(q)) score += 50;
      else if (urlLower.includes(q)) score += 30;

      if (score > 0) {
        score += Math.min(item.count || 1, 20);
        scored.push({ item, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map(s => s.item);
  }

  let activeSuggestions = [];
  let selectedIndex = -1;
  let uncommittedInput = '';
  let suggDebounceTimer = null;

  function renderSuggestionsUI(items, query) {
    activeSuggestions = items || [];
    selectedIndex = -1;
    uncommittedInput = searchInput.value;

    if (!items || items.length === 0) {
      searchSuggestions.innerHTML = '';
      searchSuggestions.classList.remove('has-items');
      return;
    }

    searchSuggestions.classList.add('has-items');
    const qLower = query.trim().toLowerCase();

    searchSuggestions.innerHTML = items.map((item, idx) => {
      let icon = '›';
      let meta = 'search';
      if (item.type === 'url') {
        icon = '↗';
        try {
          const u = new URL(item.url);
          meta = u.hostname.replace(/^www\./, '');
        } catch {
          meta = 'web';
        }
      } else if (item.type === 'bang') {
        icon = 'λ';
        meta = 'bang';
      }

      const rawTitle = escapeHtml(item.title || item.query || item.url);
      let displayTitle = rawTitle;
      if (qLower && rawTitle.toLowerCase().includes(qLower)) {
        const regex = new RegExp(`(${escapeRegex(qLower)})`, 'gi');
        displayTitle = rawTitle.replace(regex, '<span class="sugg-match">$1</span>');
      }

      return `
        <div class="search-sugg-item" data-index="${idx}">
          <div class="sugg-left">
            <span class="sugg-icon">${icon}</span>
            <span class="sugg-title">${displayTitle}</span>
          </div>
          <span class="sugg-meta">${escapeHtml(meta)}</span>
        </div>
      `;
    }).join('');

    const elItems = searchSuggestions.querySelectorAll('.search-sugg-item');
    elItems.forEach((el, idx) => {
      el.addEventListener('mouseenter', () => {
        selectedIndex = idx;
        updateActiveSuggestionClass();
      });
      el.addEventListener('click', () => {
        executeSuggestion(items[idx]);
      });
    });
  }

  function updateActiveSuggestionClass() {
    const elItems = searchSuggestions.querySelectorAll('.search-sugg-item');
    elItems.forEach((el, idx) => {
      if (idx === selectedIndex) {
        el.classList.add('active');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('active');
      }
    });
  }

  function executeSuggestion(item) {
    if (!item) return;
    saveHistoryItem(item);
    if (item.type === 'url' && item.url) {
      window.location.href = item.url;
      return;
    }
    executeSearch(item.query || item.title);
  }

  function updateCursorAndPlaceholder() {
    const val = searchInput.value || '';
    if (val.length === 0) {
      if (searchPlaceholder) searchPlaceholder.style.opacity = '1';
      if (searchBlockCursor) {
        searchBlockCursor.style.left = '0ch';
        searchBlockCursor.style.display = 'block';
      }
    } else {
      if (searchPlaceholder) searchPlaceholder.style.opacity = '0';
      if (searchBlockCursor) {
        const pos = typeof searchInput.selectionStart === 'number' ? searchInput.selectionStart : val.length;
        searchBlockCursor.style.left = `${pos}ch`;
        searchBlockCursor.style.display = 'block';
      }
    }
  }

  function resetCursorBlink() {
    if (!searchBlockCursor) return;
    searchBlockCursor.style.animation = 'none';
    void searchBlockCursor.offsetWidth;
    searchBlockCursor.style.animation = 'nvimBlockBlink 1.06s steps(1) infinite';
  }

  async function openSearch(initialChar = '') {
    searchOverlay.classList.add('open');
    searchOverlay.setAttribute('aria-hidden', 'false');
    const val = (initialChar === ' ' || initialChar === '/') ? '' : initialChar;
    searchInput.value = val;
    searchInput.focus();
    updateCursorAndPlaceholder();
    resetCursorBlink();
    requestAnimationFrame(() => {
      searchInput.focus();
      if (val) {
        searchInput.setSelectionRange(val.length, val.length);
      }
      updateCursorAndPlaceholder();
      resetCursorBlink();
    });
    if (val.trim()) {
      const items = await fetchAllSuggestions(val);
      renderSuggestionsUI(items, val);
    } else {
      renderSuggestionsUI([], '');
    }
  }

  function closeSearch() {
    searchOverlay.classList.remove('open');
    searchOverlay.setAttribute('aria-hidden', 'true');
    searchInput.value = '';
    searchInput.blur();
    updateCursorAndPlaceholder();
    if (searchSuggestions) {
      searchSuggestions.innerHTML = '';
      searchSuggestions.classList.remove('has-items');
    }
    activeSuggestions = [];
    selectedIndex = -1;
  }

  function executeSearch(query) {
    const q = query.trim();
    if (!q) return;

    const lower = q.toLowerCase();

    // Custom location command: !loc <lat> <lon>
    if (lower.startsWith('!loc ') || lower.startsWith('!coords ')) {
      const parts = q.split(/\s+/).slice(1);
      if (parts.length >= 2) {
        const latVal = parseFloat(parts[0]);
        const lonVal = parseFloat(parts[1]);
        if (!isNaN(latVal) && !isNaN(lonVal)) {
          localStorage.setItem('viyoga_weather_lat', String(latVal));
          localStorage.setItem('viyoga_weather_lon', String(lonVal));
          localStorage.removeItem('viyoga_weather_cache');
          fetchLiveWeather();
          closeSearch();
          return;
        }
      }
    }

    // Custom link shortcuts commands: !add <name> <url> [key], !del <key>, !reset-links
    if (lower.startsWith('!add ') || lower.startsWith('!link ')) {
      const parts = q.split(/\s+/).slice(1);
      if (parts.length >= 2) {
        const name = parts[0];
        let url = parts[1];
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        let key = (parts[2] || name[0]).toLowerCase();
        saveLinks([...currentLinks.filter(l => l.key !== key), { key, name, url }]);
        closeSearch();
        return;
      }
    }

    if (lower.startsWith('!del ') || lower.startsWith('!rm ')) {
      const delKey = q.split(/\s+/)[1]?.toLowerCase();
      if (delKey) {
        saveLinks(currentLinks.filter(l => l.key !== delKey));
        closeSearch();
        return;
      }
    }

    if (lower === '!reset-links') {
      localStorage.removeItem(LINKS_STORAGE_KEY);
      saveLinks([...DEFAULT_LINKS]);
      closeSearch();
      return;
    }

    // Check for bang match
    for (const [bang, target] of Object.entries(BANGS)) {
      if (lower === bang) {
        saveHistoryItem({ query: bang, url: target.home, title: bang, type: 'bang' });
        window.location.href = target.home;
        return;
      }
      if (lower.startsWith(bang + ' ')) {
        const terms = q.slice(bang.length).trim();
        const searchUrl = target.search + encodeURIComponent(terms);
        saveHistoryItem({ query: q, url: searchUrl, title: q, type: 'search' });
        window.location.href = searchUrl;
        return;
      }
    }

    // Check if query is a URL
    if (/^https?:\/\//i.test(q)) {
      saveHistoryItem({ query: q, url: q, title: q, type: 'url' });
      window.location.href = q;
      return;
    }
    if (/^[\w-]+(\.[\w-]{2,})+(\/\S*)?$/.test(q)) {
      const fullUrl = 'https://' + q;
      saveHistoryItem({ query: q, url: fullUrl, title: q, type: 'url' });
      window.location.href = fullUrl;
      return;
    }

    // Default search engine (Google)
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    saveHistoryItem({ query: q, url: googleUrl, title: q, type: 'search' });
    window.location.href = googleUrl;
  }

  searchInput.addEventListener('input', () => {
    updateCursorAndPlaceholder();
    resetCursorBlink();
    selectedIndex = -1;
    clearTimeout(suggDebounceTimer);
    const val = searchInput.value;
    if (!val.trim()) {
      renderSuggestionsUI([], '');
      return;
    }
    suggDebounceTimer = setTimeout(async () => {
      const items = await fetchAllSuggestions(val);
      renderSuggestionsUI(items, val);
    }, 40);
  });

  searchInput.addEventListener('keydown', (e) => {
    // Ctrl+J or ArrowDown: move down in suggestion list
    if ((e.ctrlKey && e.key.toLowerCase() === 'j') || e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeSuggestions.length === 0) {
        fetchAllSuggestions(searchInput.value).then(items => {
          renderSuggestionsUI(items, searchInput.value);
          if (items && items.length > 0) {
            uncommittedInput = searchInput.value;
            selectedIndex = 0;
            updateActiveSuggestionClass();
            const selItem = activeSuggestions[0];
            searchInput.value = selItem.title || selItem.query || selItem.url || '';
            updateCursorAndPlaceholder();
            resetCursorBlink();
          }
        });
        return;
      }
      if (activeSuggestions.length > 0) {
        if (selectedIndex === -1) {
          uncommittedInput = searchInput.value;
        }
        selectedIndex = Math.min(selectedIndex + 1, activeSuggestions.length - 1);
        updateActiveSuggestionClass();
        const selItem = activeSuggestions[selectedIndex];
        searchInput.value = selItem.title || selItem.query || selItem.url || '';
        updateCursorAndPlaceholder();
        resetCursorBlink();
      }
      return;
    }

    // Ctrl+K or ArrowUp: move up in suggestion list
    if ((e.ctrlKey && e.key.toLowerCase() === 'k') || e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIndex > -1) {
        selectedIndex--;
        if (selectedIndex === -1) {
          searchInput.value = uncommittedInput;
          updateActiveSuggestionClass();
          updateCursorAndPlaceholder();
          resetCursorBlink();
        } else {
          updateActiveSuggestionClass();
          const selItem = activeSuggestions[selectedIndex];
          searchInput.value = selItem.title || selItem.query || selItem.url || '';
          updateCursorAndPlaceholder();
          resetCursorBlink();
        }
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && activeSuggestions[selectedIndex]) {
        executeSuggestion(activeSuggestions[selectedIndex]);
      } else {
        executeSearch(searchInput.value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    }
  });

  ['click', 'keyup', 'select'].forEach(evt => {
    searchInput.addEventListener(evt, () => {
      updateCursorAndPlaceholder();
      resetCursorBlink();
    });
  });

  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
      closeSearch();
    }
  });

  if (linksGrid) {
    linksGrid.addEventListener('click', (e) => {
      const a = e.target.closest('.link-item');
      if (a && !e.target.closest('.link-del-btn') && !a.classList.contains('link-add-card')) {
        const key = a.dataset.key;
        const item = currentLinks.find(l => l.key === key);
        if (item) {
          saveHistoryItem({ query: item.name, url: item.url, title: item.name, type: 'url' });
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // 7. GLOBAL KEYBOARD NAVIGATION
  // ══════════════════════════════════════════════════════════════════
  document.addEventListener('keydown', (e) => {
    // If typing in any input or textarea, or navigating tasks, don't trigger global hotkeys
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable || e.target.closest('.tasks-list')) {
      if (e.key === 'Escape' && linkModal && linkModal.classList.contains('active')) {
        closeAddLinkModal();
      }
      return;
    }

    // If link modal is open, Escape closes it
    if (linkModal && linkModal.classList.contains('active')) {
      if (e.key === 'Escape') {
        closeAddLinkModal();
      }
      return;
    }

    // If search overlay is open, handle only Escape
    if (searchOverlay.classList.contains('open')) {
      if (e.key === 'Escape') {
        closeSearch();
      }
      return;
    }

    // Ignore if modifier keys are held (except Shift+T)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    // 'T' (Shift+T) focuses the first task in list
    if (e.key === 'T') {
      e.preventDefault();
      const firstRow = tasksList.querySelector('.task-row[data-id]');
      if (firstRow) {
        firstRow.focus();
      } else {
        taskInput.focus();
      }
      return;
    }

    // ArrowDown / ArrowUp from main page focuses task list
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const rows = tasksList.querySelectorAll('.task-row[data-id]');
      if (rows.length > 0) {
        e.preventDefault();
        if (e.key === 'ArrowDown') {
          rows[0].focus();
        } else {
          rows[rows.length - 1].focus();
        }
        return;
      }
    }

    const key = e.key.toLowerCase();

    // Hotkey match for direct link opening
    const matchedLink = currentLinks.find(l => l.key === key);
    if (matchedLink) {
      e.preventDefault();
      saveHistoryItem({ query: matchedLink.name, url: matchedLink.url, title: matchedLink.name, type: 'url' });
      window.location.href = matchedLink.url;
      return;
    }

    // 't' focuses task input
    if (key === 't') {
      e.preventDefault();
      taskInput.focus();
      return;
    }

    // Spacebar opens search overlay with instant focus
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      openSearch('');
      return;
    }

    // '/' opens search overlay
    if (e.key === '/') {
      e.preventDefault();
      openSearch('');
      return;
    }

    // Typing any single printable character opens search overlay
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      openSearch(e.key);
    }
  });

})();
