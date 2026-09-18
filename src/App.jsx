import { supabase } from "./supabaseClient";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  BookHeart, Home, Search, Heart, Plus, X, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Sun, Moon, Menu, Play, Pause, Trash2, Pencil,
  MapPin, Tag, Camera, Video, Mic, Sparkles, ImageOff, Filter, LogOut,
  ArrowLeft, Check, Clock, Star, BarChart3, Lock, Eye, EyeOff
} from "lucide-react";

/* ---------- constants ---------- */

const MOODS = [
  { key: "Happy", emoji: "😊" }, { key: "Sad", emoji: "😢" },
  { key: "Excited", emoji: "🤩" }, { key: "Peaceful", emoji: "🌿" },
  { key: "Grateful", emoji: "🙏" }, { key: "Nostalgic", emoji: "🍂" },
  { key: "Angry", emoji: "😤" }, { key: "Confused", emoji: "😕" },
  { key: "Loved", emoji: "💗" }, { key: "Other", emoji: "✨" },
];
const MOOD_EMOJI = Object.fromEntries(MOODS.map(m => [m.key, m.emoji]));

const CATEGORIES = [
  "Daily Life", "Friends", "Family", "College", "Travel",
  "Achievements", "Special Days", "Random Moments", "Personal", "Other",
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const SAMPLE_MEMORIES = [
  {
    id: "sample-1",
    title: "First Day of College",
    date: "2026-06-02",
    time: "09:15",
    location: "Chennai",
    mood: "Excited",
    category: "College",
    caption: "Walked into campus not knowing a single face, and walked out with three new friends and a very lost sense of direction. My hands were shaking when I introduced myself in class, but somehow it went okay. I think this is the start of something I'll want to remember.",
    photos: [],
    videos: [],
    voiceNote: null,
    tags: ["college", "newbeginnings", "nervous"],
    favorite: true,
    isSample: true,
    createdAt: "2026-06-02T09:20:00.000Z",
  },
  {
    id: "sample-2",
    title: "A Random Evening",
    date: "2026-07-14",
    time: "19:40",
    location: "Salem",
    mood: "Peaceful",
    category: "Random Moments",
    caption: "Nothing happened, really. I sat on the terrace with a cup of tea and watched the sky change colour. Sometimes the ordinary evenings end up being the ones I remember most clearly.",
    photos: [],
    videos: [],
    voiceNote: null,
    tags: ["quiet", "evening"],
    favorite: false,
    isSample: true,
    createdAt: "2026-07-14T19:45:00.000Z",
  },
  {
    id: "sample-3",
    title: "Best Friend Memory",
    date: "2026-07-28",
    time: "16:00",
    location: "Coimbatore",
    mood: "Loved",
    category: "Friends",
    caption: "We laughed so hard at the bus stop that a stranger asked what was so funny, and neither of us could even explain it anymore. Ten years of friendship and it still feels this easy.",
    photos: [],
    videos: [],
    voiceNote: null,
    tags: ["friends", "laughter"],
    favorite: true,
    isSample: true,
    createdAt: "2026-07-28T16:10:00.000Z",
  },
  {
    id: "sample-4",
    title: "Family Day",
    date: "2026-08-02",
    time: "13:00",
    location: "Home",
    mood: "Grateful",
    category: "Family",
    caption: "Amma made the whole lunch spread just because it was a Sunday. We argued about the TV remote like always, and I wouldn't trade this chaos for anything quieter.",
    photos: [],
    videos: [],
    voiceNote: null,
    tags: ["family", "sunday"],
    favorite: false,
    isSample: true,
    createdAt: "2026-08-02T13:30:00.000Z",
  },
  {
    id: "sample-5",
    title: "A Small Achievement",
    date: "2026-08-08",
    time: "22:00",
    location: "Home",
    mood: "Happy",
    category: "Achievements",
    caption: "Finally fixed the bug that had been sitting in my code for two whole days. It's a small thing, but I did a little victory dance alone in my room and I'm not ashamed.",
    photos: [],
    videos: [],
    voiceNote: null,
    tags: ["coding", "win"],
    favorite: true,
    isSample: true,
    createdAt: "2026-08-08T22:05:00.000Z",
  },
];

/* ---------- storage helpers ---------- */

async function loadMemories() {
  try {
    const res = await window.storage.get("memories", false);
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) { /* key not found yet */ }
  return null;
}
async function saveMemories(list) {
  try {
    await window.storage.set("memories", JSON.stringify(list), false);
    return true;
  } catch (e) {
    console.error("Storage error", e);
    return false;
  }
}
async function loadTheme() {
  try {
    const res = await window.storage.get("theme", false);
    if (res && res.value) return res.value;
  } catch (e) {}
  return "light";
}
async function saveTheme(theme) {
  try { await window.storage.set("theme", theme, false); } catch (e) {}
}

/* ---------- small UI atoms ---------- */

function MoodPill({ mood, size = "sm" }) {
  if (!mood) return null;
  return (
    <span className={`pill mood-pill ${size}`}>
      <span aria-hidden="true">{MOOD_EMOJI[mood] || "✨"}</span> {mood}
    </span>
  );
}

function EmptyState({ icon, title, body, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {actionLabel && (
        <button className="btn-primary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}

function ConfirmDialog({ open, title, body, confirmLabel, danger, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function AudioPlayer({ src, label }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
    setPlaying(!playing);
  };

  const onTime = () => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    setProgress(a.currentTime / a.duration);
    setDuration(a.duration);
  };

  const fmt = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTime}
        onLoadedMetadata={onTime}
        onEnded={() => setPlaying(false)}
      />
      <button className="audio-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="audio-track">
        <div className="audio-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="audio-time">{fmt((audioRef.current && audioRef.current.currentTime) || 0)} / {fmt(duration)}</span>
    </div>
  );
}

/* ---------- Memory card ---------- */

function MemoryCard({ memory, onOpen, onToggleFavorite }) {
  const cover = memory.photos && memory.photos[0];
  return (
    <div className="memory-card" onClick={() => onOpen(memory.id)}>
      <div className="ribbon" aria-hidden="true" />
      <div className="card-media">
        {cover ? (
          <img src={cover} alt="" />
        ) : (
          <div className="card-media-empty">
            {memory.category === "Travel" ? <MapPin size={22} /> : <BookHeart size={22} />}
          </div>
        )}
        <button
          className={`fav-btn ${memory.favorite ? "is-fav" : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(memory.id); }}
          aria-label="Toggle favorite"
        >
          <Heart size={16} fill={memory.favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="card-body">
        <span className="card-date">{fmtDate(memory.date)}</span>
        <h4>{memory.title}</h4>
        <p className="card-caption">{memory.caption}</p>
        <div className="card-meta">
          <MoodPill mood={memory.mood} />
          <span className="pill cat-pill">{memory.category}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Memory Form (add / edit) ---------- */

function MemoryForm({ initial, onSave, onCancel }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title || "");
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(initial?.time || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [mood, setMood] = useState(initial?.mood || "Happy");
  const [category, setCategory] = useState(initial?.category || "Daily Life");
  const [caption, setCaption] = useState(initial?.caption || "");
  const [photos, setPhotos] = useState(initial?.photos || []);
  const [videos, setVideos] = useState(initial?.videos || []);
  const [voiceNote, setVoiceNote] = useState(initial?.voiceNote || null);
  const [tagsInput, setTagsInput] = useState((initial?.tags || []).join(", "));
  const [favorite, setFavorite] = useState(initial?.favorite || false);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const f of files) {
      if (!/^image\/(jpeg|jpg|png|webp)/.test(f.type)) continue;
      try { urls.push(await fileToDataURL(f)); } catch {}
    }
    setPhotos(p => [...p, ...urls]);
    setUploading(false);
    e.target.value = "";
  };

  const handleVideos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const items = files
      .filter(f => /^video\/(mp4|webm)/.test(f.type))
      .map(f => ({ name: f.name, url: URL.createObjectURL(f) }));
    setVideos(v => [...v, ...items]);
    e.target.value = "";
  };

  const handleAudio = (e) => {
    const f = (e.target.files || [])[0];
    if (!f) return;
    if (!/^audio\//.test(f.type)) return;
    setVoiceNote({ name: f.name, url: URL.createObjectURL(f) });
    e.target.value = "";
  };

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = "Give this memory a title.";
    if (!date) errs.date = "Pick a date for this memory.";
    if (!caption.trim()) errs.caption = "Write a little about what happened.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const tags = tagsInput.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean);
    onSave({
      id: initial?.id || uid(),
      title: title.trim(),
      date, time, location: location.trim(),
      mood, category, caption: caption.trim(),
      photos, videos, voiceNote, tags, favorite,
      isSample: false,
      createdAt: initial?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="form-card" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2>{isEdit ? "Edit memory" : "Add a memory"}</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="form-body">
          <div className="form-section-label">Basic information</div>

          <label className="field">
            <span>Title</span>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Enter memory title" maxLength={80}
            />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </label>

          <div className="field-row">
            <label className="field">
              <span>Date</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              {errors.date && <span className="field-error">{errors.date}</span>}
            </label>
            <label className="field">
              <span>Time (optional)</span>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>Location (optional)</span>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Where were you?" />
          </label>

          <label className="field">
            <span>Mood</span>
            <div className="mood-grid">
              {MOODS.map(m => (
                <button
                  type="button" key={m.key}
                  className={`mood-choice ${mood === m.key ? "selected" : ""}`}
                  onClick={() => setMood(m.key)}
                >
                  <span aria-hidden="true">{m.emoji}</span> {m.key}
                </button>
              ))}
            </div>
          </label>

          <label className="field">
            <span>Category</span>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <div className="form-section-label">Story</div>
          <label className="field">
            <span>What happened?</span>
            <textarea
              value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="Write as much as you want..." rows={6}
            />
            {errors.caption && <span className="field-error">{errors.caption}</span>}
          </label>

          <div className="form-section-label">Photos</div>
          <div className="upload-row">
            <button type="button" className="btn-upload" onClick={() => photoInputRef.current?.click()}>
              <Camera size={16} /> Add photos
            </button>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handlePhotos} />
            {uploading && <span className="upload-status">Uploading…</span>}
          </div>
          {photos.length > 0 && (
            <div className="photo-preview-grid">
              {photos.map((src, i) => (
                <div className="photo-preview" key={i}>
                  <img src={src} alt="" />
                  <button type="button" className="remove-chip" onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="form-section-label">Videos</div>
          <div className="upload-row">
            <button type="button" className="btn-upload" onClick={() => videoInputRef.current?.click()}>
              <Video size={16} /> Add videos
            </button>
            <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" multiple hidden onChange={handleVideos} />
          </div>
          {videos.length > 0 && (
            <div className="video-preview-list">
              {videos.map((v, i) => (
                <div className="video-preview-row" key={i}>
                  <Video size={14} /> <span>{v.name}</span>
                  <button type="button" className="remove-chip" onClick={() => setVideos(vs => vs.filter((_, idx) => idx !== i))}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="form-section-label">Voice note</div>
          <div className="upload-row">
            <button type="button" className="btn-upload" onClick={() => audioInputRef.current?.click()}>
              <Mic size={16} /> {voiceNote ? "Replace voice note" : "Add voice note"}
            </button>
            <input ref={audioInputRef} type="file" accept="audio/mp3,audio/wav,audio/m4a,audio/webm,audio/*" hidden onChange={handleAudio} />
          </div>
          {voiceNote && (
            <div className="video-preview-row">
              <Mic size={14} /> <span>{voiceNote.name}</span>
              <button type="button" className="remove-chip" onClick={() => setVoiceNote(null)}><X size={12} /></button>
            </div>
          )}

          <div className="form-section-label">Tags</div>
          <label className="field">
            <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="college, friends, happy" />
            <span className="hint">Separate tags with commas.</span>
          </label>

          <label className="fav-check">
            <input type="checkbox" checked={favorite} onChange={e => setFavorite(e.target.checked)} />
            <Heart size={15} fill={favorite ? "currentColor" : "none"} /> Add to favorites
          </label>
        </div>

        <div className="form-footer">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save memory</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Full memory view ---------- */

function MemoryView({ memory, onBack, onEdit, onDelete, onToggleFavorite }) {
  const [lightbox, setLightbox] = useState(null);
  return (
    <div className="memory-view">
      <button className="btn-ghost back-btn" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      <div className="memory-view-card">
        <div className="mv-header">
          <h1>{memory.title}</h1>
          <div className="mv-meta">
            <span><Clock size={14} /> {fmtDate(memory.date)}{memory.time ? ` · ${memory.time}` : ""}</span>
            {memory.location && <span><MapPin size={14} /> {memory.location}</span>}
            <MoodPill mood={memory.mood} />
            <span className="pill cat-pill">{memory.category}</span>
          </div>
        </div>

        <div className="mv-section">
          <h3>My story</h3>
          <p className="mv-caption">{memory.caption}</p>
        </div>

        {memory.photos?.length > 0 && (
          <div className="mv-section">
            <h3>Photos</h3>
            <div className="mv-photo-grid">
              {memory.photos.map((src, i) => (
                <img key={i} src={src} alt="" onClick={() => setLightbox(src)} />
              ))}
            </div>
          </div>
        )}

        {memory.videos?.length > 0 && (
          <div className="mv-section">
            <h3>Videos</h3>
            <div className="mv-video-grid">
              {memory.videos.map((v, i) => (
                <video key={i} src={v.url} controls />
              ))}
            </div>
          </div>
        )}

        {memory.voiceNote && (
          <div className="mv-section">
            <h3><Mic size={15} style={{ verticalAlign: "-2px" }} /> Voice note</h3>
            <AudioPlayer src={memory.voiceNote.url} />
          </div>
        )}

        {memory.tags?.length > 0 && (
          <div className="mv-section">
            <div className="tag-list">
              {memory.tags.map(t => <span key={t} className="pill tag-pill">#{t}</span>)}
            </div>
          </div>
        )}

        <div className="mv-actions">
          <button className={`btn-ghost ${memory.favorite ? "is-fav-text" : ""}`} onClick={() => onToggleFavorite(memory.id)}>
            <Heart size={15} fill={memory.favorite ? "currentColor" : "none"} /> {memory.favorite ? "Favorited" : "Favorite"}
          </button>
          <button className="btn-ghost" onClick={() => onEdit(memory)}><Pencil size={15} /> Edit</button>
          <button className="btn-ghost danger-text" onClick={() => onDelete(memory.id)}><Trash2 size={15} /> Delete</button>
        </div>
      </div>

      {lightbox && (
        <div className="overlay" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="lightbox-img" />
        </div>
      )}
    </div>
  );
}

/* ---------- Calendar ---------- */

function CalendarView({ memories, onOpenDay }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });

  const byDate = useMemo(() => {
    const map = {};
    memories.forEach(m => { (map[m.date] ||= []).push(m); });
    return map;
  }, [memories]);

  const first = new Date(cursor.y, cursor.m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const changeMonth = (delta) => {
    let m = cursor.m + delta, y = cursor.y;
    if (m < 0) { m = 11; y -= 1; } if (m > 11) { m = 0; y += 1; }
    setCursor({ y, m });
  };

  return (
    <div className="calendar-card">
      <div className="calendar-header">
        <button className="icon-btn" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
        <h3>{monthLabel}</h3>
        <button className="icon-btn" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
      </div>
      <div className="calendar-grid dow">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="dow-cell">{d}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell empty" />;
          const iso = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const has = byDate[iso];
          return (
            <button
              key={i}
              className={`cal-cell ${has ? "has-memory" : ""}`}
              onClick={() => has && onOpenDay(iso, has)}
            >
              <span>{d}</span>
              {has && <span className="cal-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Stats ---------- */

function StatsView({ memories }) {
  const total = memories.length;
  const photos = memories.reduce((s, m) => s + (m.photos?.length || 0), 0);
  const videos = memories.reduce((s, m) => s + (m.videos?.length || 0), 0);
  const voice = memories.filter(m => m.voiceNote).length;
  const favs = memories.filter(m => m.favorite).length;

  const countBy = (key) => {
    const c = {};
    memories.forEach(m => { if (m[key]) c[m[key]] = (c[m[key]] || 0) + 1; });
    const arr = Object.entries(c).sort((a, b) => b[1] - a[1]);
    return arr[0] ? arr[0][0] : "—";
  };

  const stats = [
    { label: "Total memories", value: total },
    { label: "Photos saved", value: photos },
    { label: "Videos saved", value: videos },
    { label: "Voice notes", value: voice },
    { label: "Favorite memories", value: favs },
  ];

  return (
    <div className="stats-wrap">
      <h3 className="section-title">My year in memories</h3>
      <div className="stats-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="stats-grid two">
        <div className="stat-card wide">
          <span className="stat-label">Most used mood</span>
          <span className="stat-value small">{MOOD_EMOJI[countBy("mood")] || ""} {countBy("mood")}</span>
        </div>
        <div className="stat-card wide">
          <span className="stat-label">Most used category</span>
          <span className="stat-value small">{countBy("category")}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Login (real Supabase auth) ---------- */

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || !password.trim()) {
      setError("Enter an email and password to continue.");
      return;
    }
    setLoading(true);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setInfo("Account created! Check your email if confirmation is needed, then log in.");
      setIsSignUp(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      onLogin();
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-mark"><BookHeart size={26} /></div>
        <h2>{isSignUp ? "Create your account" : "Welcome back"}</h2>
        <p className="login-sub">Your diary stays locked until you sign in.</p>
        <form onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Password</span>
            <div className="pw-row">
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
              <button type="button" className="icon-btn" onClick={() => setShowPw(s => !s)} aria-label="Toggle password visibility">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {error && <p className="field-error">{error}</p>}
          {info && <p className="hint">{info}</p>}
          <button className="btn-primary full" type="submit" disabled={loading}>
            {loading ? "Please wait…" : isSignUp ? "Sign up" : "Open my diary"}
          </button>
        </form>
        <p className="login-note" style={{ cursor: "pointer" }} onClick={() => { setIsSignUp(s => !s); setError(""); setInfo(""); }}>
          {isSignUp ? "Already have an account? Log in" : "No account? Sign up"}
        </p>
      </div>
    </div>
  );
}

/* ---------- Home / hero ---------- */

function HomeScreen({ onOpen }) {
  return (
    <div className="home-screen">
      <div className="floaters" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => <span key={i} className={`floater f${i % 5}`} />)}
      </div>
      <div className="home-content">
        <div className="home-mark"><BookHeart size={30} /></div>
        <h1>Welcome to my little corner of memories.</h1>
        <p>Some moments are too precious to leave only in my memory.</p>
        <button className="btn-primary large" onClick={onOpen}>Open my diary</button>
      </div>
    </div>
  );
}

/* ---------- Main App ---------- */

const TABS = [
  { key: "timeline", label: "Memories", icon: BookHeart },
  { key: "calendar", label: "Calendar", icon: CalendarIcon },
  { key: "stats", label: "Stats", icon: BarChart3 },
  { key: "favorites", label: "Favorites", icon: Heart },
];

export default function App() {
  const [stage, setStage] = useState("home"); // home | login | dashboard
  const [theme, setTheme] = useState("light");
  const [loaded, setLoaded] = useState(false);
  const [memories, setMemories] = useState([]);
  const [tab, setTab] = useState("timeline");
  const [activeId, setActiveId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filters, setFilters] = useState({ year: "All", category: "All", mood: "All" });
  const [showFilters, setShowFilters] = useState(false);
  const [dayFilter, setDayFilter] = useState(null);
  const [randomPick, setRandomPick] = useState(null);
  const [saveNotice, setSaveNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Check if the person is already logged in (e.g. after a page refresh),
  // and keep "stage" in sync if they log out from another tab.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStage("dashboard");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setStage("home");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Only load saved data once we KNOW the person is logged in — loading
  // before that point silently fails and falls back to demo data, which
  // then gets saved over the person's real data. Waiting for "dashboard"
  // guarantees Supabase already knows who's logged in.
  useEffect(() => {
    if (stage !== "dashboard") return;
    setLoaded(false);
    (async () => {
      const t = await loadTheme();
      setTheme(t);
      const stored = await loadMemories();
      setMemories(stored && stored.length ? stored : SAMPLE_MEMORIES);
      setLoaded(true);
    })();
  }, [stage]);

  useEffect(() => {
    if (!loaded) return;
    saveMemories(memories).then(ok => {
      if (!ok) {
        setSaveNotice("Some large files couldn't be saved locally. Connect cloud storage for full media backup.");
        setTimeout(() => setSaveNotice(""), 4000);
      }
    });
  }, [memories, loaded]);

  useEffect(() => { saveTheme(theme); }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-diary-theme", theme);
  }, [theme]);

  const activeMemory = memories.find(m => m.id === activeId) || null;

  const years = useMemo(() => {
    const s = new Set(memories.map(m => m.date?.slice(0, 4)).filter(Boolean));
    return ["All", ...Array.from(s).sort().reverse()];
  }, [memories]);

  const filtered = useMemo(() => {
    let list = [...memories];
    if (dayFilter) list = list.filter(m => m.date === dayFilter.date);
    if (filters.year !== "All") list = list.filter(m => m.date?.startsWith(filters.year));
    if (filters.category !== "All") list = list.filter(m => m.category === filters.category);
    if (filters.mood !== "All") list = list.filter(m => m.mood === filters.mood);
    if (tab === "favorites") list = list.filter(m => m.favorite);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(m =>
        [m.title, m.caption, m.date, m.category, m.mood, m.location, ...(m.tags || [])]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  }, [memories, filters, tab, query, dayFilter]);

  const onThisDay = useMemo(() => {
    const now = new Date();
    const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return memories
      .filter(m => m.date && m.date.slice(5) === mmdd && m.date.slice(0, 4) !== String(now.getFullYear()))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [memories]);

  const saveMemory = (m) => {
    setMemories(list => {
      const exists = list.some(x => x.id === m.id);
      return exists ? list.map(x => x.id === m.id ? m : x) : [m, ...list];
    });
    setShowForm(false);
    setEditTarget(null);
    if (activeId === m.id) setActiveId(m.id);
    setSaveNotice("Memory saved. One more moment preserved forever. ❤️");
    setTimeout(() => setSaveNotice(""), 3000);
  };

  const deleteMemory = (id) => {
    setMemories(list => list.filter(m => m.id !== id));
    setConfirmDelete(null);
    if (activeId === id) setActiveId(null);
  };

  const toggleFavorite = (id) => {
    setMemories(list => list.map(m => m.id === id ? { ...m, favorite: !m.favorite } : m));
  };

  const pickRandom = () => {
    if (!memories.length) return;
    const pick = memories[Math.floor(Math.random() * memories.length)];
    setRandomPick(pick);
    setActiveId(pick.id);
  };

  const resetFilters = () => setFilters({ year: "All", category: "All", mood: "All" });

  if (stage === "home") return (
    <div className="diary-root">
      <GlobalStyle />
      <HomeScreen onOpen={() => setStage("login")} />
    </div>
  );

  if (stage === "login") return (
    <div className="diary-root">
      <GlobalStyle />
      <LoginScreen onLogin={() => setStage("dashboard")} />
    </div>
  );

  return (
    <div className="diary-root">
      <GlobalStyle />
      <header className="app-header">
        <div className="brand" onClick={() => { setTab("timeline"); setActiveId(null); setDayFilter(null); }}>
          <BookHeart size={20} /> <span>My Diary</span>
        </div>
        <nav className="top-nav">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`nav-btn ${tab === t.key && !activeId ? "active" : ""}`}
              onClick={() => { setTab(t.key); setActiveId(null); setDayFilter(null); }}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setShowSearch(s => !s)} aria-label="Search"><Search size={18} /></button>
          <button className="icon-btn" onClick={() => setTheme(t => t === "light" ? "dark" : "light")} aria-label="Toggle theme">
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            className="icon-btn"
            onClick={async () => { await supabase.auth.signOut(); setStage("home"); }}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={18} />
          </button>
          <button className="icon-btn menu-only" onClick={() => setMenuOpen(m => !m)} aria-label="Menu"><Menu size={18} /></button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          {TABS.map(t => (
            <button key={t.key} className="mobile-menu-item" onClick={() => { setTab(t.key); setActiveId(null); setMenuOpen(false); }}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
          <button
            className="mobile-menu-item"
            onClick={async () => {
              await supabase.auth.signOut();
              setStage("home");
              setMenuOpen(false);
            }}
          >
            <LogOut size={16} /> Close diary
          </button>
        </div>
      )}

      {showSearch && (
        <div className="search-bar">
          <Search size={16} />
          <input autoFocus placeholder="Search by title, caption, tag, mood, location…" value={query} onChange={e => setQuery(e.target.value)} />
          {query && <button className="icon-btn" onClick={() => setQuery("")}><X size={14} /></button>}
        </div>
      )}

      {saveNotice && <div className="toast">{saveNotice}</div>}

      <main className="app-main">
        {activeMemory ? (
          <MemoryView
            memory={activeMemory}
            onBack={() => { setActiveId(null); setRandomPick(null); }}
            onEdit={(m) => { setEditTarget(m); setShowForm(true); }}
            onDelete={(id) => setConfirmDelete(id)}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <>
            <div className="profile-strip">
              <p>My memories, my stories, my little moments.</p>
            </div>

            {onThisDay && !dayFilter && tab === "timeline" && !query && (
              <div className="on-this-day">
                <div>
                  <span className="otd-label">On this day</span>
                  <h4>{onThisDay.title}</h4>
                  <p>{onThisDay.date.slice(0, 4)} · {onThisDay.caption.slice(0, 90)}{onThisDay.caption.length > 90 ? "…" : ""}</p>
                </div>
                <button className="btn-ghost" onClick={() => setActiveId(onThisDay.id)}>View</button>
              </div>
            )}

            {tab === "timeline" && !dayFilter && (
              <div className="toolbar">
                <button className="btn-primary" onClick={() => { setEditTarget(null); setShowForm(true); }}>
                  <Plus size={16} /> Add memory
                </button>
                <button className="btn-ghost" onClick={pickRandom}><Sparkles size={15} /> Random memory</button>
                <button className="btn-ghost" onClick={() => setShowFilters(f => !f)}><Filter size={15} /> Filters</button>
              </div>
            )}

            {dayFilter && (
              <div className="toolbar">
                <button className="btn-ghost" onClick={() => setDayFilter(null)}><ArrowLeft size={15} /> Back to all memories</button>
                <span className="day-filter-label">{fmtDate(dayFilter.date)}</span>
              </div>
            )}

            {showFilters && !dayFilter && (
              <div className="filters-panel">
                <label>
                  <span>Year</span>
                  <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
                <label>
                  <span>Category</span>
                  <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                    <option>All</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label>
                  <span>Mood</span>
                  <select value={filters.mood} onChange={e => setFilters(f => ({ ...f, mood: e.target.value }))}>
                    <option>All</option>
                    {MOODS.map(m => <option key={m.key} value={m.key}>{m.emoji} {m.key}</option>)}
                  </select>
                </label>
                <button className="btn-ghost" onClick={resetFilters}>Clear filters</button>
              </div>
            )}

            {tab === "stats" ? (
              <StatsView memories={memories} />
            ) : tab === "calendar" && !dayFilter ? (
              <CalendarView memories={memories} onOpenDay={(date, list) => setDayFilter({ date, list })} />
            ) : filtered.length === 0 ? (
              query ? (
                <EmptyState
                  icon={<Search size={26} />}
                  title="I couldn't find that memory…"
                  body="Maybe it's hiding somewhere. Try a different word or clear the search."
                  actionLabel="Clear search"
                  onAction={() => setQuery("")}
                />
              ) : tab === "favorites" ? (
                <EmptyState
                  icon={<Heart size={26} />}
                  title="No favorites yet."
                  body="Tap the heart on any memory to keep it close."
                />
              ) : (
                <EmptyState
                  icon={<BookHeart size={26} />}
                  title="Your diary is still waiting for its first memory."
                  body="Every diary starts on a blank page. Yours can start today."
                  actionLabel="Write your first memory"
                  onAction={() => { setEditTarget(null); setShowForm(true); }}
                />
              )
            ) : (
              <div className="memory-grid">
                {filtered.map(m => (
                  <MemoryCard key={m.id} memory={m} onOpen={setActiveId} onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.key} className={`bnav-btn ${tab === t.key && !activeId ? "active" : ""}`} onClick={() => { setTab(t.key); setActiveId(null); setDayFilter(null); }}>
            <t.icon size={18} />
            <span>{t.label}</span>
          </button>
        ))}
        <button className="bnav-btn add" onClick={() => { setEditTarget(null); setShowForm(true); }} aria-label="Add memory">
          <Plus size={20} />
        </button>
      </nav>

      {showForm && (
        <MemoryForm
          initial={editTarget}
          onSave={saveMemory}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Are you sure you want to delete this memory?"
        body="This can't be undone. The photos, videos, and story attached to it will be removed too."
        confirmLabel="Delete memory"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => deleteMemory(confirmDelete)}
      />
    </div>
  );
}

/* ---------- styles ---------- */

function GlobalStyle() {
  return (
    <style>{`
      .diary-root {
  --paper: #0D0B0B;
  --paper-2: #1A1414;
  --ink: #F2E9E4;
  --ink-soft: #B8A8A2;
  --line: #3A2222;
  --rose: #C41E2A;
  --rose-deep: #7A0E14;
  --sage: #8A9A7E;
  --gold: #D4A24C;
  --card: #171010;
  --danger: #E23C3C;
        --shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        --radius: 16px;
        font-family: 'Iowan Old Style','Palatino Linotype', Georgia, serif;
        color: var(--ink);
        background: var(--paper);
        min-height: 100vh;
        transition: background .3s ease, color .3s ease;
      }
      .diary-root :is(button, input, select, textarea) {
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      }
      [data-diary-theme="dark"] .diary-root {
  --paper: #0D0B0B;
  --paper-2: #1A1414;
  --ink: #F2E9E4;
  --ink-soft: #B8A8A2;
  --line: #3A2222;
  --card: #171010;
  --shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}
      .diary-root * { box-sizing: border-box; }
      .diary-root h1, .diary-root h2, .diary-root h3, .diary-root h4 {
        font-family: 'Iowan Old Style','Palatino Linotype', Georgia, serif;
        font-weight: 600; margin: 0;
      }
      .diary-root p { margin: 0; line-height: 1.6; color: var(--ink-soft); }

      /* Home / hero */
      .home-screen { position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; background: linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%); }
      .floaters { position: absolute; inset: 0; pointer-events: none; }
      .floater { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: var(--gold); opacity: .35; animation: floatUp 9s ease-in-out infinite; }
      .floater.f0 { left: 8%; top: 80%; animation-duration: 11s; }
      .floater.f1 { left: 22%; top: 90%; background: var(--rose); animation-duration: 8s; }
      .floater.f2 { left: 40%; top: 85%; animation-duration: 13s; }
      .floater.f3 { left: 65%; top: 92%; background: var(--sage); animation-duration: 10s; }
      .floater.f4 { left: 80%; top: 78%; animation-duration: 12s; }
      .floater:nth-child(6) { left: 15%; }
      .floater:nth-child(7) { left: 33%; }
      .floater:nth-child(8) { left: 50%; }
      .floater:nth-child(9) { left: 60%; }
      .floater:nth-child(10) { left: 72%; }
      .floater:nth-child(11) { left: 88%; }
      .floater:nth-child(12) { left: 5%; }
      .floater:nth-child(13) { left: 45%; }
      .floater:nth-child(14) { left: 95%; }
      @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 0; } 15% { opacity: .5; } 100% { transform: translateY(-100vh) scale(1.3); opacity: 0; } }
      .home-content { position: relative; text-align: center; max-width: 560px; padding: 2rem; animation: fadeUp .8s ease both; }
      .home-mark { width: 56px; height: 56px; margin: 0 auto 1.25rem; border-radius: 50%; background: var(--card); display: flex; align-items: center; justify-content: center; color: var(--rose-deep); box-shadow: var(--shadow); }
      .home-content h1 { font-size: clamp(1.7rem, 4vw, 2.4rem); line-height: 1.3; margin-bottom: .75rem; }
      .home-content > p { font-style: italic; margin-bottom: 2rem; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

      /* buttons */
      .btn-primary, .btn-ghost, .btn-danger, .btn-upload {
        display: inline-flex; align-items: center; gap: 6px; border-radius: 999px;
        padding: 10px 18px; font-size: .92rem; cursor: pointer; border: 1px solid transparent;
        transition: transform .15s ease, background .2s ease;
      }
      .btn-primary { background: var(--rose-deep); color: #fff; }
      .btn-primary:hover { transform: translateY(-1px); background: var(--rose); }
      .btn-primary:disabled { opacity: .6; cursor: default; transform: none; }
      .btn-primary.large { padding: 13px 28px; font-size: 1rem; }
      .btn-primary.full { width: 100%; justify-content: center; margin-top: .5rem; }
      .btn-ghost { background: transparent; color: var(--ink); border-color: var(--line); }
      .btn-ghost:hover { background: var(--paper-2); }
      .btn-ghost.is-fav-text { color: var(--rose-deep); border-color: var(--rose); }
      .btn-ghost.danger-text { color: var(--danger); }
      .btn-danger { background: var(--danger); color: #fff; }
      .btn-upload { background: var(--paper-2); color: var(--ink); border-color: var(--line); }
      .icon-btn { background: transparent; border: none; color: var(--ink); cursor: pointer; padding: 6px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
      .icon-btn:hover { background: var(--paper-2); }

      /* login */
      .login-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--paper); padding: 1.5rem; }
      .login-card { background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); padding: 2.25rem 2rem; max-width: 380px; width: 100%; text-align: center; }
      .login-mark { width: 48px; height: 48px; margin: 0 auto .75rem; border-radius: 50%; background: var(--paper-2); display: flex; align-items: center; justify-content: center; color: var(--rose-deep); }
      .login-card h2 { margin-bottom: .35rem; }
      .login-sub { margin-bottom: 1.5rem; }
      .login-card form { text-align: left; }
      .pw-row { display: flex; align-items: center; gap: 4px; }
      .pw-row input { flex: 1; }
      .remember-row { display: flex; align-items: center; gap: 8px; font-size: .85rem; color: var(--ink-soft); margin: .75rem 0 1rem; }
      .login-note { margin-top: 1.25rem; font-size: .78rem; color: var(--ink-soft); display: flex; align-items: center; gap: 5px; justify-content: center; }

      /* header */
      .app-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 22px; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: var(--paper); z-index: 20; }
      .brand { display: flex; align-items: center; gap: 8px; font-size: 1.15rem; font-weight: 600; cursor: pointer; color: var(--rose-deep); }
      .top-nav { display: flex; gap: 4px; }
      .nav-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: none; background: transparent; color: var(--ink-soft); cursor: pointer; font-size: .88rem; }
      .nav-btn:hover { background: var(--paper-2); }
      .nav-btn.active { background: var(--paper-2); color: var(--rose-deep); font-weight: 600; }
      .header-actions { display: flex; align-items: center; gap: 4px; }
      .menu-only { display: none; }
      .mobile-menu { position: sticky; top: 57px; z-index: 19; background: var(--card); border-bottom: 1px solid var(--line); display: none; flex-direction: column; padding: 6px; }
      .mobile-menu-item { display: flex; align-items: center; gap: 10px; padding: 12px; border: none; background: transparent; color: var(--ink); text-align: left; border-radius: 10px; cursor: pointer; }
      .mobile-menu-item:hover { background: var(--paper-2); }

      .search-bar { display: flex; align-items: center; gap: 8px; padding: 10px 22px; border-bottom: 1px solid var(--line); background: var(--paper-2); }
      .search-bar input { flex: 1; border: none; background: transparent; outline: none; color: var(--ink); font-size: .95rem; }

      .toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: var(--ink); color: var(--paper); padding: 10px 18px; border-radius: 999px; font-size: .85rem; z-index: 50; animation: fadeUp .3s ease both; }

      .app-main { max-width: 980px; margin: 0 auto; padding: 24px 22px 100px; }
      .profile-strip { text-align: center; margin-bottom: 18px; }
      .profile-strip p { font-style: italic; }

      .on-this-day { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 20px; margin-bottom: 20px; }
      .otd-label { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--gold); font-weight: 600; }
      .on-this-day h4 { margin: 2px 0 4px; }
      .on-this-day p { font-size: .85rem; }

      .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 18px; }
      .day-filter-label { font-weight: 600; color: var(--rose-deep); }

      .filters-panel { display: flex; flex-wrap: wrap; gap: 14px; background: var(--paper-2); border-radius: var(--radius); padding: 14px 18px; margin-bottom: 18px; align-items: flex-end; }
      .filters-panel label { display: flex; flex-direction: column; gap: 4px; font-size: .78rem; color: var(--ink-soft); }
      .filters-panel select { padding: 7px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--ink); }

      .memory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; }

      /* card */
      .memory-card { background: var(--card); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); cursor: pointer; position: relative; transition: transform .18s ease; border: 1px solid var(--line); }
      .memory-card:hover { transform: translateY(-3px); }
      .ribbon { position: absolute; top: 0; left: 18px; width: 14px; height: 26px; background: var(--gold); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%); z-index: 2; }
      .card-media { position: relative; aspect-ratio: 4/3; background: var(--paper-2); overflow: hidden; }
      .card-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s ease; }
      .memory-card:hover .card-media img { transform: scale(1.05); }
      .card-media-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--ink-soft); }
      .fav-btn { position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,.85); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: var(--rose-deep); cursor: pointer; }
      .fav-btn.is-fav { color: var(--rose-deep); }
      .card-body { padding: 14px 16px 16px; }
      .card-date { font-size: .72rem; color: var(--gold); text-transform: uppercase; letter-spacing: .05em; font-weight: 600; }
      .card-body h4 { margin: 4px 0 6px; font-size: 1.05rem; }
      .card-caption { font-size: .85rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 10px; }
      .card-meta { display: flex; gap: 6px; flex-wrap: wrap; }

      .pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font-size: .72rem; background: var(--paper-2); color: var(--ink-soft); }
      .mood-pill.sm { background: rgba(185,131,138,.15); color: var(--rose-deep); }
      .cat-pill { background: rgba(138,154,126,.18); color: #5a6b4f; }
      [data-diary-theme="dark"] .cat-pill { color: #b7c7ab; }
      .tag-pill { background: var(--paper-2); }

      /* empty state */
      .empty-state { text-align: center; padding: 60px 20px; max-width: 420px; margin: 0 auto; }
      .empty-icon { width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 50%; background: var(--paper-2); display: flex; align-items: center; justify-content: center; color: var(--rose-deep); }
      .empty-state h3 { margin-bottom: 8px; }
      .empty-state p { margin-bottom: 18px; }

      /* overlay / dialogs */
      .overlay { position: fixed; inset: 0; background: rgba(30,24,16,.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
      .confirm-card { background: var(--card); border-radius: var(--radius); padding: 24px; max-width: 380px; box-shadow: var(--shadow); }
      .confirm-card h3 { margin-bottom: 8px; }
      .confirm-card p { margin-bottom: 18px; }
      .confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }
      .lightbox-img { max-width: 90vw; max-height: 90vh; border-radius: 10px; }

      /* form */
      .form-card { background: var(--card); border-radius: var(--radius); max-width: 640px; width: 100%; max-height: 88vh; display: flex; flex-direction: column; box-shadow: var(--shadow); }
      .form-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--line); }
      .form-body { padding: 20px 22px; overflow-y: auto; }
      .form-section-label { font-size: .74rem; text-transform: uppercase; letter-spacing: .06em; color: var(--gold); font-weight: 700; margin: 18px 0 10px; }
      .form-section-label:first-child { margin-top: 0; }
      .field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; font-size: .82rem; color: var(--ink-soft); }
      .field input, .field select, .field textarea { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); font-size: .95rem; }
      .field textarea { resize: vertical; font-family: inherit; }
      .field-error { color: var(--danger); font-size: .78rem; }
      .field-row { display: flex; gap: 12px; }
      .field-row .field { flex: 1; }
      .hint { font-size: .72rem; color: var(--ink-soft); }
      .mood-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
      .mood-choice { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); cursor: pointer; font-size: .85rem; }
      .mood-choice.selected { border-color: var(--rose-deep); background: rgba(185,131,138,.15); color: var(--rose-deep); font-weight: 600; }
      .upload-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      .upload-status { font-size: .8rem; color: var(--ink-soft); }
      .photo-preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; margin-bottom: 6px; }
      .photo-preview { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; }
      .photo-preview img { width: 100%; height: 100%; object-fit: cover; }
      .remove-chip { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,.55); color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .video-preview-row { display: flex; align-items: center; gap: 8px; font-size: .82rem; padding: 6px 10px; background: var(--paper-2); border-radius: 8px; margin-bottom: 6px; }
      .video-preview-row .remove-chip { position: static; margin-left: auto; background: transparent; color: var(--ink-soft); }
      .fav-check { display: flex; align-items: center; gap: 8px; font-size: .88rem; margin-top: 4px; color: var(--ink); }
      .form-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--line); }

      /* memory view */
      .memory-view { animation: fadeUp .3s ease both; }
      .back-btn { margin-bottom: 14px; }
      .memory-view-card { background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); padding: 28px clamp(18px, 5vw, 40px); }
      .mv-header h1 { font-size: 1.6rem; margin-bottom: 10px; }
      .mv-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: .82rem; color: var(--ink-soft); margin-bottom: 20px; }
      .mv-meta span { display: flex; align-items: center; gap: 4px; }
      .mv-section { margin-bottom: 22px; }
      .mv-section h3 { font-size: .95rem; margin-bottom: 10px; color: var(--rose-deep); }
      .mv-caption { white-space: pre-wrap; color: var(--ink); font-size: 1rem; }
      .mv-photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
      .mv-photo-grid img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; cursor: zoom-in; transition: transform .2s ease; }
      .mv-photo-grid img:hover { transform: scale(1.03); }
      .mv-video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
      .mv-video-grid video { width: 100%; border-radius: 10px; }
      .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
      .mv-actions { display: flex; gap: 10px; flex-wrap: wrap; border-top: 1px solid var(--line); padding-top: 18px; }

      .audio-player { display: flex; align-items: center; gap: 12px; background: var(--paper-2); border-radius: 999px; padding: 8px 16px; max-width: 420px; }
      .audio-btn { width: 34px; height: 34px; border-radius: 50%; background: var(--rose-deep); color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
      .audio-track { flex: 1; height: 4px; background: var(--line); border-radius: 999px; overflow: hidden; }
      .audio-fill { height: 100%; background: var(--rose-deep); }
      .audio-time { font-size: .72rem; color: var(--ink-soft); white-space: nowrap; }

      /* calendar */
      .calendar-card { background: var(--card); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); max-width: 480px; margin: 0 auto; }
      .calendar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
      .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
      .calendar-grid.dow { margin-bottom: 4px; }
      .dow-cell { text-align: center; font-size: .72rem; color: var(--ink-soft); padding: 4px 0; }
      .cal-cell { aspect-ratio: 1; border-radius: 8px; border: none; background: transparent; color: var(--ink); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: default; font-size: .85rem; }
      .cal-cell.empty { visibility: hidden; }
      .cal-cell.has-memory { background: var(--paper-2); cursor: pointer; font-weight: 600; }
      .cal-cell.has-memory:hover { background: rgba(185,131,138,.18); }
      .cal-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--rose-deep); }

      /* stats */
      .stats-wrap { max-width: 640px; margin: 0 auto; }
      .section-title { text-align: center; margin-bottom: 18px; }
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 12px; }
      .stats-grid.two { grid-template-columns: 1fr 1fr; }
      .stat-card { background: var(--card); border-radius: 14px; padding: 18px; text-align: center; box-shadow: var(--shadow); }
      .stat-card.wide { text-align: left; }
      .stat-value { display: block; font-size: 1.8rem; font-weight: 700; color: var(--rose-deep); }
      .stat-value.small { font-size: 1.1rem; }
      .stat-label { font-size: .78rem; color: var(--ink-soft); }

      /* bottom nav (mobile) */
      .bottom-nav { display: none; }

      @media (max-width: 760px) {
        .top-nav { display: none; }
        .menu-only { display: flex; }
        .mobile-menu { display: flex; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--card); border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-around; padding: 6px 4px 10px; z-index: 30; }
        .bnav-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; background: none; border: none; color: var(--ink-soft); font-size: .62rem; padding: 4px 6px; cursor: pointer; }
        .bnav-btn.active { color: var(--rose-deep); }
        .bnav-btn.add { background: var(--rose-deep); color: #fff; border-radius: 50%; width: 44px; height: 44px; margin-top: -22px; align-items: center; justify-content: center; box-shadow: var(--shadow); }
        .app-main { padding-bottom: 110px; }
      }
    `}</style>
  );
}
