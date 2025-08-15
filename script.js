// ======================== استدعاء Firebase ========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";  
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";  
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";  
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";  

const firebaseConfig = {  
    apiKey: "AIzaSyBwIhzy0_RBqhMBlvJxbs5_760jP-Yv2fw",  
    authDomain: "facebookweb-2030.firebaseapp.com",  
    projectId: "facebookweb-2030",  
    storageBucket: "facebookweb-2030.appspot.com",  
    messagingSenderId: "912333220741",  
    appId: "1:912333220741:web:1c7425f4248b7465b45c67",  
    measurementId: "G-ZJ6M2D8T3M"  
};  

const app = initializeApp(firebaseConfig);  
const db = getFirestore(app);  
const auth = getAuth(app);  
const storage = getStorage(app);  

// ======================== عناصر HTML ========================
const usernameDisplay = document.getElementById('usernameDisplay');  
const postList = document.getElementById('postList');  
const overlay = document.getElementById('overlay');  
const addPostBtn = document.getElementById('addPostBtn');  
const closeBtn = document.getElementById('closeBtn');  
const publishBtn = document.getElementById('publishBtn');  
const postTitleInput = document.getElementById('postTitle');  
const postDescriptionInput = document.getElementById('postDescription');  
const postFileInput = document.getElementById('postFile');  
const tagsContainer = document.getElementById('tagsContainer'); // حقل الوسوم  
const notificationContainer = document.getElementById('notificationContainer');  
const logoutBtn = document.getElementById('logoutBtn');  
let lastDeletedPost = null;  

// أيقونات وحساب  
const themeToggleBtn = document.getElementById('themeToggleBtn');  
const profileIcon = document.querySelector(".profile-icon");  
const profileInfo = document.getElementById("profile-info");  
const profileUsername = document.getElementById("profileUsername");  
const postCount = document.getElementById("postCount");  

profileIcon.addEventListener("click", () => {  
    profileInfo.classList.toggle("hidden");  
});  

// ======================== الوسوم ========================
const allTags = [
    "أخبار","ترفيه","رياضة","تقنية","فن","موسيقى","طعام",
    "سفر","تصميم","ألعاب","تعليم","صحة","موضة","كوميديا","حياة","قصص","فيديو","صور","علم","مناسبات"
];

// ألوان الوسوم
const tagColors = {  
    "أخبار": "#FFB6C1", "ترفيه": "#FFD700", "رياضة": "#87CEFA", "تقنية": "#98FB98",   
    "فن": "#FFA07A", "موسيقى": "#EE82EE", "طعام": "#FFE4B5", "سفر": "#AFEEEE",  
    "تصميم": "#F0E68C", "ألعاب": "#F5DEB3", "تعليم": "#B0E0E6", "صحة": "#90EE90",  
    "موضة": "#FFB347", "كوميديا": "#FFD1DC", "حياة": "#FFEFD5", "قصص": "#E6E6FA",  
    "فيديو": "#B0C4DE", "صور": "#FFFACD", "علم": "#C1FFC1", "مناسبات": "#FFDAB9"  
};  

// ======================== وظائف الوسوم ========================

// خلط الوسوم
function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

// إنشاء زر وسم
function createTagButton(tagName) {
    const btn = document.createElement("button");
    btn.className = "tag-btn";
    btn.textContent = tagName;
    btn.style.backgroundColor = tagColors[tagName] || "#555";
    btn.addEventListener("click", () => btn.classList.toggle("selected"));
    return btn;
}

// عرض أول 3 وسوم + زر +X
function showRandomTags() {
    tagsContainer.innerHTML = "";
    const shuffled = shuffle([...allTags]);
    const visibleTags = shuffled.slice(0, 3);
    const hiddenTags = shuffled.slice(3);

    visibleTags.forEach(tag => tagsContainer.appendChild(createTagButton(tag)));

    if (hiddenTags.length > 0) {
        const showMoreBtn = document.createElement("button");
        showMoreBtn.id = "showMoreTagsBtn";
        showMoreBtn.textContent = `+${hiddenTags.length}`;
        showMoreBtn.addEventListener("click", () => showAllTags(hiddenTags, showMoreBtn));
        tagsContainer.appendChild(showMoreBtn);
    }
}

// عرض الوسوم تدريجياً
function showAllTags(hiddenTags, button) {
    button.remove();
    hiddenTags.forEach((tag, index) => {
        setTimeout(() => {
            const btn = createTagButton(tag);
            btn.classList.add("hidden");
            tagsContainer.appendChild(btn);
            setTimeout(() => {
                btn.classList.remove("hidden");
                btn.classList.add("fade-in");
            }, 50);
        }, index * 100);
    });
}

// ======================== تحديث بيانات المستخدم ========================
const updateProfileInfo = async () => {  
    const currentUser = auth.currentUser;  
    if (currentUser) {  
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));  
        if (userDoc.exists()) profileUsername.textContent = userDoc.data().username || "مستخدم";  

        const querySnapshot = await getDocs(collection(db, "posts"));  
        const userPosts = querySnapshot.docs.filter(doc => doc.data().authorEmail === currentUser.email);  
        postCount.textContent = `عدد المنشورات: ${userPosts.length}`;  
    }  
};  

onAuthStateChanged(auth, (user) => { if (user) updateProfileInfo(); });  

// ======================== الوضع الداكن ========================
const savedTheme = localStorage.getItem('theme');  
if (savedTheme) {  
    document.body.classList.add(savedTheme);  
    themeToggleBtn.textContent = savedTheme === 'dark-theme' ? '🌙' : '🌑';  
}  
themeToggleBtn.addEventListener('click', () => {  
    document.body.classList.toggle('dark-theme');  
    if (document.body.classList.contains('dark-theme')) {  
        localStorage.setItem('theme', 'dark-theme');  
        themeToggleBtn.textContent = '🌙';  
    } else {  
        localStorage.setItem('theme', 'light-theme');  
        themeToggleBtn.textContent = '🌑';  
    }  
});  

// ======================== إشعارات ========================
const showNotification = (message, type) => {  
    const notification = document.createElement('div');  
    notification.classList.add('notification');  
    notification.innerHTML = `  
        <span>${message}</span>  
        ${type === 'delete' ? '<button class="undo-btn" id="undoBtn">إسترجاع</button>' : ''}  
        <div class="underline"></div>  
    `;  
    notificationContainer.innerHTML = '';  
    notificationContainer.appendChild(notification);  

    setTimeout(() => notification.classList.add('show'), 10);  
    setTimeout(() => notification.classList.add('hide'), 5000);  
    setTimeout(() => notification.remove(), 5500);  

    if (type === 'delete') document.getElementById('undoBtn').addEventListener('click', undoDelete);  
};  

const undoDelete = async () => {  
    if (lastDeletedPost) {  
        await setDoc(doc(db, "posts", lastDeletedPost.id), lastDeletedPost.data);  
        showNotification('تم إسترجاع المنشور', 'restore');  
        displayPosts();  
        lastDeletedPost = null;  
    }  
};  

// ======================== عرض المنشورات ========================
function convertToLinks(text) {  
    const urlPattern = /(https?:\/\/[^\s]+)/g;  
    return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');  
}  

const displayPosts = async () => {  
    try {  
        const querySnapshot = await getDocs(collection(db, "posts"));  
        postList.innerHTML = '';  
        const currentUserEmail = localStorage.getItem('email');  

        querySnapshot.forEach((doc) => {  
            const data = doc.data();  
            const timestamp = new Date(data.timestamp.seconds * 1000);  
            const day = timestamp.getDate().toString().padStart(2,'0');  
            const month = (timestamp.getMonth()+1).toString().padStart(2,'0');  
            const year = timestamp.getFullYear();  
            const arabicDigits = '٠١٢٣٤٥٦٧٨٩';  
            const formattedDate = `${day}/${month}/${year}`;  
            const arabicFormattedDate = formattedDate.replace(/\d/g, d => arabicDigits[d]);  
            const hours = timestamp.getHours() % 12 || 12;  
            const minutes = timestamp.getMinutes().toString().padStart(2,'0');  
            const period = timestamp.getHours() >= 12 ? 'م' : 'ص';  
            const formattedDateTime = `<span dir="rtl">${arabicFormattedDate}</span> | ${hours.toString().padStart(2,'0')}:${minutes} ${period}`;  

            const firstTag = data.tags && data.tags.length > 0 ? data.tags[0] : '';  
            const remainingTags = data.tags && data.tags.length > 1 ? data.tags.slice(1) : [];  
            let tagHTML = '';  
            if (firstTag) {  
                tagHTML = `<span class="post-tag" style="background-color:${tagColors[firstTag] || '#ccc'}">${firstTag}</span>`;  
                if (remainingTags.length) tagHTML += ` <span class="more-tags" style="cursor:pointer; color:#555">...</span>`;  
            }  

            const postItem = document.createElement('li');  
            postItem.classList.add('post-item');  
            postItem.innerHTML = `  
                ${currentUserEmail === data.authorEmail ? `<button class="delete-btn" data-id="${doc.id}"></button>` : ''}  
                <h3 class="post-title">${data.title}</h3>  
                <p class="post-description">${convertToLinks(data.description)}</p>  
                data.fileUrl ? (data.fileType==='image'? 
    `<img data-src="${data.fileUrl}" class="post-media lazyload" loading="lazy"/>` : 
    `<video data-src="${data.fileUrl}" controls class="post-media lazyload" preload="none"></video>`) 
: ''  
                <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>  
                <p class="post-time">${formattedDateTime} ${tagHTML}</p>  
            `;  
            postList.appendChild(postItem);  

            const moreTagsSpan = postItem.querySelector(".more-tags");  
            if (moreTagsSpan) {  
                moreTagsSpan.addEventListener("click", () => {  
                    const tagsList = remainingTags.map(tag => `<span class="post-tag" style="background-color:${tagColors[tag] || '#ccc'}; margin-left:2px">${tag}</span>`).join('');  
                    const popup = document.createElement("div");  
                    popup.classList.add("tags-popup");  
                    popup.style.position = "absolute";  
                    popup.style.background = "#fff";  
                    popup.style.border = "1px solid #ccc";  
                    popup.style.padding = "5px";  
                    popup.style.borderRadius = "5px";  
                    popup.style.zIndex = "999";  
                    popup.innerHTML = tagsList;  
                    moreTagsSpan.parentElement.appendChild(popup);  

                    document.addEventListener("click", function removePopup(e) {  
                        if (!popup.contains(e.target) && e.target !== moreTagsSpan) {  
                            popup.remove();  
                            document.removeEventListener("click", removePopup);  
                        }  
                    });  
                });  
            }  
        });  
    } catch (error) {  
        showNotification("حدث خطأ أثناء تحميل المنشورات", "error");  
    }  
};  

// ================= Lazy Loading للصور والفيديوهات =================
const lazyLoadMedia = () => {
    const lazyElements = document.querySelectorAll('.lazyload');

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                if (el.tagName === 'IMG') el.src = el.dataset.src;
                if (el.tagName === 'VIDEO') el.src = el.dataset.src;
                el.classList.remove('lazyload');
                obs.unobserve(el);
            }
        });
    }, {
        rootMargin: "100px 0px", // يبدأ التحميل قبل الظهور
        threshold: 0.1
    });

    lazyElements.forEach(el => observer.observe(el));
};

// استدعاء lazy load بعد عرض المنشورات
const displayPostsAndLazyLoad = async () => {
    await displayPosts();
    lazyLoadMedia();
};


// ======================== فتح/إغلاق نافذة إضافة منشور ========================
addPostBtn.addEventListener('click', () => { 
    overlay.classList.add('show'); 
    showRandomTags(); // عرض الوسوم عند فتح النافذة
});  
closeBtn.addEventListener('click', () => overlay.classList.remove('show'));  

// ======================== إضافة منشور ========================
const addPost = async () => {  
    const title = postTitleInput.value.trim();  
    const description = postDescriptionInput.value.trim();  
    const author = localStorage.getItem('username');  
    const authorEmail = localStorage.getItem('email');  
    const file = postFileInput.files[0];  
    const selectedTags = Array.from(tagsContainer.querySelectorAll(".tag-btn.selected")).map(btn => btn.textContent);  

    if (title && description && author && authorEmail) {  
        let fileUrl = '';  
        let fileType = '';  

        if (file) {  
            const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);  
            await uploadBytes(storageRef, file);  
            fileUrl = await getDownloadURL(storageRef);  
            fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : '');  
        }  

        await addDoc(collection(db, "posts"), {  
            title, description, author, authorEmail, fileUrl, fileType,  
            tags: selectedTags, timestamp: serverTimestamp()  
        });  

        showNotification("تم نشر المنشور بنجاح", "success");  
        overlay.classList.remove('show');  
        postTitleInput.value = '';  
        postDescriptionInput.value = '';  
        postFileInput.value = '';  
        tagsContainer.querySelectorAll(".tag-btn.selected").forEach(btn => btn.classList.remove("selected"));  
        displayPosts();  
    } else {  
        showNotification("يرجى ملء جميع الحقول", "error");  
    }  
};  

publishBtn.addEventListener('click', addPost);  

// ======================== تسجيل الخروج ========================
logoutBtn.addEventListener('click', async () => {  
    await signOut(auth);  
    localStorage.removeItem('email');  
    localStorage.removeItem('username');  
    window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';  
});  

// ======================== التحقق من تسجيل الدخول ========================
const checkAuthState = () => {  
    onAuthStateChanged(auth, (user) => {  
        if (user) {  
            localStorage.setItem('email', user.email);  
            getDoc(doc(db, "users", user.uid)).then((doc) => {  
                if (doc.exists()) {  
                    const userData = doc.data();  
                    localStorage.setItem('username', userData.username);  
                    usernameDisplay.textContent = userData.username || "مستخدم";  
                }  
            });  
            displayPosts();  
        } else {  
            window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';  
        }  
    });  
};  

checkAuthState();  

// ======================== حذف المنشورات ========================
document.addEventListener('click', async (event) => {  
    if (event.target.classList.contains('delete-btn')) {  
        const postId = event.target.getAttribute('data-id');  
        const postRef = doc(db, "posts", postId);  
        try {  
            const postDoc = await getDoc(postRef);  
            if (postDoc.exists()) {  
                lastDeletedPost = { id: postId, data: postDoc.data() };  
                await deleteDoc(postRef);  
                showNotification("تم حذف المنشور", "delete");  
                displayPosts();  
            }  
        } catch (error) {  
            showNotification("حدث خطأ أثناء حذف المنشور", "error");  
        }  
    }  
});  

// ======================== نهاية الكود ========================
// الآن الكود متكامل ويحتوي على:
// 1. Firebase: auth, firestore, storage
// 2. عرض المنشورات مع الوسوم
// 3. زر +X لعرض المزيد من الوسوم
// 4. دعم الوضع الداكن والفاتح
// 5. إشعارات مع زر إسترجاع عند الحذف
// 6. إضافة منشورات جديدة مع اختيار وسوم متعددة وصور/فيديو
// 7. تسجيل خروج وإعادة التوجيه
// 8. تحديث معلومات المستخدم وعدد المنشورات
