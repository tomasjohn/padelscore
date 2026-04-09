
         const translations = {
             cs: {
                 teamAlpha: "Tým Alpha", teamBeta: "Tým Beta", player1: "Hráč 1", player2: "Hráč 2", player3: "Hráč 3", player4: "Hráč 4",
                 serve: "Podání", playButton: "HRAJ PADEL", alpha: "Alpha", beta: "Beta", isServing: "PODÁVÁ",
                 undo: "Zpět (↓)", redo: "Vpřed (↑)", reset: "Reset", hint: "↑ REDO | ↓ ZPĚT | ← ALPHA | → BETA",
                 ttsDeuce: "Shoda", ttsAdv: "Výhoda", ttsGame: "Hra", ttsServing: "Podává ",
                 ttsInGames: " na gemy. Podává ", ttsSets: "Sety", ttsWinSet: " vyhrává set", ttsWinMatch: " vyhrává zápas!",
                 resetConfirm: "Opravdu chcete resetovat zápas a smazat skóre?"
             },
             en: {
                 teamAlpha: "Team Alpha", teamBeta: "Team Beta", player1: "Player 1", player2: "Player 2", player3: "Player 3", player4: "Player 4",
                 serve: "Serve", playButton: "PLAY PADEL", alpha: "Alpha", beta: "Beta", isServing: "SERVING",
                 undo: "Undo (↓)", redo: "Redo (↑)", reset: "Reset", hint: "↑ REDO | ↓ UNDO | ← ALPHA | → BETA",
                 ttsAll: "all", ttsDeuce: "Deuce", ttsAdv: "Advantage", ttsGame: "Game", ttsServing: "Serving ",
                 ttsInGames: " in games. Serving ", ttsSets: "Sets", ttsWinSet: " wins the set", ttsWinMatch: " wins the match!",
                 resetConfirm: "Are you sure you want to reset the match and clear the score?"
             }
         };
         
         let currentLang = 'cs';
         let state = { 
             sets: [0, 0], 
             games: [0, 0], 
             pointsIdx: [0, 0], 
             currentServerStep: 0, 
             isGameInProgress: false,
             matchOver: false 
         };
         let history = [];
         let redoStack = [];
         let playerNames = [];
         let serverRotation = [];
         const pointValues = ["0", "15", "30", "40", "AD"];
         
         window.onload = () => {
             const savedLang = localStorage.getItem('padel_lang') || 'cs';
             setLanguage(savedLang);
             for(let i=0; i<4; i++) {
                 const savedName = localStorage.getItem('padel_p' + i);
                 if (document.getElementById('p' + i) && savedName) document.getElementById('p' + i).value = savedName;
             }
             const savedServer = localStorage.getItem('padel_starting_server');
             if (document.getElementById('r' + (savedServer || 0))) document.getElementById('r' + (savedServer || 0)).checked = true;
         };
         
         function setLanguage(lang) {
             currentLang = lang;
             localStorage.setItem('padel_lang', lang);
             document.querySelectorAll('[data-i18n]').forEach(el => el.innerText = translations[lang][el.getAttribute('data-i18n')]);
             document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = translations[lang][el.getAttribute('data-i18n-placeholder')]);
             document.getElementById('controls-text').innerText = translations[lang].hint;
             document.getElementById('lang-cz').classList.toggle('active', lang === 'cs');
             document.getElementById('lang-en').classList.toggle('active', lang === 'en');
         }
         
         function confirmReset() {
             if (confirm(translations[currentLang].resetConfirm)) {
                 location.reload();
             }
         }
         
         function toggleFullscreen() {
             if (!document.fullscreenElement) document.documentElement.requestFullscreen();
             else document.exitFullscreen();
         }
         
         function startMatch() {
             playerNames = [
                 document.getElementById('p0').value || (currentLang === 'cs' ? "H1" : "P1"),
                 document.getElementById('p1').value || (currentLang === 'cs' ? "H2" : "P2"),
                 document.getElementById('p2').value || (currentLang === 'cs' ? "H3" : "P3"),
                 document.getElementById('p3').value || (currentLang === 'cs' ? "H4" : "P4")
             ];
             const firstServer = parseInt(document.querySelector('input[name="server"]:checked')?.value || 0);
             playerNames.forEach((name, i) => localStorage.setItem('padel_p' + i, name));
             localStorage.setItem('padel_starting_server', firstServer);
         
             serverRotation = firstServer < 2 ? [firstServer, 2, (firstServer === 0 ? 1 : 0), 3] : [firstServer, 0, (firstServer === 2 ? 3 : 2), 1];
             
             document.getElementById('setup-screen').style.display = 'none';
             document.getElementById('match-screen').style.display = 'flex';
             renderAll(true);
         }
         
         function speakText(text) {
             window.speechSynthesis.cancel();
             setTimeout(() => {
                 const msg = new SpeechSynthesisUtterance(text);
                 msg.lang = currentLang === 'cs' ? 'cs-CZ' : 'en-US';
                 window.speechSynthesis.speak(msg);
             }, 50);
         }
         
         function addPoint(team) {
             if (state.matchOver) return;
             saveHistory();
             state.isGameInProgress = true;
             const opp = team === 0 ? 1 : 0;
             
             if (state.pointsIdx[team] === 4) winGame(team);
             else if (state.pointsIdx[team] === 3 && state.pointsIdx[opp] === 3) state.pointsIdx[team] = 4;
             else if (state.pointsIdx[team] === 3 && state.pointsIdx[opp] === 4) state.pointsIdx[opp] = 3;
             else if (state.pointsIdx[team] === 3 && state.pointsIdx[opp] < 3) winGame(team);
             else state.pointsIdx[team]++;
             
             if (state.isGameInProgress) { renderAll(false); speakScore(); }
         }
         
         function winGame(team) {
             state.pointsIdx = [0, 0];
             state.games[team]++;
             state.currentServerStep++;
             state.isGameInProgress = false;
         
             const opp = team === 0 ? 1 : 0;
             if ((state.games[team] >= 6 && state.games[team] - state.games[opp] >= 2) || state.games[team] === 7) {
                 winSet(team);
             } else {
                 const nextServerName = playerNames[serverRotation[state.currentServerStep % 4]];
                 speakText(`${state.games[0]} : ${state.games[1]} ${translations[currentLang].ttsInGames}${nextServerName}`);
                 renderAll(false);
             }
         }
         
         function winSet(team) {
             state.sets[team]++;
             const teamName = team === 0 ? translations[currentLang].alpha : translations[currentLang].beta;
             
             if (state.sets[team] === 2) {
                 state.matchOver = true;
                 speakText(teamName + translations[currentLang].ttsWinMatch);
             } else {
                 state.games = [0, 0];
                 speakText(teamName + translations[currentLang].ttsWinSet);
             }
             renderAll(true);
         }
         
         function speakScore() {
             const currentServerId = serverRotation[state.currentServerStep % 4];
             const servingTeam = currentServerId < 2 ? 0 : 1;
             const receivingTeam = servingTeam === 0 ? 1 : 0;
             const sIdx = state.pointsIdx[servingTeam], rIdx = state.pointsIdx[receivingTeam];
             const t = translations[currentLang];
         
             const servingTeamName = servingTeam === 0 ? t.alpha : t.beta;
             const receivingTeamName = servingTeam === 0 ? t.beta : t.alpha;
         
             let text = "";
             if (sIdx === 3 && rIdx === 3) text = t.ttsDeuce;
             else if (sIdx === 4) text = t.ttsAdv + " " + servingTeamName;
             else if (rIdx === 4) text = t.ttsAdv + " " + receivingTeamName;
             else if (sIdx === rIdx && sIdx !== 0) text = currentLang === 'cs' ? pointValues[sIdx] + ", " + pointValues[sIdx] : pointValues[sIdx] + " " + t.ttsAll;
             else text = pointValues[sIdx] + ", " + pointValues[rIdx];
             speakText(text);
         }
         
         function renderAll(shouldSpeakServer = false) {
             const p0Value = pointValues[state.pointsIdx[0]];
             const p1Value = pointValues[state.pointsIdx[1]];
             
             const el0 = document.getElementById('pts-0');
             const el1 = document.getElementById('pts-1');
             
             el0.innerText = p0Value;
             el1.innerText = p1Value;
             
             el0.style.color = p0Value === "AD" ? "var(--accent)" : "var(--text-main)";
             el1.style.color = p1Value === "AD" ? "var(--accent)" : "var(--text-main)";
             
             document.getElementById('games-0').innerText = state.games[0];
             document.getElementById('games-1').innerText = state.games[1];
             
             // Update Sets
             document.getElementById('sets-0').innerText = state.sets[0];
             document.getElementById('sets-1').innerText = state.sets[1];
             
             const serverName = playerNames[serverRotation[state.currentServerStep % 4]];
             document.getElementById('announcement-name').innerText = state.matchOver ? "WINNER!" : serverName;
             document.getElementById('status-label').innerText = state.matchOver ? "MATCH OVER" : translations[currentLang].isServing;
             
             if (!state.isGameInProgress) {
                 document.getElementById('serve-announcement').style.display = 'flex';
                 if (shouldSpeakServer && !state.matchOver) speakText(translations[currentLang].ttsServing + serverName);
             } else {
                 document.getElementById('serve-announcement').style.display = 'none';
             }
         }

         function saveHistory() {
             history.push(JSON.parse(JSON.stringify(state)));
             if (history.length > 50) history.shift();
             redoStack = [];
         }
         
         function undo() {
             if (history.length > 0) {
                 redoStack.push(JSON.parse(JSON.stringify(state)));
                 state = history.pop();
                 renderAll(true);
             }
         }
         
         function redo() {
             if (redoStack.length > 0) {
                 history.push(JSON.parse(JSON.stringify(state)));
                 state = redoStack.pop();
                 renderAll(true);
             }
         }
         
         window.addEventListener('keydown', (e) => {
             if (document.getElementById('match-screen').style.display === 'flex') {
                 if (e.key === "ArrowLeft") addPoint(0);
                 if (e.key === "ArrowRight") addPoint(1);
                 if (e.key === "ArrowDown") undo();
                 if (e.key === "ArrowUp") redo();
             }
         });
      
