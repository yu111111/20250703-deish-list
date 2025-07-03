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

    let currentListId = null;
    let currentCategory = 'all';

    // ユーザー情報を取得し、リストIDをセット
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('username, list_id')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('プロフィール取得エラー:', profileError);
            userNameSpan.textContent = 'ユーザー名不明';
            // ログインページに戻すなどの処理が必要かもしれない
            window.location.href = 'index.html';
        } else {
            userNameSpan.textContent = profile.username || user.email;
            currentListId = profile.list_id;
            // 初期アイテム表示
            await fetchAndDisplayItems(currentListId, currentCategory);
        }
    } else {
        // ログインしていない場合はログインページへリダイレクト
        window.location.href = 'index.html';
    }

    // ログアウト処理
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
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
                profiles!author_id(username)
            `)
            .eq('list_id', listId)
            .order('created_at', { ascending: false });

        if (category !== 'all') {
            query = query.eq('category', category);
        }

        const { data: items, error } = await query;

        if (error) {
            console.error('アイテムの取得エラー:', error);
            return;
        }

        itemList.innerHTML = '';
        completedItemList.innerHTML = '';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <h3>${item.item_name}</h3>
                <div class="category-badge">${item.category}</div>
                ${item.price ? `<div class="price">¥${item.price.toLocaleString()}</div>` : ''}
                <div class="card-footer">
                    <div class="author">${item.profiles.username}</div>
                    <div class="actions">
                        <button class="complete-button" data-id="${item.id}" data-completed="${item.is_completed}">
                            ${item.is_completed ? '↩️' : '✔️'}
                        </button>
                        <button class="delete-button" data-id="${item.id}">🗑️</button>
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
    }

    // カード内のボタンにイベントリスナーを設定する関数
    function addCardActionListeners() {
        document.querySelectorAll('.complete-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const itemId = e.target.dataset.id;
                const isCompleted = e.target.dataset.completed === 'true';
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

        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const itemId = e.target.dataset.id;
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

    // 完了済みリストの表示切り替え
    if (toggleCompletedButton) {
        toggleCompletedButton.addEventListener('click', () => {
            const isHidden = completedItemList.style.display === 'none';
            completedItemList.style.display = isHidden ? 'grid' : 'none';
            toggleCompletedButton.textContent = isHidden ? '非表示にする' : '表示する';
        });
    }

    // 初期読み込み（ログインチェック後に実行されるので不要な場合もある）
    // if (currentListId) {
    //     fetchAndDisplayItems(currentListId, currentCategory);
    // }
});
