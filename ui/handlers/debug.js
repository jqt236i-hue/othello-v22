/**
 * @file debug.js
 * @description Debug mode and visual test handlers
 */

function setupDebugControls(debugModeBtn, humanVsHumanBtn, visualTestBtn) {
    // Debug Mode
    if (debugModeBtn) {
        const isDebug = window.DEBUG_UNLIMITED_USAGE === true;
        debugModeBtn.textContent = isDebug ? 'DEBUG: ON' : 'DEBUG: OFF';
        debugModeBtn.style.color = isDebug ? '#6bff6b' : '#ff6b6b';
        debugModeBtn.addEventListener('click', () => {
            window.DEBUG_UNLIMITED_USAGE = !window.DEBUG_UNLIMITED_USAGE;
            const updatedDebug = window.DEBUG_UNLIMITED_USAGE === true;
            debugModeBtn.textContent = updatedDebug ? 'DEBUG: ON' : 'DEBUG: OFF';
            debugModeBtn.style.color = updatedDebug ? '#6bff6b' : '#ff6b6b';

            // Show/hide debug buttons
            if (visualTestBtn) visualTestBtn.style.display = updatedDebug ? 'block' : 'none';
            if (humanVsHumanBtn) humanVsHumanBtn.style.display = updatedDebug ? 'block' : 'none';

            if (updatedDebug) {
                addLog('🐛 デバッグモード: ON （制限なしでカード使用可能）');
                fillDebugHand();

                // Enable human vs human mode by default
                window.DEBUG_HUMAN_VS_HUMAN = true;
                if (humanVsHumanBtn) {
                    humanVsHumanBtn.textContent = '人間vs人間: ON';
                    humanVsHumanBtn.style.color = '#90ee90';
                }
                addLog('🎮 人間vs人間モード: ON （黒白両方操作可能、手札は黒のみ使用）');
            } else {
                addLog('デバッグモード: OFF');
                // Disable human vs human mode when debug is turned off
                window.DEBUG_HUMAN_VS_HUMAN = false;
                if (humanVsHumanBtn) {
                    humanVsHumanBtn.textContent = '人間vs人間: OFF';
                    humanVsHumanBtn.style.color = '#ffb366';
                }
            }
            renderCardUI();
        });
    }

    // Human vs Human Mode (debug subfeature)
    if (humanVsHumanBtn) {
        humanVsHumanBtn.textContent = window.DEBUG_HUMAN_VS_HUMAN ? '人間vs人間: ON' : '人間vs人間: OFF';
        humanVsHumanBtn.style.color = window.DEBUG_HUMAN_VS_HUMAN ? '#90ee90' : '#ffb366';
        humanVsHumanBtn.addEventListener('click', () => {
            window.DEBUG_HUMAN_VS_HUMAN = !window.DEBUG_HUMAN_VS_HUMAN;
            humanVsHumanBtn.textContent = window.DEBUG_HUMAN_VS_HUMAN ? '人間vs人間: ON' : '人間vs人間: OFF';
            humanVsHumanBtn.style.color = window.DEBUG_HUMAN_VS_HUMAN ? '#90ee90' : '#ffb366';

            if (window.DEBUG_HUMAN_VS_HUMAN) {
                addLog('🎮 人間vs人間モード: ON （黒白両方操作可能、手札は黒のみ使用）');
            } else {
                addLog('人間vs人間モード: OFF');
            }
        });
    }

    // Visual Test Button
    if (visualTestBtn) {
        visualTestBtn.addEventListener('click', () => {
            // Clear board and card state
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    gameState.board[r][c] = EMPTY;
                }
            }
            // Use unified specialStones array
            cardState.specialStones = [];
            cardState.bombs = [];

            // Place test stones with effects
            // Row 0: Normal stones
            gameState.board[0][0] = BLACK;
            gameState.board[0][1] = WHITE;

            // Row 1: Temporary protected (gray) - 弱い意志
            gameState.board[1][0] = BLACK;
            gameState.board[1][1] = WHITE;
            cardState.specialStones.push({ row: 1, col: 0, type: 'PROTECTED', owner: 'black' });
            cardState.specialStones.push({ row: 1, col: 1, type: 'PROTECTED', owner: 'white' });

            // Row 2: Perma protected (permanent) - 強い意志
            gameState.board[2][0] = BLACK;
            gameState.board[2][1] = WHITE;
            cardState.specialStones.push({ row: 2, col: 0, type: 'PERMA_PROTECTED', owner: 'black' });
            cardState.specialStones.push({ row: 2, col: 1, type: 'PERMA_PROTECTED', owner: 'white' });

            // Row 3: Ultimate dragons - 究極反転龍
            gameState.board[3][0] = BLACK;
            gameState.board[3][1] = WHITE;
            cardState.specialStones.push({
                row: 3,
                col: 0,
                type: 'DRAGON',
                owner: 'black',
                remainingOwnerTurns: 5
            });
            cardState.specialStones.push({
                row: 3,
                col: 1,
                type: 'DRAGON',
                owner: 'white',
                remainingOwnerTurns: 5
            });

            // Row 4: Gold stone - 金の意志
            gameState.board[4][0] = BLACK;
            gameState.board[4][1] = WHITE;
            cardState.specialStones.push({ row: 4, col: 0, type: 'GOLD', owner: 'black' });
            cardState.specialStones.push({ row: 4, col: 1, type: 'GOLD', owner: 'white' });

            // Row 5: Breeding stone - 繁殖の意志
            gameState.board[5][0] = BLACK;
            gameState.board[5][1] = WHITE;
            cardState.specialStones.push({
                row: 5,
                col: 0,
                type: 'BREEDING',
                owner: 'black',
                remainingOwnerTurns: 3
            });
            cardState.specialStones.push({
                row: 5,
                col: 1,
                type: 'BREEDING',
                owner: 'white',
                remainingOwnerTurns: 3
            });

            // Row 6: Time bomb
            gameState.board[6][0] = BLACK;
            gameState.board[6][1] = WHITE;
            cardState.bombs.push({
                row: 6,
                col: 0,
                owner: BLACK,
                remainingTurns: 5
            });
            cardState.bombs.push({
                row: 6,
                col: 1,
                owner: WHITE,
                remainingTurns: 8
            });

            // Row 7: Ultimate destroy god - 究極破壊神
            gameState.board[7][0] = BLACK;
            gameState.board[7][1] = WHITE;
            cardState.specialStones.push({
                row: 7,
                col: 0,
                type: 'ULTIMATE_DESTROY_GOD',
                owner: 'black',
                remainingOwnerTurns: 3
            });
            cardState.specialStones.push({
                row: 7,
                col: 1,
                type: 'ULTIMATE_DESTROY_GOD',
                owner: 'white',
                remainingOwnerTurns: 3
            });

            if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
            else if (typeof renderBoard === 'function') renderBoard();
            addLog('石ビジュアルテスト表示 (黒:左列 / 白:右列)');
        });
    }
}

if (typeof window !== 'undefined') {
    window.setupDebugControls = setupDebugControls;
}
