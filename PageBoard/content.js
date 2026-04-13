class PageBoard {
    constructor() {
        this.isDrawing = false;
        this.currentColor = '#ff0000';
        this.currentPath = null;
        this.paths = [];
        this.canvas = null;
        this.ctx = null;
        this.controlPanel = null;
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.drawingEnabled = false; // Ensure drawing is off by default
        this.deleteMode = false;
        this.textMode = false;
        this.interactMode = true; // Default mode is interact
        this.selecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.panelVisible = false; // Menu is closed by default
        this.toggleBtn = null;
        this.textElements = [];
        this.activeTextElement = null;
        this._lastDashTime = 0; // For shortcut timing

        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);

        this.init();
    }

    init() {
        setTimeout(() => {
            this.initializeComponents();
        }, 100);
    }

    initializeComponents() {
        this.createControlPanel();
        this.createToggleButton();
        this.createFullPageCanvas(); // Call before setMode if setMode affects canvas pointer-events
        this.setupEventListeners();
        this.loadSavedColor();
        this.showInstructions();
        
        this.setMode('interact'); // Explicitly set initial mode and update UI

        // Set initial panel and toggle button visibility based on panelVisible
        if (this.panelVisible) {
            if (this.controlPanel) this.controlPanel.style.display = 'flex';
            if (this.toggleBtn) this.toggleBtn.style.display = 'none';
        } else {
            if (this.controlPanel) this.controlPanel.style.display = 'none';
            if (this.toggleBtn) this.toggleBtn.style.display = 'block';
        }

        // Clear all drawings/text on navigation
        window.addEventListener('pageshow', () => { this.clearAll(); this.updateCanvasSize(); });
        window.addEventListener('popstate', () => { this.clearAll(); this.updateCanvasSize(); });
    }

    showControlPanel() {
        if (this.controlPanel) {
            // Restore position if previously set
            const savedPanelPos = JSON.parse(localStorage.getItem('pageboard-panel-pos') || '{}');
            if (savedPanelPos && typeof savedPanelPos.top === 'number' && typeof savedPanelPos.left === 'number') {
                this.controlPanel.style.top = savedPanelPos.top + 'px';
                this.controlPanel.style.left = savedPanelPos.left + 'px';
                this.controlPanel.style.right = 'auto';
            }
            this.controlPanel.style.display = 'flex';
            this.controlPanel.style.visibility = 'visible';
            this.controlPanel.style.opacity = '1';
            this.panelVisible = true;
            
            if (this.toggleBtn) {
                this.toggleBtn.style.display = 'none';
            }
        }
    }

    createFullPageCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'pageboard-full-canvas';

        const docWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth);
        const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);

        // Default to high z-index, but pointer-events controlled in setMode
        this.canvas.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: ${docWidth}px !important;
            height: ${docHeight}px !important;
            z-index: 999998 !important;
            pointer-events: none !important;
            cursor: crosshair !important;
            background: transparent !important;
        `;
        
        this.canvas.width = docWidth;
        this.canvas.height = docHeight;
        
        this.ctx = this.canvas.getContext('2d');
        document.body.appendChild(this.canvas);

        window.addEventListener('resize', () => this.updateCanvasSize());
        window.addEventListener('scroll', () => this.updateCanvasSize());
    }

    updateCanvasSize() {
        if (!this.canvas || !this.ctx) return;

        const newWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth);
        const newHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);

        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        this.canvas.style.width = newWidth + 'px';
        this.canvas.style.height = newHeight + 'px';
        
        this.redrawAll();
    }

    createControlPanel() {
        this.controlPanel = document.createElement('div');
        this.controlPanel.className = 'pageboard-control-panel';
        this.controlPanel.style.cssText = `
            position: fixed !important;
            top: 24px !important;
            right: 24px !important;
            z-index: 2147483647 !important;
            background: #181c22 !important;
            padding: 10px 12px !important;
            border-radius: 14px !important;
            box-shadow: 0 8px 32px 0 rgba(0,0,0,0.32) !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            min-width: 150px !important;
            font-family: 'Inter', Arial, sans-serif !important;
            font-size: 13px !important;
            color: #f5f6fa !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            border: 1px solid #222 !important;
        `;

        // Restore position if previously set
        const savedPanelPos = JSON.parse(localStorage.getItem('pageboard-panel-pos') || '{}');
        if (savedPanelPos && typeof savedPanelPos.top === 'number' && typeof savedPanelPos.left === 'number') {
            this.controlPanel.style.top = savedPanelPos.top + 'px';
            this.controlPanel.style.left = savedPanelPos.left + 'px';
            this.controlPanel.style.right = 'auto';
        }

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            cursor: move !important;
            font-weight: 700 !important;
            text-align: center !important;
            padding: 6px 0 !important;
            background: transparent !important;
            color: #f5f6fa !important;
            border-radius: 8px !important;
            user-select: none !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
        `;
        
        const titleSpan = document.createElement('span');
        titleSpan.innerHTML = '<span style="font-size:18px;vertical-align:middle;">🎨</span> <span style="font-size:15px;letter-spacing:0.5px;">PageBoard</span>';
        titleSpan.style.cssText = 'flex-grow: 1 !important; text-align: center !important;';
        header.appendChild(titleSpan);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 6L14 14M14 6L6 14" stroke="#aaa" stroke-width="2" stroke-linecap="round"/></svg>';
        closeBtn.title = "Close";
        closeBtn.style.cssText = `
            background: none !important;
            border: none !important;
            color: #aaa !important;
            font-size: 18px !important;
            cursor: pointer !important;
            padding: 0 6px !important;
            border-radius: 3px !important;
            line-height: 1 !important;
            transition: background 0.15s;
            display: flex !important;
            align-items: center !important;
        `;
        closeBtn.onmouseenter = () => closeBtn.style.background = '#23272f';
        closeBtn.onmouseleave = () => closeBtn.style.background = 'none';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.togglePanel();
        };
        header.appendChild(closeBtn);

        this.controlPanel.appendChild(header);

        // Color selection
        const colorsDiv = document.createElement('div');
        colorsDiv.style.cssText = `
            display: flex !important;
            gap: 7px !important;
            justify-content: center !important;
            flex-wrap: wrap !important;
            padding: 2px 0 2px 0 !important;
        `;
        
        const colors = ['#ff4757', '#1e90ff', '#00c853', '#a29bfe', '#ffb142', '#f5f6fa', '#ffd600', '#ff69b4', '#222'];
        colors.forEach(color => {
            const colorBtn = document.createElement('div');
            colorBtn.className = 'pageboard-color-btn';
            colorBtn.style.cssText = `
                width: 20px !important;
                height: 20px !important;
                background-color: ${color} !important;
                border: 2.5px solid #23272f !important;
                border-radius: 50% !important;
                cursor: pointer !important;
                pointer-events: auto !important;
                transition: transform 0.1s, border 0.1s !important;
                box-shadow: 0 1px 4px 0 rgba(0,0,0,0.13) !important;
                position: relative !important;
            `;
            colorBtn.title = color;
            colorBtn.onclick = () => this.setColor(color);
            colorBtn.onmouseenter = () => colorBtn.style.transform = 'scale(1.13)';
            colorBtn.onmouseleave = () => colorBtn.style.transform = 'scale(1)';
            colorsDiv.appendChild(colorBtn);
        });
        this.controlPanel.appendChild(colorsDiv);

        // Mode buttons
        const modeDiv = document.createElement('div');
        modeDiv.style.cssText = 'display: flex !important; flex-direction: row !important; gap: 7px !important; justify-content: center !important;';

        // Interact button
        const interactBtn = document.createElement('button');
        interactBtn.innerHTML = '<span style="font-size:17px;">👆</span>';
        interactBtn.title = 'Interact with Page (Shortcut: -i)';
        interactBtn.id = 'interact-btn';
        interactBtn.style.cssText = `
            padding: 7px 10px !important;
            border: none !important;
            background-color: #23272f !important;
            color: #f5f6fa !important;
            border-radius: 7px !important;
            cursor: pointer !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            transition: background 0.15s;
        `;
        interactBtn.onclick = () => this.setMode('interact');
        modeDiv.appendChild(interactBtn);

        // Drawing button
        const drawBtn = document.createElement('button');
        drawBtn.innerHTML = '<span style="font-size:17px;">🖊️</span>';
        drawBtn.id = 'draw-btn';
        drawBtn.title = 'Drawing Mode (Shortcut: -d)';
        drawBtn.style.cssText = `
            padding: 7px 10px !important;
            border: none !important;
            background-color: #23272f !important;
            color: #f5f6fa !important;
            border-radius: 7px !important;
            cursor: pointer !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            transition: background 0.15s;
        `;
        drawBtn.onclick = () => this.setMode('draw');
        modeDiv.appendChild(drawBtn);

        // Text button
        const textBtn = document.createElement('button');
        textBtn.innerHTML = '<span style="font-size:17px;">📝</span>';
        textBtn.id = 'text-btn';
        textBtn.title = 'Text Mode (Shortcut: -t)';
        textBtn.style.cssText = `
            padding: 7px 10px !important;
            border: none !important;
            background-color: #23272f !important;
            color: #f5f6fa !important;
            border-radius: 7px !important;
            cursor: pointer !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            transition: background 0.15s;
        `;
        textBtn.onclick = () => this.setMode('text');
        modeDiv.appendChild(textBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<span style="font-size:17px;">✂️</span>';
        deleteBtn.id = 'delete-btn';
        deleteBtn.title = 'Select to Delete (Shortcut: -r)';
        deleteBtn.style.cssText = `
            padding: 7px 10px !important;
            border: none !important;
            background-color: #23272f !important;
            color: #f5f6fa !important;
            border-radius: 7px !important;
            cursor: pointer !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            transition: background 0.15s;
        `;
        deleteBtn.onclick = () => this.setMode('delete');
        modeDiv.appendChild(deleteBtn);

        this.controlPanel.appendChild(modeDiv);

        // Action buttons
        const actionDiv = document.createElement('div');
        actionDiv.style.cssText = 'display: flex !important; flex-direction: row !important; gap: 7px !important; justify-content: center !important;';

        const undoBtn = document.createElement('button');
        undoBtn.innerHTML = '<span style="font-size:17px;">↶</span>';
        undoBtn.title = 'Undo (Ctrl/Cmd+Z)';
        undoBtn.style.cssText = `
            padding: 6px 10px !important;
            border: none !important;
            background-color: #23272f !important;
            color: #f5f6fa !important;
            border-radius: 7px !important;
            cursor: pointer !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            transition: background 0.15s;
        `;
        undoBtn.onclick = () => this.undo();
        actionDiv.appendChild(undoBtn);

        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = '<span style="font-size:17px;">🗑️</span>';
        clearBtn.title = 'Clear All';
        clearBtn.style.cssText = `
            padding: 6px 10px !important;
            border: none !important;
            background-color: #23272f !important;
            color: #f5f6fa !important;
            border-radius: 7px !important;
            cursor: pointer !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            transition: background 0.15s, border 0.15s;
        `;
        let clearConfirm = false;
        let clearBtnEscapeHandler = null;
        clearBtn.onclick = (e) => {
            if (!clearConfirm) {
                clearConfirm = true;
                clearBtn.style.border = '2px solid #ff4757';
                clearBtn.style.backgroundColor = '#2d1a1a';
                clearBtn.innerHTML = 'Click again to confirm';
                // Escape cancels
                clearBtnEscapeHandler = (evt) => {
                    if (evt.key === 'Escape') {
                        clearConfirm = false;
                        clearBtn.style.border = 'none';
                        clearBtn.style.backgroundColor = '#23272f';
                        clearBtn.innerHTML = '<span style="font-size:17px;">🗑️</span>';
                        document.removeEventListener('keydown', clearBtnEscapeHandler);
                    }
                };
                document.addEventListener('keydown', clearBtnEscapeHandler);
            } else {
                clearConfirm = false;
                clearBtn.style.border = 'none';
                clearBtn.style.backgroundColor = '#23272f';
                clearBtn.innerHTML = '<span style="font-size:17px;">🗑️</span>';
                document.removeEventListener('keydown', clearBtnEscapeHandler);
                this.clearAll();
            }
        };
        actionDiv.appendChild(clearBtn);

        this.controlPanel.appendChild(actionDiv);

        // Drag functionality
        let isPanelDragging = false;
        let panelDragOffset = { x: 0, y: 0 };

        titleSpan.onmousedown = (e) => {
            isPanelDragging = true;
            panelDragOffset.x = e.clientX - this.controlPanel.offsetLeft;
            panelDragOffset.y = e.clientY - this.controlPanel.offsetTop;
            document.body.style.userSelect = 'none';
        };

        document.addEventListener('mousemove', (e) => {
            if (isPanelDragging) {
                let newLeft = e.clientX - panelDragOffset.x;
                let newTop = e.clientY - panelDragOffset.y;
                // Clamp to viewport
                newLeft = Math.max(0, Math.min(window.innerWidth - this.controlPanel.offsetWidth, newLeft));
                newTop = Math.max(0, Math.min(window.innerHeight - this.controlPanel.offsetHeight, newTop));
                this.controlPanel.style.left = newLeft + 'px';
                this.controlPanel.style.top = newTop + 'px';
                this.controlPanel.style.right = 'auto';
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isPanelDragging) {
                isPanelDragging = false;
                document.body.style.userSelect = '';
                // Save position
                localStorage.setItem('pageboard-panel-pos', JSON.stringify({
                    top: parseInt(this.controlPanel.style.top, 10),
                    left: parseInt(this.controlPanel.style.left, 10)
                }));
            }
        });

        document.body.appendChild(this.controlPanel);
    }

    createToggleButton() {
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.innerHTML = this.getToolIcon();
        this.toggleBtn.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 9999998 !important;
            background: rgba(20, 18, 23, 1) !important;
            color: white !important;
            border: none !important;
            border-radius: 12px !important;
            width: 44px !important;
            height: 44px !important;
            font-size: 22px !important;
            cursor: pointer !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.13) !important;
            display: none !important;
            transition: background 0.15s, box-shadow 0.15s;
        `;

        // Restore position if previously set
        const savedPos = JSON.parse(localStorage.getItem('pageboard-toggle-pos') || '{}');
        if (savedPos && typeof savedPos.top === 'number' && typeof savedPos.left === 'number') {
            this.toggleBtn.style.top = savedPos.top + 'px';
            this.toggleBtn.style.left = savedPos.left + 'px';
            this.toggleBtn.style.right = 'auto';
        }

        // Drag logic for toggle button
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        let downTime = 0;
        let dragTimeout = null;

        this.toggleBtn.onmousedown = (e) => {
            downTime = Date.now();
            dragOffset.x = e.clientX - this.toggleBtn.offsetLeft;
            dragOffset.y = e.clientY - this.toggleBtn.offsetTop;
            document.body.style.userSelect = 'none';
            // if held >200ms, switch to drag mode
            dragTimeout = setTimeout(() => { isDragging = true; }, 200);
        };

        document.addEventListener('mousemove', (e) => {
            // if moved before timeout, start drag immediately
            if (dragTimeout &&
                (Math.abs(e.clientX - (dragOffset.x + this.toggleBtn.offsetLeft)) > 3 ||
                 Math.abs(e.clientY - (dragOffset.y + this.toggleBtn.offsetTop)) > 3)
            ) {
                clearTimeout(dragTimeout);
                dragTimeout = null;
                isDragging = true;
            }
            if (isDragging) {
                let newLeft = e.clientX - dragOffset.x;
                let newTop  = e.clientY - dragOffset.y;
                // clamp into viewport
                newLeft = Math.max(0, Math.min(window.innerWidth - this.toggleBtn.offsetWidth, newLeft));
                newTop  = Math.max(0, Math.min(window.innerHeight- this.toggleBtn.offsetHeight,newTop));
                this.toggleBtn.style.left = newLeft + 'px';
                this.toggleBtn.style.top  = newTop + 'px';
                this.toggleBtn.style.right= 'auto';
            }
        });

        this.toggleBtn.onmouseup = (e) => {
            clearTimeout(dragTimeout); dragTimeout = null;
            document.body.style.userSelect = '';
            if (isDragging) {
                // finish drag, save pos
                isDragging = false;
                localStorage.setItem('pageboard-toggle-pos', JSON.stringify({
                    top:  parseInt(this.toggleBtn.style.top,10),
                    left: parseInt(this.toggleBtn.style.left,10)
                }));
            } else {
                // quick click => toggle panel
                if (Date.now() - downTime < 200) {
                    this.togglePanel();
                }
            }
        };

        document.body.appendChild(this.toggleBtn);
    }

    getToolIcon() {
        if (this.drawingEnabled) return '🖊️';
        if (this.textMode) return '📝';
        if (this.deleteMode) return '✂️';
        if (this.interactMode) return '👆';
        return '🎨';
    }

    togglePanel() {
        this.panelVisible = !this.panelVisible;

        if (this.panelVisible) {
            // Restore position if previously set
            const savedPanelPos = JSON.parse(localStorage.getItem('pageboard-panel-pos') || '{}');
            if (savedPanelPos && typeof savedPanelPos.top === 'number' && typeof savedPanelPos.left === 'number') {
                this.controlPanel.style.top = savedPanelPos.top + 'px';
                this.controlPanel.style.left = savedPanelPos.left + 'px';
                this.controlPanel.style.right = 'auto';
            }
            this.controlPanel.style.display = 'flex';
            this.toggleBtn.style.display = 'none';
        } else {
            this.controlPanel.style.display = 'none';
            this.toggleBtn.style.display = 'block';
            // Restore position if previously set
            const savedPos = JSON.parse(localStorage.getItem('pageboard-toggle-pos') || '{}');
            if (savedPos && typeof savedPos.top === 'number' && typeof savedPos.left === 'number') {
                this.toggleBtn.style.top = savedPos.top + 'px';
                this.toggleBtn.style.left = savedPos.left + 'px';
                this.toggleBtn.style.right = 'auto';
            }
        }
    }

    setMode(mode) {
        this.interactMode = mode === 'interact';
        this.drawingEnabled = mode === 'draw';
        this.textMode = mode === 'text';
        this.deleteMode = mode === 'delete';

        this.updateButtonStates();
        this.updateCursor();

        // Update floating button icon
        if (this.toggleBtn) this.toggleBtn.innerHTML = this.getToolIcon();

        // Toggle canvas interactivity
        this.canvas.style.pointerEvents = this.interactMode ? 'none' : 'auto';
    }

    updateButtonStates() {
        const drawBtn = document.getElementById('draw-btn');
        const textBtn = document.getElementById('text-btn');
        const deleteBtn = document.getElementById('delete-btn');
        const interactBtn = document.getElementById('interact-btn');
        // Highlight active mode
        if (drawBtn) {
            drawBtn.style.backgroundColor = this.drawingEnabled ? '#2ed573' : '#23272f';
            drawBtn.style.color = this.drawingEnabled ? '#181c22' : '#f5f6fa';
        }
        if (textBtn) {
            textBtn.style.backgroundColor = this.textMode ? '#a29bfe' : '#23272f';
            textBtn.style.color = this.textMode ? '#181c22' : '#f5f6fa';
        }
        if (deleteBtn) {
            deleteBtn.style.backgroundColor = this.deleteMode ? '#fd79a8' : '#23272f';
            deleteBtn.style.color = this.deleteMode ? '#181c22' : '#f5f6fa';
        }
        if (interactBtn) {
            interactBtn.style.backgroundColor = this.interactMode ? '#1e90ff' : '#23272f';
            interactBtn.style.color = this.interactMode ? '#181c22' : '#f5f6fa';
        }
    }

    updateCursor() {
        if (this.drawingEnabled) {
            this.canvas.style.cursor = 'crosshair';
        } else if (this.textMode) {
            this.canvas.style.cursor = 'text';
        } else if (this.deleteMode) {
            this.canvas.style.cursor = 'cell';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    setupEventListeners() {
        this.canvas.oncontextmenu = (e) => e.preventDefault();
        this.canvas.onselectstart = (e) => e.preventDefault();

        // Double-click to create text box, even if one is focused
        this.canvas.ondblclick = (e) => {
            if (
                this.textMode &&
                !this.isClickOnControlPanel(e) &&
                !this.isClickOnTextElement(e)
            ) {
                e.preventDefault();
                this.createTextElement(e);
            }
        };

        this.canvas.onmousedown = (e) => {
            if (this.isClickOnControlPanel(e)) return;
            if (!this.interactMode) {
                e.preventDefault();
                e.stopPropagation();
            }
            // Blur any focused text field if clicking outside
            if (
                this.textMode &&
                !this.isClickOnTextElement(e)
            ) {
                const focused = this.textElements.find(el => document.activeElement === el);
                if (focused) focused.blur();
            }
            if (this.deleteMode) {
                this.startSelection(e);
            } else if (this.drawingEnabled) {
                this.startDrawing(e);
            }
        };

        this.canvas.onmousemove = this.handleMouseMove;
        this.canvas.onmouseup = this.handleMouseUp;

        document.onkeydown = (e) => {
            // Ignore if typing in input/textarea/contenteditable
            const active = document.activeElement;
            if (
                active && (
                    active.tagName === 'INPUT' ||
                    active.tagName === 'TEXTAREA' ||
                    active.isContentEditable
                )
            ) return;

            // Keybinds: -d (draw), -i (interact), -t (text), -r (remove)
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.setMode('draw');
                return;
            }

            const now = Date.now();
            if (e.key === '-') {
                this._lastDashTime = now;
                return;
            }
            if (
                now - this._lastDashTime < 800 // 800ms window after '-'
            ) {
                if (e.key === 'd') {
                    this.setMode('draw');
                    this._lastDashTime = 0;
                } else if (e.key === 'i') {
                    this.setMode('interact');
                    this._lastDashTime = 0;
                } else if (e.key === 't') {
                    this.setMode('text');
                    this._lastDashTime = 0;
                } else if (e.key === 'r') {
                    this.setMode('delete');
                    this._lastDashTime = 0;
                }
            }
        };
    }

    handleMouseMove(e) {
        if (!this.interactMode) {
            e.preventDefault();
        }
        if (this.selecting) {
            this.updateSelection(e);
        } else if (this.isDrawing) {
            this.draw(e);
        }
    }

    handleMouseUp(e) {
        if (this.selecting) {
            this.finishSelection();
        } else if (this.isDrawing) {
            this.stopDrawing();
        }
    }

    isClickOnControlPanel(e) {
        const panelRect = this.controlPanel.getBoundingClientRect();
        return e.clientX >= panelRect.left && 
               e.clientX <= panelRect.right && 
               e.clientY >= panelRect.top && 
               e.clientY <= panelRect.bottom;
    }

    isClickOnTextElement(e) {
        return this.textElements.some(el => {
            const rect = el.getBoundingClientRect();
            return (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            );
        });
    }

    isAnyTextBoxFocused() {
        return this.textElements.some(el => document.activeElement === el);
    }

    getCanvasCoordinates(e) {
        return {
            x: e.clientX + window.scrollX, // Add scroll offsets for document-relative coords
            y: e.clientY + window.scrollY  // Add scroll offsets for document-relative coords
        };
    }

    createTextElement(e) {
        const coords = this.getCanvasCoordinates(e);
        
        const textElement = document.createElement('div');
        textElement.contentEditable = true;
        textElement.style.cssText = `
            position: absolute !important;
            left: ${coords.x}px !important;
            top: ${coords.y}px !important;
            min-width: 80px !important;
            min-height: 24px !important;
            max-width: 400px !important;
            padding: 7px 10px !important;
            background: #23272f !important;
            border: 1.5px solid ${this.currentColor} !important;
            border-radius: 8px !important;
            color: ${this.currentColor} !important;
            font-family: 'Inter', Arial, sans-serif !important;
            font-size: 16px !important;
            z-index: 999999 !important;
            cursor: move !important;
            outline: none !important;
            box-shadow: 0 2px 12px 0 rgba(0,0,0,0.18) !important;
            resize: none !important;
            transition: border 0.15s, box-shadow 0.15s, background 0.15s;
            user-select: text !important;
        `;
        textElement.textContent = 'Click to edit text';
        textElement.dataset.docX = coords.x;
        textElement.dataset.docY = coords.y;

        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.style.cssText = `
            position: absolute !important;
            right: 2px !important;
            bottom: 2px !important;
            width: 14px !important;
            height: 14px !important;
            cursor: se-resize !important;
            background: linear-gradient(135deg, #23272f 60%, #444 100%) !important;
            border-radius: 3px !important;
            z-index: 1000000 !important;
            opacity: 0.7 !important;
            display: block !important;
        `;
        textElement.appendChild(resizeHandle);

        // Make text draggable
        let isDraggingText = false;
        let textDragOffset = { x: 0, y: 0 };
        let isResizing = false;
        let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

        textElement.onmousedown = (event) => {
            // Only allow dragging if not resizing and not clicking on resize handle
            if (event.target === textElement && !isResizing) {
                isDraggingText = true;
                const currentDocX = parseFloat(textElement.dataset.docX || textElement.style.left);
                const currentDocY = parseFloat(textElement.dataset.docY || textElement.style.top);
                textDragOffset.x = event.clientX + window.scrollX - currentDocX;
                textDragOffset.y = event.clientY + window.scrollY - currentDocY;
                textElement.style.cursor = 'move';
                event.stopPropagation();
            }
        };

        resizeHandle.onmousedown = (event) => {
            isResizing = true;
            resizeStart.x = event.clientX + window.scrollX;
            resizeStart.y = event.clientY + window.scrollY;
            resizeStart.width = textElement.offsetWidth;
            resizeStart.height = textElement.offsetHeight;
            event.stopPropagation();
        };

        const onTextDragMove = (event) => {
            if (isDraggingText) {
                const newDocX = event.clientX + window.scrollX - textDragOffset.x;
                const newDocY = event.clientY + window.scrollY - textDragOffset.y;
                textElement.style.left = newDocX + 'px';
                textElement.style.top = newDocY + 'px';
                textElement.dataset.docX = newDocX;
                textElement.dataset.docY = newDocY;
            }
            if (isResizing) {
                let dx = (event.clientX + window.scrollX) - resizeStart.x;
                let dy = (event.clientY + window.scrollY) - resizeStart.y;
                let newWidth = Math.max(60, resizeStart.width + dx);
                let newHeight = Math.max(22, resizeStart.height + dy);
                textElement.style.width = newWidth + 'px';
                textElement.style.height = newHeight + 'px';
            }
        };

        const onTextDragEnd = () => {
            if (isDraggingText) {
                isDraggingText = false;
                textElement.style.cursor = 'text';
            }
            if (isResizing) {
                isResizing = false;
            }
        };

        document.addEventListener('mousemove', onTextDragMove);
        document.addEventListener('mouseup', onTextDragEnd);

        textElement.cleanupDragListeners = () => {
            document.removeEventListener('mousemove', onTextDragMove);
            document.removeEventListener('mouseup', onTextDragEnd);
        };

        // Hold-to-delete on double-click: border animates red, hold 1s to delete, escape cancels
        let deleteHoldTimeout = null;
        let deleteHoldStart = null;
        let deleteHoldFrame = null;
        let deleteEscapeHandler = null;
        let deleteMouseUpHandler = null;

        textElement.ondblclick = (event) => {
            if (deleteHoldTimeout) return; // Already in progress

            const borderStart = `1.5px solid ${this.currentColor}`;
            const borderEnd = '2.5px solid #ff4757';
            const bgStart = '#181c22';
            const bgEnd = '#2d1a1a';
            let startTime = null;

            function lerpColor(a, b, t) {
                // a, b: hex or rgb string, t: 0-1
                function hexToRgb(hex) {
                    hex = hex.replace('#', '');
                    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
                    const num = parseInt(hex, 16);
                    return [num >> 16, (num >> 8) & 255, num & 255];
                }
                function parseColor(str) {
                    if (str.startsWith('#')) return hexToRgb(str);
                    if (str.startsWith('rgb')) return str.match(/\d+/g).map(Number);
                    return [0,0,0];
                }
                const ca = parseColor(a), cb = parseColor(b);
                return `rgb(${Math.round(ca[0] + (cb[0]-ca[0])*t)},${Math.round(ca[1] + (cb[1]-ca[1])*t)},${Math.round(ca[2] + (cb[2]-ca[2])*t)})`;
            }

            function animateBorder(ts) {
                if (!startTime) startTime = ts;
                const elapsed = ts - startTime;
                const t = Math.min(1, elapsed / 1000);
                textElement.style.border = `2.5px solid ${lerpColor(deleteHoldFrame ? '#ff4757' : textElement.style.borderColor || '#1e90ff', '#ff4757', t)}`;
                textElement.style.background = lerpColor(bgStart, bgEnd, t);
                if (t < 1) {
                    deleteHoldFrame = requestAnimationFrame(animateBorder);
                }
            }

            function resetBorder() {
                textElement.style.border = `1.5px solid ${this.currentColor}`;
                textElement.style.background = '#181c22';
            }

            // Start animation
            deleteHoldFrame = requestAnimationFrame(animateBorder);

            // Mouse up or Escape cancels
            deleteMouseUpHandler = () => {
                if (deleteHoldTimeout) clearTimeout(deleteHoldTimeout);
                if (deleteHoldFrame) cancelAnimationFrame(deleteHoldFrame);
                resetBorder.call(this);
                deleteHoldTimeout = null;
                deleteHoldFrame = null;
                document.removeEventListener('mouseup', deleteMouseUpHandler);
                document.removeEventListener('keydown', deleteEscapeHandler);
            };
            deleteEscapeHandler = (evt) => {
                if (evt.key === 'Escape') {
                    if (deleteHoldTimeout) clearTimeout(deleteHoldTimeout);
                    if (deleteHoldFrame) cancelAnimationFrame(deleteHoldFrame);
                    resetBorder.call(this);
                    deleteHoldTimeout = null;
                    deleteHoldFrame = null;
                    document.removeEventListener('mouseup', deleteMouseUpHandler);
                    document.removeEventListener('keydown', deleteEscapeHandler);
                }
            };
            document.addEventListener('mouseup', deleteMouseUpHandler);
            document.addEventListener('keydown', deleteEscapeHandler);

            // Hold for 1s to delete
            deleteHoldTimeout = setTimeout(() => {
                if (deleteHoldFrame) cancelAnimationFrame(deleteHoldFrame);
                textElement.cleanupDragListeners();
                textElement.remove();
                this.textElements = this.textElements.filter(el => el !== textElement);
                deleteHoldTimeout = null;
                deleteHoldFrame = null;
                document.removeEventListener('mouseup', deleteMouseUpHandler);
                document.removeEventListener('keydown', deleteEscapeHandler);
            }, 1000);
        };

        // Focus for editing
        textElement.onfocus = () => {
            textElement.style.background = '#181c22';
            textElement.style.border = `1.5px solid ${this.currentColor}`;
            textElement.style.boxShadow = '0 2px 12px 0 rgba(0,0,0,0.23)';
            if (textElement.textContent === 'Click to edit text') {
                textElement.textContent = '';
            }
            resizeHandle.style.display = 'block';
        };

        textElement.onblur = () => {
            textElement.style.background = 'rgba(24,28,34,0.0)';
            textElement.style.border = '1.5px solid transparent';
            textElement.style.boxShadow = 'none';
            if (textElement.textContent.trim() === '') {
                textElement.textContent = 'Click to edit text';
            }
            resizeHandle.style.display = 'none';
        };

        // Only show resize handle on hover/focus
        textElement.onmouseenter = () => {
            if (document.activeElement !== textElement) resizeHandle.style.display = 'block';
        };
        textElement.onmouseleave = () => {
            if (document.activeElement !== textElement) resizeHandle.style.display = 'none';
        };

        document.body.appendChild(textElement);
        this.textElements.push(textElement);

        // Focus immediately
        setTimeout(() => {
            textElement.focus();
            // Only call select if available (for input/textarea, not div)
            if (typeof textElement.select === 'function') {
                textElement.select();
            }
        }, 10);
    }

    startDrawing(e) {
        if (!this.drawingEnabled) return;

        // Set z-index to just above the element under the pointer
        const el = document.elementFromPoint(e.clientX, e.clientY);
        let baseZ = 0;
        if (el && el !== this.canvas && el !== this.controlPanel && el !== this.toggleBtn) {
            const style = window.getComputedStyle(el);
            const z = parseInt(style.zIndex, 10);
            if (!isNaN(z)) baseZ = z;
        }
        this.canvas.style.zIndex = (baseZ + 1) || 1;

        this.isDrawing = true;
        const coords = this.getCanvasCoordinates(e);

        this.currentPath = {
            color: this.currentColor,
            points: [coords]
        };

        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x, coords.y);

        // Remember the start point for shift-straight-line
        this._drawStartPoint = coords;
    }

    draw(e) {
        if (!this.isDrawing || !this.currentPath || !this.drawingEnabled) return;

        let coords = this.getCanvasCoordinates(e);

        if (e.shiftKey && this.currentPath.points.length > 0) {
            // Always use the start of the stroke as the anchor
            const anchor = this._drawStartPoint || this.currentPath.points[0];
            const dx = coords.x - anchor.x;
            const dy = coords.y - anchor.y;
            const angle = Math.atan2(dy, dx);
            // Snap to 0, 45, 90, 135, 180, etc.
            const snapAngles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -Math.PI/4, -Math.PI/2, -3*Math.PI/4, -Math.PI];
            let minDiff = Infinity, bestAngle = 0;
            for (let a of snapAngles) {
                let diff = Math.abs(angle - a);
                if (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestAngle = a;
                }
            }
            const dist = Math.sqrt(dx*dx + dy*dy);
            coords = {
                x: Math.round(anchor.x + dist * Math.cos(bestAngle)),
                y: Math.round(anchor.y + dist * Math.sin(bestAngle))
            };
            // Only keep anchor and current snapped point
            this.currentPath.points = [anchor, coords];
        } else {
            // Only add a point if the mouse moved a minimum distance (for smoother lines)
            const last = this.currentPath.points[this.currentPath.points.length - 1];
            const minDist = 2;
            if (!last || Math.abs(coords.x - last.x) > minDist || Math.abs(coords.y - last.y) > minDist) {
                this.currentPath.points.push(coords);
            } else {
                return;
            }
        }

        // Redraw the current path segment
        this.redrawAll();
        // Draw the current path as overlay
        if (this.currentPath && this.currentPath.points.length > 1) {
            this.ctx.save();
            this.ctx.strokeStyle = this.currentPath.color;
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.beginPath();
            let pts = this.currentPath.points;
            this.ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 1; i++) {
                const xc = (pts[i].x + pts[i + 1].x) / 2;
                const yc = (pts[i].y + pts[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(
                    pts[i].x, pts[i].y,
                    xc, yc
                );
            }
            this.ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;

        this.isDrawing = false;
        delete this._drawStartPoint;
        if (this.currentPath && this.currentPath.points.length > 1) {
            this.paths.push(this.currentPath);
            console.log('Saved path with', this.currentPath.points.length, 'points');
        }
        this.currentPath = null;
        this.redrawAll(); // Redraw immediately to show the new path
    }

    startSelection(e) {
        this.selecting = true;
        const coords = this.getCanvasCoordinates(e);
        this.selectionStart = coords;
        this.selectionEnd = coords;
    }

    updateSelection(e) {
        if (!this.selecting) return;
        
        this.selectionEnd = this.getCanvasCoordinates(e);
        this.redrawAll(); // RedrawAll will now also handle drawing the selection box
    }

    finishSelection() {
        if (!this.selecting || !this.selectionStart || !this.selectionEnd) return;
        
        const deletedPathsCount = this.deletePathsInSelection();
        const deletedTextCount = this.deleteTextInSelection(); // Assuming this method returns count or is modified to
        
        this.selecting = false; // Reset selecting state first
        this.selectionStart = null;
        this.selectionEnd = null;
        this.redrawAll(); // Clear selection box and redraw remaining items
        
        console.log('Deleted', deletedPathsCount, 'paths and', deletedTextCount, 'text elements in selection');
    }

    drawSelectionBox() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.globalAlpha = 0.8;
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(x, y, width, height);
        
        const handleSize = 6;
        ctx.fillStyle = '#ff0000';
        ctx.setLineDash([]);
        ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
        ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
        ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        
        ctx.restore();
    }

    deletePathsInSelection() {
        if (!this.selectionStart || !this.selectionEnd) return 0;
        
        const minX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const maxX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const minY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const maxY = Math.max(this.selectionEnd.y, this.selectionStart.y); // Corrected: was selectionStart.y
        
        const initialCount = this.paths.length;
        
        this.paths = this.paths.filter(path => {
            const isInSelection = path.points.some(point => 
                point.x >= minX && point.x <= maxX && 
                point.y >= minY && point.y <= maxY
            );
            return !isInSelection;
        });
        
        return initialCount - this.paths.length;
    }

    deleteTextInSelection() {
        if (!this.selectionStart || !this.selectionEnd) return 0;
        
        const minX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const maxX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const minY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const maxY = Math.max(this.selectionEnd.y, this.selectionStart.y); // Corrected: was selectionStart.y
        
        let deletedCount = 0;
        this.textElements = this.textElements.filter(textEl => {
            const rect = textEl.getBoundingClientRect(); // For width/height
            const elDocX = parseFloat(textEl.dataset.docX || (rect.left + window.scrollX));
            const elDocY = parseFloat(textEl.dataset.docY || (rect.top + window.scrollY));
            
            // Check if the center of the text element is within the selection box
            const centerX = elDocX + rect.width / 2;
            const centerY = elDocY + rect.height / 2;
            
            const isInSelection = centerX >= minX && centerX <= maxX && 
                                 centerY >= minY && centerY <= maxY;
            
            if (isInSelection) {
                if (textEl.cleanupDragListeners) textEl.cleanupDragListeners(); // Clean up listeners
                textEl.remove();
                deletedCount++;
                return false;
            }
            return true;
        });
        return deletedCount;
    }

    redrawAll() {
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Smoother lines using quadratic curves
        this.paths.forEach(path => {
            if (path.points.length > 1) {
                this.ctx.strokeStyle = path.color;
                this.ctx.lineWidth = 3;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.beginPath();

                let pts = path.points;
                this.ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length - 1; i++) {
                    const xc = (pts[i].x + pts[i + 1].x) / 2;
                    const yc = (pts[i].y + pts[i + 1].y) / 2;
                    this.ctx.quadraticCurveTo(
                        pts[i].x, pts[i].y,
                        xc, yc
                    );
                }
                // last segment
                this.ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
                this.ctx.stroke();
            }
        });

        // If currently selecting, redraw the selection box as well
        if (this.selecting && this.selectionStart && this.selectionEnd) {
            this.drawSelectionBox();
        }
    }

    clearAll() {
        this.paths = [];
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Remove all text elements and their listeners
        this.textElements.forEach(textEl => {
            if (textEl.cleanupDragListeners) textEl.cleanupDragListeners();
            textEl.remove();
        });
        this.textElements = [];
    }

    undo() {
        if (this.paths.length > 0) {
            this.paths.pop();
            this.redrawAll();
        } else if (this.textElements.length > 0) {
            const lastText = this.textElements.pop();
            if (lastText.cleanupDragListeners) lastText.cleanupDragListeners();
            lastText.remove();
        }
    }

    setColor(color) {
        this.currentColor = color;
        this.updateActiveColor(color);
        localStorage.setItem('pageboard-color', color);
    }

    updateActiveColor(selectedColor) {
        const colorBtns = this.controlPanel.querySelectorAll('.pageboard-color-btn');
        colorBtns.forEach(btn => {
            btn.style.boxShadow = '0 1px 4px 0 rgba(0,0,0,0.13)';
            btn.style.border = '2.5px solid #23272f';
        });
        colorBtns.forEach(btn => {
            // Compare computed color (rgb) or hex
            const btnColor = btn.style.backgroundColor.replace(/ /g, '').toLowerCase();
            const selColor = selectedColor.replace(/ /g, '').toLowerCase();
            if (btnColor.includes(selColor) || btnColor === selColor) {
                btn.style.boxShadow = '0 0 0 3px #1e90ff, 0 1px 4px 0 rgba(0,0,0,0.13)';
                btn.style.border = '2.5px solid #1e90ff';
            }
        });
    }

    loadSavedColor() {
        const savedColor = localStorage.getItem('pageboard-color');
        if (savedColor) {
            this.currentColor = savedColor;
            this.updateActiveColor(savedColor);
        }
    }

    showInstructions() {
        console.log('🎨 PageBoard loaded with all features!');
        console.log('• Drawing Mode: Click and drag to draw');
        console.log('• Text Mode: Click to add draggable text boxes');
        console.log('• Select to Delete: Drag to select and delete drawings/text');
        console.log('• Double-click text to delete it');
        console.log('• Interact Mode: Temporarily disable canvas to interact with the page');
        console.log('• All elements work with the page!');
    }
}

// Only inject if not disabled for this site/session
(function() {
    const hostname = location.hostname;
    if (window.pageBoard) return;
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['pb_disabled_sites', 'pb_disabled_session'], function(result) {
            const disabledSites = result.pb_disabled_sites || [];
            const disabledSession = result.pb_disabled_session || [];
            if (disabledSites.includes(hostname) || disabledSession.includes(hostname)) {
                return;
            }
            window.pageBoard = new PageBoard();
        });
    } else {
        // fallback for non-extension context
        if (!window.pageBoard) window.pageBoard = new PageBoard();
    }
})();

// Listen for popup messages
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'setColor' && window.pageBoard) {
            window.pageBoard.setColor(msg.color);
        }
        if (msg.action === 'clearAll' && window.pageBoard) {
            window.pageBoard.clearAll();
        }
        if (msg.action === 'getPageBoardState' && window.pageBoard) {
            sendResponse({color: window.pageBoard.currentColor});
        }
    });
}
