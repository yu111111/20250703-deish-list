const { createClient } = supabase;
const supabaseUrl = 'https://fkflxkqlamyvmjnqeuze.supabase.co';
const supabaseKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZmx4a3FsYW15dm1qbnFldXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0ODAyNzcsImV4cCI6MjA2NzA1NjI3N30.f95zy1UhNcQJyEpjW70UKjNpqWZ3rKRzYDD8Hzk1Wrg`;
const supabaseClient = createClient(supabaseUrl, supabaseKey);
console.log('Supabaseクライアントが初期化されました:', supabaseClient);

document.addEventListener('DOMContentLoaded', async () => {
    // 共通のDOM要素
    const userNameSpan = document.getElementById('user-name');
    const logoutButton = document.getElementById('logout-button');
    const settingsButton = document.getElementById('settings-button');

    // メインページのDOM要素
    const addItemForm = document.getElementById('add-item-form');
    const itemNameInput = document.getElementById('item-name');
    const priceInput = document.getElementById('price');
    const categoryInput = document.getElementById('category');
    const categoryFilterButtons = document.getElementById('category-filter-buttons');
    const itemList = document.getElementById('item-list');
    const completedItemList = document.getElementById('completed-item-list');
    const toggleCompletedButton = document.getElementById('toggle-completed');

    // モーダル関連のDOM要素
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-item-form');
    const editItemId = document.getElementById('edit-item-id');
    const editItemName = document.getElementById('edit-item-name');
    const editPrice = document.getElementById('edit-price');
    const editCategory = document.getElementById('edit-category');
    const closeModalButton = document.querySelector('.close-button');

    let currentListId = null;
    let currentCategory = 'all';
    let allItems = []; // アイテムデータを保持する配列

    // ユーザー情報を取得
    const { data: { user } } = await supabaseClient.auth.getUser();

    // 現在のページがindex.html（ログインページ）の場合
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        if (user) {
            // ログイン済みならmain.htmlへリダイレクト
            window.location.href = 'main.html';
        }
        // ログインしていない場合はindex.htmlに留まる（ログインフォームを表示）
    }
    // 現在のページがmain.htmlまたはsettings.htmlの場合
    else if (window.location.pathname.endsWith('main.html') || window.location.pathname.endsWith('settings.html')) {
        if (!user) {
            // ログインしていない場合はindex.htmlへリダイレクト
            window.location.href = 'index.html';
        } else {
            // ログイン済みならユーザー情報を取得して表示
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('username, list_id')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('プロフィール取得エラー:', profileError);
                // エラー時はログインページへリダイレクト
                window.location.href = 'index.html';
            } else {
                // ユーザー名表示
                if (userNameSpan) {
                    userNameSpan.textContent = profile.username || user.email;
                }
                currentListId = profile.list_id;

                // main.htmlの場合のみアイテム表示
                if (window.location.pathname.endsWith('main.html')) {
                    await fetchAndDisplayItems(currentListId, currentCategory);
                }

                // settings.htmlの場合の処理
                if (window.location.pathname.endsWith('settings.html')) {
                    const displayNameInput = document.getElementById('display-name');
                    const updateDisplayNameButton = document.getElementById('update-display-name');
                    const inviteCodeSpan = document.getElementById('invite-code');
                    const joinInviteCodeInput = document.getElementById('join-invite-code');
                    const joinListButton = document.getElementById('join-list');
                    const backToMainButton = document.getElementById('back-to-main');

                    // ユーザー名表示と招待コード表示
                    if (displayNameInput) {
                        displayNameInput.value = profile.username || '';
                    }
                    if (inviteCodeSpan) {
                        inviteCodeSpan.textContent = profile.list_id || 'N/A';
                    }

                    // ユーザー名更新処理
                    if (updateDisplayNameButton) {
                        updateDisplayNameButton.addEventListener('click', async () => {
                            const newDisplayName = displayNameInput.value;
                            if (newDisplayName) {
                                const { error } = await supabaseClient
                                    .from('profiles')
                                    .update({ username: newDisplayName })
                                    .eq('id', user.id);

                                if (error) {
                                    alert('ユーザー名の更新に失敗しました: ' + error.message);
                                } else {
                                    alert('ユーザー名を更新しました！');
                                    // 画面上のユーザー名も更新
                                    if (userNameSpan) userNameSpan.textContent = newDisplayName;
                                }
                            } else {
                                alert('表示名を入力してください。');
                            }
                        });
                    }

                    // リスト参加処理
                    if (joinListButton) {
                        joinListButton.addEventListener('click', async () => {
                            const inviteCode = joinInviteCodeInput.value;
                            if (inviteCode) {
                                const { error } = await supabaseClient
                                    .from('profiles')
                                    .update({ list_id: inviteCode })
                                    .eq('id', user.id);

                                if (error) {
                                    alert('リストへの参加に失敗しました: ' + error.message);
                                } else {
                                    alert('リストに参加しました！');
                                    window.location.href = 'main.html';
                                }
                            } else {
                                alert('招待コードを入力してください。');
                            }
                        });
                    }

                    // メインに戻るボタン
                    if (backToMainButton) {
                        backToMainButton.addEventListener('click', () => {
                            window.location.href = 'main.html';
                        });
                    }
                }
            }
        }
    }

    // ログアウト処理
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // サインアップ処理
    const signupButton = document.getElementById('signup-button');
    if (signupButton) {
        signupButton.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                alert('サインアップに失敗しました: ' + error.message);
            } else {
                alert('サインアップ成功！確認メールをチェックしてください。');
            }
        });
    }

    // ログイン処理
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // フォームのデフォルト送信を防ぐ

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert('ログインに失敗しました: ' + error.message);
            } else {
                // ログイン成功後、main.htmlへリダイレクト
                window.location.href = 'main.html';
            }
        });
    }

    // 設定ページへの遷移
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    // アイテム追加処理
    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentListId) {
                alert('リスト情報がありません。');
                return;
            }

            const itemName = itemNameInput.value;
            const price = priceInput.value ? parseInt(priceInput.value, 10) : null;
            const category = categoryInput.value;

            if (!category) {
                alert('カテゴリを選択してください。');
                return;
            }

            const { error } = await supabaseClient
                .from('items')
                .insert({
                    list_id: currentListId,
                    author_id: user.id,
                    item_name: itemName,
                    price: price,
                    category: category,
                });

            if (error) {
                alert('アイテムの追加に失敗しました: ' + error.message);
            } else {
                itemNameInput.value = '';
                priceInput.value = '';
                categoryInput.value = ''; // デフォルトに戻す
                await fetchAndDisplayItems(currentListId, currentCategory);
            }
        });
    }

    // カテゴリフィルター処理
    if (categoryFilterButtons) {
        categoryFilterButtons.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                currentCategory = e.target.dataset.category;
                
                // アクティブなボタンのスタイルを更新
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                fetchAndDisplayItems(currentListId, currentCategory);
            }
        });
    }

    // アイテム表示関数
    async function fetchAndDisplayItems(listId, category) {
        if (!listId) return;

        let query = supabaseClient
            .from('items')
            .select(`
                id,
                item_name,
                price,
                category,
                is_completed,
                profiles!author_id(username),
                order_index
            `)
            .eq('list_id', listId)
            .order('order_index', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });

        if (category !== 'all') {
            query = query.eq('category', category);
        }

        const { data: items, error } = await query;

        if (error) {
            console.error('アイテムの取得エラー:', error);
            return;
        }

        allItems = items; // 取得したアイテムをグローバル変数に保存

        itemList.innerHTML = '';
        completedItemList.innerHTML = '';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.dataset.id = item.id; // カード自体にIDを持たせる
            card.innerHTML = `
                <h3>${item.item_name}</h3>
                <div class="category-badge">${item.category}</div>
                ${item.price ? `<div class="price">¥${item.price.toLocaleString()}</div>` : ''}
                <div class="card-footer">
                    <div class="author">${item.profiles.username}</div>
                    <div class="actions">
                        <button class="complete-button" data-id="${item.id}" data-completed="${item.is_completed}">
                            <span class="material-symbols-outlined">${item.is_completed ? 'undo' : 'check_circle'}</span>
                        </button>
                        <button class="delete-button" data-id="${item.id}"><span class="material-symbols-outlined">delete</span></button>
                    </div>
                </div>
            `;

            if (item.is_completed) {
                completedItemList.appendChild(card);
            } else {
                itemList.appendChild(card);
            }
        });

        // イベントリスナーを再設定
        addCardActionListeners();

        // Sortable.jsの初期化
        if (itemList) {
            new Sortable(itemList, {
                animation: 150,
                ghostClass: 'sortable-ghost', // ドラッグ中のアイテムのスタイル
                onEnd: async function (evt) {
                    const itemIds = Array.from(evt.from.children).map(item => item.dataset.id);
                    await updateItemOrder(itemIds);
                }
            });
        }
    }

    // アイテムの順序を更新する関数
    async function updateItemOrder(itemIds) {
        const updates = itemIds.map((id, index) => ({
            id: id,
            order_index: index // 新しい順序を保存
        }));

        for (let i = 0; i < itemIds.length; i++) {
            const itemId = itemIds[i];
            const newOrderIndex = i;

            const { error } = await supabaseClient
                .from('items')
                .update({ order_index: newOrderIndex })
                .eq('id', itemId);

            if (error) {
                console.error(`アイテム ${itemId} の順序更新エラー:`, error);
                alert(`アイテム ${itemId} の順序更新に失敗しました: ` + error.message);
                return; // エラーが発生したら処理を中断
            }
        }
        console.log('アイテムの順序が更新されました。');
    }

    // カード内のボタンやカード自体にイベントリスナーを設定する関数
    function addCardActionListeners() {
        // カード自体（編集用）
        document.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // クリックがボタンでなければモーダルを開く
                if (!e.target.closest('button')) {
                    openEditModal(card.dataset.id);
                }
            });
        });

        // 完了ボタン
        document.querySelectorAll('.complete-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation(); // 親要素へのイベント伝播を停止
                const itemId = e.currentTarget.dataset.id;
                const isCompleted = e.currentTarget.dataset.completed === 'true';
                const { error } = await supabaseClient
                    .from('items')
                    .update({ is_completed: !isCompleted })
                    .eq('id', itemId);

                if (error) {
                    alert('ステータス更新に失敗しました: ' + error.message);
                } else {
                    await fetchAndDisplayItems(currentListId, currentCategory);
                }
            });
        });

        // 削除ボタン
        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation(); // 親要素へのイベント伝播を停止
                const itemId = e.currentTarget.dataset.id;
                if (confirm('本当に削除しますか？')) {
                    const { error } = await supabaseClient
                        .from('items')
                        .delete()
                        .eq('id', itemId);

                    if (error) {
                        alert('アイテムの削除に失敗しました: ' + error.message);
                    } else {
                        await fetchAndDisplayItems(currentListId, currentCategory);
                    }
                }
            });
        });
    }

    // モーダルを開く関数
    function openEditModal(itemId) {
        const item = allItems.find(i => i.id == itemId);
        if (item) {
            editItemId.value = item.id;
            editItemName.value = item.item_name;
            editPrice.value = item.price;
            editCategory.value = item.category;
            editModal.style.display = 'flex';
        }
    }

    // モーダルを閉じる関数
    function closeEditModal() {
        editModal.style.display = 'none';
    }

    // モーダルの閉じるボタンと背景クリックのイベントリスナー
    if(closeModalButton) {
        closeModalButton.addEventListener('click', closeEditModal);
    }
    window.addEventListener('click', (e) => {
        if (e.target == editModal) {
            closeEditModal();
        }
    });

    // 編集フォームの送信処理
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const itemId = editItemId.value;
            const updatedData = {
                item_name: editItemName.value,
                price: editPrice.value ? parseInt(editPrice.value, 10) : null,
                category: editCategory.value
            };

            const { error } = await supabaseClient
                .from('items')
                .update(updatedData)
                .eq('id', itemId);

            if (error) {
                alert('アイテムの更新に失敗しました: ' + error.message);
            } else {
                closeEditModal();
                await fetchAndDisplayItems(currentListId, currentCategory);
            }
        });
    }

    // 完了済みリストの表示切り替え
    if (toggleCompletedButton) {
        toggleCompletedButton.addEventListener('click', () => {
            const isHidden = completedItemList.style.display === 'none';
            completedItemList.style.display = isHidden ? 'grid' : 'none';
            toggleCompletedButton.textContent = isHidden ? '非表示にする' : '表示する';
        });
    }
});