import fs from 'node:fs/promises';

const target = (await (await fetch('http://localhost:9222/json')).json()).find((item) => item.type === 'page');
if (!target) throw new Error('브라우저 페이지를 찾을 수 없습니다.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
await new Promise((resolve) => { socket.onopen = resolve; });
const send = (method, params = {}) => new Promise((resolve) => { const requestId = ++id; pending.set(requestId, resolve); socket.send(JSON.stringify({ id: requestId, method, params })); });
const wait = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
const clickText = async (text) => { await evaluate(`(() => { const items = [...document.querySelectorAll('*')]; const node = items.find((item) => item.children.length === 0 && item.textContent.trim() === ${JSON.stringify(text)}); if (!node) return false; (node.closest('[role="button"]') || node).click(); return true; })()`); await wait(); };
const capture = async (name) => { await evaluate('window.scrollTo(0, 0)'); const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await fs.mkdir('screenshots/pricego-2.0', { recursive: true }); await fs.writeFile(`screenshots/pricego-2.0/${name}.png`, Buffer.from(result.result.data, 'base64')); };

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: 'http://localhost:8090' }); await wait(5000);
await capture('01-home');
await send('Page.navigate', { url: 'http://localhost:8090/?screen=scan' }); await wait(1500); await capture('02-scan');
await evaluate(`(() => { const node = [...document.querySelectorAll('*')].find((item) => item.children.length === 0 && item.textContent.trim() === '가격 스캔'); if (!node) return false; let fiber; for (let current = node; current && !fiber; current = current.parentElement) { const key = Object.keys(current).find((name) => name.startsWith('__reactFiber$')); if (key) fiber = current[key]; } while (fiber) { const hook = fiber.memoizedState; if (hook?.queue?.dispatch && hook.memoizedState === null && hook.next?.memoizedState === false) { hook.queue.dispatch({ rawText: 'Pho Bo 200000 VND / Coffee 35000 VND', confidence: 'high', items: [{ translatedMenuName: '쌀국수', amount: 200000, currency: 'VND' }, { translatedMenuName: '커피', amount: 35000, currency: 'VND' }] }); return true; } fiber = fiber.return; } return false; })()`); await wait(); await capture('03-ocr-result');
await send('Page.navigate', { url: 'http://localhost:8090/?screen=manual-input' }); await wait(1500); await capture('04-direct-input');
await send('Page.navigate', { url: 'http://localhost:8090/?screen=history' }); await wait(1500); await capture('05-history');
await send('Page.navigate', { url: 'http://localhost:8090/?screen=exchange-rate' }); await wait(1500); await capture('06-exchange-rate');
await send('Page.navigate', { url: 'http://localhost:8090/?screen=settings' }); await wait(1500); await capture('07-settings');
await send('Browser.close');
socket.close();
