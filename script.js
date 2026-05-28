tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {}
            }
        };
        
        if (localStorage.getItem("theme") === "dark" || (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    
/* Module JS */


/* --- Module Script 1 --- */
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    deleteDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Configs & Environment Setup ---
const IMGBB_API_KEY = "8ef1d841b117d4d6bc14f2cf8bb82bdb";

let parsedFirebaseConfig;
if (typeof __firebase_config !== 'undefined') {
    try {
        parsedFirebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
    } catch (e) {
        parsedFirebaseConfig = __firebase_config;
    }
} else {
    parsedFirebaseConfig = {
        apiKey: "AIzaSyB6owxIha9VxWWWb0cb7CXK6rV9Zx7QhCE",
        authDomain: "mytab-4b290.firebaseapp.com",
        projectId: "mytab-4b290",
        storageBucket: "mytab-4b290.firebasestorage.app",
        messagingSenderId: "1038104124306",
        appId: "1:1038104124306:web:9fa7e542ebe872752fbf4b",
        measurementId: "G-1EQFC7QNVZ"
    };
}

const firebaseConfig = parsedFirebaseConfig;
const appIdStr = typeof __app_id !== 'undefined' ? __app_id : 'mytab-proto';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Post Hashing Helper ---
function getPostNumericId(post) {
    if (!post) return 0;
    if (post.numericId) return post.numericId;
    let hash = 0;
    const s = post.id || '';
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % 900000 + 100000;
}
window.getPostNumericId = getPostNumericId;

// --- Toast & Modal Systems ---
window.showToast = (msg, type = 'info', duration = 3500) => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bg = type === 'error' ? 'bg-rose-500' : (type === 'success' ? 'bg-emerald-500' : (type === 'urgent' ? 'bg-red-600 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.8)] border border-red-400' : 'bg-slate-800 dark:bg-slate-700'));

    let closeBtn = duration === 0 ? `<button onclick="this.parentElement.classList.add('translate-y-10', 'opacity-0'); setTimeout(()=>this.parentElement.remove(), 300)" class="text-white/70 hover:text-white mr-auto shrink-0 pr-3 border-r border-white/20 mr-3"><i data-lucide="x" class="w-4 h-4"></i></button>` : '';

    toast.className = `${bg} text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center justify-between gap-3 transform translate-y-10 opacity-0 transition-all duration-300 pointer-events-auto max-w-[90vw] w-max`;
    toast.innerHTML = `<div class="flex items-center gap-3 leading-snug"><i data-lucide="${type==='error'?'alert-circle':(type==='success'?'check-circle':(type==='urgent'?'alert-triangle':'info'))}" class="w-5 h-5 shrink-0"></i> <span>${msg}</span></div> ${closeBtn}`;
    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // الإخفاء الديناميكي السريع والآمن لشاشة التحميل
    if (!window.isAppLoaded && typeof allUsers !== 'undefined' && typeof allPosts !== 'undefined') {
        window.isAppLoaded = true;
        const splashScreen = document.getElementById('loading-view');
        
        if (splashScreen) {
            splashScreen.style.transition = 'opacity 0.2s ease-out';
            splashScreen.style.opacity = '0';
            splashScreen.style.pointerEvents = 'none';
            setTimeout(() => {
                splashScreen.classList.add('hidden'); // إخفاء آمن لكي لا نعطل السكريبتات الأخرى
            }, 200);
        }
    }

    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('translate-y-10', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

window.showConfirm = (msg, onConfirm) => {
    const modal = document.getElementById('custom-confirm-modal');
    const text = document.getElementById('confirm-modal-text');
    const btnCancel = document.getElementById('confirm-modal-cancel');
    const btnOk = document.getElementById('confirm-modal-ok');

    text.innerText = msg;
    modal.classList.remove('hidden');

    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);

    const closeModal = () => {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };

    btnCancel.onclick = () => {
        closeModal();
    };
    btnOk.onclick = () => {
        closeModal();
        onConfirm();
    };
}

// --- State ---
let currentUser = null;
window.statusSelectedColor = 'bg-emerald-500';
window.currentStatusUserUid = null;
window.currentStatusIndex = 0;

// جلب كل الحالات النشطة (خلال آخر 24 ساعة)
window.getActiveStatuses = (uid) => {
    const u = allUsers.find(x => x.uid === uid);
    if (!u) return [];
    let list = u.statuses || [];
    // دمج الحالة القديمة مع النظام الجديد إن وجدت
    if (u.status && !list.find(s => s.createdAt === u.status.createdAt)) list.push(u.status);
    const now = Date.now();
    return list.filter(s => (now - new Date(s.createdAt).getTime() < 24 * 60 * 60 * 1000)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

window.hasActiveStatus = (uid) => window.getActiveStatuses(uid).length > 0;

// تحديد شكل الهالة مع حساب وتقطيع الدائرة ديناميكياً بعدد الحالات
window.getStatusRingClass = (uid) => {
    const count = window.getActiveStatuses(uid).length;
    if (count === 0) return '';
    if (count === 1) return 'status-ring';

    const className = `status-ring-dynamic-${count}`;
    if (!document.getElementById(`style-${className}`)) {
        let gradient = [];
        let deg = 360 / count;
        // إنشاء أجزاء متساوية مع ترك مسافة (Gap) صغيرة بينها
        for (let i = 0; i < count; i++) {
            gradient.push(`#10b981 ${i * deg}deg ${i * deg + deg - 8}deg`);
            gradient.push(`transparent ${i * deg + deg - 8}deg ${(i + 1) * deg}deg`);
        }
        const style = document.createElement('style');
        style.id = `style-${className}`;
        style.innerHTML = `
                .${className} {
                    padding: 3px !important;
                    background: conic-gradient(${gradient.join(', ')}) !important;
                    border-radius: 50% !important;
                }`;
        document.head.appendChild(style);
    }
    return className;
};

window.handleUserAvatarClick = (uid, photoUrl, e) => {
    if (e) e.stopPropagation();
    const hasStatus = window.hasActiveStatus(uid);

    if (hasStatus || uid === currentUser.uid) {
        window.openStatusActionModal(uid, photoUrl, hasStatus);
    } else {
        window.openProfileLightbox(photoUrl);
    }
};

window.openStatusActionModal = (uid, photoUrl, hasStatus) => {
    const btnViewStatus = document.getElementById('btn-view-status');
    const btnCreateStatus = document.getElementById('btn-create-status');
    const isMe = uid === currentUser.uid;

    if (hasStatus) btnViewStatus.classList.remove('hidden');
    else btnViewStatus.classList.add('hidden');

    if (isMe) btnCreateStatus.classList.remove('hidden');
    else btnCreateStatus.classList.add('hidden');

    btnViewStatus.onclick = () => {
        window.closeStatusActionModal();
        window.viewUserStatus(uid);
    };
    btnCreateStatus.onclick = () => {
        window.closeStatusActionModal();
        window.openStatusCreateModal();
    };
    document.getElementById('btn-view-avatar').onclick = () => {
        window.closeStatusActionModal();
        window.openProfileLightbox(photoUrl);
    };
    document.getElementById('btn-view-profile-page').onclick = () => {
        window.closeStatusActionModal();
        window.viewProfile(uid);
    };

    const modal = document.getElementById('status-action-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('translate-y-full', 'sm:scale-95');
    }, 10);
};

window.closeStatusActionModal = () => {
    const modal = document.getElementById('status-action-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('translate-y-full', 'sm:scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.openStatusCreateModal = () => {
    const modal = document.getElementById('status-create-modal');
    document.getElementById('status-type').value = 'text';
    document.getElementById('status-content').value = '';
    window.statusSelectedColor = 'bg-emerald-500';
    window.statusImageFile = null;
    const imgInput = document.getElementById('status-image-input');
    if (imgInput) imgInput.value = '';
    const imgPreviewCont = document.getElementById('status-image-preview-container');
    if (imgPreviewCont) imgPreviewCont.classList.add('hidden');
    window.updateStatusPreview();
    window.toggleStatusInputs();
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
};

window.closeStatusCreateModal = () => {
    const modal = document.getElementById('status-create-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.toggleStatusInputs = () => {
    const type = document.getElementById('status-type').value;
    const contentInput = document.getElementById('status-content');
    const colorWrapper = document.getElementById('status-color-wrapper');
    const contentWrapper = document.getElementById('status-content-wrapper');
    const imageWrapper = document.getElementById('status-image-wrapper');

    if (type === 'text') {
        if (contentWrapper) contentWrapper.classList.remove('hidden');
        if (imageWrapper) imageWrapper.classList.add('hidden');
        contentInput.placeholder = 'ماذا يدور في ذهنك؟';
        colorWrapper.classList.remove('hidden');
    } else if (type === 'youtube') {
        contentInput.placeholder = 'ضع رابط فيديو اليوتيوب هنا...';
        colorWrapper.classList.add('hidden');
    } else if (type === 'tiktok') {
        if (contentWrapper) contentWrapper.classList.remove('hidden');
        if (imageWrapper) imageWrapper.classList.add('hidden');
        contentInput.placeholder = 'ضع رابط التيك توك هنا...';
        colorWrapper.classList.add('hidden');
    } else if (type === 'image') {
        if (contentWrapper) contentWrapper.classList.add('hidden');
        if (imageWrapper) imageWrapper.classList.remove('hidden');
        colorWrapper.classList.add('hidden');
    }
};

window.statusImageFile = null;
window.handleStatusImagePreview = (e) => {
    const file = e.target.files[0];
    if (file) {
        window.statusImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('status-image-preview').src = e.target.result;
            document.getElementById('status-image-preview-container').classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        };
        reader.readAsDataURL(file);
    }
};

window.updateStatusPreview = () => {
    const btns = document.getElementById('status-color-picker').children;
    for (let btn of btns) {
        if (btn.className.includes(window.statusSelectedColor)) {
            btn.classList.remove('opacity-50');
            btn.classList.add('ring-2', 'ring-offset-2', 'ring-offset-white', 'dark:ring-offset-slate-800');
            const ringColor = window.statusSelectedColor.replace('bg-', 'ring-');
            btn.classList.add(ringColor);
        } else {
            btn.classList.add('opacity-50');
            btn.className = btn.className.replace(/ring-[a-z]+-500/g, '').replace('ring-2', '').replace('ring-offset-2', '').replace('ring-offset-white', '').replace('dark:ring-offset-slate-800', '').replace('ring-slate-800', '');
        }
    }
};

window.saveStatus = async () => {
    const type = document.getElementById('status-type').value;
    const content = document.getElementById('status-content').value.trim();
    if (type !== 'image' && !content) return showToast('يرجى إدخال المحتوى', 'error');
    if (type === 'image' && !window.statusImageFile) return showToast('يرجى اختيار صورة', 'error');

    const btn = document.getElementById('status-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';

    try {
        let finalContent = content;
        if (type === 'image') {
            finalContent = await uploadToImgbb(window.statusImageFile);
        }

        const newStatus = {
            id: Date.now().toString(),
            type: type,
            content: finalContent,
            color: type === 'image' ? '' : window.statusSelectedColor,
            createdAt: new Date().toISOString(),
            views: []
        };

        // التأكد من استدعاء مصفوفة الحالات وتحديثها بشكل سليم (لحل مشكلة اختفاء الحالات القديمة)
        if (!userData.statuses) userData.statuses = [];
        if (userData.status && !userData.statuses.find(s => s.createdAt === userData.status.createdAt)) {
            if (!userData.status.views) userData.status.views = [];
            userData.statuses.push(userData.status);
        }

        userData.statuses.push(newStatus);

        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), {
            statuses: userData.statuses
        });

        showToast('تم نشر الحالة بنجاح!', 'success');
        window.closeStatusCreateModal();
        renderAll();
    } catch (e) {
        console.error(e);
        showToast('حدث خطأ أثناء النشر', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> نشر الحالة';
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.deleteCurrentStatus = async (statusId) => {
    // استخدام رسالة التأكيد القياسية المضمونة 100%
    if (!confirm('هل أنت متأكد من حذف هذه الحالة نهائياً؟')) return;
    try {
        // الفلترة باستخدام id أو createdAt كبديل للحالات القديمة
        userData.statuses = (userData.statuses || []).filter(s => s.id !== statusId && s.createdAt !== statusId);
        let updatePayload = {
            statuses: userData.statuses
        };

        // مسح الحالة القديمة أيضاً لتجنب رجوعها
        if (userData.status && (userData.status.id === statusId || userData.status.createdAt === statusId)) {
            updatePayload.status = null;
        }

        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), updatePayload);
        showToast('تم حذف الحالة بنجاح', 'success');

        const remaining = window.getActiveStatuses(currentUser.uid);
        if (remaining.length === 0) {
            window.closeStatusView();
        } else {
            if (window.currentStatusIndex >= remaining.length) {
                window.currentStatusIndex = remaining.length - 1;
            }
            window.renderCurrentStatus();
        }
        renderAll();
    } catch (e) {
        console.error(e);
        showToast('حدث خطأ أثناء الحذف', 'error');
    }
};

// --- متغيرات مؤقت الحالات (Stories Timer) ---
window.statusDuration = 15000; // 15 ثانية
window.statusAnimationId = null;
window.statusStartTime = 0;
window.isStatusPaused = false;
window.statusRemainingTime = window.statusDuration;

window.startStatusTimer = () => {
    if (window.statusAnimationId) cancelAnimationFrame(window.statusAnimationId);
    window.isStatusPaused = false;
    window.statusStartTime = Date.now();
    window.statusRemainingTime = window.statusDuration;

    const animate = () => {
        if (window.isStatusPaused) {
            window.statusStartTime = Date.now() - (window.statusDuration - window.statusRemainingTime);
            window.statusAnimationId = requestAnimationFrame(animate);
            return;
        }

        const elapsed = Date.now() - window.statusStartTime;
        window.statusRemainingTime = window.statusDuration - elapsed;

        const progress = Math.min((elapsed / window.statusDuration) * 100, 100);

        const currentBar = document.getElementById(`status-progress-${window.currentStatusIndex}`);
        if (currentBar) currentBar.style.width = `${progress}%`;

        if (elapsed >= window.statusDuration) {
            window.nextStatus();
        } else {
            window.statusAnimationId = requestAnimationFrame(animate);
        }
    };
    window.statusAnimationId = requestAnimationFrame(animate);
};

window.viewUserStatus = (uid) => {
    window.currentStatusUserUid = uid;
    window.currentStatusIndex = 0;
    window.renderCurrentStatus();
};

window.nextStatus = (e) => {
    if (e) e.stopPropagation();
    const statuses = window.getActiveStatuses(window.currentStatusUserUid);
    if (window.currentStatusIndex < statuses.length - 1) {
        window.currentStatusIndex++;
        window.renderCurrentStatus();
    } else {
        window.closeStatusView();
    }
};

window.prevStatus = (e) => {
    if (e) e.stopPropagation();
    if (window.currentStatusIndex > 0) {
        window.currentStatusIndex--;
        window.renderCurrentStatus();
    }
};

window.renderCurrentStatus = () => {
    const uid = window.currentStatusUserUid;
    const u = allUsers.find(x => x.uid === uid);
    const statuses = window.getActiveStatuses(uid);
    if (!u || statuses.length === 0 || window.currentStatusIndex >= statuses.length) return window.closeStatusView();

    const modal = document.getElementById('status-view-modal');
    const contentDiv = document.getElementById('status-view-content');
    const status = statuses[window.currentStatusIndex];

    // تسجيل المشاهدة بصمت في قاعدة البيانات إذا لم تكن الحالة للمستخدم الحالي
    if (uid !== currentUser.uid) {
        if (!status.views) status.views = [];
        if (!status.views.includes(currentUser.uid)) {
            status.views.push(currentUser.uid);
            updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', uid), {
                statuses: u.statuses
            }).catch(e => console.error(e));
        }
    }

    // أشرطة التقدم (Progress Bars) بنظامها الجديد الديناميكي
    let progressHtml = '<div class="absolute top-3 left-3 right-3 flex gap-1.5 z-20" dir="ltr">';
    for (let i = 0; i < statuses.length; i++) {
        let barWidth = i < window.currentStatusIndex ? '100%' : '0%';
        progressHtml += `
                    <div class="h-1 flex-1 bg-white/30 rounded-full overflow-hidden shadow-sm backdrop-blur-sm">
                        <div id="status-progress-${i}" class="h-full bg-white rounded-full transition-none" style="width: ${barWidth}"></div>
                    </div>`;
    }
    progressHtml += '</div>';

    let html = '';
    if (status.type === 'image') {
        contentDiv.className = `w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden relative shadow-2xl flex flex-col justify-center items-center text-center p-0 bg-black`;
        html = `<img src="${status.content}" class="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none">`;
    } else if (status.type === 'text') {
        contentDiv.className = `w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden relative shadow-2xl flex flex-col justify-center items-center text-center p-8 text-white ${status.color || 'bg-emerald-500'}`;
        html = `<h2 class="text-2xl md:text-3xl font-bold leading-snug drop-shadow-md whitespace-pre-wrap relative z-10 pointer-events-none" dir="auto">${status.content}</h2>`;
    } else if (status.type === 'youtube') {
        contentDiv.className = `w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden relative shadow-2xl flex flex-col justify-center items-center text-center p-0 bg-black`;
        const ytMatch = status.content.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const ytId = ytMatch ? ytMatch[1] : null;
        if (ytId) {
            html = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0&playsinline=1" class="absolute inset-0 w-full h-full z-10 pointer-events-none" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
        } else {
            html = `<p class="text-white relative z-10 pointer-events-none">رابط يوتيوب غير صالح</p>`;
        }
    } else if (status.type === 'tiktok') {
        contentDiv.className = `w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden relative shadow-2xl flex flex-col justify-center items-center text-center p-0 bg-black`;
        const tkMatch = status.content.match(/(?:tiktok\.com\/@[\w.]+\/video\/|vm\.tiktok\.com\/|vt\.tiktok\.com\/|tiktok\.com\/embed\/v2\/|tiktok\.com\/share\/video\/)(\d+)/i);
        const tkId = tkMatch ? tkMatch[1] : null;
        if (tkId) {
            html = `<iframe src="https://www.tiktok.com/embed/v2/${tkId}" class="absolute inset-0 w-full h-full z-10 pointer-events-none" frameborder="0" allow="fullscreen" allowfullscreen></iframe>`;
        } else {
            html = `<p class="text-white relative z-10 pointer-events-none">رابط تيك توك غير صالح</p>`;
        }
    }

    const targetId = status.id || status.createdAt; // الاعتماد على التاريخ كمعرف للحالات القديمة جداً
    const headerHtml = `
            <div class="absolute top-0 left-0 right-0 pt-6 pb-4 px-4 bg-gradient-to-b from-black/80 to-transparent z-[100] flex items-center justify-between pointer-events-none">
                <div class="flex items-center gap-3 pointer-events-auto">
                    <img src="${u.photoUrl}" class="w-10 h-10 rounded-full border-2 border-emerald-500 object-cover cursor-pointer hover:opacity-80 transition-opacity" onclick="event.stopPropagation(); window.closeStatusView(); window.viewProfile('${u.uid}')">
                    <div class="flex flex-col items-start min-w-0">
                        <span class="font-bold text-white text-sm shadow-sm cursor-pointer hover:underline truncate w-full text-right" onclick="event.stopPropagation(); window.closeStatusView(); window.viewProfile('${u.uid}')">${u.displayName}</span>
                        <span class="text-[10px] text-white/80">${new Date(status.createdAt).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
                ${uid === currentUser.uid ? `<button onclick="event.stopPropagation(); window.deleteCurrentStatus('${targetId}')" class="text-white hover:text-rose-500 bg-black/40 hover:bg-black/70 p-2 rounded-full transition-colors pointer-events-auto" title="حذف هذه الحالة"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
            </div>`;

    // أزرار التنقل المخفية (يجب أن تكون فوق الفيديو وتحت الأزرار)
    const navOverlays = `
            <div class="absolute inset-y-0 left-0 w-1/3 z-[40] cursor-pointer" onclick="window.prevStatus(event)"></div>
            <div class="absolute inset-y-0 right-0 w-2/3 z-[40] cursor-pointer" onclick="window.nextStatus(event)"></div>
            `;

    // زر المشاهدات الخاص بصاحب الحالة
    let authorControlsHtml = '';
    if (uid === currentUser.uid) {
        const viewsCount = (status.views || []).length;
        authorControlsHtml = `
                <div class="absolute bottom-6 left-0 right-0 flex justify-center z-[100] pointer-events-none">
                    <button onclick="event.stopPropagation(); window.showStatusViewers('${targetId}')" class="pointer-events-auto flex flex-col items-center text-white/90 hover:text-white transition-colors bg-black/40 hover:bg-black/70 px-6 py-2.5 rounded-3xl backdrop-blur-md shadow-lg border border-white/10">
                        <i data-lucide="eye" class="w-5 h-5 mb-1"></i>
                        <span class="text-xs font-bold">${viewsCount} مشاهدة</span>
                    </button>
                </div>`;
    }

    contentDiv.innerHTML = html + progressHtml + navOverlays + headerHtml + authorControlsHtml;

    // ميزة الإيقاف المؤقت عند الضغط المستمر (Touch/Hold)
    contentDiv.onmousedown = () => {
        window.isStatusPaused = true;
    };
    contentDiv.onmouseup = () => {
        window.isStatusPaused = false;
    };
    contentDiv.onmouseleave = () => {
        window.isStatusPaused = false;
    };
    contentDiv.ontouchstart = () => {
        window.isStatusPaused = true;
    };
    contentDiv.ontouchend = () => {
        window.isStatusPaused = false;
    };

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // بدء تشغيل المؤقت الزمني
    window.startStatusTimer();
};

// دالة عرض قائمة من شاهد الحالة بشكل ناعم وصغير (Bottom Sheet)
window.showStatusViewers = (statusId) => {
    // إيقاف العداد مؤقتاً
    window.isStatusPaused = true;

    const u = allUsers.find(x => x.uid === currentUser.uid);
    if (!u) return;
    const status = (u.statuses || []).find(s => s.id === statusId || s.createdAt === statusId);
    if (!status) return;
    const viewersIds = status.views || [];

    // خلفية شفافة تغلق القائمة عند الضغط عليها (لإغلاق سهل)
    let html = `<div class="absolute inset-0 z-[65] cursor-pointer" onclick="document.getElementById('viewers-layer').remove(); window.isStatusPaused = false;"></div>`;

    // صندوق المشاهدات الصغير ذو الحواف الناعمة (يظهر من الأسفل)
    html += `<div class="absolute bottom-0 left-0 right-0 max-h-[65%] bg-slate-900/90 backdrop-blur-xl rounded-t-3xl z-[70] flex flex-col p-5 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300" onclick="event.stopPropagation()">`;

    // خط سحب جمالي في الأعلى
    html += `<div class="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 cursor-pointer" onclick="document.getElementById('viewers-layer').remove(); window.isStatusPaused = false;"></div>`;

    html += `
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                <h3 class="text-white font-bold flex items-center gap-2 text-base"><i data-lucide="eye" class="w-4 h-4 text-emerald-500"></i> المشاهدات (${viewersIds.length})</h3>
                <button onclick="document.getElementById('viewers-layer').remove(); window.isStatusPaused = false;" class="text-white/50 hover:text-rose-500 bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>`;

    if (viewersIds.length === 0) {
        html += '<div class="flex-1 flex flex-col items-center justify-center text-white/50 text-sm py-8"><i data-lucide="eye-off" class="w-10 h-10 mb-2 opacity-20"></i>لم يشاهدها أحد.</div>';
    } else {
        html += '<div class="flex-1 overflow-y-auto space-y-2 pb-2" style="scrollbar-width: thin;">';
        viewersIds.forEach(vid => {
            const viewer = allUsers.find(x => x.uid === vid);
            if (viewer) {
                html += `
                        <div class="flex items-center gap-3 bg-white/5 p-2.5 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors" onclick="window.closeStatusView(); window.viewProfile('${viewer.uid}')">
                            <img src="${viewer.photoUrl}" class="w-10 h-10 rounded-full object-cover border border-emerald-500/50">
                            <span class="font-bold text-white text-sm">${viewer.displayName}</span>
                        </div>`;
            }
        });
        html += '</div>';
    }
    html += '</div>';

    const contentDiv = document.getElementById('status-view-content');
    const existing = document.getElementById('viewers-layer');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'viewers-layer';
    div.className = 'absolute inset-0 z-[65] overflow-hidden rounded-2xl'; // لضمان عدم خروجها عن إطار الحالة
    div.innerHTML = html;
    contentDiv.appendChild(div);
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeStatusView = () => {
    // إيقاف العداد فوراً عند إغلاق النافذة
    if (window.statusAnimationId) cancelAnimationFrame(window.statusAnimationId);

    const modal = document.getElementById('status-view-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('status-view-content').innerHTML = '';
    }, 300);
};
let userData = null;
let allUsers = [];
let allPosts = [];
let friendRequests = [];
let allCommunities = [];
let allMessages = [];
let allNotifications = [];
let globalSettings = {};

let activeTabStr = 'feed';
let viewingUid = null;
let activeCommunityId = null;
let activeArchiveDate = null;
let activeArchiveYear = null;
let activeArchiveMonth = null;
let activeChatFriendId = null;
let currentSinglePostId = null;
window.isChatSessionUnlocked = false;

window.unlockChat = () => {
    const input = document.getElementById('chat-unlock-input');
    const err = document.getElementById('chat-unlock-error');
    if (input && userData && input.value === userData.chatPassword) {
        window.isChatSessionUnlocked = true;
        input.value = '';
        if (err) err.classList.add('hidden');
        document.getElementById('chat-lock-screen').classList.add('hidden');
        lucide.createIcons();
    } else {
        if (err) err.classList.remove('hidden');
    }
};

window.lockChat = () => {
    window.isChatSessionUnlocked = false;
    window.switchTab('messages', true);
    showToast('تم قفل الرسائل', 'success');
};

window.requestChatPasswordReset = () => {
    showConfirm('لإعادة تعيين كلمة سر الرسائل، سنحتاج للتأكد من هويتك باستخدام تاريخ ميلادك المسجل. هل تود الاستمرار؟', () => {
        const recoveryValue = prompt("يرجى إدخال تاريخ ميلادك المسجل بصيغة (السنة-الشهر-اليوم)\nمثال: 1990-01-01");
        if (recoveryValue && userData && recoveryValue === userData.birthDate) {
            updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), {
                chatPassword: ''
            }).then(() => {
                window.isChatSessionUnlocked = true;
                document.getElementById('chat-lock-screen').classList.add('hidden');
                showToast('تم التحقق بنجاح وإلغاء قفل الرسائل.', 'success');
            }).catch(() => showToast('حدث خطأ أثناء التحديث', 'error'));
        } else {
            showToast('تاريخ الميلاد غير مطابق للبيانات المسجلة.', 'error');
        }
    });
};

window.setArchiveLevel = (level, val) => {
    if (level === 'year') {
        activeArchiveYear = val;
        activeArchiveMonth = null;
        activeArchiveDate = null;
    } else if (level === 'month') {
        activeArchiveMonth = val;
        activeArchiveDate = null;
    } else if (level === 'day') {
        activeArchiveDate = val;
    } else {
        activeArchiveYear = null;
        activeArchiveMonth = null;
        activeArchiveDate = null;
    }

    if (activeTabStr === 'feed') renderFeedTab();
    else if (activeTabStr === 'profile') renderProfileTab();
    else if (activeTabStr === 'communities') window.renderCommunitiesTab();

    if (val) window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

window.generateArchiveViewHtml = (posts, contextTitle) => {
    if (!activeArchiveYear) {
        const groups = {};
        posts.forEach(p => {
            const y = new Date(p.createdAt).getFullYear().toString();
            if (!groups[y]) groups[y] = 0;
            groups[y]++;
        });
        if (Object.keys(groups).length === 0) return '';
        const colors = ['from-blue-500 to-indigo-600', 'from-purple-500 to-fuchsia-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600'];
        let html = `<div class="mt-12 mb-6 border-t border-slate-200 dark:border-slate-700 pt-8"><h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2"><i data-lucide="archive" class="w-6 h-6 text-emerald-600"></i> ${contextTitle} (السنوات)</h3><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;
        Object.keys(groups).sort().reverse().forEach((y, idx) => {
            html += `<div onclick="window.setArchiveLevel('year', '${y}')" class="group cursor-pointer relative overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1"><div class="absolute top-0 right-0 w-2 h-full bg-gradient-to-b ${colors[idx%colors.length]}"></div><div class="flex justify-between items-center"><div><p class="text-xs text-slate-400 dark:text-slate-500 font-bold mb-1">أرشيف سنة</p><h4 class="text-xl font-black text-slate-800 dark:text-slate-100">${y}</h4></div><div class="bg-slate-50 dark:bg-slate-700/50 w-12 h-12 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-600 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 transition-colors"><span class="text-lg font-black text-emerald-600 dark:text-emerald-400">${groups[y]}</span><span class="text-[9px] font-bold text-slate-400 uppercase">منشور</span></div></div><div class="mt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">تصفح السنة <i data-lucide="arrow-left" class="w-3 h-3"></i></div></div>`;
        });
        return html + `</div></div>`;
    } else if (!activeArchiveMonth) {
        const yPosts = posts.filter(p => new Date(p.createdAt).getFullYear().toString() === activeArchiveYear);
        const groups = {};
        yPosts.forEach(p => {
            const d = new Date(p.createdAt);
            const mStr = (d.getMonth() + 1).toString().padStart(2, '0');
            const mName = d.toLocaleString('ar-EG', {
                month: 'long'
            });
            const key = `${mStr}|${mName}`;
            if (!groups[key]) groups[key] = 0;
            groups[key]++;
        });
        const colors = ['from-blue-500 to-indigo-600', 'from-purple-500 to-fuchsia-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600'];
        let html = `<div class="mt-12 mb-6 border-t border-slate-200 dark:border-slate-700 pt-8"><div class="flex items-center justify-between mb-6"><h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><i data-lucide="archive" class="w-6 h-6 text-emerald-600"></i> ${contextTitle} (${activeArchiveYear})</h3><button onclick="window.setArchiveLevel('reset')" class="text-sm bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl hover:bg-rose-50 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors shadow-sm">إغلاق الأرشيف والعودة</button></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;
        Object.keys(groups).sort().reverse().forEach((k, idx) => {
            const [mNum, mName] = k.split('|');
            html += `<div onclick="window.setArchiveLevel('month', '${mNum}')" class="group cursor-pointer relative overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1"><div class="absolute top-0 right-0 w-2 h-full bg-gradient-to-b ${colors[idx%colors.length]}"></div><div class="flex justify-between items-center"><div><p class="text-xs text-slate-400 dark:text-slate-500 font-bold mb-1">أرشيف شهر</p><h4 class="text-lg font-bold text-slate-800 dark:text-slate-100">${mName}</h4></div><div class="bg-slate-50 dark:bg-slate-700/50 w-12 h-12 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-600 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 transition-colors"><span class="text-lg font-black text-emerald-600 dark:text-emerald-400">${groups[k]}</span><span class="text-[9px] font-bold text-slate-400 uppercase">منشور</span></div></div><div class="mt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">تصفح الشهر <i data-lucide="arrow-left" class="w-3 h-3"></i></div></div>`;
        });
        return html + `</div></div>`;
    } else {
        const ymPosts = posts.filter(p => {
            const d = new Date(p.createdAt);
            return d.getFullYear().toString() === activeArchiveYear && (d.getMonth() + 1).toString().padStart(2, '0') === activeArchiveMonth;
        });
        const groups = {};
        ymPosts.forEach(p => {
            const dStr = getSafeYMD(p.createdAt);
            if (!groups[dStr]) groups[dStr] = 0;
            groups[dStr]++;
        });
        const mName = new Date(`${activeArchiveYear}-${activeArchiveMonth}-01`).toLocaleString('ar-EG', {
            month: 'long'
        });
        const colors = ['from-blue-500 to-indigo-600', 'from-purple-500 to-fuchsia-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600'];
        let html = `<div class="mt-12 mb-6 border-t border-slate-200 dark:border-slate-700 pt-8"><div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6"><h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><i data-lucide="archive" class="w-6 h-6 text-emerald-600"></i> أرشيف ${mName} ${activeArchiveYear}</h3><div class="flex gap-2"><button onclick="window.setArchiveLevel('year', '${activeArchiveYear}')" class="flex-1 sm:flex-none text-sm bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl hover:bg-slate-200 font-bold flex justify-center items-center gap-1 transition-colors shadow-sm"><i data-lucide="arrow-right" class="w-4 h-4"></i> الشهور</button><button onclick="window.setArchiveLevel('reset')" class="flex-1 sm:flex-none text-sm bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl hover:bg-rose-50 hover:text-rose-600 font-bold flex justify-center items-center gap-1 transition-colors shadow-sm">إغلاق الأرشيف</button></div></div><div class="grid grid-cols-2 sm:grid-cols-4 gap-4">`;
        Object.keys(groups).sort().reverse().forEach((d, idx) => {
            const dayNum = d.split('-')[2];
            html += `<div onclick="window.setArchiveLevel('day', '${d}')" class="group cursor-pointer relative overflow-hidden bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1"><div class="absolute top-0 right-0 w-2 h-full bg-gradient-to-b ${colors[idx%colors.length]}"></div><div class="flex flex-col items-center justify-center text-center"><p class="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-1">يوم</p><h4 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">${dayNum}</h4><span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">${groups[d]} منشور</span></div></div>`;
        });
        return html + `</div></div>`;
    }
};
let isAuthLoginMode = true;
let editingItemId = null;
let editingItemType = null;
let postSelectedColor = 'white';
let postImageFile = null;
let regSocialLinks = [];
let isAdminStealthMode = false;
let isEditingProfile = false;

window.tmpCommImgFile = null;
window.tmpProfImgFile = null;
window.removeProfImg = false;

const POST_COLORS = {
    'white': {
        bg: 'bg-white dark:bg-slate-800',
        border: 'border-gray-200 dark:border-slate-700',
        text: 'text-slate-800 dark:text-slate-100',
        pickerBtn: 'bg-slate-200 dark:bg-slate-700'
    },
    'green': {
        bg: 'bg-emerald-100 dark:bg-emerald-900/40',
        border: 'border-emerald-300 dark:border-emerald-700/50',
        text: 'text-emerald-900 dark:text-emerald-100',
        pickerBtn: 'bg-emerald-400'
    },
    'yellow': {
        bg: 'bg-yellow-100 dark:bg-yellow-900/40',
        border: 'border-yellow-300 dark:border-yellow-700/50',
        text: 'text-yellow-900 dark:text-yellow-100',
        pickerBtn: 'bg-yellow-400'
    },
    'blue': {
        bg: 'bg-blue-100 dark:bg-blue-900/40',
        border: 'border-blue-300 dark:border-blue-700/50',
        text: 'text-blue-900 dark:text-blue-100',
        pickerBtn: 'bg-blue-400'
    },
    'gray': {
        bg: 'bg-gray-100 dark:bg-slate-700',
        border: 'border-gray-300 dark:border-slate-600',
        text: 'text-gray-900 dark:text-gray-100',
        pickerBtn: 'bg-gray-400'
    },
    'rose': {
        bg: 'bg-rose-100 dark:bg-rose-900/40',
        border: 'border-rose-300 dark:border-rose-700/50',
        text: 'text-rose-900 dark:text-rose-100',
        pickerBtn: 'bg-rose-400'
    },
    /* القديمة */
    'img1': {
        bg: 'post-bg-1',
        border: 'border-rose-200 dark:border-rose-900/50',
        text: 'text-rose-900 dark:text-rose-100',
        pickerBtn: 'post-bg-1'
    },
    'img2': {
        bg: 'post-bg-2',
        border: 'border-emerald-200 dark:border-emerald-900/50',
        text: 'text-emerald-900 dark:text-emerald-100',
        pickerBtn: 'post-bg-2'
    },
    'img3': {
        bg: 'post-bg-3',
        border: 'border-slate-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-3'
    },
    'img4': {
        bg: 'post-bg-4',
        border: 'border-amber-200 dark:border-amber-900/50',
        text: 'text-amber-900 dark:text-amber-100',
        pickerBtn: 'post-bg-4'
    },
    'img5': {
        bg: 'post-bg-5',
        border: 'border-purple-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-5'
    },
    /* الـ 20 الجديدة */
    'img6': {
        bg: 'post-bg-6',
        border: 'border-slate-200 dark:border-slate-700',
        text: 'text-slate-900 dark:text-slate-100',
        pickerBtn: 'post-bg-6'
    },
    'img7': {
        bg: 'post-bg-7',
        border: 'border-rose-200 dark:border-rose-700',
        text: 'text-rose-900 dark:text-rose-100',
        pickerBtn: 'post-bg-7'
    },
    'img8': {
        bg: 'post-bg-8',
        border: 'border-amber-200 dark:border-amber-700',
        text: 'text-amber-900 dark:text-amber-100',
        pickerBtn: 'post-bg-8'
    },
    'img9': {
        bg: 'post-bg-9',
        border: 'border-slate-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-9'
    },
    'img10': {
        bg: 'post-bg-10',
        border: 'border-slate-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-10'
    },
    'img11': {
        bg: 'post-bg-11',
        border: 'border-blue-200 dark:border-blue-700',
        text: 'text-blue-900 dark:text-blue-100',
        pickerBtn: 'post-bg-11'
    },
    'img12': {
        bg: 'post-bg-12',
        border: 'border-rose-200 dark:border-rose-700',
        text: 'text-rose-900 dark:text-rose-100',
        pickerBtn: 'post-bg-12'
    },
    'img13': {
        bg: 'post-bg-13',
        border: 'border-slate-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-13'
    },
    'img14': {
        bg: 'post-bg-14',
        border: 'border-slate-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-14'
    },
    'img15': {
        bg: 'post-bg-15',
        border: 'border-slate-200 dark:border-slate-700',
        text: 'text-slate-900 dark:text-slate-100',
        pickerBtn: 'post-bg-15'
    },
    'img16': {
        bg: 'post-bg-16',
        border: 'border-slate-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-16'
    },
    'img17': {
        bg: 'post-bg-17',
        border: 'border-rose-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-17'
    },
    'img18': {
        bg: 'post-bg-18',
        border: 'border-emerald-200 dark:border-emerald-700',
        text: 'text-emerald-900 dark:text-emerald-100',
        pickerBtn: 'post-bg-18'
    },
    'img19': {
        bg: 'post-bg-19',
        border: 'border-slate-200 dark:border-slate-700',
        text: 'text-slate-900 dark:text-slate-100',
        pickerBtn: 'post-bg-19'
    },
    'img20': {
        bg: 'post-bg-20',
        border: 'border-slate-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-20'
    },
    'img21': {
        bg: 'post-bg-21',
        border: 'border-slate-200 dark:border-slate-700',
        text: 'text-slate-900 dark:text-slate-100',
        pickerBtn: 'post-bg-21'
    },
    'img22': {
        bg: 'post-bg-22',
        border: 'border-rose-200 dark:border-rose-700',
        text: 'text-rose-900 dark:text-rose-100',
        pickerBtn: 'post-bg-22'
    },
    'img23': {
        bg: 'post-bg-23',
        border: 'border-purple-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-23'
    },
    'img24': {
        bg: 'post-bg-24',
        border: 'border-slate-700',
        text: 'text-white drop-shadow-md',
        pickerBtn: 'post-bg-24'
    },
    'img25': {
        bg: 'post-bg-25',
        border: 'border-amber-200 dark:border-amber-700',
        text: 'text-amber-900 dark:text-amber-100',
        pickerBtn: 'post-bg-25'
    }
};

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
updateThemeIcons();

// --- Admin Setup ---
window.isSuperAdmin = () => {
    return currentUser && currentUser.email === 'khmohieldin@gmail.com';
};

// --- Theme Logic ---
window.toggleFontSize = () => {
    const html = document.documentElement;
    let currentSize = localStorage.getItem('fontSize') || 'normal';
    let nextSize = 'md';
    let textLabel = 'خط: متوسط';

    if (currentSize === 'normal') {
        nextSize = 'md';
        textLabel = 'خط: متوسط';
    } else if (currentSize === 'md') {
        nextSize = 'lg';
        textLabel = 'خط: كبير';
    } else {
        nextSize = 'normal';
        textLabel = 'حجم الخط';
    }

    html.classList.remove('font-md', 'font-lg');
    if (nextSize !== 'normal') html.classList.add(`font-${nextSize}`);

    localStorage.setItem('fontSize', nextSize);

    const btnText = document.getElementById('font-size-text');
    if (btnText) btnText.innerText = textLabel;
}

window.toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
    updateThemeIcons();
}

function updateThemeIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    const iconName = isDark ? 'sun' : 'moon';
    const text = isDark ? 'الوضع الفاتح' : 'الوضع الداكن';
    const desktopIcon = document.getElementById('theme-icon');
    const desktopText = document.getElementById('theme-text');
    const mobileIcon = document.getElementById('mobile-theme-icon');
    if (desktopIcon) desktopIcon.setAttribute('data-lucide', iconName);
    if (desktopText) desktopText.innerText = text;
    if (mobileIcon) mobileIcon.setAttribute('data-lucide', iconName);

    // Update Font Size Label on load
    const savedFontSize = localStorage.getItem('fontSize');
    const fontTextEl = document.getElementById('font-size-text');
    if (fontTextEl) {
        if (savedFontSize === 'md') fontTextEl.innerText = 'خط: متوسط';
        else if (savedFontSize === 'lg') fontTextEl.innerText = 'خط: كبير';
        else fontTextEl.innerText = 'حجم الخط';
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// --- Auth Observer ---
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        if (window.isRegisteringFlow) return; // ننتظر انتهاء دالة التسجيل بالإيميل لعدم التعارض

        const userRef = doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // الدخول لأول مرة عبر جوجل (إنشاء حساب تلقائي فوراً دون الشاشة المعلقة)
            const newUser = {
                uid: user.uid,
                myTabId: generateUniqueId(),
                displayName: user.displayName || 'مستخدم جديد',
                gender: 'male',
                birthDate: '',
                phoneNumber: '',
                address: '',
                email: user.email || '',
                socialLinks: [],
                bio: 'مرحباً بك في مساحتي الآمنة على MyTab.',
                photoUrl: user.photoURL || globalSettings.defaultMaleAvatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.uid}-male&backgroundColor=10b981`,
                coverUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop',
                friends: [],
                isPrivate: true,
                isAdmin: false,
                isApproved: true,
                isVerified: true,
                needsOnboarding: true,
                createdAt: new Date().toISOString()
            };
            await setDoc(userRef, newUser);
            userData = newUser;
        } else {
            userData = userSnap.data();
        }

        if (userData.isBanned) {
            await signOut(auth);
            showToast('لقد تم حظر حسابك من قبل الإدارة.', 'error');
            return;
        }

        viewingUid = currentUser.uid;

        if (window.isSuperAdmin()) {
            document.getElementById('nav-admin').classList.remove('hidden');
        } else {
            document.getElementById('nav-admin').classList.add('hidden');
        }

        setupDataListeners();
        showView('main-layout');
        updateSidebar();
        renderAll();

        if (!user.isAnonymous && user.providerData.some(p => p.providerId === 'password') && !user.emailVerified) {
            setTimeout(() => {
                showToast('مرحباً بك! يمكنك استخدام الموقع بحرية، لكن نرجو تفعيل بريدك لاحقاً لتتمكن من استعادة كلمة المرور عند نسيانها.', 'urgent', 0);
            }, 2500);
        }

        if (userData.needsOnboarding) {
            setTimeout(() => window.showOnboardingModal(), 500);
        }

        if (!localStorage.getItem('mytab_charter_accepted')) window.showCharterModal();

        if (typeof window.processPendingSharedText === 'function') {
            window.processPendingSharedText();
        }

        if (window.AndroidApp && typeof window.AndroidApp.requestFCMToken === 'function') {
            window.AndroidApp.requestFCMToken();
        }
    } else {
        userData = null;
        viewingUid = null;
        showView('main-layout');
        // إخفاء التابات الجانبية ومربع النشر لأن الزائر ليس لديه حساب
        ['nav-messages', 'nav-friends', 'nav-profile', 'nav-notifications', 'nav-requests', 'mobile-bell-container', 'create-post-container'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        setupDataListeners();
        window.switchTab('feed', true);
    }
});

// --- Listeners ---
let unsubs = [];

function setupDataListeners() {
    unsubs.forEach(u => u());
    unsubs = [];

    const u1 = onSnapshot(collection(db, 'artifacts', appIdStr, 'public', 'data', 'users'), (snap) => {
        allUsers = snap.docs.map(d => d.data());
        if (!currentUser) {
            updateSidebar();
            renderAll();
            return;
        }
        const current = snap.docs.find(d => d.uid === currentUser.uid);
        if (current) {
            userData = current;
            if (userData.isBanned) {
                signOut(auth);
                showToast('تم حظر حسابك من قبل الإدارة.', 'error');
                return;
            }
        }
        updateSidebar();
        renderAll();
    }, (error) => console.error(error));

    const u2 = onSnapshot(collection(db, 'artifacts', appIdStr, 'public', 'data', 'posts'), (snap) => {
        allPosts = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        })).sort((a, b) => {
            const getTime = (p) => {
                if (!p.createdAt) return 0;
                if (typeof p.createdAt === 'string') return new Date(p.createdAt).getTime() || 0;
                if (p.createdAt.seconds) return p.createdAt.seconds * 1000;
                if (typeof p.createdAt.toDate === 'function') return p.createdAt.toDate().getTime();
                return 0;
            };
            return getTime(b) - getTime(a);
        });
        renderAll();
        if (typeof window.handlePostDeepLink === 'function') {
            window.handlePostDeepLink();
        }
    }, (error) => console.error(error));

    const u3 = onSnapshot(collection(db, 'artifacts', appIdStr, 'public', 'data', 'friendRequests'), (snap) => {
        friendRequests = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));
        updateBadge();
        if (activeTabStr === 'requests') renderRequestsTab();
    }, (error) => console.error(error));

    const u4 = onSnapshot(collection(db, 'artifacts', appIdStr, 'public', 'data', 'communities'), (snap) => {
        allCommunities = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));
        if (activeTabStr === 'communities') window.renderCommunitiesTab();
        if (activeTabStr === 'profile') renderProfileTab();
    }, (error) => console.error(error));

    const u5 = onSnapshot(collection(db, 'artifacts', appIdStr, 'public', 'data', 'messages'), (snap) => {
        // تصفية الرسائل التي قام المستخدم الحالي بحذفها من عنده (مثل الفويس بعد الاستماع)
        allMessages = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        })).filter(m => !(m.deletedFor && m.deletedFor.includes(currentUser?.uid)));

        // فحص الحذف التلقائي للرسائل (إذا كنت أنت أو صديقك مفعلين الخاصية)
        if (currentUser) {
            const now = Date.now();
            allMessages.forEach(m => {
                if (m.senderId === currentUser.uid || m.receiverId === currentUser.uid) {
                    const friendId = m.senderId === currentUser.uid ? m.receiverId : m.senderId;
                    const friend = allUsers.find(u => u.uid === friendId);

                    let myHours = (userData && userData.autoDeleteHours) ? userData.autoDeleteHours : (userData && userData.autoDeleteMessages ? 12 : 0);
                    let friendHours = (friend && friend.autoDeleteHours) ? friend.autoDeleteHours : (friend && friend.autoDeleteMessages ? 12 : 0);

                    // نختار أقل مدة بين الطرفين لتطبيق الحذف (إذا كان أحدهما مفعلها)
                    let deleteHours = 0;
                    if (myHours > 0 && friendHours > 0) deleteHours = Math.min(myHours, friendHours);
                    else if (myHours > 0) deleteHours = myHours;
                    else if (friendHours > 0) deleteHours = friendHours;

                    if (deleteHours > 0) {
                        const msAllowed = deleteHours * 60 * 60 * 1000;
                        if ((now - new Date(m.createdAt).getTime()) > msAllowed) {
                            try {
                                deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', m.id));
                            } catch (e) {}
                        }
                    }
                }
            });
        }

        updateBadge();
        if (activeTabStr === 'messages') {
            if (activeChatFriendId) window.renderChatRoom();
            else renderMessagesList();
        }
    }, (error) => console.error(error));

    const u6 = onSnapshot(collection(db, 'artifacts', appIdStr, 'public', 'data', 'notifications'), (snap) => {
        allNotifications = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        if (currentUser) {
            const myNotifs = allNotifications.filter(n => n.to === currentUser.uid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            if (myNotifs.length > 30) {
                const toDelete = myNotifs.slice(30);
                toDelete.forEach(async n => {
                    try {
                        await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'notifications', n.id));
                    } catch (e) {}
                });
            }
        }
        updateBadge();
        if (activeTabStr === 'notifications') window.renderNotificationsTab();
    }, (error) => console.error(error));

    const u7 = onSnapshot(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), (snap) => {
        if (snap.exists()) {
            globalSettings = snap.data();
        } else {
            globalSettings = {};
        }

        // --- نظام النافذة المنبثقة الذكي (يعمل فورياً مع أي تحديث) ---
        if (globalSettings.annCode && globalSettings.annId) {
            const seenId = localStorage.getItem('seen_ann_id');
            // لو المستخدم لسه مشافش الإعلان ده، والنافذة مش مفتوحة بالفعل
            if (seenId !== String(globalSettings.annId) && !document.getElementById('smart-announcement-modal')) {
                const modal = document.createElement('div');
                modal.id = 'smart-announcement-modal';
                modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 transition-opacity duration-300 opacity-0';
                modal.innerHTML = `
                    <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden w-full max-w-xl relative border border-slate-100 dark:border-slate-700">
                        <button id="close-ann-btn" class="absolute top-3 left-3 z-20 bg-black/40 hover:bg-rose-600 text-white rounded-full p-1.5 transition-colors">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                        <div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 relative z-20">
                            <div id="ann-progress" class="bg-emerald-500 h-full w-full origin-right transition-transform" style="transition-duration: 15000ms; transition-timing-function: linear;"></div>
                        </div>
                        <div class="p-6 max-h-[85vh] overflow-y-auto text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center text-center font-medium relative z-10">
                            ${globalSettings.annCode}
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                setTimeout(() => modal.classList.remove('opacity-0'), 50);

                const closeModal = () => {
                    localStorage.setItem('seen_ann_id', String(globalSettings.annId));
                    modal.classList.add('opacity-0');
                    setTimeout(() => modal.remove(), 300);
                };

                modal.querySelector('#close-ann-btn').onclick = closeModal;

                setTimeout(() => {
                    const prog = modal.querySelector('#ann-progress');
                    if (prog) prog.style.transform = 'scaleX(0)';
                }, 100);

                // إغلاق النافذة تلقائياً بعد 15 ثانية
                setTimeout(() => {
                    if (document.getElementById('smart-announcement-modal')) closeModal();
                }, 15000);
                
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }

        const maintenanceView = document.getElementById('maintenance-view');
        if (globalSettings.maintenanceMode && !window.isSuperAdmin()) {
            if (maintenanceView) {
                maintenanceView.classList.remove('hidden');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        } else {
            if (maintenanceView) maintenanceView.classList.add('hidden');
        }

        updateSidebar();
        if (activeTabStr === 'feed') renderFeedTab();
    }, (error) => console.error(error));

    window.toggleMaintenanceMode = async (isMaintenance) => {
        if (!window.isSuperAdmin()) return;
        try {
            await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
                ...globalSettings,
                maintenanceMode: isMaintenance
            }, {
                merge: true
            });
            showToast(isMaintenance ? 'تم تفعيل وضع الصيانة وإغلاق الموقع' : 'تم إيقاف وضع الصيانة وفتح الموقع', isMaintenance ? 'info' : 'success');
        } catch (e) {
            showToast('حدث خطأ', 'error');
            document.getElementById('admin-maintenance-toggle').checked = !isMaintenance;
        }
    };

    unsubs.push(u1, u2, u3, u4, u5, u6, u7);

    // تشغيل فاحص دوري كل دقيقة لحذف الرسائل التي انتهت مدتها
    if (window.autoDeleteInterval) clearInterval(window.autoDeleteInterval);
    window.autoDeleteInterval = setInterval(() => {
        if (!currentUser) return;
        const now = Date.now();
        let hasDeletions = false;

        allMessages.forEach(m => {
            if (m.senderId === currentUser.uid || m.receiverId === currentUser.uid) {
                const friendId = m.senderId === currentUser.uid ? m.receiverId : m.senderId;
                const friend = allUsers.find(u => u.uid === friendId);

                let myHours = (userData && userData.autoDeleteHours) ? userData.autoDeleteHours : (userData && userData.autoDeleteMessages ? 12 : 0);
                let friendHours = (friend && friend.autoDeleteHours) ? friend.autoDeleteHours : (friend && friend.autoDeleteMessages ? 12 : 0);

                let deleteHours = 0;
                if (myHours > 0 && friendHours > 0) deleteHours = Math.min(myHours, friendHours);
                else if (myHours > 0) deleteHours = myHours;
                else if (friendHours > 0) deleteHours = friendHours;

                if (deleteHours > 0) {
                    const msAllowed = deleteHours * 60 * 60 * 1000;
                    if ((now - new Date(m.createdAt).getTime()) > msAllowed) {
                        hasDeletions = true;
                        try {
                            deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', m.id));
                        } catch (e) {}
                    }
                }
            }
        });

        if (hasDeletions && activeTabStr === 'messages') {
            if (activeChatFriendId) window.renderChatRoom();
            else renderMessagesList();
        }
    }, 60000);
}

// --- View Management ---
let isSwitchTabProtected = false;
function showView(viewId) {
    if (!isSwitchTabProtected && typeof window.switchTab === 'function') {
        const originalSwitch = window.switchTab;
        window.switchTab = function(tab, preserveState = false) {
            if (!currentUser && tab !== 'feed') {
                document.getElementById('main-layout').classList.add('hidden');
                document.getElementById('auth-view').classList.remove('hidden');
                return;
            }
            return originalSwitch.call(window, tab, preserveState);
        };
        isSwitchTabProtected = true;
    }
    if (!currentUser && viewId !== 'main-layout' && viewId !== 'auth-view') { viewId = 'main-layout'; } // توجيه آمن للزوار
    if (!currentUser && viewId !== 'main-layout' && viewId !== 'auth-view') { activeTabStr = 'feed'; viewId = 'main-layout'; }
    ['loading-view', 'auth-view', 'verify-view', 'register-details-view', 'main-layout'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
    if (viewId !== 'loading-view') {
        const el = document.getElementById(viewId);
        el.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => el.classList.remove('opacity-0'), 50);
    }
}

window.switchAuthTab = (type) => {
    isAuthLoginMode = (type === 'login');
    const activeClass = 'flex-1 py-2 rounded-lg text-sm font-medium transition-colors bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400';
    const inactiveClass = 'flex-1 py-2 rounded-lg text-sm font-medium transition-colors text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white';
    document.getElementById('tab-login').className = isAuthLoginMode ? activeClass : inactiveClass;
    document.getElementById('tab-register').className = !isAuthLoginMode ? activeClass : inactiveClass;
    document.getElementById('auth-submit-text').innerText = isAuthLoginMode ? 'دخول' : 'إنشاء حساب';
    const forgotBtn = document.getElementById('auth-forgot-pwd-btn');
    if (forgotBtn) forgotBtn.style.display = isAuthLoginMode ? 'block' : 'none';
}

window.toggleMobileMenu = () => {
    const sidebar = document.getElementById('sidebar-nav');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    if (sidebar && overlay) {
        if (sidebar.classList.contains('translate-x-full')) {
            sidebar.classList.remove('translate-x-full');
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        } else {
            sidebar.classList.add('translate-x-full');
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    }
};

window.switchTab = (tab, preserveState = false, fromHistory = false) => {
    // توجيه الزوار إلى شاشة التسجيل إذا حاولوا فتح تاب غير مسموح به
    if (!currentUser && tab !== 'feed') {
        document.getElementById('main-layout').classList.add('hidden');
        document.getElementById('auth-view').classList.remove('hidden');
        return;
    }

    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar-nav');
        if (sidebar && !sidebar.classList.contains('translate-x-full')) window.toggleMobileMenu();
    }
    if (tab === 'communities' && !preserveState) activeCommunityId = null;
    if (tab === 'messages' && !activeChatFriendId) activeChatFriendId = null;
    if (tab !== 'profile' && currentUser) {
        viewingUid = currentUser.uid;
        isAdminStealthMode = false;
    }
    activeArchiveDate = null;

    activeTabStr = tab;
    
    // إضافة خطوة التصفح إلى متصفح الموبايل
    if (!fromHistory) {
        window.history.pushState({ tab: tab }, '', `#${tab}`);
    }
    ['feed', 'profile', 'search', 'favorites', 'requests', 'friends', 'communities', 'messages', 'notifications', 'singlepost', 'admin'].forEach(t => {
        const tc = document.getElementById(`tab-content-${t}`);
        if (tc) tc.classList.add('hidden');
        const navBtn = document.getElementById(`nav-${t}`);
        if (navBtn) {
            if (t === 'admin') {
                const isHidden = !window.isSuperAdmin() ? 'hidden ' : '';
                navBtn.className = `${isHidden}nav-btn flex items-center justify-center md:justify-start gap-4 p-3 md:px-4 md:py-3 w-full rounded-2xl transition-all ${t===tab ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 font-medium' : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'}`;
            } else {
                navBtn.className = `nav-btn flex items-center justify-center md:justify-start gap-4 p-3 md:px-4 md:py-3 w-full rounded-2xl transition-all ${t===tab ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`;
            }
        }
    });
    const tcAct = document.getElementById(`tab-content-${tab}`);
    if (tcAct) {
        tcAct.classList.remove('hidden');
        tcAct.classList.add('opacity-0', 'translate-y-4', 'transition-all', 'duration-300');
        setTimeout(() => tcAct.classList.remove('opacity-0', 'translate-y-4'), 50);
    }
    if (tab === 'profile') {
        const settingsPanel = document.getElementById('profile-notifications-settings');
        if (settingsPanel) {
            if (viewingUid === currentUser.uid) {
                settingsPanel.classList.remove('hidden');
                document.getElementById('setting-bell-icon').checked = window.bellIconEnabled;
                document.getElementById('setting-bell-sound').checked = window.bellSoundEnabled;
            } else {
                settingsPanel.classList.add('hidden');
            }
        }
    }

    if (tab === 'messages') {
        tcAct.classList.add('flex');

        const hasChatPwd = userData && userData.chatPassword && userData.chatPassword.trim() !== '';
        const lockScreen = document.getElementById('chat-lock-screen');
        const lockBtn = document.getElementById('lock-chat-btn');
        if (hasChatPwd) {
            if (lockBtn) lockBtn.classList.remove('hidden');
            if (!window.isChatSessionUnlocked) {
                if (lockScreen) lockScreen.classList.remove('hidden');
                setTimeout(() => {
                    const pwdInput = document.getElementById('chat-unlock-input');
                    if (pwdInput) pwdInput.focus();
                }, 100);
            } else {
                if (lockScreen) lockScreen.classList.add('hidden');
            }
        } else {
            if (lockBtn) lockBtn.classList.add('hidden');
            if (lockScreen) lockScreen.classList.add('hidden');
        }

        if (!activeChatFriendId) {
            document.getElementById('chat-room-view').classList.add('hidden');
            document.getElementById('messages-list-view').classList.remove('hidden');
        }
    }

    if (tab === 'notifications') {
        if (typeof window.renderNotificationsList === 'function') {
            window.renderNotificationsList();
        }
    }

    renderAll();
}

window.goToChat = (uid) => {
    activeChatFriendId = uid;
    window.switchTab('messages');
    window.openChatRoom(uid);
}
window.viewProfile = (uid) => {
    viewingUid = uid;
    isEditingProfile = false;
    isAdminStealthMode = false;
    window.switchTab('profile');
}
window.viewMyProfile = () => window.viewProfile(currentUser.uid);
window.adminViewUser = (uid) => {
    viewingUid = uid;
    isEditingProfile = false;
    isAdminStealthMode = true;
    window.switchTab('profile');
}

// --- Authentication Functions ---
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errDiv = document.getElementById('auth-error');
    const errText = document.getElementById('auth-error-text');
    const btn = document.getElementById('auth-submit-btn');
    const isLoginMode = document.getElementById('register-extra-fields').classList.contains('hidden');

    errDiv.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(cred.user);

            const name = document.getElementById('reg-name') ? document.getElementById('reg-name').value : '';
            const gender = document.getElementById('reg-gender') ? document.getElementById('reg-gender').value : 'male';
            const dob = document.getElementById('reg-dob') ? document.getElementById('reg-dob').value : '';
            const phone = document.getElementById('reg-phone') ? document.getElementById('reg-phone').value : '';
            const address = document.getElementById('reg-address') ? document.getElementById('reg-address').value : '';

            let defaultAvatar = gender === 'female' ?
                'https://img.magnific.com/premium-vector/confident-woman-with-approval-checkmark_778176-1287.jpg' :
                'https://www.axelpfaender.com/wp-content/uploads/2026/04/Zeichenflache-12thumb.jpg';

            if (gender === 'female' && globalSettings.defaultFemaleAvatar) defaultAvatar = globalSettings.defaultFemaleAvatar;
            if (gender === 'male' && globalSettings.defaultMaleAvatar) defaultAvatar = globalSettings.defaultMaleAvatar;

            const newUser = {
                uid: cred.user.uid,
                myTabId: generateUniqueId(),
                displayName: name,
                gender: gender,
                birthDate: dob,
                phoneNumber: phone,
                address: address,
                email: email,
                socialLinks: [],
                bio: 'مرحباً بك في مساحتي الآمنة على MyTab.',
                photoUrl: defaultAvatar,
                coverUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop',
                friends: [],
                isPrivate: true,
                isAdmin: false,
                isApproved: true,
                isVerified: true,
                needsOnboarding: true,
                createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', cred.user.uid), newUser);

            // لن نوقفه في شاشة التفعيل، سيدخل مباشرة بفضل onAuthStateChanged
        }
    } catch (error) {
        errDiv.classList.remove('hidden');
        if (error.code === 'auth/email-already-in-use') errText.innerText = 'البريد مستخدم مسبقاً.';
        else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') errText.innerText = 'بيانات الدخول غير صحيحة.';
        else if (error.code === 'auth/weak-password') errText.innerText = 'كلمة المرور ضعيفة جداً.';
        else errText.innerText = 'حدث خطأ. تأكد من البيانات.';
    }
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="mail" class="w-5 h-5"></i> <span>${isLoginMode?'دخول':'إنشاء حساب'}</span>`;
    lucide.createIcons();
});

window.handleGoogleAuth = async () => {
    const errDiv = document.getElementById('auth-error');
    const errText = document.getElementById('auth-error-text');
    errDiv.classList.add('hidden');
    try {
        await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            errDiv.classList.remove('hidden');
            errText.innerText = 'فشل تسجيل الدخول بواسطة جوجل.';
        }
    }
}

window.showOnboardingModal = () => {
    const cats = [{
            id: 'sports',
            name: 'رياضة ⚽'
        }, {
            id: 'religion',
            name: 'ديني ☪️'
        }, {
            id: 'politics',
            name: 'سياسي 🏛️'
        },
        {
            id: 'social',
            name: 'اجتماعي 👥'
        }, {
            id: 'entertainment',
            name: 'ترفيهي 🎮'
        }, {
            id: 'art',
            name: 'فني 🎨'
        },
        {
            id: 'education',
            name: 'تعليمي 📚'
        }, {
            id: 'tech',
            name: 'تقني 💻'
        }, {
            id: 'business',
            name: 'أعمال 💼'
        },
        {
            id: 'news',
            name: 'أخبار 📰'
        }, {
            id: 'cars',
            name: 'سيارات 🚗'
        }, {
            id: 'games',
            name: 'ألعاب 🎯'
        },
        {
            id: 'movies',
            name: 'أفلام 🎬'
        }, {
            id: 'music',
            name: 'موسيقى 🎵'
        }, {
            id: 'health',
            name: 'صحة 🏋️'
        }
    ];
    const container = document.getElementById('onboarding-categories');
    container.innerHTML = cats.map(c => `
                <div class="onboarding-cat cursor-pointer border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-2 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all select-none" data-cat="${c.id}" onclick="this.classList.toggle('border-emerald-500'); this.classList.toggle('bg-emerald-50'); this.classList.toggle('dark:border-emerald-500'); this.classList.toggle('dark:bg-emerald-900/40'); this.classList.toggle('selected'); this.querySelector('.check-icon').classList.toggle('opacity-100'); this.querySelector('.check-icon').classList.toggle('scale-100')">
                    <span class="font-bold text-slate-700 dark:text-slate-200 text-sm md:text-base">${c.name}</span>
                    <div class="check-icon opacity-0 scale-50 transition-all text-emerald-500 bg-white rounded-full"><i data-lucide="check-circle-2" class="w-5 h-5 fill-current text-white bg-emerald-500 rounded-full"></i></div>
                </div>
            `).join('');

    const modal = document.getElementById('onboarding-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.completeOnboarding = async () => {
    const btn = document.getElementById('onboarding-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري إعداد مساحتك...';

    const selectedCats = Array.from(document.querySelectorAll('.onboarding-cat.selected')).map(el => el.dataset.cat);

    try {
        // فلترة المجتمعات العامة التي تطابق اهتمامات المستخدم
        const commsToJoin = allCommunities.filter(c => !c.isPrivate && selectedCats.includes(c.category));

        // تحديث المستخدم
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), {
            needsOnboarding: false,
            interests: selectedCats
        });

        // انضمام للمجتمعات
        const joinPromises = commsToJoin.map(c => {
            if (!c.members.includes(currentUser.uid)) {
                return updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'communities', c.id), {
                    members: arrayUnion(currentUser.uid)
                });
            }
        });
        await Promise.all(joinPromises);

        if (userData) userData.needsOnboarding = false;

        const modal = document.getElementById('onboarding-modal');
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            window.showToast('تم إعداد مساحتك وانضمامك للمجتمعات بنجاح!', 'success');
            if (commsToJoin.length > 0) window.switchTab('communities');
        }, 300);
    } catch (e) {
        console.error(e);
        window.showToast('حدث خطأ أثناء حفظ الاهتمامات', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = 'متابعة وبدء الاستخدام <i data-lucide="arrow-left" class="w-5 h-5"></i>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.handleLogout = async () => {
    await signOut(auth);
}

// --- نظام إشعارات MyTab المطور ---
window.receiveFCMToken = async (token) => {
    if (currentUser && token) {
        try {
            const userRef = doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid);
            await updateDoc(userRef, {
                fcmToken: token
            });
            console.log("Token Updated");
        } catch (e) {
            console.error("FCM Token Error:", e);
        }
    }
};

// دالة إرسال الإشعار عبر سيرفر Netlify (سننشئه لاحقاً)
window.sendPushNotification = async (targetUid, title, body) => {
    const target = allUsers.find(u => u.uid === targetUid);
    if (!target || !target.fcmToken) return;

    try {
        // ملاحظة: الرابط أدناه هو رابط افتراضي لمجلد الوظائف في Netlify
        await fetch('/.netlify/functions/send-notification', {
            method: 'POST',
            body: JSON.stringify({
                token: target.fcmToken,
                title: title,
                body: body,
                icon: userData.photoUrl
            })
        });
    } catch (e) {
        console.error("Notification send error:", e);
    }
};

window.openForgotPasswordModal = () => {
    const modal = document.getElementById('forgot-password-modal');
    const emailInput = document.getElementById('auth-email');
    const fpEmailInput = document.getElementById('forgot-pwd-email');
    if (emailInput && emailInput.value) fpEmailInput.value = emailInput.value;
    else fpEmailInput.value = '';

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeForgotPasswordModal = () => {
    const modal = document.getElementById('forgot-password-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.sendResetLink = async () => {
    const email = document.getElementById('forgot-pwd-email').value.trim();

    if (!email) {
        showToast('يرجى إدخال بريد إلكتروني صحيح', 'error');
        return;
    }

    const btn = document.getElementById('forgot-pwd-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري الإرسال...';

    try {
        // إجبار فايربيز على إرسال الإيميل وعرض شاشة تغيير كلمة السر باللغة العربية
        auth.languageCode = 'ar';

        await sendPasswordResetEmail(auth, email);
        showToast('تم الإرسال! افتح "الرسائل غير المرغوب فيها" (Spam) في بريدك لتجد الرابط', 'success', 6000);
        window.closeForgotPasswordModal();
    } catch (e) {
        console.error(e);
        showToast('حدث خطأ، تأكد من صحة البريد الإلكتروني', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i> <span>إرسال الرابط</span>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.resetMyPassword = async () => {
    if (!currentUser || !currentUser.email) return;
    const btn = document.getElementById('reset-pwd-btn');
    const msg = document.getElementById('pwd-msg');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري الإرسال...';
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        msg.innerText = 'تم إرسال رابط تغيير كلمة المرور إلى بريدك.';
        msg.classList.remove('hidden');
        showToast('تم إرسال رابط التغيير للبريد', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء محاولة إرسال الرابط.', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="key" class="w-4 h-4"></i> إرسال رابط تغيير كلمة المرور';
    lucide.createIcons();
}

window.resendVerification = async () => {
    try {
        await sendEmailVerification(currentUser);
        document.getElementById('verify-msg').innerText = 'تم إعادة الإرسال.';
        document.getElementById('verify-msg').className = 'text-sm mb-4 text-emerald-600 dark:text-emerald-400';
    } catch (e) {
        document.getElementById('verify-msg').innerText = 'حدث خطأ.';
        document.getElementById('verify-msg').className = 'text-sm mb-4 text-rose-600 dark:text-rose-400';
    }
}
window.checkEmailVerified = async () => {
    await currentUser.reload();
    if (auth.currentUser.emailVerified) window.location.reload();
    else {
        document.getElementById('verify-msg').innerText = 'لم يتم التأكيد بعد.';
        document.getElementById('verify-msg').className = 'text-sm mb-4 text-rose-600 dark:text-rose-400';
    }
}

function getSocialOptionsHtml(selected) {
    return `
            <option value="facebook" ${selected==='facebook'?'selected':''}>فيسبوك</option>
            <option value="youtube" ${selected==='youtube'?'selected':''}>يوتيوب</option>
            <option value="tiktok" ${selected==='tiktok'?'selected':''}>تيك توك</option>
            <option value="instagram" ${selected==='instagram'?'selected':''}>انستجرام</option>
            <option value="twitter" ${selected==='twitter'?'selected':''}>تويتر</option>
            `;
}

window.addRegSocialLink = () => {
    regSocialLinks.push({
        platform: 'facebook',
        url: ''
    });
    renderRegSocials();
}
window.removeRegSocial = (idx) => {
    regSocialLinks.splice(idx, 1);
    renderRegSocials();
}
window.updateRegSocial = (idx, field, val) => {
    regSocialLinks[idx][field] = val;
}

function renderRegSocials() {
    const container = document.getElementById('reg-socials-container');
    container.innerHTML = regSocialLinks.map((link, idx) => `
                <div class="flex gap-2 mb-2">
                    <select onchange="updateRegSocial(${idx}, 'platform', this.value)" class="w-1/3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-100">
                        ${getSocialOptionsHtml(link.platform)}
                    </select>
                    <input type="url" placeholder="الرابط..." oninput="updateRegSocial(${idx}, 'url', this.value)" value="${link.url}" class="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none text-slate-800 dark:text-slate-100">
                    <button type="button" onclick="removeRegSocial(${idx})" class="p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            `).join('');
    lucide.createIcons();
}

function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'MYT-';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

document.getElementById('reg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري الإنشاء...';
    const gender = document.getElementById('reg-gender').value;
    const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${currentUser.uid}-${gender}&backgroundColor=10b981`;
    const newUserData = {
        uid: currentUser.uid,
        myTabId: generateUniqueId(),
        displayName: document.getElementById('reg-name').value,
        gender: gender,
        birthDate: document.getElementById('reg-dob').value,
        phoneNumber: document.getElementById('reg-phone').value,
        address: document.getElementById('reg-address') ? document.getElementById('reg-address').value : '',
        socialLinks: regSocialLinks.filter(l => l.url.trim() !== ''),
        bio: 'مرحباً بك في مساحتي الآمنة على MyTab.',
        photoUrl: avatarUrl,
        coverUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop',
        friends: [],
        isPrivate: true,
        isAdmin: false,
        createdAt: new Date().toISOString()
    };
    try {
        await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), newUserData);
        userData = newUserData;
        viewingUid = currentUser.uid;
        showView('main-layout');
        setupDataListeners();
        showToast('مرحباً بك في مساحتك!', 'success');
    } catch (e) {
        showToast('خطأ أثناء الإنشاء', 'error');
        btn.disabled = false;
        btn.innerHTML = 'دخول المساحة';
    }
});

// --- Badge Helper ---
window.copyTitleToClipboard = (title) => {
    navigator.clipboard.writeText(title).then(() => {
        showToast(`تم نسخ العنوان: "${title}"`, 'success');
    }).catch(() => showToast('فشل النسخ', 'error'));
};

window.searchByTitle = (title) => {
    window.switchTab('search');
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = title;
        window.performSearch();
    }
};

window.handleTitleClick = (e, title) => {
    e.stopPropagation(); // إيقاف تسرب الضغطة لفتح قائمة التفاعل
    if (window.titleClickTimer) {
        clearTimeout(window.titleClickTimer);
        window.titleClickTimer = null;
        window.searchByTitle(title); // الضغطة الثانية تنقلك للمنشور
    } else {
        window.titleClickTimer = setTimeout(() => {
            window.titleClickTimer = null;
            window.copyTitleToClipboard(title);
        }, 300); // انتظار 300 مللي ثانية للتأكد من الضغطة الثانية
    }
};

window.getUserBadge = (uid) => {
    if (!uid) return '';
    let bBadge = '';
    try {
        if (typeof currentUser !== 'undefined' && currentUser && typeof userData !== 'undefined' && userData && userData.blockedUsers && userData.blockedUsers.includes(uid)) {
            bBadge = `<span class="inline-flex items-center justify-center bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-xl mx-1 align-middle shadow-sm shrink-0 text-[10px] font-bold" title="هذا المستخدم محظور من قبلِك"><i data-lucide="slash" class="w-3 h-3 mr-1"></i> محظور</span>`;
        }
    } catch(e) {}

    const postsCount = allPosts.filter(p => p.authorId === uid).length;
    const u = allUsers.find(x => x.uid === uid);

    const isVerifiedEmail = currentUser && currentUser.uid === uid && currentUser.email === 'khmohieldin@gmail.com';
    const isVerifiedName = u && (u.displayName === 'خالد محي الدين' || u.displayName === 'Khaled Mohieldin');

    if (postsCount >= 100 || isVerifiedEmail || isVerifiedName) {
        return bBadge + `<span class="inline-flex items-center justify-center w-3.5 h-3.5 md:w-4 md:h-4 bg-blue-500 rounded-full mx-1 align-middle shadow-sm shrink-0" title="حساب موثق"><svg class="w-2.5 h-2.5 md:w-3 md:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg></span>`;
    }
    return bBadge;
};

// --- Sidebar Logic ---
function updateSidebar() {
    const logoImgs = document.querySelectorAll('.global-logo-img');
    const defaultLogo = "https://i.ibb.co/93y8GcxZ/Picsart-26-05-09-16-59-08-419.png";
    logoImgs.forEach(img => {
        if (globalSettings && globalSettings.logoUrl && globalSettings.logoUrl.trim() !== '') {
            img.src = globalSettings.logoUrl;
        } else {
            img.src = defaultLogo;
        }
    });

    const isGuest = !currentUser || (currentUser && currentUser.isAnonymous) || !userData;
    if (isGuest) {
        userData = {
            myTabId: "GUEST",
            photoUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=GuestUser&backgroundColor=1e293b",
            displayName: "زائرنا الكريم",
            uid: "",
            coverUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop"
        };
    } else if (!userData) {
        return;
    }

    // الانتظار قليلاً لضمان رسم الواجهة ثم التعديل الإجباري عليها
    setTimeout(() => {
        // معالجة زر تسجيل الخروج/الدخول بشكل دقيق لضمان تغييره
        document.querySelectorAll('button, a, div').forEach(btn => {
            const currentClick = btn.getAttribute('onclick') || '';
            if (currentClick.includes('handleLogout') || (currentClick.includes('auth-view') && btn.innerHTML.includes('دخول'))) {
                if (isGuest) {
                    btn.setAttribute('onclick', "document.getElementById('main-layout').classList.add('hidden'); document.getElementById('auth-view').classList.remove('hidden'); if(typeof toggleMobileMenu === 'function') toggleMobileMenu();");
                    btn.className = btn.className.replace(/rose/g, 'emerald').replace(/red/g, 'emerald');
                    btn.innerHTML = btn.innerHTML.replace('تسجيل الخروج', 'تسجيل الدخول').replace('خروج', 'دخول').replace('log-out', 'log-in');
                } else {
                    btn.setAttribute('onclick', "handleLogout()");
                    btn.className = btn.className.replace(/emerald/g, 'rose');
                    btn.innerHTML = btn.innerHTML.replace('تسجيل الدخول', 'تسجيل الخروج').replace('دخول', 'خروج').replace('log-in', 'log-out');
                }
            }
        });

        if (isGuest) {
            // فرض رسالة الترحيب
            const sbName = document.getElementById('sidebar-name');
            if (sbName) sbName.innerHTML = "مرحبا زائرنا الكريم";
            
            const fWelcome = document.getElementById('feed-welcome-name');
            if (fWelcome) fWelcome.innerHTML = `مرحبا زائرنا الكريم <span class="block text-[12px] font-normal text-slate-400 dark:text-slate-400 mt-1.5 bg-black/10 dark:bg-white/5 p-2 rounded-lg border border-black/5 dark:border-white/5 shadow-sm leading-relaxed">يشرفنا انضمامك لنا من خلال الضغط على التسجيل بالموقع</span>`;
            
            // فرض صورة الغلاف بقوة لتخطي إعدادات الإدارة
            const feedCover = document.getElementById('feed-cover-image');
            if (feedCover) feedCover.src = userData.coverUrl;

            // إعادة رسم أيقونات Lucide
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }, 20);
    document.getElementById('sidebar-myid').innerText = userData.myTabId;
    document.getElementById('mobile-myid').innerText = userData.myTabId;
    const sbAvatar = document.getElementById('sidebar-avatar');
    sbAvatar.src = userData.photoUrl;
    sbAvatar.classList.remove('status-ring', 'status-ring-multiple');
    if (window.getStatusRingClass(userData.uid)) sbAvatar.classList.add(window.getStatusRingClass(userData.uid));

    document.getElementById('sidebar-name').innerHTML = userData.displayName + window.getUserBadge(userData.uid);

    const cpAvatar = document.getElementById('create-post-avatar');
    cpAvatar.src = userData.photoUrl;
    cpAvatar.classList.remove('status-ring', 'status-ring-multiple');
    if (window.getStatusRingClass(userData.uid)) cpAvatar.classList.add(window.getStatusRingClass(userData.uid));

    const feedCover = document.getElementById('feed-cover-image');
    const feedAvatar = document.getElementById('feed-cover-avatar');
    const feedWelcome = document.getElementById('feed-welcome-name');

    if (feedCover) {
        if (globalSettings.feedCoverUrl && globalSettings.feedCoverUrl.trim() !== '') {
            feedCover.src = globalSettings.feedCoverUrl;
        } else if (userData.coverUrl) {
            feedCover.src = userData.coverUrl;
        }
    }
    if (feedAvatar && userData.photoUrl) feedAvatar.src = userData.photoUrl;
    if (feedWelcome && userData.displayName) feedWelcome.innerText = 'مرحباً، ' + userData.displayName.split(' ')[0];

    // تحديث وإظهار حكمة اليوم بنظام التبديل اليومي
    const quoteCont = document.getElementById('quote-of-the-day-container');
    const quoteText = document.getElementById('quote-text-display');
    if (quoteCont && quoteText) {
        const rawQuotes = globalSettings.quoteOfTheDay || '';
        if (rawQuotes.trim() !== '') {
            // تقسيم النص بناءً على النجمة وتحويله لمصفوفة
            const quotesArray = rawQuotes.split('*').map(q => q.trim()).filter(q => q !== '');

            if (quotesArray.length > 0) {
                // حساب مؤشر الحكمة بناءً على تاريخ اليوم (يتغير كل 24 ساعة)
                // نستخدم عدد الأيام منذ بداية التاريخ لضمان الثبات لجميع المستخدمين
                const dayTimestamp = Math.floor(new Date().setHours(0, 0, 0, 0) / (24 * 60 * 60 * 1000));
                const quoteIndex = dayTimestamp % quotesArray.length;

                quoteText.innerText = quotesArray[quoteIndex];
                quoteCont.classList.remove('hidden');
            } else {
                quoteCont.classList.add('hidden');
            }
        } else {
            quoteCont.classList.add('hidden');
        }
    }

    const picker = document.getElementById('color-picker-container');
    if (picker) {
        picker.innerHTML = Object.keys(POST_COLORS).map(id => {
            const c = POST_COLORS[id];
            const isSelected = postSelectedColor === id;
            const selectedClass = isSelected ? 'border-emerald-500 dark:border-emerald-400 scale-125 shadow-lg z-10' : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100 hover:scale-110';
            return `<button type="button" onclick="window.setPostColor('${id}')" class="w-6 h-6 rounded-full border-2 ${c.pickerBtn} ${selectedClass} transition-all"></button>`;
        }).join('');
    }
}

// تهيئة إعدادات الإشعارات من التخزين المحلي
window.bellIconEnabled = localStorage.getItem('bellIconEnabled') !== 'false'; // الافتراضي مفعل
window.bellSoundEnabled = localStorage.getItem('bellSoundEnabled') !== 'false'; // الافتراضي مفعل

window.toggleBellIcon = (isEnabled) => {
    window.bellIconEnabled = isEnabled;
    localStorage.setItem('bellIconEnabled', isEnabled);
    updateBadge();
};

window.toggleBellSound = (isEnabled) => {
    window.bellSoundEnabled = isEnabled;
    localStorage.setItem('bellSoundEnabled', isEnabled);
};

window.playNotificationSound = () => {
    if (!window.bellSoundEnabled) return; // التحقق من رغبة المستخدم
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine'; // نغمة رقيقة جداً
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
        // التجاهل الصامت في حال منع المتصفح للصوت مؤقتاً
    }
};

let lastTotalUnreadCount = -1;

function updateBadge() {
    if (!currentUser) return;

    // تحديث قائمة الإشعارات فوراً إذا كان المستخدم فاتح التبويب حالياً
    const notifTab = document.getElementById('tab-content-notifications');
    if (notifTab && !notifTab.classList.contains('hidden')) {
        if (typeof window.renderNotificationsList === 'function') window.renderNotificationsList();
    }

    const incReqs = friendRequests.filter(r => r.to === currentUser.uid && r.status === 'pending').length;
    const reqBadge = document.getElementById('req-badge');
    if (incReqs > 0) {
        reqBadge.classList.remove('hidden');
        reqBadge.innerText = incReqs;
    } else reqBadge.classList.add('hidden');

    const unreadMsgs = allMessages.filter(m => m.receiverId === currentUser.uid && !m.read).length;
    const msgBadge = document.getElementById('msg-badge');
    if (msgBadge) {
        if (unreadMsgs > 0) {
            msgBadge.classList.remove('hidden');
            msgBadge.innerText = unreadMsgs;
        } else msgBadge.classList.add('hidden');
    }

    // --- منطق الفقاعة العائمة (Real-time) ---
    window.updateUnreadBubble = () => {
        const isEnabled = localStorage.getItem('floatingBubbleEnabled') !== 'false';
        const bubble = document.getElementById('floating-chat-bubble');
        const countBadge = document.getElementById('floating-bubble-count');

        if (bubble && countBadge) {
            if (isEnabled && unreadMsgs > 0) {
                countBadge.innerText = unreadMsgs;
                bubble.classList.remove('hidden');
                setTimeout(() => {
                    bubble.classList.remove('translate-y-32', 'opacity-0', 'scale-50');
                }, 50);
            } else {
                bubble.classList.add('translate-y-32', 'opacity-0', 'scale-50');
                setTimeout(() => bubble.classList.add('hidden'), 300);
            }
        }
    };
    window.updateUnreadBubble();

    const unreadNotifs = allNotifications.filter(n => n.to === currentUser.uid && !n.read).length;
    const notifBadge = document.getElementById('notif-badge');
    if (notifBadge) {
        if (unreadNotifs > 0) {
            notifBadge.classList.remove('hidden');
            notifBadge.innerText = unreadNotifs;
        } else notifBadge.classList.add('hidden');
    }

    const currentTotal = incReqs + unreadMsgs + unreadNotifs;

    // تحديث جرس الموبايل الديناميكي
    const mobileBellContainer = document.getElementById('mobile-bell-container');
    const mobileBellBadge = document.getElementById('mobile-bell-badge');

    if (mobileBellContainer && mobileBellBadge) {
        if (window.bellIconEnabled) {
            mobileBellContainer.classList.remove('hidden');
            if (currentTotal > 0) {
                mobileBellBadge.innerText = currentTotal;
                mobileBellBadge.classList.remove('hidden');
            } else {
                mobileBellBadge.classList.add('hidden');
            }
        } else {
            mobileBellContainer.classList.add('hidden');
        }
    }

    // تشغيل الصوت والأنيميشن فقط إذا زاد العدد الإجمالي للإشعارات
    if (lastTotalUnreadCount !== -1 && currentTotal > lastTotalUnreadCount) {
        window.playNotificationSound();
        if (mobileBellBadge && currentTotal > 0 && window.bellIconEnabled) {
            // تشغيل أنيميشن النطاطة الخفيف كإشعار بصري إضافي
            mobileBellBadge.classList.remove('animate-bounce');
            void mobileBellBadge.offsetWidth; // Trigger Reflow
            mobileBellBadge.classList.add('animate-bounce');
        }
    }
    lastTotalUnreadCount = currentTotal;

    // مزامنة حالة الأزرار في الملف الشخصي لتجنب التعارض
    const bellIconToggle = document.getElementById('setting-bell-icon');
    const bellSoundToggle = document.getElementById('setting-bell-sound');
    if (bellIconToggle) bellIconToggle.checked = window.bellIconEnabled;
    if (bellSoundToggle) bellSoundToggle.checked = window.bellSoundEnabled;
}

window.renderNotificationsList = () => {
    const list = document.getElementById('notifications-list');
    if (!list || !currentUser) return;

    // دمج كافة الإشعارات (تفاعلات + رسائل + طلبات صداقة) وترتيبها من الأحدث للأقدم
    const combined = [
        ...allNotifications.filter(n => n.to === currentUser.uid),
        ...friendRequests.filter(r => r.to === currentUser.uid && r.status === 'pending').map(r => ({
            id: r.id,
            type: 'friend_request',
            fromId: r.from,
            fromName: r.fromName,
            fromAvatar: r.fromAvatar,
            createdAt: r.createdAt,
            read: false
        }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (combined.length === 0) {
        list.innerHTML = `
                    <div class="text-center py-20 opacity-40">
                        <i data-lucide="bell-off" class="w-16 h-16 mx-auto mb-4 text-slate-300"></i>
                        <p class="font-bold text-slate-500">لا توجد إشعارات جديدة حالياً</p>
                    </div>
                `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    list.innerHTML = combined.map(n => {
        let icon = 'bell';
        let text = n.text || '';
        let color = 'emerald';
        let action = `window.handleNotificationClick('${n.type}', '${n.id}', '${n.fromId || n.senderId || ''}', '${n.postId || ''}')`;

        const senderName = n.fromName || 'مستخدم ماي تاب';
        const senderAvatar = n.fromAvatar || `https://ui-avatars.com/api/?name=${senderName}&background=random`;

        // تخصيص الأيقونة والنص بناءً على نوع الإشعار
        if (n.type === 'like' || n.type === 'react_post') {
            icon = 'heart';
            text = `تفاعل <b>${senderName}</b> مع منشورك`;
            color = 'rose';
        } else if (n.type === 'react_comment') {
            icon = 'heart';
            text = `تفاعل <b>${senderName}</b> مع تعليقك`;
            color = 'rose';
        } else if (n.type === 'comment' || n.type === 'reply') {
            icon = 'message-circle';
            text = `علق <b>${senderName}</b> على منشورك`;
            color = 'blue';
        } else if (n.type === 'mention') {
            icon = 'at-sign';
            text = n.text || `قام <b>${senderName}</b> بذكرك في منشور`;
            color = 'emerald';
        } else if (n.type === 'friend_request') {
            icon = 'user-plus';
            text = `وصلك طلب صداقة جديد من <b>${senderName}</b>`;
            color = 'indigo';
        } else if (n.type === 'message') {
            icon = 'mail';
            text = `أرسل لك <b>${senderName}</b> رسالة خاصة جديدة`;
            color = 'emerald';
        } else if (n.type === 'message_seen') {
            icon = 'eye';
            text = `شاهد <b>${senderName}</b> رسالتك الآن`;
            color = 'sky';
        }

        return `
                    <div onclick="${action}" class="group relative flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-emerald-500 cursor-pointer transition-all duration-300 ${n.read ? 'opacity-70' : 'shadow-md border-r-4 border-r-emerald-500 shadow-emerald-500/5'}">
                        <div class="relative shrink-0">
                            <img src="${senderAvatar}" class="w-12 h-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 group-hover:border-emerald-500 transition-colors">
                            <div class="absolute -bottom-1 -right-1 bg-${color}-500 text-white p-1 rounded-full border-2 border-white dark:border-slate-800 shadow-sm">
                                <i data-lucide="${icon}" class="w-3 h-3"></i>
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm text-slate-700 dark:text-slate-200 leading-snug">${text}</p>
                            <div class="flex items-center gap-2 mt-1.5">
                                <span class="text-[10px] text-slate-400 font-medium">${new Date(n.createdAt).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                                ${!n.read ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>' : ''}
                            </div>
                        </div>
                        <i data-lucide="chevron-left" class="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors"></i>
                    </div>
                `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.handleNotificationClick = async (type, id, fromId, postId) => {
    // توجيه المستخدم للمكان الصحيح بناءً على نوع الإشعار
    if (type === 'message' || type === 'message_seen') {
        if (fromId && typeof window.goToChat === 'function') {
            window.goToChat(fromId);
        } else {
            window.switchTab('messages');
        }
    } else if (type === 'friend_request') {
        window.switchTab('requests');
    } else if (postId) {
        window.switchTab('feed');
        // محاولة النزول للمنشور المقصود بعد فترة قصيرة للسماح بالتحميل
        setTimeout(() => {
            const el = document.getElementById('post-' + postId) || document.querySelector(`[data-post-id="${postId}"]`);
            if (el) el.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 600);
    }

    // تحديث حالة الإشعار كمقروء في قاعدة البيانات بمجرد النقر عليه
    try {
        const notif = allNotifications.find(n => n.id === id);
        if (notif && !notif.read) {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'notifications', id), {
                read: true
            });
        }
    } catch (e) {}
};

window.copyMyId = () => {
    navigator.clipboard.writeText(userData.myTabId).then(() => showToast('تم نسخ المعرف بنجاح!', 'success')).catch(() => {
        showToast('فشل النسخ', 'error')
    });
}
window.copyAnyId = (id) => {
    navigator.clipboard.writeText(id).then(() => showToast('تم نسخ المعرف بنجاح!', 'success')).catch(() => {
        showToast('فشل النسخ', 'error')
    });
}

window.setPostColor = (id, pickerId = 'color-picker-container', containerId = 'create-post-container') => {
    postSelectedColor = id;
    const picker = document.getElementById(pickerId);
    if (picker) {
        picker.innerHTML = Object.keys(POST_COLORS).map(colorId => {
            const c = POST_COLORS[colorId];
            const isSelected = postSelectedColor === colorId;
            const selectedClass = isSelected ? 'border-emerald-500 dark:border-emerald-400 scale-125 shadow-lg z-10' : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100 hover:scale-110';
            return `<button type="button" onclick="window.setPostColor('${colorId}', '${pickerId}', '${containerId}')" class="w-6 h-6 rounded-full border-2 ${c.pickerBtn} ${selectedClass} transition-all"></button>`;
        }).join('');
    }
    const c = POST_COLORS[postSelectedColor];
    const box = document.getElementById(containerId);
    if (box) {
        // إزالة كل كلاسات الخلفيات السابقة عشان مايحصلش تداخل
        box.className = box.className.replace(/post-bg-\d+/g, '').replace(/bg-[a-z]+-\d+/g, '').replace(/dark:bg-[a-z]+-\d+\/\d+/g, '').replace(/border-[a-z]+-\d+/g, '').replace(/dark:border-[a-z]+-\d+\/\d+/g, '');

        box.className = `rounded-3xl p-4 shadow-sm border transition-colors duration-300 ${c.bg} ${c.border} ` + box.className.split(' ').filter(cls => !cls.includes('bg-') && !cls.includes('border-')).join(' ');
    }

    if (pickerId === 'color-picker-container') {
        const drop = document.getElementById('color-picker-dropdown');
        if (drop) drop.classList.add('hidden');
    } else if (pickerId === 'comm-color-picker') {
        const drop = document.getElementById('comm-color-dropdown');
        if (drop) drop.classList.add('hidden');
    }
}

window.postImageFiles = [];

window.handlePostImageSelect = (e, previewContId, previewImgId) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    window.postImageFiles = [...(window.postImageFiles || []), ...files].slice(0, 10);
    const cont = document.getElementById(previewContId);
    cont.classList.remove('hidden');
    cont.innerHTML = '<div class="flex flex-wrap gap-2">' + window.postImageFiles.map((file, idx) => `
        <div class="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
            <img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover">
            <button onclick="event.preventDefault(); window.removePostImage(${idx}, '${previewContId}', '${previewImgId}', '${e.target.id}')" class="absolute top-1 right-1 bg-slate-900/60 text-white rounded-full p-1 hover:bg-rose-500 z-10"><i data-lucide="x" class="w-3 h-3"></i></button>
        </div>
    `).join('') + '</div>';
    window.setPostColor('white', previewContId.includes('comm') ? 'comm-color-picker' : 'color-picker-container', previewContId.includes('comm') ? 'create-comm-post-container' : 'create-post-container');
    if (typeof lucide !== 'undefined') lucide.createIcons();
    e.target.value = '';
}

window.removePostImage = (idx, previewContId, previewImgId, inputId) => {
    if (typeof idx === 'string') { window.postImageFiles = []; document.getElementById(previewContId).classList.add('hidden'); return; }
    window.postImageFiles.splice(idx, 1);
    const cont = document.getElementById(previewContId);
    if (window.postImageFiles.length === 0) {
        cont.classList.add('hidden');
        cont.innerHTML = '';
    } else {
        cont.innerHTML = '<div class="flex flex-wrap gap-2">' + window.postImageFiles.map((file, i) => `
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
                <img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover">
                <button onclick="event.preventDefault(); window.removePostImage(${i}, '${previewContId}', '${previewImgId}', '${inputId}')" class="absolute top-1 right-1 bg-slate-900/60 text-white rounded-full p-1 hover:bg-rose-500 z-10"><i data-lucide="x" class="w-3 h-3"></i></button>
            </div>
        `).join('') + '</div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

window.currentLinkPreview = null;
window.linkFetchTimer = null;

// --- نظام المنشن الذكي ---
let mentionDropdown = null;
let mentionTarget = null;
let mentionStartIndex = -1;
let mentionCursorPos = -1;

document.addEventListener('input', (e) => {
    if (e.target.tagName === 'TEXTAREA') {
        if (!mentionDropdown) {
            mentionDropdown = document.createElement('div');
            mentionDropdown.id = 'mentions-dropdown';
            mentionDropdown.className = 'absolute z-[9999] w-56 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 hidden';
            document.body.appendChild(mentionDropdown);

            document.addEventListener('click', ev => {
                if (!mentionDropdown.contains(ev.target)) mentionDropdown.classList.add('hidden');
            });
        }

        const val = e.target.value;
        const pos = e.target.selectionStart;
        const textUpToCursor = val.substring(0, pos);
        const match = textUpToCursor.match(/(?:^|\s)@([a-zA-Z\u0600-\u06FF\s]*)$/);

        if (match && userData && userData.friends) {
            mentionTarget = e.target;
            mentionStartIndex = match.index + (textUpToCursor[match.index] === ' ' || textUpToCursor[match.index] === '\n' ? 1 : 0);
            mentionCursorPos = pos;
            
            const q = match[1].trim().toLowerCase();
            // إخفاء القائمة إذا لم يكتب المستخدم أي حرف بعد الـ @
            if (q.length === 0) {
                mentionDropdown.classList.add('hidden');
                return;
            }

            const friends = userData.friends
                .map(id => allUsers.find(u => u.uid === id))
                .filter(u => u && u.displayName && u.displayName.toLowerCase().includes(q))
                .slice(0, 8); // تحديد 8 أصدقاء فقط كحد أقصى لمنع التكدس

            if (friends.length === 0) {
                mentionDropdown.classList.add('hidden');
            } else {
                mentionDropdown.innerHTML = friends.map(f => `
                    <div class="p-2.5 hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0" onclick="window.insertMention('${f.displayName}')">
                        <img src="${f.photoUrl || 'https://ui-avatars.com/api/?name='+encodeURIComponent(f.displayName)+'&background=10b981&color=fff'}" class="w-8 h-8 rounded-full object-cover">
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">${f.displayName}</span>
                    </div>
                `).join('');

                const rect = mentionTarget.getBoundingClientRect();
                mentionDropdown.style.top = (rect.bottom + window.scrollY + 5) + 'px';
                mentionDropdown.style.left = (rect.left + window.scrollX + 10) + 'px';
                mentionDropdown.classList.remove('hidden');
            }
        } else if (mentionDropdown) {
            mentionDropdown.classList.add('hidden');
        }
    }
});

window.insertMention = (name) => {
    if (!mentionTarget) return;
    const val = mentionTarget.value;
    const before = val.substring(0, mentionStartIndex);
    const after = val.substring(mentionCursorPos);
    mentionTarget.value = before + '@' + name.replace(/\s+/g, '_') + ' ' + after;
    mentionTarget.focus();
    mentionDropdown.classList.add('hidden');
    mentionTarget.dispatchEvent(new Event('input', { bubbles: true }));
};
// --- نهاية نظام المنشن ---

window.handlePostInput = (element, containerId) => {
    const text = element.value;
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);

    if (!urlMatch) {
        // لا تحذف المعاينة إذا اختفى الرابط (ليتمكن المستخدم من الكتابة)
        return;
    }

    const url = urlMatch[1];

    // تثبيت المعاينة: لا تعيد المعالجة إذا كانت موجودة - المسح فقط بزر X
    if (window.currentLinkPreview) return;

    const container = document.getElementById(containerId);
    const isVideoLink = /(?:youtube\.com|youtu\.be|tiktok\.com|fb\.watch|fb\.video)/i.test(url);

    // 1. ميزة التطمين الفوري لروابط الفيديو المدمجة
    if (isVideoLink && container) {
        if (window.currentLinkPreview && window.currentLinkPreview.originalUrl === url) return;
        window.currentLinkPreview = { originalUrl: url };
        container.classList.remove('hidden');
        container.innerHTML = `
            <button onclick="event.preventDefault(); window.removeLinkPreview('${containerId}')" class="absolute top-2 right-2 bg-slate-900/60 text-white rounded-full p-1.5 hover:bg-rose-500 z-10 transition-colors"><i data-lucide="x" class="w-4 h-4"></i></button>
            <div class="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center gap-3">
                <i data-lucide="video" class="w-8 h-8 animate-pulse"></i>
                <span class="font-bold text-sm">تم التعرف على رابط فيديو!</span>
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400">سيظهر المشغل المدمج تلقائياً عند النشر. المعاينة محفوظة، يمكنك ترك الرابط أو مسحه لتكملة الكتابة بحرية.</span>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    if (window.currentLinkPreview && window.currentLinkPreview.originalUrl === url) {
        // حذف الرابط فوراً من الصندوق إذا كانت المعاينة موجودة مسبقاً
        // element.value = element.value.replace(url, '').trim(); // تم إيقاف الحذف التلقائي المزعج
        return;
    }

    clearTimeout(window.linkFetchTimer);
    window.linkFetchTimer = setTimeout(async () => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.classList.remove('hidden');
        container.innerHTML = '<div class="p-4 text-center text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center justify-center gap-2"><i class="loader"></i> جاري جلب معاينة الرابط...</div>';

        try {
            const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
            const json = await res.json();

            if (json.status === 'success' && json.data.title) {
                const data = json.data;
                window.currentLinkPreview = {
                    originalUrl: url,
                    title: data.title || '',
                    description: data.description || '',
                    image: data.image?.url || data.logo?.url || '',
                    domain: new URL(url).hostname
                };

                container.innerHTML = `
                            <button onclick="event.preventDefault(); window.removeLinkPreview('${containerId}')" class="absolute top-2 right-2 bg-slate-900/60 text-white rounded-full p-1.5 hover:bg-rose-500 z-10 transition-colors"><i data-lucide="x" class="w-4 h-4"></i></button>
                            ${window.currentLinkPreview.image ? `<img src="${window.currentLinkPreview.image}" class="w-full h-40 md:h-48 object-cover border-b border-black/10 dark:border-white/10">` : ''}
                            <div class="p-3 md:p-4 text-right" dir="auto">
                                <p class="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider text-left" dir="ltr">${window.currentLinkPreview.domain}</p>
                                <h4 class="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base line-clamp-1 leading-snug">${window.currentLinkPreview.title}</h4>
                                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">${window.currentLinkPreview.description}</p>
                            </div>
                        `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                window.removeLinkPreview(containerId);
            }
        } catch (e) {
            window.removeLinkPreview(containerId);
        }
    }, 1000);
};

window.removeLinkPreview = (containerId) => {
    window.currentLinkPreview = null;
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
};

window.submitPost = async (commId = null, contentId = 'post-content', btnId = 'submit-post-btn', imgContId = 'post-image-preview-container', imgPreviewId = 'post-image-preview', imgInputId = 'post-image-input', titleId = 'post-title') => {
    const content = document.getElementById(contentId).value;
    const titleEl = document.getElementById(titleId);
    const titleStr = titleEl ? titleEl.value.trim() : '';
    const hasImages = window.postImageFiles && window.postImageFiles.length > 0;
    if (!content.trim() && !hasImages && !postImageFile && !titleStr && !window.currentLinkPreview) return;

    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';

    try {
        let imageUrls = [];
        if (hasImages) {
            imageUrls = await Promise.all(window.postImageFiles.map(f => uploadToImgbb(f)));
        } else if (postImageFile) {
            imageUrls = [await uploadToImgbb(postImageFile)];
        }
        
        const newPostRef = doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'posts'));
        const numericId = getPostNumericId({ id: newPostRef.id });

        const postData = {
            authorId: currentUser.uid,
            authorName: userData.displayName,
            authorPhoto: userData.photoUrl,
            title: titleStr,
            content: content,
            numericId: numericId,
            imageUrls: imageUrls.length > 0 ? imageUrls : null,
            colorId: postSelectedColor,
            communityId: commId,
            linkPreview: window.currentLinkPreview || null,
            createdAt: new Date().toISOString(),
            reactions: {},
            comments: []
        };
        await setDoc(newPostRef, postData);
        
        // إرسال إشعارات دقيقة لمن تم ذكرهم (المنشن)
        const mentionMatch = content.match(/@([a-zA-Z\u0600-\u06FF_]+)/g);
        if (mentionMatch && userData && userData.friends) {
            const mentionedNames = mentionMatch.map(m => m.substring(1).replace(/_/g, ' '));
            mentionedNames.forEach(name => {
                const friend = allUsers.find(u => userData.friends.includes(u.uid) && u.displayName && u.displayName.trim() === name.trim());
                if (friend) {
                    if (typeof window.sendPushNotification === 'function') {
                        window.sendPushNotification(friend.uid, 'إشارة جديدة', `ذكرك ${userData.displayName} في منشور`);
                    }
                    const notifId = Date.now().toString() + Math.floor(Math.random() * 1000);
                    setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'notifications', notifId), {
                        to: friend.uid,
                        fromId: currentUser.uid,
                        fromName: userData.displayName,
                        fromAvatar: userData.photoUrl,
                        type: 'mention',
                        postId: newPostRef.id, // ربط الإشعار بمعرف المنشور لفتح المنشور عند الضغط عليه!
                        text: `ذكرك <b>${userData.displayName}</b> في منشور جديد`,
                        createdAt: new Date().toISOString(),
                        read: false
                    }).catch(e => console.error(e));
                }
            });
        }
        
        document.getElementById(contentId).value = '';
        if (titleEl) titleEl.value = '';
        window.postImageFiles = [];
        const cont = document.getElementById(imgContId);
        if (cont) {
            cont.classList.add('hidden');
            cont.innerHTML = '';
        }
        window.removeLinkPreview(contentId === 'comm-post-content' ? 'comm-link-preview-container' : 'post-link-preview-container');
        window.currentLinkPreview = null;
        showToast('تم النشر بنجاح', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء النشر', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5 md:w-4 md:h-4 rtl:-scale-x-100"></i> <span>نشر</span>';
    lucide.createIcons();
}

async function uploadToImgbb(file) {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: fd
    });
    const data = await res.json();
    if (data.success) return data.data.url;
    throw new Error();
}

// --- Renderers ---
function renderAll() {
    if (activeTabStr === 'feed') renderFeedTab();
    if (activeTabStr === 'communities') window.renderCommunitiesTab();
    if (activeTabStr === 'profile') renderProfileTab();
    if (activeTabStr === 'friends') renderFriendsTab();
    if (activeTabStr === 'requests') renderRequestsTab();
    if (activeTabStr === 'search') window.performSearch();
    if (activeTabStr === 'favorites') window.renderFavoritesTab();
    if (activeTabStr === 'notifications') window.renderNotificationsTab();
    if (activeTabStr === 'singlepost') window.renderSinglePostTab();
    if (activeTabStr === 'messages') {
        if (activeChatFriendId) window.renderChatRoom();
        else renderMessagesList();
    }
    if (activeTabStr === 'admin') renderAdminTab();
    lucide.createIcons();
}

// --- ADMIN PANEL LOGIC ---
window.renderAdminTab = function() {
    if (!window.isSuperAdmin()) {
        window.switchTab('feed');
        return;
    }

    // فصل المستخدمين المفعلين عن المعلقين
    const activeUsers = allUsers.filter(u => u.isVerified !== false);
    const pendingUsers = allUsers.filter(u => u.isVerified === false);

    const totalUsers = activeUsers.length;
    const totalPosts = allPosts.length;
    const totalComments = allPosts.reduce((sum, p) => sum + (p.comments ? p.comments.length : 0), 0);

    document.getElementById('admin-stat-users').innerText = totalUsers;
    document.getElementById('admin-stat-posts').innerText = totalPosts;
    document.getElementById('admin-stat-comments').innerText = totalComments; if (document.getElementById('admin-quote-input')) { document.getElementById('admin-quote-input').value = globalSettings.quoteOfTheDay || ''; } if (document.getElementById('admin-ann-input')) { document.getElementById('admin-ann-input').value = globalSettings.annCode || ''; } if (document.getElementById('admin-maintenance-toggle')) { document.getElementById('admin-maintenance-toggle').checked = globalSettings.maintenanceMode || false; } // عرض المستخدمين المفعلين
    const tableBody = document.getElementById('admin-users-table');
    if (tableBody) {
        tableBody.innerHTML = activeUsers.map(u => {
            const dateJoined = u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : 'غير معروف';
            const userEmailHtml = u.uid === currentUser.uid ? '<span class="text-[10px] bg-slate-200 text-slate-700 px-2 rounded-full mr-2">أنت (المدير)</span>' : '';
            return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-3">
                                <img src="${u.photoUrl}" class="w-10 h-10 rounded-full object-cover bg-white dark:bg-slate-800">
                                <div>
                                    <span class="font-bold text-slate-800 dark:text-slate-100 flex items-center">${u.displayName} ${userEmailHtml}</span>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3 font-mono text-sm text-slate-500">${u.myTabId}</td>
                        <td class="px-4 py-3 text-sm text-slate-500">${dateJoined}</td>
                        <td class="px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="window.adminViewUser('${u.uid}')" class="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/60 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1" title="تصفح خفي">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <button onclick="window.adminToggleBanUser('${u.uid}', ${u.isBanned || false})" class="${u.isBanned ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-400'} px-2 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1" title="${u.isBanned ? 'فك الحظر' : 'حظر'}">
                                    <i data-lucide="${u.isBanned ? 'unlock' : 'lock'}" class="w-4 h-4"></i>
                                </button>
                                <button onclick="window.adminDeleteUser('${u.uid}')" class="bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-900/60 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1" title="حذف المستخدم ومحتوياته">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    `;
        }).join('');
    }

    // عرض الطلبات المعلقة (المستخدمين غير المفعلين)
    const pendingTableBody = document.getElementById('admin-pending-users-table');
    if (pendingTableBody) {
        if (pendingUsers.length === 0) {
            pendingTableBody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-slate-500 font-bold">لا توجد طلبات تسجيل معلقة حالياً.</td></tr>`;
        } else {
            pendingTableBody.innerHTML = pendingUsers.map(u => {
                const dateJoined = u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : 'غير معروف';
                return `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-3">
                                    <img src="${u.photoUrl}" class="w-10 h-10 rounded-full object-cover bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600">
                                    <div>
                                        <span class="font-bold text-slate-800 dark:text-slate-100">${u.displayName}</span>
                                        <div class="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><i data-lucide="mail" class="w-3 h-3"></i> ${u.email || 'بدون بريد'}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-4 py-3 font-mono text-sm text-slate-500 bg-slate-50 dark:bg-slate-900/30 rounded">${u.myTabId}</td>
                            <td class="px-4 py-3 text-sm text-slate-500">${dateJoined}</td>
                            <td class="px-4 py-3 text-center">
                                <div class="flex items-center justify-center gap-2">
                                    <button onclick="window.adminApproveUser('${u.uid}')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1 transform hover:-translate-y-0.5" title="موافقة وتفعيل الحساب">
                                        <i data-lucide="check-circle" class="w-4 h-4"></i> تفعيل
                                    </button>
                                    <button onclick="window.adminDeleteUser('${u.uid}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-rose-200 dark:border-rose-800 flex items-center gap-1" title="رفض وحذف">
                                        <i data-lucide="x" class="w-4 h-4"></i> رفض
                                    </button>
                                </div>
                            </td>
                        </tr>
                        `;
            }).join('');
        }
    }

    if (window.lucide) lucide.createIcons();
};

window.adminApproveUser = async function(userId) {
    if (!confirm('هل أنت متأكد من تفعيل هذا الحساب والسماح له بالدخول؟')) return;
    try {
        // افتراض أننا نستخدم Firestore (db)
        if (typeof db !== 'undefined') {
            await db.collection('users').doc(userId).update({
                isVerified: true
            });
            window.showToast('تم تفعيل الحساب بنجاح! يمكن للمستخدم الآن الدخول.', 'success');
        } else {
            // للتجربة المحلية أو إذا لم يكن db متاحاً
            const user = allUsers.find(u => u.uid === userId);
            if (user) {
                user.isVerified = true;
                window.showToast('تم تفعيل الحساب بنجاح (محلياً)', 'success');
                renderAdminTab(); // إعادة بناء الجدول
            }
        }
    } catch (error) {
        console.error("Error approving user:", error);
        window.showToast('حدث خطأ أثناء تفعيل الحساب', 'error');
    }
};

// دالة جديدة لموافقة الأدمن على المستخدم
window.adminApproveUser = async function(userId) {
    if (!confirm('هل أنت متأكد من تفعيل هذا الحساب والسماح له بالدخول؟')) return;
    try {
        await db.collection('users').doc(userId).update({
            isVerified: true
        });
        window.showToast('تم تفعيل الحساب بنجاح', 'success');
    } catch (error) {
        console.error("Error approving user:", error);
        window.showToast('حدث خطأ أثناء تفعيل الحساب', 'error');
    }
};

window.saveGlobalCover = async () => {
    const fileInput = document.getElementById('admin-global-cover-input');
    const file = fileInput.files[0];
    if (!file) return showToast('يرجى اختيار صورة أولاً', 'error');

    const btn = document.getElementById('admin-save-cover-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';

    try {
        const imgUrl = await uploadToImgbb(file);
        await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
            ...globalSettings,
            feedCoverUrl: imgUrl
        }, {
            merge: true
        });
        showToast('تم تحديث الغلاف العام بنجاح!', 'success');
        fileInput.value = '';
    } catch (e) {
        showToast('حدث خطأ أثناء الرفع', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="upload-cloud" class="w-4 h-4"></i> رفع وحفظ';
    lucide.createIcons();
};

window.removeGlobalCover = async () => {
    showConfirm('هل أنت متأكد من مسح الغلاف العام والعودة لأغلفة المستخدمين الخاصة؟', async () => {
        try {
            await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
                ...globalSettings,
                feedCoverUrl: ''
            }, {
                merge: true
            });
            showToast('تمت إزالة الغلاف العام', 'success');
        } catch (e) {
            showToast('حدث خطأ', 'error');
        }
    });
};

window.saveGlobalLogo = async () => {
    const fileInput = document.getElementById('admin-global-logo-input');
    const file = fileInput.files[0];
    if (!file) return showToast('يرجى اختيار صورة الشعار أولاً', 'error');

    const btn = document.getElementById('admin-save-logo-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';

    try {
        const imgUrl = await uploadToImgbb(file);
        await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
            ...globalSettings,
            logoUrl: imgUrl
        }, {
            merge: true
        });
        showToast('تم تحديث الشعار بنجاح!', 'success');
        fileInput.value = '';
    } catch (e) {
        showToast('حدث خطأ أثناء الرفع', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="upload-cloud" class="w-4 h-4"></i> رفع وحفظ';
    lucide.createIcons();
};

window.removeGlobalLogo = async () => {
    showConfirm('هل أنت متأكد من مسح الشعار المخصص واستعادة الشعار الافتراضي؟', async () => {
        try {
            await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
                ...globalSettings,
                logoUrl: ''
            }, {
                merge: true
            });
            showToast('تمت استعادة الشعار الافتراضي', 'success');
        } catch (e) {
            showToast('حدث خطأ', 'error');
        }
    });
};

window.saveDefaultAvatar = async (gender) => {
    const inputId = gender === 'male' ? 'admin-default-male-input' : 'admin-default-female-input';
    const btnId = gender === 'male' ? 'admin-save-male-btn' : 'admin-save-female-btn';
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    if (!file) return showToast('يرجى اختيار صورة أولاً', 'error');

    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';

    try {
        const imgUrl = await uploadToImgbb(file);
        const fieldName = gender === 'male' ? 'defaultMaleAvatar' : 'defaultFemaleAvatar';
        await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
            ...globalSettings,
            [fieldName]: imgUrl
        }, {
            merge: true
        });
        showToast(`تم تحديث الصورة الافتراضية (${gender === 'male' ? 'للذكور' : 'للإناث'}) بنجاح!`, 'success');
        fileInput.value = '';
    } catch (e) {
        showToast('حدث خطأ أثناء الرفع', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="upload-cloud" class="w-4 h-4"></i> حفظ';
    lucide.createIcons();
};

window.removeDefaultAvatar = async (gender) => {
    showConfirm(`هل أنت متأكد من استعادة الصورة الافتراضية الأصلية (${gender === 'male' ? 'للذكور' : 'للإناث'})؟`, async () => {
        try {
            const fieldName = gender === 'male' ? 'defaultMaleAvatar' : 'defaultFemaleAvatar';
            await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
                ...globalSettings,
                [fieldName]: ''
            }, {
                merge: true
            });
            showToast('تمت استعادة الصورة الافتراضية', 'success');
        } catch (e) {
            showToast('حدث خطأ', 'error');
        }
    });
};

window.saveDefaultAvatar = async (gender) => {
    const inputId = gender === 'male' ? 'admin-default-male-input' : 'admin-default-female-input';
    const btnId = gender === 'male' ? 'admin-save-male-btn' : 'admin-save-female-btn';
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    if (!file) return showToast('يرجى اختيار صورة أولاً', 'error');

    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';

    try {
        const imgUrl = await uploadToImgbb(file);
        const fieldName = gender === 'male' ? 'defaultMaleAvatar' : 'defaultFemaleAvatar';
        await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
            ...globalSettings,
            [fieldName]: imgUrl
        }, {
            merge: true
        });
        showToast(`تم تحديث الصورة الافتراضية (${gender === 'male' ? 'للذكور' : 'للإناث'}) بنجاح!`, 'success');
        fileInput.value = '';
    } catch (e) {
        showToast('حدث خطأ أثناء الرفع', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="upload-cloud" class="w-4 h-4"></i> حفظ';
    lucide.createIcons();
};

window.removeDefaultAvatar = async (gender) => {
    showConfirm(`هل أنت متأكد من استعادة الصورة الافتراضية الأصلية (${gender === 'male' ? 'للذكور' : 'للإناث'})؟`, async () => {
        try {
            const fieldName = gender === 'male' ? 'defaultMaleAvatar' : 'defaultFemaleAvatar';
            await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
                ...globalSettings,
                [fieldName]: ''
            }, {
                merge: true
            });
            showToast('تمت استعادة الصورة الافتراضية', 'success');
        } catch (e) {
            showToast('حدث خطأ', 'error');
        }
    });
};

window.saveGlobalQuote = async () => {
    const val = document.getElementById('admin-quote-input').value.trim();
    const btn = document.getElementById('admin-save-quote-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';
    try {
        await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
            ...globalSettings,
            quoteOfTheDay: val
        }, {
            merge: true
        });
        showToast('تم حفظ حكمة اليوم بنجاح!', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء الحفظ', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> حفظ الحكمة';
    lucide.createIcons();
};

window.removeGlobalQuote = async () => { showConfirm('هل أنت متأكد من مسح حكمة اليوم وإخفائها؟', async () => { try { await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), { ...globalSettings, quoteOfTheDay: '' }, { merge: true }); document.getElementById('admin-quote-input').value = ''; showToast('تم إخفاء حكمة اليوم', 'success'); } catch (e) { showToast('حدث خطأ', 'error'); } }); };
window.saveSmartAnnouncement = async () => { const val = document.getElementById('admin-ann-input').value.trim(); if (!val) return showToast('يرجى كتابة محتوى الإعلان', 'error'); try { const newAnnId = Date.now().toString(); await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), { ...globalSettings, annCode: val, annId: newAnnId }, { merge: true }); showToast('تم نشر الإعلان للجميع بنجاح', 'success'); } catch (e) { showToast('حدث خطأ أثناء الحفظ', 'error'); } };
window.removeSmartAnnouncement = async () => { showConfirm('تأكيد إيقاف الإعلان عن الجميع؟', async () => { try { await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), { ...globalSettings, annCode: '', annId: '' }, { merge: true }); document.getElementById('admin-ann-input').value = ''; showToast('تم الإيقاف بنجاح', 'success'); } catch (e) { showToast('حدث خطأ', 'error'); } }); };

// --- دوال نظام الإعلان المنبثق الذكي (Smart Announcement) ---
window.saveSmartAnnouncement = async () => {
    const val = document.getElementById('admin-ann-input').value.trim();
    if (!val) return showToast('يرجى كتابة محتوى الإعلان أولاً', 'error');
    
    // تعطيل الزر مؤقتاً وعرض لودر
    const btns = document.querySelectorAll('button[onclick="window.saveSmartAnnouncement()"]');
    btns.forEach(b => { b.disabled = true; b.innerHTML = '<i class="loader"></i> جاري النشر...'; });
    
    try {
        // إنشاء ID فريد بالوقت عشان النظام يعرف إن ده إعلان جديد ويظهره للمستخدمين
        const newAnnId = Date.now().toString();
        
        await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
            ...globalSettings,
            annCode: val,
            annId: newAnnId
        }, { merge: true });
        
        showToast('تم نشر الإعلان الذكي للجميع بنجاح!', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء نشر الإعلان', 'error');
    }
    
    // إعادة الزر لشكله الطبيعي
    btns.forEach(b => {
        b.disabled = false;
        b.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> نشر الإعلان للجميع';
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.removeSmartAnnouncement = async () => {
    showConfirm('هل أنت متأكد من إيقاف الإعلان وإخفائه عن جميع الأعضاء؟', async () => {
        try {
            await setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'settings', 'global'), {
                ...globalSettings,
                annCode: '',
                annId: ''
            }, { merge: true });
            
            const input = document.getElementById('admin-ann-input');
            if(input) input.value = '';
            showToast('تم إيقاف الإعلان بنجاح', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء الإيقاف', 'error');
        }
    });
};

window.adminToggleBanUser = async (uid, currentBanState) => {
    if (uid === currentUser.uid) return showToast('لا يمكنك حظر نفسك!', 'error');
    const actionStr = currentBanState ? 'فك الحظر عن' : 'حظر';
    showConfirm(`هل أنت متأكد من ${actionStr} هذا المستخدم؟`, async () => {
        try {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', uid), {
                isBanned: !currentBanState
            });
            showToast(`تم ${actionStr} المستخدم بنجاح`, 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء تنفيذ الإجراء', 'error');
        }
    });
};

window.adminDeleteUser = async (uid) => {
    if (uid === currentUser.uid) return showToast('لا يمكنك حذف نفسك!', 'error');
    showConfirm('هل أنت متأكد من حذف هذا المستخدم وجميع منشوراته نهائياً؟ لا يمكن التراجع عن هذا الإجراء.', async () => {
        try {
            const userPosts = allPosts.filter(p => p.authorId === uid);
            for (let p of userPosts) {
                await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', p.id));
            }
            await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', uid));
            showToast('تم حذف المستخدم ومحتوياته بنجاح', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء الحذف', 'error');
        }
    });
};

// --- Helpers ---
function getSafeYMD(dateInput) {
    const d = dateInput ? new Date(dateInput) : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function extractEmbeds(text) {
    const ytMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:shorts\/|[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const tkMatch = text.match(/(?:tiktok\.com\/@[\w.]+\/video\/|vm\.tiktok\.com\/|vt\.tiktok\.com\/|tiktok\.com\/embed\/v2\/|tiktok\.com\/share\/video\/)(\d+)/i);
    const fbMatch = text.match(/(https?:\/\/(?:www\.|web\.|m\.)?(?:facebook\.com\/(?:[^\/\n\s]+\/videos\/\d+|watch\/?\?v=\d+|share\/v\/[a-zA-Z0-9_-]+)|fb\.watch\/[a-zA-Z0-9_-]+))/i);
    const igMatch = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
    return {
        ytId: ytMatch ? ytMatch[1] : null,
        tkId: tkMatch ? tkMatch[1] : null,
        fbUrl: fbMatch ? fbMatch[1] : null,
        igId: igMatch ? igMatch[1] : null
    };
}

function formatPostContent(text) {
    if (!text) return '';
    let formatted = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-emerald-600 dark:text-emerald-400 font-bold hover:underline break-all" onclick="event.stopPropagation()">$1</a>');
    formatted = formatted.replace(/(#[\w\u0600-\u06FF_]+)/g, '<span class="text-blue-600 dark:text-blue-400 font-bold cursor-pointer hover:underline" onclick="event.stopPropagation(); window.searchHashtag(\'$1\')">$1</span>');
    // تلوين المنشن باللون الأخضر المميز
    formatted = formatted.replace(/@([a-zA-Z\u0600-\u06FF_]+)/g, '<span class="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md shadow-sm cursor-pointer">@$1</span>');

    // ميزة العناوين الذكية: تحويل الكلمات التي تطابق عناوين المنشورات إلى روابط
    const titles = [...new Set(allPosts.filter(p => p.title && p.title.trim() !== '').map(p => p.title))];
    titles.forEach(title => {
        const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!["'>])(${escapedTitle})(?!["'</])`, 'g');
        formatted = formatted.replace(regex, `<span class="text-indigo-600 dark:text-indigo-400 font-black cursor-pointer hover:underline decoration-dotted underline-offset-4" onclick="event.stopPropagation(); window.searchByTitle('$1')">$1</span>`);
    });

    return formatted;
}

function formatMessageContent(text, isMe) {
    if (!text) return '';
    const linkColor = isMe ? 'text-emerald-100 hover:text-white' : 'text-blue-500 dark:text-blue-400 hover:text-blue-600';
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="underline font-bold break-all ' + linkColor + '" onclick="event.stopPropagation()">$1</a>');
}

function generatePostHTML(post, idPrefix = '') {
    // جلب بيانات كاتب المنشور الحالية لعرض أحدث صورة واسم
    const author = allUsers.find(u => u.uid === post.authorId);
    const authorPhoto = author ? author.photoUrl : post.authorPhoto;
    const authorName = author ? author.displayName : post.authorName;

    // جلب بيانات الكاتب الأصلي في حالة إعادة المشاركة
    const originalAuthor = post.isRepost ? allUsers.find(u => u.uid === post.originalAuthorId) : null;
    const originalAuthorPhoto = originalAuthor ? originalAuthor.photoUrl : post.originalAuthorPhoto;
    const originalAuthorName = originalAuthor ? originalAuthor.displayName : post.originalAuthorName;
    
    let relevantCommunity = null;
    let isOriginalPostInCommunity = false;

    if (post.communityId) { // هذا المنشور موجود مباشرة في مجتمع
        relevantCommunity = allCommunities.find(c => c.id === post.communityId);
        if (relevantCommunity && !relevantCommunity.isPrivate) {
            isOriginalPostInCommunity = true;
        }
    } else if (post.isRepost && post.originalPostId) { // هذا المنشور هو إعادة مشاركة، نتحقق من مجتمع المنشور الأصلي
        const originalPost = allPosts.find(p => p.id === post.originalPostId);
        if (originalPost && originalPost.communityId) {
            relevantCommunity = allCommunities.find(c => c.id === originalPost.communityId);
            if (!(relevantCommunity && relevantCommunity.isPrivate)) { // نتأكد أن المجتمع الأصلي ليس خاصاً
                // relevantCommunity تم تعيينه للمجتمع الأصلي
            } else {
                relevantCommunity = null; // المجتمع الأصلي خاص أو غير موجود
            }
        }
    }

    let communityBadgeHTML = '';
    let postSourceHTML = '';

    if (relevantCommunity) {
        if (isOriginalPostInCommunity) { // عرض الشارة بجانب اسم الكاتب فقط إذا كان المنشور الأصلي في مجتمع
            communityBadgeHTML = `<span class="text-[10px] bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full mr-2 font-bold flex items-center gap-1 cursor-pointer hover:bg-rose-200 transition-colors shadow-sm" onclick="event.stopPropagation(); window.switchTab('communities'); setTimeout(()=>window.viewCommunity('${relevantCommunity.id}'), 300)" title="منشور من مجتمع: ${relevantCommunity.name}"><i data-lucide="layers" class="w-3 h-3"></i> ${relevantCommunity.name}</span>`;
        }
        // دائماً نولد HTML لمصدر المنشور في الأسفل إذا تم العثور على مجتمع ذي صلة
        postSourceHTML = `
            <div class="mt-3 flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold border-t border-black/5 dark:border-white/5 pt-2">
                <i data-lucide="layers" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                <span>مصدر المنشور:</span>
                <span class="text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline" onclick="event.stopPropagation(); window.switchTab('communities'); setTimeout(()=>window.viewCommunity('${relevantCommunity.id}'), 300)">${relevantCommunity.name}</span>
            </div>`;
    }

    const c = POST_COLORS[post.colorId] || POST_COLORS['white'];

    // --- [ بداية كود الزوار: عرض آمن ومقطوع ] ---
    if (!currentUser || (currentUser && currentUser.isAnonymous)) {
        let shortText = post.content ? post.content.substring(0, 120) : '';
        if (post.content && post.content.length > 120) shortText += '...';
        
        return `
        <div class="rounded-3xl p-4 md:p-5 shadow-sm border transition-colors duration-300 ${c.bg} ${c.border} mb-4 md:mb-6">
            <div class="flex items-center gap-2.5 mb-4">
                <img src="${authorPhoto}" class="w-9 h-9 md:w-10 md:h-10 rounded-full border border-black/10 dark:border-white/10 object-cover bg-white dark:bg-slate-800">
                <div class="flex flex-col">
                    <h4 class="font-bold text-[14px] md:text-[15px] text-slate-800 dark:text-slate-100 flex items-center gap-1">${authorName}${window.getUserBadge(post.authorId)}</h4>
                    <span class="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400">${new Date(post.createdAt).toLocaleDateString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
            </div>
            <div class="relative">
                ${post.title ? `<h3 class="text-xl md:text-2xl font-black mb-2 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-500 pr-3">${post.title}</h3>` : ''}
                <div class="${c.text} whitespace-pre-wrap leading-relaxed px-1 text-[14px] md:text-[15px] select-none" dir="auto" style="-webkit-mask-image: linear-gradient(to bottom, black 30%, transparent 100%); mask-image: linear-gradient(to bottom, black 30%, transparent 100%);">${shortText || 'محتوى حصري للمسجلين...'}</div>
            </div>
            <div class="text-center mt-4 pt-2 relative z-10">
                <button onclick="document.getElementById('main-layout').classList.add('hidden'); document.getElementById('auth-view').classList.remove('hidden');" class="bg-slate-800 dark:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-600 transition-colors shadow-lg text-sm inline-flex items-center gap-2">
                    <i data-lucide="lock" class="w-4 h-4"></i> سجل الدخول لقراءة باقي المنشور
                </button>
            </div>
        </div>`;
    }
    // --- [ نهاية كود الزوار ] ---
    // --- [ توحيد كود عرض المنشور للزوار (المجهولين أو غير المسجلين) ] ---
    if (!currentUser || (currentUser && currentUser.isAnonymous)) {
        let shortText = post.content ? post.content.substring(0, 150) : '';
        if (post.content && post.content.length > 150) shortText += '...';
        
        return `
        <div class="rounded-3xl p-4 md:p-5 shadow-sm border transition-colors duration-300 ${c.bg} ${c.border} mb-4 md:mb-6 relative overflow-hidden">
            <div class="flex items-center gap-2.5 mb-4 relative z-10">
                <img src="${authorPhoto}" class="w-9 h-9 md:w-10 md:h-10 rounded-full border border-black/10 dark:border-white/10 object-cover bg-white dark:bg-slate-800">
                <div class="flex flex-col">
                    <h4 class="font-bold text-[14px] md:text-[15px] text-slate-800 dark:text-slate-100 flex items-center gap-1">${authorName}${window.getUserBadge(post.authorId)}</h4>
                    <span class="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400">${new Date(post.createdAt).toLocaleDateString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
            </div>
            <div class="relative z-10">
                ${post.title ? `<h3 class="text-xl md:text-2xl font-black mb-2 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-500 pr-3">${post.title}</h3>` : ''}
                <div class="${c.text} whitespace-pre-wrap leading-relaxed px-1 text-[14px] md:text-[15px] select-none" dir="auto" style="-webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%); mask-image: linear-gradient(to bottom, black 40%, transparent 100%);">${shortText || 'محتوى حصري...'}</div>
            </div>
            <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-800 dark:via-slate-800/80 z-10 flex items-end justify-center pb-5">
                <button onclick="window.handleLogout ? window.handleLogout() : (document.getElementById('main-layout').classList.add('hidden'), document.getElementById('auth-view').classList.remove('hidden'))" class="bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-emerald-700 transition-transform hover:scale-105 shadow-[0_4px_15px_rgba(16,185,129,0.3)] text-sm flex items-center gap-2">
                    <i data-lucide="lock" class="w-4 h-4"></i> سجل الدخول للمتابعة والتفاعل
                </button>
            </div>
        </div>`;
    }

    const isMine = post.authorId === currentUser.uid;
    let canDelete = isMine;
    if (!canDelete && post.communityId) {
        const comm = allCommunities.find(c => c.id === post.communityId);
        if (comm && comm.creatorId === currentUser.uid) canDelete = true;
    }

    const textForEmbeds = (post.content || '') + ' ' + (post.linkPreview ? post.linkPreview.originalUrl : '') + ' ' + (post.originalContent || '') + ' ' + (post.originalLinkPreview ? post.originalLinkPreview.originalUrl : '');
    const {
        ytId,
        tkId,
        fbUrl,
        igId
    } = extractEmbeds(textForEmbeds);
    const reactions = post.reactions || {};
    const myReact = reactions[currentUser.uid];
    const tReact = Object.keys(reactions).length;
    const reactNames = getReactorNames(reactions);

    const reposts = allPosts.filter(p => p.isRepost && p.originalPostId === post.id);
    const shareCount = reposts.length;
    let shareNames = '';
    if (shareCount > 0) {
        const names = [...new Set(reposts.map(r => r.authorId === currentUser.uid ? "أنت" : r.authorName.split(' ')[0]))];
        if (names.length <= 2) shareNames = names.join(' و ');
        else shareNames = `${names[0]} و ${names.length-1} آخرين`;
    }

    let mediaHTML = '';
    const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);
    if (images.length > 0) {
        const gridClass = images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : images.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
        mediaHTML += `<div class="mb-3 grid ${gridClass} gap-1 md:gap-1.5 rounded-xl overflow-hidden shadow-sm">`;
        images.slice(0, 4).forEach((img, idx) => {
            const isLastVisible = images.length > 4 && idx === 3;
            const extraCount = images.length - 4;
            mediaHTML += `<div class="relative group cursor-zoom-in ${images.length===1 ? 'flex items-center justify-center w-full max-h-[500px]' : 'aspect-square'} overflow-hidden bg-black/5 dark:bg-white/5" onclick="window.openLightbox('${img}')">
                <img src="${img}" class="${images.length===1 ? 'w-full h-auto max-h-[500px] object-cover' : 'w-full h-full object-cover'} ${images.length===1 ? 'rounded-xl' : 'rounded-md'} border border-black/5 dark:border-white/5 transition-transform duration-300 group-hover:scale-105">
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 dark:group-hover:bg-white/10 transition-colors flex items-center justify-center">
                    ${isLastVisible ? `<span class="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-2xl md:text-3xl font-black rounded-md">+${extraCount}</span>` : `<i data-lucide="maximize-2" class="text-white opacity-0 group-hover:opacity-100 w-8 h-8 drop-shadow-md"></i>`}
                </div>
            </div>`;
        });
        mediaHTML += `</div>`;
    }
    if (ytId) mediaHTML += `<div class="mb-3 rounded-xl overflow-hidden shadow-sm aspect-video"><iframe src="https://www.youtube.com/embed/${ytId}" class="w-full h-full" frameborder="0" allowfullscreen></iframe></div>`;
    if (tkId) mediaHTML += `<div class="mb-3 rounded-xl overflow-hidden shadow-sm relative aspect-[9/16] w-full"><iframe src="https://www.tiktok.com/embed/v2/${tkId}" class="absolute inset-0 w-full h-full rounded-lg" frameborder="0" allowfullscreen></iframe></div>`;
    if (fbUrl) mediaHTML += `<div class="mb-3 rounded-xl overflow-hidden shadow-sm flex justify-center bg-black/5 dark:bg-slate-800 p-2 aspect-video"><iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=0&width=560" class="w-full h-full rounded-lg" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe></div>`;
    if (igId) mediaHTML += `<div class="mb-3 rounded-xl overflow-hidden shadow-sm flex justify-center bg-black/5 dark:bg-slate-800 p-2"><iframe src="https://www.instagram.com/p/${igId}/embed" class="w-full max-w-[400px] h-[500px] rounded-lg" frameborder="0" scrolling="no" allowtransparency="true"></iframe></div>`;

    let linkPreviewHTML = '';
    const lp = post.isRepost ? post.originalLinkPreview : post.linkPreview;
    if (lp && !ytId && !tkId && !fbUrl && !igId) {
        linkPreviewHTML = `
                <a href="${lp.originalUrl}" target="_blank" class="block mb-3 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden bg-black/5 dark:bg-slate-900/50 hover:opacity-90 transition-opacity no-underline group/link" onclick="event.stopPropagation()">
                    ${lp.image ? `<img src="${lp.image}" class="w-full h-40 md:h-56 object-cover border-b border-black/5 dark:border-white/5">` : ''}
                    <div class="p-3 md:p-4 text-right" dir="auto">
                        <p class="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-1 uppercase tracking-wider text-left" dir="ltr">${lp.domain}</p>
                        <h4 class="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base line-clamp-2 leading-snug group-hover/link:text-blue-500 transition-colors">${lp.title}</h4>
                        ${lp.description ? `<p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">${lp.description}</p>` : ''}
                    </div>
                </a>`;
    }

    let statsHTML = '';
    if (tReact > 0 || shareCount > 0) {
        statsHTML = `<div class="flex items-center justify-between mb-2 px-1 border-b border-black/5 dark:border-white/5 pb-2 mt-2">
                    <div onclick="window.showReactors('${post.id}')" class="flex items-center gap-1.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors w-fit px-1">
                        ${tReact > 0 ? `
                        <div class="flex -space-x-1.5 rtl:space-x-reverse z-0">
                            ${[...new Set(Object.values(reactions))].slice(0,3).map(r => `<div class="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 shrink-0 z-10">${window.getReactionIconStr(r)}</div>`).join('')}
                        </div><span class="text-sm md:text-[15px] mr-2 text-slate-500 dark:text-slate-400 font-bold">${tReact} &bull; ${reactNames}</span>
                        ` : ''}
                    </div>
                    ${shareCount > 0 ? `<div class="text-[11px] md:text-[12px] text-slate-500 dark:text-slate-400 font-medium cursor-help flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="شارك بواسطة: ${reposts.map(r=>r.authorName).join('، ')}">${shareCount} مشاركة (${shareNames}) <i data-lucide="repeat" class="w-3.5 h-3.5"></i></div>` : ''}
                </div>`;
    }

    const comments = post.comments || [];
    const topComments = comments.filter(c => !c.parentId);
    const replies = comments.filter(c => c.parentId);

    const MAX_VISIBLE = 3;
    const visibleTopComments = topComments.slice(0, MAX_VISIBLE);
    const hiddenTopComments = topComments.slice(MAX_VISIBLE);

    const generateThreadHTML = (tc) => {
        const threadReplies = replies.filter(r => r.parentId === tc.id);
        let threadHTML = generateCommentHTML(tc, post, canDelete, idPrefix, tc.id);
        if (threadReplies.length > 0) {
            const repliesHTML = threadReplies.map(r => generateCommentHTML(r, post, canDelete, idPrefix, tc.id)).join('');
            threadHTML += `<div class="mr-6 md:mr-10 mt-2 space-y-1.5 relative before:absolute before:right-[-12px] before:top-0 before:bottom-0 before:w-px before:bg-slate-200 dark:before:bg-slate-700 pb-2">${repliesHTML}</div>`;
        }
        return `<div class="mb-3 bg-transparent py-1 transition-colors">${threadHTML}</div>`;
    };

    let commentsHTML = visibleTopComments.map(generateThreadHTML).join('');
    if (hiddenTopComments.length > 0) {
        const hiddenHTML = hiddenTopComments.map(generateThreadHTML).join('');
        commentsHTML += `<div id="${idPrefix}hidden-comments-${post.id}" class="hidden">${hiddenHTML}</div><button onclick="document.getElementById('${idPrefix}hidden-comments-${post.id}').classList.remove('hidden'); this.style.display='none';" class="text-[14px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:underline mb-4 mt-1 cursor-pointer transition-colors w-fit text-right block">عرض ${hiddenTopComments.length} تعليقات أخرى...</button>`;
    }

    return `
            <div id="${idPrefix}post-view-${post.id}" class="rounded-3xl p-4 md:p-5 shadow-sm border transition-colors duration-300 ${c.bg} ${c.border} mb-4 md:mb-6 scroll-mt-24">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2.5 cursor-pointer group" onclick="window.handleUserAvatarClick('${post.authorId}', '${authorPhoto}', event)">
                        <img src="${authorPhoto}" class="w-9 h-9 md:w-10 md:h-10 rounded-full border border-black/10 dark:border-white/10 object-cover bg-white dark:bg-slate-800 group-hover:opacity-80 transition-opacity ${window.getStatusRingClass(post.authorId)}">
                        <div class="flex flex-col">
                            <h4 class="font-bold text-[14px] md:text-[15px] text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1">${authorName}${window.getUserBadge(post.authorId)} ${communityBadgeHTML} ${post.isRepost ? '<span class="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full mr-2 font-bold flex items-center gap-1"><i data-lucide="repeat" class="w-3 h-3"></i> أعاد المشاركة</span>' : ''} ${post.isPinned ? '<span class="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full mr-2 font-bold flex items-center gap-1"><i data-lucide="pin" class="w-3 h-3 fill-current"></i> مثبت</span>' : ''}</h4>
                            <span class="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400">${new Date(post.createdAt).toLocaleDateString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                                            </div>
                        <div class="flex items-center gap-1">
                            <button onclick="window.toggleFavorite('${post.id}')" class="${(userData.favorites || []).includes(post.id) ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/40' : 'text-slate-400 bg-white/50 dark:bg-slate-800/50'} hover:scale-110 rounded-full p-1.5 transition-all" title="أضف للمفضلة">
                                <i data-lucide="star" class="w-[15px] h-[15px] ${ (userData.favorites || []).includes(post.id) ? 'fill-current' : '' }"></i>
                            </button>
                            ${canDelete ? `
                                ${isMine ? `
                                    <button onclick="window.togglePinPost('${post.id}')" class="${post.isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/40' : 'text-slate-400 bg-white/50 dark:bg-slate-800/50'} hover:scale-110 rounded-full p-1.5 transition-all" title="${post.isPinned ? 'إلغاء التثبيت' : 'تثبيت في صفحتي'}">
                                        <i data-lucide="pin" class="w-[15px] h-[15px] ${post.isPinned ? 'fill-current' : ''}"></i>
                                    </button>
                                    <button onclick="window.openEditModal('${post.id}', 'post')" class="text-slate-400 hover:text-emerald-500 bg-white/50 dark:bg-slate-800/50 rounded-full p-1.5 transition-colors" title="تعديل"><i data-lucide="edit-3" class="w-[15px] h-[15px]"></i></button>
                                ` : ''}
                                <button onclick="window.deletePost('${post.id}')" class="text-slate-400 hover:text-rose-500 bg-white/50 dark:bg-slate-800/50 rounded-full p-1.5 transition-colors" title="حذف"><i data-lucide="trash-2" class="w-[15px] h-[15px]"></i></button>
                            ` : ''}
                        </div>
                    </div>
                    ${post.isRepost ? `
                    ${post.content ? `<div class="${c.text} whitespace-pre-wrap leading-relaxed mb-3 px-1 text-[14px] md:text-[15px]" dir="auto">${formatPostContent(post.content)}</div>` : ''}
                    <div class="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-3 md:p-4 mb-3">
                    <div class="flex items-center gap-2 mb-3 cursor-pointer group" onclick="window.viewProfile('${post.originalAuthorId}')">
                        <img src="${originalAuthorPhoto}" class="w-8 h-8 rounded-full border border-black/10 dark:border-white/10 object-cover bg-white dark:bg-slate-800 group-hover:opacity-80 transition-opacity">
                        <span class="font-bold text-[13px] md:text-[14px] text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1">${originalAuthorName}${window.getUserBadge(post.originalAuthorId)}</span>
                    </div>
                    ${post.originalTitle ? `<h4 onclick="window.copyTitleToClipboard('${post.originalTitle.replace(/'/g, "\\'")}')" class="text-lg md:text-xl font-black mb-2 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-500 pr-2.5 cursor-copy hover:opacity-80 transition-all">${post.originalTitle}</h4>` : ''}
                    <div class="${c.text} whitespace-pre-wrap leading-relaxed mb-3 px-1 text-[13px] md:text-[14px]" dir="auto">${formatPostContent(post.originalContent)}</div>
                    ${mediaHTML}
                    ${linkPreviewHTML}
                </div>
                ` : `
                ${post.title ? `<h3 onclick="window.copyTitleToClipboard('${post.title.replace(/'/g, "\\'")}')" class="text-xl md:text-2xl font-black mb-3 text-indigo-600 dark:text-indigo-400 border-r-4 border-indigo-500 pr-3 cursor-copy hover:opacity-80 active:scale-[0.98] transition-all" title="انقر لنسخ العنوان">${post.title}</h3>` : ''}
                <div class="${c.text} whitespace-pre-wrap mb-3 px-1 ${(!post.title && !mediaHTML && !linkPreviewHTML && post.content && post.content.trim().length <= 130) ? 'text-2xl md:text-3xl font-medium text-center py-6 leading-normal' : 'text-[14px] md:text-[15px] leading-relaxed'}" dir="auto">${formatPostContent(post.content)}</div>
                ${mediaHTML}
                ${linkPreviewHTML}
                `}
                ${postSourceHTML}
                ${statsHTML}
                <div class="flex flex-wrap items-center gap-1.5 relative bg-white dark:bg-slate-900 rounded-2xl p-2 mt-2 border border-black/5 dark:border-white/5 shadow-sm">
                    <div id="${idPrefix}picker-${post.id}" class="reaction-picker absolute -top-14 right-0 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-full px-3 py-2 gap-3 z-20 animate-in fade-in zoom-in duration-200">
                        <button onclick="window.handleReact('${post.id}', '👍', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">👍</button>
                        <button onclick="window.handleReact('${post.id}', '❤️', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">❤️</button>
                        <button onclick="window.handleReact('${post.id}', '😂', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">😂</button>
                        <button onclick="window.handleReact('${post.id}', '😮', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">😮</button>
                        <button onclick="window.handleReact('${post.id}', '😢', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">😢</button>
                        <button onclick="window.handleReact('${post.id}', '🙏', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">🙏</button>
                    </div>
                    <button onclick="window.togglePicker('${post.id}', '${idPrefix}')" class="flex-1 min-w-[70px] flex justify-center items-center gap-1.5 py-1.5 rounded-xl text-[13px] font-bold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${myReact && ['like','heart','sad','angry'].includes(myReact) ? getRColor(myReact) : (myReact ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300')}">
                        ${myReact ? (['like','heart','sad','angry'].includes(myReact) ? `<i data-lucide="${getRIconName(myReact)}" class="w-[18px] h-[18px] ${myReact==='heart'?'fill-current text-rose-500':''}"></i>` : `<span class="text-lg leading-none">${myReact}</span>`) : `<i data-lucide="thumbs-up" class="w-[18px] h-[18px]"></i>`} <span>${myReact ? 'تفاعلت' : 'تفاعل'}</span>
                    </button>
                    <button onclick="document.getElementById('${idPrefix}c-input-${post.id}').focus()" class="flex-1 min-w-[70px] flex justify-center items-center gap-1.5 py-1.5 rounded-xl text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                        <i data-lucide="message-square" class="w-[18px] h-[18px]"></i> <span>تعليق</span>
                    </button>
                    <button onclick="window.repostPost('${post.id}')" class="flex-1 min-w-[70px] flex justify-center items-center gap-1.5 py-1.5 rounded-xl text-[13px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                        <i data-lucide="repeat" class="w-[18px] h-[18px]"></i> <span>مشاركة</span>
                    </button>
                    <button onclick="window.openShareModal('${post.id}')" class="flex-1 min-w-[70px] flex justify-center items-center gap-1.5 py-1.5 rounded-xl text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                        <i data-lucide="send" class="w-[18px] h-[18px]"></i> <span>إرسال</span>
                    </button>
                    <button onclick="window.copyPostLink('${post.id}')" class="flex-1 min-w-[70px] flex justify-center items-center gap-1.5 py-1.5 rounded-xl text-[13px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" title="نسخ رابط المنشور">
                        <i data-lucide="link" class="w-[18px] h-[18px]"></i> <span>رابط</span>
                    </button>
                    <button onclick="window.capturePost('${idPrefix}post-view-${post.id}', '${authorName}')" class="flex-1 min-w-[70px] flex justify-center items-center gap-1.5 py-1.5 rounded-xl text-[13px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors" title="حفظ كصورة">
                        <i data-lucide="camera" class="w-[18px] h-[18px]"></i> <span class="hidden sm:inline">حفظ</span>
                    </button>
                </div>
                <div class="mt-2 bg-white dark:bg-slate-900 rounded-2xl p-3 md:p-4 border border-black/5 dark:border-white/5 shadow-sm text-slate-800 dark:text-slate-200">
                    <div class="space-y-2 mb-3 pr-1">${commentsHTML}</div>
                    <div class="flex gap-2 items-center">
                        <textarea id="${idPrefix}c-input-${post.id}" placeholder="اكتب تعليقاً..." class="flex-1 bg-black/5 dark:bg-slate-800/80 border border-black/10 dark:border-slate-600 rounded-2xl px-4 py-2.5 text-[14px] md:text-[16px] focus:outline-none focus:border-emerald-400 dark:focus:border-emerald-500 text-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition-colors resize-none overflow-hidden min-h-[44px] max-h-[150px]" rows="1" onkeydown="if(event.key==='Enter' && !event.shiftKey) { event.preventDefault(); window.addComment('${post.id}', '${idPrefix}'); }" oninput="this.style.height='';this.style.height=this.scrollHeight+'px';if(this.value.trim() === '') this.dataset.parentId = '';"></textarea>
                        <button onclick="window.addComment('${post.id}', '${idPrefix}')" class="bg-emerald-600 hover:bg-emerald-700 text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"><i data-lucide="send" class="w-[14px] h-[14px] rtl:-scale-x-100"></i></button>
                    </div>
                </div>
            </div>`;
}

window.replyToComment = (postId, rootCommentId, authorName, idPrefix = '') => {
    const input = document.getElementById(`${idPrefix}c-input-${postId}`);
    if (input) {
        input.dataset.parentId = rootCommentId;
        const mention = `@${authorName} `;
        if (!input.value.includes(mention)) {
            input.value = mention + input.value;
        }
        input.focus();
    }
};

function generateCommentHTML(c, post, canDeletePost, idPrefix = '', rootCommentId = null) {
    const author = allUsers.find(u => u.uid === c.authorId);
    const isDeletedUser = c.authorId !== currentUser.uid && !author;
    const plainName = c.authorId === currentUser.uid ? 'أنت' : (author ? author.displayName : 'مستخدم محذوف');
    const aNameHTML = isDeletedUser ? '<span class="text-rose-600 dark:text-rose-500">مستخدم محذوف</span>' : plainName;
    const aPic = author ? author.photoUrl : `https://api.dicebear.com/9.x/notionists/svg?seed=${c.authorId}&backgroundColor=10b981`;
    const reacts = c.reactions || {};
    const myR = reacts[currentUser.uid];
    const tR = Object.keys(reacts).length;
    const canDeleteComment = c.authorId === currentUser.uid || canDeletePost;

    const isReply = c.parentId != null;
    const avatarSize = isReply ? 'w-8 h-8 md:w-9 md:h-9' : 'w-10 h-10 md:w-11 md:h-11';

    const avatarClickAction = isDeletedUser ? `event.stopPropagation(); window.showToast('المستخدم تم حذفه لأنه خالف قواعد الموقع', 'error');` : `window.handleUserAvatarClick('${c.authorId}', '${aPic}', event)`;
    const nameClickAction = isDeletedUser ? `event.stopPropagation(); window.showToast('المستخدم تم حذفه لأنه خالف قواعد الموقع', 'error');` : `event.stopPropagation(); window.viewProfile('${c.authorId}')`;

    // حساب الوقت بطريقة فيسبوك
    const d = new Date(c.createdAt);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    let timeAgo = '';
    if (diffMins < 1) timeAgo = 'الآن';
    else if (diffMins < 60) timeAgo = diffMins + ' د';
    else if (diffHours < 24) timeAgo = diffHours + ' س';
    else if (diffDays < 7) timeAgo = diffDays + ' ي';
    else timeAgo = d.toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric'
    });

    return `
            <div id="${idPrefix}comment-${c.id}" class="flex gap-2 items-start group relative scroll-mt-32 mb-3 w-full">
                <img src="${aPic}" onclick="${avatarClickAction}" class="${avatarSize} rounded-full mt-1 object-cover bg-slate-200 dark:bg-slate-700 cursor-pointer hover:opacity-80 transition-opacity shrink-0 shadow-sm ${!isDeletedUser ? window.getStatusRingClass(c.authorId) : ''}">
                <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0 flex flex-col items-start">
                        <div class="bg-black/5 dark:bg-slate-700/40 px-3 py-1.5 md:px-3.5 md:py-2 rounded-[14px] inline-block relative cursor-pointer max-w-full" onclick="document.getElementById('${idPrefix}cpicker-${c.id}').classList.toggle('show')">
                            <span onclick="${nameClickAction}" class="font-bold text-slate-800 dark:text-slate-200 text-[13px] flex items-center mb-0.5 hover:underline transition-colors gap-1">${aNameHTML}${!isDeletedUser ? window.getUserBadge(c.authorId) : ''}</span>
                            <p class="text-slate-700 dark:text-slate-300 text-[14px] font-medium leading-snug break-words">${formatPostContent(c.text)}</p>
                            
                            ${tR>0 ? `<div onclick="event.stopPropagation(); window.showCommentReactors('${post.id}', '${c.id}')" class="flex items-center gap-1 bg-white dark:bg-slate-800 shadow-sm rounded-full px-1.5 py-0.5 absolute left-[-4px] bottom-[-10px] text-[11px] font-bold text-slate-500 cursor-pointer hover:scale-110 transition-transform z-10 border border-slate-100 dark:border-slate-700"><div class="flex items-center justify-center w-3 h-3">${window.getReactionIconStr(Object.values(reacts)[0])}</div><span>${tR}</span></div>`:''}

                            <div id="${idPrefix}cpicker-${c.id}" class="reaction-picker absolute -top-14 right-0 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-full px-3 py-2 gap-3 z-20" onclick="event.stopPropagation()">
                                <button onclick="window.handleCReact('${post.id}', '${c.id}', '👍', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">👍</button>
                                <button onclick="window.handleCReact('${post.id}', '${c.id}', '❤️', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">❤️</button>
                                <button onclick="window.handleCReact('${post.id}', '${c.id}', '😂', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">😂</button>
                                <button onclick="window.handleCReact('${post.id}', '${c.id}', '😮', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">😮</button>
                                <button onclick="window.handleCReact('${post.id}', '${c.id}', '😢', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">😢</button>
                                <button onclick="window.handleCReact('${post.id}', '${c.id}', '🙏', '${idPrefix}')" class="text-2xl hover:scale-125 transition-transform">🙏</button>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 mt-1 px-1.5 relative w-full">
                            <span class="text-[11px] font-bold text-slate-400 hover:underline cursor-pointer">${timeAgo}</span>
                            <button onclick="document.getElementById('${idPrefix}cpicker-${c.id}').classList.toggle('show')" class="text-[12px] font-bold transition-colors flex items-center hover:underline ${myR && ['like','heart','sad','angry'].includes(myR) ? 'text-emerald-500' : (myR ? 'text-emerald-500' : 'text-slate-500 hover:text-emerald-500')}">${myR ? (['like','heart','sad','angry'].includes(myR) ? 'تفاعلت' : `<span class="text-sm leading-none drop-shadow-sm mr-1">${myR}</span> تفاعلت`) : 'تفاعل'}</button>
                            <button onclick="window.replyToComment('${post.id}', '${rootCommentId || c.id}', '${plainName}', '${idPrefix}')" class="text-[12px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors hover:underline">رد</button>
                        </div>
                    </div>
                    ${canDeleteComment ? `<div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0" dir="ltr"><button onclick="window.deleteComment('${post.id}', '${c.id}')" class="text-rose-500 p-2 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-full transition-colors" title="حذف التعليق"><i data-lucide="trash-2" class="w-4 h-4"></i></button>${c.authorId === currentUser.uid ? `<button onclick="window.openEditModal('${c.id}', 'comment')" class="text-emerald-600 p-2 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-full transition-colors" title="تعديل التعليق"><i data-lucide="edit-3" class="w-4 h-4"></i></button>` : ''}</div>` : ''}
                </div>
            </div>`;
}

function getReactorNames(r) {
    const uids = Object.keys(r || {});
    if (!uids.length) return '';
    const names = uids.map(id => id === currentUser.uid ? "أنت" : (allUsers.find(u => u.uid === id)?.displayName.split(' ')[0] || "مستخدم"));
    if (names.length <= 2) return names.join(' و ');
    return `${names[0]} و ${names.length-1} آخرين`;
}

function getRColor(type) {
    return {
        like: 'text-blue-500 dark:text-blue-400',
        heart: 'text-rose-500 dark:text-rose-400',
        sad: 'text-amber-500 dark:text-amber-400',
        angry: 'text-red-600 dark:text-red-400'
    } [type] || 'text-slate-500 dark:text-slate-400';
}

function getRIconName(type) {
    return {
        like: 'thumbs-up',
        heart: 'heart',
        sad: 'frown',
        angry: 'angry'
    } [type] || 'thumbs-up';
}

window.getReactionIconStr = (type) => {
    if (type === 'like') return '<i data-lucide="thumbs-up" class="w-4 h-4 text-blue-500 dark:text-blue-400"></i>';
    if (type === 'heart') return '<i data-lucide="heart" class="w-4 h-4 text-rose-500 dark:text-rose-400 fill-current"></i>';
    if (type === 'sad') return '<i data-lucide="frown" class="w-4 h-4 text-amber-500 dark:text-amber-400"></i>';
    if (type === 'angry') return '<i data-lucide="angry" class="w-4 h-4 text-red-600 dark:text-red-400"></i>';
    return `<span class="text-sm leading-none">${type}</span>`;
}

window.togglePicker = (postId, idPrefix = '') => {
    const picker = document.getElementById(`${idPrefix}picker-${postId}`);
    if (picker) picker.classList.toggle('show');
}

window.handleReact = async (postId, type, idPrefix = '') => {
    if (!currentUser) return;
    const picker = document.getElementById(`${idPrefix}picker-${postId}`);
    if (picker) picker.classList.remove('show');

    const postRef = doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', postId);
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    let newReacts = {
        ...post.reactions
    };
    const isNewReact = newReacts[currentUser.uid] !== type;
    if (newReacts[currentUser.uid] === type) {
        delete newReacts[currentUser.uid];
    } else {
        newReacts[currentUser.uid] = type;
    }
    try {
        await updateDoc(postRef, {
            reactions: newReacts
        });
        if (isNewReact && post.authorId !== currentUser.uid) {
            await setDoc(doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'notifications')), {
                to: post.authorId,
                from: currentUser.uid,
                type: 'react_post',
                postId: postId,
                read: false,
                createdAt: new Date().toISOString()
            });
        }
    } catch (e) {
        console.error(e);
    }
}

window.handleCReact = async (postId, commentId, type, idPrefix = '') => {
    if (!currentUser) return;
    const cpicker = document.getElementById(`${idPrefix}cpicker-${commentId}`);
    if (cpicker) cpicker.classList.remove('show');

    const postRef = doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', postId);
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    const comments = [...post.comments];
    const cIdx = comments.findIndex(c => c.id === commentId);
    if (cIdx === -1) return;

    const targetComment = comments[cIdx];
    let cReacts = {
        ...(targetComment.reactions || {})
    };
    const isNewReact = cReacts[currentUser.uid] !== type;

    if (cReacts[currentUser.uid] === type) delete cReacts[currentUser.uid];
    else cReacts[currentUser.uid] = type;
    comments[cIdx].reactions = cReacts;
    try {
        await updateDoc(postRef, {
            comments
        });
        if (isNewReact && targetComment.authorId !== currentUser.uid) {
            await setDoc(doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'notifications')), {
                to: targetComment.authorId,
                from: currentUser.uid,
                type: 'react_comment',
                postId: postId,
                commentId: commentId,
                read: false,
                createdAt: new Date().toISOString()
            });
        }
    } catch (e) {
        console.error(e);
    }
}

window.addComment = async (postId, idPrefix = '') => {
    const input = document.getElementById(`${idPrefix}c-input-${postId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const postRef = doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', postId);
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    try {
        const postAuthor = allUsers.find(u => u.uid === post.authorId);
        if (typeof currentUser !== 'undefined' && currentUser && postAuthor && postAuthor.blockedUsers && postAuthor.blockedUsers.includes(currentUser.uid)) {
            window.showToast('المستخدم قد حظرك من التعليقات والرسائل', 'error');
            input.value = '';
            return;
        }
    } catch(e) {}

    const newComment = {
        id: 'c_' + Date.now(),
        authorId: currentUser.uid,
        text: text,
        createdAt: new Date().toISOString(),
        reactions: {}
    };

    if (input.dataset.parentId) {
        newComment.parentId = input.dataset.parentId;
    }

    try {
        await updateDoc(postRef, { comments: arrayUnion(newComment) });
        
        // --- إرسال إشعارات دقيقة لمن تم ذكرهم (المنشن) في التعليقات ---
        const mentionMatch = text.match(/@([a-zA-Z\u0600-\u06FF_]+)/g);
        if (mentionMatch && userData && userData.friends) {
            const mentionedNames = mentionMatch.map(m => m.substring(1).replace(/_/g, ' '));
            mentionedNames.forEach(name => {
                const friend = allUsers.find(u => userData.friends.includes(u.uid) && u.displayName && u.displayName.trim() === name.trim());
                if (friend && friend.uid !== currentUser.uid) {
                    if (typeof window.sendPushNotification === 'function') {
                        window.sendPushNotification(friend.uid, 'إشارة جديدة', `ذكرك ${userData.displayName} في تعليق`);
                    }
                    const notifId = Date.now().toString() + Math.floor(Math.random() * 1000);
                    setDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'notifications', notifId), {
                        to: friend.uid,
                        fromId: currentUser.uid,
                        fromName: userData.displayName,
                        fromAvatar: userData.photoUrl,
                        type: 'mention',
                        postId: postId,
                        commentId: newComment.id,
                        text: `ذكرك <b>${userData.displayName}</b> في تعليق`,
                        createdAt: new Date().toISOString(),
                        read: false
                    }).catch(e => console.error(e));
                }
            });
        }
        // -------------------------------------------------------------
        input.value = '';
        input.dataset.parentId = '';

        if (post.authorId !== currentUser.uid) {
            await setDoc(doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'notifications')), {
                to: post.authorId,
                from: currentUser.uid,
                type: 'comment',
                postId: postId,
                commentId: newComment.id,
                read: false,
                createdAt: new Date().toISOString()
            });
        }

        const otherCommenters = [...new Set(post.comments.map(c => c.authorId))].filter(id => id !== currentUser.uid && id !== post.authorId);
        for (let uid of otherCommenters) {
            await setDoc(doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'notifications')), {
                to: uid,
                from: currentUser.uid,
                type: 'reply',
                postId: postId,
                commentId: newComment.id,
                read: false,
                createdAt: new Date().toISOString()
            });
        }

    } catch (e) {
        showToast('حدث خطأ أثناء إضافة التعليق', 'error');
    }
}

window.deleteComment = async (postId, commentId) => {
    showConfirm('هل تريد حذف هذا التعليق؟', async () => {
        const postRef = doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', postId);
        const post = allPosts.find(p => p.id === postId);
        if (!post) return;
        const comments = post.comments.filter(c => c.id !== commentId);
        try {
            await updateDoc(postRef, {
                comments
            });
            showToast('تم الحذف بنجاح', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء الحذف', 'error');
        }
    });
}

window.deletePost = async (postId) => {
    showConfirm('هل تريد حذف هذا المنشور نهائياً؟', async () => {
        try {
            await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', postId));
            showToast('تم الحذف', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء الحذف', 'error');
        }
    });
}

window.tmpEditModalImageFile = null;
window.editModalImageRemoved = false;
window.editModalOriginalImageUrl = null;

window.handleEditModalImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
        window.tmpEditModalImageFile = file;
        window.editModalImageRemoved = false;
        document.getElementById('edit-modal-image-preview').src = URL.createObjectURL(file);
        document.getElementById('edit-modal-image-section').classList.remove('hidden');
    }
}

window.removeEditModalImage = () => {
    window.tmpEditModalImageFile = null;
    window.editModalImageRemoved = true;
    document.getElementById('edit-modal-image-input').value = '';
    document.getElementById('edit-modal-image-preview').src = '';
    document.getElementById('edit-modal-image-section').classList.add('hidden');
}

window.openEditModal = (id, type) => {
    editingItemId = id;
    editingItemType = type;
    let currentText = '';
    
    window.tmpEditModalImageFile = null;
    window.editModalImageRemoved = false;
    window.editModalOriginalImageUrl = null;

    const imgSection = document.getElementById('edit-modal-image-section');
    const imgPreview = document.getElementById('edit-modal-image-preview');
    const imgControls = document.getElementById('edit-modal-image-controls');
    
    if (imgSection) imgSection.classList.add('hidden');
    if (imgPreview) imgPreview.src = '';

    if (type === 'post') {
        const post = allPosts.find(p => p.id === id);
        if (post) {
            currentText = post.content || '';
            window.editModalOriginalImageUrl = post.imageUrl || null;
            if (window.editModalOriginalImageUrl && imgPreview && imgSection) {
                imgPreview.src = window.editModalOriginalImageUrl;
                imgSection.classList.remove('hidden');
            }
        }
        document.getElementById('edit-modal-title').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i> تعديل المنشور';
        if (imgControls) imgControls.classList.remove('hidden');
    } else if (type === 'comment') {
        for (let p of allPosts) {
            const c = (p.comments || []).find(x => x.id === id);
            if (c) {
                currentText = c.text || '';
                break;
            }
        }
        document.getElementById('edit-modal-title').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i> تعديل التعليق';
        if (imgControls) imgControls.classList.add('hidden');
    } else if (type === 'message') {
        const msg = allMessages.find(m => m.id === id);
        if (msg) currentText = msg.content || '';
        document.getElementById('edit-modal-title').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i> تعديل الرسالة';
        if (imgControls) imgControls.classList.add('hidden');
    }
    document.getElementById('edit-modal-input').value = currentText;
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
    lucide.createIcons();
}

window.closeEditModal = () => {
    const modal = document.getElementById('edit-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
    editingItemId = null;
    editingItemType = null;
}

document.getElementById('edit-modal-save').addEventListener('click', async () => {
    if (!editingItemId) return;
    const newText = document.getElementById('edit-modal-input').value.trim();
    const btn = document.getElementById('edit-modal-save');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';
    try {
        if (editingItemType === 'post') {
            let finalImageUrl = window.editModalOriginalImageUrl;
            
            // لو المستخدم مسح الصورة
            if (window.editModalImageRemoved) {
                finalImageUrl = null;
            }
            
            // لو المستخدم رفع صورة جديدة بدل القديمة
            if (window.tmpEditModalImageFile) {
                finalImageUrl = await uploadToImgbb(window.tmpEditModalImageFile);
            }
            
            const updateData = { content: newText };
            updateData.imageUrl = finalImageUrl || null;

            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', editingItemId), updateData);
            showToast('تم تعديل المنشور بنجاح', 'success');
        } else if (editingItemType === 'comment') {
            let targetPost = null;
            let cIdx = -1;
            for (let p of allPosts) {
                cIdx = (p.comments || []).findIndex(x => x.id === editingItemId);
                if (cIdx !== -1) {
                    targetPost = p;
                    break;
                }
            }
            if (targetPost) {
                const newComments = [...targetPost.comments];
                newComments[cIdx].text = newText;
                await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', targetPost.id), {
                    comments: newComments
                });
                showToast('تم تعديل التعليق بنجاح', 'success');
            }
        } else if (editingItemType === 'message') {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', editingItemId), {
                content: newText,
                isEdited: true
            });
            showToast('تم تعديل الرسالة بنجاح', 'success');
        }
        window.closeEditModal();
    } catch (e) {
        showToast('حدث خطأ أثناء التعديل', 'error');
    }
    btn.disabled = false;
    btn.innerText = 'حفظ التعديلات';
});

let profilePressTimer;
let isProfilePressing = false;

const startProfilePress = (e) => {
    if (e.target.tagName === 'IMG' && e.target.classList.contains('rounded-full')) {
        isProfilePressing = true;
        const src = e.target.src;
        profilePressTimer = setTimeout(() => {
            if (isProfilePressing) {
                window.openProfileLightbox(src);
                if (navigator.vibrate) navigator.vibrate(50);
            }
        }, 500);
    }
};

const cancelProfilePress = () => {
    isProfilePressing = false;
    clearTimeout(profilePressTimer);
};

document.body.addEventListener('touchstart', startProfilePress, {
    passive: true
});
document.body.addEventListener('touchend', cancelProfilePress);
document.body.addEventListener('touchmove', cancelProfilePress, {
    passive: true
});
document.body.addEventListener('mousedown', startProfilePress);
document.body.addEventListener('mouseup', cancelProfilePress);
document.body.addEventListener('mousemove', cancelProfilePress);
document.body.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG' && e.target.classList.contains('rounded-full')) e.preventDefault();
});

window.openProfileLightbox = (url) => {
    document.getElementById('profile-lightbox-img').src = url;
    document.getElementById('profile-lightbox').classList.remove('hidden');
    const lb = document.getElementById('profile-lightbox');
    lb.classList.add('opacity-0');
    setTimeout(() => lb.classList.remove('opacity-0'), 10);
}

window.closeProfileLightbox = (e) => {
    if (e) e.stopPropagation();
    const lb = document.getElementById('profile-lightbox');
    lb.classList.add('opacity-0');
    setTimeout(() => {
        lb.classList.add('hidden');
        document.getElementById('profile-lightbox-img').src = '';
    }, 300);
}

window.openLightbox = async (url, msgId = null) => {
    document.getElementById('lightbox-img').src = url;
    document.getElementById('lightbox').classList.remove('hidden');

    if (msgId) {
        const msg = allMessages.find(m => m.id === msgId);
        if (msg && msg.isViewOnce) {
            // مسح الصورة فور فتحها
            try {
                await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', msgId));
                showToast('هذه الصورة للعرض لمرة واحدة وقد تم تدميرها الآن', 'info');
            } catch (e) {
                console.error(e);
            }
        }
    }
}
window.closeLightbox = (e) => {
    if (e) e.stopPropagation();
    document.getElementById('lightbox').classList.add('hidden');
    document.getElementById('lightbox-img').src = '';
}

window.showReactors = (postId) => {
    const p = allPosts.find(x => x.id === postId);
    if (!p || !p.reactions) return;
    const list = document.getElementById('reactors-list');
    list.innerHTML = Object.keys(p.reactions).map(uid => {
        const u = allUsers.find(x => x.uid === uid);
        if (!u) return '';
        const rType = p.reactions[uid];
        return `
                <div class="flex items-center justify-between cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-700 p-3 rounded-xl transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0" onclick="window.closeReactorsModal(); window.viewProfile('${uid}')">
                    <div class="flex items-center gap-3">
                        <img src="${u.photoUrl}" class="w-10 h-10 rounded-full object-cover bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                        <span class="font-bold text-sm text-slate-700 dark:text-slate-200">${u.displayName}</span>
                    </div>
                    <div class="bg-slate-100 dark:bg-slate-700 flex items-center justify-center rounded-full shadow-sm w-9 h-9 text-xl">${window.getReactionIconStr(rType)}</div>
                </div>`;
    }).join('');
    if (!list.innerHTML) list.innerHTML = '<p class="text-center text-slate-500 dark:text-slate-400 py-4">لا يوجد تفاعلات.</p>';

    const modal = document.getElementById('reactors-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('#reactors-modal-content').classList.remove('scale-95');
    }, 10);
    lucide.createIcons();
}

window.showCommentReactors = (postId, commentId) => {
    const p = allPosts.find(x => x.id === postId);
    if (!p) return;
    const c = (p.comments || []).find(x => x.id === commentId);
    if (!c || !c.reactions) return;
    const list = document.getElementById('reactors-list');
    list.innerHTML = Object.keys(c.reactions).map(uid => {
        const u = allUsers.find(x => x.uid === uid);
        if (!u) return '';
        const rType = c.reactions[uid];
        return `
                <div class="flex items-center justify-between cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-700 p-3 rounded-xl transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0" onclick="window.closeReactorsModal(); window.viewProfile('${uid}')">
                    <div class="flex items-center gap-3">
                        <img src="${u.photoUrl}" class="w-10 h-10 rounded-full object-cover bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                        <span class="font-bold text-sm text-slate-700 dark:text-slate-200">${u.displayName}</span>
                    </div>
                    <div class="bg-slate-100 dark:bg-slate-700 flex items-center justify-center rounded-full shadow-sm w-9 h-9 text-xl">${window.getReactionIconStr(rType)}</div>
                </div>`;
    }).join('');
    if (!list.innerHTML) list.innerHTML = '<p class="text-center text-slate-500 dark:text-slate-400 py-4">لا يوجد تفاعلات.</p>';
    const modal = document.getElementById('reactors-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('#reactors-modal-content').classList.remove('scale-95');
    }, 10);
    lucide.createIcons();
}

window.closeReactorsModal = () => {
    const modal = document.getElementById('reactors-modal');
    modal.querySelector('#reactors-modal-content').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

let postToShareId = null;

window.openShareModal = (postId) => {
    postToShareId = postId;
    const list = document.getElementById('share-friends-list');
    const friends = userData ? (userData.friends || []) : [];

    if (!friends.length) {
        list.innerHTML = '<div class="text-center py-6 text-slate-500"><i data-lucide="users" class="w-10 h-10 mx-auto mb-2 opacity-50"></i><p class="text-sm">يجب إضافة أصدقاء أولاً لتتمكن من مشاركة المنشورات معهم.</p></div>';
    } else {
        const validFriends = friends.map(uid => allUsers.find(x => x.uid === uid)).filter(Boolean);
        list.innerHTML = validFriends.map(u => `
                    <div class="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <div class="flex items-center gap-3">
                            <img src="${u.photoUrl}" class="w-10 h-10 rounded-full object-cover bg-white dark:bg-slate-800">
                            <span class="font-bold text-sm text-slate-700 dark:text-slate-200">${u.displayName}</span>
                        </div>
                        <button onclick="window.sendShare('${u.uid}')" class="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1.5"><i data-lucide="send" class="w-3.5 h-3.5 rtl:-scale-x-100"></i> إرسال</button>
                    </div>
                `).join('');
    }
    const modal = document.getElementById('share-post-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('#share-post-modal-content').classList.remove('scale-95');
    }, 10);
    lucide.createIcons();
}

window.closeShareModal = () => {
    const modal = document.getElementById('share-post-modal');
    modal.querySelector('#share-post-modal-content').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

window.copyPostLink = (postId) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    const numericId = getPostNumericId(post);
    const shareUrl = `${window.location.origin}/posts/${numericId}.html`;
    const shareTitle = post.title || 'منشور على MyTab';
    const shareText = post.content ? post.content.substring(0, 100) : 'اقرأ هذا الموضوع وتفاعل معه على منصة MyTab';

    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
        }).catch((err) => {
            console.log('Web Share API error:', err);
        });
    } else {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl)
                .then(() => showToast('تم نسخ رابط المنشور بنجاح!', 'success'))
                .catch(() => showToast('تعذر نسخ الرابط تلقائياً', 'error'));
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = shareUrl;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('تم نسخ رابط المنشور بنجاح!', 'success');
            } catch (err) {
                showToast('تعذر نسخ الرابط', 'error');
            }
            document.body.removeChild(textarea);
        }
    }
};

let hasHandledDeepLink = false;
window.handlePostDeepLink = () => {
    if (hasHandledDeepLink) return;
    const urlParams = new URLSearchParams(window.location.search);
    const deepPostId = urlParams.get('post');
    if (deepPostId && allPosts.length > 0) {
        const matchedPost = allPosts.find(p => {
            const numId = getPostNumericId(p);
            return String(numId) === String(deepPostId) || p.id === deepPostId;
        });
        if (matchedPost) {
            hasHandledDeepLink = true;
            setTimeout(() => {
                if (typeof window.openSinglePost === 'function') {
                    window.openSinglePost(matchedPost.id);
                    const cleanUrl = window.location.pathname + window.location.hash;
                    window.history.replaceState({ tab: 'singlepost' }, '', cleanUrl);
                }
            }, 800);
        }
    }
};

// --- Chat Settings Logic ---
window.openChatSettings = () => {
    if (!userData) return;
    const modal = document.getElementById('chat-settings-modal');

    document.getElementById('cs-password').value = userData.chatPassword || '';
    document.getElementById('cs-auto-delete').value = userData.autoDeleteHours || (userData.autoDeleteMessages ? '12' : '0');

    // تحديث حالة الزر في الإعدادات
    window.floatingBubbleEnabled = localStorage.getItem('floatingBubbleEnabled') !== 'false';
    if (document.getElementById('cs-bubble-toggle')) document.getElementById('cs-bubble-toggle').checked = window.floatingBubbleEnabled;

    const isPaused = userData.pauseMessages || false;
    document.getElementById('cs-pause-toggle').checked = isPaused;
    window.togglePauseExceptions(isPaused);

    const exceptionsList = document.getElementById('cs-exceptions-list');
    const friends = userData ? (userData.friends || []) : [];
    const allowedSenders = userData.allowedSenders || [];

    if (friends.length === 0) {
        exceptionsList.innerHTML = '<p class="text-xs text-slate-500 text-center py-2">لا يوجد أصدقاء لاستثنائهم.</p>';
    } else {
        exceptionsList.innerHTML = friends.map(uid => {
            const u = allUsers.find(x => x.uid === uid);
            if (!u) return '';
            const isChecked = allowedSenders.includes(uid) ? 'checked' : '';
            return `
                        <label class="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors">
                            <input type="checkbox" class="cs-exception-checkbox w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" value="${u.uid}" ${isChecked}>
                            <div class="flex items-center gap-2">
                                <img src="${u.photoUrl}" class="w-6 h-6 rounded-full object-cover">
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">${u.displayName}</span>
                            </div>
                        </label>
                    `;
        }).join('');
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
    lucide.createIcons();
};

window.toggleFloatingBubble = (isEnabled) => {
    window.floatingBubbleEnabled = isEnabled;
    localStorage.setItem('floatingBubbleEnabled', isEnabled);
    // تحديث فوري للفقاعة بناءً على الحالة الجديدة
    if (typeof window.updateUnreadBubble === 'function') window.updateUnreadBubble();
};

window.togglePauseExceptions = (isPaused) => {
    const wrapper = document.getElementById('cs-exceptions-wrapper');
    if (isPaused) {
        wrapper.classList.remove('hidden');
    } else {
        wrapper.classList.add('hidden');
    }
};

window.closeChatSettings = () => {
    const modal = document.getElementById('chat-settings-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.saveChatSettings = async () => {
    const btn = document.getElementById('cs-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';

    const pwd = document.getElementById('cs-password').value.trim();
    const autoDeleteHours = parseInt(document.getElementById('cs-auto-delete').value);
    const isPaused = document.getElementById('cs-pause-toggle').checked;

    const checkboxes = document.querySelectorAll('.cs-exception-checkbox:checked');
    const allowedSenders = Array.from(checkboxes).map(cb => cb.value);

    try {
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), {
            chatPassword: pwd,
            autoDeleteHours: autoDeleteHours,
            autoDeleteMessages: autoDeleteHours > 0, // توافق مع الأكواد السابقة
            pauseMessages: isPaused,
            allowedSenders: isPaused ? allowedSenders : []
        });

        if (pwd !== userData.chatPassword) window.isChatSessionUnlocked = false;

        showToast('تم حفظ إعدادات الرسائل بنجاح', 'success');
        window.closeChatSettings();
        renderAll();
    } catch (e) {
        showToast('حدث خطأ أثناء الحفظ', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i> حفظ الإعدادات';
    lucide.createIcons();
};

let postToRepostId = null;

window.repostPost = (postId) => {
    postToRepostId = postId;
    document.getElementById('repost-modal-input').value = '';

    const op = allPosts.find(p => p.id === postId);
    const previewContainer = document.getElementById('repost-preview-container');
    if (op && previewContainer) {
        const authorName = op.isRepost ? op.originalAuthorName : op.authorName;
        const authorPhoto = op.isRepost ? op.originalAuthorPhoto : op.authorPhoto;
        const content = op.isRepost ? op.originalContent : (op.content || '');
        const image = op.imageUrl;
        const linkPreview = op.isRepost ? op.originalLinkPreview : op.linkPreview;

        let previewHtml = `<div class="flex items-center gap-2 mb-2 pointer-events-none"><img src="${authorPhoto}" class="w-6 h-6 rounded-full object-cover"><span class="text-xs font-bold text-slate-700 dark:text-slate-300">${authorName}</span></div>`;
        if (content) previewHtml += `<div class="text-[12px] text-slate-600 dark:text-slate-400 line-clamp-2 mb-2" dir="auto">${content}</div>`;
        if (image) previewHtml += `<img src="${image}" class="w-full h-24 object-cover rounded-lg border border-black/10 dark:border-white/10 mb-2">`;
        if (linkPreview && linkPreview.title) previewHtml += `<div class="bg-black/5 dark:bg-white/5 p-2 rounded-lg text-[11px] truncate border border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-300"><i data-lucide="link" class="w-3 h-3 inline"></i> ${linkPreview.title}</div>`;

        previewContainer.innerHTML = previewHtml;
        previewContainer.classList.remove('hidden');
    } else if (previewContainer) {
        previewContainer.classList.add('hidden');
    }

    const modal = document.getElementById('repost-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeRepostModal = () => {
    const modal = document.getElementById('repost-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
    postToRepostId = null;
};

window.confirmRepost = async () => {
    if (!postToRepostId) return;
    const op = allPosts.find(p => p.id === postToRepostId);
    if (!op) return;

    const btn = document.getElementById('repost-modal-save');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري...';

    const userContent = document.getElementById('repost-modal-input').value.trim();

    try {
        const originalId = op.isRepost ? op.originalPostId : op.id;
        const originalAuthorId = op.isRepost ? op.originalAuthorId : op.authorId;
        const originalAuthorName = op.isRepost ? op.originalAuthorName : op.authorName;
        const originalAuthorPhoto = op.isRepost ? op.originalAuthorPhoto : op.authorPhoto;
        const originalContent = op.isRepost ? op.originalContent : (op.content || '');
        const originalTitle = op.isRepost ? op.originalTitle : (op.title || '');
        const imageUrl = op.imageUrl || null;
        const originalLinkPreview = op.isRepost ? op.originalLinkPreview : (op.linkPreview || null);

        const newPostRef = doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'posts'));
        await setDoc(newPostRef, {
            authorId: currentUser.uid,
            authorName: userData.displayName,
            authorPhoto: userData.photoUrl,
            isRepost: true,
            originalPostId: originalId,
            originalAuthorId: originalAuthorId,
            originalAuthorName: originalAuthorName,
            originalAuthorPhoto: originalAuthorPhoto,
            originalContent: originalContent,
            originalTitle: originalTitle,
            content: userContent,
            imageUrl: imageUrl,
            originalLinkPreview: originalLinkPreview,
            colorId: op.colorId || 'white',
            communityId: null,
            createdAt: new Date().toISOString(),
            reactions: {},
            comments: []
        });
        showToast('تمت المشاركة على صفحتك بنجاح', 'success');

        if (originalAuthorId !== currentUser.uid) {
            await setDoc(doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'notifications')), {
                to: originalAuthorId,
                from: currentUser.uid,
                type: 'repost',
                postId: newPostRef.id,
                read: false,
                createdAt: new Date().toISOString()
            });
        }
        window.closeRepostModal();
    } catch (e) {
        showToast('حدث خطأ أثناء المشاركة', 'error');
    }
    btn.disabled = false;
    btn.innerText = 'مشاركة الآن';
};

window.sendShare = async (friendUid) => {
    if (!postToShareId) return;

    const receiverUser = allUsers.find(u => u.uid === friendUid);
    if (receiverUser && receiverUser.pauseMessages) {
        const allowed = receiverUser.allowedSenders || [];
        if (!allowed.includes(currentUser.uid)) {
            showToast('هذا المستخدم لا يمكنه استقبال الرسائل الآن', 'error');
            window.closeShareModal();
            return;
        }
    }

    try {
        await setDoc(doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'messages')), {
            senderId: currentUser.uid,
            receiverId: friendUid,
            content: postToShareId,
            type: 'post_share',
            read: false,
            createdAt: new Date().toISOString()
        });
        showToast('تم إرسال المنشور في الرسائل بنجاح', 'success');
        window.closeShareModal();
    } catch (e) {
        showToast('فشل الإرسال', 'error');
    }
}

window.setArchiveDate = (date) => {
    activeArchiveDate = date;
    if (activeTabStr === 'feed') renderFeedTab();
    else if (activeTabStr === 'profile') renderProfileTab();
    else if (activeTabStr === 'communities') window.renderCommunitiesTab();

    if (date) {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        showToast(`عرض أرشيف يوم ${date}`, 'info');
    }
};

function renderFeedTab() {
    const friends = (currentUser && userData && userData.friends) ? userData.friends : [];
    const allFeedPosts = allPosts.filter(p => {
        if (p.communityId) {
            const comm = (typeof allCommunities !== 'undefined') ? allCommunities.find(c => c.id === p.communityId) : null;
            return comm && !comm.isPrivate; // السماح فقط بمنشورات المجتمعات العامة
        }
        return !currentUser || p.authorId === currentUser.uid || friends.includes(p.authorId);
    }).sort((a, b) => {
        // ترتيب زمني صارم للأرشيف - الأحدث أولاً دائماً
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        // تجاهل isPinned في الفيد العام
        return timeB - timeA;
    });

    // إصلاح: فك أي تثبيت عالق في الفيد العام
    allFeedPosts.forEach(p => { if(p.isPinned && p.authorId === currentUser?.uid) p.isPinned = false; });
    
    const list = document.getElementById('feed-posts-list');
    const createBox = document.getElementById('create-post-container');
    const today = getSafeYMD();

    if (activeArchiveDate) {
        createBox.classList.add('hidden');
        const archPosts = allFeedPosts.filter(p => getSafeYMD(p.createdAt) === activeArchiveDate);
        list.innerHTML = `
                    <div class="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl mb-6 border border-emerald-100 dark:border-emerald-800">
                        <div class="flex items-center gap-3">
                            <i data-lucide="calendar" class="w-6 h-6 text-emerald-600"></i>
                            <span class="font-bold text-emerald-800 dark:text-emerald-300">أرشيف يوم: ${activeArchiveDate}</span>
                        </div>
                        <button onclick="window.setArchiveDate(null)" class="text-xs font-bold bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-colors">إغلاق الأرشيف والعودة</button>
                    </div>
                    ${archPosts.map(p => generatePostHTML(p)).join('')}
                `;
    } else {
        createBox.classList.remove('hidden');
        const nowMs = Date.now();
        const todayPosts = allFeedPosts.filter(p => (nowMs - new Date(p.createdAt || 0).getTime()) <= (12 * 60 * 60 * 1000));
        const olderPosts = allFeedPosts.filter(p => (nowMs - new Date(p.createdAt || 0).getTime()) > (12 * 60 * 60 * 1000));

        const archiveGroups = {};
        olderPosts.forEach(p => {
            const d = getSafeYMD(p.createdAt);
            if (!archiveGroups[d]) archiveGroups[d] = 0;
            archiveGroups[d]++;
        });

        const archiveColors = [
            'from-blue-500 to-indigo-600',
            'from-purple-500 to-fuchsia-600',
            'from-emerald-500 to-teal-600',
            'from-rose-500 to-pink-600',
            'from-amber-500 to-orange-600'
        ];

        let archiveHtml = '';
        if (Object.keys(archiveGroups).length > 0) {
            archiveHtml = `
                    <div class="mt-12 mb-6 border-t border-slate-200 dark:border-slate-700 pt-8">
                        <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2"><i data-lucide="archive" class="w-6 h-6 text-emerald-600"></i> الأرشيف الزمني</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            ${Object.keys(archiveGroups).sort().reverse().map((date, idx) => {
                                const color = archiveColors[idx % archiveColors.length];
                                return `
                                <div onclick="window.setArchiveDate('${date}')" class="group cursor-pointer relative overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1">
                                    <div class="absolute top-0 right-0 w-2 h-full bg-gradient-to-b ${color}"></div>
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <p class="text-xs text-slate-400 dark:text-slate-500 font-bold mb-1">ذكريات يوم</p>
                                            <h4 class="text-lg font-bold text-slate-800 dark:text-slate-100">${date}</h4>
                                        </div>
                                        <div class="bg-slate-50 dark:bg-slate-700/50 w-12 h-12 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-600 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 transition-colors">
                                            <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">${archiveGroups[date]}</span>
                                            <span class="text-[9px] font-bold text-slate-400 uppercase">منشور</span>
                                        </div>
                                    </div>
                                    <div class="mt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                        تصفح اليوم <i data-lucide="arrow-left" class="w-3 h-3"></i>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>`;
        }

        list.innerHTML = `
                    <div class="space-y-6">
                        ${todayPosts.length ? todayPosts.map(p => generatePostHTML(p)).join('') : `<div class="text-center py-10 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-emerald-200 dark:border-emerald-900/50 transition-colors"><p class="text-slate-500 text-sm">لا توجد منشورات جديدة اليوم.. ابدأ بمشاركة أفكارك!</p></div>`}
                    </div>
                    ${archiveHtml}
                `;
    }

    window.setPostColor('white', 'color-picker-container', 'create-post-container');
    lucide.createIcons();
}

window.togglePinPost = async (postId) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post || post.authorId !== currentUser.uid) return;
    
    const newPinnedState = !post.isPinned;
    try {
        // 1. التحديث المحلي الفوري لضمان سرعة الواجهة
        if (newPinnedState) {
            allPosts.forEach(p => {
                if (p.authorId === currentUser.uid && p.isPinned) p.isPinned = false;
            });
        }
        post.isPinned = newPinnedState;
        
        if (typeof renderAll === 'function') renderAll();
        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);

        // 2. تحديث قاعدة البيانات بثبات
        if (newPinnedState) {
            const pinnedQuery = allPosts.filter(p => p.authorId === currentUser.uid && p.id !== postId);
            for (const p of pinnedQuery) {
                try { await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', p.id), { isPinned: false }); } catch(e){}
            }
        }
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', postId), { isPinned: newPinnedState });
        
        showToast(newPinnedState ? 'تم التثبيت بنجاح' : 'تم إلغاء التثبيت', 'success');
    } catch (e) {
        console.error(e);
        showToast('حدث خطأ أثناء التثبيت', 'error');
    }
};

window.toggleBlockUser = async (uid) => {
    if (!currentUser || !userData) return;
    const isBlocked = (userData.blockedUsers || []).includes(uid);
    const msg = isBlocked ? 'هل أنت متأكد من فك الحظر عن هذا المستخدم؟' : 'هل أنت متأكد من حظر هذا المستخدم من التعليقات والرسائل؟\n\n(ملاحظة: هذا حظر خفي، لن يلاحظ شيئاً غريباً حتى يحاول التعليق أو مراسلتك)';
    
    window.showConfirm(msg, async () => {
        try {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), {
                blockedUsers: isBlocked ? arrayRemove(uid) : arrayUnion(uid)
            });
            if (isBlocked && userData.blockedUsers) {
                userData.blockedUsers = userData.blockedUsers.filter(id => id !== uid);
            } else if (!isBlocked) {
                if(!userData.blockedUsers) userData.blockedUsers = [];
                userData.blockedUsers.push(uid);
            }
            window.showToast(isBlocked ? 'تم فك الحظر بنجاح' : 'تم تفعيل الحظر الخفي بنجاح', 'success');
            if (typeof renderAll === 'function') renderAll();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch(e) {
            window.showToast('حدث خطأ أثناء تنفيذ الطلب', 'error');
        }
    });
};

window.removeFriend = async (friendUid) => {
    showConfirm('هل أنت متأكد من إلغاء الصداقة وإزالة هذا الشخص من مساحتك؟', async () => {
        try {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), {
                friends: arrayRemove(friendUid)
            });
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', friendUid), {
                friends: arrayRemove(currentUser.uid)
            });
            showToast('تم إلغاء الصداقة', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء إلغاء الصداقة.', 'error');
        }
    });
}

function renderFriendsTab() {
    const container = document.getElementById('friends-list-container');
    const fIds = userData.friends || [];

    const validFriends = fIds.map(uid => allUsers.find(x => x.uid === uid)).filter(Boolean);

    if (!validFriends.length) {
        container.innerHTML = '<div class="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700"><i data-lucide="users" class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3"></i><p class="text-slate-500 dark:text-slate-400">لا يوجد أصدقاء في مساحتك حتى الآن.</p></div>';
        return;
    }
    container.innerHTML = validFriends.map(u => {
        return `
                <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-200 dark:hover:border-slate-600 transition-colors group" onclick="window.viewProfile('${u.uid}')">
                    <div class="flex items-center gap-3">
                        <img src="${u.photoUrl}" class="w-12 h-12 rounded-full object-cover border border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-slate-800 ${window.getStatusRingClass(u.uid)}" onclick="window.handleUserAvatarClick('${u.uid}', '${u.photoUrl}', event)">
                        <div>
                            <h4 class="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">${u.displayName}</h4>
                            <p class="text-xs text-slate-500 dark:text-slate-400 font-mono">${u.myTabId}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="event.stopPropagation(); window.removeFriend('${u.uid}')" class="text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 p-2 rounded-lg transition-colors hidden group-hover:flex items-center gap-1 text-xs font-bold" title="إلغاء الصداقة">
                            <i data-lucide="user-minus" class="w-4 h-4"></i> إزالة
                        </button>
                        <i data-lucide="chevron-left" class="w-5 h-5 text-slate-300 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"></i>
                    </div>
                </div>`;
    }).join('');
    lucide.createIcons();
}

window.toggleEditProfile = () => {
    isEditingProfile = !isEditingProfile;
    if (!isEditingProfile) {
        window.tmpProfImgFile = null;
        window.removeProfImg = false;
    }
    renderAll();
}

window.cropperInstance = null;

window.handleProfileImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    window.currentCropTarget = 'profile';
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('crop-image-target').src = event.target.result;
        const modal = document.getElementById('crop-modal');
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('scale-95');
        }, 10);

        if (window.cropperInstance) {
            window.cropperInstance.destroy();
        }

        const image = document.getElementById('crop-image-target');
        window.cropperInstance = new Cropper(image, {
            aspectRatio: 1, // مربع 1:1 ليناسب البروفايل الدائري
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // إعادة تعيين الحقل
}

window.closeCropModal = () => {
    const modal = document.getElementById('crop-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        if (window.cropperInstance) {
            window.cropperInstance.destroy();
            window.cropperInstance = null;
        }
    }, 300);
}

window.currentCropTarget = 'profile'; // Default target
window.openUniversalCropper = (file, target, aspectRatio) => {
    if (!file) return;
    window.currentCropTarget = target;
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('crop-image-target').src = event.target.result;
        const modal = document.getElementById('crop-modal');
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('scale-95');
        }, 10);
        if (window.cropperInstance) window.cropperInstance.destroy();
        const image = document.getElementById('crop-image-target');
        window.cropperInstance = new Cropper(image, {
            aspectRatio: aspectRatio,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    };
    reader.readAsDataURL(file);
};

window.confirmCrop = () => {
    if (!window.cropperInstance) return;
    const btn = document.getElementById('crop-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i>';

    const isCover = window.currentCropTarget && window.currentCropTarget.includes('cover');
    const canvas = window.cropperInstance.getCroppedCanvas({
        width: isCover ? 1200 : 400,
        height: isCover ? 400 : 400,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    });
    canvas.toBlob((blob) => {
        const file = new File([blob], "cropped_image.jpg", { type: "image/jpeg", lastModified: Date.now() });
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        if (!window.currentCropTarget || window.currentCropTarget === 'profile') {
            window.tmpProfImgFile = file;
            window.removeProfImg = false;
            document.getElementById('edit-profile-avatar-preview').src = dataUrl;
        } else if (window.currentCropTarget === 'comm-cover') {
            window.tmpCommCoverFile = file;
            document.getElementById('comm-cover-preview').src = dataUrl;
        } else if (window.currentCropTarget === 'comm-icon') {
            window.tmpCommImgFile = file;
            document.getElementById('comm-icon-preview').src = dataUrl;
        } else if (window.currentCropTarget === 'edit-comm-cover') {
            window.tmpEditCommCoverFile = file;
            document.getElementById('edit-comm-cover-preview').src = dataUrl;
        } else if (window.currentCropTarget === 'edit-comm-icon') {
            window.tmpEditCommImgFile = file;
            document.getElementById('edit-comm-icon-preview').src = dataUrl;
        }

        window.closeCropModal();
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="crop" class="w-4 h-4"></i> قص وحفظ';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 'image/jpeg', 0.9);
}

window.removeProfilePhoto = () => {
    window.tmpProfImgFile = null;
    window.removeProfImg = true;
    const gender = document.getElementById('ep-gender') ? document.getElementById('ep-gender').value : userData.gender;

    let defaultAvatar = gender === 'female' ?
        'https://img.magnific.com/premium-vector/confident-woman-with-approval-checkmark_778176-1287.jpg' :
        'https://www.axelpfaender.com/wp-content/uploads/2026/04/Zeichenflache-12thumb.jpg';
    if (gender === 'female' && globalSettings.defaultFemaleAvatar) defaultAvatar = globalSettings.defaultFemaleAvatar;
    if (gender === 'male' && globalSettings.defaultMaleAvatar) defaultAvatar = globalSettings.defaultMaleAvatar;

    document.getElementById('edit-profile-avatar-preview').src = defaultAvatar;
}

window.saveProfile = async () => {
    const btn = document.getElementById('save-prof-btn');
    btn.disabled = true;
    btn.innerHTML = 'جاري...';
    try {
        let pUrl = userData.photoUrl;
        if (window.tmpProfImgFile) {
            pUrl = await uploadToImgbb(window.tmpProfImgFile);
        } else if (window.removeProfImg) {
            const gender = document.getElementById('ep-gender').value;
            pUrl = gender === 'female' ?
                'https://img.magnific.com/premium-vector/confident-woman-with-approval-checkmark_778176-1287.jpg' :
                'https://www.axelpfaender.com/wp-content/uploads/2026/04/Zeichenflache-12thumb.jpg';
            if (gender === 'female' && globalSettings.defaultFemaleAvatar) pUrl = globalSettings.defaultFemaleAvatar;
            if (gender === 'male' && globalSettings.defaultMaleAvatar) pUrl = globalSettings.defaultMaleAvatar;
        }

        const sLinksRaw = Array.from(document.querySelectorAll('.edit-social-row')).map(row => ({
            platform: row.querySelector('.s-plat').value,
            url: row.querySelector('.s-url').value
        }));

        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), {
            displayName: document.getElementById('ep-name').value,
            bio: document.getElementById('ep-bio').value,
            profileMessage: document.getElementById('ep-message').value,
            phoneNumber: document.getElementById('ep-phone').value,
            gender: document.getElementById('ep-gender').value,
            birthDate: document.getElementById('ep-dob').value,
            photoUrl: pUrl,
            socialLinks: sLinksRaw.filter(l => l.url.trim() !== '')
        });

        isEditingProfile = false;
        window.tmpProfImgFile = null;
        window.removeProfImg = false;
        showToast('تم تحديث البيانات', 'success');
    } catch (e) {
        showToast('خطأ في الحفظ', 'error');
    }
    renderAll();
}

function renderProfileTab() {
    const container = document.getElementById('profile-view-container');
    const postsContainer = document.getElementById('profile-posts-list');
    const postsSectionHeader = document.getElementById('profile-posts-header');

    const tUser = allUsers.find(u => u.uid === viewingUid) || userData;
    const isMe = tUser.uid === currentUser.uid;
    const isFriend = (userData.friends || []).includes(tUser.uid);
    const isPending = friendRequests.some(r => r.from === currentUser.uid && r.to === tUser.uid);

    const canView = isMe || isFriend || isAdminStealthMode;

    if (canView) {
        const myP = allPosts.filter(p => !p.communityId && p.authorId === tUser.uid).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()));

        let postsHtml = '';
        if (!myP.length) {
            postsHtml = '<p class="text-center text-slate-500 dark:text-slate-400 py-10 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">لا توجد منشورات.</p>';
        } else if (activeArchiveDate) {
            const archPosts = myP.filter(p => getSafeYMD(p.createdAt) === activeArchiveDate);
            postsHtml = `
                        <div class="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl mb-6 border border-emerald-100 dark:border-emerald-800">
                            <div class="flex items-center gap-3">
                                <i data-lucide="calendar" class="w-6 h-6 text-emerald-600"></i>
                                <span class="font-bold text-emerald-800 dark:text-emerald-300">أرشيف يوم: ${activeArchiveDate}</span>
                            </div>
                            <button onclick="window.setArchiveLevel('month', '${activeArchiveMonth}')" class="text-xs font-bold bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-colors">عودة للأيام</button>
                        </div>
                        ${archPosts.map(p => generatePostHTML(p, 'profile-')).join('')}
                    `;
        } else {
            const today = getSafeYMD();
            const nowMs = Date.now();
            const todayPosts = myP.filter(p => (nowMs - new Date(p.createdAt || 0).getTime()) <= (12 * 60 * 60 * 1000));
            const olderPosts = myP.filter(p => (nowMs - new Date(p.createdAt || 0).getTime()) > (12 * 60 * 60 * 1000));

            const archiveHtml = window.generateArchiveViewHtml(olderPosts, 'الأرشيف الزمني');
            postsHtml = todayPosts.map(p => generatePostHTML(p, 'profile-')).join('') + archiveHtml;
        }

        // فصل المنشورات المثبتة عن سياق الأرشيف الزمني وعرضها دائماً في الأعلى
                if (activeArchiveDate) {
                    const pinnedPosts = myP.filter(p => p.isPinned && getSafeYMD(p.createdAt) !== activeArchiveDate);
                    if (pinnedPosts.length) {
                        postsHtml = pinnedPosts.map(p => generatePostHTML(p, 'profile-')).join('') + postsHtml;
                    }
                } else if (myP.length) {
                    const nowMs = Date.now();
                    // المنشورات المثبتة ستعرض دائماً هنا بغض النظر عن وقتها
                    const todayPosts = myP.filter(p => p.isPinned || (nowMs - new Date(p.createdAt || 0).getTime()) <= (12 * 60 * 60 * 1000));
                    // الأرشيف سيأخذ فقط المنشورات القديمة التي "ليست مثبتة"
                    const olderPosts = myP.filter(p => !p.isPinned && (nowMs - new Date(p.createdAt || 0).getTime()) > (12 * 60 * 60 * 1000));
                    const archiveHtml = window.generateArchiveViewHtml(olderPosts, 'الأرشيف الزمني');
                    postsHtml = todayPosts.map(p => generatePostHTML(p, 'profile-')).join('') + archiveHtml;
                }
                postsContainer.innerHTML = postsHtml;
        postsSectionHeader.classList.remove('hidden');
    } else {
        postsContainer.innerHTML = '';
        postsSectionHeader.classList.add('hidden');
    }

    if (isMe && isEditingProfile) {
        container.innerHTML = `
                <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 relative z-10 shadow-sm border border-slate-100 dark:border-slate-700 mt-4 transition-colors">
                    <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2"><i data-lucide="settings" class="w-6 h-6 text-emerald-600 dark:text-emerald-400"></i> إعدادات حسابي</h3>
                    <div class="space-y-8">
                        <div>
                            <h4 class="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4 flex items-center gap-2"><i data-lucide="shield" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i> بيانات الدخول والأمان</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label class="text-xs text-slate-500 dark:text-slate-400 mb-1 block">البريد الإلكتروني المسجل</label><input type="text" value="${currentUser.email || 'مسجل بحساب جوجل'}" disabled class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed font-sans" dir="ltr"></div>
                                <div>
                                    <label class="text-xs text-slate-500 dark:text-slate-400 mb-1 block">كلمة المرور</label>
                                    <button id="reset-pwd-btn" onclick="window.resetMyPassword()" class="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex justify-center items-center gap-2"><i data-lucide="key" class="w-4 h-4"></i> إرسال رابط تغيير كلمة المرور</button>
                                    <p id="pwd-msg" class="text-xs mt-2 text-emerald-600 dark:text-emerald-400 hidden font-medium"></p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4 flex items-center gap-2"><i data-lucide="user" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i> المعلومات الشخصية</h4>
                            <div class="flex items-center gap-4 mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div class="relative group">
                                    <img id="edit-profile-avatar-preview" src="${window.tmpProfImgFile ? URL.createObjectURL(window.tmpProfImgFile) : (window.removeProfImg ? `https://api.dicebear.com/9.x/notionists/svg?seed=${currentUser.uid}-${userData.gender}&backgroundColor=10b981` : userData.photoUrl)}" class="w-16 h-16 rounded-full border-2 border-emerald-200 dark:border-emerald-700 object-cover bg-white dark:bg-slate-800">
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-700 dark:text-slate-200">الصورة الشخصية</p>
                                    <div class="flex gap-2 mt-2">
                                        <button onclick="document.getElementById('profile-image-input').click()" class="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-bold text-slate-600 dark:text-slate-300">تغيير الصورة</button>
                                        <button onclick="window.removeProfilePhoto()" class="text-xs bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50 px-3 py-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors font-bold flex items-center gap-1"><i data-lucide="trash-2" class="w-3 h-3"></i> حذف</button>
                                    </div>
                                    <input type="file" id="profile-image-input" accept="image/*" class="hidden" onchange="window.handleProfileImageSelect(event)">
                                </div>
                            </div>
                            <div class="space-y-4">
                                <div><label class="text-xs text-slate-500 dark:text-slate-400 mb-1">الاسم</label><input type="text" id="ep-name" value="${userData.displayName}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100 transition-colors"></div>
                                <div><label class="text-xs text-slate-500 dark:text-slate-400 mb-1">النبذة (Bio)</label><textarea id="ep-bio" rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none resize-none focus:border-emerald-500 text-slate-800 dark:text-slate-100 transition-colors">${userData.bio}</textarea></div>
                                <div><label class="text-xs text-slate-500 dark:text-slate-400 mb-1">رسالة الغلاف (تظهر لزوار بروفايلك)</label><textarea id="ep-message" rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none resize-none focus:border-emerald-500 text-slate-800 dark:text-slate-100 transition-colors" placeholder="اكتب رسالتك لزوار مساحتك (مثال: اهلا يا اصدقائي شرفتم صفحتتى : )...">${userData.profileMessage || ''}</textarea></div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div><label class="text-xs text-slate-500 dark:text-slate-400 mb-1">النوع</label><select id="ep-gender" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100 transition-colors"><option value="male" ${userData.gender==='male'?'selected':''}>ذكر</option><option value="female" ${userData.gender==='female'?'selected':''}>أنثى</option></select></div>
                                    <div><label class="text-xs text-slate-500 dark:text-slate-400 mb-1">تاريخ الميلاد</label><input type="date" id="ep-dob" value="${userData.birthDate || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100 transition-colors"></div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4 flex items-center gap-2"><i data-lucide="link" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i> التواصل والروابط</h4>
                            <div class="space-y-4">
                                <div><label class="text-xs text-slate-500 dark:text-slate-400 mb-1">هاتف الواتساب</label><input type="text" id="ep-phone" value="${userData.phoneNumber||''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100 transition-colors" dir="ltr"></div>
                                <div id="ep-socials">
                                    <label class="text-xs text-slate-500 dark:text-slate-400 mb-1 block">الروابط الاجتماعية</label>
                                    ${(userData.socialLinks||[]).map(l => `<div class="edit-social-row flex gap-2 mb-2"><select class="s-plat w-1/3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-100">${getSocialOptionsHtml(l.platform)}</select><input type="url" class="s-url flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs outline-none text-slate-800 dark:text-slate-100" value="${l.url}"><button onclick="this.parentElement.remove()" class="text-rose-500 dark:text-rose-400"><i data-lucide="x" class="w-4 h-4"></i></button></div>`).join('')}
                                </div>
                                <button onclick="window.addEPSocial()" class="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium hover:underline">إضافة رابط +</button>
                            </div>
                        </div>
                        <div class="flex gap-2 justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button onclick="window.toggleEditProfile()" class="px-6 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
                            <button id="save-prof-btn" onclick="window.saveProfile()" class="px-6 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 flex items-center gap-2">حفظ التعديلات</button>
                        </div>
                    </div>
                </div>`;
    } else {
        let actionBtn = '';
        const btnBaseClass = "px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors w-full md:w-auto md:min-w-[130px] whitespace-nowrap";

        let isBlockedByMe = false;
        try { isBlockedByMe = userData && userData.blockedUsers && userData.blockedUsers.includes(tUser.uid); } catch(e){}
        const blockBtnHtml = !isMe ? `<button onclick="window.toggleBlockUser('${tUser.uid}')" class="${btnBaseClass.replace('w-full', 'w-10 h-10 min-w-0 p-0 rounded-full flex items-center justify-center')} ${isBlockedByMe ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-rose-100 hover:text-rose-600'} shrink-0 mx-1 transition-colors" title="${isBlockedByMe ? 'فك الحظر عن المستخدم' : 'حظر هذا المستخدم'}"><i data-lucide="slash" class="w-4 h-4"></i></button>` : '';

        if (isMe) {
            actionBtn = `<button onclick="window.toggleEditProfile()" class="${btnBaseClass} bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 mx-auto md:mx-0"><i data-lucide="settings" class="w-4 h-4"></i> تعديل بياناتي</button>`;
        } else if (!isFriend) {
            if (isPending) actionBtn = `<div class="flex items-center justify-center w-full md:w-auto"><button disabled class="${btnBaseClass} bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"><i data-lucide="clock" class="w-4 h-4"></i> طلب معلق</button>${blockBtnHtml}</div>`;
            else actionBtn = `<div class="flex items-center justify-center w-full md:w-auto"><button onclick="window.sendFriendReq('${tUser.uid}')" class="${btnBaseClass} bg-emerald-600 hover:bg-emerald-700 text-white"><i data-lucide="user-plus" class="w-4 h-4"></i> طلب إضافة</button>${blockBtnHtml}</div>`;
        } else {
            actionBtn = `<div class="flex items-center gap-1 w-full md:w-auto justify-center mx-auto md:mx-0">
                        <button onclick="window.goToChat('${tUser.uid}')" class="${btnBaseClass.replace('w-full', 'flex-1')} bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 hover:text-blue-700 dark:hover:text-blue-300 text-blue-600 dark:text-blue-400"><i data-lucide="message-circle" class="w-4 h-4"></i> مراسلة</button>
                        <button onclick="window.removeFriend('${tUser.uid}')" class="${btnBaseClass.replace('w-full', 'flex-1')} bg-emerald-100 dark:bg-emerald-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-700 dark:hover:text-rose-400 text-emerald-700 dark:text-emerald-400 group" title="إلغاء الصداقة"><i data-lucide="check-circle" class="w-4 h-4 group-hover:hidden"></i><i data-lucide="user-minus" class="w-4 h-4 hidden group-hover:inline"></i> <span class="group-hover:hidden">صديق بالمساحة</span><span class="hidden group-hover:inline">إلغاء الصداقة</span></button>
                        ${blockBtnHtml}
                    </div>`;
        }

        const priv = tUser.privacySettings || {
            showPhone: 'public',
            showGender: 'public',
            showDob: 'full',
            showAddress: 'public'
        };
        let socialHtml = '',
            waHtml = '',
            statsHtml = '',
            infoCardsHtml = '';

        if (canView) {
            let infos = [];
            if (tUser.gender && (isMe || priv.showGender !== 'private')) {
                infos.push(`<div class="flex items-center justify-center md:justify-start gap-2.5 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm"><i data-lucide="user" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i><span class="text-sm font-bold text-slate-700 dark:text-slate-200">${tUser.gender === 'male' ? 'ذكر' : 'أنثى'}</span></div>`);
            }
            if (tUser.birthDate && (isMe || priv.showDob !== 'private')) {
                let dobDisplay = tUser.birthDate;
                if (!isMe && priv.showDob === 'partial') {
                    const dateObj = new Date(tUser.birthDate);
                    dobDisplay = `${dateObj.getDate()} ${dateObj.toLocaleString('ar-EG', { month: 'long' })}`;
                }
                infos.push(`<div class="flex items-center justify-center md:justify-start gap-2.5 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm"><i data-lucide="calendar" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i><span class="text-sm font-bold text-slate-700 dark:text-slate-200" dir="ltr">${dobDisplay}</span></div>`);
            }
            if (tUser.address && (isMe || priv.showAddress !== 'private')) {
                infos.push(`<div class="flex items-center justify-center md:justify-start gap-2.5 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm col-span-full md:col-span-1"><i data-lucide="map-pin" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i><span class="text-sm font-bold text-slate-700 dark:text-slate-200">${tUser.address}</span></div>`);
            }
            if (infos.length > 0) {
                infoCardsHtml = `<div class="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 mb-5">${infos.join('')}</div>`;
            }

            socialHtml = (tUser.socialLinks || []).map(l => `<a href="${l.url}" target="_blank" class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:text-emerald-600 transition-colors shadow-sm"><i data-lucide="link" class="w-4 h-4"></i></a>`).join('');
            if (tUser.phoneNumber && (isMe || priv.showPhone !== 'private')) {
                waHtml = `<a href="https://wa.me/${String(tUser.phoneNumber).replace(/\D/g,'')}" target="_blank" class="flex items-center justify-center gap-1.5 bg-[#25D366] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm hover:scale-105 transition-transform"><i data-lucide="message-square" class="w-3.5 h-3.5"></i> واتساب</a>`;
            }
            const realFriendsCount = (tUser.friends || []).filter(friendId => allUsers.some(u => u.uid === friendId)).length;
            statsHtml = `<div class="mt-6 flex gap-8 justify-center md:justify-start border-t border-emerald-100/50 dark:border-emerald-800/30 pt-6"><div class="text-center"><span class="block font-black text-2xl text-emerald-600 dark:text-emerald-400">${realFriendsCount}</span><span class="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">أصدقاء</span></div></div>`;
        } else {
            statsHtml = `<div class="mt-6 border-t border-slate-100 dark:border-slate-700 pt-6 text-center md:text-right text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start gap-2"><i data-lucide="lock" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i> هذا الحساب خاص، المحتوى غير متاح للغرباء.</div>`;
        }

        let stealthBadge = '';
        if (isAdminStealthMode) {
            stealthBadge = `<div class="absolute top-4 left-4 bg-amber-500/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 z-30" title="أنت تتصفح هذا الحساب كمدير منصة (تصفح خفي)"><i data-lucide="eye" class="w-4 h-4"></i> تصفح خفي للمدير</div>`;
        }

        const publicComms = allCommunities.filter(c => c.creatorId === tUser.uid && !c.isPrivate);

        window.copyAnyId = (id) => {
            navigator.clipboard.writeText(id).then(() => showToast('تم النسخ!', 'success')).catch(() => {
                showToast('فشل', 'error')
            });
        }

        container.innerHTML = `
                <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors group/profile mb-8 relative">
                    ${stealthBadge}
                    <div class="w-full h-40 md:h-56 relative overflow-hidden">
                        <img src="${tUser.coverUrl}" class="w-full h-full object-cover transition-transform duration-700 group-hover/profile:scale-105">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent pointer-events-none"></div>
                        ${tUser.profileMessage && tUser.profileMessage.trim() !== '' ? `
                        <div class="absolute top-4 left-4 md:left-6 max-w-[60%] md:max-w-sm bg-black/50 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 z-20 shadow-lg text-white cursor-default animate-in fade-in duration-700">
                            <div class="flex items-center gap-1.5 mb-1.5 text-emerald-400 border-b border-white/10 pb-1">
                                <i data-lucide="quote" class="w-4 h-4"></i><span class="text-[11px] font-bold tracking-wider">رسالة ${tUser.displayName.split(' ')[0]}</span>
                            </div>
                            <p class="text-xs md:text-sm font-medium leading-relaxed drop-shadow-sm whitespace-pre-wrap">${tUser.profileMessage}</p>
                        </div>
                        ` : ''}
                    </div>
                    <div class="p-6 md:p-8 relative z-10 bg-white dark:bg-slate-800">
                        <div class="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-start text-center md:text-right">
                            <img src="${tUser.photoUrl}" class="-mt-16 md:-mt-20 lg:-mt-24 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-slate-800 shadow-xl bg-white dark:bg-slate-800 object-cover shrink-0 relative z-20 transition-transform duration-300 hover:scale-105 cursor-pointer mx-auto md:mx-0 ${window.getStatusRingClass(tUser.uid)}" onclick="window.handleUserAvatarClick('${tUser.uid}', '${tUser.photoUrl}', event)">
                            <div class="flex-1 w-full flex flex-col md:flex-row flex-wrap items-center md:items-start justify-between gap-4 min-w-0 relative">
                                <div class="flex flex-col items-center md:items-start min-w-0 max-w-full flex-1 pt-2 md:pt-0">
                                    <h1 class="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1.5 flex flex-wrap items-center justify-center md:justify-start gap-1 w-full leading-snug break-words">${tUser.displayName}${window.getUserBadge(tUser.uid)}</h1>
                                    <button onclick="window.copyAnyId('${tUser.myTabId}')" class="inline-flex items-center justify-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/70 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition-colors mt-1 w-max mx-auto md:mx-0 border border-emerald-200 dark:border-emerald-800/50">
                                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                        <span>نسخ المعرف</span>
                                    </button>
                                </div>
                                <div class="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto shrink-0 z-20 mt-4 md:mt-0">
                                    ${actionBtn}
                                </div>
                            </div>
                        </div>
                        <div class="mt-6 md:mt-8">
                            ${infoCardsHtml}
                            <p class="text-slate-700 dark:text-slate-200 text-sm md:text-base leading-relaxed bg-emerald-50/30 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30 text-center md:text-right shadow-sm break-words whitespace-pre-wrap max-w-full overflow-hidden font-medium">${tUser.bio}</p>
                            <div class="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                                ${waHtml}${socialHtml}
                            </div>
                            ${statsHtml}
                        </div>
                    </div>
                </div>
                ${publicComms.length > 0 ? `
                <div class="mt-8">
                    <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 px-2 border-r-4 border-emerald-500 mr-2 mb-4">المجتمعات العامة</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${publicComms.map(c => generateCommunityCardHtml(c, true)).join('')}
                    </div>
                </div>
                ` : ''}
                `;
    }
    lucide.createIcons();
}

window.addEPSocial = () => {
    const div = document.createElement('div');
    div.className = 'edit-social-row flex gap-2 mb-2';
    div.innerHTML = `<select class="s-plat w-1/3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-100 transition-colors">${getSocialOptionsHtml('facebook')}</select><input type="url" class="s-url flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs outline-none text-slate-800 dark:text-slate-100 transition-colors"><button onclick="this.parentElement.remove()" class="text-rose-500 dark:text-rose-400"><i data-lucide="x" class="w-4 h-4"></i></button>`;
    document.getElementById('ep-socials').appendChild(div);
    lucide.createIcons();
}

window.performSearch = () => {
    try {
        const inputEl = document.getElementById('search-input');
        if (!inputEl) return;
        const input = inputEl.value.trim();
        const container = document.getElementById('search-result-container');
        const msg = document.getElementById('search-msg');
        if (msg) msg.innerText = '';
        if (container) container.innerHTML = '';

        if (!input) {
            if (msg) {
                msg.innerText = 'يرجى إدخال كلمة للبحث (اسم، هاشتاج، الخ)';
                msg.className = 'text-sm text-rose-600 dark:text-rose-400 mt-3';
            }
            return;
        }

        const lowerInput = String(input).toLowerCase();

        let foundUsers = allUsers.filter(u => {
            const idMatch = u.myTabId ? String(u.myTabId).toLowerCase().includes(lowerInput) : false;
            const nameMatch = u.displayName ? String(u.displayName).toLowerCase().includes(lowerInput) : false;
            return idMatch || nameMatch;
        });

        let foundPosts = allPosts.filter(p => {
            if (p.communityId) {
                const comm = allCommunities.find(c => c.id === p.communityId);
                if (!comm || comm.isPrivate) return false;
            }
            const titleMatch = p.title ? String(p.title).toLowerCase().includes(lowerInput) : false;
            const contentMatch = p.content ? String(p.content).toLowerCase().includes(lowerInput) : false;
            return titleMatch || contentMatch;
        });

        let html = '';

        if (foundUsers.length) {
            html += '<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 border-r-4 border-emerald-500 pr-2">أشخاص</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">';
            html += foundUsers.map(u => {
                const isMe = currentUser && u.uid === currentUser.uid;
                const isFriend = userData && (userData.friends || []).includes(u.uid);
                const isPending = friendRequests.some(r => currentUser && r.from === currentUser.uid && r.to === u.uid);
                let btnHtml = isMe ? `<button disabled class="bg-slate-100 dark:bg-slate-700 text-slate-500 text-sm px-4 py-2 rounded-xl font-bold">أنت</button>` :
                    (isFriend ? `<button disabled class="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 text-sm px-4 py-2 rounded-xl font-bold border border-emerald-100 dark:border-emerald-800">صديق بالمساحة</button>` :
                        (isPending ? `<button disabled class="bg-slate-100 dark:bg-slate-700 text-slate-500 text-sm px-4 py-2 rounded-xl font-bold cursor-not-allowed">طلب معلق</button>` :
                            `<button onclick="window.sendFriendReq('${u.uid}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-xl transition-colors font-bold shadow-sm flex items-center gap-1.5"><i data-lucide="user-plus" class="w-4 h-4"></i> إضافة</button>`));
                return `<div class="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors"><div class="flex items-center gap-4 cursor-pointer w-full md:w-auto" onclick="window.viewProfile('${u.uid}')"><img src="${u.photoUrl || ''}" class="w-14 h-14 rounded-full object-cover border-2 border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-slate-800"><div><h4 class="font-bold text-slate-800 dark:text-slate-100">${u.displayName || 'مستخدم'}</h4><p class="text-xs text-slate-500 font-mono mt-1">${u.myTabId || ''}</p></div></div><div class="w-full md:w-auto flex justify-center">${btnHtml}</div></div>`;
            }).join('');
            html += '</div>';
        }

        if (foundPosts.length) {
            html += '<h3 class="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 border-r-4 border-emerald-500 pr-2">منشورات</h3><div class="space-y-6">';
            html += foundPosts.map(p => generatePostHTML(p, 'search-')).join('');
            html += '</div>';
        }

        if (!foundUsers.length && !foundPosts.length) {
            html = '<div class="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700"><i data-lucide="search-x" class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3"></i><p class="text-slate-500 dark:text-slate-400">لم يتم العثور على نتائج مطابقة.</p></div>';
        }

        if (container) container.innerHTML = html;
        lucide.createIcons();
    } catch (err) {
        console.error('Search error:', err);
        const msg = document.getElementById('search-msg');
        if (msg) {
            msg.innerText = 'حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.';
            msg.className = 'text-sm text-rose-600 dark:text-rose-400 mt-3';
        }
    }
}

window.searchHashtag = (tag) => {
    window.switchTab('search');
    document.getElementById('search-input').value = tag;
    window.performSearch();
}

window.sendFriendReq = async (uid) => {
    try {
        await setDoc(doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'friendRequests')), {
            from: currentUser.uid,
            to: uid,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        showToast('تم إرسال طلب الصداقة بنجاح!', 'success');
        if (activeTabStr === 'search') window.performSearch();
        if (activeTabStr === 'profile') renderProfileTab();
    } catch (e) {
        showToast('حدث خطأ أثناء الإرسال.', 'error');
    }
}

function renderRequestsTab() {
    const list = document.getElementById('requests-list');
    const incReqs = friendRequests.filter(r => r.to === currentUser.uid && r.status === 'pending');
    if (!incReqs.length) {
        list.innerHTML = '<div class="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700"><i data-lucide="bell" class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3"></i><p class="text-slate-500 dark:text-slate-400">لا توجد طلبات صداقة معلقة.</p></div>';
        return;
    }
    list.innerHTML = incReqs.map(req => {
        const u = allUsers.find(x => x.uid === req.from);
        if (!u) return '';
        return `<div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors"><div class="flex items-center gap-4 cursor-pointer w-full sm:w-auto" onclick="window.viewProfile('${u.uid}')"><img src="${u.photoUrl}" class="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"><div><h4 class="font-bold text-slate-800 dark:text-slate-100">${u.displayName}</h4><p class="text-xs text-slate-500 dark:text-slate-400">${new Date(req.createdAt).toLocaleDateString('ar-EG')}</p></div></div><div class="flex gap-2 w-full sm:w-auto"><button onclick="window.acceptFriendReq('${req.id}', '${u.uid}')" class="flex-1 sm:flex-none bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold transition-colors">قبول</button><button onclick="window.rejectFriendReq('${req.id}')" class="flex-1 sm:flex-none bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl text-sm font-bold transition-colors">رفض</button></div></div>`;
    }).join('');
    lucide.createIcons();
}

window.acceptFriendReq = async (reqId, fromUid) => {
    try {
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), {
            friends: arrayUnion(fromUid)
        });
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', fromUid), {
            friends: arrayUnion(currentUser.uid)
        });
        await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'friendRequests', reqId));
        showToast('تم قبول الصداقة', 'success');
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
}

window.rejectFriendReq = async (reqId) => {
    try {
        await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'friendRequests', reqId));
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
}

function renderMessagesList() {
    if (!userData) return; // منع الكراش: الزائر ليس لديه قائمة أصدقاء أو رسائل
    if (!userData) return; // حماية الدالة من الكراش إذا كان المستخدم زائراً
    const list = document.getElementById('chat-friends-list');
    const friends = userData.friends || [];
    if (!friends.length) {
        list.innerHTML = '<div class="text-center py-10"><i data-lucide="message-square" class="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2"></i><p class="text-slate-500 dark:text-slate-400 text-sm">ليس لديك أصدقاء بالمساحة بعد.</p></div>';
        return;
    }

    const chats = friends.map(fUid => {
        const fInfo = allUsers.find(u => u.uid === fUid);
        if (!fInfo) return null;
        const fMsgs = allMessages.filter(m => (m.senderId === currentUser.uid && m.receiverId === fUid) || (m.senderId === fUid && m.receiverId === currentUser.uid)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const lastMsg = fMsgs[0];
        const unreadCount = fMsgs.filter(m => m.receiverId === currentUser.uid && !m.read).length;
        return {
            uid: fUid,
            info: fInfo,
            lastMsg: lastMsg,
            unreadCount: unreadCount,
            lastTime: lastMsg ? new Date(lastMsg.createdAt).getTime() : 0
        };
    }).filter(c => c && c.lastMsg).sort((a, b) => b.lastTime - a.lastTime);

    if (!chats.length) {
        list.innerHTML = '<div class="text-center py-10"><i data-lucide="message-square" class="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2"></i><p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">لا توجد محادثات سابقة.<br>يمكنك بدء محادثة جديدة بالدخول لتبويب (الأصدقاء).</p></div>';
        return;
    }

    list.innerHTML = chats.map(c => `<div class="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-700/50 transition-colors group ${c.unreadCount ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}" onclick="window.goToChat('${c.uid}')"><div class="relative"><img src="${c.info.photoUrl}" class="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 ${window.getStatusRingClass(c.uid)}" onclick="window.handleUserAvatarClick('${c.uid}', '${c.info.photoUrl}', event)">${c.unreadCount ? `<span class="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">${c.unreadCount}</span>` : ''}</div><div class="flex-1 min-w-0"><div class="flex justify-between items-center mb-1"><h4 class="font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1 ${c.unreadCount ? 'text-emerald-700 dark:text-emerald-400' : ''}">${c.info.displayName}${window.getUserBadge(c.uid)}</h4><div class="flex items-center gap-2"><span class="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2 group-hover:hidden">${new Date(c.lastMsg.createdAt).toLocaleDateString('ar-EG')}</span><button onclick="event.stopPropagation(); window.deleteEntireChat('${c.uid}')" class="hidden group-hover:flex items-center justify-center text-rose-500 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 p-1.5 rounded-lg transition-colors" title="حذف المحادثة بالكامل"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div><p class="text-sm truncate ${c.unreadCount ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}">${c.lastMsg.isDeleted ? '🚫 رسالة محذوفة' : (c.lastMsg.type === 'voice' ? '🎤 تسجيل صوتي' : (c.lastMsg.type === 'sticker' ? 'ملصق' : (c.lastMsg.type === 'image' ? '🖼️ صورة' : (c.lastMsg.type === 'post_share' ? 'شارك منشوراً معك' : (c.lastMsg.senderId === currentUser.uid ? 'أنت: ' + c.lastMsg.content : c.lastMsg.content)))))}</p></div></div>`).join('');
    lucide.createIcons();
}

window.openChatRoom = (uid) => {
    document.getElementById('messages-list-view').classList.add('hidden');
    document.getElementById('chat-room-view').classList.remove('hidden');
    window.renderChatRoom();
}
window.closeChatRoom = () => {
    activeChatFriendId = null;
    document.getElementById('chat-room-view').classList.add('hidden');
    document.getElementById('messages-list-view').classList.remove('hidden');
    renderMessagesList();
    if (window.cancelReply) window.cancelReply();
}

window.isViewOnceMode = false;
window.toggleViewOnce = () => {
    window.isViewOnceMode = !window.isViewOnceMode;
    const btn = document.getElementById('view-once-btn');
    if (!btn) return;

    if (window.isViewOnceMode) {
        // شكل الزرار وهو "مفعل" (لون وردي مع حدود وتغيير الأيقونة لعين مقفولة)
        btn.classList.add('bg-rose-500', 'text-white', 'dark:bg-rose-600', 'ring-2', 'ring-rose-200', 'dark:ring-rose-900/50');
        btn.classList.remove('text-slate-400', 'dark:text-slate-300', 'bg-slate-50', 'dark:bg-slate-700');
        btn.innerHTML = '<i data-lucide="eye-off" class="w-5 h-5 sm:w-6 sm:h-6"></i>';
        showToast('تم تفعيل وضع المشاهدة لمرة واحدة (ستحذف الصورة فور فتحها)', 'info');
    } else {
        // شكل الزرار وهو "مغلق" (الوضع الافتراضي)
        btn.classList.remove('bg-rose-500', 'text-white', 'dark:bg-rose-600', 'ring-2', 'ring-rose-200', 'dark:ring-rose-900/50');
        btn.classList.add('text-slate-400', 'dark:text-slate-300', 'bg-slate-50', 'dark:bg-slate-700');
        btn.innerHTML = '<i data-lucide="eye" class="w-5 h-5 sm:w-6 sm:h-6"></i>';
        showToast('تم إيقاف وضع المشاهدة لمرة واحدة', 'success');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.messageToReply = null;
window.setReplyMessage = (msgId) => {
    try {
        const msg = allMessages.find(m => m.id === msgId);
        if (!msg) return;

        window.messageToReply = {
            id: msg.id,
            content: msg.content,
            type: msg.type || 'text'
        };
        const previewText = msg.type === 'voice' ? '🎤 تسجيل صوتي' : (msg.type === 'image' ? '🖼️ صورة' : (msg.type === 'sticker' ? 'ملصق' : (msg.type === 'post_share' ? 'مشاركة منشور' : msg.content)));

        const previewTextEl = document.getElementById('reply-preview-text');
        if (previewTextEl) previewTextEl.innerText = previewText;

        const previewContainerEl = document.getElementById('reply-preview-container');
        if (previewContainerEl) {
            previewContainerEl.classList.remove('hidden');
            previewContainerEl.style.display = 'flex';
        }

        const inputEl = document.getElementById('chat-input');
        if (inputEl) {
            inputEl.focus();
        }

        document.querySelectorAll('[id^="msg-picker-"]').forEach(p => p.classList.add('hidden'));
    } catch (e) {
        console.error("خطأ:", e);
    }
};

window.cancelReply = () => {
    window.messageToReply = null;
    const container = document.getElementById('reply-preview-container');
    if (container) {
        container.classList.add('hidden');
        container.style.display = 'none';
    }
    const previewText = document.getElementById('reply-preview-text');
    if (previewText) previewText.innerText = '';
};

window.chatImageBase64 = null;

window.handleChatImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            // الحفاظ على شفافية الـ PNG أو استخدام JPEG للصور العادية لتقليل الحجم
            const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            window.chatImageBase64 = canvas.toDataURL(outType, 0.7);
            document.getElementById('chat-image-preview-container').classList.remove('hidden');
            document.getElementById('chat-image-preview').src = window.chatImageBase64;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

window.removeChatImage = () => {
    window.chatImageBase64 = null;
    document.getElementById('chat-image-preview-container').classList.add('hidden');
    document.getElementById('chat-image-preview').src = '';
    document.getElementById('chat-image-input').value = '';
};

window.renderChatRoom = () => {
    if (!activeChatFriendId) return;
    const friend = allUsers.find(u => u.uid === activeChatFriendId);
    if (!friend) return;
    document.getElementById('chat-room-avatar').src = friend.photoUrl;
    document.getElementById('chat-room-name').innerHTML = friend.displayName + window.getUserBadge(friend.uid);
    const msgsArea = document.getElementById('chat-messages-area');
    const autoDeleteBanner = document.getElementById('chat-auto-delete-banner');
    if (autoDeleteBanner) {
        let myHours = (userData && userData.autoDeleteHours) ? userData.autoDeleteHours : (userData && userData.autoDeleteMessages ? 12 : 0);
        let friendHours = (friend && friend.autoDeleteHours) ? friend.autoDeleteHours : (friend && friend.autoDeleteMessages ? 12 : 0);

        let deleteHours = 0;
        if (myHours > 0 && friendHours > 0) deleteHours = Math.min(myHours, friendHours);
        else if (myHours > 0) deleteHours = myHours;
        else if (friendHours > 0) deleteHours = friendHours;

        if (deleteHours > 0) {
            autoDeleteBanner.innerHTML = `<i data-lucide="clock" class="w-3.5 h-3.5"></i> الحذف التلقائي مفعل (تتم إزالة الرسائل كل ${deleteHours} ساعة)`;
            autoDeleteBanner.classList.remove('hidden');
        } else {
            autoDeleteBanner.classList.add('hidden');
        }
    }

    // إغلاق أي قائمة تفاعل مفتوحة إذا تم الضغط في أي مساحة فارغة في المحادثة
    msgsArea.onclick = (e) => {
        if (!e.target.closest('.msg-bubble-container')) {
            document.querySelectorAll('[id^="msg-picker-"]').forEach(p => p.classList.add('hidden'));
        }
    };
    const fMsgs = allMessages.filter(m => (m.senderId === currentUser.uid && m.receiverId === friend.uid) || (m.senderId === friend.uid && m.receiverId === currentUser.uid)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    fMsgs.filter(m => m.receiverId === currentUser.uid && !m.read).forEach(async m => {
        try {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', m.id), {
                read: true
            });
        } catch (e) {}
    });
    let html = '',
        lastDate = '';
    const msgEmojis = ['❤️', '😂', '👍', '👎', '🔥', '✨', '😍', '😢', '😡', '🙏', '👀', '💯', '🎉', '🤯', '🥳'];

    fMsgs.forEach(m => {
        const d = new Date(m.createdAt);
        const dateStr = d.toLocaleDateString('ar-EG');
        const timeStr = d.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
        if (dateStr !== lastDate) {
            html += `<div class="flex justify-center my-4"><span class="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-3 py-1 rounded-full font-medium shadow-sm">${dateStr}</span></div>`;
            lastDate = dateStr;
        }
        const isMe = m.senderId === currentUser.uid;
        const editedMark = m.isEdited && !m.isDeleted ? `<span class="text-[9px] text-slate-400 mx-1">(معدلة)</span>` : '';
        const readIcon = (isMe ? `<i data-lucide="check-check" class="w-4 h-4 inline-block mr-1 transition-colors ${m.read ? 'text-blue-400 dark:text-blue-500' : 'text-slate-400 dark:text-slate-500'}"></i>` : '') + editedMark;
        const editBtn = isMe && (!m.type || m.type === 'text') && !m.isDeleted ? `<button onclick="window.openEditModal('${m.id}', 'message')" class="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full hover:bg-emerald-100 mx-1" title="تعديل الرسالة"><i data-lucide="edit-3" class="w-3 h-3"></i></button>` : '';
        const delBtn = isMe && !m.isDeleted ? `<div class="flex items-center">${editBtn}<button onclick="window.deleteMessage('${m.id}')" class="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-rose-50 dark:bg-rose-900/30 rounded-full hover:bg-rose-100 mx-1" title="حذف الرسالة"><i data-lucide="trash-2" class="w-3 h-3"></i></button></div>` : '';

        let reactsHtml = '';
        let hasReacts = false;
        if (m.reactions && Object.keys(m.reactions).length > 0) {
            hasReacts = true;
            const rCounts = {};
            Object.values(m.reactions).forEach(e => rCounts[e] = (rCounts[e] || 0) + 1);
            reactsHtml = `<div class="absolute ${isMe?'-bottom-3 right-2':'-bottom-3 left-2'} flex gap-1 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 text-sm md:text-base z-10 select-none items-center">` +
                Object.keys(rCounts).map(e => `<span class="flex items-center gap-1">${e}${rCounts[e]>1?` <span class="font-bold text-slate-500 text-xs">${rCounts[e]}</span>`:''}</span>`).join('') +
                `</div>`;
        }

        const msgPickerHtml = `<div id="msg-picker-${m.id}" class="hidden absolute bottom-[calc(100%+5px)] ${isMe ? 'left-0' : 'right-0'} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg rounded-full px-2 py-1.5 z-30 flex items-center gap-1.5 animate-in zoom-in duration-200 w-max" onclick="event.stopPropagation()">
                    <button onclick="event.preventDefault(); window.setReplyMessage('${m.id}')" class="hover:bg-slate-100 dark:hover:bg-slate-700 w-8 h-8 rounded-full flex justify-center items-center text-emerald-600 dark:text-emerald-400 transition-colors" title="رد"><i data-lucide="reply" class="w-4 h-4 rtl:-scale-x-100"></i></button>
                    <div class="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-0.5"></div>
                    ${['❤️','😂','👍','😮','😢','🙏'].map(e => `<button onclick="event.preventDefault(); window.reactToMessage('${m.id}', '${e}')" class="hover:bg-slate-100 dark:hover:bg-slate-700 w-8 h-8 rounded-full text-lg hover:scale-125 transition-transform flex justify-center items-center">${e}</button>`).join('')}
                </div>`;
        const clickAction = `onclick="document.querySelectorAll('[id^=\\'msg-picker-\\']').forEach(el => { if(el.id !== 'msg-picker-${m.id}') el.classList.add('hidden') }); document.getElementById('msg-picker-${m.id}').classList.toggle('hidden')"`;

        // تزويد المساحة السفلية في حالة وجود تفاعل عشان ميغطيش النص
        const bubblePadding = hasReacts ? 'px-4 pt-2.5 pb-4' : 'px-4 py-2.5';
        const sharedBubblePadding = hasReacts ? 'px-3 pt-2.5 pb-4' : 'px-3 py-2.5';

        const msgAvatarHtml = `<img src="${isMe ? userData.photoUrl : friend.photoUrl}" class="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm self-end mb-5" onclick="event.stopPropagation(); window.viewProfile('${isMe ? currentUser.uid : friend.uid}')">`;

        if (m.isDeleted) {
            html += `<div class="flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 mb-4 group relative w-full">${msgAvatarHtml}<div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full min-w-0"><div class="${isMe ? 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 rounded-br-sm' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 rounded-tl-sm'} px-4 py-2.5 rounded-2xl text-sm shadow-sm flex items-center gap-2 italic w-fit"><i data-lucide="ban" class="w-4 h-4 opacity-70"></i> تم حذف هذه الرسالة</div><div class="flex items-center mt-1"><span class="text-[10px] text-slate-400 px-1 font-medium" dir="ltr">${timeStr}</span>${readIcon}</div></div></div>`;
            return;
        }

        let repliedMsgHtml = '';
        if (m.replyTo) {
            const repliedContentText = m.replyTo.type === 'voice' ? '🎤 تسجيل صوتي' : (m.replyTo.type === 'image' ? '🖼️ صورة' : (m.replyTo.type === 'sticker' ? 'ملصق' : (m.replyTo.type === 'post_share' ? 'مشاركة منشور' : m.replyTo.content)));
            repliedMsgHtml = `<div class="bg-black/10 dark:bg-white/10 border-r-4 border-emerald-500 rounded-lg p-2 mb-2 text-[11px] md:text-xs opacity-90 truncate max-w-full shadow-sm"><span class="font-bold flex items-center gap-1 mb-0.5 text-emerald-300 dark:text-emerald-400"><i data-lucide="reply" class="w-3 h-3 rtl:-scale-x-100"></i> رد على:</span>${repliedContentText}</div>`;
        }

        let innerBubble = '';

        if (m.type === 'sticker') {
            if (m.replyTo) {
                innerBubble = `<div class="relative cursor-pointer select-none msg-bubble-container w-fit max-w-[85%]" ${clickAction}>${msgPickerHtml}<div class="${isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-600 rounded-tl-sm'} ${bubblePadding} rounded-2xl text-sm md:text-base shadow-sm break-words whitespace-pre-wrap">${repliedMsgHtml}<div class="text-[40px] leading-none text-center">${m.content}</div></div>${reactsHtml}</div><div class="flex items-center mt-1">${delBtn}<span class="text-[10px] text-slate-400 px-1 font-medium" dir="ltr">${timeStr}</span>${readIcon}</div>`;
            } else {
                innerBubble = `<div class="relative cursor-pointer msg-bubble-container w-fit" ${clickAction}>${msgPickerHtml}<div class="text-[40px] leading-none mb-1 hover:scale-110 transition-transform">${m.content}</div>${reactsHtml}</div><div class="flex items-center mt-1">${delBtn}<span class="text-[10px] text-slate-400 px-1 font-medium" dir="ltr">${timeStr}</span>${readIcon}</div>`;
            }
        } else if (m.type === 'post_share') {
            const sp = allPosts.find(p => p.id === m.content);
            let sharedHtml = '';
            if (sp) {
                let contextName = 'المساحات العامة';
                let contextIcon = 'globe';
                if (sp.communityId) {
                    const comm = allCommunities.find(c => c.id === sp.communityId);
                    contextName = comm ? comm.name : 'مجتمع';
                    contextIcon = 'layers';
                }

                sharedHtml = `<div class="mt-2 w-60 md:w-64 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-black/10 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity flex flex-col" onclick="event.stopPropagation(); window.openSinglePost('${sp.id}')">
                            <div class="bg-slate-100 dark:bg-slate-900/60 px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 border-b border-black/5 dark:border-white/5">
                                <div class="flex items-center gap-1.5">
                                    <i data-lucide="${contextIcon}" class="w-3 h-3"></i> من: ${contextName}
                                </div>
                                <i data-lucide="external-link" class="w-3 h-3 opacity-70"></i>
                            </div>
                            <div class="p-2.5 flex flex-col gap-1 text-slate-800 dark:text-slate-100">
                                <div class="flex items-center gap-1.5 mb-0.5">
                                    <img src="${sp.authorPhoto}" class="w-5 h-5 rounded-full object-cover">
                                    <span class="text-[11px] font-bold truncate">${sp.authorName}</span>
                                </div>
                                ${sp.title ? `<h4 class="font-extrabold text-xs truncate leading-snug">${sp.title}</h4>` : ''}
                                <p class="text-[11px] leading-snug line-clamp-2 text-slate-600 dark:text-slate-300 font-medium">${sp.content || 'يحتوي على مرفقات'}</p>
                            </div>
                            ${sp.imageUrl ? `<img src="${sp.imageUrl}" class="w-full h-24 object-cover border-t border-black/5 dark:border-white/5">` : ''}
                        </div>`;
            } else {
                sharedHtml = `<div class="p-2.5 bg-white/50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 mt-2 border border-black/10 dark:border-white/10 font-bold">هذا المنشور غير متوفر أو تم حذفه</div>`;
            }
            innerBubble = `<div class="relative cursor-pointer select-none msg-bubble-container w-fit max-w-[85%]" ${clickAction}>${msgPickerHtml}<div class="${isMe ? 'bg-emerald-600 text-emerald-50 rounded-br-sm' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-600 rounded-tl-sm'} ${sharedBubblePadding} rounded-2xl text-sm shadow-sm break-words whitespace-pre-wrap">${repliedMsgHtml}<div class="flex items-center gap-1 opacity-90 text-[11px] font-bold mb-0.5"><i data-lucide="forward" class="w-3.5 h-3.5 rtl:-scale-x-100"></i> ${isMe?'أرسلت منشوراً':'شارك منشوراً'}</div>${sharedHtml}</div>${reactsHtml}</div><div class="flex items-center mt-1">${delBtn}<span class="text-[10px] text-slate-400 px-1 font-medium" dir="ltr">${timeStr}</span>${readIcon}</div>`;
        } else {
            const {
                ytId,
                tkId,
                fbUrl,
                igId
            } = extractEmbeds(m.content || '');
            let messageBody = '';

            if (m.type === 'image') {
                if (m.isViewOnce) {
                    messageBody += `
                            <div class="bg-black/20 dark:bg-black/40 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer border-2 border-dashed border-white/20 hover:bg-black/30 transition-colors" onclick="event.stopPropagation(); window.openLightbox('${m.imageUrl}', '${m.id}')">
                                <div class="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg animate-pulse"><i data-lucide="eye" class="w-6 h-6"></i></div>
                                <span class="text-xs font-bold text-white">صورة للعرض مرة واحدة</span>
                            </div>`;
                } else {
                    messageBody += `<img src="${m.imageUrl}" class="max-w-full rounded-xl cursor-zoom-in mb-2" onclick="event.stopPropagation(); window.openLightbox('${m.imageUrl}')" style="max-height: 250px;">`;
                }
            } else if (m.type === 'voice') {
                messageBody += `
                        <div class="flex items-center gap-3 bg-black/10 dark:bg-black/30 p-2 rounded-xl min-w-[200px]" onclick="event.stopPropagation()">
                            <button onclick="window.playVoice('${m.id}', '${m.imageUrl}', '${m.senderId}')" id="play-btn-${m.id}" class="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform shrink-0">
                                <i data-lucide="play" class="w-5 h-5 ml-1"></i>
                            </button>
                            <div class="flex flex-col flex-1">
                                <span class="text-[10px] font-bold text-rose-500 dark:text-rose-400 mb-1"><i data-lucide="zap" class="w-3 h-3 inline"></i> فويس تدمير ذاتي</span>
                                <div class="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div id="play-progress-${m.id}" class="h-full bg-emerald-500 w-0 transition-all duration-200"></div>
                                </div>
                            </div>
                        </div>`;
            }
            if (m.content) {
                messageBody += formatMessageContent(m.content, isMe);
            }
            if (ytId) messageBody += `<div class="mt-3 rounded-xl overflow-hidden shadow-sm aspect-video min-w-[250px]" onclick="event.stopPropagation()"><iframe src="https://www.youtube.com/embed/${ytId}" class="w-full h-full" frameborder="0" allowfullscreen style="pointer-events: none;"></iframe></div>`;
            if (tkId) messageBody += `<div class="mt-3 rounded-xl overflow-hidden shadow-sm aspect-[9/16] w-full" onclick="event.stopPropagation()"><iframe src="https://www.tiktok.com/embed/v2/${tkId}" class="w-full h-full rounded-lg" frameborder="0" allowfullscreen style="pointer-events: none;"></iframe></div>`;
            if (fbUrl) messageBody += `<div class="mt-3 rounded-xl overflow-hidden shadow-sm aspect-video min-w-[250px]" onclick="event.stopPropagation()"><iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=0&width=560" class="w-full h-full rounded-lg" style="border:none;overflow:hidden; pointer-events: none;" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe></div>`;
            if (igId) messageBody += `<div class="mt-3 rounded-xl overflow-hidden shadow-sm flex justify-center bg-black/10 dark:bg-slate-800 p-2" onclick="event.stopPropagation()"><iframe src="https://www.instagram.com/p/${igId}/embed" class="w-full max-w-[250px] h-[350px] rounded-lg" frameborder="0" scrolling="no" allowtransparency="true" style="pointer-events: none;"></iframe></div>`;

            innerBubble = `<div class="relative cursor-pointer select-none msg-bubble-container w-fit max-w-[85%]" ${clickAction}>${msgPickerHtml}<div class="${isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-600 rounded-tl-sm'} ${bubblePadding} rounded-2xl text-sm md:text-base shadow-sm break-words whitespace-pre-wrap">${repliedMsgHtml}${messageBody}</div>${reactsHtml}</div><div class="flex items-center mt-1">${delBtn}<span class="text-[10px] text-slate-400 px-1 font-medium" dir="ltr">${timeStr}</span>${readIcon}</div>`;
        }

        html += `<div class="flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 mb-4 group relative w-full">${msgAvatarHtml}<div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} flex-1 min-w-0">${innerBubble}</div></div>`;
    });
    if (!fMsgs.length) html = '<div class="flex-1 flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500"><i data-lucide="hand" class="w-12 h-12 mb-3 opacity-50"></i><p>أرسل رسالة لبدء المحادثة!</p></div>';
    const isAtBottom = msgsArea.scrollHeight - msgsArea.scrollTop <= msgsArea.clientHeight + 100;
    msgsArea.innerHTML = html;
    lucide.createIcons();
    if (isAtBottom || html.includes('hand')) msgsArea.scrollTop = msgsArea.scrollHeight;
}

window.toggleMsgPicker = (msgId) => {
    document.querySelectorAll('[id^="msg-picker-"]').forEach(el => {
        if (el.id !== 'msg-picker-' + msgId) el.classList.add('hidden');
    });
    const p = document.getElementById('msg-picker-' + msgId);
    if (p) p.classList.toggle('hidden');
};

window.reactToMessage = async (msgId, emoji) => {
    if (!currentUser) return;
    const msgRef = doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', msgId);
    const msg = allMessages.find(m => m.id === msgId);
    if (!msg) return;
    let reacts = msg.reactions || {};
    if (reacts[currentUser.uid] === emoji) {
        delete reacts[currentUser.uid];
    } else {
        reacts[currentUser.uid] = emoji;
    }
    try {
        await updateDoc(msgRef, {
            reactions: reacts
        });
    } catch (e) {
        showToast('خطأ في التفاعل', 'error');
    }
    const picker = document.getElementById(`msg-picker-${msgId}`);
    if (picker) picker.classList.add('hidden');
};

window.deleteEntireChat = async (uid) => {
    showConfirm('هل أنت متأكد من حذف هذه المحادثة بالكامل وإزالتها من القائمة؟ (سيتم الحذف نهائياً)', async () => {
        const msgsToDelete = allMessages.filter(m => (m.senderId === currentUser.uid && m.receiverId === uid) || (m.senderId === uid && m.receiverId === currentUser.uid));
        try {
            await Promise.all(msgsToDelete.map(m => deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', m.id))));
            showToast('تم مسح المحادثة', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء مسح المحادثة', 'error');
        }
    });
}

window.clearChat = async () => {
    if (!activeChatFriendId) return;
    showConfirm('هل أنت متأكد من مسح جميع الرسائل بينك وبين هذا الصديق؟ (سيتم الحذف نهائياً)', async () => {
        const msgsToDelete = allMessages.filter(m => (m.senderId === currentUser.uid && m.receiverId === activeChatFriendId) || (m.senderId === activeChatFriendId && m.receiverId === currentUser.uid));
        try {
            await Promise.all(msgsToDelete.map(m => deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', m.id))));
            window.closeChatRoom();
            showToast('تم مسح المحادثة', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء مسح المحادثة', 'error');
        }
    });
}

window.deleteMessage = async (msgId) => {
    showConfirm('هل تريد حذف هذه الرسالة؟ (سيظهر أنها محذوفة للطرف الآخر)', async () => {
        try {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', msgId), {
                isDeleted: true,
                content: '',
                imageUrl: null,
                type: 'text',
                reactions: {}
            });
        } catch (e) {
            showToast('حدث خطأ أثناء حذف الرسالة', 'error');
        }
    });
}

window.mediaRecorder = null;
window.audioChunks = [];
window.recordInterval = null;
window.recordStartTime = 0;
window.isRecordingCanceled = false;

window.startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });
        window.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        window.audioChunks = [];

        window.mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) window.audioChunks.push(e.data);
        };

        window.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(window.audioChunks, {
                type: 'audio/webm'
            });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64data = reader.result;
                if (!window.isRecordingCanceled) {
                    await window.sendMessage('voice', base64data);
                }
            };
            stream.getTracks().forEach(track => track.stop());
        };

        document.getElementById('normal-chat-ui').classList.add('hidden');
        document.getElementById('recording-ui').classList.remove('hidden');
        document.getElementById('recording-ui').style.display = 'flex';
        document.getElementById('record-progress').style.width = '0%';

        window.isRecordingCanceled = false;
        window.mediaRecorder.start();
        window.recordStartTime = Date.now();

        const maxDuration = 30000; // 30 ثانية
        window.recordInterval = setInterval(() => {
            const elapsed = Date.now() - window.recordStartTime;
            const secs = Math.floor(elapsed / 1000);
            document.getElementById('record-time').innerText = `00:${secs < 10 ? '0'+secs : secs}`;
            const percent = Math.min((elapsed / maxDuration) * 100, 100);
            document.getElementById('record-progress').style.width = percent + '%';

            if (elapsed >= maxDuration) {
                window.stopRecordingAndSend(); // التوقف والإرسال التلقائي
            }
        }, 100);
        lucide.createIcons();
    } catch (err) {
        showToast('لم نتمكن من الوصول للميكروفون. يرجى إعطاء الصلاحية.', 'error');
    }
};

window.stopRecordingAndSend = () => {
    if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
        clearInterval(window.recordInterval);
        window.mediaRecorder.stop();

        document.getElementById('normal-chat-ui').classList.remove('hidden');
        document.getElementById('recording-ui').classList.add('hidden');
        document.getElementById('recording-ui').style.display = 'none';
    }
};

window.cancelRecording = () => {
    if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
        window.isRecordingCanceled = true;
        clearInterval(window.recordInterval);
        window.mediaRecorder.stop();

        document.getElementById('normal-chat-ui').classList.remove('hidden');
        document.getElementById('recording-ui').classList.add('hidden');
        document.getElementById('recording-ui').style.display = 'none';
    }
};

let currentAudio = null;
window.currentPlayingMsgId = null;
window.playVoice = (msgId, base64Audio, senderId) => {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
        // إعادة الأيقونات لطبيعتها
        document.querySelectorAll('[id^="play-btn-"]').forEach(b => {
            b.innerHTML = '<i data-lucide="play" class="w-5 h-5 ml-1"></i>';
        });
        lucide.createIcons();

        // إذا تم الضغط على نفس الرسالة المشتغلة حالياً، نتوقف فقط ولا نعيد تشغيلها
        if (window.currentPlayingMsgId === msgId) {
            window.currentPlayingMsgId = null;
            return;
        }
    }

    window.currentPlayingMsgId = msgId;
    const audio = new Audio(base64Audio);
    currentAudio = audio;
    const btn = document.getElementById(`play-btn-${msgId}`);
    const progress = document.getElementById(`play-progress-${msgId}`);

    btn.innerHTML = '<i class="loader" style="width:15px;height:15px;border-width:2px;"></i>';

    audio.onplay = () => {
        btn.innerHTML = '<i data-lucide="square" class="w-4 h-4"></i>';
        lucide.createIcons();
    };
    audio.ontimeupdate = () => {
        if (progress) progress.style.width = (audio.currentTime / audio.duration * 100) + '%';
    };
    audio.onended = async () => {
        currentAudio = null;
        window.currentPlayingMsgId = null;
        btn.innerHTML = '<i data-lucide="play" class="w-5 h-5 ml-1"></i>';
        lucide.createIcons();

        try {
            const msg = allMessages.find(m => m.id === msgId);
            if (!msg) return;

            if (currentUser.uid === msg.receiverId) {
                // إذا استمع المستلم (المستقبل) للرسالة: يتم حذفها نهائياً من الطرفين والسيرفر
                await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', msgId));
                showToast('تم تدمير الفويس من السيرفر نهائياً', 'info');
            } else if (currentUser.uid === msg.senderId) {
                // إذا استمع المرسل لرسالته: تختفي من عنده فقط وتظل للمستقبل حتى يسمعها
                let deletedFor = msg.deletedFor || [];
                if (!deletedFor.includes(currentUser.uid)) {
                    deletedFor.push(currentUser.uid);
                    await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'messages', msgId), {
                        deletedFor: deletedFor
                    });
                    showToast('تم إخفاء الفويس من محادثتك', 'info');
                }
            }
        } catch (e) {}
    };
    audio.play().catch(e => {
        window.currentPlayingMsgId = null;
        showToast('تعذر تشغيل الصوت', 'error');
        btn.innerHTML = '<i data-lucide="play" class="w-5 h-5 ml-1"></i>';
        lucide.createIcons();
    });
};

window.sendMessage = async (type, content = null) => {
    if (!activeChatFriendId) return;

    try {
        const receiverUser = allUsers.find(u => u.uid === activeChatFriendId);
        if (typeof currentUser !== 'undefined' && currentUser && receiverUser && receiverUser.blockedUsers && receiverUser.blockedUsers.includes(currentUser.uid)) {
            window.showToast('المستخدم قد حظرك من التعليقات والرسائل', 'error');
            if (typeof window.cancelReply === 'function') window.cancelReply();
            if (type === 'text') {
                const input = document.getElementById('chat-input');
                if (input) input.value = '';
            }
            return;
        }
    } catch(e) {}

    let text = content;
    let msgType = type;
    let imgUrl = null;

    if (type === 'text') {
        const input = document.getElementById('chat-input');
        text = input.value.trim();

        if (window.chatImageBase64) {
            msgType = 'image';
            imgUrl = window.chatImageBase64;
            window.removeChatImage();
        } else if (!text) {
            return;
        }

        input.value = '';
    } else if (type === 'voice') {
        msgType = 'voice';
        imgUrl = content; // Base64 Audio
        text = '';
    }

    if (type === 'sticker') window.toggleStickerPicker();

    const receiverUser = allUsers.find(u => u.uid === activeChatFriendId);
    if (receiverUser && receiverUser.pauseMessages) {
        const allowed = receiverUser.allowedSenders || [];
        if (!allowed.includes(currentUser.uid)) {
            showToast('هذا المستخدم لا يمكنه استقبال الرسائل الآن', 'error');
            if (window.cancelReply) window.cancelReply();
            return;
        }
    }

    const msgData = {
        senderId: currentUser.uid,
        receiverId: activeChatFriendId,
        content: text,
        type: msgType,
        read: false,
        createdAt: new Date().toISOString()
    };

    if (imgUrl) {
        msgData.imageUrl = imgUrl;
        if (window.isViewOnceMode && type !== 'voice') {
            msgData.isViewOnce = true;
            window.toggleViewOnce();
        } else if (type === 'voice') {
            msgData.isViewOnce = true; // الفويس دائماً يدمر ذاتياً
        }
    }
    if (window.messageToReply) {
        msgData.replyTo = window.messageToReply;
    }

    try {
        if (window.cancelReply) window.cancelReply();
        await setDoc(doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'messages')), msgData);

        // إرسال إشعار حقيقي للمستلم لإظهار الرقم على الأيقونة
        window.sendPushNotification(
            activeChatFriendId,
            `رسالة من ${userData.displayName}`,
            msgType === 'text' ? text : 'أرسل لك مرفقاً جديداً'
        );

        setTimeout(() => {
            const msgsArea = document.getElementById('chat-messages-area');
            msgsArea.scrollTop = msgsArea.scrollHeight;
        }, 100);
    } catch (e) {
        showToast('فشل إرسال الرسالة', 'error');
    }
}

window.toggleStickerPicker = () => {
    const picker = document.getElementById('sticker-picker');
    picker.classList.toggle('hidden');
    if (!picker.classList.contains('hidden') && picker.innerHTML === '') {
        const stickers = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '👎', '❤️', '💔', '🔥', '✨', '🎉', '👋', '🙏', '🤔', '🤐', '😴', '🤢', '🤮', '🤠', '🥳', '🥸', '👀'];
        picker.innerHTML = stickers.map(s => `<button onclick="window.sendMessage('sticker', '${s}')" class="text-2xl hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-xl transition-colors hover:scale-125">${s}</button>`).join('');
    }
}

function generateCommunityCardHtml(c, isPublicList) {
    let cardColor = c.color || 'bg-emerald-100 dark:bg-emerald-900/40';
    if (!cardColor.includes('dark:')) cardColor += ' dark:bg-slate-700';

    // زر التثبيت يظهر فقط للمجتمعات التي انضممت لها
    const isPinned = userData && (userData.pinnedCommunities || []).includes(c.id);
    const pinBtn = (!isPublicList && c.members.includes(currentUser?.uid)) ? `
                <button onclick="event.stopPropagation(); window.togglePinCommunity('${c.id}')" class="absolute top-1/2 -translate-y-1/2 left-4 p-2 rounded-full ${isPinned ? 'bg-emerald-50 dark:bg-emerald-900/50' : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600'} transition-colors z-10" title="${isPinned ? 'إلغاء التثبيت' : 'تثبيت في المقدمة'}">
                    <i data-lucide="pin" class="w-4 h-4 ${isPinned ? 'text-emerald-600 dark:text-emerald-400 fill-current' : 'text-slate-400 dark:text-slate-500'}"></i>
                </button>
            ` : '';

    return `
            <div class="relative bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md transition-all group overflow-hidden" onclick="window.viewCommunity('${c.id}')">
                <div class="flex items-center gap-4 min-w-0 pr-1 pl-10">
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center ${cardColor} overflow-hidden shadow-sm border border-black/5 dark:border-white/5 shrink-0">
                        <img src="${c.iconUrl}" class="w-full h-full object-cover">
                    </div>
                    <div class="min-w-0">
                        <h4 class="font-bold text-slate-800 dark:text-slate-200 text-lg group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">${c.name}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 truncate"><i data-lucide="users" class="w-3 h-3 shrink-0"></i> <span>${c.members.length} عضو ${!isPublicList ? `&bull; ${c.isPrivate?'خاص':'عام'}` : ''}</span></p>
                    </div>
                </div>
                ${pinBtn}
            </div>`;
}

window.currentCommCategoryFilter = 'all';

window.togglePinCommunity = async (commId) => {
    if (!currentUser) return;
    try {
        const isPinned = (userData.pinnedCommunities || []).includes(commId);
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), {
            pinnedCommunities: isPinned ? arrayRemove(commId) : arrayUnion(commId)
        });
        showToast(isPinned ? 'تم إلغاء التثبيت' : 'تم التثبيت في المقدمة', 'success');
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
};

window.quickJoinCommunity = async (commId) => {
    if (!currentUser) return;
    try {
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'communities', commId), {
            members: arrayUnion(currentUser.uid)
        });
        showToast('تم الانضمام للمجتمع بنجاح!', 'success');
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
};

window.renderCommunitiesTab = () => {
    const container = document.getElementById('tab-content-communities');
    if (activeCommunityId) {
        const comm = allCommunities.find(c => c.id === activeCommunityId);
        if (!comm) {
            activeCommunityId = null;
            window.renderCommunitiesTab();
            return;
        }
        const isAdmin = comm.creatorId === currentUser.uid;
        const isMember = comm.members.includes(currentUser.uid);
        const hasRequested = (comm.joinRequests || []).includes(currentUser.uid);
        const cPosts = allPosts.filter(p => p.communityId === comm.id).sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()));

        let communityPostsHtml = '';
        if (isMember || isAdminStealthMode) {
            if (!cPosts.length) {
                communityPostsHtml = '<p class="text-center text-slate-500 dark:text-slate-400 py-10 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">لا توجد منشورات في هذا المجتمع بعد.</p>';
            } else if (activeArchiveDate) {
                const archPosts = cPosts.filter(p => getSafeYMD(p.createdAt) === activeArchiveDate);
                communityPostsHtml = `
                            <div class="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl mb-6 border border-emerald-100 dark:border-emerald-800">
                                <div class="flex items-center gap-3">
                                    <i data-lucide="calendar" class="w-6 h-6 text-emerald-600"></i>
                                    <span class="font-bold text-emerald-800 dark:text-emerald-300">أرشيف يوم: ${activeArchiveDate}</span>
                                </div>
                                <button onclick="window.setArchiveLevel('month', '${activeArchiveMonth}')" class="text-xs font-bold bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-colors">عودة للأيام</button>
                            </div>
                            ${archPosts.map(p => generatePostHTML(p, 'comm-')).join('')}
                        `;
            } else {
                const today = getSafeYMD();
                const todayPosts = cPosts.filter(p => getSafeYMD(p.createdAt) === today);
                const olderPosts = cPosts.filter(p => getSafeYMD(p.createdAt) !== today);

                const archiveHtml = window.generateArchiveViewHtml(olderPosts, 'أرشيف المجتمع');
                communityPostsHtml = todayPosts.map(p => generatePostHTML(p, 'comm-')).join('') + archiveHtml;
            }
        }

        let topActionBtn = '';
        if (isAdmin) topActionBtn = `<div class="flex items-center gap-2"><button onclick="window.showEditCommModal('${comm.id}')" class="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors whitespace-nowrap"><i data-lucide="edit-3" class="w-4 h-4"></i> <span class="hidden sm:inline">تعديل</span></button><button onclick="window.deleteCommunity('${comm.id}')" class="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors whitespace-nowrap"><i data-lucide="trash-2" class="w-4 h-4"></i> <span class="hidden sm:inline">حذف</span></button></div>`;
        else if (isMember) topActionBtn = `<button onclick="window.leaveCommunity('${comm.id}')" class="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors whitespace-nowrap"><i data-lucide="log-out" class="w-4 h-4"></i> <span class="hidden sm:inline">مغادرة المجتمع</span><span class="sm:hidden">مغادرة</span></button>`;
        else if (hasRequested) topActionBtn = `<button disabled class="text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 whitespace-nowrap cursor-not-allowed"><i data-lucide="clock" class="w-4 h-4"></i> <span class="hidden sm:inline">تم إرسال الطلب</span><span class="sm:hidden">قيد الانتظار</span></button>`;
        else topActionBtn = `<button onclick="window.requestJoinComm('${comm.id}')" class="text-emerald-600 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors whitespace-nowrap"><i data-lucide="user-plus" class="w-4 h-4"></i> <span class="hidden sm:inline">طلب انضمام</span><span class="sm:hidden">انضمام</span></button>`;

        let requestsHtml = '';
        if (isAdmin && comm.joinRequests && comm.joinRequests.length > 0) {
            requestsHtml = `
                    <div class="mb-8">
                        <h3 class="font-bold text-slate-700 dark:text-slate-200 mb-4 border-r-4 border-emerald-500 pr-2">طلبات الانضمام (${comm.joinRequests.length})</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${comm.joinRequests.map(uid => {
                                const u = allUsers.find(x => x.uid === uid);
                                if(!u) return '';
                                return `<div class="bg-white dark:bg-slate-800 p-4 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-700">
                                    <div class="flex items-center gap-3 cursor-pointer" onclick="window.viewProfile('${u.uid}')">
                                        <img src="${u.photoUrl}" class="w-10 h-10 rounded-full object-cover bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                        <span class="font-bold text-sm text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">${u.displayName}</span>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="window.acceptCommReq('${comm.id}', '${u.uid}')" class="bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-400 p-2 rounded-full transition-colors"><i data-lucide="check" class="w-4 h-4"></i></button>
                                        <button onclick="window.rejectCommReq('${comm.id}', '${u.uid}')" class="bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 p-2 rounded-full transition-colors"><i data-lucide="x" class="w-4 h-4"></i></button>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>`;
        }

        let membersHtml = '';
        if (isMember) {
            membersHtml = `
                    <div class="mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 transition-all">
                        <div class="flex justify-between items-center cursor-pointer" onclick="document.getElementById('comm-members-grid').classList.toggle('hidden'); document.getElementById('comm-members-icon').classList.toggle('rotate-180');">
                            <h3 class="font-bold text-slate-700 dark:text-slate-200 border-r-4 border-emerald-500 pr-2">أعضاء المجتمع (${comm.members.length})</h3>
                            <i data-lucide="chevron-down" id="comm-members-icon" class="w-5 h-5 text-slate-400 transition-transform duration-300"></i>
                        </div>
                        <div id="comm-members-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 hidden">
                            ${comm.members.map(uid => {
                                const u = allUsers.find(x => x.uid === uid);
                                if(!u) return '';
                                const isCreator = uid === comm.creatorId;
                                return `<div class="bg-white dark:bg-slate-800 p-4 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-700">
                                    <div class="flex items-center gap-3 cursor-pointer" onclick="window.viewProfile('${u.uid}')">
                                        <img src="${u.photoUrl}" class="w-10 h-10 rounded-full object-cover bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                        <div>
                                            <span class="font-bold text-sm text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">${u.displayName}</span>
                                            ${isCreator ? '<span class="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full mr-2 font-bold">المدير</span>' : ''}
                                        </div>
                                    </div>
                                    ${isAdmin && !isCreator ? `
                                    <button onclick="window.removeMemberFromComm('${comm.id}', '${u.uid}')" class="bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 p-2 rounded-full transition-colors" title="إزالة العضو"><i data-lucide="user-minus" class="w-4 h-4"></i></button>
                                    ` : ''}
                                </div>`;
                            }).join('')}
                        </div>
                    </div>`;
        }

        let commColorClass = comm.color || 'bg-slate-100 dark:bg-slate-800';
        if (!commColorClass.includes('dark:')) commColorClass += ' dark:bg-slate-800';

        let coverImg = comm.coverUrl || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop';

        container.innerHTML = `
                <div class="flex items-center justify-between gap-2 mb-6">
                    <button onclick="window.closeCommunityView()" class="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold transition-colors whitespace-nowrap"><i data-lucide="arrow-right" class="w-5 h-5"></i> <span class="hidden sm:inline">عودة للمجتمعات</span><span class="sm:hidden">عودة</span></button>
                    ${topActionBtn}
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors mb-8 relative group/comm">
                    <div class="w-full h-32 md:h-48 relative overflow-hidden">
                        <img src="${coverImg}" class="w-full h-full object-cover transition-transform duration-700 group-hover/comm:scale-105">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent pointer-events-none"></div>
                    </div>
                    <div class="p-6 md:p-8 relative z-10 ${commColorClass}">
                        <div class="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-start text-center md:text-right -mt-16 md:-mt-20">
                            <img src="${comm.iconUrl}" class="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white dark:border-slate-800 shadow-xl bg-white dark:bg-slate-800 object-cover shrink-0 relative z-20">
                            <div class="flex-1 w-full md:mt-8 flex flex-col items-center md:items-start gap-4 min-w-0">
                                <div class="flex flex-col items-center md:items-start min-w-0 max-w-full w-full">
                                    <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white drop-shadow-sm mb-2 leading-snug break-words">${comm.name}</h2>
                                    <p class="text-slate-700 dark:text-slate-200 max-w-xl font-medium text-sm md:text-base leading-relaxed break-words">${comm.description || 'لا يوجد وصف.'}</p>
                                </div>
                                <div class="flex flex-wrap items-center justify-center md:justify-start gap-2 w-full">
                                    <span class="bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100 shadow-sm border border-black/5 dark:border-white/10"><i data-lucide="users" class="w-4 h-4"></i> ${comm.members.length}</span>
                                    <span class="bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100 shadow-sm border border-black/5 dark:border-white/10"><i data-lucide="${comm.isPrivate?'lock':'globe'}" class="w-4 h-4"></i> ${comm.isPrivate?'خاص':'عام'}</span>
                                    ${isAdmin ? `<button onclick="window.showAddMemberModal('${comm.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"><i data-lucide="user-plus" class="w-4 h-4"></i> إضافة أصدقاء</button>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${requestsHtml}
                ${membersHtml}

                <div class="mb-8">
                    <h3 class="font-bold text-slate-700 dark:text-slate-200 mb-4 border-r-4 border-emerald-500 pr-2">منشورات المجتمع</h3>
                    ${isMember && !activeArchiveDate ? `
                    <div id="create-comm-post-container" class="rounded-3xl p-4 shadow-sm border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 transition-colors mb-6">
                        <div class="flex gap-3 md:gap-4">
                            <img src="${userData.photoUrl}" class="w-10 h-10 md:w-12 md:h-12 rounded-full border border-black/10 dark:border-white/10 shrink-0 object-cover bg-white dark:bg-slate-800">
                            <div class="flex-1 min-w-0">
                                <input type="text" id="comm-post-title" class="w-full bg-transparent border-b border-black/5 dark:border-white/5 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-100 font-bold text-lg md:text-xl mb-2 pb-2 placeholder-slate-400 transition-colors" placeholder="عنوان المنشور (اختياري)">
                                <textarea id="comm-post-content" oninput="window.handlePostInput(this, 'comm-link-preview-container')" class="w-full bg-transparent border-none focus:ring-0 resize-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 p-1 text-base md:text-lg" rows="3" placeholder="شارك شيئاً مع أعضاء هذا المجتمع... استخدم # للهاشتاج"></textarea>
                                
                                <div id="comm-link-preview-container" class="hidden relative mt-2 mb-3 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-black/5 dark:bg-slate-900/50"></div>

                                <div id="comm-image-preview-container" class="hidden relative mt-2 mb-4 inline-block max-w-full">
                                    <img id="comm-image-preview" src="" class="max-h-60 rounded-xl border border-black/10 dark:border-white/10 shadow-sm max-w-full object-contain">
                                    <button onclick="window.removePostImage('comm-image-preview-container', 'comm-image-preview', 'comm-image-input')" class="absolute top-2 right-2 bg-slate-900/60 text-white rounded-full p-1 hover:bg-rose-500"><i data-lucide="x" class="w-4 h-4"></i></button>
                                </div>
                                <div class="flex flex-wrap sm:flex-nowrap items-center justify-between mt-3 md:mt-4 border-t border-black/5 dark:border-white/5 pt-3 md:pt-4 gap-4 relative">
                                    <div class="flex flex-wrap items-center gap-1.5 md:gap-3 flex-1 min-w-0">
                                        <input type="file" id="comm-image-input" accept="image/*" multiple class="hidden" onchange="window.handlePostImageSelect(event, 'comm-image-preview-container', 'comm-image-preview')">
                                        <button onclick="document.getElementById('comm-image-input').click()" class="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-black/5 dark:bg-white/5 p-1.5 md:p-2 rounded-full shrink-0"><i data-lucide="image" class="w-4 h-4 md:w-5 md:h-5"></i></button>
                                        <div class="w-px h-4 md:h-6 bg-black/10 dark:bg-white/10 mx-1 shrink-0"></div>
                                        <div class="relative">
                                            <button type="button" onclick="document.getElementById('comm-color-dropdown').classList.toggle('hidden')" class="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-black/5 dark:bg-white/5 p-1.5 md:p-2 rounded-full shrink-0 transition-colors"><i data-lucide="palette" class="w-4 h-4 md:w-5 md:h-5"></i></button>
                                            <div id="comm-color-dropdown" class="hidden absolute bottom-full mb-2 right-0 md:left-0 md:right-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-2.5 z-20 w-[140px] md:w-[160px]">
                                                <div id="comm-color-picker" class="flex flex-wrap gap-2 justify-center"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <button onclick="window.submitPost('${comm.id}', 'comm-post-content', 'submit-comm-post-btn', 'comm-image-preview-container', 'comm-image-preview', 'comm-image-input', 'comm-post-title')" id="submit-comm-post-btn" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 md:px-6 py-1.5 md:py-2 rounded-xl text-sm md:text-base font-medium flex items-center justify-center gap-1.5 md:gap-2 shrink-0 ml-auto shadow-sm">
                                        <i data-lucide="send" class="w-3.5 h-3.5 md:w-4 md:h-4 rtl:-scale-x-100"></i> نشر
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>` : (!activeArchiveDate ? `<div class="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-slate-500 dark:text-slate-400 text-sm text-center mb-6 border border-slate-200 dark:border-slate-700">عليك الانضمام للمجتمع أولاً حتى تتمكن من النشر ورؤية محتوياته.</div>` : '')}
                    <div>${communityPostsHtml}</div>
                </div>`;
        if (isMember && !activeArchiveDate) window.setPostColor('white', 'comm-color-picker', 'create-comm-post-container');
    } else {
        let myComms = allCommunities.filter(c => c.members.includes(currentUser.uid));

        // فلترة التصنيفات
        if (window.currentCommCategoryFilter !== 'all') {
            myComms = myComms.filter(c => c.category === window.currentCommCategoryFilter);
        }

        // ترتيب المجتمعات (المثبتة أولاً)
        const pinnedIds = userData.pinnedCommunities || [];
        const pinnedComms = myComms.filter(c => pinnedIds.includes(c.id));
        const unpinnedComms = myComms.filter(c => !pinnedIds.includes(c.id));
        const sortedComms = [...pinnedComms, ...unpinnedComms];

        // استخراج المجتمعات العامة التي لم ينضم لها المستخدم لعمل الشريط المتحرك
        const unjoinedPublicComms = allCommunities.filter(c => !c.isPrivate && !c.members.includes(currentUser.uid)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // بناء شريط أحدث المجتمعات المتحرك
        let tickerHtml = '';
        if (unjoinedPublicComms.length > 0) {
            const badges = unjoinedPublicComms.map(c => `<button onclick="window.quickJoinCommunity('${c.id}')" class="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-4 py-2.5 rounded-full font-bold text-[13px] md:text-sm hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition-colors shadow-sm mx-2 inline-flex items-center gap-1.5 align-middle select-none"><img src="${c.iconUrl}" class="w-5 h-5 rounded-full object-cover"> ${c.name} <i data-lucide="plus" class="w-3 h-3 opacity-70"></i></button>`).join('');

            tickerHtml = `
                    <div class="mt-10 bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden relative">
                        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5"><i data-lucide="zap" class="w-4 h-4 text-amber-500"></i> استكشف أحدث المجتمعات العامة (اضغط للانضمام)</h3>
                        <marquee behavior="scroll" direction="right" scrollamount="4" onmouseover="this.stop();" onmouseout="this.start();" class="py-2 flex items-center">
                            ${badges}
                        </marquee>
                    </div>`;
        }

        container.innerHTML = `
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 shrink-0"><i data-lucide="layers" class="w-6 h-6 text-emerald-600 dark:text-emerald-400"></i> مجتمعاتي</h2>
                    
                    <div class="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <select onchange="window.currentCommCategoryFilter = this.value; window.renderCommunitiesTab();" class="w-full sm:w-auto flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 shadow-sm cursor-pointer transition-colors">
                            <option value="all" ${window.currentCommCategoryFilter === 'all' ? 'selected' : ''}>كل التصنيفات 🌍</option>
                            <option value="sports" ${window.currentCommCategoryFilter === 'sports' ? 'selected' : ''}>رياضي ⚽</option>
                            <option value="religion" ${window.currentCommCategoryFilter === 'religion' ? 'selected' : ''}>ديني ☪️</option>
                            <option value="politics" ${window.currentCommCategoryFilter === 'politics' ? 'selected' : ''}>سياسي 🏛️</option>
                            <option value="social" ${window.currentCommCategoryFilter === 'social' ? 'selected' : ''}>اجتماعي 👥</option>
                            <option value="entertainment" ${window.currentCommCategoryFilter === 'entertainment' ? 'selected' : ''}>ترفيهي 🎮</option>
                            <option value="tech" ${window.currentCommCategoryFilter === 'tech' ? 'selected' : ''}>تقني 💻</option>
                            <option value="news" ${window.currentCommCategoryFilter === 'news' ? 'selected' : ''}>أخبار 📰</option>
                            <option value="education" ${window.currentCommCategoryFilter === 'education' ? 'selected' : ''}>تعليمي 📚</option>
                            <option value="art" ${window.currentCommCategoryFilter === 'art' ? 'selected' : ''}>فني 🎨</option>
                            <option value="business" ${window.currentCommCategoryFilter === 'business' ? 'selected' : ''}>أعمال 💼</option>
                            <option value="other" ${window.currentCommCategoryFilter === 'other' ? 'selected' : ''}>أخرى ➕</option>
                        </select>
                        <button onclick="window.showCreateCommModal()" class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0"><i data-lucide="plus" class="w-4 h-4"></i> <span class="hidden sm:inline">إنشاء مجتمع</span><span class="sm:hidden">إنشاء</span></button>
                    </div>
                </div>
                ${sortedComms.length ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${sortedComms.map(c => generateCommunityCardHtml(c, false)).join('')}</div>` : '<div class="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-emerald-200 dark:border-emerald-900/50"><i data-lucide="layers" class="w-16 h-16 text-emerald-200 dark:text-emerald-900/50 mx-auto mb-4"></i><p class="text-slate-500 dark:text-slate-400 text-sm font-bold">لا يوجد مجتمعات مطابقة، أو أنك لم تنضم لأي مجتمع بعد.</p></div>'}
                
                ${tickerHtml}
                `;
    }
    lucide.createIcons();
}

window.requestJoinComm = async (id) => {
    try {
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'communities', id), {
            joinRequests: arrayUnion(currentUser.uid)
        });
        showToast('تم إرسال الطلب، في انتظار موافقة صاحب المجتمع', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء إرسال الطلب', 'error');
    }
}

window.acceptCommReq = async (commId, uid) => {
    try {
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'communities', commId), {
            members: arrayUnion(uid),
            joinRequests: arrayRemove(uid)
        });
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
}

window.rejectCommReq = async (commId, uid) => {
    try {
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'communities', commId), {
            joinRequests: arrayRemove(uid)
        });
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
}

window.viewCommunity = (id) => {
    activeCommunityId = id;
    window.switchTab('communities', true);
}
window.closeCommunityView = () => {
    activeCommunityId = null;
    window.renderCommunitiesTab();
}

window.deleteCommunity = async (id) => {
    showConfirm('هل أنت متأكد من حذف المجتمع بكل محتوياته نهائياً؟', async () => {
        try {
            await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'communities', id));
            const commPosts = allPosts.filter(p => p.communityId === id);
            for (let p of commPosts) await deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', p.id));
            window.closeCommunityView();
            showToast('تم الحذف', 'success');
        } catch (e) {
            showToast('حدث خطأ', 'error');
        }
    });
}

window.leaveCommunity = async (id) => {
    showConfirm('هل أنت متأكد من رغبتك في الانسحاب من هذا المجتمع؟', async () => {
        try {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'communities', id), {
                members: arrayRemove(currentUser.uid)
            });
            window.closeCommunityView();
            showToast('تمت المغادرة', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء المغادرة', 'error');
        }
    });
}

window.removeMemberFromComm = async (commId, uid) => {
    showConfirm('هل أنت متأكد من إزالة هذا العضو من المجتمع؟', async () => {
        try {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'communities', commId), {
                members: arrayRemove(uid)
            });
            window.renderCommunitiesTab();
            showToast('تمت إزالة العضو', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء الإزالة', 'error');
        }
    });
}

window.showAddMemberModal = (commId) => {
    const comm = allCommunities.find(c => c.id === commId);
    if (!comm) return;
    const list = document.getElementById('comm-friends-list');
    const friends = userData.friends || [];
    const availableFriends = friends.filter(uid => !comm.members.includes(uid));

    const validFriends = availableFriends.map(uid => allUsers.find(x => x.uid === uid)).filter(Boolean);

    list.innerHTML = validFriends.map(u => {
        return `
                <div class="flex items-center justify-between p-3 border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    <div class="flex items-center gap-3">
                        <img src="${u.photoUrl}" class="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                        <span class="font-bold text-sm text-slate-700 dark:text-slate-200">${u.displayName}</span>
                    </div>
                    <button onclick="window.addMemberToComm('${u.uid}', '${commId}')" class="bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">إضافة</button>
                </div>`;
    }).join('');
    if (!list.innerHTML) list.innerHTML = '<p class="text-center text-slate-500 dark:text-slate-400 py-4">جميع أصدقائك موجودون بالفعل في هذا المجتمع.</p>';
    document.getElementById('add-member-modal').classList.remove('hidden');
    lucide.createIcons();
}
window.closeAddMemberModal = () => document.getElementById('add-member-modal').classList.add('hidden');

window.addMemberToComm = async (uid, commId) => {
    try {
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'communities', commId), {
            members: arrayUnion(uid)
        });
        window.showAddMemberModal(commId);
        showToast('تمت الإضافة بنجاح', 'success');
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
}

window.tmpEditCommImgFile = null;
window.tmpEditCommCoverFile = null;
window.currentEditCommId = null;

window.showEditCommModal = (commId) => {
    const comm = allCommunities.find(c => c.id === commId);
    if (!comm) return;
    window.currentEditCommId = commId;
    document.getElementById('edit-comm-name').value = comm.name;
    document.getElementById('edit-comm-desc').value = comm.description || '';
    document.getElementById('edit-comm-category').value = comm.category;
    document.getElementById('edit-comm-privacy').value = comm.isPrivate ? 'private' : 'public';
    document.getElementById('edit-comm-color').value = comm.color || 'bg-emerald-100 dark:bg-emerald-900/40';
    document.getElementById('edit-comm-icon-preview').src = comm.iconUrl;
    document.getElementById('edit-comm-cover-preview').src = comm.coverUrl;

    window.tmpEditCommImgFile = null;
    window.tmpEditCommCoverFile = null;

    const modal = document.getElementById('edit-comm-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.closeEditCommModal = () => {
    const modal = document.getElementById('edit-comm-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
    window.tmpEditCommImgFile = null;
    window.tmpEditCommCoverFile = null;
    window.currentEditCommId = null;
}

window.handleEditCommCoverSelect = (e) => {
    if (e.target.files[0]) {
        window.openUniversalCropper(e.target.files[0], 'edit-comm-cover', 3 / 1);
    }
    e.target.value = '';
}
window.handleEditCommIconSelect = (e) => {
    if (e.target.files[0]) {
        window.openUniversalCropper(e.target.files[0], 'edit-comm-icon', 1);
    }
    e.target.value = '';
}

window.submitEditComm = async () => {
    if (!window.currentEditCommId) return;
    const comm = allCommunities.find(c => c.id === window.currentEditCommId);
    if (!comm) return;

    const name = document.getElementById('edit-comm-name').value.trim();
    const desc = document.getElementById('edit-comm-desc').value.trim();
    const category = document.getElementById('edit-comm-category').value;
    const privacy = document.getElementById('edit-comm-privacy').value;
    const color = document.getElementById('edit-comm-color').value;

    if (!name || !category || !privacy) {
        showToast('يرجى تعبئة جميع الحقول الإجبارية', 'error');
        return;
    }

    const btn = document.getElementById('edit-comm-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري الحفظ...';

    try {
        let iconUrl = comm.iconUrl;
        let coverUrl = comm.coverUrl;

        if (window.tmpEditCommImgFile) iconUrl = await uploadToImgbb(window.tmpEditCommImgFile);
        if (window.tmpEditCommCoverFile) coverUrl = await uploadToImgbb(window.tmpEditCommCoverFile);

        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'communities', comm.id), {
            name,
            description: desc,
            category,
            color,
            iconUrl,
            coverUrl,
            isPrivate: privacy === 'private'
        });

        window.closeEditCommModal();
        showToast('تم تعديل المجتمع بنجاح!', 'success');
        window.renderCommunitiesTab();
    } catch (e) {
        showToast('حدث خطأ أثناء التعديل', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = 'حفظ التعديلات';
}

window.showCreateCommModal = () => document.getElementById('create-comm-modal').classList.remove('hidden');
window.closeCreateCommModal = () => {
    document.getElementById('create-comm-modal').classList.add('hidden');
    window.tmpCommImgFile = null;
    window.tmpCommCoverFile = null;
    document.getElementById('comm-icon-preview').src = 'https://ui-avatars.com/api/?name=C&background=10b981&color=fff&rounded=true&size=128';
    document.getElementById('comm-cover-preview').src = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop';
}

window.handleCommCoverSelect = (e) => {
    if (e.target.files[0]) {
        window.openUniversalCropper(e.target.files[0], 'comm-cover', 3 / 1);
    }
    e.target.value = '';
}
window.handleCommIconSelect = (e) => {
    if (e.target.files[0]) {
        window.openUniversalCropper(e.target.files[0], 'comm-icon', 1);
    }
    e.target.value = '';
}

window.submitCreateComm = async () => {
    const name = document.getElementById('comm-name').value.trim();
    const desc = document.getElementById('comm-desc').value.trim();
    const category = document.getElementById('comm-category').value;
    const privacy = document.getElementById('comm-privacy').value;
    const color = document.getElementById('comm-color').value;

    if (!name || !category || !privacy) {
        showToast('يرجى تعبئة اسم المجتمع، التصنيف، والخصوصية كحقول إجبارية', 'error');
        return;
    }

    const btn = document.getElementById('create-comm-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="loader"></i> جاري الإنشاء...';

    try {
        let iconUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff&rounded=true&size=128`;
        let coverUrl = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop';
        if (window.tmpCommImgFile) iconUrl = await uploadToImgbb(window.tmpCommImgFile);
        if (window.tmpCommCoverFile) coverUrl = await uploadToImgbb(window.tmpCommCoverFile);

        await setDoc(doc(collection(db, 'artifacts', appIdStr, 'public', 'data', 'communities')), {
            name,
            description: desc,
            category,
            color,
            iconUrl,
            coverUrl,
            isPrivate: privacy === 'private',
            creatorId: currentUser.uid,
            members: [currentUser.uid],
            joinRequests: [],
            createdAt: new Date().toISOString()
        });

        window.closeCreateCommModal();
        document.getElementById('comm-name').value = '';
        document.getElementById('comm-desc').value = '';
        document.getElementById('comm-category').value = '';
        document.getElementById('comm-privacy').value = '';

        showToast('تم إنشاء المجتمع بنجاح!', 'success');
    } catch (e) {
        showToast('حدث خطأ أثناء الإنشاء', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = 'إنشاء المجتمع';
}

window.handleNotifClick = async (type, notifId, targetId, commentId) => {
    if (notifId && notifId !== 'null') {
        try {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'notifications', notifId), {
                read: true
            });
        } catch (e) {}
    }
    if (type === 'chat') {
        if (targetId && typeof window.goToChat === 'function') window.goToChat(targetId);
        else {
            window.activeChatFriendId = targetId;
            window.switchTab('messages');
        }
    } else if (type === 'request') {
        window.switchTab('requests');
    } else if (type === 'post') {
        if (typeof window.openSinglePost === 'function') window.openSinglePost(targetId, notifId, commentId);
        else window.switchTab('feed');
    }
    window.renderNotificationsTab();
};

window.renderNotificationsTab = () => {
    const list = document.getElementById('notifications-list');
    if (!list || !currentUser) return;

    const unreadMessagesGroups = {};
    allMessages.filter(m => m.receiverId === currentUser.uid && !m.read).forEach(m => {
        if (!unreadMessagesGroups[m.senderId]) unreadMessagesGroups[m.senderId] = m;
        else if (new Date(m.createdAt) > new Date(unreadMessagesGroups[m.senderId].createdAt)) unreadMessagesGroups[m.senderId] = m;
    });

    const combined = [
        ...allNotifications.filter(n => n.to === currentUser.uid),
        ...friendRequests.filter(r => r.to === currentUser.uid && r.status === 'pending').map(r => ({
            id: r.id,
            type: 'friend_request',
            fromId: r.from,
            fromName: r.fromName,
            fromAvatar: r.fromAvatar,
            createdAt: r.createdAt,
            read: false
        })),
        ...Object.values(unreadMessagesGroups).map(m => {
            const sender = allUsers.find(u => u.uid === m.senderId);
            return {
                id: m.id,
                type: 'message',
                fromId: m.senderId,
                fromName: sender?.displayName,
                fromAvatar: sender?.photoUrl,
                createdAt: m.createdAt,
                read: false
            };
        })
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (combined.length === 0) {
        list.innerHTML = '<div class="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700"><i data-lucide="bell-off" class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3"></i><p class="text-slate-500 dark:text-slate-400">لا توجد إشعارات حالياً.</p></div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    list.innerHTML = combined.map(n => {
        let icon = 'bell',
            text = n.text || '',
            color = 'emerald';
        let action = '';

        const u = allUsers.find(x => x.uid === (n.from || n.fromId)) || {
            displayName: n.fromName || 'مستخدم',
            photoUrl: n.fromAvatar || 'https://ui-avatars.com/api/?name=User'
        };
        const sName = u.displayName;
        const sAvatar = u.photoUrl;

        if (n.type === 'like' || n.type === 'react_post') {
            icon = 'heart';
            text = `تفاعل <b>${sName}</b> مع منشورك`;
            color = 'rose';
            action = `window.handleNotifClick('post', '${n.id}', '${n.postId}')`;
        } else if (n.type === 'react_comment') {
            icon = 'heart';
            text = `تفاعل <b>${sName}</b> مع تعليقك`;
            color = 'rose';
            action = `window.handleNotifClick('post', '${n.id}', '${n.postId}', ${n.commentId ? `'${n.commentId}'` : 'null'})`;
        } else if (n.type === 'comment') {
            icon = 'message-square';
            text = `علق <b>${sName}</b> على منشورك`;
            color = 'blue';
            action = `window.handleNotifClick('post', '${n.id}', '${n.postId}', ${n.commentId ? `'${n.commentId}'` : 'null'})`;
        } else if (n.type === 'reply') {
            icon = 'message-circle';
            text = `قام <b>${sName}</b> بالرد والتعليق`;
            color = 'blue';
            action = `window.handleNotifClick('post', '${n.id}', '${n.postId}', ${n.commentId ? `'${n.commentId}'` : 'null'})`;
        } else if (n.type === 'repost') {
            icon = 'repeat';
            text = `أعاد <b>${sName}</b> مشاركة منشورك`;
            color = 'emerald';
            action = `window.handleNotifClick('post', '${n.id}', '${n.postId}')`;
        } else if (n.type === 'mention') {
            icon = 'at-sign';
            text = n.text || `قام <b>${sName}</b> بذكرك في منشور`;
            color = 'emerald';
            action = `window.handleNotifClick('post', '${n.id}', '${n.postId}')`;
        } else if (n.type === 'friend_request') {
            icon = 'user-plus';
            text = `طلب صداقة من <b>${sName}</b>`;
            color = 'indigo';
            action = `window.handleNotifClick('request', null, null)`;
        } else if (n.type === 'message') {
            icon = 'mail';
            text = `أرسل لك <b>${sName}</b> رسالة جديدة`;
            color = 'emerald';
            action = `window.handleNotifClick('chat', null, '${n.fromId || n.from}')`;
        }

        const bgClass = n.read ? 'bg-white dark:bg-slate-800 opacity-70' : 'bg-emerald-50 dark:bg-emerald-900/20 shadow-md border-r-4 border-r-emerald-500 shadow-emerald-500/5';

        return `
                    <div onclick="${action}" class="${bgClass} p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all group">
                        <div class="flex items-center gap-3 md:gap-4">
                            <div class="relative shrink-0">
                                <img src="${sAvatar}" class="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-slate-200 dark:border-slate-600">
                                <div class="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm border border-slate-100 dark:border-slate-700">
                                    <i data-lucide="${icon}" class="w-3 h-3 text-${color}-500"></i>
                                </div>
                            </div>
                            <div>
                                <p class="text-sm text-slate-800 dark:text-slate-200 leading-snug">${text}</p>
                                <p class="text-[10px] text-slate-400 mt-1 font-medium">${new Date(n.createdAt).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        <div class="w-2 h-2 rounded-full ${n.read ? 'bg-transparent' : 'bg-emerald-500 animate-pulse'} shrink-0"></div>
                    </div>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.markAllNotifsRead = async () => {
    const unread = allNotifications.filter(n => n.to === currentUser.uid && !n.read);
    unread.forEach(async n => {
        try {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'notifications', n.id), {
                read: true
            });
        } catch (e) {}
    });
    showToast('تم تحديد الكل كمقروء', 'success');
};

window.clearAllNotifs = async () => {
    const myNotifs = allNotifications.filter(n => n.to === currentUser.uid);
    if (!myNotifs.length) return showToast('لا توجد إشعارات لمسحها', 'info');

    showConfirm('هل أنت متأكد من مسح جميع الإشعارات بشكل نهائي؟', async () => {
        try {
            await Promise.all(myNotifs.map(n => deleteDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'notifications', n.id))));
            showToast('تم مسح جميع الإشعارات بنجاح', 'success');
        } catch (e) {
            showToast('حدث خطأ أثناء المسح', 'error');
        }
    });
};

window.renderSinglePostTab = () => {
    if (!currentSinglePostId) return;
    const container = document.getElementById('single-post-container');
    const sourceLabel = document.getElementById('single-post-source-label');
    const post = allPosts.find(p => p.id === currentSinglePostId);

    if (post) {
        container.innerHTML = generatePostHTML(post, 'notif-');
        if (sourceLabel) {
            if (post.communityId) {
                const comm = allCommunities.find(c => c.id === post.communityId);
                sourceLabel.innerText = `• من مجتمع: ${comm ? comm.name : 'خاص'}`;
            } else {
                sourceLabel.innerText = '• من المساحة العامة';
            }
        }
    } else {
        container.innerHTML = '<div class="text-center py-10 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700"><p class="text-slate-500">هذا المنشور غير متاح أو تم حذفه.</p></div>';
        if (sourceLabel) sourceLabel.innerText = '';
    }
    lucide.createIcons();
};

window.toggleFavorite = async (postId) => {
    if (!currentUser) return;
    const isFav = (userData.favorites || []).includes(postId);
    try {
        await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'users', currentUser.uid), {
            favorites: isFav ? arrayRemove(postId) : arrayUnion(postId)
        });
        showToast(isFav ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة للمفضلة', 'success');
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
};

window.generateFavoriteCardHTML = (post) => {
    const author = allUsers.find(u => u.uid === post.authorId);
    const aName = author ? author.displayName : post.authorName;
    const aPic = author ? author.photoUrl : post.authorPhoto;

    return `
            <div class="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md transition-all group mb-3" onclick="window.openSinglePost('${post.id}')">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 overflow-hidden shadow-sm border border-black/5 dark:border-white/5 shrink-0">
                        <img src="${aPic}" class="w-full h-full object-cover">
                    </div>
                    <div class="min-w-0">
                        <h4 class="font-bold text-slate-800 dark:text-slate-200 text-base truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">${post.title || aName}</h4>
                        <div class="text-xs text-slate-500 dark:text-slate-400 truncate mt-1 flex items-center gap-1.5 font-medium">
                            <i data-lucide="calendar" class="w-3 h-3"></i> ${new Date(post.createdAt).toLocaleDateString('ar-EG')} 
                            <span class="opacity-30">|</span>
                            <span class="truncate">${post.content ? post.content.substring(0, 50) + '...' : 'عرض المنشور الكامل'}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button onclick="event.stopPropagation(); window.toggleFavorite('${post.id}')" class="text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 p-2 rounded-xl transition-colors" title="إزالة من المفضلة">
                        <i data-lucide="star" class="w-5 h-5 fill-current"></i>
                    </button>
                    <i data-lucide="chevron-left" class="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors"></i>
                </div>
            </div>`;
};

window.renderFavoritesTab = () => {
    const list = document.getElementById('favorites-posts-list');
    const favIds = userData.favorites || [];
    const favPosts = allPosts.filter(p => favIds.includes(p.id)).sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()));

    if (!favPosts.length) {
        list.innerHTML = '<div class="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700"><i data-lucide="star" class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3"></i><p class="text-slate-500 dark:text-slate-400 font-bold">قائمة المفضلة فارغة حالياً.</p></div>';
    } else {
        list.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${favPosts.map(p => window.generateFavoriteCardHTML(p)).join('')}</div>`;
    }
    lucide.createIcons();
};

window.openSinglePost = async (postId, notifId = null, targetCommentId = null) => {
    // حفظ التبويب الحالي قبل الانتقال للمنشور للتمكن من الرجوع إليه لاحقاً
    window.lastTabBeforeSinglePost = activeTabStr;

    if (notifId) {
        try {
            await updateDoc(doc(db, 'artifacts', appIdStr, 'public', 'data', 'notifications', notifId), {
                read: true
            });
        } catch (e) {}
    }
    currentSinglePostId = postId;
    window.switchTab('singlepost');

    if (targetCommentId) {
        setTimeout(() => {
            const cEl = document.getElementById(`notif-comment-${targetCommentId}`);
            if (cEl) {
                cEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                cEl.classList.add('bg-emerald-50', 'dark:bg-emerald-900/30', 'p-2', 'rounded-2xl', 'transition-colors', 'duration-1000');
                setTimeout(() => cEl.classList.remove('bg-emerald-50', 'dark:bg-emerald-900/30', 'p-2', 'rounded-2xl'), 2000);
            }
        }, 400);
    }
};

window.showCharterModal = () => {
    const modal = document.getElementById('charter-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('div').classList.remove('scale-95', 'opacity-0');
    }, 10);
    lucide.createIcons();
}

window.acceptCharter = () => {
    localStorage.setItem('mytab_charter_accepted', 'true');
    const modal = document.getElementById('charter-modal');
    modal.querySelector('div').classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

window.showWhyMyTabModal = () => {
    const modal = document.getElementById('why-mytab-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('div').classList.remove('scale-95', 'opacity-0');
    }, 10);
    lucide.createIcons();
}

window.closeWhyMyTabModal = () => {
    const modal = document.getElementById('why-mytab-modal');
    modal.querySelector('div').classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// --- Mobile Menu Logic Fix ---
window.toggleMobileMenu = () => {
    let sidebar = document.getElementById('sidebar-nav');
    if (!sidebar) {
        sidebar = document.querySelector('nav');
        if (sidebar) sidebar.id = 'sidebar-nav';
    }

    let overlay = document.getElementById('mobile-sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mobile-sidebar-overlay';
        overlay.className = 'hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 transition-opacity duration-300 opacity-0';
        overlay.onclick = window.toggleMobileMenu;
        const mainLayout = document.getElementById('main-layout');
        if (mainLayout && sidebar) {
            mainLayout.insertBefore(overlay, sidebar);
        }
    }

    if (sidebar && overlay) {
        // إجبار القائمة لتكون عائمة على الموبايل
        sidebar.classList.remove('w-14');
        sidebar.classList.add('fixed', 'right-0', 'inset-y-0', 'transform', 'md:translate-x-0', 'md:relative', 'z-50', 'transition-transform', 'duration-300', 'shadow-2xl');

        if (!sidebar.classList.contains('translate-x-full') && !sidebar.classList.contains('menu-opened')) {
            sidebar.classList.add('translate-x-full');
        }

        if (sidebar.classList.contains('translate-x-full')) {
            sidebar.classList.remove('translate-x-full');
            sidebar.classList.add('menu-opened');
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        } else {
            sidebar.classList.add('translate-x-full');
            sidebar.classList.remove('menu-opened');
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    }
};

// إغلاق القائمة تلقائياً عند اختيار تبويب
const _originalSwitchTab = window.switchTab;
window.switchTab = (tab, preserveState = false) => {
    if (_originalSwitchTab) _originalSwitchTab(tab, preserveState);
    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar-nav') || document.querySelector('nav');
        if (sidebar && sidebar.classList.contains('menu-opened')) {
            window.toggleMobileMenu();
        }
    }
};

// إعداد مبدئي للقائمة عند تحميل الموقع في الموبايل
setTimeout(() => {
    if (window.innerWidth < 768) {
        const sidebar = document.querySelector('nav');
        if (sidebar) {
            sidebar.classList.add('transform', 'translate-x-full', 'fixed', 'right-0', 'z-50');
            sidebar.classList.remove('w-14');
        }
    }
}, 100);

// --- حماية المحادثات من التصوير والنسخ ---
window.addEventListener('blur', () => {
    // تعتيم قسم الرسائل والصور فقط عند محاولة التبديل بين التطبيقات أو تصوير الشاشة
    if (activeTabStr === 'messages') {
        const chatView = document.getElementById('tab-content-messages');
        if (chatView) chatView.classList.add('screenshot-protection');
    }
    const lightbox = document.getElementById('lightbox');
    if (lightbox && !lightbox.classList.contains('hidden')) {
        lightbox.classList.add('screenshot-protection');
    }
});

window.addEventListener('focus', () => {
    const chatView = document.getElementById('tab-content-messages');
    if (chatView) chatView.classList.remove('screenshot-protection');
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.classList.remove('screenshot-protection');
});

// منع الزر الأيمن للفأرة ومنع سحب الصور
document.addEventListener('contextmenu', (e) => {
    if (activeTabStr === 'messages' || document.getElementById('lightbox').classList.contains('hidden') === false) {
        e.preventDefault();
        showToast('عذراً، لا يمكن نسخ المحتوى في هذا القسم لدواعي الأمان', 'error');
    }
});

// كشف محاولة الضغط على زر Print Screen في الكمبيوتر
document.addEventListener('keyup', (e) => {
    if (e.key === 'PrintScreen' && (activeTabStr === 'messages' || !document.getElementById('lightbox').classList.contains('hidden'))) {
        navigator.clipboard.writeText('Security Blocked');
        const chatView = document.getElementById('tab-content-messages');
        if (chatView) chatView.classList.add('screenshot-protection');
        const lightbox = document.getElementById('lightbox');
        if (lightbox) lightbox.classList.add('screenshot-protection');
        showToast('تم حظر تصوير المحادثة!', 'error');
    }
});

// --- وظيفة التقاط صورة للمنشور بأسلوب كلاسيكي وأنيق ---
window.capturePost = async (postElementId, authorName) => {
    const postEl = document.getElementById(postElementId);
    if (!postEl) return;

    // تحديد أزرار التفاعل وقسم التعليقات لإخفائهم أثناء التصوير
    const btnGroup = postEl.querySelector('.gap-1\\.5.relative') || postEl.children[postEl.children.length - 2];
    const commentSection = postEl.querySelector('.mt-3.pt-3') || postEl.children[postEl.children.length - 1];
    const editDeleteBtns = postEl.querySelector('.flex.justify-between.items-start .flex.items-center.gap-1');

    // استهداف إضافي لأزرار التعديل والحذف للتأكد من اختفائها
    const headerDiv = postEl.firstElementChild;
    let editDeleteBtnsAlternative = null;
    if (headerDiv && headerDiv.classList.contains('justify-between') && headerDiv.children.length > 1) {
        editDeleteBtnsAlternative = headerDiv.children[1];
    }

    // هيدر لقطة الشاشة (يظهر فوق المنشور) فيه صورة الملتقط وتاريخ اللقطة فقط
    const captureHeader = document.createElement('div');
    captureHeader.className = 'mb-5 pb-4 flex flex-col items-center justify-center gap-2';
    captureHeader.innerHTML = `
                <img id="capture-header-img" class="w-14 h-14 rounded-full object-cover border border-emerald-200 dark:border-emerald-700 shadow-sm bg-white dark:bg-slate-800" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
                <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <i data-lucide="calendar" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"></i> ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
            `;

    // تصميم العلامة المائية السفلية كلاسيكية وأنيقة
    const watermark = document.createElement('div');
    watermark.className = 'mt-5 pt-4 border-t border-black/5 dark:border-white/5 flex justify-between items-center bg-transparent px-2';
    watermark.innerHTML = `
                <div class="flex flex-col">
                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">كاتب المنشور</span>
                    <span class="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <i data-lucide="pen-tool" class="w-4 h-4 text-emerald-500"></i> ${authorName}
                    </span>
                </div>
                <div class="flex flex-col items-end justify-center">
                    <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">بواسطة موقع</span>
                    <div class="font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1.5 text-base drop-shadow-sm tracking-wide">
                        <span>MyTab</span> 
                        <img src="https://i.ibb.co/93y8GcxZ/Picsart-26-05-09-16-59-08-419.png" crossorigin="anonymous" class="w-4 h-4 object-contain translate-y-[1px]">
                    </div>
                </div>
            `;

    try {
        showToast('جاري تجهيز الصورة...', 'info');

        // تحويل صورة المستخدم إلى Base64 لتجنب مشاكل CORS وظهور الدائرة الخضراء
        const getBase64Image = async (url) => {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                return url; // الرجوع للرابط في حالة فشل التحويل
            }
        };

        const base64Img = await getBase64Image(userData.photoUrl);
        captureHeader.querySelector('#capture-header-img').src = base64Img;

        // إخفاء الأزرار والهيدر الأصلي مؤقتاً (لإزالة صورة الكاتب والاسم والوقت والخيارات كما في الصورة)
        if (btnGroup) btnGroup.style.display = 'none';
        if (commentSection) commentSection.style.display = 'none';
        if (headerDiv) headerDiv.style.display = 'none';

        postEl.prepend(captureHeader);
        postEl.appendChild(watermark);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        await new Promise(resolve => setTimeout(resolve, 400)); // إعطاء مهلة إضافية ليتم رسم الصورة المحولة

        // التقاط الصورة
        const canvas = await html2canvas(postEl, {
            backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
            scale: 2, // جودة عالية HD
            useCORS: true, // مهم لتحميل صور البروفايل من الروابط الخارجية
            allowTaint: true,
            logging: false
        });

        // تحميل الصورة
        const link = document.createElement('a');
        link.download = `MyTab_Post_${authorName.replace(/\s+/g, '_')}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('تم حفظ صورة المنشور بنجاح!', 'success');
    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء التقاط الصورة', 'error');
    } finally {
        // إعادة المنشور لشكله الطبيعي
        if (btnGroup) btnGroup.style.display = '';
        if (commentSection) commentSection.style.display = '';
        if (headerDiv) headerDiv.style.display = '';

        captureHeader.remove();
        watermark.remove();
    }
};

// --- دالة استقبال النصوص والروابط المشاركة من تطبيق الأندرويد ---
window.pendingSharedTextJS = null;

window.receiveSharedText = function(text) {
    if (!text || text.trim() === '') return;

    // لو المستخدم لسه بيسجل دخول، احفظ الرابط في الذاكرة لحد ما يخلص
    if (typeof currentUser === 'undefined' || !currentUser) {
        window.pendingSharedTextJS = text;
        return;
    }

    // لو مسجل دخول، افتح الرئيسية
    if (typeof window.switchTab === 'function') {
        window.switchTab('feed');
    }

    setTimeout(() => {
        const postInput = document.getElementById('post-content');
        if (postInput) {
            if (postInput.value.trim() !== '') {
                postInput.value += '\n\n' + text;
            } else {
                postInput.value = text;
            }
            postInput.focus();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            if (window.showToast) {
                window.showToast('تم إدراج الرابط بنجاح! جاهز للنشر.', 'success');
            }
        }
    }, 800);
};

window.processPendingSharedText = function() {
    // لو الرابط محفوظ في الذاكرة ننزله
    if (window.pendingSharedTextJS) {
        window.receiveSharedText(window.pendingSharedTextJS);
        window.pendingSharedTextJS = null;
    }
    // لو الأندرويد لسه محتفظ بيه، نسحبه منه
    else if (window.AndroidApp && typeof window.AndroidApp.pullSharedText === 'function') {
        const shared = window.AndroidApp.pullSharedText();
        if (shared && shared !== "null" && shared.trim() !== '') {
            window.receiveSharedText(shared);
        }
    }
};

// ===============================================================


/* Module JS */


/* --- Classic Script 3 --- */
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.createElement('button');
    backBtn.id = 'smart-mobile-back-btn';

    // تصميم احترافي: زوايا ناعمة (svg)، اتجاه ثابت لليمين، لون أنيق
    backBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white/90 pointer-events-none translate-x-[1px]"><path d="m9 18 6-6-6-6"/></svg>';

    // التنسيق: حجم مثالي (w-10 h-10)، تأثير زجاجي، إطار ناعم
    backBtn.className = 'fixed z-[99999] bg-slate-800/80 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.3)] border border-slate-600/50 transition-all duration-300 opacity-0 cursor-pointer touch-none hover:bg-slate-700/90 active:scale-90';

    // الموضع الافتراضي (أسفل اليمين دائماً)
    backBtn.style.bottom = '24px';
    backBtn.style.right = '24px';
    document.body.appendChild(backBtn);

    let historyStack = [];
    let inChatRoom = false;

    function updateBackBtnState() {
        if (historyStack.length > 0 || inChatRoom) {
            backBtn.classList.remove('opacity-0', 'pointer-events-none');
            backBtn.classList.add('opacity-100');
        } else {
            backBtn.classList.add('opacity-0', 'pointer-events-none');
            backBtn.classList.remove('opacity-100');
        }
    }

    // --- ميزة الضغطة المطولة للسحب (Long Press to Drag) --- //
    let isDragging = false;
    let isLongPress = false;
    let pressTimer;
    let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

    function dragStart(e) {
        if (e.target === backBtn || backBtn.contains(e.target)) {
            if (e.type === "touchstart") {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }

            isLongPress = false;
            isDragging = false;

            // تفعيل السحب بعد 800 مللي ثانية فقط
            pressTimer = setTimeout(() => {
                isLongPress = true;
                isDragging = true;
                backBtn.classList.add('scale-125', 'bg-rose-700'); 
                if (navigator.vibrate) navigator.vibrate(50); 
            }, 800);
        }
    }

    function dragEnd(e) {
        clearTimeout(pressTimer); 
        if (isDragging) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            backBtn.classList.remove('scale-125', 'bg-rose-700');
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            if (e.type === "touchmove") {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }
            xOffset = currentX;
            yOffset = currentY;
            setTranslate(currentX, currentY, backBtn);
        } else if (e.target === backBtn || backBtn.contains(e.target)) {
            let tempX, tempY;
            if (e.type === "touchmove") {
                tempX = e.touches[0].clientX - xOffset;
                tempY = e.touches[0].clientY - yOffset;
            } else {
                tempX = e.clientX - xOffset;
                tempY = e.clientY - yOffset;
            }
            if (Math.abs(tempX - initialX) > 10 || Math.abs(tempY - initialY) > 10) {
                clearTimeout(pressTimer);
            }
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    document.addEventListener("touchstart", dragStart, { passive: false });
    document.addEventListener("touchend", dragEnd, { passive: false });
    document.addEventListener("touchmove", drag, { passive: false });
    document.addEventListener("mousedown", dragStart, false);
    document.addEventListener("mouseup", dragEnd, false);
    document.addEventListener("mousemove", drag, false);

    function triggerGreenPulse() {
        backBtn.classList.add('ring-4', 'ring-emerald-500/50', 'bg-emerald-600/80');
        backBtn.classList.remove('bg-slate-800/80', 'border-slate-600/50');
        setTimeout(() => {
            backBtn.classList.remove('ring-4', 'ring-emerald-500/50', 'bg-emerald-600/80');
            backBtn.classList.add('bg-slate-800/80', 'border-slate-600/50');
        }, 400); 
    }

    // --- متغيرات لحفظ الدوال الأصلية ---
    let originalSwitchTab = null;
    let originalShowView = null;
    let originalOpenChatRoom = null;

    // دالة تقوم بمراقبة الموقع حتى يتم تحميل دوال التصفح (لحل مشكلة تأخير تحميل الـ Modules)
    function connectOldHooks() {
        let hooked = false;

        if (typeof window.switchTab === 'function' && !originalSwitchTab) {
            originalSwitchTab = window.switchTab;
            window.switchTab = function () {
                const tabId = arguments[0];
                if (historyStack.length === 0 || historyStack[historyStack.length - 1].id !== tabId) {
                    // إضافة # ضرورية للأندرويد عشان يفهم التغيير
                    window.history.pushState({ action: 'tab', id: tabId }, '', '#' + tabId);
                    historyStack.push({ type: 'tab', id: tabId });
                }
                updateBackBtnState();
                triggerGreenPulse();
                return originalSwitchTab.apply(this, arguments);
            };
            hooked = true;
        }

        if (typeof window.showView === 'function' && !originalShowView) {
            originalShowView = window.showView;
            window.showView = function () {
                const viewId = arguments[0];
                if (historyStack.length === 0 || historyStack[historyStack.length - 1].id !== viewId) {
                    window.history.pushState({ action: 'view', id: viewId }, '', '#' + viewId);
                    historyStack.push({ type: 'view', id: viewId });
                }
                updateBackBtnState();
                triggerGreenPulse();
                return originalShowView.apply(this, arguments);
            };
            hooked = true;
        }

        if (typeof window.openChatRoom === 'function' && !originalOpenChatRoom) {
            originalOpenChatRoom = window.openChatRoom;
            window.openChatRoom = function () {
                window.history.pushState({ action: 'chat_room' }, '', '#chat');
                inChatRoom = true;
                updateBackBtnState();
                triggerGreenPulse();
                return originalOpenChatRoom.apply(this, arguments);
            };
            hooked = true;
        }

        // الاستمرار بالبحث كل 200 مللي ثانية حتى يعثر على الدوال الرئيسية
        if (!originalSwitchTab || !originalOpenChatRoom) {
            setTimeout(connectOldHooks, 200);
        }
    }

    // تسجيل الصفحة الرئيسية كأول خطوة لمنع الخروج الفوري
    window.history.replaceState({ action: 'base' }, '', window.location.pathname);
    connectOldHooks();

    // --- معالجة أمر الرجوع بنفس طريقتك الأصلية الذكية --- //
    function handleBackAction(event) {
        if (inChatRoom && typeof window.closeChatRoom === 'function') {
            window.closeChatRoom();
            inChatRoom = false;
            updateBackBtnState();
            return;
        }

        if (historyStack.length > 0) {
            historyStack.pop();
            updateBackBtnState();

            if (historyStack.length > 0) {
                const prevState = historyStack[historyStack.length - 1];
                // نستخدم الدالة الأصلية مباشرة عشان منعملش تسجيل لخطوة جديدة وحنا بنرجع
                if (prevState.type === 'tab' && typeof originalSwitchTab === 'function') {
                    originalSwitchTab(prevState.id, true);
                } else if (prevState.type === 'view' && typeof originalShowView === 'function') {
                    originalShowView(prevState.id);
                }
            } else {
                if (typeof originalSwitchTab === 'function') originalSwitchTab('feed', true);
            }
        } else {
            if (typeof originalSwitchTab === 'function') originalSwitchTab('feed', true);
        }
    }

    // التقاط حدث الرجوع الفعلي الخاص بالمتصفح/الموبايل
    window.addEventListener('popstate', handleBackAction);

    // --- دالة الربط مع زرار الرجوع في تطبيق الأندرويد ---
    window.handleAndroidBack = function() {
        if (inChatRoom || historyStack.length > 0) {
            // نأمر المتصفح بالرجوع، وهو تلقائياً هيشغل حدث popstate وينفذ الدالة اللي فوق
            window.history.back(); 
        } else {
            // لو مفيش خطوات تاني، أقفل التطبيق
            if (window.AndroidApp && typeof window.AndroidApp.exitApp === 'function') {
                window.AndroidApp.exitApp();
            }
        }
    };

    // نقرة الزر العائم تنفذ الرجوع
    backBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLongPress) {
            window.history.back();
        }
    });
});



        (function initSmartAnnouncement() {
            let lastCheckedAnnId = null;

            // 1. واجهة الإعلان للمستخدم
            function showAnnouncement(content, annId) {
                if (!content || !annId) return;
                
                // التأكد إن المستخدم مشافش الإعلان ده قبل كدة (عن طريق الـ ID)
                const seenId = localStorage.getItem('seen_ann_id');
                if (seenId === annId.toString()) return;

                // إنشاء نافذة الإعلان
                const modal = document.createElement('div');
                modal.id = 'smart-announcement-modal';
                modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 transition-opacity duration-300';
                
                modal.innerHTML = `
                    <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg relative transform transition-transform scale-100">
                        <button id="close-ann-btn" class="absolute top-3 left-3 z-20 bg-black/50 hover:bg-rose-500 text-white rounded-full p-1.5 transition-colors backdrop-blur-md">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                        <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 relative z-20">
                            <div id="ann-progress" class="bg-emerald-500 h-full w-full origin-right" style="transition: transform 15s linear;"></div>
                        </div>
                        <div class="p-6 max-h-[80vh] overflow-y-auto text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center relative z-10 text-center">
                            ${content}
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                if (window.lucide) window.lucide.createIcons();

                // دالة الإغلاق (مع تسجيل إن المستخدم شاف الإعلان)
                const closeModal = () => {
                    localStorage.setItem('seen_ann_id', annId.toString());
                    modal.classList.add('opacity-0');
                    setTimeout(() => modal.remove(), 300);
                };

                modal.querySelector('#close-ann-btn').onclick = closeModal;

                // تشغيل شريط الوقت تدريجياً
                setTimeout(() => {
                    const prog = modal.querySelector('#ann-progress');
                    if (prog) prog.style.transform = 'scaleX(0)';
                }, 100);

                // الاختفاء التلقائي بعد 15 ثانية بالظبط
                setTimeout(() => {
                    if (document.getElementById('smart-announcement-modal')) {
                        closeModal();
                    }
                }, 15000);
            }

            // 2. مراقب الإعلانات (بيشتغل في الخلفية يقرأ من الإعدادات العامة)
            setInterval(() => {
                if (window.globalSettings && window.globalSettings.annCode) {
                    if (lastCheckedAnnId !== window.globalSettings.annId) {
                        lastCheckedAnnId = window.globalSettings.annId;
                        showAnnouncement(window.globalSettings.annCode, window.globalSettings.annId);
                    }
                }
            }, 3000);

            // 3. حقن مربع التحكم في لوحة الإدارة تلقائياً
            const observer = new MutationObserver(() => {
                const adminTab = document.getElementById('admin-tab') || document.querySelector('#admin-container');
                if (adminTab && !document.getElementById('admin-announcement-section')) {
                    
                    const annSection = document.createElement('div');
                    annSection.id = 'admin-announcement-section';
                    annSection.className = 'bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mt-6';
                    annSection.innerHTML = `
                        <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <i data-lucide="megaphone" class="w-6 h-6 text-emerald-600"></i> إعلان منبثق للمستخدمين (Smart Pop-up)
                        </h3>
                        <div class="flex flex-col gap-4">
                            <div>
                                <label class="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">محتوى الإعلان (نص، HTML، صورة <img>، أو فيديو)</label>
                                <textarea id="admin-ann-input" rows="4" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100 transition-colors" placeholder="اكتب محتوى الإعلان هنا ليظهر للمستخدمين لمدة 15 ثانية..."></textarea>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <button onclick="window.saveSmartAnnouncement()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2"><i data-lucide="send" class="w-4 h-4"></i> نشر الإعلان للجميع</button>
                                <button onclick="window.removeSmartAnnouncement()" class="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2"><i data-lucide="trash-2" class="w-4 h-4"></i> إيقاف الإعلان</button>
                            </div>
                        </div>
                    `;
                    
                    // إضافة صندوق الإعلان تحت صندوق "الحكمة" في لوحة الإدارة
                    const quoteDiv = adminTab.querySelector('#admin-quote-input');
                    if (quoteDiv) {
                        quoteDiv.closest('.bg-white, .dark\\:bg-slate-800').insertAdjacentElement('afterend', annSection);
                    } else {
                        adminTab.appendChild(annSection);
                    }
                    if (window.lucide) window.lucide.createIcons();

                    // استرجاع الكود الحالي من الداتابيز لو موجود
                    if (window.globalSettings && window.globalSettings.annCode) {
                        document.getElementById('admin-ann-input').value = window.globalSettings.annCode;
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        })();
    

        (function initSecureSmartAnnouncement() {
            let lastCheckedAnnId = null;

            // 1. عرض النافذة المنبثقة للمستخدم بأمان تام
            function showAnnouncement(content, annId) {
                if (!content || !annId) return;
                try {
                    const seenId = localStorage.getItem('seen_ann_id');
                    if (seenId === String(annId)) return;

                    // إزالة أي نافذة قديمة معلقة من الذاكرة
                    const oldModal = document.getElementById('smart-announcement-modal');
                    if (oldModal) oldModal.remove();

                    const modal = document.createElement('div');
                    modal.id = 'smart-announcement-modal';
                    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 transition-opacity duration-300';
                    
                    modal.innerHTML = `
                        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg relative border border-slate-100 dark:border-slate-700 transform scale-100 transition-transform">
                            <button id="close-ann-btn" class="absolute top-2.5 left-2.5 z-20 bg-black/40 hover:bg-rose-600 text-white rounded-full p-1 transition-colors">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                            <div class="w-full bg-slate-100 dark:bg-slate-700 h-1 relative z-20">
                                <div id="ann-progress" class="bg-emerald-500 h-full w-full origin-right transition-transform" style="transition-duration: 15000ms; transition-timing-function: linear;"></div>
                            </div>
                            <div class="p-5 max-h-[75vh] overflow-y-auto text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center text-center text-sm font-medium relative z-10">
                                ${content}
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();

                    const closeModal = () => {
                        localStorage.setItem('seen_ann_id', String(annId));
                        modal.classList.add('opacity-0');
                        setTimeout(() => modal.remove(), 300);
                    };

                    const btn = modal.querySelector('#close-ann-btn');
                    if (btn) btn.onclick = closeModal;

                    // بدء حركة شريط التقدم (15 ثانية)
                    setTimeout(() => {
                        const prog = modal.querySelector('#ann-progress');
                        if (prog) prog.style.transform = 'scaleX(0)';
                    }, 50);

                    // الاختفاء التلقائي الذكي
                    setTimeout(() => {
                        if (document.getElementById('smart-announcement-modal')) closeModal();
                    }, 15000);

                } catch (err) {
                    console.error("Popup Error: ", err);
                }
            }

            // 2. مراقبة التحديثات القادمة من السيرفر بشكل مستمر
            setInterval(() => {
                try {
                    if (window.globalSettings && window.globalSettings.annCode && window.globalSettings.annId) {
                        if (lastCheckedAnnId !== window.globalSettings.annId) {
                            lastCheckedAnnId = window.globalSettings.annId;
                            showAnnouncement(window.globalSettings.annCode, window.globalSettings.annId);
                        }
                    }
                } catch (e) {}
            }, 2500);

            // 3. حقن كارت التحكم داخل لوحة الإدارة ديناميكياً لتفادي كراش الـ HTML
            const observer = new MutationObserver(() => {
                try {
                    const adminTab = document.getElementById('admin-tab') || document.querySelector('#admin-container');
                    if (adminTab && !document.getElementById('admin-announcement-section')) {
                        
                        const annSection = document.createElement('div');
                        annSection.id = 'admin-announcement-section';
                        annSection.className = 'bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50 mt-4';
                        annSection.innerHTML = `
                            <h4 class="font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2 text-xs">
                                <i data-lucide="megaphone" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i> نظام الإعلانات المنبثقة الذكي (Smart Pop-up)
                            </h4>
                            <div class="flex flex-col md:flex-row gap-3 items-start md:items-center">
                                <div class="flex-1 w-full">
                                    <textarea id="admin-ann-input" rows="3" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100 transition-colors text-xs" placeholder="ضع كود الـ HTML، صورة، فيديو، أو الإعلان هنا... سيظهر للمستخدمين لمرة واحدة ولمدة 15 ثانية فقط."></textarea>
                                </div>
                                <div class="flex gap-1.5 w-full md:w-auto shrink-0">
                                    <button onclick="window.saveSmartAnnouncement()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold transition-colors text-xs whitespace-nowrap">نشر الإعلان</button>
                                    <button onclick="window.removeSmartAnnouncement()" class="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 px-3 py-2 rounded-xl font-bold transition-colors text-xs whitespace-nowrap">إيقاف</button>
                                </div>
                            </div>
                        `;
                        
                        // زرع الكارت بأمان تلو صندوق الحكمة مباشرة دون كسر التنسيق الأساسي
                        const quoteInput = document.getElementById('admin-quote-input');
                        if (quoteInput && quoteInput.parentElement) {
                            const containerBox = quoteInput.closest('.flex.flex-col') || quoteInput.parentElement;
                            containerBox.appendChild(annSection);
                        } else {
                            adminTab.appendChild(annSection);
                        }

                        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();

                        // تحميل كود الإعلان الحالي في الحقل تلقائياً إن وجد
                        if (window.globalSettings && window.globalSettings.annCode) {
                            const inputEl = document.getElementById('admin-ann-input');
                            if (inputEl) inputEl.value = window.globalSettings.annCode;
                        }
                    }
                } catch (err) {}
            });
            observer.observe(document.body, { childList: true, subtree: true });
        })();
    

        (function initSmartAnnouncement() {
            let lastCheckedAnnId = null;
            function showAnnouncement(content, annId) {
                if (!content || !annId) return;
                try {
                    const seenId = localStorage.getItem('seen_ann_id');
                    if (seenId === String(annId)) return;
                    const oldModal = document.getElementById('smart-announcement-modal');
                    if (oldModal) oldModal.remove();

                    const modal = document.createElement('div');
                    modal.id = 'smart-announcement-modal';
                    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 transition-opacity duration-300 opacity-0';
                    modal.innerHTML = `
                        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden w-full max-w-xl relative border border-slate-100 dark:border-slate-700">
                            <button id="close-ann-btn" class="absolute top-3 left-3 z-20 bg-black/40 hover:bg-rose-600 text-white rounded-full p-1.5 transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                            <div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 relative z-20">
                                <div id="ann-progress" class="bg-emerald-500 h-full w-full origin-right transition-transform" style="transition-duration: 15000ms; transition-timing-function: linear;"></div>
                            </div>
                            <div class="p-6 max-h-[85vh] overflow-y-auto text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center text-center font-medium relative z-10">
                                ${content}
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);
                    setTimeout(() => modal.classList.remove('opacity-0'), 50);

                    const closeModal = () => {
                        localStorage.setItem('seen_ann_id', String(annId));
                        modal.classList.add('opacity-0');
                        setTimeout(() => modal.remove(), 300);
                    };

                    modal.querySelector('#close-ann-btn').onclick = closeModal;

                    setTimeout(() => {
                        const prog = modal.querySelector('#ann-progress');
                        if (prog) prog.style.transform = 'scaleX(0)';
                    }, 100);

                    setTimeout(() => {
                        if (document.getElementById('smart-announcement-modal')) closeModal();
                    }, 15000);
                } catch (err) {}
            }

            setInterval(() => {
                try {
                    if (window.globalSettings && window.globalSettings.annCode && window.globalSettings.annId) {
                        if (lastCheckedAnnId !== window.globalSettings.annId) {
                            lastCheckedAnnId = window.globalSettings.annId;
                            showAnnouncement(window.globalSettings.annCode, window.globalSettings.annId);
                        }
                    }
                } catch (e) {}
            }, 3000);
        })();
    

        (function initLongPressCopy() {
            let pressTimer = null;
            let targetEl = null;
            let startX = 0, startY = 0;
            let isPressing = false;

            const getCopyableTarget = (el) => {
                // 1. استهداف نصوص المنشورات (الأساسية والمُعاد مشاركتها)
                const postText = el.closest('div[dir="auto"].whitespace-pre-wrap');
                if (postText) return postText;
                
                // 2. استهداف نصوص التعليقات
                const commentText = el.closest('p.break-words');
                if (commentText && commentText.closest('[id*="comment-"]')) return commentText;
                
                return null;
            };

            const startPress = (e) => {
                // منع التفعيل إلا بالزر الأيسر للماوس أو اللمس
                if (e.type === 'mousedown' && e.button !== 0) return;
                
                const validTarget = getCopyableTarget(e.target);
                if (!validTarget) return;

                // استثناء الروابط والهاشتاجات والأزرار عشان متتعارضش مع الضغط المطول
                if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

                targetEl = validTarget;
                isPressing = true;
                
                startX = e.touches ? e.touches[0].clientX : e.clientX;
                startY = e.touches ? e.touches[0].clientY : e.clientY;

                pressTimer = setTimeout(() => {
                    if (!isPressing) return;
                    
                    let textToCopy = targetEl.innerText.trim();

                    if(textToCopy) {
                        navigator.clipboard.writeText(textToCopy).then(() => {
                            if (window.showToast) window.showToast('تم نسخ النص بنجاح!', 'success');
                            if (navigator.vibrate) navigator.vibrate(50); // اهتزاز خفيف للموبايل
                            
                            // وميض أخضر للدلالة على نجاح النسخ
                            const originalBg = targetEl.style.backgroundColor;
                            const originalTrans = targetEl.style.transition;
                            targetEl.style.transition = 'background-color 0.3s ease';
                            targetEl.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
                            
                            // إزالة التحديد الافتراضي للنص عشان شكل الشاشة يفضل نظيف
                            if (window.getSelection) window.getSelection().removeAllRanges();

                            setTimeout(() => { 
                                targetEl.style.backgroundColor = originalBg; 
                                setTimeout(() => targetEl.style.transition = originalTrans, 300);
                            }, 300);
                        }).catch(() => {
                            if (window.showToast) window.showToast('فشل النسخ', 'error');
                        });
                    }
                    isPressing = false;
                }, 550); // 550 ملي ثانية (الوقت المثالي للضغط المطول)
            };

            const cancelPress = (e) => {
                if (!isPressing) return;

                if (e && (e.type === 'touchmove' || e.type === 'mousemove')) {
                    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
                    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
                    // إلغاء الضغطة لو المستخدم بيعمل سكرول عشان ما ينسخ وهو بيقلب في الصفحة
                    if (Math.abs(currentX - startX) > 10 || Math.abs(currentY - startY) > 10) {
                        clearTimeout(pressTimer);
                        isPressing = false;
                    }
                    return;
                }
                clearTimeout(pressTimer);
                isPressing = false;
            };

            // ربط الأحداث بكامل المستند (Event Delegation) ليعمل مع كل المنشورات تلقائياً
            document.addEventListener('mousedown', startPress);
            document.addEventListener('touchstart', startPress, {passive: true});
            
            document.addEventListener('mouseup', cancelPress);
            document.addEventListener('touchend', cancelPress);
            document.addEventListener('touchmove', cancelPress, {passive: true});
            document.addEventListener('mousemove', cancelPress, {passive: true});
            document.addEventListener('mouseleave', cancelPress);
        })();

        window.togglePinPost = async (postId) => {
            const post = allPosts.find(p => p.id === postId);
            if (!post || post.authorId !== currentUser.uid) return;
            
            const newPinnedState = !post.isPinned;
            
            try {
                // 1. تحديث البيانات محلياً فوراً
                if (newPinnedState) {
                    allPosts.forEach(p => {
                        if (p.authorId === currentUser.uid && p.isPinned) p.isPinned = false;
                    });
                }
                post.isPinned = newPinnedState;
                
                // 2. تحديث الشاشة فوراً ليتغير لون الدبوس ويقفز المنشور للأعلى
                if (typeof renderAll === 'function') renderAll();
                
                // 3. الحفظ في قاعدة البيانات في الخلفية بدون انتظار الواجهة
                if (newPinnedState) {
                    const pinnedQuery = allPosts.filter(p => p.authorId === currentUser.uid && p.id !== postId);
                    for (const p of pinnedQuery) {
                        try { window.setDoc(window.doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', p.id), { isPinned: false }, { merge: true }); } catch(e){}
                    }
                }
                await window.setDoc(window.doc(db, 'artifacts', appIdStr, 'public', 'data', 'posts', postId), { isPinned: newPinnedState }, { merge: true });
                
                showToast(newPinnedState ? 'تم تثبيت المنشور بنجاح' : 'تم إلغاء التثبيت', 'success');
            } catch (e) {
                console.error(e);
                showToast('حدث خطأ أثناء التثبيت', 'error');
            }
        };
    

        (function initMentions() {
            const dropdown = document.getElementById('mentions-dropdown');
            let currentTarget = null;
            let currentCursorPos = -1;
            let startIndex = -1;

            // 1. مراقبة الكتابة في أي حقل نصي
            document.addEventListener('input', function(e) {
                if (e.target.tagName === 'TEXTAREA') {
                    const val = e.target.value;
                    const pos = e.target.selectionStart;
                    const textUpToCursor = val.substring(0, pos);
                    
                    // اصطياد علامة @ وبعدها حروف (عربي أو إنجليزي)
                    const match = textUpToCursor.match(/(?:^|\s)@([a-zA-Z\u0600-\u06FF\s]*)$/);

                    if (match) {
                        currentTarget = e.target;
                        startIndex = match.index + (textUpToCursor[match.index] === ' ' || textUpToCursor[match.index] === '\n' ? 1 : 0);
                        currentCursorPos = pos;
                        showDropdown(match[1].trim());
                    } else {
                        hideDropdown();
                    }
                }
            });

            // 2. إظهار قائمة الأصدقاء المنسدلة
            function showDropdown(query) {
                if (!window.userData || !window.userData.friends || !window.allUsers) return;
                
                const q = query.toLowerCase();
                // فلترة الأصدقاء فقط
                const friends = window.userData.friends
                    .map(id => window.allUsers.find(u => u.uid === id))
                    .filter(u => u && u.displayName.toLowerCase().includes(q));

                if (friends.length === 0) {
                    hideDropdown();
                    return;
                }

                // رسم القائمة
                dropdown.innerHTML = friends.map(f => `
                    <div class="mention-item p-3 hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0" data-uid="${f.uid}" data-name="${f.displayName}">
                        <img src="${f.photoURL || 'https://i.ibb.co/6PzLgKx/default-avatar.png'}" class="w-8 h-8 rounded-full object-cover shadow-sm">
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-200">${f.displayName}</span>
                    </div>
                `).join('');

                // ضبط موضع القائمة العائمة لتكون تحت حقل الإدخال
                const rect = currentTarget.getBoundingClientRect();
                dropdown.style.top = (rect.bottom + 5) + 'px';
                dropdown.style.left = (rect.left + 10) + 'px';
                dropdown.classList.remove('hidden');

                // تفعيل النقر على الصديق
                dropdown.querySelectorAll('.mention-item').forEach(item => {
                    item.addEventListener('click', function() {
                        insertMention(this.dataset.name, this.dataset.uid);
                    });
                });
            }

            function hideDropdown() {
                dropdown.classList.add('hidden');
            }

            // 3. إدراج اسم الصديق وتخزين الـ UID للإشعارات
            function insertMention(name, uid) {
                if (!currentTarget) return;
                const val = currentTarget.value;
                const before = val.substring(0, startIndex);
                const after = val.substring(currentCursorPos);
                
                // إدراج الاسم وتحويل المسافات لشرطة سفلية (مثال: @Ahmed_Ali) لتمييزه ككتلة واحدة
                currentTarget.value = before + '@' + name.replace(/\s+/g, '_') + ' ' + after;
                currentTarget.focus();
                
                // تخزين المعرف (UID) الخاص بالصديق داخل الـ dataset لنستخدمه وقت النشر
                let mentionedUids = currentTarget.dataset.mentions ? currentTarget.dataset.mentions.split(',') : [];
                if (!mentionedUids.includes(uid)) mentionedUids.push(uid);
                currentTarget.dataset.mentions = mentionedUids.join(',');

                hideDropdown();
            }

            // إخفاء القائمة عند النقر خارجها
            document.addEventListener('click', e => {
                if (!dropdown.contains(e.target)) hideDropdown();
            });

            // 4. تلوين المنشن في المنشورات تلقائياً (تجاوز دالة التنسيق الأصلية)
            setTimeout(() => {
                if (window.formatPostContent) {
                    const originalFormat = window.formatPostContent;
                    window.formatPostContent = function(text) {
                        let formatted = originalFormat(text);
                        // البحث عن أي كلمة تبدأ بـ @ وتلوينها بالأخضر
                        formatted = formatted.replace(/@([a-zA-Z\u0600-\u06FF_]+)/g, '<span class="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md shadow-sm cursor-pointer">@$1</span>');
                        return formatted;
                    };
                }
            }, 2000);
        })();
    

        // سكريبت ذكي لإضافة متجر التطبيقات بجوار اسم المطور في جميع الفوترات
        document.addEventListener("DOMContentLoaded", () => {
            document.querySelectorAll('footer .flex-wrap').forEach(container => {
                if (!container.innerHTML.includes('anubis-apps')) {
                    const storeLink = `<span class="hidden sm:block text-slate-300 dark:text-slate-600">|</span> <a href="https://anubis-apps.netlify.app/" target="_blank" class="flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> <span>متجر تطبيقاتنا</span></a>`;
                    
                    // البحث عن عنصر اسم المطور
                    const devNode = Array.from(container.children).find(el => el.innerHTML.includes('تطوير خالد'));
                    if (devNode) {
                        devNode.insertAdjacentHTML('afterend', storeLink);
                    }
                }
            });
        });