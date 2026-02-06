let ws = null;
let sessionId = null;

function log(message, type = 'info') {
    const logsDiv = document.getElementById('logs');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    logsDiv.appendChild(entry);
    logsDiv.scrollTop = logsDiv.scrollHeight;
    console.log(message);
}

function setStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
}

function connect() {
    sessionId = document.getElementById('sessionId').value.trim();
    const relayUrl = document.getElementById('relayUrl').value.trim();

    if (!sessionId) {
        alert('Please enter a session ID');
        return;
    }

    // Build the full WebSocket URL with the mobile path
    const fullUrl = `${relayUrl}/mobile/${sessionId}`;

    log(`Connecting to relay: ${fullUrl}`);
    log(`Session ID: ${sessionId}`);
    setStatus('Connecting...', 'connecting');

    try {
        ws = new WebSocket(fullUrl);

        ws.onopen = () => {
            log('WebSocket connected');

            // Send join message
            const joinMessage = {
                type: 'join',
                role: 'mobile',
                sessionId: sessionId
            };
            ws.send(JSON.stringify(joinMessage));
            log(`Sent join message: ${JSON.stringify(joinMessage)}`);

            setStatus(`Connected to session: ${sessionId}`, 'connected');
            document.getElementById('connectBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = false;
        };

        ws.onmessage = (event) => {
            log(`Received message: ${event.data.substring(0, 200)}...`);

            try {
                const message = JSON.parse(event.data);
                handleMessage(message);
            } catch (error) {
                log(`Error parsing message: ${error.message}`, 'error');
            }
        };

        ws.onerror = (error) => {
            log(`WebSocket error: ${error}`, 'error');
            setStatus('Connection error', 'error');
        };

        ws.onclose = () => {
            log('WebSocket closed');
            setStatus('Disconnected', 'error');
            document.getElementById('connectBtn').disabled = false;
            document.getElementById('disconnectBtn').disabled = true;
        };

    } catch (error) {
        log(`Connection error: ${error.message}`, 'error');
        setStatus(`Error: ${error.message}`, 'error');
    }
}

function disconnect() {
    if (ws) {
        log('Disconnecting...');
        ws.close();
        ws = null;
    }
    // Update UI immediately
    setStatus('Disconnected', 'error');
    document.getElementById('connectBtn').disabled = false;
    document.getElementById('disconnectBtn').disabled = true;
}

function handleMessage(message) {
    log(`Message type: ${message.type}`);

    switch (message.type) {
        case 'connected':
            log('Successfully connected to relay');
            break;

        case 'joined':
            log('Successfully joined session');
            break;

        case 'desktop_connected':
            log('Desktop app connected to session');
            break;

        case 'bundle':
        case 'bundle_update':
            const bundleCode = message.code || message.payload?.code;
            log(`Received bundle (${bundleCode?.length || 0} bytes)`);
            executeBundle(bundleCode);
            break;

        case 'error':
            log(`Error from relay: ${message.message}`, 'error');
            setStatus(`Error: ${message.message}`, 'error');
            break;

        default:
            log(`Unknown message type: ${message.type}`);
    }
}

function executeBundle(bundleCode) {
    log('Executing bundle...');
    const outputDiv = document.getElementById('bundleOutput');

    try {
        // Create a simple React-like render function
        window.React = {
            createElement: (type, props, ...children) => {
                log(`createElement: ${type}`);
                const element = document.createElement(type === 'View' ? 'div' : type === 'Text' ? 'span' : type);

                if (props) {
                    if (props.style) {
                        Object.assign(element.style, props.style);
                    }
                    if (props.onClick || props.onPress) {
                        element.onclick = props.onClick || props.onPress;
                    }
                }

                children.forEach(child => {
                    if (typeof child === 'string') {
                        element.appendChild(document.createTextNode(child));
                    } else if (child) {
                        element.appendChild(child);
                    }
                });

                return element;
            },
            useState: (initial) => {
                let value = initial;
                const setState = (newValue) => {
                    value = typeof newValue === 'function' ? newValue(value) : newValue;
                    log(`State updated: ${value}`);
                };
                return [value, setState];
            }
        };

        window.ReactNative = {
            View: 'View',
            Text: 'Text',
            TouchableOpacity: 'button',
            StyleSheet: {
                create: (styles) => styles
            }
        };

        // Execute the bundle
        log('Running bundle code...');
        const result = eval(bundleCode);

        log('Bundle executed successfully');
        outputDiv.innerHTML = '<div style="padding: 16px; background: #d4edda; border-radius: 8px; color: #155724;">✓ Bundle loaded and executed</div>';

        // Send acknowledgment
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'ack',
                success: true
            }));
            log('Sent acknowledgment to relay');
        }

    } catch (error) {
        log(`Bundle execution error: ${error.message}`, 'error');
        outputDiv.innerHTML = `<div style="padding: 16px; background: #f8d7da; border-radius: 8px; color: #721c24;">Error: ${error.message}</div>`;

        // Send error acknowledgment
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'ack',
                success: false,
                error: error.message
            }));
        }
    }
}

// Initialize
log('Test client loaded');
log('Ready to connect to relay');
