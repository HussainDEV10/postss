import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = { /* بيانات Firebase كما هي */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// عناصر DOM
const postList = document.getElementById('postList');
const overlay = document.getElementById('overlay');
const addPostBtn = document.getElementById('addPostBtn');
const closeBtn = document.getElementById('closeBtn');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const postFileInput = document.getElementById('postFile');
const postTagsInput = document.getElementById('postTags');
const notificationContainer = document.getElementById('notificationContainer');

let lastDeletedPost = null;
let tagColors = {}; 
const colorPalette = [
    "#e6194b","#3cb44b","#ffe119","#0082c8","#f58231","#911eb4","#46f0f0","#f032e6",
    "#d2f53c","#fabebe","#008080","#e6beff","#aa6e28","#fffac8","#800000","#aaffc3",
    "#808000","#ffd8b1","#000080","#808080","#FFFFFF","#000000","#ff9999","#99ff99",
    "#9999ff","#ffcc99","#66ff66","#ff66ff","#66ffff","#ff6666","#9966ff","#66ffcc",
    "#ffcc66","#ff9966","#6699ff","#cc66ff","#66ccff","#ccff66","#ff66cc","#cc6666",
    "#66cc66","#6666cc","#cc66cc","#66cccc","#cccc66","#ff6666","#66ff66","#6666ff","#ffccff","#ccffcc"
];

function convertToLinks(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
}

const displayPosts = async (filterTag = null) => {
    try {
        const querySnapshot = await getDocs(collection(db, "posts"));
        postList.innerHTML = '';
        const currentUserEmail = localStorage.getItem('email');

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (filterTag && !data.tags?.some(t => t.name === filterTag)) return;

            const timestamp = new Date(data.timestamp?.seconds * 1000 || Date.now());
            const formattedDateTime = `${timestamp.getDate().toString().padStart(2,'0')}/${(timestamp.getMonth()+1).toString().padStart(2,'0')}/${timestamp.getFullYear()} ${timestamp.getHours().toString().padStart(2,'0')}:${timestamp.getMinutes().toString().padStart(2,'0')}`;

            const postItem = document.createElement('li');
            postItem.classList.add('post-item');

            let tagsHTML = '';
            if (data.tags?.length) {
                tagsHTML = `<div class="post-tags">` + data.tags.map(t => `<span class="tag" style="background-color:${t.color}" data-tag="${t.name}">${t.name}</span>`).join('') + `</div>`;
            }

            postItem.innerHTML = `
                ${currentUserEmail === data.authorEmail ? `<button class="delete-btn" data-id="${docSnap.id}"></button>` : ''}
                <h3 class="post-title">${data.title}</h3>
                <p class="post-description">${convertToLinks(data.description)}</p>
                ${data.fileUrl ? (data.fileType === 'image' ? `<img src="${data.fileUrl}" class="post-media"/>` : `<video src="${data.fileUrl}" controls class="post-media"></video>`) : ''}
                <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
                <p class="post-time">${formattedDateTime}</p>
                ${tagsHTML}
            `;
            postList.appendChild(postItem);
        });

        document.querySelectorAll('.tag').forEach(tagEl => {
            tagEl.addEventListener('click', () => {
                const tagName = tagEl.dataset.tag;
                displayPosts(tagName);
            });
        });

    } catch (error) {
        console.error(error);
    }
};

publishBtn.addEventListener('click', async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();
    const author = localStorage.getItem('username');
    const authorEmail = localStorage.getItem('email');
    const file = postFileInput.files[0];
    let tags = postTagsInput.value.split(',').map(t => t.trim()).filter(t => t.length);

    if (title && description && author && authorEmail) {
        let fileUrl = '';
        let fileType = '';
        if (file) {
            const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            fileUrl = await getDownloadURL(storageRef);
            fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : '');
        }

        const tagsWithColors = tags.map(t => {
            if (!tagColors[t]) tagColors[t] = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            return { name: t, color: tagColors[t] };
        });

        await addDoc(collection(db, "posts"), {
            title,
            description,
            author,
            authorEmail,
            fileUrl,
            fileType,
            tags: tagsWithColors,
            timestamp: serverTimestamp()
        });

        overlay.classList.remove('show');
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        postFileInput.value = '';
        postTagsInput.value = '';
        displayPosts();
    }
});

addPostBtn.addEventListener('click', () => overlay.classList.add('show'));
closeBtn.addEventListener('click', () => overlay.classList.remove('show'));

onAuthStateChanged(auth, user => {
    if (user) {
        localStorage.setItem('email', user.email);
        localStorage.setItem('username', user.displayName || "مستخدم");
        displayPosts();
    } else {
        window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
    }
});
