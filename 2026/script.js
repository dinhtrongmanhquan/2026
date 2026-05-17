window.moduleLoaded = true;

// Polyfill Firebase modular API using compat library for local file:// execution
const initializeApp = (config, name) => firebase.initializeApp(config, name);
const getDatabase = (app) => firebase.database(app);
const ref = (db, path) => db.ref(path);
const set = (r, val) => r.set(val);
const get = (r) => r.get();
const push = (r, val) => val === undefined ? r.push() : r.push(val);
const update = (r, val) => r.update(val);
const remove = (r) => r.remove();
const onValue = (r, cb, errCb) => { r.on('value', cb, errCb); return () => r.off('value', cb); };
const onChildAdded = (r, cb) => { r.on('child_added', cb); return () => r.off('child_added', cb); };
const off = (r) => r.off();
const serverTimestamp = () => firebase.database.ServerValue.TIMESTAMP;
const onDisconnect = (r) => r.onDisconnect();

// ================================================================
// FIREBASE CONFIG & INIT
// ================================================================

window.APP = {};
const APP = window.APP;

let db = null; // Firebase database instance
const _activeConvIds = new Set();
const _lastMsgsMap = new Map();

const firebaseConfig = {
  apiKey: "AIzaSyCE9Q49LGTrP5xJzArNNmKfkJg5v2cO5Fk",
  authDomain: "chatteam-84bef.firebaseapp.com",
  databaseURL: "https://chatteam-84bef-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chatteam-84bef",
  storageBucket: "chatteam-84bef.firebasestorage.app",
  messagingSenderId: "927580930370",
  appId: "1:927580930370:web:f0ee4260a54d82eafcc8db",
  measurementId: "G-1PKJFN5LR6"
};

async function tryInitFirebase(config) {
  try {
    const app = initializeApp(config, 'cntt1808_' + Date.now());
    db = getDatabase(app);
    return true;
  } catch (e) {
    throw e;
  }
}

async function boot() {
  Object.keys(DB).forEach(key => {
    if (typeof DB[key] === 'function') {
      DB[key] = async () => { return []; };
    }
  });
  DB.listenUsers = (cb) => cb([]);
  DB.listenPresence = (cb) => cb({});
  DB.listenMessages = (id, cb) => { };
  DB.listenFriends = (id, cb) => cb([]);
  DB.listenRequests = (cb) => cb([]);
  DB.listenGroups = (cb) => cb([]);
  DB.listenPosts = (cb) => cb([]);
  DB.listenStories = (cb) => cb([]);

  hideFbLoading();
  try {
    await startApp();
  } catch (e) {
    console.error(e);
  }
}

function hideFbLoading() {
  const loader = document.getElementById('fbLoading');
  if (loader) loader.style.display = 'none';
  const auth = document.getElementById('authScreen');
  if (auth) auth.classList.remove('hidden');
}

function getBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) resolve("");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// ================================================================
// DATABASE HELPERS
// ================================================================
const DB = {
  async getUsers() {
    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) return [];
    return Object.values(snap.val());
  },
  async saveUser(user) {
    await set(ref(db, 'users/' + user.id), user);
  },
  async updateUser(userId, data) {
    await update(ref(db, 'users/' + userId), data);
  },
  listenUsers(cb) {
    onValue(ref(db, 'users'), snap => {
      cb(snap.exists() ? Object.values(snap.val()) : []);
    });
  },

  setPresence(userId) {
    const presRef = ref(db, 'presence/' + userId);
    const connRef = ref(db, '.info/connected');
    onValue(connRef, snap => {
      if (snap.val() === true) {
        set(presRef, { online: true, lastSeen: Date.now() });
        onDisconnect(presRef).set({ online: false, lastSeen: Date.now() });
      }
    });
  },
  listenPresence(cb) {
    onValue(ref(db, 'presence'), snap => {
      const presenceMap = {};
      if (snap.exists()) {
        snap.forEach(child => {
          presenceMap[child.key] = child.val();
        });
      }
      cb(presenceMap);
    });
  },

  async getMessages(convId) {
    const snap = await get(ref(db, 'messages/' + convId));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([key, val]) => {
      val._fbKey = key;
      return val;
    }).sort((a, b) => a.time - b.time);
  },
  async saveMessage(convId, msg) {
    await push(ref(db, 'messages/' + convId), msg);
  },
  listenMessages(convId, cb) {
    return onChildAdded(ref(db, 'messages/' + convId), snap => {
      const val = snap.val();
      if (val) val._fbKey = snap.key;
      cb(val);
    });
  },
  stopListenMessages(convId) {
    off(ref(db, 'messages/' + convId));
  },
  async deleteMessage(convId, fbKey) {
    await remove(ref(db, `messages/${convId}/${fbKey}`));
  },
  async clearChat(convId) {
    await remove(ref(db, `messages/${convId}`));
  },

  async getFriends(userId) {
    const snap = await get(ref(db, 'friends/' + userId));
    if (!snap.exists()) return [];
    return Object.keys(snap.val());
  },
  async addFriend(userId1, userId2) {
    await update(ref(db, 'friends/' + userId1), { [userId2]: true });
    await update(ref(db, 'friends/' + userId2), { [userId1]: true });
  },
  async removeFriend(userId1, userId2) {
    await remove(ref(db, 'friends/' + userId1 + '/' + userId2));
    await remove(ref(db, 'friends/' + userId2 + '/' + userId1));
  },
  listenFriends(userId, cb) {
    onValue(ref(db, 'friends/' + userId), snap => {
      cb(snap.exists() ? Object.keys(snap.val()) : []);
    });
  },

  async getRequests() {
    const snap = await get(ref(db, 'friendRequests'));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([k, v]) => ({ id: k, ...v }));
  },
  async sendRequest(fromId, toId) {
    const existing = await this.getRequests();
    const dup = existing.find(r => r.fromId === fromId && r.toId === toId && r.status === 'pending');
    if (dup) return;
    const newRef = push(ref(db, 'friendRequests'));
    await set(newRef, { fromId, toId, status: 'pending', time: Date.now() });
  },
  async updateRequest(reqId, status) {
    await update(ref(db, 'friendRequests/' + reqId), { status });
  },
  async deleteRequest(reqId) {
    await remove(ref(db, 'friendRequests/' + reqId));
  },
  listenRequests(cb) {
    onValue(ref(db, 'friendRequests'), snap => {
      cb(snap.exists() ? Object.entries(snap.val()).map(([k, v]) => ({ id: k, ...v })) : []);
    });
  },

  async getGroups() {
    const snap = await get(ref(db, 'groups'));
    if (!snap.exists()) return [];
    return Object.values(snap.val());
  },
  async saveGroup(group) {
    await set(ref(db, 'groups/' + group.id), group);
  },
  async updateGroup(groupId, data) {
    await update(ref(db, 'groups/' + groupId), data);
  },
  listenGroups(cb) {
    onValue(ref(db, 'groups'), snap => {
      cb(snap.exists() ? Object.values(snap.val()) : []);
    });
  },

  listenPosts(cb) {
    onValue(ref(db, 'posts'), snap => {
      cb(snap.exists() ? Object.entries(snap.val()).map(([k, v]) => ({ id: k, ...v })) : []);
    });
  },
  async savePost(post) {
    const newRef = push(ref(db, 'posts'));
    await set(newRef, post);
  },
  async updatePost(postId, data) {
    await update(ref(db, 'posts/' + postId), data);
  },
  listenStories(cb) {
    onValue(ref(db, 'stories'), snap => {
      cb(snap.exists() ? Object.entries(snap.val()).map(([k, v]) => ({ id: k, ...v })) : []);
    });
  },
  async saveStory(story) {
    const newRef = push(ref(db, 'stories'));
    await set(newRef, story);
  },

  async deletePost(postId) {
    await remove(ref(db, 'posts/' + postId));
  },

  async createCall(callData) {
    const newRef = push(ref(db, 'calls'));
    await set(newRef, callData);
    return newRef.key;
  },
  async updateCall(callId, data) {
    await update(ref(db, 'calls/' + callId), data);
  },
  async getCall(callId) {
    const snap = await get(ref(db, 'calls/' + callId));
    return snap.exists() ? snap.val() : null;
  },
  listenCall(callId, cb) {
    return onValue(ref(db, 'calls/' + callId), snap => cb(snap.val()));
  },
  listenCalls(myId, cb) {
    return onValue(ref(db, 'calls'), snap => {
      if (!snap.exists()) return;
      snap.forEach(child => cb(child.key, child.val()));
    });
  },
  async pushIceCandidate(callId, role, candidate) {
    await push(ref(db, `calls/${callId}/candidates/${role}`), candidate);
  },
  listenIceCandidates(callId, role, cb) {
    return onChildAdded(ref(db, `calls/${callId}/candidates/${role}`), snap => cb(snap.val()));
  }
};

APP.currentUser = null;
APP.activeConvId = null;
APP.activeConvType = null;
APP.activeConvTarget = null;

let _allUsers = [];
let _friendIds = [];
let _allRequests = [];
let _allGroups = [];
let _presenceMap = {};
let _msgUnsubscribe = null;
let _knownUserIds = new Set();

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = new Date() - d;
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' phút';
  if (diff < 86400000) return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  return d.getDate() + '/' + (d.getMonth() + 1);
}
function validPhone(p) { return /^0[0-9]{9}$/.test(p); }
function getConvId(uid1, uid2) { return [uid1, uid2].sort().join('_'); }
function isOnline(userId) {
  const p = _presenceMap[userId];
  if (!p) return false;
  return p.online === true && (Date.now() - (p.lastSeen || 0)) < 60000;
}
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  setTimeout(() => t.className = 'toast hidden', 3000);
}
function isFriend(uid) { return _friendIds.includes(uid); }
function hasPendingRequestTo(uid) {
  return _allRequests.some(r => r.fromId === APP.currentUser.id && r.toId === uid && r.status === 'pending');
}
function hasPendingRequestFrom(uid) {
  return _allRequests.some(r => r.fromId === uid && r.toId === APP.currentUser.id && r.status === 'pending');
}

const authScreen = document.getElementById('authScreen');
const chatScreen = document.getElementById('chatScreen');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotForm = document.getElementById('forgotForm');
const msgEl = document.getElementById('message');

function showForm(type) {
  [loginForm, registerForm, forgotForm].forEach(f => f.classList.remove('active'));
  [loginTab, registerTab].forEach(t => t.classList.remove('active'));
  msgEl.textContent = ''; msgEl.className = 'message';
  if (type === 'login') { loginForm.classList.add('active'); loginTab.classList.add('active'); }
  if (type === 'register') { registerForm.classList.add('active'); registerTab.classList.add('active'); }
  if (type === 'forgot') forgotForm.classList.add('active');
}
function showMsg(text, cls) { msgEl.textContent = text; msgEl.className = 'message ' + cls; }

loginTab.onclick = () => showForm('login');
registerTab.onclick = () => showForm('register');
document.getElementById('goRegister').onclick = () => showForm('register');
document.getElementById('goLogin').onclick = () => showForm('login');
document.getElementById('forgotBtn').onclick = () => showForm('forgot');
document.getElementById('backLogin').onclick = () => showForm('login');

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const account = document.getElementById('loginAccount').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!account || !password) { showMsg('Vui lòng nhập đầy đủ thông tin.', 'error'); return; }
  showMsg('Đang đăng nhập...', '');
  const users = await DB.getUsers();
  const user = users.find(u => u && (u.phone === account || (u.name && u.name.toLowerCase() === account.toLowerCase())));
  if (!user) { showMsg('Không tìm thấy tài khoản.', 'error'); return; }
  if (user.password !== password) { showMsg('Mật khẩu không đúng.', 'error'); return; }
  APP.currentUser = user;
  localStorage.setItem('cntt1808_session', user.id);
  showMsg('Đăng nhập thành công! Chào ' + user.name, 'success');
  setTimeout(enterChat, 800);
});

registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const confirm = document.getElementById('regConfirm').value.trim();
  if (!name || !phone || !password || !confirm) { showMsg('Vui lòng nhập đầy đủ.', 'error'); return; }
  if (!validPhone(phone)) { showMsg('Số điện thoại không hợp lệ.', 'error'); return; }
  if (password.length < 6) { showMsg('Mật khẩu phải ít nhất 6 ký tự.', 'error'); return; }
  if (password !== confirm) { showMsg('Mật khẩu không khớp.', 'error'); return; }
  showMsg('Đang tạo tài khoản...', '');
  const users = await DB.getUsers();
  if (users.some(u => u.phone === phone)) { showMsg('Số điện thoại đã được đăng ký.', 'error'); return; }
  const avatars = ['🧑', '👩', '👦', '👧', '🧑‍💻', '👩‍💻', '👨‍🎓', '👩‍🎓', '🦸', '🧙'];
  const newUser = {
    id: 'u_' + Date.now(),
    name, phone, password,
    avatar: avatars[Math.floor(Math.random() * avatars.length)],
    status: 'online',
    registeredAt: Date.now()
  };
  await DB.saveUser(newUser);
  APP.currentUser = newUser;
  localStorage.setItem('cntt1808_session', newUser.id);
  showMsg('Đăng ký thành công! Đang đăng nhập...', 'success');
  setTimeout(enterChat, 1000);
});

async function startApp() {
  authScreen.classList.remove('hidden');
  const savedSession = localStorage.getItem('cntt1808_session');
  if (savedSession) {
    const users = await DB.getUsers();
    const user = users.find(u => u.id === savedSession);
    if (user) {
      APP.currentUser = user;
      enterChat();
      return;
    }
  }
}

function enterChat() {
  document.body.classList.add('chat-active');
  authScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  initChat();
}

async function initChat() {
  const u = APP.currentUser;
  document.getElementById('myName').textContent = u.name;
  document.getElementById('myAvatar').textContent = u.avatar;
  document.getElementById('myStoryAvatar').textContent = u.avatar;

  DB.setPresence(u.id);

  DB.listenUsers(users => {
    users = users.filter(usr => usr && usr.name && usr.phone);
    users.forEach(user => {
      if (!_knownUserIds.has(user.id) && user.id !== u.id) {
        _knownUserIds.add(user.id);
        showNewUserNotification(user);
      }
      _knownUserIds.add(user.id);
    });
    _allUsers = users;
    renderConvList(document.getElementById('searchInput')?.value || '');
  });

  DB.listenPresence(presenceMap => {
    _presenceMap = presenceMap;
    renderConvList(document.getElementById('searchInput')?.value || '');
  });

  DB.listenFriends(u.id, friendIds => {
    _friendIds = friendIds;
    renderConvList(document.getElementById('searchInput')?.value || '');
  });

  DB.listenRequests(reqs => {
    _allRequests = reqs;
    renderConvList(document.getElementById('searchInput')?.value || '');
  });

  DB.listenGroups(groups => {
    _allGroups = groups;
    renderConvList(document.getElementById('searchInput')?.value || '');
  });

  onValue(ref(db, 'messages'), snap => {
    _activeConvIds.clear();
    _lastMsgsMap.clear();
    if (snap.exists()) {
      const data = snap.val();
      Object.entries(data).forEach(([convId, msgsObj]) => {
        _activeConvIds.add(convId);
        const msgs = Object.values(msgsObj);
        if (msgs.length > 0) {
          msgs.sort((a, b) => b.time - a.time);
          const lastMsg = msgs[0];
          let text = '';
          if (lastMsg.type === 'text') text = lastMsg.text;
          else if (lastMsg.type === 'sticker') text = '(Sticker) ' + lastMsg.text;
          else if (lastMsg.type === 'image') text = '(Ảnh)';
          else if (lastMsg.type === 'file') text = '(Tệp) ' + (lastMsg.fileName || '');
          else if (lastMsg.type === 'voice') text = '(Ghi âm)';
          else if (lastMsg.type === 'call') text = '(Cuộc gọi)';

          _lastMsgsMap.set(convId, {
            text: text,
            time: lastMsg.time
          });
        }
      });
    }
    renderConvList(document.getElementById('searchInput')?.value || '');
  });

  DB.listenPosts(posts => { renderPostsTrack(posts); });
  DB.listenStories(stories => { renderStoriesTrack(stories); });
  listenIncomingCalls();
}

document.getElementById('logoutBtn').onclick = () => {
  if (APP.currentUser) {
    set(ref(db, 'presence/' + APP.currentUser.id), { online: false, lastSeen: Date.now() });
  }
  localStorage.removeItem('cntt1808_session');
  APP.currentUser = null;
  document.body.classList.remove('chat-active');
  chatScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  showForm('login');
  if (_msgUnsubscribe) { _msgUnsubscribe(); _msgUnsubscribe = null; }
};

document.getElementById('btnCreateStory').onclick = () => {
  document.getElementById('modalStory').classList.remove('hidden');
};
document.getElementById('btnCloseStoryModal').onclick = () => {
  document.getElementById('modalStory').classList.add('hidden');
};
document.getElementById('btnSubmitStory').onclick = async () => {
  const text = document.getElementById('storyTextInput').value.trim();
  let imgUrl = document.getElementById('storyImgInput').value.trim();
  const imgFile = document.getElementById('storyImgFile').files[0];
  const musicFile = document.getElementById('storyMusicFile').files[0];

  if (!text && !imgUrl && !imgFile) {
    showToast('Vui lòng nhập văn bản hoặc chọn ảnh cho Story!', 'error');
    return;
  }

  showToast('Đang xử lý dữ liệu tải lên...', 'info');

  if (imgFile) {
    try {
      imgUrl = await getBase64(imgFile);
    } catch (err) {
      showToast('Lỗi xử lý file ảnh!', 'error');
      return;
    }
  }

  let localMusicData = "";
  if (musicFile) {
    try {
      localMusicData = await getBase64(musicFile);
    } catch (err) {
      showToast('Lỗi mã hóa tệp âm thanh!', 'error');
      return;
    }
  }

  const story = {
    userId: APP.currentUser.id,
    userName: APP.currentUser.name,
    userAvatar: APP.currentUser.avatar,
    text: text,
    image: imgUrl,
    localMusic: localMusicData,
    time: Date.now()
  };

  await DB.saveStory(story);
  document.getElementById('storyTextInput').value = '';
  document.getElementById('storyImgInput').value = '';
  document.getElementById('storyImgFile').value = '';
  document.getElementById('storyMusicFile').value = '';
  document.getElementById('modalStory').classList.add('hidden');
  showToast('Đăng Story thành công!', 'success');
};

function renderStoriesTrack(stories) {
  const container = document.getElementById('storiesContainer');
  container.innerHTML = '';
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const validStories = stories.filter(s => s.time > dayAgo).sort((a, b) => b.time - a.time);

  if (!validStories.length) {
    container.innerHTML = '<span style="color:#9ca3af; font-size:12px; margin-left:10px; align-self:center;">Chưa có tin mới</span>';
    return;
  }

  validStories.forEach(s => {
    const div = document.createElement('div');
    div.className = 'story-item';
    let musicIconHtml = s.localMusic ? `<span class="plus-icon" style="background:#1f9d55; transform: translate(25%, 25%);"><i class="ti ti-music"></i></span>` : '';

    div.innerHTML = `
        <div class="story-avatar-wrap unread">
          <div class="story-avatar">${s.userAvatar || '👤'}</div>
          ${musicIconHtml}
        </div>
        <span class="story-username">${s.userName}</span>
      `;
    div.onclick = () => openStoryViewer(s);
    container.appendChild(div);
  });
}

function openStoryViewer(story) {
  const viewer = document.getElementById('modalViewStory');
  const content = document.getElementById('storyViewerContent');
  const audioPlayer = document.getElementById('storyLocalAudio');

  audioPlayer.pause();
  audioPlayer.src = "";

  content.innerHTML = `
      <div style="background:${story.image ? `url('${story.image}')` : '#0068ff'}; background-size: cover; background-position: center; min-height: 480px; border-radius:18px; display:flex; flex-direction:column; justify-content:space-between; padding:20px; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">
         <div style="display:flex; align-items:center; gap:10px; background: rgba(0,0,0,0.4); padding:8px 12px; border-radius:12px; text-align:left;">
            <span style="font-size:24px;">${story.userAvatar}</span>
            <div>
               <div style="font-weight:800; font-size:14px;">${story.userName}</div>
               <div style="font-size:11px; opacity:0.8;">${formatTime(story.time)}</div>
            </div>
         </div>
         <div style="font-size:20px; font-weight:700; text-shadow:0 2px 4px rgba(0,0,0,0.8); background:rgba(0,0,0,0.3); padding:14px; border-radius:12px; line-height:1.6;">
            ${escapeHtml(story.text || '')}
         </div>
         ${story.localMusic ? `
           <div style="background: rgba(0,0,0,0.6); padding: 8px 12px; border-radius: 20px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; margin: 0 auto; color: #4caf50; font-weight: bold;">
             <i class="ti ti-music-disc" style="animation: spin 3s linear infinite;"></i> Đang phát nhạc nền thiết bị
           </div>
         ` : '<div></div>'}
      </div>
    `;
  viewer.classList.remove('hidden');

  if (story.localMusic) {
    audioPlayer.src = story.localMusic;
    audioPlayer.play().catch(err => console.log('Chờ tương tác người dùng để phát nhạc.'));
  }
}
document.getElementById('btnCloseViewStory').onclick = () => {
  document.getElementById('modalViewStory').classList.add('hidden');
  document.getElementById('storyLocalAudio').pause();
};

document.getElementById('btnCreatePost').onclick = () => {
  document.getElementById('modalPost').classList.remove('hidden');
};
document.getElementById('btnClosePostModal').onclick = () => {
  document.getElementById('modalPost').classList.add('hidden');
};
document.getElementById('btnSubmitPost').onclick = async () => {
  const text = document.getElementById('postContentInput').value.trim();
  let imgUrl = document.getElementById('postImgInput').value.trim();
  const imgFile = document.getElementById('postImgFile').files[0];
  const musicFile = document.getElementById('postMusicFile').files[0];

  if (!text) { showToast('Vui lòng điền nội dung bài viết!', 'error'); return; }

  showToast('Đang đăng tải bài viết...', 'info');

  if (imgFile) {
    try {
      imgUrl = await getBase64(imgFile);
    } catch (err) {
      showToast('Lỗi xử lý file hình ảnh!', 'error');
      return;
    }
  }

  let localMusicData = "";
  if (musicFile) {
    try {
      localMusicData = await getBase64(musicFile);
    } catch (err) {
      showToast('Lỗi xử lý file âm thanh!', 'error');
      return;
    }
  }

  const post = {
    userId: APP.currentUser.id,
    userName: APP.currentUser.name,
    userAvatar: APP.currentUser.avatar,
    text: text,
    image: imgUrl,
    localMusic: localMusicData,
    time: Date.now(),
    likes: 0
  };

  await DB.savePost(post);
  document.getElementById('postContentInput').value = '';
  document.getElementById('postImgInput').value = '';
  document.getElementById('postImgFile').value = '';
  document.getElementById('postMusicFile').value = '';
  document.getElementById('modalPost').classList.add('hidden');
  showToast('Đã đăng bài viết mới thành công!', 'success');
};

function renderPostsTrack(posts) {
  const container = document.getElementById('postsContainer');
  container.innerHTML = '';
  const sortedPosts = posts.sort((a, b) => b.time - a.time);

  if (!sortedPosts.length) {
    container.innerHTML = '<div class="empty-list"><i class="ti ti-news"></i><p>Chưa có bài viết nào trên bảng tin</p></div>';
    return;
  }

  sortedPosts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'post-card';
    let imgHtml = p.image ? `<div class="post-img-wrap"><img src="${p.image}" alt="Post image" /></div>` : '';

    let musicPlayerHtml = p.localMusic ? `
        <div style="margin-top:12px; display:flex; flex-direction:column; gap:6px; background:#f0f4ff; padding:10px; border-radius:12px; border:1px solid #dce5f5;">
          <div style="font-size:12px; font-weight:700; color:#0068ff; display:flex; align-items:center; gap:4px;">
            <i class="ti ti-music"></i> Nhạc nền đính kèm thiết bị
          </div>
          <audio controls src="${p.localMusic}" style="width:100%; height:32px;"></audio>
        </div>
      ` : '';

    const isAuthor = p.userId === APP.currentUser?.id;
    const deleteBtn = isAuthor ? `
        <button class="interact-btn" id="del_${p.id}" style="flex:none; color:#e53935;" title="Xóa bài viết">
          <i class="ti ti-trash"></i>
        </button>` : '';

    card.innerHTML = `
        <div class="post-user-info">
          <div style="display:flex;align-items:center;gap:12px;flex:1;">
            <div class="avatar">${p.userAvatar || '🧑‍💻'}</div>
            <div>
              <div class="post-author">${p.userName}</div>
              <div class="post-time">${formatTime(p.time)}</div>
            </div>
          </div>
          ${isAuthor ? `<button class="interact-btn post-delete-btn" data-pid="${p.id}" style="flex:none; padding:6px 10px; color:#e53935; border-radius:10px;" title="Xóa bài viết"><i class="ti ti-trash"></i></button>` : ''}
        </div>
        <div class="post-text-content" style="margin-top:10px;">${escapeHtml(p.text)}</div>
        ${imgHtml}
        ${musicPlayerHtml}
        <div class="post-interactions">
          <button class="interact-btn like-btn" id="like_${p.id}"><i class="ti ti-heart"></i> Thích (${p.likes || 0})</button>
          <button class="interact-btn" onclick="showToast('Tính năng bình luận đang phát triển!','info')"><i class="ti ti-brand-telegram"></i> Bình luận</button>
        </div>
      `;

    const btnLike = card.querySelector(`#like_${p.id}`);
    btnLike.onclick = async () => {
      let currentLikes = p.likes || 0;
      await DB.updatePost(p.id, { likes: currentLikes + 1 });
    };

    if (isAuthor) {
      const btnDel = card.querySelector(`.post-delete-btn[data-pid="${p.id}"]`);
      btnDel.onclick = () => openDeletePostModal(p.id);
    }

    container.appendChild(card);
  });
}

let _deletePostTargetId = null;
function openDeletePostModal(postId) {
  _deletePostTargetId = postId;
  document.getElementById('deletePostModal').classList.remove('hidden');
}
document.getElementById('closeDeletePostModal').onclick = () => {
  document.getElementById('deletePostModal').classList.add('hidden');
  _deletePostTargetId = null;
};
document.getElementById('cancelDeletePostBtn').onclick = () => {
  document.getElementById('deletePostModal').classList.add('hidden');
  _deletePostTargetId = null;
};
document.getElementById('confirmDeletePostBtn').onclick = async () => {
  if (!_deletePostTargetId) return;
  try {
    await DB.deletePost(_deletePostTargetId);
    showToast('Đã xóa bài viết thành công!', 'success');
  } catch (e) {
    showToast('Lỗi xóa bài viết!', 'error');
  }
  document.getElementById('deletePostModal').classList.add('hidden');
  _deletePostTargetId = null;
};

document.getElementById('newGroupBtn').onclick = async () => {
  const listEl = document.getElementById('membersList');
  listEl.innerHTML = '<p style="font-size:12px; color:#6b7280;">Đang tải danh sách bạn bè...</p>';
  document.getElementById('newGroupModal').classList.remove('hidden');

  const allUsers = await DB.getUsers();
  const myFriends = allUsers.filter(u => _friendIds.includes(u.id) && u.id !== APP.currentUser.id);

  listEl.innerHTML = '';
  if (!myFriends.length) {
    listEl.innerHTML = '<p style="font-size:13px; color:#e53935; padding:10px 0;">Bạn cần kết bạn trước khi tạo nhóm!</p>';
    return;
  }

  myFriends.forEach(u => {
    const div = document.createElement('div');
    div.className = 'member-item';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '10px';
    div.innerHTML = `
        <input type="checkbox" value="${u.id}" id="cb_${u.id}" />
        <label for="cb_${u.id}" style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:normal; margin:0;">
          <span>${u.avatar || '👤'}</span>
          <strong>${u.name}</strong>
        </label>
      `;
    listEl.appendChild(div);
  });
};

document.getElementById('closeGroupModal').onclick = () => {
  document.getElementById('newGroupModal').classList.add('hidden');
};

document.getElementById('createGroupBtn').onclick = async () => {
  const groupName = document.getElementById('groupNameInput').value.trim();
  if (!groupName) { showToast('Vui lòng điền tên nhóm chat!', 'error'); return; }

  const checkboxes = document.querySelectorAll('#membersList input[type="checkbox"]:checked');
  const selectedMemberIds = Array.from(checkboxes).map(cb => cb.value);

  selectedMemberIds.push(APP.currentUser.id);

  if (selectedMemberIds.length < 2) {
    showToast('Nhóm chat phải có tối thiểu 2 thành viên trở lên!', 'error');
    return;
  }

  const newGroupId = 'g_' + Date.now();
  const newGroup = {
    id: newGroupId,
    name: groupName,
    creatorId: APP.currentUser.id,
    members: selectedMemberIds,
    lastMsg: 'Nhóm vừa được thiết lập',
    lastTime: Date.now()
  };

  await DB.saveGroup(newGroup);
  document.getElementById('groupNameInput').value = '';
  document.getElementById('newGroupModal').classList.add('hidden');
  showToast(`Tạo thành công nhóm chat "${groupName}"!`, 'success');
};

document.querySelectorAll('.s-tab').forEach(tab => {
  tab.onclick = function () {
    document.querySelectorAll('.s-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');

    const tabName = this.dataset.tab;
    document.getElementById('storyLocalAudio').pause();

    if (tabName === 'feed') {
      document.getElementById('chatWindow').classList.add('hidden');
      document.getElementById('chatWelcome').classList.add('hidden');
      document.getElementById('feedWindow').classList.remove('hidden');
    } else {
      document.getElementById('feedWindow').classList.add('hidden');
      if (APP.activeConvId) {
        document.getElementById('chatWindow').classList.remove('hidden');
      } else {
        document.getElementById('chatWelcome').classList.remove('hidden');
      }
    }
    renderConvList(document.getElementById('searchInput').value);
  };
});

document.getElementById('searchInput').addEventListener('input', e => {
  renderConvList(e.target.value);
});

window.handleAddFriend = async function (toId) {
  await DB.sendRequest(APP.currentUser.id, toId);
  showToast('Đã gửi lời mời kết bạn!', 'success');
};

window.handleAccept = async function (fromId) {
  const req = _allRequests.find(r => r.fromId === fromId && r.toId === APP.currentUser.id && r.status === 'pending');
  if (!req) return;
  await DB.updateRequest(req.id, 'accepted');
  await DB.addFriend(APP.currentUser.id, fromId);
  const u = _allUsers.find(u => u.id === fromId);
  showToast(`✅ Đã chấp nhận kết bạn với ${u?.name || ''}!`, 'success');
};

window.handleReject = async function (fromId) {
  const req = _allRequests.find(r => r.fromId === fromId && r.toId === APP.currentUser.id && r.status === 'pending');
  if (!req) return;
  await DB.deleteRequest(req.id);
  showToast('Đã từ chối lời mời.', 'info');
};

let unfriendTargetId = null;
window.openUnfriendModal = function (u) {
  unfriendTargetId = u.id;
  document.getElementById('unfriendName').textContent = u.name;
  document.getElementById('unfriendAvatar').textContent = u.avatar || '👤';
  document.getElementById('unfriendPhone').textContent = u.phone ? '📞 ' + u.phone : '';
  document.getElementById('unfriendModal').classList.remove('hidden');
};
document.getElementById('closeUnfriendModal').onclick = () => document.getElementById('unfriendModal').classList.add('hidden');
document.getElementById('cancelUnfriendBtn').onclick = () => document.getElementById('unfriendModal').classList.add('hidden');
document.getElementById('confirmUnfriendBtn').onclick = async () => {
  if (!unfriendTargetId) return;
  await DB.removeFriend(APP.currentUser.id, unfriendTargetId);
  const reqs = _allRequests.filter(r =>
    (r.fromId === APP.currentUser.id && r.toId === unfriendTargetId) ||
    (r.fromId === unfriendTargetId && r.toId === APP.currentUser.id)
  );
  for (const r of reqs) await DB.deleteRequest(r.id);
  document.getElementById('unfriendModal').classList.add('hidden');
  document.getElementById('rightPanel').classList.add('hidden');
  showToast('Đã xóa khỏi danh sách bạn bè.', 'info');
  unfriendTargetId = null;
};

function renderConvList(filter = '') {
  if (!APP.currentUser) return;
  const convList = document.getElementById('convList');
  convList.innerHTML = '';

  const activeTab = document.querySelector('.s-tab.active')?.dataset.tab || 'chats';
  const allUsers = _allUsers.filter(u => u.id !== APP.currentUser.id);
  const myGroups = _allGroups.filter(g => g.members && g.members.includes(APP.currentUser.id));

  if (activeTab === 'feed') {
    convList.innerHTML = `
        <div style="padding:20px; text-align:center; color:#6b7280;">
          <i class="ti ti-news" style="font-size:32px; color:#0068ff;"></i>
          <h4 style="margin-top:10px; color:#172033;">Góc sinh viên DNU</h4>
          <p style="font-size:12px; margin-top:4px;">Bạn đang xem không gian chung của lớp CNTT1808.</p>
        </div>
      `;
    return;
  }

  if (activeTab === 'groups') {
    myGroups.filter(g => !filter || g.name.toLowerCase().includes(filter.toLowerCase()))
      .forEach(g => convList.appendChild(createConvItem(g.id, g.name, '👥', g.lastMsg || 'Chưa có tin nhắn', g.lastTime, 'group', g)));
    if (!myGroups.length) convList.innerHTML = '<div class="empty-list"><i class="ti ti-users-group"></i><p>Chưa có nhóm nào</p></div>';
    return;
  }

  if (activeTab === 'contacts') {
    const friends = allUsers.filter(u => _friendIds.includes(u.id) && (!filter || (u.name && u.name.toLowerCase().includes(filter.toLowerCase()))));
    if (!friends.length) {
      convList.innerHTML = '<div class="empty-list"><i class="ti ti-users"></i><p>Chưa có bạn bè nào</p></div>';
      return;
    }
    friends.forEach(u => {
      const convId = getConvId(APP.currentUser.id, u.id);
      convList.appendChild(createConvItem(convId, u.name, u.avatar, 'Nhấn để chat', 0, 'dm', u));
    });
    return;
  }

  if (activeTab === 'requests') {
    renderFindTab(filter);
    return;
  }

  if (activeTab === 'chats' && filter) {
    const matchingFriends = allUsers.filter(u => _friendIds.includes(u.id) && (u.name && u.name.toLowerCase().includes(filter.toLowerCase())));
    const matchingGroups = myGroups.filter(g => g.name.toLowerCase().includes(filter.toLowerCase()));

    const allItems = [];
    matchingFriends.forEach(u => {
      const convId = getConvId(APP.currentUser.id, u.id);
      const last = _lastMsgsMap.get(convId) || { text: 'Nhấn để chat', time: 0 };
      allItems.push({ convId, name: u.name, avatar: u.avatar, lastMsg: last.text, lastTime: last.time, type: 'dm', target: u });
    });
    matchingGroups.forEach(g => {
      allItems.push({ convId: g.id, name: g.name, avatar: '👥', lastMsg: g.lastMsg || '', lastTime: g.lastTime || 0, type: 'group', target: g });
    });

    if (allItems.length > 0) {
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'find-section-title';
      sectionHeader.innerHTML = `<i class="ti ti-message"></i> Cuộc trò chuyện & Bạn bè`;
      convList.appendChild(sectionHeader);

      allItems.forEach(item => {
        convList.appendChild(createConvItem(item.convId, item.name, item.avatar, item.lastMsg || 'Nhấn để chat', item.lastTime, item.type, item.target));
      });
    }

    const matchingOthers = allUsers.filter(u => !_friendIds.includes(u.id) && ((u.name && u.name.toLowerCase().includes(filter.toLowerCase())) || (u.phone && u.phone.includes(filter))));

    if (matchingOthers.length > 0) {
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'find-section-title';
      sectionHeader.style.marginTop = '15px';
      sectionHeader.innerHTML = `<i class="ti ti-search"></i> Người dùng khác trên hệ thống`;
      convList.appendChild(sectionHeader);

      matchingOthers.forEach(u => {
        let state = 'none';
        if (hasPendingRequestTo(u.id)) state = 'sent';
        else if (hasPendingRequestFrom(u.id)) state = 'incoming';
        convList.appendChild(createFindItem(u, state));
      });
    }

    if (allItems.length === 0 && matchingOthers.length === 0) {
      convList.innerHTML = '<div class="empty-list"><i class="ti ti-search"></i><p>Không tìm thấy kết quả</p></div>';
    }
    return;
  }

  const friendUsers = allUsers.filter(u => _friendIds.includes(u.id));
  const allItems = [];

  friendUsers.forEach(u => {
    const convId = getConvId(APP.currentUser.id, u.id);
    if (_activeConvIds.has(convId)) {
      const last = _lastMsgsMap.get(convId) || { text: 'Nhấn để xem tin nhắn', time: 0 };
      allItems.push({ convId, name: u.name, avatar: u.avatar, lastMsg: last.text, lastTime: last.time, type: 'dm', target: u });
    }
  });

  const strangers = allUsers.filter(u => !_friendIds.includes(u.id));
  strangers.forEach(u => {
    const convId = getConvId(APP.currentUser.id, u.id);
    if (_activeConvIds.has(convId)) {
      const last = _lastMsgsMap.get(convId) || { text: 'Tin nhắn từ người lạ', time: 0 };
      allItems.push({ convId, name: u.name, avatar: u.avatar, lastMsg: last.text, lastTime: last.time, type: 'dm', target: u });
    }
  });

  myGroups.forEach(g => {
    allItems.push({ convId: g.id, name: g.name, avatar: '👥', lastMsg: g.lastMsg || 'Nhóm vừa được thiết lập', lastTime: g.lastTime || 0, type: 'group', target: g });
  });

  allItems.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));

  if (!allItems.length) {
    convList.innerHTML = '<div class="empty-list"><i class="ti ti-brand-telegram"></i><p>Chưa có cuộc trò chuyện nào</p></div>';
    return;
  }
  allItems.forEach(item => convList.appendChild(createConvItem(item.convId, item.name, item.avatar, item.lastMsg, item.lastTime, item.type, item.target)));
}

function renderFindTab(filter = '') {
  const convList = document.getElementById('convList');
  const myId = APP.currentUser.id;
  const allUsers = _allUsers.filter(u => u.id !== myId);
  const incoming = _allRequests.filter(r => r.toId === myId && r.status === 'pending');

  if (incoming.length > 0) {
    const section = document.createElement('div');
    section.className = 'find-section-title';
    section.innerHTML = `<i class="ti ti-bell"></i> Lời mời kết bạn (${incoming.length})`;
    convList.appendChild(section);
    incoming.forEach(req => {
      const u = allUsers.find(u => u.id === req.fromId);
      if (u) convList.appendChild(createFindItem(u, 'incoming'));
    });
  }

  let displayUsers = [];
  if (filter) {
    displayUsers = allUsers.filter(u =>
      (u.name && u.name.toLowerCase().includes(filter.toLowerCase())) ||
      (u.phone && u.phone.includes(filter))
    );
  } else {
    displayUsers = allUsers.filter(u => hasPendingRequestTo(u.id));
  }

  if (displayUsers.length > 0) {
    const section = document.createElement('div');
    section.className = 'find-section-title';
    section.style.marginTop = '15px';
    section.innerHTML = filter ? `<i class="ti ti-search"></i> Kết quả tìm kiếm` : `<i class="ti ti-clock"></i> Lời mời đã gửi`;
    convList.appendChild(section);

    displayUsers.forEach(u => {
      let state = 'none';
      if (_friendIds.includes(u.id)) state = 'friend';
      else if (hasPendingRequestTo(u.id)) state = 'sent';
      else if (hasPendingRequestFrom(u.id)) state = 'incoming';
      convList.appendChild(createFindItem(u, state));
    });
  } else if (filter && incoming.length === 0) {
    convList.innerHTML = '<div class="empty-list"><i class="ti ti-search"></i><p>Không tìm thấy kết quả</p></div>';
  }
}

function createFindItem(u, state) {
  const div = document.createElement('div');
  div.className = 'find-item';
  let actionHtml = '';
  if (state === 'friend') {
    actionHtml = `<div class="find-actions"><button class="find-btn friend-btn" onclick="openUnfriendModal(window._fu_${u.id})"><i class="ti ti-user-check"></i><span class="fb-label-hover">Xóa bạn</span></button></div>`;
  } else if (state === 'sent') {
    actionHtml = `<div class="find-actions"><button class="find-btn sent-btn" disabled><i class="ti ti-clock"></i>Đã gửi</button></div>`;
  } else if (state === 'incoming') {
    actionHtml = `<div class="find-actions"><button class="find-btn accept-btn" onclick="handleAccept('${u.id}')">Chấp nhận</button></div>`;
  } else {
    actionHtml = `<div class="find-actions"><button class="find-btn add-btn" onclick="handleAddFriend('${u.id}')"><i class="ti ti-user-plus"></i>Thêm</button></div>`;
  }
  const online = isOnline(u.id);
  div.innerHTML = `
      <div class="find-avatar">${u.avatar}<span class="conv-dot ${online ? 'online' : 'offline'}"></span></div>
      <div class="find-info">
        <div class="find-name">${u.name}</div>
        <div class="find-phone">${u.phone}</div>
      </div>
      ${actionHtml}
    `;
  window['_fu_' + u.id] = u;
  return div;
}

function createConvItem(convId, name, avatar, lastMsg, lastTime, type, target = null) {
  const div = document.createElement('div');
  div.className = 'conv-item' + (convId === APP.activeConvId ? ' active' : '');
  div.dataset.id = convId;
  const timeStr = lastTime ? formatTime(lastTime) : '';
  const truncated = (lastMsg || '').length > 25 ? lastMsg.slice(0, 25) + '...' : lastMsg;
  const _online = type !== 'group' && target?.id ? isOnline(target.id) : false;
  div.innerHTML = `
      <div class="conv-avatar">${avatar}<span class="conv-dot ${type === 'group' ? 'group' : _online ? 'online' : 'offline'}"></span></div>
      <div class="conv-info">
        <div class="conv-name">${name}</div>
        <div class="conv-last">${escapeHtml(truncated)}</div>
      </div>
      <div class="conv-meta"><span class="conv-time">${timeStr}</span></div>
    `;
  div.onclick = () => openConversation(convId, name, avatar, type, target);
  return div;
}

function openConversation(convId, name, avatar, type, target) {
  if (APP.activeConvId) {
    try { off(ref(db, 'messages/' + APP.activeConvId)); } catch (e) { }
  }
  if (_msgUnsubscribe) { _msgUnsubscribe(); _msgUnsubscribe = null; }

  APP.activeConvId = convId;
  APP.activeConvType = type;
  APP.activeConvTarget = target;

  document.getElementById('chatWelcome').classList.add('hidden');
  document.getElementById('feedWindow').classList.add('hidden');
  document.getElementById('chatWindow').classList.remove('hidden');
  document.getElementById('chatName').textContent = name;
  document.getElementById('chatAvatar').textContent = avatar;

  const _chatOnline = target?.id ? isOnline(target.id) : false;
  document.getElementById('chatStatus').textContent = type === 'group'
    ? (target?.members?.length || 0) + ' thành viên'
    : _chatOnline ? '🟢 Đang hoạt động' : '⚫ Ngoại tuyến';

  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
  const el = document.querySelector(`.conv-item[data-id="${convId}"]`);
  if (el) el.classList.add('active');

  renderMessages(convId);

  let firstLoad = true;
  _msgUnsubscribe = DB.listenMessages(convId, msg => {
    if (firstLoad) return;
    const area = document.getElementById('messagesArea');
    if (area.querySelector(`.msg-row[data-id="${msg.id}"]`)) return;

    const noMsg = area.querySelector('.no-msgs');
    if (noMsg) noMsg.remove();
    area.appendChild(createMsgEl(msg));
    area.scrollTop = area.scrollHeight;
  });

  try {
    ref(db, 'messages/' + convId).on('child_removed', snap => {
      const val = snap.val();
      if (val) {
        const row = document.querySelector(`.msg-row[data-id="${val.id}"]`);
        if (row) row.remove();
      }
    });
  } catch (e) { }

  document.getElementById('msgInput').focus();
  setTimeout(() => { firstLoad = false; }, 500);
}

async function renderMessages(convId) {
  const area = document.getElementById('messagesArea');
  area.innerHTML = '<div class="no-msgs"><i class="ti ti-loader" style="animation:spin 1s linear infinite"></i><p>Đang tải...</p></div>';
  const msgs = await DB.getMessages(convId);
  area.innerHTML = '';
  if (!msgs.length) {
    area.innerHTML = '<div class="no-msgs"><i class="ti ti-brand-telegram"></i><p>Hãy gửi tin nhắn đầu tiên!</p></div>';
    return;
  }
  msgs.forEach(m => area.appendChild(createMsgEl(m)));
  area.scrollTop = area.scrollHeight;
}

function createMsgEl(msg) {
  const isMine = msg.senderId === APP.currentUser.id;
  const div = document.createElement('div');
  div.className = 'msg-row ' + (isMine ? 'mine' : 'theirs');
  div.dataset.id = msg.id;

  let content = '';
  if (msg.type === 'text') content = `<div class="msg-bubble">${escapeHtml(msg.text)}</div>`;
  else if (msg.type === 'sticker') content = `<div class="msg-sticker">${msg.text}</div>`;
  else if (msg.type === 'image') content = `<div class="msg-bubble msg-img"><img src="${msg.text}" alt="ảnh" onclick="window.open('${msg.text}')" /></div>`;
  else if (msg.type === 'file') content = `<div class="msg-bubble msg-file"><i class="ti ti-file"></i><a href="${msg.text}" target="_blank">${msg.fileName || 'File'}</a></div>`;
  else if (msg.type === 'voice') content = `<div class="msg-bubble msg-voice"><i class="ti ti-microphone"></i><audio controls src="${msg.text}"></audio></div>`;
  else if (msg.type === 'call') content = `<div class="msg-bubble msg-call"><i class="ti ti-${msg.callType === 'video' ? 'video' : 'phone'}"></i> ${msg.text}</div>`;

  const timeStr = formatTime(msg.time);
  const sender = _allUsers.find(u => u.id === msg.senderId);

  const bubbleWrap = `
        <div class="msg-bubble-wrap">
          ${content}
          ${isMine && msg._fbKey ? `<button class="msg-delete-btn" onclick="handleDeleteMsg('${msg._fbKey}', '${msg.id}')" title="Thu hồi tin nhắn"><i class="ti ti-trash"></i></button>` : ''}
        </div>
      `;

  div.innerHTML = `
      ${!isMine ? `<div class="msg-avatar">${sender?.avatar || '?'}</div>` : ''}
      <div class="msg-content">
        ${!isMine && APP.activeConvType === 'group' ? `<div class="msg-sender-name">${sender?.name || ''}</div>` : ''}
        ${bubbleWrap}
        <div class="msg-meta">
          <span class="msg-time">${timeStr}</span>
        </div>
      </div>
    `;
  return div;
}

async function sendMessage(type, text, extra = {}) {
  if (!APP.activeConvId) return;
  const msg = { id: 'm_' + Date.now(), senderId: APP.currentUser.id, type, text, time: Date.now(), ...extra };
  await DB.saveMessage(APP.activeConvId, msg);

  if (APP.activeConvType === 'group') {
    await DB.updateGroup(APP.activeConvId, {
      lastMsg: type === 'sticker' ? '(Sticker)' : type === 'image' ? '(Ảnh)' : type === 'voice' ? '(Ghi âm)' : text,
      lastTime: Date.now()
    });
  }
}

document.getElementById('sendBtn').onclick = doSend;
document.getElementById('msgInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
});
function doSend() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text || !APP.activeConvId) return;
  sendMessage('text', text);
  input.value = '';
}

document.getElementById('imageBtn').onclick = () => document.getElementById('imageInput').click();
document.getElementById('imageInput').onchange = function () {
  const file = this.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => sendMessage('image', e.target.result);
  reader.readAsDataURL(file);
  this.value = '';
};

const STICKERS = {
  emoji: ['😀', '😂', '🥹', '😍', '🥰', '😎', '🤩', '😴', '😭', '😡', '😱', '🤔', '😏', '🥳', '🤗', '😇', '🤓', '😬', '🫡', '🫶'],
  animals: ['🐱', '🐶', '🐼', '🦊', '🐨', '🦁', '🐯', '🐸', '🐙', '🦋', '🦄', '🐬', '🦅', '🦜', '🐝', '🦊', '🐻', '🦝', '🦔', '🦦'],
  food: ['🍜', '🍣', '🍕', '🍔', '🌮', '🍩', '🎂', '🧋', '🍓', '🥗', '🍱', '🍛', '☕', '🍺', '🍰', '🍦', '🌯', '🥤', '🍿', '🥐'],
  study: ['📚', '📝', '💻', '🔬', '📐', '📊', '🎓', '🏆', '💡', '📖', '✏️', '🖊️', '📌', '🗒️', '📎', '⏰', '🔭', '🧮', '📡', '🗺️'],
  feelings: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💕', '💞', '💝', '🔥', '✨', '💯', '🎉', '🌈', '⚡', '🌟', '🎊', '💫'],
};
const stickerPicker = document.getElementById('stickerPicker');
const stickerGrid = document.getElementById('stickerGrid');
document.getElementById('stickerBtn').onclick = e => { e.stopPropagation(); stickerPicker.classList.toggle('hidden'); renderStickers('emoji'); };
document.getElementById('closeStickerBtn').onclick = () => stickerPicker.classList.add('hidden');
document.querySelectorAll('.stk-tab').forEach(tab => {
  tab.onclick = function () {
    document.querySelectorAll('.stk-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active'); renderStickers(this.dataset.cat);
  };
});
function renderStickers(cat) {
  stickerGrid.innerHTML = '';
  STICKERS[cat].forEach(s => {
    const btn = document.createElement('button'); btn.className = 'sticker-item'; btn.textContent = s;
    btn.onclick = () => { sendMessage('sticker', s); stickerPicker.classList.add('hidden'); };
    stickerGrid.appendChild(btn);
  });
}

function renderBackupList() {
  const listEl = document.getElementById('backupUserList');
  listEl.innerHTML = '';
  _allUsers.forEach((u, idx) => {
    const online = isOnline(u.id);
    const row = document.createElement('div');
    row.className = 'backup-user-row';
    row.innerHTML = `
        <div class="backup-rank">${idx + 1}</div>
        <div class="backup-avatar">${u.avatar}</div>
        <div class="backup-info">
          <div class="backup-name">${u.name}</div>
          <div class="backup-phone">${u.phone}</div>
        </div>
        <div class="backup-right">
          <div class="backup-status ${online ? 'online' : 'offline'}">${online ? '🟢 Online' : '⚫ Offline'}</div>
        </div>
      `;
    listEl.appendChild(row);
  });
}

function showNewUserNotification(u) {
  const toast = document.getElementById('newUserToast');
  document.getElementById('newUserToastName').textContent = `${u.avatar} ${u.name}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 5000);
}

document.getElementById('backBtn').onclick = () => {
  document.getElementById('chatWindow').classList.add('hidden');
  document.getElementById('chatWelcome').classList.remove('hidden');
  APP.activeConvId = null;
};

const ICE_CONFIG = {
  iceTransportPolicy: 'all',
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '37748e6d1e564a617331c7b8',
      credential: 'QpABUCd531Y07Y7t',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: '37748e6d1e564a617331c7b8',
      credential: 'QpABUCd531Y07Y7t',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '37748e6d1e564a617331c7b8',
      credential: 'QpABUCd531Y07Y7t',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: '37748e6d1e564a617331c7b8',
      credential: 'QpABUCd531Y07Y7t',
    },
  ]
};

let _localStream = null;
let _peerConn = null;
let _callTimerInt = null;
let _callSecs = 0;
let _callData = null;
let _micMuted = false;
let _camOff = false;
let _screenStream = null;
let _iceCandidateQ = [];

document.getElementById('voiceCallBtn').onclick = () => initiateCall('voice');
document.getElementById('videoCallBtn').onclick = () => initiateCall('video');

async function initiateCall(type) {
  if (APP.activeConvType !== 'dm' || !APP.activeConvTarget?.id) {
    showToast('Chỉ có thể gọi trong cuộc trò chuyện 1-1!', 'error');
    return;
  }
  if (_callData) { showToast('Bạn đang trong cuộc gọi khác!', 'error'); return; }

  const toUser = APP.activeConvTarget;
  showCallModal(type, toUser.avatar, toUser.name, 'Đang đổ chuông...', type === 'voice');

  let localOk = await startLocalMedia(type);
  if (!localOk) { hideCallModal(); return; }

  _peerConn = createPeer();
  _localStream.getTracks().forEach(t => _peerConn.addTrack(t, _localStream));

  const pendingCandidates = [];
  _peerConn.onicecandidate = e => {
    if (e.candidate) pendingCandidates.push(e.candidate.toJSON());
  };

  const offer = await _peerConn.createOffer();
  await _peerConn.setLocalDescription(offer);

  const callId = await DB.createCall({
    fromId: APP.currentUser.id,
    toId: toUser.id,
    type,
    status: 'ringing',
    offer: { type: offer.type, sdp: offer.sdp },
    time: Date.now()
  });

  _callData = { callId, call: { fromId: APP.currentUser.id, toId: toUser.id, type }, role: 'caller' };

  for (const c of pendingCandidates) DB.pushIceCandidate(callId, 'caller', c);
  _peerConn.onicecandidate = e => {
    if (e.candidate) DB.pushIceCandidate(callId, 'caller', e.candidate.toJSON());
  };

  DB.listenCall(callId, async data => {
    if (!data || !_peerConn) return;

    if (data.status === 'rejected') {
      showToast('Cuộc gọi bị từ chối.', 'info');
      await _cleanupCall(false); return;
    }
    if (data.status === 'ended' && _callData) {
      await _cleanupCall(true); return;
    }
    if (data.answer && _peerConn.signalingState !== 'stable' && _peerConn.remoteDescription === null) {
      try {
        await _peerConn.setRemoteDescription(new RTCSessionDescription(data.answer));
        await _flushIceCandidates();
      } catch (e) { console.warn('setRemoteDescription error', e); }
    }
  });

  DB.listenIceCandidates(callId, 'callee', async c => {
    if (!_peerConn) return;
    if (_peerConn.remoteDescription) {
      try { await _peerConn.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { }
    } else {
      _iceCandidateQ.push(c);
    }
  });
}

let _listenedCallIds = new Set();
function listenIncomingCalls() {
  onValue(ref(db, 'calls'), snap => {
    if (!snap.exists() || !APP.currentUser) return;
    snap.forEach(child => {
      const callId = child.key;
      const call = child.val();
      if (call.toId !== APP.currentUser.id) return;
      if (call.status === 'ringing' && !_listenedCallIds.has(callId)) {
        _listenedCallIds.add(callId);
        _showIncomingCall(callId, call);
      }
    });
  });
}

function _showIncomingCall(callId, call) {
  const caller = _allUsers.find(u => u.id === call.fromId);
  document.getElementById('incomingAvatar').textContent = caller?.avatar || '?';
  document.getElementById('incomingName').textContent = caller?.name || 'Không rõ';
  document.getElementById('incomingType').textContent = call.type === 'video' ? '📹 Cuộc gọi video' : '📞 Cuộc gọi thoại';
  document.getElementById('incomingCall').classList.remove('hidden');

  const autoReject = setTimeout(() => {
    if (!document.getElementById('incomingCall').classList.contains('hidden')) {
      document.getElementById('incomingCall').classList.add('hidden');
    }
  }, 60000);

  document.getElementById('acceptCallBtn').onclick = async () => {
    clearTimeout(autoReject);
    document.getElementById('incomingCall').classList.add('hidden');
    await _answerCall(callId, call);
  };
  document.getElementById('rejectCallBtn').onclick = async () => {
    clearTimeout(autoReject);
    document.getElementById('incomingCall').classList.add('hidden');
    await DB.updateCall(callId, { status: 'rejected' });
  };
}

async function _answerCall(callId, call) {
  if (_callData) { showToast('Bạn đang trong cuộc gọi khác!', 'error'); return; }

  const caller = _allUsers.find(u => u.id === call.fromId);
  showCallModal(call.type, caller?.avatar || '?', caller?.name || '?', 'Đang kết nối...', call.type === 'voice');

  const localOk = await startLocalMedia(call.type);
  if (!localOk) { hideCallModal(); return; }

  _callData = { callId, call, role: 'callee' };
  _peerConn = createPeer();
  _localStream.getTracks().forEach(t => _peerConn.addTrack(t, _localStream));

  _peerConn.onicecandidate = e => {
    if (e.candidate) DB.pushIceCandidate(callId, 'callee', e.candidate.toJSON());
  };

  const callSnap = await DB.getCall(callId);
  if (!callSnap?.offer) { showToast('Không tìm thấy dữ liệu cuộc gọi!', 'error'); hideCallModal(); return; }

  await _peerConn.setRemoteDescription(new RTCSessionDescription(callSnap.offer));
  await _flushIceCandidates();

  const answer = await _peerConn.createAnswer();
  await _peerConn.setLocalDescription(answer);
  await DB.updateCall(callId, { answer: { type: answer.type, sdp: answer.sdp }, status: 'connected' });

  DB.listenIceCandidates(callId, 'caller', async c => {
    if (!_peerConn) return;
    if (_peerConn.remoteDescription) {
      try { await _peerConn.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { }
    } else {
      _iceCandidateQ.push(c);
    }
  });

  DB.listenCall(callId, async data => {
    if (data?.status === 'ended' && _callData) await _cleanupCall(false);
  });
}

function createPeer() {
  const pc = new RTCPeerConnection(ICE_CONFIG);

  pc.ontrack = e => {
    const remVid = document.getElementById('remoteVideo');
    if (remVid && e.streams[0]) {
      remVid.srcObject = e.streams[0];
      remVid.play().catch(err => console.warn('[WebRTC] remoteVideo.play():', err));
      document.getElementById('remotePlaceholder').style.display = 'none';
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') {
      _setConnBadge('connected');
      if (_callData && !_callTimerInt) _onConnected(_callData.callId);
    }
    if (pc.connectionState === 'connecting') _setConnBadge('connecting');
    if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
      _setConnBadge('failed');
      setTimeout(() => _cleanupCall(true), 1500);
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      _setConnBadge('connected');
    }
    if (pc.iceConnectionState === 'failed') {
      pc.restartIce?.();
    }
  };

  return pc;
}

async function startLocalMedia(type) {
  try {
    const constraints = type === 'video'
      ? { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true } }
      : { audio: { echoCancellation: true, noiseSuppression: true }, video: false };

    _localStream = await navigator.mediaDevices.getUserMedia(constraints);

    if (type === 'video') {
      const locVid = document.getElementById('localVideo');
      locVid.srcObject = _localStream;
      await locVid.play().catch(e => console.warn('localVideo.play:', e));
      document.getElementById('localVideoWrap').style.display = 'flex';
    } else {
      document.getElementById('localVideoWrap').style.display = 'none';
    }
    return true;
  } catch (e) {
    let msg = 'Không thể truy cập microphone/camera!';
    if (e.name === 'NotAllowedError') msg = '⛔ Bạn chưa cấp quyền camera/micro. Hãy bật quyền trong trình duyệt rồi thử lại.';
    if (e.name === 'NotFoundError') msg = '🔌 Không tìm thấy camera/microphone trên thiết bị này.';
    if (e.name === 'NotReadableError') msg = '⚠️ Camera/micro đang được ứng dụng khác sử dụng. Hãy đóng lại.';
    showToast(msg, 'error');
    return false;
  }
}

async function _flushIceCandidates() {
  for (const c of _iceCandidateQ) {
    try { await _peerConn?.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { }
  }
  _iceCandidateQ = [];
}

function _onConnected(callId) {
  if (_callTimerInt) return;
  document.getElementById('callStatus').textContent = '🟢 Đang kết nối';
  document.getElementById('remotePlaceholder').style.display = 'none';
  document.getElementById('callTimer').classList.remove('hidden');
  _setConnBadge('connected');
  _callSecs = 0;
  _callTimerInt = setInterval(() => {
    _callSecs++;
    const m = String(Math.floor(_callSecs / 60)).padStart(2, '0');
    const s = String(_callSecs % 60).padStart(2, '0');
    document.getElementById('callTimerDisplay').textContent = `${m}:${s}`;
  }, 1000);
}

document.getElementById('endCallBtn').onclick = () => _cleanupCall(true, true);

async function _cleanupCall(saveMsg = false, byUser = false) {
  if (_callTimerInt) { clearInterval(_callTimerInt); _callTimerInt = null; }

  if (saveMsg && _callData && APP.activeConvId) {
    const { call } = _callData;
    const dur = _callSecs > 0
      ? ` · ${String(Math.floor(_callSecs / 60)).padStart(2, '0')}:${String(_callSecs % 60).padStart(2, '0')}`
      : ' · Không có người bắt máy';
    const callText = (call.type === 'video' ? '📹 Cuộc gọi video' : '📞 Cuộc gọi thoại') + dur;
    await sendMessage('call', callText, { callType: call.type });
  }

  if (byUser && _callData?.callId) {
    try { await DB.updateCall(_callData.callId, { status: 'ended' }); } catch (e) { }
  }

  if (_screenStream) { _screenStream.getTracks().forEach(t => t.stop()); _screenStream = null; }
  if (_localStream) { _localStream.getTracks().forEach(t => t.stop()); _localStream = null; }
  if (_peerConn) { _peerConn.close(); _peerConn = null; }

  _callData = null;
  _callSecs = 0;
  _micMuted = false;
  _camOff = false;
  _iceCandidateQ = [];

  document.getElementById('toggleMicBtn').querySelector('i').className = 'ti ti-microphone';
  document.getElementById('toggleMicBtn').classList.remove('muted');
  document.getElementById('toggleCamBtn').querySelector('i').className = 'ti ti-video';
  document.getElementById('toggleCamBtn').classList.remove('muted');
  document.getElementById('toggleScreenBtn').querySelector('i').className = 'ti ti-screen-share';
  document.getElementById('remotePlaceholder').style.display = 'flex';

  hideCallModal();
}

document.getElementById('toggleMicBtn').onclick = () => {
  if (!_localStream) return;
  _micMuted = !_micMuted;
  _localStream.getAudioTracks().forEach(t => { t.enabled = !_micMuted; });
  const btn = document.getElementById('toggleMicBtn');
  btn.querySelector('i').className = _micMuted ? 'ti ti-microphone-off' : 'ti ti-microphone';
  btn.classList.toggle('muted', _micMuted);
  showToast(_micMuted ? '🔇 Đã tắt micro' : '🎙️ Đã bật micro', 'info');
};

document.getElementById('toggleCamBtn').onclick = () => {
  if (!_localStream) return;
  _camOff = !_camOff;
  _localStream.getVideoTracks().forEach(t => { t.enabled = !_camOff; });
  const btn = document.getElementById('toggleCamBtn');
  btn.querySelector('i').className = _camOff ? 'ti ti-video-off' : 'ti ti-video';
  btn.classList.toggle('muted', _camOff);
  document.getElementById('localVideoWrap').style.opacity = _camOff ? '0.4' : '1';
  showToast(_camOff ? '📵 Đã tắt camera' : '📷 Đã bật camera', 'info');
};

document.getElementById('toggleScreenBtn').onclick = async () => {
  if (_screenStream) {
    _screenStream.getTracks().forEach(t => t.stop());
    _screenStream = null;
    if (_localStream && _peerConn) {
      const camTrack = _localStream.getVideoTracks()[0];
      if (camTrack) {
        const sender = _peerConn.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(camTrack);
      }
      document.getElementById('localVideo').srcObject = _localStream;
    }
    document.getElementById('localVideoWrap').style.display = 'flex';
    document.getElementById('toggleScreenBtn').querySelector('i').className = 'ti ti-screen-share';
    showToast('Đã dừng chia sẻ màn hình.', 'info');
    return;
  }
  try {
    _screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const screenTrack = _screenStream.getVideoTracks()[0];
    if (_peerConn) {
      const sender = _peerConn.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);
    }
    document.getElementById('localVideo').srcObject = _screenStream;
    document.getElementById('toggleScreenBtn').querySelector('i').className = 'ti ti-screen-share-off';
    showToast('📺 Đang chia sẻ màn hình', 'success');
    screenTrack.onended = () => document.getElementById('toggleScreenBtn').click();
  } catch (e) {
    showToast('Không thể chia sẻ màn hình!', 'error');
  }
};

function showCallModal(type, avatar, name, status, voiceOnly) {
  document.getElementById('callAvatar').textContent = avatar;
  document.getElementById('callName').textContent = name;
  document.getElementById('callPeerName').textContent = name;
  document.getElementById('callStatus').textContent = status;
  document.getElementById('callTimer').classList.add('hidden');
  document.getElementById('callTimerDisplay').textContent = '00:00';

  const modal = document.getElementById('callModal');
  modal.classList.remove('hidden', 'voice-only');
  if (voiceOnly) modal.classList.add('voice-only');

  _setConnBadge('connecting');

  const remVid = document.getElementById('remoteVideo');
  if (remVid) remVid.srcObject = null;
  document.getElementById('remotePlaceholder').style.display = 'flex';

  document.getElementById('localVideoWrap').style.display = voiceOnly ? 'none' : 'flex';
}

function hideCallModal() {
  document.getElementById('callModal').classList.add('hidden');
  document.getElementById('incomingCall').classList.add('hidden');
  const locVid = document.getElementById('localVideo');
  const remVid = document.getElementById('remoteVideo');
  if (locVid) locVid.srcObject = null;
  if (remVid) remVid.srcObject = null;
  document.getElementById('remotePlaceholder').style.display = 'flex';
}

function _setConnBadge(state) {
  const badge = document.getElementById('connStatusBadge');
  const text = document.getElementById('connStatusText');
  if (!badge) return;
  badge.className = 'conn-status-badge ' + state;
  const labels = { connecting: 'Đang kết nối...', connected: 'Đã kết nối', failed: 'Mất kết nối' };
  text.textContent = labels[state] || state;
}

document.addEventListener("DOMContentLoaded", () => {
  let currentSlide = 0;
  const slidesCount = 4;
  const carouselContainer = document.getElementById('welcomeCarouselContainer');
  const dots = document.querySelectorAll('.carousel-dot');

  function showSlide(index) {
    if (index < 0) index = slidesCount - 1;
    if (index >= slidesCount) index = 0;
    currentSlide = index;
    if (carouselContainer) {
      carouselContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
    dots.forEach((dot, idx) => {
      if (idx === currentSlide) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  const welcomePrevBtn = document.getElementById('welcomePrevBtn');
  const welcomeNextBtn = document.getElementById('welcomeNextBtn');

  if (welcomePrevBtn) {
    welcomePrevBtn.onclick = () => {
      showSlide(currentSlide - 1);
      resetAutoSlide();
    };
  }
  if (welcomeNextBtn) {
    welcomeNextBtn.onclick = () => {
      showSlide(currentSlide + 1);
      resetAutoSlide();
    };
  }

  dots.forEach((dot) => {
    dot.onclick = () => {
      const idx = parseInt(dot.dataset.index);
      showSlide(idx);
      resetAutoSlide();
    };
  });

  let autoSlideInterval = setInterval(() => {
    showSlide(currentSlide + 1);
  }, 5000);

  function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => {
      showSlide(currentSlide + 1);
    }, 5000);
  }
});

window.handleDeleteMsg = async function (fbKey, msgId) {
  if (!APP.activeConvId || !fbKey) return;
  if (confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này không?')) {
    try {
      await DB.deleteMessage(APP.activeConvId, fbKey);
      showToast('Đã thu hồi tin nhắn.', 'success');
    } catch (e) {
      showToast('Không thể thu hồi tin nhắn!', 'error');
    }
  }
};

const moreBtn = document.getElementById('moreBtn');
const headerDropdown = document.getElementById('headerDropdown');
if (moreBtn && headerDropdown) {
  moreBtn.onclick = (e) => {
    e.stopPropagation();
    headerDropdown.classList.toggle('hidden');
  };
  document.addEventListener('click', () => {
    headerDropdown.classList.add('hidden');
  });
}

const clearChatBtn = document.getElementById('clearChatBtn');
if (clearChatBtn) {
  clearChatBtn.onclick = async () => {
    if (!APP.activeConvId) return;
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện trong phòng này không?')) {
      try {
        await DB.clearChat(APP.activeConvId);
        showToast('Đã xóa sạch lịch sử trò chuyện.', 'success');
        document.getElementById('messagesArea').innerHTML = '<div class="no-msgs"><i class="ti ti-brand-telegram"></i><p>Hãy gửi tin nhắn đầu tiên!</p></div>';
      } catch (e) {
        showToast('Không thể xóa lịch sử trò chuyện!', 'error');
      }
    }
  };
}

boot();