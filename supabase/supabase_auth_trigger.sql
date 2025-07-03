--- Supabase認証トリガー用SQLスクリプト ---

-- 1. `auth.users` に新しいユーザーが作成されたときに `profiles` を作成する関数
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, list_id)
  VALUES (NEW.id, NEW.email, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. トリガーの作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
