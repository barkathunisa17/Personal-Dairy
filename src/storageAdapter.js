import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

window.storage = {
  async get(key, shared = false) {
    const { data, error } = await supabase
      .from("kv_store")
      .select("value")
      .eq("key", key)
      .eq("shared", shared)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Key not found: ${key}`);
    return { key, value: data.value, shared };
  },

  async set(key, value, shared = false) {
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value, shared, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const { error } = await supabase
      .from("kv_store")
      .delete()
      .eq("key", key)
      .eq("shared", shared);
    if (error) throw error;
    return { key, deleted: true, shared };
  },

  async list(prefix = "", shared = false) {
    const { data, error } = await supabase
      .from("kv_store")
      .select("key")
      .eq("shared", shared)
      .like("key", `${prefix}%`);
    if (error) throw error;
    return { keys: (data || []).map((d) => d.key), prefix, shared };
  },
};