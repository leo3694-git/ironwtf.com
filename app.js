/**
 * 極簡美學動態計數器 - 核心邏輯
 * Premium Dynamic Counter - Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. DOM 節點選擇與狀態初始化
    // ---------------------------------------------------------
    const counterDisplay = document.getElementById('counter-value');
    const btnIncrement = document.getElementById('btn-increment');
    const btnDecrement = document.getElementById('btn-decrement');
    const btnReset = document.getElementById('btn-reset');
    const btnTheme = document.getElementById('btn-theme');
    const htmlElement = document.documentElement;

    // 從 localStorage 讀取狀態，若無則設為預設值
    let count = parseInt(localStorage.getItem('counter-value')) || 0;
    let currentTheme = localStorage.getItem('counter-theme') || 'dark';

    // ---------------------------------------------------------
    // 2. 音效系統 (Web Audio API)
    // ---------------------------------------------------------
    let audioCtx = null;

    /**
     * 播放細緻的微音效，增強使用者回饋感
     * @param {string} type - 'up' | 'down' | 'reset' | 'toggle'
     */
    function playMicroFeedback(type) {
        try {
            // 延遲初始化 AudioContext 避免瀏覽器限制
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            const now = audioCtx.currentTime;

            if (type === 'up') {
                // 短促的高音階滑音
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(450, now);
                osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'down') {
                // 短促的低音階滑音
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(380, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'reset') {
                // 升音掃頻
                osc.type = 'sine';
                osc.frequency.setValueAtTime(261.63, now); // C4
                osc.frequency.linearRampToValueAtTime(523.25, now + 0.2); // C5
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'toggle') {
                // 輕微的啵聲
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
                gain.gain.setValueAtTime(0.03, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                osc.start(now);
                osc.stop(now + 0.04);
            }
        } catch (e) {
            console.warn('Web Audio API is not supported on this browser:', e);
        }
    }

    // ---------------------------------------------------------
    // 3. 計數器核心操作
    // ---------------------------------------------------------
    
    /**
     * 更新計數值顯示，並儲存到 localStorage
     * @param {string} animationClass - 欲觸發的動畫 CSS 類別名
     */
    function updateCounter(animationClass) {
        // 更新顯示文字
        counterDisplay.textContent = count;
        
        // 儲存狀態
        localStorage.setItem('counter-value', count);

        // 觸發動態彈跳特效
        if (animationClass) {
            // 先移除可能存在的動畫 class 以重置動畫
            counterDisplay.classList.remove('pop-up', 'pop-down', 'pop-reset');
            
            // 強制瀏覽器重繪 (Reflow) 以便重新觸發動畫
            void counterDisplay.offsetWidth;
            
            // 加入新的動畫 class
            counterDisplay.classList.add(animationClass);
        }
    }

    // 增加計數
    function increment() {
        count++;
        playMicroFeedback('up');
        updateCounter('pop-up');
    }

    // 減少計數
    function decrement() {
        count--;
        playMicroFeedback('down');
        updateCounter('pop-down');
    }

    // 重設計數
    function reset() {
        if (count === 0) return; // 已經是0就不用重置
        count = 0;
        playMicroFeedback('reset');
        updateCounter('pop-reset');
    }

    // ---------------------------------------------------------
    // 4. 事件監聽 (滑鼠/觸控)
    // ---------------------------------------------------------
    btnIncrement.addEventListener('click', increment);
    btnDecrement.addEventListener('click', decrement);
    btnReset.addEventListener('click', reset);

    // 當動畫播放完畢，自動移除 class 保持 DOM 乾淨
    counterDisplay.addEventListener('animationend', () => {
        counterDisplay.classList.remove('pop-up', 'pop-down', 'pop-reset');
    });

    // ---------------------------------------------------------
    // 5. 主題切換 (Theme Toggle)
    // ---------------------------------------------------------
    
    /**
     * 套用指定主題並保存
     * @param {string} theme - 'dark' | 'light'
     */
    function applyTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('counter-theme', theme);
        currentTheme = theme;
    }

    // 點擊主題切換按鈕
    btnTheme.addEventListener('click', () => {
        const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
        playMicroFeedback('toggle');
        applyTheme(targetTheme);
    });

    // ---------------------------------------------------------
    // 6. 鍵盤快捷鍵支援
    // ---------------------------------------------------------
    window.addEventListener('keydown', (e) => {
        // 防止當用戶在其他輸入框時觸發快捷鍵 (雖然此例無其他 input，但作為 Best Practice 保留)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'ArrowUp':
            case '+':
            case '=': // 部分鍵盤 Shift + = 是 +，不按 Shift 是 =
                e.preventDefault(); // 防止頁面捲動
                btnIncrement.classList.add('active'); // 模擬按鍵視覺效果
                increment();
                setTimeout(() => btnIncrement.classList.remove('active'), 150);
                break;
                
            case 'ArrowDown':
            case '-':
            case '_':
                e.preventDefault();
                btnDecrement.classList.add('active');
                decrement();
                setTimeout(() => btnDecrement.classList.remove('active'), 150);
                break;
                
            case 'r':
            case 'R':
                e.preventDefault();
                btnReset.classList.add('active');
                reset();
                setTimeout(() => btnReset.classList.remove('active'), 150);
                break;
        }
    });

    // ---------------------------------------------------------
    // 7. 初始化頁面呈現
    // ---------------------------------------------------------
    applyTheme(currentTheme);
    updateCounter();
});
