// 🔧 Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 🎉 Import Emoji Button from Skypack CDN
import EmojiButton from 'https://cdn.jsdelivr.net/npm/@joeattardi/emoji-button@4.5.2/dist/emoji-button.min.js';

localStorage.removeItem("firebase:previous_websocket_failure");

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCLm14rMw4cfu05Nr4UGke4PaHVExAqBPM",
  authDomain: "pinny-c0821.firebaseapp.com",
  projectId: "pinny-c0821",
  storageBucket: "pinny-c0821.firebasestorage.app",
  messagingSenderId: "267528625996",
  appId: "1:267528625996:web:349d83b09740046dbb79e9"
};

// 🕓 Ensure DOM is ready before initializing
document.addEventListener("DOMContentLoaded", () => {
  // 🔌 Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app, "https://pinny-c0821-default-rtdb.asia-southeast1.firebasedatabase.app");
  const messagesRef = ref(db, "messages");

  // 🔧 DOM Elements
  const form = document.getElementById("msg-form");
  const list = document.getElementById("msg-list");
  const nickInput = document.getElementById("nickname");
  const textInput = document.getElementById("message");
  const removeBtn = document.getElementById("remove-latest");
  const listWrapper = document.querySelector('.msg-list-wrapper');
  const button = document.getElementById("emoji-button");
  const messageInput = textInput; // same element

  // 🎵 Audio setup with error handling
  const sendSound = new Audio("audio/applause-cheer-236786.mp3");
  sendSound.volume = 0.4;

  // 🧠 Track message keys
  const msgKeyOrder = [];

  // 🎉 Initialize EmojiButton picker
  const picker = new EmojiButton({
    position: 'bottom-start',
    autoHide: true
  });

  // Insert emoji into input when selected
  picker.on('emoji', selection => {
    messageInput.value += selection.emoji;
    messageInput.focus();
  });

  // Toggle picker on button click
  button.addEventListener('click', () => {
    picker.togglePicker(button);
  });

  // 📩 Listen for new messages
  onChildAdded(messagesRef, snapshot => {
    const msg = snapshot.val();
    const key = snapshot.key;

    if (document.querySelector(`li[data-key="${key}"]`)) return;
    msgKeyOrder.push(key);
    renderMessage(msg, key);
  });

  // ❌ Listen for deletions
  onChildRemoved(messagesRef, snapshot => {
    const key = snapshot.key;
    const li = document.querySelector(`li[data-key="${key}"]`);
    if (li) li.remove();

    const index = msgKeyOrder.indexOf(key);
    if (index !== -1) msgKeyOrder.splice(index, 1);
  });

  // ✅ Submit handler
  form.addEventListener("submit", e => {
    e.preventDefault();
    const nick = nickInput.value.trim() || "匿名";
    const text = textInput.value.trim();
    if (!text) return;

    const msg = {
      nick,
      text,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      color: randomColor()
    };

    push(messagesRef, msg).then(() => {
      sendSound.play().catch(err => console.warn("🔇 無法播放音效：", err.message));
      showFloatingHeart();
      textInput.value = "";

      textInput.style.border = "2px solid #5f6bc2";
      setTimeout(() => textInput.style.border = "", 300);
    });
  });

  // ❌ Admin delete all
  removeBtn.addEventListener("click", async () => {
    const pass = prompt("請輸入管理密碼以清除所有留言：");
    if (pass !== "1234") {
      alert("密碼錯誤！");
      return;
    }

    const confirmed = confirm("⚠️ 你確定要清除所有留言嗎？這將永久刪除資料！");
    if (!confirmed) return;

    try {
      await remove(messagesRef);
      msgKeyOrder.length = 0;
      list.innerHTML = "";
      alert("✅ 所有留言已清除！");
    } catch (err) {
      console.error(err);
      alert("❌ 清除失敗，請檢查網路或權限設定。");
    }
  });

  // 🧱 Render function
  function renderMessage(msg, key) {
    const avatarText = escapeHtml(msg.nick.trim().charAt(0) || "❓"); // fallback avatar

    const li = document.createElement("li");
    li.className = "msg-item";
    li.dataset.key = key;
    li.innerHTML = `
      <div class="msg-avatar" style="background-color: ${msg.color}">
        ${avatarText}
      </div>
      <div class="msg-content">
        <div class="name">${escapeHtml(msg.nick)}</div>
        <div class="text">${escapeHtml(msg.text)}</div>
        <div class="time">${msg.time}</div>
      </div>
    `;
    list.appendChild(li);
    listWrapper.scrollTop = listWrapper.scrollHeight;
  }

  // 🎨 Generate pastel color
  function randomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 60%)`;
  }

  // 🧼 Escape HTML
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  }
  
  // 💖 Floating heart animation
  const heartEmojis = ['💖', '💗', '💘', '❤️', '💕'];

  function showFloatingHeart() {
    const container = document.getElementById('heart-container');
    const heart = document.createElement('div');
    heart.classList.add('heart');
    heart.innerText = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
    heart.style.left = Math.random() * window.innerWidth + 'px';
    heart.style.bottom = '50px';
    container.appendChild(heart);
    setTimeout(() => heart.remove(), 2000);
  }
  // --- QR Code generation setup ---

  function initQR() {
    const qrCanvas = document.getElementById("qr-code");
    if (qrCanvas && window.QRious) {
      new QRious({
        element: qrCanvas,
        value: 'https://liuyaochia.github.io/Weddingdesign/front-end-coding-learning/pinny.html',
        size: 120
      });
    } else {
      console.warn("⚠️ QRious 未加載或找不到畫布元素。");
    }
  }

  // Wait for QRious script to load before initializing QR code
  const qrScript = document.getElementById('qrious-script');
  if (qrScript) {
    if (qrScript.readyState === 'complete' || qrScript.readyState === 'loaded') {
      initQR();
    } else {
      qrScript.addEventListener('load', initQR);
    }
  } else {
    console.warn('⚠️ 找不到 QRious script 標籤');
  }
});
