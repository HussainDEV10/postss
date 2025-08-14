import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = { /* نفس الإعدادات السابقة */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// عناصر DOM
const usernameDisplay = document.getElementById('usernameDisplay');
const postList = document.getElementById('postList');
const overlay = document.getElementById('overlay');
const addPostBtn = document.getElementById('addPostBtn');
const closeBtn = document.getElementById('closeBtn');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const postFileInput = document.getElementById('postFile');
const notificationContainer = document.getElementById('notificationContainer');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const profileIcon = document.querySelector(".profile-icon");
const profileInfo = document.getElementById("profile-info");
const profileUsername = document.getElementById("profileUsername");
const postCount = document.getElementById("postCount");

let lastDeletedPost = null;
let currentUserEmail = null;
let currentUserName = null;

// Profile toggle
profileIcon.addEventListener("click", () => profileInfo.classList.toggle("hidden"));

// Theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) document.body.classList.add(savedTheme);
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme');
});

// Notifications
const showNotification = (msg) => {
    const n = document.createElement('div');
    n.className = 'notification show';
    n.innerText = msg;
    notificationContainer.appendChild(n);
    setTimeout(()=> n.remove(),3000);
};

// Convert links
function convertToLinks(text){ return text.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank">$1</a>'); }

// Display posts
const displayPosts = async () => {
    const snapshot = await getDocs(collection(db, "posts"));
    postList.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const timestamp = data.timestamp?.seconds ? new Date(data.timestamp.seconds*1000) : new Date();
        const formattedDateTime = timestamp.toLocaleString('ar-EG', {hour12:true});
        const postItem = document.createElement('li');
        postItem.className = 'post-item';
        // Like/Dislike count default
        if(!data.likes) data.likes={}; if(!data.dislikes) data.dislikes={};
        const likeCount = Object.keys(data.likes).length;
        const dislikeCount = Object.keys(data.dislikes).length;
        const liked = data.likes[currentUserEmail] ? 'liked' : '';
        const disliked = data.dislikes[currentUserEmail] ? 'disliked' : '';

        postItem.innerHTML = `
            ${currentUserEmail===data.authorEmail? `<button class="delete-btn" data-id="${docSnap.id}"></button>`: ''}
            <h3>${data.title}</h3>
            <p>${convertToLinks(data.description)}</p>
            ${data.fileUrl ? (data.fileType==='image'? `<img src="${data.fileUrl}" style="max-width:100%">`:`<video src="${data.fileUrl}" controls style="max-width:100%"></video>`) : ''}
            <p>من: ${data.author || 'مستخدم'}</p>
            <p class="post-time">${formattedDateTime}</p>
            <div class="post-buttons">
                <button class="like-btn ${liked}" data-id="${docSnap.id}">👍 ${likeCount}</button>
                <button class="dislike-btn ${disliked}" data-id="${docSnap.id}">👎 ${dislikeCount}</button>
            </div>
        `;
        postList.appendChild(postItem);
    });
};

// Like/Dislike logic
document.addEventListener('click', async e => {
    const postId = e.target.dataset.id;
    if(e.target.classList.contains('like-btn') || e.target.classList.contains('dislike-btn')){
        const postRef = doc(db,"posts",postId);
        const docSnap = await getDoc(postRef);
        if(!docSnap.exists()) return;
        const data = docSnap.data();
        if(!data.likes) data.likes={};
        if(!data.dislikes) data.dislikes={};
        // Toggle
        if(e.target.classList.contains('like-btn')){
            if(data.likes[currentUserEmail]) { delete data.likes[currentUserEmail]; }
            else { data.likes[currentUserEmail]=true; delete data.dislikes[currentUserEmail]; }
        } else {
            if(data.dislikes[currentUserEmail]) { delete data.dislikes[currentUserEmail]; }
            else { data.dislikes[currentUserEmail]=true; delete data.likes[currentUserEmail]; }
        }
        await updateDoc(postRef,{likes:data.likes, dislikes:data.dislikes});
        displayPosts();
    }
});

// Add post
addPostBtn.addEventListener('click',()=>overlay.classList.add('show'));
closeBtn.addEventListener('click',()=>overlay.classList.remove('show'));
publishBtn.addEventListener('click', async ()=>{
    const title = postTitleInput.value.trim();
    const desc = postDescriptionInput.value.trim();
    const file = postFileInput.files[0];
    if(!title || !desc) { showNotification('املأ جميع الحقول'); return; }
    let fileUrl=''; let fileType='';
    if(file){
        const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef,file);
        fileUrl = await getDownloadURL(storageRef);
        fileType = file.type.startsWith('image/')?'image':'video';
    }
    await addDoc(collection(db,"posts"),{
        title, description:desc, author:currentUserName, authorEmail:currentUserEmail,
        fileUrl, fileType, timestamp:serverTimestamp(), likes:{}, dislikes:{}
    });
    overlay.classList.remove('show');
    postTitleInput.value=''; postDescriptionInput.value=''; postFileInput.value='';
    displayPosts();
});

// Delete post
document.addEventListener('click', async e=>{
    if(e.target.classList.contains('delete-btn')){
        const postRef = doc(db,"posts",e.target.dataset.id);
        const postSnap = await getDoc(postRef);
        if(postSnap.exists()){
            lastDeletedPost = {id:e.target.dataset.id, data:postSnap.data()};
            await deleteDoc(postRef);
            showNotification("تم حذف المنشور");
            displayPosts();
        }
    }
});

// Auth
onAuthStateChanged(auth,user=>{
    if(user){
        currentUserEmail=user.email;
        getDoc(doc(db,"users",user.uid)).then(d=>{
            if(d.exists()) { currentUserName=d.data().username; usernameDisplay.textContent=currentUserName; }
        });
        displayPosts();
    } else { window.location.href='https://hussaindev10.github.io/Dhdhririeri/'; }
});

logoutBtn.addEventListener('click',async ()=>{
    await signOut(auth);
    window.location.href='https://hussaindev10.github.io/Dhdhririeri/';
});
