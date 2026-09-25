const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function api(url, options={}) {
  const r = await fetch(url, {
    ...options,
    headers: {"Content-Type":"application/json", ...(options.headers || {})}
  });
  const data = await r.json().catch(() => ({success:false,message:"Response bukan JSON"}));
  if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);
  return data;
}

function showPanel() {
  $("loginCard").classList.add("hidden");
  $("panel").classList.remove("hidden");
  $("logout").classList.remove("hidden");
  loadAll();
}

async function checkAuth() {
  try { await api("/api/admin/me"); showPanel(); } catch {}
}

$("loginBtn").onclick = async () => {
  $("loginMsg").textContent = "";
  try {
    await api("/api/admin/login", {
      method:"POST",
      body:JSON.stringify({username:$("loginUser").value,password:$("loginPass").value})
    });
    showPanel();
  } catch(e) { $("loginMsg").textContent = e.message; }
};

$("logout").onclick = async () => {
  await api("/api/admin/logout",{method:"POST"});
  location.reload();
};

async function loadMaintenance() {
  const d = await api("/api/admin/maintenance");
  $("maint").checked = d.maintenance;
  $("maintMsg").value = d.maintenance_msg || "";
  $("maintState").textContent = d.maintenance ? "AKTIF" : "OFF";
}

async function loadUsers() {
  const d = await api("/api/admin/users");
  const box = $("users");
  if (!d.users.length) {
    box.innerHTML = "<p>Belum ada user.</p>";
    return;
  }

  box.innerHTML = d.users.map(u => `
    <div class="user">
      <div>
        <b>${esc(u.username)}</b>
        <small>Status: ${esc(u.status)} • Device: ${u.device_count}/${u.device_limit}</small>
        <small>Berlaku sampai: ${new Date(u.valid_until).toLocaleString()}</small>
      </div>
      <div class="actions">
        <button onclick="extendUser(${u.id})">+ Hari</button>
        <button onclick="toggleUser(${u.id}, '${esc(u.status)}')">${u.status === "active" ? "Disable" : "Aktifkan"}</button>
        <button class="danger" onclick="deleteUser(${u.id}, '${esc(u.username)}')">Hapus</button>
      </div>
    </div>
  `).join("");
}

async function loadAll() {
  try { await loadMaintenance(); await loadUsers(); }
  catch(e) { alert(e.message); }
}

$("saveMaint").onclick = async () => {
  try {
    await api("/api/admin/maintenance", {
      method:"POST",
      body:JSON.stringify({
        maintenance:$("maint").checked,
        maintenance_msg:$("maintMsg").value
      })
    });
    await loadMaintenance();
  } catch(e) { alert(e.message); }
};

$("addUser").onclick = async () => {
  $("userMsg").textContent = "";
  try {
    await api("/api/admin/users", {
      method:"POST",
      body:JSON.stringify({
        username:$("uName").value,
        password:$("uPass").value,
        days:Number($("uDays").value),
        device_limit:Number($("uLimit").value)
      })
    });
    $("uName").value = "";
    $("uPass").value = "";
    $("userMsg").textContent = "User berhasil dibuat.";
    await loadUsers();
  } catch(e) { $("userMsg").textContent = e.message; }
};

$("refresh").onclick = loadUsers;

window.extendUser = async id => {
  const days = Number(prompt("Tambah berapa hari?", "30"));
  if (!Number.isInteger(days) || days < 1) return;
  try {
    await api(`/api/admin/user?id=${id}`, {method:"POST", body:JSON.stringify({action:"extend",days})});
    await loadUsers();
  } catch(e) { alert(e.message); }
};

window.toggleUser = async (id, status) => {
  try {
    await api(`/api/admin/user?id=${id}`, {
      method:"POST",
      body:JSON.stringify({action:"status",status:status === "active" ? "disabled" : "active"})
    });
    await loadUsers();
  } catch(e) { alert(e.message); }
};

window.deleteUser = async (id, name) => {
  if (!confirm(`Hapus user ${name}?`)) return;
  try {
    await api(`/api/admin/user?id=${id}`, {method:"DELETE"});
    await loadUsers();
  } catch(e) { alert(e.message); }
};

checkAuth();
