// ==UserScript==
// @name         Discord Mobile Token Display
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Displays and allows copying of Discord user token in a mobile-friendly, draggable, and resizable UI with status setting, guild member ID retrieval, and manual token login via iframe
// @author       Sigma via UCAR
// @match        https://*.discord.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // トークンを取得する関数（iframe経由）
    function getToken() {
        try {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const token = JSON.parse(iframe.contentWindow.localStorage.getItem('token') || 'null');
            iframe.remove();
            return token || null;
        } catch (e) {
            console.error('Error retrieving token:', e);
            return null;
        }
    }

    // トークンを設定する関数（iframe経由）
    function setToken(newToken) {
        try {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            iframe.contentWindow.localStorage.setItem('token', JSON.stringify(newToken));
            iframe.remove();
            return true;
        } catch (e) {
            console.error('Error setting token:', e);
            return false;
        }
    }

    // ステータスを変更する関数
    async function setStatus(status, token) {
        if (!token) {
            console.error('Failed to retrieve token for status change.');
            return;
        }

        const statusPayload = {
            status: status // "online", "idle", "dnd", "invisible"
        };

        try {
            const response = await fetch('https://discord.com/api/v9/users/@me/settings', {
                method: 'PATCH',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(statusPayload)
            });

            if (!response.ok) {
                console.error('Failed to change status:', response.status);
            }
        } catch (e) {
            console.error('Error changing status:', e);
        }
    }

    // サーバーのメンバーIDを取得する関数
    async function getGuildMemberIds(guildId, token) {
        try {
            let members = [];
            let after = null;
            const limit = 1000;

            do {
                const url = `https://discord.com/api/v9/guilds/${guildId}/members?limit=${limit}${after ? `&after=${after}` : ''}`;
                const response = await fetch(url, {
                    headers: {
                        'Authorization': token
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch members: ${response.status}`);
                }

                const data = await response.json();
                members = members.concat(data.map(member => member.user.id));
                after = data.length === limit ? data[data.length - 1].user.id : null;
            } while (after);

            return members;
        } catch (e) {
            console.error('Error fetching guild members:', e);
            return null;
        }
    }

    // モバイルフレンドリーなUIを作成
    function createUI(token) {
        const existingUI = document.getElementById('token-ui');
        if (existingUI) existingUI.remove();

        const savedState = localStorage.getItem('token-ui-state');
        const defaultState = { x: 10, y: 10, width: 300, height: 550 }; // 高さをさらに増やして新しいセクションに対応
        const state = savedState ? JSON.parse(savedState) : defaultState;

        const container = document.createElement('div');
        container.id = 'token-ui';
        container.style.position = 'fixed';
        container.style.left = `${state.x}px`;
        container.style.top = `${state.y}px`;
        container.style.width = `${state.width}px`;
        container.style.height = `${state.height}px`;
        container.style.background = 'rgba(0, 0, 0, 0.8)';
        container.style.color = 'white';
        container.style.padding = '15px';
        container.style.borderRadius = '10px';
        container.style.zIndex = '10000';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.boxSizing = 'border-box';
        container.style.touchAction = 'none';

        const dragHandle = document.createElement('div');
        dragHandle.style.position = 'absolute';
        dragHandle.style.top = '0';
        dragHandle.style.left = '0';
        dragHandle.style.right = '0';
        dragHandle.style.height = '20px';
        dragHandle.style.background = 'rgba(255, 255, 255, 0.2)';
        dragHandle.style.cursor = 'move';
        container.appendChild(dragHandle);

        const title = document.createElement('h2');
        title.textContent = 'Your Discord Token';
        title.style.margin = '20px 0 10px 0';
        title.style.fontSize = '18px';
        container.appendChild(title);

        const tokenDisplay = document.createElement('div');
        tokenDisplay.id = 'token-display';
        tokenDisplay.style.background = 'rgba(255, 255, 255, 0.1)';
        tokenDisplay.style.padding = '10px';
        tokenDisplay.style.borderRadius = '5px';
        tokenDisplay.style.wordBreak = 'break-all';
        tokenDisplay.style.fontSize = '14px';
        tokenDisplay.style.maxHeight = '100px';
        tokenDisplay.style.overflowY = 'auto';
        tokenDisplay.textContent = token ? censorToken(token) : 'Failed to retrieve token';
        container.appendChild(tokenDisplay);

        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Show';
        toggleButton.style.margin = '10px 5px 0 0';
        toggleButton.style.padding = '8px 12px';
        toggleButton.style.background = '#5865F2';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '5px';
        toggleButton.style.color = 'white';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.fontSize = '14px';
        container.appendChild(toggleButton);

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.style.margin = '10px 5px 0 0';
        copyButton.style.padding = '8px 12px';
        copyButton.style.background = '#43B581';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '5px';
        copyButton.style.color = 'white';
        copyButton.style.cursor = 'pointer';
        copyButton.style.fontSize = '14px';
        container.appendChild(copyButton);

        const refreshButton = document.createElement('button');
        refreshButton.textContent = 'Refresh Token';
        refreshButton.style.margin = '10px 0 0 0';
        refreshButton.style.padding = '8px 12px';
        refreshButton.style.background = '#FFA500';
        refreshButton.style.border = 'none';
        refreshButton.style.borderRadius = '5px';
        refreshButton.style.color = 'white';
        refreshButton.style.cursor = 'pointer';
        refreshButton.style.fontSize = '14px';
        container.appendChild(refreshButton);

        // ステータス変更セクション
        const statusSection = document.createElement('div');
        statusSection.style.marginTop = '15px';
        statusSection.style.display = 'flex';
        statusSection.style.flexWrap = 'wrap';
        statusSection.style.gap = '5px';

        const statusOptions = [
            { label: 'Online', value: 'online', color: '#43B581' },
            { label: 'Idle', value: 'idle', color: '#FAA61A' },
            { label: 'Do Not Disturb', value: 'dnd', color: '#F04747' },
            { label: 'Invisible', value: 'invisible', color: '#747F8D' }
        ];

        statusOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option.label;
            button.style.padding = '8px 12px';
            button.style.background = option.color;
            button.style.border = 'none';
            button.style.borderRadius = '5px';
            button.style.color = 'white';
            button.style.cursor = 'pointer';
            button.style.fontSize = '14px';
            button.style.flex = '1 1 auto';
            button.addEventListener('click', () => setStatus(option.value, token));
            statusSection.appendChild(button);
        });

        container.appendChild(statusSection);

        // トークン入力セクション（ステータスボタンの下）
        const loginSection = document.createElement('div');
        loginSection.style.marginTop = '15px';
        loginSection.style.display = 'flex';
        loginSection.style.flexDirection = 'column';
        loginSection.style.gap = '10px';

        const label = document.createElement('label');
        label.textContent = 'Enter Token to Login:';
        label.style.fontSize = '14px';
        label.style.fontWeight = 'bold';
        loginSection.appendChild(label);

        const tokenInput = document.createElement('input');
        tokenInput.type = 'text';
        tokenInput.id = 'token-input';
        tokenInput.style.padding = '8px';
        tokenInput.style.background = 'rgba(255, 255, 255, 0.1)';
        tokenInput.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        tokenInput.style.borderRadius = '5px';
        tokenInput.style.color = 'white';
        tokenInput.style.fontSize = '14px';
        tokenInput.placeholder = 'Paste your Discord token here...';
        loginSection.appendChild(tokenInput);

        const loginButton = document.createElement('button');
        loginButton.textContent = 'Login';
        loginButton.style.padding = '8px 12px';
        loginButton.style.background = '#5865F2';
        loginButton.style.border = 'none';
        loginButton.style.borderRadius = '5px';
        loginButton.style.color = 'white';
        loginButton.style.cursor = 'pointer';
        loginButton.style.fontSize = '14px';
        loginSection.appendChild(loginButton);

        container.appendChild(loginSection);

        const warning = document.createElement('p');
        warning.textContent = 'made by nawa | freeze axis製のをオマージュしました';
        warning.style.margin = '10px 0 0 0';
        warning.style.color = '#FF5555';
        warning.style.fontSize = '12px';
        container.appendChild(warning);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.margin = '10px 0 0 0';
        closeButton.style.padding = '8px 12px';
        closeButton.style.background = '#FF5555';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '14px';
        container.appendChild(closeButton);

        const resizeHandle = document.createElement('div');
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.bottom = '0';
        resizeHandle.style.right = '0';
        resizeHandle.style.width = '20px';
        resizeHandle.style.height = '20px';
        resizeHandle.style.background = 'rgba(255, 255, 255, 0.3)';
        resizeHandle.style.cursor = 'se-resize';
        container.appendChild(resizeHandle);

        document.body.appendChild(container);

        function censorToken(token) {
            return token ? '*'.repeat(token.length) : '';
        }

        let isTokenVisible = false;
        let currentToken = token; // 現在のトークンを保持

        toggleButton.addEventListener('click', () => {
            isTokenVisible = !isTokenVisible;
            tokenDisplay.textContent = isTokenVisible ? currentToken : censorToken(currentToken);
            toggleButton.textContent = isTokenVisible ? 'Hide' : 'Show';
        });

        copyButton.addEventListener('click', () => {
            if (currentToken) {
                navigator.clipboard.writeText(currentToken).then(() => {
                    console.log('Token copied to clipboard!');
                }).catch(err => {
                    console.error('Failed to copy token:', err);
                });
            } else {
                console.error('No token available to copy.');
            }
        });

        refreshButton.addEventListener('click', () => {
            const newToken = getToken();
            currentToken = newToken;
            tokenDisplay.textContent = newToken ? censorToken(newToken) : 'Failed to retrieve token';
            isTokenVisible = false;
            toggleButton.textContent = 'Show';
        });

        // Loginボタンのイベントリスナー（iframe経由で設定し、リダイレクト）
        loginButton.addEventListener('click', async () => {
            const inputToken = tokenInput.value.trim();
            if (inputToken && setToken(inputToken)) {
                currentToken = inputToken;
                tokenDisplay.textContent = censorToken(inputToken);
                isTokenVisible = false;
                toggleButton.textContent = 'Show';
                tokenInput.value = ''; // 入力欄をクリア
                console.log('Token set successfully. Redirecting to /app...');
                // 1秒後に/appへリダイレクト
                setTimeout(() => {
                    location.href = '/app';
                }, 1000);
            } else {
                console.error('Failed to set token.');
            }
        });

        closeButton.addEventListener('click', () => {
            container.remove();
            isUIVisible = false;
            triggerButton.textContent = 'Get Token';
        });

        let isDragging = false;
        let currentX, currentY;

        dragHandle.addEventListener('pointerdown', (e) => {
            isDragging = true;
            currentX = e.clientX - state.x;
            currentY = e.clientY - state.y;
            dragHandle.setPointerCapture(e.pointerId);
        });

        document.addEventListener('pointermove', (e) => {
            if (isDragging) {
                let newX = e.clientX - currentX;
                let newY = e.clientY - currentY;
                newX = Math.max(0, Math.min(newX, window.innerWidth - state.width));
                newY = Math.max(0, Math.min(newY, window.innerHeight - state.height));
                container.style.left = `${newX}px`;
                container.style.top = `${newY}px`;
                state.x = newX;
                state.y = newY;
                localStorage.setItem('token-ui-state', JSON.stringify(state));
            }
        });

        document.addEventListener('pointerup', () => {
            isDragging = false;
        });

        let isResizing = false;
        resizeHandle.addEventListener('pointerdown', (e) => {
            isResizing = true;
            resizeHandle.setPointerCapture(e.pointerId);
        });

        document.addEventListener('pointermove', (e) => {
            if (isResizing) {
                let newWidth = e.clientX - parseFloat(container.style.left);
                let newHeight = e.clientY - parseFloat(container.style.top);
                newWidth = Math.max(250, Math.min(newWidth, window.innerWidth - state.x));
                newHeight = Math.max(450, Math.min(newHeight, window.innerHeight - state.y));
                container.style.width = `${newWidth}px`;
                container.style.height = `${newHeight}px`;
                state.width = newWidth;
                state.height = newHeight;
                localStorage.setItem('token-ui-state', JSON.stringify(state));
            }
        });

        document.addEventListener('pointerup', () => {
            isResizing = false;
        });

        return container;
    }

    const triggerButton = document.createElement('button');
    triggerButton.textContent = 'Get Token';
    triggerButton.style.position = 'fixed';
    triggerButton.style.bottom = '20px';
    triggerButton.style.right = '20px';
    triggerButton.style.padding = '10px 15px';
    triggerButton.style.background = '#5865F2';
    triggerButton.style.border = 'none';
    triggerButton.style.borderRadius = '20px';
    triggerButton.style.color = 'white';
    triggerButton.style.fontSize = '16px';
    triggerButton.style.zIndex = '10001';
    triggerButton.style.cursor = 'pointer';
    triggerButton.style.touchAction = 'none';

    let isButtonDragging = false;
    let buttonX, buttonY;
    const savedButtonState = localStorage.getItem('trigger-button-state');
    const defaultButtonState = { x: window.innerWidth - 80, y: window.innerHeight - 80 };
    const buttonState = savedButtonState ? JSON.parse(savedButtonState) : defaultButtonState;

    triggerButton.style.left = `${buttonState.x}px`;
    triggerButton.style.top = `${buttonState.y}px`;
    triggerButton.style.right = 'auto';
    triggerButton.style.bottom = 'auto';

    triggerButton.addEventListener('pointerdown', (e) => {
        isButtonDragging = true;
        buttonX = e.clientX - buttonState.x;
        buttonY = e.clientY - buttonState.y;
        triggerButton.setPointerCapture(e.pointerId);
    });

    document.addEventListener('pointermove', (e) => {
        if (isButtonDragging) {
            let newX = e.clientX - buttonX;
            let newY = e.clientY - buttonY;
            newX = Math.max(0, Math.min(newX, window.innerWidth - triggerButton.offsetWidth));
            newY = Math.max(0, Math.min(newY, window.innerHeight - triggerButton.offsetHeight));
            triggerButton.style.left = `${newX}px`;
            triggerButton.style.top = `${newY}px`;
            buttonState.x = newX;
            buttonState.y = newY;
            if (newX < 20) buttonState.x = 0;
            else if (newX > window.innerWidth - triggerButton.offsetWidth - 20) buttonState.x = window.innerWidth - triggerButton.offsetWidth;
            if (newY < 20) buttonState.y = 0;
            else if (newY > window.innerHeight - triggerButton.offsetHeight - 20) buttonState.y = window.innerHeight - triggerButton.offsetHeight;
            triggerButton.style.left = `${buttonState.x}px`;
            triggerButton.style.top = `${buttonState.y}px`;
            localStorage.setItem('trigger-button-state', JSON.stringify(buttonState));
        }
    });

    document.addEventListener('pointerup', () => {
        isButtonDragging = false;
    });

    let isUIVisible = false;
    triggerButton.addEventListener('click', () => {
        if (isUIVisible) {
            const existingUI = document.getElementById('token-ui');
            if (existingUI) existingUI.remove();
            isUIVisible = false;
            triggerButton.textContent = 'Get Token';
        } else {
            const token = getToken();
            createUI(token);
            isUIVisible = true;
            triggerButton.textContent = 'Close UI';
        }
    });

    document.body.appendChild(triggerButton);

    document.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.key.toLowerCase() === 't') {
            if (isUIVisible) {
                const existingUI = document.getElementById('token-ui');
                if (existingUI) existingUI.remove();
                isUIVisible = false;
                triggerButton.textContent = 'Get Token';
            } else {
                const token = getToken();
                createUI(token);
                isUIVisible = true;
                triggerButton.textContent = 'Close UI';
            }
        }
    });
})();
