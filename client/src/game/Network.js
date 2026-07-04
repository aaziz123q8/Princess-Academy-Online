// ============================================================================
//  Network.js — Realtime multiplayer client over WebSocket.
//  Sends the local player's transform a few times per second and spawns/updates
//  lightweight remote avatars for everyone else in the same zone. Also relays
//  chat. If the server is unreachable, the game keeps running single-player
//  (guest/offline) — multiplayer simply stays dormant.
//
//  Wire protocol (JSON):
//    C→S  { t:"hello", name }
//    C→S  { t:"state", x,y,z,ry, moving }
//    C→S  { t:"chat", text }
//    S→C  { t:"welcome", id, players:[{id,name,x,y,z,ry}] }
//    S→C  { t:"join",  id, name }
//    S→C  { t:"leave", id }
//    S→C  { t:"state", id, x,y,z,ry, moving }
//    S→C  { t:"chat",  id, name, text }
// ============================================================================

import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Avatar } from "./Avatar.js";

const SEND_HZ = 8; // transform updates per second

export class Network {
  constructor(scene, { name, url, onChat, onSystem } = {}) {
    this.scene = scene;
    this.name = name || "Princess";
    this.onChat = onChat || (() => {});
    this.onSystem = onSystem || (() => {});
    this.remotes = new Map(); // id -> { avatar, target:{pos,ry} }
    this.connected = false;
    this._sendAccum = 0;

    // Same-origin ws:// or wss:// depending on the page protocol.
    const proto = location.protocol === "https:" ? "wss" : "ws";
    this.url = url || `${proto}://${location.host}/ws`;

    this._connect();
    this._obs = scene.onBeforeRenderObservable.add(() => this._interpolate());
  }

  _connect() {
    try {
      this.ws = new WebSocket(this.url);
    } catch (e) {
      console.warn("[net] websocket unavailable, staying offline");
      return;
    }
    this.ws.onopen = () => {
      this.connected = true;
      this._send({ t: "hello", name: this.name });
    };
    this.ws.onmessage = (ev) => this._onMessage(ev);
    this.ws.onclose = () => {
      this.connected = false;
      this._clearRemotes();
    };
    this.ws.onerror = () => {
      // Silently degrade to offline; onclose handles cleanup.
    };
  }

  _onMessage(ev) {
    let m;
    try { m = JSON.parse(ev.data); } catch { return; }
    switch (m.t) {
      case "welcome":
        this.selfId = m.id;
        (m.players || []).forEach((p) => this._spawnRemote(p));
        break;
      case "join":
        this.onSystem("chat.joined", { name: m.name });
        this._spawnRemote(m);
        break;
      case "leave": {
        const r = this.remotes.get(m.id);
        if (r) { this.onSystem("chat.left", { name: r.avatar.name }); r.avatar.dispose(); }
        this.remotes.delete(m.id);
        break;
      }
      case "state": {
        const r = this.remotes.get(m.id);
        if (r) {
          r.target.pos.set(m.x, m.y, m.z);
          r.target.ry = m.ry;
          r.avatar.setMoving(!!m.moving);
        }
        break;
      }
      case "chat":
        this.onChat({ name: m.name, text: m.text, self: m.id === this.selfId });
        break;
    }
  }

  _spawnRemote(p) {
    if (this.remotes.has(p.id) || p.id === this.selfId) return;
    const avatar = new Avatar(this.scene, { name: p.name, dress: p.dress });
    avatar.root.position.set(p.x || 0, p.y || 0, p.z || 0);
    this.remotes.set(p.id, {
      avatar,
      target: { pos: new Vector3(p.x || 0, p.y || 0, p.z || 0), ry: p.ry || 0 },
    });
  }

  /** Smoothly move remote avatars toward their last received transform. */
  _interpolate() {
    this.remotes.forEach((r) => {
      r.avatar.root.position = Vector3.Lerp(r.avatar.root.position, r.target.pos, 0.2);
      const cur = r.avatar.root.rotation.y;
      let d = (r.target.ry - cur) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      r.avatar.root.rotation.y = cur + d * 0.2;
    });
  }

  /** Call every frame with the local transform; throttled internally. */
  pushState(pos, ry, moving) {
    if (!this.connected) return;
    this._sendAccum += this.scene.getEngine().getDeltaTime() / 1000;
    if (this._sendAccum < 1 / SEND_HZ) return;
    this._sendAccum = 0;
    this._send({ t: "state", x: round(pos.x), y: round(pos.y), z: round(pos.z), ry: round(ry), moving });
  }

  sendChat(text) {
    if (this.connected) this._send({ t: "chat", text });
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  _clearRemotes() {
    this.remotes.forEach((r) => r.avatar.dispose());
    this.remotes.clear();
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this._obs);
    this._clearRemotes();
    if (this.ws) this.ws.close();
  }
}

const round = (n) => Math.round(n * 100) / 100;
