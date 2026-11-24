/**
 * The Beatles — Retro Song Sorter
 * Algoritmo interactivo de merge-sort inspirado en execfera/charasort & rhcpsorter.neocities.org
 * Incluye: duelos 1 vs 1, empates transitivos, deshacer multinivel, filtros por álbum/categoría,
 * guardado automático/localStorage, URL compartible y exportación a imagen PNG + lista de texto.
 */

(() => {
  'use strict';

  const STORAGE_KEY_DATA = 'beatles_song_sorter_saveData_v1';
  const STORAGE_KEY_TYPE = 'beatles_song_sorter_saveType_v1';

  const allSongs = window.BEATLES_SONGS || [];
  const optionsConfig = window.BEATLES_OPTIONS || [];
  const imageRoot = window.IMAGE_ROOT || 'assets/covers/';

  // --- Sorter State ---
  let songsToSort = [];
  let timestamp = 0;
  let timeTaken = 0;
  let choices = '';
  let optTaken = [];
  let optStr = '';
  let suboptStr = '';

  let sortedIndexList = [];
  let recordDataList = [];
  let parentIndexList = [];
  let tiedDataList = [];

  let leftIndex = 0;
  let leftInnerIndex = 0;
  let rightIndex = 0;
  let rightInnerIndex = 0;
  let battleNo = 1;
  let sortedNo = 0;
  let pointer = 0;
  let totalBattles = 0;

  let historyStack = [];
  let finalRanking = [];
  let isSorting = false;
  let isFinished = false;

  // --- DOM Elements ---
  const elProgress = document.querySelector('.progress');
  const elProgressBattle = document.querySelector('.progressbattle');
  const elProgressEta = document.querySelector('.progress-eta');
  const elProgressBar = document.querySelector('.progressbar');
  const elProgressFill = document.querySelector('.progressfill');
  const elProgressText = document.querySelector('.progresstext');

  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');
  const imgLeft = document.querySelector('.left.sort.image');
  const imgRight = document.querySelector('.right.sort.image');
  const titleLeft = document.querySelector('.left.sort.text .song-title');
  const albumLeft = document.querySelector('.left.sort.text .song-album');
  const titleRight = document.querySelector('.right.sort.text .song-title');
  const albumRight = document.querySelector('.right.sort.text .song-album');

  const btnStart = document.getElementById('btn-start');
  const btnLoad = document.getElementById('btn-load');
  const loadTypeLabel = document.getElementById('load-type-label');
  const btnTie = document.getElementById('btn-tie');
  const btnUndo = document.getElementById('btn-undo');
  const btnSave = document.getElementById('btn-save');
  const btnQuit = document.getElementById('btn-quit');

  const btnShareUrl = document.getElementById('btn-share-url');
  const btnGenImg = document.getElementById('btn-gen-img');
  const btnTextList = document.getElementById('btn-text-list');
  const btnRestart = document.getElementById('btn-restart');
  const btnClearSave = document.getElementById('btn-clear-save');

  const filterPanel = document.getElementById('filter-panel');
  const optionsGrid = document.getElementById('options-grid');
  const selectedCountBadge = document.getElementById('selected-count-badge');
  const estimatedDuelsBadge = document.getElementById('estimated-duels-badge');
  const filterWarning = document.getElementById('filter-warning');

  const resultsSection = document.getElementById('results-section');
  const resultsTable = document.getElementById('results-table');
  const timeTakenEl = document.getElementById('time-taken');
  const imageCountSelect = document.getElementById('image-count-select');
  const toggleStreams = document.getElementById('toggle-streams');

  const dialog = document.getElementById('retro-dialog');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogDesc = document.getElementById('dialog-desc');
  const dialogTextarea = document.getElementById('dialog-textarea');
  const dialogCopy = document.getElementById('dialog-copy');
  const dialogClose = document.getElementById('dialog-close');
  const dialogOk = document.getElementById('dialog-ok');
  const toastEl = document.getElementById('toast');

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2600);
  }

  function openDialog(title, desc, content) {
    dialogTitle.textContent = title;
    dialogDesc.textContent = desc;
    dialogTextarea.value = content;
    dialog.showModal();
    dialogTextarea.select();
  }

  function init() {
    populateOptions();
    updateSelectionSummary();
    refreshLoadButton();
    bindEvents();

    const hashMatch = window.location.hash.match(/#s=([^&]+)/);
    const queryMatch = window.location.search.match(/[?&]s=([^&]+)/);
    const encoded = hashMatch ? hashMatch[1] : (queryMatch ? queryMatch[1] : null);
    if (encoded) {
      decodeAndStart(decodeURIComponent(encoded));
    }
  }

  function bindEvents() {
    btnStart.addEventListener('click', () => start(false));
    btnLoad.addEventListener('click', loadProgress);

    btnLeft.addEventListener('click', () => {
      if (isSorting) pick('left');
    });
    btnRight.addEventListener('click', () => {
      if (isSorting) pick('right');
    });

    btnTie.addEventListener('click', () => pick('tie'));
    btnUndo.addEventListener('click', undo);
    btnSave.addEventListener('click', () => saveProgress('Progreso', true));
    btnQuit.addEventListener('click', resetToHome);

    btnShareUrl.addEventListener('click', () => saveProgress('Último Resultado', true));
    btnGenImg.addEventListener('click', generateCanvasImage);
    btnTextList.addEventListener('click', showTextList);
    btnRestart.addEventListener('click', resetToHome);
    btnClearSave.addEventListener('click', clearProgress);

    imageCountSelect.addEventListener('change', () => {
      if (isFinished) renderResults(Number(imageCountSelect.value));
    });
    toggleStreams.addEventListener('change', () => {
      if (isFinished) renderResults(Number(imageCountSelect.value));
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });

    dialogClose.addEventListener('click', () => dialog.close());
    dialogOk.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialogCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(dialogTextarea.value);
        showToast('¡Copiado al portapapeles!');
      } catch {
        dialogTextarea.select();
        document.execCommand('copy');
        showToast('¡Copiado al portapapeles!');
      }
    });

    document.addEventListener('keydown', (ev) => {
      if (dialog.open) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = ev.key;
      if (isSorting) {
        if (key === 'ArrowLeft' || key === 'h' || key === 'H') {
          ev.preventDefault();
          pick('left');
        } else if (key === 'ArrowRight' || key === 'l' || key === 'L') {
          ev.preventDefault();
          pick('right');
        } else if (key === 'ArrowUp' || key === 'k' || key === 'K' || key === '1') {
          ev.preventDefault();
          pick('tie');
        } else if (key === 'ArrowDown' || key === 'j' || key === 'J' || key === '2') {
          ev.preventDefault();
          undo();
        } else if (key === 's' || key === 'S' || key === '3') {
          ev.preventDefault();
          saveProgress('Progreso', true);
        }
      } else if (isFinished) {
        if (key === '1') saveProgress('Último Resultado', true);
        else if (key === '2') generateCanvasImage();
        else if (key === '3') showTextList();
      } else {
        if (key === 'Enter' || key === 's' || key === 'S') {
          ev.preventDefault();
          start(false);
        }
      }
    });
  }

  function populateOptions() {
    optionsGrid.innerHTML = '';

    optionsConfig.forEach(opt => {
      if ('sub' in opt) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'large option';
        groupDiv.innerHTML = `
          <label title="${escapeHtml(opt.tooltip || opt.name)}">
            <input id="cbgroup-${opt.key}" type="checkbox" ${opt.checked ? 'checked' : ''}>
            <span>${escapeHtml(opt.name)}</span>
          </label>
        `;
        optionsGrid.appendChild(groupDiv);

        opt.sub.forEach((subopt, subindex) => {
          const count = allSongs.filter(s => (s.opts[opt.key] || []).includes(subopt.key)).length;
          const item = document.createElement('div');
          item.className = 'option-item';
          item.innerHTML = `
            <label title="${escapeHtml(subopt.tooltip || subopt.name)}">
              <input id="cb-${opt.key}-${subindex}" type="checkbox" ${subopt.checked !== false ? 'checked' : ''} ${opt.checked === false ? 'disabled' : ''}>
              <span class="opt-text">
                ${subopt.color ? `<span class="album-dot" style="background:${subopt.color}"></span>` : ''}
                ${escapeHtml(subopt.name)} <span class="opt-count">(${count})</span>
              </span>
            </label>
          `;
          optionsGrid.appendChild(item);
        });

        const hr = document.createElement('hr');
        optionsGrid.appendChild(hr);

        const labelDiv = document.createElement('div');
        labelDiv.className = 'section-label';
        labelDiv.textContent = 'Filtros de exclusión (marca para quitar y acortar el ranking)';
        optionsGrid.appendChild(labelDiv);

        const groupbox = document.getElementById(`cbgroup-${opt.key}`);
        groupbox.addEventListener('change', () => {
          opt.sub.forEach((_, subindex) => {
            const subCb = document.getElementById(`cb-${opt.key}-${subindex}`);
            subCb.disabled = !groupbox.checked;
            if (groupbox.checked) subCb.checked = true;
          });
          updateSelectionSummary();
        });
      } else {
        const count = allSongs.filter(s => !!s.opts[opt.key]).length;
        const item = document.createElement('div');
        item.className = 'option-item';
        item.innerHTML = `
          <label title="${escapeHtml(opt.tooltip || opt.name)}">
            <input id="cb-${opt.key}" type="checkbox" ${opt.checked ? 'checked' : ''}>
            <span class="opt-text">${escapeHtml(opt.name)} <span class="opt-count">(-${count})</span></span>
          </label>
        `;
        optionsGrid.appendChild(item);
      }
    });

    optionsGrid.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', updateSelectionSummary);
    });
  }

  function readOptionsFromUI() {
    const taken = [];
    optionsConfig.forEach(opt => {
      if ('sub' in opt) {
        const groupChecked = document.getElementById(`cbgroup-${opt.key}`).checked;
        if (!groupChecked) {
          taken.push(false);
        } else {
          taken.push(opt.sub.map((_, idx) => document.getElementById(`cb-${opt.key}-${idx}`).checked));
        }
      } else {
        taken.push(document.getElementById(`cb-${opt.key}`).checked);
      }
    });
    return taken;
  }

  function filterSongsWithOptions(taken) {
    let list = allSongs.slice();
    optionsConfig.forEach((opt, index) => {
      if ('sub' in opt) {
        if (taken[index]) {
          const allowedKeys = opt.sub
            .filter((_, subIndex) => taken[index][subIndex])
            .map(sub => sub.key);
          list = list.filter(song =>
            Array.isArray(song.opts[opt.key]) &&
            song.opts[opt.key].some(k => allowedKeys.includes(k))
          );
        }
      } else if (taken[index]) {
        list = list.filter(song => !song.opts[opt.key]);
      }
    });
    return list;
  }

  function estimateDuels(n) {
    if (n < 2) return 0;
    return Math.max(1, Math.round(n * Math.log2(n) - 1.25 * n + 1));
  }

  function updateSelectionSummary() {
    const taken = readOptionsFromUI();
    const filtered = filterSongsWithOptions(taken);
    const n = filtered.length;
    const est = estimateDuels(n);

    selectedCountBadge.innerHTML = `<strong>${n}</strong> ${n === 1 ? 'canción seleccionada' : 'canciones seleccionadas'}`;
    estimatedDuelsBadge.textContent = `~${est} duelos estimados`;

    const warnings = [];
    const albumOpt = optionsConfig[0];
    if (taken[0] && Array.isArray(taken[0])) {
      const checkedAlbumKeys = albumOpt.sub
        .filter((_, idx) => taken[0][idx])
        .map(s => s.key);
      const onlyExtra = checkedAlbumKeys.length > 0 && checkedAlbumKeys.every(k => ['live_bbc', 'anthology_demos', 'love_remixes'].includes(k));
      if (n < 2 && onlyExtra) {
        warnings.push('Los filtros de exclusión marcados abajo (En vivo, Demos/Takes o LOVE/Remixes) están ocultando esas pistas. Desmárcalos para incluirlas.');
      }
    }
    if (n < 2 && warnings.length === 0) {
      warnings.push('Selecciona al menos 2 canciones para comenzar el ranking.');
    }

    if (warnings.length > 0) {
      filterWarning.textContent = warnings[0];
      filterWarning.hidden = false;
    } else {
      filterWarning.hidden = true;
    }
  }

  function applyPreset(preset) {
    const albumOpt = optionsConfig[0];
    const groupCb = document.getElementById(`cbgroup-${albumOpt.key}`);
    groupCb.checked = true;

    const earlyKeys = new Set(['please_please_me', 'with_the_beatles', 'hard_days_night', 'beatles_for_sale', 'help']);
    const lateKeys = new Set(['rubber_soul', 'revolver', 'sgt_pepper', 'magical_mystery_tour', 'white_album', 'yellow_submarine', 'abbey_road', 'let_it_be']);
    const allStudioKeys = new Set([...earlyKeys, ...lateKeys]);

    const setAlbumChecked = (fn) => {
      albumOpt.sub.forEach((sub, idx) => {
        const cb = document.getElementById(`cb-${albumOpt.key}-${idx}`);
        cb.disabled = false;
        cb.checked = fn(sub.key);
      });
    };
    const setExcl = (key, val) => {
      const cb = document.getElementById(`cb-${key}`);
      if (cb) cb.checked = val;
    };

    if (preset === 'canon') {
      setAlbumChecked(k => allStudioKeys.has(k) || k === 'past_masters');
      setExcl('bside', true);
      setExcl('live', true);
      setExcl('demos', true);
      setExcl('remix', true);
      setExcl('speech', true);
    } else if (preset === 'studio-only') {
      setAlbumChecked(k => allStudioKeys.has(k));
      setExcl('bside', true);
      setExcl('live', true);
      setExcl('demos', true);
      setExcl('remix', true);
      setExcl('speech', true);
    } else if (preset === 'late-era') {
      setAlbumChecked(k => lateKeys.has(k));
      setExcl('bside', true);
      setExcl('live', true);
      setExcl('demos', true);
      setExcl('remix', true);
      setExcl('speech', true);
    } else if (preset === 'early-era') {
      setAlbumChecked(k => earlyKeys.has(k));
      setExcl('bside', true);
      setExcl('live', true);
      setExcl('demos', true);
      setExcl('remix', true);
      setExcl('speech', true);
    } else if (preset === 'singles-only') {
      setAlbumChecked(k => k === 'past_masters');
      setExcl('bside', false);
      setExcl('live', true);
      setExcl('demos', true);
      setExcl('remix', true);
      setExcl('speech', true);
    } else if (preset === 'all-kworb') {
      setAlbumChecked(() => true);
      setExcl('bside', false);
      setExcl('live', false);
      setExcl('demos', false);
      setExcl('remix', false);
      setExcl('speech', false);
    } else if (preset === 'none') {
      setAlbumChecked(() => false);
    }

    updateSelectionSummary();
  }

  function start(fromLoad = false) {
    optTaken = readOptionsFromUI();
    songsToSort = filterSongsWithOptions(optTaken);

    if (songsToSort.length < 2) {
      showToast('Necesitas al menos 2 canciones seleccionadas.');
      updateSelectionSummary();
      return;
    }

    optStr = optTaken.map(v => (v ? '1' : '0')).join('');
    suboptStr = '';
    optTaken.forEach(v => {
      if (Array.isArray(v)) {
        suboptStr += '|' + v.map(b => (b ? '1' : '0')).join('');
      }
    });

    if (!fromLoad) {
      timestamp = Date.now();
      timeTaken = 0;
      choices = '';
    }
    const rng = mulberry32(timestamp & 0xffffffff);
    songsToSort = songsToSort
      .map(song => [rng(), song])
      .sort((a, b) => a[0] - b[0])
      .map(pair => pair[1]);

    recordDataList = songsToSort.map(() => 0);
    tiedDataList = songsToSort.map(() => -1);
    sortedIndexList = [songsToSort.map((_, idx) => idx)];
    parentIndexList = [-1];
    totalBattles = 0;

    let marker = 1;
    for (let i = 0; i < sortedIndexList.length; i++) {
      if (sortedIndexList[i].length > 1) {
        const parent = sortedIndexList[i];
        const mid = Math.ceil(parent.length / 2);

        sortedIndexList[marker] = parent.slice(0, mid);
        totalBattles += sortedIndexList[marker].length;
        parentIndexList[marker] = i;
        marker++;

        sortedIndexList[marker] = parent.slice(mid);
        totalBattles += sortedIndexList[marker].length;
        parentIndexList[marker] = i;
        marker++;
      }
    }

    leftIndex = sortedIndexList.length - 2;
    rightIndex = sortedIndexList.length - 1;
    leftInnerIndex = 0;
    rightInnerIndex = 0;
    battleNo = 1;
    sortedNo = 0;
    pointer = 0;
    historyStack = [];
    finalRanking = [];
    isSorting = true;
    isFinished = false;

    filterPanel.hidden = true;
    resultsSection.hidden = true;
    elProgress.classList.add('visible');
    elProgressBar.classList.remove('completed');

    btnStart.style.display = 'none';
    btnLoad.style.display = 'none';
    document.querySelectorAll('.finished.button').forEach(el => (el.style.display = 'none'));
    document.querySelectorAll('.sorting.button').forEach(el => (el.style.display = 'flex'));
    btnLeft.disabled = false;
    btnRight.disabled = false;

    if (fromLoad && choices.length > 0) {
      const savedChoices = choices;
      for (let i = 0; i < savedChoices.length && isSorting; i++) {
        const c = savedChoices[i];
        if (c === '0') stepPick('left', true);
        else if (c === '1') stepPick('right', true);
        else if (c === '2') stepPick('tie', true);
      }
    }

    if (isSorting) {
      display();
    } else if (isFinished) {
      renderFinishedView();
    }
  }

  function display() {
    const percent = Math.min(99, Math.floor((sortedNo * 100) / Math.max(1, totalBattles)));
    const leftSong = songsToSort[sortedIndexList[leftIndex][leftInnerIndex]];
    const rightSong = songsToSort[sortedIndexList[rightIndex][rightInnerIndex]];

    updateProgressBar(`Duelo N.º ${battleNo}`, percent, `${songsToSort.length} canciones`);

    imgLeft.src = imageRoot + leftSong.img;
    imgLeft.alt = `Portada de ${leftSong.album}`;
    titleLeft.textContent = leftSong.name;
    albumLeft.textContent = leftSong.album;

    imgRight.src = imageRoot + rightSong.img;
    imgRight.alt = `Portada de ${rightSong.album}`;
    titleRight.textContent = rightSong.name;
    albumRight.textContent = rightSong.album;

    btnUndo.disabled = historyStack.length === 0;
    saveProgress('Autoguardado', false);
  }

  function pick(sortType) {
    if (!isSorting) return;
    stepPick(sortType, false);
    if (isSorting) {
      display();
    } else if (isFinished) {
      renderFinishedView();
    }
  }

  function stepPick(sortType, isReplay) {
    if (!isReplay || historyStack.length < 50) {
      historyStack.push({
        sortedIndexList: sortedIndexList.map(arr => arr.slice()),
        recordDataList: recordDataList.slice(),
        parentIndexList: parentIndexList.slice(),
        tiedDataList: tiedDataList.slice(),
        leftIndex,
        leftInnerIndex,
        rightIndex,
        rightInnerIndex,
        battleNo,
        sortedNo,
        pointer,
        choicesLen: choices.length
      });
      if (historyStack.length > 200) historyStack.shift();
    }

    if (sortType === 'left') {
      if (!isReplay) choices += '0';
      recordData('left');
      while (tiedDataList[recordDataList[pointer - 1]] !== -1) {
        recordData('left');
      }
    } else if (sortType === 'right') {
      if (!isReplay) choices += '1';
      recordData('right');
      while (tiedDataList[recordDataList[pointer - 1]] !== -1) {
        recordData('right');
      }
    } else if (sortType === 'tie') {
      if (!isReplay) choices += '2';
      recordData('left');
      while (tiedDataList[recordDataList[pointer - 1]] !== -1) {
        recordData('left');
      }
      tiedDataList[recordDataList[pointer - 1]] = sortedIndexList[rightIndex][rightInnerIndex];
      recordData('right');
      while (tiedDataList[recordDataList[pointer - 1]] !== -1) {
        recordData('right');
      }
    } else {
      return;
    }

    const leftLen = sortedIndexList[leftIndex].length;
    const rightLen = sortedIndexList[rightIndex].length;

    if (leftInnerIndex < leftLen && rightInnerIndex === rightLen) {
      while (leftInnerIndex < leftLen) recordData('left');
    } else if (leftInnerIndex === leftLen && rightInnerIndex < rightLen) {
      while (rightInnerIndex < rightLen) recordData('right');
    }

    if (leftInnerIndex === leftLen && rightInnerIndex === rightLen) {
      for (let i = 0; i < leftLen + rightLen; i++) {
        sortedIndexList[parentIndexList[leftIndex]][i] = recordDataList[i];
      }
      sortedIndexList.pop();
      sortedIndexList.pop();
      leftIndex -= 2;
      rightIndex -= 2;
      leftInnerIndex = 0;
      rightInnerIndex = 0;
      recordDataList.fill(0);
      pointer = 0;
    }

    if (leftIndex < 0) {
      timeTaken = timeTaken || Math.max(1000, Date.now() - timestamp);
      isSorting = false;
      isFinished = true;
    } else {
      battleNo++;
    }
  }

  function recordData(side) {
    if (side === 'left') {
      recordDataList[pointer] = sortedIndexList[leftIndex][leftInnerIndex];
      leftInnerIndex++;
    } else {
      recordDataList[pointer] = sortedIndexList[rightIndex][rightInnerIndex];
      rightInnerIndex++;
    }
    pointer++;
    sortedNo++;
  }

  function undo() {
    if (!isSorting || historyStack.length === 0) return;
    const prev = historyStack.pop();
    sortedIndexList = prev.sortedIndexList;
    recordDataList = prev.recordDataList;
    parentIndexList = prev.parentIndexList;
    tiedDataList = prev.tiedDataList;
    leftIndex = prev.leftIndex;
    leftInnerIndex = prev.leftInnerIndex;
    rightIndex = prev.rightIndex;
    rightInnerIndex = prev.rightInnerIndex;
    battleNo = prev.battleNo;
    sortedNo = prev.sortedNo;
    pointer = prev.pointer;
    choices = choices.slice(0, prev.choicesLen);

    display();
  }

  function updateProgressBar(label, percent, extra = '') {
    elProgressBattle.textContent = label;
    elProgressEta.textContent = extra;
    elProgressFill.style.width = `${percent}%`;
    elProgressText.textContent = `${percent}%`;
    elProgressBar.setAttribute('aria-valuenow', String(percent));
  }

  function buildFinalRanking() {
    const finalIndexes = sortedIndexList[0].slice();
    const list = [];
    let rankNum = 1;
    let tiedCount = 1;

    finalIndexes.forEach((songIdx, i) => {
      const song = songsToSort[songIdx];
      list.push({ rank: rankNum, song });
      if (i < finalIndexes.length - 1) {
        if (tiedDataList[songIdx] === finalIndexes[i + 1]) {
          tiedCount++;
        } else {
          rankNum += tiedCount;
          tiedCount = 1;
        }
      }
    });
    return list;
  }

  function renderFinishedView() {
    finalRanking = buildFinalRanking();
    saveProgress('Último Resultado', false);

    elProgressBar.classList.add('completed');
    updateProgressBar(`¡Completado en ${battleNo} duelos!`, 100, `${finalRanking.length} canciones ordenadas`);

    if (finalRanking.length >= 2) {
      const first = finalRanking[0].song;
      const second = finalRanking[1].song;
      imgLeft.src = imageRoot + first.img;
      titleLeft.textContent = `#1 ${first.name}`;
      albumLeft.textContent = first.album;
      imgRight.src = imageRoot + second.img;
      titleRight.textContent = `#2 ${second.name}`;
      albumRight.textContent = second.album;
    }

    btnLeft.disabled = true;
    btnRight.disabled = true;
    document.querySelectorAll('.sorting.button').forEach(el => (el.style.display = 'none'));
    document.querySelectorAll('.finished.button').forEach(el => (el.style.display = 'flex'));
    resultsSection.hidden = false;

    const completedDate = new Date(timestamp + timeTaken).toLocaleString('es-ES');
    timeTakenEl.innerHTML = `
      Ranking completado el <strong>${escapeHtml(completedDate)}</strong>
      en <strong>${formatDuration(timeTaken)}</strong> (${battleNo} duelos · ${finalRanking.length} canciones).
    `;

    renderResults(Number(imageCountSelect.value));
  }

  function renderResults(imageLimit) {
    const showStreams = toggleStreams.checked;
    resultsTable.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'result-list';

    finalRanking.forEach((entry, idx) => {
      const showImg = idx < imageLimit;
      const card = document.createElement('div');
      card.className = 'result-card' + (entry.rank <= 3 ? ' top-three' : '') + (showImg ? ' has-image' : '');

      const streamsHtml = showStreams && entry.song.streams > 0
        ? `<span class="res-streams">${formatStreams(entry.song.streams)} streams</span>`
        : '';

      card.innerHTML = `
        <div class="res-rank">#${entry.rank}</div>
        <div class="res-body">
          ${showImg ? `<img class="res-cover" src="${imageRoot + entry.song.img}" alt="${escapeHtml(entry.song.album)}" loading="lazy">` : ''}
          <div class="res-name">${escapeHtml(entry.song.name)}</div>
          <div class="res-meta">${escapeHtml(entry.song.album)}</div>
          ${streamsHtml}
        </div>
      `;
      grid.appendChild(card);
    });

    resultsTable.appendChild(grid);
  }

  function encodeSaveData() {
    const raw = `${timestamp}|${timeTaken}|${choices}|${optStr}${suboptStr}`;
    return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeSaveData(encoded) {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return atob(b64).split('|');
  }

  function saveProgress(saveType, showModal) {
    const encoded = encodeSaveData();
    try {
      localStorage.setItem(STORAGE_KEY_DATA, encoded);
      localStorage.setItem(STORAGE_KEY_TYPE, saveType);
    } catch {
      // Ignore storage errors
    }

    if (showModal) {
      const baseUrl = window.location.href.split('#')[0].split('?')[0];
      const shareUrl = `${baseUrl}#s=${encoded}`;
      const desc = isFinished
        ? 'Copia este enlace para guardar o compartir tu ranking completo:'
        : 'Guarda este enlace para retomar tus duelos más tarde (también quedó guardado en este navegador):';
      openDialog(isFinished ? 'URL de tu Ranking' : 'Progreso Guardado', desc, shareUrl);
    }
  }

  function refreshLoadButton() {
    let savedType = null;
    try {
      savedType = localStorage.getItem(STORAGE_KEY_TYPE);
    } catch {
      savedType = null;
    }

    if (savedType && localStorage.getItem(STORAGE_KEY_DATA)) {
      loadTypeLabel.textContent = savedType;
      btnLoad.style.display = 'flex';
    } else {
      btnLoad.style.display = 'none';
    }
  }

  function loadProgress() {
    const encoded = localStorage.getItem(STORAGE_KEY_DATA);
    if (!encoded) {
      showToast('No hay datos guardados.');
      return;
    }
    decodeAndStart(encoded);
  }

  function decodeAndStart(encoded) {
    try {
      const parts = decodeSaveData(encoded);
      timestamp = Number(parts[0]);
      timeTaken = Number(parts[1]);
      choices = parts[2] || '';
      const optDecoded = parts[3] || '';
      const suboptDecoded = parts.slice(4);

      if (!timestamp || Number.isNaN(timestamp)) throw new Error('Invalid timestamp');

      let subIdx = 0;
      optionsConfig.forEach((opt, idx) => {
        if ('sub' in opt) {
          const isTrue = optDecoded[idx] === '1';
          const groupCb = document.getElementById(`cbgroup-${opt.key}`);
          groupCb.checked = isTrue;
          opt.sub.forEach((_, sIdx) => {
            const subCb = document.getElementById(`cb-${opt.key}-${sIdx}`);
            subCb.disabled = !isTrue;
            subCb.checked = isTrue && suboptDecoded[subIdx] ? suboptDecoded[subIdx][sIdx] === '1' : true;
          });
          if (isTrue) subIdx++;
        } else {
          const cb = document.getElementById(`cb-${opt.key}`);
          if (cb) cb.checked = optDecoded[idx] === '1';
        }
      });

      updateSelectionSummary();
      start(true);
      showToast('¡Datos cargados correctamente!');
    } catch (err) {
      console.error('Error cargando progreso:', err);
      showToast('No se pudo leer el enlace o progreso guardado.');
    }
  }

  function clearProgress() {
    try {
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_TYPE);
    } catch {
      // Ignore
    }
    refreshLoadButton();
    showToast('Datos guardados borrados.');
  }

  function resetToHome() {
    isSorting = false;
    isFinished = false;
    timestamp = 0;
    timeTaken = 0;
    choices = '';
    historyStack = [];

    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    elProgress.classList.remove('visible');
    resultsSection.hidden = true;
    filterPanel.hidden = false;

    imgLeft.src = 'assets/default-left.svg';
    imgRight.src = 'assets/default-right.svg';
    titleLeft.textContent = 'Lado A';
    albumLeft.textContent = 'Esperando inicio...';
    titleRight.textContent = 'Lado B';
    albumRight.textContent = 'Esperando inicio...';
    btnLeft.disabled = false;
    btnRight.disabled = false;

    document.querySelectorAll('.sorting.button').forEach(el => (el.style.display = 'none'));
    document.querySelectorAll('.finished.button').forEach(el => (el.style.display = 'none'));
    btnStart.style.display = 'flex';
    refreshLoadButton();
    updateSelectionSummary();
  }

  function showTextList() {
    const lines = [
      '=== MI RANKING DE THE BEATLES ===',
      `Total: ${finalRanking.length} canciones | Duelos: ${battleNo}`,
      ''
    ];
    finalRanking.forEach(e => {
      lines.push(`${e.rank}. ${e.song.name} — [${e.song.album}]`);
    });
    openDialog(
      'Lista de Texto — Mi Top The Beatles',
      'Copia y pega tu ranking donde quieras:',
      lines.join('\n')
    );
  }

  async function generateCanvasImage() {
    if (!finalRanking.length) return;
    showToast('Generando imagen PNG...');

    const topItems = finalRanking.slice(0, Math.min(20, finalRanking.length));
    const cols = topItems.length > 10 ? 2 : 1;
    const rows = Math.ceil(topItems.length / cols);
    const colW = 460;
    const rowH = 74;
    const padX = 28;
    const headerH = 112;
    const footerH = 44;

    const canvas = document.createElement('canvas');
    canvas.width = padX * 2 + cols * colW + (cols > 1 ? 20 : 0);
    canvas.height = headerH + rows * rowH + footerH;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#18222d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#78be20';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = '#ffe169';
    ctx.font = 'italic bold 36px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE BEATLES — MY TOP RANKING', canvas.width / 2, 58);

    ctx.fillStyle = '#f8f4e8';
    ctx.font = 'bold 14px Courier New, monospace';
    ctx.fillText(
      `★  TOP ${topItems.length} DE ${finalRanking.length} CANCIONES  ·  ${battleNo} DUELOS  ★`,
      canvas.width / 2,
      86
    );

    const loadImg = (src) => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

    const loadedCovers = await Promise.all(topItems.map(e => loadImg(imageRoot + e.song.img)));

    topItems.forEach((entry, idx) => {
      const col = idx < rows ? 0 : 1;
      const row = idx < rows ? idx : idx - rows;
      const x = padX + col * (colW + 20);
      const y = headerH + row * rowH;

      ctx.fillStyle = entry.rank <= 3 ? '#fffbe0' : '#f8f4e8';
      ctx.fillRect(x, y, colW, rowH - 8);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, colW, rowH - 8);

      ctx.fillStyle = entry.rank <= 3 ? '#d62828' : '#111111';
      ctx.fillRect(x, y, 48, rowH - 8);
      ctx.fillStyle = entry.rank <= 3 ? '#ffffff' : '#ffe169';
      ctx.font = 'bold 20px Impact, Arial Black, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${entry.rank}`, x + 24, y + 40);

      const cov = loadedCovers[idx];
      if (cov) {
        ctx.drawImage(cov, x + 56, y + 7, 52, 52);
      }
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 56, y + 7, 52, 52);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 15px Trebuchet MS, sans-serif';
      ctx.fillText(truncateCanvasText(ctx, entry.song.name, colW - 126), x + 118, y + 30);

      ctx.fillStyle = '#555555';
      ctx.font = '12px Courier New, monospace';
      ctx.fillText(truncateCanvasText(ctx, entry.song.album, colW - 126), x + 118, y + 50);
    });

    ctx.fillStyle = '#cccccc';
    ctx.font = '12px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Generado con The Beatles Song Sorter · Dataset Kworb Spotify',
      canvas.width / 2,
      canvas.height - 18
    );

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `beatles-ranking-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('¡Imagen PNG descargada!');
    } catch {
      showToast('Abre la página desde un servidor local (http://localhost) para descargar la imagen PNG.');
    }
  }

  function truncateCanvasText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let out = text;
    while (out.length > 3 && ctx.measureText(out + '…').width > maxW) {
      out = out.slice(0, -1);
    }
    return out + '…';
  }

  function formatStreams(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return String(num);
  }

  function formatDuration(ms) {
    const totalSec = Math.max(1, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.addEventListener('DOMContentLoaded', init);
})();

