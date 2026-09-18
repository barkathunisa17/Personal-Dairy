import { supabase } from "./supabaseClient";

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  return user.id;
}

window.storage = {
  async get(key, shared = false) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("kv_store")
      .select("value")
      .eq("key", key)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Key not found: ${key}`);
    return { key, value: data.value, shared };
  },

  async set(key, value, shared = false) {
    const userId = await getUserId();
    const { error } = await supabase
      .from("kv_store")
      .upsert(
        { key, value, user_id: userId, shared, updated_at: new Date().toISOString() },
        { onConflict: "key,user_id" }
      );
    if (error) throw error;
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const userId = await getUserId();
    const { error } = await supabase
      .from("kv_store")
      .delete()
      .eq("key", key)
      .eq("user_id", userId);
    if (error) throw error;
    return { key, deleted: true, shared };
  },

  async list(prefix = "", shared = false) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("kv_store")
      .select("key")
      .eq("user_id", userId)
      .like("key", `${prefix}%`);
    if (error) throw error;
    return { keys: (data || []).map((d) => d.key), prefix, shared };
  },
};
