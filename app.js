/**
 * 極簡美學動態計數器 - 核心邏輯 (支援 Firebase 即時資料庫與 LocalStorage 雙模式)
 * Premium Dynamic Counter - Core Logic (Supports Firebase Realtime Firestore & LocalStorage Dual Mode)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================================================
// 🔑 FIREBASE 設定金鑰 (請將您在 Firebase 控制台取得的金鑰貼在下方)
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCgDfhqOgDq2yRbvsS3aLIo3eYg1gx4j5Y",
  authDomain: "ironwtf-24dbf.firebaseapp.com",
  databaseURL: "https://ironwtf-24dbf-default-rtdb.firebaseio.com",
  projectId: "ironwtf-24dbf",
  storageBucket: "ironwtf-24dbf.firebasestorage.app",
  messagingSenderId: "819550694597",
  appId: "1:819550694597:web:f4ca991673d62f756594ac",
  measurementId: "G-RTQ4162EQ4"
};

// 判斷使用者是否已經設定好金鑰
const isFirebaseConfigured = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

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

    // 讀取本地主題 (主題不需要同步到全域，保留在本地 localStorage 即可)
    let currentTheme = localStorage.getItem('counter-theme') || 'dark';
    
    // 初始化本地計數變數
    let count = 0;
    let previousCount = null; // 用於判斷資料庫數值變動的 Delta

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
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(450, now);
                osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'down') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(380, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'reset') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(261.63, now); // C4
                osc.frequency.linearRampToValueAtTime(523.25, now + 0.2); // C5
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'toggle') {
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
    // 3. UI 畫面更新邏輯
    // ---------------------------------------------------------
    
    /**
     * 更新計數值顯示，並觸發動態彈跳特效
     * @param {number} value - 計數值
     * @param {string} animationClass - 欲觸發的動畫 CSS 類別名 ('pop-up' | 'pop-down' | 'pop-reset')
     */
    function updateCounterUI(value, animationClass) {
        counterDisplay.textContent = value;

        if (animationClass) {
            counterDisplay.classList.remove('pop-up', 'pop-down', 'pop-reset');
            void counterDisplay.offsetWidth; // 強制 Reflow 重置動畫
            counterDisplay.classList.add(animationClass);
        }
    }

    // ---------------------------------------------------------
    // 4. 資料庫 (Firebase) 或 本地儲存 (LocalStorage) 控制核心
    // ---------------------------------------------------------

    let db = null;
    let counterDocRef = null;

    if (isFirebaseConfigured) {
        console.log("⚡ Firebase 模式啟動：計數器已連線至雲端即時資料庫。");
        // 初始化 Firebase
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        // 設定全域計數器文件位置：/counters/global
        counterDocRef = doc(db, "counters", "global");

        // 監聽雲端資料庫變更 (多視窗、無痕模式、跨裝置即時同步)
        onSnapshot(counterDocRef, async (docSnap) => {
            if (!docSnap.exists()) {
                // 如果資料庫中還沒有這個文件，則進行初始化
                await setDoc(counterDocRef, { value: 0 });
                return;
            }

            const data = docSnap.data();
            const cloudValue = data.value ?? 0;

            if (previousCount === null) {
                // 首次載入：直接顯示數值，不觸發聲音與動畫
                count = cloudValue;
                previousCount = cloudValue;
                updateCounterUI(cloudValue, null);
            } else if (cloudValue !== previousCount) {
                // 數值有變動：計算 Delta 決定動畫與音效
                const delta = cloudValue - previousCount;
                count = cloudValue;
                previousCount = cloudValue;

                if (cloudValue === 0) {
                    playMicroFeedback('reset');
                    updateCounterUI(cloudValue, 'pop-reset');
                } else if (delta > 0) {
                    playMicroFeedback('up');
                    updateCounterUI(cloudValue, 'pop-up');
                } else if (delta < 0) {
                    playMicroFeedback('down');
                    updateCounterUI(cloudValue, 'pop-down');
                }
            }
        }, (error) => {
            console.error("Firestore 連線錯誤：", error);
        });

    } else {
        console.warn("⚠️ Firebase 未設定。目前運作於「本地儲存 (LocalStorage) 模式」。資料在無痕模式下將無法跨視窗或永久儲存。");
        // 從 localStorage 讀取狀態，若無則設為預設值 0
        count = parseInt(localStorage.getItem('counter-value')) || 0;
        updateCounterUI(count, null);
    }

    // ---------------------------------------------------------
    // 5. 使用者點擊操作函數
    // ---------------------------------------------------------

    // 增加計數
    async function increment() {
        if (isFirebaseConfigured) {
            // 使用 Firestore 原子操作 increment 避免多人點擊衝突
            try {
                await updateDoc(counterDocRef, { value: increment(1) });
            } catch (e) {
                // 防止文件尚未建立時更新失敗
                await setDoc(counterDocRef, { value: count + 1 });
            }
        } else {
            count++;
            localStorage.setItem('counter-value', count);
            playMicroFeedback('up');
            updateCounterUI(count, 'pop-up');
        }
    }

    // 減少計數
    async function decrement() {
        if (isFirebaseConfigured) {
            try {
                await updateDoc(counterDocRef, { value: increment(-1) });
            } catch (e) {
                await setDoc(counterDocRef, { value: count - 1 });
            }
        } else {
            count--;
            localStorage.setItem('counter-value', count);
            playMicroFeedback('down');
            updateCounterUI(count, 'pop-down');
        }
    }

    // 重設計數
    async function reset() {
        if (count === 0) return;
        if (isFirebaseConfigured) {
            await setDoc(counterDocRef, { value: 0 });
        } else {
            count = 0;
            localStorage.setItem('counter-value', count);
            playMicroFeedback('reset');
            updateCounterUI(count, 'pop-reset');
        }
    }

    // ---------------------------------------------------------
    // 6. 事件監聽 (滑鼠/觸控/鍵盤)
    // ---------------------------------------------------------
    btnIncrement.addEventListener('click', increment);
    btnDecrement.addEventListener('click', decrement);
    btnReset.addEventListener('click', reset);

    // 當動畫播放完畢，自動移除 class 保持 DOM 乾淨
    counterDisplay.addEventListener('animationend', () => {
        counterDisplay.classList.remove('pop-up', 'pop-down', 'pop-reset');
    });

    // 主題切換 (主題只留在本機，不需同步到資料庫)
    function applyTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('counter-theme', theme);
        currentTheme = theme;
    }

    btnTheme.addEventListener('click', () => {
        const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
        playMicroFeedback('toggle');
        applyTheme(targetTheme);
    });

    // 鍵盤快捷鍵支援
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'ArrowUp':
            case '+':
            case '=':
                e.preventDefault();
                btnIncrement.classList.add('active');
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

    // 初始化頁面主題
    applyTheme(currentTheme);
});
