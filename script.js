import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
    import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

    const postList = document.getElementById('postList');
    const overlay = document.getElementById('overlay');
    const addPostBtn = document.getElementById('addPostBtn');
    const closeBtn = document.getElementById('closeBtn');
    const publishBtn = document.getElementById('publishBtn');
    const postTitleInput = document.getElementById('postTitle');
    const postDescriptionInput = document.getElementById('postDescription');
    const postAuthorInput = document.getElementById('postAuthor');
    const notificationContainer = document.getElementById('notificationContainer');

    let lastDeletedPost = null;

const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `
        <span>${message}</span>
        ${type === 'delete' ? '<button class="undo-btn" id="undoBtn">إسترجاع</button>' : ''}
        <div class="underline"></div>
    `;
    notificationContainer.innerHTML = ''; // Clear existing notifications
    notificationContainer.appendChild(notification);

    let startX = 0;

    notification.addEventListener('touchstart', (event) => {
        startX = event.touches[0].clientX;
    });

    notification.addEventListener('touchmove', (event) => {
        const touch = event.touches[0];
        const diffX = touch.clientX - startX;
        notification.style.transform = `translate(${diffX}px, 0)`;
    });

    notification.addEventListener('touchend', () => {
        const finalPosition = parseFloat(notification.style.transform.split('(')[1]);

        // إذا كانت المسافة المقطوعة أكثر من 50 بيكسل في أي اتجاه، اختفي الإشعار بسرعة
        if (Math.abs(finalPosition) > 10) {
            notification.classList.add('hide');
            notification.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
            setTimeout(() => notification.remove(), 300); // إزالة الإشعار بعد 300 مللي ثانية
        } else {
            notification.style.transform = `translateX(0)`;
        }
    });

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => notification.classList.add('hide'), 5000);
    setTimeout(() => notification.remove(), 5500);

    if (type === 'delete') {
        document.getElementById('undoBtn').addEventListener('click', undoDelete);
    }
};
    const undoDelete = async () => {
        if (lastDeletedPost) {
            await setDoc(doc(db, "posts", lastDeletedPost.id), lastDeletedPost.data);
            showNotification('تم إسترجاع المنشور', 'restore');
            displayPosts();
            lastDeletedPost = null;
        }
    };
    
const settingsBtn = document.getElementById('settingsBtn');
const colorOptions = document.getElementById('colorOptions');
const colorOptionElems = document.querySelectorAll('.color-option');

settingsBtn.addEventListener('click', () => {
    colorOptions.style.display = colorOptions.style.display === 'none' ? 'flex' : 'none';
});

colorOptionElems.forEach(option => {
    option.addEventListener('click', (event) => {
        const selectedColor = event.target.dataset.color;

        let backgroundColor;
        let postColor;

        switch (selectedColor) {
            case '#0000ff': // اللون الأزرق
                backgroundColor = '#0000E6';
                postColor = '#0000ff';
                break;
            case '#ff0000': // اللون الأحمر
                backgroundColor = '#E60000';
                postColor = '#ff0000';
                break;
            case '#00ff00': // اللون الأخضر
                backgroundColor = '#00E600';
                postColor = '#00ff00';
                break;
            case '#ffff00': // اللون الأصفر
                backgroundColor = '#E6E600';
                postColor = '#ffff00';
                break;
            case '#ffffff': // اللون الأبيض
                backgroundColor = ''; // تعيين اللون الافتراضي لخلفية الموقع
                postColor = '#ffffff'; // تعيين اللون الأبيض للمنشورات
                break;
            default:
                backgroundColor = '#f4f4f4'; // اللون الافتراضي للخلفية
                postColor = '#e0e0e0'; // اللون الافتراضي للمنشورات
        }

        document.body.style.backgroundColor = backgroundColor;
        document.querySelectorAll('.post-item').forEach(post => {
            post.style.backgroundColor = postColor;
        });

        // إخفاء قائمة الألوان بعد اختيار اللون
        colorOptions.style.display = 'none';
    });
});    
    

const displayPosts = async () => {
    const querySnapshot = await getDocs(collection(db, "posts"));
    postList.innerHTML = '';
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = new Date(data.timestamp.seconds * 1000);

        // الحصول على الساعة والدقائق والثواني
        let hours = timestamp.getHours();
        const minutes = timestamp.getMinutes().toString().padStart(2, '0');
        const seconds = timestamp.getSeconds().toString().padStart(2, '0');

        // تحديد الصباح أو المساء
        const period = hours >= 12 ? 'م' : 'ص';

        // تحويل الساعة لنظام 12 ساعة
        hours = hours % 12 || 12; // تحويل الساعة لنظام 12 ساعة
        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${period}`;

        // تنسيق التاريخ
        const day = timestamp.getDate().toString().padStart(2, '0');
        const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
        const year = timestamp.getFullYear();
        const formattedDate = `${year}/${month}/${day}`;

        // تحويل الوقت والتاريخ إلى نصوص باللغة العربية مع الفواصل
        const arabicNumbers = (number) => {
            const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
            return number.split('').map(digit => arabicDigits[digit] || digit).join('');
        };

        // تنسيق الوقت والتاريخ مع الفواصل
        const arabicFormattedTime = arabicNumbers(formattedTime);
        const arabicFormattedDate = arabicNumbers(formattedDate);

        // دمج الوقت مع التاريخ باستخدام العلامة '|'
        const formattedDateTime = `
            <span dir="rtl">${arabicFormattedDate}</span> | ${arabicFormattedTime}
        `;

        const postItem = document.createElement('li');
        postItem.classList.add('post-item');
        postItem.style.fontFamily = 'Rubik, sans-serif'; // تطبيق خط Rubik
        postItem.innerHTML = `
            <button class="delete-btn" data-id="${doc.id}">🗑️</button>
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${data.description}</p>
            <p class="post-author">من قِبل: ${data.author}</p>
            <p class="post-time">${formattedDateTime}</p>
        `;
        postList.appendChild(postItem);
    });
};

    addPostBtn.addEventListener('click', () => {
        overlay.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('show');
    });

    publishBtn.addEventListener('click', async () => {
        const title = postTitleInput.value.trim();
        const description = postDescriptionInput.value.trim();
        const author = postAuthorInput.value.trim();
        if (title && description && author) {
            await addDoc(collection(db, "posts"), {
                title,
                description,
                author,
                timestamp: serverTimestamp()
            });
            postTitleInput.value = '';
            postDescriptionInput.value = '';
            postAuthorInput.value = '';
            overlay.classList.remove('show');
            showNotification('تم نشر المنشور بنجاح!', 'publish');
            displayPosts();
        }
    });

    postList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const postId = event.target.dataset.id;
            const postDoc = await getDoc(doc(db, "posts", postId));
            lastDeletedPost = { id: postId, data: postDoc.data() };
            await deleteDoc(doc(db, "posts", postId));
            showNotification('تم حذف المنشور', 'delete');
            displayPosts();
        }
    });

    displayPosts();