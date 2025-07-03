const { createClient } = supabase;
const supabaseUrl = 'https://fkflxkqlamyvmjnqeuze.supabase.co'
const supabaseKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZmx4a3FsYW15dm1qbnFldXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0ODAyNzcsImV4cCI6MjA2NzA1NjI3N30.f95zy1UhNcQJyEpjW70UKjNpqWZ3rKRzYDD8Hzk1Wrg`
const supabaseClient = createClient(supabaseUrl, supabaseKey)
console.log('Supabaseクライアントが初期化されました:', supabaseClient);

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    const signupButton = document.getElementById('signup-button');
    const userNameSpan = document.getElementById('user-name');
    const logoutButton = document.getElementById('logout-button');
    const settingsButton = document.getElementById('settings-button');
    const backToMainButton = document.getElementById('back-to-main');

    const addItemForm = document.getElementById('add-item-form');
    const itemNameInput = document.getElementById('item-name');
    const priceInput = document.getElementById('price');
    const categoryInput = document.getElementById('category');
    const categoryFilter = document.getElementById('category-filter');
    const itemList = document.getElementById('item-list');
    const completedItemList = document.getElementById('completed-item-list');
    const toggleCompletedButton = document.getElementById('toggle-completed');

    // ログイン画面の処理
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert(error.message);
            } else {
                window.location.href = 'main.html';
            }
        });
    }

    if (signupButton) {
        signupButton.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                alert(error.message);
            } else {
                alert('サインアップ成功！メールを確認してください。');
            }
        });
    }

    // メイン画面の処理
    if (userNameSpan) {
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
            } else {
                userNameSpan.textContent = profile.username || user.email;
                // アイテム表示関数を呼び出す
                await fetchAndDisplayItems(profile.list_id, categoryFilter.value);
            }
        } else {
            // ログインしていない場合はログインページへリダイレクト
            window.location.href = 'index.html';
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                alert('ログアウトエラー: ' + error.message);
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    // アイテム追加処理
    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                alert('ログインしてください。');
                return;
            }

            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('list_id')
                .eq('id', user.id)
                .single();

            if (profileError || !profile.list_id) {
                alert('リストIDが取得できませんでした。');
                return;
            }

            const itemName = itemNameInput.value;
            const price = priceInput.value ? parseInt(priceInput.value, 10) : null;
            const category = categoryInput.value;

            const { error } = await supabaseClient
                .from('items')
                .insert({
                    list_id: profile.list_id,
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
                categoryInput.value = '電子機器'; // デフォルト値に戻す
                await fetchAndDisplayItems(profile.list_id, categoryFilter.value);
            }
        });
    }

    // アイテム表示・フィルター処理
    async function fetchAndDisplayItems(listId, category) {
        let query = supabaseClient
            .from('items')
            .select(`
                id,
                item_name,
                price,
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
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.item_name}</span>
                <span>${item.price ? ` (${item.price}円)` : ''}</span>
                <span> - ${item.profiles.username}</span>
                <button class="complete-button" data-id="${item.id}" data-completed="${item.is_completed}">${item.is_completed ? '未完了に戻す' : '完了'}</button>
                <button class="delete-button" data-id="${item.id}">削除</button>
            `;

            if (item.is_completed) {
                completedItemList.appendChild(li);
            } else {
                itemList.appendChild(li);
            }
        });

        // 完了ボタンと削除ボタンのイベントリスナーを設定
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
                    await fetchAndDisplayItems(listId, categoryFilter.value);
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
                        await fetchAndDisplayItems(listId, categoryFilter.value);
                    }
                }
            });
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', async (e) => {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                const { data: profile, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('list_id')
                    .eq('id', user.id)
                    .single();
                if (!profileError && profile.list_id) {
                    await fetchAndDisplayItems(profile.list_id, e.target.value);
                }
            }
        });
    }

    if (toggleCompletedButton) {
        toggleCompletedButton.addEventListener('click', () => {
            if (completedItemList.style.display === 'none') {
                completedItemList.style.display = 'block';
                toggleCompletedButton.textContent = '完了した項目を非表示';
            } else {
                completedItemList.style.display = 'none';
                toggleCompletedButton.textContent = '完了した項目を表示';
            }
        });
    }

    // 設定画面の処理
    if (backToMainButton) {
        backToMainButton.addEventListener('click', () => {
            window.location.href = 'main.html';
        });
    }

    const displayNameInput = document.getElementById('display-name');
    const updateDisplayNameButton = document.getElementById('update-display-name');
    const inviteCodeSpan = document.getElementById('invite-code');
    const joinInviteCodeInput = document.getElementById('join-invite-code');
    const joinListButton = document.getElementById('join-list');

    if (displayNameInput) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('username, list_id')
                .eq('id', user.id)
                .single();

            if (!profileError && profile) {
                displayNameInput.value = profile.username || '';
                inviteCodeSpan.textContent = profile.list_id || '未設定';
            }
        }
    }

    if (updateDisplayNameButton) {
        updateDisplayNameButton.addEventListener('click', async () => {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;

            const newUsername = displayNameInput.value;
            const { error } = await supabaseClient
                .from('profiles')
                .update({ username: newUsername })
                .eq('id', user.id);

            if (error) {
                alert('表示名の更新に失敗しました: ' + error.message);
            } else {
                alert('表示名を更新しました！');
            }
        });
    }

    if (joinListButton) {
        joinListButton.addEventListener('click', async () => {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;

            const inviteCode = joinInviteCodeInput.value;
            if (!inviteCode) {
                alert('招待コードを入力してください。');
                return;
            }

            // 招待コード（管理者のlist_id）が存在するか確認
            const { data: adminProfile, error: adminError } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('id', inviteCode)
                .single();

            if (adminError || !adminProfile) {
                alert('無効な招待コードです。');
                return;
            }

            // 自身のlist_idを更新
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
        });
    }
});