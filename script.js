import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

// ------------------ إعداد Firebase ------------------
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

// ------------------ عناصر DOM ------------------
const postList = document.getElementById('postList');
const overlay = document.getElementById('overlay');
const addPostBtn = document.getElementById('addPostBtn');
const closeBtn = document.getElementById('closeBtn');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const postFileInput = document.getElementById('postFile');

const editOverlay = document.getElementById('editOverlay');
const closeEditBtn = document.getElementById('closeEditBtn');
const editPostTitle = document.getElementById('editPostTitle');
const editPostDescription = document.getElementById('editPostDescription');
const publishEditBtn = document.getElementById('publishEditBtn');

const notificationContainer = document.getElementById('notificationContainer');
const logoutBtn = document.getElementById('logoutBtn');

const themeToggleBtn = document.getElementById('themeToggleBtn');

const profileIcon = document.querySelector(".profile-icon");
const profileInfo = document.getElementById("profile-info");
const profileUsername = document.getElementById("profileUsername");
const postCount = document.getElementById("postCount");

const confirmOverlay = document.getElementById("confirmOverlay");
const confirmMessage = document.getElementById("confirmMessage");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

let lastDeletedPost = null;
let editingPostId = null;
let unsubscribePosts = null;

// ------------------ إشعارات قابلة للسحب ------------------
const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `<span>${message}</span>`;
    notificationContainer.innerHTML = '';
    notificationContainer.appendChild(notification);

    // دعم السحب
    let startX = 0;
    notification.addEventListener("mousedown", e => startX = e.clientX);
    notification.addEventListener("mouseup", e => {
        const diff = e.clientX - startX;
        if(Math.abs(diff) > 100){
            notification.style.transform = `translateX(${diff>0?300:-300}px)`;
            notification.style.opacity = "0";
            setTimeout(()=>notification.remove(),300);
        }
    });

    setTimeout(()=>notification.classList.add('show'),10);
    setTimeout(()=>notification.classList.add('hide'),5000);
    setTimeout(()=>notification.remove(),5500);
};

// ------------------ Overlay تأكيد العمليات ------------------
function showConfirm(message, onConfirm){
    confirmMessage.textContent = message;
    confirmOverlay.classList.add("show");

    const yesHandler = ()=>{
        onConfirm();
        closeConfirm();
    };
    const noHandler = ()=> closeConfirm();

    confirmYes.addEventListener("click", yesHandler, {once:true});
    confirmNo.addEventListener("click", noHandler, {once:true});
}

function closeConfirm(){
    confirmOverlay.classList.remove("show");
}

// ------------------ الملف الشخصي ------------------
profileIcon.addEventListener("click", () => profileInfo.classList.toggle("hidden"));

const updateProfileInfo = async (user) => {
    if(!user) return;
    let username = localStorage.getItem('username');
    if(!username){
        try{
            const userDoc = await getDoc(doc(db,"users", user.uid));
            username = userDoc.exists()? userDoc.data().username || 'مستخدم':'مستخدم';
            localStorage.setItem('username', username);
        } catch(e){
            console.error(e);
            username = 'مستخدم';
        }
    }
    profileUsername.textContent = username;
    try{
        const q = query(collection(db,"posts"), where("authorEmail","==", user.email));
        const snap = await getDocs(q);
        postCount.textContent = `عدد المنشورات: ${snap.size}`;
    } catch(e){ postCount.textContent = `عدد المنشورات: -`; }
};

// ------------------ المستمع للمنشورات ------------------
const startPostsListener = () => {
    if(unsubscribePosts) unsubscribePosts();

    const postsCollection = collection(db, "posts");
    const postsQuery = query(postsCollection, orderBy("timestamp","desc"));

    unsubscribePosts = onSnapshot(postsQuery, snapshot => {
        postList.innerHTML = '';
        const currentUserEmail = localStorage.getItem('email');

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const timestamp = data.timestamp?.seconds ? new Date(data.timestamp.seconds*1000) : new Date();
            let hours = timestamp.getHours(), minutes = timestamp.getMinutes().toString().padStart(2,'0');
            const period = hours>=12?'م':'ص'; hours = hours%12||12;
            const day = timestamp.getDate().toString().padStart(2,'0');
            const month = (timestamp.getMonth()+1).toString().padStart(2,'0');
            const year = timestamp.getFullYear();
            const arabicDigits = str => str.replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
            const arabicFormattedDate = arabicDigits(`${day}/${month}/${year}`);
            const formattedTime = `${hours.toString().padStart(2,'0')}:${minutes} ${period}`;
            const formattedDateTime = `<span dir="rtl">${arabicFormattedDate}</span> | ${formattedTime}`;
            const editedText = data.edited ? `<p class="post-edited">(تم تعديله)</p>` : '';

            const postItem = document.createElement('li');
            postItem.classList.add('post-item');
            postItem.innerHTML = `
                ${currentUserEmail===data.authorEmail ? `
                    <button class="delete-btn" data-id="${docSnap.id}"></button>
                    <button class="edit-btn" data-id="${docSnap.id}"></button>` : ''}
                <h3 class="post-title">${data.title}</h3>
                <p class="post-description">${data.description}</p>
                ${data.fileUrl ? (data.fileType==='image'? `<img src="${data.fileUrl}" class="post-media">` : `<video src="${data.fileUrl}" class="post-media" controls></video>`) : ''}
                <p class="post-author">من قِبَل: ${data.author || 'مستخدم'}</p>
                ${editedText}
                <p class="post-time">${formattedDateTime}</p>
            `;
            postList.appendChild(postItem);
        });

        if(currentUserEmail && auth.currentUser) updateProfileInfo(auth.currentUser);
    });
};

// ------------------ إضافة منشور ------------------
const addPost = async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();
    const author = localStorage.getItem('username') || 'مستخدم';
    const authorEmail = localStorage.getItem('email');
    const file = postFileInput.files[0];

    if(!title || !description) return showNotification("يرجى ملء جميع الحقول","error");

    let fileUrl='', fileType='';
    if(file){
        const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef,file);
        fileUrl = await getDownloadURL(storageRef);
        fileType = file.type.startsWith('image/')?'image':'video';
    }

    await addDoc(collection(db,"posts"),{
        title, description, author, authorEmail, fileUrl, fileType, timestamp:serverTimestamp()
    });
    showNotification("تم نشر المنشور بنجاح","success");
    overlay.classList.remove('show');
    postTitleInput.value=''; postDescriptionInput.value=''; postFileInput.value='';
    if(auth.currentUser) updateProfileInfo(auth.currentUser);
};

// ------------------ زر إضافة منشور ------------------
addPostBtn.addEventListener('click',()=> overlay.classList.add('show'));
publishBtn.addEventListener('click', ()=> showConfirm("هل أنت متأكد من نشر هذا المنشور؟", addPost));
closeBtn.addEventListener('click',()=> overlay.classList.remove('show'));

// ------------------ تعديل وحذف المنشور ------------------
document.addEventListener('click', async event=>{
    const target = event.target;
    if(target.classList.contains('delete-btn')){
        const postId = target.dataset.id;
        showConfirm("هل أنت متأكد من حذف هذا المنشور؟", async ()=>{
            const postRef = doc(db,"posts",postId);
            const postDoc = await getDoc(postRef);
            if(postDoc.exists()){
                lastDeletedPost={id:postId,data:postDoc.data()};
                await deleteDoc(postRef);

                const notification = document.createElement('div');
                notification.classList.add('notification');
                notification.innerHTML = `<span>تم حذف المنشور</span><button id="undoDeleteBtn">استرجاع</button>`;
                notificationContainer.innerHTML = '';
                notificationContainer.appendChild(notification);
                document.getElementById("undoDeleteBtn").addEventListener("click", async ()=>{
                    if(lastDeletedPost){
                        await setDoc(doc(db,"posts",lastDeletedPost.id), lastDeletedPost.data);
                        showNotification("تم استرجاع المنشور","success");
                        lastDeletedPost=null;
                    }
                    notification.remove();
                });
            }
        });
    } else if(target.classList.contains('edit-btn')){
        const postId = target.dataset.id;
        const postRef = doc(db,"posts",postId);
        const postDoc = await getDoc(postRef);
        if(postDoc.exists()){
            editingPostId = postId;
            editPostTitle.value = postDoc.data().title;
            editPostDescription.value = postDoc.data().description;
            editOverlay.classList.add('show');
        }
    }
});

// ------------------ حفظ التعديل ------------------
publishEditBtn.addEventListener('click', ()=>{
    if(!editingPostId) return;
    showConfirm("هل أنت متأكد من تعديل هذا المنشور؟", async ()=>{
        const title = editPostTitle.value.trim();
        const description = editPostDescription.value.trim();
        if(!title || !description) return showNotification("يرجى ملء جميع الحقول","error");

        await setDoc(doc(db,"posts",editingPostId), {title, description, edited:true, editedAt:serverTimestamp()}, {merge:true});
        showNotification("تم تعديل المنشور بنجاح","success");
        editOverlay.classList.remove('show');
        editingPostId=null; editPostTitle.value=''; editPostDescription.value='';
    });
});
closeEditBtn.addEventListener('click',()=> {editOverlay.classList.remove('show'); editingPostId=null;});

// ------------------ تبديل المظهر ------------------
themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", document.body.classList.contains("dark-theme")?"dark":"light");
});
window.addEventListener("DOMContentLoaded", ()=>{
    if(localStorage.getItem("theme")==="dark") document.body.classList.add("dark-theme");
});

// ------------------ تسجيل الخروج ------------------
logoutBtn.addEventListener('click', async ()=>{
    await signOut(auth);
    localStorage.removeItem('email'); localStorage.removeItem('username');
    if(unsubscribePosts) unsubscribePosts();
    window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
});

// ------------------ التحقق من تسجيل الدخول ------------------
onAuthStateChanged(auth, async (user)=>{
    if(user){
        localStorage.setItem('email', user.email);
        try{
            const userDoc = await getDoc(doc(db,"users", user.uid));
            if(userDoc.exists()) localStorage.setItem('username', userDoc.data().username || 'مستخدم');
        } catch(e){ console.error(e); }
        startPostsListener();
        updateProfileInfo(user);
    } else {
        if(unsubscribePosts) unsubscribePosts();
        window.location.href='https://hussaindev10.github.io/Dhdhririeri/';
    }
});
