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
import { EmojiButton } from 'https://cdn.jsdelivr.net/npm/@joeattardi/emoji-button@4.6.2/dist/index.js';

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
  const nick = nickInput.value.trim() || "匿名";

  // 🎵 Audio setup with error handling
  const sendSound = new Audio("audio/61 完成任務.mp3");
  sendSound.volume = 0.4;
  
  // 🔓 Unlock audio for iOS/Safari
  document.addEventListener("click", () => {
    sendSound.play()
      .then(() => {
        sendSound.pause();
        sendSound.currentTime = 0;
      })
      .catch(err => console.warn("⚠️ iOS audio unlock failed:", err));
  }, { once: true });
  
  // 🧠 Track message keys
  const msgKeyOrder = [];

  // 🎉 Initialize EmojiButton picker
  const picker = new EmojiButton({
    position: 'top-end',
    rootElement: document.body, // ensures it's not nested inside scroll containers
    zIndex: 9999, // ensure visibility
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
  let initialLoadComplete = false;
  let initialMessageCount = 0;
  
  function isMobileDevice() {
    return /Mobi|Android|iPad|iPhone|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
  }

  onChildAdded(messagesRef, snapshot => {
    const msg = snapshot.val();
    const key = snapshot.key;

    if (document.querySelector(`li[data-key="${key}"]`)) return;
    msgKeyOrder.push(key);
    renderMessage(msg, key);
    
    // 💖 Trigger floating heart and sound on *every device* when a new message arrives
    if (initialLoadComplete) {
      showFloatingHeartSwarm();// 👈 Only animate for *new* messages
      showNewMessagePopup(msg.nick, msg.text);// 👈 Only animate for *new* messages
      if (!isMobileDevice()) {
        sendSound.play().catch(err => console.warn("🔇 無法播放音效：", err.message));
      }

    } else {
      initialMessageCount++;
    }
  });
  // ✅ Delay marking initial load complete
  setTimeout(() => {
    initialLoadComplete = true;
  }, 1500);

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

    localStorage.setItem("userNick", nick);

    const msg = {
      nick,
      text,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      color: randomColor()
    };

    push(messagesRef, msg).then(() => {
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
      <button class="delete-btn">🗑️</button>
    `;
    // ✅ Only show delete button if nickname matches
    const currentNick = localStorage.getItem("userNick");
    if (currentNick && currentNick === msg.nick) {
      const deleteBtn = li.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", () => {
        if (confirm("確定要刪除這則留言嗎？")) {
          deleteMessage(key);
        }
    });
  } else {
    // Hide the delete button for others
    li.querySelector(".delete-btn").style.display = "none";
  }
    
    list.appendChild(li);
    listWrapper.scrollTop = listWrapper.scrollHeight;
  }
// ✅ Function to delete message from Firebase
  function deleteMessage(key) {
    const msgRef = ref(db, `messages/${key}`);
    remove(msgRef)
      .then(() => {
        console.log(`✅ Message ${key} deleted`);
      })
      .catch((error) => {
        console.error("❌ Failed to delete message:", error);
      });
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
  function showFloatingHeartSwarm() {
    const container = document.getElementById('heart-container');
    const heartEmojis = ['💖', '💗', '💘', '❤️', '💕'];
    const numHearts = 10; // how many to generate per burst

    for (let i = 0; i < numHearts; i++) {
      const heart = document.createElement('div');
      heart.classList.add('heart');
      heart.innerText = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];

      // Random horizontal position
      heart.style.left = Math.random() * 100 + 'vw';

      // Random vertical offset to stagger appearance
      heart.style.bottom = Math.random() * 50 + 'px';

      // Random animation duration and delay
      const duration = 2 + Math.random() * 2; // 2s to 4s
      const delay = Math.random() * 0.5;

      heart.style.animation = `floatUp ${duration}s ease-out ${delay}s forwards`;

      container.appendChild(heart);

      // Remove after animation completes
      setTimeout(() => heart.remove(), (duration + delay) * 1000);
    }
  }

  
  // --- ✅ Dynamically load QRious and generate QR code ---
  function loadQRiousAndInit() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js';
    script.onload = () => {
      const qrCanvas = document.getElementById("qr-code");
      if (window.QRious && qrCanvas) {
        new QRious({
          element: qrCanvas,
          value: 'https://liuyaochia.github.io/Weddingdesign/front-end-coding-learning/pinny.html',
          size: 120
        });
      } else {
        console.warn("⚠️ QRious failed to load or canvas not found.");
      }
    };
    script.onerror = () => {
      console.error("❌ Failed to load QRious script.");
    };
    document.head.appendChild(script);
  }

  // Load QRious on page load
  loadQRiousAndInit();

  //  Show the popup
  function showNewMessagePopup(nick, text) {
    const popup = document.getElementById("new-msg-popup");
    const container = document.querySelector('.screen');

    popup.innerHTML = `<strong>${escapeHtml(nick)}</strong>: ${escapeHtml(text)}`;
    popup.classList.add("show");

    // Popup size based on CSS max-width and min-height
    const popupWidth = 320;
    const popupHeight = 100;

    // Calculate max available positions inside container
    const maxLeft = container.clientWidth - popupWidth;
    const maxTop = container.clientHeight - popupHeight;

    // Random position inside the video panel
    const randomLeft = Math.floor(Math.random() * maxLeft);
    const randomTop = Math.floor(Math.random() * maxTop);

    popup.style.left = randomLeft + "px";
    popup.style.top = randomTop + "px";

    // Hide popup after 2.5 seconds
    setTimeout(() => {
      popup.classList.remove("show");
    }, 2500);
  }
});
